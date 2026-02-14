'use client'

import { useState, useEffect } from 'react'
import { FileText, Folder, ChevronRight, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileInfo, FileContent } from '@/types/electron'

interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
  size?: number
  modified?: string
  wordCount?: number
}

export default function ContentView() {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadContentFiles()
  }, [])

  const loadContentFiles = async () => {
    try {
      setLoading(true)
      const tree = await buildFileTree('')
      setFileTree(tree)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load content files:', error)
      setLoading(false)
    }
  }

  const buildFileTree = async (dirPath: string): Promise<FileTreeNode[]> => {
    try {
      const files = await window.electron.listFiles(dirPath)
      const tree: FileTreeNode[] = []

      for (const file of files) {
        // Skip hidden files, node_modules, and memory directory
        if (file.name.startsWith('.') || file.name === 'node_modules' || file.name === 'memory') {
          continue
        }

        if (file.isDirectory) {
          const children = await buildFileTree(file.path)
          if (children.length > 0) {
            tree.push({
              name: file.name,
              path: file.path,
              isDirectory: true,
              children,
            })
          }
        } else if (file.name.endsWith('.md')) {
          tree.push({
            name: file.name,
            path: file.path,
            isDirectory: false,
            size: file.size,
            modified: file.modified,
          })
        }
      }

      // Sort: folders first, then files, alphabetically
      tree.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })

      return tree
    } catch (error) {
      console.error('Error building file tree:', error)
      return []
    }
  }

  const loadFileContent = async (filePath: string) => {
    try {
      setSelectedFile(filePath)
      const content = await window.electron.readFile(filePath)
      setFileContent(content)
    } catch (error) {
      console.error('Failed to load file:', error)
    }
  }

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFileTree = (nodes: FileTreeNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        {node.isDirectory ? (
          <>
            <button
              onClick={() => toggleFolder(node.path)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#2a2a2a] transition-colors text-gray-300"
              style={{ paddingLeft: `${level * 12 + 12}px` }}
            >
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <Folder className="w-4 h-4 text-purple-500" />
              <span>{node.name}</span>
            </button>
            {expandedFolders.has(node.path) && node.children && (
              <div>{renderFileTree(node.children, level + 1)}</div>
            )}
          </>
        ) : (
          <button
            onClick={() => loadFileContent(node.path)}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
              ${
                selectedFile === node.path
                  ? 'bg-purple-600/20 text-purple-400 border-r-2 border-purple-500'
                  : 'text-gray-300 hover:bg-[#2a2a2a]'
              }
            `}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            <div className="w-4 h-4" /> {/* Spacer for alignment */}
            <FileText className="w-4 h-4 text-gray-500" />
            <span>{node.name.replace('.md', '')}</span>
          </button>
        )}
      </div>
    ))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading content...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left panel - File tree */}
      <div className="w-[320px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold">Content Files</h2>
          <p className="text-sm text-gray-500">Markdown files in workspace</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {fileTree.length > 0 ? (
            renderFileTree(fileTree)
          ) : (
            <div className="p-8 text-center text-gray-500">
              No markdown files found
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Content viewer */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
        {fileContent && selectedFile ? (
          <>
            <div className="border-b border-[#2a2a2a] p-6">
              <h2 className="text-2xl font-semibold mb-2">
                {selectedFile.split('/').pop()?.replace('.md', '')}
              </h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>{formatFileSize(fileContent.size)}</span>
                <span>·</span>
                <span>{fileContent.content.split(/\s+/).length.toLocaleString()} words</span>
                <span>·</span>
                <span>Modified {formatDate(fileContent.modified)}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {fileContent.content}
                </ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  )
}

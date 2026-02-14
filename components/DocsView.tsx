'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileInfo, FileContent } from '@/types/electron'

export default function DocsView() {
  const [docs, setDocs] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocs()
  }, [])

  const loadDocs = async () => {
    try {
      setLoading(true)
      const docFiles = await window.electron.getDocs()
      setDocs(docFiles)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load docs:', error)
      setLoading(false)
    }
  }

  const loadFileContent = async (filePath: string) => {
    try {
      setSelectedFile(filePath)
      const content = await window.electron.readFile(filePath)
      setFileContent(content)
      await window.electron.watchFile(filePath)
    } catch (error) {
      console.error('Failed to load file:', error)
    }
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

  const getDocIcon = (name: string) => {
    if (name === 'SOUL.md') return '🌟'
    if (name === 'USER.md') return '👤'
    if (name === 'AGENTS.md') return '🤖'
    if (name === 'TOOLS.md') return '🔧'
    if (name === 'HEARTBEAT.md') return '💓'
    if (name === 'MEMORY.md') return '🧠'
    return '📄'
  }

  const getDocDescription = (name: string) => {
    if (name === 'SOUL.md') return 'Your identity and purpose'
    if (name === 'USER.md') return 'Information about Jamie'
    if (name === 'AGENTS.md') return 'Agent workspace guidelines'
    if (name === 'TOOLS.md') return 'Local tool configuration'
    if (name === 'HEARTBEAT.md') return 'Proactive task checklist'
    if (name === 'MEMORY.md') return 'Long-term curated memory'
    return 'Documentation'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-[350px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Documentation</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {docs.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              No documentation files found
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <button
                  key={doc.path}
                  onClick={() => loadFileContent(doc.path)}
                  className={`
                    w-full p-4 rounded-lg text-left transition-colors
                    ${
                      selectedFile === doc.path
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'bg-[#1a1a1a] hover:bg-[#2a2a2a]'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{getDocIcon(doc.name)}</span>
                    <span className="font-medium">{doc.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {getDocDescription(doc.name)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {doc.wordCount?.toLocaleString()} words · {formatFileSize(doc.size)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
        {fileContent && selectedFile ? (
          <>
            <div className="border-b border-[#2a2a2a] p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getDocIcon(selectedFile)}</span>
                <h2 className="text-2xl font-semibold">{selectedFile}</h2>
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {getDocDescription(selectedFile)}
              </div>
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
            Select a document to view
          </div>
        )}
      </div>
    </div>
  )
}

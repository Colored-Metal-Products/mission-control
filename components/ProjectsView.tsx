'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileInfo, FileContent } from '@/types/electron'

export default function ProjectsView() {
  const [projects, setProjects] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const { projectFiles } = await window.electron.getMemoryFiles()
      setProjects(projectFiles)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load projects:', error)
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
          <h2 className="text-lg font-semibold mb-4">Projects</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {projects.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              No projects found
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.path}
                  onClick={() => loadFileContent(project.path)}
                  className={`
                    w-full p-4 rounded-lg text-left transition-colors
                    ${
                      selectedFile === project.path
                        ? 'bg-purple-600/20 border border-purple-500'
                        : 'bg-[#1a1a1a] hover:bg-[#2a2a2a]'
                    }
                  `}
                >
                  <div className="font-medium mb-1">{project.name}</div>
                  <div className="text-xs text-gray-500">
                    {project.wordCount?.toLocaleString()} words · {formatFileSize(project.size)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Modified {formatDate(project.modified)}
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
              <h2 className="text-2xl font-semibold mb-2">
                {selectedFile.split('/').filter(Boolean).slice(-2, -1)[0]}
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
            Select a project to view its memory
          </div>
        )}
      </div>
    </div>
  )
}

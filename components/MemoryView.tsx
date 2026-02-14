'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileInfo, FileContent } from '@/types/electron'
import { Brain, Calendar, FileText, Sparkles } from 'lucide-react'

export default function MemoryView() {
  const [memoryFile, setMemoryFile] = useState<FileInfo | null>(null)
  const [dailyFiles, setDailyFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadMemoryFiles()
  }, [])

  const loadMemoryFiles = async () => {
    try {
      setLoading(true)
      const { dailyFiles: daily } = await window.electron.getMemoryFiles()
      
      // Get MEMORY.md info
      try {
        const memoryContent = await window.electron.readFile('MEMORY.md')
        setMemoryFile({
          name: 'MEMORY.md',
          path: 'MEMORY.md',
          size: memoryContent.size,
          modified: memoryContent.modified,
          wordCount: memoryContent.content.split(/\s+/).length,
        })
      } catch (err) {
        console.log('MEMORY.md not found')
      }

      setDailyFiles(daily)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load memory files:', error)
      setLoading(false)
    }
  }

  const loadFileContent = async (filePath: string) => {
    try {
      setSelectedFile(filePath)
      const content = await window.electron.readFile(filePath)
      setFileContent(content)
      
      // Watch for changes
      await window.electron.watchFile(filePath)
    } catch (error) {
      console.error('Failed to load file:', error)
    }
  }

  useEffect(() => {
    const handleFileChange = (filePath: string) => {
      if (filePath === selectedFile) {
        loadFileContent(filePath)
      }
    }

    window.electron.onFileChanged(handleFileChange)
  }, [selectedFile])

  const groupDailyFiles = () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]

    const groups: { [key: string]: FileInfo[] } = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      'This Month': [],
    }

    const monthGroups: { [key: string]: FileInfo[] } = {}

    dailyFiles.forEach((file) => {
      const fileDate = file.name.replace('.md', '')

      if (fileDate === today) {
        groups.Today.push(file)
      } else if (fileDate === yesterday) {
        groups.Yesterday.push(file)
      } else if (fileDate > weekAgo) {
        groups['This Week'].push(file)
      } else if (fileDate > monthAgo) {
        groups['This Month'].push(file)
      } else {
        const monthKey = fileDate.substring(0, 7) // YYYY-MM
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = []
        }
        monthGroups[monthKey].push(file)
      }
    })

    return { groups, monthGroups }
  }

  const { groups, monthGroups } = groupDailyFiles()

  const filteredFiles = searchQuery
    ? dailyFiles.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : dailyFiles

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateShort = (fileName: string) => {
    // fileName is like "2026-02-12.md"
    const dateStr = fileName.replace('.md', '')
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTimeAgo = (isoDate: string) => {
    const now = new Date()
    const date = new Date(isoDate)
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return formatDate(isoDate)
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
      {/* Left panel - File list */}
      <div className="w-[350px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
        <div className="p-4">
          <input
            type="text"
            placeholder="Search memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Long-term memory */}
          {memoryFile && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Long-Term Memory
              </h3>
              <button
                onClick={() => loadFileContent(memoryFile.path)}
                className={`
                  w-full p-4 rounded-lg text-left transition-colors border
                  ${
                    selectedFile === memoryFile.path
                      ? 'bg-purple-600/20 border-purple-500'
                      : 'bg-gradient-to-br from-purple-600/10 to-purple-800/5 border-purple-500/30 hover:border-purple-500/50'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="font-medium mb-2">{memoryFile.name}</div>
                <div className="text-xs text-gray-400 mb-1">
                  {memoryFile.wordCount?.toLocaleString()} words
                </div>
                <div className="text-xs text-gray-500">
                  Updated {formatTimeAgo(memoryFile.modified)}
                </div>
              </button>
            </div>
          )}

          {/* Daily journal */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Daily Journal
              </h3>
              <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full font-medium">
                {dailyFiles.length} entries
              </span>
            </div>

            {searchQuery ? (
              <div className="space-y-1">
                {filteredFiles.map((file) => (
                  <FileItem
                    key={file.path}
                    file={file}
                    selected={selectedFile === file.path}
                    onClick={() => loadFileContent(file.path)}
                    formatFileSize={formatFileSize}
                    formatDateShort={formatDateShort}
                  />
                ))}
              </div>
            ) : (
              <>
                {Object.entries(groups).map(([label, files]) =>
                  files.length > 0 ? (
                    <div key={label} className="mb-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">{label}</div>
                      <div className="space-y-1">
                        {files.map((file) => (
                          <FileItem
                            key={file.path}
                            file={file}
                            selected={selectedFile === file.path}
                            onClick={() => loadFileContent(file.path)}
                            formatFileSize={formatFileSize}
                            formatDateShort={formatDateShort}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                )}

                {Object.entries(monthGroups)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, files]) => (
                    <div key={month} className="mb-4">
                      <div className="text-xs font-medium text-gray-400 mb-2">
                        {new Date(month + '-01').toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="space-y-1">
                        {files.map((file) => (
                          <FileItem
                            key={file.path}
                            file={file}
                            selected={selectedFile === file.path}
                            onClick={() => loadFileContent(file.path)}
                            formatFileSize={formatFileSize}
                            formatDateShort={formatDateShort}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
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

interface FileItemProps {
  file: FileInfo
  selected: boolean
  onClick: () => void
  formatFileSize: (bytes: number) => string
  formatDateShort: (fileName: string) => string
}

function FileItem({ file, selected, onClick, formatFileSize, formatDateShort }: FileItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg text-left text-sm transition-colors border
        ${
          selected
            ? 'bg-purple-600/20 text-purple-400 border-purple-500'
            : 'border-transparent text-gray-300 hover:bg-[#2a2a2a] hover:border-[#3a3a3a]'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Calendar className="w-3.5 h-3.5 text-gray-500" />
        <div className="font-medium">{formatDateShort(file.name)}</div>
      </div>
      <div className="text-xs text-gray-500">
        {formatFileSize(file.size)} · {file.wordCount?.toLocaleString()} words
      </div>
    </button>
  )
}

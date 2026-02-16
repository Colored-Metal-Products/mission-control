'use client'

import { useState, useEffect } from 'react'
import { FileText, Edit3, Save, Eye, ChevronRight } from 'lucide-react'

interface FileInfo {
  name: string
  path: string
  size?: string
  content?: string
}

interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  description: string
  color: string
  files: FileInfo[]
}

const AGENTS: Agent[] = [
  {
    id: 'mozzie',
    name: 'Mozzie',
    emoji: '🐺',
    role: 'Chief of Staff',
    description: 'Executive assistant — everything flows through Mozzie',
    color: '#a855f7',
    files: [
      { name: 'SOUL.md', path: 'SOUL.md' },
      { name: 'IDENTITY.md', path: 'IDENTITY.md' },
      { name: 'USER.md', path: 'USER.md' },
      { name: 'TOOLS.md', path: 'TOOLS.md' },
      { name: 'AGENTS.md', path: 'AGENTS.md' },
      { name: 'MEMORY.md', path: 'MEMORY.md' },
      { name: 'HEARTBEAT.md', path: 'HEARTBEAT.md' },
    ],
  },
  {
    id: 'cto-elon',
    name: 'Elon',
    emoji: '🚀',
    role: 'CTO',
    description: 'Technical vision, first principles, bold moves',
    color: '#3b82f6',
    files: [
      { name: 'SOUL.md', path: 'council/members/cto-elon.md' },
      { name: 'CONFIG', path: 'council/council.json' },
    ],
  },
  {
    id: 'coo-marcus',
    name: 'Marcus',
    emoji: '🏭',
    role: 'COO',
    description: 'People, process, product — manufacturing ops',
    color: '#22c55e',
    files: [
      { name: 'SOUL.md', path: 'council/members/coo-marcus.md' },
      { name: 'CONFIG', path: 'council/council.json' },
    ],
  },
  {
    id: 'cmo-gary',
    name: 'Gary',
    emoji: '💪',
    role: 'CMO',
    description: '$100M offers, value stacking, direct response',
    color: '#f97316',
    files: [
      { name: 'SOUL.md', path: 'council/members/cmo-gary.md' },
      { name: 'CONFIG', path: 'council/council.json' },
    ],
  },
  {
    id: 'cro-cuban',
    name: 'Cuban',
    emoji: '🦈',
    role: 'CRO',
    description: 'Sales hustle, deal-making, competitive edge',
    color: '#a855f7',
    files: [
      { name: 'SOUL.md', path: 'council/members/cro-cuban.md' },
      { name: 'CONFIG', path: 'council/council.json' },
    ],
  },
]

export default function WorkspacesView() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AGENTS[0])
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load file content when a file is selected
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile.path)
    }
  }, [selectedFile])

  const loadFileContent = async (filePath: string) => {
    setLoading(true)
    try {
      const fileData = await window.electron.readFile(filePath)
      setFileContent(fileData.content)
      setEditedContent(fileData.content)
      
      // Update file size
      if (selectedFile) {
        selectedFile.size = formatFileSize(fileData.size)
      }
    } catch (error) {
      console.error('Failed to load file:', error)
      setFileContent('Error loading file')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedFile) return
    
    setSaving(true)
    try {
      await window.electron.writeFile(selectedFile.path, editedContent)
      setFileContent(editedContent)
      setEditMode(false)
    } catch (error) {
      console.error('Failed to save file:', error)
      alert('Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-white">
            {line.substring(4)}
          </h3>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-white">
            {line.substring(3)}
          </h2>
        )
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={i} className="text-2xl font-bold mt-8 mb-4 text-white">
            {line.substring(2)}
          </h1>
        )
      }
      
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2 ml-4 my-1">
            <span className="text-gray-400">•</span>
            <span className="text-gray-300">{formatInline(line.substring(2))}</span>
          </div>
        )
      }
      
      // Code blocks
      if (line.startsWith('```')) {
        return <div key={i} className="text-purple-400 text-sm my-1">{line}</div>
      }
      
      // Empty lines
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      
      // Regular paragraphs
      return (
        <p key={i} className="text-gray-300 my-1 leading-relaxed">
          {formatInline(line)}
        </p>
      )
    })
  }

  const formatInline = (text: string) => {
    // Bold text
    return text.split(/(\*\*.*?\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  return (
    <div className="h-full flex bg-[#1a1a1a]">
      {/* Left Sidebar - Agent List */}
      <div className="w-[250px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col">
        <div className="p-4 border-b border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Workspaces
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                setSelectedAgent(agent)
                setSelectedFile(null)
                setEditMode(false)
              }}
              className={`
                w-full px-4 py-3 flex items-start gap-3 transition-all
                hover:bg-[#1a1a1a] group
                ${selectedAgent.id === agent.id ? 'bg-[#1a1a1a]' : ''}
              `}
              style={{
                borderLeft: selectedAgent.id === agent.id ? `3px solid ${agent.color}` : '3px solid transparent',
              }}
            >
              <span className="text-2xl">{agent.emoji}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">
                  {agent.name}
                </div>
                <div className="text-xs text-gray-500">{agent.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-[#141414] border-b border-[#2a2a2a] p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{selectedAgent.emoji}</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">
                {selectedAgent.name}
              </h1>
              <p className="text-sm text-gray-400 mb-2">{selectedAgent.role}</p>
              <p className="text-sm text-gray-500">{selectedAgent.description}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Files List */}
          <div className="w-[280px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Files
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {selectedAgent.files.map((file, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedFile(file)
                    setEditMode(false)
                  }}
                  className={`
                    w-full px-4 py-3 flex items-center gap-3 transition-all
                    hover:bg-[#1a1a1a] group
                    ${selectedFile?.path === file.path ? 'bg-[#1a1a1a]' : ''}
                  `}
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-300">
                      {file.name}
                    </div>
                    {file.size && (
                      <div className="text-xs text-gray-500">{file.size}</div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* File Viewer/Editor */}
          <div className="flex-1 flex flex-col bg-[#1a1a1a]">
            {selectedFile ? (
              <>
                {/* Toolbar */}
                <div className="bg-[#141414] border-b border-[#2a2a2a] px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">
                      {selectedFile.name}
                    </span>
                    {selectedFile.size && (
                      <span className="text-xs text-gray-500">
                        ({selectedFile.size})
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!editMode ? (
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-3 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-sm font-medium text-gray-300 flex items-center gap-2 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditMode(false)
                            setEditedContent(fileContent)
                          }}
                          className="px-3 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-sm font-medium text-gray-300 flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-sm font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loading ? (
                    <div className="text-gray-500 text-center py-8">
                      Loading...
                    </div>
                  ) : editMode ? (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full bg-[#141414] text-gray-300 font-mono text-sm p-4 rounded border border-[#2a2a2a] focus:outline-none focus:border-purple-500 resize-none"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="max-w-3xl">
                      {renderMarkdown(fileContent)}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a file to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

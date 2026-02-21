'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileInfo, FileContent, SemanticResult } from '@/types/electron'
import { Brain, Search } from 'lucide-react'

type SearchMode = 'keyword' | 'semantic'

export default function SearchView() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('keyword')
  const [keywordResults, setKeywordResults] = useState<FileInfo[]>([])
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus the search input
    inputRef.current?.focus()
  }, [])

  const handleKeywordSearch = async () => {
    if (!query.trim()) {
      setKeywordResults([])
      return
    }

    try {
      setSearching(true)
      const searchResults = await window.electron.searchFiles(query)
      setKeywordResults(searchResults)
      setSearching(false)
    } catch (error) {
      console.error('Keyword search failed:', error)
      setSearching(false)
    }
  }

  const handleSemanticSearch = async () => {
    if (!query.trim()) {
      setSemanticResults([])
      return
    }

    try {
      setSearching(true)
      const searchResults = await window.electron.semanticSearch(query)
      setSemanticResults(searchResults)
      setSearching(false)
    } catch (error) {
      console.error('Semantic search failed:', error)
      setSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'keyword') {
        handleKeywordSearch()
      } else {
        handleSemanticSearch()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, mode])

  const loadFileContent = async (filePath: string) => {
    try {
      setSelectedFile(filePath)
      const content = await window.electron.readFile(filePath)
      setFileContent(content)
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

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-purple-500/30 text-purple-300">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const results = mode === 'keyword' ? keywordResults : semanticResults
  const hasResults = results.length > 0

  return (
    <div className="flex h-full">
      <div className="w-[400px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
        <div className="p-4">
          {/* Search Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode('keyword')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${mode === 'keyword' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                }
              `}
            >
              <Search className="w-4 h-4" />
              Keyword
            </button>
            <button
              onClick={() => setMode('semantic')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${mode === 'semantic' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                }
              `}
            >
              <Brain className="w-4 h-4" />
              Semantic
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder={mode === 'keyword' ? 'Search all markdown files...' : 'Ask a question about your memory...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 bg-[#2a2a2a] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            {hasResults && (
              <>
                {results.length} result{results.length !== 1 ? 's' : ''} found
                {mode === 'semantic' && ' (by meaning)'}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {query && !hasResults && !searching && (
            <div className="text-sm text-gray-500 text-center py-8">
              No results found for "{query}"
            </div>
          )}

          {!query && (
            <div className="text-sm text-gray-500 text-center py-8">
              {mode === 'keyword' ? 'Type to search across all markdown files' : 'Ask a question to search by meaning'}
            </div>
          )}

          <div className="space-y-2">
            {/* Keyword Results */}
            {mode === 'keyword' && keywordResults.map((result) => (
              <button
                key={result.path}
                onClick={() => loadFileContent(result.path)}
                className={`
                  w-full p-4 rounded-lg text-left transition-colors
                  ${
                    selectedFile === result.path
                      ? 'bg-purple-600/20 border border-purple-500'
                      : 'bg-[#1a1a1a] hover:bg-[#2a2a2a]'
                  }
                `}
              >
                <div className="font-medium mb-1 text-sm">
                  {highlightText(result.name, query)}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {result.path}
                </div>
                {result.preview && (
                  <div className="text-xs text-gray-400 line-clamp-2">
                    {highlightText(result.preview, query)}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {formatFileSize(result.size)} · Modified {formatDate(result.modified)}
                </div>
              </button>
            ))}

            {/* Semantic Results */}
            {mode === 'semantic' && semanticResults.map((result, idx) => (
              <button
                key={`${result.file}-${result.line}`}
                onClick={() => loadFileContent(result.file)}
                className={`
                  w-full p-4 rounded-lg text-left transition-colors
                  ${
                    selectedFile === result.file
                      ? 'bg-purple-600/20 border border-purple-500'
                      : 'bg-[#1a1a1a] hover:bg-[#2a2a2a]'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm">
                    {result.file.split('/').pop()?.replace('.md', '')}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span className={`
                      ${result.score >= 0.7 ? 'text-green-400' : result.score >= 0.5 ? 'text-yellow-400' : 'text-gray-400'}
                    `}>
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {result.file}#{result.line}
                </div>
                <div className="text-xs text-gray-400 line-clamp-3">
                  {result.text}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
        {fileContent && selectedFile ? (
          <>
            <div className="border-b border-[#2a2a2a] p-6">
              <h2 className="text-2xl font-semibold mb-2">
                {selectedFile.split('/').pop()?.replace('.md', '')}
              </h2>
              <div className="text-sm text-gray-500 mb-2">{selectedFile}</div>
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
            {query ? 'Select a search result to view' : mode === 'keyword' ? 'Start typing to search' : 'Ask a question to search by meaning'}
          </div>
        )}
      </div>
    </div>
  )
}

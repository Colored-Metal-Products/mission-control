'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, User, Calendar, Tag, FileText, Plus, AlertCircle, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'

interface ApprovalItem {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: {
    id: string
    name: string
    emoji: string
    title: string
  }
  title: string
  summary: string
  details: string
  createdAt: string
  resolvedAt?: string
  category: string
  taskCreated?: boolean
  taskCreatedAt?: string
}

interface ApprovalsData {
  items: ApprovalItem[]
}

const CATEGORY_COLORS: Record<string, string> = {
  marketing: 'bg-green-500/20 text-green-400 border-green-500/50',
  forge: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  finance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  ops: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  product: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
  hr: 'bg-pink-500/20 text-pink-400 border-pink-500/50',
}

const STATUS_COLORS = {
  pending: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    icon: Clock,
  },
  approved: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/50',
    text: 'text-green-400',
    icon: CheckCircle,
  },
  rejected: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    text: 'text-red-400',
    icon: XCircle,
  },
}

export default function ApprovalsView() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.electron.readFile('approvals/queue.json')
      const data: ApprovalsData = JSON.parse(result.content)
      
      // Sort: pending first, then by date (newest first)
      const sorted = data.items.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (b.status === 'pending' && a.status !== 'pending') return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      setItems(sorted)
      setLoading(false)
    } catch (err) {
      setError('Failed to load approvals queue')
      setLoading(false)
      console.error('Failed to load approvals:', err)
    }
  }

  const handleApprove = async (item: ApprovalItem) => {
    setProcessingId(item.id)
    try {
      const updatedItems = items.map(i =>
        i.id === item.id
          ? { ...i, status: 'approved' as const, resolvedAt: new Date().toISOString() }
          : i
      )
      
      await window.electron.writeFile(
        'approvals/queue.json',
        JSON.stringify({ items: updatedItems }, null, 2)
      )
      
      setItems(updatedItems)
      if (selectedItem?.id === item.id) {
        setSelectedItem(updatedItems.find(i => i.id === item.id) || null)
      }
    } catch (err) {
      console.error('Failed to approve item:', err)
      alert('Failed to approve item')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (item: ApprovalItem) => {
    setProcessingId(item.id)
    try {
      const updatedItems = items.map(i =>
        i.id === item.id
          ? { ...i, status: 'rejected' as const, resolvedAt: new Date().toISOString() }
          : i
      )
      
      await window.electron.writeFile(
        'approvals/queue.json',
        JSON.stringify({ items: updatedItems }, null, 2)
      )
      
      setItems(updatedItems)
      if (selectedItem?.id === item.id) {
        setSelectedItem(updatedItems.find(i => i.id === item.id) || null)
      }
    } catch (err) {
      console.error('Failed to reject item:', err)
      alert('Failed to reject item')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCreateTask = async (item: ApprovalItem) => {
    try {
      const taskText = `[${item.category}] ${item.title} (from ${item.submittedBy.emoji} ${item.submittedBy.name})`
      
      // Read current tasks.md
      const tasksFile = await window.electron.readFile('tasks.md')
      const lines = tasksFile.content.split('\n')
      
      // Find "Today" section (first ## day header)
      const todayIndex = lines.findIndex(line => line.match(/^##\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/))
      
      if (todayIndex >= 0) {
        // Insert after the day header
        lines.splice(todayIndex + 1, 0, `- [ ] ${taskText}`)
        
        await window.electron.writeFile('tasks.md', lines.join('\n'))
        
        // Mark as task created
        const updatedItems = items.map(i =>
          i.id === item.id
            ? { ...i, taskCreated: true, taskCreatedAt: new Date().toISOString() }
            : i
        )
        
        await window.electron.writeFile(
          'approvals/queue.json',
          JSON.stringify({ items: updatedItems }, null, 2)
        )
        
        setItems(updatedItems)
        if (selectedItem?.id === item.id) {
          setSelectedItem(updatedItems.find(i => i.id === item.id) || null)
        }
        
        alert('Task created in Today section!')
      } else {
        alert('Could not find Today section in tasks.md')
      }
    } catch (err) {
      console.error('Failed to create task:', err)
      alert('Failed to create task')
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true
    return item.status === activeFilter
  })

  const pendingCount = items.filter(i => i.status === 'pending').length
  const approvedCount = items.filter(i => i.status === 'approved').length
  const rejectedCount = items.filter(i => i.status === 'rejected').length

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading approvals...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1a]">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <CheckCircle className="w-10 h-10 text-purple-500" />
            Approvals Queue
          </h1>
          <p className="text-gray-400 text-lg">Review and approve proposals from the Council</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-[#141414] text-gray-400 hover:text-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500/20 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeFilter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-[#141414] text-gray-400 hover:text-gray-300'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Approved
            {approvedCount > 0 && (
              <span className="px-2 py-0.5 bg-green-500/20 rounded-full text-xs">
                {approvedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeFilter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-[#141414] text-gray-400 hover:text-gray-300'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Rejected
            {rejectedCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 rounded-full text-xs">
                {rejectedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-[#141414] text-gray-400 hover:text-gray-300'
            }`}
          >
            All ({items.length})
          </button>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <AlertCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">No {activeFilter !== 'all' ? activeFilter : ''} items</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((item) => {
              const statusConfig = STATUS_COLORS[item.status]
              const StatusIcon = statusConfig.icon
              const categoryClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['ops']
              
              return (
                <div
                  key={item.id}
                  className={`bg-[#141414] rounded-lg p-6 border-l-4 transition-all hover:bg-[#1a1a1a] ${statusConfig.border}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{item.submittedBy.emoji}</span>
                        <div>
                          <div className="font-bold text-xl">{item.title}</div>
                          <div className="text-sm text-gray-400">
                            from {item.submittedBy.name} ({item.submittedBy.title})
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(item.createdAt)}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs border ${categoryClass}`}>
                          {item.category}
                        </div>
                        <div className={`flex items-center gap-1 ${statusConfig.text}`}>
                          <StatusIcon className="w-4 h-4" />
                          {item.status}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-gray-300 mb-4">{item.summary}</p>

                  {/* Details (collapsible) */}
                  {selectedItem?.id === item.id && (
                    <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-gray-800 animate-fadeIn">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-400">Details</span>
                      </div>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                        {item.details}
                      </pre>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-all"
                    >
                      {selectedItem?.id === item.id ? 'Hide Details' : 'Show Details'}
                    </button>
                    
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={processingId === item.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm flex items-center gap-1 transition-all"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          disabled={processingId === item.id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm flex items-center gap-1 transition-all"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                    
                    {item.status === 'approved' && !item.taskCreated && (
                      <button
                        onClick={() => handleCreateTask(item)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Create Task
                      </button>
                    )}
                    
                    {item.taskCreated && (
                      <div className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded text-sm flex items-center gap-1 border border-purple-500/50">
                        <CheckCircle className="w-4 h-4" />
                        Task Created {formatDate(item.taskCreatedAt!)}
                      </div>
                    )}
                    
                    {item.resolvedAt && (
                      <div className="ml-auto text-xs text-gray-500">
                        Resolved {formatDate(item.resolvedAt)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

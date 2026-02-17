'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, MessageSquare, Clock, Filter, ChevronDown, ChevronUp, AlertCircle, ListTodo } from 'lucide-react'

interface ApprovalItem {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
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
  feedback?: string
  taskCreated?: boolean
  taskCreatedAt?: string
}

interface ApprovalsData {
  items: ApprovalItem[]
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

const MEMBER_COLORS: Record<string, string> = {
  'cto-elon': '#3b82f6',
  'coo-marcus': '#22c55e',
  'cmo-gary': '#f97316',
  'cro-cuban': '#a855f7',
  'main': '#9333ea' // Purple for Mozzie
}

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  approved: 'bg-green-500/20 text-green-400 border-green-500/50',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
  changes_requested: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
}

const CATEGORY_COLORS: Record<string, string> = {
  marketing: 'bg-green-500/20 text-green-400 border-green-500/50',
  forge: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  ops: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  finance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
}

const formatTimestamp = (isoString: string) => {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ApprovalsView() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({})

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await window.electron.readFile('approvals/queue.json')
      const data: ApprovalsData = JSON.parse(result.content)
      setItems(data.items || [])
      setLoading(false)
    } catch (err) {
      console.error('Failed to load approvals:', err)
      setError('Could not load approvals queue')
      setLoading(false)
    }
  }

  const saveApprovals = async (updatedItems: ApprovalItem[]) => {
    try {
      const data: ApprovalsData = { items: updatedItems }
      await window.electron.writeFile('approvals/queue.json', JSON.stringify(data, null, 2))
      setItems(updatedItems)
    } catch (err) {
      console.error('Failed to save approvals:', err)
      setError('Failed to save changes')
    }
  }

  const handleApprove = async (itemId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId
        ? { ...item, status: 'approved' as const, resolvedAt: new Date().toISOString() }
        : item
    )
    await saveApprovals(updatedItems)
  }

  const handleReject = async (itemId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId
        ? { ...item, status: 'rejected' as const, resolvedAt: new Date().toISOString() }
        : item
    )
    await saveApprovals(updatedItems)
  }

  const handleRequestChanges = async (itemId: string) => {
    const feedback = feedbackInput[itemId]?.trim()
    if (!feedback) {
      setError('Please provide feedback for requested changes')
      setTimeout(() => setError(null), 3000)
      return
    }

    const updatedItems = items.map(item =>
      item.id === itemId
        ? { 
            ...item, 
            status: 'changes_requested' as const, 
            resolvedAt: new Date().toISOString(),
            feedback 
          }
        : item
    )
    await saveApprovals(updatedItems)
    setFeedbackInput(prev => ({ ...prev, [itemId]: '' }))
  }

  const handleCreateTask = async (itemId: string) => {
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      // Read current tasks.md
      const tasksResult = await window.electron.readFile('tasks.md')
      let tasksContent = tasksResult.content

      // Format the new task
      const taskDate = new Date().toISOString().split('T')[0]
      const newTask = `- [ ] ${item.title} (from ${item.submittedBy.name}) [${taskDate}]\n`

      // Append to the end of the file
      tasksContent = tasksContent.trimEnd() + '\n\n' + newTask

      // Write back
      await window.electron.writeFile('tasks.md', tasksContent)

      // Update approval item
      const updatedItems = items.map(i =>
        i.id === itemId
          ? { ...i, taskCreated: true, taskCreatedAt: new Date().toISOString() }
          : i
      )
      await saveApprovals(updatedItems)

      // Show success briefly
      setError('✓ Task created successfully')
      setTimeout(() => setError(null), 2000)
    } catch (err) {
      console.error('Failed to create task:', err)
      setError('Failed to create task')
      setTimeout(() => setError(null), 3000)
    }
  }

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const pendingCount = items.filter(i => i.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading approvals...</div>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <div className="text-red-400 mb-2">{error}</div>
          <button
            onClick={loadApprovals}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-purple-400" />
            Approvals
            {pendingCount > 0 && (
              <span className="px-3 py-1 text-sm rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                {pendingCount}
              </span>
            )}
          </h1>
          <div className="text-sm text-gray-500">
            Review and approve pending items from council members
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-500" />
          {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map(f => {
            const count = f === 'all' ? items.length : items.filter(i => i.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-300'
                  }
                `}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Approval Cards */}
        {filteredItems.length > 0 ? (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <ApprovalCard
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpand={() => toggleExpanded(item.id)}
                onApprove={() => handleApprove(item.id)}
                onReject={() => handleReject(item.id)}
                onRequestChanges={() => handleRequestChanges(item.id)}
                onCreateTask={() => handleCreateTask(item.id)}
                feedback={feedbackInput[item.id] || ''}
                onFeedbackChange={(value) => setFeedbackInput(prev => ({ ...prev, [item.id]: value }))}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <div className="text-xl font-semibold text-gray-300 mb-2">
              All clear — nothing needs your attention
            </div>
            <div className="text-sm text-gray-500">
              {filter === 'all' 
                ? 'No approval items in the queue'
                : `No ${filter} items`
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ApprovalCard({ 
  item, 
  isExpanded, 
  onToggleExpand,
  onApprove,
  onReject,
  onRequestChanges,
  onCreateTask,
  feedback,
  onFeedbackChange
}: { 
  item: ApprovalItem
  isExpanded: boolean
  onToggleExpand: () => void
  onApprove: () => void
  onReject: () => void
  onRequestChanges: () => void
  onCreateTask: () => void
  feedback: string
  onFeedbackChange: (value: string) => void
}) {
  const memberColor = MEMBER_COLORS[item.submittedBy.id] || MEMBER_COLORS.main
  const categoryColor = CATEGORY_COLORS[item.category] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  const isPending = item.status === 'pending'
  const isApproved = item.status === 'approved'
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)

  return (
    <div 
      className="bg-[#141414] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-purple-500/30 transition-all"
      style={{ borderLeftWidth: '4px', borderLeftColor: memberColor }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{item.submittedBy.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-200">{item.submittedBy.name}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-500">{item.submittedBy.title}</span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3" />
                {formatTimestamp(item.createdAt)}
                {item.resolvedAt && (
                  <>
                    <span>→</span>
                    <span>Resolved {formatTimestamp(item.resolvedAt)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${categoryColor}`}>
              {item.category}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[item.status]}`}>
              {item.status === 'changes_requested' ? 'Changes Requested' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-100 mb-2">
          {item.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-gray-400 mb-3 leading-relaxed">
          {item.summary}
        </p>

        {/* Expandable Details */}
        <div className="mb-4">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? 'Hide details' : 'Show details'}
          </button>
          {isExpanded && (
            <div className="mt-3 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                {item.details}
              </pre>
            </div>
          )}
        </div>

        {/* Feedback (if changes requested) */}
        {item.feedback && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="text-xs font-semibold text-orange-400 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Feedback
            </div>
            <div className="text-sm text-orange-300">
              {item.feedback}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isPending && (
          <div className="flex items-center gap-3">
            <button
              onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => setShowFeedbackInput(!showFeedbackInput)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Request Changes
            </button>
          </div>
        )}

        {/* Create Task Button (for approved items) */}
        {isApproved && !item.taskCreated && (
          <div className="flex items-center gap-3">
            <button
              onClick={onCreateTask}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              <ListTodo className="w-4 h-4" />
              Create Task
            </button>
          </div>
        )}

        {/* Task Created Indicator */}
        {item.taskCreated && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="text-xs font-semibold text-purple-400 mb-0.5 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5" />
              Task Created
            </div>
            <div className="text-xs text-purple-300">
              Added to tasks.md {item.taskCreatedAt && `on ${formatTimestamp(item.taskCreatedAt)}`}
            </div>
          </div>
        )}

        {/* Feedback Input */}
        {showFeedbackInput && isPending && (
          <div className="mt-3 space-y-2">
            <textarea
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="Provide feedback on what needs to change..."
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowFeedbackInput(false)}
                className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onRequestChanges}
                disabled={!feedback.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

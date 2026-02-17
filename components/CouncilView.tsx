'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, Users, Save, Loader2, CheckCircle2, Clock, AlertCircle, MessageCircle, ListChecks, ChevronRight, User } from 'lucide-react'

interface CouncilMember {
  id: string
  name: string
  title: string
  emoji: string
  inspiredBy: string
}

interface CouncilConfig {
  members: CouncilMember[]
}

interface MemberResponse {
  memberId: string
  text: string
  loading: boolean
  error?: string | null
}

interface CouncilTask {
  id: string
  leadMemberId: string
  taskTitle: string
  taskDescription: string
  status: 'pending' | 'in-progress' | 'review' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

const MEMBER_COLORS: Record<string, string> = {
  'cto-elon': '#3b82f6',
  'coo-marcus': '#22c55e',
  'cmo-gary': '#f97316',
  'cro-cuban': '#a855f7',
  'mozzie': '#8b5cf6',
  'ceo-jamie': '#d4af37'
}

const STATUS_STEPS = ['pending', 'in-progress', 'review', 'approved'] as const

interface ChatMessage {
  id: string
  role: 'jamie' | 'member'
  memberId?: string
  memberName?: string
  memberEmoji?: string
  content: string
  timestamp: string
}

export default function CouncilView() {
  const [mode, setMode] = useState<'boardroom' | 'execution' | 'standups'>('boardroom')
  const [members, setMembers] = useState<CouncilMember[]>([])
  const [question, setQuestion] = useState('')
  const [responses, setResponses] = useState<MemberResponse[]>([])
  const [synthesis, setSynthesis] = useState('')
  const [synthesisLoading, setSynthesisLoading] = useState(false)
  const [isConvening, setIsConvening] = useState(false)
  
  // Boardroom chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [typingMembers, setTypingMembers] = useState<string[]>([])
  
  // Execution mode state
  const [selectedLeadMember, setSelectedLeadMember] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [tasks, setTasks] = useState<CouncilTask[]>([])
  const [isAssigning, setIsAssigning] = useState(false)

  // Standups mode state
  const [standupTopic, setStandupTopic] = useState('')
  const [standupMessages, setStandupMessages] = useState<Array<{
    memberId: string
    memberName: string
    memberEmoji: string
    text: string
    timestamp: string
  }>>([])
  const [typingMember, setTypingMember] = useState<string | null>(null)
  const [isStandupRunning, setIsStandupRunning] = useState(false)
  const [actionItems, setActionItems] = useState<Array<{
    id: string
    memberId: string
    description: string
    checked: boolean
  }>>([])
  const [jamieMessage, setJamieMessage] = useState('')

  useEffect(() => {
    loadMembers()
    loadTasks()
  }, [])

  const loadMembers = async () => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const result = await window.electron.readFile('council/council.json')
        const config: CouncilConfig = JSON.parse(result.content)
        setMembers(config.members)
        if (config.members.length > 0) {
          setSelectedLeadMember(config.members[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load council members:', error)
    }
  }

  const loadTasks = async () => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const loadedTasks = await window.electron.councilGetTasks()
        setTasks(loadedTasks)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const handleSendMessage = async () => {
    console.log('handleSendMessage called', { chatInput, isSendingMessage, membersCount: members.length })
    if (!chatInput.trim() || isSendingMessage) return
    console.log('handleSendMessage proceeding...')

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'jamie',
      content: chatInput,
      timestamp: new Date().toISOString()
    }

    // Add Jamie's message immediately
    setChatMessages(prev => [...prev, userMessage])
    const messageText = chatInput
    setChatInput('')
    setIsSendingMessage(true)

    // Auto-scroll to bottom
    setTimeout(() => {
      const chatArea = document.getElementById('boardroom-chat')
      if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight
      }
    }, 100)

    try {
      // Build history for context
      const history = chatMessages.map(msg => ({
        role: msg.role === 'jamie' ? 'user' : 'assistant',
        name: msg.role === 'jamie' ? 'Jamie (CEO)' : msg.memberName || 'Member',
        content: msg.content
      }))

      // Call the new boardroom chat handler
      console.log('Calling councilBoardroomChat with message:', messageText)
      const result = await window.electron.councilBoardroomChat({
        message: messageText,
        history
      })
      console.log('councilBoardroomChat result:', JSON.stringify(result).substring(0, 500))

      // Display each response with typing indicator
      for (const response of result.responses) {
        const member = members.find(m => m.id === response.memberId)
        if (!member) continue

        // Show typing indicator
        setTypingMembers(prev => [...prev, response.memberId])
        
        // Wait to simulate thinking
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))
        
        // Remove typing indicator
        setTypingMembers(prev => prev.filter(id => id !== response.memberId))
        
        // Add message
        const memberMessage: ChatMessage = {
          id: `msg-${Date.now()}-${response.memberId}`,
          role: 'member',
          memberId: response.memberId,
          memberName: member.name,
          memberEmoji: member.emoji,
          content: response.text,
          timestamp: new Date().toISOString()
        }
        
        setChatMessages(prev => [...prev, memberMessage])
        
        // Auto-scroll
        setTimeout(() => {
          const chatArea = document.getElementById('boardroom-chat')
          if (chatArea) {
            chatArea.scrollTop = chatArea.scrollHeight
          }
        }, 100)
        
        // Small pause between responses
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleConvene = async () => {
    if (!question.trim() || isConvening) return

    setIsConvening(true)
    setResponses([])
    setSynthesis('')
    setSynthesisLoading(false)

    // Initialize responses with loading state
    const initialResponses = members.map(member => ({
      memberId: member.id,
      text: '',
      loading: true,
      error: null
    }))
    setResponses(initialResponses)

    try {
      // Call real IPC handler
      const result = await window.electron.councilConvene({
        question,
        memberIds: members.map(m => m.id)
      })

      // Update responses with actual results
      setResponses(result.responses.map(r => ({
        memberId: r.memberId,
        text: r.text,
        loading: false,
        error: r.error
      })))

      // Show synthesis
      setSynthesisLoading(true)
      setTimeout(() => {
        setSynthesis(result.synthesis)
        setSynthesisLoading(false)
        setIsConvening(false)
      }, 500)
    } catch (error) {
      console.error('Convene failed:', error)
      setResponses(prev => prev.map(r => ({
        ...r,
        loading: false,
        error: 'Failed to get response'
      })))
      setIsConvening(false)
    }
  }

  const handleSaveDecision = async () => {
    try {
      const timestamp = new Date().toISOString()
      const logEntry = {
        timestamp,
        question,
        responses: responses.map(r => ({
          memberId: r.memberId,
          text: r.text
        })),
        synthesis
      }

      const logPath = `council/decisions/${timestamp.split('T')[0]}.json`
      await window.electron.writeFile(logPath, JSON.stringify(logEntry, null, 2))
      alert('Decision saved!')
    } catch (error) {
      console.error('Failed to save decision:', error)
      alert('Failed to save decision')
    }
  }

  const handleAssignTask = async () => {
    if (!taskTitle.trim() || !taskDescription.trim() || isAssigning) return

    setIsAssigning(true)
    try {
      const result = await window.electron.councilAssignTask({
        leadMemberId: selectedLeadMember,
        taskTitle,
        taskDescription
      })

      if (result.success) {
        setTasks([...tasks, result.task])
        setTaskTitle('')
        setTaskDescription('')
        alert('Task assigned successfully!')
      }
    } catch (error) {
      console.error('Failed to assign task:', error)
      alert('Failed to assign task')
    } finally {
      setIsAssigning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'in-progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'review':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Assigned'
      case 'in-progress':
        return 'In Progress'
      case 'review':
        return 'Under Review'
      case 'approved':
        return 'Approved'
      default:
        return status
    }
  }

  const handleStartStandup = async () => {
    if (!standupTopic.trim() || isStandupRunning) return

    setIsStandupRunning(true)
    setStandupMessages([])
    setActionItems([])
    setTypingMember(null)

    try {
      // Call the standup IPC handler
      const result = await window.electron.councilStandup({
        topic: standupTopic,
        memberIds: members.map(m => m.id),
        rounds: 8
      })

      // Simulate real-time message display
      for (let i = 0; i < result.messages.length; i++) {
        const msg = result.messages[i]
        const member = members.find(m => m.id === msg.memberId)
        
        // Handle Mozzie specially
        let memberName, memberEmoji
        if (msg.memberId === 'mozzie') {
          memberName = 'Mozzie (Chief of Staff)'
          memberEmoji = '🐺'
        } else {
          memberName = member?.name || 'Unknown'
          memberEmoji = member?.emoji || '❓'
        }
        
        // Show typing indicator
        setTypingMember(msg.memberId)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))
        
        // Add message
        setStandupMessages(prev => [...prev, {
          memberId: msg.memberId,
          memberName,
          memberEmoji,
          text: msg.text,
          timestamp: new Date().toISOString()
        }])
        
        // Clear typing indicator
        setTypingMember(null)
        
        // Auto-scroll to bottom
        setTimeout(() => {
          const chatStream = document.getElementById('chat-stream')
          if (chatStream) {
            chatStream.scrollTop = chatStream.scrollHeight
          }
        }, 100)
        
        // Small pause between messages
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Extract and set action items
      if (result.actionItems && result.actionItems.length > 0) {
        setActionItems(result.actionItems.map((item, index) => ({
          id: `action-${Date.now()}-${index}`,
          memberId: item.memberId,
          description: item.description,
          checked: false
        })))
      }
    } catch (error) {
      console.error('Standup failed:', error)
      alert('Failed to start standup')
    } finally {
      setIsStandupRunning(false)
    }
  }

  const handleJamieInterject = () => {
    if (!jamieMessage.trim()) return

    setStandupMessages(prev => [...prev, {
      memberId: 'ceo-jamie',
      memberName: 'Jamie (CEO)',
      memberEmoji: '👔',
      text: jamieMessage,
      timestamp: new Date().toISOString()
    }])
    
    setJamieMessage('')
    
    // Auto-scroll to bottom
    setTimeout(() => {
      const chatStream = document.getElementById('chat-stream')
      if (chatStream) {
        chatStream.scrollTop = chatStream.scrollHeight
      }
    }, 100)
  }

  const handleSendToApprovals = async () => {
    try {
      // Send each action item to the approvals queue
      for (const item of actionItems) {
        await window.electron.councilAssignTask({
          leadMemberId: item.memberId,
          taskTitle: `Standup Action: ${standupTopic}`,
          taskDescription: item.description
        })
      }
      
      alert('Action items sent to Approvals!')
      setActionItems([])
    } catch (error) {
      console.error('Failed to send to approvals:', error)
      alert('Failed to send action items to approvals')
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1a]">
      <div className="max-w-7xl mx-auto p-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setMode('boardroom')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'boardroom'
                ? 'bg-blue-600 text-white'
                : 'bg-[#141414] text-gray-400 hover:text-gray-300'
            }`}
          >
            Boardroom
          </button>
          <button
            onClick={() => setMode('execution')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'execution'
                ? 'bg-purple-600 text-white'
                : 'bg-[#141414] text-gray-400 hover:text-gray-300'
            }`}
          >
            Execution
          </button>
          <button
            onClick={() => setMode('standups')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              mode === 'standups'
                ? 'bg-green-600 text-white'
                : 'bg-[#141414] text-gray-400 hover:text-gray-300'
            }`}
          >
            Standups
          </button>
        </div>

        {mode === 'boardroom' ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <MessageCircle className="w-10 h-10 text-blue-500" />
                The Boardroom
              </h1>
              <p className="text-gray-400 text-lg">Live conversation with your executive team</p>
            </div>

            {/* Chat Container */}
            <div className="flex flex-col h-[calc(100vh-250px)]">
              {/* Chat Area */}
              <div
                id="boardroom-chat"
                className="flex-1 bg-[#141414] rounded-t-lg p-6 border border-gray-800 overflow-y-auto"
              >
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Users className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-lg">Start a conversation...</p>
                    <p className="text-sm mt-2">Your executive team is ready to discuss</p>
                    <div className="flex gap-3 mt-6">
                      {members.map(member => (
                        <div
                          key={member.id}
                          className="flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                            style={{
                              backgroundColor: `${MEMBER_COLORS[member.id]}15`,
                              border: `2px solid ${MEMBER_COLORS[member.id]}`
                            }}
                          >
                            {member.emoji}
                          </div>
                          <span className="text-xs text-gray-600">{member.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((msg) => {
                      const isJamie = msg.role === 'jamie'
                      const memberColor = isJamie ? MEMBER_COLORS['ceo-jamie'] : MEMBER_COLORS[msg.memberId || ''] || '#888888'
                      const displayEmoji = isJamie ? '👔' : msg.memberEmoji || '❓'
                      const displayName = isJamie ? 'Jamie (CEO)' : msg.memberName || 'Unknown'
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 animate-fadeIn ${isJamie ? 'flex-row-reverse' : ''}`}
                        >
                          {/* Avatar */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                            style={{
                              backgroundColor: `${memberColor}15`,
                              border: `2px solid ${memberColor}`
                            }}
                          >
                            {displayEmoji}
                          </div>
                          
                          {/* Message Content */}
                          <div className={`flex-1 ${isJamie ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`flex items-baseline gap-2 mb-1 ${isJamie ? 'flex-row-reverse' : ''}`}>
                              <span
                                className="font-bold"
                                style={{ color: memberColor }}
                              >
                                {displayName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div
                              className={`rounded-lg p-3 max-w-[80%] border-l-4 ${isJamie ? 'border-r-4 border-l-0' : ''}`}
                              style={{
                                backgroundColor: `${memberColor}08`,
                                borderColor: memberColor
                              }}
                            >
                              <p className="text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Typing Indicators */}
                    {typingMembers.map((memberId) => {
                      const member = members.find(m => m.id === memberId)
                      if (!member) return null
                      
                      return (
                        <div key={`typing-${memberId}`} className="flex items-start gap-3 animate-fadeIn">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                            style={{
                              backgroundColor: `${MEMBER_COLORS[memberId]}15`,
                              border: `2px solid ${MEMBER_COLORS[memberId]}`
                            }}
                          >
                            {member.emoji}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span
                                className="font-bold"
                                style={{ color: MEMBER_COLORS[memberId] }}
                              >
                                {member.name}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="bg-[#141414] rounded-b-lg p-4 border border-t-0 border-gray-800">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{
                      backgroundColor: '#d4af3715',
                      border: '2px solid #d4af37'
                    }}
                  >
                    👔
                  </div>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Message the boardroom..."
                    className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                    disabled={isSendingMessage}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isSendingMessage}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-all"
                  >
                    {isSendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : mode === 'execution' ? (
          <>
            {/* Execution Mode */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-purple-500" />
                Execution Mode
              </h1>
              <p className="text-gray-400 text-lg">Assign tasks to council members</p>
            </div>

            {/* Task Assignment Form */}
            <div className="mb-8">
              <div className="bg-[#141414] rounded-lg p-6 border border-gray-800">
                <h2 className="text-2xl font-bold mb-6">Assign a Task</h2>
                
                <div className="space-y-4">
                  {/* Lead Member Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Lead Member
                    </label>
                    <select
                      value={selectedLeadMember}
                      onChange={(e) => setSelectedLeadMember(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                      disabled={isAssigning}
                    >
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.emoji} {member.name} — {member.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Task Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g., Implement new CRM system"
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                      disabled={isAssigning}
                    />
                  </div>

                  {/* Task Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Task Description
                    </label>
                    <textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Describe the task in detail..."
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors resize-none"
                      rows={4}
                      disabled={isAssigning}
                    />
                  </div>

                  {/* Assign Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleAssignTask}
                      disabled={!taskTitle.trim() || !taskDescription.trim() || isAssigning}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-all"
                    >
                      {isAssigning ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Assign
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Tasks */}
            {tasks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Active Tasks</h2>
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const member = members.find(m => m.id === task.leadMemberId)
                    if (!member) return null

                    return (
                      <div
                        key={task.id}
                        className="bg-[#141414] rounded-lg p-6 border-l-4 animate-fadeIn"
                        style={{ borderLeftColor: MEMBER_COLORS[member.id] }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{member.emoji}</span>
                            <div>
                              <div className="font-bold text-lg">{member.name}</div>
                              <div className="text-sm text-gray-400">
                                Working on: {task.taskTitle}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="text-sm font-medium">{getStatusLabel(task.status)}</span>
                          </div>
                        </div>

                        <p className="text-gray-300 mb-4">{task.taskDescription}</p>

                        {/* Progress Steps */}
                        <div className="flex items-center gap-2">
                          {STATUS_STEPS.map((step, index) => {
                            const currentIndex = STATUS_STEPS.indexOf(task.status as any)
                            const stepIndex = index
                            const isActive = stepIndex <= currentIndex
                            const isCurrent = stepIndex === currentIndex

                            return (
                              <div key={step} className="flex items-center flex-1">
                                <div
                                  className={`flex-1 h-2 rounded-full transition-all ${
                                    isActive ? 'bg-purple-500' : 'bg-gray-700'
                                  } ${isCurrent ? 'animate-pulse' : ''}`}
                                />
                                {index < STATUS_STEPS.length - 1 && (
                                  <div className="w-2" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          {STATUS_STEPS.map(step => (
                            <span key={step}>{getStatusLabel(step)}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : mode === 'standups' ? (
          <>
            {/* Standups Mode */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <MessageCircle className="w-10 h-10 text-green-500" />
                Council Standups
              </h1>
              <p className="text-gray-400 text-lg">Real-time group discussion</p>
            </div>

            {/* Topic Input Area */}
            <div className="mb-8">
              <div className="bg-[#141414] rounded-lg p-6 border border-gray-800">
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={standupTopic}
                      onChange={(e) => setStandupTopic(e.target.value)}
                      placeholder="Set a standup topic..."
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500 transition-colors"
                      disabled={isStandupRunning}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleStartStandup}
                      disabled={!standupTopic.trim() || isStandupRunning}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-all"
                    >
                      {isStandupRunning ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Standup in Progress...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Start Standup
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Stream and Action Items Panel */}
            {standupMessages.length > 0 && (
              <div className="grid grid-cols-3 gap-6">
                {/* Chat Stream */}
                <div className="col-span-2">
                  <div className="bg-[#141414] rounded-lg p-6 border border-gray-800 max-h-[600px] overflow-y-auto" id="chat-stream">
                    <div className="space-y-4">
                      {standupMessages.map((msg, index) => {
                        const member = members.find(m => m.id === msg.memberId)
                        const memberColor = MEMBER_COLORS[msg.memberId] || '#888888'
                        const displayEmoji = msg.memberEmoji || member?.emoji || '❓'
                        const displayName = msg.memberName || member?.name || 'Unknown'
                        
                        return (
                          <div
                            key={index}
                            className="animate-fadeIn"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                                style={{
                                  backgroundColor: `${memberColor}15`,
                                  border: `2px solid ${memberColor}`
                                }}
                              >
                                {displayEmoji}
                              </div>
                              
                              {/* Message Content */}
                              <div className="flex-1">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span
                                    className="font-bold"
                                    style={{ color: memberColor }}
                                  >
                                    {displayName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div
                                  className="rounded-lg p-3 text-gray-200"
                                  style={{
                                    backgroundColor: `${memberColor}08`
                                  }}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Typing Indicator */}
                      {typingMember && (() => {
                        const member = members.find(m => m.id === typingMember)
                        const typingEmoji = typingMember === 'mozzie' ? '🐺' : member?.emoji || '❓'
                        const typingName = typingMember === 'mozzie' ? 'Mozzie (Chief of Staff)' : member?.name || 'Unknown'
                        
                        return (
                          <div className="flex items-start gap-3 animate-fadeIn">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                              style={{
                                backgroundColor: `${MEMBER_COLORS[typingMember] || '#888888'}15`,
                                border: `2px solid ${MEMBER_COLORS[typingMember] || '#888888'}`
                              }}
                            >
                              {typingEmoji}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span
                                  className="font-bold"
                                  style={{ color: MEMBER_COLORS[typingMember] || '#888888' }}
                                >
                                  {typingName}
                                </span>
                              </div>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Jamie's Interject Input */}
                  {standupMessages.length > 0 && (
                    <div className="mt-4 bg-[#141414] rounded-lg p-4 border border-gray-800">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                          style={{
                            backgroundColor: '#d4af3715',
                            border: '2px solid #d4af37'
                          }}
                        >
                          👔
                        </div>
                        <input
                          type="text"
                          value={jamieMessage}
                          onChange={(e) => setJamieMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && jamieMessage.trim()) {
                              handleJamieInterject()
                            }
                          }}
                          placeholder="Interject as Jamie (CEO)..."
                          className="flex-1 bg-transparent text-white outline-none"
                          disabled={isStandupRunning}
                        />
                        <button
                          onClick={handleJamieInterject}
                          disabled={!jamieMessage.trim() || isStandupRunning}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-all"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Items Panel */}
                <div className="col-span-1">
                  <div className="bg-[#141414] rounded-lg p-6 border border-gray-800 sticky top-8">
                    <div className="flex items-center gap-2 mb-4">
                      <ListChecks className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-bold">Action Items</h3>
                    </div>
                    
                    {actionItems.length === 0 ? (
                      <p className="text-gray-500 text-sm">Action items will appear as the standup progresses...</p>
                    ) : (
                      <div className="space-y-3">
                        {actionItems.map((item) => {
                          const member = members.find(m => m.id === item.memberId)
                          return (
                            <div
                              key={item.id}
                              className="flex items-start gap-2 p-3 bg-[#1a1a1a] rounded-lg border border-gray-800 animate-fadeIn"
                            >
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => {
                                  setActionItems(prev =>
                                    prev.map(ai =>
                                      ai.id === item.id ? { ...ai, checked: !ai.checked } : ai
                                    )
                                  )
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-lg">{member?.emoji}</span>
                                  <span className="text-xs font-medium" style={{ color: MEMBER_COLORS[item.memberId] }}>
                                    {member?.name}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300">{item.description}</p>
                              </div>
                            </div>
                          )
                        })}
                        
                        <button
                          onClick={handleSendToApprovals}
                          className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                          Send to Approvals
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}

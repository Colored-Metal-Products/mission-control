'use client'

import { useState, useEffect, useCallback, useRef, forwardRef } from 'react'
import { Calendar, Filter, CheckCircle2, Circle, Clock, Flame, Plus, X, Save, Keyboard } from 'lucide-react'

interface Task {
  id: string
  text: string
  completed: boolean
  category: string
  urgency: 'must' | 'should' | 'normal'
  line: number
  rawLine: string
}

interface DaySection {
  date: string
  dayName: string
  mustDo: Task[]
  shouldDo: Task[]
  normalTasks: Task[]
}

type CategoryType = 'all' | 'ops' | 'marketing' | 'forge' | 'finance' | 'misc'

const CATEGORY_COLORS = {
  ops: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  marketing: 'bg-green-500/20 text-green-400 border-green-500/50',
  forge: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  finance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  misc: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
}

interface EditingTask {
  text: string
  category: CategoryType
  dayOffset: number // -2 = backlog, -1 = completed, 0 = today, 1 = tomorrow, etc.
  urgency: 'must' | 'should' | 'normal'
}

export default function TasksView() {
  const [daySections, setDaySections] = useState<DaySection[]>([])
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawContent, setRawContent] = useState('')
  
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  
  // Edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [addTaskDayOffset, setAddTaskDayOffset] = useState<number>(0)
  const [editForm, setEditForm] = useState<EditingTask>({
    text: '',
    category: 'misc',
    dayOffset: 0,
    urgency: 'normal',
  })
  
  // Keyboard navigation state
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(-1)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Ref for auto-scrolling to selected task
  const selectedTaskRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTasks()
  }, [])
  
  // Auto-scroll to selected task when selection changes
  useEffect(() => {
    if (selectedTaskIndex >= 0 && selectedTaskRef.current) {
      selectedTaskRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedTaskIndex])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea or modal is open
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement ||
          editingTask !== null ||
          isAddingTask ||
          showShortcuts) {
        // Allow Escape to close modals
        if (e.key === 'Escape') {
          if (showShortcuts) {
            setShowShortcuts(false)
          } else {
            closeEditModal()
          }
        }
        return
      }
      
      const currentTasks = getCurrentTaskList()
      
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault()
          openAddTask(selectedDay - getTodayIndex())
          break
          
        case ' ':
        case 'enter':
          e.preventDefault()
          if (selectedTaskIndex >= 0 && selectedTaskIndex < currentTasks.length) {
            toggleTaskCompletion(currentTasks[selectedTaskIndex])
          }
          break
          
        case 'e':
          e.preventDefault()
          if (selectedTaskIndex >= 0 && selectedTaskIndex < currentTasks.length) {
            openEditTask(currentTasks[selectedTaskIndex])
          }
          break
          
        case 'arrowdown':
        case 'j':
          e.preventDefault()
          setSelectedTaskIndex(prev => 
            prev < currentTasks.length - 1 ? prev + 1 : prev
          )
          break
          
        case 'arrowup':
        case 'k':
          e.preventDefault()
          setSelectedTaskIndex(prev => prev > 0 ? prev - 1 : 0)
          break
          
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
          e.preventDefault()
          const dayIndex = parseInt(e.key) - 1
          const todayIndex = getTodayIndex()
          if (todayIndex + dayIndex < daySections.length) {
            setSelectedDay(todayIndex + dayIndex)
            setSelectedTaskIndex(0)
          }
          break
          
        case 'b':
          e.preventDefault()
          setSelectedDay(-1)
          setSelectedTaskIndex(0)
          break
          
        case 'c':
          e.preventDefault()
          setShowCompleted(!showCompleted)
          break
          
        case '?':
          e.preventDefault()
          setShowShortcuts(true)
          break
          
        default:
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDay, selectedTaskIndex, daySections, editingTask, isAddingTask, showCompleted, showShortcuts])
  
  const getCurrentTaskList = useCallback(() => {
    const section = getCurrentSection()
    if (selectedDay === -1) {
      return section.tasks || []
    }
    return [
      ...(section.mustDo || []),
      ...(section.shouldDo || []),
      ...(section.normalTasks || []),
    ]
  }, [selectedDay, daySections, selectedCategory])
  
  // Reset selected task when changing days/filters
  useEffect(() => {
    setSelectedTaskIndex(0)
  }, [selectedDay, selectedCategory])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const fileContent = await window.electron.readFile('tasks.md')
      setRawContent(fileContent.content)
      const { days, backlog, completed } = parseTasksFromMarkdown(fileContent.content)
      setDaySections(days)
      setBacklogTasks(backlog)
      setCompletedTasks(completed)
      setLoading(false)
    } catch (err) {
      setError('tasks.md not found or could not be read')
      setLoading(false)
    }
  }

  const parseTasksFromMarkdown = (content: string) => {
    const lines = content.split('\n')
    const days: DaySection[] = []
    let backlog: Task[] = []
    let completed: Task[] = []
    
    let currentSection: 'day' | 'backlog' | 'completed' | null = null
    let currentDay: DaySection | null = null
    let currentUrgency: 'must' | 'should' | 'normal' = 'normal'
    let taskIndex = 0

    lines.forEach((line, index) => {
      const dayMatch = line.match(/^##\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(.+)$/)
      if (dayMatch) {
        if (currentDay) {
          days.push(currentDay)
        }
        currentDay = {
          dayName: dayMatch[1],
          date: dayMatch[2],
          mustDo: [],
          shouldDo: [],
          normalTasks: [],
        }
        currentSection = 'day'
        currentUrgency = 'normal'
        return
      }

      if (line.match(/^##\s+Backlog/i)) {
        if (currentDay) {
          days.push(currentDay)
          currentDay = null
        }
        currentSection = 'backlog'
        return
      }

      if (line.match(/^##\s+Completed/i)) {
        currentSection = 'completed'
        return
      }

      if (line.match(/^###\s+🔴\s+Must Do Today/)) {
        currentUrgency = 'must'
        return
      }
      if (line.match(/^###\s+🟡\s+Should Do Today/)) {
        currentUrgency = 'should'
        return
      }

      const taskMatch = line.match(/^-\s+\[([ xX])\]\s+\[([^\]]+)\]\s+(.+)$/)
      if (taskMatch) {
        const task: Task = {
          id: `task-${taskIndex++}`,
          completed: taskMatch[1].toLowerCase() === 'x',
          category: taskMatch[2].toLowerCase(),
          text: taskMatch[3].trim(),
          urgency: currentUrgency,
          line: index,
          rawLine: line,
        }

        if (currentSection === 'completed') {
          completed.push(task)
        } else if (currentSection === 'backlog') {
          backlog.push(task)
        } else if (currentDay) {
          if (currentUrgency === 'must') {
            currentDay.mustDo.push(task)
          } else if (currentUrgency === 'should') {
            currentDay.shouldDo.push(task)
          } else {
            currentDay.normalTasks.push(task)
          }
        }
      }
    })

    if (currentDay) {
      days.push(currentDay)
    }

    return { days, backlog, completed }
  }

  const toggleTaskCompletion = async (task: Task) => {
    try {
      const lines = rawContent.split('\n')
      const now = new Date()
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()}`
      
      if (!task.completed) {
        // Mark as done and move to completed section
        lines.splice(task.line, 1)
        
        // Find completed section
        let completedIndex = lines.findIndex(line => line.match(/^##\s+Completed/i))
        if (completedIndex === -1) {
          // Add completed section at the end
          lines.push('')
          lines.push('## Completed (Recent)')
          lines.push('')
          completedIndex = lines.length - 1
        }
        
        // Insert after the completed header
        const newLine = `- [x] [${task.category}] ${task.text} (${dateStr})`
        lines.splice(completedIndex + 1, 0, newLine)
      } else {
        // Unmark - just toggle the checkbox
        lines[task.line] = lines[task.line].replace(/\[(x|X)\]/, '[ ]')
      }
      
      const newContent = lines.join('\n')
      await window.electron.writeFile('tasks.md', newContent)
      await loadTasks()
    } catch (err) {
      console.error('Failed to toggle task:', err)
      setError('Failed to update task')
    }
  }

  const openEditTask = (task: Task) => {
    // Determine day offset
    let dayOffset = 0
    if (completedTasks.includes(task)) {
      dayOffset = -1 // completed
    } else if (backlogTasks.includes(task)) {
      dayOffset = -2 // backlog
    } else {
      // Find which day section
      const dayIndex = daySections.findIndex(d => 
        d.mustDo.includes(task) || d.shouldDo.includes(task) || d.normalTasks.includes(task)
      )
      if (dayIndex >= 0) {
        const todayIndex = getTodayIndex()
        dayOffset = dayIndex - todayIndex
      }
    }

    setEditingTask(task)
    setEditForm({
      text: task.text,
      category: task.category as CategoryType,
      dayOffset,
      urgency: task.urgency,
    })
  }

  const openAddTask = (dayOffset: number) => {
    setIsAddingTask(true)
    setAddTaskDayOffset(dayOffset)
    setEditForm({
      text: '',
      category: 'misc',
      dayOffset,
      urgency: 'normal',
    })
  }

  const closeEditModal = () => {
    setEditingTask(null)
    setIsAddingTask(false)
    setEditForm({ text: '', category: 'misc', dayOffset: 0, urgency: 'normal' })
  }

  const saveTask = async () => {
    try {
      if (!editForm.text.trim()) return

      const lines = rawContent.split('\n')
      
      if (editingTask) {
        // Remove old task
        lines.splice(editingTask.line, 1)
      }

      // Find target section
      let targetLineIndex = -1
      const todayIndex = getTodayIndex()
      
      if (editForm.dayOffset === -2) {
        // Backlog
        const backlogIndex = lines.findIndex(line => line.match(/^##\s+Backlog/i))
        if (backlogIndex >= 0) {
          targetLineIndex = backlogIndex + 1
        }
      } else if (editForm.dayOffset === -1) {
        // Completed
        let completedIndex = lines.findIndex(line => line.match(/^##\s+Completed/i))
        if (completedIndex === -1) {
          lines.push('')
          lines.push('## Completed (Recent)')
          lines.push('')
          completedIndex = lines.length - 1
        }
        targetLineIndex = completedIndex + 1
      } else {
        // Day section
        const targetDayIndex = todayIndex + editForm.dayOffset
        if (targetDayIndex >= 0 && targetDayIndex < daySections.length) {
          const daySection = daySections[targetDayIndex]
          const dayHeaderPattern = new RegExp(`^##\\s+${daySection.dayName},`)
          const dayHeaderIndex = lines.findIndex(line => line.match(dayHeaderPattern))
          
          if (dayHeaderIndex >= 0) {
            // Find the urgency section
            if (editForm.urgency === 'must') {
              const mustDoIndex = lines.findIndex((line, idx) => 
                idx > dayHeaderIndex && line.match(/^###\s+🔴\s+Must Do Today/)
              )
              targetLineIndex = mustDoIndex >= 0 ? mustDoIndex + 1 : dayHeaderIndex + 1
            } else if (editForm.urgency === 'should') {
              const shouldDoIndex = lines.findIndex((line, idx) => 
                idx > dayHeaderIndex && line.match(/^###\s+🟡\s+Should Do Today/)
              )
              targetLineIndex = shouldDoIndex >= 0 ? shouldDoIndex + 1 : dayHeaderIndex + 1
            } else {
              // Normal task - find end of urgency sections or after header
              let insertIndex = dayHeaderIndex + 1
              // Skip past urgency sections
              while (insertIndex < lines.length && 
                     (lines[insertIndex].match(/^###/) || 
                      (lines[insertIndex].startsWith('- [') && !lines[insertIndex+1]?.match(/^##/)))) {
                insertIndex++
              }
              targetLineIndex = insertIndex
            }
          }
        }
      }

      if (targetLineIndex >= 0) {
        const newLine = `- [ ] [${editForm.category}] ${editForm.text.trim()}`
        lines.splice(targetLineIndex, 0, newLine)
        
        const newContent = lines.join('\n')
        await window.electron.writeFile('tasks.md', newContent)
        await loadTasks()
        closeEditModal()
      } else {
        setError('Could not find target section')
      }
    } catch (err) {
      console.error('Failed to save task:', err)
      setError('Failed to save task')
    }
  }

  const filterByCategory = (tasks: Task[]): Task[] => {
    if (selectedCategory === 'all') return tasks
    return tasks.filter(t => t.category === selectedCategory)
  }

  const getTodayIndex = (): number => {
    const now = new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = dayNames[now.getDay()]
    const todayIndex = daySections.findIndex(d => d.dayName === todayName)
    return todayIndex >= 0 ? todayIndex : 0
  }

  const getCurrentSection = () => {
    if (selectedDay === -1) {
      return { title: 'Backlog', tasks: filterByCategory(backlogTasks) }
    }
    
    const daySection = daySections[selectedDay]
    if (!daySection) {
      return { title: 'No tasks', tasks: [] }
    }

    return {
      title: `${daySection.dayName}, ${daySection.date}`,
      mustDo: filterByCategory(daySection.mustDo),
      shouldDo: filterByCategory(daySection.shouldDo),
      normalTasks: filterByCategory(daySection.normalTasks),
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading tasks...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️ {error}</div>
          <button
            onClick={loadTasks}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentSection = getCurrentSection()
  const todayIndex = getTodayIndex()
  const totalTasks = selectedDay === -1 
    ? backlogTasks.length 
    : (currentSection.mustDo?.length || 0) + (currentSection.shouldDo?.length || 0) + (currentSection.normalTasks?.length || 0)
  const completedCount = completedTasks.filter(t => selectedCategory === 'all' || t.category === selectedCategory).length

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-purple-400" />
                Tasks
              </h1>
              <div className="text-sm text-gray-500">
                {totalTasks} task{totalTasks !== 1 ? 's' : ''} 
                {selectedCategory !== 'all' && ` in ${selectedCategory}`}
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(true)}
              className="px-3 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg text-sm text-gray-400 hover:text-gray-300 transition-all flex items-center gap-2"
              title="Keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
              ?
            </button>
          </div>
        </div>

        {/* Day Navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {daySections.map((day, index) => {
            const isToday = index === todayIndex
            const offset = index - todayIndex
            let label = day.dayName
            if (offset === 0) label = 'Today'
            else if (offset === 1) label = 'Tomorrow'
            else if (offset > 1 && offset <= 3) label = `+${offset}`

            return (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${selectedDay === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-300'
                  }
                  ${isToday && selectedDay !== index ? 'border-2 border-purple-500/30' : ''}
                `}
              >
                {label}
                {isToday && <span className="ml-1.5 text-xs opacity-70">•</span>}
              </button>
            )
          })}
          <button
            onClick={() => setSelectedDay(-1)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${selectedDay === -1
                ? 'bg-purple-600 text-white'
                : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a] hover:text-gray-300'
              }
            `}
          >
            Backlog
          </button>
        </div>

        {/* Category Filters */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-500" />
          {(['all', 'ops', 'marketing', 'forge', 'finance', 'misc'] as CategoryType[]).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${selectedCategory === cat
                  ? cat === 'all' 
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' 
                    : CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]
                  : 'bg-[#2a2a2a] text-gray-500 border-[#3a3a3a] hover:border-[#4a4a4a]'
                }
              `}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 bg-[#2a2a2a]"
              />
              Show completed ({completedCount})
            </label>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-6">
          {selectedDay !== -1 && (
            <>
              {/* Must Do Section */}
              {currentSection.mustDo && currentSection.mustDo.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-5 h-5 text-red-400" />
                    <h2 className="text-lg font-semibold text-red-400">Must Do Today</h2>
                    <span className="text-xs text-gray-500 ml-1">({currentSection.mustDo.length})</span>
                  </div>
                  <div className="space-y-2">
                    {currentSection.mustDo.map((task, idx) => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        selected={selectedTaskIndex === idx}
                        ref={selectedTaskIndex === idx ? selectedTaskRef : null}
                        onToggle={toggleTaskCompletion}
                        onEdit={openEditTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Should Do Section */}
              {currentSection.shouldDo && currentSection.shouldDo.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-semibold text-yellow-400">Should Do Today</h2>
                    <span className="text-xs text-gray-500 ml-1">({currentSection.shouldDo.length})</span>
                  </div>
                  <div className="space-y-2">
                    {currentSection.shouldDo.map((task, idx) => {
                      const globalIdx = (currentSection.mustDo?.length || 0) + idx
                      return (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          selected={selectedTaskIndex === globalIdx}
                          ref={selectedTaskIndex === globalIdx ? selectedTaskRef : null}
                          onToggle={toggleTaskCompletion}
                          onEdit={openEditTask}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Normal Tasks */}
              {currentSection.normalTasks && currentSection.normalTasks.length > 0 && (
                <div>
                  <div className="space-y-2">
                    {currentSection.normalTasks.map((task, idx) => {
                      const globalIdx = (currentSection.mustDo?.length || 0) + (currentSection.shouldDo?.length || 0) + idx
                      return (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          selected={selectedTaskIndex === globalIdx}
                          ref={selectedTaskIndex === globalIdx ? selectedTaskRef : null}
                          onToggle={toggleTaskCompletion}
                          onEdit={openEditTask}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add Task Button */}
              <button
                onClick={() => openAddTask(selectedDay - getTodayIndex())}
                className="w-full py-3 border-2 border-dashed border-[#3a3a3a] rounded-lg text-gray-500 hover:border-purple-500/50 hover:text-purple-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add task
              </button>
            </>
          )}

          {/* Backlog */}
          {selectedDay === -1 && (
            <div>
              {currentSection.tasks && currentSection.tasks.length > 0 ? (
                <div className="space-y-2">
                  {currentSection.tasks.map((task, idx) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      selected={selectedTaskIndex === idx}
                      ref={selectedTaskIndex === idx ? selectedTaskRef : null}
                      onToggle={toggleTaskCompletion}
                      onEdit={openEditTask}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {selectedCategory === 'all' ? 'Backlog is empty' : 'No tasks in this category'}
                </div>
              )}
              
              {/* Add Task Button for Backlog */}
              <button
                onClick={() => openAddTask(-2)}
                className="w-full mt-4 py-3 border-2 border-dashed border-[#3a3a3a] rounded-lg text-gray-500 hover:border-purple-500/50 hover:text-purple-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add task to backlog
              </button>
            </div>
          )}

          {/* Completed Section */}
          {showCompleted && completedTasks.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#3a3a3a]">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-500">Completed (Recent)</h2>
                <span className="text-xs text-gray-600 ml-1">({completedCount})</span>
              </div>
              <div className="space-y-2">
                {filterByCategory(completedTasks).map((task, idx) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    selected={false}
                    ref={null}
                    onToggle={toggleTaskCompletion}
                    onEdit={openEditTask}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {selectedDay !== -1 && totalTasks === 0 && (
          <div className="text-center py-12 text-gray-500">
            {selectedCategory === 'all' 
              ? 'No tasks for this day' 
              : `No ${selectedCategory} tasks for this day`
            }
          </div>
        )}
      </div>

      {/* Shortcuts Help Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-purple-400" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Task Actions</h4>
                <div className="space-y-2">
                  <ShortcutRow keys={['n']} description="Add new task" />
                  <ShortcutRow keys={['Space', 'Enter']} description="Toggle task completion" />
                  <ShortcutRow keys={['e']} description="Edit selected task" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Navigation</h4>
                <div className="space-y-2">
                  <ShortcutRow keys={['↑', 'k']} description="Select previous task" />
                  <ShortcutRow keys={['↓', 'j']} description="Select next task" />
                  <ShortcutRow keys={['1-7']} description="Jump to day (1=Today)" />
                  <ShortcutRow keys={['b']} description="View backlog" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">View Options</h4>
                <div className="space-y-2">
                  <ShortcutRow keys={['c']} description="Toggle completed tasks" />
                  <ShortcutRow keys={['?']} description="Show this help" />
                  <ShortcutRow keys={['Esc']} description="Close modal" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#3a3a3a]">
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {(editingTask || isAddingTask) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeEditModal}>
          <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isAddingTask ? 'Add Task' : 'Edit Task'}
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Task Text */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Task</label>
                <input
                  type="text"
                  value={editForm.text}
                  onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value as CategoryType })}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="ops">Ops</option>
                  <option value="marketing">Marketing</option>
                  <option value="forge">Forge</option>
                  <option value="finance">Finance</option>
                  <option value="misc">Misc</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Due Date</label>
                <div className="grid grid-cols-4 gap-2">
                  {getTodayIndex() >= 0 && daySections.slice(getTodayIndex(), getTodayIndex() + 5).map((day, idx) => {
                    const offset = idx
                    let label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : `+${offset}`
                    if (idx >= 2) label = day.dayName.slice(0, 3)
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => setEditForm({ ...editForm, dayOffset: offset })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          editForm.dayOffset === offset
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setEditForm({ ...editForm, dayOffset: -2 })}
                  className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    editForm.dayOffset === -2
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                  }`}
                >
                  Backlog
                </button>
              </div>

              {/* Urgency (only for day tasks, not backlog) */}
              {editForm.dayOffset >= 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditForm({ ...editForm, urgency: 'normal' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        editForm.urgency === 'normal'
                          ? 'bg-gray-600 text-white'
                          : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setEditForm({ ...editForm, urgency: 'should' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        editForm.urgency === 'should'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                      }`}
                    >
                      🟡 Should
                    </button>
                    <button
                      onClick={() => setEditForm({ ...editForm, urgency: 'must' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        editForm.urgency === 'must'
                          ? 'bg-red-600 text-white'
                          : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                      }`}
                    >
                      🔴 Must
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTask}
                  disabled={!editForm.text.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TaskItem = forwardRef<HTMLDivElement, { 
  task: Task
  selected: boolean
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
}>(({ 
  task, 
  selected,
  onToggle, 
  onEdit 
}, ref) => {
  const categoryColor = CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.misc

  return (
    <div
      ref={ref}
      className={`
        flex items-start gap-3 p-4 rounded-lg border transition-all hover-lift
        ${
          task.completed
            ? 'bg-[#1a1a1a] border-[#2a2a2a] opacity-60'
            : task.urgency === 'must'
            ? selected 
              ? 'bg-[#1a0f0f] border-red-500 ring-2 ring-red-500/50' 
              : 'bg-[#1a0f0f] border-red-500/30 hover:border-red-500/50'
            : task.urgency === 'should'
            ? selected 
              ? 'bg-[#1a1a0f] border-yellow-500 ring-2 ring-yellow-500/50' 
              : 'bg-[#1a1a0f] border-yellow-500/30 hover:border-yellow-500/50'
            : selected 
            ? 'bg-[#141414] border-purple-500 ring-2 ring-purple-500/50' 
            : 'bg-[#141414] border-[#2a2a2a] hover:border-purple-500/50'
        }
      `}
    >
      <div 
        className="mt-0.5 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(task)
        }}
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-purple-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-600 hover:text-purple-500 transition-colors" />
        )}
      </div>
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => onEdit(task)}
      >
        <div className={`mb-1.5 ${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
          {task.text}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColor}`}>
            {task.category}
          </span>
          {task.urgency === 'must' && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Must do
            </span>
          )}
          {task.urgency === 'should' && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Should do
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

TaskItem.displayName = 'TaskItem'

function ShortcutRow({ keys, description }: { keys: string[], description: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, idx) => (
          <kbd
            key={idx}
            className="px-2 py-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-xs font-mono text-gray-300"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}

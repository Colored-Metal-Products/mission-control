'use client'

import { useState, useEffect } from 'react'
import { Calendar, Filter, CheckCircle2, Circle, Clock, Flame } from 'lucide-react'

interface Task {
  id: string
  text: string
  completed: boolean
  category: string
  urgency: 'must' | 'should' | 'normal'
  line: number
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

export default function TasksView() {
  const [daySections, setDaySections] = useState<DaySection[]>([])
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedDay, setSelectedDay] = useState<number>(0) // 0 = today, 1 = tomorrow, etc., -1 = backlog
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const fileContent = await window.electron.readFile('tasks.md')
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
      // Detect day headers (## Monday, Feb 16)
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

      // Detect Backlog section
      if (line.match(/^##\s+Backlog/i)) {
        if (currentDay) {
          days.push(currentDay)
          currentDay = null
        }
        currentSection = 'backlog'
        return
      }

      // Detect Completed section
      if (line.match(/^##\s+Completed/i)) {
        currentSection = 'completed'
        return
      }

      // Detect urgency subsections
      if (line.match(/^###\s+🔴\s+Must Do Today/)) {
        currentUrgency = 'must'
        return
      }
      if (line.match(/^###\s+🟡\s+Should Do Today/)) {
        currentUrgency = 'should'
        return
      }

      // Parse task lines
      const taskMatch = line.match(/^-\s+\[([ xX])\]\s+\[([^\]]+)\]\s+(.+)$/)
      if (taskMatch) {
        const task: Task = {
          id: `task-${taskIndex++}`,
          completed: taskMatch[1].toLowerCase() === 'x',
          category: taskMatch[2].toLowerCase(),
          text: taskMatch[3].trim(),
          urgency: currentUrgency,
          line: index,
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

  const filterByCategory = (tasks: Task[]): Task[] => {
    if (selectedCategory === 'all') return tasks
    return tasks.filter(t => t.category === selectedCategory)
  }

  const getTodayIndex = (): number => {
    // Try to find "today" by matching current day name
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

    const allTasks = [
      ...daySection.mustDo,
      ...daySection.shouldDo,
      ...daySection.normalTasks,
    ]

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
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-400" />
            Tasks
          </h1>
          <div className="text-sm text-gray-500">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''} 
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
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
                    {currentSection.mustDo.map(task => (
                      <TaskItem key={task.id} task={task} />
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
                    {currentSection.shouldDo.map(task => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Normal Tasks */}
              {currentSection.normalTasks && currentSection.normalTasks.length > 0 && (
                <div>
                  <div className="space-y-2">
                    {currentSection.normalTasks.map(task => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Backlog */}
          {selectedDay === -1 && (
            <div>
              {currentSection.tasks && currentSection.tasks.length > 0 ? (
                <div className="space-y-2">
                  {currentSection.tasks.map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {selectedCategory === 'all' ? 'Backlog is empty' : 'No tasks in this category'}
                </div>
              )}
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
                {filterByCategory(completedTasks).map(task => (
                  <TaskItem key={task.id} task={task} />
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
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  const categoryColor = CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.misc

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border transition-all hover-lift
        ${
          task.completed
            ? 'bg-[#1a1a1a] border-[#2a2a2a] opacity-60'
            : task.urgency === 'must'
            ? 'bg-[#1a0f0f] border-red-500/30 hover:border-red-500/50'
            : task.urgency === 'should'
            ? 'bg-[#1a1a0f] border-yellow-500/30 hover:border-yellow-500/50'
            : 'bg-[#141414] border-[#2a2a2a] hover:border-purple-500/50'
        }
      `}
    >
      <div className="mt-0.5">
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-purple-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-600 hover:text-purple-500 transition-colors" />
        )}
      </div>
      <div className="flex-1">
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
}

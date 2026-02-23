'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  CheckSquare, 
  Flame, 
  Brain,
  Users,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react'

interface DashboardStats {
  todayMustDo: number
  todayShouldDo: number
  todayTotal: number
  backlogCount: number
  completedToday: number
  recentMemories: number
  pendingApprovals: number
}

interface UpcomingEvent {
  name: string
  time: string
  timeUntil: string
  color: string
}

interface RecentActivity {
  type: 'task' | 'memory' | 'approval'
  text: string
  time: string
}

export default function DashboardView() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState<DashboardStats>({
    todayMustDo: 0,
    todayShouldDo: 0,
    todayTotal: 0,
    backlogCount: 0,
    completedToday: 0,
    recentMemories: 0,
    pendingApprovals: 0,
  })
  const [topTasks, setTopTasks] = useState<string[]>([])
  const [nextEvent, setNextEvent] = useState<UpcomingEvent | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load tasks to get today's stats
      const tasksResult = await window.electron.readFile('tasks.md')
      const tasksData = parseTasks(tasksResult.content)
      
      // Load calendar to get next event
      const heartbeatResult = await window.electron.readFile('HEARTBEAT.md')
      const nextEventData = parseNextEvent(heartbeatResult.content)
      
      // Load recent memory files
      const memoryData = await window.electron.getMemoryFiles()
      const recentMemoryCount = memoryData.dailyFiles.filter((f: any) => {
        const fileDate = new Date(f.name.replace('.md', ''))
        const daysSince = Math.floor((Date.now() - fileDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysSince <= 7
      }).length
      
      // Load approvals
      let pendingApprovalsCount = 0
      try {
        const approvalsResult = await window.electron.readFile('memory/council-approvals.json')
        const approvals = JSON.parse(approvalsResult.content)
        pendingApprovalsCount = approvals.filter((a: any) => a.status === 'pending').length
      } catch (e) {
        // File might not exist yet
      }
      
      setStats({
        todayMustDo: tasksData.todayMustDo,
        todayShouldDo: tasksData.todayShouldDo,
        todayTotal: tasksData.todayTotal,
        backlogCount: tasksData.backlogCount,
        completedToday: tasksData.completedToday,
        recentMemories: recentMemoryCount,
        pendingApprovals: pendingApprovalsCount,
      })
      
      setTopTasks(tasksData.topTasks)
      setNextEvent(nextEventData)
      
      setLoading(false)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setLoading(false)
    }
  }

  const parseTasks = (content: string) => {
    const lines = content.split('\n')
    let todayMustDo = 0
    let todayShouldDo = 0
    let todayTotal = 0
    let backlogCount = 0
    let completedToday = 0
    const topTasks: string[] = []
    
    let inTodaySection = false
    let inBacklogSection = false
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Detect sections
      if (trimmed.startsWith('## Today')) {
        inTodaySection = true
        inBacklogSection = false
        continue
      } else if (trimmed.startsWith('## Tomorrow') || trimmed.startsWith('## ')) {
        inTodaySection = false
      }
      
      if (trimmed.includes('### Backlog') || trimmed.includes('## Backlog')) {
        inBacklogSection = true
        inTodaySection = false
        continue
      }
      
      // Count tasks
      if (trimmed.startsWith('- [ ]')) {
        const taskText = trimmed.replace('- [ ]', '').trim()
        
        if (inTodaySection) {
          todayTotal++
          
          if (taskText.includes('[MUST]') || taskText.includes('🔥')) {
            todayMustDo++
            if (topTasks.length < 3) {
              topTasks.push(taskText.replace('[MUST]', '').replace('🔥', '').trim())
            }
          } else if (taskText.includes('[SHOULD]')) {
            todayShouldDo++
            if (topTasks.length < 3 && todayMustDo === 0) {
              topTasks.push(taskText.replace('[SHOULD]', '').trim())
            }
          } else {
            if (topTasks.length < 3 && todayMustDo === 0 && todayShouldDo === 0) {
              topTasks.push(taskText)
            }
          }
        } else if (inBacklogSection) {
          backlogCount++
        }
      } else if (trimmed.startsWith('- [x]') && inTodaySection) {
        completedToday++
      }
    }
    
    return {
      todayMustDo,
      todayShouldDo,
      todayTotal,
      backlogCount,
      completedToday,
      topTasks,
    }
  }

  const parseNextEvent = (content: string): UpcomingEvent | null => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Define weekly schedule
    const schedule = [
      // Monday
      { day: 1, hour: 6, minute: 30, name: 'Daily Agenda', color: 'text-orange-400' },
      { day: 1, hour: 9, minute: 0, name: 'Monday Ops', color: 'text-purple-400' },
      // Tuesday
      { day: 2, hour: 6, minute: 30, name: 'Daily Agenda', color: 'text-orange-400' },
      { day: 2, hour: 9, minute: 0, name: 'Marketing Day', color: 'text-green-400' },
      // Wednesday
      { day: 3, hour: 6, minute: 30, name: 'Daily Agenda', color: 'text-orange-400' },
      // Thursday
      { day: 4, hour: 6, minute: 30, name: 'Daily Agenda', color: 'text-orange-400' },
      { day: 4, hour: 9, minute: 0, name: 'Forge Day', color: 'text-purple-400' },
      // Friday
      { day: 5, hour: 6, minute: 30, name: 'Daily Agenda', color: 'text-orange-400' },
      { day: 5, hour: 9, minute: 0, name: 'Finance Day', color: 'text-yellow-400' },
      // Daily (every day)
      { day: 0, hour: 4, minute: 0, name: 'Daily Backup', color: 'text-blue-400' },
      { day: 1, hour: 4, minute: 0, name: 'Daily Backup', color: 'text-blue-400' },
      { day: 2, hour: 4, minute: 0, name: 'Daily Backup', color: 'text-blue-400' },
      { day: 3, hour: 4, minute: 0, name: 'Daily Backup', color: 'text-blue-400' },
      { day: 4, hour: 4, minute: 0, name: 'Daily Backup', color: 'text-blue-400' },
      { day: 5, hour: 4, minute: 0, name: 'Daily Backup', color: 'text-blue-400' },
      { day: 6, hour: 4, minute: 0, name: 'Daily Backup', color: 'text-blue-400' },
    ]
    
    // Find next upcoming event
    let nextEvent = null
    let minMinutesUntil = Infinity
    
    for (const event of schedule) {
      // Calculate minutes until this event
      let daysUntil = (event.day - currentDay + 7) % 7
      if (daysUntil === 0 && (event.hour < currentHour || (event.hour === currentHour && event.minute <= currentMinute))) {
        daysUntil = 7 // Event already passed today, next occurrence is next week
      }
      
      const minutesUntil = daysUntil * 24 * 60 + (event.hour - currentHour) * 60 + (event.minute - currentMinute)
      
      if (minutesUntil > 0 && minutesUntil < minMinutesUntil) {
        minMinutesUntil = minutesUntil
        
        const hoursUntil = Math.floor(minutesUntil / 60)
        const minsUntil = minutesUntil % 60
        
        let timeUntil = ''
        if (hoursUntil === 0) {
          timeUntil = `In ${minsUntil} min`
        } else if (hoursUntil < 24) {
          timeUntil = `In ${hoursUntil}h ${minsUntil}m`
        } else {
          const days = Math.floor(hoursUntil / 24)
          const hours = hoursUntil % 24
          timeUntil = days === 1 ? `Tomorrow at ${event.hour}:${event.minute.toString().padStart(2, '0')}` : `In ${days}d ${hours}h`
        }
        
        const timeStr = `${event.hour}:${event.minute.toString().padStart(2, '0')}`
        
        nextEvent = {
          name: event.name,
          time: timeStr,
          timeUntil,
          color: event.color,
        }
      }
    }
    
    return nextEvent
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto p-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-700/50 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-8">
      {/* Header with Time */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-6 h-6 text-purple-400" />
          <h1 className="text-4xl font-light text-white">{formatTime(currentTime)}</h1>
        </div>
        <p className="text-lg text-gray-400 ml-9">{formatDate(currentTime)}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today's Must-Do */}
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-4 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <Flame className="w-5 h-5 text-red-400" />
            <span className="text-2xl font-bold text-white">{stats.todayMustDo}</span>
          </div>
          <p className="text-sm text-gray-300">Must Do Today</p>
        </div>

        {/* Today's Total */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <CheckSquare className="w-5 h-5 text-purple-400" />
            <span className="text-2xl font-bold text-white">{stats.todayTotal}</span>
          </div>
          <p className="text-sm text-gray-300">Total Tasks Today</p>
        </div>

        {/* Completed Today */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold text-white">{stats.completedToday}</span>
          </div>
          <p className="text-sm text-gray-300">Completed Today</p>
        </div>

        {/* Backlog */}
        <div className="bg-gradient-to-br from-gray-500/20 to-slate-500/20 border border-gray-500/30 rounded-lg p-4 hover-lift">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-2xl font-bold text-white">{stats.backlogCount}</span>
          </div>
          <p className="text-sm text-gray-300">In Backlog</p>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Top Priority Tasks */}
          <div className="bg-[#242424] border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              Top Priority Today
            </h2>
            
            {topTasks.length > 0 ? (
              <div className="space-y-3">
                {topTasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded border border-gray-700/30 hover:border-purple-500/50 transition-colors">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 text-sm font-semibold">
                      {i + 1}
                    </div>
                    <p className="text-gray-200 flex-1">{task}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No tasks for today</p>
            )}
          </div>

          {/* Recent Memories */}
          <div className="bg-[#242424] border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Recent Memory
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-gray-300">{stats.recentMemories} entries this week</p>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Next Scheduled Event */}
          {nextEvent && (
            <div className="bg-[#242424] border border-gray-700/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Next Up
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-medium ${nextEvent.color}`}>{nextEvent.name}</span>
                  <span className="text-sm text-gray-400">{nextEvent.time}</span>
                </div>
                <p className="text-sm text-gray-500">{nextEvent.timeUntil}</p>
              </div>
            </div>
          )}

          {/* Pending Approvals */}
          {stats.pendingApprovals > 0 && (
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                Pending Approvals
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-gray-200">{stats.pendingApprovals} items awaiting review</p>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-[#242424] border border-gray-700/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition-colors">
                View Full Calendar
              </button>
              <button className="w-full text-left px-4 py-2 rounded bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 text-gray-300 transition-colors">
                Search Memory
              </button>
              <button className="w-full text-left px-4 py-2 rounded bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 text-gray-300 transition-colors">
                Browse Projects
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

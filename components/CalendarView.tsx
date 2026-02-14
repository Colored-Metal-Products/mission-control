'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar as CalendarIcon, Zap } from 'lucide-react'

interface CronJob {
  id: string
  name: string
  schedule: string
  type: 'recurring' | 'one-time'
  color: string
  day?: number // 0 = Sunday, 1 = Monday, etc.
  time: string // "HH:MM" format
  description?: string
}

interface UpcomingTask {
  name: string
  time: string
  countdown: string
  color: string
}

export default function CalendarView() {
  const [viewMode, setViewMode] = useState<'week' | 'today'>('week')
  const [currentWeek, setCurrentWeek] = useState<Date[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([])

  // Define cron jobs from HEARTBEAT.md
  const cronJobs: CronJob[] = [
    { id: 'heartbeat', name: 'Heartbeat Check', schedule: 'Every 30 min', type: 'recurring', color: '#a855f7', time: '00:00' },
    { id: 'daily-backup', name: 'Daily Backup', schedule: '4:00 AM daily', type: 'recurring', color: '#3b82f6', time: '04:00', description: 'Sync clawd to Dropbox' },
    { id: 'daily-agenda', name: 'Daily Agenda', schedule: '6:30 AM Mon-Fri', type: 'recurring', color: '#f59e0b', time: '06:30', description: 'Morning briefing with tasks' },
    { id: 'monday-ops', name: 'Monday Ops', schedule: '9:00 AM Mondays', type: 'recurring', color: '#8b5cf6', day: 1, time: '09:00', description: 'COI requests, pay apps, AR report' },
    { id: 'marketing-day', name: 'Marketing Day', schedule: '9:00 AM Tuesdays', type: 'recurring', color: '#10b981', day: 2, time: '09:00', description: 'Forge quotes, Pulse campaign, Apollo' },
    { id: 'thursday-forge', name: 'Forge Day', schedule: '9:00 AM Thursdays', type: 'recurring', color: '#f59e0b', day: 4, time: '09:00', description: 'Takeoff, Pulse features, platform dev' },
    { id: 'friday-finance', name: 'Finance Day', schedule: '9:00 AM Fridays', type: 'recurring', color: '#06b6d4', day: 5, time: '09:00', description: 'Weekly portfolio review, picks' },
    { id: 'midnight-stats', name: 'Stats Refresh', schedule: '12:00 AM daily', type: 'recurring', color: '#6366f1', time: '00:00', description: 'Daily stats refresh' },
    { id: 'manual-stats', name: 'Manual Stats', schedule: '11:00 PM daily', type: 'recurring', color: '#ec4899', time: '23:00', description: 'Manual stats collection' },
  ]

  const alwaysRunning = cronJobs.filter(job => 
    job.schedule.includes('Every') || job.schedule.includes('min')
  )

  const scheduledJobs = cronJobs.filter(job => 
    !job.schedule.includes('Every') && !job.schedule.includes('min')
  )

  useEffect(() => {
    const week = getWeekDates()
    setCurrentWeek(week)
    updateUpcomingTasks()

    const interval = setInterval(updateUpcomingTasks, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const getWeekDates = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day // Sunday of current week
    const sunday = new Date(today.setDate(diff))
    
    const week = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday)
      date.setDate(sunday.getDate() + i)
      week.push(date)
    }
    return week
  }

  const updateUpcomingTasks = () => {
    const now = new Date()
    const upcoming: UpcomingTask[] = []

    scheduledJobs.forEach(job => {
      const nextRun = getNextRunTime(job, now)
      if (nextRun) {
        const diff = nextRun.getTime() - now.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        let countdown = ''
        if (hours < 1) {
          countdown = `In ${mins} min`
        } else if (hours < 24) {
          countdown = `In ${hours} hours`
        } else {
          const days = Math.floor(hours / 24)
          countdown = `In ${days} day${days > 1 ? 's' : ''}`
        }

        upcoming.push({
          name: job.name,
          time: nextRun.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          countdown,
          color: job.color
        })
      }
    })

    // Sort by time
    upcoming.sort((a, b) => {
      const timeA = new Date('1970/01/01 ' + a.time).getTime()
      const timeB = new Date('1970/01/01 ' + b.time).getTime()
      return timeA - timeB
    })

    setUpcomingTasks(upcoming.slice(0, 5)) // Show next 5 tasks
  }

  const getNextRunTime = (job: CronJob, from: Date): Date | null => {
    const [hours, minutes] = job.time.split(':').map(Number)
    
    // For jobs with specific days
    if (job.day !== undefined) {
      const next = new Date(from)
      const daysUntil = (job.day - from.getDay() + 7) % 7
      next.setDate(from.getDate() + (daysUntil === 0 && from.getHours() >= hours ? 7 : daysUntil))
      next.setHours(hours, minutes, 0, 0)
      return next
    }

    // For daily jobs
    const today = new Date(from)
    today.setHours(hours, minutes, 0, 0)
    
    if (today > from) {
      return today
    } else {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }
  }

  const getJobsForDay = (date: Date) => {
    const dayOfWeek = date.getDay()
    return scheduledJobs.filter(job => {
      if (job.day !== undefined) {
        return job.day === dayOfWeek
      }
      // Daily jobs appear every day
      return true
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1a]">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Calendar</h1>
            <p className="text-gray-400">Scheduled tasks and upcoming events</p>
          </div>
          
          {/* View Toggle */}
          <div className="flex gap-2 bg-[#141414] rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('today')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'today'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Always Running Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Always Running</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alwaysRunning.map(job => (
              <div
                key={job.id}
                className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: job.color }}
                  />
                  <h3 className="font-semibold">{job.name}</h3>
                </div>
                <p className="text-sm text-gray-400">{job.schedule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'week' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold">This Week</h2>
            </div>
            <div className="grid grid-cols-7 gap-3">
              {currentWeek.map((date, index) => {
                const dayJobs = getJobsForDay(date)
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                const dayNum = date.getDate()
                
                return (
                  <div
                    key={index}
                    className={`bg-[#141414] border rounded-lg overflow-hidden ${
                      isToday(date) ? 'border-purple-500' : 'border-[#2a2a2a]'
                    }`}
                  >
                    <div className={`p-3 text-center border-b ${
                      isToday(date) 
                        ? 'bg-purple-600/20 border-purple-500/50' 
                        : 'border-[#2a2a2a]'
                    }`}>
                      <div className="text-xs text-gray-400 uppercase">{dayName}</div>
                      <div className="text-lg font-bold">{dayNum}</div>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {dayJobs.map(job => (
                        <div
                          key={job.id}
                          className="text-xs p-2 rounded"
                          style={{ backgroundColor: job.color + '20', borderLeft: `3px solid ${job.color}` }}
                        >
                          <div className="font-medium text-white mb-0.5">{job.name}</div>
                          <div className="text-gray-400">{job.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Next Up Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Next Up</h2>
          </div>
          <div className="space-y-2">
            {upcomingTasks.map((task, index) => (
              <div
                key={index}
                className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-4 flex items-center justify-between hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: task.color }}
                  />
                  <div>
                    <h3 className="font-semibold">{task.name}</h3>
                    <p className="text-sm text-gray-400">{task.time}</p>
                  </div>
                </div>
                <div className="text-sm font-medium text-purple-400">{task.countdown}</div>
              </div>
            ))}
            {upcomingTasks.length === 0 && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-8 text-center text-gray-500">
                No upcoming tasks scheduled
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

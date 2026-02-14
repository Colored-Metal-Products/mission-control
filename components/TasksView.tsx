'use client'

import { useState, useEffect } from 'react'

interface Task {
  id: string
  text: string
  completed: boolean
  line: number
}

export default function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const fileContent = await window.electron.readFile('tasks.md')
      const parsedTasks = parseTasksFromMarkdown(fileContent.content)
      setTasks(parsedTasks)
      setLoading(false)
    } catch (err) {
      setError('tasks.md not found or could not be read')
      setLoading(false)
    }
  }

  const parseTasksFromMarkdown = (content: string): Task[] => {
    const lines = content.split('\n')
    const tasks: Task[] = []

    lines.forEach((line, index) => {
      const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/)
      if (match) {
        tasks.push({
          id: `task-${index}`,
          text: match[2].trim(),
          completed: match[1].toLowerCase() === 'x',
          line: index,
        })
      }
    })

    return tasks
  }

  const completedTasks = tasks.filter((t) => t.completed)
  const pendingTasks = tasks.filter((t) => !t.completed)

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tasks</h1>
          <div className="text-sm text-gray-500">
            {pendingTasks.length} pending · {completedTasks.length} completed
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No tasks found in tasks.md
          </div>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-purple-400">Pending</h2>
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-500">Completed</h2>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border transition-colors
        ${
          task.completed
            ? 'bg-[#1a1a1a] border-[#2a2a2a] opacity-60'
            : 'bg-[#141414] border-purple-500/30 hover:border-purple-500/50'
        }
      `}
    >
      <div className="mt-0.5">
        {task.completed ? (
          <div className="w-5 h-5 rounded border-2 border-purple-500 bg-purple-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded border-2 border-gray-600 hover:border-purple-500 transition-colors"></div>
        )}
      </div>
      <div className={`flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
        {task.text}
      </div>
    </div>
  )
}

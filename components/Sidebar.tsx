'use client'

import { 
  CheckSquare, 
  FileText, 
  CheckCircle, 
  Users, 
  Calendar, 
  FolderKanban, 
  Brain, 
  BookOpen, 
  UserCircle, 
  Layers, 
  UsersRound 
} from 'lucide-react'

interface SidebarProps {
  currentView: string
  onViewChange: (view: 'tasks' | 'content' | 'approvals' | 'council' | 'calendar' | 'projects' | 'memory' | 'docs' | 'people' | 'office' | 'team' | 'search') => void
  isOpen: boolean
}

export default function Sidebar({ currentView, onViewChange, isOpen }: SidebarProps) {
  const items = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle },
    { id: 'council', label: 'Council', icon: Users },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'docs', label: 'Docs', icon: BookOpen },
    { id: 'people', label: 'People', icon: UserCircle },
    { id: 'office', label: 'Workspaces', icon: Layers },
    { id: 'team', label: 'Team', icon: UsersRound },
  ]

  if (!isOpen) {
    return (
      <div className="w-16 bg-[#141414] border-r border-[#2a2a2a] flex flex-col items-center py-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              className={`
                p-3 rounded-lg transition-all
                ${
                  currentView === item.id
                    ? 'bg-purple-600/20 text-purple-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]'
                }
              `}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-[220px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col">
      <div className="flex-1 py-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all
                ${
                  currentView === item.id
                    ? 'bg-purple-600/20 text-purple-500 border-r-2 border-purple-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      
      {/* Agent Avatar at Bottom */}
      <div className="border-t border-[#2a2a2a] p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-lg font-bold">
            🐺
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Mozzie</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import MemoryView from '@/components/MemoryView'
import ProjectsView from '@/components/ProjectsView'
import TasksView from '@/components/TasksView'
import DocsView from '@/components/DocsView'
import SearchView from '@/components/SearchView'
import CalendarView from '@/components/CalendarView'
import ContentView from '@/components/ContentView'
import ComingSoonView from '@/components/ComingSoonView'
import { FileText, CheckCircle, Users, UserCircle, Building, UsersRound } from 'lucide-react'

type ViewType = 'tasks' | 'content' | 'approvals' | 'council' | 'calendar' | 'projects' | 'memory' | 'docs' | 'people' | 'office' | 'team' | 'search'

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('tasks')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setCurrentView('search')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const renderView = () => {
    switch (currentView) {
      case 'memory':
        return <MemoryView />
      case 'projects':
        return <ProjectsView />
      case 'tasks':
        return <TasksView />
      case 'docs':
        return <DocsView />
      case 'search':
        return <SearchView />
      case 'calendar':
        return <CalendarView />
      case 'content':
        return <ContentView />
      case 'approvals':
        return <ComingSoonView 
          title="Approvals" 
          description="Review and approve pending items, requests, and decisions"
          Icon={CheckCircle}
        />
      case 'council':
        return <ComingSoonView 
          title="Council" 
          description="Collaborate with your AI council and get strategic insights"
          Icon={Users}
        />
      case 'people':
        return <ComingSoonView 
          title="People" 
          description="Manage contacts, relationships, and communications"
          Icon={UserCircle}
        />
      case 'office':
        return <ComingSoonView 
          title="Office" 
          description="Business operations, admin, and workspace management"
          Icon={Building}
        />
      case 'team':
        return <ComingSoonView 
          title="Team" 
          description="Team coordination, task delegation, and collaboration"
          Icon={UsersRound}
        />
      default:
        return <MemoryView />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-white">
      <TopBar 
        onSearchClick={() => { setSearchOpen(true); setCurrentView('search') }} 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onRefresh={() => setRefreshKey(k => k + 1)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          isOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-hidden" key={refreshKey}>
          {renderView()}
        </main>
      </div>
    </div>
  )
}

'use client'

import { Menu, Grid3x3, Search, Pause, Bell, RefreshCw } from 'lucide-react'

interface TopBarProps {
  onSearchClick: () => void
  onToggleSidebar: () => void
  onRefresh?: () => void
  sidebarOpen: boolean
}

export default function TopBar({ onSearchClick, onToggleSidebar, onRefresh, sidebarOpen }: TopBarProps) {
  const handlePingMozzie = () => {
    // This would send a notification to the main agent
    alert('Notification sent to Mozzie!')
  }

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
  }

  const handlePause = () => {
    alert('Pause functionality would stop background tasks')
  }

  return (
    <div className="h-14 bg-[#141414] border-b border-[#2a2a2a] flex items-center justify-between px-4">
      {/* Left: Sidebar Toggle + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-purple-500" />
          <h1 className="text-lg font-semibold">Mission Control</h1>
        </div>
      </div>

      {/* Center: Search */}
      <button
        onClick={onSearchClick}
        className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] rounded-lg hover:bg-[#333333] transition-colors text-sm text-gray-400 hover:text-gray-200 min-w-[280px]"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="px-2 py-0.5 bg-[#1a1a1a] rounded text-xs font-mono border border-[#3a3a3a]">
          ⌘K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePause}
          className="p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
          title="Pause background tasks"
        >
          <Pause className="w-5 h-5" />
        </button>
        
        <button
          onClick={handlePingMozzie}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
        >
          <Bell className="w-4 h-4" />
          <span>Ping Mozzie</span>
        </button>
        
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-gray-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

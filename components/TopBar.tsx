'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, Grid3x3, Search, Pause, Bell, RefreshCw, Send, X, Loader2 } from 'lucide-react'

interface TopBarProps {
  onSearchClick: () => void
  onToggleSidebar: () => void
  onRefresh?: () => void
  sidebarOpen: boolean
}

export default function TopBar({ onSearchClick, onToggleSidebar, onRefresh, sidebarOpen }: TopBarProps) {
  const [pingOpen, setPingOpen] = useState(false)
  const [pingMessage, setPingMessage] = useState('')
  const [pingStatus, setPingStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pingOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [pingOpen])

  const handlePingMozzie = () => {
    setPingOpen(true)
    setPingStatus('idle')
    setPingMessage('')
  }

  const handleSendPing = async () => {
    if (!pingMessage.trim()) return
    setPingStatus('sending')
    try {
      const result = await (window as any).electron.pingMozzie(pingMessage.trim())
      setPingStatus('sent')
      setTimeout(() => {
        setPingOpen(false)
        setPingStatus('idle')
        setPingMessage('')
      }, 1500)
    } catch (err) {
      setPingStatus('error')
      setTimeout(() => setPingStatus('idle'), 2000)
    }
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

      {/* Ping Mozzie Modal */}
      {pingOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/50">
          <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl shadow-2xl w-[480px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐺</span>
                <h3 className="text-sm font-semibold text-white">Ping Mozzie</h3>
              </div>
              <button
                onClick={() => { setPingOpen(false); setPingMessage(''); setPingStatus('idle') }}
                className="p-1 rounded hover:bg-[#2a2a2a] text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={pingMessage}
                onChange={(e) => setPingMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendPing() }}
                placeholder="What do you need?"
                disabled={pingStatus === 'sending' || pingStatus === 'sent'}
                className="flex-1 px-3 py-2 bg-[#141414] border border-[#3a3a3a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendPing}
                disabled={!pingMessage.trim() || pingStatus === 'sending' || pingStatus === 'sent'}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                {pingStatus === 'sending' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pingStatus === 'sent' ? (
                  <span>✓ Sent</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
            {pingStatus === 'error' && (
              <p className="text-red-400 text-xs mt-2">Failed to send — message queued for next check-in</p>
            )}
            {pingStatus === 'sent' && (
              <p className="text-green-400 text-xs mt-2">Message delivered to Mozzie 🐺</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

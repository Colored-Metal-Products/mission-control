'use client'

import { LucideIcon } from 'lucide-react'

interface ComingSoonViewProps {
  title: string
  description: string
  Icon: LucideIcon
}

export default function ComingSoonView({ title, description, Icon }: ComingSoonViewProps) {
  return (
    <div className="h-full flex items-center justify-center bg-[#1a1a1a]">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 flex items-center justify-center">
            <Icon className="w-10 h-10 text-purple-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        <p className="text-gray-400 mb-6">{description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          Coming Soon
        </div>
      </div>
    </div>
  )
}

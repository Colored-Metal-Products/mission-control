# Mission Control

A beautiful, world-class desktop app for browsing Mozzie's second brain system. Built with Electron and Next.js.

![Version](https://img.shields.io/badge/version-2.0-purple)
![Status](https://img.shields.io/badge/status-production--ready-green)

## ✨ Features

### 🎯 Core Views

- **Calendar** - Weekly view of all scheduled OpenClaw cron jobs with color-coded events, "Always Running" tasks, and "Next Up" countdown timers
- **Memory Browser** - Browse and read MEMORY.md and daily journal entries with brain emoji, word counts, and "Updated X hours ago" timestamps
- **Content** - File tree browser for all non-memory markdown files in the workspace
- **Projects** - View all project MEMORY.md files from memory/projects/
- **Tasks** - Parse and display tasks from tasks.md with checkboxes
- **Docs** - Quick access to SOUL.md, USER.md, AGENTS.md, TOOLS.md, and other documentation
- **Search** - Full-text search across all markdown files (⌘K)

### 🎨 UI Polish

- **Sidebar** - 11 navigation items with lucide-react icons, collapsible mode, and agent avatar at bottom
- **Top Bar** - Sidebar toggle, search with ⌘K badge, pause button, "Ping Mozzie" button, and refresh icon
- **Smooth Animations** - 0.2s ease transitions on all interactive elements
- **Thin Scrollbars** - Professional 6px dark scrollbars
- **Loading Skeletons** - Shimmer animations while files load
- **Empty States** - Helpful messages when no data is available
- **Focus States** - Purple outlines for keyboard navigation
- **Dark Theme** - Charcoal background (#1a1a1a) with purple accents (#a855f7)

### 🔧 Technical Features

- **File Watcher** - Auto-refresh when files change on disk
- **IPC Security** - Proper contextBridge with no nodeIntegration
- **TypeScript** - Full type safety
- **Markdown Rendering** - react-markdown with GitHub Flavored Markdown support
- **Professional Icons** - lucide-react icon library

## 📦 Installation

1. Install dependencies:
```bash
cd /Users/mozzie/clawd/mission-control
npm install
```

2. Configure workspace path (optional):
```bash
export WORKSPACE_PATH=/path/to/your/workspace
```

Default workspace path: `/Users/mozzie/clawd/`

## 🚀 Usage

### Development Mode

```bash
npm run dev
```

This will start both Next.js dev server and Electron in dev mode with hot reload.

### Production Build

```bash
npm run build:electron
```

This will create a distributable app in the `/release` folder.

## ⌨️ Keyboard Shortcuts

- **⌘K** - Open search

## 📂 File Structure

```
mission-control/
├── electron/
│   ├── main.js       # Electron main process
│   └── preload.js    # IPC bridge
├── app/
│   ├── page.tsx      # Main app component
│   ├── layout.tsx    # Root layout
│   └── globals.css   # Global styles
├── components/
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── TopBar.tsx           # Top bar with controls
│   ├── CalendarView.tsx     # Calendar of scheduled tasks
│   ├── MemoryView.tsx       # Memory browser
│   ├── ContentView.tsx      # File tree browser
│   ├── ProjectsView.tsx     # Project memory viewer
│   ├── TasksView.tsx        # Task list
│   ├── DocsView.tsx         # Documentation browser
│   ├── SearchView.tsx       # Full-text search
│   └── ComingSoonView.tsx   # Placeholder view
└── types/
    └── electron.d.ts  # TypeScript definitions
```

## 🎯 Views

### Calendar
- **Always Running** section for recurring tasks (heartbeat every 30 min)
- **Weekly calendar grid** (Sun-Sat) with color-coded event blocks
- **Next Up** section showing upcoming tasks with countdown timers
- Week/Today toggle buttons
- Parses schedules from HEARTBEAT.md and heartbeat-state.json

### Memory
- **Long-Term Memory** card with brain emoji, word count, and last update time
- **Daily Journal** with entry count badge
- File entries show calendar icon, formatted date, file size, and word count
- Grouping: Today, Yesterday, This Week, This Month, then by month name

### Content
- File tree browser for all markdown files (excludes memory/)
- Expandable/collapsible folders
- Click to view file contents with full markdown rendering

### Projects
- Lists all project MEMORY.md files from memory/projects/*/MEMORY.md
- Click to view project memory with metadata

### Tasks
- Parses tasks.md
- Displays tasks with checkbox UI
- Groups into Pending and Completed

### Docs
- Quick access to SOUL.md, USER.md, AGENTS.md, TOOLS.md, HEARTBEAT.md, MEMORY.md
- Icons and descriptions for each doc type

### Search
- Full-text search across ALL markdown files
- ⌘K keyboard shortcut
- Preview snippets with highlighted matches

## 🛠️ Tech Stack

- **Next.js 15** - React framework with app router
- **Electron** - Desktop app framework
- **Tailwind CSS v3** - Utility-first CSS framework
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown support
- **lucide-react** - Professional icon library
- **TypeScript** - Type safety
- **date-fns** - Date formatting

## 🎨 Design

- **Font**: Inter (300-700 weights)
- **Background**: Charcoal (#1a1a1a)
- **Accent**: Purple (#a855f7)
- **Inspiration**: Linear, Raycast

## 📋 Environment Variables

- `WORKSPACE_PATH` - Path to the workspace directory (default: `/Users/mozzie/clawd/`)
- `NODE_ENV` - Set to `development` for dev mode

## 🐛 Known Limitations

1. **"Ping Mozzie" button** - Currently shows an alert. Needs integration with the main agent system.
2. **Task toggling** - Tasks are read-only (display only). File writing not yet implemented.
3. **File watchers** - No cleanup on component unmount (harmless but should be added).

## 🚧 Coming Soon

Views with placeholders:
- **Approvals** - Review and approve pending items
- **Council** - Collaborate with AI council
- **People** - Manage contacts and relationships
- **Office** - Business operations and admin
- **Team** - Team coordination and collaboration

## 📄 License

MIT

---

**Built with ❤️ by OpenClaw**  
**Version**: 2.0  
**Date**: February 12, 2026

# Development Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env to set your WORKSPACE_PATH
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

   This will:
   - Start Next.js dev server on http://localhost:3000
   - Launch Electron window automatically
   - Enable hot reload for both React and Electron

## Project Structure

```
mission-control/
├── electron/           # Electron main process
│   ├── main.js        # Window management & IPC handlers
│   └── preload.js     # IPC bridge (secure communication)
│
├── app/               # Next.js app directory
│   ├── page.tsx      # Main application component
│   ├── layout.tsx    # Root layout wrapper
│   └── globals.css   # Global styles + markdown rendering
│
├── components/        # React UI components
│   ├── Sidebar.tsx   # Navigation sidebar
│   ├── TopBar.tsx    # Top bar with search & ping button
│   ├── MemoryView.tsx    # Memory browser (MEMORY.md + daily files)
│   ├── ProjectsView.tsx  # Project memory browser
│   ├── TasksView.tsx     # Task list from tasks.md
│   ├── DocsView.tsx      # Documentation browser
│   └── SearchView.tsx    # Full-text search
│
└── types/
    └── electron.d.ts  # TypeScript definitions for IPC
```

## Key Technologies

- **Electron**: Desktop app framework
- **Next.js 15**: React framework (app router, static export)
- **TypeScript**: Type safety
- **Tailwind CSS v3**: Utility-first styling
- **react-markdown**: Markdown rendering with GFM support

## IPC Architecture

The app uses Electron's IPC (Inter-Process Communication) for secure file system access:

### Main Process (electron/main.js)
- Handles file system operations
- Exposes IPC handlers: `read-file`, `list-files`, `search-files`, etc.
- Manages file watching

### Preload Script (electron/preload.js)
- Creates a secure bridge via `contextBridge`
- Exposes `window.electron` API to renderer

### Renderer Process (React components)
- Calls `window.electron.readFile()`, `window.electron.searchFiles()`, etc.
- Never accesses Node.js or file system directly

## Component Details

### MemoryView
- **Left panel**: File browser with grouping (Today, Yesterday, This Week, etc.)
- **Right panel**: Markdown viewer with metadata
- **Features**: File watching, word count, search

### ProjectsView
- Lists all `memory/projects/*/MEMORY.md` files
- Click to view project memory

### TasksView
- Parses `tasks.md` for checkbox items
- Groups into Pending/Completed
- Format: `- [ ] Task` or `- [x] Completed task`

### DocsView
- Quick access to core documentation files
- Icons and descriptions for each doc type

### SearchView
- Full-text search across all `.md` files
- Debounced search (300ms delay)
- Shows preview snippets with highlighted matches
- Keyboard shortcut: ⌘K

## File Watching

The app watches opened files and auto-refreshes when they change on disk:
```javascript
window.electron.watchFile(filePath)
window.electron.onFileChanged((filePath) => {
  // Reload file content
})
```

## Styling

- **Dark theme**: `#1a1a1a` background, `#141414` sidebars
- **Accent color**: Purple (`#a855f7`)
- **Font**: Inter (loaded from Google Fonts)
- **Markdown**: Custom styles in `globals.css` (`.markdown` class)

## Build & Distribution

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build          # Build Next.js static export
npm run build:electron # Build and package Electron app
```

The `build:electron` script will create distributable apps in the `/release` folder.

## Configuration

### Workspace Path
Set via environment variable:
```bash
export WORKSPACE_PATH=/path/to/your/workspace
```

Or in code (default):
```javascript
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/Users/mozzie/clawd'
```

### Window Settings
Edit `electron/main.js`:
```javascript
mainWindow = new BrowserWindow({
  width: 1400,    // Default width
  height: 900,    // Default height
  titleBarStyle: 'hiddenInset', // macOS native titlebar
  backgroundColor: '#1a1a1a',
  // ...
})
```

## Troubleshooting

### "window.electron is not defined"
- Make sure preload script is loading correctly
- Check `webPreferences.preload` path in `main.js`

### Files not loading
- Verify `WORKSPACE_PATH` is set correctly
- Check file permissions

### Markdown not rendering
- Ensure `react-markdown` and `remark-gfm` are installed
- Check `.markdown` class is applied

### Search not working
- Search only works on `.md` files
- Excludes `node_modules` and hidden directories

## Next Steps / Future Enhancements

- [ ] Add file editing capabilities
- [ ] Implement task toggling (check/uncheck)
- [ ] Add git integration (commit/push from UI)
- [ ] Calendar integration for daily notes
- [ ] Graph view for linked notes
- [ ] Export to PDF
- [ ] Cloud sync option
- [ ] Custom themes
- [ ] Plugin system

## Performance Tips

- Search is synchronous and may be slow with many files
  - Consider indexing or incremental search for large workspaces
- File watching has no cleanup on unmount
  - Add watcher cleanup if switching files frequently
- Static build means no SSR overhead
  - Fast initial load

## License

MIT

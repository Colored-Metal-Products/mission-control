const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/Users/mozzie/clawd';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    vibrancy: 'dark',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-workspace-path', () => {
  return WORKSPACE_PATH;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const fullPath = path.join(WORKSPACE_PATH, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    return {
      content,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

ipcMain.handle('list-files', async (event, dirPath = '') => {
  try {
    const fullPath = path.join(WORKSPACE_PATH, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    const files = await Promise.all(
      entries.map(async (entry) => {
        const relativePath = path.join(dirPath, entry.name);
        const fullEntryPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(fullEntryPath);
        
        return {
          name: entry.name,
          path: relativePath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
    );
    
    return files;
  } catch (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
});

ipcMain.handle('search-files', async (event, query) => {
  try {
    const results = [];
    const searchRecursive = async (dirPath) => {
      const entries = await fs.readdir(path.join(WORKSPACE_PATH, dirPath), { withFileTypes: true });
      
      for (const entry of entries) {
        const relativePath = path.join(dirPath, entry.name);
        const fullPath = path.join(WORKSPACE_PATH, relativePath);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await searchRecursive(relativePath);
          }
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            if (content.toLowerCase().includes(query.toLowerCase())) {
              const stats = await fs.stat(fullPath);
              results.push({
                path: relativePath,
                name: entry.name,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                preview: getPreview(content, query),
              });
            }
          } catch (err) {
            // Skip files we can't read
          }
        }
      }
    };
    
    await searchRecursive('');
    return results;
  } catch (error) {
    throw new Error(`Failed to search files: ${error.message}`);
  }
});

function getPreview(content, query) {
  const lines = content.split('\n');
  const queryLower = query.toLowerCase();
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 2);
      return lines.slice(start, end).join('\n').substring(0, 200);
    }
  }
  
  return content.substring(0, 200);
}

ipcMain.handle('watch-file', async (event, filePath) => {
  const fullPath = path.join(WORKSPACE_PATH, filePath);
  
  const watcher = fsSync.watch(fullPath, (eventType) => {
    if (eventType === 'change') {
      mainWindow.webContents.send('file-changed', filePath);
    }
  });
  
  return true;
});

ipcMain.handle('get-memory-files', async () => {
  try {
    const memoryDir = path.join(WORKSPACE_PATH, 'memory');
    const files = [];
    
    // Check if memory directory exists
    try {
      await fs.access(memoryDir);
    } catch {
      return { dailyFiles: [], projectFiles: [] };
    }
    
    // Get daily files
    const entries = await fs.readdir(memoryDir, { withFileTypes: true });
    const dailyFiles = [];
    
    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name.match(/\d{4}-\d{2}-\d{2}\.md/)) {
        const fullPath = path.join(memoryDir, entry.name);
        const stats = await fs.stat(fullPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        dailyFiles.push({
          name: entry.name,
          path: path.join('memory', entry.name),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          wordCount: content.split(/\s+/).length,
        });
      }
    }
    
    // Sort by date descending
    dailyFiles.sort((a, b) => b.name.localeCompare(a.name));
    
    // Get project files
    const projectFiles = [];
    const projectsDir = path.join(memoryDir, 'projects');
    
    try {
      const projectEntries = await fs.readdir(projectsDir, { withFileTypes: true });
      
      for (const entry of projectEntries) {
        if (entry.isDirectory()) {
          const memoryFile = path.join(projectsDir, entry.name, 'MEMORY.md');
          try {
            const stats = await fs.stat(memoryFile);
            const content = await fs.readFile(memoryFile, 'utf-8');
            
            projectFiles.push({
              name: entry.name,
              path: path.join('memory/projects', entry.name, 'MEMORY.md'),
              size: stats.size,
              modified: stats.mtime.toISOString(),
              wordCount: content.split(/\s+/).length,
            });
          } catch {
            // Skip if MEMORY.md doesn't exist
          }
        }
      }
    } catch {
      // Projects directory doesn't exist
    }
    
    return { dailyFiles, projectFiles };
  } catch (error) {
    throw new Error(`Failed to get memory files: ${error.message}`);
  }
});

ipcMain.handle('get-docs', async () => {
  const docFiles = ['SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'HEARTBEAT.md', 'MEMORY.md'];
  const docs = [];
  
  for (const fileName of docFiles) {
    try {
      const fullPath = path.join(WORKSPACE_PATH, fileName);
      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      docs.push({
        name: fileName,
        path: fileName,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        wordCount: content.split(/\s+/).length,
      });
    } catch {
      // Skip if file doesn't exist
    }
  }
  
  return docs;
});

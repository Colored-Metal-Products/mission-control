const { app, BrowserWindow, ipcMain, protocol, net, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const url = require('url');

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
    // Serve the static Next.js export via custom protocol
    const outDir = path.join(__dirname, '../out');
    mainWindow.loadURL('app://./index.html');
  }
}

// Register custom protocol to serve static files
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

app.whenReady().then(() => {
  const outDir = path.join(__dirname, '../out');
  
  protocol.handle('app', (request) => {
    let reqPath = new URL(request.url).pathname;
    // Default to index.html
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(outDir, reqPath);
    return net.fetch(url.pathToFileURL(filePath).toString());
  });

  // Build application menu with Check for Updates
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: async () => {
            try {
              const result = await autoUpdater.checkForUpdates();
              if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'No Updates',
                  message: `You're on the latest version (${app.getVersion()}).`
                });
              }
            } catch (err) {
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Update Error',
                message: `Could not check for updates: ${err.message}`
              });
            }
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  createWindow();
  
  // Auto-update setup
  if (!isDev) {
    autoUpdater.logger = require('electron-log');
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Show dialog when update is downloaded
    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded. Restart to install?`,
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Downloading...`
      });
    });

    // Check on launch
    autoUpdater.checkForUpdates();
  }
});

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

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    const fullPath = path.join(WORKSPACE_PATH, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
    const stats = await fs.stat(fullPath);
    return {
      success: true,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
});

ipcMain.handle('ping-mozzie', async (event, message) => {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  try {
    // Use openclaw CLI to send message to main agent session
    const { stdout, stderr } = await execFileAsync('/opt/homebrew/bin/openclaw', [
      'agent', '--message', message, '--json'
    ], { timeout: 30000 });
    return { success: true, response: stdout.trim() };
  } catch (error) {
    // Fallback: write to a ping file for heartbeat pickup
    const pingFile = path.join(WORKSPACE_PATH, '.ping-mozzie');
    const entry = `[${new Date().toISOString()}] ${message}\n`;
    await fs.appendFile(pingFile, entry, 'utf-8');
    return { success: true, fallback: true, message: 'Message queued for next check-in' };
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

ipcMain.handle('council-convene', async (event, { question, memberIds }) => {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  
  try {
    // Collect responses from each member
    const memberResponses = [];
    
    for (const memberId of memberIds) {
      try {
        // Read the member's soul file
        const soulPath = path.join(WORKSPACE_PATH, 'council', 'members', memberId, 'SOUL.md');
        const soulContent = await fs.readFile(soulPath, 'utf-8');
        
        // Construct the prompt
        const prompt = `You are roleplaying as a council advisor. Read your persona carefully and respond IN CHARACTER.

${soulContent}

---

The CEO (Jamie) has brought this question to the boardroom:

"${question}"

Respond in character. Be specific to CMP's situation. Keep your response under 300 words. Be direct and actionable.`;
        
        // Call openclaw agent
        const { stdout } = await execFileAsync(
          '/opt/homebrew/bin/openclaw',
          ['agent', '--message', prompt, '--json'],
          { timeout: 60000 }
        );
        
        memberResponses.push({
          memberId,
          text: stdout.trim(),
          error: null
        });
      } catch (error) {
        memberResponses.push({
          memberId,
          text: '',
          error: error.message
        });
      }
    }
    
    // Generate synthesis
    let synthesis = '';
    try {
      const responsesText = memberResponses
        .filter(r => !r.error)
        .map(r => {
          const member = memberIds.find(id => id === r.memberId);
          return `${r.memberId.toUpperCase()}:\n${r.text}`;
        })
        .join('\n\n---\n\n');
      
      const synthesisPrompt = `You are Mozzie, the CEO's AI chief of staff. You just convened your executive council to discuss this question:

"${question}"

Here are their responses:

${responsesText}

---

Provide a concise synthesis (under 200 words) that:
1. Highlights key convergent insights
2. Identifies any contradictions or tensions
3. Offers a strategic recommendation

Be direct and actionable. This is for Jamie (the CEO) to make a decision.`;
      
      const { stdout } = await execFileAsync(
        '/opt/homebrew/bin/openclaw',
        ['agent', '--message', synthesisPrompt, '--json'],
        { timeout: 60000 }
      );
      
      synthesis = stdout.trim();
    } catch (error) {
      synthesis = `Error generating synthesis: ${error.message}`;
    }
    
    return {
      responses: memberResponses,
      synthesis
    };
  } catch (error) {
    throw new Error(`Council convene failed: ${error.message}`);
  }
});

ipcMain.handle('council-boardroom-chat', async (event, { message, history }) => {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  
  try {
    const memberIds = ['cto-elon', 'coo-marcus', 'cmo-gary', 'cro-cuban'];
    
    // Helper to call openclaw agent
    const callAgent = async (prompt) => {
      const { stdout } = await execFileAsync(
        '/opt/homebrew/bin/openclaw',
        ['agent', '--message', prompt, '--json'],
        { timeout: 60000 }
      );
      return stdout.trim();
    };
    
    // Build conversation history text (last 10 messages)
    const recentHistory = history.slice(-10);
    const historyText = recentHistory.length > 0
      ? recentHistory.map(h => `${h.name}: ${h.content}`).join('\n')
      : '(No prior messages)';
    
    // Check each member in parallel to see if they should respond
    const responseChecks = await Promise.all(
      memberIds.map(async (memberId) => {
        try {
          // Read the member's soul file
          const soulPath = path.join(WORKSPACE_PATH, 'council', 'members', memberId, 'SOUL.md');
          const soulContent = await fs.readFile(soulPath, 'utf-8');
          
          // Construct the prompt
          const prompt = `${soulContent}

You are in a live boardroom conversation with the CEO (Jamie) and your fellow executives:
- 🚀 Elon (CTO) - tech, engineering, Forge platform
- 🏭 Marcus (COO) - ops, people, process, financials
- 💪 Gary (CMO) - marketing, offers, lead gen
- 🦈 Cuban (CRO) - revenue, sales, deals, growth
- 🐺 Mozzie - Chief of Staff / exec assistant

Conversation so far:
${historyText}

Jamie just said: "${message}"

Should you respond? Only respond if:
- You were directly addressed or mentioned
- The topic falls in your domain
- You have a genuinely useful addition to what's been said
- You disagree with something and should push back

If you should NOT respond, reply with exactly: PASS

If you should respond, reply in character. Keep it to 2-4 sentences. Be direct. You can reference other executives by name. Don't repeat what others have said.`;
          
          const response = await callAgent(prompt);
          
          return {
            memberId,
            text: response.trim(),
            shouldPass: response.trim() === 'PASS'
          };
        } catch (error) {
          console.error(`Error checking ${memberId}:`, error);
          return {
            memberId,
            text: '',
            shouldPass: true
          };
        }
      })
    );
    
    // Filter out PASS responses
    let activeResponses = responseChecks.filter(r => !r.shouldPass);
    
    // Determine speaking order: if someone was directly addressed, they go first
    const addressedMember = activeResponses.find(r => 
      message.toLowerCase().includes(r.memberId.split('-')[1])
    );
    
    if (addressedMember) {
      activeResponses = [
        addressedMember,
        ...activeResponses.filter(r => r.memberId !== addressedMember.memberId)
      ];
    }
    
    // Return responses
    return {
      responses: activeResponses.map(r => ({
        memberId: r.memberId,
        text: r.text
      }))
    };
  } catch (error) {
    throw new Error(`Boardroom chat failed: ${error.message}`);
  }
});

ipcMain.handle('council-assign-task', async (event, { leadMemberId, taskTitle, taskDescription }) => {
  try {
    const queuePath = path.join(WORKSPACE_PATH, 'approvals', 'queue.json');
    
    // Ensure approvals directory exists
    const approvalsDir = path.join(WORKSPACE_PATH, 'approvals');
    try {
      await fs.access(approvalsDir);
    } catch {
      await fs.mkdir(approvalsDir, { recursive: true });
    }
    
    // Read existing queue or create new
    let queue = [];
    try {
      const queueContent = await fs.readFile(queuePath, 'utf-8');
      queue = JSON.parse(queueContent);
    } catch {
      // File doesn't exist yet
    }
    
    // Add new task
    const task = {
      id: Date.now().toString(),
      leadMemberId,
      taskTitle,
      taskDescription,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    queue.push(task);
    
    // Write back to file
    await fs.writeFile(queuePath, JSON.stringify(queue, null, 2), 'utf-8');
    
    return {
      success: true,
      task
    };
  } catch (error) {
    throw new Error(`Failed to assign task: ${error.message}`);
  }
});

ipcMain.handle('council-get-tasks', async () => {
  try {
    const queuePath = path.join(WORKSPACE_PATH, 'approvals', 'queue.json');
    
    try {
      const queueContent = await fs.readFile(queuePath, 'utf-8');
      return JSON.parse(queueContent);
    } catch {
      return [];
    }
  } catch (error) {
    throw new Error(`Failed to get tasks: ${error.message}`);
  }
});

ipcMain.handle('council-standup', async (event, { topic, memberIds, rounds = 8 }) => {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  
  try {
    const messages = [];
    const conversationHistory = [];
    const actionItems = [];
    
    // Helper to call openclaw agent
    const callAgent = async (prompt) => {
      const { stdout } = await execFileAsync(
        '/opt/homebrew/bin/openclaw',
        ['agent', '--message', prompt, '--json'],
        { timeout: 60000 }
      );
      return stdout.trim();
    };
    
    // Round 1: Mozzie introduces the topic
    const mozzieIntro = await callAgent(
      `You are Mozzie, the CEO's AI chief of staff at Colored Metal Products. You're moderating a standup meeting with the executive council (CTO Elon 🚀, COO Marcus 🏭, CMO Gary 💪, CRO Cuban 🦈).

The topic for today's standup is: "${topic}"

Introduce the topic in 2-3 sentences. Be brief and set the stage for discussion. Ask for input from the team.`
    );
    
    messages.push({ memberId: 'mozzie', text: mozzieIntro });
    conversationHistory.push(`Mozzie (Chief of Staff): ${mozzieIntro}`);
    
    // Rounds 2-5: Each member responds
    const speakingOrder = ['cmo-gary', 'cto-elon', 'coo-marcus', 'cro-cuban'];
    
    for (let i = 0; i < 4; i++) {
      const memberId = speakingOrder[i];
      
      try {
        // Read the member's soul file
        const soulPath = path.join(WORKSPACE_PATH, 'council', 'members', memberId, 'SOUL.md');
        const soulContent = await fs.readFile(soulPath, 'utf-8');
        
        // Build conversation context
        const historyText = conversationHistory.join('\n\n---\n\n');
        
        const prompt = `${soulContent}

---

You are in a standup meeting with your fellow executives. Here's the conversation so far:

${historyText}

---

The topic is: "${topic}"

Respond naturally to what's been said. Keep it to 2-3 sentences. Be in character. If you agree with someone, say so briefly. If you disagree, push back. Reference other members by name.`;
        
        const response = await callAgent(prompt);
        
        messages.push({ memberId, text: response });
        
        const memberNames = {
          'cto-elon': 'Elon (CTO)',
          'coo-marcus': 'Marcus (COO)',
          'cmo-gary': 'Gary (CMO)',
          'cro-cuban': 'Cuban (CRO)'
        };
        
        conversationHistory.push(`${memberNames[memberId]}: ${response}`);
      } catch (error) {
        console.error(`Error getting response from ${memberId}:`, error);
        messages.push({ memberId, text: '(Unable to respond)' });
      }
    }
    
    // Rounds 6-7: Cross-talk (two members respond to each other)
    const crossTalkPairs = [
      ['cto-elon', 'coo-marcus'],
      ['cmo-gary', 'cro-cuban']
    ];
    
    for (const [memberId1, memberId2] of crossTalkPairs) {
      try {
        // First member in pair
        const soulPath1 = path.join(WORKSPACE_PATH, 'council', 'members', memberId1, 'SOUL.md');
        const soulContent1 = await fs.readFile(soulPath1, 'utf-8');
        const historyText = conversationHistory.join('\n\n---\n\n');
        
        const prompt1 = `${soulContent1}

---

You are in a standup meeting. Here's the conversation so far:

${historyText}

---

The topic is: "${topic}"

Respond briefly (1-2 sentences) to what's been said. Be in character. You can agree, disagree, or add a new point.`;
        
        const response1 = await callAgent(prompt1);
        messages.push({ memberId: memberId1, text: response1 });
        
        const memberNames = {
          'cto-elon': 'Elon (CTO)',
          'coo-marcus': 'Marcus (COO)',
          'cmo-gary': 'Gary (CMO)',
          'cro-cuban': 'Cuban (CRO)'
        };
        
        conversationHistory.push(`${memberNames[memberId1]}: ${response1}`);
      } catch (error) {
        console.error(`Error in cross-talk from ${memberId1}:`, error);
      }
    }
    
    // Final round: Mozzie summarizes and lists action items
    const historyText = conversationHistory.join('\n\n---\n\n');
    const mozzieSummary = await callAgent(
      `You are Mozzie, the CEO's AI chief of staff. You've been moderating a standup about: "${topic}"

Here's the full conversation:

${historyText}

---

Provide a brief summary (2-3 sentences) and extract 2-4 specific action items. Format action items as:
ACTION: [Member Name] - [Specific task]

For example:
ACTION: Elon - Build prototype by Friday
ACTION: Gary - Draft marketing copy for review

Be specific about who should do what.`
    );
    
    messages.push({ memberId: 'mozzie', text: mozzieSummary });
    
    // Extract action items from Mozzie's summary
    const actionItemRegex = /ACTION:\s*([A-Za-z]+)\s*-\s*(.+?)(?=\n|$)/gi;
    let match;
    
    while ((match = actionItemRegex.exec(mozzieSummary)) !== null) {
      const memberName = match[1].toLowerCase();
      const description = match[2].trim();
      
      // Map member names to IDs
      const nameToId = {
        'elon': 'cto-elon',
        'marcus': 'coo-marcus',
        'gary': 'cmo-gary',
        'cuban': 'cro-cuban'
      };
      
      const memberId = nameToId[memberName];
      if (memberId) {
        actionItems.push({ memberId, description });
      }
    }
    
    return {
      messages,
      actionItems
    };
  } catch (error) {
    throw new Error(`Standup failed: ${error.message}`);
  }
});

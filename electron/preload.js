const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getWorkspacePath: () => ipcRenderer.invoke('get-workspace-path'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  searchFiles: (query) => ipcRenderer.invoke('search-files', query),
  watchFile: (filePath) => ipcRenderer.invoke('watch-file', filePath),
  getMemoryFiles: () => ipcRenderer.invoke('get-memory-files'),
  getDocs: () => ipcRenderer.invoke('get-docs'),
  onFileChanged: (callback) => {
    ipcRenderer.on('file-changed', (event, filePath) => callback(filePath));
  },
});

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory?: boolean;
  wordCount?: number;
  preview?: string;
}

export interface FileContent {
  content: string;
  size: number;
  modified: string;
}

export interface MemoryFiles {
  dailyFiles: FileInfo[];
  projectFiles: FileInfo[];
}

interface ElectronAPI {
  getWorkspacePath: () => Promise<string>;
  readFile: (filePath: string) => Promise<FileContent>;
  listFiles: (dirPath: string) => Promise<FileInfo[]>;
  searchFiles: (query: string) => Promise<FileInfo[]>;
  watchFile: (filePath: string) => Promise<boolean>;
  getMemoryFiles: () => Promise<MemoryFiles>;
  getDocs: () => Promise<FileInfo[]>;
  onFileChanged: (callback: (filePath: string) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

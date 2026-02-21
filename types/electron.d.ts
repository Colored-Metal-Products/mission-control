export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory?: boolean;
  wordCount?: number;
  preview?: string;
}

export interface SemanticResult {
  file: string;
  line: number;
  text: string;
  score: number;
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

export interface CouncilMemberResponse {
  memberId: string;
  text: string;
  error: string | null;
}

export interface CouncilConveneResult {
  responses: CouncilMemberResponse[];
  synthesis: string;
}

export interface CouncilTask {
  id: string;
  leadMemberId: string;
  taskTitle: string;
  taskDescription: string;
  status: 'pending' | 'in-progress' | 'review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CouncilStandupMessage {
  memberId: string;
  text: string;
}

export interface CouncilStandupActionItem {
  memberId: string;
  description: string;
}

export interface CouncilStandupResult {
  messages: CouncilStandupMessage[];
  actionItems: CouncilStandupActionItem[];
}

export interface BoardroomChatMessage {
  role: string;
  name: string;
  content: string;
}

export interface BoardroomChatResponse {
  memberId: string;
  text: string;
}

export interface BoardroomChatResult {
  responses: BoardroomChatResponse[];
}

interface ElectronAPI {
  getWorkspacePath: () => Promise<string>;
  readFile: (filePath: string) => Promise<FileContent>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; size: number; modified: string }>;
  listFiles: (dirPath: string) => Promise<FileInfo[]>;
  searchFiles: (query: string) => Promise<FileInfo[]>;
  semanticSearch: (query: string) => Promise<SemanticResult[]>;
  watchFile: (filePath: string) => Promise<boolean>;
  getMemoryFiles: () => Promise<MemoryFiles>;
  getDocs: () => Promise<FileInfo[]>;
  pingMozzie: (message: string) => Promise<{ success: boolean; response?: string; fallback?: boolean; message?: string }>;
  councilConvene: (params: { question: string; memberIds: string[] }) => Promise<CouncilConveneResult>;
  councilBoardroomChat: (params: { message: string; history: BoardroomChatMessage[] }) => Promise<BoardroomChatResult>;
  councilAssignTask: (params: { leadMemberId: string; taskTitle: string; taskDescription: string }) => Promise<{ success: boolean; task: CouncilTask }>;
  councilGetTasks: () => Promise<CouncilTask[]>;
  councilStandup: (params: { topic: string; memberIds: string[]; rounds?: number }) => Promise<CouncilStandupResult>;
  onFileChanged: (callback: (filePath: string) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

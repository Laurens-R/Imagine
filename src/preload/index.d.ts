import { ElectronAPI } from '@electron-toolkit/preload';

interface WhiteboardAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  saveBoard: (data: string, filePath?: string) => Promise<{ filePath?: string; canceled?: boolean }>;
  openBoard: () => Promise<{ filePath?: string; data?: string; canceled?: boolean }>;
  exportImage: (dataUrl: string, format: string) => Promise<{ filePath?: string; canceled?: boolean }>;
  saveTemplate: (name: string, data: string) => Promise<{ name: string }>;
  listTemplates: () => Promise<string[]>;
  loadTemplate: (name: string) => Promise<{ data: string }>;
  deleteTemplate: (name: string) => Promise<Record<string, never>>;
  hideToTray: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: Record<string, never>;
    whiteboardApi: WhiteboardAPI;
  }
}

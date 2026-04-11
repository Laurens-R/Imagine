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
  saveBoardSync: (data: string, filePath: string) => { ok: boolean };
  getSettings: () => Promise<{ anthropicApiKey: string; aiModel: string; aiMaxTokens?: number; defaultCreativeMode?: boolean }>;
  setSettings: (settings: Record<string, unknown>) => Promise<Record<string, never>>;
  callAI: (prompt: string, board: unknown) => Promise<{ response?: Record<string, unknown>; error?: string }>;
}

declare interface Window {
  whiteboardApi: WhiteboardAPI;
  electron: { shell: { openExternal: (url: string) => void } };
}

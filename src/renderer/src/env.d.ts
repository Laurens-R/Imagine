interface WhiteboardAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  saveBoard: (data: string, filePath?: string) => Promise<{ filePath?: string; canceled?: boolean }>;
  openBoard: () => Promise<{ filePath?: string; data?: string; canceled?: boolean }>;
  exportImage: (dataUrl: string, format: string) => Promise<{ filePath?: string; canceled?: boolean }>;
}

declare interface Window {
  whiteboardApi: WhiteboardAPI;
}

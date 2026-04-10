import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

const whiteboardApi = {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
  saveBoard: (data: string, filePath?: string) =>
    ipcRenderer.invoke('board:save', data, filePath),
  openBoard: () => ipcRenderer.invoke('board:open'),
  exportImage: (dataUrl: string, format: string) =>
    ipcRenderer.invoke('board:exportImage', dataUrl, format),
  saveTemplate: (name: string, data: string) =>
    ipcRenderer.invoke('templates:save', name, data),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  loadTemplate: (name: string) => ipcRenderer.invoke('templates:load', name),
  deleteTemplate: (name: string) => ipcRenderer.invoke('templates:delete', name),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', {});
    contextBridge.exposeInMainWorld('whiteboardApi', whiteboardApi);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.electron = electronAPI;
  // @ts-ignore
  window.api = {};
  // @ts-ignore
  window.whiteboardApi = whiteboardApi;
}

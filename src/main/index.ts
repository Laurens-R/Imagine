import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { readFile, writeFile, readdir, unlink, mkdir } from 'fs/promises';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: '#fafaf8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Prevent Electron from navigating to dropped files
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // ── Window control IPC ───────────────────────────────────────────────────
  ipcMain.on('win:minimize', () => mainWindow.minimize());
  ipcMain.on('win:maximize', () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('win:close', () => mainWindow.close());

  // ── File IPC ─────────────────────────────────────────────────────────────
  ipcMain.handle('board:save', async (_e, data: string, filePath?: string) => {
    let savePath = filePath;
    if (!savePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Whiteboard',
        defaultPath: 'whiteboard.imagine',
        filters: [{ name: 'Imagine Whiteboard', extensions: ['imagine'] }]
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      savePath = result.filePath;
    }
    await writeFile(savePath, data, 'utf8');
    return { filePath: savePath };
  });

  ipcMain.handle('board:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Whiteboard',
      filters: [{ name: 'Imagine Whiteboard', extensions: ['imagine'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const filePath = result.filePaths[0];
    const data = await readFile(filePath, 'utf8');
    return { filePath, data };
  });

  ipcMain.handle('board:exportImage', async (_e, dataUrl: string, format: string) => {
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Whiteboard',
      defaultPath: `whiteboard.${ext}`,
      filters: [{ name: format.toUpperCase(), extensions: [ext] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const base64 = dataUrl.split(',')[1];
    if (!base64) return { canceled: true };
    await writeFile(result.filePath, Buffer.from(base64, 'base64'));
    return { filePath: result.filePath };
  });

  // ── Template IPC ─────────────────────────────────────────────────────────
  const templatesDir = join(app.getPath('userData'), 'templates');

  ipcMain.handle('templates:save', async (_e, name: string, data: string) => {
    await mkdir(templatesDir, { recursive: true });
    // Sanitise name to safe filename characters
    const safe = name.replace(/[^a-zA-Z0-9 _\-()]/g, '').trim() || 'template';
    const filePath = join(templatesDir, `${safe}.imagine-template`);
    await writeFile(filePath, data, 'utf8');
    return { name: safe };
  });

  ipcMain.handle('templates:list', async () => {
    try {
      await mkdir(templatesDir, { recursive: true });
      const files = await readdir(templatesDir);
      return files
        .filter((f) => f.endsWith('.imagine-template'))
        .map((f) => f.replace(/\.imagine-template$/, ''));
    } catch {
      return [];
    }
  });

  ipcMain.handle('templates:load', async (_e, name: string) => {
    const safe = name.replace(/[^a-zA-Z0-9 _\-()]/g, '').trim();
    const filePath = join(templatesDir, `${safe}.imagine-template`);
    const data = await readFile(filePath, 'utf8');
    return { data };
  });

  ipcMain.handle('templates:delete', async (_e, name: string) => {
    const safe = name.replace(/[^a-zA-Z0-9 _\-()]/g, '').trim();
    const filePath = join(templatesDir, `${safe}.imagine-template`);
    await unlink(filePath);
    return {};
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.imagine.whiteboard');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

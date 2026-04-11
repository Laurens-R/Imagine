import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import { join } from 'path';
import { readFile, writeFile, readdir, unlink, mkdir } from 'fs/promises';
import { writeFileSync as writeFileSyncNode } from 'fs';
import { deflateSync } from 'zlib';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

let tray: Tray | null = null;

// Build a 16×16 purple (#7c6aff) RGBA PNG icon for the system tray
function buildTrayIcon(): ReturnType<typeof nativeImage.createFromBuffer> {
  const size = 16;
  const row = Buffer.alloc(1 + size * 4);
  row[0] = 0; // filter: None
  for (let i = 0; i < size; i++) {
    row[1 + i * 4 + 0] = 0x7c;
    row[1 + i * 4 + 1] = 0x6a;
    row[1 + i * 4 + 2] = 0xff;
    row[1 + i * 4 + 3] = 0xff;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => Buffer.from(row)));
  const idat = deflateSync(raw);
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (~c) >>> 0;
  };
  const buildChunk = (type: string, data: Buffer): Buffer => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const cv = Buffer.alloc(4); cv.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, cv]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit depth, RGBA color type
  return nativeImage.createFromBuffer(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    buildChunk('IHDR', ihdr),
    buildChunk('IDAT', idat),
    buildChunk('IEND', Buffer.alloc(0))
  ]));
}

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

  // Synchronous save used by the beforeunload handler so data is flushed before the window closes
  ipcMain.on('board:save-sync', (event, data: string, filePath: string) => {
    try {
      writeFileSyncNode(filePath, data, 'utf8');
      event.returnValue = { ok: true };
    } catch {
      event.returnValue = { ok: false };
    }
  });
  ipcMain.on('win:hide-to-tray', () => mainWindow.hide());

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

  // ── System tray ───────────────────────────────────────────────────────────
  tray = new Tray(buildTrayIcon());
  tray.setToolTip('Imagine');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Imagine', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });

  // Toggle hide/show with Ctrl+Shift+Space (works when visible or in tray)
  globalShortcut.register('Ctrl+Shift+Space', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
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

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
  tray = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

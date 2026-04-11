import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import { join } from 'path';
import { readFile, writeFile, readdir, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
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

  // ── Settings IPC ─────────────────────────────────────────────────────────
  const settingsPath = join(app.getPath('userData'), 'settings.json');

  ipcMain.handle('settings:get', async () => {
    try {
      if (!existsSync(settingsPath)) return { anthropicApiKey: '', aiModel: 'claude-haiku-4-5' };
      const raw = await readFile(settingsPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { anthropicApiKey: '', aiModel: 'claude-haiku-4-5' };
    }
  });

  ipcMain.handle('settings:set', async (_e, settings: Record<string, unknown>) => {
    await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return {};
  });

  // ── AI IPC ────────────────────────────────────────────────────────────────
  const AI_SYSTEM_PROMPT = `You are an AI assistant for "Imagine", a creative whiteboard desktop application.

## Whiteboard Schema
All coordinates are **absolute canvas coordinates**. x,y is the **top-left corner** of each element (not the centre).
Elements: id(str), type, x, y (canvas coords), zIndex(int), rotation(deg)
- sticky-note: width, height, text, backgroundColor, font, fontSize
  backgroundColor options: #fef08a #f9a8d4 #93c5fd #86efac #fcd34d #c4b5fd #ffffff
  font: Caveat|Indie Flower|Kalam|Patrick Hand|Permanent Marker
- text-box: width, height, text, color(hex), font, fontSize, bold(bool), italic(bool)
- shape: width, height, shapeType(rectangle|square|circle|ellipse|triangle|diamond|star), fillColor, strokeColor, roughness(0-3), seed(int)
- image: width, height, caption (dataUrl excluded)
- arrow: x2, y2, color(hex), strokeWidth(int), showArrowhead(bool)
- drawing: bounding x/y/width/height only
Connections: {id, sourceId, targetId, label, color}
Groups: {id, childIds[]}

## Response
Return ONLY valid JSON (no markdown fences, no prose outside JSON):
{
  "thinking": "1-2 sentences of high-level reasoning only — no coordinates or technical details",
  "targetPage": "current"|"new",
  "newPageLabel": "label if targetPage=new",
  "commands": [
    {"type":"move_element","id":"...","x":0,"y":0},
    {"type":"update_element","id":"...","props":{...fields}},
    {"type":"delete_element","id":"..."},
    {"type":"add_element","element":{type,x,y,...fields}},
    {"type":"group_elements","ids":["id1","id2"]},
    {"type":"ungroup_elements","groupId":"..."},
    {"type":"add_connection","sourceId":"...","targetId":"...","label":"","color":"#b22222"},
    {"type":"delete_connection","id":"..."}
  ]
}

## Guidelines
- Generation prompts: use targetPage "new" to preserve existing content
- Organisation prompts: use targetPage "current" with move_element/group_elements

### COORDINATES — read carefully
The canvas is 6000×4000 px. The board snapshot includes a "viewportCentre" field showing the **absolute canvas coordinate** at the centre of the user's screen right now.

**ALL coordinates — for both move_element and add_element — are absolute canvas coordinates.**

For **organisation tasks** (rearranging/grouping existing elements):
- Read each element's x, y from the board state — those are the top-left corners
- Use those same absolute coordinates when repositioning them
- When adding container shapes or labels around existing elements, compute the bounding box from their x, y, width, height and place the container there
- To add a label above an element at (ex, ey), place the text-box at approximately (ex, ey - 60)
- To add a container shape behind a group, set x = minX - padding, y = minY - padding, width = (maxX - minX) + 2*padding, height = (maxY - minY) + 2*padding

For **generation tasks** (creating new content from scratch):
- Centre the new layout on the "viewportCentre" coordinates from the board snapshot
- Spread elements around that centre point, e.g. viewportCentre.x ± 220, viewportCentre.y ± 100

### SCALE
A typical readable layout for 6-10 elements fits in a 900×600 px area.

Element reference sizes (x,y = top-left corner):
- sticky-note: 200×180 px  → gap between stickies: 20-30 px
- text-box title: 260×50 px
- shape node: 120×80 px  → gap between shapes in a flow: 40-60 px
- horizontal row of stickies: x steps of ~220 px (width + 20 gap)
- vertical column: y steps of ~200 px (height + 20 gap)

NEVER space new elements more than 300 px apart unless the user explicitly asks for a wide layout.

- Default sticky note: font "Caveat", fontSize 20, backgroundColor "#fef08a", width 200 height 180
- Default text-box: font "Caveat", fontSize 18, color "#1a1a1a", width 240 height 60
- Default shape: roughness 1.5, strokeColor "#1a1a1a", fillColor "transparent"
- Default arrow: color "#333333", strokeWidth 2, showArrowhead true`;

  ipcMain.handle('ai:call', async (_e, prompt: string, board: unknown) => {
    try {
      let settings: { anthropicApiKey?: string; aiModel?: string; aiMaxTokens?: number; defaultCreativeMode?: boolean } = {};
      try {
        if (existsSync(settingsPath)) {
          settings = JSON.parse(await readFile(settingsPath, 'utf8'));
        }
      } catch { /* use defaults */ }

      const apiKey = settings.anthropicApiKey;
      if (!apiKey) return { error: 'No Anthropic API key configured. Go to File → Settings to add one.' };

      const model = settings.aiModel ?? 'claude-haiku-4-5';
      const maxTokens = typeof settings.aiMaxTokens === 'number' ? Math.min(32000, Math.max(1000, settings.aiMaxTokens)) : 8192;

      const userMessage = `Current whiteboard state:\n${JSON.stringify(board, null, 2)}\n\nUser request: ${prompt}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: AI_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = `Anthropic API error ${res.status}`;
        try { msg = JSON.parse(text)?.error?.message ?? msg; } catch { /* ignore */ }
        return { error: msg };
      }

      const data = await res.json() as { content: { type: string; text: string }[]; stop_reason?: string };
      if (data.stop_reason === 'max_tokens') {
        return { error: 'The AI response was too long and was cut off. Try a simpler prompt or work with fewer elements.' };
      }
      const rawText = data.content?.find((c) => c.type === 'text')?.text ?? '';

      // Extract JSON — Claude may wrap in ```json ``` fences despite instructions
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? rawText.match(/([\s\S]*)/);
      const jsonStr = (jsonMatch?.[1] ?? rawText).trim();

      const parsed = JSON.parse(jsonStr);
      return { response: parsed };
    } catch (err) {
      return { error: String(err) };
    }
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

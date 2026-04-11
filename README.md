# Imagine Whiteboard

A desktop whiteboard application built with Electron, React, and TypeScript. Draw, plan, and brainstorm on an infinite canvas.

## Features

- **Freehand drawing** — pressure-sensitive strokes via `perfect-freehand`
- **Shapes** — rectangle, square, circle, ellipse, triangle, diamond, star with rough/hand-drawn rendering via `roughjs`
- **Sticky notes** — coloured notes with editable text
- **Text boxes** — bold, italic, multi-font text elements
- **Images** — drag-and-drop or insert from file; auto-scaled with polaroid rotation
- **Arrows & lines** — two-click placement, shift-lock to axis
- **Connections** — link shapes/notes with bezier lines
- **Eraser** — radius-based stroke eraser
- **Select tool** — click, lasso, multi-select, Ctrl+click to toggle individual elements, group/ungroup, resize, rotate
- **Z-order controls** — bring to front/forward, send backward/to back
- **Pages** — multiple pages per board (PageUp / PageDown)
- **Undo / Redo** — full history
- **Grid** — dot grid with snap-to-grid
- **Zoom & pan** — scroll wheel zoom, space+drag or middle-mouse pan
- **Creative mode** — dark canvas theme
- **Export** — PNG / JPEG export with configurable scale
- **Autosave** — 5-second debounce autosave to `.imagine` board files
- **Templates** — save and load board templates
- **AI Assistant** — describe changes in plain English; Claude rearranges, creates, and labels elements on your board

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 31 |
| Renderer | React 18 + TypeScript |
| Bundler | electron-vite + Vite 5 |
| State | Zustand + Immer |
| Drawing | perfect-freehand |
| Shapes | roughjs |
| Styles | SCSS Modules |
| AI | Anthropic Claude API |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Distributable output lands in `dist/`.

## AI Assistant

The AI Assistant lets you describe what you want in plain English and Claude will generate or rearrange elements on the board.

**Setup:** Go to *File → Settings*, paste your Anthropic API key and choose a model. Keys are stored locally in your user data folder.

**Usage:** Click the ✦ button in the toolbar (or use the toolbar AI button) to open the assistant, type a prompt, review Claude's plan, then click *Apply Changes*.

Example prompts:
- "Organise these into logical groups with labels"
- "Create a flow diagram for a user login process"
- "Add connecting arrows between related items"

**Models available:**
| Model | Best for |
|---|---|
| Claude Haiku 4.5 | Fast, low cost |
| Claude Sonnet 4.6 | Balanced speed and quality |
| Claude Opus 4.6 | Most capable, complex tasks |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `S` | Select tool |
| `F` | Sharpie (freehand) |
| `D` | Shape tool |
| `N` | Sticky note |
| `T` | Text box |
| `A` | Arrow |
| `L` | Line |
| `C` | Connection |
| `I` | Image |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+C` / `X` / `V` | Copy / Cut / Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+A` | Select all |
| `Ctrl+G` | Group / Ungroup selection |
| `Ctrl+Click` | Add/remove element from selection |
| `Shift+Drag` | Constrain movement to horizontal or vertical axis |
| `Ctrl+S` | Save |
| `Ctrl+O` | Open |
| `Ctrl+N` | New board |
| `Delete` / `Backspace` | Delete selection |
| `Escape` | Deselect / cancel |
| `PageDown` / `PageUp` | Next / previous page |
| `Space + drag` | Pan canvas |
| `Scroll wheel` | Zoom |

## Project Structure

```
src/
  main/           Electron main process (IPC handlers, AI call, settings, templates)
  preload/        Context bridge API
  renderer/
    src/
      components/
        Whiteboard/         Canvas + interaction hooks
        Toolbar/            Tool palette
        PropertiesPanel/    Selected element properties
        elements/           Per-element React components
        ContextMenu/        Right-click menu
        ExportDialog/       Export UI
        PageStrip/          Page navigation
        AIAssistant/        AI prompt dialog
        SettingsDialog/     API key + model settings
        HelpDialog/         Keyboard shortcut reference
      store/
        whiteboardStore.ts  Zustand global state
      utils/
        drawing.ts          Stroke path generation
        roughShapes.ts      Rough.js shape helpers
        helpers.ts          Coordinate & geometry utils
        snap.ts             Grid snapping
        export.ts           Canvas export
        aiExecutor.ts       Applies AI command lists to the board
      types/                Shared TypeScript types
      styles/               Global SCSS variables
```

## License

MIT

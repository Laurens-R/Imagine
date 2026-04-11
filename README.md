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
- **Select tool** — click, lasso, multi-select, group/ungroup, resize, rotate
- **Pages** — multiple pages per board (PageUp / PageDown)
- **Undo / Redo** — full history
- **Grid** — dot grid with snap-to-grid
- **Zoom & pan** — scroll wheel zoom, space+drag or middle-mouse pan
- **Creative mode** — dark canvas theme
- **Export** — PNG / JPEG export with configurable scale
- **Autosave** — 5-second debounce autosave to `.imagine` board files
- **Templates** — save and load board templates

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
  main/           Electron main process
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
      store/
        whiteboardStore.ts  Zustand global state
      utils/
        drawing.ts          Stroke path generation
        roughShapes.ts      Rough.js shape helpers
        helpers.ts          Coordinate & geometry utils
        snap.ts             Grid snapping
        export.ts           Canvas export
      types/                Shared TypeScript types
      styles/               Global SCSS variables
```

## License

MIT

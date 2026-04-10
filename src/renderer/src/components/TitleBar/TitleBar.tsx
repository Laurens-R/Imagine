import React, { useState, useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import styles from './TitleBar.module.scss';

// ── File menu items ──────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

const FileMenu: React.FC<{ items: MenuItem[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className={styles.fileMenuWrapper}>
      <button
        className={`${styles.fileMenuTrigger} ${open ? styles.open : ''}`}
        onClick={() => setOpen((v) => !v)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg className={styles.triggerIcon} viewBox="0 0 16 16" fill="none">
          <rect x="1" y="2" width="14" height="2.5" rx="1" fill="currentColor" />
          <rect x="1" y="6.75" width="10" height="2.5" rx="1" fill="currentColor" />
          <rect x="1" y="11.5" width="12" height="2.5" rx="1" fill="currentColor" />
        </svg>
        File
        <svg className={styles.chevron} viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown} onMouseDown={(e) => e.stopPropagation()}>
          {items.map((item, i) =>
            item.divider ? (
              <div key={`div-${i}`} className={styles.dividerLine} />
            ) : (
              <button
                key={item.label}
                className={styles.dropdownItem}
                disabled={item.disabled}
                onClick={() => { item.action(); setOpen(false); }}
              >
                <span className={styles.itemLabel}>{item.label}</span>
                {item.shortcut && <kbd className={styles.kbd}>{item.shortcut}</kbd>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ── Main TitleBar ────────────────────────────────────────────────────────────

export const TitleBar: React.FC<{ onExport?: () => void }> = ({ onExport }) => {
  const currentFile = useWhiteboardStore((s) => s.currentFile);
  const elements = useWhiteboardStore((s) => s.elements);
  const connections = useWhiteboardStore((s) => s.connections);
  const { loadBoard, setCurrentFile, clearAll, snapshot } = useWhiteboardStore();

  const [saving, setSaving] = useState(false);

  const handleNew = () => {
    if (elements.length > 0 || connections.length > 0) {
      if (!window.confirm('Discard current whiteboard and start a new one?')) return;
    }
    snapshot();
    clearAll();
    setCurrentFile(null);
  };

  const handleOpen = async () => {
    try {
      const result = await window.whiteboardApi.openBoard();
      if (!result.canceled && result.data && result.filePath) {
        const parsed = JSON.parse(result.data);
        loadBoard(parsed.elements ?? [], parsed.connections ?? [], result.filePath);
      }
    } catch {
      alert('Failed to open file – it may be corrupted.');
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = JSON.stringify({ elements, connections }, null, 2);
      const result = await window.whiteboardApi.saveBoard(data, currentFile ?? undefined);
      if (!result.canceled && result.filePath) setCurrentFile(result.filePath);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAs = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = JSON.stringify({ elements, connections }, null, 2);
      const result = await window.whiteboardApi.saveBoard(data);
      if (!result.canceled && result.filePath) setCurrentFile(result.filePath);
    } finally {
      setSaving(false);
    }
  };

  const menuItems: MenuItem[] = [
    { label: 'New Whiteboard', shortcut: 'Ctrl+N', action: handleNew },
    { label: 'Open…', shortcut: 'Ctrl+O', action: handleOpen },
    { divider: true, label: '', action: () => {} },
    { label: 'Save', shortcut: 'Ctrl+S', action: handleSave, disabled: saving },
    { label: 'Save As…', action: handleSaveAs, disabled: saving },
    { divider: true, label: '', action: () => {} },
    { label: 'Export as Image…', action: () => onExport?.(), disabled: !onExport },
  ];

  const fileName = currentFile
    ? currentFile.split(/[\\/]/).pop()!
    : 'Untitled';

  return (
    <div className={styles.titleBar}>
      {/* Logo + app name */}
      <div className={styles.brand} onMouseDown={(e) => e.stopPropagation()}>
        <svg className={styles.logo} viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" fill="url(#grad)" />
          <path d="M8 20 Q11 8 14 14 Q17 20 20 8" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c6aff" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span className={styles.appName}>Imagine</span>
      </div>

      {/* File menu */}
      <div className={styles.menuBar} onMouseDown={(e) => e.stopPropagation()}>
        <FileMenu items={menuItems} />
      </div>

      {/* Title / drag region */}
      <div className={styles.dragRegion}>
        <span className={styles.fileName}>{fileName}</span>
        {saving && <span className={styles.savingBadge}>Saving…</span>}
      </div>

      {/* Window controls */}
      <div className={styles.windowControls} onMouseDown={(e) => e.stopPropagation()}>
        <button className={styles.winBtn} onClick={() => window.whiteboardApi.minimize()} title="Minimize">
          <svg viewBox="0 0 12 2"><rect y="0.5" width="12" height="1.5" rx="0.75" fill="currentColor" /></svg>
        </button>
        <button className={styles.winBtn} onClick={() => window.whiteboardApi.maximize()} title="Maximize / Restore">
          <svg viewBox="0 0 12 12" fill="none">
            <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button className={`${styles.winBtn} ${styles.closeBtn}`} onClick={() => window.whiteboardApi.close()} title="Close">
          <svg viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

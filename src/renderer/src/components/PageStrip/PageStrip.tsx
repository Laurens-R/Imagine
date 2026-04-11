import React, { useState, useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import styles from './PageStrip.module.scss';

export const PageStrip: React.FC = () => {
  const pages = useWhiteboardStore((s) => s.pages);
  const currentPageIndex = useWhiteboardStore((s) => s.currentPageIndex);
  const { switchPage, addPage, removePage, renamePage } = useWhiteboardStore();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editingIndex !== null) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingIndex]);

  const commitRename = (i: number) => {
    renamePage(i, editValue);
    setEditingIndex(null);
  };

  const handleTabClick = (i: number) => {
    if (clickTimerRef.current) return; // part of a double-click, skip
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      switchPage(i);
    }, 200);
  };

  const handleTabDoubleClick = (i: number, label: string) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    switchPage(i);
    setEditingIndex(i);
    setEditValue(label);
  };

  return (
    <div className={styles.pageStrip} onMouseDown={(e) => e.stopPropagation()}>
      <div className={styles.tabs}>
        {pages.map((page, i) => (
          <div
            key={page.id}
            className={`${styles.tab} ${i === currentPageIndex ? styles.active : ''}`}
            onClick={() => handleTabClick(i)}
            onDoubleClick={() => handleTabDoubleClick(i, page.label)}
            title={editingIndex === i ? '' : `Switch to ${page.label} (double-click to rename)`}
          >
            {editingIndex === i ? (
              <input
                ref={inputRef}
                className={styles.renameInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitRename(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(i);
                  if (e.key === 'Escape') setEditingIndex(null);
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={styles.label}>{page.label}</span>
            )}
            {pages.length > 1 && editingIndex !== i && (
              <button
                className={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); removePage(i); }}
                title="Remove page"
              >
                <svg viewBox="0 0 10 10" fill="none" width={8} height={8}>
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className={styles.addBtn}
        onClick={addPage}
        title="Add page"
      >
        <svg viewBox="0 0 10 10" fill="none" width={10} height={10}>
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

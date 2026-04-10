import React, { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.scss';

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: false;
  onClick: () => void;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  // Nudge menu into viewport after mount
  const style: React.CSSProperties = { left: x, top: y };

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ('separator' in item && item.separator) {
          return <div key={i} className={styles.separator} />;
        }
        const it = item as ContextMenuItem;
        return (
          <button
            key={i}
            className={[
              styles.item,
              it.disabled ? styles.disabled : '',
              it.danger    ? styles.danger    : '',
            ].join(' ')}
            disabled={it.disabled}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (it.disabled) return;
              it.onClick();
              onClose();
            }}
          >
            <span className={styles.label}>{it.label}</span>
            {it.shortcut && <span className={styles.shortcut}>{it.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
};

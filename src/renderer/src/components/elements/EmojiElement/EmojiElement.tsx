import React, { useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { snapVal } from '../../../utils/snap';
import type { EmojiElement as EmojiElementType } from '../../../types';
import { ResizeHandles } from '../ResizeHandles/ResizeHandles';
import styles from './EmojiElement.module.scss';

interface EmojiElementProps {
  element: EmojiElementType;
  isSelected: boolean;
  tool: string;
  onSelect: (ctrlKey?: boolean) => void;
  onUpdate: (updates: Partial<EmojiElementType>) => void;
  onDelete: () => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
}

export const EmojiElement: React.FC<EmojiElementProps> = ({
  element,
  isSelected,
  tool,
  onSelect,
  onUpdate,
  onDelete,
  onStartConnection,
  onCompleteConnection,
}) => {
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const pendingConn = useWhiteboardStore((s) => s.pendingConnection);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const [isConnHovered, setIsConnHovered] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (pendingConn && pendingConn.sourceId !== element.id) {
        e.stopPropagation();
        onCompleteConnection();
        return;
      }
      if (tool === 'connection') {
        e.stopPropagation();
        onStartConnection();
        return;
      }
      e.stopPropagation();
      onSelect(e.ctrlKey);
      if (tool !== 'select') return;
      dragStart.current = { mx: e.clientX, my: e.clientY, ex: element.x, ey: element.y };

      const onMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const ddx = (ev.clientX - dragStart.current.mx) / zoom;
        const ddy = (ev.clientY - dragStart.current.my) / zoom;
        const effDdx = ev.shiftKey ? (Math.abs(ddx) >= Math.abs(ddy) ? ddx : 0) : ddx;
        const effDdy = ev.shiftKey ? (Math.abs(ddy) > Math.abs(ddx) ? ddy : 0) : ddy;
        const rawX = dragStart.current.ex + effDdx;
        const rawY = dragStart.current.ey + effDdy;
        onUpdate({
          x: gridEnabled ? snapVal(rawX, gridSize) : rawX,
          y: gridEnabled ? snapVal(rawY, gridSize) : rawY,
        });
      };
      const onUp = () => {
        dragStart.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [tool, element.id, element.x, element.y, pendingConn, zoom, gridEnabled, gridSize, onSelect, onUpdate, onStartConnection, onCompleteConnection]
  );

  const isDraggable = tool === 'select';
  const isPendingSource = pendingConn != null && pendingConn.sourceId === element.id;
  const showConnPin = pendingConn != null && pendingConn.sourceId !== element.id;
  const showConnectionMode = tool === 'connection' && !isPendingSource && pendingConn == null;

  return (
    <div
      className={[
        styles.emojiElement,
        isSelected ? styles.selected : '',
        showConnPin ? styles.connectable : '',
        showConnectionMode ? styles.connectionSource : '',
        isPendingSource ? styles.pendingSource : '',
        isConnHovered ? styles.connTarget : '',
      ].join(' ')}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        cursor: isDraggable ? 'grab' : (showConnPin || showConnectionMode) ? 'crosshair' : 'default',
        zIndex: element.zIndex,
      }}
      onMouseDown={handleMouseDown}
    >
      <span
        className={styles.emojiChar}
        style={{ fontSize: element.fontSize }}
        role="img"
        aria-label="emoji"
      >
        {element.emoji}
      </span>

      {isSelected && tool === 'select' && (
        <ResizeHandles
          zoom={zoom}
          pan={pan}
          element={element}
          onUpdate={(updates) => {
            // Keep fontSize proportional to height
            if (updates.height !== undefined) {
              onUpdate({ ...updates, fontSize: updates.height * 0.75 });
            } else {
              onUpdate(updates);
            }
          }}
          minWidth={24}
          minHeight={24}
        />
      )}

      {isSelected && (
        <div className={styles.controls}>
          <button
            className={styles.deleteBtn}
            onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >×</button>
          <button
            className={styles.connectBtn}
            onMouseDown={(e) => { e.stopPropagation(); onStartConnection(); }}
            title="Connect"
          >⊕</button>
        </div>
      )}

      {showConnPin && (
        <div
          className={styles.connPin}
          onMouseDown={(e) => { e.stopPropagation(); onCompleteConnection(); }}
          onMouseEnter={() => setIsConnHovered(true)}
          onMouseLeave={() => setIsConnHovered(false)}
        />
      )}
    </div>
  );
};

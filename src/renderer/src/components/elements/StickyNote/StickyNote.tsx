import React, { useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { snapVal } from '../../../utils/snap';
import type { StickyNoteElement } from '../../../types';
import { ResizeHandles } from '../ResizeHandles/ResizeHandles';
import styles from './StickyNote.module.scss';

interface StickyNoteProps {
  element: StickyNoteElement;
  isSelected: boolean;
  tool: string;
  onSelect: (ctrlKey?: boolean) => void;
  onUpdate: (updates: Partial<StickyNoteElement>) => void;
  onDelete: () => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({
  element,
  isSelected,
  tool,
  onSelect,
  onUpdate,
  onDelete,
  onStartConnection,
  onCompleteConnection
}) => {
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const pendingConn = useWhiteboardStore((s) => s.pendingConnection);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const [isEditing, setIsEditing] = useState(false);
  const [isConnHovered, setIsConnHovered] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Complete a pending connection when clicking this element
      if (pendingConn && pendingConn.sourceId !== element.id) {
        e.stopPropagation();
        onCompleteConnection();
        return;
      }
      // Start a new connection when connection tool is active
      if (tool === 'connection') {
        e.stopPropagation();
        onStartConnection();
        return;
      }
      if (isEditing) {
        e.stopPropagation();
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
        const effDdy = ev.shiftKey ? (Math.abs(ddy) >  Math.abs(ddx) ? ddy : 0) : ddy;
        const rawX = dragStart.current.ex + effDdx;
        const rawY = dragStart.current.ey + effDdy;
        onUpdate({
          x: gridEnabled ? snapVal(rawX, gridSize) : rawX,
          y: gridEnabled ? snapVal(rawY, gridSize) : rawY
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
    [tool, isEditing, element.id, element.x, element.y, pendingConn, zoom, gridEnabled, gridSize, onSelect, onUpdate, onStartConnection, onCompleteConnection]
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't open editor while connecting
    if (tool === 'connection') return;
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 30);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
  };

  const isDraggable = tool === 'select';
  // Only show the target-overlay when a connection is already pending FROM a different element.
  // NEVER when there is no pending connection — that would swallow the click that starts one.
  const isPendingSource = pendingConn != null && pendingConn.sourceId === element.id;
  const showConnPin = pendingConn != null && pendingConn.sourceId !== element.id;
  const showConnectionMode = tool === 'connection' && !isPendingSource && pendingConn == null;

  return (
    <div
      className={[
        styles.stickyNote,
        isSelected ? styles.selected : '',
        showConnPin ? styles.connectable : '',
        showConnectionMode ? styles.connectionSource : '',
        isPendingSource ? styles.pendingSource : '',
        isConnHovered ? styles.connTarget : ''
      ].join(' ')}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        backgroundColor: element.backgroundColor,
        fontFamily: element.font,
        fontSize: element.fontSize,
        cursor: isDraggable ? 'grab' : (showConnPin || showConnectionMode) ? 'crosshair' : 'default',
        zIndex: element.zIndex
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Folded corner decoration */}
      <div className={styles.fold} />

      {/* Text content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={element.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onBlur={handleTextBlur}
          style={{ fontFamily: element.font, fontSize: element.fontSize, textAlign: element.textAlign ?? 'left' }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div className={styles.text} style={{ textAlign: element.textAlign ?? 'left' }}>{element.text || <span className={styles.placeholder}>Double-click to edit</span>}</div>
      )}

      {/* Resize handles */}
      {isSelected && !isEditing && tool === 'select' && (
        <ResizeHandles
          zoom={zoom}
          pan={pan}
          element={element}
          onUpdate={onUpdate}
          minWidth={80}
          minHeight={60}
        />
      )}

      {/* Selection controls */}
      {isSelected && !isEditing && (
        <div className={styles.controls}>
          <button className={styles.deleteBtn} onMouseDown={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">×</button>
          <button className={styles.connectBtn} onMouseDown={(e) => { e.stopPropagation(); onStartConnection(); }} title="Connect">⊕</button>
        </div>
      )}

      {/* Connection target highlight */}
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

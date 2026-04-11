import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { snapVal } from '../../../utils/snap';
import type { TextBoxElement } from '../../../types';
import { ResizeHandles } from '../ResizeHandles/ResizeHandles';
import styles from './TextBox.module.scss';

interface TextBoxProps {
  element: TextBoxElement;
  isSelected: boolean;
  tool: string;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBoxElement>) => void;
  onDelete: () => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
}

export const TextBox: React.FC<TextBoxProps> = ({
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
  // Start in edit mode when the text box is freshly created (empty text)
  const [isEditing, setIsEditing] = useState(!element.text);
  const [isConnHovered, setIsConnHovered] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Fallback focus via requestAnimationFrame in case autoFocus
      // doesn't fire (e.g. when toggling edit mode on an existing box)
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing]);

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
      onSelect();
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
    if (tool === 'connection') return;
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Only auto-delete if the box was never given text AND the text is truly empty.
    // Use a short delay so a re-focus (e.g. clicking inside the box) can cancel the delete.
    if (!element.text.trim()) {
      setTimeout(() => {
        // Re-check text via the store-backed prop — if the element still has no text, remove it
        if (!element.text.trim()) onDelete();
      }, 150);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); // prevent whiteboard Escape from firing
      setIsEditing(false);
      if (!element.text.trim()) onDelete();
    }
  };

  // Auto-resize textarea height as user types
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ text: e.target.value });
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      onUpdate({ height: inputRef.current.scrollHeight + 20 });
    }
  };

  const isPendingSource = pendingConn != null && pendingConn.sourceId === element.id;
  const showConnPin = pendingConn != null && pendingConn.sourceId !== element.id;
  const showConnectionMode = tool === 'connection' && !isPendingSource && pendingConn == null;

  return (
    <div
      className={[
        styles.textBox,
        isSelected ? styles.selected : '',
        isEditing ? styles.editing : '',
        showConnPin ? styles.connectable : '',
        showConnectionMode ? styles.connectionSource : '',
        isPendingSource ? styles.pendingSource : '',
        isConnHovered ? styles.connTarget : ''
      ].join(' ')}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        minHeight: element.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        cursor: tool === 'select' ? 'grab' : (showConnPin || showConnectionMode) ? 'crosshair' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          autoFocus
          className={styles.textarea}
          value={element.text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Type here…"
          style={{
            fontFamily: element.font,
            fontSize: element.fontSize,
            color: element.color,
            fontWeight: element.bold ? 'bold' : 'normal',
            fontStyle: element.italic ? 'italic' : 'normal',
            textAlign: element.textAlign ?? 'left'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className={styles.display}
          style={{
            fontFamily: element.font,
            fontSize: element.fontSize,
            color: element.color,
            fontWeight: element.bold ? 'bold' : 'normal',
            fontStyle: element.italic ? 'italic' : 'normal',
            textAlign: element.textAlign ?? 'left'
          }}
        >
          {element.text || <span className={styles.placeholder}>Double-click to edit</span>}
        </div>
      )}

      {isSelected && !isEditing && tool === 'select' && (
        <ResizeHandles
          zoom={zoom}
          pan={pan}
          element={element}
          onUpdate={onUpdate}
          minWidth={60}
          minHeight={30}
        />
      )}

      {isSelected && !isEditing && (
        <div className={styles.controls}>
          <button className={styles.deleteBtn} onMouseDown={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">×</button>
          <button className={styles.connectBtn} onMouseDown={(e) => { e.stopPropagation(); onStartConnection(); }} title="Connect">⊕</button>
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

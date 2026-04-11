import React, { useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../../../store/whiteboardStore';
import { snapVal } from '../../../utils/snap';
import type { ImageElement } from '../../../types';
import { ResizeHandles } from '../ResizeHandles/ResizeHandles';
import styles from './ImageElement.module.scss';

interface ImageElProps {
  element: ImageElement;
  isSelected: boolean;
  tool: string;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageElement>) => void;
  onDelete: () => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
}

export const ImageEl: React.FC<ImageElProps> = ({
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
  const dragStart = useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [isConnHovered, setIsConnHovered] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Complete pending connection
      if (pendingConn && pendingConn.sourceId !== element.id) {
        e.stopPropagation();
        onCompleteConnection();
        return;
      }
      // Start connection
      if (tool === 'connection') {
        e.stopPropagation();
        onStartConnection();
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
    [tool, element.id, element.x, element.y, pendingConn, zoom, gridEnabled, gridSize, onSelect, onUpdate, onStartConnection, onCompleteConnection]
  );

  const isPendingSource = pendingConn != null && pendingConn.sourceId === element.id;
  const showConnPin = pendingConn != null && pendingConn.sourceId !== element.id;
  const showConnectionMode = tool === 'connection' && !isPendingSource && pendingConn == null;

  const showFrame = element.polaroidFrame !== false;
  const polaroidPad = showFrame ? 12 : 0;
  const captionH = 38;

  return (
    <div
      className={[
        showFrame ? styles.polaroid : styles.plainImage,
        isSelected ? styles.selected : '',
        showConnPin ? styles.connectable : '',
        showConnectionMode ? styles.connectionSource : '',
        isPendingSource ? styles.pendingSource : '',
        isConnHovered ? styles.connTarget : ''
      ].join(' ')}
      style={{
        left: element.x - polaroidPad,
        top: element.y - polaroidPad,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.zIndex,
        cursor: tool === 'select' ? 'grab' : (showConnPin || showConnectionMode) ? 'crosshair' : 'default',
        width: element.width + polaroidPad * 2
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Photo area */}
      <div
        className={styles.photo}
        style={{ width: element.width, height: element.height }}
      >
        <img
          src={element.dataUrl}
          alt={element.caption}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Caption – only shown with polaroid frame */}
      {showFrame && (
        <div className={styles.captionArea} style={{ height: captionH }}>
          {editingCaption ? (
            <input
              autoFocus
              className={styles.captionInput}
              value={element.caption}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              onBlur={() => setEditingCaption(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingCaption(false)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={styles.caption} onDoubleClick={(e) => { e.stopPropagation(); setEditingCaption(true); }}>
              {element.caption || 'caption'}
            </span>
          )}
        </div>
      )}

      {/* Resize handles – inset to the photo boundary */}
      {isSelected && tool === 'select' && (
        <ResizeHandles
          zoom={zoom}
          pan={pan}
          element={element}
          onUpdate={onUpdate}
          offsetX={polaroidPad}
          offsetY={polaroidPad}
          minWidth={60}
          minHeight={60}
        />
      )}

      {/* Controls */}
      {isSelected && (
        <div className={styles.controls}>
          <button className={styles.deleteBtn} onMouseDown={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">×</button>
          <button className={styles.connectBtn} onMouseDown={(e) => { e.stopPropagation(); onStartConnection(); }} title="Connect">⊕</button>
          <button
            className={styles.frameBtn}
            onMouseDown={(e) => { e.stopPropagation(); onUpdate({ polaroidFrame: !showFrame }); }}
            title={showFrame ? 'Hide frame' : 'Show frame'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={12} height={12}>
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          </button>
        </div>
      )}

      {showConnPin && <div
        className={styles.connPin}
        onMouseDown={(e) => { e.stopPropagation(); onCompleteConnection(); }}
        onMouseEnter={() => setIsConnHovered(true)}
        onMouseLeave={() => setIsConnHovered(false)}
      />}
    </div>
  );
};

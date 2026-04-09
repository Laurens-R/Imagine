import React, { useRef } from 'react';
import styles from './ResizeHandles.module.scss';

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeHandlesProps {
  zoom: number;
  pan: { x: number; y: number };
  element: { x: number; y: number; width: number; height: number; rotation: number };
  onUpdate: (updates: { x?: number; y?: number; width?: number; height?: number; rotation?: number }) => void;
  /** Offset (in canvas units) from the container div's top-left to element.x/y.
   *  Use this when the element's div is offset from the logical resize origin
   *  (e.g. polaroid padding). Defaults to 0. */
  offsetX?: number;
  offsetY?: number;
  minWidth?: number;
  minHeight?: number;
}

const HANDLES: { handle: HandleType; cursor: string }[] = [
  { handle: 'nw', cursor: 'nwse-resize' },
  { handle: 'n',  cursor: 'ns-resize'   },
  { handle: 'ne', cursor: 'nesw-resize' },
  { handle: 'e',  cursor: 'ew-resize'   },
  { handle: 'se', cursor: 'nwse-resize' },
  { handle: 's',  cursor: 'ns-resize'   },
  { handle: 'sw', cursor: 'nesw-resize' },
  { handle: 'w',  cursor: 'ew-resize'   },
];

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  zoom,
  pan,
  element,
  onUpdate,
  offsetX = 0,
  offsetY = 0,
  minWidth = 20,
  minHeight = 20,
}) => {
  const startRef = useRef<{
    mx: number; my: number;
    ex: number; ey: number; ew: number; eh: number;
  } | null>(null);
  const rotateStartRef = useRef<{ startAngle: number; startRotation: number } | null>(null);

  const ROTATE_OFFSET = 28; // canvas units above top edge

  const getHandleStyle = (handle: HandleType): React.CSSProperties => {
    const { width, height } = element;
    const positions: Record<HandleType, { top: number; left: number }> = {
      nw: { top: offsetY,              left: offsetX           },
      n:  { top: offsetY,              left: offsetX + width / 2 },
      ne: { top: offsetY,              left: offsetX + width   },
      e:  { top: offsetY + height / 2, left: offsetX + width   },
      se: { top: offsetY + height,     left: offsetX + width   },
      s:  { top: offsetY + height,     left: offsetX + width / 2 },
      sw: { top: offsetY + height,     left: offsetX           },
      w:  { top: offsetY + height / 2, left: offsetX           },
    };
    return positions[handle];
  };

  const handleMouseDown = (e: React.MouseEvent, handle: HandleType) => {
    e.stopPropagation();
    e.preventDefault();
    startRef.current = {
      mx: e.clientX,
      my: e.clientY,
      ex: element.x,
      ey: element.y,
      ew: element.width,
      eh: element.height,
    };

    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const { mx, my, ex, ey, ew, eh } = startRef.current;
      const dx = (ev.clientX - mx) / zoom;
      const dy = (ev.clientY - my) / zoom;

      let nx = ex, ny = ey, nw = ew, nh = eh;

      if (handle.includes('w')) { nx = ex + dx; nw = ew - dx; }
      if (handle.includes('e')) { nw = ew + dx; }
      if (handle.includes('n')) { ny = ey + dy; nh = eh - dy; }
      if (handle.includes('s')) { nh = eh + dy; }

      // Clamp to minimums, pinning the opposite edge
      if (nw < minWidth) {
        if (handle.includes('w')) nx = ex + ew - minWidth;
        nw = minWidth;
      }
      if (nh < minHeight) {
        if (handle.includes('n')) ny = ey + eh - minHeight;
        nh = minHeight;
      }

      onUpdate({ x: nx, y: ny, width: nw, height: nh });
    };

    const onUp = () => {
      startRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const rotateMD = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const screenCX = (element.x + element.width / 2) * zoom + pan.x;
    const screenCY = (element.y + element.height / 2) * zoom + pan.y;
    const startAngle = Math.atan2(e.clientY - screenCY, e.clientX - screenCX) * (180 / Math.PI);
    rotateStartRef.current = { startAngle, startRotation: element.rotation };

    const onMove = (ev: MouseEvent) => {
      if (!rotateStartRef.current) return;
      const { startAngle: sa, startRotation } = rotateStartRef.current;
      const angle = Math.atan2(ev.clientY - screenCY, ev.clientX - screenCX) * (180 / Math.PI);
      let newRotation = startRotation + (angle - sa);
      if (ev.shiftKey) newRotation = Math.round(newRotation / 45) * 45;
      onUpdate({ rotation: newRotation });
    };
    const onUp = () => {
      rotateStartRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      {HANDLES.map(({ handle, cursor }) => (
        <div
          key={handle}
          className={styles.handle}
          style={{ ...getHandleStyle(handle), cursor }}
          onMouseDown={(e) => handleMouseDown(e, handle)}
        />
      ))}
      {/* Rotation stem */}
      <div
        className={styles.rotateLine}
        style={{ left: offsetX + element.width / 2, top: offsetY - ROTATE_OFFSET, height: ROTATE_OFFSET }}
      />
      {/* Rotation handle */}
      <div
        className={styles.rotateHandle}
        style={{ left: offsetX + element.width / 2, top: offsetY - ROTATE_OFFSET }}
        onMouseDown={rotateMD}
        title="Rotate (hold Shift to snap 45°)"
      >↺</div>
    </>
  );
};

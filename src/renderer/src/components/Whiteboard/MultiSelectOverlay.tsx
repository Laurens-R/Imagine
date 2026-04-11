import React, { useRef } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { getElementBounds } from './whiteboardHelpers';
import { snapVal } from '../../utils/snap';
import type {
  WhiteboardElement, ArrowElement, DrawingElement,
  StickyNoteElement, TextBoxElement, ShapeElement, ImageElement,
} from '../../types';
import styles from './Whiteboard.module.scss';

export const MultiSelectOverlay: React.FC = () => {
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const groups = useWhiteboardStore((s) => s.groups);
  const elements = useWhiteboardStore((s) => s.elements);
  const tool = useWhiteboardStore((s) => s.tool);
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const gridEnabled = useWhiteboardStore((s) => s.gridEnabled);
  const gridSize = useWhiteboardStore((s) => s.gridSize);
  const { snapshot, updateElement } = useWhiteboardStore();

  const multiDragRef = useRef<{
    mx: number;
    my: number;
    origins: { id: string; x: number; y: number; x2?: number; y2?: number; points?: [number, number, number][] }[];
  } | null>(null);

  if (selectedIds.length === 0) return null;

  const hasGroup = selectedIds.some((id) => groups.some((g) => g.id === id));
  if (selectedIds.length < 2 && !hasGroup) return null;

  const physicalEls = selectedIds.flatMap((id) => {
    const grp = groups.find((g) => g.id === id);
    if (grp) return elements.filter((el) => grp.childIds.includes(el.id));
    return elements.filter((el) => el.id === id);
  });
  if (physicalEls.length === 0) return null;

  const bounds = physicalEls.map(getElementBounds);
  const grpMinX = Math.min(...bounds.map((b) => b.x));
  const grpMinY = Math.min(...bounds.map((b) => b.y));
  const grpMaxX = Math.max(...bounds.map((b) => b.x + b.w));
  const grpMaxY = Math.max(...bounds.map((b) => b.y + b.h));
  const grpW = Math.max(grpMaxX - grpMinX, 1);
  const grpH = Math.max(grpMaxY - grpMinY, 1);
  const grpCX = grpMinX + grpW / 2;
  const grpCY = grpMinY + grpH / 2;
  const screenCX = grpCX * zoom + pan.x;
  const screenCY = grpCY * zoom + pan.y;

  const multiSelectionRect = {
    left:   grpMinX * zoom + pan.x - 4,
    top:    grpMinY * zoom + pan.y - 4,
    width:  grpW * zoom + 8,
    height: grpH * zoom + 8,
  };

  const startGroupResize = (e: React.MouseEvent, hId: string) => {
    e.stopPropagation();
    e.preventDefault();
    snapshot();
    const origData = physicalEls.map((el) => ({ ...el }));
    const startMx = e.clientX, startMy = e.clientY;
    const onMove = (ev: MouseEvent) => {
      const ddx = (ev.clientX - startMx) / zoom;
      const ddy = (ev.clientY - startMy) / zoom;
      let nbx = grpMinX, nby = grpMinY, nbw = grpW, nbh = grpH;
      if (hId.includes('w')) { nbx = grpMinX + ddx; nbw = grpW - ddx; }
      if (hId.includes('e')) { nbw = grpW + ddx; }
      if (hId.includes('n')) { nby = grpMinY + ddy; nbh = grpH - ddy; }
      if (hId.includes('s')) { nbh = grpH + ddy; }
      if (nbw < 20) { if (hId.includes('w')) nbx = grpMinX + grpW - 20; nbw = 20; }
      if (nbh < 20) { if (hId.includes('n')) nby = grpMinY + grpH - 20; nbh = 20; }
      const sx = nbw / grpW, sy = nbh / grpH;
      origData.forEach((orig) => {
        if (orig.type === 'arrow') {
          const a = orig as ArrowElement;
          updateElement(orig.id, {
            x: nbx + (a.x - grpMinX) * sx,
            y: nby + (a.y - grpMinY) * sy,
            x2: nbx + (a.x2 - grpMinX) * sx,
            y2: nby + (a.y2 - grpMinY) * sy,
          } as Partial<WhiteboardElement>);
        } else if (orig.type === 'drawing') {
          const d = orig as DrawingElement;
          const newPts = d.points.map(([px, py, pr]) => [
            nbx + (px - grpMinX) * sx, nby + (py - grpMinY) * sy, pr,
          ] as [number, number, number]);
          updateElement(orig.id, { x: newPts[0][0], y: newPts[0][1], points: newPts } as Partial<WhiteboardElement>);
        } else {
          const s = orig as StickyNoteElement | TextBoxElement | ShapeElement | ImageElement;
          updateElement(orig.id, {
            x: nbx + (s.x - grpMinX) * sx,
            y: nby + (s.y - grpMinY) * sy,
            width: s.width * sx,
            height: s.height * sy,
          } as Partial<WhiteboardElement>);
        }
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startGroupRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    snapshot();
    const startAngle = Math.atan2(e.clientY - screenCY, e.clientX - screenCX) * (180 / Math.PI);
    const origData = physicalEls.map((el) => ({ ...el }));
    const onMove = (ev: MouseEvent) => {
      const curAngle = Math.atan2(ev.clientY - screenCY, ev.clientX - screenCX) * (180 / Math.PI);
      let delta = curAngle - startAngle;
      if (ev.shiftKey) delta = Math.round(delta / 45) * 45;
      const rad = delta * (Math.PI / 180);
      const cos = Math.cos(rad), sin = Math.sin(rad);
      origData.forEach((orig) => {
        if (orig.type === 'arrow') {
          const a = orig as ArrowElement;
          const rx1 = a.x - grpCX, ry1 = a.y - grpCY;
          const rx2 = a.x2 - grpCX, ry2 = a.y2 - grpCY;
          updateElement(orig.id, {
            x: grpCX + rx1 * cos - ry1 * sin, y: grpCY + rx1 * sin + ry1 * cos,
            x2: grpCX + rx2 * cos - ry2 * sin, y2: grpCY + rx2 * sin + ry2 * cos,
            rotation: orig.rotation + delta,
          } as Partial<WhiteboardElement>);
        } else if (orig.type === 'drawing') {
          const d = orig as DrawingElement;
          const newPts = d.points.map(([px, py, pr]) => {
            const dx = px - grpCX, dy = py - grpCY;
            return [grpCX + dx * cos - dy * sin, grpCY + dx * sin + dy * cos, pr] as [number, number, number];
          });
          updateElement(orig.id, { x: newPts[0][0], y: newPts[0][1], points: newPts, rotation: orig.rotation + delta } as Partial<WhiteboardElement>);
        } else {
          const s = orig as StickyNoteElement | TextBoxElement | ShapeElement | ImageElement;
          const elCX = s.x + s.width / 2, elCY = s.y + s.height / 2;
          const dx = elCX - grpCX, dy = elCY - grpCY;
          updateElement(orig.id, {
            x: grpCX + dx * cos - dy * sin - s.width / 2,
            y: grpCY + dx * sin + dy * cos - s.height / 2,
            rotation: orig.rotation + delta,
          } as Partial<WhiteboardElement>);
        }
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const hBtnStyle: React.CSSProperties = {
    position: 'absolute', width: 10, height: 10, background: 'white',
    border: '1.5px solid #7c6aff', borderRadius: 2,
    transform: 'translate(-50%, -50%)', zIndex: 1001,
  };
  const groupHandles = [
    { id: 'nw', left: '0%',   top: '0%',   cursor: 'nwse-resize' },
    { id: 'n',  left: '50%',  top: '0%',   cursor: 'ns-resize'   },
    { id: 'ne', left: '100%', top: '0%',   cursor: 'nesw-resize' },
    { id: 'e',  left: '100%', top: '50%',  cursor: 'ew-resize'   },
    { id: 'se', left: '100%', top: '100%', cursor: 'nwse-resize' },
    { id: 's',  left: '50%',  top: '100%', cursor: 'ns-resize'   },
    { id: 'sw', left: '0%',   top: '100%', cursor: 'nesw-resize' },
    { id: 'w',  left: '0%',   top: '50%',  cursor: 'ew-resize'   },
  ];

  return (
    <div
      className={styles.multiSelectRect}
      style={{
        left:   multiSelectionRect.left,
        top:    multiSelectionRect.top,
        width:  multiSelectionRect.width,
        height: multiSelectionRect.height,
      }}
      onMouseDown={(e) => {
        if ((e.target as Element) !== e.currentTarget) return;
        if (tool !== 'select') return;
        e.stopPropagation();
        e.preventDefault();
        snapshot();
        const origins = selectedIds.flatMap((id) => {
          const grp = groups.find((g) => g.id === id);
          const physIds = grp ? grp.childIds : [id];
          return elements
            .filter((el) => physIds.includes(el.id))
            .map((el) => {
              if (el.type === 'arrow') {
                return { id: el.id, x: el.x, y: el.y, x2: (el as ArrowElement).x2, y2: (el as ArrowElement).y2 };
              }
              if (el.type === 'drawing') {
                return { id: el.id, x: el.x, y: el.y, points: (el as DrawingElement).points };
              }
              return { id: el.id, x: el.x, y: el.y };
            });
        });
        multiDragRef.current = { mx: e.clientX, my: e.clientY, origins };
        const onMove = (ev: MouseEvent) => {
          if (!multiDragRef.current) return;
          const ddx = (ev.clientX - multiDragRef.current.mx) / zoom;
          const ddy = (ev.clientY - multiDragRef.current.my) / zoom;
          const effDdx = ev.shiftKey ? (Math.abs(ddx) >= Math.abs(ddy) ? ddx : 0) : ddx;
          const effDdy = ev.shiftKey ? (Math.abs(ddy) >  Math.abs(ddx) ? ddy : 0) : ddy;
          multiDragRef.current.origins.forEach(({ id, x, y, x2, y2, points }) => {
            if (points) {
              const newPts = points.map(([px, py, pr]) => [
                gridEnabled ? snapVal(px + effDdx, gridSize) : px + effDdx,
                gridEnabled ? snapVal(py + effDdy, gridSize) : py + effDdy,
                pr,
              ] as [number, number, number]);
              updateElement(id, { x: newPts[0][0], y: newPts[0][1], points: newPts } as Partial<WhiteboardElement>);
              return;
            }
            const updates: Record<string, number> = {
              x: gridEnabled ? snapVal(x + effDdx, gridSize) : x + effDdx,
              y: gridEnabled ? snapVal(y + effDdy, gridSize) : y + effDdy,
            };
            if (x2 !== undefined && y2 !== undefined) {
              updates.x2 = gridEnabled ? snapVal(x2 + effDdx, gridSize) : x2 + effDdx;
              updates.y2 = gridEnabled ? snapVal(y2 + effDdy, gridSize) : y2 + effDdy;
            }
            updateElement(id, updates as Partial<WhiteboardElement>);
          });
        };
        const onUp = () => {
          multiDragRef.current = null;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
    >
      {groupHandles.map(({ id, left, top, cursor }) => (
        <div key={id} style={{ ...hBtnStyle, left, top, cursor }} onMouseDown={(e) => startGroupResize(e, id)} />
      ))}
      <div style={{
        position: 'absolute', left: '50%', top: 0,
        width: 1.5, height: 32, background: '#7c6aff',
        transform: 'translate(-50%, -100%)', pointerEvents: 'none',
      }} />
      <div
        style={{
          position: 'absolute', left: '50%', top: -32,
          width: 18, height: 18, background: 'white',
          border: '1.5px solid #7c6aff', borderRadius: '50%',
          transform: 'translate(-50%, -50%)', cursor: 'grab',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, userSelect: 'none', zIndex: 1001,
        }}
        onMouseDown={startGroupRotate}
      >↺</div>
    </div>
  );
};

import { useEffect, RefObject } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';

export function useWheelZoom(containerRef: RefObject<HTMLDivElement | null>) {
  const zoom = useWhiteboardStore((s) => s.zoom);
  const pan = useWhiteboardStore((s) => s.pan);
  const setZoom = useWhiteboardStore((s) => s.setZoom);
  const setPan = useWhiteboardStore((s) => s.setPan);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (useWhiteboardStore.getState().helpOpen) return;
      // Let the event scroll any overlay panel (gallery, dialog, etc.) that has its own scrollbar
      const target = e.target as Element | null;
      if (target && target.closest('[data-scroll-overlay]')) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      const newZoom = Math.min(Math.max(zoom * factor, 0.15), 4);
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
      const newPanY = my - (my - pan.y) * (newZoom / zoom);
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, pan, setZoom, setPan, containerRef]);
}

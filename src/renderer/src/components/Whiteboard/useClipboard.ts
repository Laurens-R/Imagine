import { useCallback } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import type { WhiteboardElement } from '../../types';

let _clipboard: WhiteboardElement[] = [];

export function clipboardHasItems(): boolean {
  return _clipboard.length > 0;
}

export function useClipboard(elements: WhiteboardElement[]) {
  const { snapshot, addElement, setSelectedId, setSelectedIds, removeElement } = useWhiteboardStore();

  const getSelectedElements = useCallback((): WhiteboardElement[] => {
    const { selectedId: sid, selectedIds: sids, groups: grps } = useWhiteboardStore.getState();
    const ids = sids.length > 0 ? sids : sid ? [sid] : [];
    const physicalIds = new Set<string>();
    for (const id of ids) {
      const grp = grps.find((g) => g.id === id);
      if (grp) grp.childIds.forEach((cid) => physicalIds.add(cid));
      else physicalIds.add(id);
    }
    return elements.filter((el) => physicalIds.has(el.id));
  }, [elements]);

  const handleCopy = useCallback((cut = false) => {
    const sel = getSelectedElements();
    if (sel.length === 0) return;
    _clipboard = sel.map((el) => ({ ...el }));
    if (cut) {
      snapshot();
      sel.forEach((el) => removeElement(el.id));
    }
  }, [getSelectedElements, snapshot, removeElement]);

  const handlePaste = useCallback((atCanvasX?: number, atCanvasY?: number) => {
    if (_clipboard.length === 0) return;
    snapshot();
    const xs = _clipboard.map((el) => el.x);
    const ys = _clipboard.map((el) => el.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const OFFSET = 20;
    const newIds: string[] = [];
    _clipboard.forEach((el) => {
      const dx = atCanvasX != null ? (atCanvasX - minX) : OFFSET;
      const dy = atCanvasY != null ? (atCanvasY - minY) : OFFSET;
      const pasted = { ...el, x: el.x + dx, y: el.y + dy };
      const id = addElement(pasted as Omit<WhiteboardElement, 'id' | 'zIndex'>);
      newIds.push(id);
    });
    if (newIds.length === 1) setSelectedId(newIds[0]);
    else setSelectedIds(newIds);
    if (atCanvasX == null) {
      _clipboard = _clipboard.map((el) => ({ ...el, x: el.x + OFFSET, y: el.y + OFFSET }));
    }
  }, [snapshot, addElement, setSelectedId, setSelectedIds]);

  return { handleCopy, handlePaste, getSelectedElements };
}

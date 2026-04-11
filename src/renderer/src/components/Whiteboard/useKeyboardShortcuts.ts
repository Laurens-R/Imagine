import { useEffect, MutableRefObject } from 'react';
import { useWhiteboardStore, selectAllPages } from '../../store/whiteboardStore';
import type { ActiveDrawing, ShapePreview } from '../../types';
import type { LassoRect } from './whiteboardHelpers';

interface UseKeyboardShortcutsParams {
  handleCopy: (cut?: boolean) => void;
  handlePaste: (x?: number, y?: number) => void;
  setIsSpaceDown: (v: boolean) => void;
  setShapePreview: (v: ShapePreview | null) => void;
  setShapeStart: (v: { x: number; y: number } | null) => void;
  setArrowStart: (v: { x: number; y: number } | null) => void;
  setArrowPreview: (v: { x: number; y: number } | null) => void;
  setCursorCanvas: (v: { x: number; y: number } | null) => void;
  setActiveDrawing: (v: ActiveDrawing | null) => void;
  setLasso: (v: LassoRect | null) => void;
  isDrawingRef: MutableRefObject<boolean>;
  lassoStartRef: MutableRefObject<{ x: number; y: number } | null>;
  lassoRef: MutableRefObject<LassoRect | null>;
}

export function useKeyboardShortcuts({
  handleCopy, handlePaste,
  setIsSpaceDown,
  setShapePreview, setShapeStart, setArrowStart, setArrowPreview,
  setCursorCanvas, setActiveDrawing, setLasso,
  isDrawingRef, lassoStartRef, lassoRef,
}: UseKeyboardShortcutsParams) {
  const selectedId = useWhiteboardStore((s) => s.selectedId);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const {
    removeElement, removeConnection, setSelectedId, setSelectedIds, setSelectedConnectionId,
    setPendingConnection, undo, redo, snapshot, loadBoard, setCurrentFile, clearAll,
    groupSelected, ungroupSelected, switchPage, addPage, setTool,
  } = useWhiteboardStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setIsSpaceDown(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handleCopy(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handleCopy(true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handlePaste();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        const storeState = useWhiteboardStore.getState();
        const allPages = selectAllPages(storeState);
        const data = JSON.stringify({ version: 2, pages: allPages, creativeMode: storeState.creativeMode }, null, 2);
        window.whiteboardApi.saveBoard(data, storeState.currentFile ?? undefined).then((r) => {
          if (!r.canceled && r.filePath) setCurrentFile(r.filePath);
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        window.whiteboardApi.openBoard().then((r) => {
          if (!r.canceled && r.data && r.filePath) {
            try {
              const parsed = JSON.parse(r.data);
              if (parsed.pages) {
                loadBoard([], [], r.filePath, [], parsed.pages, parsed.creativeMode ?? false);
              } else {
                loadBoard(parsed.elements ?? [], parsed.connections ?? [], r.filePath, parsed.groups ?? [], undefined, false);
              }
            } catch { /* ignore */ }
          }
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const { elements: els, connections: conns } = useWhiteboardStore.getState();
        if (els.length > 0 || conns.length > 0) {
          if (!window.confirm('Discard current whiteboard and start a new one?')) return;
        }
        snapshot();
        clearAll();
        setCurrentFile(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        const state = useWhiteboardStore.getState();
        const sids = state.selectedIds;
        const hasGroup = sids.some((id) => state.groups.some((g) => g.id === id));
        if (hasGroup) ungroupSelected();
        else groupSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handleCopy(false);
          handlePaste();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          const { elements: els, groups: grps } = useWhiteboardStore.getState();
          const groupedChildIds = new Set(grps.flatMap((g) => g.childIds));
          const topLevelIds = [
            ...grps.map((g) => g.id),
            ...els.filter((el) => !groupedChildIds.has(el.id)).map((el) => el.id),
          ];
          setSelectedId(null);
          setSelectedIds(topLevelIds);
        }
      }
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('arrow');
      }
      if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('line');
      }
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('select');
      }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('sharpie');
      }
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('sticky-note');
      }
      if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('image');
      }
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('text-box');
      }
      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('shape');
      }
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('connection');
      }
      if ((e.key === 'k' || e.key === 'K') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('icon');
      }
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) setTool('emoji');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        const { selectedConnectionId: connId } = useWhiteboardStore.getState();
        if (connId) {
          snapshot();
          removeConnection(connId);
          setSelectedConnectionId(null);
          return;
        }
        const toDelete = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        if (toDelete.length > 0) {
          snapshot();
          const { groups: currentGroups } = useWhiteboardStore.getState();
          const physicalIds = new Set<string>();
          for (const id of toDelete) {
            const grp = currentGroups.find((g) => g.id === id);
            if (grp) grp.childIds.forEach((cid) => physicalIds.add(cid));
            else physicalIds.add(id);
          }
          physicalIds.forEach((id) => removeElement(id));
        }
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds([]);
        setSelectedConnectionId(null);
        setPendingConnection(null);
        setShapePreview(null);
        setShapeStart(null);
        setArrowStart(null);
        setArrowPreview(null);
        setCursorCanvas(null);
        isDrawingRef.current = false;
        setActiveDrawing(null);
        lassoStartRef.current = null;
        lassoRef.current = null;
        setLasso(null);
      }
      if (e.key === 'PageDown') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          const { currentPageIndex: cpi, pages: pgs } = useWhiteboardStore.getState();
          if (cpi < pgs.length - 1) switchPage(cpi + 1);
        }
      }
      if (e.key === 'PageUp') {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          const { currentPageIndex: cpi } = useWhiteboardStore.getState();
          if (cpi > 0) switchPage(cpi - 1);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    selectedId, selectedIds,
    removeElement, removeConnection, setSelectedId, setSelectedIds, setSelectedConnectionId,
    setPendingConnection, undo, redo, snapshot, loadBoard, setCurrentFile, clearAll,
    handleCopy, handlePaste, groupSelected, ungroupSelected, switchPage, addPage,
    setIsSpaceDown, setTool,
    setShapePreview, setShapeStart, setArrowStart, setArrowPreview,
    setCursorCanvas, setActiveDrawing, setLasso,
    isDrawingRef, lassoStartRef, lassoRef,
  ]);
}

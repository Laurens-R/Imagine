import { useEffect, useRef } from 'react';
import { useWhiteboardStore, selectAllPages } from '../../store/whiteboardStore';

export function usePersistence() {
  const elements = useWhiteboardStore((s) => s.elements);
  const connections = useWhiteboardStore((s) => s.connections);
  const groups = useWhiteboardStore((s) => s.groups);
  const currentFile = useWhiteboardStore((s) => s.currentFile);

  const isDirtyRef = useRef(false);

  // Mark dirty on any data change when a file is open
  useEffect(() => {
    if (currentFile) isDirtyRef.current = true;
  }, [elements, connections, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronous save on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const storeState = useWhiteboardStore.getState();
      if (!storeState.currentFile || !isDirtyRef.current) return;
      const allPages = selectAllPages(storeState);
      const data = JSON.stringify({ version: 2, pages: allPages, creativeMode: storeState.creativeMode }, null, 2);
      window.whiteboardApi.saveBoardSync(data, storeState.currentFile);
      isDirtyRef.current = false;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Autosave: 5 s debounce after any change, only when file is known
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  useEffect(() => {
    if (!currentFile) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        const storeState = useWhiteboardStore.getState();
        if (!storeState.currentFile) return;
        const allPages = selectAllPages(storeState);
        const data = JSON.stringify({ version: 2, pages: allPages, creativeMode: storeState.creativeMode }, null, 2);
        await window.whiteboardApi.saveBoard(data, storeState.currentFile);
        isDirtyRef.current = false;
      } finally {
        isSavingRef.current = false;
      }
    }, 5_000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, connections, groups, currentFile]);
}

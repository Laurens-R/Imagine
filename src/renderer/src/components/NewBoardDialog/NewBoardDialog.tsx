import React, { useState, useEffect, useCallback } from 'react';
import styles from './NewBoardDialog.module.scss';

interface NewBoardDialogProps {
  onConfirm: (templateName: string | null) => void;
  onClose: () => void;
}

export const NewBoardDialog: React.FC<NewBoardDialogProps> = ({ onConfirm, onClose }) => {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    window.whiteboardApi.listTemplates().then((list) => {
      setTemplates(list);
      setLoading(false);
    });
  }, []);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, name: string) => {
      e.stopPropagation();
      setDeleting(name);
      try {
        await window.whiteboardApi.deleteTemplate(name);
        setTemplates((prev) => prev.filter((t) => t !== name));
        if (selected === name) setSelected(null);
      } finally {
        setDeleting(null);
      }
    },
    [selected]
  );

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <div className={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>New Whiteboard</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Blank option */}
        <button
          className={`${styles.optionCard} ${selected === null ? styles.optionCardActive : ''}`}
          onClick={() => setSelected(null)}
        >
          <span className={styles.optionIcon}>
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4" y="4" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className={styles.optionLabel}>Blank whiteboard</span>
        </button>

        {/* Template list */}
        {!loading && templates.length > 0 && (
          <>
            <p className={styles.sectionLabel}>From template</p>
            <div className={styles.templateList}>
              {templates.map((name) => (
                <button
                  key={name}
                  className={`${styles.templateItem} ${selected === name ? styles.templateItemActive : ''}`}
                  onClick={() => setSelected(name)}
                >
                  <span className={styles.templateIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 9v12" />
                    </svg>
                  </span>
                  <span className={styles.templateName}>{name}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDelete(e, name)}
                    disabled={deleting === name}
                    title="Delete template"
                    aria-label={`Delete template ${name}`}
                  >
                    {deleting === name ? '…' : '×'}
                  </button>
                </button>
              ))}
            </div>
          </>
        )}

        {loading && <p className={styles.loadingText}>Loading templates…</p>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.createBtn} onClick={() => onConfirm(selected)}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

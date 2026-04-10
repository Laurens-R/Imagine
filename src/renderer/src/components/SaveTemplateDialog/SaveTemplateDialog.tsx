import React, { useState, useEffect, useRef } from 'react';
import styles from './SaveTemplateDialog.module.scss';

interface SaveTemplateDialogProps {
  onSave: (name: string) => void;
  onClose: () => void;
  isSaving: boolean;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  onSave,
  onClose,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <div className={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Save as Template</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isSaving} aria-label="Close">
            ×
          </button>
        </div>

        <p className={styles.hint}>
          Give this whiteboard a name. It will be available as a starting point when creating new whiteboards.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Template name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            maxLength={64}
          />

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

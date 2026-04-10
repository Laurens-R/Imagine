import React, { useState } from 'react';
import { EXPORT_SCALE_OPTIONS } from '../../utils/export';
import type { ExportFormat, ExportScaleLabel } from '../../utils/export';
import styles from './ExportDialog.module.scss';

interface ExportDialogProps {
  contentWidth: number;
  contentHeight: number;
  onExport: (format: ExportFormat, scale: number) => void;
  onClose: () => void;
  isExporting: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  contentWidth,
  contentHeight,
  onExport,
  onClose,
  isExporting,
}) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scaleId, setScaleId] = useState<ExportScaleLabel>('medium');

  const scaleOpt = EXPORT_SCALE_OPTIONS.find((s) => s.id === scaleId)!;
  const outW = Math.round(contentWidth * scaleOpt.value);
  const outH = Math.round(contentHeight * scaleOpt.value);

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <div className={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Export Image</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isExporting} aria-label="Close">
            ×
          </button>
        </div>

        {/* Format */}
        <div className={styles.section}>
          <span className={styles.label}>Format</span>
          <div className={styles.buttonGroup}>
            {(['png', 'jpeg'] as ExportFormat[]).map((f) => (
              <button
                key={f}
                className={`${styles.optBtn} ${format === f ? styles.optBtnActive : ''}`}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution scale */}
        <div className={styles.section}>
          <span className={styles.label}>Resolution</span>
          <div className={styles.buttonGroup}>
            {EXPORT_SCALE_OPTIONS.map((s) => (
              <button
                key={s.id}
                className={`${styles.optBtn} ${scaleId === s.id ? styles.optBtnActive : ''}`}
                onClick={() => setScaleId(s.id)}
              >
                <span className={styles.scaleMain}>{s.label}</span>
                <span className={styles.scaleDesc}>{s.desc}</span>
              </button>
            ))}
          </div>
          <span className={styles.resolution}>
            {outW} × {outH} px
          </span>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button
            className={styles.exportBtn}
            onClick={() => onExport(format, scaleOpt.value)}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

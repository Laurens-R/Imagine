import React, { useState, useEffect } from 'react';
import type { AppSettings } from '../../types/aiCommands';
import styles from './SettingsDialog.module.scss';

const AI_MODELS = [
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest, low cost)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (balanced)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (most capable)' },
];

interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-haiku-4-5');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.whiteboardApi.getSettings().then((s) => {
      setApiKey(s.anthropicApiKey ?? '');
      setModel(s.aiModel ?? 'claude-haiku-4-5');
      setLoading(false);
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    const settings: AppSettings = { anthropicApiKey: apiKey.trim(), aiModel: model };
    await window.whiteboardApi.setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(160,155,191,0.6)', fontSize: 13, fontFamily: 'system-ui', padding: '12px 0' }}>
            Loading…
          </div>
        ) : (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>AI Assistant</h3>

              <div className={styles.field}>
                <label className={styles.label}>Anthropic API Key</label>
                <p className={styles.hint}>
                  Get your key from{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); window.electron.shell.openExternal('https://console.anthropic.com/'); }}>
                    console.anthropic.com
                  </a>
                  . The key is stored locally on your machine.
                </p>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-…"
                    spellCheck={false}
                  />
                  <button className={styles.toggleVisBtn} onClick={() => setShowKey((v) => !v)}>
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Model</label>
                <select className={styles.select} value={model} onChange={(e) => setModel(e.target.value)}>
                  {AI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.footer}>
              {saved && <span className={styles.savedBadge}>✓ Saved</span>}
              <button className={styles.cancelBtn} onClick={onClose}>Close</button>
              <button className={styles.saveBtn} onClick={handleSave}>Save</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

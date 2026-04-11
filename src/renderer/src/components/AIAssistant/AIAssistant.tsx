import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../../store/whiteboardStore';
import { executeAIResponse } from '../../utils/aiExecutor';
import type { AIResponse } from '../../types/aiCommands';
import type { ImageElement, IconElement } from '../../types';
import styles from './AIAssistant.module.scss';

const EXAMPLE_PROMPTS = [
  'Generate a whiteboard explaining this concept with sticky notes',
  'Organise elements into logical groups by topic',
  'Create a flow diagram connecting the elements',
  'Add labels and connections between related items',
  'Spread elements evenly across the canvas',
];

// Build a compact board snapshot, stripping large data (drawing point arrays, image dataUrls)
const MAX_TEXT_LEN = 300;

function buildCompactBoard() {
  const state = useWhiteboardStore.getState();
  const elements = state.elements.map((el) => {
    if (el.type === 'drawing') {
      const xs = el.points.map((p) => p[0]);
      const ys = el.points.map((p) => p[1]);
      return {
        id: el.id, type: 'drawing', zIndex: el.zIndex, rotation: el.rotation,
        x: Math.min(...xs), y: Math.min(...ys),
        width: (Math.max(...xs) - Math.min(...xs)) || 1,
        height: (Math.max(...ys) - Math.min(...ys)) || 1,
      };
    }
    if (el.type === 'image') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { dataUrl: _d, ...rest } = el as ImageElement;
      return rest;
    }
    // Icon elements: keep all fields (iconId, color, strokeWidth) but no SVG paths are stored on the element anyway
    if (el.type === 'icon') {
      const { id, type, x, y, width, height, rotation, zIndex, iconId, color, strokeWidth } = el as IconElement;
      return { id, type, x, y, width, height, rotation, zIndex, iconId, color, strokeWidth };
    }
    // Truncate long text fields to keep the snapshot compact
    if ('text' in el && typeof el.text === 'string' && el.text.length > MAX_TEXT_LEN) {
      return { ...el, text: el.text.slice(0, MAX_TEXT_LEN) + '…' };
    }
    return el;
  });
  const containerEl = document.querySelector('[data-whiteboard-container]');
  const rect = containerEl?.getBoundingClientRect();
  const halfW = rect ? rect.width  / 2 : window.innerWidth  / 2;
  const halfH = rect ? rect.height / 2 : window.innerHeight / 2;
  return {
    canvasSize: { w: state.canvasWidth, h: state.canvasHeight },
    // viewportCentre: the canvas coordinate currently at the centre of the visible viewport.
    viewportCentre: {
      x: Math.round((halfW - state.pan.x) / state.zoom),
      y: Math.round((halfH - state.pan.y) / state.zoom),
    },
    elements,
    connections: state.connections,
    groups: state.groups,
  };
}

interface AIAssistantProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

type Phase = 'input' | 'loading' | 'result' | 'error';

export const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, onOpenSettings }) => {
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Check if API key is configured
    window.whiteboardApi.getSettings().then((s) => {
      setHasApiKey(!!s.anthropicApiKey);
    });
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleChip = (text: string) => {
    setPrompt(text);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setPhase('loading');
    setAIResponse(null);
    setErrorMsg('');
    try {
      const board = buildCompactBoard();
      const result = await window.whiteboardApi.callAI(prompt.trim(), board);
      if (result.error) {
        setErrorMsg(result.error);
        setPhase('error');
      } else {
        setAIResponse(result.response! as unknown as AIResponse);
        setPhase('result');
      }
    } catch (err) {
      setErrorMsg(String(err));
      setPhase('error');
    }
  };

  const handleApply = () => {
    if (!aiResponse) return;
    executeAIResponse(aiResponse);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') onClose();
  };

  const canSend = prompt.trim().length > 0 && phase !== 'loading';

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>✦</span>
            AI Assistant
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <p className={styles.subtitle}>Describe what you want to do with your whiteboard</p>

        {/* Example prompt chips */}
        <div className={styles.chips}>
          {EXAMPLE_PROMPTS.map((p) => (
            <button key={p} className={styles.chip} onClick={() => handleChip(p)}>{p}</button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="E.g. Organise the sticky notes into topic clusters…"
          disabled={phase === 'loading'}
          rows={4}
        />

        {/* API key missing warning */}
        {hasApiKey === false && (
          <div className={styles.noApiKey}>
            No Anthropic API key configured.{' '}
            <button onClick={() => { onClose(); onOpenSettings(); }}>Open Settings</button>
            {' '}to add your key.
          </div>
        )}

        {/* Status area */}
        {phase === 'loading' && (
          <div className={`${styles.statusBox} ${styles.statusLoading}`}>
            <div className={styles.spinner} />
            Sending to Claude…
          </div>
        )}

        {phase === 'result' && aiResponse && (
          <div className={`${styles.statusBox} ${styles.statusThinking}`}>
            {aiResponse.thinking && (
              <>
                <div className={styles.thinkingLabel}>Claude's reasoning</div>
                {aiResponse.thinking
                  // Remove sentences that are mainly coordinate/number calculations
                  .split(/(?<=[.!?])\s+/)
                  .filter((s) => !/x=|y=|width=|height=|-?\d{3,}/.test(s))
                  .join(' ')
                  .trim() || aiResponse.thinking.split(/(?<=[.!?])\s+/)[0]}
              </>
            )}
            <div className={styles.commandCount}>
              {aiResponse.commands.length} command{aiResponse.commands.length !== 1 ? 's' : ''} ready
              {aiResponse.targetPage === 'new' && ` · will create new page "${aiResponse.newPageLabel || 'AI Generated'}"`}
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className={`${styles.statusBox} ${styles.statusError}`}>
            {errorMsg}
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={phase === 'loading'}>
            {phase === 'result' ? 'Discard' : 'Cancel'}
          </button>
          {phase === 'result' ? (
            <button className={styles.applyBtn} onClick={handleApply}>Apply Changes</button>
          ) : (
            <button className={styles.sendBtn} onClick={handleSend} disabled={!canSend || hasApiKey === false}>
              Generate
              <span style={{ fontSize: 11, opacity: 0.75 }}>Ctrl+↵</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

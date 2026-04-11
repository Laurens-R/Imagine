import React, { useEffect } from 'react';
import styles from './HelpDialog.module.scss';

interface ShortcutEntry {
  keys: string[][];   // each inner array is a chord, outer array = alternatives joined by "or"
  name: string;
  desc: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SECTIONS: ShortcutSection[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: [['S']], name: 'Select tool', desc: 'Switch to the selection tool to move, resize, and rotate elements.\nClick an element to select it; drag the canvas to lasso-select.' },
      { keys: [['F']], name: 'Freeform / Sharpie', desc: 'Switch to the freehand drawing tool.\nDraw smooth freeform paths with pen pressure simulation.' },
      { keys: [['N']], name: 'Sticky note', desc: 'Switch to the sticky note tool.\nClick anywhere on the canvas to place a new sticky note.' },
      { keys: [['I']], name: 'Image', desc: 'Switch to the image tool.\nClick to open a file picker and place an image on the canvas.' },
      { keys: [['T']], name: 'Text box', desc: 'Switch to the text box tool.\nClick anywhere on the canvas to place an editable text box.' },
      { keys: [['D']], name: 'Draw shape', desc: 'Switch to the shape drawing tool.\nDrag to draw the currently selected shape (rectangle, circle, etc.).' },
      { keys: [['A']], name: 'Arrow tool', desc: 'Switch to the arrow drawing tool.\nDraw arrows between any two points on the canvas.' },
      { keys: [['L']], name: 'Line tool', desc: 'Switch to the straight-line drawing tool.\nHold Shift while drawing to lock to 0°/45°/90° angles.' },
      { keys: [['C']], name: 'Connection tool', desc: 'Switch to the connection tool.\nClick on elements to draw a smart connector between them.' },
      { keys: [['Space', 'drag']], name: 'Pan canvas', desc: 'Hold Space and drag to scroll the canvas in any direction.\nWorks regardless of which drawing tool is active.' },
      { keys: [['Scroll']], name: 'Zoom', desc: 'Scroll the mouse wheel to zoom in or out.\nThe view centres on the cursor position.' },
      { keys: [['Shift']], name: 'Constrain line/arrow angle', desc: 'Hold Shift while drawing a line or arrow to snap the angle.\nSnaps to multiples of 45° (horizontal, diagonal, vertical).' },
      { keys: [['Shift', 'drag']], name: 'Constrain element movement', desc: 'Hold Shift while dragging an element to lock movement to one axis.\nMoves horizontally or vertically based on the initial drag direction.' },
    ],
  },
  {
    title: 'Selection & Editing',
    shortcuts: [
      { keys: [['Ctrl', 'A']], name: 'Select all', desc: 'Select every element on the current page.\nExisting selection is replaced.' },
      { keys: [['Ctrl', 'C']], name: 'Copy', desc: 'Copy the current selection to the internal clipboard.\nDoes not affect the system clipboard.' },
      { keys: [['Ctrl', 'X']], name: 'Cut', desc: 'Copy the selection and remove it from the canvas.\nPaste it back with Ctrl+V.' },
      { keys: [['Ctrl', 'V']], name: 'Paste', desc: 'Paste the clipboard contents onto the canvas.\nPasted elements are offset slightly from the originals.' },
      { keys: [['Ctrl', 'D']], name: 'Duplicate', desc: 'Duplicate the selected elements in one step.\nEquivalent to Copy followed immediately by Paste.' },
      { keys: [['Delete'], ['Backspace']], name: 'Delete selection', desc: 'Remove the currently selected element(s) or connection.\nThis action is undoable.' },
      { keys: [['Escape']], name: 'Deselect / cancel', desc: 'Clear the current selection and cancel any in-progress drawing.\nAlso dismisses lasso selection.' },
    ],
  },
  {
    title: 'Undo & History',
    shortcuts: [
      { keys: [['Ctrl', 'Z']], name: 'Undo', desc: 'Step backwards through the edit history.\nAll destructive actions are undoable.' },
      { keys: [['Ctrl', 'Y'], ['Ctrl', 'Shift', 'Z']], name: 'Redo', desc: 'Re-apply the last undone action.\nRedo history is cleared when a new edit is made.' },
    ],
  },
  {
    title: 'Grouping',
    shortcuts: [
      { keys: [['Ctrl', 'G']], name: 'Group / Ungroup', desc: 'Group the selected elements so they move and resize together.\nIf a group is selected, the same shortcut ungroups it.' },
    ],
  },
  {
    title: 'File',
    shortcuts: [
      { keys: [['Ctrl', 'S']], name: 'Save', desc: 'Save the current whiteboard to its file.\nShows a Save As dialog if the file has not been saved before.' },
      { keys: [['Ctrl', 'O']], name: 'Open', desc: 'Open an existing .imagine file from disk.\nThe current whiteboard is replaced.' },
      { keys: [['Ctrl', 'N']], name: 'New whiteboard', desc: 'Clear the canvas and start a fresh whiteboard.\nYou will be asked to confirm if there is unsaved work.' },
    ],
  },
  {
    title: 'Pages',
    shortcuts: [
      { keys: [['PageDown']], name: 'Next page', desc: 'Switch to the next page in the page strip.\nDoes nothing if already on the last page.' },
      { keys: [['PageUp']], name: 'Previous page', desc: 'Switch to the previous page in the page strip.\nDoes nothing if already on the first page.' },
    ],
  },
  {
    title: 'Window',
    shortcuts: [
      { keys: [['F11']], name: 'Toggle full screen', desc: 'Switch between full-screen and windowed mode.\nPress F11 again to return to the previous window size.' },
      { keys: [['Ctrl', 'Shift', 'Space']], name: 'Toggle system tray', desc: 'Hide the window to the system tray when focused, or restore it.\nClick the tray icon to bring the window back at any time.' },
    ],
  },
];

interface HelpDialogProps {
  onClose: () => void;
}

const Keys: React.FC<{ chord: string[] }> = ({ chord }) => (
  <>
    {chord.map((k, i) => (
      <React.Fragment key={k}>
        {i > 0 && <span className={styles.plus}>+</span>}
        <span className={styles.kbd}>{k}</span>
      </React.Fragment>
    ))}
  </>
);

export const HelpDialog: React.FC<HelpDialogProps> = ({ onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>Keyboard Shortcuts</h2>
          <button className={styles.closeBtn} onClick={onClose} title="Close">×</button>
        </div>
        <div className={styles.body}>
          {SECTIONS.map((section) => (
            <div key={section.title} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              {section.shortcuts.map((sc) => (
                <div key={sc.name} className={styles.row}>
                  <div className={styles.keys}>
                    {sc.keys.map((chord, ci) => (
                      <React.Fragment key={ci}>
                        {ci > 0 && <span className={styles.plus}>or</span>}
                        <Keys chord={chord} />
                      </React.Fragment>
                    ))}
                  </div>
                  <div className={styles.info}>
                    <span className={styles.name}>{sc.name}</span>
                    {sc.desc.split('\n').map((line, li) => (
                      <span key={li} className={styles.desc}>{line}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

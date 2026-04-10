import React, { useState } from 'react';
import { Whiteboard } from './components/Whiteboard/Whiteboard';
import { TitleBar } from './components/TitleBar/TitleBar';
import { NewBoardDialog } from './components/NewBoardDialog/NewBoardDialog';
import { SaveTemplateDialog } from './components/SaveTemplateDialog/SaveTemplateDialog';
import { useWhiteboardStore } from './store/whiteboardStore';
import styles from './App.module.scss';

const App: React.FC = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const { elements, connections, clearAll, snapshot, setCurrentFile, loadBoard } =
    useWhiteboardStore();

  const handleNewConfirm = async (templateName: string | null) => {
    setShowNewDialog(false);
    if (templateName) {
      try {
        const result = await window.whiteboardApi.loadTemplate(templateName);
        const parsed = JSON.parse(result.data);
        snapshot();
        loadBoard(parsed.elements ?? [], parsed.connections ?? [], null);
      } catch {
        alert('Failed to load template.');
      }
    } else {
      snapshot();
      clearAll();
      setCurrentFile(null);
    }
  };

  const handleSaveTemplate = async (name: string) => {
    setSavingTemplate(true);
    try {
      const data = JSON.stringify({ elements, connections }, null, 2);
      await window.whiteboardApi.saveTemplate(name, data);
    } catch {
      alert('Failed to save template.');
    } finally {
      setSavingTemplate(false);
      setShowSaveTemplateDialog(false);
    }
  };

  const handleNew = () => {
    setShowNewDialog(true);
  };

  return (
    <div className={styles.app}>
      <TitleBar
        onExport={() => setShowExportDialog(true)}
        onSaveTemplate={() => setShowSaveTemplateDialog(true)}
        onNew={handleNew}
      />
      <Whiteboard
        showExportDialog={showExportDialog}
        onCloseExportDialog={() => setShowExportDialog(false)}
      />
      {showNewDialog && (
        <NewBoardDialog
          onConfirm={handleNewConfirm}
          onClose={() => setShowNewDialog(false)}
        />
      )}
      {showSaveTemplateDialog && (
        <SaveTemplateDialog
          onSave={handleSaveTemplate}
          onClose={() => setShowSaveTemplateDialog(false)}
          isSaving={savingTemplate}
        />
      )}
    </div>
  );
};

export default App;

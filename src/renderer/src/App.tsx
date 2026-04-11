import React, { useState } from 'react';
import { Whiteboard } from './components/Whiteboard/Whiteboard';
import { TitleBar } from './components/TitleBar/TitleBar';
import { PageStrip } from './components/PageStrip/PageStrip';
import { NewBoardDialog } from './components/NewBoardDialog/NewBoardDialog';
import { SaveTemplateDialog } from './components/SaveTemplateDialog/SaveTemplateDialog';
import { SettingsDialog } from './components/SettingsDialog/SettingsDialog';
import { AIAssistant } from './components/AIAssistant/AIAssistant';
import { useWhiteboardStore } from './store/whiteboardStore';
import { selectAllPages } from './store/whiteboardStore';
import styles from './App.module.scss';

const App: React.FC = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);

  const { elements, connections, clearAll, snapshot, setCurrentFile, loadBoard } =
    useWhiteboardStore();

  const handleNewConfirm = async (templateName: string | null) => {
    setShowNewDialog(false);
    if (templateName) {
      try {
        const result = await window.whiteboardApi.loadTemplate(templateName);
        const parsed = JSON.parse(result.data);
        snapshot();
        if (parsed.pages) {
          loadBoard([], [], null, [], parsed.pages);
        } else {
          loadBoard(parsed.elements ?? [], parsed.connections ?? [], null, parsed.groups ?? []);
        }
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
      const allPages = selectAllPages(useWhiteboardStore.getState());
      const data = JSON.stringify({ version: 2, pages: allPages }, null, 2);
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
        onSettings={() => setShowSettingsDialog(true)}
      />
      <Whiteboard
        showExportDialog={showExportDialog}
        onCloseExportDialog={() => setShowExportDialog(false)}
        onAIAssistant={() => setShowAIDialog(true)}
        onSettings={() => setShowSettingsDialog(true)}
      />
      <PageStrip />
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
      {showSettingsDialog && (
        <SettingsDialog onClose={() => setShowSettingsDialog(false)} />
      )}
      {showAIDialog && (
        <AIAssistant
          onClose={() => setShowAIDialog(false)}
          onOpenSettings={() => { setShowAIDialog(false); setShowSettingsDialog(true); }}
        />
      )}
    </div>
  );
};

export default App;

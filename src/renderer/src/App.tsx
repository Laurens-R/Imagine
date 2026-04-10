import React, { useState } from 'react';
import { Whiteboard } from './components/Whiteboard/Whiteboard';
import { TitleBar } from './components/TitleBar/TitleBar';
import styles from './App.module.scss';

const App: React.FC = () => {
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <div className={styles.app}>
      <TitleBar onExport={() => setShowExportDialog(true)} />
      <Whiteboard
        showExportDialog={showExportDialog}
        onCloseExportDialog={() => setShowExportDialog(false)}
      />
    </div>
  );
};

export default App;

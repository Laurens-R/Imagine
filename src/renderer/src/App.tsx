import React from 'react';
import { Whiteboard } from './components/Whiteboard/Whiteboard';
import { TitleBar } from './components/TitleBar/TitleBar';
import styles from './App.module.scss';

const App: React.FC = () => {
  return (
    <div className={styles.app}>
      <TitleBar />
      <Whiteboard />
    </div>
  );
};

export default App;

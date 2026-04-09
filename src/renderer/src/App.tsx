import React from 'react';
import { Whiteboard } from './components/Whiteboard/Whiteboard';
import styles from './App.module.scss';

const App: React.FC = () => {
  return (
    <div className={styles.app}>
      <Whiteboard />
    </div>
  );
};

export default App;

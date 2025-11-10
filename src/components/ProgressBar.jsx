import React from 'react';
import styles from './styles/ProgressBar.module.css';

const ProgressBar = ({ status, percent }) => {
  return (
    <div className={styles.container}>
      <div className={styles.statusText}>{status}</div>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <div className={styles.percentText}>{percent}%</div>
    </div>
  );
};

export default ProgressBar;
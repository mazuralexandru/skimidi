import React from 'react';
import styles from './styles/Header.module.css';

const Header = () => {
  return (
    <header className={styles.header}>
      <h1>Skimidi</h1>
      <p>Transforming MIDI into Custom Soundscapes with Any Palette</p>
    </header>
  );
};

export default Header;
import React, { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiMusic, FiX, FiUpload, FiPlay } from 'react-icons/fi';
import styles from './styles/PaletteManager.module.css';

const PaletteManager = ({ palette, onAddSounds, onRemoveSound, layering, onLayeringChange, primarySoundId, onPrimarySoundChange }) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: onAddSounds,
    accept: { 'audio/wav': ['.wav'] },
  });

  const audioRef = useRef(null);

  const playSound = (file) => {
    if (audioRef.current) {
      audioRef.current.src = URL.createObjectURL(file);
      audioRef.current.play();
    }
  };

  return (
    <div className={styles.container}>
      <audio ref={audioRef} style={{ display: 'none' }} />

      <div {...getRootProps()} className={styles.uploadButton}>
        <input {...getInputProps()} />
        <FiUpload />
        <span>Upload Custom Sounds</span>
      </div>

      <div className={styles.paletteList}>
        {palette.map((soundFile) => (
          <div key={soundFile.id} className={`${styles.paletteItem} ${soundFile.id === primarySoundId ? styles.primary : ''}`}>
            <div className={styles.soundInfo}>
              <FiMusic className={styles.soundIcon} />
              <span className={styles.fileName}>{soundFile.file.name}</span>
            </div>
            <div className={styles.soundControls}>
              <input 
                type="radio" 
                name="primary-sound" 
                checked={soundFile.id === primarySoundId}
                onChange={() => onPrimarySoundChange(soundFile.id)}
                title="Set as primary sound"
                className={styles.radio}
              />
              <button onClick={() => playSound(soundFile.file)} className={styles.controlButton} title="Preview sound">
                <FiPlay />
              </button>
              <button onClick={() => onRemoveSound(soundFile.id)} className={`${styles.controlButton} ${styles.removeButton}`} title="Remove sound">
                <FiX />
              </button>
            </div>
          </div>
        ))}
         {palette.length === 0 && <p className={styles.emptyText}>Your sound palette is empty.</p>}
      </div>

      <div className={styles.layeringControl}>
        <label htmlFor="layering">Max Notes Per Chord</label>
        <div className={styles.sliderContainer}>
          <span>1</span>
          <input
            type="range"
            id="layering"
            min="1"
            max="5"
            value={layering}
            onChange={(e) => onLayeringChange(parseInt(e.target.value, 10))}
            className={styles.slider}
          />
          <span>5</span>
          <span className={styles.sliderValue}>{layering}</span>
        </div>
      </div>
    </div>
  );
};

export default PaletteManager;
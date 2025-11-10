import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiFile } from 'react-icons/fi';
import styles from './styles/FileUpload.module.css';

const FileUpload = ({ onFileAccepted, accept, title, file }) => {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0]);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false
  });

  return (
    <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}>
      <input {...getInputProps()} />
      <FiUploadCloud className={styles.icon} />
      {file ? (
        <div className={styles.fileInfo}>
          <FiFile />
          <span>{file.name}</span>
        </div>
      ) : (
        <p>{isDragActive ? 'Drop the file here ...' : title}</p>
      )}
    </div>
  );
};

export default FileUpload;
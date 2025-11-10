import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FiPlayCircle, FiZap } from 'react-icons/fi';

import Header from './components/Header';
import FileUpload from './components/FileUpload';
import PaletteManager from './components/PaletteManager';
import ProgressBar from './components/ProgressBar';

import './App.css';

console.log("VITE_API_BASE_URL from environment:", import.meta.env.VITE_API_BASE_URL);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

function App() {
  const [midiFile, setMidiFile] = useState(null);
  const [palette, setPalette] = useState([]);
  
  const [layering, setLayering] = useState(2);
  const [primarySoundId, setPrimarySoundId] = useState(null);
  const [ticksPerSecond, setTicksPerSecond] = useState(20);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ status: '', percent: 0 });

  const socketRef = useRef(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleMidiUpload = (file) => {
    setMidiFile(file);
    setResults(null);
    setError('');
  };

  const handleAddSounds = (acceptedFiles) => {
    const newSounds = acceptedFiles.map(file => ({
      id: uuidv4(),
      file: file,
    }));
    setPalette(prevPalette => {
      const updatedPalette = [...prevPalette, ...newSounds];
      if (prevPalette.length === 0 && updatedPalette.length > 0) {
        setPrimarySoundId(updatedPalette[0].id);
      }
      return updatedPalette;
    });
    setResults(null);
  };

  const handleRemoveSound = (id) => {
    setPalette(prevPalette => {
      const newPalette = prevPalette.filter(sound => sound.id !== id);
      if (id === primarySoundId && newPalette.length > 0) {
        setPrimarySoundId(newPalette[0].id);
      } else if (newPalette.length === 0) {
        setPrimarySoundId(null);
      }
      return newPalette;
    });
  };
  
  const handleProcess = async () => {
    console.log("1. 'Process & Weave!' button clicked. handleProcess function started.");

    if (!midiFile) { setError("Please upload a MIDI file first."); return; }
    if (palette.length === 0) { setError("Please upload at least one sound to the palette."); return; }
    const primarySound = palette.find(s => s.id === primarySoundId);
    if (!primarySound) { setError("A primary sound must be selected from the palette."); return; }

    setIsLoading(true);
    setResults(null);
    setError('');
    setProgress({ status: 'Preparing to upload...', percent: 0 });

    const formData = new FormData();
    formData.append('midi', midiFile);
    palette.forEach(sound => formData.append('sounds', sound.file));

    console.log("2. FormData prepared. About to start fetch to upload files.");
    console.log("   API URL for upload:", `${API_BASE_URL}/api/upload`);

    try {
      const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log("3. Fetch call completed. Response status:", uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || 'File upload failed.');
      }
      
      const uploadResult = await uploadResponse.json();
      const { jobId, midiFilename } = uploadResult;

      console.log("4. Upload successful. Job ID:", jobId);
      console.log("   WebSocket URL:", `${WS_BASE_URL}/ws/process`);

      const socket = new WebSocket(`${WS_BASE_URL}/ws/process`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("5. WebSocket connection opened successfully.");
        setProgress({ status: 'Connecting to weaver...', percent: 0 });
        const config = { 
          layering: { max_layers: layering },
          primarySoundName: primarySound.file.name,
          ticksPerSecond: ticksPerSecond
        };
        socket.send(JSON.stringify({ jobId, midiFilename, config }));
        console.log("6. Sent job details to WebSocket.");
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("7. Received message from WebSocket:", data);
        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          socket.close();
        } else if (data.resultUrl) {
          setResults({ audioPreviewUrl: `${API_BASE_URL}${data.resultUrl}` });
          setIsLoading(false);
          socket.close();
        } else {
          setProgress({ status: data.status, percent: data.percent });
        }
      };

      socket.onerror = (event) => {
        console.error("!!! WebSocket error occurred:", event);
        setError("A WebSocket connection error occurred. Check the console for details.");
        setIsLoading(false);
      };

      socket.onclose = () => {
        console.log("8. WebSocket connection closed.");
        socketRef.current = null;
        if (isLoading) setIsLoading(false);
      };

    } catch (err) {
      console.error("!!! ERROR CAUGHT IN handleProcess CATCH BLOCK !!!", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleDefaultTest = async () => {
    setIsDemoLoading(true);
    setError('');
    setResults(null);

    const urlToFile = async (url, filename, mimeType) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      const data = await response.blob();
      return new File([data], filename, { type: mimeType });
    };

    try {
      const midiPath = '/default-assets/default_song.mid';
      const soundPaths = [
        '/default-assets/harp_pling.wav',
        '/default-assets/game_start_countdown_01.wav',
        '/default-assets/game_start_countdown_02.wav',
        '/default-assets/game_start_countdown_03.wav',
        '/default-assets/game_start_countdown_final.wav',
      ];

      const defaultMidiFile = await urlToFile(midiPath, 'default_song.mid', 'audio/midi');
      setMidiFile(defaultMidiFile);

      const soundPromises = soundPaths.map(path => urlToFile(path, path.split('/').pop(), 'audio/wav'));
      const soundFiles = await Promise.all(soundPromises);

      const newPalette = soundFiles.map(file => ({ id: uuidv4(), file: file }));
      setPalette(newPalette);
      
      if (newPalette.length > 0) {
        setPrimarySoundId(newPalette[0].id);
      }
    } catch (err) {
      console.error("Error loading default files:", err);
      setError("Could not load default test files. Check console for details.");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="container">
      <Header />
      <main className="main-grid">
        <div className="card">
          <h2>1. Upload Files</h2>
          <FileUpload 
            onFileAccepted={handleMidiUpload}
            accept={{'audio/midi': ['.mid', '.midi']}}
            title="Drag & Drop your .mid file here"
            file={midiFile}
          />
          <div className="divider">OR</div>
          <button 
            className="secondary-button" 
            onClick={handleDefaultTest}
            disabled={isLoading || isDemoLoading}
          >
            {isDemoLoading ? 'Loading Demo...' : '🚀 Load Default Test'}
          </button>
        </div>
        
        <div className="card">
          <h2>2. Configure Sound Palette</h2>
          <PaletteManager 
            palette={palette}
            onAddSounds={handleAddSounds}
            onRemoveSound={handleRemoveSound}
            layering={layering}
            onLayeringChange={setLayering}
            primarySoundId={primarySoundId}
            onPrimarySoundChange={setPrimarySoundId}
          />
        </div>
        
        <div className="card">
          <h2>3. Weave!</h2>
          <div className="control-group">
            <label htmlFor="tps">Ticks Per Second (Tempo Quantization)</label>
            <input 
              type="number" 
              id="tps" 
              value={ticksPerSecond} 
              onChange={(e) => setTicksPerSecond(parseInt(e.target.value, 10) || 20)}
              className="number-input"
            />
          </div>
          {isLoading ? (
            <ProgressBar status={progress.status} percent={progress.percent} />
          ) : (
            <button onClick={handleProcess} disabled={isDemoLoading} className="process-button">
              <FiZap />
              <span>Process & Weave!</span>
            </button>
          )}
        </div>
      </main>

      {error && !isLoading && <div className="error-box">{error}</div>}

      {results && (
        <div className="card results-card">
          <h3><FiPlayCircle /> Your Woven Audio</h3>
          <audio key={results.audioPreviewUrl} controls className="audio-player">
            <source src={results.audioPreviewUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}

export default App;
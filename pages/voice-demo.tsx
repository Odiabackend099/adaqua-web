"use client";

import React, { useState } from 'react';
import VoiceRecordingUI from '../components/VoiceRecordingUI';
import '../styles/voice-recording.css';

type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';

export default function VoiceRecordingDemo() {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [statusMessage, setStatusMessage] = useState('Tap to start');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setPhase('listening');
    setStatusMessage('Listening...');
    
    // Simulate listening for 3 seconds
    setTimeout(() => {
      setPhase('thinking');
      setStatusMessage('Processing...');
      
      // Simulate thinking for 2 seconds
      setTimeout(() => {
        setPhase('speaking');
        setStatusMessage('Speaking...');
        
        // Simulate speaking for 4 seconds
        setTimeout(() => {
          setPhase('listening');
          setStatusMessage('Listening...');
        }, 4000);
      }, 2000);
    }, 3000);
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setPhase('idle');
    setStatusMessage('Tap to start');
  };

  const handlePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setPhase('listening');
      setStatusMessage('Listening...');
    } else {
      setIsPaused(true);
      setPhase('paused');
      setStatusMessage('Paused');
    }
  };

  const simulateError = () => {
    setPhase('error');
    setStatusMessage('Error occurred');
    setIsActive(false);
    setIsPaused(false);
  };

  return (
    <div className="voice-recording-page">
      <VoiceRecordingUI
        phase={phase}
        statusMessage={statusMessage}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handlePause}
      />
      
      {/* Demo Controls - Hidden in production */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div>Demo Controls:</div>
        <button onClick={() => setPhase('idle')} style={{margin: '2px', padding: '4px'}}>Idle</button>
        <button onClick={() => setPhase('listening')} style={{margin: '2px', padding: '4px'}}>Listening</button>
        <button onClick={() => setPhase('thinking')} style={{margin: '2px', padding: '4px'}}>Thinking</button>
        <button onClick={() => setPhase('speaking')} style={{margin: '2px', padding: '4px'}}>Speaking</button>
        <button onClick={() => setPhase('paused')} style={{margin: '2px', padding: '4px'}}>Paused</button>
        <button onClick={simulateError} style={{margin: '2px', padding: '4px'}}>Error</button>
      </div>
    </div>
  );
}

"use client";

import React from 'react';

type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';

interface ControlPanelProps {
  phase: VoicePhase;
  isActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  statusMessage: string;
  className?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  phase,
  isActive,
  isPaused,
  onStart,
  onStop,
  onPause,
  statusMessage,
  className = ''
}) => {
  const handlePauseClick = () => {
    if (phase === 'idle') {
      onStart();
    } else {
      onPause();
    }
  };

  const handleStopClick = () => {
    onStop();
  };

  const getPauseButtonIcon = () => {
    if (phase === 'idle') {
      // Play icon for start
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      );
    } else if (isPaused) {
      // Play icon for resume
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      );
    } else {
      // Pause bars icon
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      );
    }
  };

  const getStopButtonIcon = () => {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
      </svg>
    );
  };

  const isPauseButtonDisabled = phase === 'thinking' || phase === 'speaking';
  const isStopButtonDisabled = phase === 'idle';

  return (
    <div className={`control-panel ${className}`}>
      {/* Status Message */}
      <div className="status-message">
        {statusMessage}
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        {/* Pause/Play Button */}
        <button
          className={`control-button pause-button ${isPaused ? 'paused' : ''} ${phase === 'idle' ? 'start-button' : ''}`}
          onClick={handlePauseClick}
          disabled={isPauseButtonDisabled}
          aria-label={phase === 'idle' ? 'Start recording' : isPaused ? 'Resume recording' : 'Pause recording'}
        >
          {getPauseButtonIcon()}
        </button>

        {/* Stop Button */}
        <button
          className="control-button stop-button"
          onClick={handleStopClick}
          disabled={isStopButtonDisabled}
          aria-label="Stop recording"
        >
          {getStopButtonIcon()}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;

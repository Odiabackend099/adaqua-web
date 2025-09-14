"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import AudioWaveVisualization from './AudioWaveVisualization';
import ControlPanel from './ControlPanel';

type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';

interface VoiceRecordingUIProps {
  className?: string;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  statusMessage?: string;
  phase?: VoicePhase;
}

const VoiceRecordingUI: React.FC<VoiceRecordingUIProps> = ({
  className = '',
  onStart,
  onStop,
  onPause,
  onResume,
  statusMessage = 'Tap to start',
  phase = 'idle'
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<VoicePhase>(phase);

  // Handle phase changes from parent
  useEffect(() => {
    setCurrentPhase(phase);
  }, [phase]);

  const handleStart = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
    setCurrentPhase('listening');
    onStart?.();
  }, [onStart]);

  const handleStop = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setCurrentPhase('idle');
    onStop?.();
  }, [onStop]);

  const handlePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      setCurrentPhase('listening');
      onResume?.();
    } else {
      setIsPaused(true);
      setCurrentPhase('paused');
      onPause?.();
    }
  }, [isPaused, onPause, onResume]);

  const getStatusMessage = () => {
    if (statusMessage) return statusMessage;
    
    switch (currentPhase) {
      case 'idle': return 'Tap to start';
      case 'listening': return 'Listening...';
      case 'thinking': return 'Processing...';
      case 'speaking': return 'Speaking...';
      case 'paused': return 'Paused';
      case 'error': return 'Error occurred';
      default: return 'Ready';
    }
  };

  return (
    <div className={`voice-recording-ui ${className}`}>
      {/* Main Container */}
      <div className="voice-recording-container">
        
        {/* Main Content Area */}
        <div className="main-content-area">
          <AudioWaveVisualization 
            phase={currentPhase}
            isActive={isActive}
            isPaused={isPaused}
          />
        </div>

        {/* Control Panel */}
        <ControlPanel
          phase={currentPhase}
          isActive={isActive}
          isPaused={isPaused}
          onStart={handleStart}
          onStop={handleStop}
          onPause={handlePause}
          statusMessage={getStatusMessage()}
        />
      </div>
    </div>
  );
};

export default VoiceRecordingUI;

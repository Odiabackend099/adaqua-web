"use client";

import React, { useEffect, useRef } from 'react';

type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';

interface AudioWaveVisualizationProps {
  phase: VoicePhase;
  isActive: boolean;
  isPaused: boolean;
  className?: string;
}

const AudioWaveVisualization: React.FC<AudioWaveVisualizationProps> = ({
  phase,
  isActive,
  isPaused,
  className = ''
}) => {
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const waveElement = waveRef.current;
    if (!waveElement) return;

    // Add/remove animation classes based on phase
    waveElement.classList.remove('wave-listening', 'wave-thinking', 'wave-speaking', 'wave-paused', 'wave-error');
    
    switch (phase) {
      case 'listening':
        waveElement.classList.add('wave-listening');
        break;
      case 'thinking':
        waveElement.classList.add('wave-thinking');
        break;
      case 'speaking':
        waveElement.classList.add('wave-speaking');
        break;
      case 'paused':
        waveElement.classList.add('wave-paused');
        break;
      case 'error':
        waveElement.classList.add('wave-error');
        break;
    }
  }, [phase]);

  const getWaveClass = () => {
    const baseClass = 'audio-wave-visualization';
    const phaseClass = `wave-${phase}`;
    const activeClass = isActive ? 'wave-active' : 'wave-inactive';
    const pausedClass = isPaused ? 'wave-paused' : '';
    
    return `${baseClass} ${phaseClass} ${activeClass} ${pausedClass} ${className}`.trim();
  };

  return (
    <div className={getWaveClass()} ref={waveRef}>
      {/* Main wave bar */}
      <div className="wave-main-bar">
        <div className="wave-gradient" />
      </div>
      
      {/* Animated wave elements */}
      <div className="wave-elements">
        <div className="wave-element wave-element-1" />
        <div className="wave-element wave-element-2" />
        <div className="wave-element wave-element-3" />
        <div className="wave-element wave-element-4" />
        <div className="wave-element wave-element-5" />
      </div>
      
      {/* Glow effect */}
      <div className="wave-glow" />
    </div>
  );
};

export default AudioWaveVisualization;

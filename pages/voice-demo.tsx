"use client";

import React from 'react';
import UnifiedVoiceUI from '../components/UnifiedVoiceUI';

export default function VoiceRecordingDemo() {
  return (
    <div className="voice-recording-page">
      <UnifiedVoiceUI enableCallMode={true} />
    </div>
  );
}

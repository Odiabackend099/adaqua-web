"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { tts } from '../lib/ttsClient';

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface UnifiedVoiceUIProps {
  className?: string;
  enableCallMode?: boolean;
}

type VoiceMode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const UnifiedVoiceUI: React.FC<UnifiedVoiceUIProps> = ({ className = '', enableCallMode = false }) => {
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition() as SpeechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        isListeningRef.current = true;
      };
      
      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        
        setInterimText(interim);
        if (final) {
          setFinalText(final);
          handleFinalSpeech(final);
        }
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        isListeningRef.current = false;
        if (mode === 'listening') {
          // Auto-restart if we're still in listening mode
          setTimeout(() => {
            if (mode === 'listening') {
              startListening();
            }
          }, 100);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setMode('idle');
        isListeningRef.current = false;
      };
      
      recognitionRef.current = recognition;
    } else {
      setError('Speech recognition not supported in this browser');
    }
  }, [mode]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
        setMode('listening');
        setInterimText('');
        setFinalText('');
        setError(null);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setError('Failed to start speech recognition');
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
      isListeningRef.current = false;
    }
  }, []);

  const handleFinalSpeech = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setMode('thinking');
    stopListening();
    
    // Add user message to history
    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedHistory = [...conversationHistory, userMessage];
    setConversationHistory(updatedHistory);
    
    try {
      // Send to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: text,
          history: updatedHistory.slice(-10) // Keep last 10 messages for context
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantResponse = '';
      
      setMode('speaking');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        const lines = text.split(/\r?\n/);
        
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          
          const payload = line.slice(5).trim();
          if (!payload) continue;
          
          try {
            const data = JSON.parse(payload);
            if (data.delta) {
              assistantResponse += data.delta;
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.error('Failed to parse SSE data:', parseError);
          }
        }
      }
      
      if (assistantResponse.trim()) {
        // Add assistant response to history
        const assistantMessage: ChatMessage = { role: 'assistant', content: assistantResponse };
        setConversationHistory(prev => [...prev, assistantMessage]);
        
        // Speak the response using our strict TTS client
        await speakText(assistantResponse);
      }
      
      // Auto-restart listening after speaking
      setMode('listening');
      setTimeout(() => {
        if (mode === 'listening') {
          startListening();
        }
      }, 500);
      
    } catch (error) {
      console.error('Chat error:', error);
      setError(`Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMode('idle');
    }
  }, [conversationHistory, mode, startListening]);

  const speakText = async (text: string) => {
    try {
      // Use our strict TTS client - NO FALLBACKS
      const audioBlob = await tts(text, 'mp3');
      
      // Create audio element and play
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      
      audio.onended = () => {
        setMode('listening');
        setTimeout(() => {
          if (mode === 'listening') {
            startListening();
          }
        }, 100);
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setError('Audio playback failed');
        setMode('idle');
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setError(`TTS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMode('idle');
    }
  };

  const handleMicClick = useCallback(async () => {
    if (mode === 'idle') {
      try {
        setIsStarted(true);
        startListening();
      } catch (error) {
        console.error('Failed to start:', error);
        setError('Failed to start voice assistant');
      }
    } else if (mode === 'listening') {
      stopListening();
      setMode('idle');
      setIsStarted(false);
    } else if (mode === 'speaking') {
      // Barge-in: stop current audio and start listening
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setMode('listening');
      setTimeout(() => startListening(), 100);
    }
  }, [mode, startListening, stopListening]);

  const handleStopClick = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopListening();
    setMode('idle');
    setIsStarted(false);
    setInterimText('');
    setFinalText('');
    setError(null);
  }, [stopListening]);

  const getStatusText = () => {
    switch (mode) {
      case 'idle': return 'Tap mic to speak';
      case 'listening': return interimText || 'Listening...';
      case 'thinking': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      case 'error': return 'Error occurred';
      default: return '';
    }
  };

  const getOrbClass = () => {
    const baseClass = 'voice-orb';
    switch (mode) {
      case 'listening': return `${baseClass} listening`;
      case 'thinking': return `${baseClass} thinking`;
      case 'speaking': return `${baseClass} speaking`;
      case 'error': return `${baseClass} error`;
      default: return `${baseClass} idle`;
    }
  };

  // Call mode UI - Full screen
  if (enableCallMode && isStarted) {
    return (
      <div 
        className="fixed inset-0 z-50"
        style={{
          backgroundColor: "#0A0D12",
          fontFamily: "'SF Pro Display', Inter, system-ui, sans-serif"
        }}
      >
        {/* Status Bar Area */}
        <div className="absolute top-0 left-0 right-0 h-[5.5vh] bg-transparent" />

        {/* Live Title */}
        <div 
          className="absolute text-center font-semibold text-sm tracking-wide"
          style={{
            top: '7.5%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#C7CBD2'
          }}
        >
          Live
        </div>

        {/* Bottom Glow */}
        <div 
          className={`absolute left-0 right-0 bottom-0 transition-all duration-700 ${
            mode === 'speaking' ? 'animate-pulse' : ''
          }`}
          style={{
            height: '28%',
            background: `radial-gradient(ellipse 120% 120% at 50% 96%, 
              #88B3FF 0%, 
              #3E6BFF 35%, 
              #1B2A44 65%, 
              #0A0D12 100%)`
          }}
        />

        {/* Speaking Animation Overlay */}
        {mode === 'speaking' && (
          <div 
            className="absolute left-0 right-0 bottom-0 animate-speaking-glow"
            style={{
              height: '28%',
              background: `radial-gradient(ellipse 120% 120% at 50% 96%, 
                #88B3FF99 0%, 
                #3E6BFFCC 35%, 
                transparent 65%)`
            }}
          />
        )}

        {/* Controls Bar */}
        <div 
          className="absolute flex items-center justify-between px-8"
          style={{
            bottom: '7%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '12%'
          }}
        >
          {/* Hold Button */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={handleMicClick}
              className={`
                flex items-center justify-center rounded-full transition-all duration-200
                ${mode === 'listening' ? 'bg-red-500' : 'bg-white/10'}
                hover:scale-105 active:scale-95
              `}
              style={{
                width: '16vw',
                height: '16vw',
                maxWidth: '80px',
                maxHeight: '80px',
                minWidth: '60px',
                minHeight: '60px',
                boxShadow: '0 6px 24px rgba(0,0,0,0.35)'
              }}
              aria-label="Hold call"
            >
              <div className="w-6 h-6 text-white">
                {mode === 'listening' ? '⏸️' : '🎙️'}
              </div>
            </button>
            <span 
              className="text-xs font-medium"
              style={{ color: '#C7CBD2' }}
            >
              {mode === 'listening' ? 'Stop' : 'Start'}
            </span>
          </div>

          {/* End Button */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={handleStopClick}
              className="
                flex items-center justify-center rounded-full transition-all duration-200
                hover:scale-105 active:scale-95
              "
              style={{
                width: '16vw',
                height: '16vw',
                maxWidth: '80px',
                maxHeight: '80px',
                minWidth: '60px',
                minHeight: '60px',
                backgroundColor: '#E5463C',
                boxShadow: '0 6px 24px rgba(0,0,0,0.35), 0 0 20px rgba(229,70,60,0.35)'
              }}
              aria-label="End call"
            >
              <div className="w-6 h-6 text-white">✕</div>
            </button>
            <span 
              className="text-xs font-medium"
              style={{ color: '#C7CBD2' }}
            >
              End
            </span>
          </div>
        </div>

        {/* Home Indicator */}
        <div 
          className="absolute rounded-full"
          style={{
            bottom: '2.5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '20%',
            height: '0.8%',
            minHeight: '4px',
            backgroundColor: 'rgba(255,255,255,0.20)'
          }}
        />

        {/* Custom CSS for speaking animation */}
        <style jsx>{`
          @keyframes speaking-glow {
            0% { 
              transform: scaleY(1); 
              filter: blur(0px); 
              opacity: 0.8;
            }
            50% { 
              transform: scaleY(1.06); 
              filter: blur(2px); 
              opacity: 1;
            }
            100% { 
              transform: scaleY(1); 
              filter: blur(0px); 
              opacity: 0.8;
            }
          }
          
          .animate-speaking-glow {
            animation: speaking-glow 1.4s ease-in-out infinite;
          }
          
          @media (prefers-reduced-motion: reduce) {
            .animate-speaking-glow {
              animation: none;
            }
          }
        `}</style>
      </div>
    );
  }

  // Regular floating bubble UI
  return (
    <div className={`voice-ui ${className}`}>
      <div className="voice-container">
        <div className={getOrbClass()} />
        
        <div className="voice-controls">
          <button 
            className={`mic-button ${mode === 'listening' ? 'active' : ''}`}
            onClick={handleMicClick}
            disabled={mode === 'thinking'}
          >
            {mode === 'listening' ? '🎤' : '🎙️'}
          </button>
          
          <button 
            className="stop-button"
            onClick={handleStopClick}
            disabled={mode === 'idle'}
          >
            ✕
          </button>
        </div>
        
        <div className="voice-status">
          <div className="status-text">{getStatusText()}</div>
          {error && <div className="error-text">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default UnifiedVoiceUI;

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { unlockAudio, playAudioBlob, stopCurrent, isPlaying } from '../lib/audio';
import { speak } from '../lib/tts';

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

interface VoiceUIProps {
  className?: string;
}

type VoiceMode = 'idle' | 'listening' | 'thinking' | 'speaking';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const VoiceUI: React.FC<VoiceUIProps> = ({ className = '' }) => {
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition() as SpeechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Use en-US as most reliable, can be configured via env
      
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
        
        // Speak the response
        await speak(assistantResponse);
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

  const handleMicClick = useCallback(async () => {
    if (mode === 'idle') {
      try {
        await unlockAudio();
        startListening();
      } catch (error) {
        console.error('Failed to unlock audio:', error);
        setError('Failed to unlock audio. Please allow audio permissions.');
      }
    } else if (mode === 'listening') {
      stopListening();
      setMode('idle');
    } else if (mode === 'speaking') {
      // Barge-in: stop current audio and start listening
      stopCurrent();
      setMode('listening');
      setTimeout(() => startListening(), 100);
    }
  }, [mode, startListening, stopListening]);

  const handleStopClick = useCallback(() => {
    stopCurrent();
    stopListening();
    setMode('idle');
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
      default: return '';
    }
  };

  const getOrbClass = () => {
    const baseClass = 'voice-orb';
    switch (mode) {
      case 'listening': return `${baseClass} listening`;
      case 'thinking': return `${baseClass} thinking`;
      case 'speaking': return `${baseClass} speaking`;
      default: return `${baseClass} idle`;
    }
  };

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

export default VoiceUI;

"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import VoiceCallUI from './VoiceCallUI';

// Environment configuration
const CHAT_AUDIO_URL = process.env.NEXT_PUBLIC_BRAIN_CHAT_AUDIO_URL!;
const DEFAULT_VOICE = process.env.NEXT_PUBLIC_DEFAULT_VOICE || 'naija_male_warm';
const AUDIO_FMT = process.env.NEXT_PUBLIC_AUDIO_FORMAT || 'mp3';
const VAD_SILENCE_MS = Number(process.env.NEXT_PUBLIC_VAD_SILENCE_MS || 800);
const VAD_MIN_UTTER_MS = Number(process.env.NEXT_PUBLIC_VAD_MIN_UTTER_MS || 500);
const MAX_UTTER_SEC = Number(process.env.NEXT_PUBLIC_MAX_UTTER_SEC || 20);

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface VoiceAssistantProps {
  className?: string;
  enableCallMode?: boolean; // New prop to enable full-screen call UI
}

export default function VoiceAssistant({ className = '', enableCallMode = false }: VoiceAssistantProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [statusMessage, setStatusMessage] = useState('Tap to start');
  const [isStarted, setIsStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useWebSpeechFallback, setUseWebSpeechFallback] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  
  // Refs for audio/media handling
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speakingRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  
  // VAD state
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const utteranceStartTimeRef = useRef<number>(Date.now());
  const hasSpeechRef = useRef<boolean>(false);

  // Initialize audio context and elements
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      speakingRef.current = false;
      if (isStarted) {
        setPhase('listening');
        setStatusMessage('Listening…');
        beginRecordingLoop().catch(console.error);
      }
    };
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);

  const start = async () => {
    try {
      setStatusMessage('Requesting microphone access...');
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaStreamRef.current = stream;
      
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContextRef.current.resume();
      
      setIsStarted(true);
      setPhase('listening');
      setStatusMessage('Listening…');
      
      await beginRecordingLoop();
    } catch (error) {
      console.error('Failed to start voice assistant:', error);
      setPhase('error');
      setStatusMessage('Microphone access denied');
    }
  };

  const stop = () => {
    setIsStarted(false);
    setPhase('idle');
    setStatusMessage('Tap to start');
    setIsHolding(false);
    cleanup();
  };

  const toggleHold = () => {
    setIsHolding(prev => !prev);
    if (!isHolding) {
      // Pause the voice assistant
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      setPhase('idle');
      setStatusMessage('On hold');
    } else {
      // Resume the voice assistant
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      setPhase('listening');
      setStatusMessage('Listening…');
      beginRecordingLoop().catch(console.error);
    }
  };

  const beginRecordingLoop = async () => {
    if (!mediaStreamRef.current || !audioContextRef.current) return;

    // Stop any existing recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Clear previous chunks
    chunksRef.current = [];
    
    // Setup MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';
    
    const mediaRecorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    // Setup VAD
    resetVADState();
    setupVAD();

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }
    };

    mediaRecorder.start(100); // Collect chunks every 100ms
  };

  const resetVADState = () => {
    const now = Date.now();
    lastSpeechTimeRef.current = now;
    utteranceStartTimeRef.current = now;
    hasSpeechRef.current = false;
  };

  const setupVAD = () => {
    if (!audioContextRef.current || !mediaStreamRef.current) return;

    try {
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.fftSize);
      
      vadIntervalRef.current = window.setInterval(() => {
        if (speakingRef.current || phase !== 'listening') return;
        
        analyser.getByteTimeDomainData(dataArray);
        
        // Calculate RMS energy
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const sample = (dataArray[i] - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        const now = Date.now();
        const speechThreshold = 0.04; // Adjust based on environment
        
        if (rms > speechThreshold) {
          hasSpeechRef.current = true;
          lastSpeechTimeRef.current = now;
        }
        
        const utteranceDuration = now - utteranceStartTimeRef.current;
        const silenceDuration = now - lastSpeechTimeRef.current;
        
        // Check if we should finalize the utterance
        if (
          hasSpeechRef.current &&
          utteranceDuration >= VAD_MIN_UTTER_MS &&
          (silenceDuration >= VAD_SILENCE_MS || utteranceDuration >= MAX_UTTER_SEC * 1000)
        ) {
          finalizeUtterance();
        }
      }, 50); // Check every 50ms
      
    } catch (error) {
      console.error('VAD setup failed:', error);
      // Fallback: use a simple timeout-based approach
      vadIntervalRef.current = window.setTimeout(() => {
        finalizeUtterance();
      }, 5000); // 5 second fallback
    }
  };

  const finalizeUtterance = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      transcribeThenSpeak();
    }
  };

  const transcribeThenSpeak = async () => {
    const maxRetries = 2;
    
    try {
      setPhase('thinking');
      setStatusMessage('Processing…');
      
      // Create blob from recorded chunks
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = [];
      
      if (blob.size === 0) {
        throw new Error('No audio data recorded');
      }

      let transcriptionText = '';

      // 1) Speech-to-Text with fallback
      if (!useWebSpeechFallback && retryCount < maxRetries) {
        try {
          const sttResponse = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'audio/webm' },
            body: blob
          });
          
          if (!sttResponse.ok) {
            throw new Error(`STT API failed: ${sttResponse.statusText}`);
          }
          
          const { text } = await sttResponse.json();
          transcriptionText = text;
          
        } catch (sttError) {
          console.error('STT API failed, trying Web Speech API fallback:', sttError);
          
          // Try Web Speech API fallback
          try {
            transcriptionText = await webSpeechFallback();
            setUseWebSpeechFallback(true);
          } catch (webSpeechError) {
            throw new Error('Both STT methods failed');
          }
        }
      } else {
        // Use Web Speech API directly
        transcriptionText = await webSpeechFallback();
      }
      
      if (!transcriptionText || transcriptionText.trim().length === 0) {
        throw new Error('No speech detected');
      }

      console.log('Transcribed text:', transcriptionText);
      setRetryCount(0); // Reset retry count on success

      // 2) Brain Chat-Audio with retry logic
      await sendToBrainWithRetry(transcriptionText.trim());
      
    } catch (error) {
      console.error('Processing error:', error);
      handleProcessingError(error as Error);
    }
  };

  const webSpeechFallback = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Web Speech API error: ${event.error}`));
      };

      recognition.onend = () => {
        // If we reach here without a result, it means no speech was detected
        reject(new Error('No speech detected by Web Speech API'));
      };

      recognition.start();
      
      // Timeout after 10 seconds
      setTimeout(() => {
        recognition.stop();
        reject(new Error('Speech recognition timeout'));
      }, 10000);
    });
  };

  const sendToBrainWithRetry = async (text: string, attempt = 1): Promise<void> => {
    const maxAttempts = 2;
    
    try {
      // Use our new secure /api/voice endpoint
      const ttsResponse = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voice_id: DEFAULT_VOICE, 
          format: AUDIO_FMT 
        })
      });
      
      if (!ttsResponse.ok) {
        const errorData = await ttsResponse.json().catch(() => ({}));
        throw new Error(`Voice API failed: ${errorData.error || ttsResponse.statusText}`);
      }

      // 3) Play the audio response
      const audioArrayBuffer = await ttsResponse.arrayBuffer();
      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      speakingRef.current = true;
      setPhase('speaking');
      setStatusMessage('Speaking…');
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        // Audio end handler will restart the loop
      }
      
    } catch (error) {
      if (attempt < maxAttempts) {
        console.log(`Voice API attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        return sendToBrainWithRetry(text, attempt + 1);
      } else {
        // Final fallback: use local TTS if available
        await speakFallback('Sorry, I missed that. Could you say it again?');
        throw error;
      }
    }
  };

  const speakFallback = async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));
      
      speakingRef.current = true;
      setPhase('speaking');
      setStatusMessage('Speaking (fallback)…');
      
      window.speechSynthesis.speak(utterance);
    });
  };

  const handleProcessingError = (error: Error) => {
    console.error('Processing error:', error);
    setRetryCount(prev => prev + 1);
    
    if (retryCount >= 3) {
      setPhase('error');
      setStatusMessage('Multiple errors. Tap to restart.');
      stop();
      return;
    }
    
    setPhase('error');
    setStatusMessage('Error occurred. Retrying…');
    
    // Auto-retry with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    setTimeout(() => {
      if (isStarted) {
        setPhase('listening');
        setStatusMessage('Listening…');
        beginRecordingLoop().catch(console.error);
      }
    }, retryDelay);
  };

  // Wave animation styles based on phase
  const getWaveAnimation = () => {
    switch (phase) {
      case 'listening':
        return 'animate-pulse scale-110';
      case 'thinking':
        return 'animate-ping scale-105';
      case 'speaking':
        return 'animate-bounce scale-125';
      case 'error':
        return 'animate-pulse bg-red-500';
      default:
        return '';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'listening':
        return 'bg-green-500';
      case 'thinking':
        return 'bg-blue-500';
      case 'speaking':
        return 'bg-purple-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-700';
    }
  };

  return (
    <>
      {/* Call Mode UI - Full Screen */}
      {enableCallMode && isStarted && (
        <VoiceCallUI
          isVisible={true}
          isHolding={isHolding}
          isSpeaking={phase === 'speaking'}
          onHold={toggleHold}
          onEnd={stop}
        />
      )}
      
      {/* Regular Floating Bubble UI */}
      {(!enableCallMode || !isStarted) && (
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
          {/* Main floating bubble */}
          <button
            onClick={isStarted ? stop : start}
            disabled={phase === 'thinking' || phase === 'speaking'}
            className={`
              relative h-16 w-16 rounded-full shadow-xl border-2 border-white/20
              transition-all duration-300 transform hover:scale-105
              ${getPhaseColor()}
              ${getWaveAnimation()}
              ${phase === 'thinking' || phase === 'speaking' ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label={isStarted ? 'Stop voice assistant' : 'Start voice assistant'}
          >
            {/* Voice wave visualization */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className={`
                absolute inset-2 rounded-full bg-white/30
                ${phase === 'listening' ? 'animate-ping' : ''}
              `} />
              <div className={`
                absolute inset-4 rounded-full bg-white/50
                ${phase === 'speaking' ? 'animate-pulse' : ''}
              `} />
            </div>
            
            {/* Center icon/indicator */}
            <div className="absolute inset-0 flex items-center justify-center">
              {phase === 'idle' && (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
              {(phase === 'listening' || phase === 'thinking' || phase === 'speaking') && (
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              )}
              {phase === 'error' && (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>

          {/* Status message */}
          <div className="absolute bottom-20 right-0 bg-black/80 text-white text-sm px-3 py-1 rounded-lg shadow-lg whitespace-nowrap">
            {statusMessage}
          </div>
        </div>
      )}
    </>
  );
}
// Audio utilities for voice assistant
// Handles browser autoplay restrictions and audio playback with barge-in support

let audioContext: AudioContext | null = null;
let currentAudio: HTMLAudioElement | null = null;
let isUnlocked = false;

/**
 * Unlock audio context for autoplay
 * Creates a silent oscillator to enable audio playback
 */
export async function unlockAudio(): Promise<void> {
  if (isUnlocked) return;

  try {
    // Create audio context if not exists
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Create silent oscillator to unlock audio
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set gain to 0 (silent)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    // Start and stop immediately
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.01);
    
    isUnlocked = true;
    console.log("Audio unlocked successfully");
  } catch (error) {
    console.error("Failed to unlock audio:", error);
    throw error;
  }
}

/**
 * Play audio blob with retry on failure
 * @param blob - Audio blob to play
 * @returns Promise that resolves when audio finishes playing
 */
export async function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Stop any currently playing audio
      stopCurrent();

      // Create audio element
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      
      audio.src = url;
      audio.preload = 'auto';

      // Set up event handlers
      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        resolve();
      };

      audio.onerror = async (error) => {
        console.error("Audio playback error:", error);
        URL.revokeObjectURL(url);
        currentAudio = null;
        
        // Try to unlock audio and retry once
        if (!isUnlocked) {
          try {
            await unlockAudio();
            // Retry playback
            const retryAudio = new Audio();
            retryAudio.src = url;
            retryAudio.onended = () => {
              URL.revokeObjectURL(url);
              currentAudio = null;
              resolve();
            };
            retryAudio.onerror = () => {
              URL.revokeObjectURL(url);
              currentAudio = null;
              reject(new Error("Audio playback failed after retry"));
            };
            await retryAudio.play();
            currentAudio = retryAudio;
            return;
          } catch (unlockError) {
            console.error("Failed to unlock audio for retry:", unlockError);
          }
        }
        
        reject(new Error("Audio playback failed"));
      };

      // Store reference for barge-in
      currentAudio = audio;

      // Attempt to play
      await audio.play();
      
    } catch (error) {
      console.error("Failed to play audio:", error);
      reject(error);
    }
  });
}

/**
 * Stop any currently playing audio
 * Used for barge-in functionality
 */
export function stopCurrent(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
      currentAudio = null;
    } catch (error) {
      console.error("Error stopping audio:", error);
    }
  }
}

/**
 * Check if audio is currently playing
 */
export function isPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused && !currentAudio.ended;
}

/**
 * Get current audio context state
 */
export function getAudioContextState(): string | null {
  return audioContext?.state || null;
}

/**
 * Resume audio context if suspended
 */
export async function resumeAudioContext(): Promise<void> {
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

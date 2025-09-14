// TTS integration for voice assistant
// Handles text-to-speech conversion using the local TTS proxy

const DEFAULT_VOICE_ID = process.env.NEXT_PUBLIC_VOICE_VOICE_ID || "naija_male_warm";

export interface TTSOptions {
  voice_id?: string;
  format?: string;
}

/**
 * Convert text to speech and return audio blob
 * @param text - Text to convert to speech
 * @param options - TTS options (voice_id, format)
 * @returns Promise resolving to audio blob
 */
export async function synthesizeSpeech(
  text: string, 
  options: TTSOptions = {}
): Promise<Blob> {
  if (!text.trim()) {
    throw new Error("Text cannot be empty");
  }

  const { voice_id = DEFAULT_VOICE_ID, format = "mp3" } = options;

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        voice_id,
        format
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || 
        `TTS request failed with status ${response.status}`
      );
    }

    // Check if response is audio
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('audio/')) {
      const errorText = await response.text();
      throw new Error(`Expected audio response, got: ${contentType}. Response: ${errorText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("TTS synthesis error:", error);
    throw error;
  }
}

/**
 * Quick TTS test using GET endpoint
 * @param text - Text to test
 * @returns Promise resolving to audio blob
 */
export async function testTTS(text: string = "Hello"): Promise<Blob> {
  try {
    const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || 
        `TTS test failed with status ${response.status}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('audio/')) {
      const errorText = await response.text();
      throw new Error(`Expected audio response, got: ${contentType}. Response: ${errorText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("TTS test error:", error);
    throw error;
  }
}

/**
 * Speak text using TTS and audio playback
 * @param text - Text to speak
 * @param options - TTS options
 * @returns Promise resolving when speech completes
 */
export async function speak(
  text: string, 
  options: TTSOptions = {}
): Promise<void> {
  const { playAudioBlob, unlockAudio } = await import('./audio');
  
  try {
    // Ensure audio is unlocked
    await unlockAudio();
    
    // Synthesize speech
    const audioBlob = await synthesizeSpeech(text, options);
    
    // Play audio
    await playAudioBlob(audioBlob);
  } catch (error) {
    console.error("Speak error:", error);
    throw error;
  }
}

/**
 * Get available voice options
 * Currently returns the default voice, but can be extended
 */
export function getAvailableVoices(): Array<{id: string, name: string, language: string}> {
  return [
    {
      id: "naija_male_warm",
      name: "Nigerian Male (Warm)",
      language: "en-NG"
    }
  ];
}

/**
 * Get default voice ID
 */
export function getDefaultVoiceId(): string {
  return DEFAULT_VOICE_ID;
}

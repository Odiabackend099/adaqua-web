// DEPRECATED: Use lib/ttsClient.ts instead
// This file is kept for backward compatibility but should not be used

export { tts as synthesizeSpeech, tts as speak } from './ttsClient';
export { tts as testTTS } from './ttsClient';

export function getAvailableVoices(): Array<{id: string, name: string, language: string}> {
  return [
    {
      id: "naija_male_warm",
      name: "Nigerian Male (Warm)",
      language: "en-NG"
    }
  ];
}

export function getDefaultVoiceId(): string {
  return "naija_male_warm";
}

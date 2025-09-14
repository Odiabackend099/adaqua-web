/** Back-compat shim. Prefer importing from "./ttsClient". */
export { synth as synthesizeSpeech, synth as speak, synth as testTTS, synthToUrl } from "./ttsClient";

/** No browser fallbacks anymore. */
export type VoiceInfo = { id: string; name: string; language: string };
export function getAvailableVoices(): VoiceInfo[] { return []; }
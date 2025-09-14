// Single TTS client wrapper - ONLY use this for TTS
// NO FALLBACKS - if this fails, the error should surface

export async function tts(text: string, format: 'mp3'|'wav'='mp3'): Promise<Blob|Buffer> {
  const res = await fetch('http://tts-api.odia.dev/voice/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id:'naija_male_warm', format })
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  const ct = res.headers.get('content-type') || 'audio/mpeg';
  const buf = await res.arrayBuffer();
  return typeof window !== 'undefined' ? new Blob([buf], { type: ct }) : Buffer.from(buf);
}

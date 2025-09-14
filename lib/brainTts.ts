let audioUnlocked = false;

export async function unlockAudio() {
  try {
    if (audioUnlocked) return;
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) { audioUnlocked = true; return; } // nothing to unlock
    const ctx = new AC();
    await ctx.resume();
    // play a 10ms near-silent blip to satisfy gesture
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
    audioUnlocked = true;
  } catch { /* ignore */ }
}

export async function speakViaBrain(text: string, voiceId?: string) {
  const vid = voiceId || (process as any).env.NEXT_PUBLIC_VOICE_VOICE_ID || "naija_male_warm";

  const res = await fetch("/api/brain-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: vid, format: "mp3" })
  });

  if (!res.ok) {
    const detail = await res.text().catch(()=>"");
    throw new Error(`Brain TTS failed: ${res.status} ${detail.slice(0,120)}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";

  async function playOnce() {
    try {
      await audio.play();
    } catch (e) {
      // try once more after unlocking
      await unlockAudio();
      await audio.play();
    }
  }

  const play = () => new Promise<void>((resolve, reject) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => reject(new Error("audio error"));
    playOnce().catch(reject);
  });

  return { audio, play };
}

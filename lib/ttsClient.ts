export async function synth(text: string, format: "mp3" | "wav" = "mp3"): Promise<Blob> {
  const r = await fetch(`/api/tts?text=${encodeURIComponent(text)}&format=${format}`, { method: "GET" });
  if (!r.ok) {
    let detail: any; try { detail = await r.json(); } catch {}
    throw new Error((detail && (detail.error || detail.detail)) || `tts_failed_${r.status}`);
  }
  return await r.blob();
}
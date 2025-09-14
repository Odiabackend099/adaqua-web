export async function synth(text: string, format: "mp3" | "wav" = "mp3"): Promise<Blob> {
  const r = await fetch(`/api/tts?text=${encodeURIComponent(text)}&format=${format}`, { method: "GET", cache: "no-store" });
  if (!r.ok) {
    try { const j = await r.json(); throw new Error(j.error || j.detail || `tts_failed_${r.status}`); }
    catch { throw new Error(`tts_failed_${r.status}`); }
  }
  return await r.blob();
}

export async function synthToUrl(text: string, format: "mp3" | "wav" = "mp3"): Promise<string> {
  const blob = await synth(text, format);
  return URL.createObjectURL(blob);
}

/** Optional helper to free blob URLs you no longer need */
export function revokeObjectUrl(url?: string) {
  try { if (url && url.startsWith("blob:")) URL.revokeObjectURL(url); } catch {}
}
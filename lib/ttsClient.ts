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
  // Browser-only. Avoid TS DOM typings by using globalThis as any.
  const create: ((b: Blob) => string) | undefined = (globalThis as any)?.URL?.createObjectURL;
  if (!create) throw new Error("blob_url_not_supported_in_this_env");
  return create(blob);
}

export function revokeObjectUrl(url?: string) {
  try { if (url && url.startsWith("blob:")) (globalThis as any)?.URL?.revokeObjectURL?.(url); } catch {}
}
export const tts = synth;


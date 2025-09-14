// lib/ttsClient.ts
export async function synthToUrl(text: string, format: "mp3" | "wav" = "mp3") {
  const base = process.env.NEXT_PUBLIC_TTS_URL || "/api/tts";
  const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  u.searchParams.set("text", text);
  u.searchParams.set("format", format);

  const r = await fetch(u.toString(), { method: "GET" });
  if (!r.ok) throw new Error("TTS_FAILED");
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

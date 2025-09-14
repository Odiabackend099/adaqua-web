import type { NextApiRequest, NextApiResponse } from "next";
export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const base  = process.env.BRAIN_API_URL || process.env.NEXT_PUBLIC_BRAIN_API_URL || "https://brain-api.odia.dev";
  const token = process.env.BRAIN_SERVER_TOKEN || process.env.NEXT_PUBLIC_BRAIN_PUBLIC_TOKEN || "";
  const voiceId = process.env.NEXT_PUBLIC_VOICE_VOICE_ID || "naija_male_warm";

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const format = (req.method === "GET" ? String(req.query.format || "mp3") : String(body.format || "mp3"));
  const content =
    (typeof req.query.text === "string" ? req.query.text : undefined) ??
    body.message ?? body.text ?? "Hello from Adaqua";

  try {
    const up = await fetch(`${base}/voice/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text: content, voice_id: voiceId, format })
    });

    if (!up.ok || !up.body) {
      const detail = await up.text().catch(()=> "");
      res.status(502).json({ ok:false, error:"upstream_failed", status: up.status, detail: detail.slice(0,200) });
      return;
    }

    res.setHeader("Content-Type", up.headers.get("content-type") || (format === "wav" ? "audio/wav" : "audio/mpeg"));
    const reader = (up.body as any).getReader();
    while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
    res.end();
  } catch (e:any) {
    res.status(500).json({ ok:false, error: e?.message || "server_error" });
  }
}

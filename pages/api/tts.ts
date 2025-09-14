import type { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { responseLimit: false } };

const UPSTREAM = process.env.TTS_UPSTREAM_URL!;
const PATH     = process.env.TTS_UPSTREAM_PATH!;
const TIMEOUT  = Number(process.env.TTS_REQUEST_TIMEOUT_MS || 30000);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const text   = (String(req.query.text || "")).trim();
    const format = String(req.query.format || process.env.TTS_DEFAULT_FORMAT || "mp3").toLowerCase();
    const voice  = String(req.query.voice  || process.env.TTS_DEFAULT_VOICE  || "naija_male_warm");

    if (!text) return res.status(400).json({ ok: false, error: "MISSING_TEXT" });

    const url = new URL(PATH, UPSTREAM);
    url.searchParams.set("text", text);
    url.searchParams.set("format", format);
    url.searchParams.set("voice", voice);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

    const up = await fetch(url.toString(), { method: "GET", signal: ctrl.signal });
    clearTimeout(timer);

    if (!up.ok) {
      const body = await up.text().catch(() => "");
      return res.status(502).json({ ok: false, error: "UPSTREAM_FAILED", status: up.status, body });
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", up.headers.get("content-type") || (format === "wav" ? "audio/wav" : "audio/mpeg"));
    up.body?.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: "PROXY_ERROR", message: String(err?.message || err) });
  }
}

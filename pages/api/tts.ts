import type { NextApiRequest, NextApiResponse } from "next";

const BASE = process.env.TTS_API_BASE || "http://tts-api.odia.dev"; // server -> server only
const PATH = "/voice/synthesize";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const method = req.method || "GET";
    if (!["GET","POST"].includes(method)) {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok:false, error:"method_not_allowed" });
    }
    const text   = (method === "POST" ? (req.body?.text ?? "")   : (req.query.text as string)   )?.toString() || "";
    const format = (method === "POST" ? (req.body?.format ?? "") : (req.query.format as string) )?.toString().toLowerCase() || "mp3";

    if (!text) return res.status(400).json({ ok:false, error:"text_required" });
    if (!["mp3","wav"].includes(format)) return res.status(400).json({ ok:false, error:"bad_format" });

    const url = `${BASE}${PATH}?text=${encodeURIComponent(text)}&format=${format}`;
    const upstream = await fetch(url, { method:"GET", cache:"no-store", headers:{ "Accept":"*/*" } });

    if (!upstream.ok) {
      const msg = await upstream.text();
      return res.status(upstream.status).json({ ok:false, error:"tts_upstream_failed", detail: msg.slice(0,500) });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", format === "wav" ? "audio/wav" : "audio/mpeg");
    return res.status(200).send(buf);
  } catch (e:any) {
    return res.status(502).json({ ok:false, error:"tts_proxy_error", detail:String(e?.message||e).slice(0,500) });
  }
}
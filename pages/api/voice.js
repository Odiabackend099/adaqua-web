/* pages/api/voice.js - Server-only TTS (Adaqua), no OS voice */
export const config = { api: { bodyParser: true, sizeLimit: "1mb" } };

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).slice(2);
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok:false, error:"method_not_allowed", requestId });
    }

    const { text, message, voice_id = "naija_male_warm", format = "mp3" } = req.body || {};
    const content = message || text;
    if (!content) {
      return res.status(400).json({ ok:false, error:"text_or_message_required", requestId });
    }

    const base = process.env.ADAQUA_BRAIN_API_URL || process.env.ADAQUA_TTS_BASE;
    const key = process.env.ADAQUA_BRAIN_API_KEY || process.env.ADAQUA_TTS_API_KEY;
    if (!base || !key) {
      return res.status(500).json({ ok:false, error:"missing_adaqua_env", requestId });
    }

    const url = `${base.replace(/\/$/,"")}/voice/synthesize`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15000);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: content, voice_id, format }),
      signal: ac.signal
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      const detail = await resp.text().catch(()=> "");
      throw new Error(`Adaqua TTS failed ${resp.status} ${resp.statusText} ${detail}`);
    }

    const arr = await resp.arrayBuffer();
    const buf = Buffer.from(arr);

    res.setHeader("Content-Type", format === "wav" ? "audio/wav" : "audio/mpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Voice-Engine", "Adaqua");
    res.setHeader("X-Request-Id", requestId);
    return res.status(200).send(buf);

  } catch (err) {
    console.error(`[${requestId}] /api/voice`, err?.message || err);
    return res.status(502).json({ ok:false, error:"voice_failed", requestId });
  }
}
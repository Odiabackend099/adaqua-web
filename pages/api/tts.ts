import type { NextApiRequest, NextApiResponse } from "next";

export const config = { 
  api: { 
    bodyParser: true,
    responseLimit: false 
  } 
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ttsApiUrl = process.env.TTS_API_URL || "https://tts-api.odia.dev";
  const serverToken = process.env.BRAIN_SERVER_TOKEN || "";
  const defaultVoiceId = process.env.NEXT_PUBLIC_VOICE_VOICE_ID || "naija_male_warm";

  try {
    // Handle GET request with text query parameter
    if (req.method === "GET") {
      const text = req.query.text as string;
      if (!text) {
        return res.status(400).json({ ok: false, error: "text parameter required" });
      }

      const response = await fetch(`${ttsApiUrl}/voice/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(serverToken ? { Authorization: `Bearer ${serverToken}` } : {})
        },
        body: JSON.stringify({
          text,
          voice_id: defaultVoiceId,
          format: "mp3"
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 404) {
          return res.status(502).json({ 
            ok: false, 
            error: "tts_endpoint_unknown", 
            message: "TTS endpoint not found. Expected /voice/synthesize on tts-api.odia.dev",
            status: response.status 
          });
        }
        return res.status(502).json({ 
          ok: false, 
          error: "upstream_error", 
          status: response.status,
          detail: errorText.slice(0, 200)
        });
      }

      // Set appropriate content type
      const contentType = response.headers.get("content-type") || "audio/mpeg";
      res.setHeader("Content-Type", contentType);
      
      // Stream the audio data
      const reader = response.body?.getReader();
      if (!reader) {
        return res.status(502).json({ ok: false, error: "no_response_body" });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
      return;
    }

    // Handle POST request with JSON body
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { text, voice_id, format = "mp3" } = body;

      if (!text) {
        return res.status(400).json({ ok: false, error: "text field required" });
      }

      const response = await fetch(`${ttsApiUrl}/voice/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(serverToken ? { Authorization: `Bearer ${serverToken}` } : {})
        },
        body: JSON.stringify({
          text,
          voice_id: voice_id || defaultVoiceId,
          format
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 404) {
          return res.status(502).json({ 
            ok: false, 
            error: "tts_endpoint_unknown", 
            message: "TTS endpoint not found. Expected /voice/synthesize on tts-api.odia.dev",
            status: response.status 
          });
        }
        return res.status(502).json({ 
          ok: false, 
          error: "upstream_error", 
          status: response.status,
          detail: errorText.slice(0, 200)
        });
      }

      // Set appropriate content type
      const contentType = response.headers.get("content-type") || 
        (format === "wav" ? "audio/wav" : "audio/mpeg");
      res.setHeader("Content-Type", contentType);
      
      // Stream the audio data
      const reader = response.body?.getReader();
      if (!reader) {
        return res.status(502).json({ ok: false, error: "no_response_body" });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
      return;
    }

    // Method not allowed
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ ok: false, error: "method_not_allowed" });

  } catch (error: any) {
    console.error("TTS API Error:", error);
    res.status(500).json({ 
      ok: false, 
      error: "server_error", 
      message: error?.message || "Internal server error" 
    });
  }
}

import FormData from "form-data";

export const config = { api: { bodyParser: false } };

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = process.env.OPENAI_STT_MODEL || "whisper-1";

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "method_not_allowed",
        requestId
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "openai_key_missing",
        requestId
      });
    }

    // Collect audio data
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on("end", resolve);
      req.on("error", reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length < 1024) {
      return res.status(400).json({
        error: "audio_too_small",
        size: audioBuffer.length,
        requestId
      });
    }

    console.log(`[${requestId}] Transcribing audio:`, audioBuffer.length, "bytes");

    // Prepare form data for OpenAI
    const form = new FormData();
    form.append("file", audioBuffer, {
      filename: "audio.webm",
      contentType: "audio/webm"
    });
    form.append("model", MODEL);

    // Call OpenAI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders()
        },
        body: form,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[${requestId}] OpenAI error:`, response.status, errorText);

        return res.status(502).json({
          error: "stt_failed",
          status: response.status,
          detail: errorText.slice(0, 400),
          requestId
        });
      }

      const data = await response.json();
      console.log(`[${requestId}] Transcription:`, data.text);

      return res.status(200).json({
        text: data.text || "",
        requestId
      });

    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    console.error(`[${requestId}] STT error:`, error.message);

    return res.status(500).json({
      error: "stt_proxy_error",
      message: process.env.NODE_ENV === "production" ? "internal_error" : error.message,
      requestId
    });
  }
}
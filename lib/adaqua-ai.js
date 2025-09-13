export class AdaquaClient {
  constructor(opts = {}) {
    this.brainBase = (opts.brainBase || process.env.ADAQUA_BRAIN_BASE || "https://brain-api.odia.dev").replace(/\/+$/, "");
    this.ttsBase = (opts.ttsBase || process.env.ADAQUA_TTS_BASE || "https://tts-api.odia.dev").replace(/\/+$/, "");
    this.brainKey = opts.brainKey || process.env.ADAQUA_BRAIN_API_KEY;
    this.ttsKey = opts.ttsKey || process.env.ADAQUA_TTS_API_KEY;
    this.fetchImpl = opts.fetchImpl || globalThis.fetch;

    // Nigerian network optimizations
    this.retryDelays = [250, 500, 1000]; // MTN/Airtel backoff
    this.timeout = opts.timeout || 25000;
  }

  static fromEnv() {
    return new AdaquaClient();
  }

  // Exponential backoff for Nigerian networks
  async retryWithBackoff(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = this.retryDelays[i] || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[ADAQUA] Retry ${i + 1}/${retries} after ${delay}ms - ${error.message}`);
      }
    }
  }

  async chat(message, extra) {
    return await this.retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await this.fetchImpl(`${this.brainBase}/v1/chat`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.brainKey ? { "x-api-key": this.brainKey } : {})
          },
          body: JSON.stringify({ message, ...(extra || {}) }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Brain chat failed: ${response.status}`);
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  async chatAudio(params = {}) {
    return await this.retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await this.fetchImpl(`${this.brainBase}/v1/chat-audio`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.brainKey ? { "x-api-key": this.brainKey } : {})
          },
          body: JSON.stringify({
            voice_id: "naija_male_warm",
            format: "mp3",
            ...params
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chat-audio failed ${response.status}: ${errorText.slice(0, 300)}`);
        }

        return new Uint8Array(await response.arrayBuffer());
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  async tts(text, voice = "naija_male_warm", format = "mp3") {
    if (!this.ttsKey) {
      throw new Error("TTS API key missing - set ADAQUA_TTS_API_KEY");
    }

    return await this.retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await this.fetchImpl(`${this.ttsBase}/v1/tts`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": this.ttsKey
          },
          body: JSON.stringify({ text, voice_id: voice, format }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TTS failed ${response.status}: ${errorText.slice(0, 300)}`);
        }

        return new Uint8Array(await response.arrayBuffer());
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }
}
// Minimal SDK for Adaqua AI (Browser-safe via your server routes; or use server-to-server)
// Usage (server): const adaqua = AdaquaClient.fromEnv();
// Usage (client): call your backend route; DO NOT expose keys here.

export type VoiceId = "naija_male_warm" | "naija_female_warm"; // defaults provided
type AudioFormat = "mp3" | "wav";

export interface AdaquaOptions {
  brainBase?: string;  // default: process.env.ADAQUA_BRAIN_BASE || https://brain-api.odia.dev
  ttsBase?: string;    // default: process.env.ADAQUA_TTS_BASE   || https://tts-api.odia.dev
  brainKey?: string;   // REQUIRED on server when calling protected endpoints
  ttsKey?: string;     // REQUIRED on server for direct TTS (not for browser)
  fetchImpl?: typeof fetch; // for tests
}

export class AdaquaClient {
  private brainBase: string;
  private ttsBase: string;
  private brainKey?: string;
  private ttsKey?: string;
  private f: typeof fetch;

  static fromEnv(): AdaquaClient {
    return new AdaquaClient({
      brainBase: process.env.ADAQUA_BRAIN_BASE || "https://brain-api.odia.dev",
      ttsBase:   process.env.ADAQUA_TTS_BASE   || "https://tts-api.odia.dev",
      brainKey:  process.env.ADAQUA_BRAIN_API_KEY,
      ttsKey:    process.env.ADAQUA_TTS_API_KEY
    });
  }

  constructor(opts: AdaquaOptions = {}) {
    this.brainBase = (opts.brainBase || "https://brain-api.odia.dev").replace(/\/+$/,"");
    this.ttsBase   = (opts.ttsBase   || "https://tts-api.odia.dev").replace(/\/+$/,"");
    this.brainKey  = opts.brainKey;
    this.ttsKey    = opts.ttsKey;
    this.f         = opts.fetchImpl || fetch;
  }

  // === 1) Brain (text) ===
  // POST /v1/chat  -> { reply: string, meta?: any }
  async chat(message: string, extra?: Record<string, any>): Promise<{reply: string; meta?: any}> {
    const url = `${this.brainBase}/v1/chat`;
    const res = await this.f(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.brainKey ? { "x-api-key": this.brainKey } : {})
      },
      body: JSON.stringify({ message, ...(extra||{}) })
    });
    if (!res.ok) throw new Error(`Brain chat failed: ${res.status}`);
    return await res.json();
  }

  // === 2) Chat→Audio (Brain+TTS in one) ===
  // POST /v1/chat-audio  -> audio/mp3|wav (requires BRAIN key)
  async chatAudio(params: {
    text?: string;               // optional if Brain will generate from message/ctx
    message?: string;            // sent to Brain
    voice_id?: VoiceId;          // default: naija_male_warm
    format?: AudioFormat;        // default: mp3
    [k: string]: any;
  }): Promise<Uint8Array> {
    const url = `${this.brainBase}/v1/chat-audio`;
    const res = await this.f(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.brainKey ? { "x-api-key": this.brainKey } : {})
      },
      body: JSON.stringify({
        voice_id: "naija_male_warm",
        format: "mp3",
        ...(params||{})
      })
    });
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`chat-audio failed ${res.status}: ${errTxt.slice(0,300)}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf;
  }

  // === 3) Direct TTS (server-to-server only) ===
  // POST /v1/tts -> audio/mp3|wav  (requires TTS key; do not call from browser)
  async tts(text: string, voice: VoiceId = "naija_male_warm", format: AudioFormat = "mp3"): Promise<Uint8Array> {
    if (!this.ttsKey) throw new Error("TTS key missing (server-only).");
    const url = `${this.ttsBase}/v1/tts`;
    const res = await this.f(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.ttsKey
      },
      body: JSON.stringify({ text, voice_id: voice, format })
    });
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`tts failed ${res.status}: ${errTxt.slice(0,300)}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }
}
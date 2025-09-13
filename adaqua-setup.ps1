# === ADAQUA VOICE ASSISTANT  ONE CLICK FIX & RUN ===
$ErrorActionPreference = 'Stop'; Set-StrictMode -Version Latest
$PROJECT = 'C:\Users\OD~IA\Desktop\Odiadev-2025\projects\voice assistant'
if (-not (Test-Path $PROJECT)) { throw "Project path not found: $PROJECT" }
Set-Location $PROJECT

function Write-File($Path, $Content) {
  $abs = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $PROJECT $Path }
  $dir = Split-Path -Parent $abs
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  try {
    # PowerShell 7+
    Set-Content -Path $abs -Value $Content -Encoding utf8NoBOM
  } catch {
    # Fallback for Windows PowerShell 5.1 (no utf8NoBOM support)
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($abs, $Content, $enc)
  }
}

# 0) Verify Node
try { $v = (node -v).Trim(); Write-Host "[Node] $v" -ForegroundColor Yellow } catch { throw "Install Node 20+ then rerun." }

# 1) Folders
New-Item -ItemType Directory -Force -Path ".\pages\api" | Out-Null
New-Item -ItemType Directory -Force -Path ".\lib" | Out-Null
New-Item -ItemType Directory -Force -Path ".\scripts" | Out-Null

# 2) .gitignore
Write-File ".gitignore" @'
.next
node_modules
.DS_Store
.env
.env.*
!.env.example
.vercel
'@

# 3) env.example (DO NOT COMMIT REAL KEYS)
Write-File ".\env.example" @'
ADAQUA_BRAIN_BASE=https://brain-api.odia.dev
ADAQUA_TTS_BASE=https://tts-api.odia.dev
ADAQUA_BRAIN_API_KEY=YOUR_BRAIN_API_KEY
ADAQUA_TTS_API_KEY=YOUR_TTS_API_KEY
OPENAI_API_KEY=YOUR_OPENAI_KEY
OPENAI_STT_MODEL=whisper-1
NEXT_PUBLIC_DEFAULT_VOICE=naija_male_warm
NEXT_PUBLIC_AUDIO_FORMAT=mp3
'@

# 4) SDK (CommonJS to avoid ESM issues)
Write-File ".\lib\adaqua-ai.js" @'
class AdaquaClient {
  constructor(opts = {}) {
    this.brainBase = (opts.brainBase || process.env.ADAQUA_BRAIN_BASE || "https://brain-api.odia.dev").replace(/\/+$/,"");
    this.ttsBase   = (opts.ttsBase   || process.env.ADAQUA_TTS_BASE   || "https://tts-api.odia.dev").replace(/\/+$/,"");
    this.brainKey  = opts.brainKey || process.env.ADAQUA_BRAIN_API_KEY;
    this.ttsKey    = opts.ttsKey   || process.env.ADAQUA_TTS_API_KEY;
    this.fetchImpl = opts.fetchImpl || globalThis.fetch;
  }
  static fromEnv(){ return new AdaquaClient(); }

  async chat(message, extra) {
    const r = await this.fetchImpl(`${this.brainBase}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(this.brainKey ? { "x-api-key": this.brainKey } : {}) },
      body: JSON.stringify({ message, ...(extra||{}) })
    });
    if(!r.ok) throw new Error(`brain chat ${r.status}`);
    return await r.json();
  }

  async chatAudio(params = {}) {
    const r = await this.fetchImpl(`${this.brainBase}/v1/chat-audio`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(this.brainKey ? { "x-api-key": this.brainKey } : {}) },
      body: JSON.stringify({ voice_id: "naija_male_warm", format: "mp3", ...params })
    });
    if(!r.ok){ const t = await r.text(); throw new Error(`chat-audio ${r.status}: ${t.slice(0,300)}`); }
    return new Uint8Array(await r.arrayBuffer());
  }

  async tts(text, voice="naija_male_warm", format="mp3") {
    if(!this.ttsKey) throw new Error("TTS key missing");
    const r = await this.fetchImpl(`${this.ttsBase}/v1/tts`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.ttsKey },
      body: JSON.stringify({ text, voice_id: voice, format })
    });
    if(!r.ok){ const t = await r.text(); throw new Error(`tts ${r.status}: ${t.slice(0,300)}`); }
    return new Uint8Array(await r.arrayBuffer());
  }
}
module.exports = { AdaquaClient };
'@

# 5) /pages/api/voice.js
Write-File ".\pages\api\voice.js" @'
const { AdaquaClient } = require("../../lib/adaqua-ai");
module.exports.config = { api: { bodyParser: true, sizeLimit: "1mb" } };

module.exports.default = async function handler(req, res){
  try{
    if(req.method !== "POST") return res.status(405).json({ok:false,error:"method_not_allowed"});
    const { text, message, voice_id, format } = (req.body||{});
    if(!text && !message) return res.status(400).json({ok:false,error:"text_or_message_required"});

    const adaqua = AdaquaClient.fromEnv();
    const ac = new AbortController(); const killer = setTimeout(()=>ac.abort(), 25000);

    const audio = await adaqua.chatAudio({
      text, message: message || text, voice_id: voice_id || "naija_male_warm", format: format || "mp3"
    });

    clearTimeout(killer);
    res.setHeader("content-type", (format==="wav") ? "audio/wav" : "audio/mpeg");
    res.setHeader("cache-control","no-store");
    return res.status(200).send(Buffer.from(audio));
  }catch(e){
    return res.status(502).json({ ok:false, error: process.env.NODE_ENV==="production" ? "voice_failed" : (e?.message||"voice_failed") });
  }
}
'@

# 6) /pages/api/transcribe.js (Whisper STT proxy)
Write-File ".\pages\api\transcribe.js" @'
const FormData = require("form-data");
module.exports.config = { api: { bodyParser: false } };
const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const MODEL = process.env.OPENAI_STT_MODEL || "whisper-1";

module.exports.default = async function handler(req, res){
  try{
    if(req.method !== "POST") return res.status(405).json({error:"method_not_allowed"});
    const key = process.env.OPENAI_API_KEY; if(!key) return res.status(500).json({error:"stt_key_missing"});

    const chunks = []; await new Promise((resolve,reject)=>{ req.on("data",c=>chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c))); req.on("end",resolve); req.on("error",reject); });
    const buf = Buffer.concat(chunks); if(buf.length < 1024) return res.status(400).json({error:"audio_too_small"});

    const form = new FormData(); form.append("file", buf, { filename:"audio.webm", contentType:"audio/webm" }); form.append("model", MODEL);
    const ac = new AbortController(); const to = setTimeout(()=>ac.abort(),60000);
    const r = await fetch(OPENAI_URL, { method:"POST", headers:{ Authorization:`Bearer ${key}`, ...form.getHeaders() }, body: form, signal: ac.signal }).finally(()=>clearTimeout(to));
    if(!r.ok){ const t = await r.text().catch(()=>"" ); return res.status(502).json({error:"stt_failed", status:r.status, detail:t.slice(0,400)}); }
    const data = await r.json().catch(()=>({})); return res.status(200).json({ text: data.text || "" });
  }catch(e){ return res.status(500).json({error:"stt_proxy_error", message: process.env.NODE_ENV==="production"?"internal_error":(e?.message||"unknown")}); }
}
'@

# 7) Test page
Write-File ".\pages\real-test.jsx" @'
import { useState } from "react";
export default function RealTest(){
  const [loading,setLoading]=useState(false);
  async function play(text){
    setLoading(true);
    try{
      const r = await fetch("/api/voice",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text,voice_id:"naija_male_warm",format:"mp3"})});
      if(!r.ok) throw new Error("voice failed");
      const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = new Audio(url); await a.play();
    } finally { setLoading(false); }
  }
  return <main style={{padding:24,fontFamily:"system-ui"}}>
    <h1>Adaqua AI  Real Test</h1>
    <button onClick={()=>play("Lagos fam, we move!")} disabled={loading} style={{padding:"10px 16px"}}>Test Voice API</button>
  </main>;
}
'@

# 8) package.json  write a clean, BOM-free file (replace if exists)
Write-File ".\package.json" @'
{
  "name": "adaqua-voice-assistant",
  "version": "1.0.0",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "form-data": "4.0.0",
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
'@

# 9) next.config.js
if (-not (Test-Path ".\next.config.js")) {
  Write-File ".\next.config.js" @'
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = nextConfig;
'@
}

# 10) Install deps
npm install | Write-Host

# 11) Helpful smoke script
Write-File ".\scripts\smoke-voice.ps1" @'
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/voice -ContentType "application/json" -Body (@{ text="Lagos fam, we move!"; voice_id="naija_male_warm"; format="mp3"} | ConvertTo-Json -Compress) -OutFile out.mp3
Write-Host ("MP3 size: " + (Get-Item .\out.mp3).Length + " bytes")
'@

Write-Host "`n==> Starting dev server (http://localhost:3000/real-test) ..." -ForegroundColor Green
npm run dev

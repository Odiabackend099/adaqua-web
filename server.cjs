// STRICT: no fallback, only proxy to OpenAI TTS. Any failure => 502 JSON.
const http  = require('http');
const https = require('https');

const PORT    = Number(process.env.PORT || 8080);
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL   = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const VOICE   = 'alloy';
const DEFAULT_FORMAT = (process.env.DEFAULT_FORMAT || 'mp3').toLowerCase();

function sendJSON(res, code, obj){
  res.writeHead(code, {'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(obj));
}
function cors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
}
function readJSON(req, limit=1024*64){
  return new Promise((resolve,reject)=>{
    let n=0, bufs=[];
    req.on('data',c=>{ n+=c.length; if(n>limit){ reject(new Error('body_too_large')); req.destroy(); } else bufs.push(c);});
    req.on('end',()=>{ if(!bufs.length) return resolve({}); try{ resolve(JSON.parse(Buffer.concat(bufs).toString('utf8')));}catch{ reject(new Error('bad_json')); }});
    req.on('error',reject);
  });
}
function ttsRequest({ text, format }) {
  return new Promise((resolve,reject)=>{
    const payload = JSON.stringify({ model: MODEL, input: text, voice: VOICE, format: (format==='wav'?'wav':'mp3') });
    const req = https.request({
      hostname:'api.openai.com', path:'/v1/audio/speech', method:'POST',
      headers:{ 'Authorization':`Bearer ${API_KEY}`, 'Content-Type':'application/json' }
    }, r=>{
      const chunks=[]; r.on('data',d=>chunks.push(d)); r.on('end',()=> {
        if (r.statusCode !== 200) return reject(new Error(`upstream_${r.statusCode}`));
        resolve(Buffer.concat(chunks));
      });
    });
    req.on('error',reject);
    req.write(payload); req.end();
  });
}

const server = http.createServer(async (req,res)=>{
  cors(res);
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'OPTIONS') return res.end();

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJSON(res, 200, { ok:true, service:'odiadev-tts', model:MODEL, port:PORT, ts:Date.now() });
    }

    if (url.pathname === '/voice/synthesize') {
      let text, format = DEFAULT_FORMAT;
      if (req.method === 'GET') {
        text = (url.searchParams.get('text') || '').toString().trim();
        format = (url.searchParams.get('format') || DEFAULT_FORMAT).toLowerCase();
      } else if (req.method === 'POST') {
        const body = await readJSON(req);
        text = (body.text || body.message || '').toString().trim();
        format = (body.format || DEFAULT_FORMAT).toLowerCase();
      } else {
        return sendJSON(res, 405, { ok:false, error:'method_not_allowed' });
      }
      if (!text) return sendJSON(res, 400, { ok:false, error:'text_required' });
      if (text.length > 1000) return sendJSON(res, 413, { ok:false, error:'text_too_long' });

      try {
        const audio = await ttsRequest({ text, format });
        const ct = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control':'no-store' });
        return res.end(audio);
      } catch (e) {
        return sendJSON(res, 502, { ok:false, error:'upstream_failed' });
      }
    }

    return sendJSON(res, 404, { ok:false, error:'not_found' });
  } catch (e) {
    return sendJSON(res, 500, { ok:false, error:'server_error' });
  }
});

if (!API_KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }
server.listen(PORT, ()=> console.log(`ODIADEV TTS listening on ${PORT}`));

export const runtime = "nodejs";
export async function POST(req: Request){
  try{
    const base  = process.env.BRAIN_API_URL || process.env.NEXT_PUBLIC_BRAIN_API_URL!;
    const token = process.env.BRAIN_SERVER_TOKEN || process.env.NEXT_PUBLIC_BRAIN_PUBLIC_TOKEN || "";
    const { text, message, voice_id = process.env.NEXT_PUBLIC_VOICE_VOICE_ID || "naija_male_warm", format="mp3" } = await req.json();
    const content = message||text; if(!content) return new Response(JSON.stringify({ok:false,error:"text_required"}),{status:400,headers:{'content-type':'application/json'}});
    const up = await fetch(`${base}/voice/synthesize`,{
      method:"POST", headers:{ "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) },
      body: JSON.stringify({ text: content, voice_id, format })
    });
    if(!up.ok || !up.body){ const d = await up.text().catch(()=> ""); return new Response(JSON.stringify({ok:false,error:"upstream_failed",status:up.status,detail:d.slice(0,1000)}),{status:502,headers:{'content-type':'application/json'}}); }
    const ct = up.headers.get("content-type") || (format==="wav"?"audio/wav":"audio/mpeg");
    return new Response(up.body, { headers: { "Content-Type": ct }});
  }catch(e:any){ return new Response(JSON.stringify({ok:false,error:e?.message||"server_error"}),{status:500,headers:{'content-type':'application/json'}}); }
}

export const runtime = "nodejs";
export async function POST(req: Request){
  const enc = new TextEncoder();
  const { user, history = [] } = await req.json().catch(()=>({}));
  const key = process.env.OPENAI_API_KEY;
  const stream = new ReadableStream({
    async start(controller){
      const send = (o:any)=>controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      const end = ()=>controller.close();
      try{
        if(!key){
          for (const p of ["Im online. ","You can speak continuously; ","Ill answer and play audio. "]){
            send({delta:p}); await new Promise(r=>setTimeout(r,250));
          }
          return end();
        }
        const resp = await fetch("https://api.openai.com/v1/chat/completions",{
          method:"POST",
          headers:{ Authorization:`Bearer ${key}`, "Content-Type":"application/json" },
          body: JSON.stringify({ model:"gpt-4o-mini", stream:true, messages:[{role:"system",content:"You are Adaqua. Be concise and conversational."},...history,{role:"user",content:String(user||"")}] })
        });
        if(!resp.ok || !resp.body){ send({error:`LLM upstream ${resp.status}`}); return end(); }
        const reader = (resp.body as any).getReader(); const dec = new TextDecoder();
        while(true){
          const {done,value}=await reader.read(); if(done) break;
          const text = dec.decode(value,{stream:true});
          for(const line of text.split(/\r?\n/)){ if(!line.startsWith("data:")) continue;
            const payload=line.slice(5).trim(); if(payload==="[DONE]"){ end(); return; }
            try{ const j=JSON.parse(payload); const d=j.choices?.[0]?.delta?.content; if(d) send({delta:d}); }catch{}
          }
        }
        end();
      }catch(e:any){ send({error:e?.message||"server_error"}); end(); }
    }
  });
  return new Response(stream,{ headers:{ "Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive"}});
}

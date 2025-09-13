import { useState, useRef, useEffect } from "react";

export default function AdaquaVoiceAssistant(){
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [isRecording,setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // Hard-block any accidental Windows/OS voice usage
  useEffect(()=>{
    try{
      if(typeof window !== "undefined" && "speechSynthesis" in window){
        window.speechSynthesis.cancel();
        const noop = () => console.warn("[BLOCKED] speechSynthesis.speak  server TTS only.");
        try{ Object.defineProperty(window.speechSynthesis,"speak",{ value: noop }); }catch{}
      }
    }catch{}
  },[]);

  async function playServerVoice(text){
    setLoading(true); setError(""); setSuccess("");
    try{
      const r = await fetch("/api/voice",{
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ text, voice_id:"naija_male_warm", format:"mp3" })
      });
      if(!r.ok){ const e = await r.json().catch(()=> ({})); throw new Error(e.error || `Voice API failed: ${r.status}`); }
      const ct = r.headers.get("content-type") || "";
      if(!ct.includes("audio/")) throw new Error("Server did not return audio");
      const blob = await r.blob();
      await new Audio(URL.createObjectURL(blob)).play();
      setSuccess(`Adaqua voice OK  ${Math.round(blob.size/1024)} KB`);
    }catch(e){ setError(`Voice failed: ${e.message}`); }
    finally{ setLoading(false); }
  }

  async function startRecording(){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      audioChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream,{ mimeType:"audio/webm;codecs=opus" });
      mediaRecorder.current.ondataavailable = ev => { if(ev.data.size>0) audioChunks.current.push(ev.data); };
      mediaRecorder.current.onstop = async ()=>{
        const blob = new Blob(audioChunks.current,{ type:"audio/webm" });
        await transcribeAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.current.start(100);
      setIsRecording(true); setError("");
    }catch(e){ setError(`Recording failed: ${e.message}`); }
  }
  function stopRecording(){ if(mediaRecorder.current && isRecording){ mediaRecorder.current.stop(); setIsRecording(false); } }

  async function transcribeAudio(audioBlob){
    setLoading(true); setError(""); setSuccess("");
    try{
      const fd = new FormData();
      fd.append("audio", new File([audioBlob], "recording.webm", { type:"audio/webm" }));
      const r = await fetch("/api/transcribe",{ method:"POST", body: fd });
      if(!r.ok){ const e = await r.json().catch(()=> ({})); throw new Error(e.error || `Transcription failed: ${r.status}`); }
      const data = await r.json();
      if(data.text){
        setSuccess(`Heard: "${data.text}"`);
        await playServerVoice(`You said: ${data.text}`);
      }else{ setError("No speech detected"); }
    }catch(e){ setError(`Transcription failed: ${e.message}`); }
    finally{ setLoading(false); }
  }

  const btn = { padding:"14px 24px", margin:"8px", border:"none", borderRadius:"8px",
    fontSize:"16px", fontWeight:600, cursor: loading?"not-allowed":"pointer",
    transition:"all .2s", boxShadow:"0 2px 4px rgba(0,0,0,.1)" };
  const primary = { ...btn, backgroundColor: loading?"#9bbcf5":"#0070f3", color:"#fff" };
  const successBtn = { ...btn, backgroundColor: loading?"#9fe0b4":"#28a745", color:"#fff" };
  const recordBtn = { ...btn, backgroundColor: isRecording?"#dc3545":"#17a2b8", color:"#fff" };

  return (
    <div style={{ padding:"40px", fontFamily:"system-ui,-apple-system,Segoe UI,sans-serif", maxWidth:900, margin:"0 auto", background:"#f8f9fa", minHeight:"100vh" }}>
      <header style={{ textAlign:"center", marginBottom:40 }}>
        <h1 style={{ color:"#0070f3", fontSize:"2.4rem", marginBottom:8, fontWeight:800 }}>Adaqua Voice Assistant</h1>
        <p style={{ color:"#666", fontSize:"1.05rem", margin:0 }}>Server audio only  Windows voice blocked.</p>
      </header>

      <section style={{ background:"#fff", padding:30, borderRadius:12, marginBottom:30, boxShadow:"0 4px 6px rgba(0,0,0,.1)" }}>
        <h2 style={{ marginBottom:20, color:"#333" }}>Voice Synthesis</h2>
        <div style={{ display:"flex", flexWrap:"wrap" }}>
          <button style={primary} onClick={()=>playServerVoice("Lagos fam, we dey move together! How far?")} disabled={loading}>Test Pidgin</button>
          <button style={primary} onClick={()=>playServerVoice("Welcome to Adaqua AI, your intelligent Nigerian voice assistant.")} disabled={loading}>Test English</button>
          <button style={successBtn} onClick={()=>playServerVoice("Sannu da zuwa, barka da safiya.")} disabled={loading}>Test Hausa</button>
          <button style={successBtn} onClick={()=>playServerVoice("Ndewo, kedu ka i mere? Adaqua AI na-ekele gi.")} disabled={loading}>Test Igbo</button>
        </div>
      </section>

      <section style={{ background:"#fff", padding:30, borderRadius:12, marginBottom:30, boxShadow:"0 4px 6px rgba(0,0,0,.1)" }}>
        <h2 style={{ marginBottom:20, color:"#333" }}>Speech-to-Text</h2>
        <button style={recordBtn} onClick={isRecording?stopRecording:startRecording} disabled={loading}>
          {isRecording? " Stop Recording":" Start Recording"}
        </button>
        {isRecording && (
          <div style={{ marginTop:16, padding:12, background:"#fff3cd", border:"2px solid #ffc107", borderRadius:8, color:"#856404", fontWeight:600 }}>
            Recording... Speak now!
          </div>
        )}
      </section>

      {loading && (<div style={{ padding:20, background:"#e3f2fd", border:"2px solid #2196f3", borderRadius:8, marginBottom:20, color:"#1565c0", fontWeight:600, textAlign:"center" }}>
        Processing...
      </div>)}

      {error && (<div style={{ padding:20, background:"#ffebee", border:"2px solid #f44336", borderRadius:8, marginBottom:20, color:"#c62828", fontWeight:600 }}>
        {error}
      </div>)}

      {success && (<div style={{ padding:20, background:"#e8f5e9", border:"2px solid #4caf50", borderRadius:8, marginBottom:20, color:"#2e7d32", fontWeight:600 }}>
        {success}
      </div>)}
    </div>
  );
}
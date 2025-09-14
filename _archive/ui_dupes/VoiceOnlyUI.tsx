import React, { useEffect, useRef, useState } from "react";
import { speakViaBrain, unlockAudio } from "../lib/brainTts";

type Mode = "idle" | "listening" | "thinking" | "speaking";

const useSpeech = () => {
  const SR: any = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const recognition = React.useRef<any>(null);
  const [supported] = useState<boolean>(!!SR);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");

  useEffect(() => {
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let i = "", f = "";
      for (let r = e.resultIndex; r < e.results.length; r++) {
        const res = e.results[r];
        if (res.isFinal) f += res[0].transcript;
        else i += res[0].transcript;
      }
      setInterim(i);
      if (f) setFinalText(prev => (prev ? prev + " " : "") + f.trim());
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    return () => rec.abort();
  }, []);

  const start = () => { if (recognition.current && !listening) { setFinalText(""); setInterim(""); recognition.current.start(); setListening(true); } };
  const stop  = () => { if (recognition.current &&  listening) { recognition.current.stop(); setListening(false); } };

  return { supported, listening, interim, finalText, start, stop, setFinalText, setInterim };
};

export default function VoiceOnlyUI() {
  const { supported, listening, interim, finalText, start, stop, setFinalText, setInterim } = useSpeech();
  const [mode, setMode] = useState<Mode>("idle");
  const ttsRef = useRef<HTMLAudioElement | null>(null);
  const autoContinue = true;

  async function converseOnce(text: string) {
    setMode("thinking");
    if (ttsRef.current) { ttsRef.current.pause(); ttsRef.current.currentTime = 0; }

    // stream reply
    let reply = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: text })
      });
      const reader = res.body?.getReader(); const decoder = new TextDecoder();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try { const j = JSON.parse(payload); if (j.delta) reply += j.delta; } catch {}
        }
      }
    } catch (e) {
      console.error("chat stream error:", e);
    }

    setMode("speaking");
    const spoken = (reply.trim() || "Okay.");
    try {
      await unlockAudio(); // ensure playback allowed
      const { audio, play } = await speakViaBrain(spoken);
      ttsRef.current = audio;
      await play();
    } catch (e) {
      console.error("TTS error:", e);
      alert("Could not play audio. Check the Console for details (maybe autoplay was blocked or TTS failed).");
    }

    if (autoContinue) { setMode("listening"); setFinalText(""); setInterim(""); start(); }
    else { setMode("idle"); }
  }

  useEffect(() => { if (!listening && finalText) { converseOnce(finalText); } }, [listening]);

  const toggleMic = async () => {
    if (!supported) { alert("Microphone not supported here. Use Chrome/Edge on desktop."); return; }
    // Unlock audio on the user click
    await unlockAudio();
    if (mode === "speaking" && ttsRef.current) { ttsRef.current.pause(); }
    if (listening) { stop(); setMode("thinking"); } else { setMode("listening"); start(); }
  };

  const stopAll = () => {
    stop();
    if (ttsRef.current) { ttsRef.current.pause(); ttsRef.current.currentTime = 0; }
    setMode("idle"); setFinalText(""); setInterim("");
  };

  // minimal styles are loaded via styles/voice.css
  const orbClass = `orb ${listening ? "listening" : (mode === "speaking" ? "speaking" : "")}`;

  return (
    <div className="voice-shell">
      <button aria-label="Settings" className="settings" title="Settings"></button>
      <div className={orbClass}></div>
      <div className="controls">
        <button onClick={toggleMic} aria-label="Mic" className="btn" title="Mic"></button>
        <button onClick={stopAll} aria-label="Cancel" className="btn" title="Stop"></button>
      </div>
      <div className="info">{interim || finalText || (mode === "idle" ? "Tap mic to speak" : mode)}</div>
    </div>
  );
}

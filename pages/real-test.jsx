import { useState, useRef } from "react";

export default function RealTest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // Test voice synthesis
  async function testVoice(text) {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: "naija_male_warm",
          format: "mp3"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Voice API failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      await audio.play();
      setSuccess(` Voice synthesis successful! Audio size: ${audioBlob.size} bytes`);
      
    } catch (err) {
      console.error("Voice test error:", err);
      setError(` Voice test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Start recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus"
      });
      
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setError("");
      
    } catch (err) {
      setError(` Recording failed: ${err.message}`);
    }
  }

  // Stop recording
  function stopRecording() {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }

  // Transcribe audio
  async function transcribeAudio(audioBlob) {
    setLoading(true);
    
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: audioBlob,
        headers: {
          "Content-Type": "audio/webm"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Transcription failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.text) {
        setSuccess(` Transcribed: "${data.text}"`);
        // Auto-generate voice response
        await testVoice(data.text);
      } else {
        setError(" No speech detected in audio");
      }
      
    } catch (err) {
      console.error("Transcription error:", err);
      setError(` Transcription failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const buttonStyle = {
    padding: "12px 20px",
    margin: "8px",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    fontWeight: "500"
  };

  const voiceButtonStyle = {
    ...buttonStyle,
    backgroundColor: loading ? "#ccc" : "#4CAF50",
    color: "white"
  };

  const recordButtonStyle = {
    ...buttonStyle,
    backgroundColor: isRecording ? "#f44336" : "#2196F3",
    color: "white"
  };

  return (
    <main style={{ 
      padding: "32px", 
      fontFamily: "system-ui, -apple-system, sans-serif",
      maxWidth: "800px",
      margin: "0 auto"
    }}>
      <h1 style={{ color: "#333", marginBottom: "8px" }}>
         Adaqua Voice Assistant
      </h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>
        Nigerian-optimized voice AI with MTN/Airtel network resilience
      </p>

      <div style={{ marginBottom: "24px" }}>
        <h3> Voice Synthesis Test</h3>
        <button 
          onClick={() => testVoice("Lagos fam, we dey move together!")} 
          disabled={loading}
          style={voiceButtonStyle}
        >
          {loading ? "Generating..." : "Test Nigerian Voice"}
        </button>
        
        <button 
          onClick={() => testVoice("Welcome to Adaqua AI, your intelligent voice assistant optimized for Nigeria.")} 
          disabled={loading}
          style={voiceButtonStyle}
        >
          Test English Voice
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h3> Speech-to-Text Test</h3>
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          style={recordButtonStyle}
        >
          {isRecording ? " Stop Recording" : " Start Recording"}
        </button>
        {isRecording && (
          <p style={{ color: "#f44336", fontWeight: "500" }}>
             Recording... Speak now!
          </p>
        )}
      </div>

      {/* Status Messages */}
      {loading && (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#fff3cd", 
          border: "1px solid #ffeaa7",
          borderRadius: "6px",
          marginBottom: "16px"
        }}>
           Processing... (Optimized for Nigerian networks)
        </div>
      )}

      {error && (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#f8d7da", 
          border: "1px solid #f5c6cb",
          borderRadius: "6px",
          marginBottom: "16px",
          color: "#721c24"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#d4edda", 
          border: "1px solid #c3e6cb",
          borderRadius: "6px",
          marginBottom: "16px",
          color: "#155724"
        }}>
          {success}
        </div>
      )}

      <div style={{ 
        marginTop: "32px", 
        padding: "16px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "6px" 
      }}>
        <h4> Setup Instructions</h4>
        <ol style={{ paddingLeft: "20px" }}>
          <li>Copy <code>.env.example</code> to <code>.env</code></li>
          <li>Add your Adaqua API keys</li>
          <li>Add your OpenAI API key for speech recognition</li>
          <li>Test with the buttons above</li>
        </ol>
        
        <h4 style={{ marginTop: "16px" }}> Nigerian Optimizations</h4>
        <ul style={{ paddingLeft: "20px" }}>
          <li>3-tier exponential backoff (250ms/500ms/1000ms)</li>
          <li>25-second timeouts for slow connections</li>
          <li>Request ID tracking for debugging</li>
          <li>Conservative 1MB payload limits</li>
          <li>Audio caching for repeat requests</li>
        </ul>
      </div>
    </main>
  );
}
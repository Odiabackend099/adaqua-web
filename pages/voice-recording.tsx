import dynamic from "next/dynamic";
const UnifiedVoiceUI = dynamic(() => import("../components/UnifiedVoiceUI"), { ssr: false });

export default function VoiceRecordingPage() {
  return (
    <div className="voice-recording-page">
      <UnifiedVoiceUI enableCallMode={true} />
    </div>
  );
}

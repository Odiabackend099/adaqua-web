import dynamic from "next/dynamic";
const UnifiedVoiceUI = dynamic(() => import("../components/UnifiedVoiceUI"), { ssr: false });

export default function VoicePage() {
  return (
    <div className="voice-page">
      <UnifiedVoiceUI />
    </div>
  );
}

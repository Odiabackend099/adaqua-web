import dynamic from "next/dynamic";
const VoiceUI = dynamic(() => import("../components/VoiceUI"), { ssr: false });

export default function VoicePage() {
  return (
    <div className="voice-page">
      <VoiceUI />
    </div>
  );
}

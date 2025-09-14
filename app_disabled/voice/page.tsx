"use client";
import dynamic from "next/dynamic";
const UnifiedVoiceUI = dynamic(() => import("../../components/UnifiedVoiceUI"), { ssr: false });

export default function Page() {
  return <UnifiedVoiceUI />;
}

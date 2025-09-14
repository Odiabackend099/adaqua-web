"use client";
import dynamic from "next/dynamic";
const VoiceOnlyUI = dynamic(() => import("../../components/VoiceOnlyUI"), { ssr: false });

export default function Page() {
  return <VoiceOnlyUI />;
}

"use client";

import React, { useEffect, useState } from 'react';
import { Pause, X } from 'lucide-react';

// Design tokens from the JSON spec
const designTokens = {
  colors: {
    bg_primary: "#0A0D12",
    text_primary: "#E6E8EC",
    text_muted: "#C7CBD2",
    glow_blue_1: "#88B3FF",
    glow_blue_2: "#3E6BFF",
    glow_blue_3: "#1B2A44",
    button_red: "#E5463C",
    button_red_shadow: "rgba(229,70,60,0.35)",
    button_neutral: "rgba(255,255,255,0.10)",
    icon_on_dark: "#FFFFFF",
    divider: "rgba(255,255,255,0.08)"
  },
  shadows: {
    soft: "0 6px 24px rgba(0,0,0,0.35)",
    glow_blue: "0 0 80px rgba(62,107,255,0.65)"
  },
  typography: {
    family_primary: "'SF Pro Display', Inter, system-ui, sans-serif"
  }
};

interface VoiceCallUIProps {
  isVisible: boolean;
  isHolding: boolean;
  isSpeaking?: boolean;
  onHold: () => void;
  onEnd: () => void;
  className?: string;
}

export default function VoiceCallUI({ 
  isVisible, 
  isHolding, 
  isSpeaking = false, 
  onHold, 
  onEnd, 
  className = '' 
}: VoiceCallUIProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 ${className}`}
      style={{
        backgroundColor: designTokens.colors.bg_primary,
        fontFamily: designTokens.typography.family_primary
      }}
    >
      {/* Status Bar Area */}
      <div className="absolute top-0 left-0 right-0 h-[5.5vh] bg-transparent" />

      {/* Live Title */}
      <div 
        className="absolute text-center font-semibold text-sm tracking-wide"
        style={{
          top: '7.5%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: designTokens.colors.text_muted
        }}
      >
        Live
      </div>

      {/* Bottom Glow */}
      <div 
        className={`absolute left-0 right-0 bottom-0 transition-all duration-700 ${
          isSpeaking ? 'animate-pulse' : ''
        }`}
        style={{
          height: '28%',
          background: `radial-gradient(ellipse 120% 120% at 50% 96%, 
            ${designTokens.colors.glow_blue_1} 0%, 
            ${designTokens.colors.glow_blue_2} 35%, 
            ${designTokens.colors.glow_blue_3} 65%, 
            ${designTokens.colors.bg_primary} 100%)`
        }}
      />

      {/* Speaking Animation Overlay */}
      {isSpeaking && (
        <div 
          className="absolute left-0 right-0 bottom-0 animate-speaking-glow"
          style={{
            height: '28%',
            background: `radial-gradient(ellipse 120% 120% at 50% 96%, 
              ${designTokens.colors.glow_blue_1}99 0%, 
              ${designTokens.colors.glow_blue_2}CC 35%, 
              transparent 65%)`
          }}
        />
      )}

      {/* Controls Bar */}
      <div 
        className="absolute flex items-center justify-between px-8"
        style={{
          bottom: '7%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70%',
          height: '12%'
        }}
      >
        {/* Hold Button */}
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={onHold}
            className={`
              flex items-center justify-center rounded-full transition-all duration-200
              ${isHolding ? 'bg-red-500' : 'bg-white/10'}
              hover:scale-105 active:scale-95
            `}
            style={{
              width: '16vw',
              height: '16vw',
              maxWidth: '80px',
              maxHeight: '80px',
              minWidth: '60px',
              minHeight: '60px',
              boxShadow: designTokens.shadows.soft
            }}
            aria-label="Hold call"
          >
            <Pause 
              size={22} 
              color={designTokens.colors.icon_on_dark}
              className={isHolding ? 'text-white' : ''}
            />
          </button>
          <span 
            className="text-xs font-medium"
            style={{ color: designTokens.colors.text_muted }}
          >
            {isHolding ? 'Resume' : 'Hold'}
          </span>
        </div>

        {/* End Button */}
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={onEnd}
            className="
              flex items-center justify-center rounded-full transition-all duration-200
              hover:scale-105 active:scale-95
            "
            style={{
              width: '16vw',
              height: '16vw',
              maxWidth: '80px',
              maxHeight: '80px',
              minWidth: '60px',
              minHeight: '60px',
              backgroundColor: designTokens.colors.button_red,
              boxShadow: `${designTokens.shadows.soft}, 0 0 20px ${designTokens.colors.button_red_shadow}`
            }}
            aria-label="End call"
          >
            <X 
              size={22} 
              color={designTokens.colors.icon_on_dark}
            />
          </button>
          <span 
            className="text-xs font-medium"
            style={{ color: designTokens.colors.text_muted }}
          >
            End
          </span>
        </div>
      </div>

      {/* Home Indicator */}
      <div 
        className="absolute rounded-full"
        style={{
          bottom: '2.5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '20%',
          height: '0.8%',
          minHeight: '4px',
          backgroundColor: 'rgba(255,255,255,0.20)'
        }}
      />

      {/* Custom CSS for speaking animation */}
      <style jsx>{`
        @keyframes speaking-glow {
          0% { 
            transform: scaleY(1); 
            filter: blur(0px); 
            opacity: 0.8;
          }
          50% { 
            transform: scaleY(1.06); 
            filter: blur(2px); 
            opacity: 1;
          }
          100% { 
            transform: scaleY(1); 
            filter: blur(0px); 
            opacity: 0.8;
          }
        }
        
        .animate-speaking-glow {
          animation: speaking-glow 1.4s ease-in-out infinite;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-speaking-glow {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
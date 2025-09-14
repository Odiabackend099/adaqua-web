# Voice Assistant Product Requirements Document

## Goal
Ship a hands-free conversational UI that works like ChatGPT Voice Mode: one click to start, continuous back-and-forth voice conversation, one click to stop. The UI is minimal (orb + mic + stop). The AI Assistant is the real product; the UI is just the shell.

## Non-Goals
- Complex UI animations or transitions
- Multiple voice options (default to Nigerian English)
- Offline functionality
- Mobile app (web-first)
- Voice training or customization

## Personas
- **Primary**: Austyn - Developer who needs a working voice assistant for testing and development
- **Secondary**: End users who want hands-free AI interaction

## User Flow
1. User visits `/voice` page
2. User clicks microphone button once
3. User speaks naturally ("Hello, how are you?")
4. Assistant processes speech and responds with audio
5. User can interrupt assistant by speaking (barge-in)
6. Conversation continues automatically
7. User clicks stop button to end session

## Audio UX Requirements
- **Barge-in**: If user starts speaking while assistant is speaking, stop current audio within 300ms and start listening
- **Playback retry**: If audio fails to play, attempt unlock and retry once
- **Visible state**: Clear indicators for "listening", "thinking", "speaking", "idle"
- **Autoplay unlock**: Handle browser autoplay restrictions with silent oscillator

## Error UX
- **Microphone denied**: Show toast with steps to enable microphone permissions
- **TTS failures**: Show error message and retry guidance
- **SSE connection drops**: Attempt reconnection with exponential backoff
- **Network errors**: Graceful degradation with user feedback

## Internationalization
- **Default**: Nigerian English (`naija_male_warm` voice, `en-NG` language preference)
- **Fallback**: Use `en-US` for Web Speech API (most reliable)
- **Configurable**: Via environment variables

## Observability
- **Development**: Console logs for debugging
- **Network**: Monitor API response times and failures
- **Performance**: Simple timing for STT → Chat → TTS pipeline
- **User feedback**: Toast notifications for errors

## Technical Architecture
- **Pages Router**: Use Next.js Pages Router (avoid App Router issues)
- **STT**: Web Speech API with pluggable interface for future server STT
- **Turn taking**: VAD-lite using SpeechRecognition finalization
- **Chat**: Server-Sent Events (SSE) for streaming responses
- **TTS**: Local proxy to Austyn's TTS service
- **Security**: All external API calls through server proxies

## Success Criteria
- One-click start/stop functionality
- Continuous conversation loop
- Barge-in working within 300ms
- No secrets in git history
- Works on Windows + Chrome latest
- Graceful handling of missing API keys

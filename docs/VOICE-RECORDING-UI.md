# Voice Recording UI

A modern, responsive voice recording interface designed for Nigerian network conditions with optimized performance and battery efficiency.

## Features

### 🎨 Design
- **Dark gradient background** (black to dark gray)
- **Animated audio wave visualization** with breathing pulse effect
- **Circular control buttons** with hover animations
- **Responsive design** optimized for mobile, tablet, and desktop

### 🎯 Functionality
- **Start/Stop recording** with visual feedback
- **Pause/Resume** functionality
- **Real-time status messages**
- **Error handling** with retry logic
- **Voice Activity Detection (VAD)** for automatic speech detection

### 📱 Responsive Design
- **Mobile (≤480px)**: Smaller buttons (50px), reduced padding (15px)
- **Tablet (≤768px)**: Medium buttons (70px), increased padding (25px)
- **Desktop (>768px)**: Full-size buttons (60px), standard padding (20px)

### ⚡ Performance Optimizations
- **Hardware-accelerated animations** using CSS transforms
- **Reduced motion support** for accessibility
- **Minimal data consumption** with SVG icons only
- **Battery-friendly** reduced animation frequency
- **Low-end device support** with fallback states

## Components

### VoiceRecordingUI
Main container component that orchestrates the entire interface.

**Props:**
- `phase`: Current voice state ('idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error')
- `statusMessage`: Display message for current state
- `onStart`: Callback for start action
- `onStop`: Callback for stop action
- `onPause`: Callback for pause/resume action
- `onResume`: Callback for resume action

### AudioWaveVisualization
Animated wave component that shows voice activity.

**Features:**
- Breathing pulse animation during listening
- Thinking pulse animation during processing
- Speaking pulse animation during audio playback
- Paused glow effect when paused
- Error pulse animation for error states

### ControlPanel
Bottom control panel with pause and stop buttons.

**Features:**
- Dynamic pause/play button (changes based on state)
- Stop button (disabled when idle)
- Status message display
- Hover animations with scale feedback

## Usage

### Basic Usage
```tsx
import VoiceRecordingUI from '../components/VoiceRecordingUI';

function MyPage() {
  const [phase, setPhase] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('Tap to start');

  return (
    <VoiceRecordingUI
      phase={phase}
      statusMessage={statusMessage}
      onStart={() => setPhase('listening')}
      onStop={() => setPhase('idle')}
      onPause={() => setPhase('paused')}
      onResume={() => setPhase('listening')}
    />
  );
}
```

### With Voice Assistant Integration
```tsx
import VoiceRecordingUI from '../components/VoiceRecordingUI';

function VoicePage() {
  const [phase, setPhase] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('Tap to start');

  const handleStart = async () => {
    // Your voice assistant start logic
    setPhase('listening');
    setStatusMessage('Listening...');
  };

  const handleStop = () => {
    // Your voice assistant stop logic
    setPhase('idle');
    setStatusMessage('Tap to start');
  };

  return (
    <VoiceRecordingUI
      phase={phase}
      statusMessage={statusMessage}
      onStart={handleStart}
      onStop={handleStop}
      onPause={handlePause}
      onResume={handleResume}
    />
  );
}
```

## CSS Variables

The UI uses CSS custom properties for easy theming:

```css
:root {
  --primary-blue: #0066ff;
  --secondary-blue: #4da6ff;
  --danger-red: #ff4444;
  --bg-dark: #000000;
  --bg-medium: #1a1a1a;
  --white: #ffffff;
  --transparent-white: rgba(255, 255, 255, 0.2);
  --button-size: 60px;
  --wave-height: 60px;
  --control-panel-padding: 20px;
}
```

## Animations

### Breathing Pulse (Listening)
```css
@keyframes breathing-pulse {
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.6; transform: scale(1); }
}
```

### Wave Bars Animation
```css
@keyframes wave-bars {
  0%, 100% { height: 20px; opacity: 0.6; }
  50% { height: 40px; opacity: 1; }
}
```

## Accessibility

- **ARIA labels** on all interactive elements
- **Keyboard navigation** support
- **Reduced motion** support for users with motion sensitivity
- **High contrast** color scheme
- **Screen reader** friendly status messages

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Optimized for iOS Safari and Chrome Mobile

## Network Optimizations

- **Minimal HTTP requests**: Single CSS file
- **Hardware acceleration**: Uses CSS transforms
- **Efficient animations**: 60fps smooth animations
- **Low bandwidth**: No external images or fonts

## Testing

Visit `/voice-demo` to see the UI in action with demo controls for testing different states.

## Files Structure

```
components/
├── VoiceRecordingUI.tsx      # Main container component
├── AudioWaveVisualization.tsx # Wave animation component
└── ControlPanel.tsx          # Control buttons component

styles/
└── voice-recording.css       # All styles and animations

pages/
├── voice.tsx                 # Main voice page
├── voice-recording.tsx       # Full-featured voice page
└── voice-demo.tsx           # Demo page with controls

public/
└── voice-recording-ui.json   # UI specification JSON
```

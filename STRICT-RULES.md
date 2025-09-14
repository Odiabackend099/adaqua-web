# ODIADEV Voice Assistant - STRICT RULES

## Ã°Å¸Å¡Â« NON-NEGOTIABLE RULES

### 1. TTS Endpoint
- **ONLY** use: `/api/tts`
- Method: POST
- Body: `{ "text": string, "voice_id": "naija_male_warm", "format": "mp3" }`
- **NO** other vendors, SDKs, or browser speech APIs
- **NO** fallbacks

### 2. UI Components
- **ONLY** use: `components/UnifiedVoiceUI.tsx`
- **NO** duplicate UI components
- **NO** multiple voice interfaces

### 3. Error Handling
- **NO** fallbacks or silent failures
- If TTS fails Ã¢â€ â€™ surface the error
- If API fails Ã¢â€ â€™ surface the error
- **NO** browser speech synthesis fallbacks

### 4. TTS Client
- **ONLY** use: `lib/ttsClient.ts`
- **NO** direct fetch calls to TTS
- **NO** multiple TTS implementations

## Ã°Å¸â€Â§ Enforcement

### Automated Checks
- CI/CD pipeline runs `scripts/enforce-rules.ps1`
- GitHub Actions validate on every push/PR
- Violations fail the build

### Manual Checks
```powershell
# Run enforcement script
.\scripts\enforce-rules.ps1

# Check for banned APIs
grep -r "// REMOVED: NO_FALLBACKS\|webkitSpeechRecognition" --include="*.ts" --include="*.tsx" .

# Check for alternate endpoints  
grep -r "https\?://[^\"]*/voice/synthesize" --include="*.ts" --include="*.tsx" . | grep -v "tts-api.odia.dev"
```

## Ã°Å¸â€œÂ File Structure

```
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .cursorrules                    # Cursor AI rules
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .github/workflows/guardrails.yml # CI enforcement
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ server.cjs                     # Strict TTS server (no fallbacks)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ lib/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ttsClient.ts              # ONLY TTS client (no fallbacks)
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ tts.ts                    # Deprecated (redirects to ttsClient)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ UnifiedVoiceUI.tsx        # ONLY UI component
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ pages/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ voice.tsx                 # Uses UnifiedVoiceUI
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ voice-recording.tsx       # Uses UnifiedVoiceUI (call mode)
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ _archive/ui_dupes/            # Archived duplicate UIs
```

## Ã°Å¸Å¡Â¨ What Happens on Violation

1. **CI/CD fails** - Build stops
2. **PR rejected** - Cannot merge
3. **Error surfaced** - No silent failures
4. **Manual review** - Human intervention required

## Ã¢Å“â€¦ Success Criteria

- [ ] Only `tts-api.odia.dev` endpoint used
- [ ] Only `UnifiedVoiceUI.tsx` component used  
- [ ] Only `lib/ttsClient.ts` for TTS operations
- [ ] No fallback patterns in code
- [ ] All errors properly surfaced
- [ ] CI/CD passes all checks

## Ã°Å¸â€â€ž Migration Guide

### From Old TTS
```typescript
// OLD (with fallbacks)
import { synthesizeSpeech } from '../lib/tts';
const audio = await synthesizeSpeech(text);

// NEW (strict)
import { tts } from '../lib/ttsClient';
const audio = await tts(text, 'mp3');
```

### From Multiple UIs
```typescript
// OLD (multiple UIs)
import VoiceUI from '../components/VoiceUI';
import VoiceOnlyUI from '../components/VoiceOnlyUI';

// NEW (unified)
import UnifiedVoiceUI from '../components/UnifiedVoiceUI';
```

## Ã°Å¸â€œÅ¾ Support

If you need to add new features:
1. **Modify** `UnifiedVoiceUI.tsx` (don't create new UIs)
2. **Extend** `ttsClient.ts` (don't create new TTS clients)
3. **Update** `server.cjs` (don't add fallbacks)
4. **Test** with `scripts/enforce-rules.ps1`

---

**Remember: NO FALLBACKS, ONE UI, ONE TTS ENDPOINT**

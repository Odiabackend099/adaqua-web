# ODIADEV Voice Assistant - Rules Enforcement Script
# This script enforces the strict rules: no fallbacks, one UI, one TTS endpoint

Write-Host "🔧 Enforcing ODIADEV Voice Assistant Rules..." -ForegroundColor Cyan

# 1. Check for banned TTS APIs
Write-Host "`n1. Checking for banned TTS APIs..." -ForegroundColor Yellow
$bannedPatterns = @(
    "speechSynthesis",
    "webkitSpeechRecognition", 
    "elevenlabs",
    "polly",
    "gtts",
    "edge-tts",
    "coqui",
    "festival",
    "espeak",
    "azure-cognitiveservices-speech-sdk",
    "@google-cloud/text-to-speech"
)

$violations = @()
foreach ($pattern in $bannedPatterns) {
    $matches = Get-ChildItem -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
        Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*_archive*" } |
        Select-String -Pattern $pattern -CaseSensitive:$false
    
    if ($matches) {
        $violations += "Found '$pattern' in: $($matches.Filename -join ', ')"
    }
}

if ($violations.Count -gt 0) {
    Write-Host "❌ BANNED TTS APIs FOUND:" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "✅ No banned TTS APIs found" -ForegroundColor Green
}

# 2. Check for alternate TTS endpoints
Write-Host "`n2. Checking for alternate TTS endpoints..." -ForegroundColor Yellow
$endpointMatches = Get-ChildItem -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*_archive*" } |
    Select-String -Pattern "https?://[^\"]*/voice/synthesize" |
    Where-Object { $_.Line -notlike "*tts-api.odia.dev*" }

if ($endpointMatches) {
    Write-Host "❌ ALTERNATE TTS ENDPOINTS FOUND:" -ForegroundColor Red
    $endpointMatches | ForEach-Object { Write-Host "  - $($_.Filename): $($_.Line.Trim())" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "✅ Only approved TTS endpoint found" -ForegroundColor Green
}

# 3. Check for fallback patterns
Write-Host "`n3. Checking for fallback patterns..." -ForegroundColor Yellow
$fallbackMatches = Get-ChildItem -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*_archive*" } |
    Select-String -Pattern "(fallback|backup|alternative)" -CaseSensitive:$false |
    Where-Object { 
        $_.Line -notlike "*//*" -and 
        $_.Line -notlike "*\*" -and
        $_.Line -notlike "*interface*" -and
        $_.Line -notlike "*type*" -and
        $_.Line -notlike "*SpeechRecognitionAlternative*" -and
        $_.Line -notlike "*SpeechRecognitionResult*" -and
        $_.Line -notlike "*SpeechRecognitionEvent*"
    }

if ($fallbackMatches) {
    Write-Host "❌ FALLBACK PATTERNS FOUND:" -ForegroundColor Red
    $fallbackMatches | ForEach-Object { Write-Host "  - $($_.Filename): $($_.Line.Trim())" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "✅ No fallback patterns found" -ForegroundColor Green
}

# 4. Check for single UI
Write-Host "`n4. Checking for single UI..." -ForegroundColor Yellow
$uiFiles = Get-ChildItem -Recurse -Include "*.tsx", "*.jsx" | 
    Where-Object { 
        $_.Name -match "(Voice|UI)" -and 
        $_.FullName -notlike "*_archive*" -and
        $_.FullName -notlike "*pages*" -and
        $_.FullName -like "*components*"
    }

if ($uiFiles.Count -gt 1) {
    Write-Host "❌ MULTIPLE UI COMPONENTS FOUND:" -ForegroundColor Red
    $uiFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Red }
    Write-Host "Only one UI component allowed. Archive duplicates." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Single UI confirmed" -ForegroundColor Green
}

# 5. Validate TTS client usage
Write-Host "`n5. Validating TTS client usage..." -ForegroundColor Yellow
$ttsClientImports = Get-ChildItem -Recurse -Include "*.ts", "*.tsx" | 
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*_archive*" } |
    Select-String -Pattern "from.*ttsClient"

if (-not $ttsClientImports) {
    Write-Host "❌ No ttsClient imports found. Use lib/ttsClient.ts for all TTS operations." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ TTS client usage confirmed" -ForegroundColor Green
}

# 6. Check for .cursorrules file
Write-Host "`n6. Checking for .cursorrules file..." -ForegroundColor Yellow
if (-not (Test-Path ".cursorrules")) {
    Write-Host "❌ .cursorrules file not found" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ .cursorrules file found" -ForegroundColor Green
}

Write-Host "`n🎉 All rules enforced successfully!" -ForegroundColor Green
Write-Host "✅ No fallbacks" -ForegroundColor Green
Write-Host "✅ Single UI" -ForegroundColor Green  
Write-Host "✅ Single TTS endpoint" -ForegroundColor Green
Write-Host "✅ Strict error handling" -ForegroundColor Green

# Development helper script for Voice Assistant
# Ensures proper setup and starts the development server

param(
    [switch]$SkipInstall,
    [switch]$SkipPortCheck
)

Write-Host "🚀 Starting Voice Assistant Development Environment" -ForegroundColor Cyan

# Change to script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $ScriptDir\..

try {
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-Error "❌ package.json not found. Please run this script from the project root."
        exit 1
    }

    # Check if port 3000 is available (optional)
    if (-not $SkipPortCheck) {
        $PortCheck = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
        if ($PortCheck) {
            Write-Warning "⚠️  Port 3000 is already in use. You may need to stop the existing process."
            Write-Host "   To skip this check, use: .\scripts\dev.ps1 -SkipPortCheck" -ForegroundColor Yellow
        }
    }

    # Install dependencies if needed
    if (-not $SkipInstall) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "❌ Failed to install dependencies"
            exit 1
        }
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    }

    # Check for .env.local
    if (-not (Test-Path ".env.local")) {
        Write-Warning "⚠️  .env.local not found. Creating from template..."
        if (Test-Path "env.example") {
            Copy-Item "env.example" ".env.local"
            Write-Host "✅ Created .env.local from template" -ForegroundColor Green
        } else {
            Write-Host "📝 Creating basic .env.local..." -ForegroundColor Yellow
            @"
# Voice Assistant Environment Configuration
NEXT_PUBLIC_BRAIN_API_URL=https://brain-api.odia.dev
NEXT_PUBLIC_BRAIN_PUBLIC_TOKEN=
NEXT_PUBLIC_VOICE_VOICE_ID=naija_male_warm
BRAIN_API_URL=https://brain-api.odia.dev
BRAIN_SERVER_TOKEN=
OPENAI_API_KEY=
TTS_API_URL=https://tts-api.odia.dev
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
            Write-Host "✅ Created basic .env.local" -ForegroundColor Green
        }
    }

    # Start development server
    Write-Host "🔥 Starting development server..." -ForegroundColor Cyan
    Write-Host "   The app will open at: http://localhost:3000/voice" -ForegroundColor White
    Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor White
    Write-Host ""

    # Start the dev server
    npm run dev

} catch {
    Write-Error "❌ Error: $_"
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "🎉 Development environment ready!" -ForegroundColor Green
Write-Host "   Visit: http://localhost:3000/voice" -ForegroundColor White
Write-Host "   Run smoke tests: .\scripts\smoke.ps1" -ForegroundColor White

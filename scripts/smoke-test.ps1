# Adaqua Voice API Smoke Test
# Run this after starting dev server: npm run dev

$ErrorActionPreference = 'Stop'

Write-Host " Testing Adaqua Voice API..." -ForegroundColor Yellow

try {
    $Response = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/voice" -ContentType 'application/json' -Body (@{
        text = "Lagos fam, we dey move together!"
        voice_id = "naija_male_warm"
        format = "mp3"
    } | ConvertTo-Json -Compress) -OutFile "test-output.mp3"
    
    $FileSize = (Get-Item ".\test-output.mp3").Length
    Write-Host " SUCCESS: MP3 generated ($FileSize bytes)" -ForegroundColor Green
    Write-Host " Playing audio..." -ForegroundColor Cyan
    
    # Play on Windows
    Start-Process "test-output.mp3" -Wait
    
} catch {
    Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
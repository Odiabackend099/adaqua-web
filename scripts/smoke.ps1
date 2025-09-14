# Smoke test script for Voice Assistant
# Tests TTS endpoint and basic functionality

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$TestText = "hello"
)

Write-Host "[TEST] Running Voice Assistant Smoke Tests" -ForegroundColor Cyan
Write-Host "   Base URL: $BaseUrl" -ForegroundColor White
Write-Host "   Test Text: $TestText" -ForegroundColor White
Write-Host ""

$TestResults = @()

# Test 1: TTS GET endpoint
Write-Host "Test 1: TTS GET endpoint" -ForegroundColor Yellow
try {
    $TtsUrl = "$BaseUrl/api/tts?text=$([uri]::EscapeDataString($TestText))"
    Write-Host "   Testing: $TtsUrl" -ForegroundColor Gray
    
    $Response = Invoke-WebRequest -Uri $TtsUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
    
    if ($Response.StatusCode -eq 200) {
        $ContentType = $Response.Headers["Content-Type"]
        if ($ContentType -and $ContentType.StartsWith("audio/")) {
            Write-Host "   [PASS] TTS GET endpoint working (Content-Type: $ContentType)" -ForegroundColor Green
            $TestResults += @{ Test = "TTS GET"; Status = "PASS"; Details = "Content-Type: $ContentType" }
        } else {
            Write-Host "   [FAIL] TTS GET endpoint returned non-audio content (Content-Type: $ContentType)" -ForegroundColor Red
            $TestResults += @{ Test = "TTS GET"; Status = "FAIL"; Details = "Expected audio/*, got: $ContentType" }
        }
    } else {
        Write-Host "   [FAIL] TTS GET endpoint failed with status: $($Response.StatusCode)" -ForegroundColor Red
        $TestResults += @{ Test = "TTS GET"; Status = "FAIL"; Details = "HTTP $($Response.StatusCode)" }
    }
} catch {
    $ErrorMessage = $_.Exception.Message
    Write-Host "   [FAIL] TTS GET endpoint error: $ErrorMessage" -ForegroundColor Red
    
    # Check if it's a JSON error response
    if ($ErrorMessage -like "*404*" -or $ErrorMessage -like "*Not Found*") {
        Write-Host "   [INFO] This might indicate the TTS upstream endpoint is unknown" -ForegroundColor Yellow
        Write-Host "      Expected: https://tts-api.odia.dev/voice/synthesize" -ForegroundColor Yellow
    }
    
    $TestResults += @{ Test = "TTS GET"; Status = "FAIL"; Details = $ErrorMessage }
}

Write-Host ""

# Test 2: TTS POST endpoint
Write-Host "Test 2: TTS POST endpoint" -ForegroundColor Yellow
try {
    $TtsUrl = "$BaseUrl/api/tts"
    $Body = @{
        text = $TestText
        voice_id = "naija_male_warm"
        format = "mp3"
    } | ConvertTo-Json
    
    Write-Host "   Testing: $TtsUrl" -ForegroundColor Gray
    
    $Response = Invoke-WebRequest -Uri $TtsUrl -Method POST -Body $Body -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
    
    if ($Response.StatusCode -eq 200) {
        $ContentType = $Response.Headers["Content-Type"]
        if ($ContentType -and $ContentType.StartsWith("audio/")) {
            Write-Host "   [PASS] TTS POST endpoint working (Content-Type: $ContentType)" -ForegroundColor Green
            $TestResults += @{ Test = "TTS POST"; Status = "PASS"; Details = "Content-Type: $ContentType" }
        } else {
            Write-Host "   [FAIL] TTS POST endpoint returned non-audio content (Content-Type: $ContentType)" -ForegroundColor Red
            $TestResults += @{ Test = "TTS POST"; Status = "FAIL"; Details = "Expected audio/*, got: $ContentType" }
        }
    } else {
        Write-Host "   [FAIL] TTS POST endpoint failed with status: $($Response.StatusCode)" -ForegroundColor Red
        $TestResults += @{ Test = "TTS POST"; Status = "FAIL"; Details = "HTTP $($Response.StatusCode)" }
    }
} catch {
    $ErrorMessage = $_.Exception.Message
    Write-Host "   [FAIL] TTS POST endpoint error: $ErrorMessage" -ForegroundColor Red
    $TestResults += @{ Test = "TTS POST"; Status = "FAIL"; Details = $ErrorMessage }
}

Write-Host ""

# Test 3: Chat endpoint
Write-Host "Test 3: Chat endpoint" -ForegroundColor Yellow
try {
    $ChatUrl = "$BaseUrl/api/chat"
    $Body = @{
        user = "test message"
        history = @()
    } | ConvertTo-Json
    
    Write-Host "   Testing: $ChatUrl" -ForegroundColor Gray
    
    $Response = Invoke-WebRequest -Uri $ChatUrl -Method POST -Body $Body -ContentType "application/json" -TimeoutSec 15 -ErrorAction Stop
    
    if ($Response.StatusCode -eq 200) {
        $ContentType = $Response.Headers["Content-Type"]
        if ($ContentType -and $ContentType.Contains("text/event-stream")) {
            Write-Host "   [PASS] Chat endpoint working (Content-Type: $ContentType)" -ForegroundColor Green
            $TestResults += @{ Test = "Chat SSE"; Status = "PASS"; Details = "Content-Type: $ContentType" }
        } else {
            Write-Host "   [FAIL] Chat endpoint returned non-SSE content (Content-Type: $ContentType)" -ForegroundColor Red
            $TestResults += @{ Test = "Chat SSE"; Status = "FAIL"; Details = "Expected text/event-stream, got: $ContentType" }
        }
    } else {
        Write-Host "   [FAIL] Chat endpoint failed with status: $($Response.StatusCode)" -ForegroundColor Red
        $TestResults += @{ Test = "Chat SSE"; Status = "FAIL"; Details = "HTTP $($Response.StatusCode)" }
    }
} catch {
    $ErrorMessage = $_.Exception.Message
    Write-Host "   [FAIL] Chat endpoint error: $ErrorMessage" -ForegroundColor Red
    $TestResults += @{ Test = "Chat SSE"; Status = "FAIL"; Details = $ErrorMessage }
}

Write-Host ""

# Test 4: Voice page
Write-Host "Test 4: Voice page accessibility" -ForegroundColor Yellow
try {
    $VoiceUrl = "$BaseUrl/voice"
    Write-Host "   Testing: $VoiceUrl" -ForegroundColor Gray
    
    $Response = Invoke-WebRequest -Uri $VoiceUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
    
    if ($Response.StatusCode -eq 200) {
        if ($Response.Content -like "*voice-ui*" -or $Response.Content -like "*VoiceUI*") {
            Write-Host "   [PASS] Voice page accessible and contains voice UI" -ForegroundColor Green
            $TestResults += @{ Test = "Voice Page"; Status = "PASS"; Details = "Page loads with voice UI" }
        } else {
            Write-Host "   [WARN] Voice page accessible but may not contain voice UI" -ForegroundColor Yellow
            $TestResults += @{ Test = "Voice Page"; Status = "WARN"; Details = "Page loads but voice UI not detected" }
        }
    } else {
        Write-Host "   [FAIL] Voice page failed with status: $($Response.StatusCode)" -ForegroundColor Red
        $TestResults += @{ Test = "Voice Page"; Status = "FAIL"; Details = "HTTP $($Response.StatusCode)" }
    }
} catch {
    $ErrorMessage = $_.Exception.Message
    Write-Host "   [FAIL] Voice page error: $ErrorMessage" -ForegroundColor Red
    $TestResults += @{ Test = "Voice Page"; Status = "FAIL"; Details = $ErrorMessage }
}

Write-Host ""

# Summary
Write-Host "[SUMMARY] Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

$PassCount = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$FailCount = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$WarnCount = ($TestResults | Where-Object { $_.Status -eq "WARN" }).Count

foreach ($Result in $TestResults) {
    $StatusIcon = switch ($Result.Status) {
        "PASS" { "[PASS]" }
        "FAIL" { "[FAIL]" }
        "WARN" { "[WARN]" }
        default { "[UNKNOWN]" }
    }
    Write-Host "   $StatusIcon $($Result.Test): $($Result.Details)" -ForegroundColor White
}

Write-Host ""
Write-Host "Results: $PassCount passed, $FailCount failed, $WarnCount warnings" -ForegroundColor White

if ($FailCount -eq 0) {
    Write-Host "[SUCCESS] All critical tests passed!" -ForegroundColor Green
    Write-Host "   You can now test the voice interface at: $BaseUrl/voice" -ForegroundColor White
} else {
    Write-Host "[WARNING] Some tests failed. Check the details above." -ForegroundColor Yellow
    Write-Host "   Common issues:" -ForegroundColor Yellow
    Write-Host "   - TTS endpoint unknown: Check if https://tts-api.odia.dev/voice/synthesize exists" -ForegroundColor Yellow
    Write-Host "   - Server not running: Run .\scripts\dev.ps1 first" -ForegroundColor Yellow
    Write-Host "   - Port conflicts: Check if port 3000 is available" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Next steps:" -ForegroundColor Cyan
Write-Host "   1. If tests pass, visit $BaseUrl/voice to test the voice interface" -ForegroundColor White
Write-Host "   2. If TTS tests fail, check the TTS upstream endpoint configuration" -ForegroundColor White
Write-Host "   3. Check browser console for any client-side errors" -ForegroundColor White

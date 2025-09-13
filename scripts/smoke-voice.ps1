# Voice smoke (dev server must be running)
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/voice -ContentType 'application/json' -Body (@{ text='Lagos fam, we move!'; voice_id='naija_male_warm'; format='mp3'} | ConvertTo-Json -Compress) -OutFile out.mp3
Write-Host ('MP3 size: ' + (Get-Item .\out.mp3).Length + ' bytes')

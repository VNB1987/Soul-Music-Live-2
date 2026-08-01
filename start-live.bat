@echo off
setlocal

set "SOUL_URL=http://127.0.0.1:8766"
set "SOUL_RELEASE=SOUL-MUSIC-LIVE-2-DESIGN-V2-FINAL"

title Soul Music Live Launcher
cd /d "%~dp0"

echo.
echo ================================================
echo   SOUL MUSIC LIVE - PORNIRE FULL HD
echo ================================================
echo.
echo Versiune: DESIGN V2 FINAL - BUILD 2026.08.01
echo Server local: %SOUL_URL%
echo TikTok LIVE Studio Browser Source: 1920 x 1080
echo.

start "Soul Music Local Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0live-server.ps1"

timeout /t 2 /nobreak >nul

powershell.exe -NoProfile -Command "$ok=$false; for($i=0; $i -lt 12 -and -not $ok; $i++){try{$r=Invoke-RestMethod -UseBasicParsing '%SOUL_URL%/release.json?check=%RANDOM%'; $ok=($r.release -eq '%SOUL_RELEASE%')}catch{}; if(-not $ok){Start-Sleep -Milliseconds 350}}; if(-not $ok){exit 2}" >nul 2>&1

if errorlevel 1 (
  echo.
  echo EROARE: portul 8766 nu raspunde cu Design V2 Final.
  echo Inchide orice fereastra veche "Soul Music Local Server",
  echo apoi porneste din nou acest fisier.
  echo.
  pause
  exit /b 1
)

start "" "%SOUL_URL%/index.html?build=2026.08.01-design-v2-final"

echo Proiectul a pornit.
echo.
echo In TikTok LIVE Studio adauga Browser Source cu URL-ul:
echo %SOUL_URL%
echo.
echo Latime: 1920   Inaltime: 1080   FPS: 60
echo.
echo Inchide fereastra "Soul Music Local Server" pentru oprire.
echo.
pause

endlocal

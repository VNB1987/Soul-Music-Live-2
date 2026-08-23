@echo off
setlocal

title Soul Music Live Launcher
cd /d "%~dp0"

echo.
echo ================================================
echo   SOUL MUSIC LIVE - PORNIRE FULL HD + DJ SOUL
echo ================================================
echo.
echo Server local: http://127.0.0.1:8766
echo DJ Soul Bridge: http://127.0.0.1:8767
echo TikTok LIVE Studio Browser Source: 1920 x 1080
echo.

start "Soul Music Local Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0live-server.ps1"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo ATENTIE: Node.js nu a fost gasit in PATH.
  echo Engine X va porni, dar DJ Soul nu poate fi pornit automat.
  echo.
) else (
  start "DJ Soul Console" cmd.exe /k "cd /d ""%~dp0"" && node ""%~dp0dj-soul-bridge.mjs"""
)

timeout /t 2 /nobreak >nul

start "" "http://127.0.0.1:8766/index.html?v=9.0-djsoul"

echo Proiectul a pornit.
echo.
echo In TikTok LIVE Studio adauga Browser Source cu URL-ul:
echo http://127.0.0.1:8766
echo.
echo Latime: 1920   Inaltime: 1080   FPS: 60
echo.
echo DJ Soul porneste automat in fereastra separata "DJ Soul Console".
echo Comenzile private pot fi scrise si direct in panoul Engine X.
echo.
echo Inchide ferestrele "Soul Music Local Server" si "DJ Soul Console" pentru oprire.
echo.
pause

endlocal

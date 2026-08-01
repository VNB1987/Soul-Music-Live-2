@echo off
setlocal

title Soul Music Live Launcher
cd /d "%~dp0"

echo.
echo ================================================
echo   SOUL MUSIC LIVE - PORNIRE FULL HD
echo ================================================
echo.
echo Server local: http://127.0.0.1:8766
echo TikTok LIVE Studio Browser Source: 1920 x 1080
echo.

start "Soul Music Local Server" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0live-server.ps1"

timeout /t 2 /nobreak >nul

start "" "http://127.0.0.1:8766/index.html?v=8.1"

echo Proiectul a pornit.
echo.
echo In TikTok LIVE Studio adauga Browser Source cu URL-ul:
echo http://127.0.0.1:8766
echo.
echo Latime: 1920   Inaltime: 1080   FPS: 60
echo.
echo Inchide fereastra "Soul Music Local Server" pentru oprire.
echo.
pause

endlocal

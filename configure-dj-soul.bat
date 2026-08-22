@echo off
setlocal

title DJ Soul YouTube Setup
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure-dj-soul.ps1"

echo.
pause

endlocal


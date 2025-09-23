@echo off
echo Starting Redis Server...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-redis.ps1"
pause

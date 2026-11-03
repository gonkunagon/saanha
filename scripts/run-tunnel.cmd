@echo off
rem Cloudflare tunnel 'saanha' (saanha.com -> localhost:3000). Reconnects ~5s after it stops. Log: logs\tunnel.log
cd /d "%~dp0.."
if not exist logs mkdir logs
:loop
echo [%date% %time%] start tunnel>>logs\tunnel.log
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run saanha >>logs\tunnel.log 2>&1
rem timeout does not work in a headless console, so wait with ping (~5s)
ping -n 6 127.0.0.1 >nul
goto loop

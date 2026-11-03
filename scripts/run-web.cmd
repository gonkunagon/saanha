@echo off
rem SAANHA production web (next start, port 3000). Restarts ~5s after it stops. Log: logs\web.log
cd /d "%~dp0.."
if not exist logs mkdir logs
:loop
echo [%date% %time%] start web>>logs\web.log
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next start -p 3000 >>logs\web.log 2>&1
rem timeout does not work in a headless console, so wait with ping (~5s)
ping -n 6 127.0.0.1 >nul
goto loop

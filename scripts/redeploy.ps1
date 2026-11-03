# อัปเดตเว็บ saanha.com หลังแก้โค้ด: หยุดเว็บ → build ใหม่ → เปิดเว็บ (tunnel ไม่ต้องหยุด)
# ใช้: powershell -ExecutionPolicy Bypass -File scripts\redeploy.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:Path = "C:\Program Files\nodejs;$env:Path"
Stop-ScheduledTask -TaskName "SAANHA Web"
# ปิดลูปเดิมของ run-web.cmd ที่อาจค้างอยู่ ไม่ให้เปิดเว็บแทรกระหว่าง build
Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | Where-Object { $_.CommandLine -like '*run-web.cmd*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "build ไม่ผ่าน — ดู error ด้านบน แล้วแก้ก่อน (เว็บอาจเปิดไม่ได้จนกว่าจะ build ผ่าน)"; }
Start-ScheduledTask -TaskName "SAANHA Web"
Write-Host "เปิดเว็บแล้ว: https://saanha.com"
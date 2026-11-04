# Move the server, step 1 - run on the OLD PC (double-click scripts\pack-server.cmd).
# Stops saanha.com here and copies project + database + .env.local + tunnel key to Desktop\SAANHA-move.
# The tasks are disabled so this PC never serves saanha.com at the same time as the new one
# (both would share the tunnel and split visitors between two different databases).
# Undo (keep serving from this PC): scripts\resume-server.cmd
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path ([Environment]::GetFolderPath("Desktop")) "SAANHA-move"
if (Test-Path $out) { throw "$out already exists - delete or rename it first" }

foreach ($t in "SAANHA Web", "SAANHA Tunnel") {
  Stop-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
  Disable-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue | Out-Null
}
Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" |
  Where-Object { $_.CommandLine -like '*run-web.cmd*' -or $_.CommandLine -like '*run-tunnel.cmd*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2 # let the database file close

robocopy $root "$out\SANHA" /E /XD node_modules .next logs /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copying the project failed (robocopy $LASTEXITCODE)" }
robocopy "$env:USERPROFILE\.cloudflared" "$out\cloudflared" /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copying the tunnel key failed (robocopy $LASTEXITCODE)" }

Write-Host ""
Write-Host "saanha.com is now OFF on this PC."
Write-Host "Copy this folder to the new PC (USB / Google Drive), keep it private - it holds passwords and the tunnel key:"
Write-Host "  $out"

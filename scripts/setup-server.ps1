# Move the server, step 2 - run on the NEW PC from the copied folder (double-click SANHA\scripts\setup-server.cmd).
# Needs Node.js LTS and cloudflared installed first. Installs packages, builds, puts the tunnel key in place
# and registers the "SAANHA Web" / "SAANHA Tunnel" logon tasks, then starts saanha.com on this PC.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$node = "C:\Program Files\nodejs\node.exe"
$cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (!(Test-Path $node)) { throw "Node.js not found. Install the LTS version from https://nodejs.org then run this again." }
if (!(Test-Path $cf)) { throw "cloudflared not found. Run: winget install --id Cloudflare.cloudflared  then run this again." }
foreach ($f in @(".env.local")) {
  if (!(Test-Path "$root\$f")) { throw "$f is missing in $root - copy the whole SAANHA-move folder from the old PC." }
}

# Tunnel key -> %USERPROFILE%\.cloudflared, with the key path rewritten for this PC's user folder
$dst = "$env:USERPROFILE\.cloudflared"
$src = Join-Path (Split-Path $root -Parent) "cloudflared"
if (Test-Path $src) {
  robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Copying the tunnel key failed (robocopy $LASTEXITCODE)" }
}
$cfg = "$dst\config.yml"
if (!(Test-Path $cfg)) { throw "$cfg not found - the cloudflared folder must sit next to the SANHA folder." }
$id = (Select-String -Path $cfg -Pattern '^tunnel:\s*(\S+)').Matches[0].Groups[1].Value
(Get-Content $cfg) -replace '^credentials-file:.*', "credentials-file: $dst\$id.json" | Set-Content $cfg -Encoding ascii

Set-Location $root
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

# Same tasks as on the old PC: start at logon, headless cmd (PowerShell hangs under Task Scheduler), never time out
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0 `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
foreach ($t in @(@("SAANHA Web", "run-web.cmd"), @("SAANHA Tunnel", "run-tunnel.cmd"))) {
  $action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless cmd.exe /c `"$root\scripts\$($t[1])`"" -WorkingDirectory "$root\scripts"
  Register-ScheduledTask -TaskName $t[0] -Action $action -Trigger $trigger -Settings $settings -Description "SAANHA saanha.com" -Force | Out-Null
  Start-ScheduledTask -TaskName $t[0]
}

Write-Host ""
Write-Host "Done. saanha.com now runs from this PC (wait ~30 s, then open https://saanha.com)."
Write-Host "Set Power > Sleep to Never on this PC, and delete the SAANHA-move copy from the USB / Drive."

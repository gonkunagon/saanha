# Undo pack-server: serve saanha.com from this PC again (only if the new PC is NOT running it).
foreach ($t in "SAANHA Web", "SAANHA Tunnel") {
  Enable-ScheduledTask -TaskName $t | Out-Null
  Start-ScheduledTask -TaskName $t
}
Write-Host "saanha.com is running from this PC again."

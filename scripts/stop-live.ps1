# npm run live:stop: stops the Lean server and tunnel started by npm run live.
# The live site keeps working; its upload button just stops appearing.
param([switch]$Quiet)
$state = Join-Path (Split-Path -Parent $PSScriptRoot) ".live"
foreach ($name in "tunnel", "server") {
  $pidFile = Join-Path $state "$name.pid"
  if (-not (Test-Path $pidFile)) { continue }
  $id = [int](Get-Content $pidFile)
  $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
  if ($proc) {
    Stop-Process -Id $id -Force
    if (-not $Quiet) { Write-Host "stopped $name (pid $id)" }
  }
  Remove-Item $pidFile -Force
}

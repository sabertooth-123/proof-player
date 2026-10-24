# npm run live: serve "Open .lean file" for the live site from this laptop.
#   1. starts the public Lean server (lean-server/server.mjs, strict mode) on port 7860
#   2. opens a Cloudflare quick tunnel to it (no account; a new https://*.trycloudflare.com each run)
#   3. writes that address to .env.production and pushes it, so Vercel rebuilds the site to use it
# Works only while this laptop is on, awake and online. Stop with: npm run live:stop
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$state = Join-Path $root ".live"
$port = 7860
$cloudflared = if ($env:CLOUDFLARED) { $env:CLOUDFLARED } else { Join-Path $env:USERPROFILE "tools\cloudflared\cloudflared.exe" }

if (-not (Test-Path $cloudflared)) { throw "cloudflared not found at $cloudflared (set CLOUDFLARED to its path)" }
New-Item -ItemType Directory -Force $state | Out-Null

# Stop anything a previous run left behind.
& (Join-Path $PSScriptRoot "stop-live.ps1") -Quiet

function Wait-Until([scriptblock]$Check, [int]$Seconds, [string]$What) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    $result = & $Check
    if ($result) { return $result }
    Start-Sleep -Milliseconds 700
  }
  throw "timed out waiting for $What"
}

Write-Host "Starting Lean server on :$port ..."
$env:PORT = "$port"
$server = Start-Process node -ArgumentList "lean-server/server.mjs" -WorkingDirectory $root -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $state "server.log") -RedirectStandardError (Join-Path $state "server.err.log")
$server.Id | Set-Content (Join-Path $state "server.pid")
Wait-Until { try { (Invoke-WebRequest "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false } } 90 "the Lean server" | Out-Null

Write-Host "Opening Cloudflare tunnel ..."
$tunnelLog = Join-Path $state "tunnel.log"
$tunnel = Start-Process $cloudflared -ArgumentList "tunnel", "--no-autoupdate", "--url", "http://localhost:$port" -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $state "tunnel.out.log") -RedirectStandardError $tunnelLog
$tunnel.Id | Set-Content (Join-Path $state "tunnel.pid")
$url = Wait-Until {
  if (Test-Path $tunnelLog) { ([regex]"https://[a-z0-9-]+\.trycloudflare\.com").Match((Get-Content $tunnelLog -Raw)).Value }
} 60 "the tunnel address"

Write-Host "Waiting for $url to answer ..."
Wait-Until {
  try { (Invoke-WebRequest "$url/api/lean" -UseBasicParsing -TimeoutSec 5).Content -match '"available":true' } catch { $false }
} 120 "the tunnel to reach the server" | Out-Null

# Point the live build at it. Only .env.production is committed.
$envFile = Join-Path $root ".env.production"
$line = "VITE_LEAN_API=$url"
$current = if (Test-Path $envFile) { (Get-Content $envFile -Raw).Trim() } else { "" }
if ($current -ne $line) {
  [IO.File]::WriteAllText($envFile, "# Written by npm run live: the Lean server the live site sends uploads to.`n$line`n")
  Push-Location $root
  try {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    git add -- .env.production
    git commit -q -m "chore: live Lean server at $url" -- .env.production
    if ($branch -eq "main") {
      git push -q origin main
      Write-Host "Pushed; Vercel redeploys the site in about a minute."
    } else {
      Write-Warning "On branch $branch, not main: committed but not pushed. Merge to main for the live site to use it."
    }
  } finally { Pop-Location }
} else {
  Write-Host ".env.production already points here; nothing to push."
}

Write-Host ""
Write-Host "Live upload is ON: $url"
Write-Host "Keep this laptop on, awake and online. Stop with: npm run live:stop"

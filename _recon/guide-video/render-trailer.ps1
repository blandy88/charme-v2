# Renders both trailer segments frame by frame into work/<id>/frames/<stamp>/.
# The demo database is re-seeded before each segment: the on-camera clicks
# mutate favourites and the cart, so a second segment must not inherit the
# first one's leftovers.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:JWT_SECRET = (Select-String -Path "demo\.env" -Pattern "^JWT_SECRET=(.*)$").Matches.Groups[1].Value
$env:CHARME_ORIGIN = "http://localhost:3100"

foreach ($id in @("trailer-shop", "trailer-admin")) {
  Write-Host "=== $id : seed ==="
  node demo\seed.cjs | Select-Object -Last 1
  node seed-trailer.cjs | Select-Object -Last 1
  Write-Host "=== $id : render ==="
  node render.cjs $id trailer.json
  if ($LASTEXITCODE -ne 0) { throw "render failed for $id" }
}
Write-Host "ALL SEGMENTS RENDERED"

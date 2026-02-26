# get_leaflet.ps1 — baixa Leaflet local em assets/leaflet
param([string]$Version = '1.9.4')
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dir = Join-Path $root 'assets/leaflet'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$base = "https://unpkg.com/leaflet@$Version/dist"
Invoke-WebRequest "$base/leaflet.css" -OutFile (Join-Path $dir 'leaflet.css')
Invoke-WebRequest "$base/leaflet.js"  -OutFile (Join-Path $dir 'leaflet.js')
Write-Host "Leaflet $Version baixado em $dir"

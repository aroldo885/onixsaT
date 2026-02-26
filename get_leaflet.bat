@echo off
setlocal
set VER=1.9.4
set ROOT=%~dp0
set DIR=%ROOT%assets\leaflet
if not exist "%DIR%" mkdir "%DIR%"
set BASE=https://unpkg.com/leaflet@%VER%/dist
curl -L %BASE%/leaflet.css -o "%DIR%\leaflet.css"
curl -L %BASE%/leaflet.js  -o "%DIR%\leaflet.js"
echo Leaflet %VER% baixado em %DIR%

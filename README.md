# Patch: Mapa com assets locais + fallback CDN

## O que vem
- `server_excessos.js` — servidor com `/mapa` e `/mapa_teste` usando **assets locais** (`/assets/leaflet/*`) e **fallback** para CDN. Inclui API 24/7 com `stats`, parser de data flexível e detecção tolerante de "Excesso".
- `assets/leaflet/` — pasta onde ficarão `leaflet.css` e `leaflet.js` locais.
- `get_leaflet.ps1` / `get_leaflet.bat` — scripts para **baixar** os arquivos do Leaflet localmente.

## Como usar
1. **Pare** processos antigos (`Ctrl+C`).
2. **Substitua** seu `server_excessos.js` por este.
3. **Baixe os assets locais** (opcional, recomendado):
   - PowerShell: `./get_leaflet.ps1`
   - CMD: `get_leaflet.bat`
4. **Suba** na porta que quiser (ex.: 8082):
   ```powershell
   $env:PORT=8082; npm run onixsat:server
   ```
   ou `npm run onixsat:all` se quiser coletor + server.
5. **Teste**:
   - Fundo do mapa (sem API): `http://localhost:8082/mapa_teste`
   - Mapa + API: `http://localhost:8082/mapa`
   - Diagnóstico API: `http://localhost:8082/api/excessos?lastHours=6&officialOnly=0&dedupe=0&speedMin=1&stats=1`

Se a rede bloquear CDN, com os assets locais baixados o mapa renderiza normalmente.

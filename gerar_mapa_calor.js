const fs = require("fs");
const path = require("path");

const IN_FILE = path.join(__dirname, "saida", "posicoes.jsonl");
const OUT_FILE = path.join(__dirname, "saida", "mapa_calor.html");

// filtros opcionais via .env
require("dotenv").config({ path: path.join(__dirname, ".env") });
const FILTER_DATE = process.env.HEATMAP_DATE || ""; // ex: 2026-02-25
const FILTER_PLACA = process.env.HEATMAP_PLACA || ""; // ex: EJV1G53
const MAP_FILE = path.join(__dirname, "saida", "map_veiculos.json");
const mapVeiculos = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8")) : {};

if (!fs.existsSync(IN_FILE)) {
  console.error("Não achei:", IN_FILE);
  process.exit(1);
}

const lines = fs.readFileSync(IN_FILE, "utf8").split("\n").filter(Boolean);

function placaDoVeiID(veiID) {
  return (mapVeiculos[String(veiID)] && mapVeiculos[String(veiID)].placa) || "";
}

const points = [];
for (const line of lines) {
  const r = JSON.parse(line);

  if (!r.lat || !r.lon) continue;

  // filtro por data (YYYY-MM-DD)
  if (FILTER_DATE && (!r.dt || !String(r.dt).startsWith(FILTER_DATE))) continue;

  // filtro por placa (precisa do map_veiculos.json)
  if (FILTER_PLACA) {
    const p = placaDoVeiID(r.veiID);
    if (p !== FILTER_PLACA) continue;
  }

  // weight: usa velocidade se existir, senão 1
  const w = Number.isFinite(Number(r.vel)) ? Math.max(1, Number(r.vel)) : 1;

  points.push([Number(r.lat), Number(r.lon), w]);
}

// centro do mapa: média simples
let centerLat = -23.0, centerLon = -46.6;
if (points.length) {
  centerLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  centerLon = points.reduce((s, p) => s + p[1], 0) / points.length;
}

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Mapa de Calor - Onixsat</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    body{margin:0;font-family:Arial}
    #map{height:100vh;width:100vw}
    .info{position:absolute;top:10px;left:10px;background:#fff;padding:10px;border-radius:8px;z-index:999;box-shadow:0 2px 10px rgba(0,0,0,.15)}
    .info b{display:block;margin-bottom:6px}
  </style>
</head>
<body>
  <div class="info">
    <b>Mapa de Calor (Heatmap)</b>
    <div>Pontos: ${points.length}</div>
    <div>Filtro data: ${FILTER_DATE || "—"}</div>
    <div>Filtro placa: ${FILTER_PLACA || "—"}</div>
  </div>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat/dist/leaflet-heat.js"></script>

  <script>
    const map = L.map('map').setView([${centerLat}, ${centerLon}], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const points = ${JSON.stringify(points)};

    // heat layer
    const heat = L.heatLayer(points, {
      radius: 18,
      blur: 22,
      maxZoom: 12
    }).addTo(map);
  </script>
</body>
</html>`;

fs.writeFileSync(OUT_FILE, html, "utf8");
console.log("✅ Gerado:", OUT_FILE);
console.log("Abra no navegador.");
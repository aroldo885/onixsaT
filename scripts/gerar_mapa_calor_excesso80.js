const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ROOT = path.join(__dirname, "..");
const IN_FILE = path.join(ROOT, "saida", "posicoes.jsonl");
const OUT_FILE = path.join(ROOT, "saida", "mapa_calor_excesso_80.html");

const MAP_FILE = path.join(ROOT, "saida", "map_veiculos.json");
const mapVeiculos = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8")) : {};

// Filtros opcionais via .env
const FILTER_DATE = process.env.HEATMAP_DATE || "";      // ex: 2026-02-25
const FILTER_PLACA = process.env.HEATMAP_PLACA || "";    // ex: EJV1G53
const LIMIT = Number(process.env.HEATMAP_LIMIT || 200000);
const SPEED_LIMIT = Number(process.env.SPEED_LIMIT || 80);

if (!fs.existsSync(IN_FILE)) {
  console.error("Não achei:", IN_FILE);
  process.exit(1);
}

function placaDoVeiID(veiID) {
  return (mapVeiculos[String(veiID)] && mapVeiculos[String(veiID)].placa) || "";
}

const lines = fs.readFileSync(IN_FILE, "utf8").split("\n").filter(Boolean);

const points = [];
let total = 0;

for (const line of lines) {
  if (total++ > LIMIT) break;

  const r = JSON.parse(line);
  const vel = Number(r.vel ?? 0);

  if (!r.dt || r.lat == null || r.lon == null) continue;
  if (!(vel > SPEED_LIMIT)) continue;

  if (FILTER_DATE && !String(r.dt).startsWith(FILTER_DATE)) continue;

  if (FILTER_PLACA) {
    const p = placaDoVeiID(r.veiID);
    if (p !== FILTER_PLACA) continue;
  }

  // Peso do ponto: quanto mais acima do limite, mais forte no heatmap
  const weight = Math.min(50, Math.max(1, vel - SPEED_LIMIT)); // ex: 81=>1, 100=>20
  points.push([Number(r.lat), Number(r.lon), weight]);
}

// Centro do mapa (média)
let centerLat = -23.0, centerLon = -46.6;
if (points.length) {
  centerLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  centerLon = points.reduce((s, p) => s + p[1], 0) / points.length;
}

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Heatmap - Excesso de Velocidade > ${SPEED_LIMIT} km/h</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    body{margin:0;font-family:Arial}
    #map{height:100vh;width:100vw}
    .info{position:absolute;top:10px;left:10px;background:#fff;padding:10px;border-radius:8px;z-index:999;box-shadow:0 2px 10px rgba(0,0,0,.15)}
    .info b{display:block;margin-bottom:6px}
    .info small{color:#666}
  </style>
</head>
<body>
  <div class="info">
    <b>Excesso de velocidade (&gt; ${SPEED_LIMIT} km/h)</b>
    <div>Pontos: ${points.length}</div>
    <div>Filtro data: ${FILTER_DATE || "—"}</div>
    <div>Filtro placa: ${FILTER_PLACA || "—"}</div>
    <small>Peso = (velocidade - limite)</small>
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

    L.heatLayer(points, {
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
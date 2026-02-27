const fs = require("fs");
const { createJsonlSource } = require("./DataSource");
const { defaults } = require("./Defaults");
const { leafletHead, mapContainer, leafletScripts, OSM_TILE } = require("./htmlFragments");

function placaDoVeiID(map, veiID) {
  return (map[String(veiID)] && map[String(veiID)].placa) || "";
}

function loadMapVeiculos(mapPath, encoding) {
  try {
    return JSON.parse(fs.readFileSync(mapPath, encoding));
  } catch {
    return {};
  }
}

function buildHtml(
  title,
  points,
  centerLat,
  centerLon,
  extraInfo = "",
  leaflet = defaults.heatmap.leaflet
) {
  const head = leafletHead({ title });
  const mapDiv = mapContainer();
  const scripts = leafletScripts(true);

  return `<!doctype html>
<html>
<head>
${head}
</head>
<body>
  <div class="info">
    <b>${title}</b>
    <div>Pontos: ${points.length}</div>
    ${extraInfo}
  </div>

  ${mapDiv}

  ${scripts}

  <script>
    const map = L.map('map').setView([${centerLat}, ${centerLon}], 7);

    L.tileLayer('${OSM_TILE}', {
      maxZoom: ${leaflet.tileMaxZoom},
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const points = ${JSON.stringify(points)};

    L.heatLayer(points, {
      radius: ${leaflet.radius},
      blur: ${leaflet.blur},
      maxZoom: ${leaflet.maxZoom}
    }).addTo(map);
  </script>
</body>
</html>`;
}

class HeatmapGenerator {
  constructor(source, filter, opts = {}) {
    this.source = source;
    this.filter = filter;
    this.speedLimit = opts.speedLimit ?? 0;
    this._defaults = opts.defaults ?? defaults;
  }

  generate() {
    const d = this._defaults.heatmap;
    const encoding = this._defaults.encoding;
    const records = this.source.read();
    const mapVeiculos = loadMapVeiculos(this.filter.mapVeiculosPath, encoding);
    const { filterDate, filterPlaca, limit } = this.filter;
    const isExcesso = this.speedLimit > 0;

    const points = [];
    let total = 0;

    for (const r of records) {
      if (isExcesso && total++ > limit) break;
      if (!r.lat || r.lat == null || r.lon == null) continue;
      if (isExcesso && !r.dt) continue;

      const vel = Number(r.vel ?? 0);
      if (isExcesso && !(vel > this.speedLimit)) continue;

      if (filterDate && (!r.dt || !String(r.dt).startsWith(filterDate))) continue;
      if (filterPlaca && placaDoVeiID(mapVeiculos, r.veiID) !== filterPlaca) continue;

      const weight = isExcesso
        ? Math.min(d.weightCap, Math.max(1, vel - this.speedLimit))
        : Number.isFinite(Number(r.vel))
          ? Math.max(1, Number(r.vel))
          : 1;

      points.push([Number(r.lat), Number(r.lon), weight]);
    }

    let centerLat = d.centerLat;
    let centerLon = d.centerLon;
    if (points.length) {
      centerLat = points.reduce((s, p) => s + p[0], 0) / points.length;
      centerLon = points.reduce((s, p) => s + p[1], 0) / points.length;
    }

    const title = isExcesso
      ? `Excesso de velocidade (> ${this.speedLimit} km/h)`
      : "Mapa de Calor (Heatmap)";
    const extraInfo =
      `<div>Filtro data: ${filterDate || "—"}</div><div>Filtro placa: ${filterPlaca || "—"}</div>` +
      (isExcesso ? "<small>Peso = (velocidade - limite)</small>" : "");

    return { title, points, centerLat, centerLon, extraInfo };
  }
}

function create(opts) {
  const d = (opts.defaults ?? defaults).heatmap;
  const source = createJsonlSource(opts.posicoesPath, opts);
  const filter = {
    mapVeiculosPath: opts.mapVeiculosPath,
    filterDate: opts.filterDate ?? "",
    filterPlaca: opts.filterPlaca ?? "",
    limit: opts.limit ?? d.limit,
  };
  const speedLimit = opts.speedLimit ?? 0;
  return new HeatmapGenerator(source, filter, {
    speedLimit,
    defaults: opts.defaults ?? defaults,
  });
}

module.exports = {
  HeatmapGenerator,
  create,
  buildHtml,
};

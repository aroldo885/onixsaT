// ==================================================================
//  server_excessos.js — Itatibense Transportes
//  FINAL — HOJE + Regra Empresa (>80) + Velocidade do texto KM/H
//  Filtra por placa + mapa com caminhões + porta configurável
// ==================================================================

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 8081);

// -------------------------------------------------------
// Arquivos de dados
// -------------------------------------------------------
const ROOT = path.join(__dirname, "..");
const VIO_FILE = path.join(ROOT, "saida", "violacoes.jsonl");
const MAP_FILE = path.join(ROOT, "saida", "map_veiculos.json");

// -------------------------------------------------------
// Defaults (mantidos)
// -------------------------------------------------------
const MAX_POINTS_DEFAULT = Number(process.env.EXCESSOS_MAX_POINTS ?? 3000);
const SPEED_MIN_DEFAULT = Number(process.env.SPEED_MIN ?? 81);
const DEDUPE_BY_MID_DEF = String(process.env.DEDUPE_BY_MID ?? "0") === "1";
const OFFICIAL_ONLY_DEF = String(process.env.OFFICIAL_ONLY ?? "1") === "1";
const LAST_HOURS_DEFAULT = Number(process.env.LAST_HOURS_DEFAULT ?? 24);

// -------------------------------------------------------
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// -------------------------------------------------------
// Utilitários
// -------------------------------------------------------
function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}
function safeNumber(x) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
function parseBool(v, def = false) {
  if (v == null) return def;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "t", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "f", "no", "n", "off"].includes(s)) return false;
  return def;
}
function parseDateLike(v) {
  if (v == null || v === "") return NaN;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const num = Number(s);
    return num > 1e12 ? num : num * 1000;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : NaN;
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Aceita ISO e também "YYYY-MM-DD HH:mm:ss"
function parseDtFlexible(dt) {
  if (!dt) return NaN;
  const s = String(dt).trim();
  const tIso = Date.parse(s);
  if (Number.isFinite(tIso)) return tIso;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\d{2}:\d{2}:\d{2}(?:\.\d+)?$/);
  if (m) {
    const d = new Date(`${m[1]}T${m[2]}`);
    if (!isNaN(d)) return d.getTime();
  }
  return NaN;
}

// EXTRA — extrair 83KM/H do texto
function extractSpeedFromText(r) {
  const m = String(r.alrtTelem || "")
    .toUpperCase()
    .match(/(\d{2,3})\s*KM\/H/);
  return m ? Number(m[1]) : NaN;
}

function extractSpeedLimit(r) {
  return safeNumber(r.limite);
}

// Modo HOJE
function getTimeRange(req) {
  const now = Date.now();
  if (String(req.query.today || "0") === "1") {
    return { since: startOfToday(), until: now, mode: "TODAY" };
  }
  const lh = Number(req.query.lastHours ?? LAST_HOURS_DEFAULT);
  if (Number.isFinite(lh) && lh > 0) {
    return { since: now - lh * 3600000, until: now, mode: "LAST_HOURS" };
  }
  const since = parseDateLike(req.query.since);
  const until = parseDateLike(req.query.until);
  const s = Number.isFinite(since) ? since : now - 24 * 3600000;
  const u = Number.isFinite(until) ? until : now;
  return { since: s, until: u, mode: "RANGE" };
}

// Apenas para compatibilidade (não usado no company80)
function isExcessoOficial(r) {
  const tipo = String(r.tipo ?? "").toUpperCase();
  if (tipo === "EXCESSO_VELOCIDADE") return true;
  const a = String(r.alrtTelem ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const pats = [
    /excesso\s+de\s+velocidade/,
    /excesso\s+velocidade/,
    /velocidade\s+excessiva/,
    /alerta\s+de\s+velocidade/,
  ];
  return pats.some((rx) => rx.test(a));
}

// -------------------------------------------------------
//  API PRINCIPAL — /api/excessos
//  Agora com company80 = vel > 80 FIXO
//  + velocidade extraída do texto (83KM/H)
// -------------------------------------------------------
app.get("/api/excessos", (req, res) => {
  const map = loadJson(MAP_FILE, {});
  const { since, until, mode } = getTimeRange(req);

  const company80 = String(req.query.company80 || "0") === "1";

  const speedMin = Number(req.query.speedMin ?? SPEED_MIN_DEFAULT);
  const maxPoints = Number(req.query.maxPoints ?? MAX_POINTS_DEFAULT);
  const dedupeByMid = parseBool(req.query.dedupe ?? DEDUPE_BY_MID_DEF);
  const officialOnly = parseBool(req.query.officialOnly ?? OFFICIAL_ONLY_DEF);
  const useLimit = parseBool(req.query.useLimit ?? false);
  const wantStats = parseBool(req.query.stats ?? false);

  // filtro por placa
  const placaQuery = String(req.query.placa ?? "").trim();
  const placasWanted = placaQuery
    ? new Set(placaQuery.split(",").map((s) => s.trim().toUpperCase()))
    : null;

  if (!fs.existsSync(VIO_FILE)) {
    return res.json({
      mode,
      since: new Date(since).toISOString(),
      until: new Date(until).toISOString(),
      company80,
      points: [],
    });
  }

  const raw = fs.readFileSync(VIO_FILE, "utf8");
  const lines = raw.split("\n").filter(Boolean);

  const seenMid = new Set();
  const points = [];
  const placasSet = new Set();

  const stats = {
    lines: lines.length,
    parsed: 0,
    inRange: 0,
    officialPass: 0,
    speedPass: 0,
    latlonPass: 0,
    deduped: 0,
    final: 0,
  };

  for (const line of lines) {
    let r;
    try {
      r = JSON.parse(line);
      stats.parsed++;
    } catch {
      continue;
    }

    const t = parseDtFlexible(r.dt);
    if (!Number.isFinite(t) || t < since || t > until) continue;
    stats.inRange++;

    // Oficial (IGNORADO no company80)
    if (!company80 && officialOnly && !isExcessoOficial(r)) continue;
    stats.officialPass++;

    // velocidade do número + texto (KM/H)
    const velNum = safeNumber(r.vel);
    const velTxt = extractSpeedFromText(r);
    const vel = Number.isFinite(velTxt) ? Math.max(velTxt, velNum) : velNum;
    if (!Number.isFinite(vel)) continue;

    // regra empresa (default + overrides, no else)
    let passSpeed = vel >= speedMin;
    if (company80) passSpeed = vel > 80;
    if (useLimit && !company80) {
      const lim = extractSpeedLimit(r);
      passSpeed = Number.isFinite(lim) ? vel > lim : vel >= speedMin;
    }
    if (!passSpeed) continue;
    stats.speedPass++;

    const lat = safeNumber(r.lat),
      lon = safeNumber(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    stats.latlonPass++;

    const mid = String(r.mId ?? "");
    if (dedupeByMid && mid) {
      if (seenMid.has(mid)) {
        stats.deduped++;
        continue;
      }
      seenMid.add(mid);
    }

    const v = map[String(r.veiID)] ?? {};
    const placa = String(v.placa ?? "").toUpperCase();

    if (placasWanted && (!placa || !placasWanted.has(placa))) continue;

    placasSet.add(placa || "(sem placa)");

    points.push({
      veiID: r.veiID,
      placa,
      motorista: v.mot ?? "",
      dt: r.dt,
      ts: t,
      vel,
      lat,
      lon,
      mun: r.mun ?? "",
      uf: r.uf ?? "",
      via: r.via ?? "",
    });
  }

  points.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  const limited = points.slice(0, maxPoints);
  stats.final = limited.length;

  res.json({
    mode,
    since: new Date(since).toISOString(),
    until: new Date(until).toISOString(),
    company80,
    placas: Array.from(placasSet).sort(),
    ...(wantStats ? { stats } : {}),
    points: limited,
  });
});

// -------------------------------------------------------
//  /mapa — HOJE + company80 + filtro de placa + caminhão
// -------------------------------------------------------
app.get("/mapa", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Excesso > 80 km/h — HOJE</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
 body{margin:0;font-family:Arial}
 #bar{position:absolute;top:10px;left:10px;right:10px;z-index:9999}
 #box{background:#fff;padding:10px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2);display:flex;gap:10px;align-items:center}
 #map{height:100vh;width:100vw}
 select{padding:4px;font-size:14px}
 .truck{font-size:22px; line-height:22px; text-shadow:0 0 3px #fff}
 .truck.fast{filter:hue-rotate(300deg)}
</style>
</head>
<body>
<div id="bar">
  <div id="box">
    <b>Excesso > 80 km/h (HOJE)</b>
    <label>Placa:</label>
    <select id="selPlaca"><option value="">(todas)</option></select>
    <span id="meta"></span>
  </div>
</div>

<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
function apiHoje(placa){
  const q=new URLSearchParams({
    today:"1",
    company80:"1",
    dedupe:"0",
    stats:"1"
  });
  if(placa) q.set("placa",placa);
  return "/api/excessos?"+q.toString();
}

const map=L.map("map").setView([-23.2,-46.8],7);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18}).addTo(map);
const layer=L.layerGroup().addTo(map);

function truckIcon(vel){
  return L.divIcon({
    className:"truck"+(vel>=100?" fast":""), 
    html:"🚚",
    iconSize:[20,20],iconAnchor:[10,10]
  });
}
function fmt(ts){ return new Date(ts).toLocaleString("pt-BR") }

const sel=document.getElementById("selPlaca");
let lastPlacas=[];

function popularPlacas(list){
  const arr=(list||[]).filter(Boolean);
  if(JSON.stringify(arr)===JSON.stringify(lastPlacas)) return;
  lastPlacas=arr;
  sel.innerHTML='<option value="">(todas)</option>' +
    arr.map(p=>'<option>'+p+'</option>').join('');
}

async function refresh(){
  const placa=sel.value||"";
  const r=await fetch(apiHoje(placa),{cache:"no-store"});
  const data=await r.json();

  popularPlacas(data.placas||[]);
  document.getElementById("meta").innerText=
    "Pontos: " + ((data.points||[]).length);

  layer.clearLayers();
  const pts=(data.points||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
  const bounds=[];
  pts.forEach(p=>{
    const m=L.marker([p.lat,p.lon],{icon:truckIcon(p.vel),title:p.placa||""});
    m.bindPopup(
      "Placa: "+(p.placa||"-")+
      "<br/>Vel: "+p.vel+
      "<br/>Horário: "+fmt(p.ts)
    );
    m.addTo(layer);
    bounds.push([p.lat,p.lon]);
  });

  if(bounds.length) map.fitBounds(bounds,{padding:[30,30]});
}

sel.addEventListener("change",refresh);
refresh();
setInterval(refresh,60000);
</script>

</body>
</html>`);
});

// -------------------------------------------------------
app.listen(PORT, () => console.log("Abra: http://localhost:" + PORT + "/mapa"));
// -------------------------------------------------------

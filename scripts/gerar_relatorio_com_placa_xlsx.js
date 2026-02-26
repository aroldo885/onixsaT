const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const ROOT = path.join(__dirname, "..");
const POS_FILE = path.join(ROOT, "saida", "posicoes.jsonl");
const MAP_FILE = path.join(ROOT, "saida", "map_veiculos.json");
const OUT_FILE = path.join(ROOT, "saida", "relatorio_posicoes_hora_a_hora_COM_PLACA.xlsx");

if (!fs.existsSync(POS_FILE)) {
  console.error("Não achei:", POS_FILE);
  process.exit(1);
}
if (!fs.existsSync(MAP_FILE)) {
  console.error("Não achei:", MAP_FILE, "-> Rode o test_veiculos.js primeiro");
  process.exit(1);
}

function floorHour(dtIso) {
  return `${dtIso.slice(0, 10)} ${dtIso.slice(11, 13)}:00`;
}

const map = JSON.parse(fs.readFileSync(MAP_FILE, "utf8"));

// Lê JSONL
const lines = fs.readFileSync(POS_FILE, "utf8").split("\n").filter(Boolean);
const registros = lines.map((l) => JSON.parse(l));

// Hora a hora: último registro do veículo dentro da hora
const mapHora = new Map();
for (const r of registros) {
  if (!r.dt || !r.veiID) continue;
  const h = floorHour(r.dt);
  const key = `${r.veiID}__${h}`;
  const prev = mapHora.get(key);
  if (!prev || r.dt > prev.dt) mapHora.set(key, r);
}

const horaAHora = Array.from(mapHora.values()).sort((a, b) => {
  const ah = floorHour(a.dt);
  const bh = floorHour(b.dt);
  if (ah !== bh) return ah.localeCompare(bh);
  return String(a.veiID).localeCompare(String(b.veiID));
});

// Resumo por hora
const resumoMap = new Map();
for (const r of horaAHora) {
  const hora = floorHour(r.dt);
  const item = resumoMap.get(hora) || { hora, qtd: 0, somaVel: 0, veis: new Set() };
  item.qtd += 1;
  item.somaVel += Number(r.vel || 0);
  item.veis.add(String(r.veiID));
  resumoMap.set(hora, item);
}

const resumo = Array.from(resumoMap.values())
  .map((x) => ({
    hora: x.hora,
    qtd_registros: x.qtd,
    qtd_veiculos: x.veis.size,
    vel_media: x.qtd ? x.somaVel / x.qtd : 0,
  }))
  .sort((a, b) => a.hora.localeCompare(b.hora));

(async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Onixsat Robot";

  // Aba 1
  const ws1 = wb.addWorksheet("Hora a Hora", { views: [{ state: "frozen", ySplit: 1 }] });
  ws1.columns = [
    { header: "Placa", key: "placa", width: 10 },
    { header: "Veículo (veiID)", key: "veiID", width: 14 },
    { header: "Motorista", key: "mot", width: 28 },
    { header: "Ident", key: "ident", width: 16 },
    { header: "Hora", key: "hora", width: 18 },
    { header: "Data/Hora Evento", key: "dt", width: 26 },
    { header: "Cidade", key: "mun", width: 22 },
    { header: "UF", key: "uf", width: 6 },
    { header: "Vel (km/h)", key: "vel", width: 12 },
    { header: "Latitude", key: "lat", width: 12 },
    { header: "Longitude", key: "lon", width: 12 },
    { header: "Via", key: "via", width: 55 },
  ];
  ws1.autoFilter = "A1:L1";
  ws1.getRow(1).font = { bold: true };

  for (const r of horaAHora) {
    const v = map[String(r.veiID)] || {};
    ws1.addRow({
      placa: v.placa || "",
      veiID: r.veiID,
      mot: v.mot || "",
      ident: v.ident || "",
      hora: floorHour(r.dt),
      dt: r.dt,
      mun: r.mun || "",
      uf: r.uf || "",
      vel: Number(r.vel ?? 0),
      lat: Number(r.lat ?? 0),
      lon: Number(r.lon ?? 0),
      via: r.via || "",
    });
  }

  ws1.getColumn("vel").numFmt = "0";
  ws1.getColumn("lat").numFmt = "0.000000";
  ws1.getColumn("lon").numFmt = "0.000000";

  // Aba 2
  const ws2 = wb.addWorksheet("Resumo por Hora", { views: [{ state: "frozen", ySplit: 1 }] });
  ws2.columns = [
    { header: "Hora", key: "hora", width: 18 },
    { header: "Qtd Registros", key: "qtd_registros", width: 14 },
    { header: "Qtd Veículos", key: "qtd_veiculos", width: 12 },
    { header: "Vel Média (km/h)", key: "vel_media", width: 16 },
  ];
  ws2.autoFilter = "A1:D1";
  ws2.getRow(1).font = { bold: true };
  for (const r of resumo) ws2.addRow(r);
  ws2.getColumn("vel_media").numFmt = "0.0";

  await wb.xlsx.writeFile(OUT_FILE);
  console.log("✅ Gerado:", OUT_FILE);
  console.log("Linhas hora a hora:", horaAHora.length);
})();
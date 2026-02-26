const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const ROOT = path.join(__dirname, "..");
const IN_FILE = path.join(ROOT, "saida", "posicoes.jsonl");
const OUT_FILE = path.join(ROOT, "saida", "relatorio_posicoes_hora_a_hora.xlsx");

if (!fs.existsSync(IN_FILE)) {
  console.error("Arquivo não encontrado:", IN_FILE);
  process.exit(1);
}

function floorHourFromDt(dtIsoWithTz) {
  // dt exemplo: 2026-02-25T10:31:34-03:00
  const date = dtIsoWithTz.slice(0, 10); // 2026-02-25
  const hour = dtIsoWithTz.slice(11, 13); // 10
  return `${date} ${hour}:00`;
}

const lines = fs.readFileSync(IN_FILE, "utf8").split("\n").filter(Boolean);
const registros = lines.map((l) => JSON.parse(l));

// 1) Compilar “hora a hora”: manter o ÚLTIMO registro de cada veículo dentro da hora
// chave: veiID + hora
const map = new Map();

for (const r of registros) {
  if (!r.dt || !r.veiID) continue;
  const horaChave = floorHourFromDt(r.dt);
  const key = `${r.veiID}__${horaChave}`;

  const prev = map.get(key);
  // Mantém o mais recente dentro daquela hora
  if (!prev || (r.dt && prev.dt && r.dt > prev.dt) || !prev.dt) {
    map.set(key, r);
  }
}

const horaAHora = Array.from(map.values()).sort((a, b) => {
  const ah = floorHourFromDt(a.dt);
  const bh = floorHourFromDt(b.dt);
  if (ah !== bh) return ah.localeCompare(bh);
  return String(a.veiID).localeCompare(String(b.veiID));
});

// 2) Resumo por hora
const resumoMap = new Map();
for (const r of horaAHora) {
  const hora = floorHourFromDt(r.dt);
  const item = resumoMap.get(hora) || { hora, qtd: 0, somaVel: 0, vei: new Set() };
  item.qtd += 1;
  item.somaVel += Number(r.vel || 0);
  item.vei.add(String(r.veiID));
  resumoMap.set(hora, item);
}

const resumo = Array.from(resumoMap.values())
  .map((x) => ({
    hora: x.hora,
    qtd_registros: x.qtd,
    qtd_veiculos: x.vei.size,
    vel_media: x.qtd ? x.somaVel / x.qtd : 0,
  }))
  .sort((a, b) => a.hora.localeCompare(b.hora));

// 3) Gerar XLSX bonitão
(async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Onixsat Robot";

  // Aba 1: Hora a hora
  const ws1 = wb.addWorksheet("Hora a Hora", { views: [{ state: "frozen", ySplit: 1 }] });
  ws1.columns = [
    { header: "Veículo (veiID)", key: "veiID", width: 16 },
    { header: "Hora (YYYY-MM-DD HH:00)", key: "hora", width: 22 },
    { header: "Data/Hora Evento (dt)", key: "dt", width: 26 },
    { header: "Cidade", key: "mun", width: 22 },
    { header: "UF", key: "uf", width: 6 },
    { header: "Velocidade (km/h)", key: "vel", width: 18 },
    { header: "Latitude", key: "lat", width: 12 },
    { header: "Longitude", key: "lon", width: 12 },
    { header: "Via", key: "via", width: 50 },
  ];

  ws1.autoFilter = "A1:I1";

  for (const r of horaAHora) {
    ws1.addRow({
      veiID: r.veiID,
      hora: floorHourFromDt(r.dt),
      dt: r.dt,
      mun: r.mun || "",
      uf: r.uf || "",
      vel: Number(r.vel ?? 0),
      lat: Number(r.lat ?? 0),
      lon: Number(r.lon ?? 0),
      via: r.via || "",
    });
  }

  // Formatação numérica (lat/lon com 6 casas, vel inteiro)
  ws1.getColumn("vel").numFmt = "0";
  ws1.getColumn("lat").numFmt = "0.000000";
  ws1.getColumn("lon").numFmt = "0.000000";

  // Cabeçalho em negrito
  ws1.getRow(1).font = { bold: true };

  // Aba 2: Resumo por hora
  const ws2 = wb.addWorksheet("Resumo por Hora", { views: [{ state: "frozen", ySplit: 1 }] });
  ws2.columns = [
    { header: "Hora (YYYY-MM-DD HH:00)", key: "hora", width: 22 },
    { header: "Qtd Registros", key: "qtd_registros", width: 14 },
    { header: "Qtd Veículos", key: "qtd_veiculos", width: 12 },
    { header: "Vel Média (km/h)", key: "vel_media", width: 16 },
  ];
  ws2.autoFilter = "A1:D1";
  ws2.getRow(1).font = { bold: true };

  for (const r of resumo) ws2.addRow(r);
  ws2.getColumn("vel_media").numFmt = "0.0";

  await wb.xlsx.writeFile(OUT_FILE);
  console.log("✅ XLSX gerado:", OUT_FILE);
  console.log("Linhas (hora a hora):", horaAHora.length);
})();
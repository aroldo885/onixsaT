const fs = require("fs");
const path = require("path");

const IN_FILE = path.join(__dirname, "saida", "posicoes.jsonl");
const OUT_FILE = path.join(__dirname, "saida", "relatorio_hora.csv");

if (!fs.existsSync(IN_FILE)) {
  console.error("Arquivo não encontrado:", IN_FILE);
  process.exit(1);
}

const lines = fs.readFileSync(IN_FILE, "utf8").trim().split("\n").filter(Boolean);

const registros = lines.map(l => JSON.parse(l));

// normalizar data e extrair hora
registros.forEach(r => {
  const d = new Date(r.dt);
  r.data = d.toISOString().split("T")[0];
  r.hora = d.getHours().toString().padStart(2, "0") + ":00";
});

// ordenar
registros.sort((a, b) => {
  if (a.veiID !== b.veiID) return a.veiID.localeCompare(b.veiID);
  return new Date(a.dt) - new Date(b.dt);
});

// gerar CSV organizado
const header = [
  "Veiculo",
  "Data",
  "Hora",
  "Cidade",
  "UF",
  "Velocidade",
  "Latitude",
  "Longitude",
  "Via"
];

const rows = [header.join(";")];

registros.forEach(r => {
  rows.push([
    r.veiID,
    r.data,
    r.hora,
    r.mun,
    r.uf,
    r.vel,
    r.lat,
    r.lon,
    r.via
  ].join(";"));
});

fs.writeFileSync(OUT_FILE, rows.join("\n"), "utf8");

console.log("Relatório gerado em:");
console.log(OUT_FILE);
console.log("Total registros:", registros.length);
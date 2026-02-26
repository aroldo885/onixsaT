const fs = require("fs");
const path = require("path");

const IN_FILE = path.join(__dirname, "saida", "posicoes.jsonl");
const OUT_CSV = path.join(__dirname, "saida", "historico_posicoes.csv");

if (!fs.existsSync(IN_FILE)) {
  console.error("Arquivo não encontrado:", IN_FILE);
  process.exit(1);
}

const lines = fs.readFileSync(IN_FILE, "utf8").trim().split("\n").filter(Boolean);

const cols = ["mId", "veiID", "dt", "lat", "lon", "vel", "mun", "uf", "via"];
const rows = [cols.join(";")];

for (const line of lines) {
  const o = JSON.parse(line);
  rows.push(cols.map((c) => (o[c] ?? "")).join(";"));
}

fs.writeFileSync(OUT_CSV, rows.join("\n"), "utf8");
console.log("Gerado:", OUT_CSV);
console.log("Linhas:", lines.length);
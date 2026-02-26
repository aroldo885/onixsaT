// check-data.js — diagnóstico rápido dos dados
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VIO_FILE = path.join(ROOT, "saida", "violacoes.jsonl");

if (!fs.existsSync(VIO_FILE)) {
  console.log("Arquivo não encontrado:", VIO_FILE);
  process.exit(0);
}

const raw = fs.readFileSync(VIO_FILE, "utf8");
const lines = raw.split("\n").filter(Boolean);

function parse(dt) {
  const t = Date.parse(dt);
  return Number.isFinite(t) ? t : NaN;
}

const now = Date.now();
const since6h = now - 6 * 3600000;
let total = 0,
  hoje = 0,
  ult6h = 0,
  excessoHoje = 0;

for (const line of lines) {
  try {
    const r = JSON.parse(line);
    total++;
    const t = parse(r.dt);
    const d = new Date(t);
    const isHoje = Number.isFinite(t) && d.toDateString() === new Date(now).toDateString();
    if (isHoje) hoje++;
    if (Number.isFinite(t) && t >= since6h) ult6h++;
    if (
      isHoje &&
      (String(r.tipo).toUpperCase() === "EXCESSO_VELOCIDADE" ||
        String(r.alrtTelem || "")
          .toLowerCase()
          .includes("excesso"))
    )
      excessoHoje++;
  } catch {}
}

console.log({ total, hoje, ult6h, excessoHoje });

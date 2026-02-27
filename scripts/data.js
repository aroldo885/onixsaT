#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const config = require("../src/config");
const { createJsonlSource } = require("../src/core/DataSource");

const args = process.argv.slice(2);
const check = args.includes("--check");
const compilar = args.includes("--compilar");

if (!check && !compilar) {
  console.error("Uso: node scripts/data.js --check | --compilar");
  process.exit(1);
}
if (check && compilar) {
  console.error("Use apenas --check ou --compilar, não ambos.");
  process.exit(1);
}

if (check) {
  const source = createJsonlSource(config.paths.violacoesJsonl);
  const records = source.read();
  if (records.length === 0) {
    console.log("Arquivo não encontrado ou vazio:", config.paths.violacoesJsonl);
    process.exit(0);
  }
  function parse(dt) {
    const t = Date.parse(dt);
    return Number.isFinite(t) ? t : NaN;
  }
  const now = Date.now();
  const since6h = now - 6 * 3600000;
  let total = 0;
  let hoje = 0;
  let ult6h = 0;
  let excessoHoje = 0;
  for (const r of records) {
    total++;
    const t = parse(r.dt);
    const d = new Date(t);
    const isHoje =
      Number.isFinite(t) && d.toDateString() === new Date(now).toDateString();
    if (isHoje) hoje++;
    if (Number.isFinite(t) && t >= since6h) ult6h++;
    if (
      isHoje &&
      (String(r.tipo).toUpperCase() === "EXCESSO_VELOCIDADE" ||
        String(r.alrtTelem || "").toLowerCase().includes("excesso"))
    )
      excessoHoje++;
  }
  console.log({ total, hoje, ult6h, excessoHoje });
}

if (compilar) {
  const { paths } = config;
  const source = createJsonlSource(paths.posicoesJsonl);
  const records = source.read();
  if (records.length === 0) {
    console.error("Arquivo não encontrado ou vazio:", paths.posicoesJsonl);
    process.exit(1);
  }
  const cols = ["mId", "veiID", "dt", "lat", "lon", "vel", "mun", "uf", "via"];
  const rows = [cols.join(";")];
  for (const o of records) {
    rows.push(cols.map((c) => o[c] ?? "").join(";"));
  }
  const outPath = path.join(paths.outDir, "historico_posicoes.csv");
  fs.writeFileSync(outPath, rows.join("\n"), "utf8");
  console.log("Gerado:", outPath);
  console.log("Linhas:", records.length);
}

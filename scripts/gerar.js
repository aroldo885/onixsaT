#!/usr/bin/env node
/**
 * Generate maps and reports: mapa-calor | relatorio
 *
 * Usage:
 *   node scripts/gerar.js mapa-calor [--excesso] [--speed-limit N]
 *   node scripts/gerar.js relatorio [--format csv|xlsx] [--with-placa]
 */

const fs = require("fs");
const path = require("path");
const config = require("../src/config");

const args = process.argv.slice(2);
const cmd = args[0];
if (!cmd || !["mapa-calor", "relatorio"].includes(cmd)) {
  console.error("Uso: node scripts/gerar.js mapa-calor | relatorio [opções]");
  process.exit(1);
}

const { paths, heatmap } = config;
const posicoesPath = paths.posicoesJsonl;

if (!fs.existsSync(posicoesPath)) {
  console.error("Arquivo não encontrado:", posicoesPath);
  process.exit(1);
}

function parseMapaCalorArgs(a) {
  const out = { excesso: false, speedLimit: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--excesso") out.excesso = true;
    if (a[i] === "--speed-limit" && a[i + 1]) {
      out.speedLimit = Number(a[i + 1]);
      i++;
    }
  }
  return out;
}

function parseRelatorioArgs(a) {
  const out = { format: "csv", withPlaca: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--format" && a[i + 1]) {
      out.format = a[i + 1].toLowerCase();
      i++;
    }
    if (a[i] === "--with-placa") out.withPlaca = true;
  }
  return out;
}

if (cmd === "mapa-calor") {
  const { create, buildHtml } = require("../src/core/HeatmapGenerator");
  const rest = args.slice(1);
  const mapaArgs = parseMapaCalorArgs(rest);
  const speedLimit = mapaArgs.excesso
    ? (mapaArgs.speedLimit ?? heatmap.speedLimit ?? 80)
    : 0;
  const opts = {
    posicoesPath,
    mapVeiculosPath: paths.mapVeiculos,
    filterDate: heatmap.filterDate,
    filterPlaca: heatmap.filterPlaca,
    limit: heatmap.limit,
    speedLimit,
  };
  const generator = create(opts);
  const result = generator.generate();
  const outFileName =
    speedLimit > 0 ? "mapa_calor_excesso_80.html" : "mapa_calor.html";
  const outPath = path.join(paths.outDir, outFileName);
  const html = buildHtml(
    result.title,
    result.points,
    result.centerLat,
    result.centerLon,
    result.extraInfo
  );
  fs.writeFileSync(outPath, html, "utf8");
  console.log("✅ Gerado:", outPath);
  console.log("Abra no navegador.");
}

if (cmd === "relatorio") {
  const { ReportFormat } = require("../src/core/enums");
  const { create } = require("../src/core/ReportGenerator");
  const rest = args.slice(1);
  const relArgs = parseRelatorioArgs(rest);
  const format =
    relArgs.format === "xlsx" ? ReportFormat.XLSX : ReportFormat.CSV;
  let outPath;
  if (format === ReportFormat.CSV) {
    outPath = path.join(paths.outDir, "relatorio_hora.csv");
  } else if (relArgs.withPlaca) {
    if (!fs.existsSync(paths.mapVeiculos)) {
      console.error(
        "Não achei:",
        paths.mapVeiculos,
        "-> Rode npm run onixsat:veiculos primeiro"
      );
      process.exit(1);
    }
    outPath = path.join(
      paths.outDir,
      "relatorio_posicoes_hora_a_hora_COM_PLACA.xlsx"
    );
  } else {
    outPath = path.join(paths.outDir, "relatorio_posicoes_hora_a_hora.xlsx");
  }
  const opts = {
    posicoesPath,
    outPath,
    mapVeiculosPath: paths.mapVeiculos,
    withPlaca: relArgs.withPlaca,
  };
  const generator = create(format, opts);
  (async () => {
    const result = generator.generate();
    if (result && typeof result.then === "function") {
      await result;
    }
  })().catch((e) => {
    console.error("Erro:", e.message);
    process.exit(1);
  });
}

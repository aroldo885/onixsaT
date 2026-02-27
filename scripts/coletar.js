#!/usr/bin/env node
/**
 * Unified collector CLI. Replaces coletar_posicoes_loop, coletar_posicoes_e_violacoes, robo_posicoes.
 *
 * Usage:
 *   node scripts/coletar.js                    # positions only
 *   node scripts/coletar.js --interval 60000
 *   node scripts/coletar.js --with-violations # positions + violations (5 min, backoff)
 *   node scripts/coletar.js --once            # one shot, exit
 */

const fs = require("fs");
const config = require("../src/config");
const { CollectorMode } = require("../src/core/enums");
const { OnixSatClient } = require("../src/core/OnixSatClient");
const { Collector } = require("../src/core/Collector");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { withViolations: false, once: false, interval: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--with-violations") out.withViolations = true;
    if (args[i] === "--once") out.once = true;
    if (args[i] === "--interval" && args[i + 1]) {
      out.interval = Number(args[i + 1]);
      i++;
    }
  }
  return out;
}

const { wsUrl, login, senha } = config.onixsat;
if (!wsUrl || !login || !senha) {
  console.error("Faltou ONIXSAT_WS_URL / ONIXSAT_LOGIN / ONIXSAT_SENHA no .env");
  process.exit(1);
}

const paths = config.paths;
fs.mkdirSync(paths.outDir, { recursive: true });
if (!fs.existsSync(paths.posicoesJsonl))
  fs.writeFileSync(paths.posicoesJsonl, "", "utf8");
if (!fs.existsSync(paths.violacoesJsonl))
  fs.writeFileSync(paths.violacoesJsonl, "", "utf8");

const args = parseArgs();

const mode = args.once
  ? CollectorMode.ONCE
  : args.withViolations
    ? CollectorMode.POSITIONS_AND_VIOLATIONS
    : CollectorMode.POSITIONS_ONLY;

const intervalMs =
  args.interval ??
  (mode === CollectorMode.POSITIONS_AND_VIOLATIONS
    ? config.coletor.intervalAllMs
    : config.coletor.intervalMs);

const client = new OnixSatClient({ wsUrl, login, senha });

const collector = new Collector({
  client,
  statePath: paths.estadoJson,
  mode,
  speedLimit: config.coletor.speedLimit,
  excessoText: config.coletor.excessoText,
  paths,
  options: {
    intervalMs,
    backoffInit: 300000,
    backoffMax: config.coletor.backoffMaxMs,
    backoffFactor: config.coletor.backoffFactor,
  },
});

if (mode === CollectorMode.ONCE) {
  collector.runOnce().catch((e) => {
    console.error("Erro:", e.message);
    process.exit(1);
  });
} else {
  const label =
    mode === CollectorMode.POSITIONS_AND_VIOLATIONS
      ? "Coletor (posições + violações)"
      : "Coletor";
  console.log(
    `✅ ${label} iniciado. Intervalo: ${intervalMs} ms`,
    mode === CollectorMode.POSITIONS_AND_VIOLATIONS
      ? `| Backoff: 300000 -> ${config.coletor.backoffMaxMs}`
      : ""
  );
  collector.run();
}

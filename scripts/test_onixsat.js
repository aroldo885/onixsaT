#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const config = require("../src/config");
const { OnixSatClient, OnixSatParsers } = require("../src/core/OnixSatClient");

const { wsUrl, login, senha, mid } = config.onixsat;

if (!wsUrl || !login || !senha) {
  console.error("Faltou ONIXSAT_WS_URL / ONIXSAT_LOGIN / ONIXSAT_SENHA no .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const veiculos = args.includes("--veiculos");
const posicoes = args.includes("--posicoes");

if (!veiculos && !posicoes) {
  console.error("Uso: node scripts/test_onixsat.js --veiculos | --posicoes");
  process.exit(1);
}

const client = new OnixSatClient({ wsUrl, login, senha });

(async () => {
  if (veiculos) {
    console.log("POST:", wsUrl);
    const vehiclesArray = await client.fetchVeiculos();
    if (!vehiclesArray || !vehiclesArray.length) {
      console.log("Não consegui localizar a lista de veículos.");
      process.exit(0);
    }
    const first = vehiclesArray[0] || {};
    console.log("Exemplo 1º veículo (chaves):", Object.keys(first));
    const map = {};
    for (const it of vehiclesArray) {
      const veiID = OnixSatParsers.toText(it.veiID) || "";
      const placa = OnixSatParsers.toText(it.placa) || "";
      const mot = OnixSatParsers.toText(it.mot) || "";
      const ident = OnixSatParsers.toText(it.ident) || "";
      if (veiID) map[veiID] = { veiID, placa, mot, ident };
    }
    const outDir = config.paths.outDir;
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "map_veiculos.json");
    fs.writeFileSync(outFile, JSON.stringify(map, null, 2), "utf8");
    console.log("✅ Mapa gerado:", outFile);
    console.log("Total veículos (mapeados):", Object.keys(map).length);
  }
  if (posicoes) {
    console.log("POST:", wsUrl);
    console.log("mId:", mid);
    const msgs = await client.fetchMensagens(mid ?? "1");
    console.log("Topo do JSON: ResponseMensagemCB");
    console.log("Mensagens recebidas:", msgs.length);
    if (msgs.length > 0) {
      console.log("Exemplo:", JSON.stringify(msgs[0], null, 2).slice(0, 1500));
    }
  }
})().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const fs = require("fs");
const axios = require("axios");
const AdmZip = require("adm-zip");
const { xml2js } = require("xml-js");

const WS_URL = process.env.ONIXSAT_WS_URL;
const LOGIN = process.env.ONIXSAT_LOGIN;
const SENHA = process.env.ONIXSAT_SENHA;
const MID = process.env.ONIXSAT_MID || "1";

if (!WS_URL || !LOGIN || !SENHA) {
  console.error("Faltou ONIXSAT_WS_URL / ONIXSAT_LOGIN / ONIXSAT_SENHA no .env");
  process.exit(1);
}

const xml = `
<RequestVeiculo>
  <login>${LOGIN}</login>
  <senha>${SENHA}</senha>
  <mId>${MID}</mId>
</RequestVeiculo>
`.trim();

function unzipOrXml(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    if (!entries.length) throw new Error("ZIP vazio");
    return { xmlString: entries[0].getData().toString("utf8"), zipped: true, entry: entries[0].entryName };
  } catch {
    return { xmlString: buffer.toString("utf8"), zipped: false, entry: null };
  }
}

function toText(node) {
  return node && typeof node === "object" && "_text" in node ? node._text : "";
}

(async () => {
  console.log("POST:", WS_URL);
  console.log("XML enviado:\n", xml);

  const resp = await axios.post(WS_URL, xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    responseType: "arraybuffer",
    timeout: 60000,
    validateStatus: () => true,
  });

  const buf = Buffer.from(resp.data || []);
  const { xmlString, zipped, entry } = unzipOrXml(buf);
  console.log(zipped ? `Resposta ZIPADA (${entry})` : "Resposta XML direto (não zip).");

  const json = xml2js(xmlString, { compact: true, ignoreDeclaration: true });

  if (json?.ErrorRequest?.erro?._text) {
    console.log("ERRO:", json.ErrorRequest.erro._text);
    process.exit(1);
  }

  console.log("Topo do JSON:", Object.keys(json));

  // Esperado: ResponseVeiculo
  const rootKey = Object.keys(json)[0];
  const root = json[rootKey];

  // Normalmente ResponseVeiculo -> Veiculo[] (ou algo equivalente)
  let vehiclesArray = null;
  for (const k of Object.keys(root || {})) {
    const v = root[k];
    if (Array.isArray(v)) { vehiclesArray = v; break; }
    if (v && typeof v === "object") {
      for (const kk of Object.keys(v)) {
        if (Array.isArray(v[kk])) { vehiclesArray = v[kk]; break; }
      }
    }
    if (vehiclesArray) break;
  }

  if (!vehiclesArray) {
    console.log("Não consegui localizar a lista de veículos automaticamente.");
    console.log(JSON.stringify(json, null, 2).slice(0, 4000));
    process.exit(0);
  }

  const first = vehiclesArray[0] || {};
  console.log("Exemplo 1º veículo (chaves):", Object.keys(first));
  console.log("Exemplo 1º veículo (preview):", JSON.stringify(first, null, 2).slice(0, 2000));

  // ✅ Mapa completo: veiID -> placa + motorista + ident
  const map = {};
  for (const it of vehiclesArray) {
    const veiID = toText(it.veiID) || "";
    const placa = toText(it.placa) || "";
    const mot = toText(it.mot) || "";
    const ident = toText(it.ident) || "";

    if (veiID) map[veiID] = { veiID, placa, mot, ident };
  }

  const outDir = path.join(__dirname, "..", "saida");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, "map_veiculos.json");
  fs.writeFileSync(outFile, JSON.stringify(map, null, 2), "utf8");

  console.log("✅ Mapa gerado:", outFile);
  console.log("Total veículos (mapeados):", Object.keys(map).length);
})();
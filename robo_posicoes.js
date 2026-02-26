const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const axios = require("axios");
const AdmZip = require("adm-zip");
const { xml2js } = require("xml-js");

const WS_URL = process.env.ONIXSAT_WS_URL;
const LOGIN = process.env.ONIXSAT_LOGIN;
const SENHA = process.env.ONIXSAT_SENHA;

const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, "saida");
const STATE_FILE = path.join(OUT_DIR, "estado.json");
const OUT_JSONL = path.join(OUT_DIR, "posicoes.jsonl");

if (!WS_URL || !LOGIN || !SENHA) {
  console.error("Faltou ONIXSAT_WS_URL / ONIXSAT_LOGIN / ONIXSAT_SENHA no .env");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { lastMid: "1" };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function toText(node) {
  return node && typeof node === "object" && "_text" in node ? node._text : "";
}

function parseNumberPtBr(str) {
  if (!str) return null;
  // vem com vírgula: -22,9473
  const norm = String(str).replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

function unzipOrXml(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    if (!entries.length) throw new Error("ZIP vazio");
    return entries[0].getData().toString("utf8");
  } catch {
    return buffer.toString("utf8");
  }
}

async function fetchMensagens(mid) {
  const xml = `
<RequestMensagemCB>
  <login>${LOGIN}</login>
  <senha>${SENHA}</senha>
  <mId>${mid}</mId>
</RequestMensagemCB>
`.trim();

  const resp = await axios.post(WS_URL, xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    responseType: "arraybuffer",
    timeout: 60000,
    validateStatus: () => true,
  });

  const buf = Buffer.from(resp.data || []);
  const xmlString = unzipOrXml(buf);
  const json = xml2js(xmlString, { compact: true, ignoreDeclaration: true });

  if (json?.ErrorRequest?.erro?._text) {
    throw new Error(json.ErrorRequest.erro._text);
  }

  const items = json?.ResponseMensagemCB?.MensagemCB;
  if (!items) return [];

  return Array.isArray(items) ? items : [items];
}

async function main() {
  const state = loadState();
  const mid = state.lastMid || "1";

  console.log("Buscando mensagens a partir de mId =", mid);
  const msgs = await fetchMensagens(mid);

  if (!msgs.length) {
    console.log("Nenhuma mensagem nova.");
    return;
  }

  let maxMid = Number(mid);
  const out = [];

  for (const m of msgs) {
    const mId = toText(m.mId);
    const veiID = toText(m.veiID);
    const dt = toText(m.dt);
    const mun = toText(m.mun);
    const uf = toText(m.uf);
    const rua = toText(m.rua);
    const rod = toText(m.rod);
    const vel = parseNumberPtBr(toText(m.vel));
    const lat = parseNumberPtBr(toText(m.lat));
    const lon = parseNumberPtBr(toText(m.lon));

    const mIdNum = Number(String(mId).replace(/\D/g, ""));
    if (Number.isFinite(mIdNum)) maxMid = Math.max(maxMid, mIdNum);

    out.push({
      mId,
      veiID,
      dt,
      lat,
      lon,
      vel,
      mun,
      uf,
      via: rod || rua || "",
      raw: {
        rua: rua || "",
        rod: rod || "",
      },
    });
  }

  // grava JSONL (uma linha por registro)
  const lines = out.map((o) => JSON.stringify(o)).join("\n") + "\n";
  fs.appendFileSync(OUT_JSONL, lines, "utf8");

  // atualiza estado (próximo mId)
  const nextMid = String(maxMid);
  state.lastMid = nextMid;
  saveState(state);

  console.log(`Salvo ${out.length} posições em: ${OUT_JSONL}`);
  console.log("Próximo mId =", nextMid);
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
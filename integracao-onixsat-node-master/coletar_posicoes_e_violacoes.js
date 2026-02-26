const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const axios = require("axios");
const AdmZip = require("adm-zip");
const { xml2js } = require("xml-js");

// ====== ENVs obrigatórias (credenciais/endpoint) ======
const WS_URL = process.env.ONIXSAT_WS_URL;
const LOGIN  = process.env.ONIXSAT_LOGIN;
const SENHA  = process.env.ONIXSAT_SENHA;

// ====== Pastas/arquivos de saída ======
const OUT_DIR    = path.join(__dirname, "saida");
const STATE_FILE = path.join(OUT_DIR, "estado.json");
const POS_JSONL  = path.join(OUT_DIR, "posicoes.jsonl");
const VIO_JSONL  = path.join(OUT_DIR, "violacoes.jsonl");

// ====== Intervalos e limites ======
// Busca normal: FIXO em 5 minutos
const INTERVAL_MS = 300000; // 5 min

// Backoff para throttle "tempo mínimo" (resposta da ONIX)
const BACKOFF_INIT   = 300000; // 5 min
const BACKOFF_MAX    = Number(process.env.ONIXSAT_BACKOFF_MAX_MS ?? 600000); // 10 min
const BACKOFF_FACTOR = Number(process.env.ONIXSAT_BACKOFF_FACTOR ?? 2);

// Limite “configurável” (fallback gravado no registro)
const SPEED_LIMIT = Number(process.env.SPEED_LIMIT ?? 80);

// Texto para detectar "excesso de velocidade" no alrtTelem (apenas classificação)
const EXCESSO_TEXT = String(process.env.EXCESSO_TEXT ?? "excesso").toLowerCase();

// Checagem de credenciais
if (!WS_URL || !LOGIN || !SENHA) {
  console.error("Faltou ONIXSAT_WS_URL / ONIXSAT_LOGIN / ONIXSAT_SENHA no .env");
  process.exit(1);
}

// ====== Preparação de diretórios/arquivos ======
fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(POS_JSONL)) fs.writeFileSync(POS_JSONL, "", "utf8");
if (!fs.existsSync(VIO_JSONL)) fs.writeFileSync(VIO_JSONL, "", "utf8");

// ====== Utilitários ======
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { lastMid: "1" }; }
}
function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), "utf8");
}
function toText(node) {
  return node && typeof node === "object" && "_text" in node ? node._text : "";
}
function parseNumberPtBr(str) {
  if (!str) return null;
  const n = Number(String(str).replace(",", "."));
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
</RequestMensagemCB>`.trim();

  const resp = await axios.post(WS_URL, xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    responseType: "arraybuffer",
    timeout: 60000,
    validateStatus: () => true,
  });

  const buf = Buffer.from(resp.data ?? []);
  const xmlString = unzipOrXml(buf);
  const json = xml2js(xmlString, { compact: true, ignoreDeclaration: true });

  // Erro padrão do serviço
  if (json?.ErrorRequest?.erro?._text) {
    const msg = json.ErrorRequest.erro._text;
    throw new Error(msg);
  }

  const items = json?.ResponseMensagemCB?.MensagemCB;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

// Classificadores (para gravar no JSONL)
function isViolacaoOficial(m) {
  const alrt = (toText(m.alrtTelem) ?? "").trim();
  return alrt.length > 0;
}
function isExcessoOficial(m) {
  const alrt = (toText(m.alrtTelem) ?? "").toLowerCase();
  return alrt.includes(EXCESSO_TEXT); // ajuste EXCESSO_TEXT no .env se quiser
}

// ====== Loop com backoff inteligente ======
let backoffMs = 0;
async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tick() {
  const state = loadState();
  const mid   = state.lastMid ?? "1";
  console.log("\nBuscando a partir de mId =", mid);

  const msgs = await fetchMensagens(mid);
  if (!msgs.length) {
    console.log("Sem novas mensagens.");
    return;
  }

  let maxMid = Number(mid);
  let posCount = 0, vioCount = 0, excessoCount = 0;

  for (const m of msgs) {
    const mId = toText(m.mId);
    const veiID = toText(m.veiID);
    const dt = toText(m.dt);
    const lat = parseNumberPtBr(toText(m.lat));
    const lon = parseNumberPtBr(toText(m.lon));
    const vel = parseNumberPtBr(toText(m.vel)) ?? 0;

    if (!veiID || !dt || lat === null || lon === null) continue;

    const mun = toText(m.mun) ?? "";
    const uf  = toText(m.uf) ?? "";
    const via = (toText(m.rod) || toText(m.rua) || "");
    const evtG= toText(m.evtG) ?? "";
    const alrtTelem = toText(m.alrtTelem) ?? "";
    const rpm = toText(m.rpm) ?? "";

    // posições
    fs.appendFileSync(POS_JSONL, JSON.stringify({
      mId, veiID, dt, lat, lon, vel, mun, uf, via, evtG, alrtTelem, rpm
    }) + "\n", "utf8");
    posCount++;

    // violações (qualquer alrtTelem)
    if (isViolacaoOficial(m)) {
      fs.appendFileSync(VIO_JSONL, JSON.stringify({
        tipo: isExcessoOficial(m) ? "EXCESSO_VELOCIDADE" : "VIOLACAO",
        mId, veiID, dt, lat, lon,
        vel, limite: SPEED_LIMIT,
        mun, uf, via,
        evtG, alrtTelem, rpm
      }) + "\n", "utf8");
      vioCount++;
      if (isExcessoOficial(m)) excessoCount++;
    }

    const mIdNum = Number(String(mId).replace(/\D/g, ""));
    if (Number.isFinite(mIdNum)) maxMid = Math.max(maxMid, mIdNum);
  }

  state.lastMid = String(maxMid);
  saveState(state);
  console.log(
    "Posições:", posCount,
    "| Violações:", vioCount,
    "| Excesso:", excessoCount,
    "| Próximo mId =", state.lastMid
  );
}

(async () => {
  console.log("✅ Coletor (posições + violações) iniciado.",
              "Intervalo:", INTERVAL_MS, "ms",
              "| Backoff:", BACKOFF_INIT, "->", BACKOFF_MAX);
  while (true) {
    try {
      await tick();
      // sucesso: zera backoff
      backoffMs = 0;
      await esperar(INTERVAL_MS);
    } catch (e) {
      const msg = (e?.message || "").toString();
      if (msg.includes("Nao atingiu o tempo minimo para reenvio da requisicao")) {
        backoffMs = backoffMs ? Math.min(backoffMs * BACKOFF_FACTOR, BACKOFF_MAX) : BACKOFF_INIT;
        console.warn(`[THROTTLE] ${msg} | Aguardando ${backoffMs} ms antes de tentar novamente...`);
        await esperar(backoffMs);
        continue;
      }
      console.error("[ERRO COLETOR]", msg);
      await esperar(INTERVAL_MS);
    }
  }
})();
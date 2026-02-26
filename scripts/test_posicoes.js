const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const axios = require("axios");
const AdmZip = require("adm-zip");
const { xml2js } = require("xml-js");

const WS_URL = process.env.ONIXSAT_WS_URL;
const LOGIN = process.env.ONIXSAT_LOGIN;
const SENHA = process.env.ONIXSAT_SENHA;
const MID = process.env.ONIXSAT_MID || "1";

if (!WS_URL || !LOGIN || !SENHA) {
  console.error("Faltou ONIXSAT_WS_URL / ONIXSAT_LOGIN / ONIXSAT_SENHA no .env");
  console.log("CWD:", process.cwd());
  console.log("__dirname:", __dirname);
  process.exit(1);
}

// Tenta os DOIS formatos: por tags e por atributos (um deles costuma funcionar)
const xmlTags = `
<RequestMensagemCB>
  <login>${LOGIN}</login>
  <senha>${SENHA}</senha>
  <mId>${MID}</mId>
</RequestMensagemCB>
`.trim();

const xmlAttrs = `
<RequestMensagemCB login="${LOGIN}" senha="${SENHA}">
  <mId>${MID}</mId>
</RequestMensagemCB>
`.trim();

async function callWs(xml) {
  const resp = await axios.post(WS_URL, xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    responseType: "arraybuffer",
    timeout: 60000,
    validateStatus: () => true,
  });
  return resp;
}

function tryUnzipOrXml(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    if (!entries.length) throw new Error("ZIP vazio");
    const xmlString = entries[0].getData().toString("utf8");
    return { xmlString, zipped: true, entryName: entries[0].entryName };
  } catch {
    return { xmlString: buffer.toString("utf8"), zipped: false, entryName: null };
  }
}

async function runOne(label, xml) {
  console.log("\n==============================");
  console.log("TESTE:", label);
  console.log("POST:", WS_URL);
  console.log("XML enviado:\n", xml);

  const resp = await callWs(xml);
  const buf = Buffer.from(resp.data || []);

  const { xmlString, zipped, entryName } = tryUnzipOrXml(buf);
  console.log(zipped ? `Resposta ZIPADA (${entryName})` : "Resposta XML direto (não zip)");

  const json = xml2js(xmlString, { compact: true, ignoreDeclaration: true });

  // Se for erro, imprime e devolve false
  if (json?.ErrorRequest?.erro?._text) {
    console.log("ERRO:", json.ErrorRequest.erro._text);
    return false;
  }

  console.log("Topo do JSON:", Object.keys(json));
  console.log(JSON.stringify(json, null, 2).slice(0, 4000));
  return true;
}

(async () => {
  // 1) tenta TAGS
  const ok1 = await runOne("RequestMensagemCB por TAGS", xmlTags);
  if (ok1) return;

  // 2) tenta ATRIBUTOS
  const ok2 = await runOne("RequestMensagemCB por ATRIBUTOS", xmlAttrs);
  if (ok2) return;

  // 3) dica de endpoint alternativo
  console.log("\nAinda deu erro de credencial/formato.");
  console.log("Tente trocar no .env para:");
  console.log("ONIXSAT_WS_URL=https://webservice1.newrastreamentoonline.com.br");
})().catch((e) => {
  console.error("Erro inesperado:", e?.message);
});

/**
 * Configuração centralizada do projeto.
 * Carrega dotenv uma vez e exporta todos os valores com defaults.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "saida");

// -----------------------------------------------------------------------------
// OnixSat API (credenciais e endpoint)
// -----------------------------------------------------------------------------
const onixsat = {
  wsUrl: process.env.ONIXSAT_WS_URL || "",
  login: process.env.ONIXSAT_LOGIN || "",
  senha: process.env.ONIXSAT_SENHA || "",
  mid: process.env.ONIXSAT_MID || "1",
  apiPastaArquivo: process.env.ONIXSAT_API_PASTA_ARQUIVO || path.join(ROOT, "temp"),
};

// -----------------------------------------------------------------------------
// Orquestrador
// -----------------------------------------------------------------------------
const orquestrador = {
  apiBaseUrl: process.env.ORQUESTRADOR_API_BASE_URL || "",
  intervaloEquipamento: process.env.ONIXSAT_API_INTERVALO_SINCRONIZACAO_EQUIPAMENTO || "0 0 * * * *",
  intervaloPosicao: process.env.ONIXSAT_API_INTERVALO_SINCRONIZACAO_POSICAO || "0 * * * * *",
};

// -----------------------------------------------------------------------------
// Coletor (scripts coletar_posicoes_*.js)
// -----------------------------------------------------------------------------
const coletor = {
  intervalMs: Number(process.env.COLLECT_INTERVAL_MS || process.env.COLETOR_INTERVAL_MS || 60000),
  backoffMs: Number(process.env.ONIXSAT_BACKOFF_MS || 180000),
  backoffMaxMs: Number(process.env.ONIXSAT_BACKOFF_MAX_MS || 600000),
  backoffFactor: Number(process.env.ONIXSAT_BACKOFF_FACTOR || 2),
  speedLimit: Number(process.env.SPEED_LIMIT || 80),
  excessoText: String(process.env.EXCESSO_TEXT || "excesso de velocidade").toLowerCase(),
  // coletar_posicoes_e_violacoes usa intervalo fixo 5 min
  intervalAllMs: 300000,
};

// -----------------------------------------------------------------------------
// Servidor (server_excessos.js)
// -----------------------------------------------------------------------------
const server = {
  port: Number(process.env.PORT || 8081),
  excessosMaxPoints: Number(process.env.EXCESSOS_MAX_POINTS || 3000),
  speedMin: Number(process.env.SPEED_MIN || 81),
  dedupeByMid: String(process.env.DEDUPE_BY_MID || "0") === "1",
  officialOnly: String(process.env.OFFICIAL_ONLY || "1") === "1",
  lastHoursDefault: Number(process.env.LAST_HOURS_DEFAULT || 24),
};

// -----------------------------------------------------------------------------
// Paths (arquivos de saída)
// -----------------------------------------------------------------------------
const paths = {
  root: ROOT,
  outDir: OUT_DIR,
  posicoesJsonl: path.join(OUT_DIR, "posicoes.jsonl"),
  violacoesJsonl: path.join(OUT_DIR, "violacoes.jsonl"),
  estadoJson: path.join(OUT_DIR, "estado.json"),
  mapVeiculos: path.join(OUT_DIR, "map_veiculos.json"),
  schedulePastaLog: process.env.SCHEDULE_PASTA_LOG || path.join(ROOT, "log"),
};

// -----------------------------------------------------------------------------
// Utils / processamento (gerarDatas, gravarErrorLog)
// -----------------------------------------------------------------------------
const processamento = {
  dataInicio: process.env.DATA_INICIO_PROCESSAMENTO || "",
  dataFim: process.env.DATA_FIM_PROCESSAMENTO || "",
};

// -----------------------------------------------------------------------------
// Heatmaps
// -----------------------------------------------------------------------------
const heatmap = {
  filterDate: process.env.HEATMAP_DATE || "",
  filterPlaca: process.env.HEATMAP_PLACA || "",
  limit: Number(process.env.HEATMAP_LIMIT || 200000),
  speedLimit: Number(process.env.SPEED_LIMIT || 80),
};

// -----------------------------------------------------------------------------
// Outros
// -----------------------------------------------------------------------------
const outDirOverride = process.env.OUT_DIR || null;

module.exports = {
  onixsat,
  orquestrador,
  coletor,
  server,
  paths,
  processamento,
  heatmap,
  outDirOverride,
};

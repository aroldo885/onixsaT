const _ = require("lodash");
const { OnixSatClient } = require("../core/OnixSatClient");

function toWsUrl(url) {
  const s = String(url || "").trim();
  if (/^https?:\/\//i.test(s)) return s;
  return s ? `https://${s}` : s;
}

const buscarEquipamentos = async (dadosRastreador) => {
  const client = new OnixSatClient({
    wsUrl: toWsUrl(dadosRastreador.url),
    login: dadosRastreador.usuario,
    senha: dadosRastreador.senha,
  });
  const raw = await client.fetchVeiculos();
  if (!raw || !Array.isArray(raw)) return [];
  return raw;
};

const buscarLocalizacoesEquipamento = async (dadosRastreador, ultimaMensagem) => {
  const client = new OnixSatClient({
    wsUrl: toWsUrl(dadosRastreador.url),
    login: dadosRastreador.usuario,
    senha: dadosRastreador.senha,
  });
  const mId = ultimaMensagem === 0 ? 1 : ultimaMensagem;
  return client.fetchMensagens(mId);
};

function traduzirEvento(localizacao) {
  const ignicao = localizacao.hasOwnProperty("evt4")
    ? Number(localizacao.evt4._text)
    : -1;
  const velocidade = Number(localizacao.vel._text);
  const novoEvento = { tipoMedida: "Status", valor: "" };
  const mapaEventos = [
    { descricao: "Ligado e parado", ignicao: 1, velocidadeMin: 0, velocidadeMax: 0 },
    { descricao: "Desligado", ignicao: 0, velocidadeMin: null, velocidadeMax: null },
    { descricao: "Em transporte", ignicao: 1, velocidadeMin: 0, velocidadeMax: null },
  ];
  const velMatch = (me) => {
    if (me.velocidadeMax === null && me.velocidadeMin === null) return true;
    if (me.velocidadeMax === null) return velocidade > me.velocidadeMin;
    return velocidade >= me.velocidadeMin && velocidade <= me.velocidadeMax;
  };
  for (const mapaEvento of mapaEventos) {
    if (mapaEvento.ignicao === ignicao && velMatch(mapaEvento)) {
      novoEvento.valor = mapaEvento.descricao;
      break;
    }
  }
  if (_.isEmpty(novoEvento.valor)) novoEvento.valor = "Não identificado";
  return novoEvento;
}

module.exports = {
  buscarEquipamentos,
  buscarLocalizacoesEquipamento,
  traduzirEvento,
};

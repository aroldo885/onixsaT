const _ = require("lodash");

const traduzirEvento = (localizacao) => {
  const ignicao = localizacao.hasOwnProperty("evt4") ? Number(localizacao.evt4._text) : -1;
  const velocidade = Number(localizacao.vel._text);
  const novoEvento = {
    tipoMedida: "Status",
    valor: "",
  };
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
    const ignMatch = mapaEvento.ignicao === ignicao;
    if (ignMatch && velMatch(mapaEvento)) {
      novoEvento.valor = mapaEvento.descricao;
      break;
    }
  }

  if (_.isEmpty(novoEvento.valor)) {
    novoEvento.valor = "Não identificado";
  }

  return novoEvento;
};

module.exports = {
  traduzirEvento,
};

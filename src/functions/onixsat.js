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

  for (const mapaEvento of mapaEventos) {
    const ignMatch = mapaEvento.ignicao === ignicao;
    let velMatch;
    if (mapaEvento.velocidadeMax === null && mapaEvento.velocidadeMin === null) {
      velMatch = true;
    } else if (mapaEvento.velocidadeMax === null) {
      velMatch = velocidade > mapaEvento.velocidadeMin;
    } else {
      velMatch = velocidade >= mapaEvento.velocidadeMin && velocidade <= mapaEvento.velocidadeMax;
    }
    if (ignMatch && velMatch) {
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

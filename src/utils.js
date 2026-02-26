const _ = require("lodash");
const moment = require("moment");
const path = require("path");
const fs = require("fs");

const gerarDatas = (geraDeHoraEmHora) => {
  let dataInicio = process.env.DATA_INICIO_PROCESSAMENTO;
  let dataFim = process.env.DATA_FIM_PROCESSAMENTO;
  let datas = [];

  dataInicio = _.isEmpty(dataInicio)
    ? moment(moment().locale("pt-br"), "YYYY-MM-DD HH:mm:ss")
    : moment(dataInicio, "YYYY-MM-DD HH:mm:ss");
  dataFim = _.isEmpty(dataFim)
    ? moment(moment().locale("pt-br"), "YYYY-MM-DD HH:mm:ss")
    : moment(dataFim, "YYYY-MM-DD HH:mm:ss");

  dataInicio = moment(dataInicio).subtract(1, "hours");

  if (!geraDeHoraEmHora) {
    datas.push({
      dataInicial: dataInicio.format("DD/MM/YYYY HH:mm:ss"),
      dataFinal: dataFim.format("DD/MM/YYYY HH:mm:ss"),
    });
    return datas;
  }

  while (dataFim.diff(dataInicio, "hours") >= 1) {
    const dataFimPesquisa = moment(dataInicio).add(1, "hours");
    datas.push({
      dataInicial: dataInicio.format("DD/MM/YYYY HH:mm:ss"),
      dataFinal: dataFimPesquisa.format("DD/MM/YYYY HH:mm:ss"),
    });
    dataInicio.add(1, "hours");
  }

  return datas;
};

const capitalizar = (string) => {
  let textoCapitalizado = "";

  if (!_.isEmpty(string)) {
    string = string.toLowerCase().trim();
    textoCapitalizado = string.replace(/\b\w/g, (letra) => letra.toUpperCase());
  }

  return textoCapitalizado;
};

const gravarErrorLog = (errors) => {
  const nomeArquivoDeLog = `${moment().locale("pt-br").format("DD-MM-YYYY")}.txt`;
  const caminhoArquivoLog = path.join(process.env.SCHEDULE_PASTA_LOG, `${nomeArquivoDeLog}`);

  if (!fs.existsSync(caminhoArquivoLog)) {
    fs.writeFileSync(caminhoArquivoLog, "", { encoding: "utf8" });
  }

  if (!fs.existsSync(caminhoArquivoLog)) return;

  if (!Array.isArray(errors)) {
    const mensagem = `[${moment().locale("pt-br").format("DD/MM/YYYY HH:mm:ss")}] - ${errors} \n`;
    fs.writeFileSync(caminhoArquivoLog, mensagem, { encoding: "utf8", flag: "a+" });
    return;
  }

  for (const err of errors) {
    const mensagem = `[${moment().locale("pt-br").format("DD/MM/YYYY HH:mm:ss")}] - ${err} \n`;
    fs.writeFileSync(caminhoArquivoLog, mensagem, { encoding: "utf8", flag: "a+" });
  }
};

const tratarMsgErroApi = (error, msgPadrao) => {
  if (_.isEmpty(error?.response)) return error?.message ?? msgPadrao;
  if (!error.response.data?.message) return msgPadrao;
  return error.response.data.message;
};

module.exports = {
  gerarDatas,
  capitalizar,
  gravarErrorLog,
  tratarMsgErroApi,
};

require("dotenv").config();

const fs = require("fs");
const https = require("https");
const moment = require("moment");
const admZip = require("adm-zip");
const path = require("path");
const _ = require("lodash");
const converter = require("xml-js");

const buscarEquipamentos = (dadosRastreador) => {
  return new Promise((resolve, reject) => {
    const nomeDoArquivo = `equipamentos-${moment().locale("pt-br").format("YYYY-MM-DDHHmmss")}.zip`;
    const caminhoDoArquivo = path.join(process.env.ONIXSAT_API_PASTA_ARQUIVO, nomeDoArquivo);

    const data = `
                <RequestVeiculo>
                    <login>${dadosRastreador.usuario}</login>
                    <senha>${dadosRastreador.senha}</senha>
                </RequestVeiculo>`;
    const opcoes = {
      method: "POST",
      hostname: dadosRastreador.url,
      port: 443,
      path: "/",
      headers: { "Content-Type": "application/xml" },
    };

    const req = https
      .request(opcoes, (resultado) => {
        let partes = [];

        resultado.on("data", (parte) => partes.push(parte));
        resultado.on("end", () => {
          const buffer = Buffer.concat(partes);
          fs.writeFileSync(caminhoDoArquivo, buffer);

          const zip = new admZip(caminhoDoArquivo);
          const zips = zip.getEntries();
          fs.unlinkSync(caminhoDoArquivo);

          if (_.isEmpty(zips)) {
            reject(new Error("Não foi possível obter a lista dos veículos"));
            return;
          }

          const xmlStr = zips[0].getData().toString("utf8");
          const json = converter.xml2json(xmlStr, { compact: true, spaces: 4 });
          const retorno = JSON.parse(json);

          if (retorno.hasOwnProperty("ErrorRequest")) {
            reject(
              new Error(
                `Ocorreu um erro ao buscar os equipamentos com o código ${retorno.ErrorRequest.codigo._text}! Detalhamento: ${retorno.ErrorRequest.erro._text}`
              )
            );
            return;
          }

          resolve(retorno.ResponseVeiculo.Veiculo);
        });
      })
      .on("error", (error) => reject(error));

    req.write(data);
    req.end();
  });
};

const buscarLocalizacoesEquipamento = (dadosRastreador, ultimaMensagem) => {
  return new Promise((resolve, reject) => {
    const nomeDoArquivo = `posicoes-${moment().locale("pt-br").format("YYYY-MM-DDHHmmss")}.zip`;
    const caminhoDoArquivo = path.join(process.env.ONIXSAT_API_PASTA_ARQUIVO, nomeDoArquivo);

    const mId = ultimaMensagem === 0 ? 1 : ultimaMensagem;
    const data = `
                <RequestMensagemCB>
                    <login>${dadosRastreador.usuario}</login>
                    <senha>${dadosRastreador.senha}</senha>
                    <mId>${mId}</mId>
                </RequestMensagemCB>`;
    const opcoes = {
      method: "POST",
      hostname: dadosRastreador.url,
      port: 443,
      path: "/",
      headers: { "Content-Type": "application/xml" },
    };

    const req = https
      .request(opcoes, (resultado) => {
        let partes = [];

        resultado.on("data", (parte) => partes.push(parte));
        resultado.on("end", () => {
          const buffer = Buffer.concat(partes);
          fs.writeFileSync(caminhoDoArquivo, buffer);

          const zip = new admZip(caminhoDoArquivo);
          const zips = zip.getEntries();
          fs.unlinkSync(caminhoDoArquivo);

          if (_.isEmpty(zips)) {
            reject(new Error("Não foi possível obter a lista dos veículos"));
            return;
          }

          const xmlStr = zips[0].getData().toString("utf8");
          const json = converter.xml2json(xmlStr, { compact: true, spaces: 4 });
          const retorno = JSON.parse(json);

          if (retorno.hasOwnProperty("ErrorRequest")) {
            reject(
              new Error(
                `Ocorreu um erro ao buscar os equipamentos com o código ${retorno.ErrorRequest.codigo._text}! Detalhamento: ${retorno.ErrorRequest.erro._text}`
              )
            );
            return;
          }

          if (_.isEmpty(retorno.ResponseMensagemCB)) {
            resolve([]);
            return;
          }

          const msgs = retorno.ResponseMensagemCB.MensagemCB;
          resolve(Array.isArray(msgs) ? msgs : [msgs]);
        });
      })
      .on("error", (error) => reject(error));

    req.write(data);
    req.end();
  });
};

module.exports = {
  buscarEquipamentos,
  buscarLocalizacoesEquipamento,
};

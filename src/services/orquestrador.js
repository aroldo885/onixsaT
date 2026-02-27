const axios = require("axios");
const { isEmpty } = require("lodash");

const config = require("../config");
const { tratarMsgErroApi } = require("../utils");
const baseUrl = config.orquestrador.apiBaseUrl;

const sincronizar = async (idRastreador, equipamentos) => {
  try {
    const resultado = await axios.post(
      `${require("../config").orquestrador.apiBaseUrl}/v1/rastreadores/${idRastreador}/sincronizar`,
      { equipamentos },
      { timeout: 600000 }
    );
    return resultado.data;
  } catch (error) {
    throw new Error(tratarMsgErroApi(error, "Ocorreu um erro inesperado ao 'sincronizar'!"));
  }
};

const buscarDadosRastreadorPeloNome = async (nome) => {
  try {
    const resultado = await axios.get(`${baseUrl}/v1/rastreadores/${nome}`, { timeout: 600000 });
    if (isEmpty(resultado.data)) {
      throw new Error(`Nenhum rastreador encontrado com o nome [${nome}]`);
    }
    return resultado.data;
  } catch (error) {
    throw new Error(
      tratarMsgErroApi(error, "Ocorreu um erro inesperado ao 'buscarDadosRastreadorPeloNome'!")
    );
  }
};

const buscarIdUltimaPosicao = async (idRastreador) => {
  try {
    const resultado = await axios.get(`${baseUrl}/v1/rastreadores/${idRastreador}/ultimaPosicao`, {
      timeout: 600000,
    });
    return resultado.data.idUltimaPosicao;
  } catch (error) {
    throw new Error(
      tratarMsgErroApi(error, "Ocorreu um erro inesperado ao 'buscarIdUltimaPosicao'!")
    );
  }
};

const buscarIdUltimaPosicaoEquipamentoRastreador = async (
  placa,
  idRastreador,
  codigoSistemaOrigem
) => {
  try {
    const resultado = await axios.get(
      `${baseUrl}/v1/rastreadores/${idRastreador}/equipamentos/${placa}/origens/${codigoSistemaOrigem}/ultimaPosicao`,
      { timeout: 600000 }
    );
    return resultado.data.idUltimaPosicao;
  } catch (error) {
    throw new Error(
      tratarMsgErroApi(
        error,
        "Ocorreu um erro inesperado ao 'buscarIdUltimaPosicaoEquipamentoRastreador'!"
      )
    );
  }
};

const buscarPlacaPeloRastreadorECodigoSistemaOrigem = async (idRastreador, codigoSistemaOrigem) => {
  try {
    const resultado = await axios.get(
      `${baseUrl}/v1/rastreadores/${idRastreador}/origens/${codigoSistemaOrigem}`,
      { timeout: 600000 }
    );
    return resultado.data;
  } catch (error) {
    throw new Error(
      tratarMsgErroApi(
        error,
        "Ocorreu um erro inesperado ao 'buscarPlacaPeloIdEquipamentoRastreador'!"
      )
    );
  }
};

const buscarIdUltimaMensagemRastreadorPeloIdEquipamentoRastreador = async (
  idEquipamentoRastreador,
  rastreador
) => {
  try {
    const resultado = await axios.get(
      `${baseUrl}/v1/equipamentos/equipamentoRastreador/${idEquipamentoRastreador}/ultimaMensagem/${rastreador}`,
      { timeout: 600000 }
    );
    return resultado.data;
  } catch (error) {
    throw new Error(
      tratarMsgErroApi(
        error,
        "Ocorreu um erro inesperado ao 'buscarIdUltimaMensagemRastreadorPeloIdEquipamentoRastreador'!"
      )
    );
  }
};

const vincularEquipamentoAoRastreador = async (placa, idRastreador, codigoSistemaOrigem) => {
  try {
    const resultado = await axios.post(
      `${baseUrl}/v1/rastreadores/${idRastreador}/equipamentos/${placa}/vincular`,
      { codigoSistemaOrigem },
      { timeout: 600000 }
    );
    return resultado.data;
  } catch (error) {
    throw new Error(
      tratarMsgErroApi(error, "Ocorreu um erro inesperado ao 'vincularEquipamentoAoRastreador'!")
    );
  }
};

module.exports = {
  sincronizar,
  buscarDadosRastreadorPeloNome,
  buscarIdUltimaPosicao,
  buscarIdUltimaPosicaoEquipamentoRastreador,
  buscarIdUltimaMensagemRastreadorPeloIdEquipamentoRastreador,
  buscarPlacaPeloRastreadorECodigoSistemaOrigem,
  vincularEquipamentoAoRastreador,
};

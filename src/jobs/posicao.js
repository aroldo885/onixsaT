const _ = require("lodash");
const moment = require("moment");

const servicosOrquestrador = require("../services/orquestrador");
const servicosOnixsat = require("../services/onixsat");
const utils = require("../utils");

const main = async () => {
  try {
    const dadosRastreador = await servicosOrquestrador.buscarDadosRastreadorPeloNome("onixsat");
    const ultimaPosicao = await servicosOrquestrador.buscarIdUltimaPosicao(
      dadosRastreador.idRastreador
    );
    const equipamentosOs = await servicosOnixsat.buscarLocalizacoesEquipamento(
      dadosRastreador,
      ultimaPosicao
    );
    const processadosComErro = [];

    for (const equipamentoOs of equipamentosOs) {
      const equipamentoSmartcenter = await servicosOrquestrador
        .buscarPlacaPeloRastreadorECodigoSistemaOrigem(
          dadosRastreador.idRastreador,
          equipamentoOs.veiID._text
        )
        .catch((error) => {
          processadosComErro.push(
            `Onixsat: não foi possível sincronizar as informações do equipamento ${equipamentoOs.veiID._text}! Detalhamento: ${error.message}`
          );
          return null;
        });

      if (equipamentoSmartcenter == null) continue;

      if (_.isEmpty(equipamentoSmartcenter)) {
        processadosComErro.push(
          `Onixsat: não foi possível obter a placa do equipamento com o id [${equipamentoOs.veiID._text}]!`
        );
        continue;
      }

      const dataRastreador = moment(equipamentoOs.dt._text, "YYYY-MM-DD HH:mm:ss").format(
        "YYYY-MM-DD HH:mm:ss"
      );
      const dataRastreado = moment(equipamentoOs.dtInc._text, "YYYY-MM-DD HH:mm:ss").format(
        "YYYY-MM-DD HH:mm:ss"
      );

      const equipamento = {
        placa: equipamentoSmartcenter.placa,
        posicoes: [
          {
            codigoSistemaOrigemPosicao: equipamentoOs.mId._text,
            codigoSistemaOrigemEquipamento: equipamentoOs.veiID._text,
            dataRastreador: dataRastreador,
            dataRastreado: dataRastreador,
            dataSincronizado: dataRastreado,
            latitude: Number(equipamentoOs.lat._text.replace(/,/g, ".")),
            longitude: Number(equipamentoOs.lon._text.replace(/,/g, ".")),
            medidas: [
              servicosOnixsat.traduzirEvento(equipamentoOs),
              { tipoMedida: "Velocidade", valor: Number(equipamentoOs.vel._text) },
            ],
          },
        ],
      };

      const equipamentos = [equipamento];

      const registrosSincronizados = await servicosOrquestrador
        .sincronizar(dadosRastreador.idRastreador, equipamentos)
        .catch((error) => {
          processadosComErro.push(
            `Onixsat: não foi possível sincronizar as informações do equipamento ${equipamento.placa}! Detalhamento: ${error.message}`
          );
          return null;
        });

      if (registrosSincronizados != null && !_.isEmpty(registrosSincronizados.erros)) {
        for (const erro of registrosSincronizados.erros) {
          processadosComErro.push(`Onixsat: ${erro.error}`);
        }
      }
    }

    if (!_.isEmpty(processadosComErro)) {
      utils.gravarErrorLog(processadosComErro);
    }

    process.exit(0);
  } catch (error) {
    utils.gravarErrorLog(
      `Onixsat posição: processamento finalizado devido a um erro geral! Detalhamento: ${error.stack}`
    );
    process.exit(1);
  }
};

main();

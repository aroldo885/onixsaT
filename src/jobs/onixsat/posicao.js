const _         = require( "lodash" );
const moment    = require( "moment" );

const servicosOrquestrador  = require( "../../services/orquestrador" )
const servicosOnixsat       = require( "../../services/onixsat" );
const fnOnixsat             = require( "../../functions/onixsat" );
const utils                 = require( "../../utils" );

const main = async() =>{

    try{

        const dadosRastreador   = await servicosOrquestrador.buscarDadosRastreadorPeloNome( "onixsat" ).catch( ( error ) =>{ throw new Error( error.message ); } );
        const ultimaPosicao     = await servicosOrquestrador.buscarIdUltimaPosicao( dadosRastreador.idRastreador ).catch( ( error ) =>{ throw new Error( error.message ); } );
        const equipamentosOs    = await servicosOnixsat.buscarLocalizacoesEquipamento( dadosRastreador, ultimaPosicao ).catch( ( error ) =>{ throw new Error( error.message ); } );
        const processadosComErro= [];

        for( const equipamentoOs of equipamentosOs ){

            let processadoComErro = false;

            const equipamentoSmartcenter = await servicosOrquestrador.buscarPlacaPeloRastreadorECodigoSistemaOrigem( dadosRastreador.idRastreador, equipamentoOs.veiID._text ).catch( ( error ) =>{

                processadosComErro.push( `Onixsat: não foi possível sincronizar as informações do equipamento ${equipamentoOs.veiID._text}! Detalhamento: ${error.message}` );
                processadoComErro = !processadoComErro;

            } );

            if( processadoComErro ) continue;

            if( !_.isEmpty( equipamentoSmartcenter ) ){

                const dataRastreador = moment( equipamentoOs.dt._text, "YYYY-MM-DD HH:mm:ss" ).format( "YYYY-MM-DD HH:mm:ss" );
                const dataRastreado  = moment( equipamentoOs.dtInc._text, "YYYY-MM-DD HH:mm:ss" ).format( "YYYY-MM-DD HH:mm:ss" );

                const equipamentos  = [];
                const equipamento   = {
                    placa: equipamentoSmartcenter.placa,
                    posicoes: [ {
                        codigoSistemaOrigemPosicao: equipamentoOs.mId._text,
                        codigoSistemaOrigemEquipamento: equipamentoOs.veiID._text,
                        dataRastreador: dataRastreador,
                        dataRastreado: dataRastreador,
                        dataSincronizado: dataRastreado,
                        latitude: Number( equipamentoOs.lat._text.replace( /,/g, "." ) ),
                        longitude: Number( equipamentoOs.lon._text.replace( /,/g, "." ) ),
                        medidas: [
                            fnOnixsat.traduzirEvento( equipamentoOs ),
                            { tipoMedida: "Velocidade", valor: Number( equipamentoOs.vel._text ) },
                        ],
                    } ]
                };

                equipamentos.push( equipamento );

                const registrosSincronizados = await servicosOrquestrador.sincronizar( dadosRastreador.idRastreador, equipamentos ).catch( ( error ) =>{ 

                    processadosComErro.push( `Onixsat: não foi possível sincronizar as informações do equipamento ${equipamento.placa}! Detalhamento: ${error.message}` );

                } );

                // Verifica se houve algum erro
                if( !_.isEmpty( registrosSincronizados ) ){

                    for( const erro of registrosSincronizados.erros ){

                        processadosComErro.push( `Onixsat: ${erro.error}` );

                    }

                }

            } else{

                processadosComErro.push( `Onixsat: não foi possível obter a placa do equipamento com o id [${equipamentoOs.veiID._text}]!` );

            }

        }

        // Grava os erros caso existam no log
        if( !_.isEmpty( processadosComErro ) ){

            utils.gravarErrorLog( processadosComErro );

        }

        // Sinaliza o fim do processamento do job
        process.exit( 0 );

    } catch( error ){

        utils.gravarErrorLog( `Onixsat posição: processamento finalizado devido a um erro geral! Detalhamento: ${error.stack}` );
        process.exit( 1 );

    }

};

main();
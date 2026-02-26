const _                     = require( "lodash" );

const servicosOrquestrador  = require( "../../services/orquestrador" )
const servicosOnixsat       = require( "../../services/onixsat" );
const utils                 = require( "../../utils" );

const main = async() =>{

    try{
        
        const dadosRastreador   = await servicosOrquestrador.buscarDadosRastreadorPeloNome( "onixsat" ).catch( ( error ) =>{ throw new Error( error.message ); } );
        const equipamentosOs    = await servicosOnixsat.buscarEquipamentos( dadosRastreador ).catch( ( error ) =>{ throw new Error( error.message ); } );
        const processadosComErro= [];

        if( !_.isEmpty( equipamentosOs ) ){

            for( const equipamentoOs of equipamentosOs ){

                const placa = equipamentoOs.placa._text.replace( "-", "" );
                const codigoSistemaOrigemEquipamento = equipamentoOs.veiID._text;

                await servicosOrquestrador.vincularEquipamentoAoRastreador( placa, dadosRastreador.idRastreador, codigoSistemaOrigemEquipamento ).catch( ( error ) =>{

                    processadosComErro.push( `Onixsat equipamentos: não foi possível sincronizar as informações do equipamento [${placa}]! Detalhamento: ${error.message}` );

                } );

            }

        }

        // Grava os erros caso existam no log
        if( !_.isEmpty( processadosComErro ) ){

            utils.gravarErrorLog( processadosComErro );

        }

        // Sinaliza o fim do processamento do job
        process.exit( 0 );

    } catch( error ){

        utils.gravarErrorLog( `Onixsat equipamentos: processamento finalizado devido a um erro geral! Detalhamento: ${error.stack}` );
        process.exit( 1 );

    }

};

main();
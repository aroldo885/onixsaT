const _         = require( "lodash" );
const moment    = require( "moment" );
const path      = require( "path" );
const fs        = require( "fs" );

const gerarDatas = ( geraDeHoraEmHora ) =>{

    try{

        let dataInicio  = process.env.DATA_INICIO_PROCESSAMENTO;
        let dataFim     = process.env.DATA_FIM_PROCESSAMENTO;
        let datas       = [];

        dataInicio  = _.isEmpty( dataInicio ) ? moment( moment().locale( "pt-br" ), "YYYY-MM-DD HH:mm:ss" ) : moment( dataInicio, "YYYY-MM-DD HH:mm:ss" );
        dataFim     = _.isEmpty( dataFim )    ? moment( moment().locale( "pt-br" ), "YYYY-MM-DD HH:mm:ss" ) : moment( dataFim, "YYYY-MM-DD HH:mm:ss" );

        dataInicio  = moment( dataInicio ).subtract( 1, "hours" );

        if( geraDeHoraEmHora ){

            // Enquanto a diferença em horas da data fim para início for >= 1 continua gerando as datas
            while( dataFim.diff( dataInicio, "hours" ) >= 1 ){
    
                let dataFimPesquisa = moment( dataInicio ).add( 1, "hours" );
    
                datas.push( {
                    dataInicial: dataInicio.format( "DD/MM/YYYY HH:mm:ss"  ),
                    dataFinal: dataFimPesquisa.format( "DD/MM/YYYY HH:mm:ss" )
                } );
    
                // Incrementa 1 hora
                dataInicio.add( 1, "hours" );
    
            }

        } else{

            datas.push( {
                dataInicial: dataInicio.format( "DD/MM/YYYY HH:mm:ss"  ),
                dataFinal: dataFim.format( "DD/MM/YYYY HH:mm:ss" )
            } );

        }

        return( datas );

    } catch( error ){ throw new Error( error ); }

};

const capitalizar = ( string ) =>{

    let textoCapitalizado = "";

    if( !_.isEmpty( string ) ){

        string = string.toLowerCase().trim();
        textoCapitalizado = string.replace( /\b\w/g, ( letra ) => letra.toUpperCase() ); 

    }

    return textoCapitalizado;

};

const gravarErrorLog = ( errors ) =>{

    const nomeArquivoDeLog  = `${moment().locale( "pt-br" ).format( "DD-MM-YYYY" )}.txt`
    const caminhoArquivoLog = path.join( process.env.SCHEDULE_PASTA_LOG, `${nomeArquivoDeLog}` );

    if( !fs.existsSync( caminhoArquivoLog ) ) fs.writeFileSync( caminhoArquivoLog, "", { encoding: "utf8" } );

    if( fs.existsSync( caminhoArquivoLog ) ){

        if( Array.isArray( errors ) ){

            for( error of errors ){

                let mensagem = `[${moment().locale( "pt-br" ).format( "DD/MM/YYYY HH:mm:ss" )}] - ${error} \n`;
    
                fs.writeFileSync( caminhoArquivoLog, mensagem, { encoding: "utf8", flag: "a+" } );
    
            }

        } else{

            let mensagem = `[${moment().locale( "pt-br" ).format( "DD/MM/YYYY HH:mm:ss" )}] - ${errors} \n`;
    
            fs.writeFileSync( caminhoArquivoLog, mensagem, { encoding: "utf8", flag: "a+" } );

        }

    }

    return;

};

const tratarMsgErroApi = ( error, msgPadrao ) =>{

    let mensagem = "";

    if( !_.isEmpty( error.response ) ){

        if( error.response.hasOwnProperty( "data" ) ){

            mensagem = error.response.data.message !== undefined ? error.response.data.message : msgPadrao;

        } else mensagem = msgPadrao;

    } else mensagem = error.message;

    return mensagem;

};

module.exports = {
    gerarDatas,
    capitalizar,
    gravarErrorLog,
    tratarMsgErroApi
};
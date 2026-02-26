require( "dotenv" ).config();

const fs        = require( "fs" );
const https     = require( "https" );
const moment    = require( "moment" );
const admZip    = require( "adm-zip" );
const path      = require( "path" );
const _         = require( "lodash" );
const converter = require( "xml-js" );

const buscarEquipamentos = ( dadosRastreador ) =>{

    return new Promise( async( resolve, reject ) =>{

        try{

            const nomeDoArquivo = `equipamentos-${moment().locale( "pt-br" ).format( "YYYY-MM-DDHHmmss" )}.zip`;
            const caminhoDoArquivo = path.join( process.env.ONIXSAT_API_PASTA_ARQUIVO, nomeDoArquivo );

            // Para teste
            // const nomeDoArquivo = `equipamentos.zip`;
            // const caminhoDoArquivo = path.join( __dirname, "ex", nomeDoArquivo );

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
                headers: { "Content-Type": "application/xml" }
            };
            const req = https.request( opcoes, ( resultado ) =>{

                let partes = [];
    
                resultado.on( "data", ( parte ) => partes.push( parte ) );
                resultado.on( "end", () =>{
    
                    let buffer  = Buffer.concat( partes );
    
                    fs.writeFileSync( caminhoDoArquivo, buffer );

                    let zip     = new admZip( caminhoDoArquivo );
                    let zips    = zip.getEntries();

                    fs.unlinkSync( caminhoDoArquivo );

                    if( !_.isEmpty( zips ) ){

                        let data    = zips[ 0 ].getData().toString( "utf8" );
                        let json    = converter.xml2json( data, { compact: true, spaces: 4 } );
                        let retorno = JSON.parse( json );

                        if( !retorno.hasOwnProperty( "ErrorRequest" ) ){

                            resolve( retorno.ResponseVeiculo.Veiculo );

                        } else{ 

                            reject( new Error( `Ocorreu um erro ao buscar os equipamentos com o código ${retorno.ErrorRequest.codigo._text}! Detalhamento: ${retorno.ErrorRequest.erro._text}` ) );
                        
                        }

                    } else{

                        reject( new Error( "Não foi possível obter a lista dos veículos" ) );

                    }
    
                } );
    
            } ).on( "error", ( error ) =>{ 
                
                reject( error );
            
            } );
    
            req.write( data );
            req.end();

        } catch( error ){

            reject( error );

        }

    } );

};

const buscarLocalizacoesEquipamento = ( dadosRastreador, ultimaMensagem ) =>{

    return new Promise( async( resolve, reject ) =>{

        try{

            const nomeDoArquivo = `posicoes-${moment().locale( "pt-br" ).format( "YYYY-MM-DDHHmmss" )}.zip`;
            const caminhoDoArquivo = path.join( process.env.ONIXSAT_API_PASTA_ARQUIVO, nomeDoArquivo );

            // Para teste
            // const nomeDoArquivo = `posicoes.zip`;
            // const caminhoDoArquivo = path.join( __dirname, "ex", nomeDoArquivo );

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
                headers: { "Content-Type": "application/xml" }
            };
            const req = https.request( opcoes, ( resultado ) =>{   

                let partes = [];

                resultado.on( "data", ( parte ) => partes.push( parte ) );
                resultado.on( "end", () =>{
                
                    let buffer  = Buffer.concat( partes );
        
                    fs.writeFileSync( caminhoDoArquivo, buffer );

                    let zip     = new admZip( caminhoDoArquivo );
                    let zips    = zip.getEntries();

                    fs.unlinkSync( caminhoDoArquivo );

                    if( !_.isEmpty( zips ) ){

                        let data    = zips[ 0 ].getData().toString( "utf8" );
                        let json    = converter.xml2json( data, { compact: true, spaces: 4 } );
                        let retorno = JSON.parse( json );

                        if( !retorno.hasOwnProperty( "ErrorRequest" ) ){

                            if( !_.isEmpty( retorno.ResponseMensagemCB ) ){

                                if( Array.isArray( retorno.ResponseMensagemCB.MensagemCB ) ){

                                    resolve( retorno.ResponseMensagemCB.MensagemCB );
                                
                                } else{
                                
                                    resolve( [ retorno.ResponseMensagemCB.MensagemCB ] );
                                    
                                }
                            
                            } else resolve( [] );

                        } else{ 

                            reject( new Error( `Ocorreu um erro ao buscar os equipamentos com o código ${retorno.ErrorRequest.codigo._text}! Detalhamento: ${retorno.ErrorRequest.erro._text}` ) );
                        
                        }

                    } else{

                        reject( new Error( "Não foi possível obter a lista dos veículos" ) );

                    }

                } );

            } ).on( "error", ( error ) =>{ 

                reject( error );
            
            } );

            req.write( data );
            req.end();
    
        } catch( error ){
    
            reject( error );
    
        }
    
    } );

};

module.exports = {
    buscarEquipamentos,
    buscarLocalizacoesEquipamento
};
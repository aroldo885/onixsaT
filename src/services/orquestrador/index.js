const axios = require( "axios" );
const { isEmpty } = require( "lodash" );

const { tratarMsgErroApi } = require( "../../utils" );

const sincronizar = ( idRastreador, equipamentos ) =>{ 

    return new Promise( async( resolve, reject ) =>{
        
        try{

            await axios.post( `${process.env.ORQUESTRADOR_API_BASE_URL}/v1/rastreadores/${idRastreador}/sincronizar`, { equipamentos: equipamentos }, { timeout: 600000 } )

            .then( ( resultado ) => resolve( resultado.data ) )
            .catch( ( error ) =>{ throw new Error( tratarMsgErroApi( error, "Ocorreu um erro inesperado ao 'sincronizar'!" ) ) } );

        } catch( error ){ 
            
            reject( error ); 
        
        };

    } );

};

const buscarDadosRastreadorPeloNome = ( nome ) =>{

    return new Promise( async( resolve, reject ) =>{  

        try{

            await axios.get( `${process.env.ORQUESTRADOR_API_BASE_URL}/v1/rastreadores/${nome}`, { timeout: 600000 } )

            .then( ( resultado ) =>{

                if( !isEmpty( resultado.data ) ) resolve( resultado.data )
                else throw new Error( `Nenhum rastreador encontrado com o nome [${nome}]` );

            } )
            .catch( ( error ) =>{ throw new Error( tratarMsgErroApi( error, "Ocorreu um erro inesperado ao 'buscarDadosRastreadorPeloNome'!" ) ) } );

        } catch( error ){ 
            
            reject( error ); 
        
        };

    } );

};

const buscarIdUltimaPosicao = ( idRastreador ) =>{

    return new Promise( async( resolve, reject ) =>{
    
        try{

            await axios.get( `${process.env.ORQUESTRADOR_API_BASE_URL}/v1/rastreadores/${idRastreador}/ultimaPosicao`, { timeout: 600000 } )

            .then( ( resultado ) => resolve( resultado.data.idUltimaPosicao ) )
            .catch( ( error ) =>{ throw new Error( tratarMsgErroApi( error, "Ocorreu um erro inesperado ao 'buscarIdUltimaPosicao'!" ) ) } );

        } catch( error ){ 
            
            reject( error );
        
        };

    } );

};

const buscarIdUltimaPosicaoEquipamentoRastreador = ( placa, idRastreador, codigoSistemaOrigem ) =>{

    return new Promise( async( resolve, reject ) =>{
    
        try{

            await axios.get( `${process.env.ORQUESTRADOR_API_BASE_URL}/v1/rastreadores/${idRastreador}/equipamentos/${placa}/origens/${codigoSistemaOrigem}/ultimaPosicao`, { timeout: 600000 } )

            .then( ( resultado ) => resolve( resultado.data.idUltimaPosicao ) )
            .catch( ( error ) =>{ throw new Error( tratarMsgErroApi( error, "Ocorreu um erro inesperado ao 'buscarIdUltimaPosicaoEquipamentoRastreador'!" ) ) } );

        } catch( error ){ 
            
            reject( error );
        
        };

    } );

};

const buscarPlacaPeloRastreadorECodigoSistemaOrigem = ( idRastreador, codigoSistemaOrigem ) =>{

    return new Promise( async( resolve, reject ) =>{ 

        try{

            await axios.get( `${process.env.ORQUESTRADOR_API_BASE_URL}/v1/rastreadores/${idRastreador}/origens/${codigoSistemaOrigem}`, {
                timeout: 600000
            } )
            .then( ( resultado ) => resolve( resultado.data ) )
            .catch( ( error ) =>{ throw new Error( tratarMsgErroApi( error, "Ocorreu um erro inesperado ao 'buscarPlacaPeloIdEquipamentoRastreador'!" ) ) } );

        } catch( error ){ 
            
            reject( error ); 
        
        };

    } );

};

const buscarIdUltimaMensagemRastreadorPeloIdEquipamentoRastreador = ( idEquipamentoRastreador, rastreador ) =>{

    return new Promise( async( resolve, reject ) =>{ 

        try{

            await axios.get( `${process.env.ORQUESTRADOR_API_BASE_URL}/v1/equipamentos/equipamentoRastreador/${idEquipamentoRastreador}/ultimaMensagem/${rastreador}`, {
                timeout: 600000
            } )
            .then( ( resultado ) => resolve( resultado.data ) )
            .catch( ( error ) =>{ throw new Error( tratarMsgErroApi( error, "Ocorreu um erro inesperado ao 'buscarIdUltimaMensagemRastreadorPeloIdEquipamentoRastreador'!" ) ) } );

        } catch( error ){ reject( error ); };

    } );

};

const vincularEquipamentoAoRastreador = ( placa, idRastreador, codigoSistemaOrigem ) =>{

    return new Promise( async( resolve, reject ) =>{ 

        try{

            await axios.post( `${process.env.ORQUESTRADOR_API_BASE_URL}/v1/rastreadores/${idRastreador}/equipamentos/${placa}/vincular`, {
                codigoSistemaOrigem: codigoSistemaOrigem
            }, {
                timeout: 600000
            } )

            .then( ( resultado ) => resolve( resultado.data ) )
            .catch( ( error ) =>{ throw new Error( tratarMsgErroApi( error, "Ocorreu um erro inesperado ao 'vincularEquipamentoAoRastreador'!" ) ) } );

        } catch( error ){ reject( error ); };

    } );

}

module.exports = { 
    sincronizar,
    buscarDadosRastreadorPeloNome,
    buscarIdUltimaPosicao,
    buscarIdUltimaPosicaoEquipamentoRastreador,

    buscarIdUltimaMensagemRastreadorPeloIdEquipamentoRastreador,
    buscarPlacaPeloRastreadorECodigoSistemaOrigem,
    vincularEquipamentoAoRastreador
};
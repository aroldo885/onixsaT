const _     = require( "lodash" );

const traduzirEvento = ( localizacao ) =>{

    let ignicao     = localizacao.hasOwnProperty( "evt4" ) ? Number( localizacao.evt4._text ) : -1;
    let velocidade  = Number( localizacao.vel._text );
    let novoEvento  = {
        tipoMedida: "Status",
        valor: ""
    };
    let mapaEventos = [
        {
            descricao: "Ligado e parado",
            condicao: "ignicao === 1 && velocidade === 0"
        },
        {
            descricao: "Desligado",
            condicao: "ignicao === 0"
        },
        {
            descricao: "Em transporte",
            condicao: "ignicao === 1 && velocidade > 0"
        }
    ];

    for( let mapaEvento of mapaEventos ){

        if( eval( mapaEvento.condicao ) ) novoEvento.valor = mapaEvento.descricao;

    }

    if( _.isEmpty( novoEvento.valor ) ){

        novoEvento.valor = "Não identificado";
        
    }

    return novoEvento;

};

module.exports = {

    traduzirEvento

};
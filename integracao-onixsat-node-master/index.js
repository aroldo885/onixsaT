require( "dotenv" ).config();

const bree = require( "bree" );
const path = require( "path" );
const cabin= require( "cabin" );

const schedule = new bree( {

    root: false,
    logger: new cabin( {
        axe: {
            appInfo : false,
            showStack: false,
            showMeta: false,
            silent: true
        }
    } ),
    jobs: [
        {
            name: "onixsat equipamentos",
            path: path.join( __dirname, "src", "jobs", "onixsat", "equipamento.js" ),
            interval: process.env.ONIXSAT_API_INTERVALO_SINCRONIZACAO_EQUIPAMENTO
        },
        {
            name: "onixsat posições",
            path: path.join( __dirname, "src", "jobs", "onixsat", "posicao.js" ),
            interval: process.env.ONIXSAT_API_INTERVALO_SINCRONIZACAO_POSICAO
        }
    ]

} );

schedule.start();
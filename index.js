const path = require("path");
const bree = require("bree");
const cabin = require("cabin");
const config = require("./src/config");

const schedule = new bree({
  root: false,
  logger: new cabin({
    axe: {
      appInfo: false,
      showStack: false,
      showMeta: false,
      silent: true,
    },
  }),
  jobs: [
    {
      name: "onixsat equipamentos",
      path: path.join(__dirname, "src", "jobs", "equipamento.js"),
      interval: config.orquestrador.intervaloEquipamento,
    },
    {
      name: "onixsat posições",
      path: path.join(__dirname, "src", "jobs", "posicao.js"),
      interval: config.orquestrador.intervaloPosicao,
    },
  ],
});

schedule.start();

// ==================================================================
//  server_excessos.js — Mapa + API de excessos
// ==================================================================

const path = require("path");
const express = require("express");
const config = require("../src/config");
const { ExcessosQuery } = require("../src/core/ExcessosQuery");

const app = express();
const PORT = config.server.port;
const VIO_FILE = config.paths.violacoesJsonl;
const MAP_FILE = config.paths.mapVeiculos;

app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/excessos", (req, res) => {
  const query = new ExcessosQuery(req, {
    excessosMaxPoints: config.server.excessosMaxPoints,
    speedMin: config.server.speedMin,
    dedupeByMid: config.server.dedupeByMid,
    officialOnly: config.server.officialOnly,
    lastHoursDefault: config.server.lastHoursDefault,
  });
  const result = query.filterPoints(VIO_FILE, MAP_FILE);
  res.json(result);
});

app.get("/mapa", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.listen(PORT, () =>
  console.log("Abra: http://localhost:" + PORT + "/mapa")
);

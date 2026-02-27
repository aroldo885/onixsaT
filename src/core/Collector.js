const fs = require("fs");
const { CollectorMode, ViolationType } = require("./enums");
const { OnixSatParsers } = require("./OnixSatClient");
const { defaults } = require("./Defaults");

class Collector {
  constructor({
    client,
    statePath,
    mode,
    speedLimit,
    excessoText,
    paths,
    options = {},
    defaults: d,
  } = {}) {
    this.client = client;
    this.statePath = statePath;
    this.mode = mode;
    const v = (d ?? defaults).violation;
    this.speedLimit = speedLimit ?? v.speedLimit;
    this.excessoText = String((excessoText ?? v.excessoText) || "excesso").toLowerCase();
    this.paths = paths;
    this._defaults = d ?? defaults;
    const c = this._defaults.collector;
    this.intervalMs = options.intervalMs ?? c.intervalMs;
    this.backoffInit = options.backoffInit ?? c.backoffInit;
    this.backoffMax = options.backoffMax ?? c.backoffMax;
    this.backoffFactor = options.backoffFactor ?? c.backoffFactor;
  }

  _loadState() {
    try {
      return JSON.parse(fs.readFileSync(this.statePath, this._defaults.encoding));
    } catch {
      return { lastMid: this._defaults.state.defaultLastMid };
    }
  }

  _saveState(state) {
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), this._defaults.encoding);
  }

  _classify(m) {
    const alrt = (OnixSatParsers.toText(m.alrtTelem) ?? "").trim();
    if (!alrt.length) return null;
    const lower = alrt.toLowerCase();
    return lower.includes(this.excessoText)
      ? ViolationType.EXCESSO_VELOCIDADE
      : ViolationType.VIOLACAO;
  }

  async tick() {
    const state = this._loadState();
    const mid = state.lastMid ?? this._defaults.state.defaultLastMid;

    console.log("\nBuscando a partir de mId =", mid);
    const msgs = await this.client.fetchMensagens(mid);

    if (!msgs.length) {
      console.log("Sem novas mensagens.");
      return;
    }

    let maxMid = Number(mid);
    let posCount = 0;
    let vioCount = 0;
    let excessoCount = 0;

    const toText = OnixSatParsers.toText.bind(OnixSatParsers);
    const parseNumberPtBr = OnixSatParsers.parseNumberPtBr.bind(OnixSatParsers);

    for (const m of msgs) {
      const mId = toText(m.mId);
      const veiID = toText(m.veiID);
      const dt = toText(m.dt);
      const lat = parseNumberPtBr(toText(m.lat));
      const lon = parseNumberPtBr(toText(m.lon));
      const vel = parseNumberPtBr(toText(m.vel)) ?? 0;

      if (!veiID || !dt || lat === null || lon === null) continue;

      const mun = toText(m.mun) ?? "";
      const uf = toText(m.uf) ?? "";
      const via = toText(m.rod) || toText(m.rua) || "";
      const evtG = toText(m.evtG) ?? "";
      const alrtTelem = toText(m.alrtTelem) ?? "";
      const rpm = toText(m.rpm) ?? "";

      const posRec = {
        mId,
        veiID,
        dt,
        lat,
        lon,
        vel,
        mun,
        uf,
        via,
        evtG,
        alrtTelem,
        rpm,
      };

      fs.appendFileSync(
        this.paths.posicoesJsonl,
        JSON.stringify(posRec) + "\n",
        this._defaults.encoding
      );
      posCount++;

      if (this.mode === CollectorMode.POSITIONS_AND_VIOLATIONS) {
        const tipo = this._classify(m);
        if (tipo) {
          const vioRec = {
            tipo,
            mId,
            veiID,
            dt,
            lat,
            lon,
            vel,
            limite: this.speedLimit,
            mun,
            uf,
            via,
            evtG,
            alrtTelem,
            rpm,
          };
          fs.appendFileSync(
            this.paths.violacoesJsonl,
            JSON.stringify(vioRec) + "\n",
            this._defaults.encoding
          );
          vioCount++;
          if (tipo === "EXCESSO_VELOCIDADE") excessoCount++;
        }
      }

      const mIdNum = Number(String(mId).replace(/\D/g, ""));
      if (Number.isFinite(mIdNum)) maxMid = Math.max(maxMid, mIdNum);
    }

    state.lastMid = String(maxMid);
    this._saveState(state);

    if (this.mode === CollectorMode.POSITIONS_AND_VIOLATIONS) {
      console.log(
        "Posições:",
        posCount,
        "| Violações:",
        vioCount,
        "| Excesso:",
        excessoCount,
        "| Próximo mId =",
        state.lastMid
      );
    } else {
      console.log("Gravou", posCount, "registros em", this.paths.posicoesJsonl);
      console.log("Próximo mId =", state.lastMid);
    }
  }

  async run() {
    let backoffMs = 0;

    while (true) {
      try {
        await this.tick();
        backoffMs = 0;
        await this._wait(this.intervalMs);
      } catch (e) {
        const msg = (e?.message || "").toString();
        if (
          this.mode === CollectorMode.POSITIONS_AND_VIOLATIONS &&
          msg.includes("Nao atingiu o tempo minimo para reenvio da requisicao")
        ) {
          backoffMs = backoffMs
            ? Math.min(backoffMs * this.backoffFactor, this.backoffMax)
            : this.backoffInit;
          console.warn(
            `[THROTTLE] ${msg} | Aguardando ${backoffMs} ms antes de tentar novamente...`
          );
          await this._wait(backoffMs);
          continue;
        }
        console.error("[ERRO COLETOR]", msg);
        await this._wait(this.intervalMs);
      }
    }
  }

  async runOnce() {
    await this.tick();
  }

  _wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = { Collector };

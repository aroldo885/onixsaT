function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source ?? {})) {
    if (source[k] != null && typeof source[k] === "object" && !Array.isArray(source[k])) {
      out[k] = deepMerge(target[k] ?? {}, source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}

const BUILTIN = {
  heatmap: {
    centerLat: -23.0,
    centerLon: -46.6,
    weightCap: 50,
    limit: 200000,
    leaflet: { radius: 18, blur: 22, maxZoom: 12, tileMaxZoom: 18 },
  },
  collector: {
    intervalMs: 60000,
    backoffInit: 300000,
    backoffMax: 600000,
    backoffFactor: 2,
  },
  violation: {
    speedLimit: 80,
    excessoText: "excesso de velocidade",
  },
  onixsat: {
    timeout: 60000,
  },
  excessos: {
    maxPoints: 3000,
    speedMin: 81,
    companySpeedLimit: 80,
    lastHoursDefault: 24,
    fallbackHours: 24,
  },
  state: {
    defaultLastMid: "1",
  },
  report: {
    xlsxWidths: {
      placa: 10,
      veiID: 14,
      veiIDLong: 16,
      mot: 28,
      ident: 16,
      hora: 18,
      horaLong: 22,
      dt: 26,
      mun: 22,
      uf: 6,
      vel: 12,
      velLong: 18,
      lat: 12,
      lon: 12,
      via: 50,
      viaLong: 55,
      qtdRegistros: 14,
      qtdVeiculos: 12,
      velMedia: 16,
    },
  },
  encoding: "utf8",
};

class Defaults {
  constructor(overrides = {}) {
    this._values = deepMerge(BUILTIN, overrides);
  }

  get heatmap() {
    return this._values.heatmap;
  }
  get collector() {
    return this._values.collector;
  }
  get violation() {
    return this._values.violation;
  }
  get onixsat() {
    return this._values.onixsat;
  }
  get excessos() {
    return this._values.excessos;
  }
  get state() {
    return this._values.state;
  }
  get report() {
    return this._values.report;
  }
  get encoding() {
    return this._values.encoding;
  }
}

const instance = new Defaults();

module.exports = {
  Defaults,
  defaults: instance,
  create: (overrides) => new Defaults(overrides),
};

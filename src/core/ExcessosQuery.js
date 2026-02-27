const fs = require("fs");
const { TimeRangeMode } = require("./enums");
const { defaults: builtinDefaults } = require("./Defaults");

class ExcessosQuery {
  constructor(req, serverDefaults = {}, defaults = builtinDefaults) {
    this.req = req;
    const e = defaults.excessos;
    this.maxPoints = Number(serverDefaults.excessosMaxPoints ?? e.maxPoints);
    this.speedMinDefault = Number(serverDefaults.speedMin ?? e.speedMin);
    this.dedupeByMidDef = String(serverDefaults.dedupeByMid ?? "0") === "1";
    this.officialOnlyDef = String(serverDefaults.officialOnly ?? "1") === "1";
    this.lastHoursDefault = Number(serverDefaults.lastHoursDefault ?? e.lastHoursDefault);
    this._defaults = defaults;
  }

  static safeNumber(x) {
    const n = Number(String(x ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  static parseBool(v, def = false) {
    if (v == null) return def;
    const s = String(v).trim().toLowerCase();
    if (["1", "true", "t", "yes", "y", "on"].includes(s)) return true;
    if (["0", "false", "f", "no", "n", "off"].includes(s)) return false;
    return def;
  }

  static parseDateLike(v) {
    if (v == null || v === "") return NaN;
    const s = String(v).trim();
    if (/^\d+$/.test(s)) {
      const num = Number(s);
      return num > 1e12 ? num : num * 1000;
    }
    return Number.isFinite(Date.parse(s)) ? Date.parse(s) : NaN;
  }

  static parseDtFlexible(dt) {
    if (!dt) return NaN;
    const s = String(dt).trim();
    const tIso = Date.parse(s);
    if (Number.isFinite(tIso)) return tIso;
    const m = s.match(/^(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2}:\d{2})(?:\.\d+)?$/);
    if (m) {
      const d = new Date(`${m[1]}T${m[2]}`);
      return Number.isFinite(d.getTime()) ? d.getTime() : NaN;
    }
    return NaN;
  }

  static extractSpeedFromText(r) {
    const m = String(r.alrtTelem || "")
      .toUpperCase()
      .match(/(\d{2,3})\s*KM\/H/);
    return m ? Number(m[1]) : NaN;
  }

  static extractSpeedLimit(r) {
    return ExcessosQuery.safeNumber(r.limite);
  }

  static isExcessoOficial(r) {
    const tipo = String(r.tipo ?? "").toUpperCase();
    if (tipo === "EXCESSO_VELOCIDADE") return true;
    const a = String(r.alrtTelem ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const pats = [
      /excesso\s+de\s+velocidade/,
      /excesso\s+velocidade/,
      /velocidade\s+excessiva/,
      /alerta\s+de\s+velocidade/,
    ];
    return pats.some((rx) => rx.test(a));
  }

  getTimeRange() {
    const now = Date.now();
    const startOfToday = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };

    if (String(this.req.query?.today || "0") === "1") {
      return { since: startOfToday(), until: now, mode: TimeRangeMode.TODAY };
    }

    const lh = Number(this.req.query?.lastHours ?? this.lastHoursDefault);
    if (Number.isFinite(lh) && lh > 0) {
      return {
        since: now - lh * 3600000,
        until: now,
        mode: TimeRangeMode.LAST_HOURS,
      };
    }

    const since = ExcessosQuery.parseDateLike(this.req.query?.since);
    const until = ExcessosQuery.parseDateLike(this.req.query?.until);
    const s = Number.isFinite(since)
      ? since
      : now - this._defaults.excessos.fallbackHours * 3600000;
    const u = Number.isFinite(until) ? until : now;
    return { since: s, until: u, mode: TimeRangeMode.RANGE };
  }

  filterPoints(vioFilePath, mapVeiculosPath) {
    const map = (() => {
      try {
        return JSON.parse(fs.readFileSync(mapVeiculosPath, this._defaults.encoding));
      } catch {
        return {};
      }
    })();

    const { since, until, mode } = this.getTimeRange();

    const company80 = String(this.req.query?.company80 || "0") === "1";
    const speedMin = Number(this.req.query?.speedMin ?? this.speedMinDefault);
    const maxPoints = Number(this.req.query?.maxPoints ?? this.maxPoints);
    const dedupeByMid = ExcessosQuery.parseBool(this.req.query?.dedupe ?? this.dedupeByMidDef);
    const officialOnly = ExcessosQuery.parseBool(
      this.req.query?.officialOnly ?? this.officialOnlyDef
    );
    const useLimit = ExcessosQuery.parseBool(this.req.query?.useLimit ?? false);
    const wantStats = ExcessosQuery.parseBool(this.req.query?.stats ?? false);

    const placaQuery = String(this.req.query?.placa ?? "").trim();
    const placasWanted = placaQuery
      ? new Set(placaQuery.split(",").map((s) => s.trim().toUpperCase()))
      : null;

    if (!fs.existsSync(vioFilePath)) {
      return {
        mode,
        since: new Date(since).toISOString(),
        until: new Date(until).toISOString(),
        company80,
        placas: [],
        points: [],
      };
    }

    const raw = fs.readFileSync(vioFilePath, this._defaults.encoding);
    const lines = raw.split("\n").filter(Boolean);

    const seenMid = new Set();
    const points = [];
    const placasSet = new Set();

    const stats = {
      lines: lines.length,
      parsed: 0,
      inRange: 0,
      officialPass: 0,
      speedPass: 0,
      latlonPass: 0,
      deduped: 0,
      final: 0,
    };

    for (const line of lines) {
      let r;
      try {
        r = JSON.parse(line);
        stats.parsed++;
      } catch {
        continue;
      }

      const t = ExcessosQuery.parseDtFlexible(r.dt);
      if (!Number.isFinite(t) || t < since || t > until) continue;
      stats.inRange++;

      if (!company80 && officialOnly && !ExcessosQuery.isExcessoOficial(r)) continue;
      stats.officialPass++;

      const velNum = ExcessosQuery.safeNumber(r.vel);
      const velTxt = ExcessosQuery.extractSpeedFromText(r);
      const vel = Number.isFinite(velTxt) ? Math.max(velTxt, velNum) : velNum;
      if (!Number.isFinite(vel)) continue;

      let passSpeed = vel >= speedMin;
      if (company80) passSpeed = vel > this._defaults.excessos.companySpeedLimit;
      if (useLimit && !company80) {
        const lim = ExcessosQuery.extractSpeedLimit(r);
        passSpeed = Number.isFinite(lim) ? vel > lim : vel >= speedMin;
      }
      if (!passSpeed) continue;
      stats.speedPass++;

      const lat = ExcessosQuery.safeNumber(r.lat);
      const lon = ExcessosQuery.safeNumber(r.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      stats.latlonPass++;

      const mid = String(r.mId ?? "");
      if (dedupeByMid && mid) {
        if (seenMid.has(mid)) {
          stats.deduped++;
          continue;
        }
        seenMid.add(mid);
      }

      const v = map[String(r.veiID)] ?? {};
      const placa = String(v.placa ?? "").toUpperCase();

      if (placasWanted && (!placa || !placasWanted.has(placa))) continue;

      placasSet.add(placa || "(sem placa)");

      points.push({
        veiID: r.veiID,
        placa,
        motorista: v.mot ?? "",
        dt: r.dt,
        ts: t,
        vel,
        lat,
        lon,
        mun: r.mun ?? "",
        uf: r.uf ?? "",
        via: r.via ?? "",
      });
    }

    points.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    const limited = points.slice(0, maxPoints);
    stats.final = limited.length;

    return {
      mode,
      since: new Date(since).toISOString(),
      until: new Date(until).toISOString(),
      company80,
      placas: Array.from(placasSet).sort(),
      ...(wantStats ? { stats } : {}),
      points: limited,
    };
  }
}

module.exports = { ExcessosQuery };

/**
 * Report generator. Use options.format (CSV|XLSX) and options.withPlaca.
 */

const fs = require("fs");
const ExcelJS = require("exceljs");
const { ReportFormat } = require("./enums");
const { createJsonlSource } = require("./DataSource");
const { defaults } = require("./Defaults");

function floorHour(dtIso) {
  if (!dtIso) return "";
  const s = String(dtIso);
  return `${s.slice(0, 10)} ${s.slice(11, 13)}:00`;
}

class ReportGenerator {
  constructor(source, options = {}, defaultsOverride = null) {
    this.source = source;
    this.options = options;
    this._defaults = defaultsOverride ?? defaults;
  }

  horaAHora() {
    const records = this.source.read();
    const map = new Map();
    for (const r of records) {
      if (!r.dt || !r.veiID) continue;
      const h = floorHour(r.dt);
      const key = `${r.veiID}__${h}`;
      const prev = map.get(key);
      if (!prev || (r.dt && r.dt > prev.dt) || !prev.dt) map.set(key, r);
    }
    return Array.from(map.values()).sort((a, b) => {
      const ah = floorHour(a.dt);
      const bh = floorHour(b.dt);
      if (ah !== bh) return ah.localeCompare(bh);
      return String(a.veiID).localeCompare(String(b.veiID));
    });
  }

  resumo(horaAHoraList) {
    const resumoMap = new Map();
    for (const r of horaAHoraList) {
      const hora = floorHour(r.dt);
      const item = resumoMap.get(hora) || {
        hora,
        qtd: 0,
        somaVel: 0,
        veis: new Set(),
      };
      item.qtd += 1;
      item.somaVel += Number(r.vel || 0);
      item.veis.add(String(r.veiID));
      resumoMap.set(hora, item);
    }
    return Array.from(resumoMap.values())
      .map((x) => ({
        hora: x.hora,
        qtd_registros: x.qtd,
        qtd_veiculos: x.veis.size,
        vel_media: x.qtd ? x.somaVel / x.qtd : 0,
      }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  generate() {
    const format = this.options.format ?? ReportFormat.CSV;
    if (format === ReportFormat.CSV) {
      return this._writeCsv();
    }
    return this._writeXlsx(this.options.withPlaca ?? false);
  }

  _writeCsv() {
    const records = this.source.read();

    records.forEach((r) => {
      const d = new Date(r.dt);
      r.data = d.toISOString().split("T")[0];
      r.hora = d.getHours().toString().padStart(2, "0") + ":00";
    });

    records.sort((a, b) => {
      if (a.veiID !== b.veiID) return a.veiID.localeCompare(b.veiID);
      return new Date(a.dt) - new Date(b.dt);
    });

    const header = [
      "Veiculo",
      "Data",
      "Hora",
      "Cidade",
      "UF",
      "Velocidade",
      "Latitude",
      "Longitude",
      "Via",
    ];
    const rows = [header.join(";")];
    records.forEach((r) => {
      rows.push(
        [r.veiID, r.data, r.hora, r.mun, r.uf, r.vel, r.lat, r.lon, r.via].join(
          ";"
        )
      );
    });

    fs.writeFileSync(this.options.outPath, rows.join("\n"), this._defaults.encoding);
    console.log("Relatório gerado em:");
    console.log(this.options.outPath);
    console.log("Total registros:", records.length);
  }

  async _writeXlsx(withPlaca) {
    const mapVeiculos = withPlaca
      ? (() => {
          try {
            return JSON.parse(
              fs.readFileSync(this.options.mapVeiculosPath, this._defaults.encoding)
            );
          } catch {
            return {};
          }
        })()
      : {};

    const horaAHora = this.horaAHora();
    const resumo = this.resumo(horaAHora);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Onixsat Robot";

    const ws1 = wb.addWorksheet("Hora a Hora", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    const w = this._defaults.report.xlsxWidths;
    if (withPlaca) {
      ws1.columns = [
        { header: "Placa", key: "placa", width: w.placa },
        { header: "Veículo (veiID)", key: "veiID", width: w.veiID },
        { header: "Motorista", key: "mot", width: w.mot },
        { header: "Ident", key: "ident", width: w.ident },
        { header: "Hora", key: "hora", width: w.hora },
        { header: "Data/Hora Evento", key: "dt", width: w.dt },
        { header: "Cidade", key: "mun", width: w.mun },
        { header: "UF", key: "uf", width: w.uf },
        { header: "Vel (km/h)", key: "vel", width: w.vel },
        { header: "Latitude", key: "lat", width: w.lat },
        { header: "Longitude", key: "lon", width: w.lon },
        { header: "Via", key: "via", width: w.viaLong },
      ];
      ws1.autoFilter = "A1:L1";
      for (const r of horaAHora) {
        const v = mapVeiculos[String(r.veiID)] || {};
        ws1.addRow({
          placa: v.placa || "",
          veiID: r.veiID,
          mot: v.mot || "",
          ident: v.ident || "",
          hora: floorHour(r.dt),
          dt: r.dt,
          mun: r.mun || "",
          uf: r.uf || "",
          vel: Number(r.vel ?? 0),
          lat: Number(r.lat ?? 0),
          lon: Number(r.lon ?? 0),
          via: r.via || "",
        });
      }
    } else {
      ws1.columns = [
        { header: "Veículo (veiID)", key: "veiID", width: w.veiIDLong },
        { header: "Hora (YYYY-MM-DD HH:00)", key: "hora", width: w.horaLong },
        { header: "Data/Hora Evento (dt)", key: "dt", width: w.dt },
        { header: "Cidade", key: "mun", width: w.mun },
        { header: "UF", key: "uf", width: w.uf },
        { header: "Velocidade (km/h)", key: "vel", width: w.velLong },
        { header: "Latitude", key: "lat", width: w.lat },
        { header: "Longitude", key: "lon", width: w.lon },
        { header: "Via", key: "via", width: w.via },
      ];
      ws1.autoFilter = "A1:I1";
      for (const r of horaAHora) {
        ws1.addRow({
          veiID: r.veiID,
          hora: floorHour(r.dt),
          dt: r.dt,
          mun: r.mun || "",
          uf: r.uf || "",
          vel: Number(r.vel ?? 0),
          lat: Number(r.lat ?? 0),
          lon: Number(r.lon ?? 0),
          via: r.via || "",
        });
      }
    }

    ws1.getColumn("vel").numFmt = "0";
    ws1.getColumn("lat").numFmt = "0.000000";
    ws1.getColumn("lon").numFmt = "0.000000";
    ws1.getRow(1).font = { bold: true };

    const ws2 = wb.addWorksheet("Resumo por Hora", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws2.columns = [
      { header: "Hora (YYYY-MM-DD HH:00)", key: "hora", width: w.horaLong },
      { header: "Qtd Registros", key: "qtd_registros", width: w.qtdRegistros },
      { header: "Qtd Veículos", key: "qtd_veiculos", width: w.qtdVeiculos },
      { header: "Vel Média (km/h)", key: "vel_media", width: w.velMedia },
    ];
    ws2.autoFilter = "A1:D1";
    ws2.getRow(1).font = { bold: true };
    for (const r of resumo) ws2.addRow(r);
    ws2.getColumn("vel_media").numFmt = "0.0";

    await wb.xlsx.writeFile(this.options.outPath);
    console.log("✅ XLSX gerado:", this.options.outPath);
    console.log("Linhas (hora a hora):", horaAHora.length);
  }
}

function create(format, opts) {
  const source = createJsonlSource(opts.posicoesPath, opts);
  const options = {
    ...opts,
    format,
    withPlaca: opts.withPlaca ?? false,
  };
  return new ReportGenerator(source, options, opts.defaults ?? null);
}

module.exports = {
  ReportGenerator,
  create,
  floorHour,
};

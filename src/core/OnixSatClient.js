/**
 * OnixSat API client and XML/JSON parsers.
 */

const axios = require("axios");
const AdmZip = require("adm-zip");
const { xml2js } = require("xml-js");
const { defaults } = require("./Defaults");

const OnixSatParsers = {
  toText(node) {
    return node && typeof node === "object" && "_text" in node ? node._text : "";
  },
  parseNumberPtBr(str) {
    if (!str) return null;
    const n = Number(String(str).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  },
  unzipOrXml(buffer) {
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();
      if (!entries.length) throw new Error("ZIP vazio");
      const xmlString = entries[0].getData().toString("utf8");
      return { xmlString, zipped: true, entry: entries[0].entryName };
    } catch {
      return {
        xmlString: Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer),
        zipped: false,
        entry: null,
      };
    }
  },
};

class OnixSatClient {
  /**
   * @param {{ wsUrl: string, login: string, senha: string, defaults?: object }} credentials
   */
  constructor({ wsUrl, login, senha, defaults: d } = {}) {
    this.wsUrl = wsUrl;
    this.login = login;
    this.senha = senha;
    this._defaults = d ?? defaults;
  }

  /**
   * POST XML and return parsed JSON (compact).
   */
  async postXml(xml) {
    const resp = await axios.post(this.wsUrl, xml, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      responseType: "arraybuffer",
      timeout: this._defaults.onixsat.timeout,
      validateStatus: () => true,
    });

    const buf = Buffer.from(resp.data ?? []);
    const { xmlString } = OnixSatParsers.unzipOrXml(buf);
    const json = xml2js(xmlString, { compact: true, ignoreDeclaration: true });

    if (json?.ErrorRequest?.erro?._text) {
      throw new Error(json.ErrorRequest.erro._text);
    }

    return json;
  }

  /**
   * Fetch MensagemCB from OnixSat.
   * @returns {Promise<object[]>}
   */
  async fetchMensagens(mid) {
    const xml = `
<RequestMensagemCB>
  <login>${this.login}</login>
  <senha>${this.senha}</senha>
  <mId>${mid}</mId>
</RequestMensagemCB>`.trim();

    const json = await this.postXml(xml);
    const items = json?.ResponseMensagemCB?.MensagemCB;
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
  }

  /**
   * Fetch Veiculo list from OnixSat.
   * @returns {Promise<object[]>}
   */
  async fetchVeiculos() {
    const xml = `
<RequestVeiculo>
  <login>${this.login}</login>
  <senha>${this.senha}</senha>
</RequestVeiculo>`.trim();

    const json = await this.postXml(xml);
    const root = json?.ResponseVeiculo;
    if (!root) return [];

    const raw = root.Veiculo;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }
}

module.exports = { OnixSatClient, OnixSatParsers };

/**
 * JSONL file data source. Factory returns object with read().
 */

const fs = require("fs");
const { defaults } = require("./Defaults");

function createJsonlSource(path, opts = {}) {
  const enc = (opts.defaults ?? defaults).encoding;
  return {
    read() {
      if (!fs.existsSync(path)) return [];
      const raw = fs.readFileSync(path, enc);
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    },
  };
}

module.exports = { createJsonlSource };

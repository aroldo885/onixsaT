const prettier = require("eslint-config-prettier");

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        parseFloat: "readonly",
        parseInt: "readonly",
        isNaN: "readonly",
        isFinite: "readonly",
        Array: "readonly",
        Object: "readonly",
        String: "readonly",
        Number: "readonly",
        Date: "readonly",
        JSON: "readonly",
        Math: "readonly",
        RegExp: "readonly",
        Error: "readonly",
        Promise: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-eval": "warn",
      "no-implied-eval": "warn",
    },
  },
  prettier,
  {
    ignores: ["node_modules/", "saida/", "assets/", "*.min.js", ".cursor/"],
  },
];

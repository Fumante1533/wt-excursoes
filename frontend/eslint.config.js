import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "build/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    // Inclui `process`/globals do Node porque o Vite roda em Node (ex.: `vite.config.js`)
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  pluginReact.configs.flat.recommended,
  // Ajustes para este projeto (evitar "ruído" de regras que não são usadas)
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/prop-types": "off",
      // React 18+ com texto normal costuma gerar muitos falsos positivos
      "react/no-unescaped-entities": "off",
      // Mantém a verificação, mas não quebra a entrega
      "no-unused-vars": "warn",
    },
  },
]);

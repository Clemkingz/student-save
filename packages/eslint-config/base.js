import js from "@eslint/js";
import globals from "globals";

export const config = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 }
    }
  }
];

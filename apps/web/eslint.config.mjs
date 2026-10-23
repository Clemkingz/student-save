import { defineConfig, globalIgnores } from "eslint/config";
import { nextJsConfig } from "@repo/eslint-config/next-js";

export default defineConfig([
  ...nextJsConfig,
  globalIgnores([".next/**", ".test-build/**", "out/**", "build/**", "next-env.d.ts"])
]);

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Saida do `vercel build`: codigo gerado, ja fora do git pelo .gitignore.
    // Os launchers dela usam require() e faziam `eslint .` falhar por duas
    // regras que nao sao nossas.
    ".vercel/**",
  ]),
]);

export default eslintConfig;

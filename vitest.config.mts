import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * So o apelido `@/`, o mesmo do tsconfig. Sem ele, todo teste que tocasse em
 * `posts.ts` precisava mockar o modulo inteiro — e o teste que prova que o
 * acervo sai do banco igual ao JSON precisa justamente do JSON de verdade.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // e2e/ e' do Playwright (npm run test:layout), contra o build de producao.
  test: {
    exclude: ["**/node_modules/**", "e2e/**"],
    // Os testes de banco (DATABASE_URL_TESTE) dividem um Postgres e recriam
    // tabelas: em paralelo, um apagava a tabela do outro no meio do teste.
    fileParallelism: !process.env.DATABASE_URL_TESTE,
  },
});

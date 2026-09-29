import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de layout no navegador, contra o build de producao.
 *
 * Producao e nao `next dev` de proposito: o cabecalho da home ja saiu errado
 * so em producao (pagina regerada pela Vercel depois de uma publicacao do
 * painel), com o dev certo. Porta propria para nao colidir com um dev aberto.
 *
 * Roda no pre-commit (.githooks/pre-commit) e sob demanda: `npm run test:layout`.
 * Precisa do Chromium do Playwright: `npx playwright install chromium`.
 */
const PORTA = 3217;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORTA}`,
    reducedMotion: "reduce",
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    timeout: 600_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

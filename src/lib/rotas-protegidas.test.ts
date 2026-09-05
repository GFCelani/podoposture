import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Analise estatica das rotas do painel — nenhum handler e executado.
 *
 * Este teste existe por causa de uma falha real, num site irmao: a senha era
 * conferida so no componente React, e `POST`, `PUT` e `DELETE` de
 * `/api/posts` ficaram abertos para qualquer um que descobrisse o endereco.
 * A tela mostrava um cadeado e a porta estava destrancada.
 *
 * Revisao humana nao pega isso de forma confiavel: a rota nova parece com as
 * outras, e o que falta e uma linha que nao esta la. Um teste que le os
 * arquivos, sim.
 */

const RAIZ = join(process.cwd(), "src", "app", "api", "painel");
const VERBOS_DE_ESCRITA = ["POST", "PUT", "PATCH", "DELETE"] as const;

/** Rotas que nao podem exigir sessao — com o motivo escrito. */
const ISENTAS: Record<string, string> = {
  "entrar/route.ts": "e a propria porta: quem chama ainda nao tem sessao",
  "sair/route.ts": "apagar o cookie nao pode depender de o cookie ser valido",
};

type Rota = { caminho: string; relativo: string };

function arquivosDeRota(dir: string, prefixo = ""): Rota[] {
  const achados: Rota[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, item.name);
    const relativo = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.isDirectory()) achados.push(...arquivosDeRota(caminho, relativo));
    else if (item.name === "route.ts") achados.push({ caminho, relativo });
  }
  return achados;
}

const rotas = arquivosDeRota(RAIZ);

/** Recorta o corpo de um handler: da declaracao ate a proxima declaracao de topo. */
function corpoDoHandler(fonte: string, verbo: string): string | null {
  const declaracao = new RegExp(`export\\s+async\\s+function\\s+${verbo}\\s*\\(`);
  const inicio = fonte.search(declaracao);
  if (inicio === -1) return null;
  const resto = fonte.slice(inicio + 1);
  const proxima = resto.search(/export\s+(async\s+)?function\s/);
  return proxima === -1 ? resto : resto.slice(0, proxima);
}

describe("toda rota de escrita do painel passa pela guarda", () => {
  it("encontrou as rotas", () => {
    expect(rotas.length).toBeGreaterThanOrEqual(4);
  });

  it.each(rotas.map((r) => [r.relativo, r.caminho]))(
    "%s exige sessao em todo verbo de escrita",
    (relativo, caminho) => {
      const motivo = ISENTAS[relativo as string];
      const fonte = readFileSync(caminho as string, "utf8");

      for (const verbo of VERBOS_DE_ESCRITA) {
        const corpo = corpoDoHandler(fonte, verbo);
        if (!corpo) continue;
        if (motivo) continue;
        expect(
          /exigirSessao\s*\(|preparar\s*\(/.test(corpo),
          `${relativo}: ${verbo} nao chama exigirSessao()`,
        ).toBe(true);
      }
    },
  );

  it.each(rotas.map((r) => [r.relativo, r.caminho]))(
    "%s chama a guarda ANTES de ler o corpo",
    (relativo, caminho) => {
      if (ISENTAS[relativo as string]) return;
      const fonte = readFileSync(caminho as string, "utf8");

      for (const verbo of VERBOS_DE_ESCRITA) {
        const corpo = corpoDoHandler(fonte, verbo);
        if (!corpo) continue;

        const guarda = [corpo.indexOf("exigirSessao("), corpo.indexOf("preparar(")]
          .filter((i) => i !== -1)
          .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);

        const leituras = [
          "req.json(",
          "req.text(",
          "req.formData(",
          "lerCorpoLimitado(",
          "lerBytesLimitados(",
          "lerCorpo(",
          "req.body",
        ]
          .map((p) => corpo.indexOf(p))
          .filter((i) => i !== -1);
        if (leituras.length === 0) continue;

        expect(
          guarda < Math.min(...leituras),
          `${relativo}: ${verbo} le o corpo antes de conferir a sessao`,
        ).toBe(true);
      }
    },
  );

  it("o atalho `preparar` realmente confere a sessao", () => {
    for (const { caminho, relativo } of rotas) {
      const fonte = readFileSync(caminho, "utf8");
      if (!/function\s+preparar\s*\(/.test(fonte)) continue;
      const inicio = fonte.search(/function\s+preparar\s*\(/);
      const resto = fonte.slice(inicio);
      const fim = resto.search(/\nexport\s+(async\s+)?function\s/);
      const corpo = fim === -1 ? resto : resto.slice(0, fim);
      expect(corpo.includes("exigirSessao("), `${relativo}: preparar() nao confere sessao`).toBe(
        true,
      );
    }
  });

  it("as rotas isentas ainda conferem a procedencia do pedido", () => {
    for (const relativo of Object.keys(ISENTAS)) {
      const rota = rotas.find((r) => r.relativo === relativo);
      expect(rota, `rota isenta ${relativo} nao existe mais`).toBeTruthy();
      const fonte = readFileSync(rota!.caminho, "utf8");
      expect(/await\s+pedidoVeioDaqui\s*\(\s*\)/.test(fonte), relativo).toBe(true);
    }
  });
});

describe("nenhuma consulta e montada por concatenacao", () => {
  it.each(rotas.map((r) => [r.relativo, r.caminho]))("%s", (_relativo, caminho) => {
    const fonte = readFileSync(caminho as string, "utf8");
    expect(fonte).not.toMatch(/`[^`]*(SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{/i);
  });

  it("a camada de dados so usa consulta parametrizada", () => {
    const fonte = readFileSync(join(process.cwd(), "src", "lib", "painel-db.ts"), "utf8");
    expect(fonte).not.toContain("sql.unsafe(");
    expect(fonte).toContain("sql`");
  });
});

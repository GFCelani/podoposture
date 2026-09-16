import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guarda das redes de erro.
 *
 * Duas coisas aqui nao se conferem por tipo nem por build, e as duas ja
 * custaram caro em outros projetos:
 *
 * 1. Fronteira de erro que deixa de ser Client Component quebra em silencio no
 *    build, ou pior, deixa de existir num refactor e o site volta a mostrar a
 *    tela padrao do Next, em ingles.
 *
 * 2. `loading.tsx` num segmento que chama `notFound()` troca o status HTTP de
 *    404 para 200. A doc do Next e' explicita: com `notFound()`, a resposta e'
 *    404 quando NAO e' transmitida (streamed) e 200 quando e'. E `loading.tsx`
 *    e' justamente o que liga o streaming no segmento. Num site cujo ativo sao
 *    88 URLs indexadas, trocar 404 por 200 e' convidar o Google a indexar
 *    pagina de erro como se fosse conteudo — e o build continua verde.
 */

const APP = join(process.cwd(), "src", "app");

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const TODOS = arquivos(APP);

function ler(caminho: string): string {
  return readFileSync(caminho, "utf8");
}

/** Tira comentarios, para "use client" ou notFound() citados em texto nao contarem. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const FRONTEIRAS = [
  { arquivo: join(APP, "error.tsx"), o_que: "erro em qualquer pagina publica" },
  { arquivo: join(APP, "global-error.tsx"), o_que: "erro no proprio layout raiz" },
  { arquivo: join(APP, "publicar", "error.tsx"), o_que: "erro dentro do painel" },
];

describe("redes de erro", () => {
  it.each(nomesDasFronteiras())("existe fronteira para %s", (_o_que, arquivo) => {
    expect(TODOS).toContain(arquivo);
  });

  it.each(nomesDasFronteiras())(
    "a fronteira de %s e Client Component",
    (_o_que, arquivo) => {
      const primeiraLinhaUtil = semComentarios(ler(arquivo))
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 0);

      expect(primeiraLinhaUtil).toBe('"use client";');
    },
  );

  it("as fronteiras recebem retry, que e o nome da prop no Next 16", () => {
    // `reset` ficou como caso de excecao na 16; uma fronteira escrita com o
    // nome antigo compila e nunca recupera nada, porque a prop chega undefined.
    // Conferir so se a palavra "retry" aparece em algum lugar do arquivo nao
    // guarda nada: o que importa e o que a funcao DESESTRUTURA dos parametros.
    for (const { arquivo } of FRONTEIRAS) {
      const fonte = semComentarios(ler(arquivo));
      const parametros = fonte.match(/export default function \w+\(\s*\{([^}]*)\}/);

      expect(parametros, `${arquivo} sem desestruturacao de props`).not.toBeNull();
      expect(parametros?.[1]).toMatch(/\bretry\b/);
      expect(parametros?.[1]).not.toMatch(/\breset\b/);
    }
  });

  it("o global-error traz as proprias tags html e body", () => {
    // Ele SUBSTITUI o layout raiz: sem elas, a pagina nao tem documento.
    const fonte = ler(join(APP, "global-error.tsx"));
    expect(fonte).toMatch(/<html\b/);
    expect(fonte).toMatch(/<body\b/);
  });

  it("o global-error nao depende de classe do tema, que ele nao recebe", () => {
    // Substituindo o layout, ele fica sem globals.css e sem as fontes: escrito
    // com as classes do site, sairia sem estilo nenhum justo quando tudo caiu.
    const fonte = semComentarios(ler(join(APP, "global-error.tsx")));
    expect(fonte).not.toMatch(/className=/);
  });

  it("a pagina de 404 continua existindo e fora do indice", () => {
    const naoEncontrada = join(APP, "not-found.tsx");
    expect(TODOS).toContain(naoEncontrada);
    expect(semComentarios(ler(naoEncontrada))).toMatch(/index:\s*false/);
  });
});

describe("armadilha do streaming: 404 virando 200", () => {
  const COM_NOT_FOUND = TODOS.filter(
    (caminho) =>
      caminho.endsWith(`${sep}page.tsx`) &&
      /\bnotFound\s*\(\s*\)/.test(semComentarios(ler(caminho))),
  );

  it("existe pagina chamando notFound() (senao este teste nao guarda nada)", () => {
    expect(COM_NOT_FOUND.length).toBeGreaterThanOrEqual(2);
  });

  it.each(COM_NOT_FOUND.map((c) => [relative(APP, c), c]))(
    "%s nao tem loading.tsx acima dela",
    (_rotulo, pagina) => {
      // Sobe do segmento da pagina ate a raiz de app/: um loading.tsx em
      // qualquer nivel liga o streaming para ela.
      const encontrados: string[] = [];
      let pasta = join(pagina, "..");

      while (pasta.startsWith(APP)) {
        const loading = join(pasta, "loading.tsx");
        if (TODOS.includes(loading)) encontrados.push(relative(APP, loading));
        if (pasta === APP) break;
        pasta = join(pasta, "..");
      }

      expect(encontrados).toEqual([]);
    },
  );
});

function nomesDasFronteiras(): [string, string][] {
  return FRONTEIRAS.map(({ o_que, arquivo }) => [o_que, arquivo]);
}

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Invalidar o site inteiro nao pode derrubar pagina.
 *
 * Existe por causa de uma queda medida com `next start`: o painel (publicar na
 * pagina inicial) e o cron da noite chamam `revalidatePath("/", "layout")`, e
 * toda pagina de um segmento com `dynamicParams = false` passou a responder 404
 * depois disso, com o 404 guardado em cache. Eram as 18 paginas de [slug] — as
 * de tratamento, as mais importantes para a busca. No runtime do Next, a
 * entrada invalidada chega sem versao anterior, e com fallback desligado a
 * regeneracao vira NoFallbackError (build/templates/app-page-runtime.js).
 *
 * O teste le os arquivos: se alguma rota invalida pelo layout raiz, nenhuma
 * pagina pode desligar os parametros dinamicos. Endereco inventado continua
 * sendo 404 pelo `notFound()` da propria pagina.
 */

const APP = join(process.cwd(), "src", "app");

function listar(dir: string, aceitar: (nome: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const achados: string[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, item.name);
    if (item.isDirectory()) achados.push(...listar(caminho, aceitar));
    else if (aceitar(item.name)) achados.push(caminho);
  }
  return achados;
}

/** Sem comentarios: citar a regra num comentario nao pode contar como uso. */
function semComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const INVALIDA_O_LAYOUT = /revalidatePath\(\s*["']\/["']\s*,\s*["']layout["']\s*\)/;
const PARAMETROS_DESLIGADOS = /export\s+const\s+dynamicParams\s*=\s*false/;

describe("invalidar o layout raiz nao derruba pagina", () => {
  it("as regras enxergam o que procuram", () => {
    expect(INVALIDA_O_LAYOUT.test('revalidatePath("/", "layout")')).toBe(true);
    expect(INVALIDA_O_LAYOUT.test("revalidatePath('/', 'layout')")).toBe(true);
    expect(INVALIDA_O_LAYOUT.test('revalidatePath("/nosso-blog")')).toBe(false);
    expect(PARAMETROS_DESLIGADOS.test("export const dynamicParams = false;")).toBe(true);
    expect(PARAMETROS_DESLIGADOS.test(semComentarios("// export const dynamicParams = false;"))).toBe(false);
  });

  it("nenhuma pagina desliga os parametros dinamicos enquanto algo invalida o layout raiz", () => {
    const rotas = listar(APP, (nome) => nome === "route.ts");
    const invalidam = rotas.filter((r) => INVALIDA_O_LAYOUT.test(semComentarios(readFileSync(r, "utf8"))));
    expect(invalidam.length, "o painel e o cron invalidam o layout raiz").toBeGreaterThan(0);

    const paginas = listar(APP, (nome) => nome === "page.tsx");
    const desligadas = paginas.filter((p) => PARAMETROS_DESLIGADOS.test(semComentarios(readFileSync(p, "utf8"))));
    expect(desligadas.map((p) => p.slice(APP.length + 1))).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O JSON-LD sai dentro de <script>, e desde o painel os campos vem do banco.
 *
 * Este teste existe porque o furo era invisivel na revisao: o arquivo tinha um
 * comentario afirmando que nao havia entrada de usuario naquele caminho, e a
 * afirmacao deixou de ser verdadeira sem que nenhuma linha dele mudasse — foi o
 * painel, em outro arquivo, que abriu a segunda fonte.
 */

/** A mesma transformacao de `JsonLd` em src/components/json-ld.tsx. */
function serializar(dados: unknown): string {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}

describe("JSON-LD dentro de <script>", () => {
  it("um titulo com </script> nao fecha a tag", () => {
    const titulo = 'Dor lombar</script><script>alert(document.domain)</script>';
    const saida = serializar({ "@type": "BlogPosting", headline: titulo });

    expect(saida).not.toContain("</script");
    expect(saida).not.toContain("<");
    // e continua sendo o mesmo dado para quem le o JSON
    expect(JSON.parse(saida).headline).toBe(titulo);
  });

  it.each([
    ["fechamento com espaco", "x</script >y"],
    ["fechamento em maiuscula", "x</SCRIPT>y"],
    ["abertura de tag", "x<img src=a onerror=alert(1)>y"],
    ["comentario HTML", "x<!--<script>-->y"],
  ])("neutraliza: %s", (_caso, texto) => {
    const saida = serializar({ headline: texto });
    expect(saida).not.toContain("<");
    expect(JSON.parse(saida).headline).toBe(texto);
  });

  it("o componente de verdade aplica o escape", () => {
    const fonte = readFileSync(
      join(process.cwd(), "src", "components", "json-ld.tsx"),
      "utf8",
    );
    // Duas barras no fonte = a sequencia < no HTML. Uma barra so seria
    // um escape do proprio TypeScript e a substituicao viraria um no-op.
    expect(fonte).toContain('replace(/</g, "\\\\u003c")');
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { validarSecao } from "./conteudo-tipos";
import { derivarContato } from "./site";

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

  it("campo do cadastro de contato chega com < e sai neutralizado", () => {
    // A validacao do painel aceita "<" num nome (e texto comum): quem protege
    // o <script> e o escape, nao a validacao. Por isso o caso passa pelos dois.
    const nome = "Claudia</script><script>alert(document.domain)</script>";
    const descricao = "Clínica <b>boa</b></script>";
    const resultado = validarSecao("contato", {
      ...CONTEUDO_PADRAO.contato,
      responsavel: { nome, titulo: "Osteopata" },
      descricaoParaBuscadores: descricao,
    });
    expect(resultado.ok).toBe(true);
    const contato = derivarContato(resultado.dados!);

    const saida = serializar({
      description: contato.descricao,
      "@graph": [{ "@type": "Person", name: contato.responsavel.nome }],
    });
    expect(saida).not.toContain("<");
    expect(JSON.parse(saida)["@graph"][0].name).toBe(nome);

    // e o componente le exatamente esses campos do contato, nao uma constante
    const fonte = readFileSync(join(process.cwd(), "src", "components", "json-ld.tsx"), "utf8");
    expect(fonte).toContain("contato.responsavel.nome");
    expect(fonte).toContain("contato.descricao");
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

import { describe, expect, it } from "vitest";

import { paginasDoAcervo } from "./pagina-do-acervo";
import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { LIMITES_POST } from "./painel-tipos";
import { PAGINAS_DINAMICAS, subtituloCortadoAntigo, subtituloDaPagina } from "./pages";
import { BRUTOS_DO_JSON, RESUMOS_COMPLETADOS } from "./posts";
import { resumoInteiro, semParagrafoRepetido, textoDoHtml } from "./subtitulo-inteiro";

const CORTE = /(\.\.\.|…)\s*$/;

describe("resumoInteiro", () => {
  const html = "<p>Primeira frase curta. Segunda frase, que o blog antigo cortou no meio, termina aqui. Terceira.</p>";

  it("completa ate o fim da frase em que o trecho parava", () => {
    expect(resumoInteiro("Primeira frase curta. Segunda frase, que o blog...", html)).toBe(
      "Primeira frase curta. Segunda frase, que o blog antigo cortou no meio, termina aqui.",
    );
  });

  it("trecho que ja acaba numa frase fica so com ela", () => {
    expect(resumoInteiro("Primeira frase curta....", html)).toBe("Primeira frase curta.");
  });

  it("sem reticencias, ou sem o corpo como fonte, volta como veio", () => {
    expect(resumoInteiro("Outro texto.", html)).toBe("Outro texto.");
    expect(resumoInteiro("Nada a ver com o corpo...", html)).toBe("Nada a ver com o corpo...");
  });

  it("resolve entidades e espacos do HTML", () => {
    expect(textoDoHtml("<p>A&nbsp;&quot;dor&quot;<br />\n  volta &amp; vai</p>")).toBe('A "dor" volta & vai');
  });
});

describe("nenhum subtitulo cortado", () => {
  it("posts do acervo: resumo sem reticencias de corte e dentro do limite do painel", () => {
    for (const p of BRUTOS_DO_JSON) {
      expect(p.resumo, p.slug).not.toMatch(CORTE);
      expect(p.resumo.length, p.slug).toBeLessThanOrEqual(LIMITES_POST.resumo);
    }
    expect(RESUMOS_COMPLETADOS).toHaveLength(15);
  });

  it("paginas do acervo: subtitulo sem reticencias de corte e dentro do limite do painel", () => {
    for (const p of paginasDoAcervo(CONTEUDO_PADRAO)) {
      expect(p.resumo, p.slug).not.toMatch(CORTE);
      expect(p.resumo.length, p.slug).toBeLessThanOrEqual(LIMITES_POST.resumo);
    }
  });

  it("as paginas que saiam cortadas sao as seis conhecidas", () => {
    const trocadas = PAGINAS_DINAMICAS.filter((p) => subtituloCortadoAntigo(p) !== subtituloDaPagina(p, ""))
      .map((p) => p.slug.normalize("NFC"))
      .sort();
    expect(trocadas).toEqual(
      ["acupuntura", "acupuntura-clínica", "baropodometria", "dor-lombar-crônica", "neuromodulação", "palmilhas-personalizadas"].sort(),
    );
  });
});

describe("semParagrafoRepetido", () => {
  const html =
    '<p>Mais de 30 anos.<br />\nAtendimento por <a href="/x"><strong>Claudia</strong></a>.</p>\n<h2>Depois</h2><p>Resto.</p>';

  it("tira do corpo o primeiro paragrafo quando ele e' o subtitulo", () => {
    expect(semParagrafoRepetido(html, "Mais de 30 anos. Atendimento por Claudia.")).toBe("<h2>Depois</h2><p>Resto.</p>");
  });

  it("subtitulo diferente, ou so o comeco do paragrafo, deixa o corpo inteiro", () => {
    expect(semParagrafoRepetido(html, "Outro subtitulo escrito no painel.")).toBe(html);
    expect(semParagrafoRepetido(html, "Mais de 30 anos.")).toBe(html);
    expect(semParagrafoRepetido(html, "")).toBe(html);
  });

  it("acontece em 6 paginas e 12 posts do acervo", () => {
    const paginas = paginasDoAcervo(CONTEUDO_PADRAO).filter((p) => semParagrafoRepetido(p.corpo, p.resumo) !== p.corpo);
    expect(paginas.map((p) => p.slug).sort()).toEqual(
      ["acupuntura", "acupuntura-clínica", "baropodometria", "dor-lombar-crônica", "neuromodulação", "palmilhas-personalizadas"].sort(),
    );
    const posts = BRUTOS_DO_JSON.filter((p) => semParagrafoRepetido(p.html, p.resumo) !== p.html);
    expect(posts).toHaveLength(12);
    // nada do texto se perde: o que sai do corpo e' exatamente o subtitulo
    for (const p of posts) {
      const corpo = textoDoHtml(p.html);
      const resto = textoDoHtml(semParagrafoRepetido(p.html, p.resumo));
      expect(corpo.startsWith(textoDoHtml(p.resumo)), p.slug).toBe(true);
      expect(corpo.endsWith(resto), p.slug).toBe(true);
    }
  });
});

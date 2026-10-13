import { describe, expect, it } from "vitest";

import { paginasDoAcervo } from "./pagina-do-acervo";
import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { LIMITES_POST } from "./painel-tipos";
import { PAGINAS_DINAMICAS, subtituloCortadoAntigo, subtituloDaPagina } from "./pages";
import { BRUTOS_DO_JSON, RESUMOS_COMPLETADOS } from "./posts";
import { resumoInteiro, textoDoHtml, topoDoTexto } from "./subtitulo-inteiro";

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

describe("topoDoTexto", () => {
  const html =
    '<p>Mais de 30 anos.<br />\nAtendimento por <a href="/x"><strong>Claudia</strong></a>.</p>\n<h2>Depois</h2><p>Resto.</p>';

  it("subtitulo igual ao primeiro paragrafo: sobe com links e formatacao e sai do corpo", () => {
    const t = topoDoTexto(html, "Mais de 30 anos. Atendimento por Claudia.");
    expect(t.subtituloHtml).toBe('Mais de 30 anos.<br />\nAtendimento por <a href="/x"><strong>Claudia</strong></a>.');
    expect(t.corpo).toBe("<h2>Depois</h2><p>Resto.</p>");
  });

  it("subtitulo que e' so o comeco do texto: topo sem subtitulo, corpo inteiro", () => {
    expect(topoDoTexto(html, "Mais de 30 anos.")).toEqual({ subtitulo: null, subtituloHtml: null, corpo: html });
  });

  it("subtitulo proprio: aparece como texto, corpo inteiro", () => {
    expect(topoDoTexto(html, "Outro subtitulo escrito no painel.")).toEqual({
      subtitulo: "Outro subtitulo escrito no painel.",
      subtituloHtml: null,
      corpo: html,
    });
    expect(topoDoTexto(html, "")).toEqual({ subtitulo: null, subtituloHtml: null, corpo: html });
  });

  it("no acervo: 6 paginas e 12 posts sobem o paragrafo, 11 posts ficam sem subtitulo", () => {
    const paginas = paginasDoAcervo(CONTEUDO_PADRAO).map((p) => ({ slug: p.slug, t: topoDoTexto(p.corpo, p.resumo) }));
    expect(paginas.filter((p) => p.t.subtituloHtml).map((p) => p.slug).sort()).toEqual(
      ["acupuntura", "acupuntura-clínica", "baropodometria", "dor-lombar-crônica", "neuromodulação", "palmilhas-personalizadas"].sort(),
    );
    // subtitulo vazio (Curriculo Profissional) cai na descricao do site; nenhum e' so o comeco do texto
    expect(paginas.filter((p) => p.t.subtitulo === null && p.slug !== "currículo-profissional")).toHaveLength(0);
    const lombar = paginas.find((p) => p.slug === "dor-lombar-crônica")!;
    expect(lombar.t.subtituloHtml).toMatch(/<a href="[^"]+"><strong>Claudia Meirelles<\/strong><\/a>/);

    const posts = BRUTOS_DO_JSON.map((p) => ({ p, t: topoDoTexto(p.html, p.resumo) }));
    expect(posts.filter((x) => x.t.subtituloHtml)).toHaveLength(12);
    expect(posts.filter((x) => x.t.subtitulo === null)).toHaveLength(11);
    // nada do texto se perde: o que sai do corpo e' exatamente o subtitulo
    for (const { p, t } of posts.filter((x) => x.t.subtituloHtml)) {
      expect(textoDoHtml(t.subtituloHtml!)).toBe(textoDoHtml(p.resumo));
      expect(textoDoHtml(p.html).endsWith(textoDoHtml(t.corpo)), p.slug).toBe(true);
    }
  });
});

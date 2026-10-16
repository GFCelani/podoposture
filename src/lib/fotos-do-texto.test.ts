import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { fotosDoTexto, mudarFotoDoTexto } from "./fotos-do-texto";
import { htmlParaMarkdown } from "./html-para-markdown";
import { markdownParaHtml } from "./markdown";
import { paginasDoAcervo } from "./pagina-do-acervo";
import { BRUTOS_DO_JSON } from "./posts";

/**
 * O painel mostra como foto cada imagem do texto (lib/fotos-do-texto.ts). A
 * promessa: toda imagem que o Markdown poe na pagina aparece na lista, na
 * mesma ordem, e mexer numa nao toca no resto do texto.
 */

const srcsDoHtml = (html: string) =>
  [...html.matchAll(/<img\b[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

/** Os textos como o editor os abre: o HTML do codigo convertido para Markdown. */
const TEXTOS = [
  ...paginasDoAcervo(CONTEUDO_PADRAO).map((p) => ({ nome: `pagina ${p.slug}`, corpo: htmlParaMarkdown(p.corpo) })),
  ...BRUTOS_DO_JSON.map((p) => ({ nome: `post ${p.slug}`, corpo: htmlParaMarkdown(p.html) })),
];

describe("fotos do texto", () => {
  it.each(TEXTOS)("$nome: a lista do painel e' exatamente o que a pagina mostra", ({ corpo }) => {
    expect(fotosDoTexto(corpo).map((f) => f.src)).toEqual(srcsDoHtml(markdownParaHtml(corpo)));
  });

  it("Como e o meu atendimento: as quatro fotos das etapas, com legenda e secao", () => {
    const atendimento = TEXTOS.find((t) => t.nome === "pagina como-e-o-meu-atendimento")!;
    const fotos = fotosDoTexto(atendimento.corpo);
    expect(fotos.map((f) => f.src)).toEqual([
      "/img/galeria/mesa-da-consulta.webp",
      "/img/galeria/corredor-com-espelho.webp",
      "/img/galeria/palmilhas-na-bancada.webp",
      "/img/galeria/baropodometria-na-tela.webp",
    ]);
    expect(fotos[0].legenda).toBe("A mesa do consultório, onde a consulta começa.");
    expect(fotos[0].secao).toBe("Primeiro, compreender a sua história");
    expect(fotos.every((f) => f.alt.length > 20)).toBe(true);
  });

  it("trocar a foto, a descricao ou a legenda reescreve so aquela linha", () => {
    const corpo = '## A\n\nantes\n\n![um](/img/galeria/escritorio.webp "leg um")\n\nmeio\n\n![dois](/img/galeria/recepcao.webp)\n\nfim';
    const nova = "/img/post/" + "a".repeat(64) + "-800x1000.webp";
    const trocado = mudarFotoDoTexto(corpo, 1, { src: nova });
    expect(trocado).toBe(corpo.replace("/img/galeria/recepcao.webp", nova));
    const legendado = mudarFotoDoTexto(corpo, 0, { legenda: 'com "aspas" e \\ barra' });
    expect(fotosDoTexto(legendado)[0].legenda).toBe('com "aspas" e \\ barra');
    expect(markdownParaHtml(legendado)).toContain('title="com &quot;aspas&quot; e \\ barra"');
    const descrito = mudarFotoDoTexto(corpo, 0, { alt: "nova [descricao]" });
    expect(fotosDoTexto(descrito)[0]).toMatchObject({ alt: "nova descricao", legenda: "leg um" });
    // sem mudanca nenhuma, o texto volta byte a byte
    expect(mudarFotoDoTexto(corpo, 0, {})).toBe(corpo);
    expect(mudarFotoDoTexto(corpo, 5, { alt: "x" })).toBe(corpo);
  });

  it("foto do acervo do blog guarda a medida no titulo, e a perde ao ser trocada", () => {
    const corpo = '![capa](/img/blog/foto-1.webp "1024x768")';
    expect(fotosDoTexto(corpo)[0].legenda).toBe("");
    expect(mudarFotoDoTexto(corpo, 0, { alt: "outra" })).toBe('![outra](/img/blog/foto-1.webp "1024x768")');
    const nova = "/img/post/" + "b".repeat(64) + "-800x600.webp";
    expect(mudarFotoDoTexto(corpo, 0, { src: nova })).toBe(`![capa](${nova})`);
  });

  it("imagem dentro de bloco de codigo nao e' foto", () => {
    expect(fotosDoTexto("```\n![x](/img/galeria/recepcao.webp)\n```\n\n![y](/img/galeria/escritorio.webp)").map((f) => f.alt)).toEqual(["y"]);
  });
});

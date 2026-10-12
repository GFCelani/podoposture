import { describe, expect, it } from "vitest";

import {
  ASSINATURA_DO_ATENDIMENTO,
  CITACAO_DO_ATENDIMENTO,
  ETAPAS_DO_ATENDIMENTO,
  FOTOS_DAS_ETAPAS,
  INTRODUCAO_DO_ATENDIMENTO,
} from "./atendimento";
import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { htmlParaMarkdown } from "./html-para-markdown";
import { markdownParaHtml } from "./markdown";
import { corpoComFotos, paginaDoAtendimento } from "./pagina-do-acervo";
import { PAGINAS_ANTIGAS, fotosConhecidas, lerAtendimento, modeloDaPagina, separarFotos } from "./paginas-antigas";
import { PAGINAS_DINAMICAS } from "./pages";

describe("paginas antigas e novas", () => {
  it("antigas sao as de pages.json (menos home e blog) e a do atendimento", () => {
    const esperadas = [
      ...PAGINAS_DINAMICAS.map((p) => p.slug.normalize("NFC")).filter((s) => s !== "home" && s !== "nosso-blog"),
      "como-e-o-meu-atendimento",
    ];
    expect([...PAGINAS_ANTIGAS].sort()).toEqual([...new Set(esperadas)].sort());
  });

  it("pagina criada pelo painel e' nova", () => {
    expect(modeloDaPagina("fisioterapia-pelvica")).toBe("novo");
    expect(modeloDaPagina("tratamento-da-dor")).toBe("antigo");
    expect(modeloDaPagina("tratamento-da-dor".normalize("NFD"))).toBe("antigo");
  });
});

describe("separarFotos", () => {
  it("devolve o HTML de antes byte a byte e as fotos, em todas as paginas antigas", () => {
    for (const pagina of PAGINAS_DINAMICAS) {
      const chave = pagina.slug.normalize("NFC");
      const registro = fotosConhecidas(chave, CONTEUDO_PADRAO);
      if (!registro) continue;
      const fotos = registro.srcs.map((src, i) => ({
        src,
        alt: "a",
        legenda: "l",
        largura: 100,
        altura: 125,
        ...(i === 0 && registro.ancora ? { secao: registro.ancora } : {}),
      }));
      const corpo = corpoComFotos(pagina.html, fotos);
      const { html, apoio: lidas } = separarFotos(corpo, registro);
      expect(html, pagina.slug).toBe(pagina.html);
      expect(lidas, pagina.slug).toEqual(fotos);
    }
  });

  it("sem o registro, a ancora e' o titulo antes da primeira foto", () => {
    const html = "<p>a</p><h2>Um</h2><p>b</p><h2>Dois</h2><figure><img src=\"/img/x.webp\" alt=\"x\" width=\"10\" height=\"10\"></figure><p>c</p>";
    const { html: limpo, apoio } = separarFotos(html);
    expect(limpo).toBe("<p>a</p><h2>Um</h2><p>b</p><h2>Dois</h2><p>c</p>");
    expect(apoio[0].secao).toBe("dois");
  });
});

describe("lerAtendimento", () => {
  const confere = (lido: ReturnType<typeof lerAtendimento>) => {
    expect(lido.introducao.length).toBe(INTRODUCAO_DO_ATENDIMENTO.length);
    expect(lido.etapas.map((e) => e.id)).toEqual(ETAPAS_DO_ATENDIMENTO.map((e) => e.id));
    expect(lido.etapas.map((e) => e.fotos.map((f) => f.src))).toEqual(
      ETAPAS_DO_ATENDIMENTO.map((e) => (FOTOS_DAS_ETAPAS[e.id] ? [FOTOS_DAS_ETAPAS[e.id]!.src] : [])),
    );
    expect(lido.fecho?.separador).toBe("⸻");
    expect(lido.fecho?.paragrafos).toHaveLength(2);
    expect(lido.fecho?.citacao).toBe(CITACAO_DO_ATENDIMENTO);
    expect(lido.fecho?.assinatura).toEqual(ASSINATURA_DO_ATENDIMENTO);
  };

  it("le o corpo gravado na importacao", () => confere(lerAtendimento(paginaDoAtendimento().corpo)));

  it("le o mesmo corpo depois de passar pelo editor (Markdown)", () =>
    confere(lerAtendimento(markdownParaHtml(htmlParaMarkdown(paginaDoAtendimento().corpo)))));
});

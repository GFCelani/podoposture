import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { chaveDaPagina } from "./conteudo-tipos";
import { planejarFluxo } from "./fluxo";
import { ilustracaoDaPagina } from "./ilustracao-da-pagina";
import { montarMenu } from "./menu";
import { NAV_GROUPS } from "./nav";
import { corpoComFotos, paginaDoAtendimento, paginasDoAcervo } from "./pagina-do-acervo";
import { PAGINAS_DINAMICAS } from "./pages";

/**
 * As paginas do codigo vao para o banco por esta conversao. A promessa e' a
 * da migracao do blog: nada muda na pagina. Aqui se prova pelo plano do
 * corpo (lib/fluxo.ts), que e' o que a pagina renderiza.
 */
describe("paginas do codigo na forma do painel", () => {
  const paginas = paginasDoAcervo(CONTEUDO_PADRAO);

  it("sao as 17 do site antigo, menos Contato, e a do atendimento", () => {
    expect(paginas).toHaveLength(18);
    expect(paginas.map((p) => p.slug)).not.toContain("contato");
    expect(paginas.map((p) => p.slug)).toContain("como-e-o-meu-atendimento");
    expect(new Set(paginas.map((p) => p.slug)).size).toBe(18);
  });

  it("o menu montado delas e' exatamente o de antes", () => {
    expect(montarMenu(paginas)).toEqual(NAV_GROUPS);
  });

  it("o corpo com as fotos dentro da o mesmo plano que o corpo com as fotos ao lado", () => {
    for (const bruta of PAGINAS_DINAMICAS.filter((p) => p.slug !== "contato")) {
      const chave = chaveDaPagina(bruta.slug);
      const { apoio } = ilustracaoDaPagina(bruta.slug, chave ? CONTEUDO_PADRAO[chave] : null);
      const convertida = paginas.find((p) => p.slug === bruta.slug.normalize("NFC"))!;
      expect(planejarFluxo(convertida.corpo), bruta.slug).toEqual(planejarFluxo(bruta.html, apoio));
    }
  });

  it("as fotos publicadas no painel entram no corpo, no titulo da ancora", () => {
    const foto = {
      imagem: { src: `/img/post/${"b".repeat(64)}-800x1000.webp`, largura: 800, altura: 1000, alt: "Chinelos" },
      legenda: "Chinelos palmilhados.",
    };
    const conteudo = {
      ...CONTEUDO_PADRAO,
      "pagina-palmilhas-personalizadas": {
        ...CONTEUDO_PADRAO["pagina-palmilhas-personalizadas"],
        apoio: [foto],
        ancoraDoApoio: "nossas-palmilhas-personalizadas",
      },
    };
    const palmilhas = paginasDoAcervo(conteudo).find((p) => p.slug === "palmilhas-personalizadas")!;
    const plano = planejarFluxo(palmilhas.corpo);
    const alvo = plano.secoes.find((s) => s.id === "nossas-palmilhas-personalizadas")!;
    expect(alvo.linhas[0].fotos).toEqual([
      { src: foto.imagem.src, alt: "Chinelos", legenda: "Chinelos palmilhados.", largura: 800, altura: 1000 },
    ]);
    expect(palmilhas.capa).toBe(CONTEUDO_PADRAO["pagina-palmilhas-personalizadas"].foto[0].imagem.src);
  });

  it("a capa e' a foto ao lado do titulo, com descricao e legenda", () => {
    const osteopatia = paginas.find((p) => p.slug === "osteopatia")!;
    expect(osteopatia.capa).toBe("/img/osteopatia-decubito-lateral.webp");
    expect(osteopatia.capaAlt).toMatch(/Osteopata/);
    expect(osteopatia.capaLegenda).toMatch(/Imagem ilustrativa/);
  });

  it("sem titulo no texto, a foto vai para o comeco", () => {
    expect(corpoComFotos("<p>So texto.</p>", [{ src: "/x.webp", alt: "x", legenda: "", largura: 1, altura: 1 }])).toBe(
      '<figure><img src="/x.webp" alt="x" width="1" height="1"></figure><p>So texto.</p>',
    );
  });
});

describe("Como e o meu atendimento na forma do painel", () => {
  const atendimento = paginaDoAtendimento();
  const plano = planejarFluxo(atendimento.corpo);

  it("oito etapas com titulo, e o fecho numa faixa sem titulo", () => {
    expect(plano.secoes.filter((s) => s.id)).toHaveLength(8);
    expect(plano.secoes.at(-1)!.id).toBeUndefined();
    expect(plano.abertura!.linhas[0].html).toMatch(/^<p>Nem sempre o lugar/);
  });

  it("cada foto fica no titulo da sua etapa, com a legenda", () => {
    const comFoto = plano.secoes.filter((s) => s.linhas[0].fotos.length > 0).map((s) => s.id);
    expect(comFoto).toEqual([
      "primeiro-compreender-a-sua-historia",
      "avaliacao-postural-e-biomecanica",
      "um-plano-terapeutico-construido-a-partir-da-avaliacao",
      "acompanhamento-da-evolucao",
    ]);
    expect(plano.secoes[0].linhas[0].fotos[0].legenda).toBe("A mesa do consultório, onde a consulta começa.");
  });

  it("os recursos com pagina continuam com link", () => {
    expect(atendimento.corpo).toContain('<a href="/osteopatia">Osteopatia e terapia manual.</a>');
    expect(atendimento.corpo).toContain(`<a href="${encodeURI("/neuromodulação")}">`);
    expect(atendimento.capa).toBe("/img/galeria/bancada-do-consultorio.webp");
  });
});

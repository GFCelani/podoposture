import { describe, expect, it } from "vitest";

import { camposDaPagina, ehGrupoDoMenu, mensagemAoSalvarPagina, validarPagina, type DadosDaPagina } from "./paginas-tipos";

const BOA: DadosDaPagina = {
  titulo: "Fisioterapia Pélvica",
  resumo: "",
  categoria: "Tratamentos",
  capa: "",
  capaAlt: "",
  capaLegenda: "",
  corpo: "Um texto de pagina com mais de quarenta caracteres, de verdade.",
  publicado: true,
};

describe("validacao da pagina: a do post, com grupo do menu e foto descrita", () => {
  it("pagina boa passa; fora do menu tambem", () => {
    expect(validarPagina(BOA)).toEqual({});
    expect(validarPagina({ ...BOA, categoria: "" })).toEqual({});
  });

  it("grupo que nao e' do menu e' recusado", () => {
    expect(validarPagina({ ...BOA, categoria: "Blog" }).categoria).toMatch(/grupos do menu/);
    expect(ehGrupoDoMenu("Técnicas")).toBe(true);
    expect(ehGrupoDoMenu("Tecnicas")).toBe(false);
  });

  it("titulo e corpo seguem as regras do post, com as palavras da pagina", () => {
    expect(validarPagina({ ...BOA, titulo: "" }).titulo).toBe("A página precisa de um título.");
    expect(validarPagina({ ...BOA, corpo: "" }).corpo).toBe("Escreva o texto da página antes de salvar.");
    expect(validarPagina({ ...BOA, corpo: "curto" }).corpo).toMatch(/40 caracteres/);
  });

  it("foto ao lado do titulo pede descricao; vale a enviada pelo painel e a do proprio site", () => {
    const enviada = `/img/post/${"d".repeat(64)}-800x1000.webp`;
    expect(validarPagina({ ...BOA, capa: enviada }).capaAlt).toMatch(/Descreva a foto/);
    expect(validarPagina({ ...BOA, capa: enviada, capaAlt: "Sala" })).toEqual({});
    expect(validarPagina({ ...BOA, capa: "/img/galeria/recepcao.webp", capaAlt: "Recepção" })).toEqual({});
    expect(validarPagina({ ...BOA, capa: "https://outro.site/x.jpg", capaAlt: "x" }).capa).toMatch(/Capa inválida/);
    expect(validarPagina({ ...BOA, capa: enviada, capaAlt: "x", capaLegenda: "y".repeat(121) }).capaLegenda).toMatch(/120/);
  });

  it("le o corpo cru da requisicao e diz o que mudou no site", () => {
    expect(camposDaPagina({ titulo: "  A  ", publicado: "true", capaAlt: 3 })).toMatchObject({
      titulo: "A",
      publicado: true,
      capaAlt: "",
    });
    expect(mensagemAoSalvarPagina(true, false)).toMatch(/Página publicada/);
    expect(mensagemAoSalvarPagina(false, true)).toMatch(/tirada do site/);
  });
});

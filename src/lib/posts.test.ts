import { describe, expect, it, vi } from "vitest";

// O acervo real nao interessa a regra dos temas, e o vitest nao resolve `@/`.
vi.mock("@/content/posts.json", () => ({ default: [] }));
vi.mock("@/content/rotas.json", () => ({ default: { posts: {} } }));

import { BLOG_INDEX, temasComTotal } from "./posts";

describe("temasComTotal", () => {
  it("post com varias categorias conta em todas; o do painel conta na sua", () => {
    const temas = temasComTotal([["Dor Crônica", "Postura"], ["Dor Crônica"], ["Zumbido"]]);
    expect(temas.map((t) => [t.label, t.total])).toEqual([
      ["Dor Crônica", 2],
      ["Postura", 1],
      ["Zumbido", 1],
    ]);
  });

  it("empate em volume segue a ordem alfabetica em portugues, com acento no lugar certo", () => {
    const temas = temasComTotal([["Zumbido"], ["Órtese"], ["Ansiedade"]]);
    expect(temas.map((t) => t.label)).toEqual(["Ansiedade", "Órtese", "Zumbido"]);
  });

  it("o link do tema e o filtro que o indice do blog entende", () => {
    const [tema] = temasComTotal([["Dor Crônica"]]);
    expect(tema.href).toBe(`${BLOG_INDEX}?categoria=Dor%20Cr%C3%B4nica`);
  });

  it("sem post nenhum, nenhum tema — a barra lateral some em vez de mostrar 00", () => {
    expect(temasComTotal([])).toEqual([]);
    expect(temasComTotal([[]])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { montarMenu } from "./menu";
import { agruparPorMenu, lerPedidoDeOrdem, mesmasPaginas, moverNaLista, MAXIMO_POR_GRUPO } from "./ordem-das-paginas";

/** A ordem das paginas no menu, como a aba "Paginas do site" mostra e muda. */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pagina = (n: number, titulo: string, categoria: string, ordem: number) => ({
  id: id(n),
  slug: titulo.toLowerCase().replace(/\s+/g, "-"),
  titulo,
  categoria,
  ordem,
});

describe("lista agrupada pelo menu", () => {
  const paginas = [
    pagina(1, "RPG", "Técnicas", 2),
    pagina(2, "Osteopatia", "Técnicas", 0),
    pagina(3, "Teste", "", 0),
    pagina(4, "Quem Somos", "A Clínica", 0),
    pagina(5, "Posturologia", "Técnicas", 1),
    pagina(6, "Antiga", "Grupo que nao existe", 0),
    pagina(7, "Baropodometria", "Avaliação", 0),
  ];

  it("grupos na ordem do cabecalho, paginas na posicao de cada uma, fora do menu no fim", () => {
    const grupos = agruparPorMenu(paginas);
    expect(grupos.map((g) => g.grupo)).toEqual(["Técnicas", "Avaliação", "A Clínica", null]);
    expect(grupos[0].paginas.map((p) => p.titulo)).toEqual(["Osteopatia", "Posturologia", "RPG"]);
  });

  it("categoria que nao e' grupo do menu cai em fora do menu: nenhuma pagina some", () => {
    const fora = agruparPorMenu(paginas).at(-1)!;
    expect(fora.paginas.map((p) => p.titulo)).toEqual(["Antiga", "Teste"]);
    expect(agruparPorMenu(paginas).flatMap((g) => g.paginas)).toHaveLength(paginas.length);
  });

  it("a ordem da lista e' a ordem do menu do site (mesmo desempate)", () => {
    const empatadas = [pagina(1, "Zeta", "Técnicas", 0), pagina(2, "Alfa", "Técnicas", 0)];
    const daLista = agruparPorMenu(empatadas)[0].paginas.map((p) => `/${p.slug}`);
    const doMenu = montarMenu(empatadas)[0].items.map((i) => i.href);
    expect(daLista).toEqual(doMenu);
  });
});

describe("mover uma casa", () => {
  const ids = ["a", "b", "c"];

  it("sobe e desce trocando com a vizinha", () => {
    expect(moverNaLista(ids, "b", -1)).toEqual(["b", "a", "c"]);
    expect(moverNaLista(ids, "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("nas pontas, ou com id de fora, nao ha movimento", () => {
    expect(moverNaLista(ids, "a", -1)).toBeNull();
    expect(moverNaLista(ids, "c", 1)).toBeNull();
    expect(moverNaLista(ids, "x", 1)).toBeNull();
  });

  it("nao mexe na lista recebida", () => {
    moverNaLista(ids, "b", -1);
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

describe("pedido de nova ordem", () => {
  it("aceita grupo do menu e ids validos, sem repeticao; normaliza para minusculas", () => {
    expect(lerPedidoDeOrdem({ grupo: "Técnicas", ids: [id(1), id(2).toUpperCase()] })).toEqual({
      grupo: "Técnicas",
      ids: [id(1), id(2)],
    });
  });

  it("recusa o que nao e' isso", () => {
    const recusados: unknown[] = [
      null,
      [],
      "x",
      { grupo: "Técnicas" },
      { grupo: "Técnicas", ids: [] },
      { grupo: "Técnicas", ids: "x" },
      { grupo: "", ids: [id(1)] },
      { grupo: "Blog", ids: [id(1)] },
      { grupo: "Técnicas", ids: ["nao-e-uuid"] },
      { grupo: "Técnicas", ids: [id(1), 3] },
      { grupo: "Técnicas", ids: [id(1), id(1).toUpperCase()] },
      { grupo: "Técnicas", ids: Array.from({ length: MAXIMO_POR_GRUPO + 1 }, (_, i) => id(i)) },
    ];
    for (const bruto of recusados) expect(lerPedidoDeOrdem(bruto), JSON.stringify(bruto)?.slice(0, 80)).toBeNull();
  });

  it("a lista enviada so vale se e' exatamente a do grupo agora", () => {
    expect(mesmasPaginas(["a", "b"], ["b", "a"])).toBe(true);
    expect(mesmasPaginas(["a"], ["a", "b"])).toBe(false);
    expect(mesmasPaginas(["a", "c"], ["a", "b"])).toBe(false);
  });
});

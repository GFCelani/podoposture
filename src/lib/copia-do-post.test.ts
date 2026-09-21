import { describe, expect, it } from "vitest";

import { chaveDaCopia, decidirCopia, escreverCopia, lerCopia } from "./copia-do-post";
import type { DadosDoPost } from "./painel-tipos";

const SALVO: DadosDoPost = {
  titulo: "Dor lombar no fim do dia",
  resumo: "",
  categoria: "Dor Crônica",
  capa: "",
  corpo: "Um texto com mais de quarenta caracteres, para passar do minimo.",
  publicado: true,
};
const EDITADO: DadosDoPost = { ...SALVO, titulo: "Título que ela cancelou" };
const VERSAO = "2026-09-01T12:00:00.000Z";

describe("copia do texto no navegador", () => {
  it("uma chave por texto, e uma para o texto novo", () => {
    expect(chaveDaCopia("abc")).toBe("podoposture_rascunho:abc");
    expect(chaveDaCopia(null)).toBe("podoposture_rascunho:novo");
  });

  it("guarda a versao do servidor de quando nasceu, e le de volta", () => {
    const texto = escreverCopia(EDITADO, VERSAO, new Date("2026-09-02T10:00:00Z"));
    expect(lerCopia(texto)).toEqual({ dados: EDITADO, base: VERSAO, guardadaEm: "2026-09-02T10:00:00.000Z" });
  });

  it("copia antiga, so com os campos, ainda e lida, sem a marca de versao", () => {
    expect(lerCopia(JSON.stringify(EDITADO))).toEqual({ dados: EDITADO, base: undefined, guardadaEm: null });
  });

  it("formato torto vira null", () => {
    expect(lerCopia(null)).toBeNull();
    expect(lerCopia("{nao e json")).toBeNull();
    expect(lerCopia(JSON.stringify({ dados: { titulo: 1 } }))).toBeNull();
    expect(lerCopia(JSON.stringify([1, 2]))).toBeNull();
  });
});

describe("decidirCopia", () => {
  it("copia igual ao servidor nao faz nada", () => {
    expect(decidirCopia(lerCopia(escreverCopia(SALVO, VERSAO)), SALVO, VERSAO)).toEqual({ tipo: "nenhuma" });
    expect(decidirCopia(null, SALVO, VERSAO)).toEqual({ tipo: "nenhuma" });
  });

  it("nascida da versao que o servidor ainda tem: recupera sozinha", () => {
    expect(decidirCopia(lerCopia(escreverCopia(EDITADO, VERSAO)), SALVO, VERSAO).tipo).toBe("aplicar");
    // texto novo, que ainda nao existe no servidor
    expect(decidirCopia(lerCopia(escreverCopia(EDITADO, null)), { ...SALVO, titulo: "" }, null).tipo).toBe("aplicar");
  });

  it("o texto foi salvo depois da copia, em outro aparelho: pergunta em vez de passar por cima", () => {
    const copia = lerCopia(escreverCopia(EDITADO, VERSAO));
    expect(decidirCopia(copia, { ...SALVO, corpo: `${SALVO.corpo} Correção feita no celular.` }, "2026-09-05T08:00:00.000Z").tipo).toBe(
      "perguntar",
    );
  });

  it("copia antiga de um texto ja salvo nao tem como provar a versao: pergunta", () => {
    expect(decidirCopia(lerCopia(JSON.stringify(EDITADO)), SALVO, VERSAO).tipo).toBe("perguntar");
    expect(decidirCopia(lerCopia(JSON.stringify(EDITADO)), { ...SALVO, titulo: "" }, null).tipo).toBe("aplicar");
  });
});

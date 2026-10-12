import { describe, expect, it } from "vitest";

import { planejarFluxo } from "./fluxo";
import type { Foto } from "./ilustracao-da-pagina";

const img = (n: number) => `<img src="/img/post/${String(n).repeat(64).slice(0, 64)}-800x1000.webp" alt="foto ${n}" width="800" height="1000">`;
const foto = (n: number, secao?: string): Foto => ({
  src: `/f${n}.webp`,
  alt: `apoio ${n}`,
  legenda: `legenda ${n}`,
  largura: 800,
  altura: 1000,
  ...(secao ? { secao } : {}),
});

describe("plano do corpo em fluxo", () => {
  const html = [
    "<p>Abertura.</p>",
    "<h2>Primeira</h2>",
    `<p>${img(1)}</p>`,
    "<p>Paragrafo a.</p>",
    "<p>Paragrafo b.</p>",
    `<p>${img(2)}</p>`,
    `<p>${img(3)}</p>`,
    "<p>Paragrafo c.</p>",
    "<h2>Segunda</h2>",
    "<p>So texto.</p>",
  ].join("");

  it("imagem depois do titulo fica no titulo; depois do paragrafo, no paragrafo", () => {
    const plano = planejarFluxo(html);
    const [primeira] = plano.secoes;
    expect(primeira.linhas).toHaveLength(2);
    expect(primeira.linhas[0].comTitulo).toBe(true);
    expect(primeira.linhas[0].fotos.map((f) => f.alt)).toEqual(["foto 1"]);
    expect(primeira.linhas[0].html).toBe("<p>Paragrafo a.</p>");
    // duas imagens seguidas: as duas presas ao paragrafo b, empilhadas
    expect(primeira.linhas[1].html).toBe("<p>Paragrafo b.</p><p>Paragrafo c.</p>");
    expect(primeira.linhas[1].fotos.map((f) => f.alt)).toEqual(["foto 2", "foto 3"]);
  });

  it("nenhuma imagem sobra no texto", () => {
    const plano = planejarFluxo(html);
    const textos = [plano.abertura!, ...plano.secoes].flatMap((t) => t.linhas.map((l) => l.html));
    expect(textos.join("")).not.toMatch(/<img/);
    expect(plano.secoes[1].linhas).toEqual([{ html: "<p>So texto.</p>", comTitulo: true, fotos: [] }]);
  });

  it("imagem antes de qualquer texto espera o primeiro bloco; sem texto, fica sozinha", () => {
    const antes = planejarFluxo(`<p>${img(4)}</p><p>Depois.</p>`);
    expect(antes.abertura!.linhas).toEqual([
      { html: "<p>Depois.</p>", comTitulo: false, fotos: [expect.objectContaining({ alt: "foto 4" })] },
    ]);
    const so = planejarFluxo(`<p>${img(5)}</p>`);
    expect(so.abertura!.linhas).toEqual([{ html: "", comTitulo: false, fotos: [expect.objectContaining({ alt: "foto 5" })] }]);
  });

  it("imagem no meio de um paragrafo sai dele e fica ao lado dele", () => {
    const plano = planejarFluxo(`<p>Antes ${img(6)}<br>depois.</p>`);
    expect(plano.abertura!.linhas[0].html).toBe("<p>Antes <br>depois.</p>");
    expect(plano.abertura!.linhas[0].fotos).toHaveLength(1);
  });

  it("fotos do painel vao para o titulo da ancora, ou da primeira secao", () => {
    const ancorada = planejarFluxo(html, [foto(1, "segunda"), foto(2)]);
    expect(ancorada.secoes[1].linhas[0].fotos.map((f) => f.alt)).toEqual(["apoio 1", "apoio 2"]);
    expect(ancorada.secoes[1].linhas[0].fotos[0]).not.toHaveProperty("secao");
    const solta = planejarFluxo(html, [foto(1, "nao-existe")]);
    expect(solta.secoes[0].linhas[0].fotos.map((f) => f.alt)).toEqual(["foto 1", "apoio 1"]);
    const semSecao = planejarFluxo("<p>Texto.</p>", [foto(1)]);
    expect(semSecao.abertura!.linhas[0].fotos.map((f) => f.alt)).toEqual(["apoio 1"]);
  });

  it("legenda vem do figcaption ou do title da imagem", () => {
    const plano = planejarFluxo(
      `<p>Texto.</p><figure>${img(7)}<figcaption>Uma legenda</figcaption></figure>` +
        `<p>${img(8).replace(">", ' title="Outra legenda">')}</p>`,
    );
    expect(plano.abertura!.linhas[0].fotos.map((f) => f.legenda)).toEqual(["Uma legenda", "Outra legenda"]);
  });
});

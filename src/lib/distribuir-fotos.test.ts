import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { alturaDaColuna, alturaDoTexto, distribuirFotos, TOLERANCIA } from "./distribuir-fotos";
import { planejarFluxo } from "./fluxo";
import { importarMarkdown } from "./importar-arquivo";
import { markdownParaHtml } from "./markdown";

const foto = (n: number, legenda = "") =>
  `<figure><img src="/img/f${n}.webp" alt="f${n}" width="960" height="1200">${legenda ? `<figcaption>${legenda}</figcaption>` : ""}</figure>`;
const p = (palavras: number) => `<p>${Array.from({ length: palavras }, () => "palavra").join(" ")}</p>`;

const resumo = (html: string) => {
  const r = distribuirFotos(planejarFluxo(html));
  return { ...r, todas: [...r.abertura, ...r.secoes.flat()] };
};

describe("distribuirFotos", () => {
  it("sem imagem, nada muda", () => {
    const { todas, excesso } = resumo(`<h2>A</h2>${p(40)}<h2>B</h2>${p(40)}`);
    expect(todas.every((l) => l.fotos.length === 0)).toBe(true);
    expect(excesso).toBe(false);
  });

  it("imagem que cabe fica ao lado do texto dela, inteira", () => {
    const { secoes } = resumo(`<h2>A</h2>${p(30)}${foto(1)}${p(200)}<h2>B</h2>${p(40)}`);
    const com = secoes[0].find((l) => l.fotos.length > 0)!;
    expect(com.fotos.map((f) => f.src)).toEqual(["/img/f1.webp"]);
    expect(com.arranjo).toBe("pilha");
    expect(com.escala).toBe(1);
  });

  it("as que sobram descem para a secao seguinte sem imagem", () => {
    const { secoes } = resumo(`<h2>A</h2>${p(170)}${foto(1)}${foto(2)}<h2>B</h2>${p(250)}`);
    expect(secoes[0].flatMap((l) => l.fotos.map((f) => f.src))).toEqual(["/img/f1.webp"]);
    expect(secoes[1].flatMap((l) => l.fotos.map((f) => f.src))).toEqual(["/img/f2.webp"]);
  });

  it("sem linha que receba, grade de duas e depois reduz", () => {
    const { secoes } = resumo(`<h2>A</h2>${p(170)}${foto(1)}${foto(2)}${foto(3)}<h2>B</h2>`);
    const com = secoes[0].find((l) => l.fotos.length > 0)!;
    expect(com.fotos).toHaveLength(3);
    expect(com.arranjo).toBe("par");
  });

  it("mais imagens do que o texto comporta: acusa o excesso", () => {
    const { excesso } = resumo(`<h2>A</h2>${p(5)}${foto(1)}${foto(2)}${foto(3)}${foto(4)}${foto(5)}${foto(6)}<h2>B</h2>`);
    expect(excesso).toBe(true);
  });

  it("a pagina de exemplo: titulo sem corpo, paragrafo curto com quatro fotos e secao sem imagem", () => {
    const arquivo = readFileSync(join(__dirname, "importar-exemplos", "pagina-nova-de-teste.md"), "utf8");
    const html = markdownParaHtml(importarMarkdown(arquivo).corpo);
    const plano = planejarFluxo(html);
    const r = distribuirFotos(plano);
    const todas = [...r.abertura, ...r.secoes.flat()];
    expect(todas.flatMap((l) => l.fotos)).toHaveLength(4);
    expect(r.excesso).toBe(false);
    plano.secoes.forEach((s, i) =>
      r.secoes[i].forEach((l) => {
        if (l.fotos.length === 0) return;
        const texto = alturaDoTexto(l.html, l.comTitulo ? (s.tituloHtml ?? "") : undefined);
        expect(alturaDaColuna(l.fotos, l.arranjo, l.escala)).toBeLessThanOrEqual(texto + TOLERANCIA);
      }),
    );
  });
});

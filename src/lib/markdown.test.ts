import { describe, expect, it } from "vitest";

import { markdownParaHtml, markdownParaTexto, resumoAutomatico } from "./markdown";

/**
 * O corpo do post e injetado com `dangerouslySetInnerHTML` e nao passa por
 * nenhum sanitizador em runtime. Quem sustenta essa escolha e o `html: false`
 * do markdown-it. Se alguem trocar essa configuracao, estes casos caem — e e
 * exatamente para isso que eles existem.
 */
const ATAQUES = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`,
  `<svg onload=alert(1)>`,
  `<iframe src="https://exemplo.invalido"></iframe>`,
  `<object data="x"></object>`,
  `<embed src="x">`,
  `<form action="https://exemplo.invalido"><input name=senha></form>`,
  `<base href="https://exemplo.invalido/">`,
  `<meta http-equiv="refresh" content="0;url=https://exemplo.invalido">`,
  `<link rel="stylesheet" href="https://exemplo.invalido/x.css">`,
  `<style>body{display:none}</style>`,
  `<a href="javascript:alert(1)">clique</a>`,
  `[clique](javascript:alert(1))`,
  `[clique](vbscript:msgbox(1))`,
  `[clique](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)`,
  `<div onclick="alert(1)">x</div>`,
  `<!-- <script>alert(1)</script> -->`,
  `<textarea></textarea><script>alert(1)</script>`,
  `<math><mtext><script>alert(1)</script></mtext></math>`,
  `<body onload=alert(1)>`,
];

describe("markdownParaHtml nao produz marcacao perigosa", () => {
  it.each(ATAQUES)("neutraliza: %s", (ataque) => {
    const html = markdownParaHtml(ataque);

    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<object/i);
    expect(html).not.toMatch(/<embed/i);
    expect(html).not.toMatch(/<form/i);
    expect(html).not.toMatch(/<base/i);
    expect(html).not.toMatch(/<meta/i);
    expect(html).not.toMatch(/<link/i);
    expect(html).not.toMatch(/<style/i);
    // Nenhum atributo de evento DENTRO de uma tag de verdade. A ancora `<[a-z]`
    // com `[^>]*` importa: o payload escapado vira texto ("&lt;img onerror=…"),
    // e uma regex solta acusaria isso como vulnerabilidade quando e justamente
    // a prova de que a defesa funcionou.
    expect(html).not.toMatch(/<[a-z][^>]*\son[a-z]+\s*=/i);
    // Nenhuma URL executavel num atributo de verdade
    expect(html).not.toMatch(/<[a-z][^>]*\b(href|src)\s*=\s*["']?\s*(javascript|vbscript|data):/i);
    // E o payload tem de ter saido escapado, nao renderizado
    expect(html).not.toContain("<script");
  });
});

describe("o que o Markdown deve produzir", () => {
  it("converte a formatacao normal", () => {
    const html = markdownParaHtml("## Título\n\nTexto com **negrito** e _itálico_.\n\n- um\n- dois");
    expect(html).toContain("<h2>Título</h2>");
    expect(html).toContain("<strong>negrito</strong>");
    expect(html).toContain("<em>itálico</em>");
    expect(html).toContain("<li>um</li>");
  });

  it("link externo abre em nova aba sem entregar a origem", () => {
    const html = markdownParaHtml("[estudo](https://exemplo.invalido/artigo)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("link interno nao ganha target", () => {
    const html = markdownParaHtml("[contato](/contato)");
    expect(html).toContain('href="/contato"');
    expect(html).not.toContain("target=");
  });
});

describe("imagem", () => {
  const nome = `${"a".repeat(64)}-1200x800.webp`;

  it("emite width e height a partir do nome do arquivo — e o que mantem o CLS em zero", () => {
    const html = markdownParaHtml(`![Pé em avaliação](/img/post/${nome})`);
    expect(html).toContain(`src="/img/post/${nome}"`);
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="800"');
    expect(html).toContain('alt="Pé em avaliação"');
    expect(html).toContain('loading="lazy"');
  });

  it("aceita o JPEG que o Safari envia no lugar do WebP", () => {
    const jpg = `${"b".repeat(64)}-1600x1067.jpg`;
    const html = markdownParaHtml(`![Consultório](/img/post/${jpg})`);
    expect(html).toContain(`src="/img/post/${jpg}"`);
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="1067"');
  });

  it.each([
    ["externa", "https://terceiro.invalido/pixel.gif"],
    ["externa sem esquema", "//terceiro.invalido/pixel.gif"],
    ["local fora da pasta", "/img/blog/01.webp"],
    ["nome sem medida", "/img/post/qualquer.webp"],
    ["tentativa de subir de pasta", "/img/post/../../etc/senha"],
  ])("nao vira imagem: %s", (_caso, src) => {
    const html = markdownParaHtml(`![texto alternativo](${src})`);
    expect(html).not.toContain("<img");
    expect(html).toContain("texto alternativo");
  });

  it("escapa o texto alternativo quando recusa a imagem", () => {
    const html = markdownParaHtml(`![<script>alert(1)</script>](https://terceiro.invalido/x.gif)`);
    expect(html).not.toMatch(/<script/i);
  });
});

describe("resumoAutomatico", () => {
  it("devolve o texto inteiro quando cabe", () => {
    expect(resumoAutomatico("Texto curto.")).toBe("Texto curto.");
  });

  it("corta na fronteira de palavra", () => {
    const longo = "palavra ".repeat(60).trim();
    const r = resumoAutomatico(longo, 100);
    expect(r.length).toBeLessThanOrEqual(101);
    expect(r.endsWith("…")).toBe(true);
    expect(r).not.toMatch(/pala…$/);
  });

  it("nao carrega marcacao", () => {
    expect(resumoAutomatico("## Título\n\nCorpo do texto.")).not.toContain("<");
  });

  it("mantem os sinais que o HTML escapa: aspas, &, < e >", () => {
    expect(resumoAutomatico('O "efeito rebote" & a dor < 3 meses > 1 semana')).toBe(
      'O "efeito rebote" & a dor < 3 meses > 1 semana',
    );
    expect(markdownParaTexto("Dor <script>alert(1)</script> lombar")).toBe("Dor <script>alert(1)</script> lombar");
  });
});

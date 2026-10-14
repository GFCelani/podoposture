import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { planejarFluxo } from "./fluxo";
import { conferirArquivo, importarArquivo, lerTextoDoArquivo } from "./importar-arquivo";
import { markdownParaHtml } from "./markdown";

/**
 * O mapeamento do arquivo importado, com os exemplos de importar-exemplos/:
 * um post em Markdown, uma pagina em Markdown com frontmatter e a mesma
 * pagina em HTML. O resultado e' o que o editor recebe como rascunho.
 */
const exemplo = (nome: string) => readFileSync(join(__dirname, "importar-exemplos", nome), "utf8");

describe("importar arquivo: post em Markdown", () => {
  const r = importarArquivo("post-exemplo.md", exemplo("post-exemplo.md"));

  it("o primeiro h1 vira o titulo e sai do corpo", () => {
    expect(r.titulo).toBe("Dor no ombro ao acordar");
    expect(r.corpo).not.toMatch(/^# /m);
  });

  it("o paragrafo curto logo depois do titulo vira o subtitulo", () => {
    expect(r.resumo).toBe("Por que ela aparece pela manhã e melhora ao longo do dia?");
    expect(r.corpo).not.toContain("Por que ela aparece");
    expect(r.corpo.startsWith("Muita gente sente")).toBe(true);
  });

  it("secoes, citacao, lista, link e negrito passam intactos", () => {
    const html = markdownParaHtml(r.corpo);
    expect(html).toContain("<h2>O que acontece durante a noite</h2>");
    expect(html).toContain("<h3>Quando procurar avaliação</h3>");
    expect(html).toMatch(/<blockquote>\s*<p>Rigidez pela manhã/);
    expect((html.match(/<li>/g) ?? []).length).toBe(3);
    expect(decodeURI(html)).toContain('<a href="/dor-lombar-crônica">dor lombar crônica</a>');
    expect(html).toContain("<strong>não é só a posição</strong>");
  });

  it("imagem da internet fica com aviso; imagem de arquivo local sai com aviso, sem erro", () => {
    expect(r.corpo).toContain("![Ombro em avaliação](https://exemplo.com/ombro.jpg)");
    expect(r.corpo).not.toContain("fotos/ombro-2.jpg");
    expect(r.avisos.some((a) => a.includes("outro site") && a.includes("exemplo.com/ombro.jpg"))).toBe(true);
    expect(r.avisos.some((a) => a.includes("não existe no site") && a.includes("fotos/ombro-2.jpg"))).toBe(true);
    // e a pagina nao busca a imagem de fora: mostra a descricao
    expect(markdownParaHtml(r.corpo)).not.toContain("exemplo.com/ombro.jpg");
  });
});

describe("importar arquivo: pagina em Markdown, com frontmatter", () => {
  const r = importarArquivo("pagina-exemplo.md", exemplo("pagina-exemplo.md"));

  it("title e description do frontmatter vencem; o h1 sai do corpo", () => {
    expect(r.titulo).toBe("Fisioterapia Pélvica");
    expect(r.resumo).toBe("Avaliação e tratamento das disfunções do assoalho pélvico.");
    expect(r.corpo).not.toMatch(/^# /m);
    expect(r.corpo).not.toContain("title:");
    expect(r.avisos).toEqual([]);
  });

  it("na pagina, a foto do site fica na coluna da direita, ao lado do bloco em que foi inserida", () => {
    const plano = planejarFluxo(markdownParaHtml(r.corpo));
    const secao = plano.secoes.find((s) => s.id === "para-quem-e-indicado")!;
    const linhaComFoto = secao.linhas.find((l) => l.fotos.length > 0)!;
    expect(linhaComFoto.fotos[0]).toMatchObject({ src: "/img/galeria/recepcao.webp", legenda: "A recepção da clínica." });
    expect(linhaComFoto.html).toMatch(/<ol>/);
    const comoFunciona = plano.secoes.find((s) => s.id === "como-funciona")!;
    expect(comoFunciona.linhas[0].html).toMatch(/<blockquote>/);
  });
});

describe("importar arquivo: pagina em HTML", () => {
  const r = importarArquivo("pagina-exemplo.html", exemplo("pagina-exemplo.html"));

  it("o mesmo mapeamento: h1 titulo, primeiro paragrafo subtitulo, secoes e citacao", () => {
    expect(r.titulo).toBe("Fisioterapia Pélvica");
    expect(r.resumo).toBe("Avaliação e tratamento das disfunções do assoalho pélvico.");
    expect(r.corpo).toMatch(/^## Para quem é indicado/m);
    expect(r.corpo).toContain("**músculos**");
    expect(r.corpo).toMatch(/^> Cada plano é individual\./m);
  });

  it("script e estilo nao entram; a imagem de fora sai com aviso", () => {
    expect(r.corpo).not.toMatch(/alert|font:/);
    expect(r.avisos[0]).toMatch(/Uma imagem do arquivo saiu/);
  });
});

describe("conferencia do arquivo antes de ler", () => {
  it("so .md e .html, ate 256 KB, nao vazio", () => {
    expect(conferirArquivo("texto.md", 10)).toBeNull();
    expect(conferirArquivo("TEXTO.MARKDOWN", 10)).toBeNull();
    expect(conferirArquivo("pagina.html", 10)).toBeNull();
    expect(conferirArquivo("texto.docx", 10)?.erro).toMatch(/\.md/);
    expect(conferirArquivo("texto.md.exe", 10)?.erro).toMatch(/\.md/);
    expect(conferirArquivo("texto.md", 300 * 1024)?.erro).toMatch(/256 KB/);
    expect(conferirArquivo("texto.md", 0)?.erro).toMatch(/vazio/);
  });

  it("sem titulo, avisa; HTML no meio do Markdown, avisa", () => {
    const r = importarArquivo("x.md", "Um texto sem titulo.\n\n<div>bloco</div>");
    expect(r.titulo).toBe("");
    expect(r.avisos.some((a) => a.includes("não tem título"))).toBe(true);
    expect(r.avisos.some((a) => a.includes("trechos em HTML"))).toBe(true);
    expect(markdownParaHtml(r.corpo)).not.toContain("<div>");
  });
});

describe("leitura dos bytes do arquivo", () => {
  const bytes = (...b: number[]) => new Uint8Array(b).buffer;

  it("UTF-8, com ou sem BOM, sai igual", () => {
    const texto = "# Ação e reação\n\nCoração.";
    const utf8 = new TextEncoder().encode(texto);
    expect(lerTextoDoArquivo(utf8.buffer)).toBe(texto);
    expect(lerTextoDoArquivo(bytes(0xef, 0xbb, 0xbf, ...utf8))).toBe(texto);
  });

  it("arquivo salvo como ANSI no Windows (Bloco de Notas antigo, Word) nao vira losango", () => {
    // "Ação ç" em Windows-1252: A, 0xE7, 0xE3, o, espaco, 0xE7
    expect(lerTextoDoArquivo(bytes(0x41, 0xe7, 0xe3, 0x6f, 0x20, 0xe7))).toBe("Ação ç");
    // aspas curvas do Word em Windows-1252
    expect(lerTextoDoArquivo(bytes(0x93, 0x6f, 0x69, 0x94))).toBe("“oi”");
  });

  it("UTF-16 com BOM (Salvar como Unicode no Windows)", () => {
    const le = [0xff, 0xfe, 0x23, 0x00, 0x20, 0x00, 0xe9, 0x00];
    expect(lerTextoDoArquivo(bytes(...le))).toBe("# é");
    const be = [0xfe, 0xff, 0x00, 0x23, 0x00, 0x20, 0x00, 0xe9];
    expect(lerTextoDoArquivo(bytes(...be))).toBe("# é");
  });
});

describe("importar arquivo: Markdown de outros editores", () => {
  it("frontmatter em bloco (> e |) vira uma linha so; quebra do Windows nao atrapalha", () => {
    const r = importarArquivo(
      "x.md",
      "---\r\ntitle: 'Dor no joelho'\r\ndescription: >-\r\n  Uma frase\r\n  em duas linhas.\r\ntags:\r\n  - joelho\r\n---\r\n\r\nTexto do corpo.\r\n",
    );
    expect(r.titulo).toBe("Dor no joelho");
    expect(r.resumo).toBe("Uma frase em duas linhas.");
    expect(r.corpo).toBe("Texto do corpo.");
    const literal = importarArquivo("x.md", "---\ntitle: X\nsubtitle: |\n  linha um\n  linha dois\n---\nCorpo.");
    expect(literal.resumo).toBe("linha um linha dois");
  });

  it("comentario HTML some, sem o aviso de HTML", () => {
    const r = importarArquivo("x.md", "# Titulo\n\n<!-- nota interna -->\nTexto.\n\n<!--\nvarias\nlinhas\n-->\n\nFim.");
    expect(r.corpo).not.toContain("nota interna");
    expect(r.corpo).not.toContain("varias");
    expect(r.avisos.some((a) => a.includes("HTML"))).toBe(false);
  });

  it("link e imagem do Obsidian: o link vira texto, a imagem sai com aviso", () => {
    const r = importarArquivo(
      "x.md",
      "---\ndescription: D\n---\n# T\n\nVeja [[Dor lombar|a dor lombar]] e [[Osteopatia#Como e]].\n\n![[foto do joelho.png]]\n\nFim.",
    );
    expect(r.corpo).toContain("Veja a dor lombar e Osteopatia.");
    expect(r.corpo).not.toContain("[[");
    expect(r.avisos.some((a) => a.includes("foto do joelho.png"))).toBe(true);
  });

  it("# dentro de bloco de codigo nao vira secao", () => {
    const r = importarArquivo("x.md", "# T\n\nTexto.\n\n```\n# comentario\n\nnpm install\n```\n\n# Outra parte\n\nFim.");
    expect(r.corpo).toContain("```\n# comentario\n\nnpm install\n```");
    expect(r.corpo).toContain("## Outra parte");
  });
});

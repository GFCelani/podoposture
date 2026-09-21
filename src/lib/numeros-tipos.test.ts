import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import posts from "../content/posts.json";
import rotas from "../content/rotas.json";
import {
  agruparOrigens,
  comparacaoEmPalavras,
  diaCurto,
  diaValido,
  formatarNumero,
  intervalosDoPeriodo,
  janelaDaColeta,
  lerPeriodo,
  limitarPorDia,
  mediasAntesEDepois,
  mesesSemBuraco,
  nomeDaOrigem,
  PREFIXO_DOS_TEXTOS,
  quandoFoi,
  slugDoEndereco,
  textosPeloTitulo,
  tituloDoTexto,
  type Catalogo,
  type LinhaDoDia,
} from "./numeros-tipos";

/**
 * O catalogo montado do mesmo jeito que a rota do painel monta, direto dos
 * JSON: `posts.ts` usa o apelido `@/`, que o vitest deste projeto nao resolve.
 */
const CATALOGO: Catalogo = {
  titulos: new Map((posts as { slug: string; titulo: string }[]).map((p) => [p.slug.normalize("NFC"), p.titulo])),
  asciiParaReal: new Map(
    Object.entries(rotas.posts as Record<string, string>).map(([real, ascii]) => [ascii, real]),
  ),
};

const ZUMBIDO_REAL = "o-melhor-tratamento-para-zumbido-não-é-uma-técnica";
const ZUMBIDO_ASCII = "o-melhor-tratamento-para-zumbido-nao-e-uma-tecnica";
const ZUMBIDO_TITULO = "O melhor tratamento para zumbido não é uma técnica.";

function linha(parcial: Partial<LinhaDoDia>): LinhaDoDia {
  return {
    fonte: "vercel",
    dia: "2026-09-01",
    dimensao: "total",
    chave: "",
    visitas: 0,
    pessoas: 0,
    cliques: 0,
    aparicoes: 0,
    posicao: null,
    ...parcial,
  };
}

describe("periodo", () => {
  it("aceita so a lista fechada, com 30 dias quando nada vem", () => {
    expect(lerPeriodo(null)).toBe(30);
    expect(lerPeriodo("")).toBe(30);
    expect(lerPeriodo("7")).toBe(7);
    expect(lerPeriodo("365")).toBe(365);
    for (const invalido of ["31", "07", "7.0", "-7", "abc", "365 "]) expect(lerPeriodo(invalido)).toBeNull();
  });

  it("diaValido recusa data que nao existe", () => {
    expect(diaValido("2026-02-28")).toBe(true);
    expect(diaValido("2026-02-30")).toBe(false);
    expect(diaValido("2026-9-01")).toBe(false);
  });
});

describe("janelaDaColeta", () => {
  const AGORA = new Date("2026-09-11T09:00:00Z");

  it("de noite refaz os ultimos 5 dias; o Google para em D-2", () => {
    expect(janelaDaColeta(AGORA, null)).toEqual({
      vercel: { inicio: "2026-09-06", fim: "2026-09-10" },
      busca: { inicio: "2026-09-06", fim: "2026-09-09" },
      proximoDesde: null,
      historico: false,
      ajustadoAoTeto: false,
    });
  });

  it("o historico vem em lotes de 14 dias e diz onde o proximo comeca", () => {
    const janela = janelaDaColeta(AGORA, "2026-01-01");
    expect(janela).toMatchObject({
      vercel: { inicio: "2026-01-01", fim: "2026-01-14" },
      busca: { inicio: "2026-01-01", fim: "2026-01-14" },
      proximoDesde: "2026-01-15",
      historico: true,
    });
  });

  it("o ultimo lote para em ontem e nao aponta proximo", () => {
    expect(janelaDaColeta(AGORA, "2026-09-01")).toMatchObject({
      vercel: { inicio: "2026-09-01", fim: "2026-09-10" },
      busca: { inicio: "2026-09-01", fim: "2026-09-09" },
      proximoDesde: null,
    });
    // so ontem: o Google ainda nao tem esse dia final
    expect(janelaDaColeta(AGORA, "2026-09-10")).toMatchObject({ busca: null, proximoDesde: null });
  });

  it("pedido alem de 16 meses e trazido para o teto", () => {
    expect(janelaDaColeta(AGORA, "2020-01-01")).toMatchObject({
      vercel: { inicio: "2025-05-11" },
      ajustadoAoTeto: true,
    });
  });

  it("recusa data invalida e data que nao e passada", () => {
    expect(janelaDaColeta(AGORA, "2026-02-30")).toHaveProperty("erro");
    expect(janelaDaColeta(AGORA, "11/09/2026")).toHaveProperty("erro");
    expect(janelaDaColeta(AGORA, "2026-09-11")).toHaveProperty("erro");
  });
});

describe("limitarPorDia", () => {
  it("chave repetida vira uma linha so, a ultima", () => {
    const podadas = limitarPorDia([linha({ visitas: 1 }), linha({ visitas: 9 })]);
    expect(podadas).toHaveLength(1);
    expect(podadas[0].visitas).toBe(9);
  });

  it("corta a cauda de cada dimensao por dia, e nunca o total", () => {
    const rotas = Array.from({ length: 5 }, (_, i) =>
      linha({ dimensao: "rota", chave: `/p${i}`, pessoas: i }),
    );
    const outroDia = linha({ dia: "2026-09-02", dimensao: "rota", chave: "/p0", pessoas: 1 });
    const podadas = limitarPorDia([linha({ pessoas: 3 }), ...rotas, outroDia], 2);
    expect(podadas.filter((l) => l.dimensao === "total")).toHaveLength(1);
    expect(podadas.filter((l) => l.dia === "2026-09-01" && l.dimensao === "rota").map((l) => l.chave)).toEqual([
      "/p4",
      "/p3",
    ]);
    expect(podadas).toContainEqual(outroDia);
  });
});

describe("origem", () => {
  it.each([
    ["www.google.com.br", "Busca do Google"],
    ["google.com", "Busca do Google"],
    ["com.google.android.googlequicksearchbox", "Busca do Google"],
    ["gemini.google.com", "Assistentes de IA (ChatGPT e parecidos)"],
    ["chatgpt.com", "Assistentes de IA (ChatGPT e parecidos)"],
    ["l.instagram.com", "Instagram"],
    ["m.facebook.com", "Facebook"],
    ["lm.facebook.com", "Facebook"],
    ["web.whatsapp.com", "WhatsApp"],
    ["www.bing.com", "Outras buscas (Bing e parecidos)"],
    ["podoposture.com.br", "O próprio site"],
    ["", "Digitou o endereço"],
    ["mail.google.com", "mail.google.com"],
    ["exemplo.com.br:443", "exemplo.com.br"],
  ])("%s -> %s", (host, nome) => {
    expect(nomeDaOrigem(host)).toBe(nome);
  });

  it("sem referencia e digitou o endereco", () => {
    expect(nomeDaOrigem(null)).toBe("Digitou o endereço");
    expect(nomeDaOrigem(undefined)).toBe("Digitou o endereço");
  });

  it("agrupa os varios dominios do mesmo lugar e ordena por pessoas", () => {
    expect(
      agruparOrigens([
        { chave: "www.google.com.br", visitas: 10, pessoas: 8 },
        { chave: "l.instagram.com", visitas: 12, pessoas: 9 },
        { chave: "google.com", visitas: 4, pessoas: 3 },
        { chave: "", visitas: 1, pessoas: 1 },
      ]),
    ).toEqual([
      { nome: "Busca do Google", visitas: 14, pessoas: 11 },
      { nome: "Instagram", visitas: 12, pessoas: 9 },
      { nome: "Digitou o endereço", visitas: 1, pessoas: 1 },
    ]);
  });
});

describe("rota para titulo", () => {
  it("o prefixo e o mesmo de posts.ts", () => {
    const fonte = readFileSync(join(process.cwd(), "src/lib/posts.ts"), "utf8");
    expect(fonte).toContain(`export const PREFIXO_POST = "${PREFIXO_DOS_TEXTOS}";`);
  });

  it.each([
    ["rota ASCII do middleware", `/home/f/${ZUMBIDO_ASCII}`],
    ["percent-encoding do navegador", `/home/f/${encodeURIComponent(ZUMBIDO_REAL)}`],
    ["acento cru em NFD", `/home/f/${ZUMBIDO_REAL.normalize("NFD")}`],
    ["URL inteira do Google com barra final", `https://podoposture.com.br/home/f/${encodeURIComponent(ZUMBIDO_REAL)}/`],
    ["com parametro de campanha", `/home/f/${ZUMBIDO_ASCII}?utm_source=instagram`],
  ])("acha o titulo pela %s", (_caso, endereco) => {
    expect(tituloDoTexto(endereco, CATALOGO)).toEqual({ slug: ZUMBIDO_REAL.normalize("NFC"), titulo: ZUMBIDO_TITULO });
  });

  it("texto sem acento nao precisa do mapa", () => {
    expect(tituloDoTexto("/home/f/neuralgia-occipital-ou-de-arnold", CATALOGO)?.titulo).toBe(
      "Neuralgia occipital ou de Arnold:",
    );
  });

  it.each([["/contato"], ["/home/f/"], ["/home/f/nao-existe"], ["/home/f/a/b"], ["/home/f/%E0%A4%A"], ["https://[quebrado"]])(
    "%s nao e texto",
    (endereco) => {
      expect(tituloDoTexto(endereco, CATALOGO)).toBeNull();
    },
  );

  it("slugDoEndereco nao lanca com percent-encoding quebrado", () => {
    expect(slugDoEndereco("/home/f/%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("as formas do mesmo texto somam numa linha, pelo titulo, sem endereco solto", () => {
    const lidos = textosPeloTitulo(
      [
        { chave: `/home/f/${ZUMBIDO_ASCII}`, visitas: 10, pessoas: 6, cliques: 0 },
        { chave: `/home/f/${encodeURIComponent(ZUMBIDO_REAL)}`, visitas: 5, pessoas: 4, cliques: 0 },
        { chave: "/home/f/neuralgia-occipital-ou-de-arnold", visitas: 20, pessoas: 7, cliques: 0 },
        { chave: "/contato", visitas: 99, pessoas: 99, cliques: 0 },
      ],
      CATALOGO,
    );
    expect(lidos.map((l) => [l.titulo, l.pessoas, l.visitas])).toEqual([
      [ZUMBIDO_TITULO, 10, 15],
      ["Neuralgia occipital ou de Arnold:", 7, 20],
    ]);
    expect(textosPeloTitulo([{ chave: `/home/f/${ZUMBIDO_ASCII}`, visitas: 1, pessoas: 1, cliques: 0 }], CATALOGO, 0)).toEqual([]);
  });
});

describe("intervalosDoPeriodo", () => {
  it("termina no ultimo dia guardado e compara com o periodo anterior do mesmo tamanho", () => {
    expect(intervalosDoPeriodo(30, "2026-01-01", "2026-09-10")).toEqual({
      atual: { inicio: "2026-08-12", fim: "2026-09-10" },
      anterior: { inicio: "2026-07-13", fim: "2026-08-11" },
    });
  });

  it("sem o periodo anterior inteiro guardado, nao compara", () => {
    expect(intervalosDoPeriodo(30, "2026-09-01", "2026-09-10")).toEqual({
      atual: { inicio: "2026-09-01", fim: "2026-09-10" },
      anterior: null,
    });
    expect(intervalosDoPeriodo(7, "2026-08-28", "2026-09-10").anterior).toEqual({
      inicio: "2026-08-28",
      fim: "2026-09-03",
    });
  });
});

describe("antes e depois", () => {
  it("mes sem linha vira null, nunca zero", () => {
    expect(
      mesesSemBuraco([
        { mes: "2025-11", cliques: 4, aparicoes: 0 },
        { mes: "2026-02", cliques: 7, aparicoes: 0 },
      ]),
    ).toEqual([
      { mes: "2025-11", cliques: 4 },
      { mes: "2025-12", cliques: null },
      { mes: "2026-01", cliques: null },
      { mes: "2026-02", cliques: 7 },
    ]);
    expect(mesesSemBuraco([])).toEqual([]);
  });

  it("media so de meses inteiros, sem o da mudanca e sem as pontas pela metade", () => {
    const meses = [
      { mes: "2026-01", cliques: 1000 }, // comecou dia 15: pela metade
      { mes: "2026-02", cliques: 100 },
      { mes: "2026-03", cliques: 200 },
      { mes: "2026-04", cliques: null }, // sem coleta
      { mes: "2026-05", cliques: 999 }, // mes da mudanca
      { mes: "2026-06", cliques: 300 },
      { mes: "2026-07", cliques: 500 },
      { mes: "2026-08", cliques: 1 }, // ainda correndo
    ];
    expect(mediasAntesEDepois(meses, "2026-05", "2026-01-15", "2026-08-20")).toEqual({
      antes: { media: 150, meses: 2 },
      depois: { media: 400, meses: 2 },
    });
    // mes que termina no ultimo dia guardado conta como inteiro
    expect(mediasAntesEDepois(meses, "2026-05", "2026-01-01", "2026-08-31").depois).toEqual({ media: 267, meses: 3 });
  });
});

describe("frases", () => {
  it("diferenca em palavras", () => {
    expect(comparacaoEmPalavras(110, 100, 30, ["pessoa", "pessoas"])).toBe(
      "10 pessoas a mais que nos 30 dias anteriores — 10% acima.",
    );
    expect(comparacaoEmPalavras(1, 2, 7, ["pessoa", "pessoas"])).toBe(
      "1 pessoa a menos que nos 7 dias anteriores — 50% abaixo.",
    );
    expect(comparacaoEmPalavras(1020, 1000, 365, ["clique", "cliques"])).toBe(
      "Praticamente o mesmo que nos 12 meses anteriores (1.000).",
    );
    expect(comparacaoEmPalavras(5, 0, 90, ["pessoa", "pessoas"])).toBe("Nos 3 meses anteriores não houve nenhum registro.");
    expect(comparacaoEmPalavras(0, 0, 90, ["pessoa", "pessoas"])).toBe(
      "Nenhum registro, nem agora nem nos 3 meses anteriores.",
    );
  });

  it("quando foi, sempre no horario de Brasilia", () => {
    const agora = new Date("2026-09-11T15:00:00Z");
    expect(quandoFoi("2026-09-11T09:00:00Z", agora)).toBe("hoje às 6h");
    expect(quandoFoi("2026-09-10T09:05:00Z", agora)).toBe("ontem às 6h05");
    // 02h30 UTC de 11 ainda e dia 10 em Brasilia
    expect(quandoFoi("2026-09-11T02:30:00Z", agora)).toBe("ontem às 23h30");
    expect(quandoFoi("2026-09-03T09:00:00Z", agora)).toBe("em 3 de setembro às 6h");
    expect(quandoFoi("2025-12-31T12:00:00Z", agora)).toBe("em 31 de dezembro de 2025 às 9h");
  });

  it("numero e dia no formato brasileiro", () => {
    expect(formatarNumero(1204)).toBe("1.204");
    expect(diaCurto("2026-09-09")).toBe("9 set.");
  });
});

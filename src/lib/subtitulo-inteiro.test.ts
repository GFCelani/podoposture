import { describe, expect, it } from "vitest";

import { paginasDoAcervo } from "./pagina-do-acervo";
import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { LIMITES_POST } from "./painel-tipos";
import { PAGINAS_DINAMICAS, subtituloCortadoAntigo, subtituloDaPagina } from "./pages";
import { BRUTOS_DO_JSON, RESUMOS_COMPLETADOS } from "./posts";
import { resumoInteiro, textoDoHtml } from "./subtitulo-inteiro";

const CORTE = /(\.\.\.|…)\s*$/;

describe("resumoInteiro", () => {
  const html = "<p>Primeira frase curta. Segunda frase, que o blog antigo cortou no meio, termina aqui. Terceira.</p>";

  it("completa ate o fim da frase em que o trecho parava", () => {
    expect(resumoInteiro("Primeira frase curta. Segunda frase, que o blog...", html)).toBe(
      "Primeira frase curta. Segunda frase, que o blog antigo cortou no meio, termina aqui.",
    );
  });

  it("trecho que ja acaba numa frase fica so com ela", () => {
    expect(resumoInteiro("Primeira frase curta....", html)).toBe("Primeira frase curta.");
  });

  it("sem reticencias, ou sem o corpo como fonte, volta como veio", () => {
    expect(resumoInteiro("Outro texto.", html)).toBe("Outro texto.");
    expect(resumoInteiro("Nada a ver com o corpo...", html)).toBe("Nada a ver com o corpo...");
  });

  it("resolve entidades e espacos do HTML", () => {
    expect(textoDoHtml("<p>A&nbsp;&quot;dor&quot;<br />\n  volta &amp; vai</p>")).toBe('A "dor" volta & vai');
  });
});

describe("nenhum subtitulo cortado", () => {
  it("posts do acervo: resumo sem reticencias de corte e dentro do limite do painel", () => {
    for (const p of BRUTOS_DO_JSON) {
      expect(p.resumo, p.slug).not.toMatch(CORTE);
      expect(p.resumo.length, p.slug).toBeLessThanOrEqual(LIMITES_POST.resumo);
    }
    expect(RESUMOS_COMPLETADOS).toHaveLength(15);
  });

  it("paginas do acervo: subtitulo sem reticencias de corte e dentro do limite do painel", () => {
    for (const p of paginasDoAcervo(CONTEUDO_PADRAO)) {
      expect(p.resumo, p.slug).not.toMatch(CORTE);
      expect(p.resumo.length, p.slug).toBeLessThanOrEqual(LIMITES_POST.resumo);
    }
  });

  it("as paginas que saiam cortadas sao as seis conhecidas", () => {
    const trocadas = PAGINAS_DINAMICAS.filter((p) => subtituloCortadoAntigo(p) !== subtituloDaPagina(p, ""))
      .map((p) => p.slug.normalize("NFC"))
      .sort();
    expect(trocadas).toEqual(
      ["acupuntura", "acupuntura-clínica", "baropodometria", "dor-lombar-crônica", "neuromodulação", "palmilhas-personalizadas"].sort(),
    );
  });
});

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { decidirRota, ROTA_NAO_ENCONTRADA } from "./rotas-do-middleware";

/**
 * Os tres casos da borda, com o terceiro sendo o que custou um 500 em producao.
 */

// Escrito por codigo, e nao com o caractere literal, para o teste nao depender
// da forma Unicode em que o arquivo foi salvo: "o" + circunflexo combinante e
// "i" + agudo combinante sao a forma DECOMPOSTA (NFD) dos mesmos slugs.
const CIRCUNFLEXO = String.fromCharCode(0x0302);
const AGUDO = String.fromCharCode(0x0301);

const PAGINA_NFD = `/dor-lombar-cro${CIRCUNFLEXO}nica`;
const POST_NFD = `/home/f/primavera-fi${AGUDO}gado-e-torcicolo`;

const MAPAS = {
  paginas: {
    [PAGINA_NFD.slice(1).normalize("NFC")]: "dor-lombar-cronica",
    osteopatia: "osteopatia",
  },
  posts: {
    [POST_NFD.slice("/home/f/".length).normalize("NFC")]:
      "primavera-figado-e-torcicolo",
    "neuralgia-occipital-ou-de-arnold": "neuralgia-occipital-ou-de-arnold",
    // Chave com "%" literal, como ela esta de verdade em src/content/rotas.json.
    "chinelos-100%-personalizados-para-fascite-plantar":
      "chinelos-100-personalizados-para-fascite-plantar",
  },
};

describe("decisao de rota da borda", () => {
  it("traduz pagina com acento para a rota ASCII, mantendo a URL publica", () => {
    // O navegador manda percent-encoded; e' assim que o caminho chega aqui.
    expect(decidirRota(encodeURI(PAGINA_NFD.normalize("NFC")), MAPAS)).toEqual({
      tipo: "reescrever",
      destino: "/dor-lombar-cronica",
    });
  });

  it("traduz post com acento sob o prefixo do blog", () => {
    expect(decidirRota(encodeURI(POST_NFD.normalize("NFC")), MAPAS)).toEqual({
      tipo: "reescrever",
      destino: "/home/f/primavera-figado-e-torcicolo",
    });
  });

  it("acha a mesma pagina quando o acento chega decomposto (NFD)", () => {
    // Sem a normalizacao para NFC, este caminho nao casaria com a chave do
    // mapa e a pagina indexada cairia em 404.
    expect(PAGINA_NFD).not.toBe(PAGINA_NFD.normalize("NFC"));

    expect(decidirRota(encodeURI(PAGINA_NFD), MAPAS)).toEqual({
      tipo: "reescrever",
      destino: "/dor-lombar-cronica",
    });
  });

  it("deixa passar o que ja e ASCII e esta no mapa como ele mesmo", () => {
    expect(decidirRota("/osteopatia", MAPAS)).toEqual({
      tipo: "reescrever",
      destino: "/osteopatia",
    });
  });

  it("deixa passar endereco que nao esta no mapa", () => {
    expect(decidirRota("/publicar", MAPAS)).toEqual({ tipo: "seguir" });
    expect(decidirRota("/nao-existe", MAPAS)).toEqual({ tipo: "seguir" });
  });

  it("nao traduz slug com barra no meio", () => {
    expect(decidirRota("/home/f/um/dois", MAPAS)).toEqual({ tipo: "seguir" });
  });

  /**
   * O caso que devolvia 500. Note que o caminho abaixo ESTA no mapa (a chave
   * crua existe, com `%` e tudo) e mesmo assim a decisao e' 404: reescrever
   * para a rota dinamica nao evita o erro de decodificacao do parametro, que
   * acontece dentro do Next. Medido em `next start`; ver o comentario de
   * `decodificar` em rotas-do-middleware.ts.
   */
  it("devolve nao-encontrado para caminho indecodificavel, mesmo estando no mapa", () => {
    expect(MAPAS.posts).toHaveProperty(
      "chinelos-100%-personalizados-para-fascite-plantar",
    );

    expect(
      decidirRota("/home/f/chinelos-100%-personalizados-para-fascite-plantar", MAPAS),
    ).toEqual({ tipo: "nao-encontrado" });
  });

  it("devolve nao-encontrado para escape cortado no meio", () => {
    expect(decidirRota("/%E0%A4%A", MAPAS)).toEqual({ tipo: "nao-encontrado" });
    expect(decidirRota("/qualquer-coisa-%-solto", MAPAS)).toEqual({
      tipo: "nao-encontrado",
    });
  });

  it("a forma escapada, que e a que o Google indexa, segue o caminho normal", () => {
    // "%25" decodifica para "%", entao o slug reconstituido casa no mapa e o
    // texto e' servido. E' por isso que o 404 acima nao perde conteudo.
    expect(
      decidirRota(
        "/home/f/chinelos-100%25-personalizados-para-fascite-plantar",
        MAPAS,
      ),
    ).toEqual({
      tipo: "reescrever",
      destino: "/home/f/chinelos-100-personalizados-para-fascite-plantar",
    });
  });

  it("o destino do nao-encontrado nao existe como rota de verdade", () => {
    // E' o que faz o Next cair no not-found.tsx e responder 404. Conferir so o
    // prefixo seria teste que se auto-satisfaz: o que importa e' que nenhuma
    // pagina responda por esse endereco.
    const segmentos = ROTA_NAO_ENCONTRADA.replace(/^\//, "").split("/");
    const pagina = join(process.cwd(), "src", "app", ...segmentos, "page.tsx");

    expect(existsSync(pagina)).toBe(false);
  });
});

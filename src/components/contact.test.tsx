import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CONTEUDO_PADRAO } from "@/lib/conteudo-padrao";
import { derivarContato } from "@/lib/site";

import { Contact } from "./contact";

/**
 * O que sustenta a politica de cookies: sem banner, o unico terceiro que grava
 * cookie (o Google Maps) nao pode vir no HTML. Se o iframe voltar a ser
 * renderizado de saida, a pagina /cookies passa a mentir.
 */
describe("secao de contato", () => {
  const contato = derivarContato(CONTEUDO_PADRAO.contato);
  const textos = CONTEUDO_PADRAO["contato-secao"];

  for (const comoSecao of [true, false]) {
    it(`nao traz o mapa do Google no HTML (${comoSecao ? "home" : "/contato"})`, () => {
      const html = renderToStaticMarkup(
        <Contact contato={contato} textos={textos} comoSecao={comoSecao} />,
      );
      expect(html).not.toContain("<iframe");
      expect(html).not.toContain("output=embed");
      expect(html).toContain("/img/mapa-capa.svg");
      expect(html).toContain('href="/cookies#mapa"');
    });
  }
});

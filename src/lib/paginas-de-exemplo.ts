import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { importarMarkdown } from "./importar-arquivo";
import { markdownParaHtml } from "./markdown";
import { corpoComFotos } from "./pagina-do-acervo";
import type { PaginaDoSite } from "./paginas-do-site";

/**
 * Paginas de exemplo para o teste de layout no navegador, e SO para ele:
 * entram no site sem banco quando PAGINAS_DE_EXEMPLO=1, que so o
 * playwright.config.ts liga. O site publicado tem banco e nunca passa aqui.
 *
 *   - uma pagina nova, criada como o painel cria (o arquivo de
 *     importar-exemplos/ pelo mesmo Importar arquivo, depois o Markdown do
 *     editor): titulo sem corpo, paragrafo curto com quatro fotos e secao
 *     sem imagem (e2e/pagina-nova.spec.ts);
 *   - Palmilhas Personalizadas com duas fotos da cliente depois de "Pes e
 *     Coluna Interligados", onde ela as pos no site publicado. As fotos dela
 *     estao no banco; aqui entram duas do acervo na mesma proporcao (4:5),
 *     com as legendas dela.
 */
export const EXEMPLOS_LIGADOS = process.env.PAGINAS_DE_EXEMPLO === "1";

export const SLUG_DA_PAGINA_DE_TESTE = "pagina-de-teste-do-layout-novo";

export function paginaNovaDeTeste(): PaginaDoSite {
  const arquivo = readFileSync(join(process.cwd(), "src", "lib", "importar-exemplos", "pagina-nova-de-teste.md"), "utf8");
  const importado = importarMarkdown(arquivo);
  return {
    slug: SLUG_DA_PAGINA_DE_TESTE,
    titulo: importado.titulo,
    resumo: importado.resumo,
    grupo: "",
    capa: null,
    html: markdownParaHtml(importado.corpo),
    descricao: "",
    identificacao: [],
  };
}

const FOTOS_DAS_PALMILHAS = [
  {
    src: "/img/galeria/palmilhas.webp",
    alt: "Chinelos Palmilhados confeccionados com elementos de suporte plantar.",
    legenda: "Chinelos palmilhados com bases anatômicas e diferentes combinações de elementos.",
    largura: 960,
    altura: 1200,
  },
  {
    src: "/img/galeria/palmilhas-na-bancada.webp",
    alt: "Palmilhas Personalizadas confeccionadas sob medida.",
    legenda: "Palmilhas sob medida, com materiais diversos selecionados de acordo com a biomecânica.",
    largura: 960,
    altura: 1200,
  },
];

export function palmilhasComFotosDaCliente(pagina: PaginaDoSite): PaginaDoSite {
  return {
    ...pagina,
    html: corpoComFotos(pagina.html, FOTOS_DAS_PALMILHAS.map((f, i) => (i === 0 ? { ...f, secao: "pes-e-coluna-interligados" } : f))),
  };
}

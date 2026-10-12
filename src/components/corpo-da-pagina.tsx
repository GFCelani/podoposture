import {
  SLUG_DAS_PALMILHAS,
  SLUG_DO_ATENDIMENTO,
  lerAtendimento,
  modeloDaPagina,
  separarFotos,
  type FotosDoRegistro,
} from "@/lib/paginas-antigas";

import { distribuirFotos } from "@/lib/distribuir-fotos";
import { planejarFluxo } from "@/lib/fluxo";

import { CorpoDoAtendimento } from "./como-e-o-meu-atendimento";

import { CorpoDaPaginaNova } from "./corpo-da-pagina-nova";
import { CorpoEmFluxo } from "./corpo-em-fluxo";
import type { TipoDePagina } from "./page-shell";
import { SecoesDeConteudo } from "./secoes-de-conteudo";

/**
 * O corpo de uma pagina, no renderizador dela (lib/paginas-antigas.ts): a
 * antiga no que sempre teve, a nova no layout unico. A previa do editor usa
 * este mesmo componente.
 */
export function CorpoDaPagina({
  slug,
  html,
  tipo,
  fotos,
}: {
  slug: string;
  html: string;
  tipo: TipoDePagina;
  /** As fotos de apoio do registro de fotos da pagina, com a ancora dela. */
  fotos?: FotosDoRegistro;
}) {
  if (modeloDaPagina(slug) === "novo") return <CorpoDaPaginaNova html={html} />;
  const nfc = slug.normalize("NFC");
  if (nfc === SLUG_DO_ATENDIMENTO) return <CorpoDoAtendimento lido={lerAtendimento(html)} />;
  const { html: texto, apoio } = separarFotos(html, fotos);
  if (nfc === SLUG_DAS_PALMILHAS) return <CorpoEmFluxo html={texto} apoio={apoio} />;
  return <SecoesDeConteudo html={texto} tipo={tipo} apoio={apoio} />;
}


/**
 * As imagens passam do que o texto comporta, mesmo depois da regra de
 * lib/distribuir-fotos.ts (descer, grade de duas, reduzir)? E' o aviso do
 * editor. So nas paginas que seguem essa regra: as novas e Palmilhas.
 */
export function imagensAlemDoTexto(slug: string, html: string): boolean {
  if (!/<img\b/i.test(html)) return false;
  if (modeloDaPagina(slug) === "novo") return distribuirFotos(planejarFluxo(html)).excesso;
  if (slug.normalize("NFC") !== SLUG_DAS_PALMILHAS) return false;
  const { html: texto, apoio } = separarFotos(html);
  return distribuirFotos(planejarFluxo(texto, apoio)).excesso;
}

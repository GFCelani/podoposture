import { NAV_GROUPS, type NavGroup } from "./nav";
import { GRUPOS_DO_MENU, type ResumoDaPagina } from "./paginas-tipos";

/**
 * O menu do cabecalho a partir das paginas publicadas. Puro, para o teste
 * provar que as paginas do codigo dao exatamente o menu de antes (nav.ts).
 */
type Resumo = Pick<ResumoDaPagina, "slug" | "titulo" | "categoria" | "ordem">;

const SLUG_DO_CONTATO = "contato";

/** Contato e' sempre o ultimo item de A Clinica. */
const ITEM_DO_CONTATO = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === `/${SLUG_DO_CONTATO}`);

/** O menu a partir das paginas: grupos fixos, itens pela ordem de cada pagina. */
export function montarMenu(paginas: readonly Resumo[]): NavGroup[] {
  return GRUPOS_DO_MENU.map((label) => {
    const itens = paginas
      .filter((p) => p.categoria === label)
      .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"))
      .map((p) => ({ label: rotuloNoMenu(p), href: `/${p.slug}` }));
    if (label === "A Clínica" && ITEM_DO_CONTATO) itens.push(ITEM_DO_CONTATO);
    return { label, items: itens };
  }).filter((g) => g.items.length > 0);
}

/**
 * O nome no menu: o que o site antigo usava, enquanto a pagina e' uma das
 * dele (o titulo da pagina de dor, por exemplo, e' uma frase inteira); a
 * pagina nova entra com o proprio titulo.
 */
const ROTULOS_DO_CODIGO = new Map(NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.href.normalize("NFC"), i.label]));
export function rotuloNoMenu(p: Pick<Resumo, "slug" | "titulo">): string {
  return ROTULOS_DO_CODIGO.get(`/${p.slug}`.normalize("NFC")) ?? p.titulo.replace(/(?<!\.\.)\.$/, "");
}

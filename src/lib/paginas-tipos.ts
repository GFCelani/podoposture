import { IMAGENS_DO_SITE } from "./imagens-do-site";
import {
  LIMITES_POST,
  booleano,
  texto,
  validarPost,
  type DadosDoPost,
  type ErrosPost,
  type PostDoPainel,
} from "./painel-tipos";

/**
 * O contrato da pagina escrita pelo painel.
 *
 * A pagina e' um post com outro destino: o mesmo editor, a mesma validacao,
 * o mesmo rascunho no navegador e a mesma publicacao (ver painel-tipos.ts).
 * Por isso os dados tem a MESMA forma dos do post, e o que muda e' pouco:
 *
 *   - `categoria` guarda o GRUPO DO MENU em que a pagina entra (Tratamentos,
 *     Tecnicas, Avaliacao, A Clinica), ou "" para fora do menu. Nao e' tema de
 *     blog: e' o mesmo campo para o editor, a copia no navegador e a validacao
 *     funcionarem sem uma segunda versao de cada um;
 *   - `resumo` e' o subtitulo, a frase sob o titulo e a descricao para o Google;
 *   - a capa e' a foto em moldura ao lado do titulo, e por isso pede
 *     descricao (lida para quem nao enxerga) e legenda, como antes no painel;
 *   - a pagina nao tem data nem aparece no indice do blog.
 *
 * Como o post: navegador e servidor carregam este arquivo, entao ele nao
 * importa banco nem conversor.
 */

/** Os grupos do menu, na ordem do cabecalho. */
export const GRUPOS_DO_MENU = ["Tratamentos", "Técnicas", "Avaliação", "A Clínica"] as const;
export type GrupoDoMenu = (typeof GRUPOS_DO_MENU)[number];

export function ehGrupoDoMenu(valor: string): valor is GrupoDoMenu {
  return (GRUPOS_DO_MENU as readonly string[]).includes(valor);
}

export type DadosDaPagina = DadosDoPost & {
  /** Descricao da foto ao lado do titulo, para quem nao enxerga. */
  capaAlt: string;
  /** A linha curta em mono embaixo da foto. */
  capaLegenda: string;
};

export type PaginaDoPainel = DadosDaPagina &
  Pick<PostDoPainel, "id" | "slug" | "criadoEm" | "atualizadoEm" | "publicadoEm" | "formato"> & {
    /**
     * Descricao de busca das paginas que vieram do site antigo com uma
     * abertura diferente dela. Vazia: a descricao e' o proprio subtitulo.
     */
    descricao: string;
    /** Linhas de identificacao em mono sob o subtitulo (so as do site antigo). */
    identificacao: string[];
    /** Posicao dentro do grupo do menu. */
    ordem: number;
  };

export type ResumoDaPagina = Omit<PaginaDoPainel, "corpo">;

export const LIMITES_PAGINA = { ...LIMITES_POST, capaAlt: 200, capaLegenda: 120 } as const;

export type ErrosPagina = Partial<Record<keyof DadosDaPagina, string>>;

/** A capa que a pagina ja tem guardada: a do site antigo mora em public/img. */
export type ContextoDaPagina = { capaAceita?: string };

/**
 * A validacao do post, com o grupo do menu no lugar do tema e as duas linhas
 * da foto. Foto do proprio site (public/img) vale: e' a que as paginas antigas
 * ja tinham, e ela pode tira-la e por de volta sem ter o arquivo.
 */
export function validarPagina(dados: DadosDaPagina, contexto: ContextoDaPagina = {}): ErrosPagina {
  const capaDoSite = Object.hasOwn(IMAGENS_DO_SITE, dados.capa);
  const doPost: ErrosPost = validarPost(dados, {
    temas: GRUPOS_DO_MENU,
    capaAceita: capaDoSite ? dados.capa : contexto.capaAceita,
  });
  const erros: ErrosPagina = { ...doPost };
  if (doPost.titulo === "O texto precisa de um título.") erros.titulo = "A página precisa de um título.";
  if (doPost.categoria) erros.categoria = "Escolha um dos grupos do menu, ou fora do menu.";
  if (doPost.corpo === "Escreva o texto antes de salvar.") erros.corpo = "Escreva o texto da página antes de salvar.";
  if (dados.capa) {
    if (!dados.capaAlt) erros.capaAlt = "Descreva a foto: é o que quem não enxerga vai ouvir.";
    else if (dados.capaAlt.length > LIMITES_PAGINA.capaAlt) erros.capaAlt = `Máximo de ${LIMITES_PAGINA.capaAlt} caracteres.`;
    if (dados.capaLegenda.length > LIMITES_PAGINA.capaLegenda)
      erros.capaLegenda = `Máximo de ${LIMITES_PAGINA.capaLegenda} caracteres.`;
  }
  return erros;
}

/** O erro de um campo so, como `errosComCampo` do post. */
export function errosDaPaginaComCampo(
  erros: ErrosPagina,
  dados: DadosDaPagina,
  campo: keyof DadosDaPagina,
  contexto: ContextoDaPagina,
): ErrosPagina {
  const novos = { ...erros };
  delete novos[campo];
  const mensagem = validarPagina(dados, contexto)[campo];
  if (mensagem) novos[campo] = mensagem;
  return novos;
}

/** O corpo cru da requisicao nos campos da pagina. */
export function camposDaPagina(bruto: Record<string, unknown>): DadosDaPagina {
  return {
    titulo: texto(bruto.titulo),
    resumo: texto(bruto.resumo),
    categoria: texto(bruto.categoria),
    capa: texto(bruto.capa),
    capaAlt: texto(bruto.capaAlt),
    capaLegenda: texto(bruto.capaLegenda),
    corpo: typeof bruto.corpo === "string" ? bruto.corpo : "",
    publicado: booleano(bruto.publicado),
  };
}

/** A frase curta da lista depois de salvar, como a do post. */
export function mensagemAoSalvarPagina(publicarAgora: boolean, estavaNoAr: boolean): string {
  if (publicarAgora) {
    return estavaNoAr ? "Alterações publicadas no site." : "Página publicada. Ela já está no site.";
  }
  return estavaNoAr
    ? "Página tirada do site e guardada como rascunho."
    : "Rascunho guardado. A página ainda não está no site.";
}

/**
 * Enderecos que pagina nova nao pode ter: as rotas proprias do site e os
 * arquivos que o Next serve na raiz. As paginas que ja existem entram pelo
 * banco (slug unico); as do site antigo com acento, pela rota ASCII.
 */
export const ENDERECOS_RESERVADOS: ReadonlySet<string> = new Set([
  "home",
  "nosso-blog",
  "contato",
  "publicar",
  "api",
  "img",
  "privacidade",
  "cookies",
  "termos-de-uso",
  "fotos-que-faltam",
  "sitemap-xml",
  "robots-txt",
  "manifest-webmanifest",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
  "nao-encontrado",
  "previa",
]);

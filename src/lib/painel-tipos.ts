/**
 * O contrato do post escrito pelo painel.
 *
 * Este arquivo nao importa banco nem conversor de Markdown de proposito: ele e
 * carregado tanto pelo servidor (que decide) quanto pelo editor no navegador
 * (que avisa antes de enviar). Uma unica fonte para as duas pontas evita a
 * divergencia classica — o formulario aceita, a rota recusa, e quem escreveu
 * perde o texto sem entender por que.
 */

/**
 * Categorias oferecidas no painel.
 *
 * Sao os assuntos que a clinica de fato trata, e tres delas ja existem nos
 * posts migrados, com a grafia exata — assim a barra lateral do blog agrupa
 * post novo e post antigo na mesma linha em vez de criar um tema quase igual
 * ao lado do outro.
 */
export const CATEGORIAS = [
  "Dor Crônica",
  "Coluna e Dor Lombar",
  "Zumbido e Tinnitus",
  "Bruxismo, DTM e Dor Orofacial",
  "Dor de Cabeça e Cefaleias",
  "Postura e Pisada",
  "Osteopatia",
  "Acupuntura",
  "Neuromodulação",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export type DadosDoPost = {
  titulo: string;
  resumo: string;
  categoria: string;
  /** Caminho da capa, servida por /img/post/. Vazio = usa a capa de reserva. */
  capa: string;
  /** Corpo em Markdown. Nunca HTML — ver src/lib/markdown.ts. */
  corpo: string;
  publicado: boolean;
};

export type PostDoPainel = DadosDoPost & {
  id: string;
  slug: string;
  criadoEm: string;
  atualizadoEm: string;
  publicadoEm: string | null;
};

export const LIMITE_SLUG = 80;

export const LIMITES_POST = {
  titulo: 140,
  resumo: 300,
  corpo: 120_000,
} as const;

export const CORPO_MINIMO = 40;

/**
 * Titulo -> slug, sempre em ASCII.
 *
 * O "sempre em ASCII" nao e preferencia de estilo: o Next 16.3.4 nao serve rota
 * cujo segmento tem caractere fora do ASCII (vercel/next.js#73965). As 59 URLs
 * acentuadas herdadas do GoDaddy so funcionam porque `src/middleware.ts`
 * reescreve cada uma usando um mapa gerado no build. Um post criado pelo painel
 * nasce depois do build e nunca estaria nesse mapa — entao ele nasce ja sem
 * acento, e o problema deixa de existir para ele.
 */
export function gerarSlug(titulo: string): string {
  return titulo
    .normalize("NFD")
    // O intervalo U+0300 a U+036F e o bloco de acentos que o NFD separa da
    // letra. Escrito como escape: acento combinante literal e invisivel no
    // editor e sobrevive mal a copia entre ferramentas.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, LIMITE_SLUG)
    .replace(/^-+|-+$/g, "");
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugValido(slug: string): boolean {
  return SLUG.test(slug) && slug.length <= LIMITE_SLUG;
}

/**
 * Junta raiz e sufixo de desempate respeitando o teto.
 * O sufixo tem prioridade no orcamento: cortar o "-2" faria dois posts
 * diferentes terminarem com o mesmo endereco.
 */
export function juntarSlug(raiz: string, sufixo: string): string {
  const espaco = Math.max(1, LIMITE_SLUG - sufixo.length);
  return raiz.slice(0, espaco).replace(/-+$/g, "") + sufixo;
}

export type ErrosPost = Partial<Record<keyof DadosDoPost, string>>;

export function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export function booleano(valor: unknown): boolean {
  return valor === true || valor === "true";
}

export function validarPost(dados: DadosDoPost): ErrosPost {
  const erros: ErrosPost = {};

  if (!dados.titulo) erros.titulo = "O post precisa de um título.";
  else if (dados.titulo.length > LIMITES_POST.titulo)
    erros.titulo = `Máximo de ${LIMITES_POST.titulo} caracteres.`;
  else if (/[\r\n]/.test(dados.titulo)) erros.titulo = "O título não pode ter quebras de linha.";
  else if (!gerarSlug(dados.titulo))
    erros.titulo = "O título precisa ter ao menos uma letra ou número.";

  if (dados.resumo.length > LIMITES_POST.resumo)
    erros.resumo = `Máximo de ${LIMITES_POST.resumo} caracteres.`;

  if (!(CATEGORIAS as readonly string[]).includes(dados.categoria))
    erros.categoria = "Escolha um dos temas da lista.";

  // A capa e opcional: sem ela o blog usa a de reserva, como ja faz com os
  // posts antigos que vieram sem imagem.
  if (dados.capa && !dados.capa.startsWith("/img/post/"))
    erros.capa = "Capa inválida — envie a imagem pelo próprio painel.";

  if (!dados.corpo) erros.corpo = "Escreva o texto do post.";
  else if (dados.corpo.length < CORPO_MINIMO)
    erros.corpo = `Escreva um pouco mais — pelo menos ${CORPO_MINIMO} caracteres.`;
  else if (dados.corpo.length > LIMITES_POST.corpo)
    erros.corpo = `Texto longo demais (máximo ${LIMITES_POST.corpo.toLocaleString("pt-BR")} caracteres).`;

  return erros;
}

/** Converte o corpo cru da requisicao nos campos do post. */
export function camposDoCorpo(bruto: Record<string, unknown>): DadosDoPost {
  return {
    titulo: texto(bruto.titulo),
    resumo: texto(bruto.resumo),
    categoria: texto(bruto.categoria),
    capa: texto(bruto.capa),
    corpo: typeof bruto.corpo === "string" ? bruto.corpo : "",
    publicado: booleano(bruto.publicado),
  };
}

/** Data por extenso, no formato que os 68 posts migrados ja usam. */
export function rotuloDaData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

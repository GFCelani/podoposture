/**
 * Quebras escritas da abertura das paginas internas.
 *
 * O texto vive uma vez so, em pages.json; aqui ficam apenas as posicoes em
 * que a linha corta, como "depois desta palavra". Nao ha text-balance na
 * abertura dessas paginas: o navegador decidia diferente em cada largura e
 * a forma do bloco mudava de maquina para maquina. Escrever a quebra aqui,
 * em vez de duplicar o titulo com <br> no JSX, mantem o titulo do <title>,
 * do JSON-LD, da trilha e do h1 saindo da mesma string.
 *
 * Se uma palavra listada nao existir mais no texto (a cliente reescreveu),
 * `quebrar` lanca na geracao estatica e o build acusa, em vez de a pagina
 * sair com a quebra em lugar nenhum.
 */

type Quebras = {
  titulo?: readonly string[];
  subtitulo?: readonly string[];
};

const QUEBRAS: Record<string, Quebras> = {
  /* Titulo em tres linhas (22 / 18 / 15 caracteres), no mesmo numero de
     linhas que o titulo anterior ocupava na medida de 24ch. Subtitulo em
     tres linhas de 46 / 42 / 48: a mais curta e a mais longa ficam a 12% uma
     da outra, e cada corte cai numa virgula ou antes do verbo. */
  "tratamento-da-dor": {
    titulo: ["persiste,", "entender"],
    subtitulo: ["dor,", "integrando"],
  },
};

const POR_SLUG = new Map(
  Object.entries(QUEBRAS).map(([slug, q]) => [slug.normalize("NFC"), q]),
);

/** Corta `texto` depois de cada palavra de `apos`, na ordem, e devolve as linhas. */
export function quebrar(texto: string, apos: readonly string[]): string[] {
  const linhas: string[] = [];
  let resto = texto;
  for (const palavra of apos) {
    const i = resto.indexOf(palavra);
    if (i < 0) {
      throw new Error(`quebra "${palavra}" nao encontrada em "${texto}"`);
    }
    const corte = i + palavra.length;
    linhas.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte);
  }
  linhas.push(resto.trim());
  return linhas.filter(Boolean);
}

/** Linhas escritas do titulo e do subtitulo, quando a pagina as tem. */
export function quebrasDaAbertura(
  slug: string,
  titulo: string,
  subtitulo?: string,
): { titulo?: string[]; subtitulo?: string[] } {
  const q = POR_SLUG.get(slug.normalize("NFC"));
  if (!q) return {};
  return {
    titulo: q.titulo ? quebrar(titulo, q.titulo) : undefined,
    subtitulo: q.subtitulo && subtitulo ? quebrar(subtitulo, q.subtitulo) : undefined,
  };
}

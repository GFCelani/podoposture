/**
 * A decisao de rota da borda, separada do `next/server` para poder ser testada.
 *
 * O middleware em si e' fino de proposito (roda a cada requisicao), mas a
 * decisao que ele toma tem tres casos e uma armadilha, e armadilha sem teste
 * volta. Por isso a logica vive aqui, pura, recebendo os mapas como argumento:
 * assim o teste nao precisa do runtime de borda e o bundle da borda nao cresce.
 */

export const PREFIXO_POST = "/home/f/";

/**
 * Endereco para onde um caminho impossivel de decodificar e' reescrito.
 *
 * Nao existe como rota, e e' isso que se quer: o Next cai no `not-found.tsx` e
 * responde 404. O prefixo com sublinhado deixa claro que e' interno e evita
 * colisao com qualquer pagina que a clinica venha a criar pelo painel.
 */
export const ROTA_NAO_ENCONTRADA = "/_nao-encontrado";

export type DecisaoDeRota =
  | { tipo: "seguir" }
  | { tipo: "reescrever"; destino: string }
  | { tipo: "nao-encontrado" };

/**
 * `decodeURIComponent` lanca quando o caminho tem um `%` que nao abre um escape
 * valido. Uma das 88 URLs herdadas e' exatamente assim:
 * `/home/f/chinelos-100%-personalizados-para-fascite-plantar`.
 *
 * MEDIDO, e nao deduzido (next start, 2026-09-16), porque a leitura do codigo
 * sugere o contrario do que acontece:
 *
 *   - forma crua, com `%` solto .................. 500, e no log do servidor
 *                                                  `Error: failed to decode param`
 *   - forma escapada (`%25`), que e' a que o
 *     Google indexa ............................... 200
 *   - rota ASCII de destino, direta ............... 200
 *
 * O texto EXISTE (`src/content/posts.json`) e a chave crua esta no mapa
 * (`src/content/rotas.json`), entao a tentacao e' reescrever a forma crua para
 * a rota ASCII e servir o post. Foi tentado e NAO funciona: o Next falha ao
 * decodificar o parametro da rota dinamica antes de qualquer coisa que este
 * arquivo decida, e o 500 volta. Reescrever para um endereco SEM parametro
 * dinamico, ao contrario, funciona — e' o que o 404 abaixo faz.
 *
 * Logo: 404. Nenhum conteudo se perde, porque a URL que o Google conhece e' a
 * escapada, e essa responde 200.
 */
function decodificar(caminho: string): string | null {
  try {
    return decodeURIComponent(caminho);
  } catch {
    return null;
  }
}

function traduzir(
  slug: string,
  mapa: Record<string, string>,
  prefixo: string,
): string | null {
  if (!slug || slug.includes("/")) return null;
  const ascii = mapa[slug];
  return ascii ? `${prefixo}${ascii}` : null;
}

function noMapa(
  caminho: string,
  mapas: { paginas: Record<string, string>; posts: Record<string, string> },
): string | null {
  return caminho.startsWith(PREFIXO_POST)
    ? traduzir(caminho.slice(PREFIXO_POST.length), mapas.posts, PREFIXO_POST)
    : traduzir(caminho.replace(/^\//, ""), mapas.paginas, "/");
}

export function decidirRota(
  caminhoCru: string,
  mapas: { paginas: Record<string, string>; posts: Record<string, string> },
): DecisaoDeRota {
  const decodificado = decodificar(caminhoCru);

  // Sem consultar o mapa com o caminho cru: mesmo quando ele casa, reescrever
  // para a rota dinamica nao evita o 500 (ver a medicao em `decodificar`).
  if (decodificado === null) return { tipo: "nao-encontrado" };

  const destino = noMapa(decodificado.normalize("NFC"), mapas);

  return destino ? { tipo: "reescrever", destino } : { tipo: "seguir" };
}

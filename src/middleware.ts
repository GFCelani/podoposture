import { NextResponse, type NextRequest } from "next/server";

import rotas from "@/content/rotas.json";

/**
 * Traduz as URLs herdadas do GoDaddy para as rotas ASCII onde as paginas moram.
 *
 * O roteador do Next nao serve rotas cujo segmento tem caractere nao-ASCII: o
 * path chega percent-encoded e nao casa com a rota gerada, resultando em 404
 * (bug conhecido vercel/next.js#73965, presente em dev, em producao e na
 * Vercel). Das 88 URLs indexadas da clinica, 59 caem nesse caso — deixa-las
 * quebrar seria perder a maior parte do trafego organico.
 *
 * A saida e reescrever aqui: as rotas sao geradas em ASCII (ver
 * src/lib/slug-ascii.ts) e este proxy mapeia a URL original para elas. Como e
 * rewrite e nao redirect, a URL publica continua exatamente a que o Google
 * indexou — para o buscador, nada mudou de endereco.
 *
 * O mapa vem de src/content/rotas.json, e nao de src/lib/posts.ts, de proposito:
 * este arquivo roda na borda a cada requisicao e importar a biblioteca traria
 * junto o conteudo dos 68 posts.
 *
 * Sobre o aviso de build "the middleware file convention is deprecated": a
 * substituta anunciada, `proxy.ts`, NAO e reconhecida no Next 16.3.4 — o
 * arquivo compila, o build ate imprime "Proxy (Middleware)", mas o
 * middleware-manifest.json sai vazio e nenhuma rota passa por ele (testado com
 * export nomeado, export default, matcher com regex e matcher simples). Como
 * sao 59 URLs indexadas dependendo desta traducao, funcionar vale mais que o
 * aviso. Migrar quando o suporte a proxy estiver de fato implementado.
 */

const PREFIXO_POST = "/home/f/";

function decodificar(caminho: string): string {
  try {
    return decodeURIComponent(caminho);
  } catch {
    // "%" literal nao e escape valido (o caso de
    // "chinelos-100%-personalizados-para-fascite-plantar"); segue o valor cru
    return caminho;
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

export function middleware(request: NextRequest) {
  const caminho = decodificar(request.nextUrl.pathname).normalize("NFC");

  const destino = caminho.startsWith(PREFIXO_POST)
    ? traduzir(caminho.slice(PREFIXO_POST.length), rotas.posts, PREFIXO_POST)
    : traduzir(caminho.replace(/^\//, ""), rotas.paginas, "/");

  if (destino) {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Prefixos literais, sem regex de extensao: a versao anterior tentava excluir
  // "*.ext" com "\." e o escape saiu errado, virando "." — a regex passou a
  // excluir quase toda URL do site e o rewrite nunca rodava. Prefixo simples nao
  // tem essa armadilha, e tirar os assets daqui evita invocar a funcao de borda
  // em cada imagem.
  matcher: ["/((?!_next/|img/).*)"],
};

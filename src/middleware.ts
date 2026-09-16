import { NextResponse, type NextRequest } from "next/server";

import rotas from "@/content/rotas.json";
import { decidirRota, ROTA_NAO_ENCONTRADA } from "@/lib/rotas-do-middleware";

/**
 * Traduz as URLs herdadas do GoDaddy para as rotas ASCII onde as paginas moram.
 *
 * O roteador do Next nao serve rotas cujo segmento tem caractere nao-ASCII: o
 * path chega percent-encoded e nao casa com a rota gerada, resultando em 404
 * (bug conhecido vercel/next.js#73965, presente em dev, em producao e na
 * Vercel). Das 88 URLs indexadas da clinica, 59 caem nesse caso — deixa-las
 * quebrar seria perder a maior parte do trafego organico.
 *
 * A saida e reescrever aqui: as rotas sao geradas em ASCII (a reducao mora em
 * scripts/gerar-mapa-de-rotas.mjs) e este proxy mapeia a URL original para
 * elas. Como e
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
 *
 * A decisao propriamente dita vive em src/lib/rotas-do-middleware.ts, pura e
 * testada. Alem da traducao, ela cobre um terceiro caso: endereco que nem
 * chega a ser decodificavel vira 404 aqui, em vez de estourar 500 la na
 * frente, na leitura do parametro da rota.
 */

export function middleware(request: NextRequest) {
  const decisao = decidirRota(request.nextUrl.pathname, rotas);

  if (decisao.tipo === "seguir") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname =
    decisao.tipo === "reescrever" ? decisao.destino : ROTA_NAO_ENCONTRADA;

  return NextResponse.rewrite(url);
}

export const config = {
  // Prefixos literais, sem regex de extensao: a versao anterior tentava excluir
  // "*.ext" com "\." e o escape saiu errado, virando "." — a regex passou a
  // excluir quase toda URL do site e o rewrite nunca rodava. Prefixo simples nao
  // tem essa armadilha, e tirar os assets daqui evita invocar a funcao de borda
  // em cada imagem.
  //
  // `api/cron/` tambem fica de fora: o agendador chama essas rotas por endereco
  // ASCII fixo, nao ha nada a traduzir, e passar pela borda antes so acrescenta
  // uma invocacao e um ponto a mais onde o cabecalho Authorization poderia se
  // perder. Com barra no fim, para nao excluir uma pagina que comece por "cron".
  matcher: ["/((?!_next/|img/|api/cron/).*)"],
};

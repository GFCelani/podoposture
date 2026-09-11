import { buscarImagem } from "@/lib/painel-db";
import { lerNomeDoArquivo } from "@/lib/imagem-webp";

export const runtime = "nodejs";

/** Um ano. O endereco carrega o resumo do conteudo, entao nunca muda de bytes. */
const CACHE_ETERNO = "public, max-age=31536000, immutable";

/**
 * Nao encontrado tambem precisa de cache.
 *
 * Sem isto, um nome bem-formado mas inexistente (`<64 hex>-1x1.webp`) escapava
 * do cache da borda e cada requisicao virava uma consulta ao Postgres. Com uma
 * conexao por instancia e um plano gratuito do outro lado, algumas centenas por
 * segundo derrubariam o banco — e junto o painel e os posts novos —, sem
 * precisar de senha nenhuma. Achado por auditoria cega.
 */
const CACHE_NEGATIVO = "public, max-age=3600";

function naoEncontrado() {
  return new Response("Não encontrado", {
    status: 404,
    headers: { "Cache-Control": CACHE_NEGATIVO },
  });
}

/**
 * Serve uma imagem enviada pelo painel, em WebP ou JPEG.
 *
 * Publica de proposito: e uma foto dentro de um artigo do blog ou da pagina
 * inicial, tem de abrir para qualquer visitante.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ arquivo: string }> },
) {
  const { arquivo } = await ctx.params;

  // So nomes que nos mesmos emitimos. Qualquer outra coisa nem chega ao banco.
  const nome = lerNomeDoArquivo(arquivo);
  if (!nome) return naoEncontrado();

  const imagem = await buscarImagem(nome.resumo);
  if (!imagem) return naoEncontrado();

  // As medidas e o formato do endereco tem de bater com os guardados. Sem esta
  // conferencia, o mesmo arquivo respondia em qualquer `-LxA.webp`: eram 10^8
  // chaves de cache para um objeto so, e — pior — a regra de imagem do
  // Markdown escreve width/height a partir do nome, entao um par falso desfaria
  // exatamente o CLS zero que este caminho existe para proteger. Um JPEG pedido
  // como `.webp` e o mesmo caso: dois enderecos para um objeto so.
  if (
    nome.largura !== imagem.largura ||
    nome.altura !== imagem.altura ||
    nome.tipo !== imagem.tipo
  ) {
    return naoEncontrado();
  }

  // Content-Length nao e escrito a mao: o runtime calcula a partir do corpo.
  // Escrever a partir de outra coluna do banco arriscava resposta truncada se
  // as duas divergissem algum dia. O Content-Type sai da coluna gravada quando
  // o servidor reconheceu os bytes, e nao da extensao pedida.
  return new Response(new Uint8Array(imagem.bytes), {
    headers: {
      "Content-Type": imagem.tipo,
      "Cache-Control": CACHE_ETERNO,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

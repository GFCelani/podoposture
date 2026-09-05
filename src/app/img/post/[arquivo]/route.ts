import { buscarImagem } from "@/lib/painel-db";
import { lerNomeDoArquivo } from "@/lib/imagem-webp";

export const runtime = "nodejs";

/**
 * Serve a imagem de um post.
 *
 * Publica de proposito: e uma foto dentro de um artigo do blog, tem de abrir
 * para qualquer visitante.
 *
 * O endereco carrega o resumo do proprio conteudo, entao bytes diferentes nunca
 * moram no mesmo endereco — e isso e o que torna honesto o `immutable` abaixo.
 * Com ele, a rede de entrega guarda a imagem depois do primeiro acesso e a
 * funcao nao e chamada de novo: o custo de servir do banco e pago uma vez por
 * imagem, nao uma vez por visita.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ arquivo: string }> },
) {
  const { arquivo } = await ctx.params;

  // So nomes que nos mesmos emitimos. Qualquer outra coisa nem chega ao banco.
  const nome = lerNomeDoArquivo(arquivo);
  if (!nome) return new Response("Não encontrado", { status: 404 });

  const imagem = await buscarImagem(nome.resumo);
  if (!imagem) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(imagem.bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(imagem.tamanho),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

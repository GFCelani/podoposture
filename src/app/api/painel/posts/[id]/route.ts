import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { htmlParaMarkdown } from "@/lib/html-para-markdown";
import {
  TemaInexistente,
  apagarPost,
  atualizarPost,
  bancoConfigurado,
  buscarPorId,
  registrarAuditoria,
} from "@/lib/painel-db";
import { resumoAutomatico } from "@/lib/markdown";
import { camposDoCorpo, validarPost, type PostDoPainel } from "@/lib/painel-tipos";
import { BLOG_INDEX, caminhoDaRota } from "@/lib/posts";
import { nomesDosTemas } from "@/lib/temas-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Contexto = { params: Promise<{ id: string }> };

const TEMA_SUMIU = "Esse tema acabou de ser apagado. Escolha outro da lista.";

/**
 * O corpo como o editor edita. Post do GoDaddy (`formato: html`) vai convertido
 * para Markdown; o do painel ja e Markdown. Ver html-para-markdown.ts.
 */
function comoOEditorVe(post: PostDoPainel): PostDoPainel {
  return post.formato === "html" ? { ...post, corpo: htmlParaMarkdown(post.corpo) } : post;
}

/** Quebra de linha do navegador e espaco das pontas nao contam como edicao. */
const semRuido = (texto: string) => texto.replace(/\r\n?/g, "\n").trim();

/**
 * Guarda + validacoes comuns aos tres verbos.
 *
 * Existe como funcao unica para que nenhum verbo consiga esquecer a checagem —
 * e o teste de rotas protegidas exige que ela seja chamada, ou que
 * `exigirSessao` apareca diretamente.
 */
async function preparar(
  ctx: Contexto,
): Promise<{ ok: true; id: string } | { ok: false; resposta: NextResponse }> {
  const auth = await exigirSessao();
  if (!auth.ok) return { ok: false, resposta: auth.resposta };

  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return { ok: false, resposta: NextResponse.json({ erro: "Post não encontrado." }, { status: 404 }) };
  }

  if (!bancoConfigurado()) {
    return {
      ok: false,
      resposta: NextResponse.json(
        { erro: "O banco de dados ainda não está configurado neste servidor." },
        { status: 503 },
      ),
    };
  }

  return { ok: true, id };
}

export async function GET(_req: Request, ctx: Contexto) {
  const pronto = await preparar(ctx);
  if (!pronto.ok) return pronto.resposta;

  try {
    const post = await buscarPorId(pronto.id);
    if (!post) return NextResponse.json({ erro: "Post não encontrado." }, { status: 404 });
    return NextResponse.json({ post: comoOEditorVe(post) });
  } catch (erro) {
    console.error("[painel] falha ao ler post:", erro);
    return NextResponse.json({ erro: "Não foi possível ler o post." }, { status: 502 });
  }
}

export async function PUT(req: Request, ctx: Contexto) {
  const pronto = await preparar(ctx);
  if (!pronto.ok) return pronto.resposta;

  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) {
    return leitura.motivo === "grande"
      ? NextResponse.json({ erro: "Texto grande demais." }, { status: 413 })
      : NextResponse.json({ erro: "O envio foi interrompido." }, { status: 400 });
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(leitura.texto);
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const campos = camposDoCorpo(bruto as Record<string, unknown>);
  if (!campos.resumo) campos.resumo = resumoAutomatico(campos.corpo);

  try {
    const atual = await buscarPorId(pronto.id);
    if (!atual) return NextResponse.json({ erro: "Post não encontrado." }, { status: 404 });

    // A capa que o texto ja tem vale mesmo fora de /img/post/ (a dos posts do
    // GoDaddy mora em /img/blog/). Os temas vem do banco.
    const erros = validarPost(campos, { temas: await nomesDosTemas(), capaAceita: atual.capa });
    if (Object.keys(erros).length > 0) {
      return NextResponse.json({ erro: "Confira os campos destacados.", erros }, { status: 400 });
    }

    // Post do GoDaddy cujo texto ela nao mexeu (so titulo, resumo, tema ou
    // capa): o corpo continua o HTML de sempre, e a pagina so muda no que ela
    // mudou. Mexeu no texto: vai o Markdown do editor.
    let formato: PostDoPainel["formato"] = "markdown";
    if (atual.formato === "html" && semRuido(campos.corpo) === semRuido(htmlParaMarkdown(atual.corpo))) {
      campos.corpo = atual.corpo;
      formato = "html";
    }

    const post = await atualizarPost(pronto.id, campos, formato);
    if (!post) return NextResponse.json({ erro: "Post não encontrado." }, { status: 404 });

    await registrarAuditoria("post-editado", post.slug, ipDaRequisicao(await headers()));
    revalidatePath(BLOG_INDEX);
    revalidatePath(caminhoDaRota(post.slug));
    revalidatePath("/");
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ post: comoOEditorVe(post) });
  } catch (erro) {
    if (erro instanceof TemaInexistente) {
      return NextResponse.json({ erro: "Confira os campos destacados.", erros: { categoria: TEMA_SUMIU } }, { status: 400 });
    }
    console.error("[painel] falha ao atualizar post:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar o post." }, { status: 502 });
  }
}

export async function DELETE(_req: Request, ctx: Contexto) {
  const pronto = await preparar(ctx);
  if (!pronto.ok) return pronto.resposta;

  try {
    const post = await buscarPorId(pronto.id);
    const apagou = await apagarPost(pronto.id);
    if (!apagou) return NextResponse.json({ erro: "Post não encontrado." }, { status: 404 });

    await registrarAuditoria("post-apagado", post?.slug ?? null, ipDaRequisicao(await headers()));
    revalidatePath(BLOG_INDEX);
    if (post) revalidatePath(caminhoDaRota(post.slug));
    revalidatePath("/");
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[painel] falha ao apagar post:", erro);
    return NextResponse.json({ erro: "Não foi possível apagar o post." }, { status: 502 });
  }
}

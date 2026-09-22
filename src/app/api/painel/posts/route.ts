import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import {
  TemaInexistente,
  TiraDoArSemConfirmacao,
  bancoConfigurado,
  buscarPorId,
  criarPost,
  listarTodos,
  registrarAuditoria,
} from "@/lib/painel-db";
import { resumoAutomatico } from "@/lib/markdown";
import { camposDoCorpo, envioMudaOSite, repetirTiraDoAr, validarPost } from "@/lib/painel-tipos";
import { BLOG_INDEX, caminhoDaRota } from "@/lib/posts";
import { nomesDosTemas } from "@/lib/temas-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Corpo de post: texto longo cabe, mas nao um upload disfarcado. */
const TAMANHO_MAXIMO = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A saida para quem mandou como rascunho um texto que ja esta no ar. */
const JA_ESTA_PUBLICADO =
  "Este texto já está publicado no site. Para tirá-lo do ar, abra ele na lista “Meu blog” e use “Tirar do site e guardar”.";

/** O tema escolhido foi apagado em outra janela entre a escolha e o envio. */
const TEMA_SUMIU = "Esse tema acabou de ser apagado. Escolha outro da lista.";

async function lerCorpo(req: Request): Promise<Record<string, unknown> | null> {
  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) return null;
  try {
    const bruto = JSON.parse(leitura.texto);
    if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return null;
    return bruto as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  // Desde a migracao do acervo, a lista tem todos os posts do blog: os do
  // GoDaddy e os escritos aqui. Sem banco ela fica vazia e a aba explica.
  if (!bancoConfigurado()) {
    return NextResponse.json({ posts: [], semBanco: true });
  }
  try {
    return NextResponse.json({ posts: await listarTodos(), semBanco: false });
  } catch (erro) {
    console.error("[painel] falha ao listar posts:", erro);
    return NextResponse.json({ erro: "Não foi possível ler os posts." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  // A guarda vem antes de tocar no corpo da requisicao. Ler primeiro seria
  // gastar memoria e tempo com quem nem deveria estar aqui.
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  if (!bancoConfigurado()) {
    return NextResponse.json(
      { erro: "O banco de dados ainda não está configurado neste servidor." },
      { status: 503 },
    );
  }

  const bruto = await lerCorpo(req);
  if (!bruto) return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });

  const campos = camposDoCorpo(bruto);
  if (!campos.resumo) campos.resumo = resumoAutomatico(campos.corpo);
  // O id que o editor gerou ao abrir: repetir o envio atualiza em vez de
  // duplicar. Qualquer outra coisa e ignorada e o servidor escolhe o id.
  const id = typeof bruto.id === "string" && UUID.test(bruto.id) ? bruto.id.toLowerCase() : undefined;

  try {
    // Os temas vem do banco: a lista e gerida pelo painel.
    const erros = validarPost(campos, { temas: await nomesDosTemas() });
    if (Object.keys(erros).length > 0) {
      return NextResponse.json({ erro: "Confira os campos destacados.", erros }, { status: 400 });
    }

    // Repetir o envio com o mesmo id atualiza em vez de duplicar (ver
    // `criarPost`). O que ele nao pode fazer e tirar do ar, calado, um texto que
    // ja esta publicado: no editor isso pede um segundo clique ("Tirar do site e
    // guardar"), e nesse caminho o aviso nunca aparece, porque do lado do
    // navegador o texto ainda e novo. A saida esta escrita na mensagem.
    // Esta leitura so adianta a resposta no caso comum; quem garante a regra e
    // a propria escrita (`TiraDoArSemConfirmacao`), porque com dois envios
    // cruzados ela ainda ve o texto como inexistente.
    const existente = id ? await buscarPorId(id) : null;
    if (repetirTiraDoAr(existente, campos)) {
      return NextResponse.json({ erro: JA_ESTA_PUBLICADO }, { status: 409 });
    }

    const { post, estavaPublicado } = await criarPost(campos, id);
    await registrarAuditoria(
      post.publicado ? "post-publicado" : "post-rascunho",
      post.slug,
      ipDaRequisicao(await headers()),
    );

    // Quando o site muda: o texto fica publicado, ou ja estava no ar antes deste
    // envio. Este mesmo POST atualiza quando o id ja existe, e essa atualizacao
    // pode TIRAR o texto do ar — olhar so `post.publicado` deixava o texto fora
    // do banco e ainda visivel no site ate a proxima publicacao. O que fica de
    // fora e so o rascunho que nunca esteve no ar: limpar home, indice e
    // sitemap por ele refazia tres paginas iguais a cada "Guardar rascunho".
    // O "antes" e o que a propria escrita viu (`estavaPublicado`), e nao o
    // `existente` lido la em cima: com dois envios cruzados ele e de antes do
    // outro envio publicar.
    if (envioMudaOSite({ publicado: estavaPublicado }, post)) {
      revalidatePath(BLOG_INDEX);
      revalidatePath(caminhoDaRota(post.slug));
      revalidatePath("/");
      // O sitemap tambem e montado no build: sem isto, o post existe, abre pela
      // URL e nunca e anunciado ao buscador.
      revalidatePath("/sitemap.xml");
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (erro) {
    if (erro instanceof TiraDoArSemConfirmacao) {
      return NextResponse.json({ erro: JA_ESTA_PUBLICADO }, { status: 409 });
    }
    if (erro instanceof TemaInexistente) {
      return NextResponse.json({ erro: "Confira os campos destacados.", erros: { categoria: TEMA_SUMIU } }, { status: 400 });
    }
    console.error("[painel] falha ao salvar post:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar o post." }, { status: 502 });
  }
}

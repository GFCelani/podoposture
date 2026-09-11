import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { bancoConfigurado, criarPost, listarTodos, registrarAuditoria } from "@/lib/painel-db";
import { resumoAutomatico } from "@/lib/markdown";
import { camposDoCorpo, validarPost } from "@/lib/painel-tipos";
import { BLOG_INDEX, BRUTOS_DO_JSON, hrefDoPost } from "@/lib/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Corpo de post: texto longo cabe, mas nao um upload disfarcado. */
const TAMANHO_MAXIMO = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Quantos textos vivem no repositorio, fora desta lista. Vai na resposta, e
  // nao escrito na tela, porque o numero muda quando o acervo muda — e o
  // navegador nao pode importar o JSON dos posts sem levar o acervo inteiro.
  const doRepositorio = BRUTOS_DO_JSON.length;

  if (!bancoConfigurado()) {
    return NextResponse.json({ posts: [], semBanco: true, doRepositorio });
  }
  try {
    return NextResponse.json({ posts: await listarTodos(), semBanco: false, doRepositorio });
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

  const erros = validarPost(campos);
  if (Object.keys(erros).length > 0) {
    return NextResponse.json({ erro: "Confira os campos destacados.", erros }, { status: 400 });
  }

  try {
    const post = await criarPost(campos, id);
    await registrarAuditoria(
      post.publicado ? "post-publicado" : "post-rascunho",
      post.slug,
      ipDaRequisicao(await headers()),
    );

    if (post.publicado) {
      // Sem isto o post existe no banco e nao aparece: as paginas que o
      // listam foram servidas do cache montado antes de ele existir.
      revalidatePath(BLOG_INDEX);
      revalidatePath(hrefDoPost(post.slug));
      revalidatePath("/");
      // O sitemap tambem e montado no build: sem isto, o post existe, abre
      // pela URL e nunca e anunciado ao buscador.
      revalidatePath("/sitemap.xml");
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (erro) {
    console.error("[painel] falha ao salvar post:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar o post." }, { status: 502 });
  }
}

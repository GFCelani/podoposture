import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { htmlParaMarkdown } from "@/lib/html-para-markdown";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { resumoAutomatico } from "@/lib/markdown";
import { bancoConfigurado, registrarAuditoria } from "@/lib/painel-db";
import { apagarPagina, atualizarPagina, buscarPaginaPorId } from "@/lib/paginas-db";
import { camposDaPagina, validarPagina, type PaginaDoPainel } from "@/lib/paginas-tipos";

import { revalidarPaginas } from "../revalidar";

/** Uma pagina no painel: ler, salvar, apagar. Espelho de api/painel/posts/[id]. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Contexto = { params: Promise<{ id: string }> };

/** Pagina que veio do codigo (`formato: html`) abre convertida para Markdown. */
function comoOEditorVe(pagina: PaginaDoPainel): PaginaDoPainel {
  return pagina.formato === "html" ? { ...pagina, corpo: htmlParaMarkdown(pagina.corpo) } : pagina;
}

/** Quebra de linha do navegador e espaco das pontas nao contam como edicao. */
const semRuido = (texto: string) => texto.replace(/\r\n?/g, "\n").trim();

async function preparar(ctx: Contexto): Promise<{ ok: true; id: string } | { ok: false; resposta: NextResponse }> {
  const auth = await exigirSessao();
  if (!auth.ok) return { ok: false, resposta: auth.resposta };
  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return { ok: false, resposta: NextResponse.json({ erro: "Página não encontrada." }, { status: 404 }) };
  }
  if (!bancoConfigurado()) {
    return {
      ok: false,
      resposta: NextResponse.json({ erro: "O banco de dados ainda não está configurado neste servidor." }, { status: 503 }),
    };
  }
  return { ok: true, id };
}

export async function GET(_req: Request, ctx: Contexto) {
  const pronto = await preparar(ctx);
  if (!pronto.ok) return pronto.resposta;
  try {
    const pagina = await buscarPaginaPorId(pronto.id);
    if (!pagina) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    return NextResponse.json({ pagina: comoOEditorVe(pagina) });
  } catch (erro) {
    console.error("[painel] falha ao ler pagina:", erro);
    return NextResponse.json({ erro: "Não foi possível ler a página." }, { status: 502 });
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
  const campos = camposDaPagina(bruto as Record<string, unknown>);
  if (!campos.resumo) campos.resumo = resumoAutomatico(campos.corpo);
  try {
    const atual = await buscarPaginaPorId(pronto.id);
    if (!atual) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    const erros = validarPagina(campos, { capaAceita: atual.capa });
    if (Object.keys(erros).length > 0) {
      return NextResponse.json({ erro: "Confira os campos destacados.", erros }, { status: 400 });
    }
    // Pagina do codigo cujo texto ela nao mexeu: o corpo continua o HTML de
    // sempre. Mexeu no texto: vai o Markdown do editor.
    let formato: PaginaDoPainel["formato"] = "markdown";
    if (atual.formato === "html" && semRuido(campos.corpo) === semRuido(htmlParaMarkdown(atual.corpo))) {
      campos.corpo = atual.corpo;
      formato = "html";
    }
    const salva = await atualizarPagina(pronto.id, campos, formato);
    if (!salva) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    await registrarAuditoria("pagina-editada", salva.pagina.slug, ipDaRequisicao(await headers()));
    revalidarPaginas(salva.pagina.slug);
    return NextResponse.json({ pagina: comoOEditorVe(salva.pagina) });
  } catch (erro) {
    console.error("[painel] falha ao atualizar pagina:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar a página." }, { status: 502 });
  }
}

export async function DELETE(_req: Request, ctx: Contexto) {
  const pronto = await preparar(ctx);
  if (!pronto.ok) return pronto.resposta;
  try {
    const slug = await apagarPagina(pronto.id);
    if (!slug) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    await registrarAuditoria("pagina-apagada", slug, ipDaRequisicao(await headers()));
    revalidarPaginas(slug);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[painel] falha ao apagar pagina:", erro);
    return NextResponse.json({ erro: "Não foi possível apagar a página." }, { status: 502 });
  }
}

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { exigirSessao } from "@/lib/guarda";
import { htmlParaMarkdown } from "@/lib/html-para-markdown";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { resumoAutomatico } from "@/lib/markdown";
import { bancoConfigurado, registrarAuditoria } from "@/lib/painel-db";
import { paginasDoAcervo } from "@/lib/pagina-do-acervo";
import { apagarPagina, atualizarPagina, buscarPaginaPorId } from "@/lib/paginas-db";
import { fotosConhecidas, modeloDaPagina } from "@/lib/paginas-antigas";
import { camposDaPagina, validarPagina, type PaginaDoPainel } from "@/lib/paginas-tipos";
import { VersaoDesatualizada, lerVersao } from "@/lib/versao-do-texto";

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

/** 409: a pagina mudou depois que o editor a carregou; nada foi gravado (ver api/painel/posts/[id]). */
function conflito(atual: PaginaDoPainel) {
  return NextResponse.json(
    { erro: "Esta página foi alterada em outra aba ou aparelho, e nada foi salvo agora.", conflito: "versao", pagina: comoOEditorVe(atual) },
    { status: 409 },
  );
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
    // Pagina antiga: a previa precisa do registro das fotos para po-las onde o site poe.
    const fotosDoRegistro =
      modeloDaPagina(pagina.slug) === "antigo" ? fotosConhecidas(pagina.slug, await lerConteudoDoSite()) : undefined;
    return NextResponse.json({ pagina: { ...comoOEditorVe(pagina), ...(fotosDoRegistro ? { fotosDoRegistro } : {}) } });
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
    // Sem a versao que o editor carregou, e' conflito (ver api/painel/posts/[id]).
    const versao = lerVersao((bruto as { versao?: unknown }).versao);
    if (!versao) return conflito(atual);
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
    } else if (modeloDaPagina(atual.slug) === "antigo") {
      // Pagina do codigo ja editada que voltou ao texto de origem (desfazer
      // uma troca de foto, por exemplo): volta tambem o HTML de origem, o
      // mesmo que a importacao gravou, e nao uma copia dele em Markdown.
      const slug = atual.slug.normalize("NFC");
      const doCodigo = paginasDoAcervo(await lerConteudoDoSite()).find((p) => p.slug === slug);
      if (doCodigo && semRuido(campos.corpo) === semRuido(htmlParaMarkdown(doCodigo.corpo))) {
        campos.corpo = doCodigo.corpo;
        formato = "html";
      }
    }
    const salva = await atualizarPagina(pronto.id, campos, formato, versao);
    if (!salva) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    await registrarAuditoria("pagina-editada", salva.pagina.slug, ipDaRequisicao(await headers()));
    revalidarPaginas(salva.pagina.slug);
    return NextResponse.json({ pagina: comoOEditorVe(salva.pagina) });
  } catch (erro) {
    if (erro instanceof VersaoDesatualizada) return conflito(erro.atual as PaginaDoPainel);
    console.error("[painel] falha ao atualizar pagina:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar a página." }, { status: 502 });
  }
}

export async function DELETE(req: Request, ctx: Contexto) {
  const pronto = await preparar(ctx);
  if (!pronto.ok) return pronto.resposta;
  try {
    // Apaga so a versao que a lista mostrava (?versao=): mudou no meio, avisa.
    const versao = lerVersao(new URL(req.url).searchParams.get("versao"));
    if (!versao) {
      const atual = await buscarPaginaPorId(pronto.id);
      return atual ? conflito(atual) : NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    }
    const slug = await apagarPagina(pronto.id, versao);
    if (!slug) return NextResponse.json({ erro: "Página não encontrada." }, { status: 404 });
    await registrarAuditoria("pagina-apagada", slug, ipDaRequisicao(await headers()));
    revalidarPaginas(slug);
    return NextResponse.json({ ok: true });
  } catch (erro) {
    if (erro instanceof VersaoDesatualizada) return conflito(erro.atual as PaginaDoPainel);
    console.error("[painel] falha ao apagar pagina:", erro);
    return NextResponse.json({ erro: "Não foi possível apagar a página." }, { status: 502 });
  }
}

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { resumoAutomatico } from "@/lib/markdown";
import { bancoConfigurado, registrarAuditoria } from "@/lib/painel-db";
import { envioMudaOSite, repetirTiraDoAr } from "@/lib/painel-tipos";
import { PaginaTiraDoArSemConfirmacao, buscarPaginaPorId, criarPagina, listarTodasAsPaginas } from "@/lib/paginas-db";
import { camposDaPagina, validarPagina } from "@/lib/paginas-tipos";

import { revalidarPaginas } from "./revalidar";

/**
 * As paginas do site no painel: a lista e a pagina nova. Espelho de
 * api/painel/posts (mesma guarda, mesmo limite, mesma idempotencia pelo id
 * gerado no editor, mesma recusa de tirar do ar sem confirmacao).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const JA_ESTA_PUBLICADA =
  "Esta página já está publicada no site. Para tirá-la do ar, abra ela na aba “Páginas do site” e use “Tirar do site e guardar”.";

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
  if (!bancoConfigurado()) return NextResponse.json({ paginas: [], semBanco: true });
  try {
    return NextResponse.json({ paginas: await listarTodasAsPaginas(), semBanco: false });
  } catch (erro) {
    console.error("[painel] falha ao listar paginas:", erro);
    return NextResponse.json({ erro: "Não foi possível ler as páginas." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;
  if (!bancoConfigurado()) {
    return NextResponse.json({ erro: "O banco de dados ainda não está configurado neste servidor." }, { status: 503 });
  }
  const bruto = await lerCorpo(req);
  if (!bruto) return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  const campos = camposDaPagina(bruto);
  if (!campos.resumo) campos.resumo = resumoAutomatico(campos.corpo);
  const id = typeof bruto.id === "string" && UUID.test(bruto.id) ? bruto.id.toLowerCase() : undefined;
  try {
    const erros = validarPagina(campos);
    if (Object.keys(erros).length > 0) {
      return NextResponse.json({ erro: "Confira os campos destacados.", erros }, { status: 400 });
    }
    const existente = id ? await buscarPaginaPorId(id) : null;
    if (repetirTiraDoAr(existente, campos)) {
      return NextResponse.json({ erro: JA_ESTA_PUBLICADA }, { status: 409 });
    }
    const { pagina, estavaPublicada } = await criarPagina(campos, id);
    await registrarAuditoria(
      pagina.publicado ? "pagina-publicada" : "pagina-rascunho",
      pagina.slug,
      ipDaRequisicao(await headers()),
    );
    if (envioMudaOSite({ publicado: estavaPublicada }, pagina)) revalidarPaginas(pagina.slug);
    return NextResponse.json({ pagina }, { status: 201 });
  } catch (erro) {
    if (erro instanceof PaginaTiraDoArSemConfirmacao) {
      return NextResponse.json({ erro: JA_ESTA_PUBLICADA }, { status: 409 });
    }
    console.error("[painel] falha ao salvar pagina:", erro);
    return NextResponse.json({ erro: "Não foi possível salvar a página." }, { status: 502 });
  }
}

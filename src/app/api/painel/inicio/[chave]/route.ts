import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  descartarRascunho,
  gravarRascunho,
  publicarSecao,
  voltarAoPadrao,
  type LinhaDeConteudo,
} from "@/lib/conteudo-db";
import { estadoDaSecao } from "@/lib/conteudo-do-site";
import {
  ehChaveDeSecao,
  validarSecao,
  type ChaveDeSecao,
  type RespostaDaSecao,
} from "@/lib/conteudo-tipos";
import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { bancoConfigurado, registrarAuditoria } from "@/lib/painel-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A maior secao (servicos, 15 itens no teto) fica bem abaixo disto. */
const TAMANHO_MAXIMO = 256 * 1024;

type Contexto = { params: Promise<{ chave: string }> };

function secaoInexistente() {
  return NextResponse.json({ erro: "Essa seção não existe." }, { status: 404 });
}

function semBanco() {
  return NextResponse.json(
    { erro: "O banco de dados ainda não está configurado neste servidor, então não dá para salvar agora." },
    { status: 503 },
  );
}

function requisicaoInvalida() {
  return NextResponse.json({ erro: "Requisição inválida. Recarregue a página e tente de novo." }, { status: 400 });
}

function falhaAoGravar(erro: unknown) {
  console.error("[painel] falha ao gravar secao da pagina inicial:", erro);
  return NextResponse.json(
    { erro: "Não foi possível salvar agora. O texto continua na tela: tente de novo em instantes." },
    { status: 502 },
  );
}

function respostaDaSecao(chave: ChaveDeSecao, linha: LinhaDeConteudo | null) {
  const corpo: RespostaDaSecao = { chave, secao: estadoDaSecao(chave, linha) };
  return NextResponse.json(corpo);
}

/**
 * O conteudo aparece no site inteiro (contato no cabecalho, no rodape e no
 * JSON-LD; faixa social no fim de toda pagina), entao o que muda o site
 * invalida a arvore pelo layout raiz. Uma regra so, em vez de decidir por
 * secao o que e global: errar essa decisao deixaria 88 paginas com o telefone
 * antigo. O custo e cada pagina regenerar na proxima visita.
 */
function revalidarOSite() {
  revalidatePath("/", "layout");
}

/** Salva o rascunho (so a previa ve) ou publica (vai ao site e zera o rascunho). */
export async function PUT(req: Request, ctx: Contexto) {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  const { chave } = await ctx.params;
  if (!ehChaveDeSecao(chave)) return secaoInexistente();
  if (!bancoConfigurado()) return semBanco();

  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) {
    return leitura.motivo === "grande"
      ? NextResponse.json({ erro: "O conteúdo enviado é grande demais para uma seção." }, { status: 413 })
      : NextResponse.json({ erro: "O envio foi interrompido. Tente salvar de novo." }, { status: 400 });
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(leitura.texto);
  } catch {
    return requisicaoInvalida();
  }
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return requisicaoInvalida();

  const { dados, acao } = bruto as { dados?: unknown; acao?: unknown };
  if (acao !== "rascunho" && acao !== "publicar") {
    return NextResponse.json({ erro: "Escolha entre salvar o rascunho e publicar." }, { status: 400 });
  }

  // A mesma validacao que o editor usa: o que passa aqui e o que a tela aceitou.
  const validacao = validarSecao(chave, dados);
  if (!validacao.ok) {
    return NextResponse.json(
      { erro: "Confira os campos destacados.", erros: validacao.erros },
      { status: 400 },
    );
  }

  try {
    const publicar = acao === "publicar";
    const linha = publicar
      ? await publicarSecao(chave, validacao.dados)
      : await gravarRascunho(chave, validacao.dados);

    await registrarAuditoria(
      publicar ? "inicio-publicado" : "inicio-rascunho",
      chave,
      ipDaRequisicao(await headers()),
    );
    if (publicar) revalidarOSite();

    return respostaDaSecao(chave, linha);
  } catch (erro) {
    return falhaAoGravar(erro);
  }
}

/**
 * `?alvo=rascunho` descarta o rascunho; `?alvo=publicado` tira o texto
 * publicado e a secao volta ao padrao do codigo (o rascunho, se houver, fica).
 */
export async function DELETE(req: Request, ctx: Contexto) {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  const { chave } = await ctx.params;
  if (!ehChaveDeSecao(chave)) return secaoInexistente();
  if (!bancoConfigurado()) return semBanco();

  const alvo = new URL(req.url).searchParams.get("alvo");
  if (alvo !== "rascunho" && alvo !== "publicado") {
    return NextResponse.json(
      { erro: "Diga o que descartar: o rascunho ou o texto publicado." },
      { status: 400 },
    );
  }

  try {
    const origem = ipDaRequisicao(await headers());

    if (alvo === "rascunho") {
      const linha = await descartarRascunho(chave);
      await registrarAuditoria("inicio-rascunho", `${chave}: descartado`, origem);
      return respostaDaSecao(chave, linha);
    }

    const linha = await voltarAoPadrao(chave);
    await registrarAuditoria("inicio-restaurado", chave, origem);
    revalidarOSite();
    return respostaDaSecao(chave, linha);
  } catch (erro) {
    return falhaAoGravar(erro);
  }
}

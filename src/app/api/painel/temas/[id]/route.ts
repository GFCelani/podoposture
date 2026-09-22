import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { bancoConfigurado, registrarAuditoria } from "@/lib/painel-db";
import {
  DestinoInvalido,
  NomeDeTemaInvalido,
  TemaRepetido,
  apagarTema,
  renomearTema,
} from "@/lib/temas-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO = 2 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAO_ENCONTRADO = "Esse tema não existe mais: ele pode ter sido apagado em outra janela.";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Guarda + validacoes comuns aos verbos, como em posts/[id]. Existe como
 * funcao unica para nenhum verbo esquecer a checagem.
 */
async function preparar(
  req: Request,
  ctx: Contexto,
): Promise<{ ok: true; id: string; corpo: Record<string, unknown> } | { ok: false; resposta: NextResponse }> {
  const auth = await exigirSessao();
  if (!auth.ok) return { ok: false, resposta: auth.resposta };

  const { id } = await ctx.params;
  if (!UUID.test(id)) return { ok: false, resposta: NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 }) };

  if (!bancoConfigurado()) {
    return {
      ok: false,
      resposta: NextResponse.json({ erro: "O banco de dados ainda não está configurado neste servidor." }, { status: 503 }),
    };
  }

  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) {
    return { ok: false, resposta: NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }) };
  }
  if (!leitura.texto.trim()) return { ok: true, id, corpo: {} };
  try {
    const corpo = JSON.parse(leitura.texto);
    if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) throw new Error("forma");
    return { ok: true, id, corpo: corpo as Record<string, unknown> };
  } catch {
    return { ok: false, resposta: NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }) };
  }
}

/**
 * Tema que aparece em pagina muda o site inteiro: a linha de cima de cada
 * texto, o indice do blog, os filtros e os temas da home. Refaz tudo, como a
 * edicao da pagina inicial ja faz.
 */
function refazerOSite() {
  revalidatePath("/", "layout");
}

/** Renomeia. Os textos do tema vao junto (a chave do banco leva o nome novo). */
export async function PUT(req: Request, ctx: Contexto) {
  const pronto = await preparar(req, ctx);
  if (!pronto.ok) return pronto.resposta;

  const nome = pronto.corpo.nome;
  if (typeof nome !== "string") return NextResponse.json({ erro: "Escreva o nome do tema." }, { status: 400 });

  try {
    const r = await renomearTema(pronto.id, nome);
    if (!r) return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
    await registrarAuditoria("tema-renomeado", `${r.antes} -> ${r.tema.nome}`, ipDaRequisicao(await headers()));
    if (r.tema.textos > 0) refazerOSite();
    return NextResponse.json({ tema: r.tema });
  } catch (erro) {
    if (erro instanceof NomeDeTemaInvalido) return NextResponse.json({ erro: erro.message }, { status: 400 });
    if (erro instanceof TemaRepetido) {
      return NextResponse.json({ erro: "Já existe um tema com esse nome." }, { status: 409 });
    }
    console.error("[painel] falha ao renomear tema:", erro);
    return NextResponse.json({ erro: "Não foi possível renomear o tema." }, { status: 502 });
  }
}

/**
 * Apaga. Com textos no tema, o corpo precisa dizer para onde eles vao:
 * `{ "destino": "<id de outro tema>" }` ou `{ "destino": null }` (sem tema).
 * Sem `destino`, responde 409 com quantos textos ha — e nada muda.
 */
export async function DELETE(req: Request, ctx: Contexto) {
  const pronto = await preparar(req, ctx);
  if (!pronto.ok) return pronto.resposta;

  let destino: { para: string | null } | undefined;
  if ("destino" in pronto.corpo) {
    const d = pronto.corpo.destino;
    if (d === null) destino = { para: null };
    else if (typeof d === "string" && UUID.test(d)) destino = { para: d };
    else return NextResponse.json({ erro: "Escolha para onde os textos vão." }, { status: 400 });
  }

  try {
    const r = await apagarTema(pronto.id, destino);
    if (r.tipo === "nao-encontrado") return NextResponse.json({ erro: NAO_ENCONTRADO }, { status: 404 });
    if (r.tipo === "tem-textos") {
      return NextResponse.json(
        {
          erro: `Este tema tem ${r.textos} ${r.textos === 1 ? "texto" : "textos"}. Escolha para onde ${r.textos === 1 ? "ele vai" : "eles vão"} antes de apagar.`,
          textos: r.textos,
        },
        { status: 409 },
      );
    }
    await registrarAuditoria(
      "tema-apagado",
      `${pronto.id}${r.movidos ? ` (${r.movidos} textos movidos)` : ""}`,
      ipDaRequisicao(await headers()),
    );
    if (r.movidos > 0) refazerOSite();
    return NextResponse.json({ ok: true, movidos: r.movidos });
  } catch (erro) {
    if (erro instanceof DestinoInvalido) {
      return NextResponse.json(
        { erro: "O tema de destino não existe mais, ou é o próprio tema. Escolha outro." },
        { status: 400 },
      );
    }
    console.error("[painel] falha ao apagar tema:", erro);
    return NextResponse.json({ erro: "Não foi possível apagar o tema." }, { status: 502 });
  }
}

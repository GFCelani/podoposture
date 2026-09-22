import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerCorpoLimitado } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { bancoConfigurado, registrarAuditoria } from "@/lib/painel-db";
import { NomeDeTemaInvalido, TemaRepetido, criarTema, listarTemas } from "@/lib/temas-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Um nome de tema. Nao ha motivo para passar de 2 KB. */
const TAMANHO_MAXIMO = 2 * 1024;

const SEM_BANCO = "O banco de dados ainda não está configurado neste servidor.";

/** Os temas, com quantos textos cada um tem. */
export async function GET() {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  if (!bancoConfigurado()) return NextResponse.json({ temas: [], semBanco: true });
  try {
    return NextResponse.json({ temas: await listarTemas(), semBanco: false });
  } catch (erro) {
    console.error("[painel] falha ao listar temas:", erro);
    return NextResponse.json({ erro: "Não foi possível ler os temas." }, { status: 502 });
  }
}

/**
 * Cria um tema. Tema novo nao muda o site: o blog so lista tema que tem pelo
 * menos um texto publicado, entao nao ha pagina para refazer.
 */
export async function POST(req: Request) {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  if (!bancoConfigurado()) return NextResponse.json({ erro: SEM_BANCO }, { status: 503 });

  const leitura = await lerCorpoLimitado(req, TAMANHO_MAXIMO);
  if (!leitura.ok) return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  let nome: unknown;
  try {
    nome = (JSON.parse(leitura.texto) as { nome?: unknown })?.nome;
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  if (typeof nome !== "string") return NextResponse.json({ erro: "Escreva o nome do tema." }, { status: 400 });

  try {
    const tema = await criarTema(nome);
    await registrarAuditoria("tema-criado", tema.nome, ipDaRequisicao(await headers()));
    return NextResponse.json({ tema }, { status: 201 });
  } catch (erro) {
    if (erro instanceof NomeDeTemaInvalido) return NextResponse.json({ erro: erro.message }, { status: 400 });
    if (erro instanceof TemaRepetido) {
      return NextResponse.json({ erro: "Já existe um tema com esse nome." }, { status: 409 });
    }
    console.error("[painel] falha ao criar tema:", erro);
    return NextResponse.json({ erro: "Não foi possível criar o tema." }, { status: 502 });
  }
}

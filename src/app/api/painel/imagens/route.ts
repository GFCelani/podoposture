import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerBytesLimitados } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { dimensoesDoWebp, nomeDoArquivo } from "@/lib/imagem-webp";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { bancoConfigurado, guardarImagem, registrarAuditoria } from "@/lib/painel-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recebe a imagem do post.
 *
 * O navegador ja manda WebP: o painel decodifica, reduz para no maximo 1600px
 * de largura e converte antes de enviar. Isso tira do servidor a necessidade de
 * processar imagem — nada de `sharp` numa funcao serverless — e faz o arquivo
 * que trafega ser o mesmo que sera servido.
 *
 * O servidor nao acredita em nada disso. Ele confere os bytes magicos e le a
 * largura e a altura do proprio cabecalho do arquivo, porque essas medidas
 * viram parte do endereco publico, e endereco publico nao pode sair de um campo
 * que o cliente preenche.
 */

/** 1600px de WebP com qualidade 0,82 fica bem abaixo disso. */
const TAMANHO_MAXIMO = 3 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await exigirSessao();
  if (!auth.ok) return auth.resposta;

  if (!bancoConfigurado()) {
    return NextResponse.json(
      { erro: "O banco de dados ainda não está configurado neste servidor." },
      { status: 503 },
    );
  }

  const leitura = await lerBytesLimitados(req, TAMANHO_MAXIMO);
  if (!leitura.ok) {
    return leitura.motivo === "grande"
      ? NextResponse.json({ erro: "Imagem grande demais (máximo 3 MB)." }, { status: 413 })
      : NextResponse.json({ erro: "O envio foi interrompido." }, { status: 400 });
  }

  const medida = dimensoesDoWebp(leitura.bytes);
  if (!medida) {
    return NextResponse.json(
      { erro: "Arquivo não reconhecido. Envie uma imagem pelo próprio painel." },
      { status: 400 },
    );
  }

  const resumo = createHash("sha256").update(leitura.bytes).digest("hex");
  const arquivo = nomeDoArquivo(resumo, medida);

  try {
    await guardarImagem(resumo, leitura.bytes, medida.largura, medida.altura);
    await registrarAuditoria("imagem-enviada", arquivo, ipDaRequisicao(await headers()));
    return NextResponse.json(
      { url: `/img/post/${arquivo}`, largura: medida.largura, altura: medida.altura },
      { status: 201 },
    );
  } catch (erro) {
    console.error("[painel] falha ao guardar imagem:", erro);
    return NextResponse.json({ erro: "Não foi possível guardar a imagem." }, { status: 502 });
  }
}

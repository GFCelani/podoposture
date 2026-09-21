import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { lerBytesLimitados } from "@/lib/corpo";
import { exigirSessao } from "@/lib/guarda";
import { dimensoesDoJpeg } from "@/lib/imagem-jpeg";
import { dimensoesDoWebp, nomeDoArquivo, type Dimensoes, type TipoDeImagem } from "@/lib/imagem-webp";
import { ipDaRequisicao } from "@/lib/limite-de-tentativas";
import { bancoConfigurado, guardarImagem, registrarAuditoria } from "@/lib/painel-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recebe uma imagem enviada pelo painel (capa, foto no texto, foto da home).
 *
 * O navegador ja manda a imagem pronta: o painel decodifica, reduz a largura e
 * converte para WebP antes de enviar (`src/lib/preparar-imagem.ts`). Onde o
 * navegador nao sabe gerar WebP — o Safari —, ele manda JPEG. Isso tira do
 * servidor a necessidade de processar imagem — nada de `sharp` numa funcao
 * serverless — e faz o arquivo que trafega ser o mesmo que sera servido.
 *
 * O servidor nao acredita em nada disso. Ele ignora o `Content-Type` do pedido,
 * reconhece o formato pelos proprios bytes e le a largura e a altura do
 * cabecalho do arquivo, porque formato e medidas viram parte do endereco
 * publico, e endereco publico nao pode sair de um campo que o cliente preenche.
 */

/** 1600px de WebP a 0,82 ou de JPEG a 0,85 fica bem abaixo disso. */
const TAMANHO_MAXIMO = 3 * 1024 * 1024;

function reconhecer(bytes: Uint8Array): (Dimensoes & { tipo: TipoDeImagem }) | null {
  const webp = dimensoesDoWebp(bytes);
  if (webp) return { ...webp, tipo: "image/webp" };
  const jpeg = dimensoesDoJpeg(bytes);
  if (jpeg) return { ...jpeg, tipo: "image/jpeg" };
  return null;
}

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
      : NextResponse.json({ erro: "O envio foi interrompido. Tente enviar a imagem de novo." }, { status: 400 });
  }

  const medida = reconhecer(leitura.bytes);
  if (!medida) {
    // Sem "envie pelo proprio painel": quem ve esta frase ja esta no painel.
    return NextResponse.json(
      { erro: "Não conseguimos ler essa imagem. Tente outra foto, em JPG ou PNG." },
      { status: 400 },
    );
  }

  const resumo = createHash("sha256").update(leitura.bytes).digest("hex");
  const arquivo = nomeDoArquivo(resumo, medida, medida.tipo);

  try {
    await guardarImagem(resumo, leitura.bytes, medida.largura, medida.altura, medida.tipo);
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

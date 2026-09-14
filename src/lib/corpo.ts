/**
 * Leitura do corpo da requisicao com teto de tamanho.
 *
 * O teto e contado nos bytes que realmente chegam, e nao no cabecalho
 * `content-length`: esse cabecalho some em requisicao chunked e pode mentir em
 * qualquer requisicao. Confiar nele e aceitar que alguem declare 10 bytes e
 * mande 500 MB.
 *
 * A leitura e cancelada no instante em que o teto e ultrapassado — o resto nem
 * chega a ser alocado.
 */

export type LeituraDoCorpo =
  | { ok: true; texto: string }
  | { ok: false; motivo: "grande" | "interrompida" };

export async function lerCorpoLimitado(
  req: Request,
  maximo: number,
  prazoMs?: number,
): Promise<LeituraDoCorpo> {
  if (!req.body) return { ok: true, texto: "" };

  const leitor = req.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;

  // O prazo, quando existe, vale para a leitura INTEIRA, e nao por pedaco: quem
  // manda um byte por segundo respeita qualquer prazo por pedaco e mesmo assim
  // segura a leitura pelo tempo que quiser. Quem chama usa isto onde a leitura
  // ocupa um recurso disputado (a vaga de entrada do painel).
  let despertador: ReturnType<typeof setTimeout> | undefined;
  const prazo =
    prazoMs === undefined
      ? null
      : new Promise<"prazo">((resolver) => {
          despertador = setTimeout(() => resolver("prazo"), prazoMs);
        });

  try {
    for (;;) {
      const passo = prazo ? await Promise.race([leitor.read(), prazo]) : await leitor.read();
      if (passo === "prazo") {
        await leitor.cancel().catch(() => {});
        return { ok: false, motivo: "interrompida" };
      }
      const { done, value } = passo;
      if (done) break;
      total += value.byteLength;
      if (total > maximo) {
        await leitor.cancel();
        return { ok: false, motivo: "grande" };
      }
      pedacos.push(value);
    }
  } catch {
    return { ok: false, motivo: "interrompida" };
  } finally {
    clearTimeout(despertador);
  }

  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const pedaco of pedacos) {
    bytes.set(pedaco, posicao);
    posicao += pedaco.byteLength;
  }
  return { ok: true, texto: new TextDecoder().decode(bytes) };
}

/** Mesma leitura, devolvendo os bytes crus — usada no envio de imagem. */
export async function lerBytesLimitados(
  req: Request,
  maximo: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; motivo: "grande" | "interrompida" }> {
  if (!req.body) return { ok: true, bytes: new Uint8Array(0) };

  const leitor = req.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximo) {
        await leitor.cancel();
        return { ok: false, motivo: "grande" };
      }
      pedacos.push(value);
    }
  } catch {
    return { ok: false, motivo: "interrompida" };
  }

  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const pedaco of pedacos) {
    bytes.set(pedaco, posicao);
    posicao += pedaco.byteLength;
  }
  return { ok: true, bytes };
}

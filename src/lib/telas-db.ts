import "server-only";

import { bancoConfigurado, bancoDoPainel } from "./painel-db";
import type { MedidaDaTela } from "./telas-do-painel";

/**
 * As telas de quem entrou no painel (lib/telas-do-painel.ts), no Postgres.
 * Modulo proprio porque e' dono da propria tabela (regra de painel-db.ts).
 *
 * Uma linha por login certo, presa a sessao pelo id do bilhete. So o painel
 * grava aqui; visitante do site nunca. Ficam as 500 mais recentes.
 *
 * Toda consulta e' parametrizada, pela tag `sql`.
 */

export const MAX_TELAS = 500;

export type TelaRegistrada = MedidaDaTela & { id: number; sessao: string; userAgent: string; em: string };

type Linha = {
  id: string;
  sessao: string;
  janela_l: number;
  janela_a: number;
  externa_l: number;
  externa_a: number;
  dpr: string;
  tela_l: number;
  tela_a: number;
  tela_util_l: number;
  tela_util_a: number;
  user_agent: string;
  em: Date;
};

let tabelaPronta = false;

async function garantirTabelaDeTelas() {
  if (tabelaPronta) return;
  const sql = bancoDoPainel();
  await sql`
    CREATE TABLE IF NOT EXISTS painel_telas (
      id          BIGSERIAL PRIMARY KEY,
      sessao      TEXT NOT NULL,
      janela_l    INT NOT NULL,
      janela_a    INT NOT NULL,
      externa_l   INT NOT NULL,
      externa_a   INT NOT NULL,
      dpr         NUMERIC(8, 4) NOT NULL,
      tela_l      INT NOT NULL,
      tela_a      INT NOT NULL,
      tela_util_l INT NOT NULL,
      tela_util_a INT NOT NULL,
      user_agent  TEXT NOT NULL,
      em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  tabelaPronta = true;
}

/** Nunca lanca: a medida falhar nao pode desfazer um login que deu certo. */
export async function registrarTela(sessao: string, m: MedidaDaTela, userAgent: string): Promise<void> {
  if (!bancoConfigurado()) return;
  try {
    await garantirTabelaDeTelas();
    const sql = bancoDoPainel();
    await sql`
      INSERT INTO painel_telas (sessao, janela_l, janela_a, externa_l, externa_a, dpr,
                                tela_l, tela_a, tela_util_l, tela_util_a, user_agent)
      VALUES (${sessao.slice(0, 64)}, ${m.janelaL}, ${m.janelaA}, ${m.externaL}, ${m.externaA},
              ${m.devicePixelRatio}, ${m.telaL}, ${m.telaA}, ${m.telaUtilL}, ${m.telaUtilA},
              ${userAgent.slice(0, 400)})`;
    await sql`
      DELETE FROM painel_telas WHERE id < (
        SELECT COALESCE(MIN(id), 0) FROM (
          SELECT id FROM painel_telas ORDER BY id DESC LIMIT ${MAX_TELAS}
        ) recentes
      )`;
  } catch (erro) {
    console.error("[painel] falha ao registrar a tela:", erro);
  }
}

/** As mais recentes primeiro. */
export async function listarTelas(limite = 50): Promise<TelaRegistrada[]> {
  await garantirTabelaDeTelas();
  const sql = bancoDoPainel();
  const linhas = await sql<Linha[]>`
    SELECT id, sessao, janela_l, janela_a, externa_l, externa_a, dpr, tela_l, tela_a,
           tela_util_l, tela_util_a, user_agent, em
    FROM painel_telas
    ORDER BY id DESC
    LIMIT ${Math.max(1, Math.min(limite, MAX_TELAS))}`;
  return linhas.map((l) => ({
    id: Number(l.id),
    sessao: l.sessao,
    janelaL: l.janela_l,
    janelaA: l.janela_a,
    externaL: l.externa_l,
    externaA: l.externa_a,
    devicePixelRatio: Number(l.dpr),
    telaL: l.tela_l,
    telaA: l.tela_a,
    telaUtilL: l.tela_util_l,
    telaUtilA: l.tela_util_a,
    userAgent: l.user_agent,
    em: l.em.toISOString(),
  }));
}

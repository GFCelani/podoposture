import "server-only";

import { bancoConfigurado, bancoDoPainel } from "./painel-db";
import type { MedidaParcial, SituacaoDaMedida } from "./telas-do-painel";

/**
 * As telas de quem entrou no painel (lib/telas-do-painel.ts), no Postgres.
 * Modulo proprio porque e' dono da propria tabela (regra de painel-db.ts).
 *
 * Uma linha por login certo, presa a sessao pelo id do bilhete, SEMPRE: com
 * a medida inteira, com os campos que vieram validos, ou sem medida nenhuma
 * (o navegador ainda com o painel antigo, que nao media), marcada em
 * `medida`. A versao do painel que fez o login vai junto. So o painel grava
 * aqui; visitante do site nunca. Ficam as 500 mais recentes.
 *
 * Toda consulta e' parametrizada, pela tag `sql`.
 */

export const MAX_TELAS = 500;

export type TelaRegistrada = MedidaParcial & {
  id: number;
  sessao: string;
  userAgent: string;
  em: string;
  medida: SituacaoDaMedida;
  /** A versao do painel no navegador; vazia = anterior a este campo. */
  versao: string;
};

type Linha = {
  id: string;
  sessao: string;
  janela_l: number | null;
  janela_a: number | null;
  externa_l: number | null;
  externa_a: number | null;
  dpr: string | null;
  tela_l: number | null;
  tela_a: number | null;
  tela_util_l: number | null;
  tela_util_a: number | null;
  user_agent: string;
  medida: SituacaoDaMedida;
  versao: string;
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
  // A primeira versao exigia a medida inteira e descartava o resto; hoje todo
  // login grava, com o que veio. ALTER, e nao o CREATE acima, para o banco que
  // ja tinha a tabela mudar igual ao novo.
  await sql`
    ALTER TABLE painel_telas
      ALTER COLUMN janela_l DROP NOT NULL,
      ALTER COLUMN janela_a DROP NOT NULL,
      ALTER COLUMN externa_l DROP NOT NULL,
      ALTER COLUMN externa_a DROP NOT NULL,
      ALTER COLUMN dpr DROP NOT NULL,
      ALTER COLUMN tela_l DROP NOT NULL,
      ALTER COLUMN tela_a DROP NOT NULL,
      ALTER COLUMN tela_util_l DROP NOT NULL,
      ALTER COLUMN tela_util_a DROP NOT NULL`;
  await sql`ALTER TABLE painel_telas ADD COLUMN IF NOT EXISTS medida TEXT NOT NULL DEFAULT 'completa'`;
  await sql`ALTER TABLE painel_telas ADD COLUMN IF NOT EXISTS versao TEXT NOT NULL DEFAULT ''`;
  tabelaPronta = true;
}

/** Nunca lanca: a medida falhar nao pode desfazer um login que deu certo. */
export async function registrarTela(
  sessao: string,
  m: MedidaParcial,
  situacao: SituacaoDaMedida,
  versao: string,
  userAgent: string,
): Promise<void> {
  if (!bancoConfigurado()) return;
  try {
    await garantirTabelaDeTelas();
    const sql = bancoDoPainel();
    await sql`
      INSERT INTO painel_telas (sessao, janela_l, janela_a, externa_l, externa_a, dpr,
                                tela_l, tela_a, tela_util_l, tela_util_a, user_agent, medida, versao)
      VALUES (${sessao.slice(0, 64)}, ${m.janelaL}, ${m.janelaA}, ${m.externaL}, ${m.externaA},
              ${m.devicePixelRatio}, ${m.telaL}, ${m.telaA}, ${m.telaUtilL}, ${m.telaUtilA},
              ${userAgent.slice(0, 400)}, ${situacao}, ${versao.slice(0, 64)})`;
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
           tela_util_l, tela_util_a, user_agent, medida, versao, em
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
    devicePixelRatio: l.dpr === null ? null : Number(l.dpr),
    telaL: l.tela_l,
    telaA: l.tela_a,
    telaUtilL: l.tela_util_l,
    telaUtilA: l.tela_util_a,
    userAgent: l.user_agent,
    medida: l.medida,
    versao: l.versao,
    em: l.em.toISOString(),
  }));
}

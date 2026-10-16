import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * A tabela de telas mudou de forma em 2026-10-16: a medida deixou de ser
 * obrigatoria (linha parcial e linha sem medida) e ganhou a situacao da
 * medida e a versao do painel. Quem muda a tabela e' o proprio modulo, no
 * primeiro uso (ALTER, garantirTabelaDeTelas).
 *
 * O que importa: o banco que ja tinha a tabela antiga, com linhas, passa a
 * aceitar as linhas novas sem perder nem mudar nenhuma das antigas, e a
 * mudanca pode rodar de novo (outra instancia, outro deploy) sem estrago.
 *
 * Banco proprio (`podoposture_teste_telas`), apagado e recriado a cada
 * execucao, com a tabela criada na forma ANTIGA, como estava no ar.
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();
const BANCO = "podoposture_teste_telas";

function urlDoBanco(url: string, banco: string): string {
  const u = new URL(url.replace("@localhost:", "@127.0.0.1:"));
  u.pathname = `/${banco}`;
  return u.toString();
}

/** A tabela como o commit 345422e a criou, antes desta mudanca. */
const TABELA_ANTIGA = `
  CREATE TABLE painel_telas (
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

const ANTIGAS = Array.from({ length: 12 }, (_, i) => ({
  sessao: `antiga-${i}`,
  janelaL: 1280 + i,
  janelaA: 559,
  externaL: 1296,
  externaA: 680,
  devicePixelRatio: 1.5,
  telaL: 1280,
  telaA: 720,
  telaUtilL: 1280,
  telaUtilA: 672,
  userAgent: `navegador ${i}`,
}));

describe.skipIf(!URL_DE_TESTE)("tabela de telas: a forma nova chega ao banco que ja tinha a antiga", () => {
  const urlOriginal = process.env.DATABASE_URL;
  let banco: postgres.Sql;

  beforeAll(async () => {
    const admin = postgres(urlDoBanco(URL_DE_TESTE!, "postgres"), { max: 1, onnotice: () => {} });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${BANCO} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${BANCO}`);
    await admin.end();

    banco = postgres(urlDoBanco(URL_DE_TESTE!, BANCO), { max: 1, onnotice: () => {} });
    await banco.unsafe(TABELA_ANTIGA);
    for (const [i, t] of ANTIGAS.entries()) {
      await banco`
        INSERT INTO painel_telas (sessao, janela_l, janela_a, externa_l, externa_a, dpr,
                                  tela_l, tela_a, tela_util_l, tela_util_a, user_agent, em)
        VALUES (${t.sessao}, ${t.janelaL}, ${t.janelaA}, ${t.externaL}, ${t.externaA}, ${t.devicePixelRatio},
                ${t.telaL}, ${t.telaA}, ${t.telaUtilL}, ${t.telaUtilA}, ${t.userAgent},
                ${new Date(Date.UTC(2026, 9, 1, 12, i))})`;
    }
    process.env.DATABASE_URL = urlDoBanco(URL_DE_TESTE!, BANCO);
  }, 60_000);

  afterAll(async () => {
    await banco?.end();
    const painel = await import("./painel-db");
    await painel.bancoDoPainel().end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  it("amplia a tabela no primeiro uso, grava as linhas novas e nao perde nenhuma antiga", async () => {
    const antes = await banco`SELECT * FROM painel_telas ORDER BY id`;
    expect(antes).toHaveLength(ANTIGAS.length);

    const telas = await import("./telas-db");
    const { lerMedida } = await import("./telas-do-painel");
    const parcial = lerMedida({ ...ANTIGAS[0], janelaL: "x", devicePixelRatio: Infinity });
    const ausente = lerMedida(undefined);
    expect(parcial.situacao).toBe("parcial");
    expect(ausente.situacao).toBe("ausente");
    await telas.registrarTela("nova-parcial", parcial.medida, parcial.situacao, "versao-nova", "ua parcial");
    await telas.registrarTela("nova-ausente", ausente.medida, ausente.situacao, "versao-nova", "ua ausente");

    // As antigas: as mesmas linhas, com os mesmos valores, e marcadas como
    // completas e anteriores ao registro da versao.
    const depois = await banco`SELECT * FROM painel_telas ORDER BY id`;
    expect(depois).toHaveLength(ANTIGAS.length + 2);
    for (const [i, linha] of antes.entries()) {
      expect(depois[i]).toEqual({ ...linha, medida: "completa", versao: "" });
    }

    const lidas = await telas.listarTelas(100);
    expect(lidas).toHaveLength(ANTIGAS.length + 2);
    const [ausenteLida, parcialLida, ...antigasLidas] = lidas;
    expect(ausenteLida).toMatchObject({ sessao: "nova-ausente", medida: "ausente", versao: "versao-nova", janelaL: null, devicePixelRatio: null });
    expect(parcialLida).toMatchObject({
      sessao: "nova-parcial",
      medida: "parcial",
      janelaL: null,
      janelaA: 559,
      devicePixelRatio: null,
      telaUtilA: 672,
    });
    expect(antigasLidas.map((t) => t.sessao)).toEqual(ANTIGAS.map((t) => t.sessao).reverse());
    expect(antigasLidas.every((t) => t.medida === "completa" && t.versao === "" && t.devicePixelRatio === 1.5)).toBe(true);
  });

  it("a ampliacao roda de novo (outra instancia) sem estrago", async () => {
    vi.resetModules();
    const telas = await import("./telas-db");
    const { lerMedida } = await import("./telas-do-painel");
    const { medida, situacao } = lerMedida({ ...ANTIGAS[1] });
    await telas.registrarTela("outra-instancia", medida, situacao, "versao-nova", "ua");
    const lidas = await telas.listarTelas(100);
    expect(lidas).toHaveLength(ANTIGAS.length + 3);
    expect(lidas[0]).toMatchObject({ sessao: "outra-instancia", medida: "completa", janelaL: 1281 });
    // a instancia anterior continua com a sua conexao: fecha as duas
    const painel = await import("./painel-db");
    await painel.bancoDoPainel().end();
  });
});

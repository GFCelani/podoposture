import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` lanca fora do empacotador do Next, e `posts.ts` usa o apelido
// `@/`, que o vitest deste projeto nao resolve (mesmo motivo de numeros-db.test).
vi.mock("server-only", () => ({}));
vi.mock("./posts", () => ({ BRUTOS_DO_JSON: [], MAPA_ASCII_POSTS: new Map() }));

/**
 * A poda dos dados do painel e o que sustenta a pagina de privacidade: ela
 * promete o IP de quem tenta entrar guardado por uma hora, e as 2.000 acoes mais
 * recentes. Isso e comportamento de DELETE, entao so se prova contra um Postgres
 * de verdade.
 *
 * Pulado sem DATABASE_URL_TESTE. Apaga e recria SO painel_tentativas,
 * painel_auditoria e painel_manutencao.
 */
const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();

describe.skipIf(!URL_DE_TESTE)("poda dos dados do painel no Postgres", () => {
  const urlOriginal = process.env.DATABASE_URL;
  let banco: typeof import("./painel-db");

  beforeAll(async () => {
    // 127.0.0.1, e nao localhost: no Windows localhost resolve primeiro para
    // ::1 e o container so escuta IPv4.
    process.env.DATABASE_URL = URL_DE_TESTE!.replace("@localhost:", "@127.0.0.1:");
    banco = await import("./painel-db");
    const sql = banco.bancoDoPainel();
    await sql`DROP TABLE IF EXISTS painel_tentativas`;
    await sql`DROP TABLE IF EXISTS painel_auditoria`;
    await sql`DROP TABLE IF EXISTS painel_manutencao`;
    // A primeira chamada recria o que falta (garantirTabelas roda uma vez).
    await banco.podarDadosDoPainel();
    // 30 s, e nao os 10 padrao: com a suite inteira em paralelo no mesmo banco,
    // os DROP e o DDL esperam as outras conexoes e ja passaram de 10 s.
  }, 30_000);

  beforeEach(async () => {
    // RESTART IDENTITY: a poda por volume depende do id de cada acao, e sem
    // recomecar a contagem um teste cairia num multiplo do passo por acaso.
    await banco.bancoDoPainel()`TRUNCATE painel_tentativas, painel_auditoria, painel_manutencao RESTART IDENTITY`;
  });

  afterAll(async () => {
    await banco?.bancoDoPainel().end();
    if (urlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = urlOriginal;
  });

  it("apaga a tentativa com mais de uma hora e mantem a recente", async () => {
    const sql = banco.bancoDoPainel();
    await sql`
      INSERT INTO painel_tentativas (chave, em) VALUES
        ('de-duas-horas', NOW() - INTERVAL '2 hours'),
        ('de-agora', NOW())`;

    await banco.podarDadosDoPainel();

    const linhas = await sql<{ chave: string }[]>`SELECT chave FROM painel_tentativas`;
    expect(linhas.map((l) => l.chave)).toEqual(["de-agora"]);
  });

  it("a poda roda sem ninguem ter tentado entrar — e o que a privacidade promete", async () => {
    const sql = banco.bancoDoPainel();
    // Nenhuma gravacao nova depois desta: so a tarefa da noite roda.
    await sql`INSERT INTO painel_tentativas (chave, em) VALUES ('antiga', NOW() - INTERVAL '90 minutes')`;

    await banco.podarDadosDoPainel();

    const [{ total }] = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM painel_tentativas`;
    expect(total).toBe(0);
  });

  it("guarda so as 2.000 acoes mais recentes da auditoria", async () => {
    const sql = banco.bancoDoPainel();
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe)
      SELECT 'login-ok', 'n' || g FROM generate_series(1, 2010) g`;

    await banco.podarDadosDoPainel();

    const [{ total }] = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM painel_auditoria`;
    expect(total).toBe(2000);
    // As que ficaram sao as ULTIMAS: apagar as recentes seria perder o rastro
    // justamente do que acabou de acontecer.
    const [{ detalhe }] = await sql<{ detalhe: string }[]>`
      SELECT detalhe FROM painel_auditoria ORDER BY id DESC LIMIT 1`;
    expect(detalhe).toBe("n2010");
  });

  it("sem a tarefa da noite, a acao seguinte do painel poda — e so uma vez por dia", async () => {
    const sql = banco.bancoDoPainel();
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe)
      SELECT 'login-ok', 'n' || g FROM generate_series(1, 2010) g`;
    await sql`INSERT INTO painel_tentativas (chave, em) VALUES ('antiga', NOW() - INTERVAL '2 hours')`;

    // Nenhuma poda registrada ainda: a primeira acao ja limpa os dois lugares.
    // Com o contador antigo (a cada 100 gravacoes, em memoria) nada era apagado.
    await banco.registrarAuditoria("post-editado", "x", null);
    const [depois] = await sql<{ acoes: number; tentativas: number }[]>`
      SELECT (SELECT COUNT(*)::int FROM painel_auditoria) AS acoes,
             (SELECT COUNT(*)::int FROM painel_tentativas) AS tentativas`;
    expect(depois).toEqual({ acoes: 2000, tentativas: 0 });

    // Poda recente: as proximas acoes do dia nao podam de novo.
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe)
      SELECT 'login-ok', 'm' || g FROM generate_series(1, 20) g`;
    await banco.registrarAuditoria("post-editado", "y", null);
    const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM painel_auditoria`;
    expect(total).toBe(2021);

    // Passadas 24 h da ultima poda, a acao seguinte poda outra vez.
    await sql`UPDATE painel_manutencao SET em = NOW() - INTERVAL '25 hours' WHERE nome = 'poda'`;
    await banco.registrarAuditoria("post-editado", "z", null);
    const [{ totalDepois }] = await sql<{ totalDepois: number }[]>`
      SELECT COUNT(*)::int AS "totalDepois" FROM painel_auditoria`;
    expect(totalDepois).toBe(2000);
    const [{ recente }] = await sql<{ recente: boolean }[]>`
      SELECT em > NOW() - INTERVAL '1 minute' AS recente FROM painel_manutencao WHERE nome = 'poda'`;
    expect(recente).toBe(true);
  });

  it("a tarefa da noite tambem marca a poda, e o painel nao repete no mesmo dia", async () => {
    const sql = banco.bancoDoPainel();
    await banco.podarDadosDoPainel();
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe)
      SELECT 'login-ok', 'n' || g FROM generate_series(1, 2005) g`;
    await banco.registrarAuditoria("post-editado", "x", null);
    const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM painel_auditoria`;
    expect(total).toBe(2006);
  });

  it("enxurrada de acoes: a cada passo apaga um lote do excedente, sem esperar as 24 h", async () => {
    const sql = banco.bancoDoPainel();
    // Poda por tempo recente: so a regra por volume pode apagar aqui.
    await banco.podarDadosDoPainel();
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe)
      SELECT 'login-falhou', 'n' || g FROM generate_series(1, 2500) g`;
    // A proxima acao cai num multiplo do passo.
    const [{ ultimo }] = await sql<{ ultimo: string }[]>`SELECT MAX(id)::text AS ultimo FROM painel_auditoria`;
    const proximo = Math.ceil((Number(ultimo) + 1) / banco.PASSO_DA_PODA_POR_VOLUME) * banco.PASSO_DA_PODA_POR_VOLUME;
    await sql`SELECT setval(pg_get_serial_sequence('painel_auditoria', 'id'), ${proximo - 1})`;

    await banco.registrarAuditoria("login-falhou", "ultima", null);

    const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM painel_auditoria`;
    expect(total).toBe(2000);
    const [{ detalhe }] = await sql<{ detalhe: string }[]>`
      SELECT detalhe FROM painel_auditoria ORDER BY id DESC LIMIT 1`;
    expect(detalhe).toBe("ultima");
  });

  it("o lote tem teto: excedente enorme sai aos poucos, e nunca todo dentro de uma requisicao", async () => {
    const sql = banco.bancoDoPainel();
    await banco.podarDadosDoPainel();
    const excedente = banco.LOTE_DA_PODA_POR_VOLUME + 500;
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe)
      SELECT 'login-falhou', 'n' || g FROM generate_series(1, ${2000 + excedente - 1}) g`;
    const [{ ultimo }] = await sql<{ ultimo: string }[]>`SELECT MAX(id)::text AS ultimo FROM painel_auditoria`;
    const proximo = Math.ceil((Number(ultimo) + 1) / banco.PASSO_DA_PODA_POR_VOLUME) * banco.PASSO_DA_PODA_POR_VOLUME;
    await sql`SELECT setval(pg_get_serial_sequence('painel_auditoria', 'id'), ${proximo - 1})`;

    await banco.registrarAuditoria("login-falhou", "ultima", null);

    const [{ total }] = await sql<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM painel_auditoria`;
    expect(total).toBe(2000 + excedente - banco.LOTE_DA_PODA_POR_VOLUME);
  });

  it("senha errada nao dispara a poda por tempo, que fica para as acoes do painel e a tarefa da noite", async () => {
    const sql = banco.bancoDoPainel();
    // Nenhuma poda registrada: qualquer outra acao podaria agora.
    await sql`INSERT INTO painel_tentativas (chave, em) VALUES ('antiga', NOW() - INTERVAL '2 hours')`;
    const [{ ultimo }] = await sql<{ ultimo: string | null }[]>`
      SELECT last_value::text AS ultimo FROM painel_auditoria_id_seq`;
    // Longe de um multiplo do passo, para a regra por volume nao entrar.
    const base = Math.ceil((Number(ultimo ?? 0) + 2) / banco.PASSO_DA_PODA_POR_VOLUME) * banco.PASSO_DA_PODA_POR_VOLUME;
    await sql`SELECT setval(pg_get_serial_sequence('painel_auditoria', 'id'), ${base + 1})`;

    await banco.registrarAuditoria("login-falhou", null, "203.0.113.9");
    const [{ tentativas }] = await sql<{ tentativas: number }[]>`
      SELECT COUNT(*)::int AS tentativas FROM painel_tentativas`;
    expect(tentativas).toBe(1);

    await banco.registrarAuditoria("login-ok", null, "203.0.113.9");
    const [{ depois }] = await sql<{ depois: number }[]>`SELECT COUNT(*)::int AS depois FROM painel_tentativas`;
    expect(depois).toBe(0);
  });

  it("envio repetido com o mesmo id diz se o texto estava no ar logo antes da propria escrita", async () => {
    const id = crypto.randomUUID();
    const dados = {
      titulo: `Teste de envio cruzado ${id.slice(0, 8)}`,
      resumo: "Resumo.",
      categoria: "Postura",
      capa: "",
      corpo: "Corpo do texto.",
      publicado: true,
    };
    try {
      // O primeiro envio publica; o segundo, com o mesmo id, guarda como
      // rascunho. Mesmo que a rota tenha lido o texto como inexistente antes, o
      // estado de antes vem da escrita, e a limpeza do site acontece.
      const primeiro = await banco.criarPost(dados, id);
      expect(primeiro.estavaPublicado).toBe(false);
      expect(primeiro.post.publicado).toBe(true);

      const segundo = await banco.criarPost({ ...dados, publicado: false }, id);
      expect(segundo.estavaPublicado).toBe(true);
      expect(segundo.post.publicado).toBe(false);

      const terceiro = await banco.criarPost({ ...dados, publicado: false }, id);
      expect(terceiro.estavaPublicado).toBe(false);
    } finally {
      await banco.apagarPost(id);
    }
  });

  it("com menos de 2.000 acoes nao apaga nada", async () => {
    const sql = banco.bancoDoPainel();
    await sql`
      INSERT INTO painel_auditoria (acao, detalhe)
      SELECT 'login-ok', 'n' || g FROM generate_series(1, 5) g`;

    await banco.podarDadosDoPainel();

    const [{ total }] = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM painel_auditoria`;
    expect(total).toBe(5);
  });
});

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Analise estatica das rotas, das paginas do painel e da camada de dados —
 * nenhum handler e executado.
 *
 * Este teste existe por causa de uma falha real, num site irmao: a senha era
 * conferida so no componente React, e `POST`, `PUT` e `DELETE` de
 * `/api/posts` ficaram abertos para qualquer um que descobrisse o endereco.
 * A tela mostrava um cadeado e a porta estava destrancada.
 *
 * Revisao humana nao pega isso de forma confiavel: a rota nova parece com as
 * outras, e o que falta e uma linha que nao esta la. Um teste que le os
 * arquivos, sim.
 *
 * Os arquivos sao lidos pelo analisador do proprio TypeScript, e nao por
 * expressao regular. Dois motivos: comentario nao conta (citar `exigirSessao()`
 * num comentario satisfazia a versao anterior), e assinatura com tipo entre
 * chaves (`Promise<{ ok: true }>`) nao confunde onde o corpo comeca.
 *
 * O que e exigido, e o buraco que cada regra fecha:
 *
 * 1. `api/painel/**`: TODO verbo, GET incluido, comeca pela guarda de sessao.
 *    Antes so os verbos de escrita eram conferidos, e um GET de numeros sem
 *    guarda passaria.
 * 2. `api/**`: handler so como `export async function VERBO(`. Um
 *    `export const POST = ...` escapava da conferencia inteira.
 * 3. `api/cron/**`: todo handler comeca por `exigirSegredoDoCron(req)`.
 * 4. `api/**`: rota fora de `painel/` e `cron/` so com motivo escrito aqui.
 * 5. `src/lib/*-db.ts` e rotas: nada de `.unsafe()` nem SQL fora da tag `sql`.
 *    Antes so `painel-db.ts` era varrido.
 * 6. `publicar/**`: pagina interna espera `sessaoAtual()` antes de ler
 *    qualquer dado. A previa da pagina inicial mostra rascunho nao publico.
 *
 * Cada regra e uma funcao pura, provada primeiro contra trechos escritos aqui
 * — o certo e as formas erradas — e so depois aplicada aos arquivos. Sem essa
 * prova, uma regra de cron ou de pagina que ainda nao tem arquivo nenhum para
 * conferir passaria calada, e ninguem saberia se ela enxerga alguma coisa.
 */

const RAIZ = process.cwd();
const API = join(RAIZ, "src", "app", "api");
const PUBLICAR = join(RAIZ, "src", "app", "publicar");
const LIB = join(RAIZ, "src", "lib");

const VERBOS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

/** Rotas do painel que nao podem exigir sessao — com o motivo escrito. */
const ISENTAS: Record<string, string> = {
  "painel/entrar/route.ts": "e a propria porta: quem chama ainda nao tem sessao",
  "painel/sair/route.ts": "apagar o cookie nao pode depender de o cookie ser valido",
};

/** Rotas de `api/` fora de `painel/` e `cron/`, abertas de proposito. Hoje nenhuma. */
const PUBLICAS: Record<string, string> = {};

type Arquivo = { caminho: string; relativo: string };

function listar(dir: string, aceitar: (nome: string) => boolean, prefixo = ""): Arquivo[] {
  if (!existsSync(dir)) return [];
  const achados: Arquivo[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, item.name);
    const relativo = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.isDirectory()) achados.push(...listar(caminho, aceitar, relativo));
    else if (aceitar(item.name)) achados.push({ caminho, relativo });
  }
  return achados;
}

function analisarTexto(nome: string, texto: string): ts.SourceFile {
  return ts.createSourceFile(
    nome,
    texto,
    ts.ScriptTarget.Latest,
    true,
    nome.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function analisar(caminho: string): ts.SourceFile {
  return analisarTexto(caminho, readFileSync(caminho, "utf8"));
}

const rotasDaApi = listar(API, (nome) => nome === "route.ts");
const rotasDoPainel = rotasDaApi.filter((r) => r.relativo.startsWith("painel/"));
const rotasDoCron = rotasDaApi.filter((r) => r.relativo.startsWith("cron/"));
const modulosDeBanco = readdirSync(LIB)
  .filter((nome) => nome.endsWith("-db.ts"))
  .map((nome) => ({ caminho: join(LIB, nome), relativo: `src/lib/${nome}` }));
const paginasDoPainel = listar(PUBLICAR, (nome) => nome === "page.tsx").filter(
  (p) => p.relativo !== "page.tsx",
);

/* ------------------------------------------------------ leitura da arvore */

function temModificador(no: ts.Node, tipo: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(no) && (ts.getModifiers(no)?.some((m) => m.kind === tipo) ?? false);
}

/** Texto do no sem espacos, para comparar expressoes curtas como `!auth.ok`. */
function compacto(no: ts.Node | undefined): string {
  return no ? no.getText().replace(/\s+/g, "") : "";
}

function ehChamadaDe(expr: ts.Node | undefined, nomes: readonly string[]): boolean {
  return (
    !!expr &&
    ts.isCallExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    nomes.includes(expr.expression.text)
  );
}

function linha(no: ts.Node): number {
  const arquivo = no.getSourceFile();
  return arquivo.getLineAndCharacterOfPosition(no.getStart(arquivo)).line + 1;
}

function algumNo(raiz: ts.Node, teste: (no: ts.Node) => boolean): boolean {
  let achou = false;
  const visitar = (no: ts.Node): void => {
    if (achou) return;
    if (teste(no)) {
      achou = true;
      return;
    }
    ts.forEachChild(no, visitar);
  };
  visitar(raiz);
  return achou;
}

type Handler = { verbo: string; funcao: ts.FunctionDeclaration };

function handlers(arquivo: ts.SourceFile): Handler[] {
  return arquivo.statements
    .filter(ts.isFunctionDeclaration)
    .filter((f) => f.name && VERBOS.has(f.name.text) && temModificador(f, ts.SyntaxKind.ExportKeyword))
    .map((funcao) => ({ verbo: funcao.name!.text, funcao }));
}

/** `const X = <valor>;` com uma unica declaracao. */
function declaracaoUnica(s: ts.Statement | undefined): { nome: string; valor: ts.Expression } | null {
  if (!s || !ts.isVariableStatement(s)) return null;
  const declaracoes = s.declarationList.declarations;
  if (declaracoes.length !== 1) return null;
  const [d] = declaracoes;
  if (!ts.isIdentifier(d.name) || !d.initializer) return null;
  return { nome: d.name.text, valor: d.initializer };
}

/** `if (<condicao>) return <valor>;`, com ou sem chaves. */
function retornoCondicional(
  s: ts.Statement | undefined,
): { condicao: ts.Expression; retorno: ts.Expression | undefined } | null {
  if (!s || !ts.isIfStatement(s)) return null;
  const entao = ts.isBlock(s.thenStatement) ? s.thenStatement.statements[0] : s.thenStatement;
  if (!entao || !ts.isReturnStatement(entao)) return null;
  return { condicao: s.expression, retorno: entao.expression };
}

/**
 * As duas primeiras instrucoes sao
 * `const X = await <guarda>(...); if (!X.ok) return X.resposta;`.
 * Com `qualquerRetorno`, o `return` pode devolver outra coisa (caso do `preparar`).
 */
function comecaPelaGuardaDeSessao(
  corpo: ts.Block | undefined,
  guardas: readonly string[],
  qualquerRetorno = false,
): boolean {
  const [primeira, segunda] = corpo?.statements ?? [];
  const decl = declaracaoUnica(primeira);
  if (!decl || !ts.isAwaitExpression(decl.valor) || !ehChamadaDe(decl.valor.expression, guardas)) {
    return false;
  }
  const se = retornoCondicional(segunda);
  if (!se || compacto(se.condicao) !== `!${decl.nome}.ok`) return false;
  return qualquerRetorno || compacto(se.retorno) === `${decl.nome}.resposta`;
}

/** `const X = exigirSegredoDoCron(req); if (X) return X;` */
function comecaPeloSegredoDoCron(corpo: ts.Block | undefined): boolean {
  const [primeira, segunda] = corpo?.statements ?? [];
  const decl = declaracaoUnica(primeira);
  if (!decl || !ehChamadaDe(decl.valor, ["exigirSegredoDoCron"])) return false;
  const se = retornoCondicional(segunda);
  return !!se && compacto(se.condicao) === decl.nome && compacto(se.retorno) === decl.nome;
}

/** O primeiro `await` na ordem do codigo, sem entrar em funcoes declaradas dentro. */
function primeiroAwait(corpo: ts.Block): ts.AwaitExpression | null {
  let achado: ts.AwaitExpression | null = null;
  const visitar = (no: ts.Node): void => {
    if (achado) return;
    if (ts.isAwaitExpression(no)) {
      achado = no;
      return;
    }
    if (ts.isFunctionLike(no)) return;
    ts.forEachChild(no, visitar);
  };
  ts.forEachChild(corpo, visitar);
  return achado;
}

/* ------------------------------------------------------------- as regras */

/** Regra 2: toda forma de expor um verbo que nao seja `export async function VERBO(`. */
function exportacoesFora(arquivo: ts.SourceFile): string[] {
  const problemas: string[] = [];
  for (const s of arquivo.statements) {
    if (ts.isVariableStatement(s) && temModificador(s, ts.SyntaxKind.ExportKeyword)) {
      for (const d of s.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && VERBOS.has(d.name.text)) {
          problemas.push(`linha ${linha(s)}: export const ${d.name.text}`);
        }
      }
    }
    if (ts.isExportDeclaration(s)) {
      if (!s.exportClause) {
        problemas.push(`linha ${linha(s)}: export * (pode reexportar um verbo sem guarda)`);
      } else if (ts.isNamedExports(s.exportClause)) {
        for (const e of s.exportClause.elements) {
          if (VERBOS.has(e.name.text)) problemas.push(`linha ${linha(s)}: export { ${e.getText()} }`);
        }
      }
    }
    if (
      ts.isFunctionDeclaration(s) &&
      s.name &&
      VERBOS.has(s.name.text) &&
      temModificador(s, ts.SyntaxKind.ExportKeyword) &&
      !temModificador(s, ts.SyntaxKind.AsyncKeyword)
    ) {
      problemas.push(`linha ${linha(s)}: export function ${s.name.text} sem async`);
    }
  }
  return problemas;
}

/** Regra 1: rota do painel. */
function problemasDaRotaDoPainel(arquivo: ts.SourceFile, relativo: string): string[] {
  const encontrados = handlers(arquivo);
  if (encontrados.length === 0) return ["nenhum handler exportado"];

  const problemas: string[] = [];
  for (const { verbo, funcao } of encontrados) {
    if (ISENTAS[relativo]) {
      const confereProcedencia = algumNo(
        funcao,
        (no) => ts.isAwaitExpression(no) && ehChamadaDe(no.expression, ["pedidoVeioDaqui"]),
      );
      if (!confereProcedencia) {
        problemas.push(`${verbo}: e isenta de sessao, mas nao espera pedidoVeioDaqui()`);
      }
      continue;
    }
    if (!comecaPelaGuardaDeSessao(funcao.body, ["exigirSessao", "preparar"])) {
      problemas.push(
        `${verbo}: precisa comecar por ` +
          "`const auth = await exigirSessao(); if (!auth.ok) return auth.resposta;`",
      );
    }
  }

  const usaPreparar = encontrados.some(({ funcao }) =>
    algumNo(funcao, (no) => ehChamadaDe(no, ["preparar"])),
  );
  if (usaPreparar) {
    const preparar = arquivo.statements
      .filter(ts.isFunctionDeclaration)
      .find((f) => f.name?.text === "preparar");
    if (!preparar) problemas.push("usa preparar() sem declara-lo no proprio arquivo");
    else if (!comecaPelaGuardaDeSessao(preparar.body, ["exigirSessao"], true)) {
      problemas.push("preparar() nao comeca por exigirSessao()");
    }
  }
  return problemas;
}

/** Regra 3: rota de cron. */
function problemasDaRotaDoCron(arquivo: ts.SourceFile): string[] {
  const encontrados = handlers(arquivo);
  if (encontrados.length === 0) return ["nenhum handler exportado"];
  return encontrados
    .filter(({ funcao }) => !comecaPeloSegredoDoCron(funcao.body))
    .map(
      ({ verbo }) =>
        `${verbo}: precisa comecar por ` +
        "`const negado = exigirSegredoDoCron(req); if (negado) return negado;`",
    );
}

/** Regra 6: pagina interna do painel. */
function problemasDaPagina(arquivo: ts.SourceFile): string[] {
  const funcoes = arquivo.statements.filter(ts.isFunctionDeclaration);
  const atribuicao = arquivo.statements.find(ts.isExportAssignment);
  const nomeDoPadrao =
    atribuicao && ts.isIdentifier(atribuicao.expression) ? atribuicao.expression.text : null;
  const padrao = funcoes.find(
    (f) =>
      (temModificador(f, ts.SyntaxKind.ExportKeyword) && temModificador(f, ts.SyntaxKind.DefaultKeyword)) ||
      (nomeDoPadrao !== null && f.name?.text === nomeDoPadrao),
  );

  if (!padrao?.body) return ["nao achei a funcao da pagina (export default function)"];

  const problemas: string[] = [];
  if (!temModificador(padrao, ts.SyntaxKind.AsyncKeyword)) {
    problemas.push("a pagina precisa ser async para esperar sessaoAtual() antes de tudo");
  }

  // A pagina e toda outra funcao exportada que espere alguma coisa —
  // generateMetadata, por exemplo, poderia vazar o titulo de um rascunho.
  for (const funcao of funcoes) {
    const exportada = funcao === padrao || temModificador(funcao, ts.SyntaxKind.ExportKeyword);
    if (!exportada || !funcao.body) continue;
    const primeiro = primeiroAwait(funcao.body);
    if (!primeiro && funcao !== padrao) continue;
    if (!primeiro || !ehChamadaDe(primeiro.expression, ["sessaoAtual"])) {
      problemas.push(
        `${funcao.name?.text ?? "default"}: precisa esperar sessaoAtual() antes de qualquer outra coisa`,
      );
    }
  }
  return problemas;
}

const PARECE_SQL =
  /\b(SELECT\s[\s\S]*\sFROM|INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE)\b/i;

function textoDoLiteral(no: ts.TemplateLiteral | ts.StringLiteral): string {
  if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) return no.text;
  return no.head.text + no.templateSpans.map((s) => ` $ ${s.literal.text}`).join("");
}

/** Regra 5: SQL fora da tag `sql` e qualquer `.unsafe()`. */
function problemasDeSql(arquivo: ts.SourceFile): string[] {
  const problemas: string[] = [];
  const visitar = (no: ts.Node): void => {
    if (ts.isPropertyAccessExpression(no) && no.name.text === "unsafe") {
      problemas.push(`linha ${linha(no)}: .unsafe()`);
    }
    if (ts.isTaggedTemplateExpression(no)) {
      const daTagSql = ts.isIdentifier(no.tag) && no.tag.text === "sql";
      if (!daTagSql && PARECE_SQL.test(textoDoLiteral(no.template))) {
        problemas.push(`linha ${linha(no)}: SQL num template com a tag ${compacto(no.tag)}`);
      }
      // So as interpolacoes: o proprio template ja foi julgado acima e nao pode
      // ser tomado por um template sem tag.
      if (ts.isTemplateExpression(no.template)) {
        for (const trecho of no.template.templateSpans) visitar(trecho.expression);
      }
      return;
    }
    if (
      (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no) || ts.isTemplateExpression(no)) &&
      PARECE_SQL.test(textoDoLiteral(no))
    ) {
      problemas.push(`linha ${linha(no)}: SQL em texto comum, fora da tag sql`);
    }
    ts.forEachChild(no, visitar);
  };
  visitar(arquivo);
  return problemas;
}

/* ---------------------------------------------------------------- rotas */

const trecho = (texto: string) => analisarTexto("trecho.ts", texto);

describe("toda rota do painel passa pela guarda", () => {
  it("a regra aceita a guarda certa e recusa as formas erradas", () => {
    const certo = trecho(`
      export async function GET() {
        const auth = await exigirSessao();
        if (!auth.ok) return auth.resposta;
        return NextResponse.json({ posts: await listar() });
      }`);
    expect(problemasDaRotaDoPainel(certo, "painel/x/route.ts")).toEqual([]);

    const soNoComentario = trecho(`
      export async function GET() {
        // const auth = await exigirSessao(); if (!auth.ok) return auth.resposta;
        return NextResponse.json({ posts: await listar() });
      }`);
    const leAntes = trecho(`
      export async function POST(req: Request) {
        const corpo = await req.json();
        const auth = await exigirSessao();
        if (!auth.ok) return auth.resposta;
        return NextResponse.json(corpo);
      }`);
    const semRetorno = trecho(`
      export async function DELETE() {
        const auth = await exigirSessao();
        if (!auth.ok) console.error("sem sessao");
        return NextResponse.json({ ok: true });
      }`);
    const prepararSemGuarda = trecho(`
      async function preparar(ctx: C): Promise<{ ok: true } | { ok: false; resposta: R }> {
        const { id } = await ctx.params;
        return { ok: true, id };
      }
      export async function GET(_req: Request, ctx: C) {
        const pronto = await preparar(ctx);
        if (!pronto.ok) return pronto.resposta;
        return NextResponse.json({});
      }`);
    for (const errado of [soNoComentario, leAntes, semRetorno, prepararSemGuarda]) {
      expect(problemasDaRotaDoPainel(errado, "painel/x/route.ts")).not.toEqual([]);
    }
  });

  it("encontrou as rotas", () => {
    expect(rotasDoPainel.length).toBeGreaterThanOrEqual(6);
  });

  it.each(rotasDoPainel.map((r) => [r.relativo, r.caminho]))(
    "%s: todo verbo, GET incluido, comeca pela guarda de sessao",
    (relativo, caminho) => {
      expect(problemasDaRotaDoPainel(analisar(caminho), relativo), relativo).toEqual([]);
    },
  );

  it("as rotas isentas continuam existindo", () => {
    for (const relativo of Object.keys(ISENTAS)) {
      expect(
        rotasDoPainel.some((r) => r.relativo === relativo),
        `rota isenta ${relativo} nao existe mais — tire-a da lista`,
      ).toBe(true);
    }
  });
});

describe("toda rota da api declara o handler do jeito que o teste enxerga", () => {
  it("a regra recusa export const, reexportacao e handler sem async", () => {
    expect(exportacoesFora(trecho("export async function GET() {}"))).toEqual([]);
    expect(exportacoesFora(trecho("export const POST = async () => new Response();"))).toHaveLength(1);
    expect(exportacoesFora(trecho("const h = async () => 1; export { h as PUT };"))).toHaveLength(1);
    expect(exportacoesFora(trecho('export * from "./outro";'))).toHaveLength(1);
    expect(exportacoesFora(trecho("export function DELETE() { return new Response(); }"))).toHaveLength(1);
  });

  it.each(rotasDaApi.map((r) => [r.relativo, r.caminho]))("%s", (relativo, caminho) => {
    expect(exportacoesFora(analisar(caminho)), relativo).toEqual([]);
  });

  it.each(rotasDaApi.map((r) => [r.relativo]))("%s mora em painel/ ou cron/", (relativo) => {
    const lugarConhecido =
      relativo.startsWith("painel/") || relativo.startsWith("cron/") || relativo in PUBLICAS;
    expect(
      lugarConhecido,
      `${relativo}: rota nova fora de painel/ e cron/ nao passa por guarda nenhuma — ` +
        "mova para uma das duas ou escreva o motivo em PUBLICAS",
    ).toBe(true);
  });
});

describe("toda rota de cron exige o segredo do agendador", () => {
  it("a regra aceita a guarda certa e recusa as formas erradas", () => {
    const certo = trecho(`
      export async function GET(req: Request) {
        const negado = exigirSegredoDoCron(req);
        if (negado) return negado;
        return Response.json(await coletar());
      }`);
    expect(problemasDaRotaDoCron(certo)).toEqual([]);

    const errados = [
      `export async function GET(req: Request) {
        // const negado = exigirSegredoDoCron(req); if (negado) return negado;
        return Response.json(await coletar());
      }`,
      `export async function GET(req: Request) {
        await coletar();
        const negado = exigirSegredoDoCron(req);
        if (negado) return negado;
      }`,
      `export async function GET(req: Request) {
        const negado = exigirSegredoDoCron(req);
        if (negado) console.error(negado);
        return Response.json(await coletar());
      }`,
    ];
    for (const errado of errados) expect(problemasDaRotaDoCron(trecho(errado))).not.toEqual([]);
  });

  it.each(rotasDoCron.map((r) => [r.relativo, r.caminho]))("%s", (relativo, caminho) => {
    expect(problemasDaRotaDoCron(analisar(caminho)), relativo).toEqual([]);
  });
});

/* -------------------------------------------------------------- paginas */

describe("pagina interna do painel confere a sessao antes de ler dado", () => {
  const pagina = (texto: string) => analisarTexto("page.tsx", texto);

  it("a regra aceita a conferencia certa e recusa as formas erradas", () => {
    const certo = pagina(`
      export default async function Previa() {
        const sessao = await sessaoAtual();
        if (!sessao) notFound();
        const conteudo = await lerRascunho();
        return <Home conteudo={conteudo} />;
      }`);
    expect(problemasDaPagina(certo)).toEqual([]);

    const errados = [
      // le o rascunho antes de conferir
      `export default async function Previa() {
        const conteudo = await lerRascunho();
        const sessao = await sessaoAtual();
        if (!sessao) notFound();
        return <Home conteudo={conteudo} />;
      }`,
      // nao confere nada e delega a leitura a um componente
      `export default function Previa() { return <LeitorDoRascunho />; }`,
      // so no comentario
      `export default async function Previa() {
        // await sessaoAtual();
        return <Home conteudo={await lerRascunho()} />;
      }`,
      // a pagina confere, mas os metadados leem antes
      `export async function generateMetadata() {
        const rascunho = await lerRascunho();
        return { title: rascunho.titulo };
      }
      export default async function Previa() {
        const sessao = await sessaoAtual();
        if (!sessao) notFound();
        return null;
      }`,
    ];
    for (const errado of errados) expect(problemasDaPagina(pagina(errado))).not.toEqual([]);
  });

  it.each(paginasDoPainel.map((p) => [p.relativo, p.caminho]))("%s", (relativo, caminho) => {
    expect(problemasDaPagina(analisar(caminho)), relativo).toEqual([]);
  });
});

/* ------------------------------------------------------------------ sql */

describe("nenhuma consulta e montada por concatenacao", () => {
  it("a regra aceita a tag sql e recusa o resto", () => {
    const certo = trecho(`
      const sql = bancoDoPainel();
      await sql<Linha[]>\`SELECT * FROM posts WHERE id = \${id} AND em > \${sql\`NOW()\`}\`;
      throw new Error("nao foi possivel apagar o texto");`);
    expect(problemasDeSql(certo)).toEqual([]);

    const errados = [
      "await sql.unsafe(`SELECT * FROM posts WHERE id = '${id}'`);",
      'const consulta = "SELECT * FROM posts WHERE slug = \'" + slug + "\'";',
      "const consulta = `DELETE FROM posts WHERE id = ${id}`;",
      "await banco`UPDATE posts SET titulo = ${titulo}`;",
    ];
    for (const errado of errados) expect(problemasDeSql(trecho(errado)), errado).not.toEqual([]);
  });

  it("encontrou os modulos de banco", () => {
    expect(modulosDeBanco.map((m) => m.relativo)).toContain("src/lib/painel-db.ts");
  });

  it.each([...modulosDeBanco, ...rotasDaApi].map((a) => [a.relativo, a.caminho]))(
    "%s",
    (relativo, caminho) => {
      expect(problemasDeSql(analisar(caminho)), relativo).toEqual([]);
    },
  );

  it.each(modulosDeBanco.map((m) => [m.relativo, m.caminho]))(
    "%s consulta com a tag sql",
    (relativo, caminho) => {
      expect(
        algumNo(
          analisar(caminho),
          (no) => ts.isTaggedTemplateExpression(no) && ts.isIdentifier(no.tag) && no.tag.text === "sql",
        ),
        relativo,
      ).toBe(true);
    },
  );
});

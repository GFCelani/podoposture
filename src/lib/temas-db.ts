import "server-only";

import { randomUUID } from "node:crypto";

import { bancoConfigurado, bancoDoPainel, garantirBanco } from "./painel-db";
import { erroNoNomeDoTema, normalizarNomeDoTema } from "./painel-tipos";

/**
 * Os temas do blog, geridos pelo painel.
 *
 * A tabela nasce em `painel-db.ts` (os posts apontam para ela). A regra que
 * importa mora em dois lugares de proposito:
 *
 * - aqui, `apagarTema` nao apaga tema com texto sem saber para onde os textos
 *   vao (outro tema, ou sem tema);
 * - no banco, a chave estrangeira `posts_categoria_tema` (ON DELETE RESTRICT)
 *   recusa o DELETE de qualquer jeito. Se um dia alguem apagar por fora do
 *   painel, ou um texto entrar no tema no meio da operacao, o banco segura.
 *
 * Renomear e so um UPDATE: a mesma chave tem ON UPDATE CASCADE e leva o nome
 * novo para todos os textos do tema na mesma transacao.
 */

export type TemaDoPainel = { id: string; nome: string; textos: number };

/** Ja existe um tema com esse nome (a caixa nao conta). */
export class TemaRepetido extends Error {
  constructor() {
    super("ja existe um tema com esse nome");
    this.name = "TemaRepetido";
  }
}

/** Nome vazio, curto ou longo demais. A mensagem vai direto para a tela. */
export class NomeDeTemaInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "NomeDeTemaInvalido";
  }
}

/** O destino dos textos e o proprio tema, ou um tema que nao existe. */
export class DestinoInvalido extends Error {
  constructor() {
    super("destino dos textos invalido");
    this.name = "DestinoInvalido";
  }
}

function nomeValido(bruto: string): string {
  const nome = normalizarNomeDoTema(bruto);
  const erro = erroNoNomeDoTema(nome);
  if (erro) throw new NomeDeTemaInvalido(erro);
  return nome;
}

function repetido(erro: unknown): boolean {
  return (erro as { code?: string })?.code === "23505";
}

/** Todos os temas, com quantos textos cada um tem (publicados ou nao), em ordem alfabetica. */
export async function listarTemas(): Promise<TemaDoPainel[]> {
  if (!bancoConfigurado()) return [];
  // garantirBanco, e nao so as tabelas: os temas do GoDaddy entram junto com
  // o acervo, e a lista de temas pode ser a primeira coisa que ela abre.
  await garantirBanco();
  const sql = bancoDoPainel();
  const linhas = await sql<TemaDoPainel[]>`
    SELECT t.id, t.nome, count(p.id)::int AS textos
    FROM temas t LEFT JOIN posts p ON p.categoria = t.nome
    GROUP BY t.id, t.nome`;
  // Ordem em portugues ("Ácido" antes de "Dor"); a do banco depende da colacao.
  return [...linhas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** So os nomes: e o que a validacao de um post precisa. */
export async function nomesDosTemas(): Promise<string[]> {
  return (await listarTemas()).map((t) => t.nome);
}

export async function criarTema(bruto: string): Promise<TemaDoPainel> {
  const nome = nomeValido(bruto);
  await garantirBanco();
  const sql = bancoDoPainel();
  try {
    const [linha] = await sql<{ id: string; nome: string }[]>`
      INSERT INTO temas (id, nome) VALUES (${randomUUID()}, ${nome}) RETURNING id, nome`;
    return { ...linha, textos: 0 };
  } catch (erro) {
    if (repetido(erro)) throw new TemaRepetido();
    throw erro;
  }
}

/**
 * Troca o nome. Devolve o tema e quantos textos mudaram de nome junto (o site
 * so precisa ser refeito se houver algum), ou null se o tema nao existe mais.
 */
export async function renomearTema(
  id: string,
  bruto: string,
): Promise<{ tema: TemaDoPainel; antes: string } | null> {
  const nome = nomeValido(bruto);
  await garantirBanco();
  const sql = bancoDoPainel();
  try {
    return await sql.begin(async (sql) => {
      const [atual] = await sql<{ nome: string }[]>`SELECT nome FROM temas WHERE id = ${id} FOR UPDATE`;
      if (!atual) return null;
      await sql`UPDATE temas SET nome = ${nome} WHERE id = ${id}`;
      const [{ textos }] = await sql<{ textos: number }[]>`
        SELECT count(*)::int AS textos FROM posts WHERE categoria = ${nome}`;
      return { tema: { id, nome, textos }, antes: atual.nome };
    });
  } catch (erro) {
    if (repetido(erro)) throw new TemaRepetido();
    throw erro;
  }
}

export type ResultadoDeApagar =
  | { tipo: "apagado"; movidos: number; slugs: string[] }
  | { tipo: "tem-textos"; textos: number }
  | { tipo: "nao-encontrado" };

/**
 * Apaga um tema.
 *
 * Sem textos, apaga. Com textos, so apaga quando `destino` diz para onde eles
 * vao: `{ para: <id de outro tema> }` ou `{ para: null }` (sem tema). Sem
 * destino, devolve `tem-textos` e nao mexe em nada — e a tela que mostra
 * quantos sao e pede a escolha.
 *
 * Tudo numa transacao, com o tema travado: mover e apagar acontecem juntos ou
 * nao acontecem. Os `slugs` movidos voltam para a rota refazer as paginas.
 */
export async function apagarTema(
  id: string,
  destino?: { para: string | null },
): Promise<ResultadoDeApagar> {
  await garantirBanco();
  return bancoDoPainel().begin(async (sql) => {
    const [tema] = await sql<{ nome: string }[]>`SELECT nome FROM temas WHERE id = ${id} FOR UPDATE`;
    if (!tema) return { tipo: "nao-encontrado" } as const;

    const [{ textos }] = await sql<{ textos: number }[]>`
      SELECT count(*)::int AS textos FROM posts WHERE categoria = ${tema.nome}`;
    if (textos > 0 && destino === undefined) return { tipo: "tem-textos", textos } as const;

    let para: string | null = null;
    if (textos > 0 && destino?.para) {
      if (destino.para === id) throw new DestinoInvalido();
      const [alvo] = await sql<{ nome: string }[]>`
        SELECT nome FROM temas WHERE id = ${destino.para} FOR SHARE`;
      if (!alvo) throw new DestinoInvalido();
      para = alvo.nome;
    }

    const movidos =
      textos > 0
        ? await sql<{ slug: string }[]>`
            UPDATE posts SET categoria = ${para} WHERE categoria = ${tema.nome} RETURNING slug`
        : [];
    await sql`DELETE FROM temas WHERE id = ${id}`;
    return { tipo: "apagado", movidos: movidos.length, slugs: movidos.map((m) => m.slug) } as const;
  });
}

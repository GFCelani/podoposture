/**
 * A trava de versao de posts e paginas, a mesma das secoes da pagina inicial
 * (conteudo-db.ts): cada gravacao leva a versao que o editor carregou (a hora
 * da ultima gravacao, em milissegundos), e so passa se ela ainda for a do
 * banco. A conferencia mora no proprio UPDATE ou DELETE, na mesma instrucao
 * que grava: entre conferir e gravar nao ha brecha para outra aba.
 *
 * Vale para salvar rascunho, publicar, tirar do site e apagar. O envio
 * repetido de um texto novo (a resposta se perdeu e ela clicou de novo, ver
 * criarPost) passa so enquanto ninguem mexeu no texto desde que ele nasceu:
 * `CRIACAO`.
 */

/** O envio repetido de um texto novo: so grava se o texto nao mudou desde a criacao. */
export const CRIACAO = Symbol("criacao");

/** A versao que a gravacao espera; undefined = sem conferencia (uso interno). */
export type VersaoEsperada = string | typeof CRIACAO | undefined;

/** Versao vinda do navegador: so texto com cara de data; o resto nunca confere. */
export function lerVersao(bruto: unknown): string | null {
  return typeof bruto === "string" && bruto.length <= 40 && !Number.isNaN(Date.parse(bruto)) ? bruto : null;
}

/** Nada foi gravado: o texto mudou depois que o editor o carregou. `atual` e' como ele esta agora. */
export class VersaoDesatualizada<T> extends Error {
  readonly atual: T;
  constructor(atual: T) {
    super("o texto mudou em outra aba ou aparelho");
    this.name = "VersaoDesatualizada";
    this.atual = atual;
  }
}

/** O que a rota responde: 409, a mensagem e o texto como esta no banco. */
export const MENSAGEM_DE_CONFLITO = "Este texto foi alterado em outra aba ou aparelho, e nada foi salvo agora.";

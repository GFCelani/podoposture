import {
  randomBytes,
  scrypt as scryptComRetorno,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * `promisify` perde a versao do `scrypt` que aceita parametros de custo, entao
 * a promessa e montada a mao.
 */
function scrypt(
  senha: string,
  sal: Buffer,
  tamanho: number,
  opcoes: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolver, recusar) => {
    scryptComRetorno(senha, sal, tamanho, opcoes, (erro, chave) =>
      erro ? recusar(erro) : resolver(chave),
    );
  });
}

/**
 * Senha do painel — guardada como resumo, nunca em texto claro.
 *
 * A senha real nao existe em lugar nenhum do sistema: o que fica na variavel de
 * ambiente e um `scrypt` dela. Quem consegue ler as variaveis do servidor (um
 * colega com acesso ao painel da hospedagem, um vazamento de log, um backup)
 * nao sai de la com a senha na mao — sairia com um resumo que precisa ser
 * quebrado por forca bruta, e o `scrypt` e caro de proposito para isso.
 *
 * O formato guardado e `scrypt.N.r.p.sal.resumo`, com sal e resumo em base64url.
 * Guardar os parametros junto permite endurece-los no futuro sem invalidar as
 * senhas ja criadas.
 *
 * O separador e ponto, e nao o cifrao convencional do scrypt, por um motivo
 * medido: o leitor de variaveis de ambiente do Next EXPANDE `$nome` dentro do
 * valor. Com cifrao, `scrypt$32768$8$1$sal$resumo` chegava ao servidor como
 * `scrypt-pr1zA` — os pedacos viravam variaveis vazias e o painel dizia "nao
 * configurado" para sempre, sem nenhum erro que explicasse. Ponto nao e especial
 * para nenhum lugar por onde este valor passa (.env, terminal, painel da
 * hospedagem), e base64url nunca produz ponto, entao nao ha ambiguidade.
 */

/**
 * Custo do `scrypt`. N=2^15 leva algumas centenas de milissegundos num servidor
 * comum — imperceptivel para quem digita a senha uma vez, e caro o bastante para
 * tornar a forca bruta pouco atraente.
 */
const N = 32768;
const r = 8;
const p = 1;
const TAMANHO_RESUMO = 32;
const TAMANHO_SAL = 16;

/** `scrypt` com N alto precisa de mais memoria do que o padrao do Node permite. */
const MEMORIA = 128 * N * r * 2;

const b64 = (b: Buffer) => b.toString("base64url");

/** Gera o valor que vai para a variavel de ambiente `ADMIN_PASSWORD_HASH`. */
export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(TAMANHO_SAL);
  const resumo = await scrypt(senha.normalize("NFKC"), sal, TAMANHO_RESUMO, {
    N,
    r,
    p,
    maxmem: MEMORIA,
  });
  return `scrypt.${N}.${r}.${p}.${b64(sal)}.${b64(resumo)}`;
}

/**
 * Confere a senha digitada contra o resumo guardado.
 *
 * A comparacao e em tempo constante: um `===` comum devolve a resposta mais
 * rapido quanto mais cedo os bytes divergem, e essa diferenca de tempo, medida
 * muitas vezes, vaza o comeco do valor correto.
 *
 * Nunca lanca: qualquer defeito no formato guardado vira `false`. Um resumo
 * corrompido nao pode virar uma porta aberta.
 */
export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  try {
    const partes = guardado.split(".");
    if (partes.length !== 6 || partes[0] !== "scrypt") return false;

    const [, nTexto, rTexto, pTexto, salTexto, resumoTexto] = partes;
    const nGuardado = Number(nTexto);
    const rGuardado = Number(rTexto);
    const pGuardado = Number(pTexto);
    if (
      !Number.isInteger(nGuardado) ||
      !Number.isInteger(rGuardado) ||
      !Number.isInteger(pGuardado)
    ) {
      return false;
    }
    // Um valor absurdo vindo de um resumo adulterado travaria o servidor no
    // primeiro login. `p` multiplica o trabalho de forma direta e por isso
    // entra na conferencia junto com os outros dois.
    if (nGuardado < 1024 || nGuardado > 1 << 20) return false;
    if (rGuardado < 1 || rGuardado > 32) return false;
    if (pGuardado < 1 || pGuardado > 16) return false;

    const sal = Buffer.from(salTexto, "base64url");
    const esperado = Buffer.from(resumoTexto, "base64url");
    if (sal.length === 0 || esperado.length === 0) return false;

    const calculado = await scrypt(senha.normalize("NFKC"), sal, esperado.length, {
      N: nGuardado,
      r: rGuardado,
      p: pGuardado,
      maxmem: 128 * nGuardado * rGuardado * 2,
    });

    return timingSafeEqual(calculado, esperado);
  } catch {
    return false;
  }
}

/**
 * O resumo configurado no ambiente, ou `null` se nao houver.
 *
 * Sem ele o painel nao abre para ninguem — falha fechada. Um sistema de login
 * que "libera quando nao esta configurado" e pior que nao ter login.
 */
export function hashConfigurado(): string | null {
  const valor = process.env.ADMIN_PASSWORD_HASH?.trim();
  return valor && valor.startsWith("scrypt.") ? valor : null;
}

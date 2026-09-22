/**
 * A URL do banco como o driver (`postgres`) precisa.
 *
 * O Neon entrega a URL com `?sslmode=require&channel_binding=require`.
 * `channel_binding` e opcao do cliente libpq, que este driver nao conhece: ele
 * a repassa ao servidor como parametro de conexao, e o Postgres recusa a
 * conexao inteira (42704 unrecognized configuration parameter
 * "channel_binding"). Foi o que derrubou o build de producao em 2026-09-22 —
 * e antes disso o banco de producao simplesmente nunca respondia, porque o
 * codigo antigo engolia o erro e caia para o JSON sem avisar.
 *
 * Tirar o parametro nao enfraquece nada: o driver nunca fez channel binding, e
 * a conexao fora da maquina local continua obrigatoriamente em TLS
 * (`ssl: "require"` em painel-db.ts). Assim a URL funciona exatamente como o
 * Neon a entrega, sem ninguem precisar editar a variavel.
 */
export function urlParaODriver(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (!u.searchParams.has("channel_binding")) return url;
  u.searchParams.delete("channel_binding");
  return u.toString();
}

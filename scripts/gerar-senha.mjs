/**
 * Gera o que vai nas variaveis de ambiente do painel.
 *
 *   node scripts/gerar-senha.mjs "a senha que a clinica vai usar"
 *
 * Imprime duas linhas prontas para colar no `.env.local` (ou no painel da
 * hospedagem): o resumo da senha e um segredo de assinatura novo.
 *
 * A senha em si nao e guardada em lugar nenhum — nem aqui, nem no servidor. O
 * que fica e um `scrypt` dela, que nao da para desfazer.
 *
 * Os pedacos sao separados por ponto, e nao por cifrao: o leitor de variavel de
 * ambiente do Next expande `$nome` dentro do valor e destruiria o resumo em
 * silencio, deixando o painel dizendo "nao configurado" para sempre.
 */

import { randomBytes, scrypt as scryptComRetorno } from "node:crypto";

const N = 32768;
const r = 8;
const p = 1;

const senha = process.argv[2];
if (!senha || senha.length < 10) {
  console.error('Uso: node scripts/gerar-senha.mjs "sua senha"');
  console.error("A senha precisa de pelo menos 10 caracteres.");
  process.exit(1);
}

const sal = randomBytes(16);
scryptComRetorno(
  senha.normalize("NFKC"),
  sal,
  32,
  { N, r, p, maxmem: 128 * N * r * 2 },
  (erro, resumo) => {
    if (erro) {
      console.error("Falhou ao calcular o resumo:", erro.message);
      process.exit(1);
    }

    const hash = `scrypt.${N}.${r}.${p}.${sal.toString("base64url")}.${resumo.toString("base64url")}`;
    const segredo = randomBytes(48).toString("base64url");

    console.log("\nCole estas duas linhas no .env.local (ou nas variaveis da hospedagem):\n");
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log(`ADMIN_SESSION_SECRET=${segredo}`);
    console.log("\nGuarde a senha num gerenciador. Ela nao fica salva em lugar nenhum aqui.");
    console.log("Trocar a senha depois: rode este comando de novo e substitua a linha.\n");
  },
);

import type { Metadata } from "next";

import { Painel } from "@/components/painel/Painel";

export const dynamic = "force-dynamic";

/**
 * O painel de publicacao.
 *
 * Endereco nao divulgado: nao aparece em menu, rodape nem sitemap. Isso evita
 * barulho, e so isso — quem protege a porta e a senha, a sessao assinada e o
 * limite de tentativas. Confiar no endereco obscuro foi exatamente o erro do
 * site irmao, onde a API de escrita ficou aberta atras de um nome dificil.
 */
export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false, nocache: true },
};

export default function PaginaDoPainel() {
  return (
    <main className="min-h-screen bg-paper">
      <Painel />
    </main>
  );
}

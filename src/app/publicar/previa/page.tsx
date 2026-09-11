import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { lerBlogDaPaginaInicial, PaginaInicial } from "@/components/pagina-inicial";
import { VoltarAoPainel } from "@/components/painel/inicio/VoltarAoPainel";
import { lerConteudoComRascunho } from "@/lib/conteudo-do-site";
import { sessaoAtual } from "@/lib/guarda";

/**
 * Previa da pagina inicial: padrao, publicado e rascunho, nessa ordem.
 *
 * Dinamica porque cada visita precisa do rascunho de agora, e fora de busca
 * porque o rascunho nao e publico. A sessao e conferida antes de qualquer
 * leitura (o teste de rotas protegidas exige): sem ela, o endereco nao revela
 * nem que existe rascunho, so manda para a porta do painel.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prévia da página inicial",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreviaDaPaginaInicial() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/publicar");

  const [{ conteudo, aviso }, blog] = await Promise.all([
    lerConteudoComRascunho(),
    lerBlogDaPaginaInicial(),
  ]);

  return (
    <>
      <PaginaInicial conteudo={conteudo} blog={blog} />
      <FaixaDaPrevia aviso={aviso} />
    </>
  );
}

/**
 * Fixa no pe da janela, a esquerda: o cabecalho mora no topo e o disco do
 * WhatsApp no canto direito, e a faixa nao pode cobrir nenhum dos dois. Sem
 * ela, uma captura de tela da previa passaria por pagina publicada.
 */
function FaixaDaPrevia({ aviso }: { aviso: string | null }) {
  return (
    <div className="fixed bottom-4 left-4 right-24 z-[60] max-w-md rounded-lg border border-paper/25 bg-accent-deep px-5 pt-3 pb-1 text-paper shadow-lift lg:bottom-8 lg:left-8">
      <p role="status" className="text-[1rem] font-medium">
        Prévia — ainda não está no site
      </p>
      {aviso && (
        <p role="alert" className="mt-1 text-[0.875rem] leading-[1.5] text-paper">
          {aviso}
        </p>
      )}
      <VoltarAoPainel />
    </div>
  );
}

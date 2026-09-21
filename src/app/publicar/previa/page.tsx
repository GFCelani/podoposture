import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { lerBlogDaPaginaInicial, PaginaInicial } from "@/components/pagina-inicial";
import { explicacaoDePublicar } from "@/components/painel/inicio/edicao";
import { PublicarDaPrevia } from "@/components/painel/inicio/PublicarDaPrevia";
import { VoltarAoPainel } from "@/components/painel/inicio/VoltarAoPainel";
import { lerConteudoComRascunho } from "@/lib/conteudo-do-site";
import { DESCRITORES, ehChaveDeSecao, type ChaveDeSecao } from "@/lib/conteudo-tipos";
import { sessaoAtual } from "@/lib/guarda";

/**
 * Como vai ficar a pagina inicial: padrao, publicado e o rascunho da secao
 * aberta no editor (`?secao=`), nessa ordem.
 *
 * Dinamica porque cada visita precisa do rascunho de agora, e fora de busca
 * porque o rascunho nao e publico. A sessao e conferida antes de qualquer
 * leitura (o teste de rotas protegidas exige): sem ela, o endereco nao revela
 * nem que existe rascunho, so manda para a porta do painel.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Como vai ficar — página inicial",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreviaDaPaginaInicial({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string | string[] }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/publicar");

  const { secao } = await searchParams;
  const chave = typeof secao === "string" && ehChaveDeSecao(secao) ? secao : null;

  const [previa, blog] = await Promise.all([lerConteudoComRascunho(chave), lerBlogDaPaginaInicial()]);

  return (
    <>
      <PaginaInicial conteudo={previa.conteudo} blog={blog} />
      <FaixaDaPrevia
        chave={chave}
        aviso={previa.aviso}
        outros={previa.outrosRascunhos}
        rascunho={previa.rascunhoDaSecao}
      />
    </>
  );
}

function listaDeNomes(chaves: ChaveDeSecao[]): string {
  const nomes = chaves.map((c) => `“${DESCRITORES[c].rotulo}”`);
  return nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/**
 * Fixa no pe da janela, a esquerda: o cabecalho mora no topo e o disco do
 * WhatsApp no canto direito, e a faixa nao pode cobrir nenhum dos dois. Sem
 * ela, uma captura de tela desta pagina passaria por pagina publicada.
 *
 * O botao de publicar mora aqui tambem: voltar ao painel so para publicar era
 * uma interacao a mais que o contrato da aba (5 para texto) nao tem.
 */
function FaixaDaPrevia({
  chave,
  aviso,
  outros,
  rascunho,
}: {
  chave: ChaveDeSecao | null;
  aviso: string | null;
  outros: ChaveDeSecao[];
  rascunho: { dados: unknown; versao: string | null } | null;
}) {
  const rotulo = chave ? DESCRITORES[chave].rotulo : null;
  return (
    <div className="fixed bottom-4 left-4 right-24 z-[60] max-h-[75vh] max-w-md overflow-y-auto rounded-lg border border-paper/25 bg-accent-deep px-5 pt-3 pb-1 text-paper shadow-lift lg:bottom-8 lg:left-8">
      <p role="status" className="text-[1rem] font-medium">
        {rotulo ? `Como vai ficar “${rotulo}” — ainda não está no site` : "Como vai ficar — ainda não está no site"}
      </p>
      {outros.length > 0 && (
        <p className="mt-1 text-[0.875rem] leading-[1.5] text-paper">
          {listaDeNomes(outros)} {outros.length === 1 ? "também tem rascunho, que não aparece aqui" : "também têm rascunho, que não aparece aqui"}: só vai ao site quando for publicado na própria seção.
        </p>
      )}
      <p className="mt-1 text-[0.875rem] leading-[1.5] text-paper">
        Os links desta página levam ao site como ele está hoje.
      </p>
      {aviso && (
        <p role="alert" className="mt-1 text-[0.875rem] leading-[1.5] text-paper">
          {aviso}
        </p>
      )}
      {chave && rotulo && rascunho && (
        <PublicarDaPrevia
          chave={chave}
          rotulo={rotulo}
          explicacao={explicacaoDePublicar(chave)}
          dados={rascunho.dados}
          versao={rascunho.versao}
        />
      )}
      <VoltarAoPainel />
    </div>
  );
}

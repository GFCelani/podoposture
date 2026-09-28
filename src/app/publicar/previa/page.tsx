import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PaginaInterna } from "@/components/pagina-interna";
import { lerBlogDaPaginaInicial, PaginaInicial } from "@/components/pagina-inicial";
import { explicacaoDePublicar } from "@/components/painel/inicio/edicao";
import { PublicarDaPrevia } from "@/components/painel/inicio/PublicarDaPrevia";
import { VoltarAoPainel } from "@/components/painel/inicio/VoltarAoPainel";
import { lerConteudoComRascunho } from "@/lib/conteudo-do-site";
import { DESCRITORES, ehChaveDeSecao, type ChaveDeSecao, type ConteudoDoSite } from "@/lib/conteudo-tipos";
import { sessaoAtual } from "@/lib/guarda";
import { buscarPagina } from "@/lib/pages";

/**
 * Como vai ficar: padrao, publicado e o rascunho da secao aberta no editor
 * (`?secao=`), nessa ordem. Secao de pagina interna (as fotos dela) abre a
 * propria pagina; o resto abre a pagina inicial, onde cabecalho e rodape
 * tambem mostram o logo. O que nao aparece em pagina nenhuma — o icone da aba
 * e o cartao de compartilhamento — a faixa mostra do jeito que aparece.
 *
 * Dinamica porque cada visita precisa do rascunho de agora, e fora de busca
 * porque o rascunho nao e publico. A sessao e conferida antes de qualquer
 * leitura (o teste de rotas protegidas exige): sem ela, o endereco nao revela
 * nem que existe rascunho, so manda para a porta do painel.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Como vai ficar",
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

  const slug = chave ? DESCRITORES[chave].pagina : undefined;
  const pagina = slug ? buscarPagina(slug) : undefined;
  const [previa, blog] = await Promise.all([
    lerConteudoComRascunho(chave),
    pagina ? null : lerBlogDaPaginaInicial(),
  ]);

  return (
    <>
      {pagina ? (
        <PaginaInterna pagina={pagina} conteudo={previa.conteudo} />
      ) : (
        blog && <PaginaInicial conteudo={previa.conteudo} blog={blog} />
      )}
      <FaixaDaPrevia
        chave={chave}
        conteudo={previa.conteudo}
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
  conteudo,
  aviso,
  outros,
  rascunho,
}: {
  chave: ChaveDeSecao | null;
  conteudo: ConteudoDoSite;
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
      {chave === "marca" && <IconeNaAba conteudo={conteudo} />}
      {chave === "compartilhamento" && <CartaoCompartilhado conteudo={conteudo} />}
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

/** O icone como a aba do navegador mostra: pequeno, ao lado do nome do site. */
function IconeNaAba({ conteudo }: { conteudo: ConteudoDoSite }) {
  const icone = conteudo.marca.icone[0];
  return (
    <div className="mt-3">
      <p className="text-[0.875rem] leading-[1.5] text-paper">
        {icone ? "O ícone, como aparece na aba do navegador:" : "Sem ícone enviado, a aba mostra o original:"}
      </p>
      <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-t-md bg-paper px-3 py-2 text-[0.8125rem] text-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icone?.src ?? "/icon.svg"} alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
        <span className="truncate">Podoposture | Coluna Vertebral, Dor Crônica</span>
      </div>
    </div>
  );
}

/** O cartao como o WhatsApp e as redes mostram um link do site. */
function CartaoCompartilhado({ conteudo }: { conteudo: ConteudoDoSite }) {
  const cartao = conteudo.compartilhamento.imagem;
  return (
    <div className="mt-3">
      <p className="text-[0.875rem] leading-[1.5] text-paper">Assim aparece um link do site numa conversa:</p>
      <div className="mt-2 max-w-[20rem] overflow-hidden rounded-md bg-paper text-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cartao.src}
          alt=""
          width={cartao.largura}
          height={cartao.altura}
          className="aspect-[1200/630] w-full object-cover"
        />
        <div className="px-3 py-2">
          <p className="text-[0.8125rem] font-medium">Podoposture | Coluna Vertebral, Dor Crônica</p>
          <p className="mt-0.5 line-clamp-2 text-[0.75rem] text-muted">{conteudo.contato.descricaoParaBuscadores}</p>
        </div>
      </div>
    </div>
  );
}

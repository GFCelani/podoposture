import type { Metadata } from "next";

import { ComoEOMeuAtendimento } from "@/components/como-e-o-meu-atendimento";
import { PaginaDoAtendimentoJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import {
  CAMINHO_DO_ATENDIMENTO,
  DESCRICAO_DO_ATENDIMENTO,
  ETAPAS_DO_ATENDIMENTO,
  TITULO_DO_ATENDIMENTO,
} from "@/lib/atendimento";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { NAV_GROUPS } from "@/lib/nav";

/**
 * Pasta propria, e nao uma entrada em [slug]: o texto nao veio do site
 * antigo (pages.json e' gerado pelo extrator dele) e a pagina tem composicao
 * propria. O endereco e' ASCII de proposito, entao nao passa pelo rewrite do
 * middleware. A descricao de busca e' a abertura da cliente, as duas frases.
 */

export async function generateMetadata(): Promise<Metadata> {
  const cartao = (await lerConteudoDoSite()).compartilhamento.imagem;
  return {
    title: TITULO_DO_ATENDIMENTO,
    description: DESCRICAO_DO_ATENDIMENTO,
    alternates: { canonical: CAMINHO_DO_ATENDIMENTO },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Podoposture",
      title: TITULO_DO_ATENDIMENTO,
      description: DESCRICAO_DO_ATENDIMENTO,
      url: CAMINHO_DO_ATENDIMENTO,
      images: [{ url: cartao.src, width: cartao.largura, height: cartao.altura, alt: TITULO_DO_ATENDIMENTO }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITULO_DO_ATENDIMENTO,
      description: DESCRICAO_DO_ATENDIMENTO,
      images: [cartao.src],
    },
  };
}

/** Os recursos do passo 6 que tem pagina no site, com o nome do menu. */
function recursosComPagina() {
  const rotulos = new Map(NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.href.normalize("NFC"), i.label]));
  return ETAPAS_DO_ATENDIMENTO.flatMap((e) => e.lista ?? [])
    .filter((r) => r.href)
    .map((r) => ({
      nome: rotulos.get(r.href!.normalize("NFC")) ?? r.texto,
      caminho: encodeURI(r.href!),
    }));
}

export default function Pagina() {
  return (
    <>
      <TrilhaJsonLd itens={[{ nome: TITULO_DO_ATENDIMENTO, caminho: CAMINHO_DO_ATENDIMENTO }]} />
      <PaginaDoAtendimentoJsonLd
        titulo={TITULO_DO_ATENDIMENTO}
        descricao={DESCRICAO_DO_ATENDIMENTO}
        caminho={CAMINHO_DO_ATENDIMENTO}
        recursos={recursosComPagina()}
      />
      <ComoEOMeuAtendimento />
    </>
  );
}

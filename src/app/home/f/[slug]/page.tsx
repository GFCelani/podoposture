import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Capa } from "@/components/capa";
import { ConviteConsulta } from "@/components/convite-consulta";
import { ArtigoJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { PostsRelacionados } from "@/components/relacionados";
import { SecoesDeConteudo } from "@/components/secoes-de-conteudo";
import { medidaDaCapa, ogDaCapa } from "@/lib/capa";
import { BLOG_INDEX, hrefDoPost } from "@/lib/posts";
import { buscarPostDoSite, relacionadosDoSite, slugsDePostAGerar } from "@/lib/posts-do-site";

/**
 * Os posts do blog — os do GoDaddy e os escritos pelo painel.
 *
 * A URL continua sendo /home/f/<slug> — a mesma do GoDaddy. E feia, mas e a que
 * o Google ja ranqueia: mante-la significa migrar de plataforma sem um unico
 * redirect e sem janela de reprocessamento. Trocar por /blog/<slug> seria
 * cosmetico e custaria 68 redirects mais o risco de erro de mapeamento em cada
 * um. Se um dia valer a pena, e uma mudanca isolada e reversivel.
 */

/**
 * Todo post publicado e gerado no build — os do GoDaddy, que o Google ja
 * conhece, e os do painel. Com banco, a lista vem dele; sem banco, do JSON
 * (ver posts-do-site.ts).
 */
export async function generateStaticParams() {
  return (await slugsDePostAGerar()).map((slug) => ({ slug }));
}

/**
 * Era `false`, e por isso um post publicado pelo painel dava 404 ate o proximo
 * build — que ninguem aqui consegue disparar. Com `true`, um endereco fora da
 * lista e renderizado sob demanda; se nao existir em nenhuma das duas fontes, a
 * propria pagina chama `notFound()` logo abaixo, entao continua havendo 404 de
 * verdade para endereco inventado.
 *
 * Os slugs criados pelo painel nascem sem acento, o que os mantem longe do bug
 * do Next com segmento nao-ASCII (#73965) sem depender do mapa de rotas, que so
 * e gerado no build.
 */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await buscarPostDoSite(slug);
  if (!post) return {};

  const caminho = hrefDoPost(post.slug);
  /* O cartao de compartilhamento ja vem em 1200x630 (ver lib/capa.ts). A
     capa crua era recortada pela rede social para 1.91:1, e o recorte
     cortava o texto da arte. */
  const og = ogDaCapa(post.capa || undefined);

  return {
    title: post.titulo,
    description: post.resumo,
    alternates: { canonical: caminho },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "Podoposture",
      title: post.titulo,
      description: post.resumo,
      url: caminho,
      publishedTime: post.dataISO,
      images: [{ url: og, width: 1200, height: 630, alt: post.titulo }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.titulo,
      description: post.resumo,
      images: [og],
    },
  };
}

export default async function PostDoBlog({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await buscarPostDoSite(slug);
  if (!post) notFound();

  const caminho = hrefDoPost(post.slug);
  const relacionados = await relacionadosDoSite(post.slug, 3);
  const medida = post.capa ? medidaDaCapa(post.capa) : undefined;
  /* A moldura segue a razao da capa, com piso de 4:5: ate ali a capa entra
     inteira; mais alta que isso (as 2:3 e 9:16), a moldura para em 4:5 e a
     capa e' cortada so por baixo, onde a arte nao tem o titulo. Nunca mais
     estreita que a capa, que o corte seria nas laterais. Sem medida (capa de
     fora das duas fontes conhecidas), 3:2, a razao da capa mais larga. */
  const razao = medida ? Math.max(medida.largura / medida.altura, 4 / 5) : 3 / 2;

  return (
    <>
      <TrilhaJsonLd
        itens={[
          { nome: "Nosso Blog", caminho: BLOG_INDEX },
          { nome: post.titulo, caminho },
        ]}
      />
      <ArtigoJsonLd
        titulo={post.titulo}
        descricao={post.resumo}
        caminho={caminho}
        dataISO={post.dataISO}
        imagem={post.capa || undefined}
      />

      <PageShell
        tipo="post"
        titulo={post.titulo}
        subtitulo={post.resumo}
        trilha={[
          { nome: "Nosso Blog", href: BLOG_INDEX },
          { nome: post.titulo },
        ]}
        midia={
          post.capa ? (
            /* O alt vazio e' deliberado: sao pecas graficas com o titulo do
               post embutido, e o titulo ja esta no h1 ao lado; repeti-lo no
               alt leria duas vezes no leitor de tela. */
            <Capa
              src={post.capa}
              proporcao={String(razao)}
              prioridade
              sizes="(min-width: 1024px) 480px, calc(100vw - 3rem)"
              className="pi-capa-post rounded-lg shadow-plate"
              style={{ ["--r" as string]: razao }}
            />
          ) : undefined
        }
        meta={
          <p
            className="mb-6 flex items-center gap-4 text-[0.6875rem] tracking-[0.16em] text-muted uppercase"
            style={{ fontFamily: "var(--mono)" }}
          >
            <time dateTime={post.dataISO}>{post.dataRotulo}</time>
            {post.categorias[0] && (
              <>
                <span aria-hidden="true" className="h-px w-8 bg-rule" />
                <span>{post.categorias[0]}</span>
              </>
            )}
          </p>
        }
      >
        <SecoesDeConteudo html={post.html} tipo="post" />
        <PostsRelacionados posts={relacionados} />
        <ConviteConsulta />
      </PageShell>
    </>
  );
}

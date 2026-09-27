import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CapaInteira } from "@/components/capa-inteira";
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
  /* O cartao de compartilhamento ja vem em 1200x630 com a capa inteira (ver
     lib/capa.ts). A capa crua era recortada pela rede social para 1.91:1, e
     o recorte cortava o texto da arte. */
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
  /* Sem medida (capa de fora das duas fontes conhecidas), a moldura fica em
     4:5 e a capa entra inteira dentro dela, com o fundo desfocado. */
  const razao = medida ? medida.largura / medida.altura : 4 / 5;

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
        {/* A capa e' a imagem do post, a direita da abertura e inteira. O
            alt vazio e' deliberado: sao pecas graficas com o titulo do post
            embutido, e o titulo ja esta no h1 logo acima; repeti-lo no alt
            leria duas vezes no leitor de tela. */}
        <SecoesDeConteudo
          html={post.html}
          tipo="post"
          lado={
            post.capa
              ? {
                  razao,
                  figura: (
                    <figure
                      className="pi-lado-foto rounded-lg border border-rule bg-paper p-2 shadow-plate"
                      style={{ ["--r" as string]: razao }}
                    >
                      <CapaInteira
                        src={post.capa}
                        proporcao={medida ? `${medida.largura} / ${medida.altura}` : "4 / 5"}
                        prioridade
                        sizes="(min-width: 1024px) 400px, 100vw"
                        className="rounded-md"
                      />
                    </figure>
                  ),
                }
              : undefined
          }
        />
        <PostsRelacionados posts={relacionados} />
        <ConviteConsulta />
      </PageShell>
    </>
  );
}

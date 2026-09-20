import type { ConteudoDoSite } from "@/lib/conteudo-tipos";
import type { Post, Tema } from "@/lib/posts";
import { categoriasDoSite, todosOsPosts } from "@/lib/posts-do-site";
import { contatoDoCabecalho, derivarContato } from "@/lib/site";

import { Approach } from "./approach";
import { ClinicalResponsibility } from "./clinical-responsibility";
import { Contact } from "./contact";
import { FloatingWhatsApp } from "./floating-whatsapp";
import { Gallery } from "./gallery";
import { Hero } from "./hero";
import { Journal } from "./journal";
import { SeamRuler } from "./layers";
import { MetodoRegulador } from "./metodo-regulador";
import { ServicesGrid } from "./services-grid";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SocialBand } from "./social-band";
import { TreatmentCards } from "./treatment-cards";
import { UnderstandFirst } from "./understand-first";
import { Welcome } from "./welcome";

/** Quantos textos do blog a secao 10 lista. */
const TEXTOS_NA_PAGINA_INICIAL = 10;

export type BlogDaPaginaInicial = { posts: Post[]; categorias: Tema[] };

/**
 * Os textos e temas da secao 10, do JSON e do banco. Nunca lanca: sem banco, ou
 * com ele fora, `posts-do-site` devolve so o acervo do repositorio.
 */
export async function lerBlogDaPaginaInicial(): Promise<BlogDaPaginaInicial> {
  const [posts, categorias] = await Promise.all([todosOsPosts(), categoriasDoSite()]);
  return { posts: posts.slice(0, TEXTOS_NA_PAGINA_INICIAL), categorias };
}

/**
 * A composicao da pagina inicial, sem leitura nenhuma.
 *
 * Existe separada de app/page.tsx para a previa do painel montar EXATAMENTE a
 * mesma pagina com o rascunho por cima. Duas copias da composicao divergiriam
 * na primeira secao nova, e a previa passaria a mostrar uma pagina que o site
 * nao tem.
 *
 * Numerais das secoes, figuras e a ordem ficam aqui, fora do painel: a
 * numeracao 01-12 conta a sequencia, e esconder ou reordenar secao a quebraria.
 */
export function PaginaInicial({
  conteudo,
  blog,
}: {
  conteudo: ConteudoDoSite;
  blog: BlogDaPaginaInicial;
}) {
  const contato = derivarContato(conteudo.contato);
  const { whatsapp } = contato;

  return (
    <>
      <SiteHeader contato={contatoDoCabecalho(contato)} />
      <main id="conteudo">
        <Hero conteudo={conteudo.hero} whatsapp={whatsapp} />
        <SeamRuler />
        <Welcome conteudo={conteudo["bem-vindo"]} />
        <ClinicalResponsibility
          conteudo={conteudo.responsabilidade}
          anos={contato.anosDeExperiencia}
          whatsapp={whatsapp}
        />
        <UnderstandFirst conteudo={conteudo.compreender} />
        <SeamRuler />
        <Approach conteudo={conteudo.abordagem} whatsapp={whatsapp} />
        <MetodoRegulador conteudo={conteudo.metodo} whatsapp={whatsapp} />
        <TreatmentCards conteudo={conteudo.tratamentos} />
        <ServicesGrid conteudo={conteudo.servicos} />
        <Contact contato={contato} textos={conteudo["contato-secao"]} />
        <Journal
          titulo={conteudo["blog-secao"].titulo}
          posts={blog.posts}
          categorias={blog.categorias}
        />
        <Gallery conteudo={conteudo.galeria} />
        <SeamRuler />
        <SocialBand n="12" titulo={conteudo["redes-secao"].titulo} redes={contato.redes} />
      </main>
      <SiteFooter contato={contato} />
      <FloatingWhatsApp whatsapp={whatsapp} />
    </>
  );
}

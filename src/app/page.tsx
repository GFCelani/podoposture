import { lerBlogDaPaginaInicial, PaginaInicial } from "@/components/pagina-inicial";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";

/**
 * A pagina inicial.
 *
 * Continua estatica de proposito: sem `dynamic`, sem `revalidate`, sem cookies,
 * cabecalhos ou searchParams. O banco e lido no build e na primeira visita
 * depois de cada publicacao (as rotas do painel chamam revalidatePath), entao
 * visitante nenhum paga consulta, e o banco fora do ar nao derruba a pagina:
 * as duas leituras caem no conteudo padrao.
 */
export default async function Home() {
  const [conteudo, blog] = await Promise.all([lerConteudoDoSite(), lerBlogDaPaginaInicial()]);
  return <PaginaInicial conteudo={conteudo} blog={blog} />;
}

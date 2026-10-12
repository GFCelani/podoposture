import { revalidatePath } from "next/cache";

import { rotaDaPagina } from "@/lib/pages";

/**
 * O que uma pagina publicada, tirada do ar ou apagada muda no site: ela
 * mesma, o menu, que esta em toda pagina (por isso o layout inteiro), e o
 * sitemap. Mesma ideia da publicacao da pagina inicial.
 */
export function revalidarPaginas(slug: string | null) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/${rotaDaPagina(slug)}`);
  revalidatePath("/sitemap.xml");
}

/**
 * Identidade e dados fixos do site, num lugar so.
 *
 * O NAP (nome, endereco, telefone) estava repetido entre contact.tsx e o
 * rodape; como ele tambem alimenta o JSON-LD de negocio local, divergencia
 * entre as copias vira divergencia no que o Google indexa. Fonte unica aqui.
 */

/**
 * URL canonica do site.
 *
 * O fallback e o dominio de producao, nao localhost: o valor errado nao quebra
 * o build, so faz o og:image apontar para um servidor que ninguem alcanca — foi
 * exatamente o que aconteceu no preview, onde o cartao do WhatsApp saia
 * apontando para http://localhost:3000/og.png.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://podoposture.com.br"
).replace(/\/$/, "");

export const SITE_NAME = "Podoposture";

export const DESCRICAO_PADRAO =
  "Integração terapêutica efetiva, inovadora com resultados rápidos e eficazes. " +
  "Osteopatia, posturologia e acupuntura em Copacabana, Rio de Janeiro.";

/**
 * Verificacao de propriedade do Google Search Console.
 *
 * Esta meta tag vive no HTML do site GoDaddy hoje. Quando o dominio apontar
 * para ca, sem ela a clinica perde o acesso ao Search Console — justamente no
 * momento em que ele e a principal ferramenta para provar que a migracao nao
 * custou trafego. Mantida verbatim, por redundancia com a verificacao por DNS.
 */
export const GOOGLE_SITE_VERIFICATION = "PbHiCclqlcemqO2F6myJInsR0RquVe3S2IJ4ZRTxTBg";

export const CLINICA = {
  rua: "Avenida Nossa Senhora de Copacabana, 928 — sala 501",
  bairro: "Copacabana",
  cidade: "Rio de Janeiro",
  estado: "RJ",
  cep: "22020-002",
  pais: "BR",
  latitude: -22.9711,
  longitude: -43.1863,
  telefone: "+552122554845",
} as const;

export const RESPONSAVEL = {
  nome: "Claudia Meirelles",
  titulo: "Osteopata, Posturologista e Acupunturista",
} as const;

/**
 * Perfis sociais.
 *
 * LinkedIn e Pinterest chegaram do site antigo malformados — dominio duplicado
 * e "https" truncado para "ttps" — e por isso nao abrem. Preservar um link
 * quebrado nao preserva destino nenhum, entao aqui eles vao corrigidos. Os
 * destinos finais sao os mesmos que a autora pretendia.
 */
export const REDES = {
  facebook: "https://www.facebook.com/1761419930738285",
  instagram: "https://www.instagram.com/podoposture/",
  linkedin: "https://www.linkedin.com/in/claudia-m-b-oliveira-79312937",
  pinterest: "https://br.pinterest.com/pin/571323902725564321/",
} as const;

export const SAME_AS = Object.values(REDES);

/** URL absoluta a partir de um caminho do site. */
export function urlAbsoluta(caminho: string): string {
  return `${SITE_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}

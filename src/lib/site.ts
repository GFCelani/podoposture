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

/**
 * Endereco, contato e horario em forma de apresentacao.
 *
 * CLINICA acima e' o dado estruturado que alimenta o JSON-LD; isto aqui e' o
 * mesmo endereco na forma em que ele aparece na tela. Estavam soltos dentro
 * de contact.tsx, e o rodape nao tinha endereco nenhum: o visitante que
 * procurava onde a clinica fica precisava atravessar oito secoes da home ate
 * a secao 09. Uma fonte so, para as duas pecas nunca divergirem.
 */
export const ENDERECO = {
  /* Espaco duro antes do numero: no menu do telefone a linha quebra, e sem
     ele o "928" cai sozinho numa linha, orfao do proprio logradouro. */
  rua: "Avenida Nossa Senhora de Copacabana,\u00A0928",
  sala: "Sala 501, Copacabana",
  local: "Rio de Janeiro, RJ",
  completo:
    "Avenida Nossa Senhora de Copacabana, 928 - sala 501 - Copacabana, Rio de Janeiro - RJ, Brasil",
  referencia: "Estamos a 11 minutos da estação Cantagalo do metrô.",
} as const;

const MAPS_BUSCA = encodeURIComponent(
  "Avenida Nossa Senhora de Copacabana, 928, Copacabana, Rio de Janeiro",
);

/** Enquadramento z=14: ver a nota do mapa em contact.tsx. */
export const MAPS_EMBED = `https://www.google.com/maps?q=${MAPS_BUSCA}&z=14&output=embed`;
export const MAPS_DIRECOES = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_BUSCA}`;

export const TELEFONES = [
  { label: "+ 55 21 2255-4845", href: "tel:552122554845", nota: null },
  { label: "+ 55 21 99203-5643", href: "tel:5521992035643", nota: "WhatsApp" },
] as const;

export const WHATSAPP = "https://wa.me/5521992035643";
export const EMAIL = "contatopodoposture@gmail.com";
export const HORARIO = "Segunda a sexta-feira, das 8h às 19h";

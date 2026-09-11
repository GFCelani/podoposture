import { CONTEUDO_PADRAO } from "./conteudo-padrao";
import { linkDoWhatsapp, type ConteudoContato } from "./conteudo-tipos";

/**
 * Identidade do site e a forma de apresentacao dos dados de contato.
 *
 * Os dados de contato (telefones, endereco, redes, responsavel) deixaram de
 * ser constantes daqui: agora sao editaveis pelo painel e chegam de
 * `lerConteudoDoSite()`. O que ficou neste arquivo e o que nao se edita (URL,
 * nome, verificacao do Google, coordenadas) e `derivarContato`, que monta de
 * UM cadastro todas as formas em que o contato aparece. Antes eram tres
 * formas do endereco escritas a mao (JSON-LD, tela e busca do mapa) e o
 * WhatsApp repetido em seis componentes; trocar o numero num lugar deixava o
 * site com dois numeros.
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

/**
 * A descricao do conteudo PADRAO. Quem renderiza pagina usa a publicada
 * (`contato.descricao`); esta constante fica para o que roda fora da arvore de
 * pagina e nao le banco: o manifest e a descricao de reserva de pages.ts.
 */
export const DESCRICAO_PADRAO = CONTEUDO_PADRAO.contato.descricaoParaBuscadores;

/**
 * Verificacao de propriedade do Google Search Console.
 *
 * Esta meta tag vive no HTML do site GoDaddy hoje. Quando o dominio apontar
 * para ca, sem ela a clinica perde o acesso ao Search Console — justamente no
 * momento em que ele e a principal ferramenta para provar que a migracao nao
 * custou trafego. Mantida verbatim, por redundancia com a verificacao por DNS.
 */
export const GOOGLE_SITE_VERIFICATION = "PbHiCclqlcemqO2F6myJInsR0RquVe3S2IJ4ZRTxTBg";

/**
 * Coordenadas do JSON-LD. Fixas no codigo de proposito: o painel edita o
 * endereco em texto, e um geocodificador seria dependencia e chamada externa
 * para um dado que muda uma vez na vida. Se a clinica mudar, remedir aqui.
 */
const COORDENADAS = { latitude: -22.9711, longitude: -43.1863 } as const;

/** URL absoluta a partir de um caminho do site. */
export function urlAbsoluta(caminho: string): string {
  return `${SITE_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}

export type Telefone = { label: string; href: string; nota: string | null };

/** O contato ja na forma em que cada peca da tela e o JSON-LD o usam. */
export type ContatoDoSite = {
  /** Link do WhatsApp (wa.me). Destino de todo botao de mensagem. */
  whatsapp: string;
  telefones: Telefone[];
  /** O fixo na forma curta do convite de fecho: "(21) 2255-4845". */
  telefoneFixo: { curto: string; href: string };
  email: string;
  horario: string;
  endereco: { rua: string; sala: string; local: string; completo: string; referencia: string };
  mapsEmbed: string;
  mapsDirecoes: string;
  /** O dado estruturado que alimenta o JSON-LD de negocio local. */
  clinica: {
    rua: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    pais: string;
    latitude: number;
    longitude: number;
    telefone: string;
  };
  redes: ConteudoContato["redes"];
  sameAs: string[];
  responsavel: ConteudoContato["responsavel"];
  descricao: string;
  anosDeExperiencia: number;
};

/** O pedaco que o cabecalho (componente de cliente) recebe por prop. */
export type ContatoDoCabecalho = Pick<ContatoDoSite, "whatsapp" | "telefones" | "endereco" | "mapsDirecoes">;

/** "5521992035643" -> DDI, DDD e o numero com hifen antes dos 4 ultimos. */
function partesDoTelefone(digitos: string): { ddi: string; ddd: string; numero: string } {
  const numero = digitos.slice(4);
  return { ddi: digitos.slice(0, 2), ddd: digitos.slice(2, 4), numero: `${numero.slice(0, -4)}-${numero.slice(-4)}` };
}

export function derivarContato(c: ConteudoContato): ContatoDoSite {
  const fixo = partesDoTelefone(c.telefoneFixo);
  const zap = partesDoTelefone(c.whatsapp);
  const { rua, numero, sala, bairro, cidade, uf, cep, referencia } = c.endereco;

  // Busca do mapa sem a sala: o Google acha o predio, nao o conjunto, e com a
  // sala na busca o embed chegava a errar de quarteirao.
  const busca = encodeURIComponent(`${rua}, ${numero}, ${bairro}, ${cidade}`);

  return {
    whatsapp: linkDoWhatsapp(c.whatsapp),
    telefones: [
      { label: `+ ${fixo.ddi} ${fixo.ddd} ${fixo.numero}`, href: `tel:${c.telefoneFixo}`, nota: null },
      { label: `+ ${zap.ddi} ${zap.ddd} ${zap.numero}`, href: `tel:${c.whatsapp}`, nota: "WhatsApp" },
    ],
    telefoneFixo: { curto: `(${fixo.ddd}) ${fixo.numero}`, href: `tel:${c.telefoneFixo}` },
    email: c.email,
    horario: c.horario,
    endereco: {
      /* Espaco duro antes do numero: no menu do telefone a linha quebra, e sem
         ele o numero cai sozinho numa linha, orfao do proprio logradouro. */
      rua: `${rua}, ${numero}`,
      sala: sala ? `Sala ${sala}, ${bairro}` : bairro,
      local: `${cidade}, ${uf}`,
      completo: `${rua}, ${numero}${sala ? ` - sala ${sala}` : ""} - ${bairro}, ${cidade} - ${uf}, Brasil`,
      referencia,
    },
    /* Enquadramento z=14: ver a nota do mapa em contact.tsx. */
    mapsEmbed: `https://www.google.com/maps?q=${busca}&z=14&output=embed`,
    mapsDirecoes: `https://www.google.com/maps/dir/?api=1&destination=${busca}`,
    clinica: {
      rua: `${rua}, ${numero}${sala ? ` — sala ${sala}` : ""}`,
      bairro,
      cidade,
      estado: uf,
      cep,
      pais: "BR",
      latitude: COORDENADAS.latitude,
      longitude: COORDENADAS.longitude,
      telefone: `+${c.telefoneFixo}`,
    },
    redes: c.redes,
    sameAs: Object.values(c.redes),
    responsavel: c.responsavel,
    descricao: c.descricaoParaBuscadores,
    anosDeExperiencia: c.anosDeExperiencia,
  };
}

export function contatoDoCabecalho(c: ContatoDoSite): ContatoDoCabecalho {
  return { whatsapp: c.whatsapp, telefones: c.telefones, endereco: c.endereco, mapsDirecoes: c.mapsDirecoes };
}

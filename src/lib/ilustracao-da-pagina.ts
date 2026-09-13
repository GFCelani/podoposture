/**
 * A fotografia de cada pagina informativa.
 *
 * As 18 paginas chegaram do GoDaddy sem uma unica imagem: 0 <img> e 0 <figure>
 * em todas. Duas fontes cobrem isso sem inventar nada:
 *
 *   - o glifo, que ja existia em service-glyphs.tsx e so era usado na grade de
 *     servicos da home. A chave dele e sempre "/" + slug, entao nao precisa de
 *     mapa: quem nao tem glifo cai em undefined e a pagina vai sem emblema.
 *   - a fotografia, e essa precisa de tabela, porque vale uma regra dura: a
 *     foto entra SO se mostra o lugar, o aparelho ou o gesto de que a pagina
 *     fala. Usar a sala de exame para ilustrar "Quem Somos" seria decorar,
 *     nao informar. A fonte e' a galeria da clinica; onde ela nao tem a cena,
 *     entra foto de acervo livre marcada como ilustrativa (ver o fim de
 *     FOTOS). Sem foto honesta de nenhuma das duas, fica o placeholder.
 *
 * Toda foto e retrato (proporcao 4:5) — as medidas sao as reais do arquivo,
 * para o navegador reservar o espaco e o CLS continuar zero.
 */

export type Foto = {
  src: string;
  /** Descreve a cena para quem nao ve a imagem. */
  alt: string;
  /** Legenda visivel: diz o que e, sem prometer resultado. */
  legenda: string;
  largura: number;
  altura: number;
};

const GALERIA = "/img/galeria";

/** Cena + medidas; so a legenda muda de uma pagina para a outra. */
const SALA = {
  src: `${GALERIA}/sala-de-exame.webp`,
  alt: "Maca de atendimento na sala de exame da Podoposture, com apoio de cabeça e lençol claro.",
  largura: 924,
  altura: 1155,
};

const AGULHAS = {
  src: `${GALERIA}/acupuntura.webp`,
  alt: "Materiais de acupuntura organizados sobre a bancada do consultório.",
  legenda: "Materiais de acupuntura e eletroacupuntura.",
  largura: 1024,
  altura: 1280,
};

const FOTOS: Record<string, Foto> = {
  osteopatia: {
    ...SALA,
    legenda: "Sala de exame onde são feitas as sessões de terapia manual.",
  },
  "flexo-distração": {
    ...SALA,
    legenda: "A flexo-distração é aplicada em maca própria, na sala de exame.",
  },
  acupuntura: AGULHAS,
  "acupuntura-clínica": AGULHAS,
  posturologia: {
    src: `${GALERIA}/avaliacao-postural.webp`,
    alt: "Painel quadriculado usado na avaliação postural, com marcações verticais e horizontais.",
    legenda: "Painel de referência usado na avaliação postural.",
    largura: 857,
    altura: 1072,
  },
  baropodometria: {
    src: `${GALERIA}/plataforma-de-pressao.webp`,
    alt: "Plataforma de pressão no piso do consultório, usada para medir a distribuição de carga nos pés.",
    legenda: "Plataforma de pressão usada no exame de baropodometria.",
    largura: 864,
    altura: 1080,
  },
  "palmilhas-personalizadas": {
    src: `${GALERIA}/corredor-de-marcha.webp`,
    alt: "Corredor de marcha do consultório, usado para observar a pisada em movimento.",
    legenda: "Corredor de marcha: a pisada é observada andando, não só parada.",
    largura: 1200,
    altura: 1500,
  },
  "método-posture+": {
    src: `${GALERIA}/consultorio.webp`,
    alt: "Vista geral do consultório da Podoposture, com maca, bancada e equipamentos de avaliação.",
    legenda: "O consultório onde o método é aplicado, em Copacabana.",
    largura: 819,
    altura: 1024,
  },
  "quem-somos": {
    src: `${GALERIA}/recepcao.webp`,
    alt: "Recepção da Podoposture, com poltronas e iluminação clara.",
    legenda: "A recepção da clínica, na Avenida Nossa Senhora de Copacabana.",
    largura: 827,
    altura: 1033,
  },
  "responsável-técnica": {
    src: `${GALERIA}/escritorio.webp`,
    alt: "Escritório da clínica, com mesa de trabalho e certificados na parede.",
    legenda: "O escritório onde são feitas as anamneses e a leitura dos exames.",
    largura: 960,
    altura: 1200,
  },

  /* Fotos de acervo livre, no lugar de cena que a clinica ainda nao
     fotografou. Nao sao da Podoposture, e a legenda diz isso: sem rosto
     identificavel, para ninguem tomar a pessoa por paciente ou equipe.
     Ficam fora de /img/galeria, que e' so foto real. Todas sob a licenca
     Pexels (pexels.com/license): uso comercial, sem atribuicao obrigatoria.
     Recorte 4:5 a partir do original. */
  "neuromodulação": {
    // pexels.com/photo/30483052, Cansu Hangül
    src: "/img/eletroestimulacao-no-joelho.webp",
    alt: "Mão posicionando um eletrodo adesivo na perna, junto ao joelho, com cabos laranja e azul ligados aos eletrodos.",
    legenda: "Imagem ilustrativa: eletrodos de superfície para estimulação elétrica.",
    largura: 1200,
    altura: 1500,
  },
  "dor-lombar-crônica": {
    // pexels.com/photo/5793807, Yan Krukau
    src: "/img/palpacao-lombar.webp",
    alt: "Mão de um profissional apoiada na região lombar de uma pessoa de camisa branca.",
    legenda: "Imagem ilustrativa: palpação da região lombar.",
    largura: 1200,
    altura: 1500,
  },
  "tratamento-da-dor": {
    // pexels.com/photo/4506107, Karolina Grabowska (Kaboompics)
    src: "/img/avaliacao-da-coluna.webp",
    alt: "Paciente de costas, com a mão de um profissional no ombro e a outra na região lombar.",
    legenda: "Imagem ilustrativa: palpação da coluna durante a avaliação.",
    largura: 1200,
    altura: 1500,
  },
};

/**
 * O que falta fotografar. Quatro paginas nao tem cena honesta nem no acervo
 * da clinica nem em acervo livre: nao ha foto da responsavel tecnica (e nao
 * pode haver de banco), e os acervos nao mostram RPG, avaliacao de ATM nem
 * eletrodo auricular sem trocar o procedimento. Cada rotulo aqui vira um
 * PlaceholderFoto no lugar da foto e uma linha no pedido a cliente. Quando a
 * foto chegar, ela entra em FOTOS e a linha sai daqui.
 */
const PLACEHOLDERS: Record<string, string> = {
  "currículo-profissional": "retrato da responsável técnica",
  rpg: "sessão de RPG na sala de exame",
  "tratamento-da-dtm": "avaliação da ATM em consulta",
  "tratamento-do-zumbido": "aplicação de neuromodulação auricular",
};

/* Os slugs chegam do JSON com acento. Normalizar as chaves uma vez evita a
   divergencia NFC/NFD entre Windows e Linux que ja custou caro nas rotas. */
const POR_SLUG = new Map(
  Object.entries(FOTOS).map(([slug, foto]) => [slug.normalize("NFC"), foto]),
);
const PLACEHOLDER_POR_SLUG = new Map(
  Object.entries(PLACEHOLDERS).map(([slug, rotulo]) => [
    slug.normalize("NFC"),
    rotulo,
  ]),
);

/**
 * Fotografias de apoio, distribuidas no corpo da pagina (ver
 * SecoesDeConteudo). A mesma regra da foto do hero, aplicada por trecho: a
 * foto entra ao lado do passo que descreve o que ela mostra. Por isso a
 * tabela e' por pagina e por enquanto so tem uma entrada: a avaliacao da
 * dor lista anamnese, padrao postural e pisada, e o acervo tem o escritorio
 * das anamneses, o painel postural e a plataforma de pressao. As legendas
 * sao as mesmas das fotos acima; nenhuma foi escrita para aqui.
 */
const APOIO: Record<string, Foto[]> = {
  "tratamento-da-dor": [
    {
      src: `${GALERIA}/escritorio.webp`,
      alt: "Escritório da clínica, com mesa de trabalho e certificados na parede.",
      legenda: "O escritório onde são feitas as anamneses e a leitura dos exames.",
      largura: 960,
      altura: 1200,
    },
    FOTOS.posturologia,
    FOTOS.baropodometria,
  ],
};

const APOIO_POR_SLUG = new Map(
  Object.entries(APOIO).map(([slug, fotos]) => [slug.normalize("NFC"), fotos]),
);

export function fotosDeApoio(slug: string): Foto[] | undefined {
  return APOIO_POR_SLUG.get(slug.normalize("NFC"));
}

export function ilustracaoDaPagina(slug: string): {
  glifo: string;
  foto?: Foto;
  /** Rotulo do placeholder, quando a foto ainda nao existe. */
  placeholder?: string;
} {
  const chave = slug.normalize("NFC");
  return {
    glifo: `/${chave}`,
    foto: POR_SLUG.get(chave),
    placeholder: PLACEHOLDER_POR_SLUG.get(chave),
  };
}

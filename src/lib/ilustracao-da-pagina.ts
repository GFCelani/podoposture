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
  /** So para foto de apoio: id da secao ao lado da qual ela entra. */
  secao?: string;
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
    alt: "Corredor de marcha do consultório: faixa no piso com as plataformas de pressão, diante do espelho de corpo inteiro.",
    legenda: "Corredor de marcha: a pisada é observada andando, não só parada.",
    largura: 1086,
    altura: 1357,
  },
  "método-posture+": {
    src: `${GALERIA}/consultorio.webp`,
    alt: "Consultório da Podoposture, com certificados na parede, painel quadriculado de avaliação postural e plataformas de pressão no piso.",
    legenda: "O consultório onde o método é aplicado, em Copacabana.",
    largura: 869,
    altura: 1086,
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
    alt: "Escritório da clínica, com mesa de trabalho e o painel com o nome e as especialidades da Dra. Claudia.",
    legenda: "O escritório onde são feitas as anamneses e a leitura dos exames.",
    largura: 869,
    altura: 1086,
  },

  /* As tres abaixo chegaram no acervo que a cliente mandou em 2026-09-20 e
     sao fotografia da propria clinica, nao acervo livre. As duas de
     neuromodulacao sao a mesma sessao, em dois enquadramentos; a cliente ja
     as publicou com a marca d'agua dela, e o recorte 4:5 entra abaixo da
     marca para o logotipo nao aparecer dentro da foto num site que ja tem a
     marca no cabecalho. Nenhuma das duas mostra rosto. */
  "currículo-profissional": {
    src: `${GALERIA}/retrato-responsavel-tecnica.webp`,
    alt: "Dra. Claudia Meirelles, de jaleco branco, no consultório; atrás dela, os certificados de formação emoldurados na parede.",
    legenda: "A responsável técnica, diante dos certificados de formação.",
    largura: 1024,
    altura: 1280,
  },
  "tratamento-do-zumbido": {
    src: `${GALERIA}/neuromodulacao-auricular.webp`,
    alt: "Orelha com dois eletrodos de neuromodulação presos: um clipe metálico de cabo amarelo na parte interna e um clipe branco na borda.",
    legenda: "Os eletrodos da neuromodulação auricular, na posição de aplicação.",
    largura: 712,
    altura: 890,
  },
  "neuromodulação": {
    src: `${GALERIA}/neuromodulacao-auricular-dupla.webp`,
    alt: "Orelha de uma paciente deitada, com dois eletrodos brancos presos junto à entrada do canal auditivo e os cabos descendo pelo cabelo.",
    legenda: "Aplicação auricular: os eletrodos ficam na orelha, e a sessão é feita deitado.",
    largura: 704,
    altura: 880,
  },

  /* Fotos de acervo livre, no lugar de cena que a clinica ainda nao
     fotografou. Nao sao da Podoposture, e a legenda diz isso. Sem rosto
     identificavel, para ninguem tomar a pessoa por paciente ou equipe; a
     unica excecao e' a de DTM, logo abaixo. Ficam fora de /img/galeria, que
     e' so foto real. Estas tres sob a licenca Pexels (pexels.com/license):
     uso comercial, sem atribuicao obrigatoria. Recorte 4:5 a partir do
     original.

     Eram quatro ate 2026-09-20. A de neuromodulacao mostrava eletrodo
     adesivo no joelho, e o acervo da cliente trouxe a foto da aplicacao
     auricular que a clinica de fato faz; a de banco saiu. As outras tres
     continuam porque o acervo nao tem a cena: o que ele tem de RPG, de
     avaliacao da dor e de palpacao lombar sao fotos de banco com a marca
     d'agua da clinica aplicada por cima, o que nao e' foto real, e trocar
     banco sem marca por banco com marca nao melhora nada. */
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
  rpg: {
    // pexels.com/photo/5793895, Yan Krukau
    src: "/img/conducao-da-perna-na-maca.webp",
    alt: "Pernas de uma paciente deitada na maca; uma fisioterapeuta segura o calcanhar e apoia a outra mão na coxa, conduzindo a perna estendida.",
    legenda: "Imagem ilustrativa: condução da perna com o paciente deitado.",
    largura: 1200,
    altura: 1500,
  },
  /* Unica foto de acervo com rosto: procedimento na mandibula nao tem
     enquadramento sem ele. Licenca Unsplash (unsplash.com/license): uso
     comercial, sem atribuicao obrigatoria. O arquivo ja e' 4:5, sem recorte. */
  "tratamento-da-dtm": {
    // unsplash.com/photos/Nyg_gvnLr4s, Ruslan Zaplatin
    src: "/img/palpacao-da-mandibula.webp",
    alt: "Mão de um profissional apoiada na mandíbula de um rapaz, com os dedos ao longo do queixo, logo abaixo da orelha.",
    legenda: "Imagem ilustrativa: palpação da mandíbula.",
    largura: 1200,
    altura: 1500,
  },
};

/**
 * Pronta no codigo, desligada no site.
 *
 * Unica fotografia do acervo que mostra um atendimento acontecendo: paciente
 * em decubito ventral na maca de flexo-distracao, com a grade postural da
 * clinica ao fundo. Ela NAO entra em FOTOS e portanto nao vai ao ar. Duas
 * razoes, e as duas precisam cair para ela subir:
 *
 *   1. Autorizacao. Ha paciente na cena. O rosto nao aparece, mas a pessoa
 *      esta em roupa minima e em atendimento, e isso nao se publica sem
 *      autorizacao por escrito. So a cliente pode dizer se tem.
 *   2. Enquadramento. E' foto de celular, de pe, com luz chapada e a maca
 *      cortada na diagonal. Mesmo autorizada, ela fica abaixo das outras da
 *      galeria. Vale refazer a cena, nao so liberar esta.
 *
 * Para ligar: mover este objeto para dentro de FOTOS, na chave
 * "flexo-distração", no lugar de SALA.
 */
const AGUARDANDO_AUTORIZACAO: Record<string, Foto> = {
  "flexo-distração": {
    src: `${GALERIA}/flexo-distracao-em-sessao.webp`,
    alt: "Paciente deitada de bruços na maca de flexo-distração, com fitas de apoio nas costas; ao fundo, a grade de avaliação postural da clínica.",
    legenda: "Sessão de flexo-distração na sala de exame.",
    largura: 864,
    altura: 1080,
  },
};
void AGUARDANDO_AUTORIZACAO;

/**
 * O que falta fotografar. Vazio desde 2026-09-20: as duas pendencias eram o
 * retrato da responsavel tecnica, que nao podia vir de banco, e o eletrodo
 * auricular de taVNS, que nao existia em nenhum acervo livre. As duas
 * chegaram no material que a cliente mandou e estao em FOTOS.
 *
 * Cada rotulo aqui vira um PlaceholderFoto no lugar da foto e uma linha no
 * pedido a cliente, em /fotos-que-faltam. Voltar a preencher este mapa se
 * alguma pagina nova nascer sem foto.
 */
const PLACEHOLDERS: Record<string, string> = {};

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
 * tabela e' por pagina. A avaliacao da dor lista anamnese, padrao postural e
 * pisada, e o acervo tem o escritorio das anamneses, o painel postural e a
 * plataforma de pressao; as legendas sao as mesmas das fotos acima. A DTM
 * abre com a secao de cefaleia tensional, e a foto de terapia na base do
 * cranio entra ao lado dela: `secao` ancora a foto pelo id do titulo, porque
 * sem ancora ela iria para a primeira banda em superficie, la no bruxismo.
 */
const APOIO: Record<string, Foto[]> = {
  "tratamento-da-dor": [
    {
      src: `${GALERIA}/escritorio.webp`,
      alt: "Escritório da clínica, com mesa de trabalho e o painel com o nome e as especialidades da Dra. Claudia.",
      legenda: "O escritório onde são feitas as anamneses e a leitura dos exames.",
      largura: 869,
      altura: 1086,
    },
    FOTOS.posturologia,
    FOTOS.baropodometria,
  ],
  "tratamento-da-dtm": [
    {
      // pexels.com/photo/4506162, Karolina Grabowska (Kaboompics). Licenca
      // Pexels, sem rosto; recorte 16:10, o formato da foto grande de apoio.
      src: "/img/terapia-manual-na-base-do-cranio.webp",
      alt: "Paciente sentada, vista de costas, com a mão de um profissional na base do crânio e a outra no ombro; ao fundo, pranchas de anatomia na parede.",
      legenda: "Imagem ilustrativa: terapia manual na base do crânio.",
      largura: 1600,
      altura: 1000,
      secao: "cefaleia-tensional",
    },
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

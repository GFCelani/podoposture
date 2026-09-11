import type { ConteudoDoSite } from "./conteudo-tipos";

/**
 * O conteudo do site como ele e hoje, palavra por palavra.
 *
 * E o que a pagina mostra quando o banco esta vazio, desligado ou fora do ar,
 * e o que a secao volta a mostrar quando a Dra. Claudia clica em "voltar ao
 * padrao". Por isso nada aqui foi reescrito: estes textos sairam dos
 * componentes e de site.ts sem trocar uma letra, e o teste compara a pagina
 * renderizada com a captura feita antes da mudanca.
 *
 * Copy da cliente com grafias intencionais, que ninguem deve "corrigir":
 * - "MÉTODO REGULADOR" no titulo e "Método RegulaDOR" no corpo e no botao;
 *   o hifen em "da dor - desde" tambem e dela.
 * - A caixa alta dos titulos de servico e digitada, nao vem do CSS.
 * - "30 anos" no hero e na secao 03, "quase três décadas" na 02 e no cartao da
 *   responsavel tecnica: sao frases dela, e cada uma e editada onde aparece.
 * - O segundo paragrafo da secao 03 nao tem ponto final no original.
 */
export const CONTEUDO_PADRAO: ConteudoDoSite = {
  contato: {
    whatsapp: "5521992035643",
    telefoneFixo: "552122554845",
    email: "contatopodoposture@gmail.com",
    horario: "Segunda a sexta-feira, das 8h às 19h",
    endereco: {
      rua: "Avenida Nossa Senhora de Copacabana",
      numero: "928",
      sala: "501",
      bairro: "Copacabana",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      cep: "22020-002",
      referencia: "Estamos a 11 minutos da estação Cantagalo do metrô.",
    },
    /* LinkedIn e Pinterest chegaram do site antigo malformados (dominio
       duplicado e "https" truncado para "ttps") e por isso nao abriam. Aqui
       vao corrigidos: os destinos sao os mesmos que a autora pretendia. */
    redes: {
      facebook: "https://www.facebook.com/1761419930738285",
      instagram: "https://www.instagram.com/podoposture/",
      linkedin: "https://www.linkedin.com/in/claudia-m-b-oliveira-79312937",
      pinterest: "https://br.pinterest.com/pin/571323902725564321/",
    },
    responsavel: {
      nome: "Claudia Meirelles",
      titulo: "Osteopata, Posturologista e Acupunturista",
    },
    anosDeExperiencia: 30,
    descricaoParaBuscadores:
      "Integração terapêutica efetiva, inovadora com resultados rápidos e eficazes. " +
      "Osteopatia, posturologia e acupuntura em Copacabana, Rio de Janeiro.",
  },

  /* As quebras do titulo e do subtitulo foram escolhidas enumerando as
     particoes possiveis e medidas no corte de display da Newsreader; o
     porque esta em hero.tsx. */
  hero: {
    tituloLinhas: ["Integração terapêutica", "efetiva e inovadora", "com resultados", "rápidos e eficazes"],
    destaque: "efetiva",
    subtituloLinhas: [
      "Dra. Claudia Meirelles, fisioterapeuta especialista",
      "em Osteopatia e Acupuntura pelo COFFITO, com 30",
      "anos de experiência clínica. Osteopatia, posturologia",
      "e acupuntura em Copacabana, Rio de Janeiro.",
    ],
    destaquesDoSubtitulo: ["Dra. Claudia Meirelles", "30 anos de experiência clínica"],
    botoes: [
      { rotulo: "Envie uma mensagem", destino: { tipo: "whatsapp" } },
      { rotulo: "Quero mais informações", destino: { tipo: "pagina", slug: "tratamento-da-dor" } },
    ],
  },

  "bem-vindo": {
    titulo: "Bem-vindo(a) à Podoposture",
    paragrafo:
      "Com quase três décadas de experiência clínica, cuidamos de pessoas que convivem com dor, " +
      "alterações posturais e disfunções da coluna. Aqui, cada tratamento começa pela escuta e por " +
      "uma avaliação cuidadosa do corpo como um todo, respeitando a forma como cada pessoa responde ao cuidado.",
    local: "(Copacabana – Rio de Janeiro)",
    imagem: {
      src: "/img/galeria/recepcao.webp",
      largura: 827,
      altura: 1033,
      alt: "Recepção da clínica, com balcão em madeira e placa da Podoposture",
    },
  },

  responsabilidade: {
    titulo: "Cuidado com Responsabilidade Clínica",
    destaque: "Responsabilidade",
    paragrafo1: {
      antes: "Os atendimentos são realizados pela",
      link: {
        rotulo: "Dra. Claudia Meirelles",
        destino: { tipo: "pagina", slug: "responsável-técnica" },
      },
      depois:
        ", Osteopata, Posturóloga e Acupunturista com 30 anos de experiência clínica, " +
        "com atuação em dor crônica, postura e regulação do sistema nervoso.",
    },
    paragrafo2:
      "O acompanhamento é individual, com decisões clínicas ajustadas ao longo do processo, conforme a resposta de cada corpo",
    /* O botao apontava para "/nosso-blog#317e3e15-...", ancora que nao existe
       em pagina nenhuma (resto do GoDaddy). O destino real sempre foi o
       indice do blog, e a uniao fechada de destino nao guarda ancora. */
    botao: { rotulo: "Acesse o nosso Blog", destino: { tipo: "pagina", slug: "nosso-blog" } },
    imagem: {
      src: "/img/galeria/avaliacao-postural.webp",
      largura: 857,
      altura: 1072,
      alt: "Paciente em avaliação postural sobre a plataforma, de perfil ao espelho",
    },
  },

  compreender: {
    titulo: "Compreender Antes de Tratar",
    frase: "Conviver com dor ou limitações raramente é uma questão local.",
    paragrafo:
      "Com o tempo, o corpo se adapta no movimento, no sono, na forma de se organizar. Por isso, " +
      "o ponto de partida não são as técnicas. É a escuta clínica, o histórico e a leitura dos sinais " +
      "que o corpo sustenta. As intervenções vêm a partir desse entendimento.",
  },

  abordagem: {
    titulo: "Nossa Abordagem",
    passos: [
      "Na Podoposture, o cuidado não começa por protocolos prontos.",
      "Começa pela observação dos padrões de movimento, das estratégias de adaptação e da forma como o sistema nervoso participa desse processo.",
      "Cada atendimento se desenvolve a partir de uma avaliação clínica e evolui conforme as respostas do organismo.",
      "Os recursos são definidos ao longo do processo, orientados por um raciocínio clínico que acompanha cada etapa.",
      "Não se trata apenas de aplicar técnicas, mas de saber quando e por que utilizá-las.",
    ],
    imagem: {
      src: "/img/baropodometria.webp",
      largura: 1080,
      altura: 816,
      alt: "Análise de marcha com marcadores sobre plataforma de baropodometria",
    },
    legenda: "Baropodometria",
    botao: { rotulo: "Falar Sobre o Meu Caso", destino: { tipo: "whatsapp" } },
  },

  metodo: {
    titulo: "MÉTODO REGULADOR",
    abertura: "Dor persistente não é analisada por uma única estrutura.",
    corpo: [
      "O Método RegulaDOR organiza a avaliação clínica para compreender diferentes fatores que podem participar da manutenção da dor - desde os sinais dos tecidos e a função musculoesquelética até o processamento do sistema nervoso, o movimento, o estado do organismo e o contexto do paciente.",
      "A partir dessa leitura, são definidos os recursos terapêuticos mais adequados para cada caso.",
    ],
    /* A pagina do metodo ainda nao existe: sem destino o botao nasce inativo. */
    botao: { rotulo: "Conheça o Método RegulaDOR", destino: { tipo: "nenhum" } },
  },

  tratamentos: {
    cartoes: [
      {
        titulo: "Tratamento da Dor Lombar",
        destino: { tipo: "pagina", slug: "dor-lombar-crônica" },
        imagem: {
          src: "/img/card-dor-lombar.webp",
          largura: 1024,
          altura: 1280,
          alt: "Homem sentado à mesa com dor na região lombar",
        },
      },
      {
        titulo: "Tratamento da Dor Crônica",
        destino: { tipo: "pagina", slug: "tratamento-da-dor" },
        imagem: {
          src: "/img/card-dor-cronica.webp",
          largura: 1024,
          altura: 1280,
          alt: "Mulher em pé levando a mão ao pescoço, com dor cervical",
        },
      },
      {
        titulo: "Tratamento do Zumbido, Bruxismo, Cefaleias e DTMs",
        destino: { tipo: "pagina", slug: "tratamento-do-zumbido" },
        imagem: {
          src: "/img/card-zumbido.webp",
          largura: 819,
          altura: 1024,
          alt: "Mulher diante de um computador com as mãos nas têmporas, com cefaleia",
        },
      },
    ],
    rotuloDoBotao: "Saiba Mais",
  },

  /* Os 12 servicos do site antigo. No HTML de origem cada cartao carregava
     tres <h3> (dois com o titulo de outro cartao) e ate oito <p> vazios de
     espacador; ficou so o titulo visivel e os paragrafos com conteudo. */
  servicos: {
    tituloAcessivel: "Serviços",
    itens: [
      {
        titulo: "OSTEOPATIA",
        corpo: [
          "Trata a causa primária da sua dor ou queixa, seja de origem visceral, neural ou musculoesquelética através da terapia manual",
        ],
        rotulo: "Quero os benefícios da Osteopatia",
        destino: { tipo: "pagina", slug: "osteopatia" },
      },
      {
        titulo: "FLEXO-DISTRAÇÃO",
        corpo: [
          "Método inovador de tratamento não-cirúrgico da Hérnia de Disco e outras patologias da Coluna Vertebral",
        ],
        rotulo: "Quero me livrar das dores na coluna",
        destino: { tipo: "pagina", slug: "flexo-distração" },
      },
      {
        titulo: "POSTUROLOGIA",
        corpo: [
          "Relação entre dores crônicas e a postura do paciente através dos Captores Posturais (Podal, Oclusal, Ocular, Vestibular)",
        ],
        rotulo: "Quero um especialista em Postura",
        destino: { tipo: "pagina", slug: "posturologia" },
      },
      {
        titulo: "AVALIAÇÃO CLÍNICA DA DOR PERSISTENTE",
        corpo: [
          "Avaliação e cuidado clínico da dor persistente em quem já passou por diferentes tratamentos para dores musculoesqueléticas persistentes, cefaleias, dores orofaciais, desconfortos corporais recorrentes e quadros de dor associados a alterações posturais, da pisada ou da organização do movimento, mesmo após cuidados prévios.",
        ],
        rotulo: "Quero mais informações",
        destino: { tipo: "pagina", slug: "tratamento-da-dor" },
      },
      {
        titulo: "ACUPUNTURA / ELETROACUPUNTURA",
        corpo: [
          "Acupuntura e Eletroacupuntura aplicadas no tratamento de disfunções físicas, emocionais e energéticas, unindo tradição e neurociência em cada sessão.",
        ],
        rotulo: "Quero ter os benefícios da Acupuntura",
        destino: { tipo: "pagina", slug: "acupuntura" },
      },
      {
        titulo: "PALMILHAS PERSONALIZADAS",
        corpo: [
          "Palmilhas 100% personalizadas e desenvolvidas a partir de avaliação postural detalhada e do exame de baropodometria. Confeccionadas com diversos materiais de alta tecnologia, são projetadas para oferecer suporte, absorção de impacto, estabilidade e correção postural de forma individualizada.",
        ],
        rotulo: "Preciso de Palmilhas Corretivas",
        destino: { tipo: "pagina", slug: "palmilhas-personalizadas" },
      },
      {
        titulo: "NEUROMODULAÇÃO NÃO INVASIVA",
        corpo: [
          "Recursos não invasivos que utilizam estímulos leves —elétricos, luminosos ou auditivos — para modular o sistema nervoso, promover neuroplasticidade, equilíbrio autonômico e aliviar diversos sintomas.",
        ],
        rotulo: "Saiba Mais",
        destino: { tipo: "pagina", slug: "neuromodulação" },
      },
      {
        titulo: "BAROPODOMETRIA / TESTE DA PISADA",
        corpo: [
          "Exame que avalia a distribuição de pressão nos pés, o centro de gravidade e o tipo de pisada, tanto na posição estática quanto em movimento.",
          "Permite identificar o tipo de pé e os desequilíbrios posturais com precisão.",
        ],
        rotulo: "Quero melhorar minha pisada",
        destino: { tipo: "pagina", slug: "baropodometria" },
      },
      {
        titulo: "TRATAMENTO DO ZUMBIDO",
        corpo: [
          "Tratamento do Zumbido e do Zumbido Somatossensorial relacionado a disfunções da coluna cervical e da ATM, com abordagem integrativa e neurofisiológica.",
        ],
        rotulo: "Quero Ficar livre do Zumbido",
        destino: { tipo: "pagina", slug: "tratamento-do-zumbido" },
      },
      {
        titulo: "TRATAMENTO DO BRUXISMO, DA DTM E DOR OROFACIAL",
        corpo: [
          "Tratamento da Disfunção Temporomandibular (DTM), Dor Orofacial, Neuralgia do Trigêmeo, Cefaleia Tensional, Bruxismo e Apertamento Dentário — com abordagem integrativa e neurofuncional.",
        ],
        rotulo: "Quero marcar uma Avaliação",
        destino: { tipo: "pagina", slug: "tratamento-da-dtm" },
      },
      {
        titulo: "REEDUCAÇÃO POSTURAL GLOBAL",
        corpo: [
          "A RPG promove o realinhamento da coluna vertebral, o reequilíbrio das tensões musculares e o desenvolvimento da consciência corporal. Indicada para o tratamento de alterações posturais, dores crônicas e disfunções musculoesqueléticas.",
        ],
        rotulo: "Quero melhorar minha Postura",
        destino: { tipo: "pagina", slug: "rpg" },
      },
      {
        titulo: "RESPONSÁVEL TÉCNICA",
        corpo: [
          "Claudia Meirelles é Osteopata. Posturóloga e Acupunturista, com formação internacional e quase três décadas dedicadas ao tratamento da dor crônica e da coluna vertebral.",
          "À frente da Podoposture, conduz uma abordagem clínica que integra osteopatia, neurociência e regulação do sistema nervoso",
        ],
        rotulo: "Quero saber mais",
        destino: { tipo: "pagina", slug: "currículo-profissional" },
      },
    ],
  },

  "contato-secao": {
    titulo: "Converse com a Podoposture",
    subtitulo: "Sua dor merece ser compreendida",
    paragrafo:
      "Se você convive com dor ou sente que seu corpo precisa ser avaliado com mais atenção, estamos à " +
      "disposição para ouvir, orientar e entender se uma avaliação faz sentido para o seu caso.",
    rotuloDoBotao: "Envie uma mensagem",
  },

  "blog-secao": {
    titulo: "Conteúdos Para Compreender Melhor O Seu Corpo",
  },

  /* Seis fotografias reais da clinica. Recepcao e avaliacao postural moram
     nas secoes 02 e 03 e ficam fora daqui para nao repetir; a sacola de pano
     saiu a pedido da cliente (2026-09-07) e entrou o consultorio. */
  galeria: {
    titulo: "Galeria",
    fotos: [
      {
        src: "/img/galeria/sala-de-exame.webp",
        largura: 924,
        altura: 1155,
        alt: "Sala de exame com maca e bancada de equipamentos",
      },
      {
        src: "/img/galeria/escritorio.webp",
        largura: 960,
        altura: 1200,
        alt: "Mesa de atendimento com diplomas e modelos anatômicos ao fundo",
      },
      {
        src: "/img/galeria/corredor-de-marcha.webp",
        largura: 1200,
        altura: 1500,
        alt: "Corredor de avaliação de marcha com tapete e espelho de corpo inteiro",
      },
      {
        src: "/img/galeria/acupuntura.webp",
        largura: 1024,
        altura: 1280,
        alt: "Agulhas de acupuntura aplicadas ao longo das costas de um paciente",
      },
      {
        src: "/img/galeria/plataforma-de-pressao.webp",
        largura: 864,
        altura: 1080,
        alt: "Pés descalços sobre a plataforma de baropodometria",
      },
      {
        src: "/img/galeria/consultorio.webp",
        largura: 819,
        altura: 1024,
        alt: "Consultório com mesa de atendimento, espelho de corpo inteiro e bolas de exercício",
      },
    ],
  },

  "redes-secao": {
    titulo: "Ligue-se a nós",
  },
};

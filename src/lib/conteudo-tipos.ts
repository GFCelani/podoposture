import { lerNomeDoArquivo } from "./imagem-webp";

/**
 * O contrato do conteudo editavel do site: tipos, descritores e validacao.
 *
 * Este arquivo e puro de proposito: nao importa banco, React nem nada do
 * servidor. A rota do painel valida com ele e o editor no navegador avisa com
 * ele. Se cada ponta tivesse a propria regra, o formulario aceitaria o que a
 * rota recusa, e a Dra. Claudia perderia o texto sem entender por que.
 *
 * O modelo: o texto de hoje mora no codigo (conteudo-padrao.ts) e o banco
 * guarda so o que foi publicado por cima. A leitura mescla CAMPO A CAMPO, e
 * campo ausente ou invalido cai no padrao. Um documento velho no banco, de uma
 * versao anterior deste arquivo, nunca derruba pagina: no pior caso a secao
 * volta a mostrar o texto de hoje.
 */

/* ------------------------------------------------------------------ tipos */

export type TipoDeDestino = "pagina" | "whatsapp" | "nenhum";

/**
 * Para onde um botao ou link leva. Uniao fechada, sem URL livre: um endereco
 * digitado a mao com acento trocado vira 404 silencioso (as rotas acentuadas so
 * existem pelo rewrite do middleware), e um campo de URL aberto aceitaria
 * `javascript:` num site publico.
 */
export type Destino =
  | { tipo: "pagina"; slug: string }
  | { tipo: "whatsapp" }
  | { tipo: "nenhum" };

/** Largura e altura sao as reais do arquivo; o alt e por posicao, nao por foto. */
export type Imagem = { src: string; largura: number; altura: number; alt: string };

export type Botao = { rotulo: string; destino: Destino };

export type ConteudoContato = {
  /** So digitos, com 55 e DDD. */
  whatsapp: string;
  telefoneFixo: string;
  email: string;
  horario: string;
  endereco: {
    rua: string;
    numero: string;
    /** So a identificacao ("501"); vazio quando nao ha sala. */
    sala: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    referencia: string;
  };
  redes: { facebook: string; instagram: string; linkedin: string; pinterest: string };
  responsavel: { nome: string; titulo: string };
  anosDeExperiencia: number;
  descricaoParaBuscadores: string;
};

export type ConteudoHero = {
  tituloLinhas: string[];
  destaque: string;
  subtituloLinhas: string[];
  destaquesDoSubtitulo: string[];
  botoes: Botao[];
};

export type ConteudoBemVindo = { titulo: string; paragrafo: string; local: string; imagem: Imagem };

export type ConteudoResponsabilidade = {
  titulo: string;
  destaque: string;
  paragrafo1: { antes: string; link: { rotulo: string; destino: Destino }; depois: string };
  paragrafo2: string;
  botao: Botao;
  imagem: Imagem;
};

export type ConteudoCompreender = { titulo: string; frase: string; paragrafo: string };

export type ConteudoAbordagem = {
  titulo: string;
  passos: string[];
  imagem: Imagem;
  legenda: string;
  botao: Botao;
};

export type ConteudoMetodo = { titulo: string; abertura: string; corpo: string[]; botao: Botao };

export type CartaoDeTratamento = { titulo: string; destino: Destino; imagem: Imagem };
export type ConteudoTratamentos = { cartoes: CartaoDeTratamento[]; rotuloDoBotao: string };

export type ItemDeServico = { titulo: string; corpo: string[]; rotulo: string; destino: Destino };
export type ConteudoServicos = { tituloAcessivel: string; itens: ItemDeServico[] };

export type ConteudoContatoSecao = {
  titulo: string;
  subtitulo: string;
  paragrafo: string;
  rotuloDoBotao: string;
};

export type ConteudoBlogSecao = { titulo: string };
export type ConteudoGaleria = { titulo: string; fotos: Imagem[] };
export type ConteudoRedesSecao = { titulo: string };

/** Um documento por chave, na mesma ordem em que as secoes aparecem. */
export type ConteudoDoSite = {
  contato: ConteudoContato;
  hero: ConteudoHero;
  "bem-vindo": ConteudoBemVindo;
  responsabilidade: ConteudoResponsabilidade;
  compreender: ConteudoCompreender;
  abordagem: ConteudoAbordagem;
  metodo: ConteudoMetodo;
  tratamentos: ConteudoTratamentos;
  servicos: ConteudoServicos;
  "contato-secao": ConteudoContatoSecao;
  "blog-secao": ConteudoBlogSecao;
  galeria: ConteudoGaleria;
  "redes-secao": ConteudoRedesSecao;
};

export type ChaveDeSecao = keyof ConteudoDoSite;

export const CHAVES_DE_SECAO = [
  "contato",
  "hero",
  "bem-vindo",
  "responsabilidade",
  "compreender",
  "abordagem",
  "metodo",
  "tratamentos",
  "servicos",
  "contato-secao",
  "blog-secao",
  "galeria",
  "redes-secao",
] as const satisfies readonly ChaveDeSecao[];

export function ehChaveDeSecao(valor: string): valor is ChaveDeSecao {
  return (CHAVES_DE_SECAO as readonly string[]).includes(valor);
}

/** O que o painel recebe por secao. `publicado` e `rascunho` ja vem mesclados. */
export type EstadoDaSecao<T> = {
  padrao: T;
  publicado: T | null;
  rascunho: T | null;
  atualizadoEm: string | null;
  publicadoEm: string | null;
};

export type EstadosDasSecoes = { [C in ChaveDeSecao]: EstadoDaSecao<ConteudoDoSite[C]> };

/**
 * Corpo de GET /api/painel/inicio. `semBanco` = servidor sem banco: o painel
 * mostra o padrao, e salvar responde 503.
 */
export type RespostaDoInicio = {
  secoes: EstadosDasSecoes;
  destinos: readonly PaginaDeDestino[];
  semBanco: boolean;
};

/** "rascunho" grava so o que a previa ve; "publicar" poe no site e zera o rascunho. */
export type AcaoDaEscrita = "rascunho" | "publicar";

/** Corpo de PUT /api/painel/inicio/[chave]. */
export type CorpoDaEscrita<C extends ChaveDeSecao = ChaveDeSecao> = {
  dados: ConteudoDoSite[C];
  acao: AcaoDaEscrita;
  /**
   * `atualizadoEm` da secao que o editor carregou (null = nunca salva). Se o
   * banco ja estiver em outra versao, a rota responde 409 com a secao atual em
   * vez de gravar por cima do que outra janela publicou.
   */
  versao?: string | null;
};

/** `?alvo=` de DELETE: descartar o rascunho, ou tirar o publicado e voltar ao padrao. */
export type AlvoDoDescarte = "rascunho" | "publicado";

/** Corpo de resposta de PUT e DELETE: a secao como ficou. */
export type RespostaDaSecao<C extends ChaveDeSecao = ChaveDeSecao> = {
  chave: C;
  secao: EstadoDaSecao<ConteudoDoSite[C]>;
};

export type ErrosDeCampo = Record<string, string>;

export type ResultadoDaValidacao<T> =
  | { ok: true; dados: T; erros: ErrosDeCampo }
  | { ok: false; dados: null; erros: ErrosDeCampo };

/* -------------------------------------------------------- listas fechadas */

export type PaginaDeDestino = { slug: string; rotulo: string };

/**
 * As paginas que um botao pode abrir: as 18 de pages.json que tem rota em
 * [slug], mais o indice do blog. "home" fica de fora porque e redirect para
 * "/". Rotulos iguais aos do menu, que a clinica ja reconhece.
 *
 * Lista escrita aqui, e nao importada de pages.json, porque este arquivo vai
 * para o navegador: importar o JSON levaria junto o HTML das 20 paginas. O
 * teste confere que as duas listas continuam iguais.
 */
export const PAGINAS_DE_DESTINO: readonly PaginaDeDestino[] = [
  { slug: "tratamento-da-dor", rotulo: "Tratamento da Dor" },
  { slug: "dor-lombar-crônica", rotulo: "Dor Lombar Crônica" },
  { slug: "tratamento-do-zumbido", rotulo: "Tratamento do Zumbido" },
  { slug: "tratamento-da-dtm", rotulo: "Tratamento da DTM" },
  { slug: "osteopatia", rotulo: "Osteopatia" },
  { slug: "posturologia", rotulo: "Posturologia" },
  { slug: "rpg", rotulo: "RPG" },
  { slug: "acupuntura", rotulo: "Acupuntura" },
  { slug: "acupuntura-clínica", rotulo: "Acupuntura Clínica" },
  { slug: "flexo-distração", rotulo: "Flexo-distração" },
  { slug: "neuromodulação", rotulo: "Neuromodulação" },
  { slug: "método-posture+", rotulo: "Método Posture+" },
  { slug: "baropodometria", rotulo: "Baropodometria" },
  { slug: "palmilhas-personalizadas", rotulo: "Palmilhas Personalizadas" },
  { slug: "quem-somos", rotulo: "Quem Somos" },
  { slug: "responsável-técnica", rotulo: "Responsável Técnica" },
  { slug: "currículo-profissional", rotulo: "Currículo Profissional" },
  { slug: "contato", rotulo: "Contato" },
  { slug: "nosso-blog", rotulo: "Nosso Blog" },
].map((p) => ({ ...p, slug: p.slug.normalize("NFC") }));

const SLUGS_DE_DESTINO = new Set(PAGINAS_DE_DESTINO.map((p) => p.slug));

/** Mesmo prefixo de PREFIXO_IMAGEM em painel-tipos.ts; o teste confere. */
export const PREFIXO_IMAGEM_ENVIADA = "/img/post/";

/**
 * As fotos de public/img que o conteudo padrao usa, com a medida real de cada
 * arquivo. Uma imagem so pode ser uma destas ou uma enviada pelo painel: um
 * `src` livre deixaria apontar para qualquer endereco, e largura/altura
 * erradas voltariam a fazer a pagina pular quando a foto carrega.
 */
export const IMAGENS_DO_SITE: Readonly<Record<string, { largura: number; altura: number }>> = {
  "/img/galeria/recepcao.webp": { largura: 827, altura: 1033 },
  "/img/galeria/avaliacao-postural.webp": { largura: 857, altura: 1072 },
  "/img/baropodometria.webp": { largura: 1080, altura: 816 },
  "/img/card-dor-lombar.webp": { largura: 1024, altura: 1280 },
  "/img/card-dor-cronica.webp": { largura: 1024, altura: 1280 },
  "/img/card-zumbido.webp": { largura: 819, altura: 1024 },
  "/img/galeria/sala-de-exame.webp": { largura: 924, altura: 1155 },
  "/img/galeria/escritorio.webp": { largura: 960, altura: 1200 },
  "/img/galeria/corredor-de-marcha.webp": { largura: 1200, altura: 1500 },
  "/img/galeria/acupuntura.webp": { largura: 1024, altura: 1280 },
  "/img/galeria/plataforma-de-pressao.webp": { largura: 864, altura: 1080 },
  "/img/galeria/consultorio.webp": { largura: 819, altura: 1024 },
};

/* ------------------------------------------------------------ descritores */

type CampoBase = { rotulo: string; ajuda?: string };

export type CampoTexto = CampoBase & {
  tipo: "texto";
  max: number;
  opcional?: boolean;
  /** Normalizacao propria: CEP com hifen, UF em maiuscula. */
  formato?: "cep" | "uf";
};
export type CampoParagrafo = CampoBase & { tipo: "paragrafo"; max: number; opcional?: boolean };
/** Quantidade EXATA de linhas; a quebra escrita e a do layout medido. */
export type CampoLinhas = CampoBase & {
  tipo: "linhas";
  quantidade: number;
  maxPorLinha: number;
  /**
   * Para o titulo cujo espaco foi medido em pixels, e nao em letras: o editor
   * mede cada linha contra `referencia` (a linha mais larga de hoje, que cabe)
   * e avisa acima de `folga` vezes ela. Contar caracteres nao basta: 22 letras
   * largas (M, W, maiusculas) invadem as figuras ao lado.
   */
  medidaNaTela?: { referencia: string; folga: number };
};
export type CampoLista = CampoBase & {
  tipo: "lista";
  min: number;
  max: number;
  rotuloDoItem: string;
  item: Campo;
};
export type CampoGrupo = CampoBase & { tipo: "grupo"; campos: Record<string, Campo> };
export type CampoImagem = CampoBase & {
  tipo: "imagem";
  larguraMinima: number;
  /** Teto do texto alternativo, em caracteres. */
  maxAlt: number;
  /**
   * Recorte que o site aplica (largura / altura), para o editor mostrar a previa. null = sem recorte.
   * `proporcaoNoComputador`: quando o recorte muda a partir de 1024px, o editor diz que o do lado e o do celular.
   */
  recorte: { proporcao: number; descricao: string; proporcaoNoComputador?: number } | null;
};
export type CampoDestino = CampoBase & { tipo: "destino"; aceita: readonly TipoDeDestino[] };
export type CampoNumero = CampoBase & { tipo: "numero"; min: number; max: number };
export type CampoEmail = CampoBase & { tipo: "email"; max: number };
export type CampoTelefone = CampoBase & { tipo: "telefone" };
export type CampoUrlRede = CampoBase & {
  tipo: "url-rede";
  dominios: readonly string[];
  exemplo: string;
};

export type Campo =
  | CampoTexto
  | CampoParagrafo
  | CampoLinhas
  | CampoLista
  | CampoGrupo
  | CampoImagem
  | CampoDestino
  | CampoNumero
  | CampoEmail
  | CampoTelefone
  | CampoUrlRede;

/**
 * Regra que envolve mais de um campo (o destaque precisa existir no titulo).
 * `campos` sao os de topo que voltam JUNTOS ao padrao quando a regra falha na
 * leitura: trocar so o destaque deixaria um titulo salvo com o grifo do padrao,
 * que talvez nem exista nele.
 */
export type RegraDaSecao<T> = {
  campos: readonly (keyof T & string)[];
  conferir: (dados: T) => ErrosDeCampo;
};

export type DescritorDeSecao<T> = {
  rotulo: string;
  ajuda: string;
  /** true = o dado aparece no site inteiro, nao so na pagina inicial. */
  global: boolean;
  aparece: string;
  campos: { [K in keyof T]: Campo };
  regras: readonly RegraDaSecao<T>[];
};

export type Descritores = { [C in ChaveDeSecao]: DescritorDeSecao<ConteudoDoSite[C]> };

function erroSe(condicao: boolean, campo: string, mensagem: string): ErrosDeCampo {
  return condicao ? { [campo]: mensagem } : {};
}

const IMAGEM_4_5 = { proporcao: 4 / 5, descricao: "A foto é recortada em retrato (4:5), pelo centro." };
const IMAGEM_4_3 = {
  proporcao: 4 / 3,
  descricao: "A foto é recortada em paisagem (4:3), pelo centro.",
};
/** Boas-vindas: welcome.tsx aplica 4:3 e, a partir de 1024px, 5:4. */
const IMAGEM_4_3_E_5_4 = {
  proporcao: 4 / 3,
  proporcaoNoComputador: 5 / 4,
  descricao: "A foto é recortada pelo centro: em paisagem (4:3) no celular e um pouco mais alta (5:4) no computador.",
};

/** Largura minima de foto: abaixo disso ela sai borrada nas colunas do site. */
const LARGURA_MINIMA_DE_FOTO = 640;

// A ajuda fala do efeito, e nao do nome tecnico do atributo nem da ferramenta.
const AJUDA_DO_ALT = "Descreva a foto em uma frase, para quem não enxerga.";

/** Uma frase: acima disso o leitor de tela vira paragrafo lido a cada foto. */
export const LIMITE_DO_ALT = 200;

function campoImagem(rotulo: string, recorte: CampoImagem["recorte"]): CampoImagem {
  return {
    tipo: "imagem",
    rotulo,
    ajuda: AJUDA_DO_ALT,
    larguraMinima: LARGURA_MINIMA_DE_FOTO,
    maxAlt: LIMITE_DO_ALT,
    recorte,
  };
}

function campoBotao(rotuloMax: number, aceita: readonly TipoDeDestino[]): CampoGrupo {
  return {
    tipo: "grupo",
    rotulo: "Botão",
    campos: {
      rotulo: { tipo: "texto", rotulo: "Texto do botão", max: rotuloMax },
      destino: { tipo: "destino", rotulo: "Para onde leva", aceita },
    },
  };
}

export const DESCRITORES: Descritores = {
  contato: {
    rotulo: "Contato e dados da clínica",
    ajuda:
      "Telefones, e-mail, endereço e redes. Valem para o site inteiro: cabeçalho, rodapé, página Contato e o que o Google lê.",
    global: true,
    aparece: "Em todas as páginas",
    campos: {
      whatsapp: {
        tipo: "telefone",
        rotulo: "WhatsApp",
        ajuda: "Com DDD. Todos os botões de mensagem do site levam para este número.",
      },
      telefoneFixo: { tipo: "telefone", rotulo: "Telefone fixo", ajuda: "Com DDD." },
      email: { tipo: "email", rotulo: "E-mail", max: 100 },
      horario: { tipo: "texto", rotulo: "Horário de atendimento", max: 80 },
      endereco: {
        tipo: "grupo",
        rotulo: "Endereço",
        ajuda:
          "O mapa e o botão “Como chegar” usam estes campos. O ponto marcado no mapa do Google não muda sozinho: se a clínica mudar de endereço, avise quem cuida do site.",
        campos: {
          rua: { tipo: "texto", rotulo: "Rua ou avenida", max: 80 },
          numero: { tipo: "texto", rotulo: "Número", max: 10 },
          sala: {
            tipo: "texto",
            rotulo: "Sala",
            max: 20,
            opcional: true,
            ajuda: "Só a identificação (ex.: 501). Deixe em branco se não houver.",
          },
          bairro: { tipo: "texto", rotulo: "Bairro", max: 40 },
          cidade: { tipo: "texto", rotulo: "Cidade", max: 40 },
          uf: { tipo: "texto", rotulo: "Estado (sigla)", max: 2, formato: "uf" },
          cep: { tipo: "texto", rotulo: "CEP", max: 9, formato: "cep" },
          referencia: {
            tipo: "texto",
            rotulo: "Como chegar (uma frase)",
            max: 140,
            opcional: true,
          },
        },
      },
      redes: {
        tipo: "grupo",
        rotulo: "Redes sociais",
        campos: {
          facebook: {
            tipo: "url-rede",
            rotulo: "Facebook",
            dominios: ["facebook.com"],
            exemplo: "https://www.facebook.com/podoposture",
          },
          instagram: {
            tipo: "url-rede",
            rotulo: "Instagram",
            dominios: ["instagram.com"],
            exemplo: "https://www.instagram.com/podoposture/",
          },
          linkedin: {
            tipo: "url-rede",
            rotulo: "LinkedIn",
            dominios: ["linkedin.com"],
            exemplo: "https://www.linkedin.com/in/seu-perfil",
          },
          pinterest: {
            tipo: "url-rede",
            rotulo: "Pinterest",
            dominios: ["pinterest.com"],
            exemplo: "https://br.pinterest.com/seu-perfil/",
          },
        },
      },
      responsavel: {
        tipo: "grupo",
        rotulo: "Responsável técnica",
        ajuda: "Vai para os dados que o Google lê sobre a clínica. Não muda o texto das seções.",
        campos: {
          nome: { tipo: "texto", rotulo: "Nome", max: 80 },
          titulo: { tipo: "texto", rotulo: "Título profissional", max: 100 },
        },
      },
      anosDeExperiencia: {
        tipo: "numero",
        rotulo: "Anos de experiência",
        min: 1,
        max: 80,
        ajuda:
          "Controla a régua da seção 03, com um traço por ano. Os textos que falam dos anos são editados em cada seção.",
      },
      descricaoParaBuscadores: {
        tipo: "paragrafo",
        rotulo: "Descrição para o Google",
        max: 160,
        ajuda: "A frase que aparece sob o nome do site nos resultados de busca e quando alguém compartilha o link.",
      },
    },
    regras: [],
  },

  hero: {
    rotulo: "01 · Abertura",
    ajuda: "O primeiro bloco da página inicial: título, apresentação e os dois botões.",
    global: false,
    aparece: "No topo da página inicial",
    campos: {
      tituloLinhas: {
        tipo: "linhas",
        rotulo: "Título",
        quantidade: 4,
        maxPorLinha: 22,
        // "Integracao terapeutica" e a linha mais larga medida (615 px a 64 px);
        // o campo das figuras comeca uns 40 px depois dela, dai a folga de 4%.
        medidaNaTela: { referencia: "Integração terapêutica", folga: 1.04 },
        ajuda: "Quatro linhas, com até 22 caracteres cada. O título quebra exatamente onde você quebrar.",
      },
      destaque: {
        tipo: "texto",
        rotulo: "Palavra grifada",
        max: 22,
        ajuda: "Escreva igual a como está na 2ª linha do título.",
      },
      subtituloLinhas: {
        tipo: "linhas",
        rotulo: "Apresentação",
        quantidade: 4,
        maxPorLinha: 53,
        ajuda: "Quatro linhas, com até 53 caracteres cada.",
      },
      destaquesDoSubtitulo: {
        tipo: "lista",
        rotulo: "Trechos em destaque",
        rotuloDoItem: "Trecho",
        min: 0,
        max: 2,
        item: { tipo: "texto", rotulo: "Trecho", max: 106 },
        ajuda:
          "Até 2 trechos da apresentação que aparecem mais claros; o primeiro também sai em letra mais forte. Copie como está escrito; o trecho pode passar de uma linha para a outra.",
      },
      botoes: {
        tipo: "lista",
        rotulo: "Botões",
        rotuloDoItem: "Botão",
        min: 2,
        max: 2,
        item: campoBotao(24, ["whatsapp", "pagina"]),
        ajuda: "O primeiro é o botão verde; o segundo, o de contorno.",
      },
    },
    regras: [
      {
        campos: ["tituloLinhas", "destaque"],
        conferir: (d) =>
          erroSe(
            !d.tituloLinhas[1]?.includes(d.destaque),
            "destaque",
            "A palavra grifada precisa estar escrita igual na 2ª linha do título.",
          ),
      },
      {
        campos: ["subtituloLinhas", "destaquesDoSubtitulo"],
        conferir: (d) => localizarDestaques(d.subtituloLinhas, d.destaquesDoSubtitulo).erros,
      },
    ],
  },

  "bem-vindo": {
    rotulo: "02 · Boas-vindas",
    ajuda: "Apresentação da clínica, com a foto da recepção.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 40 },
      paragrafo: { tipo: "paragrafo", rotulo: "Texto", max: 420 },
      local: { tipo: "texto", rotulo: "Linha do local", max: 60 },
      imagem: campoImagem("Foto", IMAGEM_4_3_E_5_4),
    },
    regras: [],
  },

  responsabilidade: {
    rotulo: "03 · Responsabilidade clínica",
    ajuda: "Quem atende, com um link para a página da responsável técnica.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 60 },
      destaque: {
        tipo: "texto",
        rotulo: "Palavra grifada",
        max: 30,
        ajuda: "Escreva igual a como está no título.",
      },
      paragrafo1: {
        tipo: "grupo",
        rotulo: "Primeiro parágrafo",
        ajuda: "O texto antes do link, o link e o texto depois dele.",
        campos: {
          antes: { tipo: "texto", rotulo: "Antes do link", max: 160 },
          link: {
            tipo: "grupo",
            rotulo: "Link",
            campos: {
              rotulo: { tipo: "texto", rotulo: "Texto do link", max: 40 },
              destino: { tipo: "destino", rotulo: "Página que abre", aceita: ["pagina"] },
            },
          },
          depois: { tipo: "paragrafo", rotulo: "Depois do link", max: 300, opcional: true },
        },
      },
      paragrafo2: { tipo: "paragrafo", rotulo: "Segundo parágrafo", max: 300 },
      botao: campoBotao(30, ["pagina", "whatsapp"]),
      imagem: campoImagem("Foto", IMAGEM_4_3),
    },
    regras: [
      {
        campos: ["titulo", "destaque"],
        conferir: (d) =>
          erroSe(
            !d.titulo.includes(d.destaque),
            "destaque",
            "A palavra grifada precisa estar escrita igual no título.",
          ),
      },
    ],
  },

  compreender: {
    rotulo: "04 · Compreender antes de tratar",
    ajuda: "Título, frase grande e parágrafo, sobre o fundo azul.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 40 },
      frase: {
        tipo: "texto",
        rotulo: "Frase em destaque",
        max: 90,
        ajuda: "Letra grande: frases longas viram um bloco alto.",
      },
      paragrafo: { tipo: "paragrafo", rotulo: "Texto", max: 520 },
    },
    regras: [],
  },

  abordagem: {
    rotulo: "05 · Nossa abordagem",
    ajuda: "Os passos do cuidado, com a foto da baropodometria.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 40 },
      passos: {
        tipo: "lista",
        rotulo: "Passos",
        rotuloDoItem: "Passo",
        min: 1,
        max: 8,
        item: { tipo: "paragrafo", rotulo: "Passo", max: 220 },
        ajuda: "O primeiro e o último passo aparecem em letra maior.",
      },
      imagem: campoImagem("Foto", null),
      legenda: { tipo: "texto", rotulo: "Legenda da foto", max: 30 },
      botao: campoBotao(30, ["whatsapp", "pagina"]),
    },
    regras: [],
  },

  metodo: {
    rotulo: "06 · Método RegulaDOR",
    ajuda: "Apresentação do método, sobre o fundo azul.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      titulo: {
        tipo: "texto",
        rotulo: "Título",
        max: 30,
        ajuda: "O símbolo ® entra sozinho depois do título.",
      },
      abertura: {
        tipo: "texto",
        rotulo: "Frase de abertura",
        max: 90,
        ajuda: "Letra grande: frases longas viram um bloco alto.",
      },
      corpo: {
        tipo: "lista",
        rotulo: "Parágrafos",
        rotuloDoItem: "Parágrafo",
        min: 1,
        max: 4,
        item: { tipo: "paragrafo", rotulo: "Parágrafo", max: 480 },
      },
      botao: {
        ...campoBotao(40, ["pagina", "whatsapp", "nenhum"]),
        ajuda: "Sem destino, o botão aparece apagado, até a página do método existir.",
      },
    },
    regras: [
      {
        campos: ["titulo"],
        conferir: (d) =>
          erroSe(d.titulo.includes("®"), "titulo", "Tire o ® do título: ele já é colocado automaticamente."),
      },
    ],
  },

  tratamentos: {
    rotulo: "07 · Tratamentos",
    ajuda: "Os cartões com foto que levam às páginas de tratamento.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      cartoes: {
        tipo: "lista",
        rotulo: "Cartões",
        rotuloDoItem: "Cartão",
        min: 1,
        max: 6,
        ajuda: "Em múltiplos de 3 a grade fecha sem espaço vazio no computador.",
        item: {
          tipo: "grupo",
          rotulo: "Cartão",
          campos: {
            titulo: { tipo: "texto", rotulo: "Título", max: 60 },
            destino: { tipo: "destino", rotulo: "Página que abre", aceita: ["pagina"] },
            imagem: campoImagem("Foto", IMAGEM_4_5),
          },
        },
      },
      rotuloDoBotao: {
        tipo: "texto",
        rotulo: "Texto do botão (igual em todos os cartões)",
        max: 20,
      },
    },
    regras: [],
  },

  servicos: {
    rotulo: "08 · Serviços",
    ajuda: "A grade de serviços, cada um com o próprio botão.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      tituloAcessivel: {
        tipo: "texto",
        rotulo: "Nome da seção para leitor de tela",
        max: 40,
        ajuda: "Não aparece na tela: é lido para quem não enxerga.",
      },
      itens: {
        tipo: "lista",
        rotulo: "Serviços",
        rotuloDoItem: "Serviço",
        min: 1,
        max: 15,
        ajuda:
          "O desenho de cada serviço vem da página escolhida. Em múltiplos de 3 a grade fecha sem espaço vazio no computador.",
        item: {
          tipo: "grupo",
          rotulo: "Serviço",
          campos: {
            titulo: { tipo: "texto", rotulo: "Título", max: 60 },
            corpo: {
              tipo: "lista",
              rotulo: "Parágrafos",
              rotuloDoItem: "Parágrafo",
              min: 1,
              max: 3,
              item: { tipo: "paragrafo", rotulo: "Parágrafo", max: 450 },
            },
            rotulo: { tipo: "texto", rotulo: "Texto do botão", max: 45 },
            destino: { tipo: "destino", rotulo: "Página que abre", aceita: ["pagina"] },
          },
        },
      },
    },
    regras: [],
  },

  "contato-secao": {
    rotulo: "09 · Converse com a clínica",
    ajuda: "Os textos da seção de contato. Telefones e endereço ficam em “Contato e dados da clínica”.",
    global: false,
    aparece: "Na página inicial e na página Contato",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 40, ajuda: "Só aparece na página inicial." },
      subtitulo: { tipo: "texto", rotulo: "Subtítulo", max: 60 },
      paragrafo: { tipo: "paragrafo", rotulo: "Texto", max: 300 },
      rotuloDoBotao: { tipo: "texto", rotulo: "Texto do botão do WhatsApp", max: 25 },
    },
    regras: [],
  },

  "blog-secao": {
    rotulo: "10 · Blog",
    ajuda: "Só o título. Os textos da lista vêm do blog.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 60 },
    },
    regras: [],
  },

  galeria: {
    rotulo: "11 · Galeria",
    ajuda: "As fotos da clínica. A ordem define a numeração.",
    global: false,
    aparece: "Na página inicial",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 40 },
      fotos: {
        tipo: "lista",
        rotulo: "Fotos",
        rotuloDoItem: "Foto",
        min: 1,
        max: 12,
        ajuda: "Com 6 ou 12 fotos a grade fecha sem espaço vazio no celular e no computador.",
        item: campoImagem("Foto", IMAGEM_4_5),
      },
    },
    regras: [],
  },

  "redes-secao": {
    rotulo: "12 · Redes sociais",
    ajuda: "O título da faixa com os ícones das redes. Os endereços ficam em “Contato e dados da clínica”.",
    global: true,
    aparece: "No fim de todas as páginas",
    campos: {
      titulo: { tipo: "texto", rotulo: "Título", max: 25 },
    },
    regras: [],
  },
};

/* ------------------------------------------------------- limpeza de texto */

/**
 * Tira caractere de controle e marca invisivel de direcao. Colado do Word ou do
 * WhatsApp, eles chegam sem ninguem ver, e um U+202E inverte o texto na tela.
 * Por codigo e nao por expressao regular: o lint recusa controle em regex.
 */
function semInvisiveis(texto: string): string {
  let saida = "";
  for (const caractere of texto) {
    const n = caractere.codePointAt(0) ?? 0;
    const controle = (n < 32 && n !== 9 && n !== 10 && n !== 13) || n === 127;
    const direcao = (n >= 0x200b && n <= 0x200f) || (n >= 0x202a && n <= 0x202e) || (n >= 0x2066 && n <= 0x2069);
    if (!controle && !direcao && n !== 0xfeff) saida += caractere;
  }
  return saida;
}

/**
 * Espacos e quebras viram um espaco so, sem mexer no espaco duro (U+00A0):
 * `\s` o apagaria, e ele e escolha de composicao em mais de um lugar.
 */
function limpar(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  return semInvisiveis(valor).normalize("NFC").replace(/[ \t\r\n]+/g, " ").trim();
}

function tamanho(texto: string): number {
  return Array.from(texto).length;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function juntar(caminho: string, parte: string | number): string {
  return caminho ? `${caminho}.${parte}` : String(parte);
}

/* ------------------------------------------------------------ validadores */

function validarTexto(
  campo: CampoTexto | CampoParagrafo,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): string | undefined {
  const texto = limpar(valor);
  if (texto === null || texto === "") {
    if (campo.opcional && (texto === "" || valor === undefined || valor === null)) return "";
    erros[caminho] = "Preencha este campo.";
    return undefined;
  }
  if (tamanho(texto) > campo.max) {
    erros[caminho] = `Use no máximo ${campo.max} caracteres (agora são ${tamanho(texto)}).`;
    return undefined;
  }
  if (campo.tipo === "texto" && campo.formato === "cep") {
    const m = /^(\d{5})-?(\d{3})$/.exec(texto);
    if (!m) {
      erros[caminho] = "Escreva o CEP no formato 00000-000.";
      return undefined;
    }
    return `${m[1]}-${m[2]}`;
  }
  if (campo.tipo === "texto" && campo.formato === "uf") {
    if (!/^[A-Za-z]{2}$/.test(texto)) {
      erros[caminho] = "Use a sigla do estado, com 2 letras (ex.: RJ).";
      return undefined;
    }
    return texto.toUpperCase();
  }
  return texto;
}

function validarLinhas(
  campo: CampoLinhas,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): string[] | undefined {
  if (!Array.isArray(valor) || valor.length !== campo.quantidade) {
    erros[caminho] = `Escreva exatamente ${campo.quantidade} linhas.`;
    return undefined;
  }
  const linhas: string[] = [];
  let falhou = false;
  valor.forEach((bruto, i) => {
    const linha = limpar(bruto);
    const onde = juntar(caminho, i);
    if (!linha) {
      erros[onde] = `Preencha a linha ${i + 1}.`;
      falhou = true;
    } else if (tamanho(linha) > campo.maxPorLinha) {
      erros[onde] = `A linha ${i + 1} passou de ${campo.maxPorLinha} caracteres (agora são ${tamanho(linha)}).`;
      falhou = true;
    } else {
      linhas.push(linha);
    }
  });
  return falhou ? undefined : linhas;
}

function validarLista(
  campo: CampoLista,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): unknown[] | undefined {
  if (!Array.isArray(valor)) {
    erros[caminho] = campo.min > 0 ? `Adicione pelo menos ${campo.min}.` : "Lista inválida.";
    return undefined;
  }
  if (valor.length < campo.min) {
    erros[caminho] = `Adicione pelo menos ${campo.min} (${campo.rotuloDoItem.toLowerCase()}).`;
    return undefined;
  }
  if (valor.length > campo.max) {
    erros[caminho] = `No máximo ${campo.max} (agora são ${valor.length}).`;
    return undefined;
  }
  const antes = Object.keys(erros).length;
  const itens = valor.map((item, i) => validarCampo(campo.item, item, juntar(caminho, i), erros));
  return Object.keys(erros).length > antes ? undefined : itens;
}

function validarGrupo(
  campo: CampoGrupo,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): Record<string, unknown> | undefined {
  const origem = ehObjeto(valor) ? valor : {};
  const antes = Object.keys(erros).length;
  const saida: Record<string, unknown> = {};
  for (const [nome, sub] of Object.entries(campo.campos)) {
    saida[nome] = validarCampo(sub, origem[nome], juntar(caminho, nome), erros);
  }
  return Object.keys(erros).length > antes ? undefined : saida;
}

function validarImagem(
  campo: CampoImagem,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): Imagem | undefined {
  const origem = ehObjeto(valor) ? valor : {};
  const src = typeof origem.src === "string" ? origem.src.trim() : "";
  const alt = limpar(origem.alt);
  const antes = Object.keys(erros).length;

  // A medida sai do arquivo conhecido ou do proprio nome publico, nunca do que
  // o navegador mandou junto: e ela que o <Image> declara para reservar espaco.
  let medida: { largura: number; altura: number } | null = IMAGENS_DO_SITE[src] ?? null;
  if (!medida && src.startsWith(PREFIXO_IMAGEM_ENVIADA)) {
    medida = lerNomeDoArquivo(src.slice(PREFIXO_IMAGEM_ENVIADA.length));
  }
  if (!medida) {
    // Sem "escolha uma foto do site": o editor so oferece enviar arquivo. Para
    // trazer de volta uma foto original, ha o "Usar o original" do proprio item.
    erros[juntar(caminho, "src")] = "Envie uma foto pelo botão “Escolher foto”.";
  } else if (medida.largura < campo.larguraMinima) {
    erros[juntar(caminho, "src")] =
      `A foto precisa ter pelo menos ${campo.larguraMinima} pixels de largura (esta tem ${medida.largura}).`;
  }

  if (!alt) erros[juntar(caminho, "alt")] = "Descreva a foto em uma frase.";
  else if (tamanho(alt) > campo.maxAlt) {
    erros[juntar(caminho, "alt")] = `Use no máximo ${campo.maxAlt} caracteres (agora são ${tamanho(alt)}).`;
  }

  if (Object.keys(erros).length > antes || !medida || !alt) return undefined;
  return { src, largura: medida.largura, altura: medida.altura, alt };
}

function validarDestino(
  campo: CampoDestino,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): Destino | undefined {
  const tipo = ehObjeto(valor) ? valor.tipo : undefined;
  if (typeof tipo !== "string" || !(campo.aceita as readonly string[]).includes(tipo)) {
    erros[caminho] = "Escolha um destino da lista.";
    return undefined;
  }
  if (tipo === "pagina") {
    const slug = ehObjeto(valor) ? limpar(valor.slug) : null;
    if (!slug || !SLUGS_DE_DESTINO.has(slug)) {
      erros[caminho] = "Essa página não existe no site. Escolha uma da lista.";
      return undefined;
    }
    return { tipo: "pagina", slug };
  }
  return tipo === "whatsapp" ? { tipo: "whatsapp" } : { tipo: "nenhum" };
}

function validarNumero(
  campo: CampoNumero,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): number | undefined {
  const n = typeof valor === "string" && /^\d+$/.test(valor.trim()) ? Number(valor) : valor;
  if (typeof n !== "number" || !Number.isInteger(n) || n < campo.min || n > campo.max) {
    erros[caminho] = `Use um número inteiro de ${campo.min} a ${campo.max}.`;
    return undefined;
  }
  return n;
}

/**
 * Estrito de proposito: o e-mail vira `mailto:`, e uma forma frouxa aceitava
 * "nome@gmail.com?cc=outro@x.com", que abre a mensagem ja copiando um estranho.
 */
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function validarEmail(
  campo: CampoEmail,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): string | undefined {
  const texto = limpar(valor);
  if (!texto) {
    erros[caminho] = "Preencha este campo.";
    return undefined;
  }
  if (tamanho(texto) > campo.max || !EMAIL.test(texto)) {
    erros[caminho] = "Confira o e-mail (ex.: nome@gmail.com).";
    return undefined;
  }
  return texto;
}

/**
 * Telefone guardado so em digitos, com 55 e DDD. Aceita como a pessoa digita
 * ("(21) 99203-5643", "+55 21 ..."), porque exigir o formato cru seria a
 * friccao; o que nao aceita e letra, que nunca e numero de telefone.
 */
function validarTelefone(valor: unknown, caminho: string, erros: ErrosDeCampo): string | undefined {
  const texto = limpar(valor);
  const bruto = texto ? texto.replace(/[\s().+\- ]/g, "") : "";
  let digitos = /^\d+$/.test(bruto) ? bruto : "";
  // Com "+" a pessoa ja escreveu o codigo do pais; completar com 55 faria
  // "+1 212 555 0100" passar por numero do Rio. So completa quem digitou DDD e numero.
  const comCodigoDoPais = texto?.startsWith("+") ?? false;
  if (!comCodigoDoPais && (digitos.length === 10 || digitos.length === 11)) digitos = `55${digitos}`;
  if (!/^55[1-9]{2}\d{8,9}$/.test(digitos)) {
    erros[caminho] = "Confira o número, com DDD (ex.: 21 99203-5643).";
    return undefined;
  }
  return digitos;
}

function validarUrlRede(
  campo: CampoUrlRede,
  valor: unknown,
  caminho: string,
  erros: ErrosDeCampo,
): string | undefined {
  const texto = limpar(valor);
  let url: URL | null = null;
  try {
    url = texto && tamanho(texto) <= 300 ? new URL(texto) : null;
  } catch {
    url = null;
  }
  if (!url || url.protocol !== "https:" || url.username || url.password || url.port) {
    erros[caminho] = `Use o endereço completo do perfil, começando por https:// (ex.: ${campo.exemplo}).`;
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (!campo.dominios.some((d) => host === d || host.endsWith(`.${d}`))) {
    erros[caminho] = `Esse endereço não é do ${campo.rotulo}.`;
    return undefined;
  }
  // A forma canonica do proprio URL: espaco e aspas saem codificados, e o que
  // vai para o href e o JSON-LD e exatamente o que foi conferido aqui.
  return url.href;
}

function validarCampo(campo: Campo, valor: unknown, caminho: string, erros: ErrosDeCampo): unknown {
  switch (campo.tipo) {
    case "texto":
    case "paragrafo":
      return validarTexto(campo, valor, caminho, erros);
    case "linhas":
      return validarLinhas(campo, valor, caminho, erros);
    case "lista":
      return validarLista(campo, valor, caminho, erros);
    case "grupo":
      return validarGrupo(campo, valor, caminho, erros);
    case "imagem":
      return validarImagem(campo, valor, caminho, erros);
    case "destino":
      return validarDestino(campo, valor, caminho, erros);
    case "numero":
      return validarNumero(campo, valor, caminho, erros);
    case "email":
      return validarEmail(campo, valor, caminho, erros);
    case "telefone":
      return validarTelefone(valor, caminho, erros);
    case "url-rede":
      return validarUrlRede(campo, valor, caminho, erros);
  }
}

/**
 * Um campo so, para o editor avisar enquanto a pessoa digita. E a mesma funcao
 * que `validarSecao` usa por dentro; regra entre campos (destaque no titulo)
 * so aparece na validacao da secao inteira.
 */
export function conferirCampo(
  campo: Campo,
  valor: unknown,
  caminho = "",
): { valor: unknown; erros: ErrosDeCampo } {
  const erros: ErrosDeCampo = {};
  const normalizado = validarCampo(campo, valor, caminho, erros);
  return { valor: normalizado, erros };
}

function descritorDe<C extends ChaveDeSecao>(chave: C): DescritorDeSecao<ConteudoDoSite[C]> {
  return DESCRITORES[chave] as DescritorDeSecao<ConteudoDoSite[C]>;
}

/** Algum erro em `campo` ou dentro dele. */
function temErroEm(erros: ErrosDeCampo, campo: string): boolean {
  return Object.keys(erros).some((k) => k === campo || k.startsWith(`${campo}.`));
}

/**
 * Validacao completa de uma secao, como chega do editor. Todo campo precisa
 * existir e ser valido. Devolve os dados normalizados (espacos, CEP, telefone
 * em digitos, medida real da foto) ou os erros por caminho de campo, com a
 * mensagem pronta para mostrar: "hero" + "tituloLinhas.1", "botoes.0.rotulo".
 */
export function validarSecao<C extends ChaveDeSecao>(
  chave: C,
  dados: unknown,
): ResultadoDaValidacao<ConteudoDoSite[C]> {
  const descritor = descritorDe(chave);
  const erros: ErrosDeCampo = {};
  if (!ehObjeto(dados)) {
    return { ok: false, dados: null, erros: { "": "Os dados desta seção chegaram incompletos." } };
  }

  const saida: Record<string, unknown> = {};
  for (const [nome, campo] of Object.entries(descritor.campos) as [string, Campo][]) {
    saida[nome] = validarCampo(campo, dados[nome], nome, erros);
  }

  // Cada regra so roda com os proprios campos validos; senao ela acusaria o
  // destaque de um titulo que nem chegou a ser lido.
  for (const regra of descritor.regras) {
    if (regra.campos.some((c) => temErroEm(erros, c))) continue;
    Object.assign(erros, regra.conferir(saida as ConteudoDoSite[C]));
  }

  if (Object.keys(erros).length > 0) return { ok: false, dados: null, erros };
  return { ok: true, dados: saida as ConteudoDoSite[C], erros: {} };
}

/* ----------------------------------------------------------------- mescla */

function mesclarCampo(campo: Campo, padrao: unknown, salvo: unknown): unknown {
  if (salvo === undefined) return padrao;
  // Grupo mescla por dentro: um CEP invalido nao pode levar a rua junto.
  if (campo.tipo === "grupo") {
    if (!ehObjeto(salvo) || !ehObjeto(padrao)) return padrao;
    const saida: Record<string, unknown> = {};
    for (const [nome, sub] of Object.entries(campo.campos)) {
      saida[nome] = mesclarCampo(sub, padrao[nome], salvo[nome]);
    }
    return saida;
  }
  // Lista, linhas, imagem e destino sao atomicos: metade de uma lista salva
  // com metade da lista padrao nao e conteudo que alguem escreveu.
  const erros: ErrosDeCampo = {};
  const valor = validarCampo(campo, salvo, "", erros);
  return Object.keys(erros).length > 0 ? padrao : valor;
}

/**
 * Padrao ⊕ salvo, campo a campo. Nunca lanca e sempre devolve uma secao
 * completa e valida: e o que a pagina publica le do banco.
 *
 * `padrao` e parametro, e nao import, para a previa empilhar tres camadas
 * (padrao ⊕ publicado ⊕ rascunho) com a mesma funcao.
 */
export function mesclarSecao<C extends ChaveDeSecao>(
  chave: C,
  padrao: ConteudoDoSite[C],
  salvo: unknown,
): ConteudoDoSite[C] {
  if (!ehObjeto(salvo)) return padrao;
  const descritor = descritorDe(chave);
  const base = padrao as Record<string, unknown>;

  const dados: Record<string, unknown> = {};
  for (const [nome, campo] of Object.entries(descritor.campos) as [string, Campo][]) {
    dados[nome] = mesclarCampo(campo, base[nome], salvo[nome]);
  }

  for (const regra of descritor.regras) {
    if (Object.keys(regra.conferir(dados as ConteudoDoSite[C])).length === 0) continue;
    for (const campo of regra.campos) dados[campo] = base[campo];
  }
  // As regras de uma secao nao dividem campos, entao uma passada basta. Se
  // mesmo assim sobrar conflito, a secao inteira volta ao padrao.
  const resta = descritor.regras.some(
    (regra) => Object.keys(regra.conferir(dados as ConteudoDoSite[C])).length > 0,
  );
  return resta ? padrao : (dados as ConteudoDoSite[C]);
}

/** Todas as secoes de uma vez. Chave desconhecida no banco e ignorada. */
export function mesclarConteudo(
  padrao: ConteudoDoSite,
  salvos: Partial<Record<string, unknown>>,
): ConteudoDoSite {
  const saida = {} as Record<ChaveDeSecao, unknown>;
  for (const chave of CHAVES_DE_SECAO) {
    saida[chave] = mesclarSecao(chave, padrao[chave], salvos[chave]);
  }
  return saida as ConteudoDoSite;
}

/* --------------------------------------------------- apoio para renderizar */

export function linkDoWhatsapp(digitos: string): string {
  return `https://wa.me/${digitos}`;
}

/** href do destino; null = botao sem destino (nasce inativo). */
export function hrefDoDestino(destino: Destino, whatsapp: string): string | null {
  if (destino.tipo === "pagina") return `/${destino.slug}`;
  if (destino.tipo === "whatsapp") return whatsapp;
  return null;
}

/** Para campos que so aceitam pagina (link embutido, cartao, servico). */
export function hrefDaPagina(destino: Destino): string {
  return destino.tipo === "pagina" ? `/${destino.slug}` : "/";
}

/**
 * O texto que segue um link embutido precisa de espaco antes dele? A limpeza
 * tira o espaco do comeco do campo, entao "com 30 anos" digitado depois do
 * link grudaria no nome; ", Osteopata" nao pode ganhar espaco antes da virgula.
 */
export function precisaDeEspacoAntes(texto: string): boolean {
  return texto !== "" && !/^[\s.,;:!?)\]}…—–-]/.test(texto);
}

/** Primeira ocorrencia do destaque. Sem ocorrencia, o texto sai inteiro sem grifo. */
export function dividirPeloDestaque(
  texto: string,
  destaque: string,
): { antes: string; destaque: string; depois: string } | null {
  const i = destaque ? texto.indexOf(destaque) : -1;
  if (i < 0) return null;
  return { antes: texto.slice(0, i), destaque, depois: texto.slice(i + destaque.length) };
}

export type SegmentoDoSubtitulo = {
  /** "\n" marca onde uma linha termina e a outra comeca. */
  texto: string;
  /** Posicao do trecho na lista de destaques, ou null para texto comum. */
  destaque: number | null;
};

/**
 * Onde cada trecho em destaque cai no subtitulo. O texto e procurado com as
 * linhas unidas por espaco, entao um trecho pode atravessar a quebra.
 */
function localizarDestaques(
  linhas: string[],
  trechos: string[],
): { faixas: { inicio: number; fim: number; indice: number }[]; erros: ErrosDeCampo } {
  const plano = linhas.join(" ");
  const erros: ErrosDeCampo = {};
  const faixas: { inicio: number; fim: number; indice: number }[] = [];
  trechos.forEach((trecho, indice) => {
    const inicio = trecho ? plano.indexOf(trecho) : -1;
    if (inicio < 0) {
      erros[`destaquesDoSubtitulo.${indice}`] =
        "Esse trecho não aparece na apresentação. Copie exatamente como está escrito.";
      return;
    }
    faixas.push({ inicio, fim: inicio + trecho.length, indice });
  });
  faixas.sort((a, b) => a.inicio - b.inicio);
  for (let i = 1; i < faixas.length; i += 1) {
    if (faixas[i].inicio < faixas[i - 1].fim) {
      erros[`destaquesDoSubtitulo.${faixas[i].indice}`] = "Os dois trechos em destaque não podem se sobrepor.";
    }
  }
  return { faixas, erros };
}

/**
 * O subtitulo em pedacos para renderizar: texto comum e trechos em destaque,
 * com "\n" nas quebras de linha. Cada pedaco vira texto React (nunca HTML).
 */
export function segmentosDoSubtitulo(linhas: string[], trechos: string[]): SegmentoDoSubtitulo[] {
  const texto = linhas.join("\n");
  const { faixas, erros } = localizarDestaques(linhas, trechos);
  const validas = Object.keys(erros).length > 0 ? [] : faixas;

  const segmentos: SegmentoDoSubtitulo[] = [];
  let cursor = 0;
  for (const faixa of validas) {
    if (faixa.inicio > cursor) segmentos.push({ texto: texto.slice(cursor, faixa.inicio), destaque: null });
    segmentos.push({ texto: texto.slice(faixa.inicio, faixa.fim), destaque: faixa.indice });
    cursor = faixa.fim;
  }
  if (cursor < texto.length) segmentos.push({ texto: texto.slice(cursor), destaque: null });
  return segmentos;
}

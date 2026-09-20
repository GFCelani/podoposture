import { lerNomeDoArquivo } from "./imagem-webp";

export const PREFIXO_IMAGEM = "/img/post/";

/**
 * O contrato do post escrito pelo painel.
 *
 * Este arquivo nao importa banco nem conversor de Markdown de proposito: ele e
 * carregado tanto pelo servidor (que decide) quanto pelo editor no navegador
 * (que avisa antes de enviar). Uma unica fonte para as duas pontas evita a
 * divergencia classica — o formulario aceita, a rota recusa, e quem escreveu
 * perde o texto sem entender por que.
 */

/**
 * Categorias oferecidas no painel.
 *
 * Sao os assuntos que a clinica de fato trata, e tres delas ja existem nos
 * posts migrados, com a grafia exata — assim a barra lateral do blog agrupa
 * post novo e post antigo na mesma linha em vez de criar um tema quase igual
 * ao lado do outro.
 */
export const CATEGORIAS = [
  "Dor Crônica",
  "Coluna e Dor Lombar",
  "Zumbido e Tinnitus",
  "Bruxismo, DTM e Dor Orofacial",
  "Dor de Cabeça e Cefaleias",
  "Postura e Pisada",
  "Osteopatia",
  "Acupuntura",
  "Neuromodulação",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export type DadosDoPost = {
  titulo: string;
  resumo: string;
  categoria: string;
  /** Caminho da capa, servida por /img/post/. Vazio = usa a capa de reserva. */
  capa: string;
  /** Corpo em Markdown. Nunca HTML — ver src/lib/markdown.ts. */
  corpo: string;
  publicado: boolean;
};

export type PostDoPainel = DadosDoPost & {
  id: string;
  slug: string;
  criadoEm: string;
  atualizadoEm: string;
  /** Data da PRIMEIRA publicacao. Continua preenchida se o texto sair do ar. */
  publicadoEm: string | null;
};

/**
 * O post sem o corpo. E o que a listagem do site precisa: carregar ate 120 mil
 * caracteres por texto so para mostrar titulo e resumo seria pagar a consulta
 * mais cara a cada visita ao blog.
 */
export type ResumoDoPainel = Omit<PostDoPainel, "corpo">;

export const LIMITE_SLUG = 80;

export const LIMITES_POST = {
  titulo: 140,
  resumo: 300,
  corpo: 120_000,
} as const;

export const CORPO_MINIMO = 40;

/**
 * Titulo -> slug, sempre em ASCII.
 *
 * O "sempre em ASCII" nao e preferencia de estilo: o Next 16.3.4 nao serve rota
 * cujo segmento tem caractere fora do ASCII (vercel/next.js#73965). As 59 URLs
 * acentuadas herdadas do GoDaddy so funcionam porque `src/middleware.ts`
 * reescreve cada uma usando um mapa gerado no build. Um post criado pelo painel
 * nasce depois do build e nunca estaria nesse mapa — entao ele nasce ja sem
 * acento, e o problema deixa de existir para ele.
 */
export function gerarSlug(titulo: string): string {
  return titulo
    .normalize("NFD")
    // O intervalo U+0300 a U+036F e o bloco de acentos que o NFD separa da
    // letra. Escrito como escape: acento combinante literal e invisivel no
    // editor e sobrevive mal a copia entre ferramentas.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, LIMITE_SLUG)
    .replace(/^-+|-+$/g, "");
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugValido(slug: string): boolean {
  return SLUG.test(slug) && slug.length <= LIMITE_SLUG;
}

/**
 * Junta raiz e sufixo de desempate respeitando o teto.
 * O sufixo tem prioridade no orcamento: cortar o "-2" faria dois posts
 * diferentes terminarem com o mesmo endereco.
 */
export function juntarSlug(raiz: string, sufixo: string): string {
  const espaco = Math.max(1, LIMITE_SLUG - sufixo.length);
  return raiz.slice(0, espaco).replace(/-+$/g, "") + sufixo;
}

export type ErrosPost = Partial<Record<keyof DadosDoPost, string>>;

export function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export function booleano(valor: unknown): boolean {
  return valor === true || valor === "true";
}

export function validarPost(dados: DadosDoPost): ErrosPost {
  const erros: ErrosPost = {};

  if (!dados.titulo) erros.titulo = "O texto precisa de um título.";
  else if (dados.titulo.length > LIMITES_POST.titulo)
    erros.titulo = `Máximo de ${LIMITES_POST.titulo} caracteres.`;
  else if (/[\r\n]/.test(dados.titulo)) erros.titulo = "O título não pode ter quebras de linha.";
  else if (!gerarSlug(dados.titulo))
    erros.titulo = "O título precisa ter ao menos uma letra ou número.";

  if (dados.resumo.length > LIMITES_POST.resumo)
    erros.resumo = `Máximo de ${LIMITES_POST.resumo} caracteres.`;

  if (!(CATEGORIAS as readonly string[]).includes(dados.categoria))
    erros.categoria = "Escolha um dos temas da lista.";

  // A capa e opcional: sem ela o blog usa a de reserva, como ja faz com os
  // posts antigos que vieram sem imagem. Quando existe, passa pelo MESMO leitor
  // de nome que a rota de imagem usa — conferir so o prefixo deixava passar
  // `/img/post/"><svg onload=...`, que ia direto para o <Image> do indice do
  // blog e para o JSON-LD.
  if (dados.capa && !lerNomeDoArquivo(dados.capa.replace(PREFIXO_IMAGEM, "")))
    erros.capa = "Capa inválida — envie a imagem pelo próprio painel.";
  else if (dados.capa && !dados.capa.startsWith(PREFIXO_IMAGEM))
    erros.capa = "Capa inválida — envie a imagem pelo próprio painel.";

  // Medido sem os espacos das pontas: uma tabela do Word que o conversor
  // descarta vira so quebras de linha, e 40 delas passavam como texto e iam ao
  // ar com titulo e corpo vazio.
  const corpoLimpo = dados.corpo.trim();
  if (!corpoLimpo) erros.corpo = "Escreva o texto antes de salvar.";
  else if (corpoLimpo.length < CORPO_MINIMO)
    erros.corpo = `Escreva um pouco mais — pelo menos ${CORPO_MINIMO} caracteres.`;
  else if (dados.corpo.length > LIMITES_POST.corpo)
    erros.corpo = `Texto longo demais (máximo ${LIMITES_POST.corpo.toLocaleString("pt-BR")} caracteres).`;

  return erros;
}

/**
 * O erro de um campo so, para o aviso ao sair dele.
 *
 * Validar o formulario inteiro no `blur` do titulo mostrava "Escreva o texto"
 * antes de ela sequer chegar ao corpo: um erro sobre o que ela ainda nem
 * tentou fazer. Os outros campos ficam como estavam — nem ganham aviso novo,
 * nem perdem um aviso que ainda vale.
 */
export function errosComCampo(
  erros: ErrosPost,
  dados: DadosDoPost,
  campo: keyof DadosDoPost,
): ErrosPost {
  const novos = { ...erros };
  delete novos[campo];
  const mensagem = validarPost(dados)[campo];
  if (mensagem) novos[campo] = mensagem;
  return novos;
}

/**
 * O endereco de um texto so muda enquanto ele NUNCA foi publicado.
 *
 * A regra olha `publicadoEm`, e nao `publicado`. Olhando `publicado`, bastava
 * guardar como rascunho, corrigir uma palavra do titulo e publicar de novo para
 * o endereco trocar: o link que o Google ja tinha guardado, e que alguem pode
 * ter mandado por WhatsApp, virava 404 sem aviso nenhum.
 */
export function enderecoPodeMudar(
  atual: Pick<PostDoPainel, "publicadoEm" | "titulo">,
  novoTitulo: string,
): boolean {
  return atual.publicadoEm === null && atual.titulo !== novoTitulo;
}

/**
 * A data de publicacao e a da primeira vez.
 *
 * Republicar depois de um rascunho nao reescreve a data: o texto nao pula para
 * o topo do blog como se fosse novo, e a data que o buscador leu continua certa.
 */
export function ehEstreia(publicadoEmAtual: string | null, publicarAgora: boolean): boolean {
  return publicarAgora && publicadoEmAtual === null;
}

/**
 * Guardar como rascunho um texto que esta no ar tira ele do site. Isso pede
 * um segundo clique; num rascunho, guardar nao tira nada de lugar nenhum.
 */
export function rascunhoPrecisaConfirmar(post: Pick<PostDoPainel, "publicado"> | null): boolean {
  return post?.publicado === true;
}

/**
 * O envio repetido de um texto NOVO tiraria do ar um texto ja publicado?
 *
 * O caso, que nao e teorico: ela clica em "Publicar", a resposta se perde no 4G
 * e o texto ja foi gravado e publicado. Ela volta a tela, muda de ideia e
 * clica em "Guardar rascunho". O editor repete o envio com o MESMO id — e do
 * lado dele o texto ainda e "novo", entao `rascunhoPrecisaConfirmar` nao tem o
 * que conferir e o aviso "Tirar do site e guardar" nunca aparece. O servidor e
 * o unico lado que sabe que aquele id ja esta publicado.
 *
 * Pura de proposito: quem decide e a rota, e a regra se prova sem banco.
 */
export function repetirTiraDoAr(
  existente: Pick<PostDoPainel, "publicado"> | null,
  novos: Pick<DadosDoPost, "publicado">,
): boolean {
  return existente?.publicado === true && !novos.publicado;
}

/**
 * O que a releitura do texto diz, depois do 409 de "ja esta publicado".
 *
 * - `no-ar`: o editor passa a tratar o texto como publicado.
 * - `fora-do-ar`: outra janela tirou do ar entre a recusa e a releitura. A
 *   mensagem do servidor ("ja esta publicado, tire do ar pela lista") diria o
 *   contrario do que a lista mostra; o aviso certo e `AVISO_SAIU_DO_AR`.
 * - `ilegivel`: nao deu para reler, e ai vale a mensagem do servidor.
 */
export function situacaoDaReleitura(salvo: unknown, id: string): "no-ar" | "fora-do-ar" | "ilegivel" {
  if (typeof salvo !== "object" || salvo === null) return "ilegivel";
  const lido = salvo as Partial<PostDoPainel>;
  if (lido.id !== id || typeof lido.publicado !== "boolean") return "ilegivel";
  return lido.publicado ? "no-ar" : "fora-do-ar";
}

export const AVISO_SAIU_DO_AR =
  "Este texto saiu do site em outra janela enquanto você salvava, e nada desta tela foi guardado ainda. Clique de novo em “Guardar como rascunho” para guardar o que está aqui.";

/**
 * O envio de um texto pelo POST muda o que o site mostra?
 *
 * Muda quando o texto fica publicado ou quando ja estava no ar antes (o POST
 * repetido atualiza, e pode tirar do ar). So o rascunho que nunca esteve no ar
 * nao muda nada, e por ele nao se refaz home, indice e sitemap.
 */
export function envioMudaOSite(
  existente: Pick<PostDoPainel, "publicado"> | null,
  salvo: Pick<DadosDoPost, "publicado">,
): boolean {
  return existente?.publicado === true || salvo.publicado;
}

/** A frase curta que aparece na lista depois de salvar. Diz o que mudou no site. */
export function mensagemAoSalvar(publicarAgora: boolean, estavaNoAr: boolean): string {
  if (publicarAgora) {
    return estavaNoAr ? "Alterações publicadas no site." : "Texto publicado. Ele já está no site.";
  }
  return estavaNoAr
    ? "Texto tirado do site e guardado como rascunho."
    : "Rascunho guardado. Ele ainda não está no site.";
}

/**
 * O aviso quando salvar falha, sempre com o proximo passo.
 *
 * A mensagem crua do servidor ("Nao foi possivel salvar o post.") diz o que deu
 * errado e para ali. Quem acabou de escrever um texto inteiro precisa ouvir
 * primeiro que ele nao se perdeu, e depois o que fazer.
 */
export function mensagemDeFalhaAoSalvar(status: number, doServidor: unknown): string {
  const motivo =
    typeof doServidor === "string" && doServidor ? doServidor : "Não foi possível salvar.";
  // 409 e uma recusa de proposito, com a saida escrita pelo servidor ("use
  // Tirar do site e guardar"). O sufixo "tente de novo" mandava repetir o que
  // vai ser recusado de novo, e ela ficava num laco sem saida.
  if (status === 400 || status === 409) return motivo;
  if (status === 404) {
    return "Este texto foi apagado em outra janela. O que você escreveu continua nesta tela: copie antes de sair.";
  }
  if (status === 413) {
    return "O texto ficou grande demais para salvar de uma vez. Ele continua aqui: divida em dois textos e tente de novo.";
  }
  if (status === 503) {
    return `${motivo} O texto continua aqui. Avise quem cuida do site.`;
  }
  return `${motivo} O texto continua aqui; tente de novo em alguns minutos.`;
}

/** Converte o corpo cru da requisicao nos campos do post. */
export function camposDoCorpo(bruto: Record<string, unknown>): DadosDoPost {
  return {
    titulo: texto(bruto.titulo),
    resumo: texto(bruto.resumo),
    categoria: texto(bruto.categoria),
    capa: texto(bruto.capa),
    corpo: typeof bruto.corpo === "string" ? bruto.corpo : "",
    publicado: booleano(bruto.publicado),
  };
}

/** Data por extenso, no formato que os 68 posts migrados ja usam. */
export function rotuloDaData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

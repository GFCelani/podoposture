/**
 * Prepara e envia uma imagem a partir do navegador.
 *
 * Roda SO no navegador (usa canvas). Serve ao editor de post e a aba da pagina
 * inicial: as duas precisam da mesma coisa, e duas copias deste codigo
 * divergiriam no primeiro conserto.
 *
 * Reduzir e converter aqui tira do servidor a necessidade de processar imagem,
 * e o arquivo que trafega ja e o que sera servido.
 *
 * O detalhe que motivou tirar isto de dentro do editor: o Safari nao sabe gerar
 * WebP num canvas. Pedir `image/webp` devolve um PNG, sem erro nenhum, e o
 * servidor recusava PNG — capa e foto nao subiam de iPhone nem de Mac. Agora o
 * tipo do que voltou e conferido e, se nao for WebP, a imagem sai em JPEG.
 */

/**
 * Erro com a frase pronta para mostrar a ela.
 *
 * `status` e o HTTP que causou a falha, ou 0 quando o pedido nem chegou ao
 * servidor. Existe para quem chama distinguir sessao perdida de imagem ruim.
 */
export class ErroAoEnviarImagem extends Error {
  readonly status: number;

  constructor(mensagem: string, status = 0) {
    super(mensagem);
    this.name = "ErroAoEnviarImagem";
    this.status = status;
  }

  /** 401 ou 403: tratar como sessao perdida, nao como problema da imagem. */
  get sessaoPerdida(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export type ImagemEnviada = { url: string; largura: number; altura: number };

function paraBlob(tela: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob> {
  return new Promise((resolver, recusar) =>
    tela.toBlob(
      (blob) => (blob ? resolver(blob) : recusar(new Error("conversão falhou"))),
      tipo,
      qualidade,
    ),
  );
}

/**
 * Reduz para no maximo `larguraMaxima` pixels de largura e devolve WebP, ou
 * JPEG onde o navegador nao gera WebP. Nunca aumenta uma imagem menor.
 */
export async function prepararImagem(arquivo: File, larguraMaxima: number): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  try {
    const escala = Math.min(1, larguraMaxima / bitmap.width);
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));

    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const ctx = tela.getContext("2d");
    if (!ctx) throw new Error("sem contexto de desenho");
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    const webp = await paraBlob(tela, "image/webp", 0.82);
    if (webp.type === "image/webp") return webp;

    // JPEG nao tem transparencia: sem um fundo pintado ATRAS do desenho, o que
    // era transparente num PNG (um logotipo, por exemplo) sairia preto.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largura, altura);
    return await paraBlob(tela, "image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

const FALHA_GENERICA = "Não foi possível enviar a imagem. Tente de novo em alguns minutos.";

/**
 * Prepara e envia para `/api/painel/imagens`. Devolve o endereco publico e as
 * medidas lidas pelo servidor, ou lanca `ErroAoEnviarImagem` com a mensagem
 * pronta para a tela.
 */
export async function enviarImagem(arquivo: File, larguraMaxima: number): Promise<ImagemEnviada> {
  let pronta: Blob;
  try {
    pronta = await prepararImagem(arquivo, larguraMaxima);
  } catch {
    // Formato que o navegador nao decodifica (HEIC fora do Safari, arquivo
    // que nao e imagem): a saida util e pedir outro arquivo.
    throw new ErroAoEnviarImagem("Não foi possível preparar essa imagem. Tente outra, em JPG ou PNG.");
  }

  let resposta: Response;
  try {
    resposta = await fetch("/api/painel/imagens", {
      method: "POST",
      headers: { "Content-Type": pronta.type },
      body: pronta,
    });
  } catch {
    throw new ErroAoEnviarImagem("Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }

  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroAoEnviarImagem(
      "Sua sessão terminou. Entre de novo para enviar a imagem.",
      resposta.status,
    );
  }
  if (resposta.status === 413) {
    throw new ErroAoEnviarImagem("Imagem grande demais (máximo 3 MB).", 413);
  }

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroAoEnviarImagem(
      typeof corpo?.erro === "string" ? corpo.erro : FALHA_GENERICA,
      resposta.status,
    );
  }
  if (typeof corpo?.url !== "string") {
    throw new ErroAoEnviarImagem(FALHA_GENERICA, resposta.status);
  }

  return { url: corpo.url, largura: Number(corpo.largura), altura: Number(corpo.altura) };
}

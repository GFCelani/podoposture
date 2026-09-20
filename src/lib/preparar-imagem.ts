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

/** O que o servidor aceita: acima disso ele recusa com 413. */
export const TAMANHO_MAXIMO_DO_ENVIO = 3 * 1024 * 1024;
/** O maior lado que o servidor le (LADO_MAXIMO em imagem-webp.ts). */
export const LADO_MAXIMO_DO_ENVIO = 8192;

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

/**
 * Quanto a imagem encolhe. Pela largura, que e o que a coluna do site usa, e
 * tambem pela altura: uma captura de tela comprida do iPhone (1170 x 9500)
 * passava inteira pela regra so da largura, e o servidor, que nao le lado
 * acima de 8192, recusava o arquivo.
 */
export function escalaDoEnvio(largura: number, altura: number, larguraMaxima: number): number {
  if (largura < 1 || altura < 1) return 1;
  return Math.min(1, larguraMaxima / largura, LADO_MAXIMO_DO_ENVIO / largura, LADO_MAXIMO_DO_ENVIO / altura);
}

/**
 * A frase de falha do envio, por status, sempre com o proximo passo e dizendo
 * que o texto nao se perdeu. A mensagem crua do servidor ("Nao foi possivel
 * guardar a imagem.") parava no problema.
 */
export function mensagemDeFalhaDoEnvio(status: number, doServidor: unknown): string {
  const motivo = typeof doServidor === "string" && doServidor ? doServidor : null;
  if (status === 413) return "Imagem grande demais (máximo 3 MB). Tente uma foto menor.";
  if (status === 503) {
    return `${motivo ?? "O banco de dados não está configurado neste servidor."} O que você escreveu continua aqui. Avise quem cuida do site.`;
  }
  if (status === 400) return motivo ?? "Não conseguimos ler essa imagem. Tente outra foto, em JPG ou PNG.";
  return "Não foi possível guardar a imagem agora. O que você escreveu continua aqui; tente de novo em alguns minutos.";
}

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
 * Reduz para no maximo `larguraMaxima` pixels de largura (e para o maior lado
 * que o servidor le) e devolve WebP, ou JPEG onde o navegador nao gera WebP.
 * Nunca aumenta uma imagem menor. Se ainda assim passar de 3 MB, encolhe mais
 * algumas vezes antes de desistir: mandar para o servidor recusar seria a
 * mesma foto voltando com erro.
 */
export async function prepararImagem(arquivo: File, larguraMaxima: number): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  try {
    let escala = escalaDoEnvio(bitmap.width, bitmap.height, larguraMaxima);
    let pronta: Blob | null = null;
    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      const largura = Math.max(1, Math.round(bitmap.width * escala));
      const altura = Math.max(1, Math.round(bitmap.height * escala));

      const tela = document.createElement("canvas");
      tela.width = largura;
      tela.height = altura;
      const ctx = tela.getContext("2d");
      if (!ctx) throw new Error("sem contexto de desenho");
      ctx.drawImage(bitmap, 0, 0, largura, altura);

      const webp = await paraBlob(tela, "image/webp", 0.82);
      if (webp.type === "image/webp") {
        pronta = webp;
      } else {
        // JPEG nao tem transparencia: sem um fundo pintado ATRAS do desenho, o
        // que era transparente num PNG (um logotipo, por exemplo) sairia preto.
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, largura, altura);
        pronta = await paraBlob(tela, "image/jpeg", 0.85);
      }
      if (pronta.size <= TAMANHO_MAXIMO_DO_ENVIO) return pronta;
      escala *= 0.8;
    }
    return pronta!;
  } finally {
    bitmap.close();
  }
}

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
    throw new ErroAoEnviarImagem(
      "Sem conexão com o servidor. O que você escreveu continua aqui; verifique a internet e tente de novo.",
    );
  }

  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroAoEnviarImagem(
      "Sua sessão terminou. Entre de novo para enviar a imagem.",
      resposta.status,
    );
  }

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroAoEnviarImagem(mensagemDeFalhaDoEnvio(resposta.status, corpo?.erro), resposta.status);
  }
  if (typeof corpo?.url !== "string") {
    throw new ErroAoEnviarImagem(mensagemDeFalhaDoEnvio(502, null), resposta.status);
  }

  return { url: corpo.url, largura: Number(corpo.largura), altura: Number(corpo.altura) };
}

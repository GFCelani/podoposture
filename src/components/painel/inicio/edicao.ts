/**
 * A parte pura do editor da pagina inicial: caminhos, listas, erros, textos de
 * estado e a copia guardada no navegador.
 *
 * Fica fora dos componentes para ser testada sem navegador, e importa o
 * contrato por caminho relativo porque o vitest roda sem o alias `@/`.
 *
 * O editor trabalha com os dados "em edicao": o mesmo formato de
 * ConteudoDoSite, mas com valor torto no meio da digitacao (linha vazia, CEP
 * pela metade, telefone com parenteses). Quem decide o que e valido continua
 * sendo `validarSecao`, a mesma funcao da rota: uma regra propria aqui faria o
 * formulario aceitar o que o servidor recusa.
 */

import {
  DESCRITORES,
  PAGINAS_DE_DESTINO,
  conferirCampo,
  ehChaveDeSecao,
  type Campo,
  type ChaveDeSecao,
  type Destino,
  type ErrosDeCampo,
  type EstadoDaSecao,
} from "../../../lib/conteudo-tipos";
import type { Armazem } from "../../../lib/recado-do-editor";

export type DadosEmEdicao = Record<string, unknown>;

export function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function camposDaSecao(chave: ChaveDeSecao): Record<string, Campo> {
  return DESCRITORES[chave].campos as Record<string, Campo>;
}

/* ---------------------------------------------------------------- caminhos */

export function lerCaminho(raiz: unknown, caminho: string): unknown {
  if (!caminho) return raiz;
  let atual = raiz;
  for (const parte of caminho.split(".")) {
    if (Array.isArray(atual)) atual = atual[Number(parte)];
    else if (ehObjeto(atual)) atual = atual[parte];
    else return undefined;
  }
  return atual;
}

/**
 * Copia com o valor trocado no caminho ("botoes.0.rotulo"). Nunca altera o
 * original: o estado do React compara por referencia, e mutar no lugar faria a
 * tela nao redesenhar.
 */
export function gravarCaminho<T>(raiz: T, caminho: string, valor: unknown): T {
  const gravar = (atual: unknown, partes: string[]): unknown => {
    if (partes.length === 0) return valor;
    const [cabeca, ...resto] = partes;
    if (Array.isArray(atual)) {
      const copia = atual.slice();
      copia[Number(cabeca)] = gravar(atual[Number(cabeca)], resto);
      return copia;
    }
    const base = ehObjeto(atual) ? atual : {};
    return { ...base, [cabeca]: gravar(base[cabeca], resto) };
  };
  return gravar(raiz, caminho ? caminho.split(".") : []) as T;
}

/** id do elemento que recebe foco para um caminho de erro. */
export function idDoCampo(chave: ChaveDeSecao, caminho: string): string {
  return `inicio-${chave}-${caminho.replace(/\./g, "-")}`;
}

/* ------------------------------------------------------------------ listas */

export function moverItem<T>(lista: readonly T[], de: number, para: number): T[] {
  const copia = lista.slice();
  if (de < 0 || de >= copia.length || para < 0 || para >= copia.length) return copia;
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

export function removerItem<T>(lista: readonly T[], indice: number): T[] {
  return lista.filter((_, i) => i !== indice);
}

/**
 * Valor de um item novo. Destino de pagina nasce com slug vazio, e nao com a
 * primeira pagina da lista: um botao novo apontando sozinho para "Tratamento da
 * Dor" iria ao ar sem ela ter escolhido. Vazio, o seletor pede a escolha.
 */
export function valorVazio(campo: Campo): unknown {
  switch (campo.tipo) {
    case "texto":
    case "paragrafo":
    case "email":
    case "telefone":
    case "url-rede":
      return "";
    case "numero":
      return campo.min;
    case "linhas":
      return Array.from({ length: campo.quantidade }, () => "");
    case "lista":
      return Array.from({ length: campo.min }, () => valorVazio(campo.item));
    case "grupo":
      return Object.fromEntries(Object.entries(campo.campos).map(([nome, sub]) => [nome, valorVazio(sub)]));
    case "imagem":
      return { src: "", largura: 0, altura: 0, alt: "" };
    case "destino":
      return campo.aceita.includes("pagina") ? { tipo: "pagina", slug: "" } : { tipo: campo.aceita[0] };
  }
}

/* ------------------------------------------------------------------- erros */

/** `alvo` e `caminho` sao o mesmo campo, ou um esta dentro do outro. */
function mesmoRamo(alvo: string, caminho: string): boolean {
  return alvo === caminho || alvo.startsWith(`${caminho}.`) || caminho.startsWith(`${alvo}.`);
}

/**
 * Campos de topo que dividem uma regra com o campo editado. Mudar a 2a linha do
 * titulo pode invalidar a palavra grifada: o aviso precisa aparecer ao sair da
 * linha, e nao so quando ela tentar publicar.
 */
export function camposRelacionados(chave: ChaveDeSecao, caminho: string): string[] {
  const topo = caminho.split(".")[0];
  const regras = DESCRITORES[chave].regras as readonly { campos: readonly string[] }[];
  const saida = new Set<string>();
  for (const regra of regras) {
    if (regra.campos.includes(topo)) for (const campo of regra.campos) saida.add(campo);
  }
  saida.delete(topo);
  return [...saida];
}

/**
 * Os erros mostrados depois de mexer em `caminho`.
 *
 * Erro que ja estava na tela segue a validacao nova: some quando o campo fica
 * certo, troca de texto quando muda o motivo. Erro NOVO so entra com
 * `mostrarNovos` (ao sair do campo) e so para o campo mexido e os que dividem
 * regra com ele. Avisar no meio da digitacao, ou acusar campos que ela nem
 * tocou, e o formulario que briga com quem escreve.
 */
export function atualizarErros(
  anteriores: ErrosDeCampo,
  novos: ErrosDeCampo,
  caminho: string,
  relacionados: readonly string[],
  mostrarNovos: boolean,
): ErrosDeCampo {
  const saida: ErrosDeCampo = {};
  for (const chave of Object.keys(anteriores)) {
    if (chave in novos) saida[chave] = novos[chave];
  }
  if (!mostrarNovos) return saida;
  for (const [chave, mensagem] of Object.entries(novos)) {
    if (mesmoRamo(chave, caminho) || relacionados.some((r) => mesmoRamo(chave, r))) saida[chave] = mensagem;
  }
  return saida;
}

/** Tira os erros de dentro de uma lista que mudou de ordem ou de tamanho: o indice deles ja nao aponta para o mesmo item. */
export function semErrosEm(erros: ErrosDeCampo, caminho: string): ErrosDeCampo {
  return Object.fromEntries(Object.entries(erros).filter(([chave]) => !mesmoRamo(chave, caminho)));
}

/* ------------------------------------------------------ contagem de texto */

/**
 * Conta como a validacao conta: espacos seguidos viram um e as pontas somem.
 * Contar o texto cru mostraria "22 de 22" num titulo que a rota aceita com 21.
 */
export function contarCaracteres(texto: string): number {
  return Array.from(texto.replace(/[ \t\r\n]+/g, " ").trim()).length;
}

export type SituacaoDoTamanho = { usados: number; restam: number; perto: boolean; passou: boolean };

/** "Perto" = nos ultimos 10% do limite (pelo menos 3 caracteres): o aviso chega antes de passar. */
export function situacaoDoTamanho(texto: string, max: number): SituacaoDoTamanho {
  const usados = contarCaracteres(texto);
  const restam = max - usados;
  const folga = Math.max(3, Math.ceil(max * 0.1));
  return { usados, restam, perto: restam >= 0 && restam <= folga, passou: restam < 0 };
}

/* ---------------------------------------------------------------- telefone */

/**
 * O telefone e guardado so em digitos com 55. Mostrar "5521992035643" no campo
 * faria ela achar que o numero esta errado; a validacao aceita o formato com
 * parenteses e devolve os digitos.
 */
export function telefoneParaExibir(valor: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(valor);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : valor;
}

/** Valor salvo → valor no formulario. Hoje so o telefone muda de cara. */
export function campoParaEdicao(campo: Campo, valor: unknown): unknown {
  if (campo.tipo === "telefone") return typeof valor === "string" ? telefoneParaExibir(valor) : valor;
  if (campo.tipo === "grupo" && ehObjeto(valor)) {
    const saida: Record<string, unknown> = { ...valor };
    for (const [nome, sub] of Object.entries(campo.campos)) saida[nome] = campoParaEdicao(sub, valor[nome]);
    return saida;
  }
  if (campo.tipo === "lista" && Array.isArray(valor)) return valor.map((item) => campoParaEdicao(campo.item, item));
  return valor;
}

export function paraEdicao(chave: ChaveDeSecao, dados: unknown): DadosEmEdicao {
  const origem = ehObjeto(dados) ? dados : {};
  const saida: DadosEmEdicao = {};
  for (const [nome, campo] of Object.entries(camposDaSecao(chave))) {
    saida[nome] = campoParaEdicao(campo, origem[nome]);
  }
  return saida;
}

/**
 * O campo no formulario diz o mesmo que o valor original? Compara depois de
 * normalizar os dois, senao "(21) 99203-5643" contaria como alterado so por
 * estar escrito com parenteses.
 */
export function mesmoValor(campo: Campo, atual: unknown, original: unknown): boolean {
  const a = conferirCampo(campo, atual);
  if (Object.keys(a.erros).length > 0) return false;
  return JSON.stringify(a.valor) === JSON.stringify(conferirCampo(campo, original).valor);
}

/* ----------------------------------------------------------------- destino */

/** Valor do <select>. "" = nada escolhido ainda (ou pagina que saiu do site). */
export function codificarDestino(destino: unknown, slugs: ReadonlySet<string>): string {
  if (!ehObjeto(destino)) return "";
  if (destino.tipo === "whatsapp" || destino.tipo === "nenhum") return destino.tipo;
  if (destino.tipo === "pagina" && typeof destino.slug === "string" && slugs.has(destino.slug)) {
    return `pagina:${destino.slug}`;
  }
  return "";
}

export function decodificarDestino(valor: string): Destino {
  if (valor === "whatsapp" || valor === "nenhum") return { tipo: valor };
  return { tipo: "pagina", slug: valor.startsWith("pagina:") ? valor.slice("pagina:".length) : "" };
}

export function rotuloDoDestino(destino: unknown): string {
  if (!ehObjeto(destino)) return "Nenhum destino escolhido";
  if (destino.tipo === "whatsapp") return "Conversa no WhatsApp";
  if (destino.tipo === "nenhum") return "Sem destino (botão apagado)";
  const pagina = PAGINAS_DE_DESTINO.find((p) => p.slug === destino.slug);
  return pagina ? `Página “${pagina.rotulo}”` : "Nenhum destino escolhido";
}

/* ----------------------------------------------------------- fotos enviadas */

/**
 * Largura maxima da foto enviada. A galeria abre a foto grande e o topo da
 * pagina e a imagem mais vista; o resto ocupa no maximo uma coluna.
 */
export function larguraDoEnvio(chave: ChaveDeSecao): number {
  return chave === "hero" || chave === "galeria" ? 2000 : 1600;
}

/* ------------------------------------------------------ textos para a tela */

function linhaUnica(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

/**
 * O valor original escrito por extenso, para ela ver o que volta antes de
 * clicar (JOURNEY: "o texto original aparece escrito, nao so um botao").
 */
export function textoDoValor(campo: Campo, valor: unknown): string {
  switch (campo.tipo) {
    case "texto":
    case "paragrafo":
    case "email":
    case "url-rede":
      return typeof valor === "string" ? valor : "";
    case "telefone":
      return typeof valor === "string" ? telefoneParaExibir(valor) : "";
    case "numero":
      return typeof valor === "number" ? String(valor) : "";
    case "linhas":
      return Array.isArray(valor) ? valor.filter((l) => typeof l === "string").join("\n") : "";
    case "destino":
      return rotuloDoDestino(valor);
    case "imagem":
      return ehObjeto(valor) && typeof valor.alt === "string" ? valor.alt : "";
    case "grupo": {
      if (!ehObjeto(valor)) return "";
      // A lista entra junto: sem ela, a "Lista original" dos servicos mostrava
      // so titulo e botao, e o paragrafo que ela queria recuperar nao aparecia.
      return Object.entries(campo.campos)
        .filter(([, sub]) => sub.tipo === "texto" || sub.tipo === "paragrafo" || sub.tipo === "lista")
        .map(([nome, sub]) => linhaUnica(textoDoValor(sub, valor[nome])))
        .filter(Boolean)
        .join(" · ");
    }
    case "lista":
      return Array.isArray(valor)
        ? valor.map((item, i) => `${i + 1}. ${linhaUnica(textoDoValor(campo.item, item))}`).join("\n")
        : "";
  }
}

function cortar(texto: string, max: number): string {
  const letras = Array.from(texto);
  if (letras.length <= max) return texto;
  const corte = letras.slice(0, max).join("");
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > max / 2 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

/**
 * O comeco do texto que esta no ar, para a lista de secoes. Ela procura "onde
 * esta aquela frase", nao o nome da secao (JOURNEY, "Nao achar o texto").
 * Junta os primeiros campos de texto ate ter uma frase que se reconheca.
 */
export function resumoDaSecao(chave: ChaveDeSecao, dados: unknown, max = 90): string {
  const origem = ehObjeto(dados) ? dados : {};
  const partes: string[] = [];
  const juntar = (campo: Campo, valor: unknown) => {
    if (partes.join(" · ").length >= max / 2) return;
    if (campo.tipo === "grupo") {
      if (ehObjeto(valor)) for (const [nome, sub] of Object.entries(campo.campos)) juntar(sub, valor[nome]);
      return;
    }
    if (campo.tipo === "lista") {
      if (Array.isArray(valor) && valor.length > 0) juntar(campo.item, valor[0]);
      return;
    }
    if (campo.tipo === "imagem" || campo.tipo === "destino" || campo.tipo === "numero") return;
    const texto = linhaUnica(textoDoValor(campo, valor));
    if (texto) partes.push(texto);
  };
  for (const [nome, campo] of Object.entries(camposDaSecao(chave))) juntar(campo, origem[nome]);
  return cortar(partes.join(" · "), max);
}

export type MarcaDeEstado = { texto: string; tom: "original" | "alterado" | "pendente" };

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function data(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : DATA.format(d);
}

/**
 * O estado da secao em palavras. "Alterado" so quando o que esta no ar difere
 * do original: publicar sem mudar nada nao pode marcar a secao como mexida.
 */
export function estadoEmPalavras(estado: EstadoDaSecao<unknown>, temCopiaLocal: boolean): MarcaDeEstado[] {
  const marcas: MarcaDeEstado[] = [];
  const noAr = estado.publicado ?? estado.padrao;
  if (estado.publicado !== null && JSON.stringify(estado.publicado) !== JSON.stringify(estado.padrao)) {
    const quando = data(estado.publicadoEm);
    marcas.push({ texto: quando ? `Alterado em ${quando}` : "Alterado", tom: "alterado" });
  } else {
    marcas.push({ texto: "Texto original", tom: "original" });
  }
  if (estado.rascunho !== null && JSON.stringify(estado.rascunho) !== JSON.stringify(noAr)) {
    marcas.push({ texto: "Rascunho não publicado", tom: "pendente" });
  }
  if (temCopiaLocal) marcas.push({ texto: "Alteração guardada só neste navegador", tom: "pendente" });
  return marcas;
}

/**
 * O que esta no ar difere do texto original? So entao "voltar ao texto
 * original" faz sentido: com o publicado igual ao padrao o botao prometia
 * mudar o site e nao mudava nada.
 */
export function publicadoDiferenteDoPadrao(estado: EstadoDaSecao<unknown>): boolean {
  return estado.publicado !== null && JSON.stringify(estado.publicado) !== JSON.stringify(estado.padrao);
}

function primeiraMinuscula(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function ondeAparece(chave: ChaveDeSecao): string {
  const descritor = DESCRITORES[chave];
  return `${primeiraMinuscula(descritor.aparece)}${descritor.global ? ", para todo mundo" : ""}`;
}

/** A confirmacao de publicar: onde a mudanca aparece. Usada no editor e na aba de como vai ficar. */
export function explicacaoDePublicar(chave: ChaveDeSecao): string {
  return `Esta versão vai para o site: ${ondeAparece(chave)}. Para confirmar, clique outra vez em “Confirmar e publicar”.`;
}

/**
 * A confirmacao de voltar ao original, que muda o site na hora e sem ver antes
 * como fica — e precisa dizer isso, e onde, como a de publicar diz.
 */
export function explicacaoDeVoltarAoOriginal(chave: ChaveDeSecao): string {
  return `O texto original desta seção volta ao site agora, sem ver antes como fica: ${ondeAparece(chave)}. O que está publicado sai do ar. Para confirmar, clique outra vez em “Confirmar e voltar ao original”.`;
}

/** A aba de como vai ficar mostra so o rascunho desta secao (o resto como esta no site). */
export function enderecoDaPrevia(chave: ChaveDeSecao): string {
  return `/publicar/previa?secao=${encodeURIComponent(chave)}`;
}

/**
 * Canal entre a aba de como vai ficar e o painel: publicar por la avisa o
 * editor aberto, que senao seguiria achando que nada foi ao ar.
 */
export const CANAL_DA_PAGINA_INICIAL = "podoposture-inicio";

/** Frase de falha ao salvar, com o que acontece com o texto e o proximo passo. */
export function mensagemDeFalha(status: number, erroDoServidor: unknown): string {
  const doServidor = typeof erroDoServidor === "string" && erroDoServidor ? erroDoServidor : null;
  const guardado = "Suas alterações continuam guardadas neste navegador.";
  if (status === 0) {
    return `Sem conexão com o servidor. ${guardado} Tente de novo quando a internet voltar.`;
  }
  if (status === 503) {
    return `${doServidor ?? "O banco de dados não está configurado neste servidor."} ${guardado} Avise quem cuida do site.`;
  }
  if (status === 400 || status === 413) return doServidor ?? "Confira os campos destacados.";
  if (status === 404) return `${doServidor ?? "Essa seção não existe."} Recarregue a página e tente de novo.`;
  return doServidor ?? `Não foi possível salvar agora. ${guardado} Tente de novo em instantes.`;
}

/* ------------------------------------------------------ copia no navegador */

/**
 * A copia do que ela esta editando, no `localStorage`: a sessao pode vencer no
 * meio, a aba pode fechar, e a promessa do painel e que nada escrito se perde.
 * Uma chave por secao, para duas secoes abertas em dias diferentes nao se
 * sobrescreverem.
 */
const PREFIXO_DA_COPIA = "podoposture_inicio:";

/** No `sessionStorage`: morre com a aba, entao nunca reabre uma secao dias depois. */
const CHAVE_DE_REABRIR = "podoposture_inicio_reabrir";

/**
 * `base` e o que o servidor tinha quando a copia nasceu. Com ela, recuperar
 * leva so os campos que ela mexeu: sem ela, a copia guardava o formulario
 * inteiro e, reaberta depois de uma publicacao em outro aparelho, devolvia
 * tambem os campos que ela nem tocou — o e-mail antigo voltava ao site.
 */
export type CopiaLocal = { dados: DadosEmEdicao; base?: DadosEmEdicao; guardadaEm: string };

export function armazemDoNavegador(): Armazem | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Navegador com armazenamento bloqueado lanca ja no acesso a propriedade.
    return null;
  }
}

export function lerCopiaLocal(armazem: Armazem | null, chave: ChaveDeSecao): CopiaLocal | null {
  try {
    const bruto = armazem?.getItem(PREFIXO_DA_COPIA + chave);
    if (!bruto) return null;
    const lido: unknown = JSON.parse(bruto);
    if (!ehObjeto(lido) || !ehObjeto(lido.dados)) return null;
    return {
      dados: lido.dados,
      ...(ehObjeto(lido.base) ? { base: lido.base } : {}),
      guardadaEm: typeof lido.guardadaEm === "string" ? lido.guardadaEm : "",
    };
  } catch {
    // copia ilegivel nao pode impedir de abrir a secao
    return null;
  }
}

export function guardarCopiaLocal(
  armazem: Armazem | null,
  chave: ChaveDeSecao,
  dados: DadosEmEdicao,
  agora = new Date(),
  base?: DadosEmEdicao,
): void {
  try {
    const copia: CopiaLocal = { dados, ...(base ? { base } : {}), guardadaEm: agora.toISOString() };
    armazem?.setItem(PREFIXO_DA_COPIA + chave, JSON.stringify(copia));
  } catch {
    // sem espaco no navegador: o texto segue na tela, so nao ha copia
  }
}

export function apagarCopiaLocal(armazem: Armazem | null, chave: ChaveDeSecao): void {
  try {
    armazem?.removeItem(PREFIXO_DA_COPIA + chave);
  } catch {
    /* nada a fazer */
  }
}

/**
 * A copia recuperada por cima do que veio do servidor, campo de topo a campo
 * de topo. Chave que nao existe mais no descritor (copia de uma versao antiga
 * do painel) fica de fora, para nao ir parar no corpo enviado.
 *
 * Com `referencia` (o que o servidor tinha quando ela comecou a editar), so
 * entram os campos que ela mudou em relacao a ela; o resto fica com o valor de
 * agora do servidor. E a mesma juncao que o editor usa quando outra janela
 * publicou no meio: o que ela alterou vai por cima da versao nova, e o que ela
 * nao tocou segue a versao nova. Sem `referencia` (copia antiga), vai tudo.
 */
export function aplicarCopia(
  chave: ChaveDeSecao,
  servidor: DadosEmEdicao,
  copia: DadosEmEdicao,
  referencia?: DadosEmEdicao,
): DadosEmEdicao {
  const saida: DadosEmEdicao = { ...servidor };
  for (const nome of Object.keys(camposDaSecao(chave))) {
    if (!(nome in copia)) continue;
    if (referencia && JSON.stringify(copia[nome]) === JSON.stringify(referencia[nome])) continue;
    saida[nome] = copia[nome];
  }
  return saida;
}

export function deixarSecaoParaReabrir(armazem: Armazem | null, chave: ChaveDeSecao): void {
  try {
    armazem?.setItem(CHAVE_DE_REABRIR, chave);
  } catch {
    // sem o recado ela volta para a lista; a copia local continua la
  }
}

/** Le e apaga. */
export function tomarSecaoParaReabrir(armazem: Armazem | null): ChaveDeSecao | null {
  try {
    const valor = armazem?.getItem(CHAVE_DE_REABRIR) ?? null;
    armazem?.removeItem(CHAVE_DE_REABRIR);
    return valor && ehChaveDeSecao(valor) ? valor : null;
  } catch {
    return null;
  }
}

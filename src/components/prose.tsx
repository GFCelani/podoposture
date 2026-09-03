import type { Bloco } from "@/lib/pages";

/**
 * Tipografia do conteudo migrado.
 *
 * Duas entradas, um mesmo visual: `BlocosDeConteudo` recebe a lista de blocos
 * das paginas internas, e `HtmlDoPost` recebe o HTML ja sanitizado dos posts.
 * As duas saem com a mesma medida de linha e a mesma escala, para o site nao
 * parecer costurado de dois lugares diferentes — que e exatamente o que ele e.
 */

const CLASSE_PROSA = [
  "prosa",
  "mx-auto max-w-[68ch]",
  "text-[1.0625rem] leading-[1.75] text-ink",
].join(" ");

/**
 * Renderiza os blocos extraidos do site antigo.
 *
 * O <h1> vem do cabecalho da pagina (PageShell), entao o primeiro heading do
 * corpo e descartado quando repete o titulo: dois <h1> na mesma pagina quebram
 * a hierarquia para leitor de tela e para o Google. Os demais headings sao
 * rebaixados um nivel, ja que o <h1> agora esta acima deles.
 */
export function BlocosDeConteudo({
  blocos,
  tituloDaPagina,
}: {
  blocos: Bloco[];
  tituloDaPagina: string;
}) {
  const normalizado = tituloDaPagina.trim().toLowerCase();
  const itens: React.ReactNode[] = [];
  let listaAberta: string[] = [];
  let chaveDaLista = 0;

  const fecharLista = () => {
    if (listaAberta.length === 0) return;
    itens.push(
      <ul key={`lista-${chaveDaLista++}`} className="ml-5 list-disc space-y-3">
        {listaAberta.map((texto, i) => (
          <li key={i}>{texto}</li>
        ))}
      </ul>,
    );
    listaAberta = [];
  };

  blocos.forEach((bloco, i) => {
    if (bloco.tag === "li") {
      listaAberta.push(bloco.texto);
      return;
    }
    fecharLista();

    // o titulo ja aparece como <h1> no cabecalho; nao repetir aqui
    if (bloco.tag === "h1" || bloco.texto.trim().toLowerCase() === normalizado) {
      return;
    }

    if (bloco.tag === "blockquote") {
      itens.push(
        <blockquote
          key={i}
          className="border-l-2 border-accent pl-6 font-display text-[1.125rem] italic text-muted"
        >
          {bloco.texto}
        </blockquote>,
      );
      return;
    }

    if (bloco.tag === "p") {
      itens.push(<p key={i}>{bloco.texto}</p>);
      return;
    }

    // h2..h6 do conteudo original, rebaixados um nivel e limitados a h6
    const nivel = Math.min(Number(bloco.tag.slice(1)) + 1, 6);
    const Tag = `h${nivel}` as "h2" | "h3" | "h4" | "h5" | "h6";
    const escala =
      nivel <= 2
        ? "text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.2]"
        : nivel === 3
          ? "text-[1.375rem] leading-[1.3]"
          : "text-[1.125rem] leading-[1.4]";

    itens.push(
      <Tag
        key={i}
        className={`mt-14 font-display font-semibold tracking-[-0.015em] text-balance text-ink-strong first:mt-0 ${escala}`}
      >
        {bloco.texto}
      </Tag>,
    );
  });

  fecharLista();

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-28">
      <div className={CLASSE_PROSA}>{itens}</div>
    </div>
  );
}

/**
 * Renderiza o corpo de um post.
 *
 * O HTML vem de scripts/extrair_blog.py, que converte o documento Draft.js do
 * GoDaddy. Nao e filtragem, e geracao: o extrator so consegue emitir as tags
 * que ele mesmo escreve — p, h2-h4, ul/ol/li, strong, em, u, mark, a, figure,
 * img, figcaption, blockquote — e todo texto e atributo passa por escape. Roda
 * em build-time, sobre conteudo da propria clinica.
 */
export function HtmlDoPost({ html }: { html: string }) {
  return (
    <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
      <div
        className={CLASSE_PROSA}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

import Link from "next/link";

type Variant = "primary" | "secondary" | "secondary-deep" | "tertiary";
type Icone = "seta" | "balao" | "pergunta";

/**
 * Tres niveis, e so o primario usa o verde de acao, nos dois CTAs de WhatsApp.
 * Nenhum outro ponto do site preenche ou escreve em verde.
 *
 * Affordance: os dois niveis de caixa tem peso (borda de 1.5), profundidade
 * (sombra em repouso), reacao (sobe 1px e ganha sombra no hover) e retorno de
 * clique (afunda no active). O terciario nao desenha caixa: e' link, e leva
 * sublinhado permanente para nao depender do hover para se anunciar.
 *
 * Contraste medido sobre --paper #FCFDFE (paleta viva, 2026-09-05):
 *   primario   ink-strong #0E2E42 sobre acao #96BF0D ... 6.56
 *   primario   hover papel sobre acao-deep #4B6007 ..... 6.93
 *   secundario accent #0E7BB4 sobre papel .............. 4.57
 *   secundario hover papel sobre o acento preenchido ... 4.57
 *   terciario  accent sobre papel ...................... 4.57
 *
 * Os 4.57 sao o piso da paleta inteira: #0E7BB4 e' claro, e como texto ele so
 * passa AA contra fundo quase branco. Dentro da banda de superficie o token do
 * acento desce um degrau sozinho (regra .bg-surface em globals.css), e la o
 * mesmo botao mede 5.28. Se o papel escurecer um passo, estes tres pares caem
 * abaixo de 4.5 juntos.
 */
const BASE =
  "group/btn inline-flex items-center gap-3 text-[0.9375rem] transition-[transform,box-shadow,background-color,color,border-color] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)]";

/* O hover nao troca o fundo: um circulo cresce do canto inferior esquerdo
   (.btn-fill em globals). --fill define a cor do preenchimento por nivel. */
const VARIANTS: Record<Variant, string> = {
  primary: `${BASE} btn-fill [--fill:var(--color-action-deep)] rounded-md border-[1.5px] border-action-deep/25 bg-action px-7 py-3.5 font-medium text-ink-strong shadow-tag hover:-translate-y-0.5 hover:text-paper hover:shadow-lift active:translate-y-0 active:shadow-tag`,
  secondary: `${BASE} btn-fill [--fill:var(--color-accent)] rounded-md border-[1.5px] border-accent/45 bg-paper px-7 py-3.5 text-accent shadow-tag hover:-translate-y-0.5 hover:border-accent hover:text-paper hover:shadow-lift active:translate-y-0 active:shadow-tag`,
  /* Sobre o petroleo: contorno claro, preenchimento que cresce em papel e
     texto que inverte para o fundo. Papel sobre o hero da 12.8 de contraste. */
  "secondary-deep": `${BASE} btn-fill [--fill:var(--color-paper)] rounded-md border-[1.5px] border-paper/45 px-7 py-3.5 text-paper hover:-translate-y-0.5 hover:border-paper hover:text-hero hover:shadow-lift active:translate-y-0`,
  /* py-2 -my-2 amplia a area de toque sem mover nada: o rotulo continua na
     mesma linha de base, mas o alvo sai de ~21px de altura para ~37. Sao 12
     "Saiba Mais" na grade de servicos que reprovavam no minimo de 24x24 do
     WCAG 2.2 (SC 2.5.8) — e que o Lighthouse nao audita. */
  tertiary: `${BASE} sublinha items-baseline gap-2.5 py-2 -my-2 text-accent hover:text-accent-deep`,
};

/**
 * O simbolo a direita do rotulo. Sempre medido em em, nunca em px: qualquer
 * degrau que reduza o corpo do botao reduz o simbolo junto, e nenhum deles
 * precisa de degrau proprio. O traco de 1.2 no viewBox de 14 da o mesmo peso
 * visual do traco de 1.2 no viewBox de 13x9 da seta, entao os tres pesam
 * igual ao lado do texto.
 *
 * seta      o padrao. E' a unica que se move no hover, e por um motivo:
 *           seta significa direcao, entao deslizar para a direita diz para
 *           onde o clique leva. Os outros dois nomeiam a acao, nao um
 *           destino, e ficam parados; o retorno deles e' o do proprio botao,
 *           que sobe e se preenche.
 * balao     conversa. E' o mesmo sinal que o disco flutuante ja usa para o
 *           WhatsApp, aqui em traco fino: dois lugares, um vocabulario so.
 * pergunta  quem ainda tem duvida. Fecha o rotulo como a propria frase pede.
 */
const ICONES: Record<Icone, React.ReactNode> = {
  /* A seta e' medida em em, nao em px: acompanha o corpo do rotulo. Sem
     isto, qualquer degrau que reduza o texto do botao deixa a seta grande
     em proporcao. 0.867 x 0.6em e' a mesma razao 13:9 do viewBox, e da os
     13x9px originais no corpo de base. */
  seta: (
    <svg
      width="13"
      height="9"
      viewBox="0 0 13 9"
      aria-hidden="true"
      className="h-[0.6em] w-[0.867em] shrink-0 transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/btn:translate-x-1"
    >
      <path
        d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  ),
  balao: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="h-[0.95em] w-[0.95em] shrink-0"
    >
      <path
        d="M3.9 2.6H10.1C11.4 2.6 12.4 3.6 12.4 4.9V7.9C12.4 9.2 11.4 10.2 10.1 10.2H5.8L3.9 12.1V10.2C2.6 10.2 1.6 9.2 1.6 7.9V4.9C1.6 3.6 2.6 2.6 3.9 2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  /* viewBox recortado na largura da tinta (x de 3.6 a 10.6), e nao no
     quadrado de 14: a interrogacao e' estreita, e num quadrado sobrava meia
     caixa vazia de cada lado. O vao entre rotulo e simbolo vem do gap do
     botao, e com a caixa folgada ele parecia o dobro do vao do balao. */
  pergunta: (
    <svg
      width="7"
      height="14"
      viewBox="3.6 0 7 14"
      aria-hidden="true"
      className="h-[0.95em] w-[0.475em] shrink-0"
    >
      <path
        d="M4.5 4.8C4.5 3.4 5.6 2.4 7.1 2.4C8.6 2.4 9.7 3.3 9.7 4.6C9.7 5.8 9 6.4 8.1 7C7.4 7.5 7.1 8 7.1 8.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="7.1" cy="11.3" r="0.95" fill="currentColor" />
    </svg>
  ),
};

export function ButtonLink({
  href,
  children,
  variant = "secondary",
  icone = "seta",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  /** O simbolo a direita do rotulo. Ver ICONES. */
  icone?: Icone;
  className?: string;
}) {
  const external = href.startsWith("http") || href.startsWith("tel:");

  const content = (
    <>
      {children}
      {ICONES[icone]}
    </>
  );

  const cls = `${VARIANTS[variant]}${className ? ` ${className}` : ""}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

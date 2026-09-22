import type { ConteudoContatoSecao } from "@/lib/conteudo-tipos";
import type { ContatoDoSite } from "@/lib/site";

import { ButtonLink } from "./button-link";
import { MapaSobDemanda } from "./mapa-sob-demanda";
import { PageGrid, SectionMark } from "./layers";
import { Reveal } from "./reveal";

/**
 * Na rota /contato a secao e' a primeira tela, e a entrada por scroll deixava
 * o paragrafo de abertura invisivel ate o JavaScript acordar: o Lighthouse
 * mediu 7,1 s de atraso de renderizacao no LCP do celular. Ali o conteudo
 * nasce visivel; na home, onde a secao chega por rolagem, a entrada continua.
 */
function SemEntrada({ children }: { children: React.ReactNode; delay?: number; variante?: string }) {
  return <div>{children}</div>;
}

/**
 * Na home e' a secao 09 de uma sequencia; na rota /contato e' a pagina inteira.
 * As duas props cobrem essa diferenca sem duplicar o componente: sem numero de
 * secao, sem corte diagonal (nao ha banda anterior para cortar) e sem repetir
 * no h2 o que o h1 do PageShell ja diz.
 *
 * `textos` sao os da secao; `contato` e' o cadastro do site inteiro. Os dois
 * chegam prontos de quem renderiza a pagina, que e' quem le o banco.
 */
export function Contact({
  contato,
  textos,
  numero = "09",
  comoSecao = true,
}: {
  contato: ContatoDoSite;
  textos: ConteudoContatoSecao;
  numero?: string | null;
  comoSecao?: boolean;
}) {
  const { endereco, telefones, email, horario, whatsapp, mapsEmbed, mapsDirecoes } = contato;
  const Entrada = comoSecao ? Reveal : SemEntrada;

  return (
    <section
      id="contato"
      className={`relative overflow-hidden border-b border-rule bg-surface ${
        comoSecao ? "corte-alto-esq" : ""
      }`}
    >
      <PageGrid />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 md:px-8 md:py-24 lg:px-10 lg:py-28">
        {comoSecao && (
          <Entrada variante="cortina">
            {numero && <SectionMark n={numero} />}
            <h2 className="mt-9 font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.14] font-semibold tracking-[-0.018em] text-balance text-ink-strong">
              {textos.titulo}
            </h2>
          </Entrada>
        )}

        <div
          className={`lg:grid lg:grid-cols-12 lg:gap-x-6 ${comoSecao ? "mt-14" : ""}`}
        >
          <div className="lg:col-span-6">
            {/* Na home vem depois do h2 da secao; na pagina /contato e' o
                primeiro titulo do corpo, e como h3 pulava um degrau do h1. */}
            <Entrada delay={110}>
              {comoSecao ? (
                <h3 className="font-display text-[1.375rem] leading-[1.3] font-medium text-ink-strong">
                  {textos.subtitulo}
                </h3>
              ) : (
                <h2 className="font-display text-[1.375rem] leading-[1.3] font-medium text-ink-strong">
                  {textos.subtitulo}
                </h2>
              )}
            </Entrada>

            <Entrada delay={180}>
              <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-[1.7] text-ink">
                {textos.paragrafo}
              </p>
            </Entrada>

            <Entrada delay={260}>
              <div className="mt-12">
                <ButtonLink href={whatsapp} variant="primary">
                  {textos.rotuloDoBotao}
                </ButtonLink>
              </div>
            </Entrada>

            {/* O outro jeito de conversar. Estava preso na ficha de endereco,
                que e' sobre onde a clinica fica, nao sobre falar com ela. */}
            <Entrada delay={340}>
              <div
                aria-hidden="true"
                className="mt-12 h-px w-full max-w-[26rem] bg-rule"
              />
              <ul className="mt-8 space-y-6">
                {/* Chave pela posicao: fixo e WhatsApp podem ser o mesmo numero. */}
                {telefones.map((phone, i) => (
                  <li key={i} className="flex items-baseline gap-4">
                    <span
                      aria-hidden="true"
                      className="h-px w-8 shrink-0 translate-y-[-0.35em] bg-accent/40"
                    />
                    <a
                      href={phone.href}
                      className="sublinha inline-flex min-h-[28px] items-center text-[1.0625rem] tracking-[0.02em] text-accent transition-colors duration-[160ms] hover:text-accent-deep"
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {phone.label}
                    </a>
                    {phone.nota && (
                      <span className="text-[0.8125rem] text-muted">
                        {phone.nota}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {/* E-mail e horario existiam so na pagina /contato do site antigo,
                  e sumiriam ao trocar aquele HTML por esta secao. Aqui eles
                  ficam no site inteiro — a home tambem nao os tinha. */}
              <dl className="mt-8 space-y-5">
                <div>
                  <dt className="flex items-center gap-4 text-[0.8125rem] text-muted">
                    <span
                      aria-hidden="true"
                      className="h-px w-8 shrink-0 bg-accent/40"
                    />
                    E-mail
                  </dt>
                  <dd className="mt-1 pl-12">
                    <a
                      href={`mailto:${email}`}
                      className="sublinha inline-flex min-h-[28px] items-center text-[1.0625rem] tracking-[0.02em] break-all text-accent transition-colors duration-[160ms] hover:text-accent-deep"
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {email}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-4 text-[0.8125rem] text-muted">
                    <span
                      aria-hidden="true"
                      className="h-px w-8 shrink-0 bg-accent/40"
                    />
                    Horário de atendimento
                  </dt>
                  <dd className="mt-1 pl-12 text-[1.0625rem] text-ink">
                    {horario}
                  </dd>
                </div>
              </dl>
            </Entrada>
          </div>

          {/* A pilha ocupa a largura inteira da coluna, entao o disco e' o maior que
              cabe nela. O -mt-48 sobe a pilha ate o topo do circulo ficar a dois
              quadrados da grade do limite da secao: o vao que existia acima do
              mapa some, e o mapa e' quem cresce para dentro dele. A subida nao
              esbarra no titulo, que vive na metade esquerda.
              Nenhuma das colunas estica para casar com a outra; a diferenca de
              altura sobra no fim. */}
          <div className="mt-14 lg:col-span-5 lg:col-start-8 lg:-mt-48">
            {/*
              Mapa na coluna, no lugar da foto do consultorio. O disco ocupa a
              largura inteira da coluna: o anel tracejado e' o limite externo,
              e o recorte do mapa fica para dentro dele, entao nada estoura.

              O embed ancora o cartao de endereco no canto superior esquerdo do
              iframe. Sangrando 180px para fora, o cartao sai do recorte e o
              ponto continua no centro. Isso tambem esconde o credito do Google
              que vem no rodape do iframe, entao ele e' reescrito logo abaixo,
              com o link de termos: obrigatorio, nao pode sumir com a mascara.

              Abaixo de 390 o disco ficaria com menos de 240px uteis. Nessa
              faixa vira retangulo 4:3, que entrega mais mapa no mesmo espaco.

              z=14 e' o enquadramento, nao o padrao do embed: em 16 so se via
              um punhado de quadras e a clinica ficava sem lugar no mapa. Em 14
              entra o arco inteiro de Copacabana com Ipanema, o Arpoador e a
              Lagoa, entao da para situar o endereco na Zona Sul sem o pino
              perder a leitura.

              O iframe so e' montado no clique (`mapa-sob-demanda.tsx`): ate
              la o disco mostra uma capa desenhada do mesmo recorte.

              O mapa vai com a cor propria do Google, nao dessaturado: ele e' a
              unica imagem de rua da pagina, e verde de parque com azul de mar
              e' o que faz a Zona Sul ser reconhecida de relance. A saturacao
              sobe um pouco acima do embed cru para o mapa nao apagar ao lado
              da banda de areia.
            */}
            <Entrada delay={240}>
              <MapaSobDemanda src={mapsEmbed} titulo={`Mapa: ${endereco.completo}`} />
            </Entrada>
            <Entrada delay={330}>
              <div className="mt-3 rounded-lg border border-rule bg-paper p-8 shadow-plate">
                {/* A ficha inteira e' o alvo do "como chegar": quem le um
                    endereco num site de clinica esta quase sempre indo para o
                    mapa, e obrigar a mirar no link de 11px do rodape do disco
                    era um alvo pequeno para o gesto mais comum da secao. */}
                <a
                  href={mapsDirecoes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/end block rounded-sm"
                >
                  <address
                    className="text-[0.9375rem] leading-[1.75] text-ink not-italic transition-colors duration-[160ms] group-hover/end:text-ink-strong"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {endereco.rua}
                    <br />
                    {endereco.sala}
                    <br />
                    {endereco.local}
                  </address>
                  <span className="mt-4 inline-flex items-center gap-2 text-[0.8125rem] tracking-[0.02em] text-accent transition-colors duration-[160ms] group-hover/end:text-accent-deep">
                    Como chegar
                    <svg
                      width="13"
                      height="9"
                      viewBox="0 0 13 9"
                      aria-hidden="true"
                      className="transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/end:translate-x-1"
                    >
                      <path
                        d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </span>
                </a>

                {/* A referencia e' opcional no painel: sem ela, sem paragrafo vazio. */}
                {endereco.referencia && (
                  <p className="mt-7 text-[0.9375rem] leading-[1.7] text-ink">
                    {endereco.referencia}
                  </p>
                )}
              </div>
            </Entrada>
          </div>
        </div>
      </div>

    </section>
  );
}

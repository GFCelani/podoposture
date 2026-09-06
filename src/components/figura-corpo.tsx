import {
  arredondar as n,
  type CamadaFigura,
  type NomeVista,
  VISTAS,
} from "./figura-corpo-geometria";

/**
 * A figura humana esquematica do projeto. UNICA: hero (frontal + perfil),
 * secao 04 da home e a lateral das paginas internas consomem este
 * componente. Nao existe outra silhueta no codigo, e nenhum path de corpo
 * fora de silhueta-corpo-path.ts / silhueta-perfil-path.ts.
 *
 * Foi criada em 2026-09-06 juntando figura-esquematica.tsx (frontal) e
 * figura-perfil.tsx (perfil), que eram copias do mesmo sistema. A figura
 * anterior da secao 04 (FigurePoints, em illustrations.tsx) foi descartada:
 * proporcoes erradas (sem pescoco, pernas curtas, bracos longos) e nunca
 * atualizada. Corrigir a silhueta agora vale em toda parte.
 *
 * Toda a geometria vive em figura-corpo-geometria.ts; aqui so ha desenho.
 *
 * ----------------------------------------------------------------------
 * API
 *
 *   vista       "frontal" (padrao) ou "perfil".
 *   camadas     quais desenhar, em qualquer ordem: "prumo", "silhueta",
 *               "coluna", "cadeia", "articulacoes". Padrao: todas. A ordem
 *               de pintura e' fixa (prumo atras, articulacoes na frente),
 *               nao a do array.
 *   animar      movimento continuo (respiracao, varredura da coluna,
 *               corrente da cadeia, sonar das articulacoes). Padrao true.
 *               Com false a figura fica parada e completa: os nos que so
 *               existem para animar nao sao renderizados.
 *   fase        deslocamento de todas as fases, em segundos. E' o que
 *               impede duas figuras na mesma tela de pulsarem em unissono.
 *   opacidade   opacidade do conjunto. Padrao 1.
 *   className   classes do <svg>.
 *
 * TAMANHO vem do CSS, nunca de prop: o svg declara width/height do viewBox
 * (proporcao conhecida antes do CSS, sem CLS) e quem usa da altura por
 * classe, com largura automatica. Duas figuras com a mesma altura CSS tem
 * exatamente a mesma altura de corpo, porque as duas vistas partilham o
 * intervalo 24,2..534,7 do viewBox de 560.
 *
 * MOVIMENTO REDUZIDO: o repouso de cada animacao vive no estilo base (ver
 * globals.css), e o que nao deve existir parado nasce em opacity 0. Com
 * prefers-reduced-motion a figura chega inteira e imovel, sem ramificar
 * nada aqui.
 * ----------------------------------------------------------------------
 */

const PAPEL = "var(--color-paper)";
const AZUL = "var(--color-accent-light)";
const VERDE = "var(--color-action)";

const TODAS: readonly CamadaFigura[] = [
  "prumo",
  "silhueta",
  "coluna",
  "cadeia",
  "articulacoes",
];

export function FiguraCorpo({
  vista = "frontal",
  camadas = TODAS,
  animar = true,
  fase = 0,
  opacidade,
  className = "",
}: {
  vista?: NomeVista;
  camadas?: readonly CamadaFigura[];
  animar?: boolean;
  fase?: number;
  opacidade?: number;
  className?: string;
}) {
  const v = VISTAS[vista];
  const tem = (c: CamadaFigura) => camadas.includes(c);
  /** Fase de cada animacao, ja deslocada. */
  const f = (base: number) => `${n(base + fase)}s`;

  return (
    <svg
      viewBox={`0 0 ${v.largura} 560`}
      width={v.largura}
      height={560}
      className={className}
      opacity={opacidade}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* A figura inteira respira; unico transform deste no'. */}
      <g
        className={animar ? "figura-respira" : undefined}
        style={
          animar
            ? {
                transformBox: "view-box",
                transformOrigin: `${v.largura / 2}px 300px`,
                animationDelay: `${n(1.2 + fase)}s`,
              }
            : undefined
        }
      >
        {/* Prumo: do alto ao chao, com marcas nas cinturas e a linha do solo.
            Na frontal e' o eixo do corpo; no perfil e' a linha de gravidade
            sagital, que passa pela orelha, o trocanter, a frente do joelho e
            a frente do maleolo. */}
        {tem("prumo") && (
          <g data-camada="prumo" stroke={PAPEL}>
            <line
              x1={v.prumo}
              y1={4}
              x2={v.prumo}
              y2={556}
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="3 6"
            />
            {v.niveis.map((y) => (
              <line
                key={y}
                x1={v.prumo - 16}
                y1={y}
                x2={v.prumo + 16}
                y2={y}
                strokeOpacity={0.45}
                strokeWidth={1}
              />
            ))}
            <line
              x1={v.chao[0]}
              y1={542}
              x2={v.chao[1]}
              y2={542}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
          </g>
        )}

        {/* Silhueta: contorno vetorizado, traco fino e preenchimento quase
            transparente, mais os tracos internos no mesmo peso. */}
        {tem("silhueta") && (
          <g data-camada="silhueta" stroke={PAPEL} strokeOpacity={0.85} strokeWidth={1.4}>
            <path d={v.silhueta} fill={PAPEL} fillOpacity={0.04} />
            {v.detalhe && <path d={v.detalhe} fill="none" />}
          </g>
        )}

        {/* Cadeia: liga as articulacoes entre si e a coluna */}
        {tem("cadeia") && (
          <>
            <g data-camada="cadeia" stroke={PAPEL} strokeOpacity={0.35} strokeWidth={0.9}>
              {v.cadeia.map((c, i) => (
                <line key={i} x1={n(c.a.x)} y1={n(c.a.y)} x2={n(c.b.x)} y2={n(c.b.y)} />
              ))}
            </g>

            {/* Corrente: um ponto por segmento nasce numa ponta e morre na
                outra. Base em opacity 0, entao com movimento reduzido nao
                existe. */}
            {animar && (
              <g data-camada="corrente" fill={PAPEL} stroke="none">
                {v.cadeia.map((c, i) => (
                  <circle
                    key={i}
                    className="corrente"
                    cx={n(c.a.x)}
                    cy={n(c.a.y)}
                    r={1.7}
                    style={{
                      ["--dx" as string]: `${n(c.b.x - c.a.x)}px`,
                      ["--dy" as string]: `${n(c.b.y - c.a.y)}px`,
                      ["--dur" as string]: `${c.dur}s`,
                      ["--fase" as string]: f(c.fase),
                    }}
                  />
                ))}
              </g>
            )}
          </>
        )}

        {/* Coluna: 24 vertebras, discos como tracos no vao, sacro na base.
            Na frontal tudo fica sobre o eixo, sem giro; no perfil cada peca
            e' girada pela tangente da curva sagital medida. */}
        {tem("coluna") && (
          <g data-camada="coluna">
            {v.vertebras.map((r, i) => {
              const giro = `rotate(${n(r.giro)} ${n(r.x)} ${n(r.y)})`;
              return (
                <g key={i}>
                  <rect
                    x={n(r.x - r.w / 2)}
                    y={n(r.y - r.h / 2)}
                    width={n(r.w)}
                    height={n(r.h)}
                    rx={r.rx}
                    fill={AZUL}
                    fillOpacity={0.85}
                    transform={giro}
                  />
                  {/* Varredura: uma sobreposicao em papel por vertebra, que
                      acende por um instante; a fase cresce de cima para
                      baixo, entao a onda desce. */}
                  {animar && (
                    <rect
                      className="vertebra-acende"
                      x={n(r.x - r.w / 2)}
                      y={n(r.y - r.h / 2)}
                      width={n(r.w)}
                      height={n(r.h)}
                      rx={r.rx}
                      fill={PAPEL}
                      transform={giro}
                      style={{ ["--fase" as string]: f(i * 0.16) }}
                    />
                  )}
                </g>
              );
            })}
            {v.discos.map((d, i) => (
              <line
                key={i}
                x1={n(d.x - d.meia)}
                y1={n(d.y)}
                x2={n(d.x + d.meia)}
                y2={n(d.y)}
                stroke={AZUL}
                strokeOpacity={0.55}
                strokeWidth={1}
                transform={`rotate(${n(d.giro)} ${n(d.x)} ${n(d.y)})`}
              />
            ))}
            <rect
              x={n(v.sacro.x - v.sacro.w / 2)}
              y={n(v.sacro.y - v.sacro.h / 2)}
              width={v.sacro.w}
              height={v.sacro.h}
              rx={3}
              fill={AZUL}
              fillOpacity={0.55}
              transform={`rotate(${n(v.sacro.giro)} ${n(v.sacro.x)} ${n(v.sacro.y)})`}
            />
          </g>
        )}

        {/* Articulacoes: anel com ponto e o sonar em verde */}
        {tem("articulacoes") && (
          <g data-camada="articulacoes">
            {v.juntas.map((j) => (
              <g key={j.chave} data-articulacao={j.chave}>
                {animar &&
                  [0, 1 / 2].map((t) => (
                    <circle
                      key={t}
                      className="sonar-onda"
                      cx={n(j.x)}
                      cy={n(j.y)}
                      r={j.r}
                      stroke={VERDE}
                      strokeOpacity={0.75}
                      strokeWidth={0.9}
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        ["--escala" as string]: 3.2,
                        ["--dur" as string]: `${j.dur}s`,
                        ["--fase" as string]: f(j.fase + t * j.dur),
                      }}
                    />
                  ))}
                <circle
                  cx={n(j.x)}
                  cy={n(j.y)}
                  r={j.r}
                  fill="var(--color-accent-deep)"
                  fillOpacity={0.7}
                  stroke={PAPEL}
                  strokeOpacity={0.95}
                  strokeWidth={1.3}
                />
                <circle
                  className={animar ? "sonar-ponto" : undefined}
                  cx={n(j.x)}
                  cy={n(j.y)}
                  r={j.r < 5 ? 1.7 : 2.2}
                  fill={VERDE}
                  style={
                    animar
                      ? { ["--dur" as string]: `${j.dur}s`, ["--fase" as string]: f(j.fase) }
                      : undefined
                  }
                />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

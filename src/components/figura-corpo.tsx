import {
  arredondar as n,
  type CamadaFigura,
  type NomeVista,
  VISTAS,
} from "./figura-corpo-geometria";
import { MAPA_DE_DOR_DESENHO } from "./mapa-de-dor-desenho";

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
 *   mapa        so o hero liga: a coluna refeita em contorno (curva lisa,
 *               niveis em rampa continua, processos, disco L5-S1, sacro de
 *               cinco segmentos), a cadeia em polilinhas continuas com cruz
 *               de articulacao, e SEM a camada de articulacoes, cujo anel
 *               competia com os pontos clicaveis. Geometria gerada em
 *               mapa-de-dor-desenho.ts. Padrao false: a lateral das paginas
 *               internas continua com a figura de sempre.
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
  mapa = false,
  className = "",
}: {
  vista?: NomeVista;
  camadas?: readonly CamadaFigura[];
  animar?: boolean;
  fase?: number;
  opacidade?: number;
  mapa?: boolean;
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
        {tem("cadeia") && mapa && <CadeiaDoMapa vista={vista} animar={animar} />}
        {tem("cadeia") && !mapa && (
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
        {tem("coluna") && mapa && <ColunaDoMapa vista={vista} animar={animar} />}
        {tem("coluna") && !mapa && (
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
        {tem("articulacoes") && !mapa && (
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

/* ======================================================================
   O MAPA DE DOR DO HERO (prop mapa)
   A geometria vem gerada (scripts/gerar-mapa-de-dor.py); aqui ficam o
   peso e a estrutura do movimento. As animacoes (faixa de luz, ponto que
   corre a cadeia) estao em globals.css, secao HERO - mapa de dor, com o
   repouso no estilo base: com movimento reduzido a faixa e o ponto nao
   existem e o resto fica inteiro e parado.
   ====================================================================== */

/** Opacidade com tres casas: arredondar/n levaria 0,022 a 0. */
const op = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Peso da coluna do mapa: CONTORNO, no tratamento da silhueta, e nao massa
 * cheia, que roubava o olho dos pontos verdes. [traco em unidades, opacidade
 * do traco, opacidade do preenchimento].
 * Medido no teste de apertar os olhos (desfoque de 5px sobre o par): com
 * estes valores os pontos se destacam da vizinhanca com deltaE2000 medio de
 * 19,7 e a coluna acrescenta 3,6 onde mora. O preenchimento residual e' o
 * que segura a forma na figura de 405px do telefone, onde o traco de 0,85u
 * sai com 0,6px.
 */
const PESO_DA_COLUNA: Record<"discos" | "processos" | "corpos" | "sacro", readonly [number, number, number]> = {
  discos: [0.6, 0.12, 0.02],
  processos: [0.85, 0.22, 0],
  corpos: [0.85, 0.34, 0.03],
  sacro: [0.85, 0.3, 0.02],
};

function PecasDaColuna({ vista, cor, forca }: { vista: NomeVista; cor: string; forca: number }) {
  const c = MAPA_DE_DOR_DESENHO[vista].coluna;
  const grupos: [readonly string[], readonly [number, number, number]][] = [
    [c.discos, PESO_DA_COLUNA.discos],
    [c.processos, PESO_DA_COLUNA.processos],
    [c.corpos, PESO_DA_COLUNA.corpos],
    [[...c.sacro, c.coccix], PESO_DA_COLUNA.sacro],
  ];
  return (
    <>
      {grupos.map(([caminhos, [traco, opTraco, opFill]], i) => (
        <g
          key={i}
          fill={cor}
          fillOpacity={op(opFill * forca)}
          stroke={cor}
          strokeOpacity={op(opTraco * forca)}
          strokeWidth={traco}
        >
          {caminhos.map((d, k) => (
            <path key={k} d={d} />
          ))}
        </g>
      ))}
    </>
  );
}

/**
 * A coluna do mapa, mais a faixa de luz: uma copia em papel revelada por
 * mascara. A mascara e' traco tracejado sobre a linha de centro da coluna
 * (pathLength=100, como o traco da marcha do hero), desfocado para a borda
 * nao cortar seco. Uma propriedade animada, continua, nenhum piscar. Os ids
 * levam a vista porque o hero desenha as duas figuras na mesma pagina.
 */
function ColunaDoMapa({ vista, animar }: { vista: NomeVista; animar: boolean }) {
  const { coluna } = MAPA_DE_DOR_DESENHO[vista];
  const s = vista === "frontal" ? "f" : "p";
  // a faixa da frontal nao desce em unissono com a de perfil, pela mesma
  // razao que as duas figuras ja nao respiram juntas
  const atraso = vista === "frontal" ? { animationDelay: "-4.6s" } : undefined;
  return (
    <g data-camada="coluna">
      {animar && (
        <defs>
          <filter id={`pd-borrao-${s}`} x="-40%" y="-12%" width="180%" height="124%">
            <feGaussianBlur stdDeviation={4.5} />
          </filter>
          <mask
            id={`pd-faixa-${s}`}
            maskUnits="userSpaceOnUse"
            x={0}
            y={56}
            width={VISTAS[vista].largura}
            height={256}
          >
            <g filter={`url(#pd-borrao-${s})`}>
              <path
                className="pd-faixa-traco"
                d={coluna.traco}
                pathLength={100}
                fill="none"
                stroke="#fff"
                strokeWidth={44}
                strokeLinecap="round"
                style={atraso}
              />
            </g>
          </mask>
        </defs>
      )}
      <PecasDaColuna vista={vista} cor={AZUL} forca={1} />
      {animar && (
        <g className="pd-faixa" mask={`url(#pd-faixa-${s})`} style={atraso}>
          <PecasDaColuna vista={vista} cor={PAPEL} forca={0.55} />
        </g>
      )}
    </g>
  );
}

/**
 * A cadeia do mapa: uma polilinha continua por membro, da coluna ate dentro
 * da mao ou do pe, com cruz de articulacao (marca de medida, nao botao) nos
 * vertices que nao disputam regiao com ponto clicavel. Um ponto corre cada
 * polilinha inteira por offset-path, como o ponto da curva de marcha.
 */
function CadeiaDoMapa({ vista, animar }: { vista: NomeVista; animar: boolean }) {
  const { polilinhas, cruzes } = MAPA_DE_DOR_DESENHO[vista].cadeia;
  return (
    <g data-camada="cadeia">
      <g stroke={PAPEL} strokeOpacity={0.34} strokeWidth={0.9} fill="none">
        {polilinhas.map((p, i) => (
          <path key={i} d={p.d} />
        ))}
      </g>
      <g stroke={PAPEL} strokeOpacity={0.45} strokeWidth={1} fill="none">
        {cruzes.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {animar && (
        <g fill={PAPEL} stroke="none">
          {polilinhas.map((p, i) => (
            <circle
              key={i}
              className="pd-corre"
              r={1.6}
              cx={0}
              cy={0}
              style={{
                offsetPath: `path("${p.d}")`,
                ["--dur" as string]: `${p.dur}s`,
                ["--fase" as string]: `${p.fase}s`,
              }}
            />
          ))}
        </g>
      )}
    </g>
  );
}

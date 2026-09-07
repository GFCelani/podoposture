/**
 * PLACA DE LEITURA — a figura da secao 06 (Metodo RegulaDOR).
 *
 * O que ela e': uma placa de instrumento, no registro de registrador
 * multicanal (o vocabulario de um exame que grava varias derivacoes ao mesmo
 * tempo). Le-se da esquerda para a direita, em tres campos:
 *
 *   ENTRADAS   seis canais empilhados, cada um com o seu proprio sinal
 *              correndo. Sao os seis fatores que o paragrafo da secao nomeia,
 *              nesta ordem: sinais dos tecidos, funcao musculoesqueletica,
 *              processamento do sistema nervoso, movimento, estado do
 *              organismo, contexto do paciente. Cada canal recebeu a forma de
 *              onda que corresponde ao que ele mede, e nenhum se parece com o
 *              vizinho: e' o "nao e uma estrutura so" desenhado.
 *   LEITURA    a coluna do meio. Os seis canais dobram para dentro dela,
 *              perdem a dispersao e chegam ao ponto de leitura. A luz que
 *              percorre os canais um a um, em ordem, e' o metodo: nao ha
 *              flash de tudo ao mesmo tempo, ha uma sequencia.
 *   CONDUTA    uma linha so sai da leitura e termina no alvo. Um pulso a
 *              percorre depois que os seis foram lidos.
 *
 * Nenhuma palavra e' inventada aqui. Os canais levam numeral 01 a 06, que e'
 * o vocabulario de item que o site ja usa; quem os nomeia e' o paragrafo ao
 * lado, na mesma ordem. Nao ha anatomia: a secao fala de metodo.
 *
 * MOVIMENTO. So transform e opacity, sem excecao. Os sinais correm por
 * translateX de exatamente um periodo da onda (por isso o laco e' invisivel);
 * a leitura caminha por opacity com fase por canal; o no' de cada canal cresce
 * por scale; os aneis do ponto giram por rotate; o pulso de saida anda por
 * translateX numa reta. O repouso de cada animacao vive no estilo BASE da
 * classe, nao no keyframe 100%: com movimento reduzido tudo para exatamente
 * onde deve ficar, inteiro e visivel.
 *
 * DUAS GEOMETRIAS, UM DESENHO. A placa e' larga por natureza (seis canais
 * longos + coluna + saida). Numa coluna de telefone, a mesma composicao
 * espremida viraria risco. Entao a geometria e' um objeto de medidas, e o
 * componente e' desenhado duas vezes: LARGA a partir de lg, ESTREITA abaixo
 * disso, com os canais mais curtos e sem a regua de topo. O que muda sao
 * numeros, nao o desenho.
 */

type Ponto = readonly [number, number];

/**
 * Um canal. `pts` sao pontos de um azulejo periodico, em coordenadas
 * normalizadas: x de 0 a 1 dentro do azulejo, y de -1 a 1 em amplitudes. O
 * ultimo ponto NAO fecha o azulejo; quem fecha e' a repeticao, e por isso a
 * emenda entre azulejos e' continua. `reto` troca as cubicas por segmentos,
 * para os sinais que sao de pico e de degrau, nao de curva.
 */
type Canal = {
  pts: Ponto[];
  reto?: boolean;
  /** segundos para o sinal andar um azulejo; cada canal corre no seu tempo */
  dur: number;
};

const CANAIS: Canal[] = [
  // 01 sinais dos tecidos — onda longa e regular
  { pts: [[0, 0], [0.25, -1], [0.5, 0], [0.75, 1]], dur: 17 },
  // 02 funcao musculoesqueletica — o duplo pico do passo, o mesmo
  //    vocabulario da curva de marcha do hero
  {
    pts: [[0, 0.62], [0.08, 0.62], [0.17, -0.86], [0.26, -0.3], [0.35, -1], [0.46, 0.62], [0.64, 0.62], [0.82, 0.62]],
    dur: 13,
  },
  // 03 processamento do sistema nervoso — espiculas, densas e irregulares
  {
    pts: [[0, 0], [0.05, 0], [0.08, -1], [0.11, 0.42], [0.14, 0], [0.28, 0], [0.32, -0.62], [0.35, 0.22], [0.38, 0], [0.54, 0], [0.58, -0.95], [0.61, 0.5], [0.64, 0], [0.84, 0]],
    reto: true,
    dur: 8.5,
  },
  // 04 movimento — ciclo curto e continuo
  {
    pts: [[0, 0], [0.125, -0.78], [0.25, 0], [0.375, 0.78], [0.5, 0], [0.625, -0.78], [0.75, 0], [0.875, 0.78]],
    dur: 10,
  },
  // 05 estado do organismo — deriva lenta, sem periodo evidente
  { pts: [[0, 0], [0.18, -0.5], [0.34, -0.16], [0.56, 0.72], [0.76, 0.26], [0.9, 0.08]], dur: 21 },
  // 06 contexto do paciente — degraus: estados que trocam, nao oscilam
  {
    pts: [[0, 0.5], [0.18, 0.5], [0.18, -0.4], [0.42, -0.4], [0.42, 0.9], [0.62, 0.9], [0.62, -0.85], [0.86, -0.85]],
    reto: true,
    dur: 15,
  },
];

type Geometria = {
  W: number;
  H: number;
  /** recuo da moldura */
  m: number;
  /** inicio e fim do sinal de cada canal */
  x0: number;
  x1: number;
  /** colunas que delimitam a leitura */
  gx0: number;
  gx1: number;
  /** centro do alvo da conduta */
  xAlvo: number;
  /** distancia entre canais e amplitude do sinal */
  passo: number;
  amp: number;
  /** largura de um azulejo de onda */
  azulejo: number;
  fonte: number;
  /** raios dos aneis do ponto de leitura e do alvo */
  rLeitura: number;
  rAlvo: number;
  /** passo da trama de pontos do fundo */
  trama: number;
  /** regua de topo e marcas de canto: mudas na placa estreita */
  detalhe: boolean;
  traco: number;
};

const LARGA: Geometria = {
  W: 1000, H: 380, m: 12,
  x0: 56, x1: 560,
  gx0: 640, gx1: 740,
  xAlvo: 920,
  passo: 52, amp: 16, azulejo: 126,
  fonte: 11, rLeitura: 46, rAlvo: 38, trama: 20,
  detalhe: true, traco: 1.4,
};

const ESTREITA: Geometria = {
  W: 364, H: 288, m: 8,
  x0: 44, x1: 182,
  gx0: 210, gx1: 248,
  xAlvo: 314,
  passo: 37, amp: 10.5, azulejo: 46,
  fonte: 10, rLeitura: 18, rAlvo: 16, trama: 22,
  detalhe: true, traco: 1.2,
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Azulejo em cubicas, por Catmull-Rom com volta: o ponto anterior ao primeiro
 * e' o ultimo do azulejo anterior, entao a tangente da emenda e' a mesma dos
 * dois lados e a repeticao nao produz bico. Devolve so o fragmento RELATIVO,
 * que e' repetido tal e qual: e' o que mantem o caminho curto no HTML.
 */
function azulejoSuave(pts: Ponto[], w: number, a: number): string {
  const n = pts.length;
  const P = (i: number): Ponto => {
    const k = ((i % n) + n) % n;
    const volta = Math.floor(i / n);
    return [pts[k][0] * w + volta * w, pts[k][1] * a];
  };
  let d = "";
  for (let i = 0; i < n; i++) {
    const [ax, ay] = P(i - 1);
    const [bx, by] = P(i);
    const [cx, cy] = P(i + 1);
    const [dx, dy] = P(i + 2);
    const c1x = bx + (cx - ax) / 6;
    const c1y = by + (cy - ay) / 6;
    const c2x = cx - (dx - bx) / 6;
    const c2y = cy - (dy - by) / 6;
    d += `c${r2(c1x - bx)} ${r2(c1y - by)} ${r2(c2x - bx)} ${r2(c2y - by)} ${r2(cx - bx)} ${r2(cy - by)}`;
  }
  return d;
}

/** O mesmo, em segmentos: pico e degrau nao passam por curva. */
function azulejoReto(pts: Ponto[], w: number, a: number): string {
  let d = "";
  let bx = pts[0][0] * w;
  let by = pts[0][1] * a;
  for (let i = 1; i <= pts.length; i++) {
    const p: Ponto = i === pts.length ? [w, pts[0][1] * a] : [pts[i][0] * w, pts[i][1] * a];
    d += `l${r2(p[0] - bx)} ${r2(p[1] - by)}`;
    [bx, by] = p;
  }
  return d;
}

/** O sinal de um canal, cobrindo a faixa mais um azulejo de folga. */
function sinal(canal: Canal, g: Geometria, y: number): string {
  const azul = canal.reto
    ? azulejoReto(canal.pts, g.azulejo, g.amp)
    : azulejoSuave(canal.pts, g.azulejo, g.amp);
  const voltas = Math.ceil((g.x1 - g.x0) / g.azulejo) + 1;
  return `M${g.x0} ${r2(y + canal.pts[0][1] * g.amp)}${azul.repeat(voltas)}`;
}

const NUM = (i: number) => String(i + 1).padStart(2, "0");

/** Ciclo da leitura, e a fase de cada canal dentro dele. */
const CICLO = 8.4;
const FASE = 1.2;

function Placa({ g, id }: { g: Geometria; id: string }) {
  const cy = g.H / 2;
  const ex = (g.gx0 + g.gx1) / 2;
  /* Os canais chegam a coluna ainda separados (metade da dispersao que tinham
     nas faixas) e so colapsam no ponto DENTRO dela: e' a coluna que organiza,
     nao o caminho ate ela. Cada raio para no anel externo do ponto, para o
     ponto continuar limpo por dentro. */
  const canais = CANAIS.map((canal, i) => {
    const y = cy + (i - 2.5) * g.passo;
    const entrada = cy + (y - cy) * 0.5;
    const dx = ex - g.gx0;
    const dy = cy - entrada;
    const dist = Math.hypot(dx, dy) || 1;
    return {
      canal,
      i,
      y,
      entrada,
      fim: [r2(ex - (dx / dist) * g.rLeitura), r2(cy - (dy / dist) * g.rLeitura)] as const,
    };
  });
  const topo = cy - g.passo * 2.5 - g.amp - 12;
  const base = cy + g.passo * 2.5 + g.amp + 12;
  /* A saida vai da coluna ate a borda do alvo; o pulso e' um segmento curto
     que percorre esse vao. */
  const saida0 = g.gx1;
  const saida1 = g.xAlvo - g.rAlvo - 10;
  const pulso = g.rAlvo * 1.2;

  return (
    <svg
      viewBox={`0 0 ${g.W} ${g.H}`}
      aria-hidden="true"
      focusable="false"
      className="block h-auto w-full"
    >
      <defs>
        <pattern id={`${id}-trama`} width={g.trama} height={g.trama} patternUnits="userSpaceOnUse">
          <circle cx={g.trama / 2} cy={g.trama / 2} r={0.7} fill="var(--color-paper)" fillOpacity={0.18} />
        </pattern>
        <clipPath id={`${id}-faixas`}>
          <rect x={g.x0} y={topo} width={g.x1 - g.x0} height={base - topo} />
        </clipPath>
      </defs>

      {/* trama e moldura: a placa antes de qualquer sinal */}
      <rect x={g.m} y={g.m} width={g.W - g.m * 2} height={g.H - g.m * 2} fill={`url(#${id}-trama)`} />
      <rect
        x={g.m}
        y={g.m}
        width={g.W - g.m * 2}
        height={g.H - g.m * 2}
        fill="none"
        stroke="var(--color-on-deep-muted)"
        strokeOpacity={0.42}
        strokeWidth={1}
      />
      {g.detalhe &&
        ([
          [g.m, g.m, 1, 1],
          [g.W - g.m, g.m, -1, 1],
          [g.m, g.H - g.m, 1, -1],
          [g.W - g.m, g.H - g.m, -1, -1],
        ] as const).map(([x, y, sx, sy]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x + sx * 26} ${y}H${x}V${y + sy * 26}`}
            fill="none"
            stroke="var(--color-accent-light)"
            strokeOpacity={0.8}
            strokeWidth={1.5}
          />
        ))}

      {/* As duas reguas, no topo e na base: sao elas que fecham a placa como
          instrumento e que dao densidade aos dois campos mais vazios, a faixa
          de cima e a de baixo. Passo unico em toda a largura. */}
      {g.detalhe &&
        ([g.m, g.H - g.m] as const).map((borda, b) =>
          Array.from({ length: Math.floor((g.xAlvo - g.x0) / g.trama) + 1 }, (_, i) => {
            const x = r2(g.x0 + i * g.trama);
            const alto = i % 5 === 0;
            const sentido = b === 0 ? 1 : -1;
            return (
              <line
                key={`regua-${b}-${x}`}
                x1={x}
                y1={borda + sentido}
                x2={x}
                y2={borda + sentido * (alto ? 15 : 8)}
                stroke={alto ? "var(--color-accent-light)" : "var(--color-on-deep-muted)"}
                strokeOpacity={alto ? 0.75 : 0.5}
                strokeWidth={1}
              />
            );
          }),
        )}

      {/* ENTRADAS — linha de base, marca de inicio e numeral de cada canal */}
      {canais.map(({ i, y }) => (
        <g key={`base-${i}`}>
          <line
            x1={g.x0}
            y1={y}
            x2={g.x1}
            y2={y}
            stroke="var(--color-paper)"
            strokeOpacity={0.18}
            strokeWidth={1}
            strokeDasharray="2 5"
          />
          <line
            x1={g.x0 - 7}
            y1={y - 6}
            x2={g.x0 - 7}
            y2={y + 6}
            stroke="var(--color-accent-light)"
            strokeOpacity={0.7}
            strokeWidth={1.5}
          />
          <text
            x={g.x0 - 15}
            y={y + g.fonte * 0.36}
            textAnchor="end"
            fill="var(--color-on-deep-muted)"
            fillOpacity={0.85}
            fontSize={g.fonte}
            letterSpacing={g.fonte * 0.12}
            style={{ fontFamily: "var(--mono)" }}
          >
            {NUM(i)}
          </text>
        </g>
      ))}

      {/* os seis sinais, cada um correndo no seu tempo */}
      <g clipPath={`url(#${id}-faixas)`}>
        {canais.map(({ canal, i, y }) => (
          <g
            key={`sinal-${i}`}
            className="placa-corre"
            style={{
              ["--passo" as string]: `${-g.azulejo}px`,
              ["--dur" as string]: `${canal.dur}s`,
            }}
          >
            <path
              d={sinal(canal, g, y)}
              fill="none"
              stroke="var(--color-accent-light)"
              strokeOpacity={0.7}
              strokeWidth={g.traco}
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>

      {/* LEITURA — a coluna: dois prumos, a escala do prumo de entrada e a
          cota lateral. A coluna atravessa a placa inteira de proposito: e'
          o unico elemento vertical do desenho. */}
      {[g.gx0, g.gx1].map((x) => (
        <line
          key={x}
          x1={x}
          y1={g.m + 20}
          x2={x}
          y2={g.H - g.m - 20}
          stroke="var(--color-paper)"
          strokeOpacity={0.34}
          strokeWidth={1}
        />
      ))}
      {/* a escala corre nos DOIS prumos, virada para fora: e' o que faz o par
          de linhas ler como uma coluna, e nao como duas linhas soltas */}
      {([[g.gx0, -1], [g.gx1, 1]] as const).map(([x, sentido]) =>
        Array.from({ length: Math.floor((base - topo) / (g.passo * 0.28)) + 1 }, (_, i) => {
          const y = r2(topo + i * g.passo * 0.28);
          const alto = i % 4 === 0;
          return (
            <line
              key={`escala-${x}-${i}`}
              x1={x}
              y1={y}
              x2={r2(x + sentido * (alto ? 9 : 5))}
              y2={y}
              stroke="var(--color-paper)"
              strokeOpacity={alto ? 0.4 : 0.22}
              strokeWidth={1}
            />
          );
        }),
      )}
      <path
        d={`M${g.m + 8} ${g.m + 20}h7m-3.5 0v${g.H - g.m * 2 - 40}m-3.5 0h7`}
        fill="none"
        stroke="var(--color-on-deep-muted)"
        strokeOpacity={0.45}
        strokeWidth={1}
      />

      {/* cada canal: o no' no fim do sinal, a curva ate a coluna, o raio ate o
          ponto e a marca de entrada no prumo. Os quatro acendem juntos, na vez
          do canal. */}
      {canais.map(({ i, y, entrada, fim }) => {
        const k = (g.gx0 - g.x1) * 0.55;
        return (
          <g
            key={`leitura-${i}`}
            className="placa-passo"
            style={{ ["--ciclo" as string]: `${CICLO}s`, ["--fase" as string]: `${i * FASE}s` }}
          >
            <path
              d={`M${g.x1} ${y}C${g.x1 + k} ${y} ${g.gx0 - k} ${entrada} ${g.gx0} ${entrada}L${fim[0]} ${fim[1]}`}
              fill="none"
              stroke="var(--color-paper)"
              strokeOpacity={0.72}
              strokeWidth={1.2}
            />
            <circle cx={g.gx0} cy={entrada} r={g.traco * 1.3} fill="var(--color-paper)" />
            <circle
              cx={g.x1}
              cy={y}
              r={g.traco * 2}
              fill="var(--color-accent-light)"
              className="placa-no"
              style={{ ["--ciclo" as string]: `${CICLO}s`, ["--fase" as string]: `${i * FASE}s` }}
            />
          </g>
        );
      })}

      {/* o ponto de leitura: aneis parados, dois que giram, um que emana */}
      <circle cx={ex} cy={cy} r={g.rLeitura} fill="none" stroke="var(--color-accent-light)" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="3 5" />
      <circle cx={ex} cy={cy} r={g.rLeitura * 0.56} fill="none" stroke="var(--color-accent-light)" strokeOpacity={0.5} strokeWidth={1} />
      <circle
        cx={ex}
        cy={cy}
        r={g.rLeitura * 0.8}
        fill="none"
        stroke="var(--color-accent-light)"
        strokeOpacity={0.85}
        strokeWidth={1.5}
        strokeDasharray={`${r2(g.rLeitura * 0.85)} ${r2(g.rLeitura * 2.4)}`}
        className="placa-giro"
        style={{ ["--dur" as string]: "22s" }}
      />
      <circle
        cx={ex}
        cy={cy}
        r={g.rLeitura * 0.38}
        fill="none"
        stroke="var(--color-accent-light)"
        strokeOpacity={0.5}
        strokeWidth={1}
        strokeDasharray={`${r2(g.rLeitura * 0.45)} ${r2(g.rLeitura * 1.3)}`}
        className="placa-giro"
        style={{ ["--dur" as string]: "14s", animationDirection: "reverse" }}
      />
      <circle
        cx={ex}
        cy={cy}
        r={g.rLeitura * 0.56}
        fill="none"
        stroke="var(--color-accent-light)"
        strokeWidth={1.2}
        className="placa-emana"
        style={{ ["--dur" as string]: "5.6s" }}
      />
      <path
        d={`M${r2(ex - g.rLeitura * 1.3)} ${cy}h${r2(g.rLeitura * 0.24)}M${r2(ex + g.rLeitura * 1.06)} ${cy}h${r2(g.rLeitura * 0.24)}M${ex} ${r2(cy - g.rLeitura * 1.3)}v${r2(g.rLeitura * 0.24)}M${ex} ${r2(cy + g.rLeitura * 1.06)}v${r2(g.rLeitura * 0.24)}`}
        stroke="var(--color-accent-light)"
        strokeOpacity={0.6}
        strokeWidth={1}
      />
      <circle cx={ex} cy={cy} r={r2(g.traco * 2.6)} fill="var(--color-paper)" />

      {/* CONDUTA — uma linha so, com escala por baixo para o pulso ter contra
          o que se medir, e o alvo no fim */}
      <line
        x1={saida0}
        y1={cy}
        x2={saida1}
        y2={cy}
        stroke="var(--color-accent-light)"
        strokeOpacity={0.6}
        strokeWidth={1.6}
      />
      {Array.from({ length: Math.floor((saida1 - saida0 - 12) / (g.passo * 0.32)) + 1 }, (_, i) => {
        const x = r2(saida0 + 10 + i * g.passo * 0.32);
        const alto = i % 4 === 0;
        return (
          <line
            key={`cota-${i}`}
            x1={x}
            y1={cy + 6}
            x2={x}
            y2={cy + 6 + (alto ? 12 : 6)}
            stroke="var(--color-on-deep-muted)"
            strokeOpacity={alto ? 0.7 : 0.45}
            strokeWidth={1}
          />
        );
      })}
      <line
        x1={saida0}
        y1={cy}
        x2={saida0 + pulso}
        y2={cy}
        stroke="var(--color-paper)"
        strokeWidth={2.4}
        strokeLinecap="round"
        className="placa-saida"
        style={{
          ["--ciclo" as string]: `${CICLO}s`,
          ["--fase" as string]: `${5.4 * FASE}s`,
          ["--curso" as string]: `${r2(saida1 - saida0 - pulso)}px`,
        }}
      />
      <circle cx={g.xAlvo} cy={cy} r={g.rAlvo} fill="none" stroke="var(--color-accent-light)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 5" />
      <circle cx={g.xAlvo} cy={cy} r={r2(g.rAlvo * 0.68)} fill="none" stroke="var(--color-accent-light)" strokeOpacity={0.5} strokeWidth={1} />
      <circle cx={g.xAlvo} cy={cy} r={r2(g.rAlvo * 0.36)} fill="none" stroke="var(--color-accent-light)" strokeOpacity={0.75} strokeWidth={1.4} />
      <path
        d={`M${r2(g.xAlvo - g.rAlvo * 1.45)} ${cy}h${r2(g.rAlvo * 0.42)}M${r2(g.xAlvo + g.rAlvo)} ${cy}h${r2(g.rAlvo * 0.45)}M${g.xAlvo} ${r2(cy - g.rAlvo * 1.45)}v${r2(g.rAlvo * 0.42)}M${g.xAlvo} ${r2(cy + g.rAlvo)}v${r2(g.rAlvo * 0.45)}`}
        stroke="var(--color-on-deep-muted)"
        strokeOpacity={0.55}
        strokeWidth={1}
      />
      {/* o unico ponto de cor de acao da secao, e o menor elemento da placa:
          a conduta e' o que sai da leitura. Mesma licenca dos discos do hero. */}
      <circle cx={g.xAlvo} cy={cy} r={r2(g.traco * 2.6)} fill="var(--color-action)" />
    </svg>
  );
}

/**
 * A placa nas duas geometrias. So uma esta no fluxo em cada largura; a outra
 * sai por display:none, entao nao anima e nao custa quadro.
 */
export function PlacaDeLeitura() {
  return (
    <>
      <div className="mx-auto w-full max-w-[460px] lg:hidden">
        <Placa g={ESTREITA} id="placa-e" />
      </div>
      <div className="hidden lg:block">
        <Placa g={LARGA} id="placa-l" />
      </div>
    </>
  );
}

/**
 * A figura da secao 06 (Metodo RegulaDOR).
 *
 * Seis entradas, um ponto de leitura, uma saida. Nada alem disso: sem
 * moldura, sem grade, sem regua, sem rotulo. O que faz a figura nao ler como
 * rascunho nao e' quantidade de elemento, e' o desenho dos que existem:
 *
 *   - o leque e' regular. As seis entradas saem igualmente espacadas, todas
 *     com a MESMA formula de curva, e todas chegam ao ponto pela horizontal.
 *     Leque irregular e' o que faz um diagrama parecer feito a mao.
 *   - o peso separa quem entra de quem sai. As seis entradas sao fio de 1;
 *     a saida e' 1.8 e mais clara. Le-se "muitos finos entram, um firme sai"
 *     antes de qualquer leitura consciente.
 *   - o ponto tem tamanho de ponto focal, nao de pixel: anel, centro cheio e
 *     um anel externo tracejado atras.
 *
 * O movimento e' um so, e e' o metodo: a luz percorre as seis entradas uma a
 * uma, em ordem, e depois da sexta o pulso sai pela linha de saida. So
 * transform e opacity. O repouso de cada animacao vive no estilo base, entao
 * com movimento reduzido a figura fica parada, com as seis entradas acesas e
 * o pulso na saida do ponto.
 *
 * Uma geometria so, para qualquer largura: a figura e' pequena por natureza e
 * escala junto com a coluna.
 */

const W = 420;
const H = 190;
const CY = H / 2;
/** centro do ponto de leitura e raio do anel */
const NX = 258;
const NR = 15;
/** onde as entradas comecam e onde a saida termina */
const X0 = 4;
const X1 = 400;

const ENTRADAS = [0, 1, 2, 3, 4, 5].map((i) => CY + (i - 2.5) * 30);

/** Ciclo da leitura, e a fase de cada entrada dentro dele. */
const CICLO = 7.8;
const FASE = 1.1;

/** Segmento do pulso e o curso que ele percorre na saida. */
const PULSO = 34;
const CURSO = X1 - PULSO - (NX + NR);

export function FiguraLeitura({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      focusable="false"
      className={`block h-auto ${className}`}
    >
      {/* anel externo: a unica camada de profundidade da figura */}
      <circle
        cx={NX}
        cy={CY}
        r={NR + 11}
        fill="none"
        stroke="var(--color-accent-light)"
        strokeOpacity={0.22}
        strokeWidth={1}
        strokeDasharray="3 5"
      />

      {/* as seis entradas: marca de inicio e curva, acendendo uma a uma */}
      {ENTRADAS.map((y, i) => (
        <g
          key={y}
          className="leitura-passo"
          style={{ ["--ciclo" as string]: `${CICLO}s`, ["--fase" as string]: `${i * FASE}s` }}
        >
          <line
            x1={X0}
            y1={y - 5}
            x2={X0}
            y2={y + 5}
            stroke="var(--color-accent-light)"
            strokeOpacity={0.75}
            strokeWidth={1.5}
          />
          <path
            d={`M${X0} ${y}C130 ${y} 186 ${CY} ${NX - NR} ${CY}`}
            fill="none"
            stroke="var(--color-paper)"
            strokeOpacity={0.7}
            strokeWidth={1}
          />
        </g>
      ))}

      {/* o ponto de leitura */}
      <circle
        cx={NX}
        cy={CY}
        r={NR}
        fill="none"
        stroke="var(--color-accent-light)"
        strokeWidth={1.2}
        className="leitura-emana"
      />
      <circle
        cx={NX}
        cy={CY}
        r={NR}
        fill="none"
        stroke="var(--color-accent-light)"
        strokeOpacity={0.9}
        strokeWidth={1.4}
      />
      <circle cx={NX} cy={CY} r={3.4} fill="var(--color-paper)" />

      {/* a saida: uma linha so, mais pesada e mais clara que as entradas */}
      <line
        x1={NX + NR}
        y1={CY}
        x2={X1}
        y2={CY}
        stroke="var(--color-accent-light)"
        strokeOpacity={0.8}
        strokeWidth={1.8}
      />
      <line
        x1={NX + NR}
        y1={CY}
        x2={NX + NR + PULSO}
        y2={CY}
        stroke="var(--color-paper)"
        strokeWidth={2.4}
        strokeLinecap="round"
        className="leitura-saida"
        style={{
          ["--ciclo" as string]: `${CICLO}s`,
          ["--fase" as string]: `${5.3 * FASE}s`,
          ["--curso" as string]: `${CURSO}px`,
        }}
      />
      {/* o unico ponto de cor de acao da secao: a conduta e' o que sai da
          leitura. Mesma licenca dos discos do hero. */}
      <circle cx={X1} cy={CY} r={4.2} fill="var(--color-action)" />
    </svg>
  );
}

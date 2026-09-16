import { TRAMA_CURVAS, TRAMA_VIEWBOX } from "./trama-topografica-paths";

/**
 * Camada de fundo do hero: curvas de nivel, como as de um mapa topografico.
 *
 * Nao e' desenho a mao. As curvas sao isolinhas de um campo de distancia
 * (scripts/gerar-trama-topografica.py, que escreve o modulo de paths ao
 * lado): e' de la que vem o formato sempre arredondado, sem trecho reto nem
 * quina, e a densidade igual em toda a area, que era a exigencia do desenho.
 * Para mexer na trama, mexer no script e rodar de novo; o .ts e' gerado.
 *
 * Tres coisas aqui sao decisao de renderizacao, nao do desenho:
 *
 * - slice, e nao meet: o quadro de 1440x960 cobre a caixa inteira em
 *   qualquer razao, cortando o que sobra. Com meet a trama deformaria ou
 *   deixaria faixa vazia nas pontas. As curvas foram geradas alem do quadro
 *   justamente para o corte nunca revelar borda.
 * - non-scaling-stroke: o traco fica em 1px de tela em qualquer largura. Sem
 *   isto ele engrossaria junto com a escala do slice e a trama deixaria de
 *   ser sutil na janela alta.
 * - a deriva e' de 16px em 150s, ou seja, um pixel a cada nove segundos. Nao
 *   e' para ser percebida como movimento; e' para o fundo nao ser uma chapa
 *   parada. O repouso mora no estilo base (transform: none), entao com
 *   movimento reduzido a trama fica exatamente onde este HTML a coloca.
 *
 * A camada nao tem z-index e e' irma da fotografia, dentro do fundo do hero:
 * tudo o que vem depois no documento (titulo, botoes, curva de marcha,
 * figuras, pontos de dor, linhas de referencia) pinta por cima dela.
 */
export function TramaTopografica() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${TRAMA_VIEWBOX.largura} ${TRAMA_VIEWBOX.altura}`}
      preserveAspectRatio="xMidYMid slice"
      className="trama-deriva absolute inset-0 h-full w-full"
    >
      <g
        fill="none"
        stroke="var(--color-accent-light)"
        strokeOpacity={0.09}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      >
        {TRAMA_CURVAS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

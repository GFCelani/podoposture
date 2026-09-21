import { TRAMA_CURVAS, TRAMA_QUADRO } from "./trama-hero-geometria";

/**
 * Camada de fundo do hero: uma trama de curvas de nivel, no principio do mapa
 * topografico. Curvas fechadas e aninhadas, de escalas diferentes, umas
 * inteiras dentro do quadro e outras cortadas pela borda, atravessando toda a
 * area. A geometria e' gerada (scripts/gerar-trama-hero.py) como isolinhas de
 * um campo escalar suave; nao ha curva desenhada a mao aqui.
 *
 * Fica dentro da caixa do fundo, depois da fotografia: acima da foto e abaixo
 * de TUDO que e' conteudo, porque a coluna de texto leva z-10 e o campo das
 * figuras leva o seu. Nao entra no fluxo (absolute), entao nao ha CLS.
 *
 * Duas decisoes carregam o "quase imperceptivel" que foi pedido:
 *
 * 1. O traco e' 1px REAL em qualquer largura (non-scaling-stroke no CSS). Sem
 *    isso o preserveAspectRatio="slice" engrossaria a linha exatamente onde a
 *    escala e' maior, que e' o telefone, onde ha menos fundo livre.
 * 2. A forca da camada vive em --trama-forca e e' atenuada por dois pocos de
 *    mascara, um sobre a coluna de texto e outro sobre o campo das figuras
 *    (globals.css). A trama continua passando por tras dos dois, porque e'
 *    fundo, mas chega la com menos da metade da forca que tem no vazio.
 *
 * Estatica de proposito. O hero ja tem movimento proprio (o ponto da curva de
 * marcha, o sonar dos pontos de dor, as linhas que recolhem) e todo ele
 * representa alguma coisa da clinica. Curva de nivel que anda representaria
 * terreno deslizando, que nao e' nada daqui, e seria justamente o tipo de
 * movimento que o olho pega primeiro numa camada que nao deve ser pega.
 */
export function TramaHero() {
  return (
    <div aria-hidden="true" className="hero-trama">
      <div className="hero-trama-poco">
        <svg
          viewBox={`0 0 ${TRAMA_QUADRO.largura} ${TRAMA_QUADRO.altura}`}
          preserveAspectRatio="xMinYMid slice"
          className="h-full w-full"
        >
          <g fill="none" stroke="var(--color-accent-light)">
            {TRAMA_CURVAS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

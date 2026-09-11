/**
 * O lugar de uma fotografia que ainda nao existe.
 *
 * Sete paginas nao tem imagem honesta no acervo da clinica (ver
 * ilustracao-da-pagina.ts), e imagem de banco esta fora de questao. Em vez de
 * deixar a coluna vazia ou o layout torto, entra esta placa: a mesma moldura
 * das fotos reais, a trama da grade por dentro, marcas de canto de visor e o
 * rotulo em mono dizendo o que deveria estar aqui. E' o pedido de foto para a
 * cliente, escrito no proprio lugar da foto.
 *
 * Decorativo para o leitor de tela: o rotulo e' instrucao de producao, nao
 * conteudo da pagina.
 */
export function PlaceholderFoto({
  rotulo,
  proporcao = "4 / 5",
  className = "",
}: {
  /** O que falta, em minusculas: "atendimento de acupuntura". */
  rotulo: string;
  /** Razao CSS da area interna. Retrato 4/5 casa com as fotos da galeria. */
  proporcao?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-lg border border-rule bg-paper p-2 shadow-plate ${className}`}
    >
      <div
        className="relative overflow-hidden rounded-md border border-rule/70 bg-surface"
        style={{ aspectRatio: proporcao }}
      >
        {/* trama fina, o mesmo passo da grade de fundo do site */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--color-rule) 0 1px, transparent 1px 24px), repeating-linear-gradient(to bottom, var(--color-rule) 0 1px, transparent 1px 24px)",
          }}
        />

        {/* marcas de canto: o quadro de um visor, sem a foto dentro */}
        {(["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"] as const).map(
          (pos) => (
            <span
              key={pos}
              className={`absolute h-4 w-4 border-accent/60 ${pos}`}
            />
          ),
        )}

        {/* ponto de foco no centro, com o sonar do hero */}
        <span className="absolute top-1/2 left-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2">
          <span
            className="sonar-onda absolute inset-0 rounded-full border border-accent"
            style={{ ["--escala" as string]: 5, ["--dur" as string]: "5s" }}
          />
          <span className="sonar-ponto absolute inset-0 rounded-full bg-accent/70" />
        </span>

        <p
          className="absolute right-3 bottom-3 left-3 text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-muted"
          style={{ fontFamily: "var(--mono)" }}
        >
          foto: {rotulo}
        </p>
      </div>
    </div>
  );
}

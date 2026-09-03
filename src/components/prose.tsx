/**
 * Tipografia do conteudo migrado.
 *
 * Paginas de servico e posts passam pelo mesmo componente porque passam pelo
 * mesmo formato: os dois extratores emitem HTML com a mesma lista fechada de
 * tags. Antes as paginas vinham como lista de blocos de texto plano e tinham o
 * proprio caminho de renderizacao, o que custava todo o markup inline — negrito,
 * link e quebra de linha eram descartados na extracao.
 *
 * O visual inteiro mora na classe .prosa, em globals.css. Aqui nao entra classe
 * de tipografia: utilitario aplicado neste elemento venceria as regras de la.
 */

export function Conteudo({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-[1240px] px-6 py-16 md:px-8 lg:px-10 md:py-20 lg:py-24 ${className}`}>
      {/* Seguro: o HTML e gerado em build-time pelos extratores, a partir de uma
          lista fechada de tags, com todo texto e atributo escapados. Nao ha
          caminho de entrada de terceiros — o conteudo e da propria clinica. */}
      <div className="prosa" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

import Image from "next/image";

import { Contact } from "@/components/contact";
import { ConviteConsulta } from "@/components/convite-consulta";
import { PaginaMedicaJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell, type TipoDePagina } from "@/components/page-shell";
import { PlaceholderFoto } from "@/components/placeholder-foto";
import { PaginasRelacionadas } from "@/components/relacionados";
import { SecoesDeConteudo } from "@/components/secoes-de-conteudo";
import { quebrasDaAbertura } from "@/lib/abertura";
import { chaveDaPagina, type ConteudoDoSite } from "@/lib/conteudo-tipos";
import { ilustracaoDaPagina, type Foto } from "@/lib/ilustracao-da-pagina";
import { descricaoDaPagina, rotuloDaPagina, tituloDaPagina, type Pagina } from "@/lib/pages";
import { derivarContato } from "@/lib/site";

/**
 * A composicao de uma pagina interna, sem leitura nenhuma.
 *
 * Existe separada de app/[slug]/page.tsx pelo mesmo motivo de
 * pagina-inicial.tsx: a previa do painel monta EXATAMENTE a mesma pagina com
 * as fotos do rascunho por cima. Duas copias divergiriam na primeira mudanca,
 * e a previa passaria a mostrar uma pagina que o site nao tem.
 */

/**
 * Tipo de pagina, pelo grupo do menu: o grupo "A Clinica" e' institucional,
 * os outros tres sao tratamento. E' a mesma divisao que nav.ts ja faz.
 */
const INSTITUCIONAIS = new Set(
  ["quem-somos", "responsável-técnica", "currículo-profissional", "contato"].map(
    (s) => s.normalize("NFC"),
  ),
);

function tipoDaPagina(slug: string): TipoDePagina {
  return INSTITUCIONAIS.has(slug.normalize("NFC")) ? "institucional" : "tratamento";
}

/**
 * A fotografia da pagina em moldura, na coluna direita do hero. Todas as
 * fotos da clinica sao retrato (4:5); width/height sao as medidas reais do
 * arquivo, para o navegador reservar o espaco e o CLS continuar em zero. A
 * legenda em mono vem do painel (o original esta em ilustracao-da-pagina.ts).
 */
export function FotoEmMoldura({ foto }: { foto: Foto }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-rule bg-paper p-2 shadow-plate">
      <Image
        src={foto.src}
        alt={foto.alt}
        width={foto.largura}
        height={foto.altura}
        loading="eager"
        fetchPriority="high"
        sizes="(min-width: 1024px) 380px, 360px"
        className="aspect-[4/5] w-full rounded-md object-cover saturate-[0.9]"
      />
      <figcaption
        className="flex items-center gap-3 px-1 pt-3 pb-1 text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-muted"
        style={{ fontFamily: "var(--mono)" }}
      >
        <span aria-hidden="true" className="h-px w-6 shrink-0 bg-rule" />
        {foto.legenda}
      </figcaption>
    </figure>
  );
}

export function PaginaInterna({ pagina, conteudo }: { pagina: Pagina; conteudo: ConteudoDoSite }) {
  const titulo = tituloDaPagina(pagina);
  /* Na trilha e nos dados estruturados o titulo entra como nome de item de
     lista, nao como frase: sem o ponto final. So o h1 leva a frase inteira. */
  const rotulo = rotuloDaPagina(pagina);
  const descricao = descricaoDaPagina(pagina, conteudo.contato.descricaoParaBuscadores);
  const caminho = `/${encodeURIComponent(pagina.slug)}`;
  const chave = chaveDaPagina(pagina.slug);
  const ilustracao = ilustracaoDaPagina(pagina.slug, chave ? conteudo[chave] : null);
  const tipo = tipoDaPagina(pagina.slug);
  const eContato = pagina.slug === "contato";
  /* Subtitulo visivel: o que a cliente escreveu para a abertura, quando
     existe; senao a descricao de <meta>, como nas demais paginas. A
     descricao e o JSON-LD nao mudam com a abertura: sao copy de busca. */
  const subtitulo = pagina.abertura?.subtitulo ?? descricao;
  const quebras = quebrasDaAbertura(pagina.slug, titulo, subtitulo);

  const midia = ilustracao.foto ? (
    <FotoEmMoldura foto={ilustracao.foto} />
  ) : ilustracao.placeholder ? (
    <PlaceholderFoto rotulo={ilustracao.placeholder} />
  ) : undefined;

  return (
    <>
      <TrilhaJsonLd itens={[{ nome: rotulo, caminho }]} />
      <PaginaMedicaJsonLd
        titulo={rotulo}
        descricao={descricao}
        caminho={caminho}
      />
      {/* O subtitulo vinha sendo calculado uma linha acima so para o JSON-LD,
          enquanto o PageShell tinha a prop e ninguem passava: a banda do titulo
          ficava vazia e a pagina nao se explicava — "/rpg" anunciava "RPG/RPM"
          sem dizer em momento nenhum o que a sigla significa. */}
      <PageShell
        tipo={tipo}
        titulo={titulo}
        tituloLinhas={quebras.titulo}
        subtitulo={subtitulo}
        subtituloLinhas={quebras.subtitulo}
        identificacao={pagina.abertura?.identificacao}
        trilha={[{ nome: rotulo }]}
        glifo={ilustracao.glifo}
        midia={eContato ? undefined : midia}
      >
        {/* /contato tinha 34 palavras raspadas — dessas, 16 eram o aviso de
            reCAPTCHA em ingles de um formulario que nao existe mais. A secao de
            contato ja pronta traz endereco, mapa, telefones, e-mail e horario,
            que e' o que alguem procura nesse endereco. */}
        {eContato ? (
          <Contact
            contato={derivarContato(conteudo.contato)}
            textos={conteudo["contato-secao"]}
            numero={null}
            comoSecao={false}
          />
        ) : (
          <SecoesDeConteudo
            html={pagina.html}
            tipo={tipo}
            apoio={ilustracao.apoio}
          />
        )}
        <PaginasRelacionadas slug={pagina.slug} />
        <ConviteConsulta />
      </PageShell>
    </>
  );
}

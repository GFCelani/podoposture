import Image from "next/image";

import { Contact } from "@/components/contact";
import { CorpoDaPagina } from "@/components/corpo-da-pagina";
import { ConviteConsulta } from "@/components/convite-consulta";
import { PaginaDoAtendimentoJsonLd, PaginaMedicaJsonLd, TrilhaJsonLd } from "@/components/json-ld";
import { PageShell, type TipoDePagina } from "@/components/page-shell";
import { PlaceholderFoto } from "@/components/placeholder-foto";
import { PaginasRelacionadas } from "@/components/relacionados";
import { quebrasDaAbertura } from "@/lib/abertura";
import { ABERTURA_DO_ATENDIMENTO, ETAPAS_DO_ATENDIMENTO } from "@/lib/atendimento";
import type { ConteudoDoSite } from "@/lib/conteudo-tipos";
import { ilustracaoDaPagina, type Foto } from "@/lib/ilustracao-da-pagina";
import { NAV_GROUPS } from "@/lib/nav";
import { SLUG_DO_ATENDIMENTO, ehInstitucional, fotosConhecidas, modeloDaPagina } from "@/lib/paginas-antigas";
import type { PaginaDoSite } from "@/lib/paginas-do-site";
import { derivarContato } from "@/lib/site";
import { topoDoTexto } from "@/lib/subtitulo-inteiro";

/**
 * A composicao de uma pagina interna, sem leitura nenhuma.
 *
 * Existe separada de app/[slug]/page.tsx pelo mesmo motivo de
 * pagina-inicial.tsx: a previa do painel monta EXATAMENTE a mesma pagina com
 * as fotos do rascunho por cima. Duas copias divergiriam na primeira mudanca,
 * e a previa passaria a mostrar uma pagina que o site nao tem.
 */

/**
 * Tipo de pagina. Antiga: pela lista que ela sempre teve (as quatro de
 * apresentacao). Nova: pelo grupo do menu, "A Clinica" e' institucional, os
 * outros (e fora do menu) sao tratamento.
 */
function tipoDaPagina(pagina: PaginaDoSite): TipoDePagina {
  if (modeloDaPagina(pagina.slug) === "antigo") return ehInstitucional(pagina.slug) ? "institucional" : "tratamento";
  return pagina.grupo === "A Clínica" ? "institucional" : "tratamento";
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

/**
 * Inicio / grupo do menu / pagina. O grupo nao tem endereco proprio, entao
 * entra como texto, sem link; pagina fora do menu vai sem ele.
 */
export function trilhaDaPagina(grupo: string, rotulo: string): { nome: string }[] {
  return grupo ? [{ nome: grupo }, { nome: rotulo }] : [{ nome: rotulo }];
}

/** O titulo como rotulo (aba, trilha, dados estruturados): sem o ponto final. */
function rotuloDe(titulo: string): string {
  return titulo.replace(/(?<!\.\.)\.$/, "");
}

export function PaginaInterna({ pagina, conteudo }: { pagina: PaginaDoSite; conteudo: ConteudoDoSite }) {
  if (pagina.slug.normalize("NFC") === SLUG_DO_ATENDIMENTO) return <PaginaDoAtendimento pagina={pagina} />;

  const titulo = pagina.titulo;
  /* Na trilha e nos dados estruturados o titulo entra como nome de item de
     lista, nao como frase: sem o ponto final. So o h1 leva a frase inteira. */
  const rotulo = rotuloDe(titulo);
  const reserva = conteudo.contato.descricaoParaBuscadores;
  /* Subtitulo visivel: o que a pagina tem sob o titulo; sem ele, a descricao
     do site. A descricao de busca e' a propria da pagina quando ela tem uma
     (as do site antigo com abertura escrita depois), senao o subtitulo. */
  const subtitulo = pagina.resumo || reserva;
  const descricao = pagina.descricao || subtitulo;
  const caminho = `/${encodeURIComponent(pagina.slug)}`;
  const tipo = tipoDaPagina(pagina);
  const eContato = pagina.especial === "contato";
  const antiga = modeloDaPagina(pagina.slug) === "antigo";
  const quebras = quebrasDaAbertura(pagina.slug, titulo, subtitulo);
  /* Subtitulo que e' o primeiro paragrafo sobe com a formatacao dele e sai
     do corpo; o que e' so o comeco do texto nao aparece no topo. */
  const topo = topoDoTexto(pagina.html, subtitulo);
  /* Pagina antiga sem foto ao lado do titulo mostra o rotulo da foto que
     falta, como sempre mostrou; a nova vai sem moldura. */
  const placeholder = antiga && !pagina.capa ? ilustracaoDaPagina(pagina.slug, null).placeholder : undefined;
  const midia = pagina.capa ? (
    <FotoEmMoldura foto={pagina.capa} />
  ) : placeholder ? (
    <PlaceholderFoto rotulo={placeholder} />
  ) : undefined;

  return (
    <>
      <TrilhaJsonLd itens={[{ nome: rotulo, caminho }]} />
      <PaginaMedicaJsonLd titulo={rotulo} descricao={descricao} caminho={caminho} />
      <PageShell
        tipo={tipo}
        titulo={titulo}
        tituloLinhas={quebras.titulo}
        subtitulo={topo.subtitulo}
        subtituloHtml={topo.subtituloHtml}
        subtituloLinhas={topo.subtitulo ? quebras.subtitulo : undefined}
        identificacao={pagina.identificacao.length > 0 ? pagina.identificacao : undefined}
        trilha={trilhaDaPagina(pagina.grupo, rotulo)}
        glifo={`/${pagina.slug.normalize("NFC")}`}
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
          <CorpoDaPagina
            slug={pagina.slug}
            html={topo.corpo}
            tipo={tipo}
            fotos={fotosConhecidas(pagina.slug, conteudo)}
          />
        )}
        <PaginasRelacionadas slug={pagina.slug} />
        <ConviteConsulta />
      </PageShell>
    </>
  );
}

/* ------------------------------------------------------------ atendimento */

/** Os recursos do passo do plano terapeutico que tem pagina no site, com o nome do menu. */
function recursosComPagina() {
  const rotulos = new Map(NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.href.normalize("NFC"), i.label]));
  return ETAPAS_DO_ATENDIMENTO.flatMap((e) => e.lista ?? [])
    .filter((r) => r.href)
    .map((r) => ({
      nome: rotulos.get(r.href!.normalize("NFC")) ?? r.texto,
      caminho: encodeURI(r.href!),
    }));
}

/**
 * Como e o meu atendimento, com a composicao propria que sempre teve
 * (como-e-o-meu-atendimento.tsx): sem glifo, sem relacionados, as duas
 * frases da abertura uma por linha.
 */
function PaginaDoAtendimento({ pagina }: { pagina: PaginaDoSite }) {
  const titulo = pagina.titulo;
  const caminho = `/${pagina.slug}`;
  const descricao = pagina.descricao || pagina.resumo;
  const linhas = pagina.resumo === ABERTURA_DO_ATENDIMENTO.join(" ") ? [...ABERTURA_DO_ATENDIMENTO] : undefined;
  const topo = topoDoTexto(pagina.html, pagina.resumo);
  return (
    <>
      <TrilhaJsonLd itens={[{ nome: titulo, caminho }]} />
      <PaginaDoAtendimentoJsonLd titulo={titulo} descricao={descricao} caminho={caminho} recursos={recursosComPagina()} />
      <PageShell
        tipo="institucional"
        titulo={titulo}
        subtitulo={topo.subtitulo}
        subtituloHtml={topo.subtituloHtml}
        subtituloLinhas={topo.subtitulo ? linhas : undefined}
        trilha={trilhaDaPagina(pagina.grupo, titulo)}
        midia={pagina.capa ? <FotoEmMoldura foto={pagina.capa} /> : undefined}
      >
        <CorpoDaPagina slug={pagina.slug} html={topo.corpo} tipo="institucional" />
        <ConviteConsulta />
      </PageShell>
    </>
  );
}

import type { Metadata } from "next";

import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { PageGrid, SeamRuler, SectionMark } from "@/components/layers";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * Pedido de fotografias para a clinica.
 *
 * Pagina de trabalho, nao de conteudo: existe para ser aberta no celular na
 * hora de fotografar. Por isso NAO passa pelo PageShell nem entra em
 * pages.json — nao e' uma das 88 rotas migradas, nao tem trilha, nao leva o
 * convite de consulta (o publico aqui e' a propria clinica) e nao aparece no
 * menu.
 *
 * Fora do indice de propriedade: `robots: noindex, nofollow` aqui, e o
 * sitemap continua sendo gerado so a partir do conteudo (pages.json e
 * posts.json), entao esta rota nao entra nele sozinha. O middleware tambem
 * nao a toca: ele so reescreve slug que existe em rotas.json.
 *
 * Quando as sete fotos chegarem, esta pagina pode ser apagada inteira.
 */

export const metadata: Metadata = {
  title: "Fotos que faltam no site",
  robots: { index: false, follow: false },
};

type Pedido = {
  pagina: string;
  foto: string;
  /** Ha paciente na cena? Decide o aviso de autorizacao. */
  comPaciente: boolean;
};

const PEDIDOS: Pedido[] = [
  {
    pagina: "Currículo Profissional",
    foto: "Retrato da responsável técnica",
    comPaciente: false,
  },
  {
    pagina: "Dor Lombar Crônica",
    foto: "Atendimento de dor lombar na maca",
    comPaciente: true,
  },
  {
    pagina: "Neuromodulação",
    foto: "Sessão de neuromodulação com o aparelho",
    comPaciente: true,
  },
  {
    pagina: "RPG",
    foto: "Sessão de RPG na sala de exame",
    comPaciente: true,
  },
  {
    pagina: "Tratamento da Dor",
    foto: "Avaliação clínica da dor em consulta",
    comPaciente: true,
  },
  {
    pagina: "Tratamento da DTM",
    foto: "Avaliação da ATM em consulta",
    comPaciente: true,
  },
  {
    pagina: "Tratamento do Zumbido",
    foto: "Aplicação de neuromodulação auricular",
    comPaciente: true,
  },
];

const COMO_TIRAR = [
  {
    titulo: "Em pé, não deitada",
    texto:
      "As fotos entram numa moldura vertical no site. Segure o celular em pé, como numa foto de retrato.",
  },
  {
    titulo: "Celular serve",
    texto:
      "Desde que na resolução máxima e com boa luz. As fotos que estão no site hoje vieram do site antigo em qualidade baixa; qualquer celular recente já melhora.",
  },
  {
    titulo: "A cena real, com o aparelho",
    texto:
      "Cada foto precisa mostrar o lugar, o aparelho ou o gesto de que a página fala. Foto de banco de imagem não entra: descaracteriza a clínica.",
  },
  {
    titulo: "Luz do ambiente, sem flash",
    texto:
      "O flash apaga o volume da sala e deixa a pele dura. Se estiver escuro, acenda o que houver e aproxime a cena da janela.",
  },
];

/* Numeral por extenso: a frase comeca por ele, e digito abrindo periodo le
   como numeracao de item. A contagem sai dos dados, nao do texto, para nunca
   divergir da lista se uma cena mudar de mao. */
const EXTENSO = ["nenhuma", "Uma", "Duas", "Três", "Quatro", "Cinco", "Seis", "Sete"];

export default function FotosQueFaltam() {
  const comPaciente = PEDIDOS.filter((p) => p.comPaciente).length;

  return (
    <>
      <SiteHeader />

      <main id="conteudo">
        {/* Abertura. O respiro de cima e' o que faz o texto nascer abaixo do
            cabecalho, que e' chapa fixa fora do fluxo. */}
        <header className="relative border-b border-rule bg-surface">
          <PageGrid />
          <div className="relative mx-auto max-w-[1240px] px-6 pt-32 pb-12 md:px-8 md:pt-36 md:pb-14 lg:px-10 lg:pt-44 lg:pb-16">
            <Reveal>
              <SectionMark n="PEDIDO DE FOTOS" />
            </Reveal>

            <Reveal variante="cortina" delay={90}>
              <h1 className="mt-8 max-w-[20ch] [overflow-wrap:anywhere] font-display text-[clamp(2rem,1.35rem+3.25vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-ink-strong max-[359px]:text-[1.625rem]">
                Fotos que faltam no site
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p className="mt-6 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-ink md:mt-7 md:text-[1.125rem]">
                Sete páginas ainda estão sem fotografia. No lugar de cada uma
                há hoje uma placa dizendo o que deveria estar ali. O site não
                fica quebrado assim, mas essas páginas não mostram a clínica.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <p className="mt-5 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-muted">
                Esta página é só para você. Ela não aparece no menu nem em
                buscas, e some quando as fotos chegarem.
              </p>
            </Reveal>
          </div>
        </header>

        {/* Autorizacao em banda escura, antes da lista: e' a condicao para
            seis das sete fotos existirem, nao um rodape. */}
        <section
          data-tone="deep"
          aria-labelledby="autorizacao-titulo"
          className="relative overflow-hidden bg-deep-calm"
        >
          <PageGrid tone="deep" />
          <div className="relative mx-auto max-w-[1240px] px-6 py-14 md:px-8 md:py-16 lg:px-10 lg:py-20">
            <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
              <div className="lg:col-span-8">
                <Reveal variante="cortina">
                  <SectionMark n="ANTES DE FOTOGRAFAR" tone="deep" />
                  <h2
                    id="autorizacao-titulo"
                    className="mt-8 max-w-[20ch] font-display text-[clamp(1.5rem,1.15rem+1.75vw,2.25rem)] leading-[1.16] font-medium tracking-[-0.018em] text-balance text-paper"
                  >
                    Autorização de uso de imagem, por escrito
                  </h2>
                </Reveal>

                <Reveal delay={110}>
                  <p className="mt-7 max-w-[56ch] text-[1.0625rem] leading-[1.75] text-paper">
                    {EXTENSO[comPaciente]} das sete fotos mostram um
                    atendimento, com paciente na cena. Publicar essas imagens exige autorização
                    de quem aparece, e a responsabilidade é sua, como
                    responsável técnica.
                  </p>
                </Reveal>

                <Reveal delay={200}>
                  <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-[1.75] text-on-deep-muted">
                    A sugestão é que seja por escrito, assinada, dizendo que a
                    foto pode ser usada no site da clínica. Combinado verbal
                    resolve no dia e não resolve depois. Vale guardar uma cópia
                    junto ao prontuário.
                  </p>
                </Reveal>

                <Reveal delay={280}>
                  <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-[1.75] text-on-deep-muted">
                    Se preferir não envolver pacientes, dá para fotografar as
                    cenas com alguém da equipe no lugar, ou enquadrar só as
                    mãos e o aparelho, sem rosto. As duas saídas funcionam.
                  </p>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* As sete. Cartoes, e nao tabela: no celular uma tabela de duas
            colunas espreme a descricao a ponto de quebrar palavra a palavra. */}
        <section
          aria-labelledby="lista-titulo"
          className="relative overflow-hidden"
        >
          <PageGrid />
          <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
            <Reveal variante="cortina">
              <SectionMark n="07" />
              <h2
                id="lista-titulo"
                className="mt-8 font-display text-[clamp(1.5rem,1.15rem+1.75vw,2.25rem)] leading-[1.16] font-semibold tracking-[-0.018em] text-ink-strong"
              >
                As sete fotos
              </h2>
            </Reveal>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {PEDIDOS.map((pedido, i) => (
                <li key={pedido.pagina} className="flex">
                  <Reveal delay={60 + i * 70} className="flex w-full">
                    <article className="flex w-full flex-col rounded-lg border border-rule bg-paper p-6 shadow-tag">
                      <p className="flex items-baseline gap-4">
                        <span
                          aria-hidden="true"
                          className="text-[0.6875rem] tracking-[0.18em] text-accent"
                          style={{ fontFamily: "var(--mono)" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="text-[0.6875rem] leading-[1.5] tracking-[0.14em] text-muted uppercase"
                          style={{ fontFamily: "var(--mono)" }}
                        >
                          {pedido.pagina}
                        </span>
                      </p>

                      <p className="mt-4 [overflow-wrap:anywhere] font-display text-[1.25rem] leading-[1.3] font-medium text-balance text-ink-strong">
                        {pedido.foto}
                      </p>

                      {pedido.comPaciente && (
                        <p className="mt-auto flex items-center gap-3 pt-5 text-[0.8125rem] leading-[1.5] text-muted">
                          <span
                            aria-hidden="true"
                            className="h-px w-5 shrink-0 bg-accent/40"
                          />
                          Precisa de autorização
                        </p>
                      )}
                    </article>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Como tirar */}
        <section
          aria-labelledby="como-titulo"
          className="corte-alto-dir relative overflow-hidden border-y border-rule bg-surface"
        >
          <PageGrid />
          <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
            <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
              <div className="lg:col-span-3">
                <Reveal variante="cortina">
                  <SectionMark n="COMO TIRAR" />
                </Reveal>
              </div>

              <div className="mt-10 lg:col-span-8 lg:col-start-5 lg:mt-0">
                <h2 id="como-titulo" className="sr-only">
                  Como tirar as fotos
                </h2>
                <dl className="space-y-8">
                  {COMO_TIRAR.map((item, i) => (
                    <Reveal key={item.titulo} delay={80 + i * 80}>
                      <div className="border-t border-rule pt-6">
                        <dt className="font-display text-[1.25rem] leading-[1.3] font-medium text-ink-strong">
                          {item.titulo}
                        </dt>
                        <dd className="mt-3 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-ink">
                          {item.texto}
                        </dd>
                      </div>
                    </Reveal>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Duas observacoes */}
        <section
          aria-labelledby="obs-titulo"
          className="relative overflow-hidden"
        >
          <PageGrid />
          <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
            <Reveal variante="cortina">
              <SectionMark n="02" />
              <h2
                id="obs-titulo"
                className="mt-8 font-display text-[clamp(1.5rem,1.15rem+1.75vw,2.25rem)] leading-[1.16] font-semibold tracking-[-0.018em] text-ink-strong"
              >
                Duas observações
              </h2>
            </Reveal>

            <div className="mt-10 md:grid md:grid-cols-2 md:gap-x-10 lg:gap-x-16">
              <Reveal delay={100}>
                <div className="border-t border-rule pt-7">
                  <h3 className="max-w-[24ch] font-display text-[1.375rem] leading-[1.25] font-medium text-balance text-ink-strong">
                    O seu retrato é decisão sua, não só agendamento
                  </h3>
                  <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-[1.7] text-ink">
                    Hoje não existe nenhuma fotografia sua no site. A imagem
                    que estava com o seu nome no site antigo é uma peça
                    gráfica de um post sobre zumbido, não um retrato.
                  </p>
                  <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-[1.7] text-muted">
                    Se preferir não aparecer, a página funciona sem rosto e a
                    placa sai do mesmo jeito. Só me diga qual dos dois
                    caminhos, para eu não deixar a página esperando uma foto
                    que não vem.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={190}>
                <div className="mt-10 border-t border-rule pt-7 md:mt-0">
                  <h3 className="max-w-[24ch] font-display text-[1.375rem] leading-[1.25] font-medium text-balance text-ink-strong">
                    Três delas saem na mesma sessão
                  </h3>
                  <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-[1.7] text-ink">
                    Neuromodulação, Tratamento da DTM e Tratamento do Zumbido
                    usam a mesma sala e o mesmo aparelho. Dá para resolver as
                    três numa tarde, com o mesmo paciente e a mesma
                    autorização.
                  </p>
                  <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-[1.7] text-muted">
                    Sobram quatro: o seu retrato, o atendimento de dor lombar,
                    a sessão de RPG e a avaliação clínica da dor.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Fecho */}
        <section className="relative overflow-hidden border-t border-rule bg-surface">
          <PageGrid />
          <div className="relative mx-auto max-w-[1240px] px-6 py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
            <Reveal variante="cortina">
              <p className="max-w-[30ch] font-display text-[clamp(1.375rem,1.1rem+1.4vw,1.875rem)] leading-[1.3] font-medium text-balance text-ink-strong">
                Assim que as fotos chegarem, eu coloco.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-6 max-w-[54ch] text-[1.0625rem] leading-[1.7] text-ink">
                Pode mandar por WhatsApp, mesmo que venham em partes. Não
                precisa editar, cortar nem renomear nada: eu ajusto o
                enquadramento e o tamanho de cada uma.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-6 max-w-[54ch] text-[1.0625rem] leading-[1.7] text-muted">
                Se alguma cena não fizer sentido do jeito que está descrita
                aqui, me diga: a descrição é uma sugestão, e você conhece o
                atendimento melhor do que ela.
              </p>
            </Reveal>
          </div>
        </section>

        <SeamRuler />
      </main>

      <SiteFooter />
      <FloatingWhatsApp />
    </>
  );
}

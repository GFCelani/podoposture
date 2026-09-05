import Image from "next/image";
import type { ReactNode } from "react";

import type { Bloco } from "@/lib/blocos";
import type { Foto } from "@/lib/ilustracao-da-pagina";
import { FiguraEsquematica } from "./figura-esquematica";
import { PageGrid } from "./layers";
import { Reveal } from "./reveal";

/**
 * Os blocos das paginas internas: a apresentacao de cada tipo que
 * lib/blocos.ts reconhece, mais a moldura em que eles vivem (faixa, grade,
 * lateral com prumo). O CSS esta em globals.css, secao "PAGINAS INTERNAS".
 *
 * Dois modos:
 *   grade    tratamento e institucional. Grade de 12 colunas: a lateral
 *            esquerda (1-2) leva o fio de prumo, o ponto de sonar e, nas
 *            paginas de tratamento, o numeral; o corpo da secao (3-12) e' uma
 *            grade propria de 10 colunas em que cada tipo de bloco tem a
 *            sua largura: prosa em 6, citacao ao lado em 3, listas e grades
 *            em 10. A largura varia com o conteudo, nao com a pagina.
 *   corrido  post. Coluna de leitura centrada, os mesmos blocos empilhados.
 *
 * Nenhum componente aqui escreve texto. Os numerais sao contadores CSS ou
 * indices de secao; as legendas de foto vem de ilustracao-da-pagina.ts.
 */

export type Modo = "grade" | "corrido";
export type Tom = "paper" | "surface" | "deep";

const TELEFONE = /\(\d{2}\)\s?\d{4,5}-\d{4}/;

/* Seguro: HTML gerado em build-time pelos extratores, a partir de uma lista
   fechada de tags, com texto e atributos escapados. Nao ha entrada de
   terceiros; o conteudo e' da propria clinica. */
export function Html({
  html,
  className,
  id,
}: {
  html: string;
  className?: string;
  id?: string;
}) {
  return <div id={id} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Ponto de sonar, numeral e filete: a marca de secao das paginas internas. */
export function Marca({ n, tom = "paper" }: { n?: string; tom?: Tom }) {
  const deep = tom === "deep";
  return (
    <div className="pi-marca">
      <span className="pi-ponto" aria-hidden="true">
        <span
          className={`sonar-onda absolute inset-0 rounded-full border ${deep ? "border-accent-light" : "border-accent"}`}
          style={{ ["--escala" as string]: 4, ["--dur" as string]: "5s" }}
        />
        <span
          className={`sonar-ponto absolute inset-0 rounded-full ${deep ? "bg-accent-light" : "bg-accent"}`}
        />
      </span>
      {n && <span aria-hidden="true">{n}</span>}
      <span className="pi-fio" aria-hidden="true" />
    </div>
  );
}

/**
 * Uma banda de pagina. `tom` decide fundo e cor de texto; `corte` poe a quina
 * diagonal (so em banda tintada); `prumo` desenha o segmento do fio de prumo
 * na abscissa da lateral, para o fio parecer continuo atraves das bandas.
 */
export function Faixa({
  tom = "paper",
  corte,
  prumo = false,
  continua = false,
  curta = false,
  children,
}: {
  tom?: Tom;
  corte?: "dir" | "esq";
  prumo?: boolean;
  continua?: boolean;
  /** Secao de uma frase: metade do respiro vertical. */
  curta?: boolean;
  children: ReactNode;
}) {
  const fundo =
    tom === "deep"
      ? "bg-deep-calm"
      : tom === "surface"
        ? "bg-surface border-y border-rule"
        : "";
  return (
    <section
      className={`pi-faixa relative overflow-hidden ${fundo} ${corte ? `corte-alto-${corte}` : ""}`}
      data-tom={tom}
      data-tone={tom === "deep" ? "deep" : undefined}
      data-continua={continua ? "sim" : undefined}
      data-curta={curta ? "sim" : undefined}
    >
      <PageGrid tone={tom === "deep" ? "deep" : "light"} />
      <div className="pi-wrap relative mx-auto max-w-[1240px] px-6 md:px-8 lg:px-10">
        {prumo && <div className="pi-prumo" aria-hidden="true" />}
        <div className="pi-grid">{children}</div>
      </div>
    </section>
  );
}

/** A lateral da grade: fixa enquanto a secao rola. */
export function Lateral({ n, tom = "paper" }: { n?: string; tom?: Tom }) {
  return (
    <div className="pi-lateral">
      <div className="pi-lateral-in">
        <Reveal>
          <Marca n={n} tom={tom} />
        </Reveal>
      </div>
    </div>
  );
}

/**
 * A sequencia de blocos de uma faixa. Em modo grade cada bloco recebe a
 * coluna do seu tipo; em modo corrido (ou dentro de uma coluna ja estreita,
 * `colunas=false`) eles so empilham. A citacao que vem logo depois de uma
 * prosa cai ao lado dela (colunas 8-10 da grade do corpo; a auto-colocacao
 * da grade faz o par sem wrapper); solta, ela fica na medida da prosa.
 */
export function Blocos({
  blocos,
  modo,
  colunas = modo === "grade",
  atraso = 0,
}: {
  blocos: Bloco[];
  modo: Modo;
  colunas?: boolean;
  atraso?: number;
}) {
  const nos: ReactNode[] = [];
  const col = (c: string) => (colunas ? c : "pi-bl");
  const delay = (k: number) => Math.min(240, atraso + 80 * k);

  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i];
    switch (b.tipo) {
      case "prosa":
        nos.push(
          <Reveal key={i} className={col("pi-col-prosa")} delay={delay(i)}>
            <Html className={`prosa prosa-secao${colunas ? " prosa-na-grade" : ""}`} html={b.html} />
          </Reveal>,
        );
        break;

      case "citacao": {
        const aoLado = colunas && i > 0 && blocos[i - 1].tipo === "prosa";
        nos.push(
          <Reveal key={i} className={col(aoLado ? "pi-col-citacao" : "pi-col-prosa")} delay={delay(i)}>
            <Html className={`pi-citacao${aoLado ? "" : " pi-citacao-solta"}`} html={b.html} />
          </Reveal>,
        );
        break;
      }

      case "lista-rotulada": {
        if (b.variante === "passos") {
          nos.push(
            <Reveal key={i} className={col("pi-col-largo")} delay={delay(i)}>
              <div className="pi-passos">
                <Html className="pi-rotulo" html={b.rotulo} />
                <Html html={b.lista} />
              </div>
            </Reveal>,
          );
          break;
        }
        // fichas seguidas entram numa grade so
        let j = i;
        const fichas: typeof b[] = [];
        while (j < blocos.length) {
          const f = blocos[j];
          if (f.tipo !== "lista-rotulada" || f.variante !== "ficha") break;
          fichas.push(f);
          j++;
        }
        nos.push(
          <Reveal key={i} className={col("pi-col-largo")} delay={delay(i)}>
            <div className="pi-fichas" data-qtd={Math.min(fichas.length, 3)}>
              {fichas.map((f, k) => (
                <div key={k} className="pi-ficha">
                  <Html className="pi-rotulo" html={f.rotulo} />
                  <Html html={f.lista} />
                </div>
              ))}
            </div>
          </Reveal>,
        );
        i = j - 1;
        break;
      }

      case "lista":
        nos.push(
          <Reveal key={i} className={col("pi-col-largo")} delay={delay(i)}>
            <Html
              className={`pi-lista pi-${b.variante}${b.ordenada ? " pi-ordenada" : ""}`}
              html={b.html}
            />
          </Reveal>,
        );
        break;

      case "azulejos":
        nos.push(
          <Reveal key={i} className={col("pi-col-azulejos")} delay={delay(i)}>
            <div className="pi-azulejos">
              {b.itens.map((it, k) => (
                <Html key={k} className="pi-azulejo" html={it.html} />
              ))}
            </div>
          </Reveal>,
        );
        break;

      case "protocolo":
        nos.push(
          <Reveal key={i} className={col("pi-col-largo")} delay={delay(i)}>
            <div className="pi-protocolo">
              {b.linhas.map((l, k) => (
                <div key={k} className="pi-prot-linha">
                  <Html className="pi-prot-titulo" html={l.titulo} />
                  {l.corpo && <Html className="pi-prot-corpo" html={l.corpo} />}
                </div>
              ))}
            </div>
          </Reveal>,
        );
        break;

      case "placa":
        nos.push(
          <Reveal key={i} className={col("pi-col-largo")} delay={delay(i)}>
            <div className="pi-placa bg-surface">
              <div className="pi-texto">
                {b.titulo && <Html html={b.titulo} />}
                {b.texto.map((h, k) => (
                  <Html key={k} html={h} />
                ))}
              </div>
              <div className="pi-dado">
                {b.dado.map((h, k) => (
                  <Html
                    key={k}
                    className={
                      TELEFONE.test(h)
                        ? "pi-num"
                        : k === b.dado.length - 1 && /^<p>\s*<strong>/.test(h)
                          ? "pi-fecho"
                          : undefined
                    }
                    html={h}
                  />
                ))}
              </div>
            </div>
          </Reveal>,
        );
        break;

      case "referencias":
        nos.push(
          <Reveal key={i} className={col("pi-col-largo")} delay={delay(i)}>
            <Html className="pi-referencias" html={b.html} />
          </Reveal>,
        );
        break;
    }
  }
  return <>{nos}</>;
}

/**
 * Fotografias de apoio ao lado de um bloco: a primeira grande e apaisada, as
 * seguintes em retrato, todas em moldura, com as linhas de referencia do
 * hero atras. width/height reais para o CLS continuar em zero.
 */
export function FotosDeApoio({ fotos }: { fotos: Foto[] }) {
  return (
    <div className="pi-fotos">
      <div className="pi-linhas" aria-hidden="true">
        {[22, 50, 78].map((y, i) => (
          <div key={y} style={{ top: `${y}%` }}>
            <div
              className="estende"
              style={{
                ["--dur" as string]: `${9 + i * 2.5}s`,
                ["--fase" as string]: `${i * 1.7}s`,
              }}
            />
            <div className="tique" />
          </div>
        ))}
      </div>
      {fotos.map((f, k) => (
        <Reveal key={f.src + k} className={k === 0 ? "grande" : "pequena"} delay={120 + 90 * k}>
          <figure>
            <div className="pi-moldura">
              <Image
                src={f.src}
                alt={f.alt}
                width={f.largura}
                height={f.altura}
                sizes={k === 0 ? "(min-width: 1024px) 520px, 100vw" : "(min-width: 1024px) 250px, 50vw"}
              />
            </div>
            <figcaption>{f.legenda}</figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}

/** A figura esquematica do hero, na lateral direita de uma banda profunda. */
export function FiguraLateral() {
  return (
    <div className="pi-figura" aria-hidden="true">
      <div className="pi-figura-in">
        <FiguraEsquematica className="pi-figura-svg" />
      </div>
    </div>
  );
}

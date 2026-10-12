import type { ReactNode } from "react";

import type { Bloco } from "@/lib/blocos";
import { Reveal } from "./reveal";

/**
 * A apresentacao de cada tipo de bloco que lib/blocos.ts reconhece. O CSS
 * esta em paginas-internas.css.
 *
 * Dois usos:
 *   grade    paginas de conteudo (corpo-em-fluxo.tsx), sempre com
 *            colunas=false: os blocos empilham na coluna do texto.
 *   corrido  post. Coluna de leitura centrada, os mesmos blocos empilhados.
 *
 * Nenhum componente aqui escreve texto.
 */

export type Modo = "grade" | "corrido";

const TELEFONE = /\(\d{2}\)\s?\d{4,5}-\d{4}/;

/* Seguro: as duas fontes chegam com texto e atributos escapados. Paginas e
   posts migrados vem dos extratores, em build-time, a partir de uma lista
   fechada de tags; posts do painel vem de lib/markdown.ts, em que marcacao
   digitada nunca vira HTML (html: false). Nao ha entrada de terceiros; o
   conteudo e' da propria clinica. */
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

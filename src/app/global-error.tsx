"use client";

import { useEffect } from "react";

/**
 * A rede de ultimo recurso: erro dentro do proprio root layout.
 *
 * Este arquivo SUBSTITUI o layout raiz quando entra em cena. A consequencia
 * pratica, documentada pelo Next, e que ele nao recebe nada do que o layout
 * monta: nem `globals.css`, nem as fontes do `next/font`, nem os tokens do
 * tema. Escrito com as classes do site, ele sairia sem estilo nenhum
 * exatamente no momento em que o site inteiro caiu — por isso cada cor e cada
 * medida aqui estao escritas a mao, com os mesmos valores de `@theme`
 * (linho #FBF8F3, tinta #3A3B33, acento #0B6A9C, filete #DED2C0) e com a
 * familia de reserva da Newsreader, que e a mesma declarada no tema.
 *
 * Tambem por substituir o layout, ele precisa das proprias tags `html` e
 * `body`, e nao aceita `metadata` — o titulo vem do `<title>` do React.
 *
 * Nao ha link para /contato aqui, ao contrario do `error.tsx`: se o layout
 * raiz quebrou, nao ha garantia de que outra rota do site responda, e mandar
 * a visitante para uma pagina que talvez tambem esteja fora seria empurra-la
 * para um segundo beco. Recarregar e a unica saida que depende so do
 * navegador.
 */
const LINHO = "#FBF8F3";
const TINTA = "#3A3B33";
const TINTA_FORTE = "#20231F";
const METADADO = "#6A6355";
const FILETE = "#DED2C0";
const ACAO = "#96bf0d";
const ACAO_FUNDA = "#4b6007";

const SERIFA = 'Georgia, "Times New Roman", serif';
const SEM_SERIFA =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default function ErroGlobal({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[site] o layout raiz quebrou:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1.5rem",
          backgroundColor: LINHO,
          color: TINTA,
          fontFamily: SEM_SERIFA,
          fontSize: "1.0625rem",
          lineHeight: 1.6,
        }}
      >
        <title>O site está fora do ar | Podoposture</title>

        <main style={{ width: "100%", maxWidth: "34rem" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: SERIFA,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.15,
              fontWeight: 600,
              color: TINTA_FORTE,
            }}
          >
            O site está fora do ar
          </h1>

          <p style={{ marginTop: "1.25rem" }}>
            A falha é nossa e costuma durar pouco. Recarregue em alguns
            instantes.
          </p>

          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "2.5rem",
              minHeight: 44,
              padding: "0 1.25rem",
              borderRadius: 6,
              border: `1.5px solid ${ACAO_FUNDA}40`,
              backgroundColor: ACAO,
              color: TINTA_FORTE,
              fontSize: "1rem",
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>

          <p
            style={{
              marginTop: "3rem",
              borderTop: `1px solid ${FILETE}`,
              paddingTop: "2rem",
              fontSize: "0.9375rem",
              color: METADADO,
            }}
          >
            Podoposture — osteopatia, posturologia e acupuntura em Copacabana.
            {error.digest && (
              <>
                {" "}
                Código desta falha:{" "}
                <span style={{ fontFamily: "monospace", color: TINTA }}>
                  {error.digest}
                </span>
                .
              </>
            )}
          </p>
        </main>
      </body>
    </html>
  );
}

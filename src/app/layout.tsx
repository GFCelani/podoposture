import type { Metadata } from "next";
import { Newsreader, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { NegocioLocalJsonLd } from "@/components/json-ld";
import {
  DESCRICAO_PADRAO,
  GOOGLE_SITE_VERIFICATION,
  SITE_URL,
} from "@/lib/site";

// Newsreader e Public Sans sao variaveis: sem `weight`, o next/font baixa o
// arquivo variavel e todos os pesos ficam disponiveis. Com `weight` explicito
// ele baixava uma estatica por peso e por estilo. IBM Plex Mono nao e variavel,
// entao continua declarando o peso, e so o 400 e usado.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const TITULO_PADRAO = "Podoposture | Coluna Vertebral, Dor Crônica";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // as paginas internas passam so o proprio nome; a marca entra por aqui
    default: TITULO_PADRAO,
    template: "%s | Podoposture",
  },
  description: DESCRICAO_PADRAO,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  // sem esta tag a clinica perde a posse do Search Console no dia em que o
  // dominio deixar o GoDaddy; redundante com a verificacao por DNS, de proposito
  verification: { google: GOOGLE_SITE_VERIFICATION },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Podoposture",
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
    url: "/",
    // public/og.png: captura do proprio hero em 1200x630, para o cartao nunca
    // divergir do site. Regerar quando o hero mudar.
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Podoposture" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${newsreader.variable} ${publicSans.variable} ${plexMono.variable} antialiased`}
      >
        {/* Primeiro elemento focavel da pagina: o menu tem ~20 links, e sem
            este atalho quem navega por teclado atravessa todos a cada visita. */}
        <a href="#conteudo" className="pular-para-conteudo">
          Pular para o conteúdo
        </a>
        <NegocioLocalJsonLd />
        {children}
      </body>
    </html>
  );
}

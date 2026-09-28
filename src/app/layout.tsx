import type { Metadata } from "next";
import { Newsreader, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { DevMedida } from "../components/dev-medida";

import { AnalyticsDoSite } from "@/components/analytics";
import { NegocioLocalJsonLd } from "@/components/json-ld";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { tipoDaImagem } from "@/lib/imagem-webp";
import {
  derivarContato,
  GOOGLE_SITE_VERIFICATION,
  SITE_URL,
} from "@/lib/site";

// Newsreader e Public Sans sao variaveis: sem `weight`, o next/font baixa o
// arquivo variavel e todos os pesos ficam disponiveis. Com `weight` explicito
// ele baixava uma estatica por peso e por estilo. IBM Plex Mono nao e variavel,
// entao continua declarando o peso, e so o 400 e usado.

// O eixo optico precisa ser pedido: o next/font baixa a variavel so com o
// eixo wght, e sem `axes` o navegador recebe a instancia padrao do opsz da
// Newsreader, que e o corte de TEXTO (opsz 16). Em titulo de 56 a 64px o que
// aparecia era esse corte ampliado: serifa grossa, contraste baixo, encaixe
// largo. Declarado o eixo, o `font-optical-sizing: auto` que o navegador ja
// aplica por padrao mapeia opsz = corpo em px e o corte de display entra
// sozinho nos titulos. Conferido no font-data.json do next: a Newsreader tem
// opsz (6..72, padrao 16) e wght; a Public Sans tem so wght, entao nao ha
// eixo a declarar nela; a IBM Plex Mono nao e variavel.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
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

/**
 * A descricao vem do painel ("Descricao para o Google"), por isso os metadados
 * sao gerados e nao constantes. A leitura e a mesma da pagina, deduplicada, e
 * cai no padrao sem banco.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { contato, compartilhamento, marca } = await lerConteudoDoSite();
  const descricao = contato.descricaoParaBuscadores;
  const cartao = compartilhamento.imagem;
  const icone = marca.icone[0];

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      // as paginas internas passam so o proprio nome; a marca entra por aqui
      default: TITULO_PADRAO,
      template: "%s | Podoposture",
    },
    description: descricao,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    // sem esta tag a clinica perde a posse do Search Console no dia em que o
    // dominio deixar o GoDaddy; redundante com a verificacao por DNS, de proposito
    verification: { google: GOOGLE_SITE_VERIFICATION },
    // O icone enviado pelo painel, ou o original (public/icon.svg). Era o
    // arquivo app/icon.svg, mas icone por arquivo vence o dos metadados, e o
    // painel nao conseguiria troca-lo.
    icons: {
      icon: icone
        ? [{ url: icone.src, type: tipoDaImagem(icone.src), sizes: `${icone.largura}x${icone.altura}` }]
        : [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Podoposture",
      title: TITULO_PADRAO,
      description: descricao,
      url: "/",
      // O cartao do painel ("Imagem de compartilhamento"); o original e
      // public/og.png, captura do proprio hero em 1200x630.
      images: [{ url: cartao.src, width: cartao.largura, height: cartao.altura, alt: "Podoposture" }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITULO_PADRAO,
      description: descricao,
      images: [cartao.src],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const conteudo = await lerConteudoDoSite();
  const contato = derivarContato(conteudo.contato);

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
        <NegocioLocalJsonLd contato={contato} imagem={conteudo.compartilhamento.imagem.src} />
        {children}
        {/* So na Vercel: fora dela /_vercel/insights/script.js nao existe, e a
            tag deixava 404 e erro de tipo MIME no console de toda pagina. Na
            Vercel o erro so aparece enquanto o Web Analytics estiver desligado,
            e liga-lo e o primeiro passo dos numeros (README-painel). */}
        {process.env.VERCEL === "1" && <AnalyticsDoSite />}
        <DevMedida />
      </body>
    </html>
  );
}

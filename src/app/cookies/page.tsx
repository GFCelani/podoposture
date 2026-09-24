import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ResponsavelLegal } from "@/components/responsavel-legal";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { derivarContato } from "@/lib/site";

/**
 * Politica de cookies.
 *
 * O site nao tem banner de consentimento, e esta pagina diz por que. O Guia
 * orientativo de cookies da ANPD (2022) separa cookie necessario, que nao
 * depende de consentimento, do resto. O unico cookie do proprio site e' o de
 * sessao do painel (`lib/sessao.ts`), a medicao de visitas nao usa cookie
 * (`components/analytics.tsx`) e o unico terceiro, o Google Maps, so e'
 * montado quando a pessoa pede (`components/mapa-sob-demanda.tsx`). Entrou um
 * cookie novo, ou um script de terceiro que carregue sozinho, e esta conta
 * deixa de fechar: a pagina muda, e o banner passa a ser necessario.
 */

const DESCRICAO =
  "Quais cookies o site da Podoposture usa, para quê, por quanto tempo, e por que ele não precisa de banner de consentimento.";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: DESCRICAO,
  alternates: { canonical: "/cookies" },
};

export default async function Cookies() {
  const contato = derivarContato((await lerConteudoDoSite()).contato);

  return (
    <PageShell
      tipo="institucional"
      titulo="Política de cookies"
      subtitulo="Quais cookies este site usa, para quê, por quanto tempo, e por que ele não mostra aviso de consentimento."
      trilha={[{ nome: "Cookies" }]}
    >
      <div className="px-6 py-16 md:px-8 lg:px-10 lg:py-20">
        <div className="prosa">
          <h2 id="o-que-sao">O que são cookies</h2>
          <p>
            Cookies são pequenos arquivos que um site grava no seu navegador para lembrar alguma
            coisa entre uma página e outra, como o fato de você já ter entrado com senha. Alguns
            servem só para o site funcionar. Outros servem para medir audiência ou mostrar anúncios,
            e esses só podem ser usados com a sua permissão.
          </p>

          <h2 id="cookies-do-site">Os cookies deste site</h2>
          <p>
            <strong>Quem só visita o site não recebe nenhum cookie da Podoposture.</strong> Existe
            um único cookie próprio, e ele é usado apenas pela equipe da clínica:
          </p>
          <ul>
            <li>
              <strong>podoposture_painel</strong> — mantém a equipe conectada à área em que a clínica
              publica os textos. É necessário para essa área funcionar, só existe depois do login,
              vale por no máximo 8 horas e não pode ser lido por scripts da página.
            </li>
          </ul>
          <p>
            A contagem de visitas, feita pela Vercel, não usa cookie. Os detalhes estão na{" "}
            <Link href="/privacidade#o-que-e-medido">política de privacidade</Link>.
          </p>

          <h2 id="mapa">Cookies de terceiros: o mapa do Google</h2>
          <p>
            A única empresa de fora que pode gravar cookies a partir deste site é o Google, e só
            depois que você pede o mapa. Até o toque em &ldquo;Ver no Google Maps&rdquo;, o disco
            mostra um desenho servido pelo próprio site, e nada é pedido ao Google. Depois do toque,
            o mapa carrega do servidor do Google, que pode gravar e ler cookies próprios para fazer o
            mapa funcionar, guardar preferências e medir o uso do serviço. Quais são e por quanto
            tempo ficam é decisão do Google, descrita na{" "}
            <a href="https://policies.google.com/technologies/cookies?hl=pt-BR" rel="noreferrer">
              política de cookies do Google
            </a>
            .
          </p>
          <p>
            Se você não quiser o mapa, o endereço está escrito ao lado dele, e o link &ldquo;Como
            chegar&rdquo; abre a rota direto no aplicativo de mapas.
          </p>

          <h2 id="sem-aviso">Por que não há aviso de cookies</h2>
          <p>
            O guia sobre cookies da Autoridade Nacional de Proteção de Dados (ANPD) diz que cookies
            estritamente necessários não dependem de consentimento, porque sem eles o site não
            funciona. Os outros exigem que a pessoa possa aceitar ou recusar. Aqui, o único cookie
            próprio é necessário, e o único de terceiro só chega depois de um gesto seu. Por isso não
            há nada para aceitar ao entrar, e nenhuma faixa cobre a página.
          </p>

          <h2 id="outros-armazenamentos">Outros dados guardados no navegador</h2>
          <p>
            Na área da clínica, o editor de textos guarda no próprio navegador uma cópia do que está
            sendo escrito, para nada se perder se a página fechar. Isso também só acontece com a
            equipe, nunca com quem visita o site.
          </p>

          <h2 id="como-apagar">Como ver, bloquear ou apagar cookies</h2>
          <p>
            Todo navegador permite ver e apagar os cookies gravados e bloquear os de terceiros. O
            caminho fica nas configurações de privacidade:
          </p>
          <ul>
            <li>
              <a href="https://support.google.com/chrome/answer/95647?hl=pt-BR" rel="noreferrer">
                Chrome
              </a>
            </li>
            <li>
              <a href="https://support.apple.com/pt-br/guide/safari/sfri11471/mac" rel="noreferrer">
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/pt-BR/kb/limpe-cookies-e-dados-de-sites-no-firefox"
                rel="noreferrer"
              >
                Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/pt-br/microsoft-edge/excluir-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                rel="noreferrer"
              >
                Edge
              </a>
            </li>
          </ul>
          <p>Bloquear cookies não impede a leitura de nenhuma página deste site.</p>

          <h2 id="responsavel">Quem é responsável</h2>
          <ResponsavelLegal contato={contato} />
          <p>
            Veja também a <Link href="/privacidade">política de privacidade</Link> e os{" "}
            <Link href="/termos-de-uso">termos de uso</Link>.
          </p>

          <p>
            <em>Texto atualizado em 22 de setembro de 2026.</em>
          </p>
        </div>
      </div>
    </PageShell>
  );
}

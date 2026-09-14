import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";

/**
 * Como o site trata os dados de quem visita.
 *
 * Nasceu junto com a medicao de visitas: num site de saude, passar a contar
 * visitas sem dizer o que e contado seria pedir confianca sem dar motivo. O
 * texto e curto de proposito e so afirma o que o codigo faz — sem cookie de
 * rastreamento (`components/analytics.tsx`), o painel fora da medicao, o
 * resumo diario podado em 3 anos (`lib/numeros-db.ts`), e o IP de quem tenta
 * entrar apagado por `podarDadosDoPainel` (`lib/painel-db.ts`), que a coleta da
 * noite chama. Mudou uma dessas pecas, este texto muda junto, e a data do fim
 * tambem.
 *
 * O paragrafo do painel diz que a limpeza depende da tarefa diaria de proposito:
 * ela e que garante o prazo sem trafego, e prometer um prazo que so vale
 * quando alguem usa o painel seria prometer o que o codigo nao cumpre.
 *
 * Pagina estatica, sem leitura de banco: nao ha o que possa derruba-la.
 */

const DESCRICAO =
  "O que o site da Podoposture mede sobre as visitas, o que não mede e por quanto tempo esses números ficam guardados.";

export const metadata: Metadata = {
  title: "Privacidade",
  description: DESCRICAO,
  alternates: { canonical: "/privacidade" },
};

export default function Privacidade() {
  return (
    <PageShell
      tipo="institucional"
      titulo="Privacidade"
      subtitulo="O que este site mede sobre as visitas, o que ele não mede e por quanto tempo esses números ficam guardados."
      trilha={[{ nome: "Privacidade" }]}
    >
      <div className="px-6 py-16 md:px-8 lg:px-10 lg:py-20">
        <div className="prosa">
          <h2>O que é medido</h2>
          <p>
            Para saber se os textos do blog são lidos e como as pessoas chegam até a clínica, o
            site conta as visitas de forma agregada. Em cada página aberta são registrados:
          </p>
          <ul>
            <li>o endereço da página aberta;</li>
            <li>o site de onde a pessoa veio, quando ele é informado (por exemplo, o Google ou o Instagram);</li>
            <li>o país e o tipo de aparelho (celular, computador ou tablet);</li>
            <li>o navegador e o sistema do aparelho.</li>
          </ul>
          <p>
            Essa contagem é feita pela Vercel, empresa que hospeda o site. Também usamos o Google
            Search Console, que informa quais buscas no Google mostraram o site e quantos cliques
            ele recebeu. Esses números chegam somados, sem dizer quem fez cada busca.
          </p>

          <h2>O que não é medido</h2>
          <ul>
            <li>
              <strong>Não há cookie de rastreamento nem de publicidade.</strong> A visita é contada
              sem cookie de terceiros e sem cadastro.
            </li>
            <li>
              <strong>Ninguém é identificado.</strong> Na contagem de visitas não registramos nome,
              e-mail, telefone, endereço de IP nem o caminho que uma pessoa específica fez no site.
              Para não contar a mesma visita duas vezes, a Vercel calcula um código a partir do
              próprio acesso e o descarta em 24 horas.
            </li>
            <li>
              <strong>Não seguimos ninguém em outros sites</strong>, e os números não são vendidos
              nem usados para anúncios.
            </li>
            <li>
              A área em que a clínica publica os textos fica fora da contagem. O único cookie do
              site é o de acesso a essa área, usado só pela equipe da clínica. Quem tenta entrar
              nela tem o endereço de IP guardado, só para segurança, em dois lugares: na contagem de
              tentativas de senha, apagada uma hora depois, e no registro das ações dessa área, que
              guarda as 2.000 mais recentes — nesse registro o endereço fica até sair pelas 2.000,
              o que pode levar bem mais de uma hora. A limpeza dos dois é feita uma vez por dia pela
              tarefa automática do site; se ela não estiver ligada, a limpeza acontece na próxima
              vez que alguém usar essa área.
            </li>
          </ul>

          <h2>Por quanto tempo fica guardado</h2>
          <p>
            A Vercel mantém os registros de visitas por até 12 meses, e o Google mantém os números
            de busca por 16 meses. Para comparar um ano com o outro, o site guarda um resumo por dia
            — quantas páginas foram abertas, de onde vieram, quais buscas trouxeram gente — sem
            nenhum dado de pessoa. Esse resumo é apagado depois de 3 anos.
          </p>

          <h2>Dúvidas</h2>
          <p>
            Se quiser saber mais sobre como o site trata esses dados, fale com a clínica pela
            página de <Link href="/contato">contato</Link>. As políticas das empresas envolvidas
            estão em{" "}
            <a href="https://vercel.com/docs/analytics/privacy-policy" rel="noreferrer">
              privacidade da Vercel
            </a>{" "}
            e{" "}
            <a href="https://policies.google.com/privacy?hl=pt-BR" rel="noreferrer">
              privacidade do Google
            </a>
            .
          </p>

          <p>
            <em>Texto atualizado em 14 de setembro de 2026.</em>
          </p>
        </div>
      </div>
    </PageShell>
  );
}

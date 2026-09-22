import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ResponsavelLegal } from "@/components/responsavel-legal";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { derivarContato } from "@/lib/site";

/**
 * Politica de privacidade do site, nos termos da LGPD (Lei 13.709/2018).
 *
 * Nasceu junto com a medicao de visitas: num site de saude, passar a contar
 * visitas sem dizer o que e contado seria pedir confianca sem dar motivo. O
 * texto so afirma o que o codigo faz — sem cookie de rastreamento
 * (`components/analytics.tsx`), o painel fora da medicao, o resumo diario
 * podado em 3 anos (`lib/numeros-db.ts`), o IP de quem tenta entrar apagado
 * por `podarDadosDoPainel` (`lib/painel-db.ts`), que a coleta da noite chama,
 * e o mapa do Google montado so no clique (`components/mapa-sob-demanda.tsx`).
 * Mudou uma dessas pecas, este texto muda junto, e a data do fim tambem.
 *
 * O paragrafo do painel descreve as duas vias da limpeza como o codigo as faz:
 * a tarefa diaria (`podarDadosDoPainel`) e, sem ela, a primeira acao do painel
 * depois de 24 h da ultima poda (`podarSeVenceu`, marca no banco). A frase
 * antiga dizia "na proxima vez que alguem usar essa area", mas a poda rodava a
 * cada 100 gravacoes contadas em memoria, e em serverless isso quase nunca
 * acontecia. E diz o atraso que cada via da: ate um dia com a tarefa, e sem
 * ela ate o proximo uso do painel, que pode ser semanas depois.
 *
 * 2026-09-22: virou a politica completa. Entraram o que o art. 9 da LGPD pede
 * e faltava (quem responde, finalidade e base legal de cada uso, com quem se
 * compartilha, transferencia para fora do pais) e os direitos do art. 18 com o
 * caminho para exerce-los. As secoes que ja existiam ficaram como estavam.
 * Os h2 tem id para que as outras paginas legais apontem direto para eles.
 */

const DESCRICAO =
  "Quem cuida dos dados no site da Podoposture, o que é medido nas visitas, com quem os dados são compartilhados, por quanto tempo ficam guardados e como pedir acesso ou exclusão.";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: DESCRICAO,
  alternates: { canonical: "/privacidade" },
};

export default async function Privacidade() {
  const contato = derivarContato((await lerConteudoDoSite()).contato);

  return (
    <PageShell
      tipo="institucional"
      titulo="Política de privacidade"
      subtitulo="Quem cuida dos dados neste site, o que ele mede, com quem compartilha, por quanto tempo guarda e como você pede acesso ou exclusão."
      trilha={[{ nome: "Privacidade" }]}
    >
      <div className="px-6 py-16 md:px-8 lg:px-10 lg:py-20">
        <div className="prosa">
          <h2 id="em-resumo">Em resumo</h2>
          <ul>
            <li>O site não tem cadastro nem formulário: ele não pede seu nome, e-mail ou telefone.</li>
            <li>As visitas são contadas de forma agregada, sem cookie e sem identificar ninguém.</li>
            <li>
              O mapa do Google só carrega quando você pede. Até lá, nenhum cookie de outra empresa
              entra no seu navegador.
            </li>
            <li>
              Quando você fala com a clínica por WhatsApp, telefone ou e-mail, o que você contar é
              usado só para responder e cuidar do seu atendimento.
            </li>
            <li>Nenhum dado é vendido nem usado para anúncios.</li>
          </ul>

          <h2 id="responsavel">Quem é responsável</h2>
          <ResponsavelLegal contato={contato} />
          <p>
            Esse mesmo e-mail é o canal para exercer os direitos descritos mais abaixo, fazer uma
            reclamação ou tirar dúvidas sobre como seus dados são tratados. Quem responde é a própria
            responsável pela clínica.
          </p>

          <h2 id="o-que-e-medido">O que é medido</h2>
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

          <h2 id="o-que-nao-e-medido">O que não é medido</h2>
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
              próprio site é o de acesso a essa área, usado só pela equipe da clínica. Quem tenta entrar
              nela tem o endereço de IP guardado, só para segurança, em dois lugares: na contagem de
              tentativas de senha, que guarda cada tentativa por uma hora, e no registro das ações
              dessa área, que guarda as 2.000 mais recentes — nesse registro o endereço fica até sair
              pelas 2.000, o que pode levar bem mais de uma hora. Uma limpeza apaga as tentativas com
              mais de uma hora e as ações além das 2.000. Ela roda uma vez por dia pela tarefa
              automática do site; se a tarefa não estiver ligada, roda na primeira ação feita nessa
              área depois de 24 horas da última limpeza. Por isso o que já passou do prazo fica
              guardado até a limpeza seguinte: no máximo um dia a mais com a tarefa ligada; sem ela,
              até a próxima vez que essa área for usada.
            </li>
          </ul>

          <h2 id="mapa">O mapa do Google</h2>
          <p>
            Nas páginas com o endereço da clínica, o disco do mapa mostra primeiro um desenho feito
            com dados do OpenStreetMap, servido pelo próprio site. O Google Maps só é carregado se
            você tocar em &ldquo;Ver no Google Maps&rdquo;. A partir daí o Google recebe seu acesso e
            pode gravar cookies próprios, conforme a política dele. O mesmo vale para o link
            &ldquo;Como chegar&rdquo;, que abre o Google Maps fora do site. Os detalhes estão na{" "}
            <Link href="/cookies">política de cookies</Link>.
          </p>

          <h2 id="contato">Quando você fala com a clínica</h2>
          <p>
            Para marcar consulta ou tirar dúvidas, o site oferece WhatsApp, telefone e e-mail. Nesses
            canais você decide o que enviar: normalmente nome, telefone e o motivo do contato. A
            clínica usa essas informações para responder e organizar o atendimento, e não as usa
            para propaganda sem que você peça.
          </p>
          <p>
            Informações de saúde, como sintomas, exames e histórico, são dados sensíveis pela lei.
            A clínica só as trata para cuidar da sua saúde, dentro do sigilo profissional da
            fisioterapia. Se preferir, deixe esses detalhes para a consulta. O WhatsApp é um serviço
            da Meta e segue a política de privacidade dela.
          </p>

          <h2 id="bases-legais">Para que os dados são usados e com qual base legal</h2>
          <ul>
            <li>
              <strong>Contagem de visitas e números de busca:</strong> entender o alcance do site e
              melhorar os textos. Base: legítimo interesse da clínica (art. 7º, IX, da LGPD), com
              dados agregados e sem identificar ninguém.
            </li>
            <li>
              <strong>Endereço de IP de quem tenta entrar na área da clínica:</strong> proteger o site
              contra tentativas de invasão. Base: legítimo interesse (art. 7º, IX).
            </li>
            <li>
              <strong>Mensagens enviadas por WhatsApp, telefone ou e-mail:</strong> responder e
              agendar a pedido de quem escreveu. Base: procedimentos preliminares a um atendimento
              solicitado pelo próprio titular (art. 7º, V).
            </li>
            <li>
              <strong>Informações de saúde contadas nesses canais ou na consulta:</strong> cuidar da
              saúde de quem as enviou. Base: tutela da saúde, em procedimento realizado por
              profissional de saúde (art. 11, II, &ldquo;f&rdquo;).
            </li>
          </ul>

          <h2 id="compartilhamento">Com quem os dados são compartilhados</h2>
          <p>A clínica não vende dados. Eles passam só pelas empresas que fazem o site funcionar:</p>
          <ul>
            <li>
              <strong>Vercel</strong>: hospeda o site e faz a contagem de visitas;
            </li>
            <li>
              <strong>Neon</strong>: guarda o banco de dados do site, onde ficam os textos publicados e
              o registro de segurança da área da clínica, em servidores em São Paulo;
            </li>
            <li>
              <strong>Google</strong>: informa os números de busca (Search Console) e, se você pedir,
              mostra o mapa;
            </li>
            <li>
              <strong>Meta</strong>: dona do WhatsApp, quando você escolhe esse canal.
            </li>
          </ul>
          <p>
            Fora isso, dados só são entregues a autoridades quando a lei obriga.
          </p>

          <h2 id="transferencia-internacional">Transferência para fora do Brasil</h2>
          <p>
            A Vercel e o Google processam dados em servidores fora do Brasil, principalmente nos
            Estados Unidos. Essa transferência segue o art. 33 da LGPD, com as garantias contratuais
            de proteção de dados que esses fornecedores oferecem aos clientes.
          </p>

          <h2 id="por-quanto-tempo">Por quanto tempo fica guardado</h2>
          <p>
            A Vercel mantém os registros de visitas por até 12 meses, e o Google mantém os números
            de busca por 16 meses. Para comparar um ano com o outro, o site guarda um resumo por dia
            — quantas páginas foram abertas, de onde vieram, quais buscas trouxeram gente — sem
            nenhum dado de pessoa. Esse resumo é apagado depois de 3 anos.
          </p>
          <p>
            As conversas de agendamento ficam guardadas enquanto servem ao atendimento. O que vira
            parte do seu registro clínico segue os prazos de guarda que as normas da fisioterapia
            exigem.
          </p>

          <h2 id="seus-direitos">Seus direitos</h2>
          <p>Pela LGPD (art. 18), você pode pedir à clínica, a qualquer momento:</p>
          <ul>
            <li>a confirmação de que ela trata dados seus, e acesso a eles;</li>
            <li>a correção de dados incompletos, errados ou desatualizados;</li>
            <li>
              a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou
              tratados em desacordo com a lei;
            </li>
            <li>a portabilidade dos dados para outro fornecedor;</li>
            <li>a informação sobre com quem seus dados foram compartilhados;</li>
            <li>
              a eliminação de dados tratados com seu consentimento, e a revogação desse consentimento.
            </li>
          </ul>
          <p>
            Para pedir, escreva para <a href={`mailto:${contato.email}`}>{contato.email}</a>. A
            clínica pode pedir alguma confirmação de identidade antes de entregar dados, para não
            entregá-los a outra pessoa. O acesso completo é respondido em até 15 dias. Se você
            achar que seu pedido não foi atendido, pode reclamar à Autoridade Nacional de Proteção
            de Dados (<a href="https://www.gov.br/anpd/" rel="noreferrer">ANPD</a>).
          </p>

          <h2 id="seguranca">Segurança</h2>
          <p>
            O site só funciona com conexão criptografada (HTTPS). A área da clínica exige senha,
            limita tentativas seguidas e usa um cookie de acesso que o navegador não expõe a
            scripts e que vale por no máximo 8 horas. Nenhum sistema é invulnerável, mas, se
            houver um incidente que possa trazer risco a alguém, a clínica avisa as pessoas
            afetadas e a ANPD, como a lei pede.
          </p>

          <h2 id="criancas">Crianças e adolescentes</h2>
          <p>
            O site é informativo e não coleta dados de ninguém, de nenhuma idade. O agendamento
            de crianças e adolescentes é feito pelos pais ou responsáveis.
          </p>

          <h2 id="mudancas">Mudanças neste texto</h2>
          <p>
            Quando o site mudar a forma de tratar dados, este texto muda junto, e a data abaixo
            também. Veja também os <Link href="/termos-de-uso">termos de uso</Link> e a{" "}
            <Link href="/cookies">política de cookies</Link>.
          </p>

          <h2 id="duvidas">Dúvidas</h2>
          <p>
            Se quiser saber mais sobre como o site trata esses dados, fale com a clínica pela
            página de <Link href="/contato">contato</Link>. As políticas das empresas envolvidas
            estão em{" "}
            <a href="https://vercel.com/docs/analytics/privacy-policy" rel="noreferrer">
              privacidade da Vercel
            </a>
            ,{" "}
            <a href="https://neon.com/privacy-policy" rel="noreferrer">
              privacidade da Neon
            </a>{" "}
            e{" "}
            <a href="https://policies.google.com/privacy?hl=pt-BR" rel="noreferrer">
              privacidade do Google
            </a>
            .
          </p>

          <p>
            <em>Texto atualizado em 22 de setembro de 2026.</em>
          </p>
        </div>
      </div>
    </PageShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ResponsavelLegal } from "@/components/responsavel-legal";
import { lerConteudoDoSite } from "@/lib/conteudo-do-site";
import { derivarContato } from "@/lib/site";

/**
 * Termos de uso do site.
 *
 * O site e' vitrine e blog: nao vende, nao cadastra e nao agenda por conta
 * propria, entao os termos sao curtos e tratam do que de fato acontece aqui —
 * o conteudo de saude e' informativo, o agendamento sai por canais de fora,
 * os textos e as fotos tem dono. O aviso de saude vem primeiro de proposito:
 * e' o ponto que mais importa para quem le um blog sobre dor.
 *
 * Foro: a comarca da clinica, ressalvado o direito do consumidor de processar
 * no proprio domicilio (CDC, art. 101, I), porque clausula que o tirasse
 * seria nula de qualquer jeito.
 */

const DESCRICAO =
  "As regras de uso do site da Podoposture: caráter informativo do conteúdo de saúde, agendamento, direitos sobre textos e imagens, e responsabilidades.";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: DESCRICAO,
  alternates: { canonical: "/termos-de-uso" },
};

export default async function TermosDeUso() {
  const contato = derivarContato((await lerConteudoDoSite()).contato);

  return (
    <PageShell
      tipo="institucional"
      titulo="Termos de uso"
      subtitulo="As regras para usar este site: o que o conteúdo é e o que ele não é, como marcar consulta, e o que pode ser feito com os textos e as imagens."
      trilha={[{ nome: "Termos de uso" }]}
    >
      <div className="px-6 py-16 md:px-8 lg:px-10 lg:py-20">
        <div className="prosa">
          <h2 id="responsavel">Quem mantém o site</h2>
          <ResponsavelLegal contato={contato} />
          <p>
            Ao navegar pelo site, você concorda com estes termos. Se não concordar com algum ponto,
            basta não usar o site, ou falar com a clínica pelo e-mail acima.
          </p>

          <h2 id="conteudo-de-saude">O conteúdo não substitui uma consulta</h2>
          <p>
            Os textos, as páginas de tratamento e os artigos do blog são informativos e educativos.
            Eles explicam como a clínica trabalha e ajudam a entender queixas comuns, mas não
            fazem diagnóstico, não prescrevem tratamento e não substituem a avaliação individual
            por um profissional de saúde. Cada caso tem a sua história: não comece, mude nem
            interrompa um tratamento com base só no que leu aqui.
          </p>
          <p>
            <strong>
              Em uma emergência, não espere resposta do site nem das mensagens: ligue para o SAMU,
              no 192, ou procure o pronto-socorro mais próximo.
            </strong>
          </p>
          <p>
            Os resultados descritos no site variam de pessoa para pessoa e não são promessa de
            resultado.
          </p>

          <h2 id="agendamento">Agendamento e atendimento</h2>
          <p>
            O site não marca consultas sozinho. O agendamento é feito por WhatsApp, telefone ou
            e-mail, direto com a clínica, e só fica confirmado quando a clínica responde. Valores,
            horários e condições de atendimento são combinados nesse contato. O WhatsApp é um
            serviço da Meta, com termos próprios.
          </p>

          <h2 id="propriedade-intelectual">Textos, imagens e marca</h2>
          <p>
            Os textos, as fotos, as ilustrações, a marca Podoposture e o desenho do site pertencem
            à clínica ou são usados com autorização, e são protegidos pela Lei de Direitos Autorais
            (Lei 9.610/1998) e pela Lei de Propriedade Industrial (Lei 9.279/1996).
          </p>
          <p>
            Você pode compartilhar o endereço de qualquer página e citar trechos curtos, com o nome
            da Podoposture e o link para o texto original. Copiar textos inteiros, reproduzir imagens
            ou usar a marca em outro lugar depende de autorização por escrito da clínica.
          </p>

          <h2 id="uso-do-site">Uso do site</h2>
          <p>Ao usar o site, você se compromete a não:</p>
          <ul>
            <li>tentar acessar a área restrita da clínica ou qualquer parte do site sem permissão;</li>
            <li>
              sobrecarregar o site de propósito, ou copiar seu conteúdo em massa por meio de
              programas automáticos;
            </li>
            <li>usar o site ou os contatos da clínica para enviar propaganda ou conteúdo ilícito.</li>
          </ul>

          <h2 id="links-externos">Links para outros sites</h2>
          <p>
            O site aponta para serviços de outras empresas, como WhatsApp, Google Maps, Instagram e
            Facebook. Eles têm termos e políticas de privacidade próprios, e a clínica não responde
            pelo conteúdo nem pelo funcionamento deles.
          </p>

          <h2 id="disponibilidade">Disponibilidade e responsabilidade</h2>
          <p>
            A clínica cuida para que o site fique no ar e com informações corretas e atualizadas,
            mas ele pode sair do ar por manutenção ou por falhas de terceiros, e algum dado pode
            ficar desatualizado entre uma revisão e outra. Se encontrar um erro, avise pelo e-mail
            acima. Nada nestes termos afasta os direitos que o Código de Defesa do Consumidor
            garante a você.
          </p>

          <h2 id="privacidade">Privacidade e cookies</h2>
          <p>
            Como o site trata dados pessoais está na{" "}
            <Link href="/privacidade">política de privacidade</Link>, e os cookies estão descritos
            na <Link href="/cookies">política de cookies</Link>. As duas fazem parte destes termos.
          </p>

          <h2 id="mudancas">Mudanças nestes termos</h2>
          <p>
            Os termos podem ser atualizados quando o site mudar. A versão que vale é sempre a
            publicada nesta página, com a data abaixo.
          </p>

          <h2 id="lei-e-foro">Lei aplicável e foro</h2>
          <p>
            Estes termos seguem a lei brasileira, em especial o Marco Civil da Internet (Lei
            12.965/2014), a Lei Geral de Proteção de Dados (Lei 13.709/2018) e o Código de Defesa
            do Consumidor (Lei 8.078/1990). Fica eleito o foro da comarca do Rio de Janeiro/RJ,
            sem prejuízo do seu direito, como consumidor, de propor ação no foro do seu domicílio.
          </p>

          <p>
            <em>Texto atualizado em 22 de setembro de 2026.</em>
          </p>
        </div>
      </div>
    </PageShell>
  );
}

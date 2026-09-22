import { IDENTIDADE_LEGAL, type ContatoDoSite } from "@/lib/site";

/**
 * O paragrafo "quem responde por este site", igual nas tres paginas legais
 * (privacidade, cookies e termos). O contato vem do cadastro que o painel
 * edita; razao social e CNPJ vem de `IDENTIDADE_LEGAL` e so aparecem quando
 * preenchidos.
 */
export function ResponsavelLegal({ contato }: { contato: ContatoDoSite }) {
  const { razaoSocial, cnpj } = IDENTIDADE_LEGAL;
  const identificacao = [razaoSocial, cnpj && `CNPJ ${cnpj}`].filter(Boolean).join(", ");
  const { endereco, email, responsavel } = contato;

  return (
    <p>
      O site é mantido pela clínica Podoposture
      {identificacao && ` (${identificacao})`}, sob a responsabilidade de{" "}
      {responsavel.nome}, com endereço na {endereco.completo.replace(/, Brasil$/, "")}. Para
      qualquer assunto sobre seus dados ou sobre estes textos, escreva para{" "}
      <a href={`mailto:${email}`}>{email}</a>.
    </p>
  );
}

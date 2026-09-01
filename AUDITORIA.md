# Auditoria do site atual — podoposture.com.br

Levantamento de 2026-09-01. Site em GoDaddy Website Builder.
Estes itens **não entram no redesign da homepage**. São defeitos que sobrevivem à troca de
design e precisam de decisão ou de correção no site de origem.

---

## 1. Footer com ano errado

- Footer exibe `Copyright © 2020 podoposture.com.br`.
- Seis anos desatualizado.

## 2. Links sociais malformados

Dois dos quatro links sociais não abrem o destino.

| Rede | URL no site | Estado |
|---|---|---|
| Facebook | `https://www.facebook.com/1761419930738285` | funciona |
| Instagram | `https://www.instagram.com/podoposture/` | funciona |
| LinkedIn | `https://www.linkedin.com/linkedin.com/in/claudia-m-b-oliveira-79312937` | domínio duplicado no caminho |
| Pinterest | `https://www.pinterest.com/ttps://br.pinterest.com/pin/571323902725564321/?autologin=true ` | `https` truncado para `ttps`, colado dentro de outro domínio, com espaço no fim |

- Os dois links quebrados aparecem duas vezes cada: seção "Ligue-se a nós" e footer.
- O link do Pinterest aponta para um pin, não para o perfil.

## 3. "Get directions" é botão de JS, sem destino

- O controle sobre o mapa, na seção Converse com a Podoposture, é um `<button>` sem `href`.
- Não é link: não abre em nova aba, não pode ser copiado, não aparece para crawler e não
  funciona com JavaScript desligado.
- O equivalente correto é um link para
  `https://www.google.com/maps/dir/?api=1&destination=<endereço>`.
- O mesmo vale para a navegação do menu: os 4 grupos abrem por `<button>`, o que é adequado,
  mas os 20 destinos finais são links e estão corretos.

## 4. Interface em inglês

Rótulos gerados pelo builder, não traduzidos, num site em português:

- `More` — botão que abre o resto do menu principal
- `Show More` — paginação da listagem de blog
- `Continue Reading` — chamada de cada post, 10 ocorrências
- `Categories` / `All Posts` — sidebar do blog
- `Get directions` — botão sobre o mapa
- `This website uses cookies.` + `We use cookies to analyze website traffic and optimize your website experience. By accepting our use of cookies, your data will be aggregated with all other user data.` + `Decline` / `Accept` — banner de cookies inteiro
- `image0` … `image15` — texto alternativo das 16 imagens da galeria
- `Facebook Social Link`, `Instagram Social Link`, `LinkedIn Social Link`, `Pinterest Social Link` — rótulo acessível dos ícones
- `og:locale` declarado como `en_US`

## 5. Headings duplicados no HTML

O builder não remove o heading anterior quando o texto é editado. Ele acrescenta um irmão e
esconde os antigos por CSS. A tela mostra um título; o DOM carrega três.

**Cards de tratamento (3 cards, 3 `<h4>` cada):**

| Card | Visível | Oculto | Oculto |
|---|---|---|---|
| 1 | Tratamento da Dor Lombar | Tratamento do Zumbido, Bruxismo, Cefaleias e DTMs | Tratamento da Dor Crônica |
| 2 | Tratamento da Dor Crônica | Tratamento do Zumbido, Bruxismo, Cefaleias e DTMs | Tratamento da Dor Crônica |
| 3 | Tratamento do Zumbido, Bruxismo, Cefaleias e DTMs | — | — |

**Cards de serviço (12 cards, 3 `<h3>` cada).** Exemplo:

```html
<div>
  <h3>OSTEOPATIA</h3>
  <h3>FLEXO-DISTRAÇÃO</h3>
  <h3>FLEXO-DISTRAÇÃO</h3>
</div>
```

**Hero.** A headline `Integração terapêutica efetiva, inovadora com resultados rápidos e
eficazes` aparece 8 vezes no HTML servido: 4 cópias por bloco (`<h1>` + 3 `<span>`), e o bloco
existe duas vezes, desktop e mobile.

**Consequências:**

- Leitor de tela anuncia três títulos por card, dois deles com o nome de outro serviço.
- Os headings duplicados usam `role="heading" aria-level="NaN"`. `NaN` não produz nível válido.
- Crawler lê hierarquia quebrada e conteúdo repetido.
- A página tem 68 elementos `h1`–`h6`, dos quais 31 são cópias ocultas.

## 6. Parágrafos vazios como espaçador

`<p></p>` repetido para criar altura. Contagem por card: Acupuntura 8, Palmilhas 3, DTM 4,
Zumbido 3, Baropodometria 1, Posturologia 1, Flexo-distração 1, RPG 1, Neuromodulação 1,
Avaliação Clínica 1.

## 7. Ausência de foto da responsável técnica

- Não existe retrato da Dra. Claudia Meirelles em nenhuma parte do site.
- O arquivo nomeado `Dra. Claudia Meirelles.png` no CDN é uma peça gráfica de post de blog
  sobre tratamento de zumbido, não uma fotografia dela.
- A seção "Responsável Técnica" e a página `/currículo-profissional` sustentam a credencial
  só por texto.
- Decisão pendente do cliente: fornecer foto ou manter a seção sem rosto.

## 8. Acervo de imagem no teto

- Largura nativa máxima em todo o acervo: **1254px**.
- O CDN `img1.wsimg.com/isteam/` não entrega resolução maior. Testado com `/:/rs=w:4000` e com
  a URL sem transformação: as duas devolvem o original.
- Três dos seis slides do hero têm tarja chapada dentro do quadro. `DOR LOMBAR (20)` tem
  1080×1080 nominais e 1080×591 de faixa útil.
- Sete das 16 imagens da galeria são peças de marketing com texto embutido, não fotografia.
- Decisão pendente do cliente: fornecer fotografia nova da clínica, ou aceitar hero por
  composição gráfica.

## 9. Travessão na copy (recomendação, não alteração)

O texto do cliente permanece como está. Fica registrado como recomendação editorial para uma
revisão futura de copy, se houver.

Ocorrências de travessão ou meia-risca no corpo do site:

- `(Copacabana – Rio de Janeiro)` — seção Bem-vindo(a)
- `estímulos leves —elétricos, luminosos ou auditivos — para modular o sistema nervoso` — card
  Neuromodulação. O primeiro travessão está colado na palavra seguinte, sem espaço.
- `Bruxismo e Apertamento Dentário — com abordagem integrativa e neurofuncional` — card DTM
- `Tratamento do Zumbido ... da ATM, com abordagem integrativa e neurofisiológica` — variações
  do mesmo padrão nos cards de Zumbido e Acupuntura

Recomendação: reescrever a frase ou usar ponto e vírgula. O travessão em copy de site tende a
virar hífen em fonte que não tem o glifo, e o par de travessões abre um aposto que a leitura em
tela raramente fecha.

## 10. Outros

- Dois verdes divergentes em uso: logo `#96BF0D`, site `#92B30A`.
- O azul `#0E71B4`, cor dominante do logo, não aparece em nenhum outro ponto do site.
- Menu principal tem 20 itens em lista corrida; no desktop cabem 3 antes do botão `More`.
- Widget de chat do GoDaddy fixo sobre o conteúdo, canto inferior direito.
- Selo `Powered by GoDaddy` no footer.
- A listagem completa do blog, com sidebar de categorias e paginação, está embutida na
  homepage.

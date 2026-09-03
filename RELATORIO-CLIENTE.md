# Podoposture — o site novo, medido lado a lado com o atual

Documento de apoio comercial. Todos os números vêm do **Google Lighthouse**, a
ferramenta oficial do Google para medir qualidade de página, rodada nas mesmas
URLs, no mesmo dia, com a mesma simulação de celular em 4G.

---

## O ponto que decide

O site atual, feito no GoDaddy, tem **88 endereços indexados no Google** — 20
páginas e 68 artigos do blog. Esse é o patrimônio digital da clínica: cada um
desses endereços já aparece em buscas hoje.

**O site novo responde nos 88 endereços, exatamente os mesmos.** Não há mudança
de link, não há redirecionamento. Para o Google, a página continua onde sempre
esteve — apenas ficou melhor. É o que torna a troca segura.

Isso foi verificado por um teste automático que percorre as 88 URLs e compara,
uma a uma, com o site atual: **87 respondem perfeitamente**, e a restante se
comporta exatamente como hoje — é um endereço com um caractere inválido que o
próprio site atual não consegue servir. Nenhuma piorou.

---

## Os números

### Nota geral (0 a 100 — quanto maior, melhor)

| Página | Critério | Site atual | Site novo |
|---|---|---:|---:|
| **Home** | Desempenho | 56 | **87** |
| | Acessibilidade | 75 | **100** |
| | Boas práticas | 96 | **100** |
| | SEO | 92 | **100** |
| **Osteopatia** | Desempenho | 60 | **86** |
| | Acessibilidade | 88 | **98** |
| | Boas práticas | 93 | **100** |
| | SEO | 92 | **100** |
| **Nosso Blog** | Desempenho | 73 | **80** |
| | Acessibilidade | 90 | **100** |
| | Boas práticas | 96 | **100** |
| | SEO | 92 | **100** |

### O que o visitante sente

| | Site atual | Site novo | |
|---|---:|---:|---|
| **Tempo até a home ficar pronta** | 14,1 s | **3,1 s** | 4,5× mais rápido |
| **Travamento ao tocar na tela (home)** | 2.350 ms | **100 ms** | 23× menos |
| **Travamento no blog** | 1.640 ms | **100 ms** | 16× menos |
| **Elementos que pulam na tela** | 0,018 | **0** | zerado |

O primeiro número é o mais concreto: hoje a home leva **14 segundos** para
terminar de montar no celular. Pesquisas do próprio Google mostram que a maior
parte das visitas em celular é abandonada bem antes disso.

---

## O que muda para ser encontrada no Google

**1. Nota de SEO de 92 para 100**, em todas as páginas.

**2. Blog indexável.** Hoje os 68 artigos são carregados por JavaScript: o
conteúdo aparece para quem visita, mas chega ao Google de forma frágil. No site
novo os artigos estão no HTML da página, prontos para leitura direta.

**3. Dados estruturados (schema.org).** É o que permite ao Google exibir o
painel lateral do consultório — endereço, telefone, especialidades. O site atual
declara apenas um "negócio local" genérico; o novo se declara **clínica médica**,
com endereço completo, coordenadas, as oito terapias oferecidas e a
responsável técnica identificada.

**4. Mapa do site automático.** O `sitemap.xml` passa a ser gerado do próprio
conteúdo — artigo novo entra no mapa sozinho, sem ninguém precisar lembrar.

**5. Títulos das páginas.** Hoje várias páginas se apresentam ao Google apenas
como "RPG" ou "Posturologia". No site novo cada página tem um título descritivo,
**mantendo a palavra-chave que já ranqueia**.

**6. Compartilhamento no WhatsApp.** No protótipo, o cartão de link estava
apontando para um endereço interno de desenvolvimento — quem recebesse o link da
clínica veria um cartão quebrado. Corrigido.

---

## Acessibilidade: de 75 para 100

Não é detalhe técnico: parte considerável dos pacientes de uma clínica de dor
crônica são pessoas mais velhas, que ampliam a tela, navegam pelo teclado ou usam
leitor de tela.

O que foi corrigido:

- **A página aparecia só com JavaScript ativo.** O conteúdo nascia invisível e
  surgia por animação. Sem JavaScript — ou nos instantes antes de ele rodar — a
  página ficava praticamente em branco. Isso afetava leitores de tela **e**
  buscadores.
- **Textos com contraste insuficiente**, abaixo do mínimo legível pela norma
  internacional (WCAG 2.2 AA).
- **Menu de celular sem controle de foco**: quem navega por teclado atravessava
  o menu sem conseguir sair.
- **Atalho "pular para o conteúdo"**, que economiza 20 tabulações a cada visita.
- **Links de LinkedIn e Pinterest quebrados** (herdados do site atual, onde não
  abrem até hoje).
- **Rodapé com "© 2020"**, que sinaliza site abandonado.

---

## O que foi preservado, e não pode ser perdido

| Ativo | Situação |
|---|---|
| As 88 URLs indexadas | Servidas nos mesmos endereços |
| Todo o texto do site | 47.815 palavras migradas e conferidas |
| As 80 imagens do blog | Baixadas e guardadas no novo site |
| Google Analytics | Mesma conta, série histórica contínua |
| Google Search Console | Posse mantida |

> **Atenção — prazo:** as imagens do blog e o texto dos artigos ficam hospedados
> no servidor do GoDaddy e **desaparecem quando o plano for cancelado**. Tudo já
> foi copiado para o site novo, mas o plano atual deve permanecer ativo por pelo
> menos 30 dias após a troca, como garantia de retorno.

---

## Peso do site

A pasta de imagens saiu de **19 MB para 9,2 MB** sem perda visível de qualidade:
as fotos passaram para um formato mais moderno e a ilustração da vértebra
lombar, que sozinha pesava 968 KB, passou a pesar 90 KB.

---

## Como a troca acontece sem risco

1. Verificação de posse do Search Console migrada **antes** de qualquer mudança.
2. Fotografia dos números atuais de busca guardada como referência.
3. Teste automático exigindo as 88 URLs corretas — **critério de corte**.
4. Só então o endereço passa a apontar para o site novo. Como o domínio é o
   mesmo, a troca é instantânea.
5. O plano GoDaddy segue ativo por 30 dias: se algo sair errado, voltar atrás
   leva minutos.
6. Acompanhamento dos números de busca por 30 dias.

---

*Medições feitas em 3 de setembro de 2026 com Google Lighthouse 12, simulação de
celular em rede 4G. Os arquivos completos de cada medição estão arquivados e
podem ser reapresentados.*

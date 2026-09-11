# Jornada — painel de publicação do blog (`/publicar`)

Contrato de fricção. Escrito **antes** do código do painel; o código honra os números
daqui. Se o código estourar um teto, o código muda — não o teto.

## Contexto inferido (sem perguntar)

| O quê | Inferência | Fonte |
|---|---|---|
| Tipo de artefato | Ferramenta de trabalho recorrente, usuária única | pedido do Naif |
| Ação primária | **Publicar um post** | pedido: "pra poder publicar blogs novos" |
| Quem usa | Dra. Claudia Meirelles, fisioterapeuta, ~30 anos de clínica, escreve no Word, não é técnica | pedido + `src/lib/site.ts` (RESPONSÁVEL) |
| Frequência | 2 a 4 vezes por mês | pedido |
| Estética | Já existe e é herdada, não inventada | `src/app/globals.css`, classe `.prosa` |
| Assuntos | 9 temas fechados, 3 deles já usados pelos posts migrados | `src/lib/painel-tipos.ts` |

Não houve pergunta: a ação primária estava explícita no pedido.

## Estágios dominantes

Numa ferramenta que a mesma pessoa reabre todo mês, a chegada quase não existe — ela já
sabe o que é e por que está ali. O peso está no meio e no fim.

| Estágio | Peso | Por quê |
|---|---|---|
| **Ação** (escrever e publicar) | **dominante** | É o que ela veio fazer, e é onde ela pode perder trabalho |
| **Avaliação** (ver como vai ficar) | **dominante** | Ela não conhece Markdown; sem ver o resultado, não tem como confiar no que escreveu |
| Descoberta | leve | Endereço passado uma vez; não há descoberta a cada visita |
| Atração | não se aplica | Usuária cativa: não há decisão de "vale a pena?" |
| Recomendação | vira **loop de retorno** | Ela volta 2-4×/mês; a tela de entrada depois do login é a lista do que já existe, com "Escrever post" como ação dominante |

## Friction budget

### Tarefa primária 1 — publicar um post do zero

Interações contadas como cliques e escolhas discretas; digitar o texto do artigo não conta.

- Interações até publicar: **≤ 6**
- Campos obrigatórios: **≤ 3** (título, tema, texto — o resumo se preenche sozinho a partir do texto quando ela deixa em branco)
- Decisões por tela: **≤ 2**
- Becos sem saída: **0**
- Espera sem feedback: **0**
- Termos novos por tela: **≤ 1** (apenas "rascunho")
- CTA primário: maior alvo da tela, **≥ 44px**

### Tarefa primária 2 — entrar

- Interações até entrar: **≤ 2**
- Campos obrigatórios: **1**
- Espera sem feedback: **0**

## Onde ela trava ou perde trabalho

Os cinco pontos que o código precisa cobrir, em ordem de dano:

1. **Colar do Word e perder tudo.** É o cenário real: ela escreve no Word e cola. Numa
   caixa de texto comum, negrito, títulos e listas somem e ela teria que remarcar tudo à
   mão. O painel intercepta a colagem, lê a versão formatada da área de transferência e
   converte para o formato do post. Sem isto, o painel é inutilizável para ela.

2. **A sessão vencer no meio do texto.** A sessão dura 8 horas; um texto longo escrito ao
   longo do dia pode atravessar o fim dela. O rascunho é salvo no próprio navegador
   enquanto ela escreve, e a mensagem de sessão expirada diz, com todas as letras, que o
   texto **não** se perdeu. *(`ui-ux-pro-max ux: Feedback/Error Recovery` — "Provide clear
   next steps")*

3. **Fechar a aba sem querer.** Aviso do navegador antes de sair com alteração não salva,
   além do rascunho automático.

4. **Imagem recusada sem explicação.** "Erro 413" não diz nada a ela. A mensagem diz o
   que aconteceu e o que fazer: "Imagem grande demais (máximo 3 MB)".

5. **Descobrir o erro só ao publicar.** Os campos avisam ao sair deles, não no envio.
   *(`ui-ux-pro-max ux: Forms/Inline Validation` — "Validate on blur for most fields")*

## Guidelines citadas (do ui-ux-pro-max)

- `ux: Forms/Submit Feedback` **[High]** — carregando → sucesso ou erro; nunca clique mudo.
- `ux: Accessibility/Error Messages` **[High]** — erro anunciado com `role="alert"`, nunca só por cor.
- `ux: Interaction/Confirmation Dialogs` **[High]** — apagar post exige confirmação.
- `ux: Forms/Inline Validation` **[Medium]** — validar ao sair do campo.
- `ux: Feedback/Error Recovery` **[Medium]** — todo erro traz o próximo passo.
- `ux: Forms/Password Visibility` **[Medium]** — botão de mostrar a senha.
- `ux: Feedback/Confirmation Messages` **[Medium]** — sucesso curto e visível, nunca silencioso.
- `ux: Responsive/Image Scaling` **[Medium]** — imagem escala com o contêiner.

## Loop de retorno

```
entrar → lista do que já existe → escrever post → pré-visualizar → publicar
              ↑                                                        │
              └──────────── volta no mês seguinte ─────────────────────┘
                                    │
                          editar um post antigo
```

A tela depois do login é a **lista**, não o formulário vazio: quem volta quer primeiro ver
o que já fez. "Escrever post" é o único botão preenchido da tela.

## Verificação

O budget é numérico para ser contado de verdade no fim, com `webapp-testing`: contar os
cliques do login até o post publicado, conferir que nenhum é mudo, e que o botão principal
é o maior alvo da tela.

---

# Jornada — aba "Página inicial" do painel (`/publicar`)

Contrato de fricção da edição da home. Escrito antes do código da aba; mesma regra de cima:
se o código estourar um teto, o código muda.

## Contexto inferido (sem perguntar)

| O quê | Inferência | Fonte |
|---|---|---|
| Tipo de artefato | Aba de um painel que ela já conhece, usuária única | framing `2026-09-10-podoposture-painel-completo` (ramo C) |
| Ação primária | **Trocar um texto da home e publicar** | pedido: "100% dos textos, listas e imagens da home editáveis" |
| Ação secundária | **Trocar uma foto** | galeria e hero são fotos (`gallery.tsx`, `hero.tsx`) |
| Quem usa | Dra. Claudia Meirelles, a mesma do blog; não é técnica | seção anterior deste arquivo |
| Frequência | Rara: poucas vezes por ano, quando muda um serviço, um horário, uma foto | a home muda bem menos que o blog |
| Risco próprio | A home é a página mais visitada e a mais cara de quebrar; o título do hero tem linhas medidas à mão | framing, evidência E20 |

Não houve pergunta: a ação primária estava explícita no pedido.

## Estágios dominantes

| Estágio | Peso | Por quê |
|---|---|---|
| **Avaliação** (achar o trecho e ver como fica) | **dominante** | São 14 seções; ela precisa achar o texto certo pelo que ele diz, não pelo nome técnico da seção, e ver a home de verdade antes de pôr no ar |
| **Ação** (trocar e publicar) | **dominante** | É onde um erro vai direto para a página mais vista do site |
| Descoberta | leve | A aba mora ao lado de "Seus textos", que ela já usa |
| Atração | não se aplica | Usuária cativa |
| Recomendação | vira **loop de retorno** | Volta meses depois; precisa reencontrar o que mudou e conseguir desfazer |

## Friction budget

### Tarefa primária 1 — trocar um texto e publicar

Contado da aba aberta até a home publicada; digitar o texto novo não conta.

- Interações até publicar: **≤ 5** (escolher a seção → editar o campo → ver a prévia → publicar → confirmar)
- Campos obrigatórios por edição: **1** (o próprio texto que ela está trocando)
- Decisões por tela: **≤ 2**
- Prévia antes de publicar: **obrigatória** — o botão de publicar só existe depois de a prévia ter sido aberta
- Voltar ao texto original: **≤ 2 interações**, por campo, sem precisar lembrar o que estava escrito
- Becos sem saída: **0**
- Espera sem feedback: **0**
- Termos novos por tela: **≤ 1** ("rascunho", o mesmo do blog)
- CTA primário: maior alvo da tela, **≥ 44px**, um único botão preenchido

### Tarefa primária 2 — trocar uma foto

- Interações até publicar: **≤ 6** (seção → escolher foto → confirmar recorte/tamanho → prévia → publicar → confirmar)
- Campos obrigatórios: **≤ 2** (a foto e a descrição dela para quem não enxerga)
- Formatos aceitos sem explicação técnica: foto do celular (inclusive iPhone) e do computador
- Espera sem feedback: **0** (envio mostra "Enviando…" até terminar)

## Onde ela trava ou perde trabalho

1. **Publicar sem ver.** A home é a vitrine; um texto maior que o espaço empurra o título do
   hero para cima das figuras e ninguém percebe até abrir num notebook. Por isso a prévia
   mostra a home inteira com o rascunho, e publicar vem depois dela.
2. **Não achar o texto.** Nome de seção interno ("Método regulador", "Understand first") não
   diz nada a ela. A lista mostra o começo do texto que está no ar.
3. **Não conseguir desfazer.** Todo campo alterado tem "voltar ao texto original" ao lado,
   e o texto original aparece escrito, não só um botão.
4. **Campo medido virar texto livre.** Onde o layout foi medido à mão (título do hero), o
   campo diz o limite de caracteres por linha e avisa antes de passar, não depois.
5. **Foto recusada no iPhone.** O Safari não gera WebP; o envio cai para JPEG sozinho e ela
   nunca vê a palavra "formato".
6. **Sessão vencer no meio.** Mesma promessa do blog: a mensagem diz que nada se perdeu.

## Guidelines citadas (do ui-ux-pro-max)

- `ux: Interaction/Confirmation Dialogs` **[High]** — publicar na home pede confirmação.
- `ux: Animation/Loading States` **[High]** — envio de foto e publicação nunca congelam a tela.
- `ux: Accessibility/Keyboard Navigation` **[High]** — as abas e a lista de seções funcionam só com teclado.
- `ux: Interaction/Success Feedback` **[Medium]** — "Página inicial publicada", visível.
- `ux: Feedback/Confirmation Messages` **[Medium]** — sucesso curto, nunca silencioso.
- `ux: Navigation/Active State` **[Medium]** — a aba e a seção abertas ficam marcadas.
- `ux: Content/Truncation` **[Medium]** — texto longo não quebra o layout da prévia nem da lista.
- `ux: Performance/Image Optimization` **[High]** — a foto é reduzida no navegador antes de subir.

## Loop de retorno

```
aba Página inicial → acha a seção pelo texto → edita → prévia → publica
        ↑                                                         │
        └──── meses depois: vê o que mudou e pode voltar ao original ┘
```

## Verificação

Com `webapp-testing` e o Postgres de teste: contar as interações de "aba aberta" até
"home publicada", conferir que publicar não aparece antes da prévia, que voltar ao original
cabe em 2 interações, e que uma foto JPEG enviada aparece na prévia.

---

# Jornada — aba "Números" do painel (`/publicar`)

## Contexto inferido (sem perguntar)

| O quê | Inferência | Fonte |
|---|---|---|
| Tipo de artefato | Tela de leitura dentro do painel, sem formulário | framing `2026-09-08-podoposture-painel-de-numeros` |
| Pergunta que a tela responde | **"Alguém leu o que eu escrevi, e de onde essa pessoa veio?"** | pedido do painel de números |
| Quem usa | Dra. Claudia; lê número de consulta, não de marketing | seção do blog acima |
| Frequência | **1 vez por mês** | pedido |
| Fonte dos dados | Visitas (Vercel) e buscas no Google (Search Console), coletadas uma vez por dia | framing, evidências E16 e E17 |

## Estágios dominantes

| Estágio | Peso | Por quê |
|---|---|---|
| **Avaliação** (ler e entender) | **dominante** | A tela inteira é leitura; o sucesso é ela sair sabendo responder a pergunta em voz alta |
| **Recomendação** (voltar no mês seguinte) | **dominante**, como loop | Comparar com o mês anterior é o que dá sentido ao número |
| Ação | leve | Não há o que preencher; no máximo trocar o período |
| Descoberta, Atração | não se aplicam | Aba de um painel que ela já usa |

## Friction budget

### Tarefa primária — responder "alguém leu o que escrevi e de onde veio"

- Interações da aba aberta até a resposta: **≤ 1** (abrir a aba; a resposta está no primeiro quadro, sem rolar)
- Campos obrigatórios: **0** (tela sem formulário)
- Decisões por tela: **≤ 1** (o período, com o último mês já escolhido)
- Termos novos por tela: **≤ 1**, explicado no lugar ("visita" = uma pessoa que abriu o site; nada de "sessão", "pageview", "CTR")
- Números sem data de coleta: **0** — todo quadro diz até quando os dados vão
- Estado sem dado sem explicação: **0** — fonte não ligada diz "ainda não ligado" e o que falta, nunca zero
- Becos sem saída: **0**
- Espera sem feedback: **0**
- Cor como única forma de ler um número: **0** (todo gráfico tem o número escrito)

## Onde ela trava

1. **Zero que não é zero.** Fonte sem credencial mostrando "0 visitas" faz ela achar que
   ninguém leu. Sem dado é outro estado, com outra frase.
2. **Número sem comparação.** "312 visitas" sozinho não diz se é bom; o mês anterior vem ao lado.
3. **Jargão de painel de marketing.** Rótulos em linguagem de consultório.
4. **Texto sem nome.** A lista dos mais lidos mostra o título do texto, nunca o endereço cru.
5. **Dado velho sem aviso.** Se a coleta parou, a tela diz desde quando.

## Guidelines citadas (do ui-ux-pro-max)

- `ux: Feedback/Empty States` **[Medium]** — sem dado: mensagem que explica e diz o próximo passo.
- `ux: Content/Number Formatting` **[Low]** — separador de milhar no padrão brasileiro.
- `ux: Content/Date Formatting` **[Low]** — "dados até 9 de setembro", nunca "09/09".
- `ux: Responsive/Table Handling` **[Medium]** — tabela de textos mais lidos cabe no celular.
- `ux: Animation/Loading States` **[High]** — carregando com indicação, nunca tela em branco.

## Loop de retorno

```
abre Números no começo do mês → vê quem leu e de onde veio → escreve o próximo texto
        ↑                                                            │
        └────────────── no mês seguinte compara com este ────────────┘
```

---

# Referências de interface para as abas (frontend-refs)

Tiradas da biblioteca `design-refs` do vault, playbook `product-ui`, e adaptadas aos tokens
de `src/app/globals.css`. Valem para as três abas; nenhuma traz cor ou fonte nova.

| Referência | O que vale aqui |
|---|---|
| `app-shell-container-adaptavel` | Cabeçalho e abas são um invólucro só, em todas as telas depois do login; cada aba só cuida do próprio conteúdo |
| `acento-unico-monocromatico` | O azul (`text-accent`) marca só link e foco; aba selecionada se marca por peso e fio escuro, não por cor |
| `estado-por-elevacao-nao-matiz` | Aba ativa = texto `text-ink-strong` + fio inferior; inativa = `text-muted`; foco de teclado é a única marca colorida |
| `cta-unico-repetido` | Um único botão preenchido (`bg-action`) por tela; o resto é contorno ou link |
| `forms-inputs-consistentes` | Campo da home herda o campo do editor de post: `border-rule`, `bg-paper`, erro em texto com `role="alert"` |
| `empty-state-microfunil` | Vazio diz a causa: sem banco, sem dado ainda, ou fonte não ligada — cada um com a sua frase |
| `motion-orcamento-feedback` | Nada anima sozinho; só resposta a clique e foco, e nada com `prefers-reduced-motion` |

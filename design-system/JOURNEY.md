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

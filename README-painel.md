# Painel do site

Uma página com senha, em `/publicar`, para a clínica cuidar do site sem precisar
de ninguém. Tem três abas:

| Aba | Para quê |
|---|---|
| **Seus textos** | Escrever, publicar, despublicar e apagar textos do blog |
| **Página inicial** | Trocar textos, listas, botões e fotos da home, com prévia antes de publicar |
| **Números** | Ver quantas pessoas leram o site, de onde vieram e quais buscas no Google trouxeram gente |

O endereço não aparece em menu, rodapé nem sitemap, e está bloqueado no
`robots.txt`. Isso evita que ele apareça numa busca, mas **não é o que protege**.
Quem protege é a senha, a sessão assinada pelo servidor e o limite de tentativas.

---

## O que precisa ser configurado (uma vez)

Nada aqui é obrigatório para o site funcionar. **Sem nenhuma variável o site
constrói, serve as 88 URLs, mostra os 68 textos e a página inicial com o texto
de sempre.** Só o painel fica indisponível e os números ficam parados. Isso é de
propósito: a funcionalidade nova não pode derrubar o site por falta de
configuração. A lista completa, com o porquê de cada uma, está em
`.env.example`.

### O que cada variável liga

| Variável | Liga | Sem ela |
|---|---|---|
| `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | A entrada no painel | Ninguém entra; o painel diz que não foi configurado |
| `DATABASE_URL` | Textos novos, imagens enviadas, edição da página inicial, números guardados | O blog mostra os 68 textos e a home mostra o texto padrão; as abas explicam que falta o banco |
| `CRON_SECRET` | A coleta diária dos números (`/api/cron/numeros`) | A coleta recusa todo pedido, inclusive o da Vercel |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (opcional) | Visitas na aba Números | A aba diz "a contagem de visitas ainda não foi ligada", nunca "0 visitas" |
| `GSC_SERVICE_ACCOUNT`, `GSC_SITE_URL` | Buscas no Google na aba Números | A aba diz "as buscas no Google ainda não foram ligadas" |
| `DATA_DA_MIGRACAO` (opcional) | A marca de antes e depois da troca de site no gráfico | O gráfico sai sem marca e diz que a data não foi marcada |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (opcionais) | Aviso quando a coleta falha duas noites seguidas | O aviso fica só na aba Números |
| `PROXY_HOPS` | Limite de tentativas correto fora da Vercel | Na Vercel, deixe vazio |
| `DOMINIO_NO_AR` | Libera os buscadores no dia da troca de DNS | O `robots.txt` bloqueia tudo, de propósito |

### 1. A senha

No computador de quem for configurar, dentro da pasta do projeto:

```bash
npm run senha -- "a senha que a clínica vai usar"
```

Ele imprime duas linhas prontas. Copie as duas para as variáveis de ambiente do
projeto na Vercel (Settings → Environment Variables):

```
ADMIN_PASSWORD_HASH=scrypt.32768.8.1.…
ADMIN_SESSION_SECRET=…
```

A senha em si **não fica guardada em lugar nenhum**, nem no servidor nem no
repositório. O que vai na variável é um resumo criptográfico dela, que não dá
para desfazer. Guarde a senha num gerenciador; para trocá-la depois, rode o
comando de novo e substitua a linha.

### 2. O banco

Qualquer Postgres serve (Neon, Supabase, ou um local). Crie um banco vazio e
ponha a URL de conexão em `DATABASE_URL`. As tabelas se criam sozinhas no
primeiro uso, e não há migração para rodar.

Os 68 textos que vieram do site antigo e o texto padrão da página inicial
**não** ficam neste banco. Eles continuam no próprio repositório, e é isso que
garante que as URLs já indexadas pelo Google não dependam de o banco estar no
ar.

### 3. Os números

1. Ligar **Web Analytics** no projeto da Vercel e fazer um deploy novo. A
   medição só começa a partir desse deploy e não é retroativa.
2. Criar um token com escopo só deste projeto e cadastrar `VERCEL_API_TOKEN` e
   `VERCEL_PROJECT_ID`.
3. No Google Cloud: ativar a Search Console API, criar uma conta de serviço e
   baixar a chave em JSON. Cadastrar o JSON inteiro em `GSC_SERVICE_ACCOUNT`.
4. No Search Console: adicionar o e-mail da conta de serviço como usuário
   (Restrito basta) e cadastrar a propriedade em `GSC_SITE_URL`.
5. Criar `CRON_SECRET` com pelo menos 16 caracteres aleatórios.

A coleta roda todo dia às 6h de Brasília e refaz os últimos 5 dias, para cobrir
noite perdida ou chamada duplicada. Para trazer o histórico uma vez, chame
`/api/cron/numeros?desde=AAAA-MM-DD` com o cabeçalho
`Authorization: Bearer <CRON_SECRET>` e repita com o `proximoDesde` da resposta
até ele vir vazio. Cada chamada traz um lote de 14 dias, até 16 meses para trás.

### 4. Se o site não estiver na Vercel

Só nesse caso, informe quantos proxies confiáveis existem na frente da
aplicação, para o limite de tentativas saber de quem é cada tentativa:

```
PROXY_HOPS=1
```

---

## O que só o dono do projeto na Vercel pode fazer

Nada disto se resolve pelo código nem por quem só tem acesso ao repositório:

1. **Ligar Web Analytics** no projeto (hoje está desligado).
2. **Criar o token de projeto** (`VERCEL_API_TOKEN`) e informar o ID do projeto.
3. **Cadastrar `CRON_SECRET`** e as demais variáveis em Settings → Environment
   Variables. Hoje o projeto não tem nenhuma variável.
4. **Criar e conectar o Postgres** (por exemplo, Neon pelo Marketplace, que
   preenche `DATABASE_URL`). Hoje não há banco ligado ao projeto.
5. **Criar a conta de serviço do Search Console** no Google Cloud e dar a ela
   acesso de leitura à propriedade do domínio. Isso exige também acesso de
   proprietário ao Search Console da clínica.

---

## Como ela usa

### Seus textos

1. Abre `/publicar` e digita a senha.
2. Vê a lista do que já escreveu. O botão preenchido é **Escrever texto**.
3. Preenche título e tema, e cola o texto direto do Word: negrito, títulos e
   listas vêm junto.
4. Usa o botão **Imagem** para inserir fotos no meio do texto, e **Escolher
   capa** para a imagem que aparece na lista do blog.
5. **Ver como vai ficar** mostra o texto com a tipografia real do site.
6. **Publicar no site** deixa no ar na hora. **Guardar como rascunho** salva sem
   publicar.

### Página inicial

1. Escolhe a seção pela lista, que mostra o começo do texto que está no ar.
2. Troca o texto ou a foto. Cada campo diz o limite e mostra o texto original.
3. **Ver como vai ficar** guarda um rascunho e abre a home inteira com a mudança,
   numa aba separada.
4. Só depois da prévia aparece **Publicar no site**, que pede um segundo clique
   em **Confirmar e publicar**. Qualquer mudança depois da prévia esconde o
   botão de novo.
5. **Voltar ao texto original** desfaz o que foi publicado naquela seção.

### Números

Abre a aba e a resposta está no primeiro quadro: quantas pessoas leram, de onde
vieram, os textos mais lidos e as buscas do Google, com o período anterior ao
lado. Todo quadro diz até quando os dados vão.

O que ela escreve ou edita fica guardado no navegador enquanto digita. Se a
sessão vencer ou a aba fechar, nada se perde: depois da senha, o texto ou a
seção reabre sozinho.

---

## O que está protegido, e como

| Risco | O que impede |
|---|---|
| Descobrir o endereço e publicar | Toda rota do painel, leitura incluída, exige sessão válida no **servidor**. A tela nunca é a fechadura |
| Ver o rascunho da home sem senha | A prévia confere a sessão antes de ler qualquer dado; sem ela, manda para a entrada. Sai com `noindex` |
| Descobrir a senha por tentativa | 8 tentativas a cada 15 minutos por origem; a 9ª é recusada |
| Derrubar o site com tentativas | No máximo 2 conferências de senha ao mesmo tempo |
| Ler a senha nas variáveis do servidor | Lá está só o resumo `scrypt`, não a senha |
| Forjar ou esticar a sessão | Cookie assinado com HMAC; qualquer alteração invalida |
| Pedido forjado de outro site | Cookie `SameSite=Strict` mais conferência de procedência |
| Chamar a coleta de fora e gastar a cota ou sujar o banco | `/api/cron/numeros` exige `CRON_SECRET`, comparado em tempo constante; sem o segredo configurado, ninguém passa |
| Texto ou botão da home quebrar a página | O servidor valida cada seção: limite por campo, destino só entre as páginas do site ou o WhatsApp, medida da foto tirada do arquivo e não do navegador |
| Script malicioso dentro de um texto | O texto do blog é Markdown e a conversão não produz HTML executável |
| Rastreador de terceiro dentro de um texto | Só imagem hospedada aqui vira imagem na página |
| Consulta ao banco montada com texto de fora | Toda consulta é parametrizada |
| Banco fora do ar derrubar o site | O blog serve os 68 textos e a home serve o texto padrão; depois de uma falha, a home para de tentar o banco por 60 segundos |
| O painel sujar os números | A medição de visitas descarta tudo que começa com `/publicar` |
| Identificar quem visita | Web Analytics sem cookie; o resumo diário guarda só totais, e é apagado depois de 3 anos (ver `/privacidade`) |

Um teste automatizado (`npm test`) falha se alguém criar uma rota do painel ou
de coleta, ou uma página dentro de `/publicar`, e esquecer a proteção. Ele
nasceu provando que pega: com a proteção removida de uma rota, o teste acusa.

---

## Perguntas que vão aparecer

**Some algum texto antigo?** Não. Os 68 continuam exatamente onde estão, nas
mesmas URLs.

**E se o banco cair?** O blog continua mostrando os 68 textos do repositório e a
home mostra o texto padrão. Só o que foi publicado pelo painel fica
indisponível, e o painel avisa.

**O texto novo entra no Google?** Sim: ao publicar, o índice do blog, a página
do texto e o sitemap são atualizados na hora.

**A mudança na página inicial vai direto para o ar?** Só depois de ela abrir a
prévia e confirmar. Rascunho não aparece para ninguém além de quem tem a senha.

**Dá para apagar sem querer?** Apagar exige dois cliques: o primeiro troca o
botão para "Confirmar exclusão".

**Os números são em tempo real?** Não. A coleta é diária, e o Google libera as
buscas com 2 a 3 dias de atraso.

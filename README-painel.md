# Painel do site

Uma página com senha, em `/publicar`, para a clínica cuidar do site sem precisar
de ninguém. Tem três abas:

| Aba | Para quê |
|---|---|
| **Meu blog** | Escrever, editar, publicar, despublicar e apagar os textos do blog — os 69 do site antigo e os novos — e gerir os temas |
| **Página inicial** | Trocar textos, listas, botões e fotos da home, com prévia antes de publicar |
| **Números** | Ver quantas pessoas leram o site, de onde vieram e quais buscas no Google trouxeram gente |

O endereço não aparece em menu, rodapé nem sitemap, e está bloqueado no
`robots.txt`. Isso evita que ele apareça numa busca, mas **não é o que protege**.
Quem protege é a senha, a sessão assinada pelo servidor e o limite de tentativas.

---

## O que precisa ser configurado (uma vez)

Nada aqui é obrigatório para o site funcionar. **Sem nenhuma variável o site
constrói, serve as 88 URLs, mostra os textos do blog (lidos do arquivo do
repositório) e a página inicial com o texto de sempre.** Só o painel fica indisponível e os números ficam parados. Isso é de
propósito: a funcionalidade nova não pode derrubar o site por falta de
configuração. A lista completa, com o porquê de cada uma, está em
`.env.example`.

### O que cada variável liga

| Variável | Liga | Sem ela |
|---|---|---|
| `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | A entrada no painel | Ninguém entra; o painel diz que não foi configurado |
| `DATABASE_URL` | O blog no banco (textos do site antigo e novos, editáveis), temas, imagens enviadas, edição da página inicial, números guardados | O blog mostra os textos do arquivo do repositório e a home mostra o texto padrão; as abas explicam que falta o banco |
| `CRON_SECRET` | A coleta diária dos números (`/api/cron/numeros`) e a renovação diária do cache do site. **Cadastre assim que houver `DATABASE_URL`**, mesmo sem ligar os números | A coleta recusa todo pedido, inclusive o da Vercel. E uma página que tenha ido ao cache com o texto padrão durante uma queda do banco só se refaz na próxima publicação ou deploy |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (opcional) | Visitas na aba Números | A aba diz "a contagem de visitas ainda não foi ligada", nunca "0 visitas" |
| `GSC_SERVICE_ACCOUNT`, `GSC_SITE_URL` | Buscas no Google na aba Números | A aba diz "as buscas no Google ainda não foram ligadas" |
| `DATA_DA_MIGRACAO` (opcional) | A marca de antes e depois da troca de site no gráfico | O gráfico sai sem marca e diz que a data não foi marcada |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (opcionais) | Aviso quando a coleta falha duas noites seguidas | O aviso fica só na aba Números |
| `PROXY_HOPS` | Limite de tentativas correto fora da Vercel | Na Vercel, deixe vazio |
| `DOMINIO_NO_AR` | Libera os buscadores no dia da troca de DNS. **Só vale depois de um deploy novo**: o `robots.txt` é gerado no build | Na Vercel, o `robots.txt` bloqueia tudo, de propósito. Fora da Vercel ele sempre libera |

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

**O blog inteiro passa a morar no banco.** Na primeira vez que o site sobe com
`DATABASE_URL`, os textos que vieram do site antigo (o arquivo
`src/content/posts.json`) são copiados para cá sozinhos — com o corpo idêntico,
a mesma data e a mesma ordem —, junto com os temas que eles tinham no GoDaddy.
Dali em diante eles aparecem em **Meu blog** e se editam como qualquer texto.
As páginas não mudam em nada: a migração foi conferida comparando o HTML de
todas as páginas do blog antes e depois, byte a byte.

Duas regras que valem a partir daí:

- **Com banco configurado, o blog lê só do banco.** Se o banco cair, a página
  que já estava pronta continua no ar, e a que não estava responde erro até ele
  voltar — o site nunca mostra uma versão antiga de um texto editado nem traz
  de volta um texto apagado. Um deploy feito com o banco fora falha, e a Vercel
  mantém o deploy anterior no ar.
- **Texto novo no arquivo entra sozinho no próximo deploy** (é assim que um
  post publicado no GoDaddy chega aqui enquanto o domínio não muda). Texto que
  já está no banco **não** é tocado de novo: corrigir o arquivo não muda nada,
  a correção se faz pelo painel. Texto apagado pelo painel não volta.

O texto padrão da página inicial continua no repositório, como antes.

### 3. Os números

1. Ligar **Web Analytics** no projeto da Vercel e fazer um deploy novo. A
   medição só começa a partir desse deploy e não é retroativa.
2. Criar um token com escopo só deste projeto e cadastrar `VERCEL_API_TOKEN` e
   `VERCEL_PROJECT_ID`. **A Vercel não tem token só de leitura**: esse token consegue
   publicar e apagar o projeto. Cadastre-o só nas variáveis da Vercel e não o copie
   para planilha, conversa ou `.env` compartilhado.
3. No Google Cloud: ativar a Search Console API, criar uma conta de serviço e
   baixar a chave em JSON. Cadastrar o JSON inteiro em `GSC_SERVICE_ACCOUNT`.
4. No Search Console: adicionar o e-mail da conta de serviço como usuário
   (Restrito basta) e cadastrar a propriedade em `GSC_SITE_URL`. Vale
   `sc-domain:podoposture.com.br`, `https://podoposture.com.br/` ou só
   `podoposture.com.br` (que vira `sc-domain:`).
5. Criar `CRON_SECRET` com pelo menos 16 caracteres aleatórios.

A coleta roda todo dia às 6h de Brasília e refaz os últimos 5 dias, para cobrir
noite perdida ou chamada duplicada. Para trazer o histórico uma vez, chame
`/api/cron/numeros?desde=AAAA-MM-DD` com o cabeçalho
`Authorization: Bearer <CRON_SECRET>` e repita com o `proximoDesde` da resposta
até ele vir vazio. Cada chamada traz um lote de 14 dias.

Até onde cada fonte alcança: o Google devolve 16 meses, e a Vercel, no plano
Hobby, só os últimos 31 dias. Lote anterior a esses 31 dias sai sem a fonte da
Vercel (a resposta marca `alemDaMemoriaDaVercel`), e não com erro. A série longa
é a daqui: o que a coleta grava fica 3 anos no banco, muito depois de a Vercel
esquecer. Por isso a coleta noturna não pode ficar parada mais de um mês — o que
se perder nesse intervalo não volta.
Se o lote não conseguir gravar no banco, a resposta vem com status 502 e o
`proximoDesde` repete a data do próprio lote: é só chamar de novo com ele, sem
pular para a frente. Com o banco fora do ar, a lista `fontes` pode vir vazia
nesse 502 — nenhuma fonte chegou a terminar —, e ainda assim o `proximoDesde` é
a data do lote. Vazio mesmo, que encerra a repetição, só o `proximoDesde`.

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
2. **Criar o token de projeto** (`VERCEL_API_TOKEN`) e informar o ID do projeto. Lembrando:
   o token publica e apaga o projeto, e fica só nas variáveis da Vercel.
3. **Cadastrar `CRON_SECRET`** e as demais variáveis em Settings → Environment
   Variables. Hoje o projeto não tem nenhuma variável.
4. **Criar e conectar o Postgres** (por exemplo, Neon pelo Marketplace, que
   preenche `DATABASE_URL`). Hoje não há banco ligado ao projeto.
5. **Criar a conta de serviço do Search Console** no Google Cloud e dar a ela
   acesso de leitura à propriedade do domínio. Isso exige também acesso de
   proprietário ao Search Console da clínica.

---

## Como ela usa

### Meu blog

1. Abre `/publicar` e digita a senha.
2. Vê a lista de todos os textos do blog, do mais recente para o mais antigo. O
   botão preenchido é **Escrever texto**.
3. Preenche título e tema, e cola o texto direto do Word: negrito, títulos e
   listas vêm junto.
4. Usa o botão **Imagem** para inserir fotos no meio do texto, e **Escolher
   capa** para a imagem que aparece na lista do blog.
5. **Ver como vai ficar** mostra o texto com a tipografia real do site.
6. **Publicar no site** deixa no ar na hora. **Guardar como rascunho** salva sem
   publicar.

Um texto do site antigo abre no mesmo editor. Enquanto ela mexe só no título,
no resumo, no tema ou na capa, o corpo continua exatamente o do site antigo.
Se mexer no texto, ele passa a ser salvo como os textos novos — as fotos, os
negritos, os sublinhados, os grifos e os links continuam (o teste confere isso
nos 69).

### Temas

O botão **Temas**, ao lado de Escrever texto, abre a lista de temas com quantos
textos cada um tem. Dá para criar, renomear e apagar.

- **Renomear** leva todos os textos do tema junto, e o site é refeito na hora.
- **Apagar um tema sem textos** pede o segundo clique.
- **Apagar um tema com textos** mostra quantos são e pede para onde eles vão —
  outro tema ou "Deixar sem tema" —, sem nada escolhido de antemão, e só depois
  pede a confirmação. Nenhum texto é apagado junto.
- A trava não é só da tela: o servidor recusa apagar sem destino, e o próprio
  banco recusa apagar tema que ainda tem texto (chave estrangeira).
- "Sem tema" é uma escolha válida: 64 dos 69 textos do site antigo nunca
  tiveram tema, e a página deles não mostra tema nenhum.
- Um tema só aparece no site quando tem pelo menos um texto publicado.

### Página inicial

1. Escolhe a seção pela lista, que mostra o começo do texto que está no ar.
2. Troca o texto ou a foto. Cada campo diz o limite e mostra o texto original.
3. **Ver como vai ficar** guarda um rascunho e abre a home inteira numa aba
   separada, com a mudança desta seção e as outras como estão no site. Se outra
   seção tiver rascunho, a faixa diz qual.
4. Só depois disso aparece **Publicar no site**, na própria faixa da aba de como
   vai ficar e no painel, e ele pede um segundo clique em **Confirmar e
   publicar**. Qualquer mudança depois de ver esconde o botão do painel de novo.
5. **Usar o original neste campo** desfaz um campo só, inclusive dentro de listas
   (serviços, cartões, fotos). **Voltar o site ao texto original** tira do ar o
   que foi publicado naquela seção, na hora; ele só aparece quando o publicado
   difere do original.

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
| Descobrir a senha por tentativa | 8 tentativas a cada 15 minutos por origem (IPv6 conta pelo bloco /64, que qualquer servidor alugado tem inteiro); a 9ª é recusada. Mais de 300 tentativas somadas em 15 minutos viram alerta no log |
| Derrubar o site com tentativas | No máximo 2 pedidos de entrada ao mesmo tempo por instância; a recusa por excesso não gasta tentativa de ninguém |
| Duas janelas editando a mesma seção da home | Cada gravação confere a versão da seção; se outra janela publicou antes, nada é gravado e o editor junta o que mudou com a versão nova |
| Ler a senha nas variáveis do servidor | Lá está só o resumo `scrypt`, não a senha |
| Forjar ou esticar a sessão | Cookie assinado com HMAC; qualquer alteração invalida |
| Pedido forjado de outro site | Cookie `SameSite=Strict` mais conferência de procedência |
| Chamar a coleta de fora e gastar a cota ou sujar o banco | `/api/cron/numeros` exige `CRON_SECRET`, comparado em tempo constante; sem o segredo configurado, ninguém passa |
| Texto ou botão da home quebrar a página | O servidor valida cada seção: limite por campo, destino só entre as páginas do site ou o WhatsApp, medida da foto tirada do arquivo e não do navegador |
| Script malicioso dentro de um texto | O texto do blog é Markdown e a conversão não produz HTML executável |
| Rastreador de terceiro dentro de um texto | Só imagem hospedada aqui vira imagem na página |
| Consulta ao banco montada com texto de fora | Toda consulta é parametrizada |
| Banco fora do ar derrubar o site, ou mostrar texto velho | A página que já estava pronta continua no ar; a que não estava responde erro, que não vai para o cache, até o banco voltar. Nunca a versão antiga de um texto editado nem um texto apagado. Uma conexão que caiu ganha uma segunda tentativa; depois de uma falha real, as leituras do site param de tentar o banco por 15 segundos (60 no build). Deploy com o banco fora falha, e a Vercel mantém o anterior no ar. A home serve o texto padrão |
| O painel sujar os números | A medição de visitas descarta tudo que começa com `/publicar` |
| Identificar quem visita | Web Analytics sem cookie; o resumo diário guarda só totais, e é apagado depois de 3 anos (ver `/privacidade`) |

Um teste automatizado (`npm test`) falha se alguém criar uma rota do painel ou
de coleta, ou uma página dentro de `/publicar`, e esquecer a proteção. Ele
nasceu provando que pega: com a proteção removida de uma rota, o teste acusa.

---

## Perguntas que vão aparecer

**Some algum texto antigo?** Não. Os 69 continuam exatamente onde estão, nas
mesmas URLs e com a mesma página — agora editáveis em **Meu blog**.

**E se o banco cair?** As páginas do blog que já estavam prontas continuam no
ar; as outras dão erro até o banco voltar, e o painel avisa. O site nunca volta
a mostrar a versão antiga de um texto que ela editou.

**O texto novo entra no Google?** Sim: ao publicar, o índice do blog, a página
do texto e o sitemap são atualizados na hora.

**A mudança na página inicial vai direto para o ar?** Só depois de ela abrir a
prévia e confirmar. Rascunho não aparece para ninguém além de quem tem a senha.

**Dá para apagar sem querer?** Apagar exige dois cliques: o primeiro troca o
botão para "Confirmar exclusão".

**Os números são em tempo real?** Não. A coleta é diária, e o Google libera as
buscas com 2 a 3 dias de atraso.

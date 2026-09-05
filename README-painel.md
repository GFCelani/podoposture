# Painel de publicação do blog

Uma página com senha, em `/publicar`, para a clínica escrever e publicar textos
no blog sem precisar de ninguém.

O endereço não aparece em menu, rodapé nem sitemap, e está bloqueado no
`robots.txt`. Isso evita que ele apareça numa busca — **não é o que protege**.
Quem protege é a senha, a sessão assinada pelo servidor e o limite de tentativas.

---

## O que precisa ser configurado (uma vez)

Nada aqui é obrigatório para o site funcionar. **Sem nenhuma destas variáveis o
site constrói, serve as 88 URLs e mostra os 68 textos normalmente** — só o
painel fica indisponível. Isso é de propósito: a funcionalidade nova não pode
derrubar o site por falta de configuração.

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

A senha em si **não fica guardada em lugar nenhum** — nem no servidor, nem no
repositório. O que vai na variável é um resumo criptográfico dela, que não dá
para desfazer. Guarde a senha num gerenciador; para trocá-la depois, rode o
comando de novo e substitua a linha.

### 2. O banco de textos

Qualquer Postgres serve (Neon, Supabase, ou um local). Crie um banco vazio e
ponha a URL de conexão em:

```
DATABASE_URL=postgres://…
```

As tabelas se criam sozinhas no primeiro acesso — não há migração para rodar.

Os 68 textos que vieram do site antigo **não** ficam neste banco: eles continuam
no próprio repositório, que é o que garante que as URLs já indexadas pelo Google
não dependam de o banco estar no ar.

### 3. Se o site não estiver na Vercel

Só nesse caso, informe quantos proxies confiáveis existem na frente da
aplicação, para o limite de tentativas saber de quem é cada tentativa:

```
PROXY_HOPS=1
```

Na Vercel, deixe vazio.

---

## Como ela usa

1. Abre `/publicar` e digita a senha.
2. Vê a lista do que já escreveu. O botão verde é **Escrever texto**.
3. Preenche título e tema, e cola o texto direto do Word — negrito, títulos e
   listas vêm junto.
4. Usa o botão **Imagem** para inserir fotos no meio do texto, e **Escolher
   capa** para a imagem que aparece na lista do blog.
5. **Ver como vai ficar** mostra o texto com a tipografia real do site.
6. **Publicar no site** deixa no ar na hora. **Guardar como rascunho** salva sem
   publicar.

O que ela escreve fica guardado no navegador enquanto digita. Se a sessão vencer
ou a aba fechar, o texto não se perde.

---

## O que está protegido, e como

| Risco | O que impede |
|---|---|
| Descobrir o endereço e publicar | Toda rota de escrita exige sessão válida no **servidor**. A tela nunca é a fechadura |
| Descobrir a senha por tentativa | 8 tentativas a cada 15 minutos por origem; a 9ª é recusada |
| Derrubar o site com tentativas | No máximo 2 conferências de senha ao mesmo tempo |
| Ler a senha nas variáveis do servidor | Lá está só o resumo `scrypt`, não a senha |
| Forjar ou esticar a sessão | Cookie assinado com HMAC; qualquer alteração invalida |
| Pedido forjado de outro site | Cookie `SameSite=Strict` mais conferência de procedência |
| Script malicioso dentro de um texto | O texto é Markdown e a conversão não produz HTML executável |
| Rastreador de terceiro dentro de um texto | Só imagem hospedada aqui vira imagem na página |
| Roubo do painel derrubar o blog | Sem banco, o site serve os 68 textos e segue de pé |

Um teste automatizado (`npm test`) falha se alguém criar uma rota de escrita e
esquecer de exigir a sessão. Ele nasceu provando que pega: com a proteção
removida de uma rota, o teste acusa.

---

## Perguntas que vão aparecer

**Some algum texto antigo?** Não. Os 68 continuam exatamente onde estão, nas
mesmas URLs.

**E se o banco cair?** O blog continua mostrando os 68 textos do repositório. Só
os publicados pelo painel ficam indisponíveis, e o painel avisa.

**O texto novo entra no Google?** Sim: ao publicar, o índice do blog, a página
do texto e o sitemap são atualizados na hora.

**Dá para apagar sem querer?** Apagar exige dois cliques: o primeiro troca o
botão para "Confirmar exclusão".

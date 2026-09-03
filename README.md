# Podoposture

Site da clínica Podoposture — osteopatia, posturologia e acupuntura em
Copacabana, Rio de Janeiro. Next.js 16 (App Router) + React 19 + Tailwind v4.

## O que este projeto é

Substituto do site em GoDaddy Website Builder que hoje atende
`podoposture.com.br`. A restrição que governa a arquitetura: aquele site tem
**88 URLs indexadas no Google** (20 páginas + 68 posts), e todas continuam
respondendo nos mesmos endereços aqui. O domínio não muda — é troca de
plataforma, não migração de domínio, então preservar URL é o bastante para
preservar o tráfego orgânico.

## Rodar

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

O `build` roda `scripts/gerar-mapa-de-rotas.mjs` antes (via `prebuild`). Isso não
é opcional: veja a armadilha nº 1 abaixo.

## De onde vem o conteúdo

Nada em `src/content/` é escrito à mão. O conteúdo foi extraído do site GoDaddy
por scripts e é regenerável:

```bash
python scripts/baixar_godaddy.py       # baixa as 88 páginas para .cache/ (gitignored)
python scripts/extrair_blog.py         # 68 posts  -> src/content/posts.json
python scripts/extrair_paginas.py      # 20 páginas -> src/content/pages.json
python scripts/baixar_imagens.py       # imagens do CDN do GoDaddy -> public/img/blog/
node   scripts/otimizar-imagens.mjs --aplicar
node   scripts/dimensionar-imagens-do-blog.mjs
```

Só dependem da biblioteca padrão do Python e do `sharp` que já vem com o Next.

> **O blog não estava no HTML.** O widget de blog do GoDaddy é renderizado por
> JavaScript; o HTML servido traz um spinner. O conteúdo real vem de
> `window._BLOG_DATA`, onde `post.fullContent` é um documento Draft.js. O
> `extrair_blog.py` converte esse documento para HTML limpo — por isso a saída
> tem só tags semânticas, sem o `<div>` aninhado do construtor.

> **Prazo.** As imagens dos posts vivem em `img1.wsimg.com`, atreladas à conta
> GoDaddy da cliente, e somem quando o plano for cancelado. Já estão copiadas
> para `public/img/blog/`, mas mantenha o plano ativo por 30 dias após a troca.

## Gate de migração

Antes de apontar o domínio, isto precisa passar:

```bash
npm run build && npm start
python scripts/verificar_urls.py --alvo http://localhost:3000
```

Percorre as 88 URLs do site antigo, compara o conteúdo renderizado contra o que
foi extraído e falha se alguma página perdeu texto. Quando uma URL não responde
200, ele consulta o **site antigo** antes de acusar regressão — o objetivo é não
piorar em relação ao que existe hoje, não atingir um número bonito.

Estado atual: **87/88 respondendo 200**, e 1 em paridade com a origem
(`/home/f/chinelos-100%-...`, cujo `%` solto não é escape válido: dá 500 aqui e
no GoDaddy; a forma escapada, que é a que o Google indexa, responde 200 nos
dois). Passar no gate é critério de corte, não recomendação.

## Duas armadilhas que já custaram tempo

**1. Slugs não-ASCII quebram o roteador.** 59 das 88 URLs têm acento, e o
roteador do Next devolve 404 para elas ([vercel/next.js#73965][bug]). A saída:
`scripts/gerar-mapa-de-rotas.mjs` emite `src/content/rotas.json`, as rotas são
geradas em ASCII, e `src/middleware.ts` reescreve a URL original para elas. É
*rewrite*, não redirect — a URL pública continua sendo a que o Google indexou.

**`rotas.json` é derivado. Se ele ficar velho, um post novo nasce em 404.** Um
post publicado no GoDaddy entra por `extrair_blog.py`; se o mapa não for
regenerado, `posts.ts` cai no fallback `?? p.slug` e gera a rota com o slug
acentuado cru — exatamente o bug que todo este desenho existe para desviar. Por
isso o `prebuild`. Não remova.

Tentativas que **não** funcionam, já testadas: segmento dinâmico com o slug
acentuado; rota estática com o nome literal; `proxy.ts` (a substituta anunciada
do middleware não é reconhecida no 16.3.4 — o manifest sai vazio); e um matcher
que exclua extensões via `\.` (o escape vira `.` e a regex passa a excluir
quase todo o site, deixando o rewrite sem rodar).

**2. `og.png` não pode virar WebP.** O WhatsApp — canal principal da clínica —
não renderiza WebP em Open Graph, e o cartão sai sem imagem. O
`otimizar-imagens.mjs` mantém esse arquivo em PNG de propósito.

[bug]: https://github.com/vercel/next.js/issues/73965

## Antes de apontar o DNS

1. Migrar a verificação do Search Console para **DNS** (registro TXT), com o
   GoDaddy ainda no ar. A meta tag em `src/lib/site.ts` é a redundância, não a
   garantia.
2. Exportar 16 meses do Search Console — é o baseline para provar que nada caiu.
3. Rodar o gate acima contra o deploy de preview.
4. Definir `NEXT_PUBLIC_SITE_URL` na Vercel.
5. Baixar o TTL do DNS para 300s **24h antes** da troca.
6. Manter o plano GoDaddy pago por 30 dias — rollback é reverter o DNS.

## Escopo deliberadamente fora

Sem Google Ads, Meta Pixel, GTM ou qualquer analytics novo. O GA4 existente da
cliente (`G-3EQ3LHKN49`) e a verificação do Search Console são **preservados**,
nunca substituídos.

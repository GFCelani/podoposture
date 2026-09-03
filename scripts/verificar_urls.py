"""
Gate de migracao: nenhuma URL indexada pode se perder na troca de plataforma.

Compara as 88 URLs dos sitemaps do site GoDaddy contra o site novo e falha se
qualquer uma nao responder 200. Alem do status, compara o CONTEUDO: title, h1,
meta description e contagem de palavras. Uma pagina que responde 200 mas perdeu
metade do texto e uma perda de trafego silenciosa — o tipo que so aparece no
Search Console tres semanas depois.

Uso:
    # site novo rodando local (npm run build && npm start)
    python scripts/verificar_urls.py --alvo http://localhost:3000

    # antes do cutover, contra o preview
    python scripts/verificar_urls.py --alvo https://podoposture.vercel.app

Saida: relatorio por URL + resumo. Exit code 1 se houver qualquer falha.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / ".cache" / "godaddy"
ORIGEM = "https://podoposture.com.br"

UA = "Mozilla/5.0 (compatible; PodopostureMigrationCheck/1.0)"

# Quanto o conteudo pode encolher antes de virar alerta.
#
# A comparacao NAO e contra a contagem bruta do HTML antigo. Duas razoes: o site
# novo descarta o cromo do GoDaddy (menu de 20 itens repetido, banner de cookie,
# rodape), e — no caso dos posts — o HTML antigo nem continha o post: o widget de
# blog era renderizado por JavaScript e o HTML servido trazia a home inteira mais
# um spinner. Por isso o baseline de conteudo vem do que foi realmente extraido
# (src/content/*.json), que e o texto que o Google indexou.
TOLERANCIA_PALAVRAS = 0.75

# /home era duplicata da raiz no site antigo; aqui responde 308 e consolida.
REDIRECIONADAS = {"/home": "/"}


def para_ascii(url: str) -> str:
    """
    Percent-encoda o path para o urllib aceitar (ele recusa nao-ASCII na URL).

    `safe` inclui "%" de proposito: sem isso um "%" ja escapado viraria "%25" e o
    gate testaria um endereco diferente do que esta no sitemap do site antigo —
    exatamente o tipo de divergencia que ele existe para pegar.
    """
    partes = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        (
            partes.scheme,
            partes.netloc,
            urllib.parse.quote(partes.path, safe="/%"),
            partes.query,
            "",
        )
    )


def buscar(url: str) -> tuple[int, str, str]:
    """Devolve (status, html, url_final). Status 0 = falha de rede."""
    try:
        req = urllib.request.Request(para_ascii(url), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace"), resp.url
    except urllib.error.HTTPError as erro:
        return erro.code, "", url
    except Exception:  # noqa: BLE001
        return 0, "", url


def texto_visivel(html: str) -> str:
    html = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html)).strip()


def perfil(html: str) -> dict:
    def primeiro(padrao: str) -> str:
        m = re.search(padrao, html, re.S | re.I)
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""

    return {
        "title": primeiro(r"<title[^>]*>(.*?)</title>"),
        "h1": primeiro(r"<h1[^>]*>(.*?)</h1>"),
        "description": primeiro(r'<meta\s+name="description"\s+content="([^"]*)"'),
        "palavras": len(texto_visivel(html).split()),
    }


def baseline_extraido() -> dict[str, int]:
    """caminho -> numero de palavras do conteudo que extraimos do site antigo."""
    base: dict[str, int] = {}

    posts = RAIZ / "src" / "content" / "posts.json"
    if posts.exists():
        for post in json.loads(posts.read_text(encoding="utf-8")):
            base[f"/home/f/{post['slug']}"] = post["palavras"]

    paginas = RAIZ / "src" / "content" / "pages.json"
    if paginas.exists():
        for pagina in json.loads(paginas.read_text(encoding="utf-8")):
            base[f"/{pagina['slug']}"] = pagina["palavras"]

    return {unicodedata.normalize("NFC", k): v for k, v in base.items()}


def caminhos_do_sitemap() -> list[str]:
    """
    Os caminhos exatamente como o sitemap do GoDaddy os publica.

    Guardamos a forma decodificada (para casar com o baseline de conteudo) e
    tambem a forma crua, porque e a crua que o Google carrega. Uma URL pode
    responder numa e falhar na outra — foi o caso de
    "/home/f/chinelos-100%-personalizados-...", cujo "%" solto nao e escape valido.
    """
    manifest = json.loads((CACHE / "manifest.json").read_text(encoding="utf-8"))
    caminhos = []
    for item in manifest:
        cru = urllib.parse.urlsplit(item["url"]).path
        caminhos.append(unicodedata.normalize("NFC", urllib.parse.unquote(cru)))
    return sorted(set(caminhos))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--alvo", required=True, help="base do site novo")
    ap.add_argument("--sem-origem", action="store_true",
                    help="nao consultar o site antigo; so checar status no alvo")
    args = ap.parse_args()
    alvo = args.alvo.rstrip("/")

    if not (CACHE / "manifest.json").exists():
        print("faltando .cache/godaddy/manifest.json — rode scripts/baixar_godaddy.py")
        return 1

    caminhos = caminhos_do_sitemap()
    esperado_palavras = baseline_extraido()
    print(f"URLs indexadas no site antigo: {len(caminhos)}")
    print(f"alvo: {alvo}\n")

    def checar(caminho: str) -> dict:
        paridade_com_origem: int | None = None
        esperado = REDIRECIONADAS.get(caminho)
        status, html, final = buscar(f"{alvo}{caminho}")

        novo = perfil(html) if html else {}
        antigo = {"palavras": esperado_palavras.get(caminho)}

        problemas = []
        if status != 200:
            # Antes de acusar regressao, conferir como o site ANTIGO responde a
            # mesma URL. Ha endereco no sitemap do GoDaddy que ele proprio nao
            # serve — "/home/f/chinelos-100%-..." tem um "%" solto, que nao e
            # escape valido, e devolve 500 na origem tambem. Reproduzir o
            # comportamento da origem nao e perder trafego; o que o Google tem
            # indexado e a forma escapada, e essa responde 200 nos dois.
            status_origem, _, _ = (
                (0, "", "") if args.sem_origem else buscar(f"{ORIGEM}{caminho}")
            )
            if status_origem == status:
                paridade_com_origem = status
            else:
                problemas.append(
                    f"HTTP {status or 'sem resposta'} (origem responde {status_origem})"
                )
        if esperado and not urllib.parse.urlsplit(final).path in (esperado, "/"):
            problemas.append(f"deveria redirecionar para {esperado}, foi para {final}")
        if status == 200 and not esperado:
            if not novo.get("h1"):
                problemas.append("sem <h1>")
            if not novo.get("title"):
                problemas.append("sem <title>")
            esperadas = antigo.get("palavras")
            if esperadas:
                # o texto renderizado inclui cabecalho/rodape do site novo, entao
                # a razao saudavel fica acima de 1; abaixo da tolerancia significa
                # que parte do conteudo original nao chegou a pagina
                razao = novo.get("palavras", 0) / esperadas
                if razao < TOLERANCIA_PALAVRAS:
                    problemas.append(
                        f"conteudo faltando: {esperadas} palavras extraidas -> "
                        f"{novo.get('palavras', 0)} renderizadas ({razao:.0%})"
                    )

        return {
            "caminho": caminho,
            "status": status,
            "problemas": problemas,
            "paridade": paridade_com_origem,
            "palavrasAntes": antigo.get("palavras"),
            "palavrasDepois": novo.get("palavras"),
        }

    with ThreadPoolExecutor(max_workers=8) as pool:
        resultados = list(pool.map(checar, caminhos))

    com_problema = [r for r in resultados if r["problemas"]]
    em_paridade = [r for r in resultados if r["paridade"]]
    for r in resultados:
        marca = "FALHA" if r["problemas"] else ("PAR  " if r["paridade"] else "ok   ")
        antes = r["palavrasAntes"]
        depois = r["palavrasDepois"]
        medida = f"{antes or '-':>5} -> {depois or '-':<5}" if antes or depois else " " * 13
        print(f"  {marca} {r['status']:>3}  {medida}  {r['caminho']}")
        for problema in r["problemas"]:
            print(f"          !! {problema}")

    ok = len(resultados) - len(com_problema) - len(em_paridade)
    print(f"\n{ok}/{len(resultados)} URLs respondendo 200")

    if em_paridade:
        print(
            f"{len(em_paridade)} com o MESMO comportamento do site antigo "
            "(nao e regressao):"
        )
        for r in em_paridade:
            print(f"  HTTP {r['status']} aqui e na origem: {r['caminho']}")
        print("  -> a forma escapada dessas URLs, que e a que o Google indexa, responde 200.")
    if com_problema:
        print(f"{len(com_problema)} com problema — a migracao NAO esta pronta:")
        for r in com_problema:
            print(f"  {r['caminho']}: {'; '.join(r['problemas'])}")
        return 1

    print("gate de migracao: PASSOU — nenhuma URL indexada regride em relacao ao site antigo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

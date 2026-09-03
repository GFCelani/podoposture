"""
Baixa as imagens do blog do CDN do GoDaddy para public/img/blog/.

As imagens vivem em img1.wsimg.com/isteam/ip/<uuid-da-conta-da-cliente>/... —
ou seja, atreladas a conta GoDaddy dela. No dia em que o plano for cancelado,
todas somem e os 68 posts ficam sem ilustracao. Este script traz tudo para o
repositorio e reescreve os caminhos em src/content/posts.json.

Idempotente: pula o que ja existe. Rode de novo a vontade.

Uso:
    python scripts/baixar_imagens.py [--forcar]
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
POSTS = RAIZ / "src" / "content" / "posts.json"
DESTINO = RAIZ / "public" / "img" / "blog"
PUBLICO = "/img/blog"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
PAUSA = 0.3
TENTATIVAS = 3

EXTENSOES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}


def normalizar(url: str) -> str:
    """
    URL absoluta e sem as transformacoes do isteam.

    O GoDaddy serve as imagens com sufixos de redimensionamento
    ('/:/rs=w:1240,h:620'). Baixamos o original — o next/image cuida de gerar os
    tamanhos depois, e assim nao ficamos presos a uma resolucao pequena.
    """
    if url.startswith("//"):
        url = "https:" + url
    url = re.sub(r"/:/[^/]*$", "", url)
    partes = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        (
            partes.scheme or "https",
            partes.netloc,
            urllib.parse.quote(urllib.parse.unquote(partes.path), safe="/"),
            "",
            "",
        )
    )


def nome_local(url: str, tipo: str | None) -> str:
    """Nome estavel e seguro: base legivel do arquivo + hash curto da URL."""
    caminho = urllib.parse.unquote(urllib.parse.urlsplit(url).path)
    base = Path(caminho).stem
    base = re.sub(r"[^A-Za-z0-9]+", "-", base).strip("-").lower()[:60] or "imagem"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    ext = EXTENSOES.get((tipo or "").split(";")[0].strip(), "")
    if not ext:
        ext = Path(caminho).suffix.lower()
        # o GoDaddy publica arquivos com nome duplo tipo "foto.webp.png"
        if ext not in EXTENSOES.values():
            ext = ".jpg"
    return f"{base}-{digest}{ext}"


def baixar(url: str) -> tuple[bytes, str | None]:
    ultimo: Exception | None = None
    for tentativa in range(TENTATIVAS):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read(), resp.headers.get("Content-Type")
        except Exception as erro:  # noqa: BLE001 - falha de rede vira relatorio
            ultimo = erro
            if tentativa < TENTATIVAS - 1:
                time.sleep(2**tentativa)
    raise RuntimeError(f"{url} -> {ultimo!r}")


def main() -> int:
    if not POSTS.exists():
        print(f"faltando {POSTS} — rode scripts/extrair_blog.py antes")
        return 1

    forcar = "--forcar" in sys.argv
    posts = json.loads(POSTS.read_text(encoding="utf-8"))
    DESTINO.mkdir(parents=True, exist_ok=True)

    # cache de URL original -> caminho publico, para nao baixar a mesma imagem
    # duas vezes quando ela e capa e tambem aparece no corpo
    mapa: dict[str, str] = {}
    falhas: list[str] = []
    baixadas = reaproveitadas = 0

    alvos: list[str] = []
    for post in posts:
        if post.get("capa"):
            alvos.append(post["capa"])
        alvos.extend(post.get("imagens") or [])

    unicas = list(dict.fromkeys(normalizar(u) for u in alvos if u))
    print(f"imagens unicas a processar: {len(unicas)}\n")

    for i, url in enumerate(unicas, 1):
        existente = next(DESTINO.glob(f"*{hashlib.sha1(url.encode()).hexdigest()[:8]}*"), None)
        if existente and not forcar:
            mapa[url] = f"{PUBLICO}/{existente.name}"
            reaproveitadas += 1
            continue
        try:
            dados, tipo = baixar(url)
            nome = nome_local(url, tipo)
            (DESTINO / nome).write_bytes(dados)
            mapa[url] = f"{PUBLICO}/{nome}"
            baixadas += 1
            print(f"  [{i}/{len(unicas)}] {len(dados):>8}b  {nome}")
        except Exception as erro:  # noqa: BLE001
            falhas.append(url)
            print(f"  [{i}/{len(unicas)}] FALHOU {url[:90]}: {erro}")
        time.sleep(PAUSA)

    # reescreve os caminhos no JSON
    trocas = 0
    for post in posts:
        capa = normalizar(post["capa"]) if post.get("capa") else ""
        if capa and capa in mapa:
            post["capa"] = mapa[capa]
            trocas += 1

        html = post.get("html") or ""

        def substituir(m: re.Match[str]) -> str:
            nonlocal trocas
            alvo = normalizar(m.group(1))
            if alvo in mapa:
                trocas += 1
                return f'src="{mapa[alvo]}"'
            return m.group(0)

        post["html"] = re.sub(r'src="([^"]+)"', substituir, html)
        post["imagens"] = [
            mapa.get(normalizar(u), u) for u in (post.get("imagens") or [])
        ]

    POSTS.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")

    restantes = sum(
        len(re.findall(r'src="(?://|https?://)', p.get("html") or "")) for p in posts
    )
    print(f"\nbaixadas: {baixadas} | ja em disco: {reaproveitadas} | falhas: {len(falhas)}")
    print(f"caminhos reescritos no JSON: {trocas}")
    print(f"imagens ainda apontando para fora: {restantes}")
    if falhas:
        print("\nfalharam:")
        for u in falhas:
            print(f"  {u}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""
Baixa o site GoDaddy inteiro para .cache/godaddy/.

O conteudo e as imagens da clinica so existem enquanto o plano GoDaddy estiver
ativo. Este script congela tudo localmente antes disso. E o passo bloqueante da
migracao: sem ele, cancelar o plano apaga 68 posts e 20 paginas.

Le os 3 sitemaps do site, baixa cada URL e grava:
  .cache/godaddy/paginas/<slug>.html
  .cache/godaddy/posts/<slug>.html
  .cache/godaddy/manifest.json   (url -> arquivo, status, bytes)

Stdlib apenas, sem dependencia nova. Idempotente: pula o que ja baixou, a menos
que --forcar seja passado.

Uso:
    python scripts/baixar_godaddy.py [--forcar]
"""

from __future__ import annotations

import gzip
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://podoposture.com.br"
SITEMAP_INDEX = f"{BASE}/sitemap.xml"
DESTINO = Path(__file__).resolve().parent.parent / ".cache" / "godaddy"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
PAUSA = 0.4  # cortesia com o servidor da cliente
TENTATIVAS = 3


def para_ascii(url: str) -> str:
    """
    Reescreve a URL para ASCII puro.

    Os slugs da clinica tem acento ('/dor-lombar-cronica') e um '+'
    ('/metodo-posture+'); urllib.request recusa qualquer nao-ASCII na URL, entao
    o path vai percent-encoded. O servidor responde 200 para as duas formas.
    """
    partes = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        (
            partes.scheme,
            partes.netloc,
            urllib.parse.quote(partes.path, safe="/"),
            urllib.parse.quote(partes.query, safe="=&"),
            "",
        )
    )


def buscar(url: str) -> bytes:
    """GET com retry e backoff. Levanta a ultima excecao se todas falharem."""
    ultimo_erro: Exception | None = None
    alvo = para_ascii(url)
    for tentativa in range(TENTATIVAS):
        try:
            req = urllib.request.Request(
                alvo,
                headers={
                    "User-Agent": UA,
                    "Accept-Encoding": "gzip",
                    "Accept-Language": "pt-BR,pt;q=0.9",
                },
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                dados = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    dados = gzip.decompress(dados)
                return dados
        except Exception as erro:  # noqa: BLE001 - queremos retry em qualquer falha de rede
            ultimo_erro = erro
            if tentativa < TENTATIVAS - 1:
                time.sleep(2 ** tentativa)
    raise RuntimeError(
        f"falhou apos {TENTATIVAS} tentativas: {url} -> {ultimo_erro!r}"
    ) from ultimo_erro


def locs(xml: bytes) -> list[str]:
    """Extrai os <loc> de um sitemap, ja decodificando percent-encoding."""
    texto = xml.decode("utf-8", errors="replace")
    return [
        urllib.parse.unquote(m.strip())
        for m in re.findall(r"<loc>(.*?)</loc>", texto, re.S)
    ]


def nome_arquivo(url: str) -> str:
    """
    Nome de arquivo seguro a partir da URL.

    Os slugs tem acento e '+' (ex.: /metodo-posture+). Percent-encoding total
    evita tanto caractere invalido no Windows quanto a normalizacao Unicode
    NFC/NFD que morde nomes acentuados entre Windows, git e Linux.
    """
    caminho = urllib.parse.urlparse(url).path.strip("/")
    caminho = caminho or "index"
    return urllib.parse.quote(caminho, safe="") + ".html"


def coletar_urls() -> dict[str, list[str]]:
    """Le o sitemap index e devolve as URLs agrupadas por tipo."""
    print(f"lendo {SITEMAP_INDEX}")
    sub_sitemaps = locs(buscar(SITEMAP_INDEX))
    print(f"  {len(sub_sitemaps)} sub-sitemaps")

    grupos: dict[str, list[str]] = {"paginas": [], "posts": []}
    for sm in sub_sitemaps:
        if "ols" in sm:
            # loja online do GoDaddy: 1 URL, corpo de 29 bytes. Nao ha o que migrar.
            print(f"  pulando {sm} (loja vazia)")
            continue
        urls = locs(buscar(sm))
        grupo = "posts" if "blog" in sm else "paginas"
        grupos[grupo].extend(urls)
        print(f"  {sm} -> {len(urls)} urls ({grupo})")
        time.sleep(PAUSA)
    return grupos


def main() -> int:
    forcar = "--forcar" in sys.argv
    grupos = coletar_urls()
    total = sum(len(v) for v in grupos.values())
    print(f"\ntotal a baixar: {total}\n")

    manifest: list[dict] = []
    falhas: list[str] = []
    baixados = 0
    pulados = 0

    for grupo, urls in grupos.items():
        pasta = DESTINO / grupo
        pasta.mkdir(parents=True, exist_ok=True)

        for i, url in enumerate(urls, 1):
            destino = pasta / nome_arquivo(url)
            rotulo = urllib.parse.urlparse(url).path

            if destino.exists() and not forcar:
                pulados += 1
                manifest.append(
                    {
                        "url": url,
                        "grupo": grupo,
                        "arquivo": str(destino.relative_to(DESTINO)),
                        "bytes": destino.stat().st_size,
                        "status": "cache",
                    }
                )
                continue

            try:
                html = buscar(url)
                destino.write_bytes(html)
                baixados += 1
                manifest.append(
                    {
                        "url": url,
                        "grupo": grupo,
                        "arquivo": str(destino.relative_to(DESTINO)),
                        "bytes": len(html),
                        "status": "ok",
                    }
                )
                print(f"  [{grupo} {i}/{len(urls)}] {len(html):>7}b  {rotulo}")
            except Exception as erro:  # noqa: BLE001 - falha de rede vira relatorio, nao crash
                falhas.append(url)
                manifest.append(
                    {"url": url, "grupo": grupo, "status": "erro", "erro": str(erro)}
                )
                print(f"  [{grupo} {i}/{len(urls)}] FALHOU {rotulo}: {erro}")

            time.sleep(PAUSA)

    DESTINO.mkdir(parents=True, exist_ok=True)
    (DESTINO / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\nbaixados: {baixados} | do cache: {pulados} | falhas: {len(falhas)}")
    print(f"manifest: {DESTINO / 'manifest.json'}")

    if falhas:
        print("\nURLs que falharam (rode de novo para tentar so elas):")
        for url in falhas:
            print(f"  {url}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""
Extrai o conteudo das 20 paginas do site GoDaddy para src/content/pages.json.

Diferente do blog, as paginas sao renderizadas no servidor — mas o HTML e sujo:
widgets aninhados, <p></p> como espacador e headings duplicados com
aria-level="NaN" (o AUDITORIA.md contou 68 headings com 31 copias ocultas numa
pagina so). Este extrator percorre so os widgets de conteudo, descarta o que e
cromo do site (menu, rodape, banner de cookie) e deduplica.

O objetivo NAO e reproduzir o layout antigo: e capturar o texto que ja ranqueia,
para o site novo renderizar com os seus proprios componentes sem perder palavra.

Uso:
    python scripts/extrair_paginas.py
"""

from __future__ import annotations

import json
import re
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / ".cache" / "godaddy" / "paginas"
DESTINO = RAIZ / "src" / "content" / "pages.json"

# widgets que carregam conteudo editorial; o resto e cromo repetido em toda pagina
WIDGETS_CONTEUDO = {"content", "about", "introduction", "featured", "gallery", "html"}
WIDGETS_IGNORADOS = {
    "header", "footer", "cookie-banner", "messaging", "social", "rss",
    "contact", "navigation", "subscribe",
}

BLOCOS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote"}

# Cromo que escapa do filtro estrutural: o rodape do GoDaddy nao usa a classe
# "widget widget-footer" em todas as paginas, entao o descarte final e por texto.
LIXO = re.compile(
    r"^(copyright\s*©|powered by|get directions|(this website|we) use[sd]? cookies"
    r"|todos os direitos reservados|accept|decline|cookie)",
    re.I,
)


class ExtratorDePagina(HTMLParser):
    """Coleta blocos de texto apenas de dentro dos widgets de conteudo."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocos: list[tuple[str, str]] = []
        self.profundidade_widget = 0  # >0 enquanto dentro de um widget de conteudo
        self.pilha: list[str] = []
        self.bloco_atual: str | None = None
        self.buffer: list[str] = []
        self.ignorar_ate: int | None = None

    # -- helpers ---------------------------------------------------------
    def _e_widget_conteudo(self, attrs: dict[str, str]) -> bool | None:
        classe = attrs.get("class", "")
        m = re.search(r"\bwidget widget-([a-z0-9-]+)", classe)
        if not m:
            return None
        nome = m.group(1)
        if nome in WIDGETS_IGNORADOS:
            return False
        base = nome.split("-")[0]
        return nome in WIDGETS_CONTEUDO or base in WIDGETS_CONTEUDO

    # -- HTMLParser ------------------------------------------------------
    def handle_starttag(self, tag: str, attrs_lista: list[tuple[str, str | None]]) -> None:
        attrs = {k: (v or "") for k, v in attrs_lista}
        self.pilha.append(tag)
        nivel = len(self.pilha)

        if self.ignorar_ate is not None:
            return

        # trechos escondidos de leitores de tela e do olho: nao sao conteudo
        if attrs.get("aria-hidden") == "true" or "hidden" in attrs:
            self.ignorar_ate = nivel
            return
        # copias fantasma de heading que o GoDaddy injeta
        if attrs.get("aria-level") == "NaN":
            self.ignorar_ate = nivel
            return

        veredito = self._e_widget_conteudo(attrs)
        if veredito is True:
            self.profundidade_widget += 1
        elif veredito is False and self.profundidade_widget == 0:
            self.ignorar_ate = nivel
            return

        if self.profundidade_widget > 0 and tag in BLOCOS and self.bloco_atual is None:
            self.bloco_atual = tag
            self.buffer = []

    def handle_endtag(self, tag: str) -> None:
        nivel = len(self.pilha)
        if self.ignorar_ate is not None and nivel <= self.ignorar_ate:
            self.ignorar_ate = None

        if self.bloco_atual == tag:
            texto = re.sub(r"\s+", " ", "".join(self.buffer)).strip()
            if texto:
                self.blocos.append((self.bloco_atual, texto))
            self.bloco_atual = None
            self.buffer = []

        if self.pilha:
            self.pilha.pop()

    def handle_data(self, data: str) -> None:
        if self.ignorar_ate is None and self.bloco_atual is not None:
            self.buffer.append(data)


def deduplicar(blocos: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """
    Remove repeticoes que o construtor do GoDaddy gera.

    Cada cartao do site antigo carrega tres <h3> — dois com o titulo de outro
    cartao — entao o mesmo texto reaparece varias vezes na mesma pagina.
    Mantemos a primeira ocorrencia de cada (tag, texto).
    """
    vistos: set[tuple[str, str]] = set()
    saida: list[tuple[str, str]] = []
    for tag, texto in blocos:
        if LIXO.match(texto):
            continue
        chave = (tag, unicodedata.normalize("NFC", texto.casefold()))
        if chave in vistos:
            continue
        vistos.add(chave)
        saida.append((tag, texto))
    return saida


def slug_de_arquivo(nome: str) -> str:
    return unicodedata.normalize("NFC", unquote(nome[:-5]).rsplit("/", 1)[-1])


def extrair_meta(html_str: str) -> dict[str, str]:
    def meta(padrao: str) -> str:
        m = re.search(padrao, html_str, re.S | re.I)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""

    return {
        "tituloOriginal": meta(r"<title>(.*?)</title>"),
        "descricaoOriginal": meta(r'<meta name="description" content="(.*?)"'),
        "imagemOriginal": meta(r'<meta property="og:image" content="(.*?)"'),
    }


def main() -> int:
    if not ORIGEM.exists():
        print(f"faltando {ORIGEM} — rode scripts/baixar_godaddy.py antes")
        return 1

    paginas = []
    for arquivo in sorted(ORIGEM.glob("*.html")):
        html_str = arquivo.read_text(encoding="utf-8", errors="replace")
        extrator = ExtratorDePagina()
        extrator.feed(html_str)
        blocos = deduplicar(extrator.blocos)

        palavras = sum(len(t.split()) for _, t in blocos)
        paginas.append(
            {
                "slug": slug_de_arquivo(arquivo.name),
                **extrair_meta(html_str),
                "blocos": [{"tag": tag, "texto": texto} for tag, texto in blocos],
                "palavras": palavras,
            }
        )

    paginas.sort(key=lambda p: p["slug"])
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(paginas, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"paginas extraidas: {len(paginas)}  ->  {DESTINO.relative_to(RAIZ)}\n")
    for p in sorted(paginas, key=lambda x: x["palavras"]):
        aviso = "  <-- revisar" if p["palavras"] < 60 else ""
        print(f"  {p['palavras']:>5} palavras  {len(p['blocos']):>3} blocos  {p['slug']}{aviso}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

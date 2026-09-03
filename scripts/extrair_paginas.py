"""
Extrai o conteudo das 20 paginas do site GoDaddy para src/content/pages.json.

Emite HTML limpo, no mesmo formato que scripts/extrair_blog.py produz para os
posts — assim as duas superficies sao estilizadas pela mesma classe .prosa, em
vez de cada uma ter o seu proprio caminho de renderizacao.

Sobre a versao anterior, que coletava so texto plano: ela perdia informacao que
existe na fonte. Tres defeitos, todos medidos:

  - As listas eram engolidas. O GoDaddy emite `<p style="margin:0"><ol><li>...`,
    e o parser antigo, ao abrir um bloco no <p>, jogava os <li> dentro dele. Os
    "quatro itens colados num paragrafo" de /osteopatia nunca foram escritos
    assim pela autora: a fonte tem <ol><li><strong>Unidade do Corpo:</strong>...
    e o extrator e que destruia. Eram 257 <li> reais perdidos, em 16 das 20
    paginas.

  - O contador de profundidade de widget nunca era decrementado, entao depois do
    primeiro widget de conteudo o filtro de cromo parava de valer e o rodape
    entrava junto: 190 blocos <li> de menu, 10 em cada uma de 19 paginas.

  - Todo markup inline era descartado: 228 <strong>, 400 <a> e 196 <br>. Os <br>
    viravam espaco e emendavam itens distintos num rotulo so ("Acupuntura
    Tratamento de Disturbios" eram dois).

Uso:
    python scripts/extrair_paginas.py
"""

from __future__ import annotations

import html as html_mod
import json
import re
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / ".cache" / "godaddy" / "paginas"
DESTINO = RAIZ / "src" / "content" / "pages.json"

# Widgets que carregam conteudo editorial; o resto e cromo repetido em toda pagina.
WIDGETS_CONTEUDO = {"content", "about", "introduction", "featured", "html", "contact"}
# O rodape ja e barrado pelo filtro estrutural, agora que a profundidade de
# widget e decrementada de verdade — nao e preciso ignorar muita coisa aqui.
WIDGETS_IGNORADOS = {
    "header", "footer", "cookie-banner", "messaging", "social", "rss",
    "navigation", "subscribe",
}

# Blocos que sobrevivem. h1 fica de fora: o titulo da pagina e do PageShell.
BLOCOS = {"h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote"}
LISTAS = {"ul", "ol"}
INLINE = {"strong", "b", "em", "i", "br"}
NORMALIZA_INLINE = {"b": "strong", "i": "em"}
ESQUEMAS = ("http://", "https://", "mailto:", "tel:", "/", "#")

# Rotulos do menu antigo. Servem so para reconhecer a cauda de navegacao que
# escapa do filtro estrutural; ver `podar_menu`.
MENU = {
    "home", "osteopatia", "posturologia", "palmilhas personalizadas",
    "flexo-distração", "acupuntura", "rpg", "nosso blog", "quem somos",
    "contato", "tratamento da dor",
}

LIXO = re.compile(
    r"^(copyright\s*©|powered by|get directions|(this website|we) use[sd]? cookies"
    r"|todos os direitos reservados|accept|decline|cookie)",
    re.I,
)


def norm(texto: str) -> str:
    return unicodedata.normalize("NFC", texto).strip().casefold()


def so_texto(fragmento: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", fragmento)).strip()


class ExtratorDePagina(HTMLParser):
    """
    Percorre o HTML e emite blocos com o markup inline preservado.

    `abertos` e a pilha de blocos em construcao. Um <li> que aparece dentro de um
    <p> — como o GoDaddy escreve — abre um bloco proprio em vez de ser absorvido
    pelo paragrafo, que era o defeito da versao anterior.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocos: list[dict] = []
        self.pilha: list[str] = []
        self.widgets: list[int] = []     # profundidade em que cada widget abriu
        self.ignorar_ate: int | None = None
        self.abertos: list[dict] = []
        self.lista_atual: str | None = None
        self.links_abertos = 0

    def _widget(self, attrs: dict[str, str]) -> bool | None:
        m = re.search(r"\bwidget widget-([a-z0-9-]+)", attrs.get("class", ""))
        if not m:
            return None
        nome = m.group(1)
        base = nome.split("-")[0]
        if nome in WIDGETS_IGNORADOS or base in WIDGETS_IGNORADOS:
            return False
        if nome in WIDGETS_CONTEUDO or base in WIDGETS_CONTEUDO:
            return True
        # Nem conteudo nem cromo: neutro. Tratar desconhecido como cromo fazia a
        # pagina /contato sair vazia, porque o widget dela nao estava na lista.
        return None

    @property
    def dentro(self) -> bool:
        return bool(self.widgets)

    def _escrever(self, texto: str) -> None:
        if self.abertos:
            self.abertos[-1]["buffer"].append(texto)

    def _fechar(self, tag: str) -> None:
        for i in range(len(self.abertos) - 1, -1, -1):
            if self.abertos[i]["tag"] != tag:
                continue
            bloco = self.abertos.pop(i)
            conteudo = "".join(bloco["buffer"]).strip()
            conteudo = re.sub(r"(?:\s*<br />\s*)+$", "", conteudo)
            conteudo = re.sub(r"^(?:\s*<br />\s*)+", "", conteudo)
            if so_texto(conteudo):
                self.blocos.append(
                    {"tag": bloco["tag"], "html": conteudo, "lista": bloco["lista"]}
                )
            return

    def handle_starttag(self, tag: str, attrs_lista) -> None:
        attrs = {k: (v or "") for k, v in attrs_lista}
        self.pilha.append(tag)
        nivel = len(self.pilha)

        if self.ignorar_ate is not None:
            return

        # escondido do olho e do leitor de tela nao e conteudo
        if attrs.get("aria-hidden") == "true" or "hidden" in attrs:
            self.ignorar_ate = nivel
            return
        # copias fantasma de heading que o construtor injeta
        if attrs.get("aria-level") == "NaN":
            self.ignorar_ate = nivel
            return

        veredito = self._widget(attrs)
        if veredito is True:
            self.widgets.append(nivel)
        elif veredito is False:
            # cromo: pular o ramo inteiro, esteja onde estiver. A versao antiga so
            # descartava fora de widget de conteudo e, como o contador nunca
            # baixava, o rodape acabava entrando.
            self.ignorar_ate = nivel
            return

        if not self.dentro:
            return

        if tag in LISTAS:
            self.lista_atual = tag
        elif tag in BLOCOS:
            self.abertos.append(
                {"tag": tag, "buffer": [], "lista": self.lista_atual if tag == "li" else None}
            )
        elif tag == "br":
            self._escrever("<br />")
        elif tag == "a":
            href = attrs.get("href", "").strip()
            if self.abertos and href.lower().startswith(ESQUEMAS):
                self._escrever(f'<a href="{html_mod.escape(href, quote=True)}">')
                self.links_abertos += 1
        elif tag in INLINE:
            self._escrever(f"<{NORMALIZA_INLINE.get(tag, tag)}>")

    def handle_endtag(self, tag: str) -> None:
        nivel = len(self.pilha)
        if self.ignorar_ate is not None and nivel <= self.ignorar_ate:
            self.ignorar_ate = None
        if self.widgets and nivel <= self.widgets[-1]:
            self.widgets.pop()

        if tag in LISTAS:
            self.lista_atual = None
        elif tag in BLOCOS:
            self._fechar(tag)
        elif tag == "a" and self.links_abertos:
            self.links_abertos -= 1
            self._escrever("</a>")
        elif tag in INLINE and tag != "br":
            self._escrever(f"</{NORMALIZA_INLINE.get(tag, tag)}>")

        if self.pilha:
            self.pilha.pop()

    def handle_data(self, data: str) -> None:
        if self.ignorar_ate is None and self.dentro and self.abertos:
            self._escrever(html_mod.escape(data))


def podar_menu(blocos: list[dict]) -> tuple[list[dict], int]:
    """
    Remove a cauda de navegacao que o rodape do site antigo deixa no fim.

    Percorre de tras para frente e para no PRIMEIRO bloco que nao e item de menu:
    uma lista legitima que contenha "Contato" no meio do texto sobrevive inteira.
    So corta corrida de 6 itens ou mais — abaixo disso e mais provavel ser
    conteudo de verdade.
    """
    fim = len(blocos)
    while (
        fim > 0
        and blocos[fim - 1]["tag"] == "li"
        and norm(so_texto(blocos[fim - 1]["html"])) in MENU
    ):
        fim -= 1
    cortados = len(blocos) - fim
    return (blocos[:fim], cortados) if cortados >= 6 else (blocos, 0)


def renivelar(blocos: list[dict]) -> None:
    """
    Reescreve os niveis de heading para comecarem em h2, sem salto.

    O construtor usa h3 e h4 sem criterio: ha pagina so com h4, e pagina com h2 e
    h4 mas sem h3. Como o h1 e o titulo da pagina, emitir esses valores crus
    criaria salto de nivel, que falha em auditoria de acessibilidade. Os niveis
    presentes sao remapeados em sequencia, preservando a hierarquia relativa que
    a autora escreveu.
    """
    presentes = sorted({int(b["tag"][1]) for b in blocos if re.fullmatch(r"h[2-6]", b["tag"])})
    mapa = {n: f"h{min(i + 2, 6)}" for i, n in enumerate(presentes)}
    for b in blocos:
        if re.fullmatch(r"h[2-6]", b["tag"]):
            b["tag"] = mapa[int(b["tag"][1])]


def montar_html(blocos: list[dict]) -> str:
    """Serializa os blocos, reabrindo <ul>/<ol> em torno das corridas de <li>."""
    saida: list[str] = []
    lista_aberta: str | None = None
    for b in blocos:
        if b["tag"] == "li":
            alvo = b.get("lista") or "ul"
            if lista_aberta != alvo:
                if lista_aberta:
                    saida.append(f"</{lista_aberta}>")
                saida.append(f"<{alvo}>")
                lista_aberta = alvo
            saida.append(f"<li>{b['html']}</li>")
            continue
        if lista_aberta:
            saida.append(f"</{lista_aberta}>")
            lista_aberta = None
        saida.append(f"<{b['tag']}>{b['html']}</{b['tag']}>")
    if lista_aberta:
        saida.append(f"</{lista_aberta}>")
    return "".join(saida)


def extrair_meta(html_str: str) -> dict[str, str]:
    def meta(padrao: str) -> str:
        m = re.search(padrao, html_str, re.S | re.I)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""

    return {
        "tituloOriginal": meta(r"<title>(.*?)</title>"),
        "descricaoOriginal": meta(r'<meta name="description" content="(.*?)"'),
    }


def titulo_da_fonte(html_str: str) -> str:
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html_str, re.S | re.I)
    return so_texto(m.group(1)) if m else ""


def slug_de_arquivo(nome: str) -> str:
    return unicodedata.normalize("NFC", unquote(nome[:-5]).rsplit("/", 1)[-1])


def main() -> int:
    if not ORIGEM.exists():
        print(f"faltando {ORIGEM} — rode scripts/baixar_godaddy.py antes")
        return 1

    paginas = []
    total_menu = 0

    for arquivo in sorted(ORIGEM.glob("*.html")):
        bruto = arquivo.read_text(encoding="utf-8", errors="replace")
        extrator = ExtratorDePagina()
        extrator.feed(bruto)

        titulo = titulo_da_fonte(bruto)
        blocos = [
            b
            for b in extrator.blocos
            if not LIXO.match(so_texto(b["html"]))
            and norm(so_texto(b["html"])) != norm(titulo)
        ]

        # cada cartao do construtor repete o mesmo texto tres vezes; fica a 1a
        vistos: set[tuple[str, str]] = set()
        unicos = []
        for b in blocos:
            chave = (b["tag"], norm(so_texto(b["html"])))
            if chave in vistos:
                continue
            vistos.add(chave)
            unicos.append(b)

        unicos, cortados = podar_menu(unicos)
        total_menu += cortados
        renivelar(unicos)

        corpo = montar_html(unicos)
        paginas.append(
            {
                "slug": slug_de_arquivo(arquivo.name),
                "titulo": titulo,
                **extrair_meta(bruto),
                "html": corpo,
                "palavras": len(so_texto(corpo).split()),
                "cortadosDoMenu": cortados,
            }
        )

    paginas.sort(key=lambda p: p["slug"])
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(paginas, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"paginas extraidas: {len(paginas)}  ->  {DESTINO.relative_to(RAIZ)}")
    print(f"blocos de menu removidos: {total_menu}\n")
    for p in sorted(paginas, key=lambda x: x["palavras"]):
        c = {t: p["html"].count(f"<{t}") for t in ("h2", "h3", "h4", "p>", "li>", "strong>", "a ")}
        aviso = "  <-- revisar" if p["palavras"] < 60 else ""
        print(
            f"  {p['palavras']:>5}p  h2:{c['h2']:>2} h3:{c['h3']:>2} h4:{c['h4']:>2} "
            f"p:{c['p>']:>2} li:{c['li>']:>3} b:{c['strong>']:>3} a:{c['a ']:>2}  {p['slug']}{aviso}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

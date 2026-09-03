"""
Extrai os 68 posts do blog GoDaddy para src/content/posts.json.

O corpo do post NAO esta no HTML servido: o widget de blog do GoDaddy e
renderizado por JavaScript e o HTML so traz um spinner. O conteudo real vem
embutido em `window._BLOG_DATA`, onde `post.fullContent` e um documento
Draft.js (blocks + entityMap) serializado.

Isso e uma boa noticia: em vez de sanitizar HTML sujo cheio de <div> e estilo
inline, convertemos uma arvore estruturada para HTML limpo e deterministico.

Uso:
    python scripts/extrair_blog.py
"""

from __future__ import annotations

import html
import json
import re
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / ".cache" / "godaddy" / "posts"
DESTINO = RAIZ / "src" / "content" / "posts.json"

# Draft.js indexa offsets em unidades de codigo UTF-16 (semantica de string do
# JavaScript). Em Python, indices sao code points: qualquer emoji ou caractere
# fora do BMP desalinharia estilos e links. Por isso todo o fatiamento acontece
# sobre unidades UTF-16 reais.

TAG_INLINE = {
    "BOLD": "strong",
    "ITALIC": "em",
    "UNDERLINE": "u",
    "HIGHLIGHT": "mark",
}

# Esquemas aceitos em href. O extrator monta o HTML (nao filtra um HTML alheio),
# entao nao ha como injetar tag nem atributo — mas o VALOR do href vem do
# entityMap do editor, e "javascript:" sobreviveria ao escape de aspas. Nos posts
# atuais so existe um link (http), porem a clinica segue publicando pelo GoDaddy
# ate a troca, entao a checagem fica.
ESQUEMAS_PERMITIDOS = ("http://", "https://", "mailto:", "tel:", "/", "#")

MESES = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}


def unidades_utf16(texto: str) -> list[str]:
    """Quebra o texto em unidades de codigo UTF-16, como o JavaScript faz."""
    bruto = texto.encode("utf-16-le")
    return [bruto[i : i + 2].decode("utf-16-le", errors="replace") for i in range(0, len(bruto), 2)]


def montar_inline(bloco: dict, entidades: dict) -> str:
    """
    Converte um bloco Draft.js em HTML inline.

    Estilos podem se sobrepor livremente (negrito dentro de italico, etc.), entao
    cada unidade recebe o conjunto de estilos que a cobre e sequencias com o
    mesmo conjunto viram um unico par de tags. Links entram por cima, ja que
    entityRanges nao se aninham nesta base.
    """
    unidades = unidades_utf16(bloco.get("text", ""))
    total = len(unidades)
    if total == 0:
        return ""

    estilos: list[frozenset[str]] = [frozenset() for _ in range(total)]
    for faixa in bloco.get("inlineStyleRanges", []):
        estilo = faixa.get("style")
        if estilo not in TAG_INLINE:
            continue
        ini = max(0, faixa.get("offset", 0))
        fim = min(total, ini + faixa.get("length", 0))
        for i in range(ini, fim):
            estilos[i] = estilos[i] | {estilo}

    links: list[str | None] = [None] * total
    for faixa in bloco.get("entityRanges", []):
        ent = entidades.get(str(faixa.get("key")), {})
        if ent.get("type") != "LINK":
            continue
        url = (ent.get("data") or {}).get("url")
        if not url:
            continue
        ini = max(0, faixa.get("offset", 0))
        fim = min(total, ini + faixa.get("length", 0))
        for i in range(ini, fim):
            links[i] = url

    partes: list[str] = []
    i = 0
    while i < total:
        j = i
        while j < total and estilos[j] == estilos[i] and links[j] == links[i]:
            j += 1

        texto = html.escape("".join(unidades[i:j]))
        # ordem estavel para o HTML nao oscilar entre execucoes
        for estilo in sorted(estilos[i]):
            tag = TAG_INLINE[estilo]
            texto = f"<{tag}>{texto}</{tag}>"
        alvo = links[i]
        if alvo and alvo.strip().lower().startswith(ESQUEMAS_PERMITIDOS):
            destino = html.escape(alvo.strip(), quote=True)
            externo = destino.startswith("http") and "podoposture.com.br" not in destino
            extra = ' target="_blank" rel="noopener noreferrer"' if externo else ""
            texto = f'<a href="{destino}"{extra}>{texto}</a>'
        partes.append(texto)
        i = j

    return "".join(partes)


def mapa_de_headings(blocos: list[dict]) -> dict[str, str]:
    """
    Normaliza os niveis de heading do post.

    O editor do GoDaddy usa header-four como subtitulo padrao (296 ocorrencias
    contra 7 de header-two). Como o titulo do post e o <h1> da pagina, emitir
    <h4> direto criaria salto h1->h4. Aqui os niveis presentes sao remapeados em
    sequencia a partir de <h2>, preservando a hierarquia relativa do autor.
    """
    ordem = ["header-one", "header-two", "header-three", "header-four", "header-five", "header-six"]
    presentes = [t for t in ordem if any(b.get("type") == t for b in blocos)]
    return {tipo: f"h{min(i + 2, 6)}" for i, tipo in enumerate(presentes)}


def bloco_atomico(bloco: dict, entidades: dict) -> str:
    """Bloco 'atomic' carrega a imagem do post em uma entidade IMAGE."""
    for faixa in bloco.get("entityRanges", []):
        ent = entidades.get(str(faixa.get("key")), {})
        if ent.get("type") != "IMAGE":
            continue
        dados = ent.get("data") or {}
        src = dados.get("src") or dados.get("url")
        if not src:
            continue
        alt = html.escape(dados.get("alt") or "", quote=True)
        legenda = dados.get("caption") or ""
        figura = f'<figure><img src="{html.escape(src, quote=True)}" alt="{alt}" loading="lazy" />'
        if legenda:
            figura += f"<figcaption>{html.escape(legenda)}</figcaption>"
        return figura + "</figure>"
    return ""


def para_html(fullcontent: str) -> tuple[str, list[str]]:
    """Converte o documento Draft.js em HTML limpo. Devolve (html, imagens)."""
    doc = json.loads(fullcontent)
    blocos = doc.get("blocks", [])
    entidades = {str(k): v for k, v in (doc.get("entityMap") or {}).items()}
    headings = mapa_de_headings(blocos)

    saida: list[str] = []
    imagens: list[str] = []
    lista_aberta: str | None = None

    def fechar_lista() -> None:
        nonlocal lista_aberta
        if lista_aberta:
            saida.append(f"</{lista_aberta}>")
            lista_aberta = None

    for bloco in blocos:
        tipo = bloco.get("type", "unstyled")

        if tipo in ("unordered-list-item", "ordered-list-item"):
            alvo = "ul" if tipo == "unordered-list-item" else "ol"
            if lista_aberta != alvo:
                fechar_lista()
                saida.append(f"<{alvo}>")
                lista_aberta = alvo
            saida.append(f"<li>{montar_inline(bloco, entidades)}</li>")
            continue

        fechar_lista()

        if tipo == "atomic":
            figura = bloco_atomico(bloco, entidades)
            if figura:
                saida.append(figura)
                src = re.search(r'src="([^"]+)"', figura)
                if src:
                    imagens.append(html.unescape(src.group(1)))
            continue

        conteudo = montar_inline(bloco, entidades)
        if not conteudo.strip():
            # o editor do GoDaddy usa blocos vazios como espacador; no site novo
            # o espacamento e do CSS
            continue

        if tipo in headings:
            tag = headings[tipo]
            saida.append(f"<{tag}>{conteudo}</{tag}>")
        elif tipo == "blockquote":
            saida.append(f"<blockquote><p>{conteudo}</p></blockquote>")
        else:
            saida.append(f"<p>{conteudo}</p>")

    fechar_lista()
    return "".join(saida), imagens


def texto_puro(html_str: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html_str)).strip()


def rotulo_data(iso: str) -> str:
    """'2024-08-11T13:37:48.761Z' -> '11 de agosto de 2024'."""
    inverso = {v: k for k, v in MESES.items() if k not in ("marco",)}
    ano, mes, dia = int(iso[0:4]), int(iso[5:7]), int(iso[8:10])
    return f"{dia} de {inverso[mes]} de {ano}"


def slug_de_arquivo(nome: str) -> str:
    from urllib.parse import unquote

    caminho = unquote(nome[:-5])  # tira .html
    return unicodedata.normalize("NFC", caminho.rsplit("/", 1)[-1])


def main() -> int:
    if not ORIGEM.exists():
        print(f"faltando {ORIGEM} — rode scripts/baixar_godaddy.py antes")
        return 1

    posts = []
    sem_conteudo = []

    for arquivo in sorted(ORIGEM.glob("*.html")):
        s = arquivo.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"window\._BLOG_DATA\s*=\s*(\{.*?\});?\s*</script>", s, re.S)
        if not m:
            sem_conteudo.append(arquivo.name)
            continue

        dados = json.loads(m.group(1))
        post = dados.get("post") or {}
        cabeca = dados.get("head") or {}

        corpo_html, imagens = para_html(post["fullContent"]) if post.get("fullContent") else ("", [])
        plano = texto_puro(corpo_html)
        iso = post.get("publishedDate") or post.get("date") or ""

        resumo = ""
        for meta in cabeca.get("meta", []):
            if meta.get("key") == "description":
                resumo = meta.get("value", "").strip()
                break
        if not resumo:
            resumo = plano[:180].rstrip()

        posts.append(
            {
                "slug": slug_de_arquivo(arquivo.name),
                "titulo": (post.get("title") or "").strip(),
                "resumo": resumo,
                "dataISO": iso[:10],
                "dataRotulo": rotulo_data(iso) if iso else "",
                "categorias": post.get("categories") or [],
                "capa": post.get("featuredImage") or "",
                "html": corpo_html,
                "palavras": len(plano.split()),
                "imagens": imagens,
            }
        )

    posts.sort(key=lambda p: p["dataISO"], reverse=True)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")

    curtos = [p for p in posts if p["palavras"] < 80]
    print(f"posts extraidos: {len(posts)}  ->  {DESTINO.relative_to(RAIZ)}")
    print(f"sem _BLOG_DATA: {len(sem_conteudo)}")
    print(f"mediana de palavras: {sorted(p['palavras'] for p in posts)[len(posts)//2]}")
    print(f"imagens referenciadas: {sum(len(p['imagens']) for p in posts)}")
    print(f"posts com menos de 80 palavras (revisar a mao): {len(curtos)}")
    for p in curtos:
        print(f"   {p['palavras']:>4} palavras  {p['slug'][:65]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""
Restaura a estrutura que o editor do GoDaddy nao registrou.

A autora escrevia num editor visual sem estilos de paragrafo: para marcar uma
secao ela sublinhava ou punha em negrito uma linha solta, e para fazer uma lista
digitava o hifen ou o numero na frente. O resultado e semanticamente plano —
paragrafo atras de paragrafo — e nenhum CSS conserta isso, porque a informacao
de que aquilo era um titulo ou um item nao existe no documento.

Este modulo recupera essa estrutura por deteccao de padrao, sobre o HTML que os
extratores ja produziram. Duas regras governam o que esta aqui:

  1. Nenhuma palavra e reescrita. So muda a tag em volta, ou o marcador que a
     propria autora digitou sai do texto e vira marcador de lista de verdade.
  2. Toda regra e conservadora e conta o que fez. Um falso positivo aqui vira
     um titulo onde era so uma frase enfatica, entao na duvida a regra nao
     dispara — e o relatorio mostra caso a caso o que mudou.

Uso: importado por extrair_blog.py. Rodado direto, faz autoteste:
    python scripts/normalizar_conteudo.py
"""

from __future__ import annotations

import re
import unicodedata

# Um bloco de topo do HTML que os extratores emitem: sem aninhamento de bloco,
# sem quebra de linha, tags conhecidas. Por isso regex e suficiente e confiavel.
BLOCO = re.compile(r"<(h[2-6]|p|ul|ol|li|figure|blockquote)\b[^>]*>.*?</\1>", re.S)

MARCADOR_LISTA = re.compile(r"^\s*(?:<strong>\s*)?[-–—•]\s+")
MARCADOR_NUM = re.compile(r"^\s*(?:<strong>\s*)?(\d+)[.)]\s+")

# So o ponto final (e o ponto-e-virgula) denunciam frase corrida. Interrogacao
# NAO entra: os titulos da autora sao quase todos perguntas — "O Que e Zumbido
# Somatossensorial?", "Como Funciona a Neuromodulacao Auricular Vagal?" — e
# barra-los aqui derrubaria justamente os casos que a regra existe para pegar.
FIM_DE_FRASE = re.compile(r"[.;]\s*$")


def texto_de(fragmento: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", fragmento)).strip()


def blocos_de(html: str) -> list[str]:
    """Quebra o HTML na sequencia de blocos de topo."""
    return [m.group(0) for m in BLOCO.finditer(html)]


def parece_titulo(texto: str) -> bool:
    """Criterio comum as regras de promocao: curto, sem ponto final, com letra."""
    return (
        3 <= len(texto) <= 90
        and not FIM_DE_FRASE.search(texto)
        and any(c.isalpha() for c in texto)
    )


def promover_sublinhado(blocos: list[str], registro: list[str]) -> list[str]:
    """
    `<p><u>Texto</u></p>` isolado vira `<h2>`.

    No editor, sublinhar a linha inteira era o jeito da autora marcar secao. So
    dispara quando o sublinhado cobre o paragrafo inteiro: sublinhado no meio de
    uma frase e enfase, e continua sendo enfase.
    """
    saida = []
    for b in blocos:
        m = re.fullmatch(r"<p><u>(.*?)</u></p>", b, re.S)
        if m and parece_titulo(texto_de(m.group(1))):
            registro.append(f"u->h2  {texto_de(m.group(1))[:70]}")
            saida.append(f"<h2>{m.group(1)}</h2>")
        else:
            saida.append(b)
    return saida


def promover_negrito(blocos: list[str], registro: list[str], slug: str) -> list[str]:
    """
    `<p><strong>Texto</strong></p>` isolado vira heading.

    Esta e a regra mais arriscada do modulo: negrito numa linha sozinha as vezes
    e enfase, nao titulo. As guardas: o texto tem cara de titulo, o bloco seguinte
    e um paragrafo comum (titulo nao fecha secao), e — a que mais importa — se
    mais de 40% dos paragrafos do post sao candidatos, entao negrito e tique de
    escrita da autora naquele texto e nenhum vira titulo.
    """
    paragrafos = [b for b in blocos if b.startswith("<p>")]
    candidatos = [
        i
        for i, b in enumerate(blocos)
        if re.fullmatch(r"<p><strong>(.*?)</strong></p>", b, re.S)
        and parece_titulo(texto_de(b))
        and i + 1 < len(blocos)
        and blocos[i + 1].startswith("<p>")
    ]
    if not paragrafos or len(candidatos) / len(paragrafos) > 0.4:
        if candidatos:
            registro.append(
                f"negrito NAO promovido em {slug}: {len(candidatos)} de "
                f"{len(paragrafos)} paragrafos — e estilo do texto, nao titulo"
            )
        return blocos

    # se o post ja tem h2 de verdade, o negrito entra um degrau abaixo
    nivel = "h3" if any(b.startswith("<h2") for b in blocos) else "h2"
    saida = list(blocos)
    for i in candidatos:
        interno = re.fullmatch(r"<p><strong>(.*?)</strong></p>", blocos[i], re.S).group(1)
        registro.append(f"strong->{nivel}  {texto_de(interno)[:70]}")
        saida[i] = f"<{nivel}>{interno}</{nivel}>"
    return saida


def agrupar_listas(blocos: list[str], registro: list[str]) -> list[str]:
    """
    Paragrafos que comecam com marcador viram lista de verdade.

    So agrupa corrida de dois ou mais: um item solto quase sempre e uma frase que
    comeca com travessao, nao uma lista de um item. Para numeros, a sequencia tem
    de ser consecutiva a partir de 1 — sem isso, "1. Meralgia parestesica" usado
    como titulo de secao seria fundido com o proximo numero que aparecesse.
    """
    saida: list[str] = []
    i = 0
    while i < len(blocos):
        b = blocos[i]
        if not b.startswith("<p>"):
            saida.append(b)
            i += 1
            continue

        interno = re.fullmatch(r"<p>(.*?)</p>", b, re.S)
        if not interno:
            saida.append(b)
            i += 1
            continue

        if MARCADOR_LISTA.match(interno.group(1)):
            corrida = []
            j = i
            while j < len(blocos):
                m = re.fullmatch(r"<p>(.*?)</p>", blocos[j], re.S)
                if not m or not MARCADOR_LISTA.match(m.group(1)):
                    break
                corrida.append(MARCADOR_LISTA.sub("", m.group(1)).strip())
                j += 1
            if len(corrida) >= 2:
                registro.append(f"ul com {len(corrida)} itens: {corrida[0][:50]}")
                saida.append("<ul>" + "".join(f"<li>{t}</li>" for t in corrida) + "</ul>")
                i = j
                continue

        m_num = MARCADOR_NUM.match(interno.group(1))
        if m_num and m_num.group(1) == "1":
            corrida = []
            esperado = 1
            j = i
            while j < len(blocos):
                mm = re.fullmatch(r"<p>(.*?)</p>", blocos[j], re.S)
                if not mm:
                    break
                mn = MARCADOR_NUM.match(mm.group(1))
                if not mn or int(mn.group(1)) != esperado:
                    break
                corrida.append(MARCADOR_NUM.sub("", mm.group(1)).strip())
                esperado += 1
                j += 1
            if len(corrida) >= 2:
                registro.append(f"ol com {len(corrida)} itens: {corrida[0][:50]}")
                saida.append("<ol>" + "".join(f"<li>{t}</li>" for t in corrida) + "</ol>")
                i = j
                continue

        saida.append(b)
        i += 1
    return saida


def remover_capa_repetida(blocos: list[str], capa: str, registro: list[str]) -> list[str]:
    """
    Tira a primeira figura quando ela e a mesma imagem da capa.

    O editor inseria a arte de destaque tambem no comeco do corpo, entao a mesma
    imagem aparecia duas vezes na pagina: uma como capa e outra logo abaixo do
    titulo, ocupando a tela inteira antes da primeira linha de texto.
    """
    if not capa or not blocos or not blocos[0].startswith("<figure"):
        return blocos
    src = re.search(r'src="([^"]+)"', blocos[0])
    # o corpo traz a URL sem protocolo ("//img1.wsimg...") e a capa com ele,
    # entao a comparacao ignora o esquema
    def chave(u: str) -> str:
        return re.sub(r"^https?:", "", u)

    if src and chave(src.group(1)) == chave(capa):
        registro.append("capa repetida no corpo removida")
        return blocos[1:]
    return blocos


def remover_resumo_repetido(blocos: list[str], resumo: str, registro: list[str]) -> list[str]:
    """
    Tira o primeiro bloco quando ele repete o resumo do post.

    O resumo ja aparece como subtitulo no cabecalho da pagina; deixa-lo tambem
    como primeira linha do corpo faz o leitor ler a mesma frase duas vezes
    seguidas — e, com a entrada de texto em destaque, duas vezes em corpo grande.
    """
    if not resumo or not blocos:
        return blocos
    primeiro = texto_de(blocos[0]).casefold()
    if primeiro and primeiro == resumo.strip().casefold():
        registro.append(f"resumo repetido no inicio do corpo removido: {primeiro[:60]}")
        return blocos[1:]
    return blocos


def normalizar(html: str, capa: str, slug: str, resumo: str = "") -> tuple[str, list[str]]:
    """Aplica as regras na ordem e devolve (html, registro do que mudou)."""
    registro: list[str] = []
    blocos = blocos_de(html)
    blocos = remover_capa_repetida(blocos, capa, registro)
    blocos = remover_resumo_repetido(blocos, resumo, registro)
    blocos = promover_sublinhado(blocos, registro)
    blocos = promover_negrito(blocos, registro, slug)
    blocos = agrupar_listas(blocos, registro)
    return "".join(blocos), registro


def _autoteste() -> None:
    reg: list[str] = []
    assert promover_sublinhado(["<p><u>O Que e Zumbido?</u></p>"], reg) == [
        "<h2>O Que e Zumbido?</h2>"
    ]
    # sublinhado no meio de frase nao vira titulo
    assert promover_sublinhado(["<p>texto <u>enfase</u> aqui</p>"], reg) == [
        "<p>texto <u>enfase</u> aqui</p>"
    ]
    # frase completa nao vira titulo
    assert promover_sublinhado(["<p><u>Isto e uma frase inteira.</u></p>"], reg)[0].startswith("<p>")

    lista = agrupar_listas(
        ["<p>- um</p>", "<p>- dois</p>", "<p>texto</p>"], reg
    )
    assert lista == ["<ul><li>um</li><li>dois</li></ul>", "<p>texto</p>"], lista
    # item solto continua paragrafo
    assert agrupar_listas(["<p>- so um</p>"], reg) == ["<p>- so um</p>"]
    # numeracao nao consecutiva nao agrupa
    assert agrupar_listas(["<p>1. a</p>", "<p>3. b</p>"], reg) == ["<p>1. a</p>", "<p>3. b</p>"]
    assert agrupar_listas(["<p>1. a</p>", "<p>2. b</p>"], reg)[0].startswith("<ol>")

    # negrito demais = estilo do texto, nao titulo
    muitos = ["<p><strong>A</strong></p>", "<p>x</p>", "<p><strong>B</strong></p>", "<p>y</p>"]
    assert promover_negrito(muitos, reg, "t") == muitos

    print("autoteste ok")


if __name__ == "__main__":
    _autoteste()

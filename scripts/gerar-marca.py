"""
Gera src/components/brand-mark.tsx a partir dos glyphs da Newsreader
(fonte variavel do proprio site, instanciada em wght 500) e da geometria
medida no master assets/marca/podoposture.png (2036x716):
  - "pod" na linha de cima, "p"+"sture" na de baixo
  - os dois "o" sao os discos verdes do master (elipses medidas)
  - as 9 vertebras sao circulos medidos no master, um no' animavel cada
Sem autotrace: os paths das letras vem do arquivo da fonte.
"""
import glob
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

# --- fonte: o woff2 normal (nao italico) da Newsreader dentro do build ---
fonte = None
for f in glob.glob(".next/static/media/*.woff2"):
    t = TTFont(f)
    nome = (t["name"].getDebugName(1) or "")
    sub = (t["name"].getDebugName(2) or "")
    cm = t.getBestCmap() or {}
    if ("Newsreader" in nome and "Italic" not in nome + sub and "fvar" in t
            and {ord(c) for c in "podsture"} <= set(cm)):
        fonte = f
        break
assert fonte, "Newsreader nao encontrada no build"
font = TTFont(fonte)
instantiateVariableFont(font, {"wght": 500}, inplace=True)
upm = font["head"].unitsPerEm
glyphset = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"]

def medidas(ch):
    g = cmap[ord(ch)]
    return g, hmtx[g][0]

TRACK = -10  # units/em: aproxima de leve, a Newsreader e' mais larga que o master

def compor(texto, x0, baseline, em_px):
    """Devolve (path_d, largura_px) do texto ancorado em x0/baseline."""
    esc = em_px / upm
    pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.1f}")
    x = x0
    for ch in texto:
        g, adv = medidas(ch)
        tp = TransformPen(pen, Transform(esc, 0, 0, -esc, x, baseline))
        glyphset[g].draw(tp)
        x += (adv + TRACK) * esc
    return pen.getCommands(), x - x0

def largura(texto, em_px):
    esc = em_px / upm
    return sum(medidas(ch)[1] + TRACK for ch in texto) * esc

def xheight_px(em_px):
    bp = BoundsPen(glyphset)
    glyphset[cmap[ord("o")]].draw(bp)
    return bp.bounds[3] * em_px / upm  # topo do "o" acima da baseline

# --- geometria do master ---
# Escala pela altura otica: o "o" do texto com a mesma altura dos discos (252).
EM = 560
EM = EM * 252.0 / xheight_px(EM)
print("EM final: %.0f (x-height %.1f)" % (EM, xheight_px(EM)))
BASE1, BASE2 = 345, 626
# linha 1: "pod" termina encostando no disco (que comeca em x=881)
w_pod = largura("pod", EM)
d_pod, _ = compor("pod", 858 - w_pod, BASE1, EM)
# linha 2: "p" termina antes do disco (553); "sture" comeca depois (790)
w_p = largura("p", EM)
d_p, _ = compor("p", 530 - w_p, BASE2, EM)
d_sture, w_sture = compor("sture", 800, BASE2, EM)
x_min = 858 - w_pod
x_max = 800 + w_sture
print("larguras: pod %.0f  p %.0f  sture %.0f | x %.0f..%.0f" % (w_pod, w_p, w_sture, x_min, x_max))

DISCOS = [(994.3, 219.1, 113.0, 126.0), (665.7, 499.7, 113.0, 126.0)]
VERTS = [(876.0, 75.5, 16.2), (840.4, 125.7, 21.7), (822.5, 196.7, 27.7),
         (825.5, 279.4, 30.5), (840.4, 366.5, 35.0), (855.3, 452.2, 30.5),
         (846.4, 531.2, 27.7), (825.5, 595.4, 20.0), (794.6, 646.5, 16.0)]

linhas = []
a = linhas.append
a("/**")
a(" * Marca recomposta a mao: letras sao glyphs da Newsreader wght 500 (a fonte")
a(" * de display do proprio site), sem autotrace; os dois discos e as nove")
a(" * vertebras usam a geometria medida no master (2036x716).")
a(" * Cores da marca: #0E71B4 e #96BF0D. Gerador: scripts/gerar-marca.py")
a(" */")
a("export function BrandMark({ className }: { className?: string }) {")
a("  return (")
a("    <svg")
a('      viewBox="%.0f -18 %.0f 758"' % (x_min - 16, (x_max - x_min) + 32))
a("      className={className}")
a('      aria-hidden="true"')
a('      focusable="false"')
a("    >")
a("      <defs>")
a('        <radialGradient id="marca-disco" cx="0.36" cy="0.3" r="0.85">')
a('          <stop offset="0%" stopColor="#a8ce27" />')
a('          <stop offset="100%" stopColor="#96BF0D" />')
a("        </radialGradient>")
a("      </defs>")
a("")
a("      {/* Letras */}")
for d in (d_pod, d_p, d_sture):
    a('      <path fill="#0E71B4" d="%s" />' % d)
a("")
a('      {/* Os dois "o": discos com leve luz, borda de acabamento */}')
for cx, cy, rx, ry in DISCOS:
    a('      <ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="url(#marca-disco)" stroke="#4b6007" strokeOpacity={0.16} strokeWidth={3} />' % (cx, cy, rx, ry))
a("")
a("      {/* Coluna: 9 vertebras, de cima para baixo, um no' animavel cada */}")
a('      <g fill="url(#marca-disco)">')
for i, (cx, cy, r) in enumerate(VERTS):
    a('        <circle className="marca-vertebra" style={{ ["--v" as string]: %d }} cx="%.1f" cy="%.1f" r="%.1f" />' % (i, cx, cy, r))
a("      </g>")
a("    </svg>")
a("  );")
a("}")

open("src/components/brand-mark.tsx", "w", encoding="utf-8").write("\n".join(linhas) + "\n")
print("brand-mark.tsx gerado: %d linhas" % len(linhas))

import numpy as np, potrace
from PIL import Image
from collections import deque

SRC = r"C:\Projetos\Web\podoposture\public\marca\podoposture.png"
im = Image.open(SRC).convert("RGBA")
a = np.array(im)
H, W = a.shape[:2]
rgb = a[..., :3].astype(int)
op = a[..., 3] > 128

# Azul tem B > G; verde tem G > B. Separacao por canal pega tambem o
# antialias, que a distancia ate a cor exata descartaria.
blue = op & (rgb[..., 2] > rgb[..., 1] + 20)
green = op & (rgb[..., 1] > rgb[..., 2] + 20)
print("mask azul %d px, verde %d px, sobra %d px" % (blue.sum(), green.sum(), (op & ~blue & ~green).sum()))

def comps(mask, minarea=40):
    lab = np.zeros(mask.shape, np.int32); n = 0; out = []
    for y in range(H):
        for x in range(W):
            if mask[y, x] and lab[y, x] == 0:
                n += 1; q = deque([(y, x)]); lab[y, x] = n
                while q:
                    cy, cx = q.popleft()
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny, nx = cy+dy, cx+dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny,nx] and lab[ny,nx]==0:
                            lab[ny,nx] = n; q.append((ny,nx))
    for i in range(1, n+1):
        m = lab == i
        if m.sum() < minarea: continue
        ys, xs = np.where(m)
        out.append({"mask": m, "cx": xs.mean(), "cy": ys.mean(), "area": int(m.sum()),
                    "rx": (xs.max()-xs.min()+1)/2, "ry": (ys.max()-ys.min()+1)/2})
    return out

def trace(mask, turd=4):
    bmp = potrace.Bitmap(~mask)  # potracer inverte no construtor: ink = ~entrada
    path = bmp.trace(turdsize=turd, alphamax=1.0, opticurve=True, opttolerance=0.2)
    def pt(p):
        try: return float(p.x), float(p.y)
        except AttributeError: return float(p[0]), float(p[1])
    d = []
    for curve in path:
        x, y = pt(curve.start_point)
        d.append("M%.1f %.1f" % (x, y))
        for seg in curve:
            if seg.is_corner:
                cx, cy = pt(seg.c); ex, ey = pt(seg.end_point)
                d.append("L%.1f %.1fL%.1f %.1f" % (cx, cy, ex, ey))
            else:
                x1, y1 = pt(seg.c1); x2, y2 = pt(seg.c2); ex, ey = pt(seg.end_point)
                d.append("C%.1f %.1f %.1f %.1f %.1f %.1f" % (x1, y1, x2, y2, ex, ey))
        d.append("Z")
    return "".join(d)

blue_d = trace(blue)
print("path azul: %d chars" % len(blue_d))

gc = sorted(comps(green), key=lambda c: c["cy"])
print("componentes verdes: %d" % len(gc))
parts = []
for c in gc:
    kind = "letra" if c["area"] > 20000 else "vertebra"
    parts.append({"kind": kind, "cx": c["cx"], "cy": c["cy"], "d": trace(c["mask"], turd=2), "area": c["area"]})
    print("  %-9s cx=%7.1f cy=%7.1f area=%6d  path %d chars" % (kind, c["cx"], c["cy"], c["area"], len(parts[-1]["d"])))

import json
json.dump({"w": W, "h": H, "blue": blue_d, "green": parts}, open(r"%s/logo.json" % r"C:/Users/guilh/AppData/Local/Temp/claude/C--Projetos-Web/5983c6e1-718b-44f2-ac46-a3b8f1e85652/scratchpad", "w"))
print("ok")

"""Build TTF + WOFF2 pixel fonts from One Must Fall 2097's own bitmap fonts.

    pip install fonttools brotli
    python3 tools/build_fonts.py            # writes assets/fonts/*.ttf and *.woff2

Fonts:
  OMF 2097 NetArena  NETFONT1.PCX, the NetArena lettering the launcher uses (taken from the hex string
                     in index.html): proportional, 9-pixel cell.
  OMF 2097 Big       GRAPHCHR.DAT, the game's menu and HUD font: 224 glyphs of 8x8, monospaced.
  OMF 2097 Small     CHARSMAL.DAT, the game's small font: 224 glyphs of 6x6 (the low 6 bits of each byte).

Codes 128-255 follow code page 437; the slots where the game only has a placeholder box (the box
drawing range) are left out. Each font pixel is a 100-unit square and unitsPerEm is the cell height
times 100, so a font-size equal to the cell height (9, 8 or 6 px) or a whole multiple of it is crisp.
"""
import collections
import os
import re
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PX = 100
ORIGIN = "Glyphs from One Must Fall 2097 (Diversions Entertainment / Epic MegaGames, 1994; freeware since 1999)"


def netarena():
    """{code: (width, pixel rows)}. Per glyph: one hex digit of width, then 9 rows of 3 hex digits
    whose low `width` bits are the pixels, highest bit leftmost."""
    html = open(os.path.join(REPO, "index.html"), encoding="utf-8").read()
    hexs = re.search(r'const FONT = "([0-9a-f]+)"', html).group(1)
    glyphs = {}
    for n, i in enumerate(range(0, len(hexs), 28)):
        w = int(hexs[i], 16)
        rows = [int(hexs[i + 1 + r * 3: i + 4 + r * 3], 16) for r in range(9)]
        glyphs[32 + n] = (w, [[(row >> (w - 1 - b)) & 1 for b in range(w)] for row in rows])
    return glyphs


def dat(name, h, w):
    """{code: (width, pixel rows)} for the game's .DAT fonts: h bytes per glyph from code 32,
    the low w bits of each byte, highest bit leftmost."""
    data = open(os.path.join(REPO, "installed_game", name), "rb").read()
    glyphs = {}
    for n in range(len(data) // h):
        rows = data[n * h:(n + 1) * h]
        glyphs[32 + n] = (w, [[(row >> (w - 1 - b)) & 1 for b in range(w)] for row in rows])
    return glyphs


FONTS = [
    # family, file stem, glyphs, monospaced advance in pixels (None: the font's own widths), line gap in pixels
    ("OMF 2097 NetArena", "omf2097-netarena", netarena, None, 2),  # the launcher sets it on 11-pixel lines
    ("OMF 2097 Big", "omf2097-big", lambda: dat("GRAPHCHR.DAT", 8, 8), 8, 1),
    ("OMF 2097 Small", "omf2097-small", lambda: dat("CHARSMAL.DAT", 6, 6), 6, 1),
]


def rows_used(pix):
    return [y for y, row in enumerate(pix) if any(row)]


def build(family, stem, load, mono, gap_px, out):
    glyphs = load()
    height = max(len(p) for _, p in glyphs.values())
    # Baseline just under the capitals; the descent reaches as deep as g/j/p/q/y go.
    base = collections.Counter(max(rows_used(glyphs[ord(c)][1])) for c in "ABCDEFHIKLMNTUVWXZ").most_common(1)[0][0] + 1
    deep = max(max(rows_used(glyphs[ord(c)][1])) for c in "gjpqy") + 1
    descent = max(deep, height) - base
    gap = gap_px * PX
    # Glyphs the game repeats across the upper half are its "no glyph here" box.
    counts = collections.Counter(tuple(map(tuple, p)) for c, (_, p) in glyphs.items() if c >= 128)
    filler = {bm for bm, n in counts.items() if n >= 8}

    cmap, shapes, widths = {}, {}, {}
    for code, (w, pix) in sorted(glyphs.items()):
        if code >= 128 and (tuple(map(tuple, pix)) in filler or not any(map(any, pix))):
            continue
        uni = code if code < 128 else ord(bytes([code]).decode("cp437"))
        name = "space" if uni == 32 else f"uni{uni:04X}"
        pen = TTGlyphPen(None)
        for y, row in enumerate(pix):  # one rectangle per horizontal run of pixels
            x = 0
            while x < len(row):
                if not row[x]:
                    x += 1
                    continue
                x0 = x
                while x < len(row) and row[x]:
                    x += 1
                top, bottom = (base - y) * PX, (base - y - 1) * PX
                pen.moveTo((x0 * PX, top))  # clockwise, as TrueType wants for filled contours
                pen.lineTo((x * PX, top))
                pen.lineTo((x * PX, bottom))
                pen.lineTo((x0 * PX, bottom))
                pen.closePath()
        cmap[uni] = name
        shapes[name] = pen.glyph()
        widths[name] = (mono or w) * PX

    # .notdef: a hollow box
    box_w, top, bottom = (mono or 6) * PX, base * PX, -descent * PX
    pen = TTGlyphPen(None)
    for x0, y0, x1, y1, outer in [(0, bottom, box_w - PX, top, True), (PX, bottom + PX, box_w - 2 * PX, top - PX, False)]:
        pts = [(x0, y1), (x1, y1), (x1, y0), (x0, y0)]
        if not outer:
            pts.reverse()
        pen.moveTo(pts[0])
        for p in pts[1:]:
            pen.lineTo(p)
        pen.closePath()
    shapes[".notdef"] = pen.glyph()
    widths[".notdef"] = box_w

    order = [".notdef", "space"] + sorted(n for n in shapes if n not in (".notdef", "space"))
    fb = FontBuilder(unitsPerEm=height * PX, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(shapes)
    glyf = fb.font["glyf"]
    metrics = {}
    for n in order:
        g = glyf[n]
        g.recalcBounds(glyf)
        metrics[n] = (widths[n], g.xMin if g.numberOfContours else 0)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=base * PX, descent=-descent * PX, lineGap=gap)
    fb.setupNameTable({
        "familyName": family,
        "styleName": "Regular",
        "uniqueFontIdentifier": f"{family} Regular",
        "fullName": f"{family} Regular",
        "psName": family.replace(" ", "") + "-Regular",
        "version": "Version 1.000",
        "copyright": ORIGIN,
        "description": f"Pixel font converted from the game's bitmap font. Crisp at {height}px and whole multiples.",
    })
    fb.setupOS2(sTypoAscender=base * PX, sTypoDescender=-descent * PX, sTypoLineGap=gap,
                usWinAscent=base * PX + gap, usWinDescent=descent * PX, achVendID="OMF ", fsType=0)
    fb.setupPost(isFixedPitch=1 if mono else 0)
    ttf = os.path.join(out, stem + ".ttf")
    fb.save(ttf)
    woff2 = TTFont(ttf)
    woff2.flavor = "woff2"
    woff2.save(os.path.join(out, stem + ".woff2"))
    print(f"{family}: {len(cmap)} characters, {height}px cell, "
          f"{'proportional' if not mono else f'{mono}px advance'} -> {stem}.ttf, {stem}.woff2")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "fonts")
    os.makedirs(out, exist_ok=True)
    for spec in FONTS:
        build(*spec, out)

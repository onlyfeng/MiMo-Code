# Composing a PDF from scratch

Goal: produce a PDF where nothing existed before — a report, invoice,
certificate, or single-page cover — from data, text, or a layout you have in
mind.

The tool is **reportlab** (BSD-3). It has two APIs:

- **canvas** — imperative drawing. You pick coordinates. Best for one-page
  fixed layouts.
- **Platypus** — flowable layout. `Paragraph`, `Table`, `Spacer`, `PageBreak`
  handle wrapping and page breaks. Best for anything multi-page.

Default: use Platypus unless you need pixel-precise placement.

## 0. Install

```bash
python3 -m pip install --upgrade reportlab
```

## 1. Cover sheet with the imperative API

```python
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

W, H = A4
c = canvas.Canvas("cover.pdf", pagesize=A4)
c.setTitle("Design review — 2026 refresh")
c.setAuthor("Product team")

c.setFont("Helvetica-Bold", 24)
c.drawString(20 * mm, H - 40 * mm, "Design review")

c.setFont("Helvetica", 14)
c.drawString(20 * mm, H - 55 * mm, "2026 mobile refresh")

c.setStrokeColorRGB(0.2, 0.2, 0.2)
c.line(20 * mm, H - 60 * mm, W - 20 * mm, H - 60 * mm)

c.setFont("Helvetica-Oblique", 10)
c.drawRightString(W - 20 * mm, 20 * mm, "Draft — not for distribution")

c.showPage()
c.save()
```

Coordinate reminder: origin `(0, 0)` is the **bottom-left**. `H - y` converts
the more natural "y from top" into what reportlab expects.

## 2. Multi-page report with Platypus

```python
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
)
from reportlab.lib import colors

styles = getSampleStyleSheet()
body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10, leading=14)

doc = SimpleDocTemplate(
    "report.pdf", pagesize=letter,
    leftMargin=0.9 * inch, rightMargin=0.9 * inch,
    topMargin=0.9 * inch, bottomMargin=1.0 * inch,
    title="Q3 platform reliability",
    author="Reliability team",
)

story = [
    Paragraph("Q3 platform reliability", styles["Title"]),
    Spacer(1, 0.2 * inch),
    Paragraph(
        "Uptime landed at 99.94% against a 99.9% target. Time-to-detect "
        "improved 22% QoQ after the July alerting rollout.",
        body,
    ),
    Spacer(1, 0.2 * inch),
]

data = [
    ["Region",   "Uptime", "P99 latency", "Incidents"],
    ["us-east",  "99.98%", "180 ms",      "1"],
    ["us-west",  "99.92%", "210 ms",      "3"],
    ["eu-west",  "99.95%", "240 ms",      "2"],
    ["ap-south", "99.89%", "410 ms",      "5"],
]
tbl = Table(data, hAlign="LEFT",
            colWidths=[1.2*inch, 0.9*inch, 1.1*inch, 0.9*inch])
tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#26324A")),
    ("TEXTCOLOR",  (0, 0), (-1, 0), colors.whitesmoke),
    ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
    ("ALIGN",      (1, 0), (-1, -1), "RIGHT"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1),
        [colors.HexColor("#F5F7FB"), colors.white]),
    ("GRID",       (0, 0), (-1, -1), 0.25, colors.HexColor("#D0D5DD")),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ("TOPPADDING",    (0, 0), (-1, 0), 6),
]))
story.append(tbl)
story.append(PageBreak())
story.append(Paragraph("Appendix — incidents", styles["Heading1"]))
for n in range(1, 4):
    story.append(Paragraph(f"Incident #{n}: root cause and remediation.", body))
    story.append(Spacer(1, 0.1 * inch))

doc.build(story)
```

`SimpleDocTemplate` handles margins, page breaks, and running the flowables
until each one fits.

## 3. Headers, footers, page numbers

Attach a callback to `build`:

```python
def chrome(canv, doc):
    canv.saveState()
    canv.setFont("Helvetica", 8)
    canv.setFillGray(0.4)
    canv.drawString(0.9 * inch, 0.5 * inch, "Q3 platform reliability")
    canv.drawRightString(letter[0] - 0.9 * inch, 0.5 * inch,
                         f"Page {doc.page}")
    canv.restoreState()

doc.build(story, onFirstPage=chrome, onLaterPages=chrome)
```

## 4. Fonts

Built-ins (`Helvetica`, `Helvetica-Bold`, `Times-Roman`, `Courier`) are
always available and cost zero bytes — reportlab references them by name.
Everything else must be registered and embedded:

```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("Inter", "Inter-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Bold", "Inter-Bold.ttf"))

c.setFont("Inter-Bold", 18)
```

### CJK (Chinese / Japanese / Korean) — mandatory protocol

`setFont()` does not discover or register an arbitrary OS font family name.
Every non-builtin font must first be registered from a font file (or be a
built-in CID font); unknown names raise rather than silently substituting
Helvetica. The common failure is caller code swallowing a registration error
and then continuing with the previous/default font, often Helvetica, which has
**no CJK glyphs**. CJK text can then render as black boxes (tofu), so:

- **Never** reference a CJK font you have not verified on this machine.
  "Source Han Sans / 思源黑体 / Noto Sans CJK" are usually NOT installed;
  macOS `PingFang.ttc` and `Hiragino Sans GB` are CFF-flavored OpenType —
  reportlab's `TTFont` only parses TrueType (`glyf`) outlines and raises on CFF.
- Registration success proves only that reportlab parsed the font, not that it
  contains the target glyphs. Render representative target-language text.
- The terminal built-in CID fallback is language-specific — **never
  Helvetica**, and never assume the Simplified Chinese `STSong-Light` covers
  Traditional Chinese, Japanese, or Korean. See reportlab's
  [Asian-font guide](https://docs.reportlab.com/reportlab/userguide/ch3_fonts/)
  and verify names against the installed reportlab runtime; the guide's Korean
  `HYSMyeongJoStd-Medium` spelling is not accepted by current releases.

Resolve the font with this ladder (first hit wins) and use the returned name
everywhere CJK text appears:

```python
from pathlib import Path
import warnings
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

# Replace these placeholders with project-controlled font files. For a plain
# .ttf file the face index is 0; for a .ttc collection, inspect the collection
# and record the intended face index explicitly instead of relying on index 0.
CJK_TTF_CANDIDATES = {
    "zh-Hans": [("assets/fonts/zh-Hans-body.ttf", 0)],
    "zh-Hant": [("assets/fonts/zh-Hant-body.ttf", 0)],
    "ja": [("assets/fonts/ja-body.ttf", 0)],
    "ko": [("assets/fonts/ko-body.ttf", 0)],
}

CJK_CID_FALLBACKS = {
    "zh-Hans": "STSong-Light",
    "zh-Hant": "MSung-Light",
    "ja": "HeiseiMin-W3",
    # reportlab's runtime registry uses this spelling (without "Std").
    "ko": "HYSMyeongJo-Medium",
}

def resolve_cjk_font(language="zh-Hans"):
    if language not in CJK_CID_FALLBACKS:
        raise ValueError(f"Unsupported CJK language: {language}")
    alias = f"CJK-{language}"
    for filename, subfont_index in CJK_TTF_CANDIDATES.get(language, []):
        path = Path(filename)
        if path.is_file():
            try:
                pdfmetrics.registerFont(
                    TTFont(alias, str(path), subfontIndex=subfont_index)
                )
                return alias                # embedded; still verify target glyphs
            except Exception as exc:
                warnings.warn(f"Cannot register {path}: {exc}")
                continue                    # unparseable face: try the next one
    fallback = CJK_CID_FALLBACKS[language]
    pdfmetrics.registerFont(UnicodeCIDFont(fallback))
    return fallback

CJK_FONT = resolve_cjk_font("zh-Hans")
c.setFont(CJK_FONT, 14)
c.drawString(50, 700, "简体中文示例")
```

Populate only the language entries you ship and have verified. Do not copy OS
font paths blindly: availability, outline format, and TTC face ordering vary by
release. If no project font registers, the resolver uses reportlab's
corresponding CID font. A registered TTF/TTC subset is embedded in the PDF,
while CID fonts are **not embedded** and fidelity depends on the viewing
machine. Prefer verified TTF/TTC files; treat the language-matched CID font as
the safety net.

For a **Platypus** document (the multi-page report flow above), the CJK font
must also be set on the styles, not just the canvas — otherwise `Paragraph` /
`Table` flowables fall back to Helvetica and CJK becomes black boxes. Set
`fontName=CJK_FONT` on each `ParagraphStyle` carrying CJK text and add
`("FONTNAME", (0, 0), (-1, -1), CJK_FONT)` to the `TableStyle` of any table
with CJK cells. Headers/footers drawn in the `build` callback (§3) need
`canv.setFont(CJK_FONT, …)` too if they contain CJK.

## 5. Subscripts / superscripts / inline markup

Built-in Helvetica has no glyphs for Unicode subscripts (`H₂O`, `x²`). They
render as black rectangles.

**In Paragraph flowables** — use XML markup:

```python
Paragraph("Formula: x<super>2</super> + y<super>2</super> = r<super>2</super>", body)
Paragraph("Reaction: 2H<sub>2</sub> + O<sub>2</sub> → 2H<sub>2</sub>O", body)
```

Other tags: `<b>`, `<i>`, `<u>`, `<font color="…" size="…">`, `<link href="…">`.

**On raw canvas** — shrink and offset manually:

```python
def draw_super(c, x, y, base, exp, size=12):
    c.setFont("Helvetica", size)
    c.drawString(x, y, base)
    w = c.stringWidth(base, "Helvetica", size)
    c.setFont("Helvetica", int(size * 0.7))
    c.drawString(x + w, y + size * 0.4, exp)
```

## 6. Images

Platypus:

```python
from reportlab.platypus import Image
story.append(Image("chart.png", width=4 * inch, height=2.5 * inch))
```

Canvas:

```python
c.drawImage("logo.png", 20 * mm, H - 20 * mm,
            width=30 * mm, height=15 * mm,
            preserveAspectRatio=True, mask="auto")
```

`mask="auto"` respects PNG transparency; pass `mask=None` for a solid white
background.

## 7. Vectors on canvas

```python
c.setFillColorRGB(0.13, 0.20, 0.29)
c.rect(50, 500, 200, 60, fill=1, stroke=0)

c.setFillColorRGB(1, 1, 1)
c.setFont("Helvetica-Bold", 16)
c.drawCentredString(150, 522, "Confidential")

path = c.beginPath()
path.moveTo(300, 500)
path.curveTo(320, 560, 380, 560, 400, 500)
path.close()
c.setFillColorRGB(0.9, 0.3, 0.3)
c.drawPath(path, fill=1, stroke=0)
```

## 8. Templates: designed background + dynamic text

When you have a static PDF (letterhead, certificate) and only need to drop
names / dates onto it, treat it as a two-layer merge: draw the dynamic bits
with reportlab, then use pypdf to overlay onto each template page. This is
the same trick behind `scripts/overlay_text.py`.

```python
import io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# 1. draw the dynamic layer
buf = io.BytesIO()
c = canvas.Canvas(buf, pagesize=letter)
c.setFont("Helvetica-Bold", 28)
c.drawCentredString(letter[0] / 2, 350, "Grace Chen")
c.setFont("Helvetica", 12)
c.drawCentredString(letter[0] / 2, 320, "has completed the 2026 program")
c.save(); buf.seek(0)

# 2. merge onto the template
tmpl = PdfReader("certificate_template.pdf")
layer = PdfReader(buf)
writer = PdfWriter()
page = tmpl.pages[0]
page.merge_page(layer.pages[0])
writer.add_page(page)
with open("certificate_grace_chen.pdf", "wb") as fh:
    writer.write(fh)
```

## 9. Metadata

```python
c = canvas.Canvas("out.pdf")
c.setTitle("Employment offer — Chen")
c.setAuthor("HR")
c.setSubject("Offer 2026-0142")
c.setKeywords(["offer", "2026", "chen"])
```

On an existing PDF:

```python
from pypdf import PdfReader, PdfWriter
reader = PdfReader("draft.pdf")
writer = PdfWriter(clone_from=reader)
writer.add_metadata({
    "/Title": "Employment offer — Chen",
    "/Author": "HR",
    "/Subject": "Offer 2026-0142",
})
with open("final.pdf", "wb") as fh:
    writer.write(fh)
```

## Validation

Whatever you produced, close the loop:

```bash
scripts/survey.py out.pdf --pretty            # page count + metadata OK?
scripts/render_pages.py out.pdf qa/            # eyeball each rendered page
scripts/sanity_check.py out.pdf                # open + round-trip clean?
```

Common regressions caught by the eyeball step:

- Every CJK character is a black box → the selected font lacks those glyphs,
  or registration failed and caller code continued with Helvetica → §4
  `resolve_cjk_font(language=...)`
- Black rectangles where subscripts should be → §5
- Truncated table columns → widen `colWidths` or shrink `fontSize`
- Missing images → paths are relative to `cwd`, not to the output file
- `KeyError: 'Helvetica-XYZ'` → register the TTF (§4)

#!/usr/bin/env python3
"""Render the cheat-sheet PDF from the source.

The generator that made the Aug 5 PDF died with the Cowork migration, so this is rebuilt from the
shipped artefact: page geometry, column pitch, right-alignment anchors and vertical rhythm were
measured off the emitted content streams rather than guessed. It differs from the original in the
one way that matters -- it renders ALL board rows, including the 10 K and 14 DEF the old PDF
silently omitted.

GLYPHS, NOT EMOJI. Helvetica cannot print the badge emoji, and reportlab does NOT raise when asked
to: it silently substitutes ZapfDingbats and prints a different symbol (docs/insights/011). So the
badge column prints `meta.badges[code].glyph` -- the WinAnsi table the shipped PDF already used --
and `pdf_strings()` exposes every string bound for the page so the caller can assert cp1252 BEFORE
anything is rendered. cp1252/WinAnsi is the codec reportlab's base fonts use; Latin-1 is the wrong
test and would reject the dagger glyph and every em-dash in the prose.

FLOW, NOT FIXED SLOTS. The old layout left column 4 half-empty and still dropped 24 rows. Adding
them needs roughly 317pt against ~302pt of free space, so the renderer flows: fill a column, move
to the next, start a page when the last one is full. Nothing is clipped and nothing is dropped,
which is what the gate checks.
"""

import json
import os
import sys

from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")

PAGE = (792.0, 612.0)                     # US Letter, landscape -- as shipped

INK = HexColor("#1A222E")
MUTED = HexColor("#6B7686")
FAINT = HexColor("#9AA4B2")
RULE = HexColor("#D7DDE5")
TIERC = HexColor("#0E7F94")
GOOD = HexColor("#1D8A4E")
BAD = HexColor("#C04A3A")

#: Section order and bar colour, matching the shipped sheet; K and DEF are new.
SECTIONS = [("RB", "RUNNING BACKS", "#2A78D6"), ("WR", "WIDE RECEIVERS", "#D95926"),
            ("TE", "TIGHT ENDS", "#199E70"), ("QB", "QUARTERBACKS", "#C98500"),
            ("K", "KICKERS", "#7A3FF2"), ("DEF", "DEFENSES", "#4A3AA7")]

BADGE_COLOR = {"T": "#7A3FF2", "B": "#1D8A4E", "X": "#C04A3A", "I": "#C98500",
               "R": "#0E7F94", "U": "#1D8A4E", "D": "#C04A3A", "S": "#4A3AA7"}

COLS = 4
COL0 = 39.0                # first column's name x
PITCH = 188.5              # measured column pitch
TOP = 533.8                # first row baseline under the header
FLOOR = 42.3               # lowest baseline observed on the shipped sheet
ROW_GAP = 9.25
TIER_GAP = 8.0             # extra before a tier label
SECTION_GAP = 31.5         # extra before a section bar

D_PR = -3.0                # pr right edge, relative to the column's name x
D_DELTA = 130.5
D_VORP = 146.5
D_R = 160.5


def _fmt_vorp(v):
    return f"{int(round(v)):+d}" if v is not None else ""


def pdf_strings(source):
    """Every string this module will draw, labelled, for the caller's cp1252 assertion.

    Exposed rather than checked internally so the guard runs BEFORE any file is created -- a
    check inside render() would fire after the staging directory already held a half-page.
    """
    out = []
    meta = source["meta"]
    for code, spec in (meta.get("badges") or {}).items():
        out.append((f"meta.badges[{code}].glyph", spec.get("glyph", "")))
    for p in source["players"]:
        out.append((f"players[{p['r']}].name", p["name"]))
        out.append((f"players[{p['r']}].team", p["team"]))
    for i, r in enumerate(source["strategy"].get("rules") or []):
        out.append((f"strategy.rules[{i}]", r))
    for i, e in enumerate(source["strategy"].get("roundPlan") or []):
        out.append((f"strategy.roundPlan[{i}]", f"{e.get('rounds', '')} {e.get('plan', '')}"))
    for i, e in enumerate(source["strategy"].get("slotNotes") or []):
        out.append((f"strategy.slotNotes[{i}]", f"{e.get('slot', '')} {e.get('note', '')}"))
    out.append(("strategy.kickers", source["strategy"].get("kickers", "")))
    out.append(("meta.vbd.note", (meta.get("vbd") or {}).get("note", "")))
    for e in source.get("dst") or []:
        out.append((f"dst[{e['rank']}]", str(e.get("team", ""))))
    return out


def _wrap(text, font, size, width):
    words, lines, cur = str(text).split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


class Flow:
    """A column cursor that spills to the next column, then to a new page. Nothing is clipped."""

    def __init__(self, c, on_new_page):
        self.c = c
        self.on_new_page = on_new_page
        self.col = 0
        self.y = TOP

    @property
    def x(self):
        return COL0 + self.col * PITCH

    def need(self, amount):
        if self.y - amount >= FLOOR:
            return
        self.col += 1
        if self.col >= COLS:
            self.c.showPage()
            self.on_new_page(self.c)
            self.col = 0
        self.y = TOP

    def down(self, amount):
        self.y -= amount


def _header(c, source, page_no, pages_hint):
    meta = source["meta"]
    shape = meta["shape"]
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(26, 572, f"{meta.get('league', 'FAMILY FEUD').upper()} "
                          f"— {shape.get('season', meta.get('leagueId') and '2026')} "
                          f"DRAFT CHEAT SHEET".replace("  ", " "))
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE[0] - 26, 573, f"PAGE {page_no} / THE BOARD")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 7.6)
    c.drawString(26, 560, str(meta.get("format", "")))
    c.setFont("Helvetica", 6.9)
    c.setFillColor(MUTED)
    glyphs = "  ".join(f"{s.get('glyph', '')} {s.get('label', '')}"
                       for s in (meta.get("badges") or {}).values())
    c.drawString(26, 550, f"Marks:  {glyphs}")


def _footer(c, source, page_no, total):
    meta = source["meta"]
    c.setFont("Helvetica", 6.4)
    c.setFillColor(FAINT)
    c.drawString(26, 20, f"Synthesized {meta.get('updated', '')} · tuned to "
                         f"{meta.get('league', '')} scoring. Left # = position rank · "
                         f"right edge = overall board rank.")
    c.drawRightString(PAGE[0] - 26, 20,
                      f"{meta.get('owner', '')} · {meta.get('league', '')} · "
                      f"p.{page_no}/{total}")


def _draw_row(c, f, p, badges):
    x, y = f.x, f.y
    c.setFont("Helvetica", 7.3)
    c.setFillColor(MUTED)
    c.drawRightString(x + D_PR, y, str(p["pr"]))

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 7.3)
    c.drawString(x, y, p["name"])
    end = x + pdfmetrics.stringWidth(p["name"], "Helvetica-Bold", 7.3)

    c.setFont("Helvetica", 6.4)
    c.setFillColor(FAINT)
    c.drawString(end + 3.0, y, p["team"])
    end = end + 3.0 + pdfmetrics.stringWidth(p["team"], "Helvetica", 6.4)

    bx = end + 2.5
    c.setFont("Helvetica-Bold", 7.0)
    for code in p.get("badges") or []:
        spec = badges.get(code) or {}
        g = spec.get("glyph") or ""
        if not g:
            continue
        c.setFillColor(HexColor(BADGE_COLOR.get(code, "#6B7686")))
        c.drawString(bx, y, g)
        bx += pdfmetrics.stringWidth(g, "Helvetica-Bold", 7.0) + 1.5

    delta = p.get("vbdDelta") or 0
    if abs(delta) >= 8:
        up = delta > 0
        c.setFillColor(GOOD if up else BAD)
        c.setFont("Helvetica-Bold", 6.4)
        c.drawRightString(x + D_DELTA, y, f"{delta:+d}")
        tx = x + D_DELTA - pdfmetrics.stringWidth(f"{delta:+d}", "Helvetica-Bold", 6.4) - 5.6
        path = c.beginPath()
        if up:
            path.moveTo(tx, y + 0.6)
            path.lineTo(tx + 3.4, y + 0.6)
            path.lineTo(tx + 1.7, y + 4.0)
        else:
            path.moveTo(tx, y + 4.0)
            path.lineTo(tx + 3.4, y + 4.0)
            path.lineTo(tx + 1.7, y + 0.6)
        path.close()
        c.drawPath(path, stroke=0, fill=1)

    c.setFont("Helvetica", 6.4)
    c.setFillColor(MUTED)
    c.drawRightString(x + D_VORP, y, _fmt_vorp(p.get("vorp")))
    c.setFont("Helvetica-Bold", 6.8)
    c.setFillColor(INK)
    c.drawRightString(x + D_R, y, str(p["r"]))


def _draw_board(c, source, total_pages):
    badges = source["meta"].get("badges") or {}
    state = {"page": 1}

    def new_page(cv):
        state["page"] += 1
        _header(cv, source, state["page"], total_pages)
        _footer(cv, source, state["page"], total_pages)

    _header(c, source, 1, total_pages)
    _footer(c, source, 1, total_pages)
    f = Flow(c, new_page)

    by_pos = {}
    for p in source["players"]:
        by_pos.setdefault(p["pos"], []).append(p)

    for pos, title, colour in SECTIONS:
        rows = sorted(by_pos.get(pos) or [], key=lambda p: p["pr"])
        if not rows:
            continue
        f.need(SECTION_GAP + 20.0)
        f.down(SECTION_GAP)
        c.setFillColor(HexColor(colour))
        c.rect(f.x - 13.0, f.y - 1.0, 2.8, 9.5, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(f.x - 6.5, f.y, title)
        f.down(10.9)

        tier = None
        for p in rows:
            if p.get("tier") != tier:
                tier = p.get("tier")
                f.need(TIER_GAP + ROW_GAP + 6.0)
                f.down(TIER_GAP)
                label = f"TIER {tier}"
                c.setFont("Helvetica-Bold", 6.4)
                c.setFillColor(TIERC)
                c.drawString(f.x, f.y, label)
                w = pdfmetrics.stringWidth(label, "Helvetica-Bold", 6.4)
                c.setStrokeColor(RULE)
                c.setLineWidth(0.5)
                c.line(f.x + w + 4.0, f.y + 2.3, f.x + 159.5, f.y + 2.3)
                f.down(8.8)
            f.need(ROW_GAP)
            _draw_row(c, f, p, badges)
            f.down(ROW_GAP)
    return state["page"]


def _draw_strategy(c, source, page_no, total_pages):
    """Page 2 is derived entirely from `strategy`, `meta.vbd` and `dst`.

    The shipped sheet carried a condensed hand-written copy of this prose, which is how its DST
    line came to read '6 Jaguars' while the source said Minnesota. Nothing here is retyped.
    """
    s = source["strategy"]
    meta = source["meta"]
    cols = [26.0, 280.6667, 535.3333]
    width = 232.0

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(26, 572, "PLAN & VBD GUIDE")
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE[0] - 26, 573, f"PAGE {page_no} / THE PLAN")

    def block(x, y, title, lines, lead=10.4, size=8.0):
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y, title)
        y -= 15.2
        c.setFont("Helvetica", size)
        c.setFillColor(MUTED)
        for ln in lines:
            for part in _wrap(ln, "Helvetica", size, width):
                if y < 40:
                    return y
                c.drawString(x, y, part)
                y -= lead
            y -= 2.0
        return y

    y = block(cols[0], 540, "THE COMMANDMENTS",
              [f"{i + 1}. {r}" for i, r in enumerate(s.get("rules") or [])])

    y2 = block(cols[1], 540, "ROUND PLAN",
               [f"Rds {e.get('rounds')}: {e.get('plan')}" for e in (s.get("roundPlan") or [])])
    block(cols[1], y2 - 14, "YOUR SLOT",
          [f"{e.get('slot')}: {e.get('note')}" for e in (s.get("slotNotes") or [])])

    shape = meta["shape"]
    kdef = f"{shape['rounds'] - 1}-{shape['rounds']}"
    dst_line = "  ".join(f"{e['rank']} {e['team']}" for e in (source.get("dst") or []))
    y3 = block(cols[2], 540, f"DEF (Rd {kdef})", [dst_line])
    y3 = block(cols[2], y3 - 14, f"K (Rd {kdef})", [s.get("kickers", "")])

    vbd = meta.get("vbd") or {}
    bw = " · ".join(f"{k}{v}" for k, v in sorted((vbd.get("baselineWaiver") or {}).items()))
    ls = " · ".join(f"{k}{v}" for k, v in sorted((vbd.get("lastStarter") or {}).items()))
    block(cols[2], y3 - 14, "VBD OVERLAY",
          [f"Waiver baselines: {bw}.", f"Last starters: {ls}.", vbd.get("note", "")])

    _footer(c, source, page_no, total_pages)


def render(source, out_path):
    c = canvas.Canvas(out_path, pagesize=PAGE)
    board_pages = _draw_board(c, source, total_pages=0)
    c.showPage()
    _draw_strategy(c, source, board_pages + 1, board_pages + 1)
    c.showPage()
    c.save()
    return out_path


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    src = argv[0] if argv else os.path.join(KIT, "players_data.json")
    out = argv[1] if len(argv) > 1 else os.path.join(KIT, "family-feud-cheat-sheet.pdf")
    with open(src, encoding="utf-8") as f:
        source = json.load(f)
    print(render(source, out))
    return 0


if __name__ == "__main__":
    sys.exit(main())

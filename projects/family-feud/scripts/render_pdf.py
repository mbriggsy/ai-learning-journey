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

import datetime as _dt
import json
import math
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

#: Vertical rhythm, matched to the shipped sheet's MEASURED cost rather than to its raw offsets.
#: The sheet spends 17.25pt going from one row baseline, past a tier label, to the next row --
#: and 40.75pt past a section bar. Charging a tier `gap + label + a full row gap` double-counts
#: the row pitch and inflated the board by ~290pt, which is what pushed a one-page sheet onto
#: three. TIER_LEAD is 0 because the preceding row's own 9.25 already supplies the separation.
TIER_LEAD, TIER_AFTER = 0.0, 8.0                   # 9.25 + 0 + 8.0  = 17.25
SECTION_LEAD, SECTION_AFTER = 12.6, 10.9           # 9.25 + 12.6 + 10.9 + 8.0 = 40.75

#: Density presets, roomiest first. The renderer takes the first that fits the board on ONE page,
#: because a single sheet you hold at the table is the artefact's whole point. Only if none fit
#: does it fall back to evenly balanced multi-page. Row pitch is never squeezed below 8.4 -- past
#: that the 7.3pt names start to crowd, and a cheat sheet that is hard to read under a
#: 120-second clock has failed at the only job it has.
DENSITY = [
    {"row": 9.25, "tier": 8.0, "section": 12.6, "top": 533.8, "floor": 42.3},
    {"row": 9.00, "tier": 7.0, "section": 11.0, "top": 538.0, "floor": 40.0},
    {"row": 8.70, "tier": 6.2, "section": 10.0, "top": 540.0, "floor": 38.0},
    {"row": 8.40, "tier": 5.6, "section": 9.0, "top": 542.0, "floor": 36.0},
]

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
    shape = meta.get("shape") or {}

    # HEADER, FOOTER AND LEGEND. These were missed on the first pass, and the guard passed clean
    # on a board whose league name, format line, owner and badge labels all carried characters
    # Helvetica cannot print -- reportlab silently drew them from ZapfDingbats and Symbol. The
    # docstring promises EVERY string this module draws; that promise is what stage() relies on,
    # so anything drawn below must be listed here.
    out.append(("meta.league", meta.get("league", "")))
    out.append(("meta.format", meta.get("format", "")))
    out.append(("meta.owner", meta.get("owner", "")))
    out.append(("meta.updated", meta.get("updated", "")))
    out.append(("meta.shape.season", shape.get("season", "")))

    for code, spec in (meta.get("badges") or {}).items():
        out.append((f"meta.badges[{code}].glyph", spec.get("glyph", "")))
        out.append((f"meta.badges[{code}].label", spec.get("label", "")))
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
    vbd = meta.get("vbd") or {}
    out.append(("meta.vbd.note", vbd.get("note", "")))
    for group in ("baselineWaiver", "lastStarter"):
        for pos, val in (vbd.get(group) or {}).items():
            out.append((f"meta.vbd.{group}.{pos}", f"{pos}{val}"))
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


CAPACITY = TOP - FLOOR


def _glue(items):
    """Bind every heading to the first row beneath it.

    A column break is only legal between rows. Breaking after a heading strands "KICKERS / TIER 1"
    at the foot of one column with its kickers at the head of the next, which is how the first
    render came out -- readable if you already know the board, actively misleading at a draft.
    """
    groups, i = [], 0
    while i < len(items):
        if items[i][1] in ("section", "tier"):
            run = [items[i]]
            i += 1
            while i < len(items) and items[i][1] != "row":
                run.append(items[i])
                i += 1
            if i < len(items):                      # carry the first row along
                run.append(items[i])
                i += 1
            groups.append(run)
        else:
            groups.append([items[i]])
            i += 1
    return groups


def _pack(groups, capacity):
    cols, cur, used = [], [], 0.0
    for g in groups:
        h = sum(it[0] for it in g)
        if cur and used + h > capacity:
            cols.append(cur)
            cur, used = [], 0.0
        cur.extend(g)
        used += h
    if cur:
        cols.append(cur)
    return cols


def _paginate_at(items, capacity, cols_per_page=COLS):
    """Pack into evenly-filled columns. Balanced rather than filled-to-the-floor: a greedy fill
    leaves the overflow as one dense column beside three empty ones."""
    groups = _glue(items)
    total = sum(it[0] for g in groups for it in g)
    pages = max(1, math.ceil(total / (cols_per_page * capacity)))
    target = max(total / (pages * cols_per_page), capacity * 0.55)

    cols = _pack(groups, target)
    while len(cols) > pages * cols_per_page and target < capacity:
        target = min(target * 1.05, capacity)
        cols = _pack(groups, target)
    if len(cols) > pages * cols_per_page:            # genuinely needs another page
        pages = math.ceil(len(cols) / cols_per_page)

    cols += [[]] * (pages * cols_per_page - len(cols))
    return [cols[i:i + cols_per_page] for i in range(0, len(cols), cols_per_page)]


def layout(source):
    """Choose the roomiest density that still fits the board on ONE page.

    A single sheet is the artefact's whole point -- it is held at a table, not scrolled. The
    board grew from 150 to 174 rows when K and DEF were added, which is enough to overflow the
    original spacing, so the renderer tightens the gaps between headings before it reaches for a
    second page. Row pitch has a floor: past ~8.4pt the names crowd, and an unreadable sheet on
    a 120-second clock is worse than two pages.

    Returns (pages, density). Falls back to the roomiest preset across balanced pages when even
    the tightest will not fit one -- so a much larger board degrades gracefully instead of
    silently rendering something cramped.
    """
    for d in DENSITY:
        cap = d["top"] - d["floor"]
        pages = _paginate_at(board_items(source, d), cap)
        if len(pages) == 1:
            return pages, d
    d = DENSITY[0]
    cap = d["top"] - d["floor"]
    return _paginate_at(board_items(source, d), cap), d


def _header(c, source, page_no, pages_hint):
    meta = source["meta"]
    shape = meta["shape"]
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 17)
    season = shape.get("season") or ""
    title = " ".join(x for x in (meta.get("league", "").upper(), "—", season,
                                 "DRAFT CHEAT SHEET") if x)
    c.drawString(26, 572, title)
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
    updated = str(meta.get("updated", ""))
    try:
        d = _dt.date.fromisoformat(updated)
        updated = f"{d:%b} {d.day}, {d.year}"        # "Aug 8, 2026", not "2026-08-08"
    except ValueError:
        pass
    c.drawString(26, 20, f"Synthesized {updated} · tuned to "
                         f"{meta.get('league', '')} scoring. Left # = position rank · "
                         f"right edge = overall board rank.")
    c.drawRightString(PAGE[0] - 26, 20,
                      f"{meta.get('owner', '')} · {meta.get('league', '')} · "
                      f"p.{page_no}/{total}")


def _draw_row(c, x, y, p, badges):
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


def board_items(source, d=DENSITY[0]):
    """Flatten the board into a measurable stream: section bars, tier labels, rows.

    Each item's declared height is exactly what `_draw_board` consumes for it, so the packing
    arithmetic and the ink can never disagree.
    """
    by_pos = {}
    for p in source["players"]:
        by_pos.setdefault(p["pos"], []).append(p)

    items = []
    for pos, title, colour in SECTIONS:
        rows = sorted(by_pos.get(pos) or [], key=lambda p: p["pr"])
        if not rows:
            continue
        items.append((d["section"] + SECTION_AFTER, "section", (title, colour)))
        tier = None
        for p in rows:
            if p.get("tier") != tier:
                tier = p.get("tier")
                items.append((d["tier"], "tier", tier))
            items.append((d["row"], "row", p))
    return items


def _draw_board(c, source, pages, total_pages, d, first_page_no=1):
    badges = source["meta"].get("badges") or {}
    for n, page in enumerate(pages):
        page_no = first_page_no + n
        if n:
            c.showPage()
        _header(c, source, page_no, total_pages)
        _footer(c, source, page_no, total_pages)
        for ci, col in enumerate(page):
            x, y = COL0 + ci * PITCH, d["top"]
            for h, kind, payload in col:
                if kind == "section":
                    title, colour = payload
                    y -= d["section"]
                    c.setFillColor(HexColor(colour))
                    c.rect(x - 13.0, y - 1.0, 2.8, 9.5, stroke=0, fill=1)
                    c.setFillColor(INK)
                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(x - 6.5, y, title)
                    y -= SECTION_AFTER
                elif kind == "tier":
                    label = f"TIER {payload}"
                    c.setFont("Helvetica-Bold", 6.4)
                    c.setFillColor(TIERC)
                    c.drawString(x, y, label)
                    w = pdfmetrics.stringWidth(label, "Helvetica-Bold", 6.4)
                    c.setStrokeColor(RULE)
                    c.setLineWidth(0.5)
                    c.line(x + w + 4.0, y + 2.3, x + 159.5, y + 2.3)
                    y -= d["tier"]
                else:
                    _draw_row(c, x, y, payload, badges)
                    y -= d["row"]


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
    # invariant=1 pins /CreationDate, /ModDate and the document ID. Without it reportlab stamps
    # wall-clock time into the trailer, so two renders of identical data differ in bytes and every
    # refresh commits a PDF diff that means nothing. Measured: default output is UNSTABLE across
    # two identical renders; invariant=1 is byte-identical.
    c = canvas.Canvas(out_path, pagesize=PAGE, invariant=1)

    # Lay out BEFORE drawing, so the footers can say "p.1/2" instead of counting as they go.
    pages, d = layout(source)
    total = len(pages) + 1                      # + the plan page

    _draw_board(c, source, pages, total, d)
    c.showPage()
    _draw_strategy(c, source, total, total)
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

#!/usr/bin/env python3
"""Render the draft board HTML from the source.

The template at `scripts/templates/board.html` is presentation code -- layout, CSS, the interactive
JS -- and is hand-maintained. Every FACT in the emitted page comes from `players_data.json`:
the template holds placeholders, never numbers.

Two conventions the gate enforces and this module must honour:

* `const DATA = ` is ONE line, at column 0, with exactly one space either side of `=` and nothing
  else on the line. The gate extracts it with `^const DATA = (\\{.*?\\});?\\s*$` under re.M|re.S,
  and the non-greedy `.*?` stops at the first `}` that ends a line -- so pretty-printed JSON
  produces a JSONDecodeError rather than a mismatch.
* The one human-visible date (`Rankings synthesized ...`) must agree with `meta.updated`, because
  a refresh that updates the blob and leaves the header reading the old date passes a deep-equal
  and still ships a lying board.

KTD-3: the browser and Python normalise names by the same rules because `const NORM_SPEC` and its
interpreter are GENERATED from `draft-kit/normalize.py`, not hand-ported. The gate runs the
emitted JS under node over all board names and diffs it against Python.
"""

import datetime as _dt
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
TEMPLATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates", "board.html")
sys.path.insert(0, KIT)

import normalize                                                                  # noqa: E402

POS_ORDER = ("QB", "RB", "WR", "TE", "K", "DEF")


def data_line(source):
    """The blob, compact and on exactly one line -- the shape the gate's extractor requires."""
    return json.dumps(source, ensure_ascii=False, separators=(",", ":"))


def synth_date(iso):
    """An ISO date -> the header's human form, in the format the gate parses back."""
    d = _dt.date.fromisoformat(str(iso))
    return f"{d:%b} {d.day}, {d.year}"


def starters_line(shape):
    """'QB · 2 RB · 2 WR · TE · <b>2 FLEX</b> · K · DEF' -- from the draft object, never typed."""
    parts = []
    for pos in POS_ORDER:
        n = (shape.get("starters") or {}).get(pos, 0)
        if n == 1:
            parts.append(pos)
        elif n > 1:
            parts.append(f"{n} {pos}")
    flex = shape.get("flex") or 0
    if flex:
        parts.insert(4, f"<b>{flex} FLEX</b>")
    return " · ".join(parts)


def kicker_line(source):
    shape = source["meta"]["shape"]
    bits = [source["meta"].get("league", "Family Feud"),
            f"{shape['teams']}-Team",
            "Full PPR" if "PPR" in str(source["meta"].get("format", "")) else "Custom scoring"]
    start = shape.get("start_time")
    if start:
        when = _dt.datetime.fromtimestamp(start / 1000)
        bits.append(f"Draft {when:%b} {when.day}, {when.year}")
    else:
        # start_time is null on Sleeper today. Printing a remembered date would be the board
        # asserting a fact the draft object does not carry.
        bits.append("Draft date not set")
    return " · ".join(bits)


def playoff_line(shape):
    teams = shape["teams"]
    spots = shape.get("playoff_teams") or 0
    return f"{spots} of {teams}" if spots else f"the top half of {teams}"


def render(source, out_path, template=TEMPLATE):
    with open(template, "rb") as f:
        html = f.read().decode("utf-8")

    shape = source["meta"]["shape"]
    subs = {
        "__DATA__": data_line(source),
        "__NORM_SPEC__": normalize.js_source(),
        "__KICKER__": kicker_line(source),
        "__ROUNDS__": str(shape["rounds"]),
        "__STARTERS__": starters_line(shape),
        "__BENCH__": str(shape.get("bench", 0)),
        "__IR__": str(shape.get("ir", 0)),
        "__PLAYOFF__": playoff_line(shape),
        # meta.rankings.synthesized, NOT meta.updated. The sentence this lands in says the
        # rankings were synthesized "from ... consensus + training-camp reporting" on this date,
        # and meta.updated is `max(today, input mtimes)` -- a build stamp that advances on its own.
        # Feeding it here re-dated the claim on every rebuild over judgment frozen since Aug 5.
        "__SYNTH_DATE__": synth_date(source["meta"]["rankings"]["synthesized"]),
    }
    for token, value in subs.items():
        if token not in html:
            raise RuntimeError(f"template has no {token} placeholder -- it was edited out, and "
                               f"the value it carried would silently vanish from the board")
        html = html.replace(token, value)

    leftover = [t for t in subs if t in html]
    if leftover:
        raise RuntimeError(f"placeholders survived substitution: {leftover}")

    with open(out_path, "wb") as f:
        f.write(html.encode("utf-8"))
    return out_path


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    src = argv[0] if argv else os.path.join(KIT, "players_data.json")
    out = argv[1] if len(argv) > 1 else os.path.join(KIT, "family-feud-draft-board.html")
    with open(src, encoding="utf-8") as f:
        source = json.load(f)
    print(render(source, out))
    return 0


if __name__ == "__main__":
    sys.exit(main())

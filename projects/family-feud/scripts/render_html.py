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
* The one human-visible date (`Rankings synthesized ...`) comes from `meta.rankings.synthesized`,
  NOT `meta.updated` -- insight 017. The sentence claims a human re-ranked on that date, so it
  must be fed by the carried record of when that happened; `meta.updated` is input freshness and
  is derived, so putting it there relabels it into a claim nobody made. The code below has done
  this since 017; this line said `meta.updated` until 2026-08-09, which is the same class of drift
  one level up -- a docstring outliving the rule its own module stopped following.

KTD-3: the browser and Python normalise names by the same rules because `const NORM_SPEC` and its
interpreter are GENERATED from `draft-kit/normalize.py`, not hand-ported. The gate runs the
emitted JS under node over all board names and diffs it against Python.
"""

import datetime as _dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KIT = os.path.join(ROOT, "draft-kit")
TEMPLATE = os.path.join(HERE, "templates", "board.html")
sys.path.insert(0, KIT)
sys.path.insert(0, HERE)          # so `shape` resolves when this module is run standalone

import normalize                                                                  # noqa: E402
#: ONE definition of what a scoring code is called. `shape.format_line()` already maps
#: `scoring_type` through this and refuses to invent a label for a code it does not know; this
#: module used to re-derive the same fact with `"PPR" in meta.format`, which is true of the string
#: "Half PPR" -- so a half-PPR league would have had "Full PPR" printed across its board header.
#: Two derivations of one fact is how the two drifted apart (KTD-1, the defect `format_line`'s own
#: docstring was written against). Dormant today because this league is `ppr`.
from shape import SCORING_LABEL                                                   # noqa: E402

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
        # FLEX goes immediately after the last STARTED skill position -- it is a skill slot, and
        # K/DEF must follow it. This was `parts.insert(4, ...)`, a hardcoded index that is correct
        # only while all four of QB/RB/WR/TE are non-zero. Set any one of them to 0 -- a legal
        # Sleeper shape -- and the number of parts ahead of FLEX shifts while the 4 does not:
        # measured with TE:0, it rendered `QB · 2 RB · 2 WR · K · <b>2 FLEX</b> · DEF`, putting the
        # flex between the kicker and the defense.
        #
        # Dormant on this league as configured (all four are started), so the bug can only appear
        # when the SHAPE CHANGES -- which is precisely when a human reads this line to confirm what
        # changed. That is the KTD-1 failure this repo has already paid for once: prose composed
        # from the source that stops tracking the source.
        started_skill = sum(1 for p in POS_ORDER[:4] if (shape.get("starters") or {}).get(p, 0))
        parts.insert(started_skill, f"<b>{flex} FLEX</b>")
    return " · ".join(parts)


def kicker_line(source):
    shape = source["meta"]["shape"]
    # The scoring label comes from the CODE, through the one shared map -- never from a substring
    # test on the composed `meta.format` prose. `"PPR" in "Half PPR"` is True, so the old form
    # printed "Full PPR" over a half-PPR league. An unknown code reads "Custom scoring" rather
    # than being assumed to be this league's, matching `shape.format_line()` exactly.
    code = str(shape.get("scoring_type") or "").lower()
    bits = [source["meta"].get("league", "Family Feud"),
            f"{shape['teams']}-Team",
            SCORING_LABEL.get(code) or "Custom scoring"]
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

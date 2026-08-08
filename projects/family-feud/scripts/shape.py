#!/usr/bin/env python3
"""League shape, read from the draft object. ONE owner (KTD-7, KTD-8).

Every pick-slot computation in this repo -- `slot_of()`, `my_picks()`, the ROSTERS/NEEDS block,
"their open needs" -- assumes a plain snake draft of a known width and depth. Those numbers used
to be typed at a keyboard on draft morning. This module is where they come from instead.

WHY THIS IS ITS OWN MODULE AND NOT A FUNCTION IN `build_board.py`, WHERE IT WAS BORN:
it has two consumers with opposite dependency weights. The generator already needs `jinja2` and
`reportlab`, so an import that drags them in costs it nothing. The draft-day engine wrapper
(`run_engine.py`) needs neither -- and a war-room instrument that will not START because a PDF
library is missing is a draft-day failure invented by an import statement. Forking `read_shape`
to dodge that would have created the hand-maintained duplicate KTD-1 exists to kill, so the
function moved down instead of being copied sideways.

TWO REFUSAL CLASSES, AND THE DISTINCTION IS LOAD-BEARING.

`read_shape` used to raise one exception type for two situations that demand opposite responses:

  * `CargoUnreadable` -- the mule's cargo is absent, truncated, malformed, or missing the fields
    that carry shape. This says *we cannot tell*. A caller with a safe fallback (the engine
    wrapper, which still has argv) MAY degrade -- out loud, never silently.

  * `UnsupportedShape` -- the cargo was read perfectly well and describes a draft this repo will
    not compute: an auction, a third-round reversal, or two sources that disagree about the team
    count. This says *we can tell, and the answer is no*. A caller must NEVER degrade past it.
    Degrading here means computing a confident wrong pick order for a draft whose shape we just
    finished proving we do not model -- the exact failure the integrity-gate landmine describes,
    reached by a politer route.

Collapsing the two is not hypothetical sloppiness: a wrapper that catches the base class to
handle "no cargo" would swallow "this is an auction draft" in the same breath and advise off it.
Both remain subclasses of `Refuse`, so every existing `except Refuse` in the generator keeps its
current behaviour and its tests keep passing.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARGO = os.path.join(ROOT, "newsletter", "data", "inbox", "sleeper_draft.json")
LEAGUE_CARGO = os.path.join(ROOT, "newsletter", "data", "inbox", "sleeper_league.json")


class Refuse(Exception):
    """Raised for every condition that must stop the build BEFORE anything is written."""


class CargoUnreadable(Refuse):
    """The draft object could not be read, or does not carry shape. We cannot tell.

    A caller holding a safe fallback may degrade to it -- provided it SAYS SO. A caller with no
    fallback (the generator) must still refuse: guessing league shape is how the board acquires
    numbers nobody can trace.
    """


class UnsupportedShape(Refuse):
    """The draft was read, and it is a shape this repo does not model. Never degrade past this."""


def read_shape(cargo=CARGO, league_cargo=LEAGUE_CARGO):
    """League shape comes from the draft and league objects, never from a typed constant or prose.

    The mule already hauls both hourly, so there is no new fetch. Stamped with the draft_id it
    descends from, so `meta.shape` can be re-checked against its origin later.

    It REFUSES rather than guesses on a non-snake or reversal draft: every pick-slot computation
    in this repo assumes plain snake, and computing a wrong pick order silently is the failure
    mode this whole rebuild exists to prevent.
    """
    if not os.path.exists(cargo):
        raise CargoUnreadable(f"no draft object at {cargo} -- the mule's cargo is how league "
                              f"shape is known (KTD-7). Run the mule before building.")
    try:
        with open(cargo, encoding="utf-8-sig") as f:
            d = json.load(f)
    except (json.JSONDecodeError, ValueError) as e:
        # Previously this escaped as a raw JSONDecodeError and reached the operator as a
        # traceback. Half-written cargo is a real state: the mule truncates on a dropped
        # connection, and it is read by tools running under a 120-second clock.
        raise CargoUnreadable(f"the draft object at {cargo} is not valid JSON ({e})")
    except OSError as e:
        raise CargoUnreadable(f"the draft object at {cargo} could not be read ({e})")
    if not isinstance(d, dict):
        raise CargoUnreadable(f"the draft object at {cargo} is {type(d).__name__}, not an object")

    s = d.get("settings") or {}
    missing = [k for k in ("teams", "rounds") if not s.get(k)]
    if missing:
        raise CargoUnreadable(f"the draft object is missing {missing} -- refusing to guess "
                              f"league shape")
    if d.get("type") != "snake":
        raise UnsupportedShape(f"draft type is {d.get('type')!r}, not 'snake' -- every pick-slot "
                               f"computation in this repo assumes snake")
    if s.get("reversal_round"):
        raise UnsupportedShape(f"reversal_round is {s['reversal_round']} -- third-round reversal "
                               f"silently invalidates every pick-slot computation")

    ls = {}
    if os.path.exists(league_cargo):
        try:
            with open(league_cargo, encoding="utf-8-sig") as f:
                ls = (json.load(f).get("settings") or {})
        except (json.JSONDecodeError, ValueError, OSError):
            # The league object is a BONUS source here -- it supplies ir/playoff_teams and the
            # cross-check. Its absence already degrades silently (the os.path.exists above), so
            # a corrupt one must degrade the same way rather than crash a build the draft object
            # alone could have completed.
            ls = {}

    shape = {
        "draft_id": str(d.get("draft_id") or ""),
        "season": str(d.get("season") or ""),
        "status": d.get("status"),
        "start_time": d.get("start_time"),
        "teams": int(s["teams"]),
        "rounds": int(s["rounds"]),
        "type": d.get("type"),
        #: The draft object publishes this as `metadata.scoring_type` ("ppr"). It is carried so
        #: `meta.format` can be DERIVED rather than typed -- see `format_line`.
        "scoring_type": str((d.get("metadata") or {}).get("scoring_type") or ""),
        "reversal_round": int(s.get("reversal_round") or 0),
        "starters": {"QB": int(s.get("slots_qb") or 0), "RB": int(s.get("slots_rb") or 0),
                     "WR": int(s.get("slots_wr") or 0), "TE": int(s.get("slots_te") or 0),
                     "K": int(s.get("slots_k") or 0), "DEF": int(s.get("slots_def") or 0)},
        "flex": int(s.get("slots_flex") or 0),
        "bench": int(s.get("slots_bn") or 0),
        "ir": int(ls.get("reserve_slots") or 0),
        "playoff_teams": int(ls.get("playoff_teams") or 0),
    }
    if ls.get("num_teams") and int(ls["num_teams"]) != shape["teams"]:
        raise UnsupportedShape(f"the draft object says {shape['teams']} teams but the league "
                               f"object says {ls['num_teams']} -- two sources disagree about "
                               f"league shape")
    return shape


#: Sleeper's `scoring_type` code -> the words this league's docs already use for it.
SCORING_LABEL = {"ppr": "Full PPR", "half_ppr": "Half PPR", "std": "Standard"}

#: Roster order as a human reads a league settings page. FLEX sits between TE and K, which is
#: where it appears on Sleeper and in every doc in this repo.
_FORMAT_ORDER = ("QB", "RB", "WR", "TE", "K", "DEF")


def format_line(shape):
    """`meta.format` as a pure function of `meta.shape` (KTD-1).

    `meta.format` used to be a hand-typed prose string --
    `8-team · Full PPR · Snake · 16 rounds · QB/2RB/2WR/TE/2FLEX/K/DEF + 6 BN + 2 IR` -- carrying
    roughly eight facts that `meta.shape` also carries. The gate cross-checked exactly two of them,
    `teams` and `rounds`. **The unchecked half is the roster, and the roster is what the PDF header
    prints**, so a league that moved a flex slot would have shipped a cheat sheet describing a
    lineup nobody was playing, with every automated check green.

    Deriving it removes the duplicate rather than adding a ninth check to guard it, which is the
    distinction KTD-1 turns on. The gate now recomputes this and compares exactly, so the only
    thing it can still catch is a hand-edited surface -- which is precisely what it should catch.
    """
    starters = shape.get("starters") or {}

    def slot(pos, n):
        return pos if n == 1 else f"{n}{pos}"

    slots = [slot(p, int(starters[p])) for p in ("QB", "RB", "WR", "TE")
             if int(starters.get(p) or 0)]
    flex = int(shape.get("flex") or 0)
    if flex:
        slots.append(slot("FLEX", flex))
    slots += [slot(p, int(starters[p])) for p in ("K", "DEF") if int(starters.get(p) or 0)]
    # A league that invents a slot this list does not name must still see it. Silently dropping it
    # would put the board back to describing a roster that is not the one being drafted.
    slots += [slot(p, int(starters[p])) for p in sorted(starters)
              if p not in _FORMAT_ORDER and int(starters.get(p) or 0)]

    roster = "/".join(slots) or "no starters"
    if shape.get("bench"):
        roster += f" + {int(shape['bench'])} BN"
    if shape.get("ir"):
        roster += f" + {int(shape['ir'])} IR"

    code = str(shape.get("scoring_type") or "").lower()
    # Never invent "Full PPR" for a draft that did not say so -- an unlabelled scoring type is
    # reported as unknown rather than assumed to be this league's.
    scoring = SCORING_LABEL.get(code) or (code.replace("_", " ").upper() if code
                                          else "Custom scoring")
    return " · ".join([f"{int(shape['teams'])}-team", scoring,
                       str(shape.get("type") or "?").title(),
                       f"{int(shape['rounds'])} rounds", roster])

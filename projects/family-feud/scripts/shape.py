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
TRADED_CARGO = os.path.join(ROOT, "newsletter", "data", "inbox", "sleeper_traded_picks.json")
ROSTERS_CARGO = os.path.join(ROOT, "newsletter", "data", "inbox", "sleeper_rosters.json")


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


def our_roster_id(rosters_cargo=ROSTERS_CARGO, user_id=None):
    """Our `roster_id`, DERIVED from the rosters cargo. Returns (roster_id, note).

    `roster_id` is the currency `/traded_picks` is denominated in -- both `owner_id` and
    `previous_owner_id` are roster ids, not user ids -- so a traded pick cannot be attributed
    without this.

    IT IS DERIVED HERE AND NOWHERE ELSE, and that is the whole point. `docs/league.md` states
    `roster_id 3` in prose, and CLAUDE.md records why quoting it is a trap: there are THREE
    unrelated "3"s in this league (Briggsy's draft slot, his roster_id, and `slot_to_roster_id`'s
    identity-map value), sitting within a line of each other in that doc. Reading the roster whose
    `owner_id` equals our user id is the only form that cannot return a plausible wrong answer --
    it is keyed on the one id that is unambiguous. Verified live 2026-08-17: roster_id 3 owns
    user 1390750540631150592, and roster_id 1 is `briggsy007`, who is HUNTER.

    Absence is not an error here. It returns (None, why) and lets the caller decide -- the caller
    is the one that knows whether it holds a safe fallback.
    """
    if user_id is None:
        raise ValueError("user_id is required -- shape.py does not own that constant "
                         "(watch_draft_state.BRIGGSY_USER_ID does, and there is exactly one)")
    if not os.path.exists(rosters_cargo):
        return None, (f"no rosters cargo at {rosters_cargo} -- roster_id cannot be derived, so a "
                      f"traded pick cannot be attributed to a team")
    try:
        with open(rosters_cargo, encoding="utf-8-sig") as f:
            rosters = json.load(f)
    except (json.JSONDecodeError, ValueError, OSError) as e:
        return None, f"the rosters cargo at {rosters_cargo} could not be read ({e})"
    if not isinstance(rosters, list):
        return None, f"the rosters cargo is {type(rosters).__name__}, not a list"

    mine = [r for r in rosters
            if isinstance(r, dict) and str(r.get("owner_id") or "") == str(user_id)]
    if len(mine) != 1:
        # Zero means we are not in this league's rosters; more than one means Sleeper returned
        # something this function does not understand. Both are "cannot tell", never a guess --
        # picking the first of two would be insight 010's exact error (one candidate treated as
        # proof of identity) committed with two.
        return None, (f"{len(mine)} of {len(rosters)} rosters have owner_id {user_id} -- expected "
                      f"exactly 1, so roster_id is NOT derivable")
    rid = mine[0].get("roster_id")
    if rid is None:
        return None, "our roster carries no roster_id"
    return int(rid), f"roster_id={int(rid)} derived from rosters cargo on owner_id {user_id}"


def read_traded_picks(traded_cargo=TRADED_CARGO, rosters_cargo=ROSTERS_CARGO, user_id=None):
    """Traded draft picks, classified by whether they touch US. Returns (verdict, lines).

    WHY THIS EXISTS AT ALL. Every pick-slot computation in this repo -- `slot_of()`, `my_picks()`,
    "your next pick is #N", "picks until you", the ROSTERS/NEEDS attribution -- assumes each seat
    owns the picks its snake position implies. **One traded pick falsifies that for the rest of
    the draft**, and nothing anywhere read the endpoint that says so: `grep -rn traded_picks
    scripts/ draft-kit/` returned ZERO readers on 2026-08-17. The failure is the integrity-gate
    landmine's exact signature -- a complete, confident, internally consistent advisory, exit 0 --
    reached by a road with no gate on it. `[]` today and every day since 2026-08-07, which is
    precisely why it was never noticed.

    WHY IT IS NOT A BLANKET REFUSAL, WHICH IS THE OBVIOUS BUILD AND THE WRONG ONE.
    A trade between two OTHER teams does not move a single one of our pick numbers. Hard-stopping
    the war room at 8pm because Hunter and seat 6 swapped a 12th-rounder would be a false red --
    and this repo has already caught three (the skill's cold-load self-test, the `!!` seat banner
    pre-draft, `precompute_ladder`'s stale-id gate), each one teaching the operator to skip a gate.
    insight 009 records the false red as the MORE dangerous direction. So this classifies:

      * a pick where WE are the owner or the previous owner -> `UnsupportedShape`. Our own pick
        set is wrong and there is no honest advisory to give. Never degrade past it.
      * a pick between two other teams -> a LOUD warning, and the run continues. Our pick numbers
        are still exact; what degrades is which roster to attribute that one pick to.
      * picks exist but roster_id could not be derived -> `UnsupportedShape`, because "might be
        ours" is not a state anyone can draft from. The remedy is one curl, and it is named.

    WHY ABSENCE IS NOT AN ERROR. A missing cargo file returns `checked: False` and says so. Making
    it fatal would break `build_board.py` on a clean clone for a hypothetical, and a check that
    silently passes when its input is missing is the "gate that could never fire" this project has
    now caught twice. Neither. It reports what it did and did not check, out loud, every run.
    """
    lines = []
    verdict = {"checked": False, "count": 0, "ours": [], "others": [], "roster_id": None}

    if not os.path.exists(traded_cargo):
        lines.append(f"[unknown] no traded-picks cargo at {traded_cargo} -- NOT checked. A traded "
                     f"pick would make every 'picks until you' count wrong for the rest of the "
                     f"draft, silently. Re-run the mule, or: curl -sL --max-time 15 "
                     f"\"https://api.sleeper.app/v1/draft/<draft_id>/traded_picks\"")
        return verdict, lines
    try:
        with open(traded_cargo, encoding="utf-8-sig") as f:
            traded = json.load(f)
    except (json.JSONDecodeError, ValueError, OSError) as e:
        lines.append(f"[unknown] the traded-picks cargo could not be read ({e}) -- NOT checked")
        return verdict, lines
    if not isinstance(traded, list):
        lines.append(f"[unknown] the traded-picks cargo is {type(traded).__name__}, not a list "
                     f"-- NOT checked")
        return verdict, lines

    verdict["checked"] = True
    verdict["count"] = len(traded)
    if not traded:
        lines.append("[draft] traded picks: none -- the snake is plain, so every pick number "
                     "this engine prints is exact")
        return verdict, lines

    rid, rid_note = our_roster_id(rosters_cargo, user_id=user_id)
    verdict["roster_id"] = rid
    if rid is None:
        raise UnsupportedShape(
            f"{len(traded)} traded pick(s) exist in this draft and roster_id could not be derived "
            f"to tell whether any are OURS ({rid_note}). Every 'your next pick is #N' and 'picks "
            f"until you' would be a guess. Fix the input rather than the gate: curl -sL "
            f"--max-time 15 \"https://api.sleeper.app/v1/league/<league_id>/rosters\" > "
            f"newsletter/data/inbox/sleeper_rosters.json")

    for t in traded:
        if not isinstance(t, dict):
            continue
        owners = {t.get("owner_id"), t.get("previous_owner_id"), t.get("roster_id")}
        (verdict["ours"] if rid in owners else verdict["others"]).append(t)

    if verdict["ours"]:
        detail = "; ".join(
            f"round {t.get('round')} of roster {t.get('roster_id')} "
            f"({t.get('previous_owner_id')} -> {t.get('owner_id')})" for t in verdict["ours"])
        raise UnsupportedShape(
            f"{len(verdict['ours'])} traded pick(s) involve OUR roster ({rid}): {detail}. "
            f"`my_picks()` derives our picks from our seat's snake positions and every one of "
            f"them is now wrong -- as is 'picks until you', for the rest of the draft. This repo "
            f"does not model traded picks and will not guess at one under a clock.")

    lines.append(f"[draft] {rid_note}")
    lines.append(f"!! {len(verdict['others'])} TRADED PICK(S) IN THIS DRAFT, none of them ours. "
                 f"Our own pick numbers are still EXACT -- keep drafting. What is now wrong is "
                 f"WHICH TEAM picks at those slots, so 'their open needs' and the ROSTERS/NEEDS "
                 f"attribution may name the wrong roster there. Do not read a denial play off it.")
    for t in verdict["others"]:
        lines.append(f"!!   round {t.get('round')} of roster {t.get('roster_id')}: "
                     f"{t.get('previous_owner_id')} -> {t.get('owner_id')}")
    return verdict, lines


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


def strategy_slot_ranges(shape, bands=3):
    """`strategy.slotNotes[i].slot` as a pure function of `meta.shape` (KTD-1, KTD-7).

    The three labels were literals -- `"Picks 1-3"`, `"Picks 4-6"`, `"Picks 7-8"` -- describing
    seat ranges over a team count that lives one key away in `meta.shape`. On this 8-team league
    they are correct, so nothing was visibly wrong; move to ten teams and every one of them
    mislabels, while the gate stays green. The only check that looked at them asserted the numbers
    were inside `teams * rounds` (160 for a 10-team, 16-round draft), which "Picks 1-3" satisfies
    comfortably while describing a third of the room it claims to describe.

    Same remedy as `format_line`, and for the same reason: derive it so the duplicate is gone,
    rather than adding a check to guard a duplicate that stays. **The `note` is NOT touched** --
    the prose is Briggsy's judgment about drafting from the front, middle and back of a room, and
    that judgment does not become wrong when the room grows.

    Bands are near-equal with the remainder going to the EARLIEST bands, which is what reproduces
    the hand-typed 3/3/2 on this league byte-for-byte. That reproduction is asserted in the tests
    before this function is trusted, exactly as `format_line`'s was.
    """
    teams = int(shape.get("teams") or 0)
    bands = int(bands)
    if bands < 1:
        raise UnsupportedShape(f"cannot split a draft into {bands} slot bands")
    if teams < bands:
        # Refusing beats emitting "Picks 3-2". A room too small to divide into the bands the
        # board's prose assumes is a shape this strategy section does not describe, and inventing
        # an empty band would put a label on advice for a seat nobody can draft from.
        raise UnsupportedShape(f"{teams} teams cannot be split into {bands} slot bands -- the "
                               f"strategy section assumes a room with a front, a middle and a back")
    base, extra = divmod(teams, bands)
    labels, start = [], 1
    for i in range(bands):
        end = start + base + (1 if i < extra else 0) - 1
        labels.append(f"Picks {start}-{end}" if end > start else f"Pick {start}")
        start = end + 1
    return labels

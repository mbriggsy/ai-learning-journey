#!/usr/bin/env python3
"""U15 -- the engine wrapper. Read the draft, don't type it. (KTD-8)

    python scripts/run_engine.py                 # slot, shape and draft_id all from the draft
    python scripts/run_engine.py 3               # ...but state the seat yourself if you like
    python scripts/run_engine.py --dry-run       # resolve and print, launch nothing
    python scripts/run_engine.py 3 --rounds 15   # an override, which WINS and SAYS SO

`draft_engine.py` takes its league shape from positional arguments typed at a keyboard on draft
morning, with `teams=8, rounds=16` as defaults and the starter counts hardcoded in the file. Every
one of those is a fact the draft object already publishes, hourly, in cargo the mule has been
hauling for days. This wrapper reads them from there and hands them to the engine.

WHY THAT MATTERS MORE THAN IT SOUNDS. `draft_engine.py 3 8 15` against a 16-round draft makes
`my_next` `None`, so the engine goes SILENT about your own pick in round 16 -- the K/DEF round --
and exits 0 having told you nothing was wrong. The roster half is worse, because nothing checks it
at all: change a flex slot and the ROSTERS/NEEDS block and "their open needs" -- the engine's read
on what your opponents will take -- are confidently wrong with no error anywhere.

WHAT THIS WRAPPER WILL NOT DO, AND WHY EACH REFUSAL IS SHAPED THE WAY IT IS:

  * A NON-SNAKE OR REVERSAL DRAFT IS A HARD STOP, never a degrade. `slot_of()` and `my_picks()`
    assume plain snake; a third-round reversal silently invalidates every pick-slot computation in
    the repo -- the same failure signature as the integrity-gate landmine, reached by an unguarded
    route. This is why `shape.py` types its refusals: `CargoUnreadable` means we cannot tell and a
    caller with a fallback may use it, `UnsupportedShape` means we can tell and the answer is no.
    A wrapper that caught the base class to handle "no cargo" would swallow "this is an auction"
    in the same breath.

  * A MISSING OR STALE CARGO NEVER BLOCKS THE RUN. On draft morning a dead mule must not also cost
    the advisory. It degrades to argv -- out loud, with the reason, every time.

  * NOTHING IS INVENTED TO FILL A GAP. When shape is unknown AND unstated, this passes no shape at
    all and lets `draft_engine.py`'s own defaults apply, saying so. Re-typing `8` and `16` here
    would create a second hand-maintained copy of the league's shape, which is the exact defect
    (KTD-1) this unit exists inside a rebuild to remove.

  * A STALE CARGO'S draft_id IS NOT PASSED TO THE CONTAMINATION GATE. Supplying it arms a check
    that hard-refuses when `picks.json` belongs to a different draft -- so a re-created draft plus
    day-old cargo would refuse a CORRECT run. insight 009 records the false red as the more
    dangerous direction, because it teaches the operator to skip the gate. Fresh cargo arms it
    automatically, which is the win: today that flag is optional and a human under a 120-second
    clock forgets it.

The shape reaches the engine through FF_STARTERS/FF_FLEX in the environment rather than argv,
because argv there is positional and a JSON roster dict has no sane position in it. The engine
falls back to its built-ins if either is unreadable and reports that it did.

Exit codes: 0 and 1 are the engine's own, passed through untouched. 2 is this wrapper refusing
before the engine ever started.
"""
import argparse
import json
import os
import subprocess
import sys

# Windows encoding guard -- the project rule (docs/insights/003). This file prints the resolved
# shape before launching, and a UnicodeEncodeError here would kill the advisory before it began.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream must degrade, not crash
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KIT = os.path.join(ROOT, "draft-kit")
sys.path.insert(0, HERE)

from shape import (CARGO, LEAGUE_CARGO, CargoUnreadable,           # noqa: E402
                   UnsupportedShape, read_shape)
import watch_draft_state as W                                      # noqa: E402

ENGINE = os.path.join(KIT, "draft_engine.py")


class NoSeat(Exception):
    """The seat was neither given nor derivable. Carries the derivation so far, because the
    operator needs to see WHAT the cargo said before being told what it could not say."""

    def __init__(self, detail, lines):
        super().__init__(detail)
        self.detail, self.lines = detail, lines

#: Positions printed in roster order rather than dict order, so the line reads the way a league
#: settings page does. Anything the draft object carries that is not in this list still prints --
#: a league that invents a slot must not have it silently omitted from the shape banner.
POS_ORDER = ("QB", "RB", "WR", "TE", "K", "DEF")


def describe_roster(shape):
    """The starter line, in a shape a human recognises as their league."""
    starters = shape.get("starters") or {}
    ordered = [p for p in POS_ORDER if p in starters]
    ordered += [p for p in sorted(starters) if p not in POS_ORDER]
    body = " ".join(f"{p}{starters[p]}" for p in ordered if starters[p])
    bits = [body or "no starter slots"]
    if shape.get("flex"):
        bits.append(f"+ {shape['flex']} FLEX")
    if shape.get("bench"):
        bits.append(f"+ {shape['bench']} bench")
    return " ".join(bits)


def freshness(cargo):
    """(reasons, note) for the mule's cargo, or ([], note) when freshness cannot apply.

    Reuses the watcher's rule rather than inventing a second one -- it already learned, the hard
    way, that freshness is PER FILE and not per run: one failed source leaves yesterday's
    sleeper_draft.json on disk while `run_at` is minutes old.

    Freshness is only meaningful for the mule's own inbox. When the operator points `--cargo` at
    some other file, this says so instead of judging that file against the mule's clock.
    """
    if os.path.abspath(cargo) != os.path.abspath(CARGO):
        return [], f"freshness not checked: --cargo points outside the mule's inbox ({cargo})"
    age, problem = W.cargo_age_minutes()
    reasons = W.staleness_reasons(age, problem)
    if age is None:
        return reasons, f"cargo age unknown: {problem}"
    return reasons, f"cargo was {age:.0f} min old when this ran"


def resolve(argv_slot, teams=None, rounds=None, draft_id=None,
            cargo=CARGO, league_cargo=LEAGUE_CARGO):
    """Work out what the engine should be told, and why. Returns (plan, lines).

    `plan` carries what to launch with; `lines` is the human-readable derivation, printed in full
    before anything runs. Raises `UnsupportedShape` for a draft this repo will not compute, and
    `SystemExit` only for a seat that can be neither read nor derived.
    """
    lines, plan = [], {"slot": argv_slot, "teams": teams, "rounds": rounds,
                       "draft_id": draft_id, "starters": None, "flex": None}

    # --- the draft object -------------------------------------------------------------------
    # UnsupportedShape deliberately propagates. It is the one condition where degrading to argv
    # would compute a confident wrong pick order for a draft we just proved we do not model.
    shape, shape_problem = None, None
    try:
        shape = read_shape(cargo, league_cargo)
    except CargoUnreadable as e:
        shape_problem = str(e)

    stale_reasons, age_note = freshness(cargo)

    if shape is None:
        lines.append(f"[degraded] {shape_problem}")
        lines.append(f"[degraded] {age_note}")
    else:
        lines.append(f"[source] {cargo}")
        lines.append(f"[source] draft {shape['draft_id']}, season {shape['season']}, "
                     f"status {shape['status']}, {age_note}")
        for r in stale_reasons:
            lines.append(f"[stale] {r}")

    # --- teams and rounds -------------------------------------------------------------------
    # An override wins and says so; that is the plan's rule and it is the right one, because the
    # operator may know something the hourly cargo does not yet. It must never be quiet about it.
    for key in ("teams", "rounds"):
        stated, known = plan[key], (shape or {}).get(key)
        if stated is not None and known is not None and stated != known:
            lines.append(f"[override] {key}={stated} was given on the command line, but the draft "
                         f"object says {key}={known}. THE OVERRIDE WINS. If the draft object is "
                         f"right, drop the flag; if it is stale, this is how you get past it.")
        elif stated is not None:
            lines.append(f"[override] {key}={stated} from the command line"
                         + ("" if known is None else " (agrees with the draft object)"))
        elif known is not None:
            plan[key] = known
            lines.append(f"[draft] {key}={known}")
        else:
            lines.append(f"[unknown] {key} is neither readable nor stated -- draft_engine.py's "
                         f"own built-in default applies, and it is NOT checked against this draft")

    # --- the roster ------------------------------------------------------------------------
    if shape is not None:
        plan["starters"], plan["flex"] = shape.get("starters") or {}, int(shape.get("flex") or 0)
        lines.append(f"[draft] roster {describe_roster(shape)}")
    else:
        lines.append("[unknown] roster shape unreadable -- draft_engine.py's built-in starter "
                     "counts apply. A league that changed a slot will read as correct here.")

    # --- the seat ---------------------------------------------------------------------------
    # draft_order is the ONE legitimate source (never slot_to_roster_id -- it is an identity map
    # today, so it hands back a plausible wrong answer, and there are three unrelated "3"s in
    # this league). The watcher already owns that rule; this calls it rather than repeating it.
    if plan["slot"] is None:
        raw, problem = W.load_json(cargo, encoding="utf-8-sig")
        derived = W.my_slot((raw or {}).get("draft_order")) if isinstance(raw, dict) else None
        if derived is None:
            raise NoSeat(problem or
                         f'draft_order holds no entry for user_id {W.BRIGGSY_USER_ID} '
                         f'(it stays null until near go time -- that is normal, not a fault)',
                         lines)
        plan["slot"] = int(derived)
        lines.append(f'[draft] slot={plan["slot"]} from draft_order["{W.BRIGGSY_USER_ID}"]')
    else:
        lines.append(f"[given] slot={plan['slot']} from the command line "
                     f"(the engine cross-checks it against draft_order and your own picks)")

    # --- the contamination gate --------------------------------------------------------------
    if plan["draft_id"]:
        lines.append(f"[given] draft_id={plan['draft_id']} -- contamination gate armed")
    elif shape and shape.get("draft_id") and not stale_reasons:
        plan["draft_id"] = shape["draft_id"]
        lines.append(f"[draft] draft_id={plan['draft_id']} -- contamination gate armed "
                     f"automatically, so a spent mock's picks cannot advise this run")
    elif shape and shape.get("draft_id"):
        lines.append("[held back] the cargo's draft_id is NOT being passed: the cargo is stale "
                     "(above), and arming the gate from a stale id would refuse a CORRECT run if "
                     "the draft was re-created. Pass --draft-id to arm it yourself.")
    else:
        lines.append("[unknown] no draft_id available -- the contamination gate is NOT armed, so "
                     "a spent mock's picks.json would advise this run silently. Pass --draft-id.")

    return plan, lines


def command(plan):
    """The exact argv the engine gets. Positional and order-sensitive, so it is built in one place.

    `teams` and `rounds` are positional 2 and 3, so a rounds value cannot be passed without a teams
    value ahead of it. When rounds is known and teams is not, the sequence would silently shift
    rounds into the teams slot -- which is why this refuses to emit a hole rather than filling one.
    """
    argv = [sys.executable, ENGINE, str(plan["slot"])]
    if plan["teams"] is not None:
        argv.append(str(plan["teams"]))
        if plan["rounds"] is not None:
            argv.append(str(plan["rounds"]))
            if plan["draft_id"]:
                argv.append(str(plan["draft_id"]))
    return argv


def positional_gap(plan):
    """The values that cannot be delivered because an earlier positional is missing."""
    lost = []
    if plan["teams"] is None and plan["rounds"] is not None:
        lost.append("rounds")
    if not (plan["teams"] is not None and plan["rounds"] is not None) and plan["draft_id"]:
        lost.append("draft_id")
    return lost


def child_env(plan):
    """The engine's environment. Always authoritative -- FF_* is never inherited by accident.

    If this wrapper could not read the roster, it REMOVES the variables rather than leaving
    whatever happened to be exported in the operator's shell. A stale FF_STARTERS surviving from
    an earlier run against a different league is precisely the invisible wrong input this unit
    exists to eliminate.
    """
    env = os.environ.copy()
    env.pop("FF_STARTERS", None)
    env.pop("FF_FLEX", None)
    if plan["starters"]:
        env["FF_STARTERS"] = json.dumps(plan["starters"], sort_keys=True)
    if plan["flex"] is not None:
        env["FF_FLEX"] = str(plan["flex"])
    return env


def main(argv=None):
    p = argparse.ArgumentParser(
        prog="run_engine.py",
        description="Run draft_engine.py with league shape read from the draft object.")
    p.add_argument("slot", nargs="?", type=int,
                   help="your draft seat. Omit it and it is read from draft_order.")
    p.add_argument("--teams", type=int, help="override the draft object's team count")
    p.add_argument("--rounds", type=int, help="override the draft object's round count")
    p.add_argument("--draft-id", dest="draft_id",
                   help="override the draft id passed to the contamination gate")
    p.add_argument("--cargo", default=CARGO, help="path to the draft object")
    p.add_argument("--league-cargo", dest="league_cargo", default=LEAGUE_CARGO,
                   help="path to the league object")
    p.add_argument("--dry-run", action="store_true",
                   help="resolve and print the shape, launch nothing")
    a = p.parse_args(argv)

    try:
        plan, lines = resolve(a.slot, a.teams, a.rounds, a.draft_id, a.cargo, a.league_cargo)
    except NoSeat as e:
        # The derivation prints FIRST. Being told the seat is unknowable is far more useful
        # beside what the cargo did say -- fresh? which draft? -- than on its own.
        print("--- run_engine: league shape resolved from the draft, not from memory ---")
        for ln in e.lines:
            print("  " + ln)
        print("!" * 62)
        print("!! NO SEAT. It was not given, and the draft object cannot supply one.")
        print(f"!!   {e.detail}")
        print("!! Pass it: python scripts/run_engine.py <slot>")
        print(f'!! Read it from draft_order["{W.BRIGGSY_USER_ID}"] and from NOTHING ELSE.')
        print("!! slot_to_roster_id is an identity map {1:1...8:8}, so it will hand you a")
        print("!! plausible wrong seat -- and a wrong seat produces a complete, confident")
        print("!! advisory for another manager's team and exits 0.")
        print("!" * 62)
        return 2
    except UnsupportedShape as e:
        print("!" * 62)
        print("!! THIS DRAFT IS A SHAPE THE ENGINE DOES NOT MODEL")
        print(f"!!   {e}")
        print("!! Every pick-slot computation in this repo -- slot_of(), my_picks(), the clock,")
        print("!! picks-until-yours -- assumes a plain snake draft. Running anyway would print a")
        print("!! complete, confident advisory built on a pick order that is simply not this")
        print("!! draft's. Refusing is the only correct behaviour here.")
        print("!" * 62)
        return 2

    print("--- run_engine: league shape resolved from the draft, not from memory ---")
    for ln in lines:
        print("  " + ln)

    lost = positional_gap(plan)
    if lost:
        print("!" * 62)
        print(f"!! CANNOT DELIVER {', '.join(lost)} TO THE ENGINE.")
        print("!! draft_engine.py takes teams and rounds as positional arguments 2 and 3, so an")
        print("!! earlier one cannot be skipped. Supply the missing value explicitly:")
        print("!!   --teams N   (and --rounds N)")
        print("!! Passing them out of order would put a round count in the team-count slot and")
        print("!! produce a complete, confident advisory for a draft shape that does not exist.")
        print("!" * 62)
        return 2

    if not os.path.exists(ENGINE):
        print(f"!! no engine at {ENGINE} -- nothing to run.")
        return 2

    argv_out = command(plan)
    shown = " ".join(["python", "draft_engine.py"] + argv_out[2:])
    print(f"--- launching (cwd=draft-kit): {shown} ---")
    if plan["starters"]:
        print(f"    FF_STARTERS={json.dumps(plan['starters'], sort_keys=True)}  "
              f"FF_FLEX={plan['flex']}")
    print()

    if a.dry_run:
        print("[dry run] resolved only; the engine was not started.")
        return 0

    # FLUSH BEFORE HANDING THE STREAM OVER. The child writes to this same file descriptor
    # directly, while everything printed above is still sitting in THIS process's buffer whenever
    # stdout is not a terminal. Redirect to a log or pipe through `tee` -- both plausible on draft
    # day -- and the whole shape banner lands AFTER the advisory it is supposed to qualify.
    # Reproduced by redirecting to a file: the banner came out last. Costs nothing on a tty.
    sys.stdout.flush()

    # cwd=draft-kit is not cosmetic: draft_engine.py opens players_data.json, picks.json and
    # slot_names.json by literal name from the current directory, and finds the mule's cargo at
    # ../newsletter/data/inbox. Output is NOT captured -- this is a war-room advisory on a
    # 120-second clock and it streams straight to the operator's terminal.
    return subprocess.call(argv_out, cwd=KIT, env=child_env(plan))


if __name__ == "__main__":
    sys.exit(main())

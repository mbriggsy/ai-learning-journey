#!/usr/bin/env python3
"""U4 — the board schema gate. Make it impossible to ship a board the engine cannot eat.

    python3 scripts/validate_board.py            # --fast: static + cross-surface (default)
    python3 scripts/validate_board.py --full      # adds the engine replay (up to 120 subprocesses)

Run from the project root. Offline always: every check reads the dump U14 pinned, never the
network, so this is safe on draft morning.

THE GATE IS BORN RED, AND THAT IS CORRECT. Several checks fail the moment they are written,
because the surfaces are drifted TODAY. Acceptance is "the gate correctly reports the
known-drifted surfaces as failing", never "the gate passes". A gate that must be born green is a
gate someone weakens until it is.

Two modes because the checks have incompatible runtime profiles. Static row and cross-surface
checks are milliseconds and offline. The execution replay is up to 120 subprocess invocations,
so it belongs pre-commit, not on the clock.

Every check below is traceable to a reproduced failure. Where a check exists because something
silently did the wrong thing, the comment says what.
"""
import argparse
import datetime as _dt
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
sys.path.insert(0, KIT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from normalize import norm  # noqa: E402
import resolve_sleeper_ids as R  # noqa: E402
#: `shape` is dependency-free on purpose, so importing it here costs the gate nothing and gives it
#: the SAME renderer the generator uses -- a second copy would be the defect this check exists for.
from shape import format_line, read_shape  # noqa: E402
from shape import CARGO as SHAPE_CARGO, LEAGUE_CARGO as SHAPE_LEAGUE_CARGO  # noqa: E402
from shape import Refuse as ShapeRefuse  # noqa: E402

BOARD = os.path.join(KIT, "players_data.json")
HTML = os.path.join(KIT, "family-feud-draft-board.html")
PDF = os.path.join(KIT, "family-feud-cheat-sheet.pdf")
LEDGER = os.path.join(KIT, "sleeper_ids.json")
CURVE = os.path.join(KIT, "vorp_curve.json")     # U5's output; an input the board is built FROM
DUMP = os.path.join(KIT, "cache", "sleeper_players.json.gz")
ENGINE = os.path.join(KIT, "draft_engine.py")
FEED = os.path.join(ROOT, "tests", "fixtures", "lab_feed_120.json")

POSITIONS = {"RB", "WR", "TE", "QB", "K", "DEF"}
TOP_KEYS = {"meta", "players", "dst", "strategy"}
STRATEGY_KEYS = {"rules", "roundPlan", "slotNotes", "kickers"}
VALUE_KEYS = ("vorp", "vbdRank", "vbdDelta")

# The reproduced prefix schedule. The vbdDelta break fired at EXACTLY three picks, so deciles
# would have missed it entirely. 1, 2, 3, 4 first, then widen.
PREFIXES = [0, 1, 2, 3, 4, 5, 8, 9, 16, 17, 40, 80, 119, 120]


def _is_int(v):
    """bool is a subclass of int, and True would sail through an isinstance(v, int) check."""
    return isinstance(v, int) and not isinstance(v, bool)


# ---------------------------------------------------------------- structure and rows


def check_structure(d):
    if not isinstance(d, dict):
        return [f"top level is {type(d).__name__}, expected an object"]
    problems = []
    if set(d) != TOP_KEYS:
        problems.append(f"top-level keys are {sorted(d)}, expected {sorted(TOP_KEYS)}")
    players = d.get("players")
    if not isinstance(players, list):
        problems.append(f"'players' is {type(players).__name__}, expected a list")
    elif not players:
        # An empty list exits 0 with a complete-looking empty advisory -- the worst shape:
        # confident, well-formed, and about nothing.
        problems.append("'players' is empty -- the engine would print a complete empty advisory")
    elif not all(isinstance(p, dict) for p in players):
        problems.append("'players' holds a non-object entry")
    return problems


def check_rows(players):
    """Types and values, on ALL rows. Not a top-N sample: both known break modes are latent --
    a float vbdDelta passes an empty-picks smoke run and dies three picks in."""
    problems = []
    for i, p in enumerate(players):
        who = f"row {i} ({p.get('name', '?')!r})"
        n = p.get("name")
        if not isinstance(n, str) or not n.strip():
            problems.append(f"{who}: 'name' must be a non-empty string")
        # `tier` must be PRESENT, not merely well-typed when present. The engine hard-indexes
        # p["tier"] building TIER CLIFFS, and check_invariants silently skips a missing tier when
        # it collects the per-position tier set -- so a board with no tiers passed --fast and only
        # died in the engine replay. --fast is the draft-morning command.
        if "tier" not in p:
            problems.append(f"{who}: no 'tier' -- the engine hard-indexes it and would crash "
                            f"building the tier cliffs")
        for key in ("r", "pr", "tier", "vbdRank"):
            if key in p and not _is_int(p[key]):
                problems.append(f"{who}: {key!r} is {p[key]!r}, expected an int")
        # vbdDelta is printed with :+d, which raises TypeError on a float and takes the WHOLE
        # advisory down -- not just this row.
        if "vbdDelta" in p and not _is_int(p["vbdDelta"]):
            problems.append(f"{who}: 'vbdDelta' is {p['vbdDelta']!r}; :+d raises on a float")
        if "vorp" in p and not isinstance(p["vorp"], (int, float)) or isinstance(p.get("vorp"), bool):
            problems.append(f"{who}: 'vorp' is {p.get('vorp')!r}, expected a number")
        b = p.get("badges")
        if not isinstance(b, list) or any(not isinstance(x, str) or len(x) != 1 for x in b):
            problems.append(f"{who}: 'badges' must be a list of single-character strings, got {b!r}")
        for key in ("team", "note"):
            if not isinstance(p.get(key), str):
                problems.append(f"{who}: {key!r} must be a string, got {p.get(key)!r}")
        pos = p.get("pos")
        if pos not in POSITIONS:
            # Any other spelling makes the whole position vanish from TIER CLIFFS at exit 0, and
            # if not literally K/DEF it floods VBD LEANS with +45..+68 defense deltas.
            problems.append(f"{who}: 'pos' is {pos!r}, expected one of {sorted(POSITIONS)}")
    return problems


def check_invariants(players):
    problems = []

    def contiguous(vals, label, scope=""):
        got = sorted(v for v in vals if _is_int(v))
        if len(got) != len(vals):
            return [f"{label}{scope}: non-integer values present"]
        if len(set(got)) != len(got):
            dupes = sorted({v for v in got if got.count(v) > 1})
            return [f"{label}{scope}: duplicate value(s) {dupes} -- one pick would move two rows"]
        if got and got != list(range(1, len(got) + 1)):
            return [f"{label}{scope}: not contiguous 1..{len(got)} (got {got[0]}..{got[-1]})"]
        return []

    problems += contiguous([p.get("r") for p in players], "'r'")
    have_values = [p for p in players if all(k in p for k in VALUE_KEYS)]
    if have_values and len(have_values) != len(players):
        missing = [p.get("name") for p in players if not all(k in p for k in VALUE_KEYS)][:5]
        # All-present-or-all-absent, uniform board-wide: the engine prints a row without `vorp`
        # silently, so a partial board loses the chip on some rows and nobody notices.
        problems.append(f"{VALUE_KEYS} must be all-present or all-absent board-wide; "
                        f"{len(players) - len(have_values)} row(s) lack them, e.g. {missing}")
    if len(have_values) == len(players) and players:
        problems += contiguous([p.get("vbdRank") for p in players], "'vbdRank'")
        for p in players:
            if _is_int(p.get("r")) and _is_int(p.get("vbdRank")) and _is_int(p.get("vbdDelta")):
                want = p["r"] - p["vbdRank"]
                if p["vbdDelta"] != want:
                    problems.append(f"{p.get('name')!r}: vbdDelta {p['vbdDelta']} != r - vbdRank "
                                    f"({p['r']} - {p['vbdRank']} = {want})")

    by_pos = {}
    for p in players:
        by_pos.setdefault(p.get("pos"), []).append(p)
    for pos, rows in sorted(by_pos.items(), key=lambda kv: str(kv[0])):
        problems += contiguous([p.get("pr") for p in rows], "'pr'", f" within {pos}")
        tiers = sorted({p.get("tier") for p in rows if _is_int(p.get("tier"))})
        if tiers and tiers != list(range(1, len(tiers) + 1)):
            problems.append(f"tiers within {pos} are {tiers}, expected contiguous from 1")
    return problems


def check_names(players, dump):
    problems = []
    keys = {}
    for p in players:
        keys.setdefault(norm(p.get("name", "")), []).append(p.get("name"))
    for k, names in sorted(keys.items()):
        if len(names) > 1:
            # A duplicate makes ONE pick remove TWO rows from availability.
            problems.append(f"two board rows share the norm() key {k!r}: {names}")

    dump_keys = {norm(R.dump_name(p)) for p in dump["players"].values()}
    for p in players:
        if norm(p.get("name", "")) not in dump_keys and p.get("pos") != "DEF":
            problems.append(f"{p.get('name')!r} does not resolve against the pinned dump under "
                            f"norm() -- Sleeper spells him differently or he is gone")
    return problems


def check_badges(d):
    """draft_engine.py's glyph table uses .get(b, ""), so an unknown code renders as NOTHING,
    silently, while the HTML renders `undefined`. 'All three renderings agree' has to mean
    IDENTICAL KEY SETS, not agreement on the intersection."""
    declared = set((d.get("meta") or {}).get("badges") or {})
    used = {b for p in d.get("players", []) for b in (p.get("badges") or []) if isinstance(b, str)}
    problems = []
    if used - declared:
        problems.append(f"badge code(s) {sorted(used - declared)} appear on rows but are not keys "
                        f"of meta.badges -- the engine renders them as nothing at all")

    # A MARK MUST IDENTIFY EXACTLY ONE BADGE. Glyphs were checked for cp1252-encodability -- can
    # this be printed? -- and never for uniqueness -- does printing it mean anything? Two badges
    # sharing a mark is strictly worse than a missing one: a blank tells you nothing and looks
    # like nothing, while a duplicate tells you something specific and wrong, and the legend
    # underneath it confirms both readings. There are eight badges and one row can carry several.
    for field, surface in (("glyph", "the cheat sheet"), ("icon", "the board's legend")):
        marks = {}
        for code, spec in ((d.get("meta") or {}).get("badges") or {}).items():
            mark = (spec or {}).get(field)
            if mark:
                marks.setdefault(mark, []).append(code)
        for mark, codes in sorted(marks.items()):
            if len(codes) > 1:
                problems.append(f"badges {sorted(codes)} all print {field} {mark!r}, so "
                                f"{surface} cannot say which one a row carries")
    return problems


def check_dst(d, dump):
    """The verified drift was ENTIRELY in dst and strategy -- the two sections a row-level gate
    never inspects. The team-code -> full-name mapping is DERIVED from the pinned dump (a DEF
    record's player_id IS its team code) rather than hand-authored, so it cannot drift on its own.
    """
    problems = []
    dst = d.get("dst")
    if not isinstance(dst, list) or not all(isinstance(x, dict) for x in dst):
        return ["'dst' must be a list of objects"]
    if len(dst) != 8:
        problems.append(f"'dst' holds {len(dst)} entries, expected exactly 8")
    for i, e in enumerate(dst):
        if set(e) != {"rank", "team"}:
            problems.append(f"dst[{i}] keys are {sorted(e)}, expected ['rank', 'team']")
        if not _is_int(e.get("rank")):
            problems.append(f"dst[{i}]: 'rank' must be an int, got {e.get('rank')!r}")
        if not isinstance(e.get("team"), str):
            problems.append(f"dst[{i}]: 'team' must be a string, got {e.get('team')!r}")
    ranks = sorted(e.get("rank") for e in dst if _is_int(e.get("rank")))
    if ranks and ranks != list(range(1, len(ranks) + 1)):
        problems.append(f"dst ranks are {ranks}, expected contiguous from 1")

    full_name = {pid: f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
                 for pid, p in dump["players"].items() if p.get("position") == "DEF"}
    defs = sorted((p for p in d.get("players", []) if p.get("pos") == "DEF"),
                  key=lambda p: p.get("pr", 0))
    want = [full_name.get(p.get("team")) for p in defs[:8]]
    got = [e.get("team") for e in sorted(dst, key=lambda e: e.get("rank", 0))]
    if want != got:
        # The truncation rule (14 DEF rows -> 8 dst) is asserted here, not inherited.
        problems.append(f"'dst' is not the top 8 DEF rows by pr:\n"
                        f"       board says {want}\n"
                        f"       dst says   {got}")
    return problems


#: Generational suffixes, lowercased and stripped of punctuation. Ten of this board's 174 rows end
#: in one.
NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def surname_keys(name):
    """Every token the strategy prose might use to refer to this player.

    This check used to key on `name.split()[-1]` alone, which for `Marvin Harrison Jr.` is `Jr.`
    -- so prose reading `Harrison (ARI)` matched nothing and the check SILENTLY DID NOTHING for
    every suffixed player. Ten rows on this board end in a suffix, and it was worse than blind:
    they all collided on a handful of keys, so `Jr.` mapped to the union of six different teams
    and would have accepted almost any team named beside a `Jr.` surname.

    Insight 008's shape exactly -- a broken instrument returns zero, and zero reads like a clean
    bill of health. Both keys are indexed, because prose legitimately uses either.
    """
    toks = [t for t in str(name or "").split() if t]
    if not toks:
        return set()
    keys = {toks[-1]}
    body = list(toks)
    while len(body) > 1 and body[-1].lower().strip(".,") in NAME_SUFFIXES:
        body.pop()
    keys.add(body[-1])
    return keys


#: A "baselines ..." clause, up to the first sentence-ending punctuation. The anchor word is
#: load-bearing -- see baseline_claims.
_BASELINE_CLAUSE = re.compile(r"baselines?\b([^.;)]*)", re.I)
_POS_NUM = re.compile(r"\b(QB|RB|WR|TE)\s*(\d+)\b")


def baseline_claims(strategy):
    """Every VBD baseline QUOTED in strategy prose, as (field, position, number).

    `rules[10]` ends "baselines QB12/RB41/WR47/TE12" -- four numbers that are already data in
    `meta.vbd`, typed a second time into a sentence nothing checked. The remedy is NOT to
    template the sentence: that would put an f-string in the one place the voice lives. It is to
    let the prose stay human and make it impossible for it to drift.

    THE ANCHOR WORD IS WHY THIS IS NOT A BLANKET SCAN, and it was chosen by measurement rather
    than taste. Scanning every `(QB|RB|WR|TE)\\d+` run in strategy prose finds three more on this
    board right now -- `roundPlan[1]` says "RB2" and `slotNotes[2]` says "WR1" and "RB1" -- and
    every one of them is ordinal shorthand for a tier, not a baseline. A gate that reds on "a
    solid RB2" is a gate that gets switched off, and a false red on draft morning is the failure
    insight 009 is about. So only a clause introduced by "baseline"/"baselines" is read.

    The cost is a real blind spot: rewrite the sentence to say "replacement levels QB12/..." and
    this quietly checks nothing. That is insight 006's shape -- a verification step that can
    silently do nothing -- so it ships with a POSITIVE CONTROL in the tests asserting it still
    finds four claims on the live board. A zero from this function must mean "the prose stopped
    quoting baselines", never "the instrument stopped reading".
    """
    out = []
    fields = [("rules", strategy.get("rules") or [])]
    for field, items in fields:
        for i, item in enumerate(items if isinstance(items, list) else [items]):
            for clause in _BASELINE_CLAUSE.findall(str(item)):
                for pos, num in _POS_NUM.findall(clause):
                    out.append((f"{field}[{i}]", pos, int(num)))
    return out


def check_strategy(d):
    problems = []
    s = d.get("strategy")
    if not isinstance(s, dict):
        return ["'strategy' must be an object"]
    if set(s) != STRATEGY_KEYS:
        problems.append(f"strategy keys are {sorted(s)}, expected {sorted(STRATEGY_KEYS)}")
    for k in sorted(STRATEGY_KEYS & set(s)):
        if not s[k]:
            problems.append(f"strategy.{k} is empty")
    for i, e in enumerate(s.get("roundPlan") or []):
        if not isinstance(e, dict) or set(e) != {"rounds", "plan"}:
            problems.append(f"strategy.roundPlan[{i}] keys are "
                            f"{sorted(e) if isinstance(e, dict) else e!r}, expected "
                            f"['plan', 'rounds']")
    for i, e in enumerate(s.get("slotNotes") or []):
        if not isinstance(e, dict) or set(e) != {"slot", "note"}:
            problems.append(f"strategy.slotNotes[{i}] keys are "
                            f"{sorted(e) if isinstance(e, dict) else e!r}, expected "
                            f"['note', 'slot']")

    teams, rounds = league_shape(d)
    if teams and rounds:
        cap = teams * rounds
        for e in (s.get("roundPlan") or []):
            for n in re.findall(r"\d+", str(e.get("rounds", ""))):
                if not 1 <= int(n) <= rounds:
                    problems.append(f"strategy.roundPlan says round {n}, but meta declares "
                                    f"{rounds} rounds")
        for e in (s.get("slotNotes") or []):
            for n in re.findall(r"\d+", str(e.get("slot", ""))):
                if not 1 <= int(n) <= cap:
                    problems.append(f"strategy.slotNotes says pick {n}, but the draft is only "
                                    f"{teams} x {rounds} = {cap} picks")

    # A count asserted in prose must match a computed count. "10 of them" is the K count, and
    # U5 is licensed to change what is on the board underneath it.
    k_count = sum(1 for p in d.get("players", []) if p.get("pos") == "K")
    for claim in re.findall(r"(\d+)\s+of them", str(s.get("kickers", ""))):
        if int(claim) != k_count:
            problems.append(f"strategy.kickers claims {claim} kickers; the board has {k_count}")

    # VBD baselines quoted in prose must match meta.vbd. See baseline_claims for why this is
    # anchored on the word "baseline" instead of scanning every position-number run.
    vbd = (d.get("meta") or {}).get("vbd") or {}
    waiver = vbd.get("baselineWaiver") or {}
    starter = vbd.get("lastStarter") or {}
    for where, pos, num in baseline_claims(s):
        live = [v for v in (waiver.get(pos), starter.get(pos)) if v is not None]
        if not live:
            problems.append(f"strategy.{where} quotes a {pos} baseline of {num}, but meta.vbd "
                            f"carries no {pos} baseline at all")
        elif num not in [int(v) for v in live]:
            problems.append(f"strategy.{where} quotes {pos}{num}, but meta.vbd says "
                            f"baselineWaiver.{pos}={waiver.get(pos)} / "
                            f"lastStarter.{pos}={starter.get(pos)}")

    # "(name, team)" pairs must match that row's team. Aubrey (DAL), Fairbairn (HOU) ...
    surname_team = {}
    for p in d.get("players", []):
        for key in surname_keys(p.get("name")):
            surname_team.setdefault(key, set()).add(p.get("team"))
    prose = " ".join([*(s.get("rules") or []), str(s.get("kickers", "")),
                      *[str(e.get("plan", "")) for e in (s.get("roundPlan") or [])],
                      *[str(e.get("note", "")) for e in (s.get("slotNotes") or [])]])
    for who, team in re.findall(r"([A-Z][A-Za-z.'’-]+)\s*\(([A-Z]{2,3})\)", prose):
        if who in surname_team and team not in surname_team[who]:
            problems.append(f"strategy names {who} ({team}) but the board has {who} on "
                            f"{sorted(surname_team[who])}")
    return problems


def league_shape(d):
    """teams and rounds, parsed from meta.format -- the only place they exist as data."""
    fmt = str((d.get("meta") or {}).get("format", ""))
    t = re.search(r"(\d+)-team", fmt)
    r = re.search(r"(\d+)\s*rounds", fmt)
    return (int(t.group(1)) if t else None), (int(r.group(1)) if r else None)


#: Shape facts that make the board WRONG if they move. `status` and `start_time` are deliberately
#: absent: both are EXPECTED to change (pre_draft -> drafting, null -> a real date), they affect a
#: header string rather than any advice, and `watch_draft_state.py` exists to catch exactly them.
#: Failing the gate on those would turn `--verify-only` red on draft morning -- the moment it most
#: needs to be trustworthy -- for something that is not wrong.
SHAPE_FACTS = ("teams", "rounds", "type", "reversal_round", "starters", "flex", "bench")


def check_shape_against_draft(d, cargo=SHAPE_CARGO, league_cargo=SHAPE_LEAGUE_CARGO):
    """Does `meta.shape` still describe the draft it names?

    Every other check in this gate compares the board to ITSELF -- rows against rows, prose against
    the blob, the PDF against the source. All of them stay green on a board built from a draft that
    has since been re-created, or that was the wrong draft from the start, because the board is
    perfectly self-consistent about the wrong thing. `meta.shape` is stamped once at build time and
    then never questioned again, so `--verify-only` blesses it forever.

    This is the only check that asks whether the board still matches the world.

    IT IS SILENT WHEN THE CARGO CANNOT BE READ. On a clean clone or in CI there is no inbox, and a
    gate that failed there would be a false red -- which insight 009 records as the more dangerous
    direction, because it teaches the operator to skip the gate. `main()` reports the
    could-not-check case in words instead, so "I did not check" never prints like "I checked".
    """
    shape = (d.get("meta") or {}).get("shape")
    if not isinstance(shape, dict):
        return []                       # check_generated_fields already reports a missing shape
    try:
        live = read_shape(cargo, league_cargo)
    except ShapeRefuse:
        return []

    stamped_id, live_id = str(shape.get("draft_id") or ""), str(live.get("draft_id") or "")
    if stamped_id and live_id and stamped_id != live_id:
        # Report ONLY this. A different draft's teams/rounds are not drift, they are a different
        # league, and listing seven more mismatches would bury the one fact that matters.
        return [f"meta.shape was stamped from draft {stamped_id}, but the draft object on disk is "
                f"{live_id} -- this board describes a draft that is not the one being run. Every "
                f"other check in this gate passes because the board is self-consistent about the "
                f"wrong draft. Re-run scripts/build_board.py."]

    problems = []
    for key in SHAPE_FACTS:
        was, now = shape.get(key), live.get(key)
        if now is None or was == now:
            continue
        problems.append(f"meta.shape.{key} says {was!r} but draft {live_id or '?'} now says "
                        f"{now!r} -- the board was built against a league shape that has since "
                        f"changed. Re-run scripts/build_board.py.")
    return problems


def shape_provenance_line(d, cargo=SHAPE_CARGO, league_cargo=SHAPE_LEAGUE_CARGO, now=None):
    """What `check_shape_against_draft` was actually able to compare against, in one line.

    The check goes silent when the cargo is unreadable, which is right -- but a silent check that
    prints nothing is indistinguishable from a check that passed, and that conflation is the
    disease half this repo's guards exist to treat. So the gate says which it was, every run.
    """
    try:
        live = read_shape(cargo, league_cargo)
    except ShapeRefuse as e:
        return ("[unverified] meta.shape was NOT re-checked against the draft object -- "
                f"{e}. The board could be describing a draft that no longer exists.")
    try:
        age = ((now or _dt.datetime.now())
               - _dt.datetime.fromtimestamp(os.path.getmtime(cargo))).total_seconds() / 60.0
        age_txt = f"cargo {age:.0f} min old"
    except OSError:
        age_txt = "cargo age unknown"
    return f"[checked] meta.shape against live draft {live.get('draft_id')} ({age_txt})"


def check_meta_freshness(d, ledger, dump, paths=()):
    """meta.updated has ZERO readers anywhere in the repo -- it is a self-reported claim nothing
    checks and nothing displays. 'Claims Aug 5, built from Aug 20 inputs' is the drift signature
    and it is mechanically detectable."""
    problems = []
    claimed = (d.get("meta") or {}).get("updated")
    try:
        claimed_d = _dt.date.fromisoformat(str(claimed))
    except (TypeError, ValueError):
        return [f"meta.updated is {claimed!r}, expected an ISO date"]
    inputs = []
    fetched = (ledger.get("meta") or {}).get("dump_fetched_at") or dump.get("fetched_at")
    if fetched:
        inputs.append(("the pinned Sleeper dump", str(fetched)[:10]))
    for label, path in paths:
        if os.path.exists(path):
            inputs.append((label, _dt.date.fromtimestamp(os.path.getmtime(path)).isoformat()))
    for label, when in inputs:
        try:
            when_d = _dt.date.fromisoformat(when)
        except ValueError:
            continue
        if when_d > claimed_d:
            problems.append(f"meta.updated claims {claimed}, but {label} is dated {when} -- the "
                            f"board is older than an input it was supposedly built from")
    return problems


def check_sleeper_ids(players, ledger, dump):
    problems = []
    ids = (ledger.get("ids") or {})
    seen = {}
    for p in players:
        entry = ids.get(p.get("name"))
        if not entry or not entry.get("sleeperId"):
            problems.append(f"{p.get('name')!r} has no frozen sleeperId in the ledger")
            continue
        pid = str(entry["sleeperId"])
        if not (pid.isdigit() or (pid.isalpha() and pid.isupper())):
            problems.append(f"{p.get('name')!r}: sleeperId {pid!r} is neither a numeric id nor a "
                            f"team code")
        seen.setdefault(pid, []).append(p.get("name"))
        rec = dump["players"].get(pid)
        if rec is None:
            problems.append(f"{p.get('name')!r}: sleeperId {pid} is not in the pinned dump")
        elif rec.get("position") != p.get("pos") or rec.get("team") != p.get("team"):
            problems.append(f"{p.get('name')!r} is frozen at {pid}, which the dump says is "
                            f"{rec.get('position')}/{rec.get('team')} while the board says "
                            f"{p.get('pos')}/{p.get('team')}")
        else:
            # POSITION AND TEAM ARE ATTRIBUTES THE WRONG ANSWER ALSO SATISFIES.
            # Two same-position teammates can hold each other's id and every check above passes:
            # both ids resolve, both agree on pos and team, and neither is a duplicate. That is
            # docs/insights/010 exactly. The ledger recorded WHICH dump record it matched, so
            # that name is the independent witness -- compare it against the dump's name at the
            # id actually stored, not against the board's rendered name (which legitimately
            # differs: Hollywood Brown vs Marquise Brown).
            matched = ((entry.get("evidence") or {}).get("dump_name") or "").strip()
            if matched and norm(matched) != norm(R.dump_name(rec)):
                problems.append(
                    f"{p.get('name')!r} is frozen at {pid}, but the ledger says it resolved to "
                    f"{matched!r} while that id belongs to {R.dump_name(rec)!r} in the dump -- "
                    f"two rows may be holding each other's id")
    for pid, names in sorted(seen.items()):
        if len(names) > 1:
            problems.append(f"sleeperId {pid} is claimed by {len(names)} rows: {names}")
    return problems


def check_generated_fields(d, ledger):
    """The fields U6's generator stamps onto the source. Nothing validated these before, because
    before U6 no row carried them -- and a field nothing checks is a field that can be anything.

    Caught in the first staged dry run: the generator wrote the ledger's whole provenance RECORD
    into every row instead of the id string, doubling the file, and every other check passed.
    An unchecked new field is exactly as dangerous as an unchecked old one.
    """
    problems = []
    players = d.get("players") or []
    ids = (ledger.get("ids") or {})

    for p in players:
        who = f"{p.get('name')!r}"
        pid = p.get("sleeperId")
        if pid is None:
            problems.append(f"{who}: row has no 'sleeperId' -- the generator stamps it from the "
                            f"ledger so consumers stop joining through a second file")
        elif not isinstance(pid, str):
            problems.append(f"{who}: row 'sleeperId' is {type(pid).__name__}, expected a string; "
                            f"the ledger entry is a provenance record and only its 'sleeperId' "
                            f"belongs on the row")
        else:
            if not (pid.isdigit() or (pid.isalpha() and pid.isupper())):
                problems.append(f"{who}: row sleeperId {pid!r} is neither a numeric id nor a "
                                f"team code")
            frozen = (ids.get(p.get("name")) or {}).get("sleeperId")
            if frozen is not None and str(frozen) != pid:
                problems.append(f"{who}: row sleeperId {pid!r} disagrees with the frozen ledger "
                                f"({frozen!r}) -- the join key on the board is not the one that "
                                f"was resolved")

        method = p.get("vorpMethod")
        if not isinstance(method, str) or not method:
            problems.append(f"{who}: row has no 'vorpMethod'; KTD-6 requires each row to record "
                            f"which method produced its vorp, or mixed provenance passes "
                            f"silently")
        elif p.get("pos") in ("K", "DEF") and method != "carried:kdef-tier-flat":
            problems.append(f"{who} is {p.get('pos')} but its vorpMethod is {method!r}; K and DEF "
                            f"values are flat per-tier constants, not curve or projection output")
        elif p.get("pos") not in ("K", "DEF") and not (
                method.startswith("curve:") or method in ("curve", "projection")):
            problems.append(f"{who}: vorpMethod {method!r} is not a permitted method for a skill "
                            f"row")

    meta = d.get("meta") or {}
    for code, spec in (meta.get("badges") or {}).items():
        glyph = (spec or {}).get("glyph")
        if not isinstance(glyph, str) or len(glyph) != 1:
            problems.append(f"meta.badges[{code!r}] has no single-character 'glyph'; the PDF and "
                            f"the engine would fall back to their own hardcoded tables")
            continue
        try:
            glyph.encode("cp1252")
        except UnicodeEncodeError:
            problems.append(f"meta.badges[{code!r}].glyph {glyph!r} is not cp1252-encodable, so "
                            f"reportlab would silently print a different symbol")

    shape = meta.get("shape")
    if not isinstance(shape, dict):
        problems.append("meta.shape is missing -- KTD-7 requires league shape to be stamped from "
                        "the draft object, not hardcoded in prose or in the renderers")
    else:
        for key in ("draft_id", "teams", "rounds"):
            if not shape.get(key):
                problems.append(f"meta.shape has no {key!r}")
        # meta.format is DERIVED from meta.shape by the generator (KTD-1), so the whole string is
        # checkable, not just the two numbers a regex could pull out of it. This used to compare
        # `teams` and `rounds` alone -- leaving the ROSTER half, which the PDF header prints,
        # guarded by nothing. The only thing this can still catch is a hand-edited surface, which
        # is exactly what a gate is for.
        if shape.get("teams") and shape.get("rounds"):
            want = format_line(shape)
            got = str(meta.get("format", ""))
            if got != want:
                problems.append(f"meta.format is not what meta.shape describes -- it is supposed "
                                f"to be derived from it, so this is a hand-edit or a stale build.\n"
                                f"       meta.format: {got!r}\n"
                                f"       from shape : {want!r}")
    return problems


def check_normalizer_equivalence(players, html=HTML):
    """Per KTD-3 this belongs in the GATE, which runs before every emit -- not only in a test
    suite someone remembers to run. The live board's normalizer is JS; a divergence means the
    board and the engine disagree about who a player is.

    THE JS UNDER TEST IS EXTRACTED FROM THE SHIPPED HTML, not regenerated from normalize.py.
    Regenerating it round-trips normalize.py against itself and proves only that Python agrees
    with Python -- a hand-edited or stale block in the board would sail through the one check
    whose entire purpose is to catch exactly that. Falls back to the generated source only when
    the HTML cannot be read, and says so.
    """
    import normalize
    import tempfile
    names = [p.get("name", "") for p in players]

    try:
        with open(html, encoding="utf-8") as f:
            page = f.read()
    except OSError as e:
        return [f"cannot read {os.path.basename(html)} to check normalizer equivalence ({e})"]
    try:
        start = page.index("// GENERATED by draft-kit/normalize.py")
        end = page.index("const DATA = ", start)
    except ValueError:
        # NOT a silent fall back to normalize.js_source(). Regenerating here would let a board
        # that ships NO normalizer -- or a hand-written one under a different banner -- pass the
        # single check whose job is to prove the browser and Python agree. KTD-3 says generated,
        # so an absent generated block is itself the failure.
        return [f"{os.path.basename(html)} carries no generated normalizer block -- KTD-3 requires "
                f"const NORM_SPEC and its interpreter to be EMITTED into the board, and without "
                f"them the browser and the engine cannot be proven to agree about who a player is"]
    js_source = page[start:end]
    if "NORM_SPEC" not in js_source or "normName" not in js_source:
        return [f"the board's normalizer block is missing normName/NORM_SPEC"]
    # The emitted entry point is normName(s, NORM_SPEC) -- NOT a bare `norm`. Guessing at it
    # produced a ReferenceError that this gate reported as a board failure: a FALSE RED, which
    # insight 009 records as more dangerous than a false green because it teaches the operator
    # to skim past the gate. Names go through a FILE, not argv, because 174 of them do not fit
    # comfortably on a Windows command line.
    body = ('\nconst names = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));\n'
            'process.stdout.write(JSON.stringify(names.map(n => normName(n, NORM_SPEC))));\n')
    try:
        with tempfile.TemporaryDirectory() as t:
            js, payload = os.path.join(t, "n.js"), os.path.join(t, "names.json")
            with open(js, "w", encoding="utf-8") as f:
                f.write(js_source + body)
            with open(payload, "w", encoding="utf-8") as f:
                json.dump(names, f, ensure_ascii=False)
            out = subprocess.run(["node", js, payload], capture_output=True, text=True,
                                 encoding="utf-8", timeout=60)
    except FileNotFoundError:
        return ["node is not on PATH, so Python<->JS normalizer equivalence was NOT checked"]
    if out.returncode != 0:
        return [f"the emitted JS normalizer failed to run: {(out.stderr or '')[:200]}"]
    js_keys = json.loads(out.stdout)
    problems = []
    for name, js_key in zip(names, js_keys):
        if norm(name) != js_key:
            problems.append(f"normalizer disagrees on {name!r}: python={norm(name)!r} "
                            f"js={js_key!r}")
    return problems


# ---------------------------------------------------------------- cross-surface


def check_html(d, path=HTML):
    problems = []
    if not os.path.exists(path):
        return [f"{os.path.basename(path)} is missing"]
    with open(path, encoding="utf-8") as f:
        html = f.read()
    m = re.search(r"^const DATA = (\{.*?\});?\s*$", html, re.M | re.S)
    if not m:
        return [f"{os.path.basename(path)} has no `const DATA = ` line"]
    try:
        blob = json.loads(m.group(1))
    except json.JSONDecodeError as e:
        return [f"the HTML's DATA blob is not valid JSON ({e})"]
    for key in sorted(TOP_KEYS):
        if blob.get(key) != d.get(key):
            problems.append(f"the HTML's DATA.{key} does not deep-equal players_data.json")

    # PROSE OUTSIDE THE BLOB. The deep-equal above inspects only the extracted object, so a
    # refresh passes it while shipping a board whose visible header still reads the old date.
    prose = html[:m.start()] + html[m.end():]
    meta = d.get("meta") or {}
    claimed = str(meta.get("updated", ""))
    for shown in re.findall(r"Rankings synthesized ([A-Z][a-z]+ \d+, \d{4})", prose):
        try:
            when = _dt.datetime.strptime(shown, "%b %d, %Y").date().isoformat()
        except ValueError:
            try:
                when = _dt.datetime.strptime(shown, "%B %d, %Y").date().isoformat()
            except ValueError:
                problems.append(f"the board's visible date {shown!r} is unparseable")
                continue
        if when != claimed:
            problems.append(f"the board's visible date says {shown} but meta.updated is "
                            f"{claimed} -- the only human-visible date on the board is wrong")

    # NO NUMBER APPEARING IN meta MAY EXIST AS A LITERAL IN GENERATED PROSE. It looks
    # data-driven -- the surrounding line guards on DATA.meta.vbd existing and then prints the
    # values as literals -- which is exactly why it survived review. U5 is licensed to change
    # precisely these numbers.
    vbd = meta.get("vbd") or {}
    for group in ("baselineWaiver", "lastStarter"):
        for pos, val in sorted((vbd.get(group) or {}).items()):
            if re.search(rf"\b{re.escape(pos)}{val}\b", prose):
                problems.append(f"meta.vbd.{group}.{pos} = {val} is hardcoded in the HTML's prose "
                                f"as the literal {pos}{val!s}; render it from the data instead")
    return problems


def check_pdf(players, path=PDF):
    problems = []
    if not os.path.exists(path):
        return [f"{os.path.basename(path)} is missing"]
    try:
        from pypdf import PdfReader
    except ImportError:
        return ["pypdf is not installed, so the PDF was NOT checked"]
    text = "\n".join(p.extract_text() or "" for p in PdfReader(path).pages)
    missing = [p.get("name") for p in players if p.get("name") not in text]
    if missing:
        problems.append(f"the cheat sheet is missing {len(missing)} of {len(players)} board "
                        f"players, e.g. {missing[:6]}")
    return problems


def check_engine_replay(prefixes=PREFIXES, engine=ENGINE, feed=FEED, kit=KIT):
    """The execution gate: the real engine, against the real board, at increasing prefixes."""
    problems = []
    if not os.path.exists(feed):
        return [f"no lab feed at {feed} -- nothing to replay"]
    with open(feed, encoding="utf-8") as f:
        picks = json.load(f)
    picks.sort(key=lambda p: p["pick_no"])
    draft_id = str(picks[0].get("draft_id")) if picks else None
    import tempfile
    import shutil
    with tempfile.TemporaryDirectory() as t:
        work = os.path.join(t, "draft-kit")
        os.makedirs(work)
        for name in ("players_data.json", "normalize.py", "sleeper_ids.json"):
            src = os.path.join(kit, name)
            if os.path.exists(src):
                shutil.copy(src, work)
        env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
        for n in prefixes:
            if n > len(picks):
                continue
            with open(os.path.join(work, "picks.json"), "w", encoding="utf-8") as f:
                json.dump(picks[:n], f, ensure_ascii=False)
            p = subprocess.run([sys.executable, engine, "3", "8", "16", draft_id],
                               cwd=work, capture_output=True, text=True, encoding="utf-8",
                               env=env, timeout=120)
            if p.returncode != 0:
                problems.append(f"the engine exited {p.returncode} replaying {n} pick(s): "
                                f"{((p.stdout or '') + (p.stderr or ''))[-400:]}")
    return problems


# ---------------------------------------------------------------- orchestration


def validate(board_path=BOARD, ledger_path=LEDGER, dump_path=DUMP, html=HTML, pdf=PDF,
             full=False, kit=KIT, cargo=SHAPE_CARGO, league_cargo=SHAPE_LEAGUE_CARGO):
    # `kit` is forwarded so the generator can replay the board it is ABOUT to ship rather than the
    # one already on disk. Without it, --full blesses the wrong file during a staged build.
    with open(board_path, encoding="utf-8") as f:
        d = json.load(f)
    problems = check_structure(d)
    if problems:
        return problems                      # nothing below can be trusted on a broken shape
    players = d["players"]
    with open(ledger_path, encoding="utf-8") as f:
        ledger = json.load(f)
    dump = R.read_cache(dump_path)

    problems += check_rows(players)
    problems += check_invariants(players)
    problems += check_names(players, dump)
    problems += check_badges(d)
    problems += check_dst(d, dump)
    problems += check_strategy(d)
    problems += check_meta_freshness(d, ledger, dump,
                                     paths=[("the frozen id ledger", ledger_path),
                                            ("the pinned dump file", dump_path),
                                            ("the VORP curve", CURVE)])
    problems += check_sleeper_ids(players, ledger, dump)
    problems += check_generated_fields(d, ledger)
    problems += check_shape_against_draft(d, cargo, league_cargo)
    problems += check_normalizer_equivalence(players, html)
    problems += check_html(d, html)
    problems += check_pdf(players, pdf)
    if full:
        problems += check_engine_replay(kit=kit)
    return problems


def main(argv=None):
    ap = argparse.ArgumentParser(description="Validate the draft board before it ships.")
    ap.add_argument("--full", action="store_true",
                    help="also replay the lab feed through the real engine (slow, pre-commit)")
    ap.add_argument("--fast", action="store_true", help="static + cross-surface only (default)")
    a = ap.parse_args(argv)

    # Windows defaults stdout to cp1252, and this gate's own failure messages quote board values
    # -- names with accents, the badge glyphs it checks, the em-dashes in strategy prose. Without
    # this the gate dies with UnicodeEncodeError WHILE REPORTING the drift it exists to catch,
    # which reads as "the gate is broken" rather than "the board is wrong". Fourth instance of
    # docs/insights/003 in this project; the engine and the generator already do this.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    problems = validate(full=a.full)
    mode = "--full" if a.full else "--fast"

    # Printed on BOTH paths, and before the verdict: whether the one check that compares the board
    # to the outside world was able to run at all.
    with open(BOARD, encoding="utf-8") as f:
        print(shape_provenance_line(json.load(f)))

    if problems:
        print(f"!! the board FAILS {len(problems)} check(s) [{mode}]\n")
        for p in problems:
            print(f"  - {p}")
        print("\nThis gate is born red on purpose: some surfaces are drifted today and the gate's\n"
              "job is to say so. Fix the surface, never the gate.")
        return 1
    with open(BOARD, encoding="utf-8") as f:
        rows = len(json.load(f)["players"])
    print(f"board OK [{mode}]: {rows} rows, every check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

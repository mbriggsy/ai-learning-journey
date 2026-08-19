#!/usr/bin/env python3
"""The ladder precomputer -- move the deliberation OFF the clock.

    python scripts/precompute_ladder.py                     # seat derived from draft_order
    python scripts/precompute_ladder.py --slot 3            # seat typed (REQUIRED pre-draft)
    python scripts/precompute_ladder.py --cargo temp/draft.json     # go-time, off a fresh curl
    python scripts/precompute_ladder.py --slot 3 --feed tests/fixtures/lab_feed_120.json --at 18
    python scripts/precompute_ladder.py --slot 3 --backtest

THE SEAT. `--slot` was required until 2026-08-18, so it was retyped once per pick window -- ~15
times under a 120s clock, on a number whose most attractive wrong answer is `3` (Briggsy's slot,
his roster_id, and slot_to_roster_id's identity-map 3 are three unrelated 3s). Omit it and it comes
from `draft_order`, and the derivation REFUSES rather than defaulting when that is still null --
which it is until near go time, so this removes the other fourteen typings, not the first.

🚨 A DERIVED SEAT MAKES THE ENGINE'S `against draft_order` CHECK CIRCULAR, and it still prints
green. The engine compares the seat against the very file it was read from and cannot disagree.
This file says so on every derived run and names the only independent oracle (our own `picked_by`,
which cannot arm until one of OUR picks has landed). Insight 005 in a new costume -- worse than a
typo, because it reads as a guard.

WHY THIS EXISTS. A live mock proved the human-in-terminal loop is too slow: the 4.3 clock expired
while the engine was being run in Bash, Sleeper flipped the team to auto-pick and took Tetairoa
McMillan (81.3) while Lamar Jackson (~107) sat there until #40. The fix is not a faster engine. It
is having the answer BEFORE the clock starts, so the on-the-clock act is a LOOKUP.

THE ENGINE IS THE ONLY ORACLE. This file never re-implements "who is available" or "what is best".
It shells out to `draft_engine.py` exactly as `validate_board.check_engine_replay` does and reads
its output. A second implementation of the ranking is precisely how `consensus.py` and `market.py`
drifted apart, and it is not worth the milliseconds.

WHAT THIS FILE USED TO DO, AND WHY IT NO LONGER DOES IT -- read before "restoring" it.
The first version enumerated futures: sample `gap` players out of a pool, run the real engine on
each, and report how often each name tops BEST AVAILABLE and how often each tier empties. It ran
495 engine subprocesses to produce those two tables. Both were then MEASURED against their closed
forms and matched TO THE DIGIT:

    the i-th board-ranked pool member tops BEST AVAILABLE in exactly C(k-i-1, gap-i) of C(k,gap)
        measured 330 / 120 / 36 / 8 / 1   predicted 330 / 120 / 36 / 8 / 1
    a tier of L survivors empties in exactly C(k-L, gap-L) / C(k, gap)
        measured 0.333 (RB T3, 1 left) and 0.091 (WR T4, 2 left)   predicted 0.333 and 0.091

Neither number knows anything about football. Both are arithmetic about the sampler -- functions of
the pool size, the gap, and a count the engine already prints on the same line. That is the exact
"survives 67%" figure this file deleted before it ever shipped, reprinted as BOTH headline blocks.
Widening the pool does not rescue it: the closed form holds for any k. **Only a non-uniform
opponent model would make enumeration informative, and an unvalidated opponent model is a
fabricated number one level deeper.** So the enumeration is gone, along with its sampler -- which
was independently broken anyway: SHA-256 is 32 bytes, so `h[b*4:(b+1)*4]` was empty for every draw
past the 8th and forced pool[0] into 60 of 60 sampled futures.

WHAT SURVIVES IS WHAT ONE ENGINE RUN CAN SAY, plus one concrete future:
  * THE QUEUE -- the engine's own BEST AVAILABLE order. Auto-pick drains a queue top-down, so a
    blown clock takes OUR next-best instead of Sleeper's. Needs no branching: BEST AVAILABLE is
    *defined* as lowest-board-rank-available (`draft_engine.py:447`), so the list simply shortens.
  * THE MARKET PROJECTION -- one future, the `gap` cheapest-ADP players gone. Not a guess about any
    individual opponent, and BACKTESTED rather than asserted (`--backtest`).
  * THE CLIFF CONDITION -- "this tier empties only if all N of these go first", where N is the
    engine's own count. A percentage there would be the sampler arithmetic again.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream degrades, never crashes
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
ENGINE = os.path.join(KIT, "draft_engine.py")
BOARD = os.path.join(KIT, "players_data.json")
ADP_CACHE = os.path.join(KIT, "cache", "ffc_adp.json.gz")
CARGO = os.path.join(ROOT, "newsletter", "data", "inbox")
DEFAULT_OUT = os.path.join(ROOT, "newsletter", "data", "state", "ladder.json")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# ONE owner for "is the mule's cargo fresh enough to trust", two consumers. run_engine.py learned
# the rule (per FILE, not per run) from the watcher; a second copy here is how two instruments
# drift apart while both look right.
from run_engine import freshness                                    # noqa: E402
import watch_draft_state as W                                       # noqa: E402
# ONE traded-picks gate, two consumers -- the same reason `freshness` is imported rather
# than re-derived. run_engine.py hard-refuses a draft whose pick order is not a plain snake;
# this file shells out to the SAME engine and had no gate at all, so the runbook's standalone
# `precompute_ladder.py` call was the ungated path to the identical wrong answer.
from shape import (TRADED_CARGO, ROSTERS_CARGO, UnsupportedShape,   # noqa: E402
                   read_traded_picks)

POS_RANK = re.compile(r"^(QB|RB|WR|TE|K|DEF)\d+$")
NEXT_PICK = re.compile(r"YOUR next pick:\s*#(\d+)\s*[^\d]*?(\d+)\s+picks? away")
VBD_LEAN = re.compile(r"^vbd\s+(\d+)\s+\(board\s+(\d+)\)\s+(.+?)\s+(?:QB|RB|WR|TE|K|DEF)\d+")
CLIFF = re.compile(r"^(QB|RB|WR|TE|K|DEF) T(\d+): (\d+) left")


def slot_for_pick(pick_no, teams):
    """Snake order. `reversal_round: 0` on this league -- third-round reversal is OFF, verified."""
    rnd, idx = divmod(pick_no - 1, teams)
    return idx + 1 if rnd % 2 == 0 else teams - idx


def _section(stdout, header):
    """Lines strictly inside `--- <header> ...` up to the next `---` rule."""
    out, inside = [], False
    for line in stdout.splitlines():
        if line.startswith(f"--- {header}"):
            inside = True
            continue
        if inside and line.startswith("---"):
            break
        if inside:
            out.append(line)
    return out


def parse_best_available(stdout):
    """The BEST AVAILABLE block -> [(board_rank, name), ...] in the engine's own order.

    Anchored on the position-rank token (`WR9`, `RB11`) rather than on column positions, because
    names carry suffixes -- "Kenneth Walker III KC" would give a naive team-is-the-last-token parse
    the string "III". Ten of the board's 174 rows end in a suffix; that is measured, not feared.
    """
    rows = []
    for line in _section(stdout, "BEST AVAILABLE"):
        toks = line.split()
        if len(toks) < 3 or not toks[0].isdigit():
            continue
        pos_at = next((i for i, t in enumerate(toks) if POS_RANK.match(t)), None)
        if pos_at is None or pos_at < 2:
            continue
        rows.append((int(toks[0]), " ".join(toks[1:pos_at])))
    return rows


def parse_vbd_leans(stdout):
    """The VBD LEANS block -> [(vbd_rank, board_rank, name), ...].

    Filtered by the engine to `vbdDelta >= 8`, so the board-rank leader structurally almost never
    tops it. "Board rank disagrees with VBD" measures that filter, not this draft.
    """
    out = []
    for line in _section(stdout, "VBD LEANS"):
        m = VBD_LEAN.match(line.strip())
        if m:
            out.append((int(m.group(1)), int(m.group(2)), m.group(3).strip()))
    return out


def parse_cliffs(stdout):
    """TIER CLIFFS -> {"RB T3": (n_left, [named players]), ...}.

    The COUNT is every available player in that tier (`draft_engine.py:456` uses `len(_rows)`);
    the NAMES are only the first `CLIFF_N` = 5 of them. Keeping both matters: the count is what
    says how exposed the tier is, and the names are the only way to widen the projection pool
    past the 12 rows BEST AVAILABLE prints.
    """
    out = {}
    for line in _section(stdout, "TIER CLIFFS"):
        m = CLIFF.match(line.strip())
        if not m:
            continue
        names = []
        if "—" in line:                          # the engine's em-dash separator
            tail = line.split("—", 1)[1]
            # 🚨 CUT THE ENGINE'S TRAILING FLAG BEFORE SPLITTING ON COMMAS. It appends one of two
            # flags after TWO SPACES (draft_engine.py: "  ⚠ CLIFF" or
            # "  · thin, none in the top {BEST_N} yet") -- and the quiet one CONTAINS A COMMA.
            # Stripping only the CLIFF literal left the other to be split as if it were names:
            # measured at pick 93 of the lab feed, `K T1` reported 3 left and produced FOUR names,
            # the third being "Cameron Dicker  · thin" and the fourth the invented player "none in
            # the top 12 yet". All four corrupted tiers were K and DEF -- the positions that are
            # quiet ALL NIGHT -- and these names flow straight into `candidates`, i.e. into the
            # QUEUE that auto-pick drains on a blown clock, in exactly the endgame rounds where
            # the kicker and defense get taken.
            #
            # Cut on the MARKER, not on either literal, so this survives BEST_N changing and
            # survives a reword of the quiet-tier text. No board name contains "⚠" or "·".
            tail = re.split(r"\s{2,}[⚠·]", tail)[0]
            names = [x.strip() for x in tail.split(",") if x.strip()]
        out[f"{m.group(1)} T{m.group(2)}"] = (int(m.group(3)), names)
    return out


def parse_our_needs(stdout):
    """The unfilled STARTER slots on OUR roster, read off the engine's own ROSTERS / NEEDS block.

    Parsed rather than recomputed on purpose -- `draft_engine.needs()` already owns this, reading
    `STARTERS` (which arrives from the live draft object via FF_STARTERS, so a league that drops
    the kicker is handled) and the FLEX arithmetic. A second implementation here is exactly how
    consensus.py and market.py drifted apart.

    The engine marks our row with `<== YOU`, which is also the only thing that makes this safe: a
    positional guess at which line is ours would be wrong the moment the seat changes.
    Returns [] for "starters full", or e.g. ["Kx1", "DEFx1"].
    """
    for line in _section(stdout, "ROSTERS / NEEDS"):
        if "<== YOU" not in line or "needs:" not in line:
            continue
        tail = line.split("needs:", 1)[1].replace("<== YOU", "").strip()
        if not tail or tail.lower().startswith("starters full"):
            return []
        return [t.strip() for t in tail.split(",") if t.strip()]
    return []


def our_remaining_picks(our_pick, teams, rounds):
    """Every pick number still ours, from `our_pick` to the end of the draft, inclusive."""
    if not our_pick:
        return []
    slot = slot_for_pick(our_pick, teams)
    return [n for n in range(our_pick, teams * rounds + 1) if slot_for_pick(n, teams) == slot]


# The starter slots that CANNOT be filled from the queue, ever, on this board.
MANDATORY_OFF_BOARD = ("K", "DEF")


def mandatory_squeeze(needs, remaining):
    """Is the queue about to starve a slot the roster REQUIRES? Returns (level, message) or None.

    THE ARITHMETIC, measured 2026-08-14 and exact rather than estimated: this board's best K sits
    at rank 158 and its best DEF at 151, while an 8x16 draft is 128 picks -- so **the top 128 board
    ranks are 128 skill players and ZERO K/DEF**, by construction (`rerank.py` sinks both below
    every skill player). BEST AVAILABLE is defined as lowest-board-rank-available, so **the queue
    can never contain a kicker or a defense at any depth.** Verified at picks 88/104/112/118 of the
    committed lab feed: eight names, all skill, every time, while the same output printed `K T2`
    in its own tier-cliff block.

    That is harmless while a human is picking -- the engine prints `needs: Kx1` and he reads it.
    It bites in exactly one scenario, and that scenario is RECORDED AS HAVING HAPPENED: miss one
    clock and Sleeper pins the team to auto-pick FOR THE REST OF THE DRAFT (Mock #2, pick 79 ->
    autopicks at 82/95/98/111/114), and auto-pick drains YOUR QUEUE top-down before falling back
    to Sleeper's board. A stocked queue then spends your last picks on a third quarterback while
    a mandated slot stays empty and scores zero all season.

    ⚠️ THE REMEDY IS THE NULL MODEL, AND THAT IS DELIBERATE. This does NOT re-rank the queue by
    need. Sorting the queue by roster need is one step from sorting it by vorp, which insight 024
    recorded finishing 6 RB / 1 WR / 0 K. The floor control wins here: with an EMPTY queue,
    Sleeper's own board took Dicker (K T1) and the Patriots (DEF T2) on schedule in Mock #2. So the
    advice is draft them yourself, or clear the queue and let the null model do it -- never a
    cleverer queue.
    """
    short = [n for n in needs if n.split("x")[0] in MANDATORY_OFF_BOARD]
    if not short:
        return None
    owed = sum(int(n.split("x")[1]) for n in short if "x" in n)
    slack = len(remaining) - owed
    what = " and ".join(n.split("x")[0] for n in short)
    if slack < 0:
        return ("CRITICAL", f"{what} unfilled with only {len(remaining)} pick(s) left -- you can no "
                            f"longer fill every mandated slot.")
    if slack == 0:
        return ("CRITICAL", f"{what} unfilled and EXACTLY {len(remaining)} pick(s) left. Every "
                            f"remaining pick is spoken for.")
    if slack <= 2:
        return ("WARNING", f"{what} unfilled with {len(remaining)} pick(s) left ({slack} to spare).")
    return None


def parse_provenance(stdout):
    """The engine's NON-FATAL channel -> (seat_unverified, notes, checked).

    THE ENGINE ALREADY REFUSES to advise off a wrong seat when it can PROVE one wrong -- but when
    it can prove nothing it prints a `**` banner instead of exiting, and the first version of this
    file threw that away. `run_engine` uses a temp cwd, so the engine's cargo oracle
    (`os.pardir/newsletter/data/inbox`) does not resolve unless we stage it, which means the banner
    fired on EVERY run and nothing ever said so. A tool that swallows "I could not check the seat"
    prints a complete, confident ladder for another team. Insights 009 and 013 in one place.

    ⚠ THE THREE CHANNELS ARE NOT INTERCHANGEABLE, and collapsing them is a FALSE RED -- which
    insight 009 records as the more dangerous direction, because it teaches the operator to skip
    the gate. Only the `**` banner means "the seat is unconfirmed". An `[unverified]` line is a
    note about some other input (cargo pinned to a different draft, say) and routinely appears on
    a run whose seat the engine DID confirm from our own `picked_by`. The first draft of this
    function raised the seat alarm on any `[unverified]` line and cried wolf on exactly that case.
    """
    banner, notes, checked = [], [], []
    for line in stdout.splitlines():
        s = line.strip()
        if s.startswith("**") and set(s) != {"*"}:
            banner.append(s.lstrip("*").strip())
        elif s.startswith("[unverified]"):
            notes.append(s[len("[unverified]"):].strip())
        elif s.startswith("[checked]"):
            checked.append(s[len("[checked]"):].strip())
    seat_unverified = any("IS UNVERIFIED" in b for b in banner)
    return seat_unverified, banner, notes, checked


def run_engine(picks, slot, teams, rounds, draft_id, work):
    """One real engine invocation against a synthesised picks.json. Returns its stdout."""
    with open(os.path.join(work, "picks.json"), "w", encoding="utf-8") as f:
        json.dump(picks, f, ensure_ascii=False)
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    p = subprocess.run([sys.executable, ENGINE, str(slot), str(teams), str(rounds), str(draft_id)],
                       cwd=work, capture_output=True, text=True, encoding="utf-8",
                       env=env, timeout=120)
    if p.returncode != 0:
        raise SystemExit("the engine REFUSED this state -- never advise off a feed it rejected:\n"
                         + ((p.stdout or "") + (p.stderr or ""))[-1200:])
    return p.stdout


def market_order(names, cache=ADP_CACHE):
    """Order a candidate set by market price. Returns (ordered_names, source_label).

    THE MEASURED VALUE OF DOING THIS, so nobody has to guess at it again. Scored against the
    committed 120-pick lab feed over 18 stops: the ADP ordering names 30 of 84 of the players who
    actually went (36%); ordering the SAME candidates by our own board rank names 26 of 84 (31%).
    The two are equivalent within noise -- do NOT quote ADP as the better instrument.

    THE FLOOR CONTROL SCORES 1 of 84 (1%). ✏️ **Corrected 2026-08-15: this docstring said 23%,
    which was wrong and understated the result badly.** Re-measured by running
    `--backtest` against `tests/fixtures/lab_feed_120.json` at `--slot 3`. The 29/28 figures above
    were also pre-2026-08-14; the board has been re-ranked since, which is why they moved.

    WHAT THE 1% FLOOR ACTUALLY BUYS US, and it is more than a positive control. A 31x separation
    between board order and the deepest-first ordering is direct evidence that the other seats do
    NOT pick uniformly at random -- they follow consensus. That matters because insight 021 killed
    the old enumeration for being a tautology, and the tautology held *specifically under uniform
    sampling*, where survival collapses to C(k-i-1, gap-i)/C(k, gap) with no football in it.
    Opponents are measurably non-uniform, so an availability estimate built on CONSENSUS ORDER is
    not the same object insight 021 deleted. It still has to be validated against a real feed
    before anything quotes it -- but it is not barred in principle.

    `--backtest` reprints all three arms every run so none of this can quietly become folklore.

    An earlier version of this docstring claimed that ordering opponents by our own board "would
    explore the wrong futures entirely." That is false, and it was load-bearing for a whole
    enumeration apparatus that has since been removed.

    UNPRICED PLAYERS ARE NOT PRICED LAST. The previous version mapped a missing ADP row to 9999,
    which silently asserts "the market takes him dead last" about a player the market simply has
    not priced. They go after the priced ones, in board order, and the count is reported.
    """
    if not os.path.exists(cache):
        return list(names), "our board order (no ADP cache on disk)"
    import gzip
    with gzip.open(cache, "rt", encoding="utf-8") as f:
        payload = json.load(f)
    adp = {}
    for row in payload.get("players", []):
        nm = (row.get("name") or "").strip()
        val = row.get("adp")
        if nm and val is not None:
            adp[nm] = float(val)
    priced = [n for n in names if n in adp]
    # POSITIVE CONTROL (insight 008): a join that matches nothing returns "no ADP" and would look
    # identical to "no cache". Refuse to call it a market order unless it actually joined most of
    # the set -- half, not the old max(3, len//4), which passed on 3 of 12 names and would have
    # labelled an essentially alphabetical list "market ADP".
    if len(priced) < max(3, (len(names) + 1) // 2):
        return list(names), (f"our board order (ADP joined only {len(priced)} of {len(names)})")
    unpriced = [n for n in names if n not in adp]
    ordered = sorted(priced, key=lambda n: (adp[n], n)) + unpriced
    src = "market ADP"
    if unpriced:
        src += f" ({len(unpriced)} of {len(names)} unpriced, ordered last by board rank)"
    return ordered, src


def resolve_cargo(given):
    """`--cargo` may be the mule's inbox DIR or a single draft-object FILE. Returns (file, dir).

    🚨 THE SAME FLAG NAME MEANS OPPOSITE THINGS IN THE TWO SCRIPTS, and it has already cost real
    time. `run_engine.py --cargo` takes a FILE (`shape.CARGO` is `.../inbox/sleeper_draft.json`);
    this script's has always taken a DIR (`CARGO` here is `.../inbox`). The runbook's go-time step
    -- curl the draft to `temp/draft.json` and pass it, because the hourly inbox is guaranteed to
    be behind at exactly the moment `draft_order` flips -- therefore worked for one script and
    silently did the wrong thing for the other. A written prescription for this very change was
    untypeable for the same reason: it assumed a `cargo` dict that does not exist here.

    Accepting both makes the go-time technique identical for both scripts, which is the only form
    an operator can be expected to remember under a clock.
    """
    if os.path.isfile(given):
        return given, os.path.dirname(os.path.abspath(given))
    return os.path.join(given, "sleeper_draft.json"), given


def stage_cargo(tmp, cargo_dir=CARGO, draft_file=None):
    """Put the mule's cargo where the engine looks for it, so its SEAT CHECK can actually run.

    `draft_engine.py:207` resolves `os.pardir/newsletter/data/inbox` relative to ITS cwd, and we
    run it in a temp dir. Without this the seat oracle is structurally unavailable and the engine
    can only ever say UNVERIFIED. Staging is best-effort: a clean clone has no cargo, and a missing
    oracle must never turn into a false red (insight 009) -- it turns into a warning we print.

    `draft_file` lets a caller stage a draft object that is not named `sleeper_draft.json` -- the
    go-time `temp/draft.json` case. It is copied UNDER the name the engine opens by literal name,
    because the engine looks the file up by name and would otherwise never see it.
    """
    dest = os.path.join(tmp, "newsletter", "data", "inbox")
    os.makedirs(dest, exist_ok=True)
    staged = []
    if draft_file and os.path.isfile(draft_file) and \
            os.path.basename(draft_file) != "sleeper_draft.json":
        shutil.copy(draft_file, os.path.join(dest, "sleeper_draft.json"))
        staged.append("sleeper_draft.json")
    for name in ("sleeper_draft.json", "sleeper_users.json"):
        if name in staged:
            continue
        src = os.path.join(cargo_dir, name)
        if os.path.exists(src):
            shutil.copy(src, dest)
            staged.append(name)
    return staged


def cargo_draft_id(cargo_dir=CARGO, draft_file=None):
    """This league's draft id as the cargo states it, with no freshness judgement. Identity only.

    Deliberately NOT `reference_draft_id`: that one decides what to ARM the contamination gate
    with and correctly withholds a stale id, returning "". Here the question is a different one --
    *which draft is the real one* -- and for that a day-old cargo is a perfectly good answer,
    because the league's draft id does not change when the file gets old. Reusing the armed id
    would make a stale cargo silently re-enable the very overwrite this exists to prevent.

    `draft_file` is the go-time `--cargo temp/draft.json` form. Without it this joined
    "sleeper_draft.json" onto a path that was already a FILE, found nothing, and returned "" --
    see the refusal in `resolve_out` for what that then unlocked.
    """
    try:
        with open(draft_file or os.path.join(cargo_dir, "sleeper_draft.json"),
                  encoding="utf-8-sig") as f:
            return str((json.load(f) or {}).get("draft_id") or "")
    except (OSError, ValueError):
        return ""


def resolve_out(given, draft_id, cargo_dir=CARGO, default_out=None, draft_file=None):
    """Where the ladder is written. Returns (path, note-or-None).

    🚨 WHY THIS IS NOT JUST `--out or DEFAULT_OUT`. `ladder.json` was ONE fixed path regardless of
    which draft produced it, so every mock, rehearsal and lab run overwrote the live war-room
    ladder with a queue for a draft nobody is in. That is not hypothetical: it happened TWICE in
    one session on 2026-08-17 while testing unrelated changes, leaving a queue headed `Josh Downs,
    Brock Purdy, Travis Kelce` from a dead lab feed -- and the runbook's own re-arm step tells the
    operator to load `ladder.json`'s `queue` into Sleeper, where auto-pick drains it top-down on a
    blown clock. The repo already records this exact shape once (the 2026-08-14 poisoned ladder
    headed by Nico Collins); the gate added then armed the CONTAMINATION check, which reads
    picks.json. Nothing guarded the OUTPUT path.

    An explicit `--out` always wins -- the operator saying where to put it is not a mistake.
    """
    # RESOLVED AT CALL TIME, not bound at def time. `default_out=DEFAULT_OUT` in the signature
    # captured the module global when this file was IMPORTED, so a test could not redirect it --
    # which meant the only way to exercise main()'s wiring was to let it write the REAL war-room
    # ladder. An untestable call site is how the a.cargo/cargo_dir bug below survived a mutation
    # run: M15 (restore `resolve_out(a.out, draft_id, a.cargo)`) passed 96 green tests, because
    # every test called this function directly and none called main(). Insight 013, fourth time.
    default_out = default_out or DEFAULT_OUT
    if given:
        return given, None
    real = cargo_draft_id(cargo_dir, draft_file)
    if not real:
        # 🚨 UNARMED MUST NOT MEAN "WRITE THE LIVE QUEUE". This used to fall through to
        # `default_out`, so the ONE case where we cannot tell whose draft this is was the case
        # allowed to overwrite the war-room ladder -- the guards that refuse to ARM were exactly
        # the runs let through. Reachable for real since 2026-08-18: `--cargo temp/draft.json`
        # (the form the runbook now teaches at go time) made `cargo_draft_id` join
        # "sleeper_draft.json" onto a FILE, find nothing, and return "". Reproduced: the dir form
        # diverted correctly while the file form wrote the live path with no note at all.
        scoped = os.path.join(os.path.dirname(default_out), "ladder.unarmed.json")
        return scoped, ("[held back] this cargo cannot say which draft is this league's, so "
                        "nothing here can prove this ladder belongs in the live queue -- writing "
                        "to ladder.unarmed.json instead. Pass --out to override.")
    if draft_id and str(draft_id) != real:
        scoped = os.path.join(os.path.dirname(default_out), f"ladder.{draft_id}.json")
        return scoped, (f"[held back] this ladder was computed for draft {draft_id}, but this "
                        f"league's draft is {real} -- writing to {os.path.basename(scoped)} so it "
                        f"CANNOT overwrite the live queue. Pass --out to override.")
    return default_out, None


def reference_draft_id(given, cargo_dir=CARGO):
    """The id the engine's contamination gate is armed with, and how we know it. NEVER THE FEED.

    This used to be one expression -- `a.draft_id or feed[0]["draft_id"]` -- which sourced the
    reference from the very file the gate exists to check. `draft_engine.py:173-180` then compared
    a feed against itself, so the refusal was structurally unreachable and a spent mock's
    picks.json advised the run silently. It was not a dormant branch: the runbook teaches the
    flagless form (`--slot <slot>`) at BOTH :167 and :207, so the unreachable path was the only
    path anybody ran. Measured 2026-08-14 -- a 38-pick feed from dead mock 1392338436949561355
    produced a complete round-6 ladder, exit 0, and persisted a queue headed by Nico Collins while
    Chase, Gibbs, Nacua and Bijan were all still on the real board.

    `run_engine.py:202-214` already sourced this correctly. Two tools disagreeing about what
    "armed" means is exactly how consensus.py and market.py drifted apart, so this mirrors it --
    including the stale-cargo hold-back, and reusing run_engine's `freshness()` rather than
    inventing a second staleness rule.

    Returns (draft_id, line). An empty id means NOT ARMED and `line` says so out loud: a missing
    cargo must never become a false red (insight 009) and a clean clone has no cargo at all.
    Unarmed-and-loud is still strictly better than the old behaviour, which was unarmed and silent
    while printing a reference id that looked like proof.
    """
    if given:
        return str(given), f"[given] draft_id={given} -- contamination gate armed"

    path = os.path.join(cargo_dir, "sleeper_draft.json")
    try:
        with open(path, encoding="utf-8") as f:
            cargo_id = (json.load(f) or {}).get("draft_id")
    except (OSError, ValueError):
        cargo_id = None
    if not cargo_id:
        return "", ("[unknown] no draft_id in cargo -- the contamination gate is NOT armed, so a "
                    "spent mock's picks.json would pre-arm your queue silently. Pass --draft-id.")

    stale_reasons, age_note = freshness(path)
    if stale_reasons:
        return "", ("[held back] the cargo's draft_id is NOT being used: " +
                    "; ".join(stale_reasons) + ". Arming from a stale id would refuse a CORRECT "
                    "run if the draft was re-created. Pass --draft-id to arm it yourself.")
    return str(cargo_id), (f"[draft] draft_id={cargo_id} from the mule's cargo -- contamination "
                           f"gate armed ({age_note})")


def _synth(feed, gone, id_of, slot, teams, draft_id):
    """Append one pick per name in `gone`, contiguously. Refuses on a name it cannot resolve.

    THE `continue` THIS REPLACES WAS A TRAP. Skipping an unresolvable name while the pick counter
    kept advancing left an INTERIOR GAP in pick_no, which the engine's integrity gate correctly
    refuses -- while telling the operator to "re-fetch /picks and merge on pick_no", blaming their
    feed for our own parser's miss. All 174 board rows carry an id today, so this is unreachable
    now; it becomes reachable the moment the engine's output format moves under the parser.
    """
    last_no = feed[-1]["pick_no"] if feed else 0
    synth = list(feed)
    for i, nm in enumerate(gone, start=1):
        pid = id_of.get(nm)
        if not pid:
            raise SystemExit(f"cannot resolve {nm!r} to a sleeperId -- refusing to synthesise a "
                             "future with a hole in it. The engine's output format has probably "
                             "moved under parse_best_available/parse_cliffs.")
        no = last_no + i
        synth.append({"pick_no": no, "player_id": pid,
                      "draft_slot": slot_for_pick(no, teams),
                      "round": (no - 1) // teams + 1,
                      "draft_id": str(draft_id), "picked_by": "", "is_keeper": None,
                      "roster_id": None, "metadata": {}})
    return synth


def precompute(feed, slot, teams, rounds, draft_id, pool_size=48, at=None, cargo_dir=CARGO,
               draft_file=None):
    feed = sorted((p for p in feed if p.get("pick_no")), key=lambda p: p["pick_no"])
    if at is not None:
        feed = feed[:at]
    with open(BOARD, encoding="utf-8") as f:
        board = json.load(f)
    id_of = {p["name"]: str(p.get("sleeperId") or "") for p in board["players"]}

    with tempfile.TemporaryDirectory() as t:
        work = os.path.join(t, "draft-kit")
        os.makedirs(work)
        # The same two files check_engine_replay copies, and deliberately NOT sleeper_ids.json: the
        # engine reads its join key off the board's own rows now, and copying the ledger in would
        # let a regression back to "the ledger must be in cwd" pass here and fail on draft morning.
        for name in ("players_data.json", "normalize.py"):
            shutil.copy(os.path.join(KIT, name), work)
        staged = stage_cargo(t, cargo_dir, draft_file)

        base_out = run_engine(feed, slot, teams, rounds, draft_id, work)
        base = parse_best_available(base_out)
        if len(base) < 3:
            raise SystemExit("could not read the engine's BEST AVAILABLE block -- refusing to "
                             "emit a ladder from a parse that found "
                             f"{len(base)} row(s). The engine's output format moved.")

        m = NEXT_PICK.search(base_out)
        if not m:
            raise SystemExit("the engine did not say when our next pick is -- cannot project")
        our_pick, gap = int(m.group(1)), int(m.group(2))
        seat_unverified, banner, notes, checked = parse_provenance(base_out)
        if not staged:
            notes.append("no mule cargo was staged, so the engine's draft_order seat oracle could "
                         "not run at all")

        # A CROSS-CHECK, AND EXACTLY WHAT IT IS WORTH. The engine derived our_pick from --slot with
        # its snake; we re-derive the slot from our_pick with ours. Agreement proves the two snakes
        # match (it would catch a third-round-reversal drift or a wrong --teams). It does NOT
        # verify the SEAT -- both sides were handed the same --slot. Saying otherwise would be the
        # tie-breaker-agrees-with-the-board mistake (insight 005) in a new costume.
        if slot_for_pick(our_pick, teams) != slot:
            raise SystemExit(
                f"our snake says pick #{our_pick} belongs to slot "
                f"{slot_for_pick(our_pick, teams)}, the engine says it is ours (slot {slot}). "
                "One of the two is wrong about this draft's shape -- do not advise off either.")

        cliffs = parse_cliffs(base_out)
        # WIDEN THE CANDIDATE SET PAST THE 12 ROWS BEST AVAILABLE PRINTS. `BEST_N = 12`
        # (draft_engine.py:446) caps that block, and measured against the real 120-pick feed, 37%
        # of the picks that actually happen land OUTSIDE those 12 -- 35% on our board but deeper,
        # 2% off it entirely. Folding in the tier-cliff names takes the candidate set to ~31-42
        # WITHOUT re-deriving availability here: every name still comes from the engine's own
        # output. It also lifts the projection's ceiling, which was silently capped at 12 removals
        # no matter how far away our pick was -- and an 8-team snake turns a slot-1 or slot-8 seat
        # around with a gap of 14.
        candidates = list(dict.fromkeys([n for _, n in base]
                                        + [n for _, names in cliffs.values() for n in names]))
        pool, pool_src = market_order(candidates)
        pool = pool[:pool_size]

        proj_gone = pool[:min(gap, len(pool))]
        short_by = gap - len(proj_gone)
        pout = run_engine(_synth(feed, proj_gone, id_of, slot, teams, draft_id),
                          slot, teams, rounds, draft_id, work)
        prows = parse_best_available(pout)
        pleans = parse_vbd_leans(pout)
        watch = [nm for _, _, nm in parse_vbd_leans(base_out)][:6]
        survivors = {n for _, n in prows} | {n for _, _, n in pleans}

    queue = [n for _, n in base]
    our_needs = parse_our_needs(base_out)
    remaining = our_remaining_picks(our_pick, teams, rounds)
    squeeze = mandatory_squeeze(our_needs, remaining)
    return {
        "our_needs": our_needs,
        "our_remaining_picks": remaining,
        "mandatory_squeeze": list(squeeze) if squeeze else None,
        # Stamped so the artifact can be audited after the fact. The contaminated ladder.json found
        # on 2026-08-14 carried a complete, plausible round-6 queue and NO draft_id, so nothing on
        # disk could say which draft it belonged to. "" means the gate was not armed for this run.
        "draft_id": str(draft_id or ""),
        "our_pick": our_pick,
        "picks_away": gap,
        "seat_unverified": seat_unverified,
        "seat_banner": banner,
        "engine_notes": notes,
        "seat_checked": checked,
        "pool_source": pool_src,
        "pool_size": len(pool),
        "baseline": [{"rank": r, "name": n} for r, n in base],
        "queue": queue,
        "queue_expected_gone": [n for n in queue if n in set(proj_gone)],
        "cliffs_now": {k: v[0] for k, v in cliffs.items()},
        "cliff_names": {k: v[1] for k, v in cliffs.items()},
        "watching": watch,
        "projection": {
            "assumes_gone": list(proj_gone),
            "short_by": short_by,
            "best_available": [n for _, n in prows][:6],
            "vbd_leans": [n for _, _, n in pleans][:6],
            "cliffs": {k: v[0] for k, v in parse_cliffs(pout).items()},
            "watch_still_there": [nm for nm in watch if nm in survivors],
            "watch_lost": [nm for nm in watch if nm not in survivors],
        },
    }


def backtest(feed, slot, teams, rounds, draft_id, stops, pool_size=48, cargo_dir=CARGO,
             draft_file=None):
    """Score the market projection against a feed whose future we already know -- WITH A NULL MODEL.

    The projection claims the next `gap` picks take the cheapest ADP still available. That is an
    assumption about the other seven seats, and an assumption is worth exactly what it measures.

    A SCORE WITH NO NULL MODEL IS A NUMBER WITH NO MEANING (insight 018, one level out). "35%"
    reads as decent; "35% against a 33% null" reads as what it is. So every run scores three arms
    over the identical stops:
      * MARKET   -- the shipped ordering, cheapest ADP first
      * NULL     -- the same candidates in our own board order, which needs no ADP at all
      * FLOOR    -- the deepest candidates, to prove the metric can register a difference before
                    any of its readings are trusted (the positive control insight 008 demands)
    """
    feed = sorted((p for p in feed if p.get("pick_no")), key=lambda p: p["pick_no"])
    by_no = {p["pick_no"]: p for p in feed}
    with open(BOARD, encoding="utf-8") as f:
        board = json.load(f)
    name_of = {str(p.get("sleeperId") or ""): p["name"] for p in board["players"]}
    rows = []
    for at in stops:
        if at + 1 > len(feed):
            continue
        res = precompute(feed, slot, teams, rounds, draft_id, pool_size=pool_size, at=at,
                         cargo_dir=cargo_dir)
        gap = res["picks_away"]
        market = list(res["projection"]["assumes_gone"])
        if not gap or not market:
            continue
        board_order = [b["name"] for b in res["baseline"]]
        allcands = board_order + [n for names in res["cliff_names"].values() for n in names]
        allcands = list(dict.fromkeys(allcands))
        arms = {
            "market": set(market),
            "null(board order)": set(board_order[:gap]),
            "floor(deepest)": set(allcands[-gap:]),
        }
        actual = set()
        for k in range(at + 1, at + 1 + gap):
            pk = by_no.get(k)
            if pk:
                nm = name_of.get(str(pk.get("player_id")))
                if nm:
                    actual.add(nm)
        rows.append({"at": at, "gap": gap, "n": len(market), "actual": sorted(actual),
                     "hits": {k: len(v & actual) for k, v in arms.items()},
                     "sizes": {k: len(v) for k, v in arms.items()},
                     "predicted": sorted(market)})
    return rows


def main(argv=None):
    ap = argparse.ArgumentParser(description="Pre-compute the answer for our next pick, offline.")
    ap.add_argument("--feed", default=os.path.join(KIT, "picks.json"))
    ap.add_argument("--slot", type=int, default=None,
                    help="OUR draft slot. Read it from draft_order[\"1390750540631150592\"] and "
                         "from nothing else -- roster_id and slot_to_roster_id are NOT the seat. "
                         "OMIT IT and it is derived from the cargo's draft_order, which REFUSES "
                         "rather than defaulting when draft_order is still null.")
    ap.add_argument("--teams", type=int, default=8)
    ap.add_argument("--rounds", type=int, default=16)
    ap.add_argument("--draft-id", default=None)
    ap.add_argument("--pool", type=int, default=48,
                    help="cap on the projection's candidate set (BEST AVAILABLE + tier-cliff names)")
    ap.add_argument("--at", type=int, default=None, help="truncate the feed to N picks (rehearsal)")
    # Injectable so a rehearsal -- and the suite -- can point at a fixture instead of the hourly
    # haul. A test that reads the live inbox is non-deterministic today and would start failing on
    # draft morning the moment `draft_order` populates (review residue 1).
    ap.add_argument("--traded-cargo", dest="traded_cargo", default=TRADED_CARGO,
                    help="path to the draft's traded-picks list (same flag name as run_engine.py)")
    ap.add_argument("--rosters-cargo", dest="rosters_cargo", default=ROSTERS_CARGO,
                    help="path to the league's rosters (same flag name as run_engine.py)")
    ap.add_argument("--cargo", default=CARGO,
                    help="mule cargo DIR, or a single draft-object FILE (the go-time "
                         "`curl > temp/draft.json` case -- same form run_engine.py takes)")
    ap.add_argument("--out", default=None,
                    help="where to write the ladder. Defaults to newsletter/data/state/ladder.json "
                         "for THIS league's draft, and to a draft-scoped filename for any other -- "
                         "see cargo_draft_id()")
    ap.add_argument("--backtest", action="store_true",
                    help="score the market projection, its null model and a floor control")
    a = ap.parse_args(argv)

    # NO PICKS YET IS THE NORMAL PRE-DRAFT STATE, NOT AN ERROR. runbook:207 fires this before the
    # draft starts to pre-arm the queue, and at that moment picks.json does not exist -- merge_picks
    # has had nothing to write. It used to raise a bare FileNotFoundError traceback there, which
    # reads as a broken tool at the one moment the operator has least patience for one.
    # The DEFAULT feed missing means "the draft has not started". An EXPLICIT --feed missing is a
    # typo and must still be a hard error -- shape.py's rule: "cannot tell" and "will not compute"
    # are different answers and must not share a branch.
    if not os.path.exists(a.feed):
        if os.path.abspath(a.feed) != os.path.abspath(os.path.join(KIT, "picks.json")):
            print(f"!! REFUSED: no such feed: {a.feed}")
            return 1
        print(f"[pre-draft] no {os.path.relpath(a.feed, ROOT)} yet -- reading this as a draft that "
              "has not started. Every pick is still available.")
        feed = []
    else:
        with open(a.feed, encoding="utf-8") as f:
            feed = json.load(f)
    draft_file, cargo_dir = resolve_cargo(a.cargo)
    draft_id, gate_line = reference_draft_id(a.draft_id, cargo_dir)
    print(gate_line)

    # WHERE THE SEAT CAME FROM, captured BEFORE the derivation can overwrite it. Every message
    # below has to be able to tell a typed seat from a derived one, and "a.slot is not None" stops
    # being that question the instant we assign to it.
    slot_given = a.slot is not None
    if not slot_given:
        raw, problem = W.load_json(draft_file, encoding="utf-8-sig")
        # utf-8-sig, matching run_engine and NOT the two readers a few lines up in this file: a
        # hand-saved or curl'd draft object can carry a BOM, and `utf-8` dies on it.
        order = (raw or {}).get("draft_order") if isinstance(raw, dict) else None
        derived = W.my_slot(order)
        if derived is None:
            raise SystemExit(
                "NO SEAT. It was not given and this cargo cannot supply one: "
                + (problem or f'draft_order holds no entry for user_id {W.BRIGGSY_USER_ID}')
                + ".\ndraft_order stays null until near go time -- that is NORMAL, not a fault.\n"
                  "Pass --slot <n>, read from draft_order and NOTHING else: roster_id and "
                  "slot_to_roster_id are not the seat, and slot_to_roster_id is the identity map "
                  "{1:1 ... 8:8} on this draft, so it returns whatever you give it.")
        a.slot = int(derived)
        _, age_note = freshness(draft_file)
        # THE AGE IS NOT DECORATION. draft_order flips null -> populated AT GO TIME, which is
        # precisely when the hourly inbox is guaranteed to be behind. A seat derived from a
        # 60-minute-old file trips no staleness warning (the threshold is 150 min) and prints with
        # exactly the confidence of a fresh one. Say how old it was and let the operator judge.
        print(f'[draft] slot={a.slot} from draft_order["{W.BRIGGSY_USER_ID}"] -- {age_note}')

    # --- traded picks -----------------------------------------------------------------------
    # AFTER the draft id and the seat, deliberately: when this refuses, the operator needs the
    # derivation above it to act on the refusal (run_engine.py:233-236 makes the same call for the
    # same reason). A traded pick voids "your next pick is #N" -- which is the ladder's entire
    # premise, since the projection and the queue are both built from the gap to that pick.
    try:
        _traded, traded_lines = read_traded_picks(a.traded_cargo, a.rosters_cargo,
                                                  user_id=W.BRIGGSY_USER_ID)
    except UnsupportedShape as e:
        print("!" * 66)
        print("!! THIS DRAFT IS A SHAPE THE LADDER DOES NOT MODEL")
        print(f"!!   {e}")
        print("!! The projection and the QUEUE are both built from the gap to YOUR next pick, and")
        print("!! a traded pick means that gap is not what a plain snake says it is. A ladder")
        print("!! computed anyway would be a complete, confident queue for the wrong pick order --")
        print("!! and Step 3.5 loads it into Sleeper, where auto-pick drains it top-down.")
        print("!! Refusing is the only correct behaviour here.")
        print("!" * 66)
        return 2
    for ln in traded_lines:
        print(ln)

    if a.backtest:
        stops = [n for n in range(6, min(len(feed), 100), 4)]
        rows = backtest(feed, a.slot, a.teams, a.rounds, draft_id, stops, pool_size=a.pool,
                        cargo_dir=cargo_dir, draft_file=draft_file)
        if not rows:
            print(f"BACKTEST scored NOTHING: {len(feed)}-pick feed yielded no stop with a gap and "
                  "a projection. Nothing here is a measurement -- do not read a score into it.")
            return 1
        arms = list(rows[0]["hits"])
        tot = {k: sum(r["sizes"][k] for r in rows) for k in arms}
        hit = {k: sum(r["hits"][k] for r in rows) for k in arms}
        print(f"BACKTEST of the projection over {len(rows)} stops in this feed")
        print()
        for k in arms:
            share = hit[k] / tot[k] if tot[k] else 0.0
            print(f"  {k:<18} {hit[k]:>3}/{tot[k]:<3} = {share:>4.0%}  {'#' * int(40 * share)}")
        print()
        print("  MARKET is what the projection ships. NULL needs no ADP at all. FLOOR is the")
        print("  positive control: if it scored the same, the metric could not tell orderings")
        print("  apart and none of these readings would mean anything.")
        print("  A market score close to null means the ADP proxy is buying little in THIS room --")
        print("  which is itself the edge this board is built on, and also means the projection is")
        print("  a weak planning tool here. Read `assumes_gone` as one scenario, never a forecast.")
        print()
        for r in rows[:12]:
            print(f"  at {r['at']:>3} (gap {r['gap']}): market {r['hits']['market']}/{r['n']}  "
                  f"predicted {', '.join(r['predicted'])[:52]}")
        return 0

    res = precompute(feed, a.slot, a.teams, a.rounds, draft_id, pool_size=a.pool, at=a.at,
                     cargo_dir=cargo_dir, draft_file=draft_file)

    if res["seat_unverified"]:
        # The engine's own words, not a paraphrase -- it owns this warning and a second wording
        # is a second thing to keep in step.
        print("!" * 66)
        for b in res["seat_banner"]:
            print(f"!! {b}")
        print(f"!! (the precomputer used slot {a.slot}, "
              f"{'passed on the command line' if slot_given else 'DERIVED from draft_order'})")
        print("!" * 66)
    for n in res["engine_notes"]:
        print(f"[unverified] {n}")
    if res["seat_checked"]:
        print(f"[checked] {' · '.join(res['seat_checked'])}")
        # 🚨 A DERIVED SEAT MAKES THE draft_order CHECK SELF-CONFIRMING, AND IT STILL PRINTS GREEN.
        # The engine has two oracles (draft_engine.py: "against draft_order" and "against our own
        # picks"). When the operator TYPED the seat, the first is a real check -- two independent
        # readings having to agree. When we derived the seat FROM draft_order, the engine compares
        # that value against the very file it came from and can only ever agree. It is insight
        # 005's tie-breaker-agrees-with-the-board defect in a new costume, and it is worse than a
        # typo because it reads as a guard.
        #
        # We do NOT rewrite the engine's words (it owns them; a second wording is a second thing
        # to keep in step). We say which of its checks is worth something.
        # SPLIT THE LINE INTO ITS CLAIMS FIRST. `parse_provenance` keeps the whole `[checked] ...`
        # line as ONE string, and the engine joins several claims into it with " · ". Filtering
        # whole lines therefore said "NOTHING has independently confirmed the seat" on a run where
        # `my_slot=3 against our own picks` was sitting in the same line -- a false red, and
        # insight 009's point is that a false red is the direction that teaches you to ignore the
        # warning entirely. Caught by running it, not by the test that asserted only "CIRCULAR".
        claims = [c.strip() for entry in res["seat_checked"] for c in entry.split("·") if c.strip()]
        circular = [c for c in claims if "draft_order" in c]
        if circular and not slot_given:
            # ONLY SEAT CLAIMS COUNT AS CONFIRMING THE SEAT. The engine also reports things like
            # "all 174 board rows carry a frozen sleeperId" on this same line; treating that as
            # independent confirmation would be the opposite error, and the dangerous one.
            independent = [c for c in claims if "draft_order" not in c and "my_slot" in c]
            print("[!] THAT draft_order CHECK IS CIRCULAR ON THIS RUN -- the seat was DERIVED from "
                  "draft_order, so the engine compared it against its own source and could not "
                  "have disagreed.")
            if independent:
                print(f"[!] The independent confirmation is: {' · '.join(independent)}.")
            else:
                print("[!] NOTHING here has independently confirmed the seat. The only oracle that "
                      "can is our own picked_by in picks.json, and it cannot arm until one of OUR "
                      "picks has landed -- so from pick #1 until our first, this line proves "
                      "nothing. Pass --slot to make the draft_order check mean something.")

    print(f"our next pick: #{res['our_pick']} ({res['picks_away']} away)")
    print(f"candidates   : {res['pool_size']} by {res['pool_source']}")

    pj = res["projection"]
    print()
    if not res["picks_away"]:
        # gap 0 means the clock is OURS right now. There is no future to project, and printing an
        # empty "assumes these 0 go first" is noise at the one moment the operator has no time to
        # read past it. Runbook Step 3's hard rule: act on the ladder, do not start a cycle.
        print("  >> YOU ARE ON THE CLOCK NOW. No projection applies — take the top of the QUEUE")
        print("     below. Do NOT start a fetch/merge/engine cycle on your own clock.")
    else:
        print("  THE MARKET PROJECTION — ONE scenario, not a forecast. --backtest scores it.")
        if pj["short_by"]:
            print(f"  ⚠ models only {len(pj['assumes_gone'])} of the {res['picks_away']} picks "
                  f"before your turn — {pj['short_by']} beyond the candidate set.")
        print(f"  Assumes these {len(pj['assumes_gone'])} go first: "
              f"{', '.join(pj['assumes_gone'])}")
        print(f"    then BEST AVAILABLE opens: {', '.join(pj['best_available'][:4])}")
        if pj["vbd_leans"]:
            print(f"    and the value plays still up: {', '.join(pj['vbd_leans'][:4])}")
        if pj["watch_lost"]:
            print(f"    LOST to the market before your turn: {', '.join(pj['watch_lost'])}")

    if res["cliffs_now"]:
        print()
        print("  TIER CLIFFS — the CONDITION, not a probability. A rate here would be arithmetic")
        print("  about the sampler, not about football (see this file's header).")
        # A tier that VANISHES from the projection's cliff list has emptied -- the engine builds
        # that list from `avail`, so an exhausted tier stops being printed. But an absent tier and
        # an unparsed one look identical, and reading "EMPTY" onto all six at once is the kind of
        # confident wrong answer this file keeps finding. So the flag is only trusted when the
        # projection's own cliff parse returned something (insight 008: prove the zero is a
        # reading before you report it).
        pcliffs = pj.get("cliffs") or {}
        for tier, left in sorted(res["cliffs_now"].items(), key=lambda kv: kv[1])[:6]:
            gone = bool(pcliffs) and pcliffs.get(tier, 0) == 0
            flag = "  <- EMPTY under the market projection" if gone else ""
            print(f"   {tier:<8} {left} left — empties only if all {left} go before your turn{flag}")

    # ABOVE the queue deliberately: this changes what you DO with the list underneath it, and a
    # warning printed after the thing it qualifies is insight 016's exact defect.
    if res.get("mandatory_squeeze"):
        level, msg = res["mandatory_squeeze"]
        print()
        print("!" * 70)
        print(f"!! {level}: THE QUEUE CANNOT FILL A MANDATED SLOT.")
        print(f"!! {msg}")
        print("!! This board's best K is rank 158 and best DEF 151; an 8x16 draft is 128 picks, so")
        print("!! the queue below contains NO kicker and NO defense and structurally never can.")
        print("!! Miss one clock and Sleeper auto-picks the REST of the draft, draining this queue")
        print("!! top-down over the empty slot -- which then scores zero every week.")
        print("!! DO ONE OF: draft the missing slot(s) yourself now, or CLEAR THE QUEUE and let")
        print("!! Sleeper's own need-aware board fill them (it took Dicker + the Patriots on")
        print("!! schedule in Mock #2). Do NOT re-sort the queue by need -- insight 024.")
        print("!" * 70)

    print()
    print("  QUEUE THIS ORDER (auto-pick drains it top-down, so a blown clock takes OUR man).")
    print("  A name the projection expects gone is still worth queueing — auto-pick skips the")
    print("  dead and takes your top SURVIVOR — so they are marked, not reordered.")
    expect_gone = set(res["queue_expected_gone"])
    for i, n in enumerate(res["queue"][:8], 1):
        mark = "  [projection expects him gone]" if n in expect_gone else ""
        print(f"   {i}. {n}{mark}")

    out_path, out_note = resolve_out(a.out, draft_id, cargo_dir, draft_file=draft_file)
    out_dir = os.path.dirname(os.path.abspath(out_path))
    os.makedirs(out_dir, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
    if out_note:
        print(f"\n{out_note}")
    print(f"\nwrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

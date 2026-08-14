#!/usr/bin/env python3
"""The ladder precomputer -- move the deliberation OFF the clock.

    python scripts/precompute_ladder.py --slot 3
    python scripts/precompute_ladder.py --slot 3 --feed tests/fixtures/lab_feed_120.json --at 18
    python scripts/precompute_ladder.py --slot 3 --backtest

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
            tail = tail.replace("⚠ CLIFF", "").strip()
            names = [x.strip() for x in tail.split(",") if x.strip()]
        out[f"{m.group(1)} T{m.group(2)}"] = (int(m.group(3)), names)
    return out


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
    committed 120-pick lab feed over 18 stops, the ADP ordering names 29 of 84 of the players who
    actually went; ordering the SAME candidates by our own board rank names 28 of 84. One player
    in 84. A deliberately poor ordering of the same candidates scores 23%, so the metric does
    discriminate -- it simply finds these two orderings equivalent. `--backtest` reprints both
    arms every run so this can never quietly become folklore again.

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


def stage_cargo(tmp, cargo_dir=CARGO):
    """Put the mule's cargo where the engine looks for it, so its SEAT CHECK can actually run.

    `draft_engine.py:207` resolves `os.pardir/newsletter/data/inbox` relative to ITS cwd, and we
    run it in a temp dir. Without this the seat oracle is structurally unavailable and the engine
    can only ever say UNVERIFIED. Staging is best-effort: a clean clone has no cargo, and a missing
    oracle must never turn into a false red (insight 009) -- it turns into a warning we print.
    """
    dest = os.path.join(tmp, "newsletter", "data", "inbox")
    os.makedirs(dest, exist_ok=True)
    staged = []
    for name in ("sleeper_draft.json", "sleeper_users.json"):
        src = os.path.join(cargo_dir, name)
        if os.path.exists(src):
            shutil.copy(src, dest)
            staged.append(name)
    return staged


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


def precompute(feed, slot, teams, rounds, draft_id, pool_size=48, at=None, cargo_dir=CARGO):
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
        staged = stage_cargo(t, cargo_dir)

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
    return {
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


def backtest(feed, slot, teams, rounds, draft_id, stops, pool_size=48, cargo_dir=CARGO):
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
    ap.add_argument("--slot", type=int, required=True,
                    help="OUR draft slot. Read it from draft_order[\"1390750540631150592\"] and "
                         "from nothing else -- roster_id and slot_to_roster_id are NOT the seat.")
    ap.add_argument("--teams", type=int, default=8)
    ap.add_argument("--rounds", type=int, default=16)
    ap.add_argument("--draft-id", default=None)
    ap.add_argument("--pool", type=int, default=48,
                    help="cap on the projection's candidate set (BEST AVAILABLE + tier-cliff names)")
    ap.add_argument("--at", type=int, default=None, help="truncate the feed to N picks (rehearsal)")
    # Injectable so a rehearsal -- and the suite -- can point at a fixture instead of the hourly
    # haul. A test that reads the live inbox is non-deterministic today and would start failing on
    # draft morning the moment `draft_order` populates (review residue 1).
    ap.add_argument("--cargo", default=CARGO, help="mule cargo dir to stage for the seat oracle")
    ap.add_argument("--out", default=DEFAULT_OUT)
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
    draft_id, gate_line = reference_draft_id(a.draft_id, a.cargo)
    print(gate_line)

    if a.backtest:
        stops = [n for n in range(6, min(len(feed), 100), 4)]
        rows = backtest(feed, a.slot, a.teams, a.rounds, draft_id, stops, pool_size=a.pool,
                        cargo_dir=a.cargo)
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
                     cargo_dir=a.cargo)

    if res["seat_unverified"]:
        # The engine's own words, not a paraphrase -- it owns this warning and a second wording
        # is a second thing to keep in step.
        print("!" * 66)
        for b in res["seat_banner"]:
            print(f"!! {b}")
        print(f"!! (you passed --slot {a.slot} to the precomputer)")
        print("!" * 66)
    for n in res["engine_notes"]:
        print(f"[unverified] {n}")
    if res["seat_checked"]:
        print(f"[checked] {' · '.join(res['seat_checked'])}")

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

    print()
    print("  QUEUE THIS ORDER (auto-pick drains it top-down, so a blown clock takes OUR man).")
    print("  A name the projection expects gone is still worth queueing — auto-pick skips the")
    print("  dead and takes your top SURVIVOR — so they are marked, not reordered.")
    expect_gone = set(res["queue_expected_gone"])
    for i, n in enumerate(res["queue"][:8], 1):
        mark = "  [projection expects him gone]" if n in expect_gone else ""
        print(f"   {i}. {n}{mark}")

    out_dir = os.path.dirname(os.path.abspath(a.out))
    os.makedirs(out_dir, exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
    print(f"\nwrote {a.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

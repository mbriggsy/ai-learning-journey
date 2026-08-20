#!/usr/bin/env python3
"""The torture chamber -- synthetic draft rooms against the REAL queue policy.

    python scripts/chamber.py control-030             # D4: reproduce insight 030 exactly
    python scripts/chamber.py control-closed-form     # D4: deterministic room vs hand-computation
    python scripts/chamber.py control-mutants         # D4: every planted mutant must be CAUGHT
    python scripts/chamber.py equivalence --rooms 20  # G1: fast path == real path, sampled states
    python scripts/chamber.py battery --rooms 200     # Phase 2: the scenario battery (gated)

WHAT THIS IS (docs/torture-chamber-plan.md, ratified 2026-08-20). The policy under test is
queue-top drafted unattended -- the blown-clock actor and the floor of the advisory. Rooms are a
BEHAVIOR ENSEMBLE spanning plausible room-space, never a model of a named manager (insight 022:
nothing predicts). Findings are STRUCTURAL (a mandated slot stranded, a state misclassified),
never win-rates against the ensemble -- scoring the policy by the objective it greedily maximizes
against dumb rooms is insight-005 tautology bait (plan, D2).

THE CATALOG IS THE ORACLE SET. Every checker here implements an entry of
docs/torture-chamber-invariants.md (fleet-verified v2) and cites it by id. The catalog outranks
this file: if they disagree, this file is wrong.

TWO POLICY PATHS, ONE LICENSE (catalog G1). The REAL path runs draft-kit/draft_engine.py per
our-pick and parses its LINEUP DELTAS block with precompute_ladder's own shipping parsers --
maximal reuse, zero re-implementation. The FAST path is the replay_mock formulation on the shared
lineup_value brain. The fast path may only be used at scale after `equivalence` has proven them
identical on sampled states of the actual rooms being run -- and every battery re-samples
(U3 discipline: two runtimes proven equal, every run, hard-fail on divergence).

SANDBOX ONLY (plan D7). This file writes nothing outside the temp dirs it creates and the
--report path it is given. It never touches ladder.json, picks.json, or the cargo. It reuses
precompute_ladder.run_engine, which already isolates the engine in a TemporaryDirectory.

Seeded randomness only: every room derives from (seed, room_index) so any room replays exactly.
"""
import argparse
import copy
import gzip
import json
import os
import random
import shutil
import sys
import tempfile
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, KIT)

import lineup_value as LV                                            # noqa: E402
from precompute_ladder import (run_engine, parse_lineup_deltas,       # noqa: E402
                               slot_for_pick)
import replay_mock                                                    # noqa: E402

ADP_CACHE = os.path.join(KIT, "cache", "ffc_adp.json.gz")
BRIGGSY = "1390750540631150592"     # picked_by stamp -- catalog A7: OUR slot's picks only
FLEX_OK = ("RB", "WR", "TE")

# ---------------------------------------------------------------------------------------------
# The board, loaded once. Rooms draft off THIS 174-row universe (catalog D2 scope note: real
# Sleeper bots can go off-board; chamber rooms deliberately cannot, which is what makes
# exhaustion reachable and C7 testable).
# ---------------------------------------------------------------------------------------------

def load_board():
    with open(os.path.join(KIT, "players_data.json"), encoding="utf-8") as f:
        board = json.load(f)
    with open(os.path.join(KIT, "vorp_curve.json"), encoding="utf-8") as f:
        curve = json.load(f)
    return board, curve


def adp_order(board):
    """Board rows in market-ADP order, unpriced last in board order -- market_order's rule
    (precompute_ladder.py:360-387) re-applied to rows instead of names. Exact-name join, same
    as the shipping code; in a synthetic-board room the join fails and this IS the board order,
    which the caller must report (catalog H8: gate on the source label)."""
    rows = sorted(board["players"], key=lambda r: r["r"])
    if not os.path.exists(ADP_CACHE):
        return rows, "board order (no ADP cache)"
    with gzip.open(ADP_CACHE, "rt", encoding="utf-8") as f:
        payload = json.load(f)
    adp = {}
    for row in payload.get("players", []):
        nm, val = (row.get("name") or "").strip(), row.get("adp")
        if nm and val is not None:
            adp[nm] = float(val)
    priced = [r for r in rows if r["name"] in adp]
    if len(priced) < max(3, (len(rows) + 1) // 2):
        return rows, f"board order (ADP joined only {len(priced)} of {len(rows)})"
    unpriced = [r for r in rows if r["name"] not in adp]
    return (sorted(priced, key=lambda r: (adp[r["name"]], r["name"])) + unpriced), "market ADP"


# ---------------------------------------------------------------------------------------------
# Room state. Picks are well-formed per catalog H7: pick_no >= 1 contiguous, draft_id stamped on
# every pick (A6 -- a missing key becomes "None" and trips the multi-draft gate), picked_by
# stamped on OUR picks only (A7 -- on the wrong slot it is a hard exit).
# ---------------------------------------------------------------------------------------------

class Room:
    def __init__(self, board, curve, seats, my_slot, teams=8, rounds=16, draft_id="chamber0",
                 rng=None):
        self.board, self.curve = board, curve
        self.rows = board["players"]
        self.by_id = {str(r["sleeperId"]): r for r in self.rows}
        self.seats = seats                  # slot -> behavior fn(room, slot) -> board row
        self.my_slot, self.teams, self.rounds = my_slot, teams, rounds
        self.draft_id = str(draft_id)
        self.rng = rng or random.Random(0)
        self.picks = []                     # well-formed Sleeper-shaped pick dicts
        self.taken = set()                  # sleeperId strings
        self.rosters = defaultdict(list)    # slot -> [board row]
        self.events = []                    # chamber events: EMPTY_QUEUE, EXHAUSTED, ...
        self.collisions = 0                 # catalog G2: reported, never silent

    def available(self):
        return [r for r in self.rows if str(r["sleeperId"]) not in self.taken]

    def take(self, slot, row):
        no = len(self.picks) + 1
        self.taken.add(str(row["sleeperId"]))
        self.rosters[slot].append(row)
        # metadata is NOT optional (catalog H7, learned the hard way on this file's first
        # equivalence run): the engine joins the pick to a board row by frozen id, so the
        # LINEUP math survives an empty metadata -- but rosters[] takes its POSITION from
        # metadata.position alone (draft_engine.py:425, :450), so empty metadata made
        # _my_counts {"?": 8}, must_fill saw ZERO filled slots, and forcing fired five rounds
        # early with K/DEF in the rebuild. Join right, value right, FORCING corrupted --
        # the inverse of catalog B6, dormant on real feeds where Sleeper always populates it.
        first, _, last = row["name"].partition(" ")
        self.picks.append({
            "pick_no": no, "player_id": str(row["sleeperId"]),
            "draft_slot": slot, "round": (no - 1) // self.teams + 1,
            "draft_id": self.draft_id,
            "picked_by": BRIGGSY if slot == self.my_slot else f"bot{slot}",
            "is_keeper": None, "roster_id": None,
            "metadata": {"first_name": first, "last_name": last,
                         "position": row["pos"], "team": row.get("team")},
        })

    def run(self, policy):
        """Play the room to completion. `policy(room) -> board row` acts for OUR seat."""
        total = self.teams * self.rounds
        for no in range(1, total + 1):
            slot = slot_for_pick(no, self.teams)
            if slot == self.my_slot:
                row = policy(self)
            else:
                row = self.seats[slot](self, slot)
            if row is None:                       # a seat found nothing it would take
                pool = self.available()
                if not pool:
                    self.events.append(("POOL_EXHAUSTED", no))
                    break
                row = min(pool, key=lambda r: r["r"])
            self.take(slot, row)
        return self


# ---------------------------------------------------------------------------------------------
# The behavior ensemble (plan D1). Every archetype takes (room, slot) and returns a board row.
# Rank noise is Gaussian on the ORDERING INDEX, sigma swept by the battery -- findings must
# survive the sweep, never be tuned to one sigma (catalog / plan D1).
# ---------------------------------------------------------------------------------------------

def _noisy_pick(ordering, room, sigma):
    pool = [r for r in ordering if str(r["sleeperId"]) not in room.taken]
    if not pool:
        return None
    if sigma <= 0:
        return pool[0]
    idx = [max(0.0, i + room.rng.gauss(0, sigma)) for i in range(len(pool))]
    return pool[min(range(len(pool)), key=lambda i: idx[i])]


def _needs_of(room, slot, starters, flex_slots):
    counts = Counter(r["pos"] for r in room.rosters[slot])
    return LV.must_fill(counts, starters, FLEX_OK, flex_slots)


def bot_board(sigma, ordering):
    """Consensus-faithful: our board order + noise. The measured room fact that opponents
    follow consensus is the 31x floor separation (precompute_ladder.py:345-352)."""
    def pick(room, slot):
        return _noisy_pick(ordering, room, sigma)
    return pick


def bot_adp(sigma, ordering):
    """ADP-faithful: the repo's own thesis about this room -- generic drafters off a generic
    list. `ordering` comes from adp_order(); the caller reports its source label (H8)."""
    def pick(room, slot):
        return _noisy_pick(ordering, room, sigma)
    return pick


def bot_need_aware(sigma, ordering, starters, flex_slots, kdef_round=13):
    """Sleeper-autopick-shaped: fill starting slots first, defer K/DEF to the late rounds.
    K/DEF timing is a MODEL (n=1 observation, catalog E2), so it is a parameter, not a fact."""
    def pick(room, slot):
        need, flex_need, _ = _needs_of(room, slot, starters, flex_slots)
        rnd = len(room.picks) // room.teams + 1
        skill_need = {p for p, k in need.items() if k > 0 and p not in ("K", "DEF")}
        if flex_need > 0:
            skill_need |= set(FLEX_OK)
        pool = [r for r in ordering if str(r["sleeperId"]) not in room.taken]
        if rnd >= kdef_round:
            owed = [p for p in ("K", "DEF") if need.get(p, 0) > 0]
            if owed:
                cand = [r for r in pool if r["pos"] in owed]
                if cand:
                    return cand[0]
        cand = [r for r in pool if r["pos"] in skill_need] or pool
        return _noisy_pick(cand, room, sigma)
    return pick


def bot_room_facts(sigma, ordering, starters, flex_slots):
    """need_aware bounded by the three near-unanimous measured room facts
    (docs/opponents.md; TODO): no K before round 10 (18/18) · TE waits past R5 (15/18) ·
    the room's first QB goes early (6/7 drafts). Bounds, never predictions (plan, non-goals)."""
    base = bot_need_aware(sigma, ordering, starters, flex_slots)
    def pick(room, slot):
        rnd = len(room.picks) // room.teams + 1
        row = base(room, slot)
        tries = 0
        while row is not None and tries < 8:
            if row["pos"] == "K" and rnd < 10:
                pass
            elif row["pos"] == "TE" and rnd <= 5:
                pass
            else:
                return row
            pool = [r for r in ordering if str(r["sleeperId"]) not in room.taken
                    and r["pos"] not in ("K",) and not (r["pos"] == "TE" and rnd <= 5)]
            row = _noisy_pick(pool, room, sigma) if pool else None
            tries += 1
        return row
    return pick


def bot_chaos(sigma, ordering):
    """Heavy-tailed reaches: mostly consensus, occasionally a deep dive."""
    def pick(room, slot):
        pool = [r for r in ordering if str(r["sleeperId"]) not in room.taken]
        if not pool:
            return None
        if room.rng.random() < 0.25:
            depth = min(len(pool) - 1, int(room.rng.expovariate(1 / 18.0)))
            return pool[depth]
        return _noisy_pick(pool, room, sigma)
    return pick


def bot_sniper(sigma, ordering, get_queue_top):
    """THE SNIPER (plan D1): when picking directly before our seat, takes our current
    queue-top. `get_queue_top` is supplied by the harness so the sniper sees exactly what the
    policy would have taken -- an adversary with perfect information, deliberately unrealistic:
    the point is stress, not forecast."""
    base = bot_board(sigma, ordering)
    def pick(room, slot):
        nxt = len(room.picks) + 2                       # the pick after this one
        if nxt <= room.teams * room.rounds and \
                slot_for_pick(nxt, room.teams) == room.my_slot:
            top = get_queue_top(room)
            if top is not None and str(top["sleeperId"]) not in room.taken:
                return top
        return base(room, slot)
    return pick


def bot_run_starter(sigma, ordering, window=8, threshold=3):
    """Joins/ignites positional runs: if a position dominates the last `window` picks, chase it."""
    base = bot_board(sigma, ordering)
    def pick(room, slot):
        last = [room.by_id[p["player_id"]]["pos"] for p in room.picks[-window:]
                if p["player_id"] in room.by_id]
        hot = Counter(last).most_common(1)
        if hot and hot[0][1] >= threshold and room.rng.random() < 0.6:
            pool = [r for r in ordering if str(r["sleeperId"]) not in room.taken
                    and r["pos"] == hot[0][0]]
            if pool:
                return pool[0]
        return base(room, slot)
    return pick


def bot_early_kdef(sigma, ordering, start_round=5, per_pos=2):
    """THE HOARDER (catalog D2): takes K/DEF from `start_round`, up to `per_pos` of each --
    built to exhaust the 10-K/14-DEF board pool and force the C7 trilemma."""
    base = bot_board(sigma, ordering)
    def pick(room, slot):
        rnd = len(room.picks) // room.teams + 1
        counts = Counter(r["pos"] for r in room.rosters[slot])
        if rnd >= start_round:
            for pos in ("K", "DEF"):
                if counts[pos] < per_pos:
                    pool = [r for r in ordering if str(r["sleeperId"]) not in room.taken
                            and r["pos"] == pos]
                    if pool:
                        return pool[0]
        return base(room, slot)
    return pick


# ---------------------------------------------------------------------------------------------
# The policy under test, both paths.
# ---------------------------------------------------------------------------------------------

class FastPolicy:
    """The replay_mock formulation on the shared brain -- with the chamber's own integrity
    additions the fleet demanded (catalog G2): feeds are chamber-generated so already gapless,
    and exhaustion CRASHES in replay (catalog C7) -- here it is caught and recorded as the
    event it is, because the chamber must observe the state, not die on it.

    `mutant` flips implement catalog H3's plants. Default config IS the shipping policy."""

    def __init__(self, board, curve, starters, flex_slots, rounds,
                 window=None, forcing=True, rebuild_n=3, naive=False):
        self.pts_by_id, self.fill = LV.live_values(board, curve)
        self.starters, self.flex_slots, self.rounds = starters, flex_slots, rounds
        self.window = window if window is not None else LV.CANDIDATE_WINDOW
        self.forcing, self.rebuild_n, self.naive = forcing, rebuild_n, naive

    def ranked(self, room):
        """The full ranked candidate list at this state -- what the ladder's queue would hold
        (window + forcing filter + (-delta, rank) order). choose() is ranked()[0]; the static
        drain arms ranked()[:12] so the armed queue mirrors the shipping ladder exactly."""
        pool = sorted(room.available(), key=lambda r: r["r"])
        if not pool:
            room.events.append(("EMPTY_POOL", len(room.picks) + 1))
            return []
        if self.naive:                                    # H3 plant: the board-order queue
            return pool
        my_rows = room.rosters[room.my_slot]
        my_pts = defaultdict(list)
        for r in my_rows:
            my_pts[r["pos"]].append(self.pts_by_id[str(r["sleeperId"])])
        counts = Counter(r["pos"] for r in my_rows)
        need, flex_need, must_total = LV.must_fill(counts, self.starters, FLEX_OK,
                                                   self.flex_slots)
        remaining = self.rounds - len(my_rows)
        cands = pool[:self.window]
        if self.forcing and must_total >= remaining > 0:
            allowed = {p for p, k in need.items() if k > 0}
            if flex_need > 0:
                allowed |= set(FLEX_OK)
            cands = [r for pos in sorted(allowed)
                     for r in [x for x in pool if x["pos"] == pos][:self.rebuild_n]]
            if not cands:                                 # C7: total exhaustion, observed not fatal
                room.events.append(("FORCED_EMPTY", len(room.picks) + 1, sorted(allowed)))
                return pool[:1]                           # the null-model surrogate, flagged
        return sorted(cands, key=lambda r: (-LV.marginal_pts(
            self.pts_by_id[str(r["sleeperId"])], r["pos"], my_pts, self.fill,
            self.starters, FLEX_OK, self.flex_slots), r["r"]))

    def choose(self, room):
        ranked = self.ranked(room)
        return ranked[0] if ranked else None


class StaticDrainPolicy:
    """The blown-clock actor -- Mock #2's death scenario priced with OUR queue armed.

    Attended picks (before `miss_at`) behave exactly like FastPolicy and re-arm a 12-name
    queue each time (B5's cap, mirrored from BEST_N). From our `miss_at`-th pick onward the
    operator is GONE (Sleeper pins auto-pick after one missed clock -- Mock #2: pick 79 ->
    autopicks at 82/95/98/111/114): every later our-pick drains the LAST ARMED queue's first
    surviving name, and when none survive it falls to the Sleeper-board surrogate --
    need-aware over ADP order, the GENEROUS model of Sleeper's fallback (its need-awareness
    is an n=1 observation, catalog E2, so findings that depend on the surrogate say so).
    Events: STATIC_SERVED / STATIC_QUEUE_EMPTY, so every room says which regime each pick
    came from."""

    QUEUE_DEPTH = 12                                     # BEST_N -- catalog B5

    def __init__(self, fast, miss_at, fallback_ordering, starters, flex_slots):
        self.fast, self.miss_at = fast, miss_at
        self.fallback = bot_need_aware(0.0, fallback_ordering, starters, flex_slots)
        self.armed = None
        self.our_picks_made = 0

    def choose(self, room):
        self.our_picks_made += 1
        if self.our_picks_made < self.miss_at:
            ranked = self.fast.ranked(room)
            self.armed = [r["name"] for r in ranked[:self.QUEUE_DEPTH]]
            return ranked[0] if ranked else None
        for name in (self.armed or []):
            row = next((r for r in room.available() if r["name"] == name), None)
            if row is not None:
                self.armed = self.armed[self.armed.index(name) + 1:]
                room.events.append(("STATIC_SERVED", len(room.picks) + 1, name))
                return row
        room.events.append(("STATIC_QUEUE_EMPTY", len(room.picks) + 1))
        return self.fallback(room, room.my_slot)


class RealPolicy:
    """One real engine run per our-pick; the queue is the parsed LINEUP DELTAS block -- the
    shipping parsers, the shipping engine, nothing re-implemented (catalog B1). The work dir is
    staged once per room with the same four files precompute_ladder stages, so a synthetic
    board (a mutated engine, a mutated brain) is one file swap (`stage` overrides)."""

    def __init__(self, teams, rounds, draft_id, stage=None, engine=None):
        self.teams, self.rounds, self.draft_id = teams, rounds, draft_id
        self._tmp = tempfile.TemporaryDirectory()
        self.work = os.path.join(self._tmp.name, "draft-kit")
        os.makedirs(self.work)
        stage = stage or {}
        for name in ("players_data.json", "normalize.py", "lineup_value.py",
                     "vorp_curve.json", "draft_engine.py"):
            shutil.copy(stage.get(name, os.path.join(KIT, name)), self.work)
        # The engine invoked is the COPY in the work dir, so a mutated engine/brain never
        # touches the shipping files and the sandbox rule (plan D7) holds by construction.
        self.engine = engine or os.path.join(self.work, "draft_engine.py")

    def choose(self, room):
        import subprocess
        with open(os.path.join(self.work, "picks.json"), "w", encoding="utf-8") as f:
            json.dump(room.picks, f, ensure_ascii=False)
        env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
        p = subprocess.run([sys.executable, self.engine, str(room.my_slot),
                            str(self.teams), str(self.rounds), str(self.draft_id)],
                           cwd=self.work, capture_output=True, text=True,
                           encoding="utf-8", env=env, timeout=120)
        if p.returncode != 0:
            room.events.append(("ENGINE_REFUSED", len(room.picks) + 1,
                                (p.stdout or "")[-400:] + (p.stderr or "")[-400:]))
            return None
        deltas = parse_lineup_deltas(p.stdout)
        if not deltas:
            room.events.append(("EMPTY_DELTAS", len(room.picks) + 1))   # C7 real-path shape
            pool = room.available()
            return min(pool, key=lambda r: r["r"]) if pool else None
        name = deltas[0][1]
        row = next((r for r in room.available() if r["name"] == name), None)
        if row is None:
            room.events.append(("QUEUE_NAME_UNRESOLVED", len(room.picks) + 1, name))
        return row

    def close(self):
        self._tmp.cleanup()


# ---------------------------------------------------------------------------------------------
# Invariant checkers -- each implements a catalog entry and cites it. A checker returns a list
# of violation dicts; empty means clean. Findings are STRUCTURAL (plan D2).
# ---------------------------------------------------------------------------------------------

def check_slots_filled(room, starters, flex_slots):
    """C5: every mandated slot filled at draft end (the primary target)."""
    need, flex_need, total = _needs_of(room, room.my_slot, starters, flex_slots)
    if total > 0:
        return [{"invariant": "C5", "detail": f"draft ended with open slots: "
                 f"need={ {p: k for p, k in need.items() if k} }, flex_need={flex_need}",
                 "events": room.events}]
    return []


def check_offpolicy_slack(trace):
    """C6 (off-policy edge): slack observed < 0 at any our-pick state. `trace` carries
    (pick_no, remaining, must_total) per our pick, recorded by the harness."""
    out = []
    for pick_no, remaining, must_total in trace:
        if remaining - must_total < 0:
            out.append({"invariant": "C6", "detail":
                        f"slack went negative at pick {pick_no}: "
                        f"remaining={remaining}, must_total={must_total}"})
    return out


def check_feasibility(room, starters, flex_slots, supply_trace=None):
    """H4: separate "no strategy could fill it" from "the POLICY declined to fill it while it
    still could". The first battery run buried 100 policy-attributable strandings under
    INFEASIBLE because this check only looked at the END state -- while an omniscient drafter
    would simply have taken a K in round 5 when 7 were still on the board. The retrospective
    is the classifier now: `supply_trace` carries (pick_no, {pos: supply_at_that_our_pick})
    for every our-pick, recorded by run_room BEFORE the policy chose. A starved position that
    ever showed supply > 0 at one of our picks was PREVENTABLE -- that is a C5/C7 FINDING
    against the deferral, not an infeasible room. Truly infeasible = the position was already
    gone at every our-pick from the first (bots ate it before we ever picked)."""
    my = room.my_slot
    need_now = {p: n for p, n in LV.must_fill(
        Counter(r["pos"] for r in room.rosters[my]), starters, FLEX_OK, flex_slots)[0].items()
        if n > 0}
    if not need_now:
        return [], []
    supply = Counter(r["pos"] for r in room.available())
    starved = {p: n for p, n in need_now.items() if supply.get(p, 0) < n}
    if not starved:
        return [], []
    preventable = {}
    for pos in starved:
        chances = [no for no, sup in (supply_trace or []) if sup.get(pos, 0) > 0]
        if chances:
            preventable[pos] = chances
    if preventable:
        # Show the LAST chances, and say how many there were. The first version printed
        # `c[:4]` -- the FIRST four chances, always our rounds-1-4 picks by construction --
        # and the Phase 3 verifier caught the campaign report quoting it as "the last chance
        # is round 4" when the measured last chance was round 5-6 in all 444 finding rooms.
        # An instrument's display truncation became an analysis error; never truncate the
        # decision-bearing end of a list.
        return [{"invariant": "C5-preventable", "detail":
                 f"policy-attributable stranding: {sorted(starved)} exhausted, but supply was "
                 f"still positive at "
                 f"{ {p: f'{len(c)} of our picks, last chances {c[-4:]}' for p, c in preventable.items()} } "
                 f"and the policy deferred (supply-blind deferral -- catalog E3's pool gap)",
                 "events": room.events}], []
    return [], [{"invariant": "H4", "detail": f"board supply exhausted for {starved} before "
                 f"our first opportunity -- genuinely infeasible", "events": room.events}]


def check_kdef_window(board):
    """D1 tripwire: the deferral's data precondition on the CURRENT board."""
    bad = [r["name"] for r in board["players"]
           if r["pos"] in ("K", "DEF") and r["r"] <= LV.CANDIDATE_WINDOW]
    return [{"invariant": "D1", "detail": f"K/DEF inside the candidate window: {bad}"}] if bad else []


def check_inversions(board):
    """C2(a) tripwire: no within-position board-rank/vorp inversion on the CURRENT board."""
    out = []
    by_pos = defaultdict(list)
    for r in board["players"]:
        by_pos[r["pos"]].append(r)
    for pos, rows in by_pos.items():
        rows = sorted(rows, key=lambda r: r["r"])
        for a, b in zip(rows, rows[1:]):
            if float(b.get("vorp", 0)) > float(a.get("vorp", 0)) + 1e-9:
                out.append({"invariant": "C2a", "detail":
                            f"{pos}: {b['name']} (r{b['r']}) vorp {b.get('vorp')} > "
                            f"{a['name']} (r{a['r']}) vorp {a.get('vorp')}"})
    return out


def check_twins(room, starters, flex_slots):
    """H9: needs()-vs-must_fill consistency, chamber-side formulation. The engine's needs()
    is stdout-only, so the chamber checks the property it guarantees: our roster's open
    starter slots per must_fill match a direct recount of the roster."""
    counts = Counter(r["pos"] for r in room.rosters[room.my_slot])
    need, flex_need, total = LV.must_fill(counts, starters, FLEX_OK, flex_slots)
    recount = {p: max(0, n - counts.get(p, 0)) for p, n in starters.items()}
    spare = sum(max(0, counts.get(p, 0) - starters.get(p, 0)) for p in FLEX_OK)
    if need != recount or flex_need != max(0, flex_slots - spare):
        return [{"invariant": "H9", "detail": f"must_fill disagrees with recount: "
                 f"{need} vs {recount}, flex {flex_need} vs {max(0, flex_slots - spare)}"}]
    return []


# ---------------------------------------------------------------------------------------------
# Scoring -- replay_mock.score() verbatim (catalog H6: decision space != scoring space; an
# empty slot scores ZERO, this is Sunday).
# ---------------------------------------------------------------------------------------------

def score_room(room, starters, flex_slots):
    return replay_mock.score(room.rosters[room.my_slot], starters, flex_slots)


# ---------------------------------------------------------------------------------------------
# Harness: run one room under a policy, with the C6 trace and the accounting H4 demands.
# ---------------------------------------------------------------------------------------------

def run_room(room, policy_choose, starters, flex_slots, rounds):
    trace, supply_trace = [], []
    def policy(r):
        counts = Counter(x["pos"] for x in r.rosters[r.my_slot])
        _, _, must_total = LV.must_fill(counts, starters, FLEX_OK, flex_slots)
        trace.append((len(r.picks) + 1, rounds - len(r.rosters[r.my_slot]), must_total))
        supply_trace.append((len(r.picks) + 1,
                             Counter(x["pos"] for x in r.available())))
        return policy_choose(r)
    room.run(policy)
    preventable, infeasible = check_feasibility(room, starters, flex_slots, supply_trace)
    violations = (check_slots_filled(room, starters, flex_slots)
                  + check_offpolicy_slack(trace)
                  + check_twins(room, starters, flex_slots)
                  + preventable)
    lineup, bench = score_room(room, starters, flex_slots)
    status = ("INFEASIBLE" if infeasible else
              "FINDING" if violations else "PASS")
    return {"status": status, "violations": violations, "infeasible": infeasible,
            "lineup": round(lineup, 1), "bench": round(bench, 1),
            "events": room.events, "collisions": room.collisions,
            "roster": Counter(r["pos"] for r in room.rosters[room.my_slot])}


def make_seats(archetype_names, sigma, board, curve, starters, flex_slots, my_slot,
               ordering_board, ordering_adp, get_queue_top):
    """Assign one archetype per opposing seat, deterministic from the given name list."""
    mk = {
        "board": lambda: bot_board(sigma, ordering_board),
        "adp": lambda: bot_adp(sigma, ordering_adp),
        "need": lambda: bot_need_aware(sigma, ordering_adp, starters, flex_slots),
        "facts": lambda: bot_room_facts(sigma, ordering_adp, starters, flex_slots),
        "chaos": lambda: bot_chaos(sigma, ordering_board),
        "sniper": lambda: bot_sniper(sigma, ordering_board, get_queue_top),
        "run": lambda: bot_run_starter(sigma, ordering_board),
        "hoarder": lambda: bot_early_kdef(sigma, ordering_adp),
    }
    seats, i = {}, 0
    for slot in range(1, 9):
        if slot == my_slot:
            continue
        seats[slot] = mk[archetype_names[i % len(archetype_names)]]()
        i += 1
    return seats


# ---------------------------------------------------------------------------------------------
# D4 controls -- the chamber proves itself before any battery result is readable.
# ---------------------------------------------------------------------------------------------

def control_030():
    """Reproduce insight 030 through the chamber's own FastPolicy against the recorded room.
    replay_mock is the reference implementation; the chamber must match it pick-for-pick and
    to the decimal, or the chamber's policy is NOT the shipping policy (catalog H1/G1)."""
    board, curve = load_board()
    with open(replay_mock.FIXTURE, encoding="utf-8") as f:
        picks = json.load(f)
    starters, flex_slots = dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS
    ref_rows, _ = replay_mock.replay(picks, board, curve, 5, "delta", starters, flex_slots)
    ref_lineup, ref_bench = replay_mock.score(ref_rows, starters, flex_slots)

    # The chamber replays the same room: recorded seats play history, FastPolicy plays ours.
    rounds = max(p["pick_no"] for p in picks) // max(p["draft_slot"] for p in picks)
    pol = FastPolicy(board, curve, starters, flex_slots, rounds)
    by_no = {p["pick_no"]: p for p in picks}

    room = Room(board, curve, {}, my_slot=5, teams=8, rounds=rounds, rng=random.Random(0))
    got = []
    for no in range(1, len(picks) + 1):
        pk = by_no[no]
        if pk["draft_slot"] != 5:
            rid = str(pk.get("player_id"))
            if rid in room.taken:
                room.collisions += 1              # G2: recorded, the recorded man is gone
                continue
            row = room.by_id.get(rid)
            if row is not None:
                room.take(pk["draft_slot"], row)
            else:
                room.taken.add(rid)               # off-board recorded pick: gone, not rostered
            continue
        row = pol.choose(room)
        room.take(5, row)
        got.append(row["name"])
    lineup, bench = score_room(room, starters, flex_slots)
    want = [r["name"] for r in ref_rows]
    ok = (got == want and abs(lineup - ref_lineup) < 0.05)
    print(f"control-030: chamber picks {'MATCH' if got == want else 'DIVERGE'} replay_mock")
    if got != want:
        for i, (a, b) in enumerate(zip(want, got)):
            if a != b:
                print(f"  first divergence at our pick {i+1}: replay={a} chamber={b}")
                break
    print(f"  lineup {lineup:.1f} vs reference {ref_lineup:.1f} "
          f"(naive/delta headline: 695.4 / 1087.2)")
    print(f"control-030: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


def control_closed_form():
    """Insight 021's law: a no-noise room whose full sequence is computable WITHOUT running the
    chamber. All 7 bots draft strict board order; our seat (3) runs FastPolicy. The expected
    sequence is derived here by an INDEPENDENT walk (plain arithmetic over the sorted board and
    marginal values -- no Room, no policy object), then the chamber must match it exactly."""
    board, curve = load_board()
    starters, flex_slots, rounds, teams = dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS, 16, 8
    rows = sorted(board["players"], key=lambda r: r["r"])
    pts_by_id, fill = LV.live_values(board, curve)

    taken, my_rows = set(), []
    expected = []
    for no in range(1, teams * rounds + 1):
        slot = slot_for_pick(no, teams)
        pool = [r for r in rows if str(r["sleeperId"]) not in taken]
        if not pool:
            break
        if slot != 3:
            choice = pool[0]
        else:
            my_pts = defaultdict(list)
            for r in my_rows:
                my_pts[r["pos"]].append(pts_by_id[str(r["sleeperId"])])
            counts = Counter(r["pos"] for r in my_rows)
            need, flex_need, must_total = LV.must_fill(counts, starters, FLEX_OK, flex_slots)
            remaining = rounds - len(my_rows)
            cands = pool[:LV.CANDIDATE_WINDOW]
            if must_total >= remaining > 0:
                allowed = {p for p, k in need.items() if k > 0}
                if flex_need > 0:
                    allowed |= set(FLEX_OK)
                cands = [r for pos in sorted(allowed)
                         for r in [x for x in pool if x["pos"] == pos][:3]] or pool[:1]
            choice = min(cands, key=lambda r: (-LV.marginal_pts(
                pts_by_id[str(r["sleeperId"])], r["pos"], my_pts, fill,
                starters, FLEX_OK, flex_slots), r["r"]))
            my_rows.append(choice)
            expected.append(choice["name"])
        taken.add(str(choice["sleeperId"]))

    ordering = sorted(board["players"], key=lambda r: r["r"])
    seats = {s: bot_board(0, ordering) for s in range(1, 9) if s != 3}
    pol = FastPolicy(board, curve, starters, flex_slots, rounds)
    room = Room(board, curve, seats, my_slot=3, teams=teams, rounds=rounds,
                rng=random.Random(0))
    res = run_room(room, pol.choose, starters, flex_slots, rounds)
    got = [r["name"] for r in room.rosters[3]]
    ok = got == expected and res["status"] == "PASS"
    print(f"control-closed-form: {'MATCH' if got == expected else 'DIVERGE'} "
          f"({len(expected)} our-picks), room status {res['status']}, "
          f"roster {dict(res['roster'])}, lineup {res['lineup']}")
    if got != expected:
        for i, (a, b) in enumerate(zip(expected, got)):
            if a != b:
                print(f"  first divergence at our pick {i+1}: expected={a} chamber={b}")
                break
    print(f"control-closed-form: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


def control_mutants():
    """H3: the chamber must CATCH every planted policy mutant. First run (2026-08-20) taught
    this control its own lesson: in a benign 16-round room, forcing-removed was INVISIBLE --
    late-draft pool shrinkage pulls K/DEF inside the 40-deep window anyway, so the un-forced
    policy fills them regardless and the plant produced a byte-identical draft. The forcing's
    bite window on this board is razor-thin, which is a finding about the POLICY's redundancy
    structure, not about the plant. So every plant now runs in TWO rooms:

      * the 16-round board-order room (realism -- the closed-form control's room), and
      * an 11-round FORCING-BITE room: short enough that the pool stays deep at our last
        picks, so K/DEF genuinely never enter the window without the forcing rebuild --
        remove the forcing there and the policy provably strands both slots.

    Caught = in EITHER room: a non-PASS status, a lineup collapse, or a CHANGED PICK SEQUENCE
    (sequence, not roster counts -- a reorder with identical counts is still a behavior
    change). A chamber that misses a plant measures nothing (insight 008).

    Known limit, deliberate: `rebuild-1` is UNCATCHABLE on the shipped board -- within a
    position, delta is monotone in board rank (C2a: zero inversions measured), so [:1] and
    [:3] pick the same man. It is reported, not gated; its catch needs the C2a synthetic
    inversion board, which is a battery scenario, not a control."""
    board, curve = load_board()
    starters, flex_slots, teams = dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS, 8
    ordering = sorted(board["players"], key=lambda r: r["r"])

    def run_with(rounds, **cfg):
        seats = {s: bot_board(0, ordering) for s in range(1, 9) if s != 3}
        pol = FastPolicy(board, curve, starters, flex_slots, rounds, **cfg)
        room = Room(board, curve, seats, my_slot=3, teams=teams, rounds=rounds,
                    rng=random.Random(0))
        res = run_room(room, pol.choose, starters, flex_slots, rounds)
        res["seq"] = [r["name"] for r in room.rosters[3]]
        return res

    rooms = {"16r": 16, "11r-forcing-bite": 11}
    base = {label: run_with(rounds) for label, rounds in rooms.items()}
    for label, b in base.items():
        if b["status"] != "PASS":
            print(f"control-mutants: BASELINE {label} IS NOT CLEAN ({b['status']}) "
                  f"-- fix that first: {b['violations']}")
            return 1
    plants = {
        "forcing-removed": dict(forcing=False),
        "board-order-queue": dict(naive=True),
        "window-removed": dict(window=len(board["players"])),
        "rebuild-1": dict(rebuild_n=1),
    }
    caught, verdicts = 0, []
    for name, cfg in plants.items():
        hits = []
        for label, rounds in rooms.items():
            res = run_with(rounds, **cfg)
            hit = (res["status"] != "PASS"
                   or res["lineup"] < base[label]["lineup"] - 25.0
                   or res["seq"] != base[label]["seq"])
            if hit:
                hits.append((label, res["status"], res["lineup"], dict(res["roster"])))
        caught += bool(hits)
        verdicts.append((name, hits))
    for name, hits in verdicts:
        if hits:
            where = "; ".join(f"{l}: {s}, lineup {v}, {r}" for l, s, v, r in hits)
            print(f"  {name:>18}: CAUGHT  ({where})")
        else:
            print(f"  {name:>18}: MISSED")
    hard = [(n, h) for n, h in verdicts if n != "rebuild-1"]
    ok = all(h for _, h in hard)
    print(f"control-mutants: {caught}/{len(plants)} caught "
          f"(rebuild-1 uncatchable on a zero-inversion board -- see docstring); "
          f"hard set {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


def equivalence(rooms_n=20, sigma=6.0, seed=1):
    """G1: fast path == real path on sampled states of real ensemble rooms. For each sampled
    room, replay the same pick prefix into RealPolicy and FastPolicy and compare their choice
    at every our-pick. Hard-fail on the first divergence (U3 discipline)."""
    board, curve = load_board()
    starters, flex_slots, rounds, teams = dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS, 16, 8
    ob = sorted(board["players"], key=lambda r: r["r"])
    oa, adp_src = adp_order(board)
    print(f"equivalence: ADP ordering source = {adp_src} (H8: gate on this label)")
    pol_fast = FastPolicy(board, curve, starters, flex_slots, rounds)
    mismatches, states = 0, 0
    for i in range(rooms_n):
        my_slot = (i % 8) + 1
        rng = random.Random(f"{seed}:{i}")
        names = ["board", "adp", "need", "facts", "chaos", "run"]
        seats = make_seats(names, sigma, board, curve, starters, flex_slots, my_slot,
                           ob, oa, lambda room: None)
        real = RealPolicy(teams, rounds, draft_id=f"chamber-eq-{seed}-{i}")
        room = Room(board, curve, seats, my_slot=my_slot, teams=teams, rounds=rounds,
                    draft_id=f"chamber-eq-{seed}-{i}", rng=rng)

        def compare(r):
            nonlocal mismatches, states
            states += 1
            f = pol_fast.choose(r)
            g = real.choose(r)
            if (f and f["name"]) != (g and g["name"]):
                mismatches += 1
                print(f"  DIVERGENCE room {i} slot {my_slot} pick {len(r.picks)+1}: "
                      f"fast={f and f['name']} real={g and g['name']}")
            return f
        room.run(compare)
        real.close()
        if mismatches:
            break
    print(f"equivalence: {states} our-pick states across {i+1} room(s), "
          f"{mismatches} divergence(s)")
    print(f"equivalence: {'PASS -- fast path licensed for this configuration' if not mismatches else 'FAIL -- fast path is NOT licensed'}")
    return 0 if mismatches == 0 else 1


# ---------------------------------------------------------------------------------------------
# Phase 2 battery -- runnable, but its RESULTS are unreadable until the catalog passes
# Briggsy's eye (plan, Phase 0 gate; TODO item 6). The gate is printed on every run.
# ---------------------------------------------------------------------------------------------

ROUND1 = [
    {"names": ["board"], "sigma": 0.0}, {"names": ["board"], "sigma": 4.0},
    {"names": ["adp"], "sigma": 4.0}, {"names": ["adp"], "sigma": 10.0},
    {"names": ["need"], "sigma": 6.0}, {"names": ["facts"], "sigma": 6.0},
    {"names": ["chaos"], "sigma": 8.0},
    {"names": ["sniper", "board"], "sigma": 4.0},
    {"names": ["run", "adp"], "sigma": 6.0},
    {"names": ["hoarder", "hoarder", "hoarder", "adp"], "sigma": 4.0},
    {"names": ["sniper", "hoarder", "chaos", "need"], "sigma": 8.0},
]

#: Round 2 -- the off-policy edges (catalog C6's real hunting ground) plus milder hoarding.
#: `miss_at`: from our Nth pick on, the operator is gone and the STATIC armed queue drains
#: (StaticDrainPolicy -- the Mock #2 pinned-auto-pick scenario, priced with OUR queue).
ROUND2 = [
    {"names": ["adp"], "sigma": 4.0, "miss_at": 4},
    {"names": ["adp"], "sigma": 4.0, "miss_at": 8},
    {"names": ["adp"], "sigma": 4.0, "miss_at": 11},
    {"names": ["facts"], "sigma": 6.0, "miss_at": 8},
    {"names": ["sniper", "board"], "sigma": 4.0, "miss_at": 8},
    {"names": ["hoarder", "adp", "adp", "adp", "adp", "adp", "adp"], "sigma": 4.0},
    {"names": ["hoarder", "hoarder", "adp", "adp", "adp", "adp", "adp"], "sigma": 6.0},
    {"names": ["chaos"], "sigma": 14.0},
    {"names": ["board"], "sigma": 0.0},
]

#: Round 3 -- compound worst-cases: starvation UNDER pinned drain, stacked adversaries,
#: run-storms, near-zero-noise ADP (is the QB pile noise-driven? -- no is the hypothesis).
ROUND3 = [
    {"names": ["hoarder", "hoarder", "hoarder", "hoarder", "hoarder", "hoarder", "adp"],
     "sigma": 4.0, "miss_at": 6},
    {"names": ["sniper", "hoarder", "hoarder", "hoarder", "hoarder", "hoarder", "hoarder"],
     "sigma": 4.0},
    {"names": ["hoarder", "hoarder", "hoarder", "hoarder", "hoarder", "hoarder", "adp"],
     "sigma": 4.0},
    {"names": ["run", "run", "run", "adp", "adp", "adp", "adp"], "sigma": 8.0},
    {"names": ["need"], "sigma": 6.0, "miss_at": 2},
    {"names": ["adp"], "sigma": 2.0},
    {"names": ["facts"], "sigma": 12.0},
]


def battery(rooms_n=200, seed=1, report=None, scenario_set="round1"):
    board, curve = load_board()
    trip = check_kdef_window(board) + check_inversions(board)
    if trip:
        print("battery: PRECONDITION TRIPWIRE FIRED -- the board is not the board the "
              "catalog measured. Findings below would be about the wrong patient.")
        for t in trip:
            print(f"  {t['invariant']}: {t['detail']}")
        return 1
    starters, flex_slots, rounds, teams = dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS, 16, 8
    ob = sorted(board["players"], key=lambda r: r["r"])
    oa, adp_src = adp_order(board)
    pol = FastPolicy(board, curve, starters, flex_slots, rounds)
    get_top = lambda room: pol.choose(room)

    scenarios = {"round1": ROUND1, "round2": ROUND2, "round3": ROUND3}[scenario_set]
    counts = Counter()
    findings = []
    per = max(1, rooms_n // len(scenarios))
    total = 0
    for sc in scenarios:
        names, sigma, miss_at = sc["names"], sc["sigma"], sc.get("miss_at")
        for j in range(per):
            i = total
            total += 1
            my_slot = (i % 8) + 1
            rng = random.Random(f"{seed}:{i}")
            seats = make_seats(names, sigma, board, curve, starters, flex_slots, my_slot,
                               ob, oa, get_top)
            room = Room(board, curve, seats, my_slot=my_slot, teams=teams, rounds=rounds,
                        draft_id=f"chamber-{seed}-{i}", rng=rng)
            actor = (StaticDrainPolicy(pol, miss_at, oa, starters, flex_slots).choose
                     if miss_at else pol.choose)
            res = run_room(room, actor, starters, flex_slots, rounds)
            counts[res["status"]] += 1
            if res["status"] != "PASS":
                findings.append({"room": i, "scenario": names, "sigma": sigma,
                                 "miss_at": miss_at, "my_slot": my_slot,
                                 **{k: res[k] for k in
                                 ("status", "violations", "infeasible", "events",
                                  "lineup", "roster")}})
    # H4: the three counts must sum to rooms generated -- printed, never implied.
    print(f"battery: {total} rooms -> PASS {counts['PASS']} · FINDING {counts['FINDING']} · "
          f"INFEASIBLE {counts['INFEASIBLE']} (sum {sum(counts.values())})")
    print(f"battery: ADP source = {adp_src}")
    print("battery: catalog ratified by Briggsy 2026-08-20 (\"gate's open\") -- results are "
          "readable. Findings still owe Phase 3: minimal repro + adversarial verification "
          "before anyone acts on one (plan D6).")
    if report:
        with open(report, "w", encoding="utf-8") as f:
            json.dump({"rooms": total, "counts": dict(counts), "adp_source": adp_src,
                       "findings": findings}, f, ensure_ascii=False, indent=1, default=str)
        print(f"battery: report written to {report}")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("cmd", choices=["control-030", "control-closed-form", "control-mutants",
                                    "equivalence", "battery"])
    ap.add_argument("--rooms", type=int, default=20)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--sigma", type=float, default=6.0)
    ap.add_argument("--report", default=None,
                    help="battery: write the JSON report here (sandbox path, never state/)")
    ap.add_argument("--set", dest="scenario_set", default="round1",
                    choices=["round1", "round2", "round3"],
                    help="battery: which scenario battery to fire (round2 = static-drain "
                         "off-policy probes + milder hoarding)")
    a = ap.parse_args(argv)
    if a.cmd == "control-030":
        return control_030()
    if a.cmd == "control-closed-form":
        return control_closed_form()
    if a.cmd == "control-mutants":
        return control_mutants()
    if a.cmd == "equivalence":
        return equivalence(a.rooms, a.sigma, a.seed)
    return battery(a.rooms, a.seed, a.report, a.scenario_set)


if __name__ == "__main__":
    raise SystemExit(main())

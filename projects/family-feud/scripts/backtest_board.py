#!/usr/bin/env python3
"""U18 -- does the board's valuation actually draft a better team than the alternatives?

WHY THIS EXISTS. On 2026-08-14 the opponent model was killed because it could not beat a dumb
constant out of sample (insight 022). Hours later `realized_value.py` produced a finding I liked
and I proposed shipping it to the board on the strength of an IN-SAMPLE measurement. Same
session, two standards. This file applies the harsher one to our own idea.

THE TEST. For each held-out season, build every valuation from seasons BEFORE it only, run a real
8-team snake draft, and score the actual points of the best legal starting lineup.

  ORDER      what the board ships today: value[pos][k] = points of whoever FINISHED kth
  REALISED   scripts/realized_value.py: value[pos][k] = points the player RANKED kth returned
  ADP        🚨 THE FLOOR. Ignores both curves; drafts straight down the consensus list.

⚠️ **THE FLOOR MUST BE ABLE TO EMBARRASS THE BOARD WE ALREADY SHIP, not only the challenger.**
If neither curve beats "just take the consensus order", then the whole VBD apparatus is
decoration and that is the finding, however unwelcome. A test that can only produce the answer I
want is not a test.

NO LEAKAGE. Every curve for season Y is built from seasons < Y. A curve that has seen the answer
is the fastest way to fake a result, so `train_years()` is a single function and it is tested.

WHAT IS DELIBERATELY EXCLUDED. K and DEF. There is no exact DEF source (a standing decision, see
TODO) so their points cannot be scored honestly. Every arm would spend the same two late picks on
them -- the room takes no K before round 10 in 18 of 18 measured drafts -- so dropping them is
neutral between arms and removes noise nothing here can price. The draft is therefore 14 rounds
of skill positions and the lineup scored is QB/RB/RB/WR/WR/TE/FLEX/FLEX.

WHAT THE OPPONENTS DO. They draft best-available by ADP. That is a proxy, it is certainly not
exactly right, and it is IDENTICAL ACROSS ARMS -- so it cannot bias the comparison, only the
absolute level. Every slot 1-8 is run and averaged, so seat luck cancels too.
"""
import argparse
import collections
import itertools
import os
import statistics
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import realized_value as RV  # noqa: E402

POSITIONS = RV.POSITIONS
TEAMS = 8
ROUNDS = 14
#: QB·RB·RB·WR·WR·TE·FLEX·FLEX, read off the live league object 2026-08-14 with K/DEF dropped.
STARTERS = {"QB": 1, "RB": 2, "WR": 2, "TE": 1}
FLEX_SLOTS = 2
FLEX_OK = ("RB", "WR", "TE")
#: Roster caps so a pure-value bot cannot draft eight quarterbacks. Identical across arms.
CAPS = {"QB": 2, "RB": 6, "WR": 6, "TE": 3}
MIN_TRAIN_SEASONS = 3
#: Marginal value is evaluated over the best N legal names, not the whole board -- a pure
#: efficiency bound, and 40 is far past where any pick is actually decided.
CANDIDATE_WINDOW = 40


def train_years(target, available):
    """Seasons a valuation for `target` may use. STRICTLY earlier -- nothing else."""
    return tuple(y for y in sorted(available) if y < target)


def replacement_fill(proj):
    """{pos: points of this arm's own curve at the board's baseline rank}.

    The baseline RANKS come from the board's meta.vbd and are read, never re-typed. The baseline
    POINTS come from each arm's OWN curve on its OWN training seasons, so no arm is handed the
    other's replacement level and nothing crosses the leakage line."""
    base_rank = RV.baselines()
    return {pos: proj[(pos, base_rank[pos])] for pos in POSITIONS
            if (pos, base_rank[pos]) in proj}


def marginal_value(proj, roster_proj, pos, k, fill):
    """What this player ADDS TO A STARTABLE LINEUP -- the correct way to spend a pick.

    🚨 WITHOUT THIS THE VALUE ARMS ARE A STRAWMAN. Greedy VORP-max with position caps drafted
    SIX running backs in the first six rounds (measured on 2023) and then scrambled for a
    quarterback, because raw vorp has no idea you can only start two backs and two flex. Nobody
    drafts that way off this board, so beating it proves nothing about the board.

    Marginal lineup value handles positional saturation for free -- the third back is worth only
    what he adds as a FLEX, and the seventh is worth nothing. It still needs `fill`, the
    replacement level an undrafted slot is worth; see best_lineup for why an empty slot is the
    wrong counterfactual.
    """
    v = proj.get((pos, k))
    if v is None:
        return None
    before = best_lineup(roster_proj, fill)
    after = dict(roster_proj)
    after[pos] = after.get(pos, []) + [v]
    return best_lineup(after, fill) - before


def _raw(per, n):
    """Mean points per (pos, rank). No baseline -- `marginal_value` encodes it structurally."""
    return {key: statistics.mean(v) for key, v in per.items() if len(v) == n}


def order_curve(seasons_actual):
    """value[(pos, k)] = mean points of whoever FINISHED kth. What the board ships."""
    per = collections.defaultdict(list)
    for actual in seasons_actual:
        for pos in POSITIONS:
            finish = sorted((v for (nm, p), v in actual.items() if p == pos), reverse=True)
            for k, v in enumerate(finish, 1):
                per[(pos, k)].append(v)
    return _raw(per, len(seasons_actual))


def realised_curve(seasons):
    """value[(pos, k)] = mean points the player RANKED kth actually scored."""
    per = collections.defaultdict(list)
    for ranks, actual in seasons:
        joined = [(nm, p) for nm, p in ranks if (nm, p) in actual]
        for pos in POSITIONS:
            ranked = [key for key in joined if key[1] == pos]
            for k, key in enumerate(ranked, 1):
                per[(pos, k)].append(actual[key])
    return _raw(per, len(seasons))


def best_lineup(roster_pts, fill=None):
    """Points of the best legal starting lineup. {pos: [points]} -> float.

    Required slots are position-specific and FLEX is a superset of RB/WR/TE, so filling the
    required slots with the best at each position and then FLEX from whatever remains is optimal
    -- you must start two backs whatever else you hold.

    `fill` is the points an UNFILLED starter slot is worth.
      * None (scoring)  -> zero. An empty slot really does score nothing on Sunday.
      * {pos: pts}      -> replacement level, and this is what makes the draft logic VBD.

    🚨 WHY `fill` EXISTS. Marginal value over an EMPTY lineup is just raw points, so at pick 1.1
    every slot is empty and the model degenerates to "who scores most" -- which is always a
    quarterback. Measured: the arm took a QB first overall. The correct counterfactual is not an
    empty slot but THE PLAYER YOU COULD GET AT THAT SLOT LATER, which is replacement level. With
    the lineup notionally pre-filled at replacement, the first back is worth ~272 over his
    baseline and the first quarterback ~127 over his, which is the whole point of value-based
    drafting -- and saturation still falls out for free, because a seventh back improves nothing.
    """
    pool = {p: sorted(v, reverse=True) for p, v in roster_pts.items()}
    total, leftover = 0.0, []
    for pos, n in STARTERS.items():
        take = pool.get(pos, [])[:n]
        if len(take) < n:
            pad = 0.0 if fill is None else fill.get(pos, 0.0)
            take = take + [pad] * (n - len(take))
        total += sum(take)
        leftover += pool.get(pos, [])[n:] if pos in FLEX_OK else []
    flex = sorted(leftover, reverse=True)[:FLEX_SLOTS]
    if len(flex) < FLEX_SLOTS:
        pad = 0.0 if fill is None else max(fill.get(p, 0.0) for p in FLEX_OK)
        flex = flex + [pad] * (FLEX_SLOTS - len(flex))
    return total + sum(flex)


def must_fill(counts):
    """Positions this roster still HAS to draft, and how many picks that needs.

    🚨 WITHOUT THIS THE TEST IS CIRCULAR. `best_lineup` scores an empty starter slot as zero, so
    an arm whose curve says quarterbacks are worthless simply never drafts one and eats a 0 --
    which is precisely what the REALISED curve says, so the test would punish the model for its
    own conclusion. No real manager does that: he takes a quarterback late and collects
    replacement-level production. Applied identically to every arm, including the floor.
    """
    need = {"QB": max(0, STARTERS["QB"] - counts["QB"]),
            "RB": max(0, STARTERS["RB"] - counts["RB"]),
            "WR": max(0, STARTERS["WR"] - counts["WR"]),
            "TE": max(0, STARTERS["TE"] - counts["TE"])}
    spare = sum(max(0, counts[p] - STARTERS[p]) for p in FLEX_OK)
    flex_need = max(0, FLEX_SLOTS - spare)
    return need, flex_need, sum(need.values()) + flex_need


def run_draft(pool, value, my_slot):
    """One 8-team snake. `pool` is [(pos, name, points)] in ADP order. `value` maps
    (pos, positional_rank) -> number, or None to draft straight down ADP.

    Returns the points of our best legal starting lineup.
    """
    pos_rank = {}
    seen = collections.Counter()
    for i, (pos, nm, pts) in enumerate(pool):
        seen[pos] += 1
        pos_rank[i] = seen[pos]

    fill = replacement_fill(value) if value is not None else None
    taken = set()
    rosters = collections.defaultdict(lambda: collections.defaultdict(list))   # PROJECTED
    actual_r = collections.defaultdict(lambda: collections.defaultdict(list))  # REALISED points
    counts = collections.defaultdict(collections.Counter)

    for rnd in range(1, ROUNDS + 1):
        order = range(1, TEAMS + 1) if rnd % 2 else range(TEAMS, 0, -1)
        for seat in order:
            mine = seat == my_slot
            best_i = None
            best_v = None
            cand = 0
            # With exactly as many picks left as unfilled starter slots, every remaining pick is
            # forced. Restrict to positions that actually reduce the shortfall.
            need, flex_need, total_need = must_fill(counts[seat])
            rounds_left = ROUNDS - rnd + 1
            forced = None
            if rounds_left <= total_need:
                forced = {p for p in POSITIONS if need[p] > 0}
                if flex_need > 0:
                    forced |= set(FLEX_OK)
            for i, (pos, nm, pts) in enumerate(pool):
                if i in taken or counts[seat][pos] >= CAPS[pos]:
                    continue
                if forced and pos not in forced:
                    continue
                if not mine or value is None:
                    best_i = i                 # ADP order: the first legal name is the pick
                    break
                cand += 1
                if cand > CANDIDATE_WINDOW:    # nobody's 40th-best available is the marginal pick
                    break
                v = marginal_value(value, rosters[seat], pos, pos_rank[i], fill)
                if v is None:
                    continue
                if best_v is None or v > best_v:
                    best_v, best_i = v, i
            if best_i is None:                 # nothing legal left for this seat
                continue
            pos, nm, pts = pool[best_i]
            taken.add(best_i)
            counts[seat][pos] += 1
            actual_r[seat][pos].append(pts)
            # The roster used for FUTURE marginal calls holds PROJECTED value, never the actual
            # points -- using the outcome would leak the answer into the draft that produced it.
            if value is not None:
                pv = value.get((pos, pos_rank[best_i]))
                rosters[seat][pos].append(pv if pv is not None else 0.0)
    mine = best_lineup(actual_r[my_slot])
    others = [best_lineup(actual_r[s]) for s in range(1, TEAMS + 1) if s != my_slot]
    # MARGIN OVER THE ROOM, measured INSIDE the same draft. The season effect (a high-scoring
    # year lifts everybody) and the pool effect cancel exactly, which is the only way to get a
    # resolvable answer out of seven seasons.
    return mine, mine - statistics.mean(others)


def load(years, quiet=True):
    """{year: (ranks, actual)} for every season that produces a usable measurement."""
    out = {}
    for y in years:
        try:
            ranks, n_drafts = RV.preseason_ranks(y)
            if n_drafts < RV.MIN_DRAFTS:
                raise RV.Refuse(f"{y}: ADP over only {n_drafts} drafts")
            actual = RV.actual_points(y)
        except RV.Refuse as e:
            if not quiet:
                print(f"  skip {e}")
            continue
        out[y] = (ranks, actual)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--first-test", type=int, default=2019,
                    help="earliest season to hold out (needs MIN_TRAIN_SEASONS before it)")
    ap.add_argument("--years", default="2015-2025")
    args = ap.parse_args()
    lo, _, hi = args.years.partition("-")
    years = tuple(range(int(lo), int(hi) + 1))

    print("  loading seasons (ADP + actual scoring)...")
    seasons = load(years)
    print(f"  {len(seasons)} usable seasons: {sorted(seasons)}\n")

    results = collections.defaultdict(list)
    per_season = {}
    per_season_margin = {}
    for target in sorted(seasons):
        tr = train_years(target, seasons)
        if len(tr) < MIN_TRAIN_SEASONS or target < args.first_test:
            continue
        assert target not in tr, "LEAKAGE: the held-out season is in its own training set"
        oc = order_curve([seasons[y][1] for y in tr])
        rc = realised_curve([seasons[y] for y in tr])

        ranks, actual = seasons[target]
        pool = [(p, nm, actual[(nm, p)]) for nm, p in ranks if (nm, p) in actual]

        row, margin = {}, {}
        for label, val in (("ORDER", oc), ("REALISED", rc), ("ADP floor", None)):
            runs = [run_draft(pool, val, slot) for slot in range(1, TEAMS + 1)]
            row[label] = statistics.mean(p for p, _m in runs)
            margin[label] = statistics.mean(m for _p, m in runs)
            results[label] += [p for p, _m in runs]
        per_season[target] = (row, len(tr))
        per_season_margin[target] = margin

    print(f"=== LEAKAGE-FREE BACKTEST · {TEAMS}-team snake · {ROUNDS} rounds · "
          f"all {TEAMS} slots averaged ===")
    print("  starting-lineup points (QB/RB/RB/WR/WR/TE/FLEX/FLEX), higher is better\n")
    print(f"  {'season':>7} {'train':>6} {'ORDER':>10} {'REALISED':>10} {'ADP floor':>11}"
          f"   {'winner':<10}")
    for target, (row, ntr) in sorted(per_season.items()):
        win = max(row, key=row.get)
        print(f"  {target:>7} {ntr:>6} {row['ORDER']:10.1f} {row['REALISED']:10.1f} "
              f"{row['ADP floor']:11.1f}   {win:<10}")

    print(f"\n  {'ALL':>7} {'':>6} " + " ".join(
        f"{statistics.mean(results[k]):10.1f}" for k in ("ORDER", "REALISED")) +
        f" {statistics.mean(results['ADP floor']):11.1f}")
    n = len(results["ORDER"])
    print(f"\n  n = {n} drafts per arm ({len(per_season)} seasons x {TEAMS} slots)")
    for k in ("ORDER", "REALISED", "ADP floor"):
        m = statistics.mean(results[k])
        sd = statistics.pstdev(results[k])
        print(f"  {k:<10} mean {m:8.1f}  sd {sd:7.1f}  SEM {sd/n**0.5:6.1f}")

    # 🚨 THE INDEPENDENT UNIT IS THE SEASON, NOT THE DRAFT. All 8 slots in one season share the
    # same player outcomes -- if the consensus RB1 tears an ACL, every slot that drafted him is
    # wrong together. Treating 56 drafts as 56 independent observations shrinks the SEM by ~2.6x
    # and manufactures significance. The first version of this file did exactly that, which is
    # insight 022's own "count the unit you are quoting" corollary, made again in the very next
    # script. Both are printed so the inflation is visible rather than taken on trust.
    print("\n  PAIRED DIFFERENCES")
    print("    per-slot n=56 treats correlated drafts as independent -- shown only to expose it")
    print(f"    {'comparison':<24} {'mean':>9} {'SEM(season)':>12} {'sigma':>7}   "
          f"{'verdict':<20} {'[inflated SEM(slot)]':>22}")
    for a, b in itertools.combinations(("ORDER", "REALISED", "ADP floor"), 2):
        per_slot = [x - y for x, y in zip(results[a], results[b])]
        by_season = [per_season[t][0][a] - per_season[t][0][b] for t in sorted(per_season)]
        m = statistics.mean(by_season)
        sem = statistics.stdev(by_season) / len(by_season) ** 0.5
        sem_slot = statistics.pstdev(per_slot) / len(per_slot) ** 0.5
        sig = abs(m) / sem if sem else 0.0
        verdict = ("indistinguishable" if sig < 2
                   else (f"{a} wins" if m > 0 else f"{b} wins"))
        print(f"    {a + ' - ' + b:<24} {m:+9.1f} {sem:12.1f} {sig:7.1f}   {verdict:<20} "
              f"{sem_slot:22.1f}")
    print(f"\n    n = {len(per_season)} seasons. With this few, only a very large effect is "
          f"resolvable;\n    a null result here means UNRESOLVED, not EQUAL.")

    # ---- the within-draft design, which is where the power actually comes from -----------------
    # Scoring against the seven opponents INSIDE the same draft cancels the season effect (a
    # high-scoring year lifts everyone) and the pool effect. It also buys a free positive
    # control, because one arm plays the same strategy as the opponents it is measured against.
    arms = ("ORDER", "REALISED", "ADP floor")
    print("\n\n=== MARGIN OVER THE ROOM (scored inside each draft; season effect cancelled) ===")
    print("  our starting lineup minus the mean of the seven ADP opponents in the SAME draft\n")
    print(f"  {'season':>7} " + "".join(f"{k:>12}" for k in arms))
    for t in sorted(per_season_margin):
        print(f"  {t:>7} " + "".join(f"{per_season_margin[t][k]:12.1f}" for k in arms))
    print()
    for k in arms:
        by_season = [per_season_margin[t][k] for t in sorted(per_season_margin)]
        m = statistics.mean(by_season)
        sem = statistics.stdev(by_season) / len(by_season) ** 0.5
        note = ""
        if k == "ADP floor":
            # ⚠️ NOT A CONTROL -- AN ARITHMETIC IDENTITY, and it was mislabelled as a control
            # when first written. This arm plays the same strategy as all seven opponents, so
            # across the 8 slots the margins sum to zero by construction:
            #     sum_s [ x_s - (S - x_s)/7 ] = S - (8S - S)/7 = 0
            # It can therefore only ever print 0.000, whatever the simulator does, and it is
            # evidence of NOTHING about seat bias. It is kept because a non-zero value would
            # mean the margin arithmetic itself is broken -- a bug detector, not a finding.
            note = ("   <-- ARITHMETIC IDENTITY, not a control: this arm plays its opponents'\n"
                    + " " * 14 + "own strategy, so the 8 slot margins sum to zero by "
                    "construction. Only a\n" + " " * 14 + "bug detector. Anything non-zero here "
                    "means the margin math is broken.")
        print(f"  {k:<10} margin {m:+8.1f}   SEM {sem:6.1f}   "
              f"({abs(m) / sem if sem else 0:.1f} sigma from zero){note}")


if __name__ == "__main__":
    main()

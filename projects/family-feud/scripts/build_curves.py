#!/usr/bin/env python3
"""U5 — build the empirical VORP curve from nflverse weekly stats.

    python3 scripts/build_curves.py            # use the cache, fetch what is missing
    python3 scripts/build_curves.py --refetch   # re-download every season
    python3 scripts/build_curves.py --check     # compute and report, write nothing

Run from the project root. Writes `draft-kit/vorp_curve.json`.

WHAT THE CURVE IS. For each position, average the season total of the Nth-best finisher across
the last four completed seasons. "RB41 = 118.7" therefore means "the 41st-best RB averages 118.7
points a season", which is what makes it a replacement baseline.

WHAT THE CURVE IS NOT -- and this is load-bearing doctrine, not a caveat. It is an ORDER
STATISTIC ON REALISED OUTCOMES: the player who finishes RB1 is whoever's variance broke best
that year, so the value describes NO IDENTIFIABLE PLAYER and mapping it onto a preseason rank
inflates the elite tier. See docs/insights/005. What survives is everything CROSS-POSITIONAL --
RB41 = 118.7 vs WR47 = 148.0 is the arithmetic behind the rounds 3-5 RB-over-WR tie-breaker.
What does not survive is using it to separate two players inside one tier.

TWO THINGS THIS PIPELINE CANNOT DO, both recorded in the output rather than papered over:

1. IT DOES NOT REPRODUCE THE AUG 5 BOARD. The plan's acceptance test was "within 0.1 MAD of the
   current board". Measured across every plausible configuration of THIS source -- four
   candidate season windows x interception value x regular-season-only x position field -- the
   best achievable is 1.84 MAD, and it is this configuration. The arithmetic is not the problem:
   the scoring engine reproduces nflverse's own PPR totals EXACTLY, 2469 of 2469 player-seasons.

2. IT EXCLUDES THE LONG-TD BONUSES. league.md scores +1 at 40+ yards and +2 at 50+ on pass, rush
   and receiving TDs, and they stack. nflverse's WEEKLY stats carry no touchdown-distance
   breakdown, so the bonus is not computable from this source. Every curve records
   `excludes: ["long_td_bonus"]`, because a number that silently drops a scoring rule is a lie
   with a decimal point on it.

BOTH GAPS HAVE ONE CAUSE AND ONE KNOWN ROUTE OUT: THE SOURCE. docs/ranking-methodology.md says
the original curve came from nflverse **play-by-play**, not these weekly stats -- and that is
the difference that matters:
  * `player_stats_*.csv` stops at 2024. There is no 2025 asset in that release.
  * `play_by_play_*.csv.gz` DOES publish 2025 (verified: 48,771 plays, HTTP 200, ~19MB).
    Play-by-play also carries per-play yardage, which is where the 40+/50+ TD bonus comes from.
So the season window the board used (2022-2025) and the bonus rule are BOTH reachable -- from
play-by-play, not from here.

That route was prototyped and measured rather than assumed, and it is NOT yet exact: aggregating
2024 play-by-play and scoring it under the same oracle rules reproduces 554 of 607 player-seasons
exactly, 20 more within 2 points, and 33 off by multiples of six -- touchdown attribution
(laterals, fumble-recovery TDs, two-point edge cases). Closing that means reimplementing
nflverse's own stat builder, and shipping a curve carrying unquantified attribution error would
be strictly worse than shipping one whose basis is narrower but EXACT. So this pipeline uses the
exact source, states its two limits in its own output, and leaves the measurement above as the
starting point for whoever closes it.
"""
import argparse
import collections
import csv
import json
import os
import statistics
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "draft-kit", "cache")
OUT = os.path.join(ROOT, "draft-kit", "vorp_curve.json")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from scoring import score, kicker_points, FAMILY_FEUD  # noqa: E402


def _num(v):
    """Blank cells and 'NA' mean zero -- a kicker who did not play still has a row."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream degrades, never crashes
    pass

URL = ("https://github.com/nflverse/nflverse-data/releases/download/player_stats/"
       "player_stats_{year}.csv")
# The plan named `stats_player_week_{year}.csv`. nflverse has since renamed the asset; corrected
# here rather than by reopening the plan, per its own instruction.

KICK_URL = ("https://github.com/nflverse/nflverse-data/releases/download/player_stats/"
            "player_stats_kicking_{year}.csv")

SEASONS = (2021, 2022, 2023, 2024)
POSITIONS = ("QB", "RB", "WR", "TE")
CURVE_DEPTH = 80                        # deep enough for every baseline; RB41/WR47 are the deepest

#: nflverse publishes field-goal makes ALREADY BUCKETED BY DISTANCE, and the buckets map exactly
#: onto league.md's kicker bands (0-39: 3 · 40-49: 4 · 50-59: 5 · 60+: 6). Nothing is inferred and
#: no attempt distance is re-derived -- which is what makes K an EXACT build, the same standard as
#: the four skill positions, rather than the approximation DEF would be.
#: VERIFIED before trusting the mapping: the six buckets sum to `fg_made` on all 542 REG rows of
#: 2024. If they ever stop summing, makes are being scored at zero and the curve sags silently.
FG_BANDS = {"0-39": ("fg_made_0_19", "fg_made_20_29", "fg_made_30_39"),
            "40-49": ("fg_made_40_49",), "50-59": ("fg_made_50_59",), "60+": ("fg_made_60_",)}

#: ⚠️ A BLOCKED FIELD GOAL IS NEITHER A MAKE NOR A MISS IN THIS SOURCE. Measured on 2024:
#: `fg_att` (1115) == `fg_made` (937) + `fg_missed` (160) + `fg_blocked` (18), so `fg_missed`
#: EXCLUDES blocks. league.md says "miss: -1" and does not say whether a block is a miss, so this
#: is a genuine unstated rule rather than a reading error. It is counted as a miss here -- a
#: blocked kick is a failed attempt -- and `--check` prints the sensitivity both ways so the
#: choice is bounded rather than assumed. 18 blocks across 1,115 attempts is 1.6%.
COUNT_BLOCKED_AS_MISS = True


def season_path(year, kicking=False):
    stem = "player_stats_kicking" if kicking else "player_stats"
    return os.path.join(CACHE, f"{stem}_{year}.csv")


def fetch_season(year, timeout=120, kicking=False):
    """Returns (path, note). A season that does not exist upstream is ABSENT, not an error --
    2025 and 2026 both 404 today and a pipeline that crashes on that is unusable all preseason."""
    path = season_path(year, kicking)
    url = (KICK_URL if kicking else URL).format(year=year)
    label = f"{year} kicking" if kicking else str(year)
    os.makedirs(CACHE, exist_ok=True)
    p = subprocess.run(["curl", "-sL", "--max-time", str(timeout), "-w", "%{http_code}",
                        "-o", path, url],
                       capture_output=True, text=True)
    code = (p.stdout or "").strip()[-3:]
    if code != "200" or os.path.getsize(path) < 1024:
        if os.path.exists(path):
            os.remove(path)             # never leave a 9-byte "Not Found" looking like cargo
        return None, f"{label}: not published upstream (HTTP {code or '?'})"
    return path, f"{label}: fetched {os.path.getsize(path):,} bytes"


def kicking_row_points(row, count_blocked=COUNT_BLOCKED_AS_MISS):
    """One kicker-week -> (points, buckets_summed). Pure; no I/O.

    `buckets_summed` is returned rather than raised on so the caller can count how many rows are
    affected before deciding -- one odd row and a moved schema need different responses, and a
    per-row raise would report the first instead of the scale.
    """
    made = {band: sum(_num(row.get(c)) for c in cols) for band, cols in FG_BANDS.items()}
    summed = sum(made.values()) == _num(row.get("fg_made"))
    missed = _num(row.get("fg_missed"))
    if count_blocked:
        missed += _num(row.get("fg_blocked"))
    return kicker_points(made, missed=missed,
                         xp_made=_num(row.get("pat_made")),
                         xp_missed=_num(row.get("pat_missed"))), summed


def load_kicking_season(year, refetch=False, count_blocked=COUNT_BLOCKED_AS_MISS):
    """Season kicking totals by player id, scored through `scoring.kicker_points`.

    Returns (totals, notes). The scoring rules are NOT re-typed here -- `kicker_points` is the
    executable form of league.md and already existed; this only feeds it.
    """
    path = season_path(year, kicking=True)
    notes = []
    if refetch or not os.path.exists(path) or os.path.getsize(path) < 1024:
        path, note = fetch_season(year, kicking=True)
        notes.append(note)
        if path is None:
            return None, notes
    totals = collections.defaultdict(float)
    unsummed = 0
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("season_type") != "REG":
                continue
            pid = row.get("player_id")
            if not pid:
                continue
            pts, summed = kicking_row_points(row, count_blocked)
            unsummed += 0 if summed else 1
            totals[pid] += pts
    if unsummed:
        # Never a silent sag: if the buckets stop summing to fg_made, makes are scoring zero.
        raise SystemExit(f"{year} kicking: distance buckets do not sum to fg_made on {unsummed} "
                         f"row(s) -- the source's schema moved and every K value would be low")
    return totals, notes


def load_season(year, refetch=False):
    path = season_path(year)
    notes = []
    if refetch or not os.path.exists(path) or os.path.getsize(path) < 1024:
        path, note = fetch_season(year)
        notes.append(note)
        if path is None:
            return None, notes
    totals = collections.defaultdict(float)
    position = {}
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            # Regular season only. Playoff weeks are not part of a fantasy season and folding
            # them in would reward the same handful of teams every year.
            if row.get("season_type") != "REG":
                continue
            pid = row.get("player_id")
            if not pid:
                continue
            position.setdefault(pid, (row.get("position") or "").strip())
            totals[pid] += score(row, FAMILY_FEUD)
    return (totals, position), notes


def build(seasons=SEASONS, refetch=False, depth=CURVE_DEPTH, count_blocked=COUNT_BLOCKED_AS_MISS):
    per_rank = collections.defaultdict(list)
    used, used_k, notes = [], [], []
    for year in seasons:
        loaded, n = load_season(year, refetch)
        notes += n
        if loaded is None:
            continue
        totals, position = loaded
        used.append(year)
        for pos in POSITIONS:
            vals = sorted((v for pid, v in totals.items() if position.get(pid) == pos),
                          reverse=True)
            for rank, v in enumerate(vals[:depth], 1):
                per_rank[(pos, rank)].append(v)

    # KICKERS COME FROM A DIFFERENT ASSET, so a season missing one file must not cost the other.
    # `player_stats_*.csv` carries no field-goal distances at all -- K is not a position you can
    # extract from the skill file, which is why it was absent from this curve for so long.
    for year in seasons:
        totals, n = load_kicking_season(year, refetch, count_blocked)
        notes += n
        if totals is None:
            continue
        used_k.append(year)
        for rank, v in enumerate(sorted(totals.values(), reverse=True)[:depth], 1):
            per_rank[("K", rank)].append(v)

    if not used:
        raise SystemExit("no season data available at all -- refusing to emit an empty curve")
    curve = {pos: _table(per_rank, pos, len(used), depth) for pos in POSITIONS}
    if used_k:
        curve["K"] = _table(per_rank, "K", len(used_k), depth)
    return curve, used, notes, used_k


def _table(per_rank, pos, n_seasons, depth):
    """Ranks that EVERY contributing season actually supplies, and no deeper.

    THE CURVE IS A MEAN OF ORDER STATISTICS, so a rank only means something if the same number of
    seasons went into it. Past the shallowest season's roster the mean silently starts averaging a
    DIFFERENT population -- three seasons instead of four -- and the curve stops being monotone,
    which is the visible symptom of a value that is no longer comparable to the rank above it.

    Measured 2026-08-08: all four seasons supply QB to rank 78, RB 135, WR 212, TE 116 and K 41.
    The shipped 80-deep curve therefore carried a real inversion at QB78 -- harmless in practice
    (the board is 23 QBs deep and the baseline is QB12) but wrong, and it was found by asserting
    monotonicity on the new K curve rather than by anything looking at QB. K makes it obvious
    because kickers are the shallowest position there is: 41 in 2023 against 49 in 2021.

    Coverage falls off monotonically with rank, so the first short rank ends the curve.
    """
    out = {}
    for r in range(1, depth + 1):
        vals = per_rank[(pos, r)]
        if len(vals) != n_seasons:
            break
        out[str(r)] = round(statistics.mean(vals), 1)
    return out


def baselines_from_board(board_path=os.path.join(ROOT, "draft-kit", "players_data.json")):
    """READ the baseline RANKS, never re-type them. They already exist in meta.vbd, in the board
    HTML's prose and in the methodology doc; a fourth copy is a fourth thing to drift."""
    with open(board_path, encoding="utf-8") as f:
        vbd = (json.load(f).get("meta") or {}).get("vbd") or {}
    return vbd.get("baselineWaiver") or {}, vbd.get("lastStarter") or {}


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build the empirical VORP curve.")
    ap.add_argument("--refetch", action="store_true", help="re-download every season")
    ap.add_argument("--check", action="store_true", help="compute and report; write nothing")
    a = ap.parse_args(argv)

    curve, used, notes, used_k = build(refetch=a.refetch)
    for n in notes:
        print(f"  {n}")
    waiver, last = baselines_from_board()
    payload = {
        "meta": {
            "seasons": used,
            "seasons_kicking": used_k,
            "source": URL.format(year="<year>"),
            "source_kicking": KICK_URL.format(year="<year>"),
            "kicker_note": (
                "K is an EXACT build, not an approximation: nflverse publishes field-goal makes "
                "already bucketed by distance and the buckets map 1:1 onto league.md's bands. A "
                "blocked FG is neither a make nor a miss in this source (fg_att == made + missed "
                "+ blocked, measured), and league.md does not say which it is; blocks are counted "
                f"as misses here (count_blocked={COUNT_BLOCKED_AS_MISS}) and --check prints the "
                "sensitivity both ways."),
            "no_def_note": (
                "DEF is deliberately absent. player_stats_def_*.csv is PLAYER-level and carries no "
                "points allowed at all -- the largest term in the DST ladder -- so a DEF curve "
                "would need a second source joined on schedule plus an unconfirmed assumption "
                "about Sleeper's points-allowed convention. A narrower EXACT basis beats a wider "
                "approximate one; DEF rows stay labelled carried:kdef-tier-flat."),
            "scoring": "docs/league.md (Family Feud, full PPR)",
            "excludes": ["long_td_bonus"],
            "excludes_note": ("league.md scores +1 at 40+ and +2 at 50+ on pass/rush/rec TDs and "
                              "they stack; nflverse weekly stats carry no TD-distance breakdown, "
                              "so the bonus is not computable from this source"),
            "reproduces_aug5_board": False,
            "reproduces_note": ("the Aug 5 board's curve was built on 2022-2025 from nflverse "
                                "PLAY-BY-PLAY; player_stats publishes no 2025 asset, and carries "
                                "no TD-distance breakdown. Best achievable agreement from this "
                                "source is 1.84 MAD on the four baselines. play_by_play_2025 "
                                "does exist and is the route to closing both gaps -- see the "
                                "module docstring for the measured starting point."),
        },
        "curve": curve,
    }
    print(f"\ncurve built from {used} ({len(used)} season(s)), regular season only")
    for pos, rank in sorted(waiver.items()):
        got = curve.get(pos, {}).get(str(rank))
        print(f"  waiver baseline {pos}{rank}: {got}")
    for pos, rank in sorted(last.items()):
        got = curve.get(pos, {}).get(str(rank))
        print(f"  last starter    {pos}{rank}: {got}")
    if "K" in curve:
        k = curve["K"]
        print(f"\nkicker curve from {used_k}: {len(k)} ranks, K1 {k.get('1')} -> "
              f"K{len(k)} {k.get(str(len(k)))}")
        if "K" not in waiver:
            print("  NOTE: no K baseline in meta.vbd.baselineWaiver, so `vorp` for kickers stays")
            print("        carried:kdef-tier-flat. The curve alone is enough for rerank.py to")
            print("        derive K TIERS; VORP needs a replacement rank, which is a decision.")
        # Bound the one unstated rule rather than assuming it away.
        other, _, _, _ = build(refetch=False, count_blocked=not COUNT_BLOCKED_AS_MISS)
        deltas = [abs(k[r] - other["K"][r]) for r in k if r in other.get("K", {})]
        if deltas:
            print(f"  blocked-FG sensitivity: counting blocks the other way moves the curve by "
                  f"{min(deltas):.1f}-{max(deltas):.1f} pts "
                  f"(mean {sum(deltas)/len(deltas):.2f}) across {len(deltas)} ranks")

    if a.check:
        print(f"\n--check: nothing written. {OUT} is unchanged.")
        return 0
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    print(f"\nwrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

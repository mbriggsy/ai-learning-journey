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
from scoring import score, FAMILY_FEUD  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream degrades, never crashes
    pass

URL = ("https://github.com/nflverse/nflverse-data/releases/download/player_stats/"
       "player_stats_{year}.csv")
# The plan named `stats_player_week_{year}.csv`. nflverse has since renamed the asset; corrected
# here rather than by reopening the plan, per its own instruction.

SEASONS = (2021, 2022, 2023, 2024)
POSITIONS = ("QB", "RB", "WR", "TE")
CURVE_DEPTH = 80                        # deep enough for every baseline; RB41/WR47 are the deepest


def season_path(year):
    return os.path.join(CACHE, f"player_stats_{year}.csv")


def fetch_season(year, timeout=120):
    """Returns (path, note). A season that does not exist upstream is ABSENT, not an error --
    2025 and 2026 both 404 today and a pipeline that crashes on that is unusable all preseason."""
    path = season_path(year)
    os.makedirs(CACHE, exist_ok=True)
    p = subprocess.run(["curl", "-sL", "--max-time", str(timeout), "-w", "%{http_code}",
                        "-o", path, URL.format(year=year)],
                       capture_output=True, text=True)
    code = (p.stdout or "").strip()[-3:]
    if code != "200" or os.path.getsize(path) < 1024:
        if os.path.exists(path):
            os.remove(path)             # never leave a 9-byte "Not Found" looking like cargo
        return None, f"{year}: not published upstream (HTTP {code or '?'})"
    return path, f"{year}: fetched {os.path.getsize(path):,} bytes"


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


def build(seasons=SEASONS, refetch=False, depth=CURVE_DEPTH):
    per_rank = collections.defaultdict(list)
    used, notes = [], []
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
    if not used:
        raise SystemExit("no season data available at all -- refusing to emit an empty curve")
    curve = {pos: {str(r): round(statistics.mean(per_rank[(pos, r)]), 1)
                   for r in range(1, depth + 1) if per_rank[(pos, r)]}
             for pos in POSITIONS}
    return curve, used, notes


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

    curve, used, notes = build(refetch=a.refetch)
    for n in notes:
        print(f"  {n}")
    waiver, last = baselines_from_board()
    payload = {
        "meta": {
            "seasons": used,
            "source": URL.format(year="<year>"),
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

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

   ✅ **AND IT IS NOW MEASURED RATHER THAN ASSUMED — `--long-td-probe` (2026-08-17).** The bonus
   IS computable from the play-by-play cache, and the join is perfect (486 bonus rows over
   2022-2025, **0 unjoinable**). What the measurement found is the reason it still is not shipped
   by default, and it is not "the effect is small":
     * The raw effect is LARGEST at the position this project has the most doctrine about --
       **+8.7 at QB1 and +12.9 at QB6**, against +2.8 at RB1 and +1.0 at TE1 -- because the rule
       pays the PASSER as well as the receiver.
     * But the board prices VORP, not the raw curve, and the bonus lifts the QB12 BASELINE by
       +7.0 at the same time. It therefore **very nearly cancels**: QB1 VORP moves 129.7 -> 131.4,
       and QB1 as a share of RB1 goes **48% -> 49%**. The largest move anywhere is WR2 at +7.8,
       inside RB1's own sd of 19.3.
   So: **the bonus is nearly uniform within a position, so it cancels in the only number that
   decides a pick.** Folding it in is safe hygiene that changes no decision -- which is exactly
   why it belongs in a deliberate refresh with a human watching, not in a background rebuild.
   Until someone does that, this pipeline keeps excluding it AND keeps saying so.

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
import gzip
import json
import os
import statistics
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "draft-kit", "cache")
OUT = os.path.join(ROOT, "draft-kit", "vorp_curve.json")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from scoring import score, kicker_points, FAMILY_FEUD, STANDARD_PPR  # noqa: E402


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

# ⚠️ THE RENAME GOES THE OTHER WAY, AND BELIEVING OTHERWISE COST US THE 2025 SEASON.
# This file used to carry: "The plan named `stats_player_week_{year}.csv`. nflverse has since
# renamed the asset; corrected here rather than by reopening the plan." That is backwards, and the
# consequence was a year of data written off as unavailable. Measured 2026-08-09 against the GitHub
# releases API:
#   * release `stats_player`  -- published 2025-07-31, 542 assets, `stats_player_week_1999` ...
#     `stats_player_week_2025`. TWENTY-SEVEN seasons, four shapes each. This is the CURRENT one.
#   * release `player_stats`  -- FROZEN at 2024. `player_stats_2025.csv` is a hard 404, and it will
#     never publish 2026 either, so `legacy` is a dead end on a clock.
# The plan was right. Keep both here anyway: `legacy` is what every shipped number was built from,
# and a source swap that cannot be A/B'd against the old one is not a measurement.
SOURCES = {
    "legacy": {
        "url": ("https://github.com/nflverse/nflverse-data/releases/download/player_stats/"
                "player_stats_{year}.csv"),
        "kick_url": ("https://github.com/nflverse/nflverse-data/releases/download/player_stats/"
                     "player_stats_kicking_{year}.csv"),
        "stem": "player_stats",
        "kick_stem": "player_stats_kicking",
        "kicking_in_main": False,
        "aliases": {},
        "seasons": (2021, 2022, 2023, 2024),
    },
    "current": {
        "url": ("https://github.com/nflverse/nflverse-data/releases/download/stats_player/"
                "stats_player_week_{year}.csv"),
        # Kicking is FOLDED INTO the same file here -- fg_made_0_19 ... fg_made_60_, pat_made,
        # pat_missed, identical column names to the legacy kicking asset. Verified 2026-08-09
        # against player_stats_kicking_2024.csv: 45 of 45 kickers, 0 disagreements on every bucket.
        "kick_url": None,
        "stem": "stats_player_week",
        "kick_stem": "stats_player_week",
        "kicking_in_main": True,
        # ⚠️ THE SILENT-ZERO TRAP. `score()` reads `interceptions`; this release calls it
        # `passing_interceptions`. A missing key is _n(None) -> 0.0, so every INT would score zero
        # instead of -1 and NOTHING would raise. Measured cost of omitting just this one alias:
        # 58 of 1,997 player-seasons wrong on 2024, by up to 32.0 points. The oracle in
        # load_season() is what makes that impossible to ship, not this table -- a table only
        # covers the renames somebody thought of.
        "aliases": {"interceptions": "passing_interceptions",
                    "sacks": "sacks_suffered",
                    "sack_yards": "sack_yards_lost",
                    "recent_team": "team"},
        "seasons": (2022, 2023, 2024, 2025),
    },
}
# ✅ FLIPPED 2026-08-09 (Briggsy's call), after the swap was measured rather than argued.
# `legacy` is kept whole so the old basis stays reproducible and the A/B can be re-run, but every
# number the board ships now comes from `current`. What decided it: the oracle is exact on BOTH
# releases so there is no correctness cost, 2025 is the season that best describes today's league,
# and `player_stats` will never publish 2026 either -- so this move was going to happen anyway and
# doing it now means doing it unhurried instead of in draft week.
DEFAULT_SOURCE = "current"

URL = SOURCES["legacy"]["url"]              # kept: referenced by the emitted meta and by tests
KICK_URL = SOURCES["legacy"]["kick_url"]

SEASONS = SOURCES[DEFAULT_SOURCE]["seasons"]
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


def season_path(year, kicking=False, source=DEFAULT_SOURCE):
    spec = SOURCES[source]
    stem = spec["kick_stem"] if kicking else spec["stem"]
    return os.path.join(CACHE, f"{stem}_{year}.csv")


def adapt_row(row, aliases):
    """Rename a foreign source's columns to the names `scoring.score()` reads.

    THE ADAPTER LIVES AT THE BOUNDARY, NOT IN scoring.py -- the JAC/JAX rule (CLAUDE.md): fix the
    root for fields we own, adapt at the edge for fields a foreign source owns. `score()` is the
    executable form of league.md and must not accumulate one branch per upstream schema revision.

    Only fills a name that is ABSENT, so a source carrying both wins with its own.
    """
    if not aliases:
        return row
    out = dict(row)
    for want, actual in aliases.items():
        if not out.get(want) and actual in out:
            out[want] = out[actual]
    return out


def fetch_season(year, timeout=120, kicking=False, source=DEFAULT_SOURCE):
    """Returns (path, note). A season that does not exist upstream is ABSENT, not an error --
    on `legacy` 2025 and 2026 both 404 and a pipeline that crashes on that is unusable all
    preseason. On `current` 2025 is published; 2026 will not be until the season is played."""
    spec = SOURCES[source]
    path = season_path(year, kicking, source)
    url = (spec["kick_url"] if kicking else spec["url"])
    if url is None:                     # kicking is folded into the main asset on this source
        return None, f"{year} kicking: served by the main asset on source '{source}'"
    url = url.format(year=year)
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


def load_kicking_season(year, refetch=False, count_blocked=COUNT_BLOCKED_AS_MISS,
                        source=DEFAULT_SOURCE):
    """Season kicking totals by player id, scored through `scoring.kicker_points`.

    Returns (totals, notes). The scoring rules are NOT re-typed here -- `kicker_points` is the
    executable form of league.md and already existed; this only feeds it.

    On `current` the kicking columns live in the MAIN weekly asset, so this reads the same file the
    skill half does. The column names are identical, which is why nothing below had to change --
    verified 2026-08-09 on 2024: 45 of 45 kickers agree with the legacy kicking asset on every
    distance bucket, every miss and every XP.
    """
    spec = SOURCES[source]
    path = season_path(year, kicking=True, source=source)
    notes = []
    if refetch or not os.path.exists(path) or os.path.getsize(path) < 1024:
        # On a folded source the main loader has already fetched (or failed on) this exact path.
        path, note = fetch_season(year, kicking=not spec["kicking_in_main"], source=source)
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
            # A folded asset carries every position; only kickers have attempts, and a row with no
            # FG and no XP contributes a real 0.0 that would otherwise enter the rank distribution
            # as a phantom kicker and drag the whole curve down.
            if spec["kicking_in_main"] and (row.get("position") or "").strip() != "K":
                continue
            pts, summed = kicking_row_points(row, count_blocked)
            unsummed += 0 if summed else 1
            totals[pid] += pts
    if unsummed:
        # Never a silent sag: if the buckets stop summing to fg_made, makes are scoring zero.
        raise SystemExit(f"{year} kicking: distance buckets do not sum to fg_made on {unsummed} "
                         f"row(s) -- the source's schema moved and every K value would be low")
    return totals, notes


#: How far a player-season may drift from nflverse's own published PPR before the build refuses.
#: Real defects are whole points -- a dropped INT is 2.0 under STANDARD_PPR, a dropped TD is 6.0 --
#: so this only absorbs float accumulation over an 18-week sum.
ORACLE_TOL = 0.01


def load_season(year, refetch=False, source=DEFAULT_SOURCE):
    """Season totals by player id, under the league's rules -- and NEVER without checking the
    source's own arithmetic first.

    THE ORACLE RUNS ON EVERY BUILD, and it is the only reason a source swap is safe. `score()`
    reads nflverse column names directly, so a renamed column is not an error, it is a ZERO:
    `stat.get("interceptions")` on a release that calls it `passing_interceptions` returns None,
    `_n` turns that into 0.0, and every quarterback silently gains a point per interception. No
    exception, no warning, a curve that looks entirely reasonable.

    An alias table cannot protect against that, because a table only covers the renames somebody
    thought of. Re-scoring each row under STANDARD_PPR and comparing to the source's OWN
    `fantasy_points_ppr` does, because it checks every term at once against an outside reference.
    This is the same 2469/2469 oracle `tests/test_scoring.py` uses, moved into the pipeline so it
    guards data we have not seen yet rather than the four seasons we have.
    """
    spec = SOURCES[source]
    path = season_path(year, source=source)
    notes = []
    if refetch or not os.path.exists(path) or os.path.getsize(path) < 1024:
        path, note = fetch_season(year, source=source)
        notes.append(note)
        if path is None:
            return None, notes
    totals = collections.defaultdict(float)
    position = {}
    ours = collections.defaultdict(float)
    theirs = collections.defaultdict(float)
    with open(path, encoding="utf-8", newline="") as f:
        for raw in csv.DictReader(f):
            # Regular season only. Playoff weeks are not part of a fantasy season and folding
            # them in would reward the same handful of teams every year.
            if raw.get("season_type") != "REG":
                continue
            pid = raw.get("player_id")
            if not pid:
                continue
            row = adapt_row(raw, spec["aliases"])
            position.setdefault(pid, (row.get("position") or "").strip())
            totals[pid] += score(row, FAMILY_FEUD)
            ours[pid] += score(row, STANDARD_PPR)
            theirs[pid] += _num(row.get("fantasy_points_ppr"))

    off = {pid: round(ours[pid] - theirs[pid], 2)
           for pid in ours if abs(ours[pid] - theirs[pid]) > ORACLE_TOL}
    if off:
        worst = sorted(off.items(), key=lambda kv: -abs(kv[1]))[:5]
        raise SystemExit(
            f"{year} ({source}): this build does NOT reproduce the source's own fantasy_points_ppr "
            f"on {len(off)} of {len(ours)} player-seasons (worst: {worst}).\n"
            f"  Almost certainly a RENAMED COLUMN reading as zero rather than raising. Diff this "
            f"season's header against SOURCES['{source}']['aliases'] before trusting any curve "
            f"built from it -- see the silent-zero note on that table.")
    notes.append(f"{year} ({source}): oracle exact on {len(ours)} player-seasons")
    return (totals, position), notes


def build(seasons=SEASONS, refetch=False, depth=CURVE_DEPTH, count_blocked=COUNT_BLOCKED_AS_MISS,
          source=DEFAULT_SOURCE):
    per_rank = collections.defaultdict(list)
    used, used_k, notes = [], [], []
    for year in seasons:
        loaded, n = load_season(year, refetch, source=source)
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
        totals, n = load_kicking_season(year, refetch, count_blocked, source=source)
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


PBP_PATH = os.path.join(CACHE, "play_by_play_{year}.csv.gz")


def long_td_bonus(year, path=None):
    """{player_id: bonus points} for one REG season, counted from play-by-play. None if uncached.

    THE PASSER IS CREDITED TOO, and that is the whole finding. league.md:80 scores the bonus "on
    pass, rush AND receiving TDs", so a 50-yard touchdown pass pays the quarterback AND the
    receiver. Crediting only `td_player_id` (the scorer) misses every QB -- which is most of the
    effect, and the reason a first pass at this looked like a receiver story.

    +1 at 40+, a further +2 at 50+, and they STACK, so a 50-yarder is worth +3. That is exactly
    what `scoring.py` computes (`td_40p * 1 + td_50p * 2`, with a 50+ TD counted in BOTH buckets),
    so this function and the scorer cannot drift on the rule.

    Kick, punt, fumble and interception return touchdowns are NOT pass, rush or receiving TDs and
    are deliberately excluded -- `pass_touchdown`/`rush_touchdown` are the discriminator, not
    `touchdown` alone.

    Join: `td_player_id`/`passer_player_id` are gsis ids, the same domain as the weekly file's
    `player_id`. Measured 2026-08-17 over all four seasons: **486 bonus rows joined, 0 unjoinable.**
    """
    p = path or PBP_PATH.format(year=year)
    if not os.path.exists(p):
        return None
    bonus = collections.defaultdict(float)
    with gzip.open(p, "rt", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            if r.get("season_type") != "REG" or r.get("touchdown") != "1":
                continue
            y = _num(r.get("yards_gained"))
            if y < 40:
                continue
            pts = 1.0 + (2.0 if y >= 50 else 0.0)
            scorer = r.get("td_player_id")
            if r.get("pass_touchdown") == "1":
                if scorer:
                    bonus[scorer] += pts
                if r.get("passer_player_id"):
                    bonus[r["passer_player_id"]] += pts
            elif r.get("rush_touchdown") == "1":
                if scorer:
                    bonus[scorer] += pts
    return dict(bonus)


def long_td_probe(seasons=SEASONS):
    """Build the curve twice -- shipped, and with the long-TD bonus folded in -- and return both.

    🚨 THIS IS A MEASUREMENT, NOT A FEATURE, AND THE MEASUREMENT IS WHY.
    TODO called shipping the bonus "correctness only -- the edge is ~zero". That was written
    before anyone counted, and the raw counts look alarming for exactly the position this project
    has the most doctrine about: over 2022-2025 the bonus adds **+8.7 to QB1 and +12.9 to QB6**,
    against +2.8 at RB1 and +1.0 at TE1.

    But the board does not price the curve -- it prices VORP, `curve[k] - curve[baseline]`, and
    the bonus lifts the QB12 BASELINE by +7.0 at the same time. So it very nearly CANCELS:
    **QB1 VORP moves 129.7 -> 131.4 (+1.7)**, and QB1 as a share of RB1 goes **48% -> 49%**.
    The largest move anywhere is WR2 at +7.8, comfortably inside RB1's own sd of 19.3.

    So the honest summary is not "the bonus is small" -- it is **"the bonus is nearly uniform
    within a position, so it cancels in the only number that decides a pick."** Shipping it changes
    no decision. That is what makes it safe hygiene rather than a re-valuation, and it is why this
    prints instead of writing: the shipped curve's `excludes: ["long_td_bonus"]` stays TRUE until
    someone deliberately regenerates, which belongs in the ~Aug 27 refresh with Briggsy's eyes on
    it, not in a background run.
    """
    out = {}
    for with_bonus in (False, True):
        per_rank, used, joined, missed = collections.defaultdict(list), [], 0, 0
        for year in seasons:
            loaded, _ = load_season(year)
            if loaded is None:
                continue
            totals, position = loaded
            if with_bonus:
                for pid, extra in (long_td_bonus(year) or {}).items():
                    if pid in totals:
                        totals[pid] += extra
                        joined += 1
                    else:
                        missed += 1
            used.append(year)
            for pos in POSITIONS:
                vals = sorted((v for pid, v in totals.items() if position.get(pid) == pos),
                              reverse=True)
                for rank, v in enumerate(vals[:CURVE_DEPTH], 1):
                    per_rank[(pos, rank)].append(v)
        out["after" if with_bonus else "before"] = {
            pos: _table(per_rank, pos, len(used), CURVE_DEPTH) for pos in POSITIONS}
        if with_bonus:
            out["joined"], out["unjoinable"], out["seasons"] = joined, missed, used
    return out


def _print_long_td_probe():
    r = long_td_probe()
    before, after = r["before"], r["after"]
    print(f"seasons: {r['seasons']} | bonus rows joined: {r['joined']} | "
          f"unjoinable: {r['unjoinable']}")
    waiver, _ = baselines_from_board()
    print(f"baselines read from the board: {waiver}\n")
    print(f"{'slot':<7}{'raw now':>9}{'raw after':>11}{'Δraw':>7}"
          f"{'VORP now':>10}{'VORP after':>12}{'ΔVORP':>8}")
    print("-" * 64)
    for pos in POSITIONS:
        bl = waiver.get(pos)
        b0, b1 = before[pos].get(str(bl)), after[pos].get(str(bl))
        for k in (1, 2, 3, 6):
            a0, a1 = before[pos].get(str(k)), after[pos].get(str(k))
            if None in (a0, a1, b0, b1):
                continue
            print(f"{pos}{k:<5}{a0:>9.1f}{a1:>11.1f}{a1 - a0:>+7.1f}"
                  f"{a0 - b0:>10.1f}{a1 - b1:>12.1f}{(a1 - b1) - (a0 - b0):>+8.1f}")
        print()
    q = (before["QB"].get("1"), after["QB"].get("1"),
         before["QB"].get(str(waiver.get("QB"))), after["QB"].get(str(waiver.get("QB"))))
    for pos in ("RB", "WR"):
        p = (before[pos].get("1"), after[pos].get("1"),
             before[pos].get(str(waiver.get(pos))), after[pos].get(str(waiver.get(pos))))
        if None not in q + p:
            print(f"QB1 as a share of {pos}1:  now {(q[0]-q[2])/(p[0]-p[2]):.0%}"
                  f"  ->  after {(q[1]-q[3])/(p[1]-p[3]):.0%}")
    print("\nNOTHING WAS WRITTEN. The shipped curve still excludes the bonus, and still says so.")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build the empirical VORP curve.")
    ap.add_argument("--refetch", action="store_true", help="re-download every season")
    ap.add_argument("--check", action="store_true", help="compute and report; write nothing")
    ap.add_argument("--long-td-probe", dest="long_td_probe", action="store_true",
                    help="measure what the long-TD bonus WOULD do to the curve and to VORP. "
                         "Writes nothing. See long_td_probe() for why this is a probe.")
    a = ap.parse_args(argv)

    if a.long_td_probe:
        _print_long_td_probe()
        return 0

    curve, used, notes, used_k = build(refetch=a.refetch)
    for n in notes:
        print(f"  {n}")
    waiver, last = baselines_from_board()
    payload = {
        "meta": {
            "seasons": used,
            "seasons_kicking": used_k,
            "release": DEFAULT_SOURCE,
            "source": SOURCES[DEFAULT_SOURCE]["url"].format(year="<year>"),
            "source_kicking": (SOURCES[DEFAULT_SOURCE]["kick_url"] or
                               SOURCES[DEFAULT_SOURCE]["url"]).format(year="<year>"),
            "release_note": (
                "nflverse's `player_stats` release is FROZEN at 2024 and 404s on 2025; the live one "
                "is `stats_player`, which publishes 1999-2025 and folds the kicking columns into "
                "the weekly file. This repo read the frozen one until 2026-08-09 because a comment "
                "asserted the rename went the other way. Both are kept in SOURCES so the old basis "
                "stays reproducible. Column renames are handled by an adapter at the boundary and "
                "caught by an oracle inside load_season(), which re-scores every row under "
                "STANDARD_PPR against the source's own fantasy_points_ppr and refuses on any "
                "disagreement -- a renamed column reads as a ZERO, not an error."),
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
                                "PLAY-BY-PLAY. This curve now covers the SAME SEASONS from "
                                "nflverse's own weekly stat builder, which is an exact basis "
                                "rather than a re-derived one, so the remaining gap to Aug 5 is "
                                "the long-TD bonuses and play-by-play's own TD attribution -- not "
                                "the season window, which was the larger difference until "
                                "2026-08-09."),
            "measured_swap_note": (
                "Moving from legacy/2021-2024 to current/2022-2025 was measured before it was "
                "applied, decomposed into its two variables: release alone moved max |vorp| 3.2 "
                "(mean 0.23, 44 of 174 rows changing vbdRank, concentrated in QB and TE because "
                "the legacy asset scored ~607 player-seasons a year against ~2000 here); window "
                "alone moved max |vorp| 19.8 (mean 2.98, 128 of 174 rows). Board effect: Bijan "
                "Robinson took #1 from Ja'Marr Chase and 13 of the top 15 changed position. NOTE "
                "the two were 1.7 apart beforehand and the RELEASE change alone flipped them, so "
                "the top of this board is finer-grained than its own basis."),
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

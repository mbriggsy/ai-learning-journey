#!/usr/bin/env python3
"""U17 -- what does drafting the Nth-ranked player at a position ACTUALLY return?

WHY THIS EXISTS, AND WHY IT IS NOT THE SAME AS `build_curves.py`.

`vorp_curve.json` answers: *what did the player who FINISHED RB1 score?* That is an ORDER
STATISTIC -- the score of whoever turned out to be best, selected for having beaten expectations.
It is a real quantity and it is not the one a draft board needs, because **you cannot draft a
finish. You draft a rank.**

This file answers the question the board is actually asking: *if I spend a pick on the player the
preseason consensus ranks RB1, what do I get?* Measured, not modelled -- historical ADP joined to
what those exact players then scored under this league's own scoring.

THE GAP IS NOT SMALL. Measured 2026-08-14 over 2022-2025, against the shipped board:

    slot   realised vorp   sd      board's vorp
    RB1            121.6  145.1          268.4
    WR1            130.9   70.9          242.7
    QB1             45.0   73.8          129.6
    TE1             78.0   60.6          134.7

**The board overstates the top of every position by roughly 2x**, four for four, and the spread
of the realised value is 1.4x to 25x the spread the curve carries (`docs/insights/023`).

⚠️ WHAT THIS DOES NOT FIX. `curve[pos][k]` and `realized[pos][k]` are estimates of DIFFERENT
things, and this one is estimated far more noisily -- its per-cell sd is 50-145 points against the
curve's 4-35. That is why the window here is deliberately WIDER than the board's 2022-2025: more
seasons is the only lever that reduces the standard error of a mean, and the trade against
recency is reported by `--window-compare` rather than assumed.

⚠️ ADP IS A PROXY FOR THE BOARD'S ECR. The board is ordered by FantasyPros ECR
(`scripts/consensus.py`); this indexes by Fantasy Football Calculator ADP because it publishes
history back to 2010 and ECR history is a 102 MB archive. Both are preseason consensus and they
correlate strongly, but they are not the same list. Do not describe this as "the board's own rank".

Usage:
    python scripts/realized_value.py                     # default window, the table
    python scripts/realized_value.py --years 2022-2025   # match the board's curve window
    python scripts/realized_value.py --window-compare    # recency vs precision, measured
    python scripts/realized_value.py --compare-board     # realised vs what the board ships
"""
import argparse
import collections
import csv
import gzip
import json
import os
import statistics
import sys
import urllib.error
import urllib.request
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "draft-kit", "cache")
ADP_DIR = os.path.join(CACHE, "adp_history")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
csv.field_size_limit(10 ** 7)

from scoring import score, FAMILY_FEUD          # noqa: E402
import build_curves as BC                       # noqa: E402
import normalize                                # noqa: E402  -- THE one normalizer (U3)

POSITIONS = ("QB", "RB", "WR", "TE")
DEFAULT_YEARS = tuple(range(2015, 2026))        # 11 seasons; see --window-compare for the trade

#: A name join that silently drops half the players returns a confident number over whoever
#: matched. Measured coverage 2022-2025 is 98-99%, so anything under this is a broken join, not
#: a thin year.
MIN_COVERAGE = 0.90
#: FFC's early years are built on very few drafts (2012: 303). An ADP over 300 drafts is a
#: different instrument from one over 8,470, and averaging them silently is the position-mix
#: defect again.
MIN_DRAFTS = 500

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


class Refuse(SystemExit):
    pass


def adp_url(year):
    return (f"https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year={year}"
            f"&cb={uuid.uuid4().hex}")


def fetch_adp(year, refetch=False):
    """Historical preseason ADP for one season, cached. Cache-busted like every Sleeper URL in
    this repo -- a CDN that serves a stale body defeats every gate we own (insight 020)."""
    os.makedirs(ADP_DIR, exist_ok=True)
    path = os.path.join(ADP_DIR, f"ppr_{year}.json")
    if os.path.exists(path) and not refetch and os.path.getsize(path) > 200:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    req = urllib.request.Request(adp_url(year), headers={"User-Agent": "family-feud/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            body = json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, ValueError) as e:
        raise Refuse(f"{year}: ADP could not be fetched ({e})")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(body, f)
    return body


def preseason_ranks(year, refetch=False):
    """[(normalised name, position)] in ADP order, plus the draft count behind it."""
    body = fetch_adp(year, refetch)
    n_drafts = ((body.get("meta") or {}).get("total_drafts")) or 0
    rows = []
    for p in body.get("players", []):
        pos = (p.get("position") or "").upper()
        if pos in POSITIONS and p.get("adp"):
            rows.append((float(p["adp"]), normalize.norm(p.get("name") or ""), pos))
    rows.sort()
    return [(nm, pos) for _, nm, pos in rows], n_drafts


def actual_points(year):
    """(normalised name, position) -> FAMILY_FEUD points for the REG season.

    Scored through `scoring.score` and `build_curves.adapt_row`, so this and the curve are the
    same arithmetic over the same source. A second implementation of "what did he score" is how
    two instruments drift apart -- the lesson `market.py` had to be fixed for.
    """
    path = BC.season_path(year, source="current")
    if not os.path.exists(path):
        path, _note = BC.fetch_season(year, source="current")
        if path is None:
            raise Refuse(f"{year}: season stats unavailable")
    tot = collections.defaultdict(float)
    meta = {}
    with open(path, encoding="utf-8", newline="") as f:
        for raw in csv.DictReader(f):
            if raw.get("season_type") != "REG":
                continue
            pid = raw.get("player_id")
            if not pid:
                continue
            row = BC.adapt_row(raw, BC.SOURCES["current"]["aliases"])
            tot[pid] += score(row, FAMILY_FEUD)
            meta.setdefault(pid, ((raw.get("player_display_name") or ""),
                                  (raw.get("position") or "").upper()))
    out = {}
    for pid, pts in tot.items():
        nm, pos = meta[pid]
        nm = normalize.norm(nm)
        if pos in POSITIONS and nm:
            # A traded player can appear twice; keep the larger, which is his season.
            out[(nm, pos)] = max(out.get((nm, pos), 0.0), pts)
    return out


def baselines():
    """READ the baseline ranks from the board. Never re-type them -- they already live in
    meta.vbd and a fourth copy is a fourth thing to drift (build_curves says the same)."""
    with open(os.path.join(ROOT, "draft-kit", "players_data.json"), encoding="utf-8") as f:
        vbd = (json.load(f).get("meta") or {}).get("vbd") or {}
    b = vbd.get("baselineWaiver") or {}
    missing = [p for p in POSITIONS if p not in b]
    if missing:
        raise Refuse(f"meta.vbd.baselineWaiver is missing {missing}; refusing to invent one")
    return {p: int(b[p]) for p in POSITIONS}


def realized_for_season(ranks, actual, base, label=""):
    """PURE CORE. {(pos, preseason_rank): vorp} from a rank list and a points table.

    Separated from the I/O so the two refusals and the baseline semantics can be tested without
    a network or a 8 MB CSV -- `market.py`'s lesson was that an untested call site is where the
    defect lives (insight 013).
    """
    joined = [(nm, pos) for nm, pos in ranks if (nm, pos) in actual]
    cov = len(joined) / len(ranks) if ranks else 0.0
    if cov < MIN_COVERAGE:
        misses = [nm for nm, pos in ranks if (nm, pos) not in actual][:8]
        raise Refuse(f"{label}: only {100*cov:.0f}% of priced players joined to a season "
                     f"(floor {100*MIN_COVERAGE:.0f}%). A broken join returns a confident "
                     f"number over whoever matched. Sample misses: {misses}")

    out = {}
    for pos in POSITIONS:
        # 🚨 REPLACEMENT IS WHAT THE WAIVER WIRE ACTUALLY PRODUCED. The baseline is the points of
        # the player who FINISHED at the baseline rank, taken over the WHOLE league -- NOT over
        # the ~200 players who happened to carry an ADP. Reading it off the ranked pool would
        # measure "replacement among draftable players", which is a different and much stronger
        # baseline, and would understate every vorp here.
        finish = sorted((v for (nm, p), v in actual.items() if p == pos), reverse=True)
        b = base[pos]
        if len(finish) < b:
            raise Refuse(f"{label}: only {len(finish)} {pos}s scored; cannot read a {pos}{b} "
                         f"baseline")
        replacement = finish[b - 1]
        ranked = [(nm, p) for nm, p in joined if p == pos]
        for k, key in enumerate(ranked, 1):
            out[(pos, k)] = actual[key] - replacement
    return out, cov


def season_realized(year, base, refetch=False):
    """{(pos, preseason_rank): vorp} for one season, plus a coverage report."""
    ranks, n_drafts = preseason_ranks(year, refetch)
    if n_drafts < MIN_DRAFTS:
        raise Refuse(f"{year}: ADP is built on {n_drafts} drafts, under the {MIN_DRAFTS} floor. "
                     f"A thin ADP is a different instrument, not a thin year.")
    out, cov = realized_for_season(ranks, actual_points(year), base, label=str(year))
    return out, cov, n_drafts


def build(years=DEFAULT_YEARS, refetch=False, quiet=False):
    """{(pos, rank): [vorp per season]} over the window, and the seasons that contributed."""
    per_cell = collections.defaultdict(dict)
    used = []
    for year in years:
        try:
            vals, cov, n_drafts = season_realized(year, baselines(), refetch)
        except Refuse as e:
            if not quiet:
                print(f"  SKIP {e}")
            continue
        used.append(year)
        if not quiet:
            print(f"  {year}: {100*cov:3.0f}% joined · ADP over {n_drafts:>5} drafts")
        for key, v in vals.items():
            per_cell[key][year] = v
    if not used:
        raise Refuse("no season produced a usable measurement -- refusing to emit a table")
    return per_cell, used


def table(per_cell, used, depth=24, min_seasons=None):
    """Mean realised vorp per (pos, rank), over cells EVERY contributing season supplies.

    Same discipline as `build_curves._table`: a mean of order statistics only means something if
    the same number of seasons went into it. A rank that only the deep years reach is averaging a
    different population.
    """
    need = min_seasons or len(used)
    out = {}
    for pos in POSITIONS:
        for k in range(1, depth + 1):
            vals = per_cell.get((pos, k), {})
            if len(vals) < need:
                continue
            out[(pos, k)] = (statistics.mean(vals.values()),
                             statistics.pstdev(vals.values()),
                             len(vals))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--years", help="e.g. 2015-2025 or 2022-2025")
    ap.add_argument("--refetch", action="store_true")
    ap.add_argument("--depth", type=int, default=24)
    ap.add_argument("--compare-board", action="store_true",
                    help="realised value against the vorp the board actually ships")
    ap.add_argument("--window-compare", action="store_true",
                    help="recency vs precision, measured rather than argued")
    args = ap.parse_args()

    years = DEFAULT_YEARS
    if args.years:
        lo, _, hi = args.years.partition("-")
        years = tuple(range(int(lo), int(hi or lo) + 1))

    if args.window_compare:
        print("=== RECENCY vs PRECISION ===")
        print("  A wider window halves the standard error and buys a staler football era.")
        print("  Both are printed so the trade is a decision, not a default.\n")
        rows = {}
        for label, yrs in (("2022-2025 (board's window)", tuple(range(2022, 2026))),
                           ("2018-2025", tuple(range(2018, 2026))),
                           ("2015-2025", tuple(range(2015, 2026)))):
            per_cell, used = build(yrs, args.refetch, quiet=True)
            rows[label] = (table(per_cell, used), len(used))
        print(f"  {'slot':6} " + "".join(f"{lab:>30}" for lab in rows))
        print(f"  {'':6} " + "".join(f"{'mean   sd   SEM':>30}" for _ in rows))
        for pos in POSITIONS:
            for k in (1, 2, 3, 5):
                cells = []
                for lab, (t, n) in rows.items():
                    if (pos, k) in t:
                        m, sd, cnt = t[(pos, k)]
                        cells.append(f"{m:8.1f} {sd:6.1f} {sd/max(cnt,1)**0.5:6.1f}")
                    else:
                        cells.append(f"{'--':>22}")
                print(f"  {pos + str(k):6} " + "".join(f"{c:>30}" for c in cells))
        return

    per_cell, used = build(years, args.refetch)
    t = table(per_cell, used, args.depth)
    print(f"\n=== REALISED VORP OF DRAFTING THE PRESEASON #k · {min(used)}-{max(used)} "
          f"({len(used)} seasons) ===")

    if args.compare_board:
        with open(os.path.join(ROOT, "draft-kit", "players_data.json"), encoding="utf-8") as f:
            players = json.load(f)["players"]
        pos_rank = {}
        for pos in POSITIONS:
            for i, p in enumerate(sorted((q for q in players if q["pos"] == pos),
                                         key=lambda q: q["r"]), 1):
                pos_rank[(pos, i)] = p
        print(f"  {'slot':6} {'realised':>10} {'sd':>7} {'SEM':>7} {'board':>9} {'board-real':>11}"
              f"   {'the board player at that rank':<28}")
        for pos in POSITIONS:
            for k in range(1, min(args.depth, 12) + 1):
                if (pos, k) not in t:
                    continue
                m, sd, n = t[(pos, k)]
                p = pos_rank.get((pos, k))
                bv = p["vorp"] if p else None
                print(f"  {pos + str(k):6} {m:10.1f} {sd:7.1f} {sd/max(n,1)**0.5:7.1f} "
                      f"{(f'{bv:9.1f}' if bv is not None else '        -')} "
                      f"{(f'{bv - m:+11.1f}' if bv is not None else '          -')}"
                      f"   {(p['name'] if p else ''):<28}")
        return

    print(f"  {'slot':6} {'realised':>10} {'sd':>8} {'SEM':>7} {'n':>4}")
    for pos in POSITIONS:
        for k in range(1, args.depth + 1):
            if (pos, k) not in t:
                continue
            m, sd, n = t[(pos, k)]
            print(f"  {pos + str(k):6} {m:10.1f} {sd:8.1f} {sd/max(n,1)**0.5:7.1f} {n:>4}")


if __name__ == "__main__":
    main()

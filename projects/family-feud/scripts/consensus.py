#!/usr/bin/env python3
"""Where does the board disagree with the expert consensus, and what does the gap COST?

    python scripts/consensus.py              # the report, from cached sources
    python scripts/consensus.py --refresh    # re-fetch the consensus first
    python scripts/consensus.py --top 25     # how many rows per section

READ-ONLY BY CONSTRUCTION. This never writes `players_data.json`. The board's `pr`/`r` are
Briggsy's judgment and a consensus copy is parity, not an edge -- so this instrument's whole job
is to put the expensive disagreements in front of a human, in the currency the board already
thinks in, and then get out of the way. Acting on one means editing the source and rebuilding
with `--rankings-synthesized`, which is a deliberate act with its own audit trail.

WHY POINTS AND NOT SPOTS. A 20-place slip is not a constant amount of value: measured on this
board's own curve, RB 3->23 costs 124.1 points and RB 60->80 costs 30.9. Ranking disagreements by
"spots apart" therefore sorts by the wrong quantity -- it put Khalil Herbert (board 108, consensus
307) at the top of the list, a player who cannot be reached in a 128-pick draft, while a real one
sat twelfth.

TWO KINDS OF DISAGREEMENT, AND THE SECOND IS THE ONE A GAP METRIC CANNOT SEE.
  1. Players on both lists, ranked differently.
  2. Players the consensus ranks highly that the board DOES NOT CARRY AT ALL. A join from the
     board outward is blind to these by construction -- no board row, no comparison, no output.
     Measured on the first run: 37 of the consensus top 174 had no board row, including a starting
     NFL quarterback. You cannot draft a player who is not on the board, so this section exists.

THE JOIN IS ID-TO-ID, NEVER A NAME. insight 004 measured name-similarity floors as INVERTED on
this population (0.800 between different players, 0.370 between two renderings of the same man),
so no threshold exists. FantasyPros publishes its own id and NOTHING else -- its `yahoo_id`,
`cbs_id` and `sportsdata_id` columns are the literal string "NA" on all 523 rows, verified, so
those bridges do not exist however plausible they look. DynastyProcess's `db_playerids.csv`
carries both `sleeper_id` and `fantasypros_id`, which is the bridge:

    board.sleeperId -> db_playerids.sleeper_id -> fantasypros_id -> FP ECR.id

159 of 174 board rows resolve, 0 ambiguous, 0 position disagreements.
"""

import argparse
import csv
import gzip
import io
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
CACHE = os.path.join(KIT, "cache")
BOARD = os.path.join(KIT, "players_data.json")
CURVE = os.path.join(KIT, "vorp_curve.json")

ECR_CACHE = os.path.join(CACHE, "fp_ecr.csv.gz")
XWALK_CACHE = os.path.join(CACHE, "player_ids.csv.gz")

ECR_URL = "https://github.com/dynastyprocess/data/raw/master/files/db_fpecr_latest.csv"
XWALK_URL = "https://github.com/dynastyprocess/data/raw/master/files/db_playerids.csv"

#: The FantasyPros page whose rankings this league actually drafts from. `redraft-overall` maps to
#: /nfl/rankings/ppr-cheatsheets.php -- Full PPR redraft, which is this league's exact format.
#: Taking `best-overall` or a dynasty page would be a different game with the same column names.
ECR_PAGE = "redraft-overall"
EXPECT_FP_PAGE = "/nfl/rankings/ppr-cheatsheets.php"

#: The curve is built for skill positions only. K and DEF carry flat per-tier constants
#: (`carried:kdef-tier-flat`), so a points comparison for them would be arithmetic on a constant
#: dressed up as analysis. Excluded, and the report SAYS how many were excluded.
SKILL = ("QB", "RB", "WR", "TE")


class Refuse(Exception):
    """A source that cannot be trusted. Never degrade past one of these into a quiet default."""


# ------------------------------------------------------------------ fetching


def _fetch(url, dest, expect_columns, min_rows):
    """Download, VALIDATE, then promote. Never write over good cache with a bad payload.

    U10's lesson, one directory over: v1 of the mule downloaded straight onto the live file, so a
    bad response destroyed good cargo. And `rss_nbc_edge` returned HTTP 200 with 793 KB of HTML
    for days. Here the same trap is live and armed -- `db_fpecr.csv` (no `_latest`) answers 404
    with a 302 KB GitHub error page, which sails past any size check.
    """
    tmp = dest + ".incoming"
    req = urllib.request.Request(url, headers={"User-Agent": "family-feud/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            if r.status != 200:
                raise Refuse(f"{url} answered HTTP {r.status}")
            body = r.read()
    except urllib.error.HTTPError as e:
        raise Refuse(f"{url} answered HTTP {e.code}") from e
    except OSError as e:
        raise Refuse(f"{url} could not be reached: {e}") from e

    text = body.decode("utf-8", "replace")
    if text.lstrip()[:1] == "<":
        raise Refuse(f"{url} returned HTML, not CSV ({len(body):,} bytes) -- a 404 page reads as "
                     f"a healthy download to any size check")
    rows = list(csv.DictReader(io.StringIO(text)))
    if len(rows) < min_rows:
        raise Refuse(f"{url} parsed to {len(rows)} rows, expected at least {min_rows}")
    missing = [c for c in expect_columns if c not in (rows[0] or {})]
    if missing:
        raise Refuse(f"{url} is missing column(s) {missing} -- the schema moved and every join "
                     f"below it would silently return nothing")

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with gzip.GzipFile(tmp, "wb", mtime=0) as gz:      # mtime=0: re-fetching identical data is
        gz.write(text.encode("utf-8"))                 # not a diff (the pinned dump's rule)
    os.replace(tmp, dest)
    return len(rows)


def refresh():
    n_x = _fetch(XWALK_URL, XWALK_CACHE, ("sleeper_id", "fantasypros_id", "name"), 5000)
    n_e = _fetch(ECR_URL, ECR_CACHE,
                 ("page_type", "id", "player", "pos", "team", "ecr", "sd", "scrape_date"), 3000)
    return n_x, n_e


def _read_csv(path, what):
    if not os.path.exists(path):
        raise Refuse(f"no cached {what} at {path} -- run with --refresh")
    with gzip.open(path, "rt", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


# ------------------------------------------------------------------ loading


def clean_id(v):
    """CSV round-trips integer ids through floats, so '4046' can arrive as '4046.0'."""
    if v in (None, "", "NA"):
        return None
    s = str(v).strip()
    return s[:-2] if s.endswith(".0") else s


def crosswalk(rows):
    """sleeper_id -> fantasypros_id, only where the source states both."""
    out = {}
    for r in rows:
        s, p = clean_id(r.get("sleeper_id")), clean_id(r.get("fantasypros_id"))
        if s and p:
            out[s] = p
    if not out:
        raise Refuse("the crosswalk yielded no sleeper_id -> fantasypros_id pairs at all, which "
                     "is a broken read, not an empty source")
    return out


def consensus_rows(rows):
    """The PPR cheat sheet, each row carrying its rank WITHIN its position.

    Positional rank, not overall ECR, because the VORP curve is keyed by position rank -- looking
    up an overall rank in a per-position table returns a real number for the wrong player.
    """
    page = [r for r in rows if r.get("page_type") == ECR_PAGE]
    if not page:
        raise Refuse(f"no rows with page_type={ECR_PAGE!r}; the source's page names moved")

    seen_pages = {r.get("fp_page") for r in page}
    if seen_pages != {EXPECT_FP_PAGE}:
        raise Refuse(f"page_type={ECR_PAGE!r} now covers {sorted(seen_pages)}, not just "
                     f"{EXPECT_FP_PAGE!r} -- this league is Full PPR and the slice must stay it")

    def ecr_of(r):
        try:
            return float(r["ecr"])
        except (TypeError, ValueError):
            return float("inf")

    page.sort(key=ecr_of)
    counts = {}
    for i, r in enumerate(page, 1):
        r["overall"] = i
        pos = r.get("pos")
        counts[pos] = counts.get(pos, 0) + 1
        r["pos_rank"] = counts[pos]
        r["ecr_f"] = ecr_of(r)
    return page


# ------------------------------------------------------------------ valuing


def spread_pos_ranks(page, row):
    """This player's position rank at BOTH edges of the experts' own spread: (best, worst).

    `sd` is how far apart the experts are, published in overall-rank units. A 75-point
    disagreement where they range across 44 ranks is far weaker evidence than a 41-point
    disagreement where they agree to within 6.6 -- and sorting on the raw delta alone puts the
    coin-flips on top, which is the noise this instrument exists to remove.

    NOTHING IS INVENTED. The only inputs are `ecr` and `sd` exactly as published, read through the
    same curve the board already uses. No weighting constant, no confidence score, no formula of
    mine -- an invented number in the column the report SORTS by would be the worst possible place
    to put one.
    """
    pos_rank = row["pos_rank"]
    try:
        sd = abs(float(row.get("sd")))
    except (TypeError, ValueError):
        return pos_rank, pos_rank
    same = [r["ecr_f"] for r in page if r.get("pos") == row.get("pos")]
    best = max(1, sum(1 for e in same if e <= row["ecr_f"] - sd))
    worst = max(1, sum(1 for e in same if e <= row["ecr_f"] + sd))
    return best, worst


def surviving_delta(mine, low, high):
    """The disagreement left once the experts' own spread is taken at its least favourable.

    If the board's value sits INSIDE the consensus range, the experts do not actually disagree
    with it -- they simply have not converged -- and the honest delta is zero.
    """
    if low is None or high is None or mine is None:
        return None
    if mine < low:
        return round(low - mine, 1)
    if mine > high:
        return round(high - mine, 1)
    return 0.0


def vorp(curve, baselines, pos, pos_rank):
    """Points over this position's replacement level, or None if the rank is off the curve.

    OFF-CURVE IS None, NEVER AN EXTRAPOLATION. The curve is built from four measured seasons and
    stops at position rank 80; the consensus list runs to WR 180. Inventing a value past the last
    measured point would put a fabricated number in the one column the report sorts by. A player
    beyond RB80/WR80 is also not reachable in a 128-pick draft, so the honest answer costs nothing.
    """
    table = curve.get(pos)
    base = baselines.get(pos)
    if not table or base is None:
        return None
    here, replacement = table.get(str(pos_rank)), table.get(str(base))
    if here is None or replacement is None:
        return None
    return round(here - replacement, 1)


def compare(board, page, xw, curve, baselines):
    """Both directions. Returns (disagreements, missing, notes)."""
    by_fp = {}
    for r in page:
        k = clean_id(r.get("id"))
        if k:
            by_fp.setdefault(k, r)

    notes = {"off_curve": 0, "unmatched": [], "excluded_kdef": 0}
    disagreements = []
    matched_fp = set()

    for p in board:
        if p.get("pos") not in SKILL:
            notes["excluded_kdef"] += 1
            continue
        fpid = xw.get(str(p.get("sleeperId")))
        row = by_fp.get(fpid) if fpid else None
        if row is None:
            notes["unmatched"].append(p.get("name"))
            continue
        matched_fp.add(fpid)

        mine = vorp(curve, baselines, p["pos"], p["pr"])
        theirs = vorp(curve, baselines, row["pos"], row["pos_rank"])
        if mine is None or theirs is None:
            notes["off_curve"] += 1
            continue
        best, worst = spread_pos_ranks(page, row)
        # `best` is the better RANK, which is the HIGHER points value -- the names invert here.
        high = vorp(curve, baselines, row["pos"], best)
        low = vorp(curve, baselines, row["pos"], worst)
        disagreements.append({
            "name": p["name"], "pos": p["pos"], "team": p["team"],
            "board_r": p["r"], "board_pos_rank": p["pr"], "board_vorp": mine,
            "cons_overall": row["overall"], "cons_pos_rank": row["pos_rank"],
            "cons_vorp": theirs, "sd": row.get("sd"),
            "delta": round(theirs - mine, 1),
            "surviving": surviving_delta(mine, low, high),
            "spread_pos_ranks": [best, worst],
        })

    # THE SECTION A GAP METRIC CANNOT PRODUCE: ranked by the consensus, absent from the board.
    on_board_fp = {xw.get(str(p.get("sleeperId"))) for p in board}
    depth = len(board)
    missing = []
    for r in page:
        if r["overall"] > depth or r.get("pos") not in SKILL:
            continue
        k = clean_id(r.get("id"))
        if k in on_board_fp:
            continue
        val = vorp(curve, baselines, r["pos"], r["pos_rank"])
        if val is None:
            notes["off_curve"] += 1
            continue
        missing.append({
            "name": r.get("player"), "pos": r.get("pos"), "team": r.get("team"),
            "cons_overall": r["overall"], "cons_pos_rank": r["pos_rank"],
            "cons_vorp": val, "sd": r.get("sd"),
        })

    disagreements.sort(key=lambda d: -abs(d["surviving"] if d["surviving"] is not None
                                           else d["delta"]))
    missing.sort(key=lambda d: -d["cons_vorp"])
    return disagreements, missing, notes


# ------------------------------------------------------------------ report


def _sd(v):
    try:
        return f"{float(v):.1f}"
    except (TypeError, ValueError):
        return "?"


def report(board_meta, page, disagreements, missing, notes, top):
    out = []
    scrapes = sorted({r.get("scrape_date") for r in page if r.get("scrape_date")})
    out.append("CONSENSUS vs THE BOARD -- what the disagreements COST, in points over replacement")
    out.append(f"  consensus : FantasyPros PPR cheat sheet, {len(page)} players, "
               f"scraped {', '.join(scrapes) or 'date not stated'}")
    out.append(f"  board     : {board_meta.get('rankings', {}).get('synthesized', '?')} synthesis, "
               f"judgment {board_meta.get('rankings', {}).get('judgment', '?')}")
    out.append(f"  compared  : {len(disagreements)} rows | {notes['excluded_kdef']} K/DEF excluded "
               f"(flat constants, no curve) | {notes['off_curve']} off-curve | "
               f"{len(notes['unmatched'])} unmatched")
    if notes["unmatched"]:
        out.append(f"              unmatched: {notes['unmatched'][:8]}")
    out.append("")

    live = [d for d in disagreements if (d["surviving"] or 0) != 0]
    out.append(f"  [1] YOU AND THE EXPERTS DISAGREE -- {len(live)} survive the experts' own "
               f"spread, top {top}")
    out.append("      'pts' is the disagreement left after taking their spread at its least")
    out.append("      favourable. A blank spread swallowing your rank means no real disagreement.")
    out.append(f"      {'pts':>7}  {'raw':>7}  {'you':>7}  {'them':>7}  {'sd':>5}  player")
    for d in live[:top]:
        arrow = "they like him MORE" if d["surviving"] > 0 else "they like him LESS"
        out.append(f"      {d['surviving']:>+7.1f}  {d['delta']:>+7.1f}  "
                   f"{d['pos']}{d['board_pos_rank']:<6} {d['pos']}{d['cons_pos_rank']:<6} "
                   f"{_sd(d['sd']):>5}  {d['name']} ({d['team']}) -- {arrow}")
    dropped = len(disagreements) - len(live)
    out.append(f"      ({dropped} more compared and dropped: the experts' own spread covers your "
               f"placement, so there is nothing to answer for)")
    out.append("")

    above = [m for m in missing if m["cons_vorp"] > 0]
    out.append(f"  [2] NOT ON YOUR BOARD AT ALL -- {len(missing)} skill players the consensus "
               f"ranks inside your depth")
    out.append(f"      of those, {len(above)} are worth more than replacement level; the rest "
               f"would be bench filler")
    out.append(f"      {'vorp':>7}  {'consensus':>12}  {'sd':>5}  player")
    for m in missing[:top]:
        out.append(f"      {m['cons_vorp']:>7.1f}  {m['pos']}{m['cons_pos_rank']:<3} "
                   f"(#{m['cons_overall']:<4})  {_sd(m['sd']):>5}  {m['name']} ({m['team']})")
    if not missing:
        out.append("      none -- every skill player the consensus ranks inside your board's "
                   "depth has a row")
    out.append("")
    out.append("  Nothing here was written. To act on one: edit draft-kit/players_data.json, then")
    out.append("  python scripts/build_board.py --rankings-synthesized <today>")
    return "\n".join(out)


def fetch_only():
    """The mule's contract, identical to validate_cargo.py's: exit 0 or 1, ONE line on stdout,
    `ok` as the success prefix. Anything chattier and the hourly log stops being readable; a
    different prefix and a consumer keying on `ok` silently reads a failure as a pass."""
    try:
        n_x, n_e = refresh()
    except Refuse as e:
        print(f"FAIL: {e}")
        return 1
    print(f"ok (crosswalk {n_x} rows, consensus {n_e} rows)")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--refresh", action="store_true", help="re-fetch the consensus and crosswalk")
    ap.add_argument("--fetch-only", action="store_true",
                    help="refresh and report one line; no report. This is what the mule runs.")
    ap.add_argument("--top", type=int, default=20, help="rows per section (default 20)")
    ap.add_argument("--json", action="store_true", help="emit the findings as JSON")
    a = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if a.fetch_only:
        return fetch_only()

    try:
        if a.refresh:
            n_x, n_e = refresh()
            print(f"refreshed: crosswalk {n_x:,} rows, consensus {n_e:,} rows\n")
        xw = crosswalk(_read_csv(XWALK_CACHE, "crosswalk"))
        page = consensus_rows(_read_csv(ECR_CACHE, "consensus"))
    except Refuse as e:
        print(f"!! REFUSED: {e}")
        return 1

    with open(BOARD, encoding="utf-8") as f:
        board_doc = json.load(f)
    with open(CURVE, encoding="utf-8") as f:
        curve = json.load(f)["curve"]
    baselines = (board_doc["meta"].get("vbd") or {}).get("baselineWaiver") or {}

    d, m, notes = compare(board_doc["players"], page, xw, curve, baselines)
    if a.json:
        print(json.dumps({"disagreements": d, "missing": m, "notes": notes},
                         indent=1, ensure_ascii=False))
    else:
        print(report(board_doc["meta"], page, d, m, notes, a.top))
    return 0


if __name__ == "__main__":
    sys.exit(main())

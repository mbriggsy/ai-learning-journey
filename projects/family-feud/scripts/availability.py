#!/usr/bin/env python3
"""Will he still be there at my next pick? -- MEASURED on real human drafts, not asserted.

    python scripts/availability.py --fetch     # cache the 7 comparable full draft feeds
    python scripts/availability.py             # score it, leave-one-draft-out
    python scripts/availability.py --verbose   # ...and print every fold

WHY THIS IS ALLOWED TO EXIST, given insight 021 deleted a very similar-looking thing.

Insight 021 killed an enumeration that sampled `gap` players UNIFORMLY from a pool and reported
how often each name survived. That was a tautology: under uniform sampling the answer is
C(k-i-1, gap-i)/C(k, gap) -- a fact about the shape of the draw with no football in it. The
write-up says so explicitly: "Only a non-uniform opponent model would make enumeration
informative."

WE HAVE ONE, AND IT IS MEASURED. `precompute_ladder.py --backtest` scores three orderings of the
opponents' next picks against a committed 120-pick feed: market ADP names 30 of 84, our own board
order names 26 of 84, and the deliberately-poor floor names **1 of 84**. A 31x separation between
consensus order and anti-consensus order is direct evidence that the other seats are nothing like
uniform -- they draft roughly down a consensus list. So an estimate built on CONSENSUS ORDER is a
different object from the one that was deleted.

That earns it a hearing. It does NOT earn it a place on the board: this file exists to find out
whether the estimate beats a null, and it prints the answer either way.

THE MODEL, in one line: at my pick, a player survives to my next pick iff fewer than G of the
players ranked above him get taken -- so the signed distance `slack = D - G` is the whole model.
  D = still-available players the market ranks ABOVE him (after removing whoever I take now)
  G = opposing picks between this pick and my next one
Under perfect consensus order he survives iff slack >= 0. Real rooms are noisy, so the threshold
is FITTED on other drafts and tested on a held-out one -- never fitted and reported on the same
data, which is the leakage `backtest_board.py` exists to refuse.

🚨 THE TRAP THIS FILE IS SHAPED AROUND: raw accuracy here is meaningless. Most available players
are deep and obviously survive, so "everybody survives" scores ~90% and reads like a working
instrument. Every number below is therefore printed beside a BASE RATE (the majority class) and a
FLOOR (the model inverted). A score that does not clear its own base rate is not a finding, and
this file says so in words rather than leaving it to the reader.

DECISION-RELEVANT SUBSET. It also scores the TOP-24 available separately. Nobody is deciding
whether the 90th-ranked man survives; the decision lives among the players actually in
consideration, and an instrument that is only accurate on the obvious ones is worth nothing.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import normalize                                                    # noqa: E402
import realized_value as RV                                         # noqa: E402
import scout_opponents as S                                         # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")     # insight 003 -- cp1252 kills the report
except Exception:
    pass

FEED_DIR = os.path.join(ROOT, "draft-kit", "cache", "draft_feeds")

#: The consideration set. 24 is two rounds of a 12-team room -- the players a drafter could
#: plausibly still be choosing between. Scoring only here is the honest half of the report.
TOP_N = 24

#: Thresholds the fold is allowed to choose from. Deliberately coarse: a fine grid over 7 drafts
#: would fit noise, and the point is a band the operator reads, not a tuned constant.
GRID = list(range(-6, 13))


class Refuse(Exception):
    """Something is wrong with the INPUTS. Never swallowed into a score."""


def distinct_comparable():
    """The comparable drafts, deduplicated to DRAFTS rather than drafter-views.

    Reuses scout_opponents.comparable() rather than restating the filter. insight 022 records
    what the two counts cost when they were conflated: 18 drafter-views were quoted as 18
    drafts when they are 7, and four members share one 2023 draft.
    """
    seen = {}
    for rec in S.load():
        keep, _ = S.comparable(rec)
        for d in keep:
            seen.setdefault(d["draft_id"], {"draft_id": d["draft_id"], "season": d["season"],
                                            "league": d["league"], "teams": d["teams"]})
    return sorted(seen.values(), key=lambda d: (d["season"], d["league"]))


def feed_path(draft_id):
    return os.path.join(FEED_DIR, f"{draft_id}.json")


def fetch_feed(draft_id):
    """The FULL pick sequence. The scouting cache holds only each user's OWN picks (25 of 192),
    which cannot answer "who was still on the board" -- that is why this fetch exists."""
    url = (f"https://api.sleeper.app/v1/draft/{draft_id}/picks?cb={uuid.uuid4().hex}")
    req = urllib.request.Request(url, headers={"User-Agent": "family-feud/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, ValueError) as e:
        raise Refuse(f"{draft_id}: full feed could not be fetched ({e})")


def load_feed(draft_id, refetch=False):
    os.makedirs(FEED_DIR, exist_ok=True)
    path = feed_path(draft_id)
    if os.path.exists(path) and not refetch and os.path.getsize(path) > 200:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    body = fetch_feed(draft_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(body, f)
    return body


def key_of(pick):
    md = pick.get("metadata") or {}
    return (normalize.norm(f"{md.get('first_name','')} {md.get('last_name','')}"),
            (md.get("position") or "").upper())


def observations(picks, ranks):
    """One row per (my pick, still-available on-list player). The unit of the whole measurement.

    THE SEAT COMES FROM `draft_slot` ON THE PICKS THEMSELVES, never from snake arithmetic. These
    are other people's leagues -- 10- and 12-team, 15 to 24 rounds, and this repo hard-refuses
    reversal drafts precisely because slot_of() cannot model them. Reading the seat off the feed
    sidesteps that entirely and cannot be wrong about a format we never checked.
    """
    idx = {k: i for i, k in enumerate(ranks)}
    picks = sorted((p for p in picks if p.get("pick_no")), key=lambda p: p["pick_no"])
    taken_at = {}                                   # player key -> pick_no it went at
    for p in picks:
        taken_at.setdefault(key_of(p), p["pick_no"])
    on_list = [k for k in taken_at if k in idx]

    by_slot = {}
    for p in picks:
        by_slot.setdefault(p.get("draft_slot"), []).append(p["pick_no"])

    rows = []
    for slot, nos in by_slot.items():
        if slot is None:
            continue
        nos = sorted(nos)
        for at, nxt in zip(nos, nos[1:]):
            gap = nxt - at - 1
            if gap <= 0:                            # a turn: nothing can happen in between
                continue
            mine = next((k for k in on_list if taken_at[k] == at), None)
            # available BEFORE this pick, minus whoever I take now
            avail = [k for k in on_list if taken_at[k] >= at and k != mine]
            avail.sort(key=lambda k: idx[k])
            for depth, k in enumerate(avail):       # depth == D, by construction
                rows.append({"slack": depth - gap,
                             "survived": taken_at[k] >= nxt,
                             "top_n": depth < TOP_N,
                             "gap": gap, "at": at})
    return rows


def score(rows, threshold):
    """(accuracy, n) for 'survives iff slack >= threshold'."""
    if not rows:
        return 0.0, 0
    hits = sum(1 for r in rows if (r["slack"] >= threshold) == r["survived"])
    return hits / len(rows), len(rows)


def base_rate(rows):
    """The majority-class score -- what 'always say the common answer' gets for free."""
    if not rows:
        return 0.0, None
    surv = sum(1 for r in rows if r["survived"]) / len(rows)
    return max(surv, 1 - surv), ("survives" if surv >= 0.5 else "gone")


def best_threshold(rows):
    return max(GRID, key=lambda t: score(rows, t)[0])


def report(label, rows, verbose=False):
    """Leave-one-draft-out over the folds already split by caller. Prints arms side by side."""
    print(f"\n  {label}")
    if not rows:
        print("    no observations")
        return None
    folds = sorted({r["draft"] for r in rows})
    tot = {"model": 0, "naive": 0, "floor": 0, "base": 0, "n": 0}
    for held in folds:
        train = [r for r in rows if r["draft"] != held]
        test = [r for r in rows if r["draft"] == held]
        t = best_threshold(train)
        acc, n = score(test, t)
        naive, _ = score(test, 0)
        br, which = base_rate(test)
        floor = 1 - acc                      # the model inverted: the positive control
        tot["model"] += acc * n; tot["naive"] += naive * n
        tot["floor"] += floor * n; tot["base"] += br * n; tot["n"] += n
        if verbose:
            print(f"      held out {held[:10]:<10} t={t:>3}  model {acc:.3f}  "
                  f"naive(t=0) {naive:.3f}  base({which}) {br:.3f}  n={n}")
    n = tot["n"] or 1
    m, nv, fl, bs = tot["model"]/n, tot["naive"]/n, tot["floor"]/n, tot["base"]/n
    print(f"    MODEL (slack >= fitted t) {m:.3f}")
    print(f"    NAIVE (slack >= 0)        {nv:.3f}   -- no fitting at all")
    print(f"    BASE  (majority class)    {bs:.3f}   <- the number to beat")
    print(f"    FLOOR (model inverted)    {fl:.3f}   -- positive control")
    print(f"    n = {n} observations over {len(folds)} held-out drafts")
    edge = m - bs
    verdict = ("BEATS the base rate" if edge > 0.02 else
               "DOES NOT BEAT the base rate -- do not ship this" if edge <= 0.0 else
               "ties the base rate within noise -- not a finding")
    print(f"    => model - base = {edge:+.3f}  ::  {verdict}")
    return {"model": m, "base": bs, "naive": nv, "floor": fl, "n": n, "edge": edge}


#: Gap buckets. An 8-team snake produces EXACTLY the even gaps 0,2,4,6,8,10,12,14 -- seat s lives
#: with 2(s-1) and 2(8-s), so slots 4/5 get {6,8} and slots 1/8 get {0,14}. These buckets are
#: drawn so every gap our league can produce lands cleanly in one. Gap 0 (the turn) never appears:
#: observations() drops it because nothing can happen between back-to-back picks.
GAP_BUCKETS = [(1, 3), (4, 5), (6, 7), (8, 9), (10, 11), (12, 13), (14, 99)]

#: A bucket has to clear the base rate by this much, on this many held-out drafts, before the
#: instrument is allowed to speak at that gap. Two conditions, not one: a pooled average can be
#: carried by a single fold, which is how insight 022's opponent prior looked healthy right up
#: until it was asked about one particular seat.
MIN_EDGE, MIN_FOLDS = 0.02, 5


def lodo(rows):
    """Leave-one-draft-out. Returns (model, base, naive, folds_beating, n_folds, n)."""
    folds = sorted({r["draft"] for r in rows})
    tot = {"model": 0.0, "base": 0.0, "naive": 0.0, "n": 0}
    beating = 0
    for held in folds:
        train = [r for r in rows if r["draft"] != held]
        test = [r for r in rows if r["draft"] == held]
        if not train or not test:
            continue
        t = best_threshold(train)
        acc, n = score(test, t)
        br, _ = base_rate(test)
        nv, _ = score(test, 0)
        tot["model"] += acc * n; tot["base"] += br * n; tot["naive"] += nv * n; tot["n"] += n
        if acc > br:
            beating += 1
    n = tot["n"] or 1
    return tot["model"]/n, tot["base"]/n, tot["naive"]/n, beating, len(folds), tot["n"]


def calibrate_by_gap(rows, verbose=False):
    """THE HEADLINE, because the pooled number hides the only thing that matters.

    Pooled over all seven drafts the model beats the base rate by +0.095 on the top-24. That
    number is USELESS to us on its own: the edge turns out to be a monotone function of the gap,
    and an 8-team room's gap is fixed by the seat we draw. Slots 4/5 never see a gap above 8,
    which is exactly where the edge measures zero.
    """
    print("\n  EDGE BY GAP -- held out per bucket, and then AGAIN in 8-team rooms only.")
    print("  🚨 THE POOLED COLUMN IS NOT OUR LEAGUE. Six of the seven drafts are 10- or 12-team,")
    print("     where the board is consumed almost exhaustively (12x16=192 picks from a 206-deep")
    print("     list) and consensus order therefore predicts well. An 8-team room spends 128 picks")
    print("     on the same list and leaves ~50 of the top 180 undrafted, so it churns far less")
    print("     predictably. `speak` below is driven by the 8-TEAM column and nothing else.")
    print(f"    {'gap':>7} {'drafts':>7} {'n':>7} {'base':>7} {'model':>7} {'edge':>8} "
          f"{'folds>base':>11} | {'8tm base':>9} {'8tm mdl':>8} {'8tm edge':>9}  verdict")
    cal = {}
    for lo, hi in GAP_BUCKETS:
        sub = [r for r in rows if lo <= r["gap"] <= hi]
        if not sub:
            continue
        m, b, nv, beating, nf, n = lodo(sub)
        t = best_threshold(sub)
        # OUR FORMAT, SCORED ALONE. The threshold is fitted on the OTHER rooms so this is still
        # held-out -- we have exactly one 8-team draft and fitting on it would be pure leakage.
        ours = [r for r in sub if r["teams"] == 8]
        others = [r for r in sub if r["teams"] != 8]
        if ours and others:
            t8 = best_threshold(others)
            m8, n8 = score(ours, t8)
            b8, _ = base_rate(ours)
            e8 = m8 - b8
        else:
            m8 = b8 = e8 = float("nan"); n8 = 0
        speak = bool(e8 == e8 and e8 >= MIN_EDGE)      # NaN-safe: unmeasured never speaks
        lab = f"{lo}-{hi}" if hi < 99 else f"{lo}+"
        print(f"    {lab:>7} {nf:>7} {n:>7} {b:>7.3f} {m:>7.3f} {m-b:>+8.3f} "
              f"{f'{beating}/{nf}':>11} | {b8:>9.3f} {m8:>8.3f} {e8:>+9.3f}  "
              f"{'SPEAK' if speak else 'SILENT'}")
        for g in range(lo, min(hi, 30) + 1):
            cal[str(g)] = {"threshold": t, "pooled_edge": round(m - b, 4),
                           "pooled_base": round(b, 4), "folds_beating": beating, "n_folds": nf,
                           "n": n, "eight_team_base": None if b8 != b8 else round(b8, 4),
                           "eight_team_model": None if m8 != m8 else round(m8, 4),
                           "eight_team_edge": None if e8 != e8 else round(e8, 4),
                           "eight_team_n": n8, "eight_team_drafts": 1, "speak": speak}
    print(f"\n    SPEAK requires the 8-TEAM edge to clear {MIN_EDGE}. The pooled edge is shown")
    print( "    because it is real -- it simply describes rooms we are not drafting in. Judging")
    print( "    ourselves by it is exactly insight 022's error: a prior that looked healthy in")
    print( "    aggregate and lost to a constant for the one seat that mattered.")
    print( "    ⚠ THE 8-TEAM COLUMN RESTS ON ONE DRAFT (2023 Fantasy Fuccbois). It cannot")
    print( "      establish that the model fails here -- only that nothing we hold shows it")
    print( "      working. Re-open with more 8-team feeds; the room plays every year.")
    return cal


def our_seats(cal, teams=8, rounds=16):
    """What this instrument would actually be worth to US, seat by seat. The league is 8-team and
    `draft_order` is still null, so this is the only honest way to state its value today."""
    print(f"\n  WHAT IT IS WORTH TO US ({teams}-team, {rounds} rounds) -- seat by seat")
    print(f"    {'seat':>5}  {'gaps':>10}  verdict")
    for s in range(1, teams + 1):
        picks = [(r - 1) * teams + (s if r % 2 == 1 else teams + 1 - s)
                 for r in range(1, rounds + 1)]
        gaps = sorted({b - a - 1 for a, b in zip(picks, picks[1:])})
        live = [g for g in gaps if g > 0 and cal.get(str(g), {}).get("speak")]
        dead = [g for g in gaps if g > 0 and not cal.get(str(g), {}).get("speak")]
        verdict = (f"SPEAKS at gap {live}" if live else "SILENT AT EVERY GAP")
        if live and dead:
            verdict += f", silent at {dead}"
        print(f"    {s:>5}  {str(gaps):>10}  {verdict}")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--fetch", action="store_true", help="cache the full feeds, then score")
    ap.add_argument("--refetch", action="store_true", help="ignore the cache")
    ap.add_argument("--verbose", action="store_true", help="print every fold")
    ap.add_argument("--out", default=os.path.join(ROOT, "draft-kit",
                                                  "availability_calibration.json"))
    a = ap.parse_args(argv)

    drafts = distinct_comparable()
    print(f"=== AVAILABILITY: does 'slack = D - G' beat guessing? ===")
    print(f"{len(drafts)} distinct comparable drafts (drafter-views deduplicated -- insight 022)")

    rows, coverage = [], []
    for d in drafts:
        path = feed_path(d["draft_id"])
        if not os.path.exists(path) and not (a.fetch or a.refetch):
            raise SystemExit(f"no cached feed for {d['draft_id']} -- run with --fetch first")
        picks = load_feed(d["draft_id"], refetch=a.refetch)
        ranks, n_drafts = RV.preseason_ranks(int(d["season"]))
        idx = {k: i for i, k in enumerate(ranks)}
        joined = sum(1 for p in picks if key_of(p) in idx)
        coverage.append((d, len(picks), joined, len(ranks), n_drafts))
        for r in observations(picks, ranks):
            r["draft"] = d["draft_id"]
            r["teams"] = d["teams"]      # the axis `speak` is decided on -- see calibrate_by_gap
            rows.append(r)

    print("\n  THE FEEDS, and what joined to that season's ADP")
    for d, npicks, joined, nranks, n_adp in coverage:
        print(f"    {d['season']}  {d['league'][:24]:<24} {d['teams']:>2}tm  picks={npicks:>3}  "
              f"ADP-joined={joined:>3} ({100*joined/npicks:.0f}%)  "
              f"ADP list={nranks} over {n_adp} drafts")
    print("    ⚠ the unjoined are K/DEF and players past FFC's ~180-deep list. They still CONSUME")
    print("      picks, so G counts them while D cannot -- a known bias the fitted threshold")
    print("      absorbs, which is exactly why t is fitted and held-out rather than asserted.")

    report("ALL available on-list players", rows, a.verbose)
    top = [r for r in rows if r["top_n"]]
    report(f"TOP-{TOP_N} available only -- where the decision actually lives", top, a.verbose)

    cal = calibrate_by_gap(top, a.verbose)
    our_seats(cal)

    payload = {"generated_from": [d["draft_id"] for d in drafts],
               "top_n": TOP_N, "min_edge": MIN_EDGE, "min_folds": MIN_FOLDS,
               "by_gap": cal}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1)
    print(f"\n  wrote {a.out}")
    print("  🚨 A GAP MARKED SILENT MUST RENDER NOTHING. Printing a call the measurement says")
    print("     is no better than 'assume he is there' is how a fabricated number gets a label.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Refuse as e:
        print(f"!! {e}")
        sys.exit(2)

#!/usr/bin/env python3
"""What is each player WORTH to this league, versus what the market CHARGES for him?

    python scripts/market.py               # the report, from the cached pool
    python scripts/market.py --refresh     # re-fetch ADP first
    python scripts/market.py --top 20

READ-ONLY. It never writes the board.

THE WHOLE IDEA. The consensus tells you who is good; it says nothing about who is cheap. Value
minus price is where a league is won, and in THIS league the two come apart hardest at quarterback:
8 teams start one QB each, so replacement level is QB12, and every quarterback below it is worth
NEGATIVE points here. The market prices for a 12-team room and does not know that. Measured
2026-08-08: the market spends pick ~85 on Matthew Stafford, who is worth -30.1 to this roster.

WHY VORP AND NOT BOARD RANK. Board rank is the expert consensus, and experts rank quarterbacks by
raw points. Comparing ADP to board rank therefore just rediscovers that drafters fade QBs and
analysts do not -- true, and useless. `vorp` is already priced for THIS room (QB12/RB41/WR47/TE12,
2 FLEX, 8 teams), so comparing the market to VORP is the only comparison that knows what league
this is. Measured: against board rank the residual mean gap was structural; against value it is
+1.2 with median +2.0, i.e. no systematic artifact left.

TWO ARTIFACTS THAT HAD TO BE REMOVED FIRST, both of which produced a confident wrong list:

  1. DEPTH. The pool ranks 256 players, the board carries 174, and the ~100 the board does not
     carry occupy ADP slots and inflate every number. Raw `adp - board rank` averaged +2.9 and
     made almost everyone look underpriced. The market is therefore RE-RANKED over only the
     players the board actually carries.
  2. RELIABILITY. ADP over 17 drafts is not a price. The floor is a share of the MOST-drafted
     player in the pool rather than an absolute count, so it re-calibrates itself as the sample
     grows through August instead of silently getting stricter or looser.

THE `teams` PARAMETER IS COSMETIC AND MUST NOT BE TRUSTED. Verified 2026-08-08: `teams=8` and
`teams=12` return byte-identical ADP for all 256 players while faithfully echoing whatever was
asked for into `meta.teams`. The 2025 endpoint ignores it more loudly, answering `teams: 12` to a
request for 8. So this is market price from a BLENDED pool, not an 8-team pool -- which is fine
for "where will he actually go" and is exactly why the league-size correction has to come from
`vorp` on our side rather than from the source.

THE JOIN IS AN EXACT COMPOSITE KEY, NOT A SIMILARITY SCORE. This source publishes its own player
id and it is not in `db_playerids.csv`, so no id bridge exists. Insight 004 measured name-similarity
floors as INVERTED on this population, so no threshold would work -- but U14's answer was never a
better threshold, it was `(team, position, normalized name)` as a unique key. 156/174 resolve,
0 ambiguous, 0 name disagreements.
"""

import argparse
import gzip
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import consensus as CO                                                            # noqa: E402
from normalize import norm                                                        # noqa: E402
from rerank import team_of                                                        # noqa: E402

ADP_CACHE = os.path.join(CO.CACHE, "ffc_adp.json.gz")
ADP_URL = "https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=8&year=2026"

#: This source spells positions its own way.
POS_ALIASES = {"DST": "DEF", "PK": "K"}

#: A player must appear in at least this share of the MOST-drafted player's drafts before his ADP
#: is treated as a price. Relative rather than absolute so it re-calibrates as the sample grows
#: through August. It IS a judgment call -- there is no measurement that hands you a cutoff -- so
#: the report always prints how many rows it removed. Measured 2026-08-08: keeps 145 of 256, and
#: the least-drafted survivor is Khalil Shakir at 163 drafts with a stdev of 6.6, which is plainly
#: a real price. At 33% it would have cut to 59 and thrown away most of the board.
MIN_DRAFT_SHARE = 0.10


def key(name, pos, team):
    return (team_of({"team": team}), POS_ALIASES.get(pos, pos), norm(name))


def fetch(url=ADP_URL, dest=ADP_CACHE):
    """Download, VALIDATE, then promote -- U10's rule. Never overwrite good cache with bad."""
    req = urllib.request.Request(url, headers={"User-Agent": "family-feud/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            if r.status != 200:
                raise CO.Refuse(f"{url} answered HTTP {r.status}")
            body = r.read()
    except urllib.error.HTTPError as e:
        raise CO.Refuse(f"{url} answered HTTP {e.code}") from e
    except OSError as e:
        raise CO.Refuse(f"{url} could not be reached: {e}") from e
    try:
        doc = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as e:
        raise CO.Refuse(f"{url} did not return JSON ({e}); an error page reads as a healthy "
                        f"download to any size check") from e
    validate(doc)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".incoming"
    with gzip.GzipFile(tmp, "wb", mtime=0) as gz:
        gz.write(json.dumps(doc, ensure_ascii=False).encode("utf-8"))
    os.replace(tmp, dest)
    return doc


def validate(doc):
    if not isinstance(doc, dict) or doc.get("status") != "Success":
        raise CO.Refuse(f"the ADP source reported status {(doc or {}).get('status')!r}")
    players = doc.get("players")
    if not isinstance(players, list) or len(players) < 100:
        raise CO.Refuse(f"the ADP pool has {len(players or [])} players, expected at least 100")
    need = {"name", "position", "team", "adp", "stdev", "times_drafted"}
    missing = need - set(players[0])
    if missing:
        raise CO.Refuse(f"the ADP schema moved; missing {sorted(missing)}")
    meta = doc.get("meta") or {}
    if (meta.get("type") or "").upper() != "PPR":
        raise CO.Refuse(f"the pool is {meta.get('type')!r}, not PPR -- this league is Full PPR "
                        f"and a differently-scored pool prices a different game")
    return doc


def load(path=ADP_CACHE):
    if not os.path.exists(path):
        raise CO.Refuse(f"no cached ADP at {path} -- run with --refresh")
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return validate(json.load(f))


def reliable(players, share=MIN_DRAFT_SHARE):
    """Drop players whose ADP rests on too few drafts. Returns (kept, dropped)."""
    counts = [p.get("times_drafted") or 0 for p in players]
    floor = max(counts or [0]) * share
    kept = [p for p in players if (p.get("times_drafted") or 0) >= floor]
    return kept, len(players) - len(kept)


def market_ranks(pairs):
    """Re-rank the market over ONLY the board players, removing the depth artifact.

    Each pair also gets the rank at both edges of the market's own spread, so a price nobody
    agrees on cannot masquerade as a disagreement -- the same treatment consensus.py gives `sd`.
    """
    adps = sorted(a["adp"] for _, a in pairs)
    for i, (_, a) in enumerate(sorted(pairs, key=lambda t: t[1]["adp"]), 1):
        a["mkt"] = i
    for _, a in pairs:
        sd = abs(float(a.get("stdev") or 0))
        a["mkt_best"] = max(1, sum(1 for x in adps if x <= a["adp"] - sd))
        a["mkt_worst"] = max(1, sum(1 for x in adps if x <= a["adp"] + sd))
    return pairs


def compare(board, adp_doc, share=MIN_DRAFT_SHARE):
    # THE JOIN RUNS AGAINST THE FULL POOL, AND THE RELIABILITY FILTER RUNS AFTER IT. Filtering
    # first conflated two unrelated things under one number: a player the market barely drafts and
    # a player the join FAILED to reach both landed in "unmatched", which read 48 when the join
    # had really only missed 18. That matters beyond tidiness -- unmatched is the health signal
    # for the join itself, so if a team code moves and coverage collapses, it has to spike rather
    # than hide inside a filter count.
    index = {}
    for p in adp_doc["players"]:
        index.setdefault(key(p["name"], p["position"], p["team"]), []).append(p)

    pairs, unmatched, ambiguous = [], [], []
    for b in board:
        cand = index.get(key(b["name"], b["pos"], b["team"]), [])
        if len(cand) == 1:
            pairs.append((b, dict(cand[0])))
        elif not cand:
            unmatched.append(b["name"])
        else:
            ambiguous.append(b["name"])          # never auto-pick (insight 010)

    # Ranked over EVERY matched board player, then filtered for what to SHOW. Ranking only the
    # reliable ones would shift every rank as the sample grows, so a player's "wait" number would
    # move because somebody else got drafted more, not because his own price changed.
    market_ranks(pairs)
    _, dropped = reliable([a for _, a in pairs], share)
    floor = max([a.get("times_drafted") or 0 for _, a in pairs] or [0]) * share
    for _, a in pairs:
        a["reliable"] = (a.get("times_drafted") or 0) >= floor

    # VALUE rank is over SKILL players only: K and DEF carry flat per-tier constants, so their
    # `vorp` is a label rather than a measurement and ranking by it would be arithmetic theatre.
    skill = [(b, a) for b, a in pairs if b["pos"] in CO.SKILL]
    for i, (b, a) in enumerate(sorted(skill, key=lambda t: -t[0]["vorp"]), 1):
        a["val"] = i

    findings = []
    for b, a in skill:
        gap = CO.surviving_delta(a["val"], a["mkt_best"], a["mkt_worst"])
        findings.append({
            "name": b["name"], "pos": b["pos"], "team": b["team"], "vorp": b["vorp"],
            "board_r": b["r"], "value_rank": a["val"], "market_rank": a["mkt"],
            "raw_gap": a["mkt"] - a["val"], "gap": gap, "stdev": a.get("stdev"),
            "times_drafted": a.get("times_drafted"), "adp": a.get("adp"),
            "reliable": a["reliable"],
        })
    notes = {"dropped_unreliable": dropped, "unmatched": unmatched, "ambiguous": ambiguous,
             "total_drafts": (adp_doc.get("meta") or {}).get("total_drafts"),
             "pool": len(adp_doc["players"]), "matched": len(pairs), "compared": len(skill),
             "shown": sum(1 for f in findings if f["reliable"])}
    return findings, notes


def report(findings, notes, top, board_meta):
    # A DISCOUNT ON A WORTHLESS PLAYER IS WORTHLESS. Only rows worth more than the free agent at
    # their position can be a bargain -- without this the list filled with sub-replacement names
    # whose only distinction was being ignored, which is not the same as being underpriced.
    shown = [f for f in findings if f["reliable"]]
    bargains = sorted((f for f in shown if f["vorp"] > 0 and (f["gap"] or 0) > 0),
                      key=lambda f: -f["gap"])
    traps = sorted((f for f in shown if (f["gap"] or 0) < 0), key=lambda f: f["gap"])

    out = ["VALUE vs MARKET -- what they are worth HERE against what the room charges",
           f"  market   : {notes['pool']} players over {notes['total_drafts']:,} drafts "
           f"(blended pool; the source's team-size parameter is cosmetic)",
           f"  board    : {board_meta.get('rankings', {}).get('synthesized', '?')} synthesis",
           f"  join     : {notes['matched']} of {notes['matched'] + len(notes['unmatched'])} "
           f"board rows reached the market | {len(notes['unmatched'])} unmatched | "
           f"{len(notes['ambiguous'])} ambiguous",
           f"  priced   : {len(shown)} of {notes['compared']} skill players "
           f"({notes['compared'] - len(shown)} held back as too thinly drafted to be a price)",
           ""]

    out.append(f"  [1] TAKE THESE -- worth more to you than the room charges (top {top})")
    out.append("      'wait' is how many spots past your own valuation the market lets him fall,")
    out.append("      after taking the market's own spread at its least favourable.")
    out.append(f"      {'wait':>5} {'vorp':>8} {'you':>5} {'mkt':>5} {'drafts':>7}  player")
    for f in bargains[:top]:
        out.append(f"      {f['gap']:>+5.0f} {f['vorp']:>8.1f} {f['value_rank']:>5} "
                   f"{f['market_rank']:>5} {f['times_drafted']:>7}  "
                   f"{f['pos']} {f['name']} ({f['team']})")
    if not bargains:
        out.append("      none -- the market is pricing this board efficiently today")
    out.append("")

    out.append(f"  [2] LET THESE GO -- the room pays more than they are worth here (top {top})")
    out.append(f"      {'over':>5} {'vorp':>8} {'you':>5} {'mkt':>5} {'drafts':>7}  player")
    for f in traps[:top]:
        flag = "  <-- BELOW REPLACEMENT" if f["vorp"] < 0 else ""
        out.append(f"      {f['gap']:>+5.0f} {f['vorp']:>8.1f} {f['value_rank']:>5} "
                   f"{f['market_rank']:>5} {f['times_drafted']:>7}  "
                   f"{f['pos']} {f['name']} ({f['team']}){flag}")
    out.append("")
    out.append("  Nothing here was written. This is a read on the room, not a change to the board.")
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--refresh", action="store_true", help="re-fetch the ADP pool")
    ap.add_argument("--top", type=int, default=15)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    try:
        doc = fetch() if a.refresh else load()
    except CO.Refuse as e:
        print(f"!! REFUSED: {e}")
        return 1
    with open(CO.BOARD, encoding="utf-8") as f:
        board_doc = json.load(f)
    findings, notes = compare(board_doc["players"], doc)
    if a.json:
        print(json.dumps({"findings": findings, "notes": notes}, indent=1, ensure_ascii=False))
    else:
        print(report(findings, notes, a.top, board_doc["meta"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())

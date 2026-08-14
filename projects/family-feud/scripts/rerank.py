#!/usr/bin/env python3
"""Re-derive the board's ORDERING from the expert consensus.

    python scripts/rerank.py                 # dry run: show every move, write nothing
    python scripts/rerank.py --write         # rewrite players_data.json's ordering fields

WHY THIS EXISTS. The board's `r`/`pr`/`tier` came out of exploratory Cowork sessions and carry no
authority -- Briggsy's own call, 2026-08-08: "if it's wrong, it's wrong ... they carry no weight."
A disagreement between that and the averaged opinion of ~100 experts is not a debate to adjudicate,
so the consensus supplies the ordering outright.

WHAT IS AND IS NOT REPLACED. The edge was never going to be out-evaluating a hundred analysts. It
is that this board is priced for an 8-team, 2-FLEX, full-PPR room -- replacement level at
QB12/RB41/WR47/TE12 -- while the rest of the league drafts off a list built for 12-team leagues.
That machinery (`build_curves.py`, the VORP recompute in `build_board.py`) is untouched and is
where the advantage lives. This script only feeds it a defensible ordering.

  REPLACED  r, pr        <- FantasyPros Full PPR ECR
            tier         <- equal-value bands off the league's own curve
            badge "T"    <- dropped; "Briggsy's Guy" asserted a curation that did not happen
  KEPT      name, team, pos, sleeperId   (verified: 160/160 agree with live Sleeper)
            note                          (factual, about players rather than ranks)
            badges B/X/I/R/U/D/S          (about the player, not his rank)

THE NOTES ARE NOT REWRITTEN. A handful assert a board position ("The 1.01", "Rounds 6-8 is the
zone") and would become false under a new ordering. This script REPORTS them and refuses to
--write until they are dealt with, rather than editing prose by regex -- the one thing on this
board a machine has no business rephrasing.

  ...AND THERE IS A WAY PAST IT, because a gate nothing can pass is a wall (added 2026-08-14).
  Sometimes the claim is still TRUE at the new rank -- Jayden Daniels moving #50 -> #48 keeps
  "Rounds 6-8 is the zone" correct, since round 6 in an 8-team draft is picks 41-48. There was no
  way to record that a human had checked, so the only routes past were to edit prose that was not
  wrong or to weaken the gate. Both are worse than the third: `--notes-reviewed "<name>" ...`
  acknowledges specific players BY NAME.
  Naming them is the whole point. A blanket --force would silently cover the NEXT note to start
  claiming a rank, which nobody would have read -- the acknowledgement has to go stale on its own
  when the board moves underneath it, and a name does that while a boolean cannot.
"""

import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import consensus as CO                                                            # noqa: E402

BOARD = CO.BOARD
CURVE = CO.CURVE

#: FantasyPros spells Jacksonville "JAC". Sleeper says "JAX", the board says "JAX", and U14 proved
#: the board right by checking the live dump AND every live pick. This is the SAME divergence that
#: silently disabled the engine's escalation safety net for one team -- found here again at a new
#: boundary, joining DST rows by team code.
#:
#: It is an alias, which U14 deliberately refused to add. The difference: U14's JAC was the
#: board's OWN field, so the root was reachable and an alias would have been a second home for
#: team identity. FantasyPros' spelling is not ours to fix. Normalising a FOREIGN source once, at
#: the boundary where it enters, is an adapter -- not a second source of truth.
FOREIGN_TEAM_ALIASES = {"JAC": "JAX", "LA": "LAR", "WSH": "WAS"}

#: Notes that stake a claim on WHERE a player sits. Anchored on draft-slot and round language,
#: not on "RB1"-style shorthand: measured on the live board, `WR1` overwhelmingly means "his
#: team's number one receiver" ("Lamar's clear WR1", "Bo Nix's WR1"), which stays true whatever
#: this board does. A blanket positional scan would have flagged 24 rows, most of them fine.
RANK_CLAIM = re.compile(
    r"(\b\d\.\d\d\b"                       # "The 1.01"
    r"|\brounds?\s+\d"                     # "Rounds 6-8 is the zone"
    r"|\b(?:first|second|third|fourth)[- ]round\b"
    r"|\b(?:WR|RB|QB|TE)\d+\s+overall\b"   # "WR1 overall"
    r"|\bworth a \d)", re.I)


def team_of(row):
    t = (row.get("team") or "").strip().upper()
    return FOREIGN_TEAM_ALIASES.get(t, t)


def consensus_index(page):
    """Two lookups: by FantasyPros id (players) and by normalised team code (defenses)."""
    by_id, by_team = {}, {}
    for r in page:
        k = CO.clean_id(r.get("id"))
        if k:
            by_id.setdefault(k, r)
        if r.get("pos") == "DST":
            by_team.setdefault(team_of(r), r)
    return by_id, by_team


def attach(board, page, xw):
    """Give every board row its consensus ECR, or None. Returns (rows, unmatched)."""
    by_id, by_team = consensus_index(page)
    rows, unmatched = [], []
    for p in board:
        row = by_team.get(team_of(p)) if p["pos"] == "DEF" else by_id.get(xw.get(str(p["sleeperId"])))
        if row is None:
            unmatched.append(p["name"])
        rows.append({"p": p, "ecr": row["ecr_f"] if row else None})
    return rows, unmatched


def reorder(rows):
    """New `r`, skill first then K/DEF -- the draft-board shape the old board already had.

    K and DEF sink to the bottom regardless of any overall list, because you do not spend a
    round-8 pick on a kicker whatever a 523-player ranking says. The old board did this too
    (skill occupied r 1-150, K/DEF 151-174); it is preserved deliberately, not inherited by
    accident.

    An unmatched row sorts last WITHIN ITS BLOCK and keeps its old relative order, so the result
    is deterministic even when a source drops somebody.
    """
    def key(entry):
        return (entry["ecr"] is None, entry["ecr"] if entry["ecr"] is not None else 0,
                entry["p"]["r"])

    skill = sorted([e for e in rows if e["p"]["pos"] in CO.SKILL], key=key)
    kdef = sorted([e for e in rows if e["p"]["pos"] not in CO.SKILL], key=key)
    for i, e in enumerate(skill + kdef, 1):
        e["new_r"] = i
    return skill + kdef


def position_ranks(ordered):
    seen = {}
    for e in ordered:
        pos = e["p"]["pos"]
        seen[pos] = seen.get(pos, 0) + 1
        e["new_pr"] = seen[pos]
    return ordered


def value_bands(curve, pos, depth, k):
    """`k` tiers over `depth` players, as equal-width bands of PROJECTED POINTS.

    Not equal counts (arbitrary), and not the largest point drops (degenerate -- on a convex
    decreasing curve the biggest drops are all at the top, which produced WR tiers of
    [1,1,1,1,2,1,1,51]). Equal value bands give the shape a tier list is supposed to have: a
    couple of names at the top where points fall away fast, widening as the curve flattens.

    `k` is inherited from the old board rather than invented here. How many buckets are useful at
    a position is a judgment that survives a re-ordering; where the cuts fall is not.
    """
    table = curve.get(pos)
    if not table:
        return None
    pts = [table.get(str(i)) for i in range(1, depth + 1)]
    if any(v is None for v in pts):
        return None
    hi, lo = pts[0], pts[-1]
    width = (hi - lo) / k if hi > lo else 0
    raw = [min(k, int((hi - v) / width) + 1) if width else 1 for v in pts]
    renumber, out = {}, []                     # contiguous from 1, as the gate requires
    for x in raw:
        renumber.setdefault(x, len(renumber) + 1)
        out.append(renumber[x])
    return out


def assign_tiers(ordered, curve, old_tier_counts):
    by_pos = {}
    for e in ordered:
        by_pos.setdefault(e["p"]["pos"], []).append(e)
    for pos, entries in by_pos.items():
        entries.sort(key=lambda e: e["new_pr"])
        bands = value_bands(curve, pos, len(entries), old_tier_counts.get(pos, 1))
        if bands is None:
            # K and DEF have no curve. Their old tiers are kept and RE-SORTED onto the new order,
            # so they stay contiguous from 1 without inventing a measurement that does not exist.
            old = sorted(e["p"]["tier"] for e in entries)
            for e, t in zip(entries, old):
                e["new_tier"] = t
        else:
            for e, t in zip(entries, bands):
                e["new_tier"] = t
    return ordered


def rank_claim_notes(ordered):
    """Notes that assert a board position and would go false under the new ordering."""
    out = []
    for e in ordered:
        note = e["p"].get("note") or ""
        m = RANK_CLAIM.search(note)
        if m and e["new_r"] != e["p"]["r"]:
            out.append((e, m.group(0)))
    return out


def apply(doc, ordered, scrape_date):
    """Return a NEW source document. The input is not mutated."""
    out = json.loads(json.dumps(doc))
    by_id = {str(e["p"]["sleeperId"]): e for e in ordered}
    for p in out["players"]:
        e = by_id[str(p["sleeperId"])]
        p["r"], p["pr"], p["tier"] = e["new_r"], e["new_pr"], e["new_tier"]
        p["badges"] = [b for b in (p.get("badges") or []) if b != "T"]
    out["players"].sort(key=lambda p: p["r"])
    out["meta"] = dict(out["meta"])
    out["meta"]["rankings"] = dict(out["meta"].get("rankings") or {},
                                   synthesized=scrape_date)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--write", action="store_true", help="rewrite players_data.json")
    ap.add_argument("--show", type=int, default=25, help="how many moves to print")
    ap.add_argument("--notes-reviewed", nargs="*", default=[], metavar="NAME",
                    help="player names whose rank-claiming note you have READ and confirmed still "
                         "true at the new rank. Named, never blanket: an acknowledgement must go "
                         "stale on its own when a different note starts claiming a rank.")
    a = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    try:
        xw = CO.crosswalk(CO._read_csv(CO.XWALK_CACHE, "crosswalk"))
        page = CO.consensus_rows(CO._read_csv(CO.ECR_CACHE, "consensus"))
    except CO.Refuse as e:
        print(f"!! REFUSED: {e}")
        return 1

    scrapes = sorted({r.get("scrape_date") for r in page if r.get("scrape_date")})
    if len(scrapes) != 1:
        print(f"!! REFUSED: the consensus carries {len(scrapes)} scrape dates {scrapes}; the "
              f"synthesis date must name ONE day or it is a guess")
        return 1
    scrape_date = scrapes[0]

    with open(BOARD, encoding="utf-8") as f:
        doc = json.load(f)
    with open(CURVE, encoding="utf-8") as f:
        curve = json.load(f)["curve"]

    old_counts = {}
    for p in doc["players"]:
        old_counts.setdefault(p["pos"], set()).add(p["tier"])
    old_counts = {k: len(v) for k, v in old_counts.items()}

    rows, unmatched = attach(doc["players"], page, xw)
    ordered = assign_tiers(position_ranks(reorder(rows)), curve, old_counts)

    moves = sorted((e for e in ordered if e["new_r"] != e["p"]["r"]),
                   key=lambda e: -abs(e["new_r"] - e["p"]["r"]))
    print(f"consensus scraped {scrape_date} | {len(ordered)} rows | "
          f"{len(moves)} change position | {len(unmatched)} unmatched")
    if unmatched:
        print(f"  unmatched (kept at the end of their block): {unmatched}")
    print(f"\nbiggest moves (top {a.show}):")
    print(f"  {'was':>5} {'now':>5} {'move':>6}  {'tier':>4}  player")
    for e in moves[:a.show]:
        p = e["p"]
        d = p["r"] - e["new_r"]
        print(f"  {p['r']:>5} {e['new_r']:>5} {d:>+6}  {p['tier']}->{e['new_tier']}  "
              f"{p['pos']} {p['name']} ({p['team']})")

    claims = rank_claim_notes(ordered)
    reviewed = {n.strip().casefold() for n in (a.notes_reviewed or [])}
    unacked = [(e, f) for e, f in claims if e["p"]["name"].casefold() not in reviewed]
    if claims:
        print(f"\n!! {len(claims)} note(s) assert a board position and this re-order moves them.")
        print("   Fix the prose, or confirm the claim is STILL TRUE at the new rank and pass")
        print("   --notes-reviewed \"<name>\". Notes are not rewritten by machine.")
        for e, frag in claims:
            ack = "  [REVIEWED]" if e["p"]["name"].casefold() in reviewed else ""
            print(f"   - {e['p']['name']} (#{e['p']['r']} -> #{e['new_r']}), claims {frag!r}{ack}")
            print(f"       {e['p']['note'][:110]}")

    # An acknowledgement for somebody who is NOT claiming a rank is a warning, not a refusal: the
    # likely cause is a name carried forward from a previous refresh, which is harmless because the
    # unacked check below is what actually decides. Refusing would punish the careful operator.
    stray = sorted(reviewed - {e["p"]["name"].casefold() for e, _ in claims})
    if stray:
        print(f"\n   note: --notes-reviewed named {len(stray)} player(s) with no rank claim to "
              f"review ({', '.join(stray)}). Carried over from an earlier refresh? Harmless.")

    if not a.write:
        print("\nDRY RUN -- nothing written. Re-run with --write when the moves look right.")
        return 0
    if unacked:
        print(f"\n!! REFUSED TO WRITE: {len(unacked)} note(s) above are unreviewed. Fix the prose, "
              "or pass --notes-reviewed with each name once you have confirmed the claim holds.")
        return 1
    if claims:
        print(f"\n[reviewed] {len(claims)} rank-claiming note(s) confirmed still true by the "
              f"operator: {', '.join(e['p']['name'] for e, _ in claims)}")

    new_doc = apply(doc, ordered, scrape_date)
    with open(BOARD, "wb") as f:
        f.write(json.dumps(new_doc, indent=1, ensure_ascii=False).replace("\n", "\r\n")
                .encode("utf-8"))
    print(f"\nwrote {os.path.relpath(BOARD, ROOT)}. Now regenerate every surface:")
    print(f"  python scripts/build_board.py --rankings-synthesized {scrape_date}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

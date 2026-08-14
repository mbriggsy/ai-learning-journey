#!/usr/bin/env python3
"""Scout the room: what has every Family Feud opponent actually done in a draft?

WHY THIS EXISTS. `TODO.md`'s harness leg (d) proposed an opponent model built from invented
"doctrine terminals" -- one terminal per imagined opposing philosophy. That is a fabricated
number one level deeper than the enumeration it was meant to rescue, and this project has
already caught four of those. The opponents are NOT hypothetical: Sleeper serves every pick
every one of them has ever made. A measured opponent beats an imagined one, and it is the only
honest route to the validated opponent model the precomputer refuses to fake.

WHAT IT REFUSES TO DO
  * It will not report a rate over a population that is not comparable. Dynasty STARTUPS and
    keeper-league ROOKIE drafts contain no veterans, so "took no QB" there is an artifact of the
    pool, not a preference. They are excluded from every rate and reported separately. Blending
    them is exactly the position-mix defect `market.py` shipped and had to be fixed for.
  * It will not print a tendency from a sample too small to carry one. Below MIN_DRAFTS it says
    so and prints the raw drafts instead. A confident median over n=1 is the worst output here,
    because it reads identically to one over n=7.

⚠️ `picked_by` IS THE SEAT OWNER, NOT THE AGENT. Sleeper stamps a user's id on an auto-pick in
their seat exactly as it does on a deliberate one, and no field distinguishes them (the same
landmine `docs/league.md` records for our own draft). Everything here therefore describes "what
happened in this seat", which is also the thing we actually draft against.

Usage:
    python scripts/scout_opponents.py               # read cache, analyse, print profiles
    python scripts/scout_opponents.py --fetch       # refresh from Sleeper first (slow, polite)
    python scripts/scout_opponents.py --user NAME   # one opponent, with every draft listed
"""
import argparse
import collections
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "draft-kit", "cache", "opponents")
LEAGUE_ID = "1390509993844809728"          # Family Feud 2026. Re-read, never typed from memory.
BRIGGSY = "1390750540631150592"            # PoppaBriggsy. NOT briggsy007 -- see docs/league.md.
SEASONS = ("2023", "2024", "2025")

#: A draft only informs us about redraft behaviour if it IS one. A dynasty startup runs 30+
#: rounds; a keeper league's rookie draft is a handful of picks over a rookie-only pool.
MIN_PICKS_FOR_REDRAFT = 14
MAX_ROUNDS_FOR_REDRAFT = 30


def is_superflex(roster_positions):
    """🚨 A SUPERFLEX OR 2QB LEAGUE IS THE MOST DANGEROUS CONTAMINANT IN THIS FILE, because it
    corrupts the one axis these profiles are read for.

    Where a second QB can start, taking a QB in round 1 is CORRECT PLAY, not a tendency. Folding
    one superflex draft into a drafter's profile makes him look QB-aggressive when he was merely
    right. Measured 2026-08-14: `2023 The Big 12` is 12 teams x 26 rounds = 312 picks, so it is
    under the dynasty round cap, is snake, is full length, and passed EVERY other filter --
    11 QBs were gone by pick 24 in it. It contaminated MattiICE23's profile until this existed.

    This is the third time this project has shipped a denominator quietly containing a different
    population (market.py's position mix, insight 022's round-vs-league-size). Check the
    population before the statistic, every time."""
    rp = roster_positions or []
    return any(p in ("SUPER_FLEX", "SUPERFLEX") for p in rp) or rp.count("QB") >= 2
#: Below this many comparable drafts, print the drafts and refuse to summarise them.
MIN_DRAFTS = 3

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                          # a non-reconfigurable piped stream degrades, never dies
    pass


def _get(url, timeout=25):
    """Cache-busted GET. Every Sleeper URL in this repo carries a unique nonce -- Cloudflare
    serves a stale contiguous prefix otherwise and every gate we own passes it (insight 020)."""
    sep = "&" if "?" in url else "?"
    req = urllib.request.Request(f"{url}{sep}cb={uuid.uuid4().hex}",
                                 headers={"User-Agent": "family-feud-scout/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_all(delay=0.4):
    """Pull every league, draft, pick and roster for every member of the league. Sequential
    with a delay -- rate-limit safety, per project convention."""
    os.makedirs(CACHE, exist_ok=True)
    members = _get(f"https://api.sleeper.app/v1/league/{LEAGUE_ID}/users")
    print(f"  {len(members)} league members")
    for m in members:
        uid, name = m["user_id"], m["display_name"]
        record = {"user_id": uid, "display_name": name, "leagues": []}
        for season in SEASONS:
            try:
                leagues = _get(f"https://api.sleeper.app/v1/user/{uid}/leagues/nfl/{season}")
            except urllib.error.URLError as e:
                print(f"    !! {name} {season}: {e}")
                continue
            time.sleep(delay)
            for lg in leagues:
                lid = lg["league_id"]
                entry = {"season": season, "league_id": lid, "name": lg.get("name"),
                         "teams": lg.get("total_rosters"),
                         "rec": (lg.get("scoring_settings") or {}).get("rec"),
                         "roster_positions": lg.get("roster_positions"),
                         "drafts": [], "record": None}
                try:
                    rosters = _get(f"https://api.sleeper.app/v1/league/{lid}/rosters")
                    time.sleep(delay)
                    mine = next((r for r in rosters if r.get("owner_id") == uid), None)
                    if mine:
                        st = mine.get("settings") or {}
                        pf = st.get("fpts", 0) + (st.get("fpts_decimal") or 0) / 100
                        ordered = sorted(rosters, key=lambda r: -(
                            (r.get("settings") or {}).get("fpts", 0)
                            + ((r.get("settings") or {}).get("fpts_decimal") or 0) / 100))
                        entry["record"] = {
                            "wins": st.get("wins"), "losses": st.get("losses"),
                            "points_for": round(pf, 1),
                            "pf_rank": [r.get("roster_id") for r in ordered]
                                       .index(mine.get("roster_id")) + 1,
                            "of": len(rosters)}
                except urllib.error.URLError as e:
                    print(f"    !! rosters {lid}: {e}")
                try:
                    drafts = _get(f"https://api.sleeper.app/v1/league/{lid}/drafts")
                    time.sleep(delay)
                except urllib.error.URLError as e:
                    print(f"    !! drafts {lid}: {e}")
                    drafts = []
                for d in drafts:
                    did = d["draft_id"]
                    try:
                        picks = _get(f"https://api.sleeper.app/v1/draft/{did}/picks")
                        time.sleep(delay)
                    except urllib.error.URLError as e:
                        print(f"    !! picks {did}: {e}")
                        continue
                    mine = [p for p in picks if p.get("picked_by") == uid]
                    # The whole-draft QB order is what tells reaching apart from taking a turn,
                    # so it is derived HERE, while the full pick list is in hand, rather than
                    # re-fetched later.
                    qb_order = [p.get("pick_no") for p in sorted(picks, key=lambda x: x.get("pick_no") or 0)
                                if (p.get("metadata") or {}).get("position") == "QB"]
                    entry["drafts"].append({
                        "draft_id": did, "type": d.get("type"),
                        "rounds": (d.get("settings") or {}).get("rounds"),
                        "slot": (d.get("draft_order") or {}).get(uid),
                        "total_picks": len(picks), "qb_pick_nos": qb_order,
                        "picks": [{"round": p.get("round"), "pick_no": p.get("pick_no"),
                                   "pos": (p.get("metadata") or {}).get("position"),
                                   "name": f"{(p.get('metadata') or {}).get('first_name', '')} "
                                           f"{(p.get('metadata') or {}).get('last_name', '')}".strip(),
                                   "is_keeper": p.get("is_keeper")}
                                  for p in sorted(mine, key=lambda x: x.get("pick_no") or 0)],
                    })
                record["leagues"].append(entry)
        path = os.path.join(CACHE, f"{uid}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=1)
        n_d = sum(len(l["drafts"]) for l in record["leagues"])
        n_p = sum(len(dd["picks"]) for l in record["leagues"] for dd in l["drafts"])
        print(f"    {name:<16} {len(record['leagues']):>2} leagues · {n_d:>2} drafts · {n_p:>3} picks")
    return True


def load():
    if not os.path.isdir(CACHE):
        raise SystemExit(f"no scouting cache at {CACHE} -- run with --fetch first")
    out = []
    for fn in sorted(os.listdir(CACHE)):
        if fn.endswith(".json"):
            with open(os.path.join(CACHE, fn), encoding="utf-8") as f:
                out.append(json.load(f))
    return out


def comparable(record):
    """The drafts that tell us about redraft behaviour, and the ones that cannot."""
    keep, skip = [], []
    for lg in record["leagues"]:
        for d in lg["drafts"]:
            ctx = dict(d, season=lg["season"], league=lg["name"], teams=lg["teams"],
                       rec=lg["rec"], roster_positions=lg.get("roster_positions"),
                       record=lg["record"],
                       superflex=is_superflex(lg.get("roster_positions")))
            if (d["type"] == "snake" and len(d["picks"]) >= MIN_PICKS_FOR_REDRAFT
                    and not (d["rounds"] or 0) > MAX_ROUNDS_FOR_REDRAFT
                    and not ctx["superflex"]):
                keep.append(ctx)
            else:
                skip.append(ctx)
    return keep, skip


def first_round_of(draft, pos):
    for p in draft["picks"]:
        if p["pos"] == pos:
            return p["round"]
    return None


def profile(record, verbose=False):
    name = record["display_name"]
    keep, skip = comparable(record)
    print(f"\n{'=' * 78}\n  {name}   ({record['user_id']})")
    if not keep:
        print(f"    NO COMPARABLE REDRAFTS. {len(skip)} other draft(s) on file"
              f"{' -- brand-new account, nothing to scout' if not skip else ''}.")
        for s in skip:
            print(f"      {s['season']} {s['league']} ({s['teams']}tm, {s['type']}, "
                  f"{len(s['picks'])} picks)")
        return
    n_sf = sum(1 for s in skip if s.get("superflex"))
    print(f"    {len(keep)} comparable redraft(s); {len(skip)} excluded "
          f"(dynasty startup / rookie draft"
          f"{f' / {n_sf} SUPERFLEX' if n_sf else ''})")

    recs = []
    seen = set()
    for d in keep:
        r = d.get("record")
        if r and d["league"] + d["season"] not in seen:
            seen.add(d["league"] + d["season"])
            recs.append((d["season"], d["league"], d["teams"], r))
    if recs:
        print("\n    RESULTS")
        for season, lg, teams, r in sorted(recs):
            print(f"      {season} {lg[:26]:<26} {teams:>2}tm  "
                  f"{str(r['wins']) + '-' + str(r['losses']):>6}  "
                  f"{r['points_for']:>7.1f} PF  ({r['pf_rank']} of {r['of']})")

    if len(keep) < MIN_DRAFTS:
        print(f"\n    ⚠️  {len(keep)} draft(s) is below the {MIN_DRAFTS} this file needs before it "
              f"will state a tendency.\n        The drafts themselves, so you can read them "
              f"directly:")
        for d in keep:
            print(f"      {d['season']} {d['league']} ({d['teams']}tm, slot {d['slot']}): "
                  f"{' '.join(p['pos'] or '?' for p in d['picks'][:14])}")
        return

    print("\n    SHAPE OF EACH DRAFT (first 14 picks)")
    for d in keep:
        print(f"      {d['season']} {d['league'][:22]:<22} {d['teams']:>2}tm slot {str(d['slot']):>4}  "
              f"{' '.join(p['pos'] or '?' for p in d['picks'][:14])}")

    print("\n    FIRST OF EACH POSITION, by round")
    firsts = collections.defaultdict(list)
    for d in keep:
        for pos in ("QB", "TE", "K", "DEF"):
            r = first_round_of(d, pos)
            if r:
                firsts[pos].append(r)
    for pos in ("QB", "TE", "K", "DEF"):
        v = sorted(firsts[pos])
        if v:
            print(f"      {pos:<4} {str(v):<28} median R{v[len(v) // 2]}, earliest R{v[0]}, "
                  f"in {len(v)}/{len(keep)} drafts")
        else:
            print(f"      {pos:<4} never taken in any comparable draft")

    # HOW EARLY IS THE QB *RELATIVE TO THE ROOM*. A round number alone cannot separate "reached"
    # from "took his turn" -- a 12-team R2 and an 8-team R2 are different picks.
    nths = []
    for d in keep:
        hq = next((p for p in d["picks"] if p["pos"] == "QB"), None)
        if not hq or not d.get("qb_pick_nos"):
            continue
        nths.append(sum(1 for n in d["qb_pick_nos"] if n < (hq["pick_no"] or 0)) + 1)
    if nths:
        print(f"\n    QB TAKEN AS THE {sorted(nths)} -th QB off the board "
              f"(median {sorted(nths)[len(nths) // 2]})")

    early = collections.Counter()
    for d in keep:
        for p in d["picks"][:5]:
            early[p["pos"]] += 1
    tot = sum(early.values()) or 1
    print("\n    FIRST FIVE PICKS, positional mix")
    for pos, n in early.most_common():
        print(f"      {pos:<4} {n:>3}/{tot}  {100 * n / tot:4.0f}%")

    if verbose:
        print("\n    EVERY COMPARABLE DRAFT, IN FULL")
        for d in keep:
            print(f"\n      {d['season']} {d['league']} ({d['teams']}tm, slot {d['slot']}, "
                  f"rec={d['rec']})")
            for p in d["picks"]:
                print(f"        R{p['round']:<2} #{str(p['pick_no']):<4} {str(p['pos']):<4} "
                      f"{p['name']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fetch", action="store_true", help="refresh from Sleeper before analysing")
    ap.add_argument("--user", help="only this display_name (case-insensitive), in full")
    args = ap.parse_args()

    if args.fetch:
        print("  fetching (sequential, ~0.4s between calls)...")
        fetch_all()
        print()

    records = load()
    if args.user:
        want = args.user.lower()
        records = [r for r in records if r["display_name"].lower() == want]
        if not records:
            raise SystemExit(f"no scouting record for {args.user!r}")
    for r in sorted(records, key=lambda r: r["display_name"].lower()):
        if r["user_id"] == BRIGGSY:
            continue                       # our own seat is not an opponent
        profile(r, verbose=bool(args.user))


if __name__ == "__main__":
    main()

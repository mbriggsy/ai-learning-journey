#!/usr/bin/env python3
"""Game-day lineup check: is anyone we start tagged, and is there a better body on the bench?

    python scripts/gameday_check.py            # live pull, appends to newsletter/data/state/GAMEDAY.md
    python scripts/gameday_check.py --stdout   # print only, write nothing (for a session that just wants a look)

WHY THIS EXISTS. Week 1, 2026: Stevenson banked 14.5 on our bench while Swift started at FLEX2
against a 13.5 projection, and the two adds the outlook owed before Wednesday never happened.
Nobody was in the room. Every alert this project owns fires on DRAFT state; nothing had ever
looked at a LINEUP. This is the first thing that does, and it runs on a clock, not on a session.

WHAT IT READS -- all LIVE, never the mule's cargo. The mule hauls hourly and that is fine for a
draft date; an Out tag that lands at 11:35 before a 13:00 kickoff is not an hourly fact.
  * /state/nfl              -> the week
  * /league/<id>/rosters    -> who starts whom (ours and the opponent's)
  * /league/<id>/matchups/w -> who the opponent IS this week
  * /players/nfl            -> injury tags, positions, names (the ~14 MB dump; once per run is fine)
  * /projections/nfl/<season>/<week> -> Sleeper's per-player projections, scored with OUR league's
    scoring_settings so "bench beats starter" is measured in the points this league actually pays

WHAT IT SAYS, most urgent first:
  🚨 a starter tagged Out / Doubtful / IR / Suspended, or an empty slot -- with the best eligible
     untagged bench body by projection, so the fix is one click, not a research task
  ⚠  a starter tagged Questionable -- named, with the fallback, NOT auto-recommended: Questionable
     in September is mostly "played through it" and swapping a WR1 for a bench body on that tag
     loses more weeks than it saves
  ↑  a bench player out-projecting a starter he could replace by more than SWAP_MARGIN points
  ℹ  the opponent's tagged starters, because a late scratch on his side changes nothing we do but
     is the first thing Briggsy will ask

What it does NOT do: touch the lineup. Sleeper has no write API, the browser skill can set a slot,
and a scheduled task with nobody watching should not be clicking in a fantasy roster. It names the
move; a session fires it.

"Played" is decided by the projection's `date` being before today. A game dated today has not
kicked off when this runs at 08:00; a starter whose game is already banked is left alone even if
the score was ugly, because nothing can be done about him.

Exit codes mirror the draft watcher: 0 = ran, nothing urgent. 1 = something worth reading was
written (🚨 / ⚠ / ↑). 2 = could not reach Sleeper or the payload was not what we asked for.
"""
import argparse
import datetime
import json
import os
import sys
import urllib.error
import urllib.request
import random

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream degrades, never crashes
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STATE = os.path.join(ROOT, "newsletter", "data", "state")
OUT = os.path.join(STATE, "GAMEDAY.md")

LEAGUE_ID = "1390509993844809728"
# PoppaBriggsy. NOT briggsy007 -- that handle is Hunter, the opponent. docs/league.md.
BRIGGSY_USER_ID = "1390750540631150592"

API = "https://api.sleeper.app"
TIMEOUT = 60

#: Tags that mean "he is not playing". IR here is the roster tag on a player who is still in a
#: starting slot, which Sleeper permits and which scores zero.
NOT_PLAYING = {"Out", "Doubtful", "IR", "Sus", "Suspended", "PUP", "NA", "COV"}
MAYBE = {"Questionable"}

FLEX_ELIGIBLE = {"RB", "WR", "TE"}
#: A bench body has to beat the starter by this many projected points before the ↑ line fires.
#: Projections are noisy at the 1-2 point level; a swap on that margin is churn, not edge.
SWAP_MARGIN = 2.0


class Refuse(Exception):
    """Raised rather than reporting off a payload that is not what we asked for."""


def now():
    return datetime.datetime.now()


def fetch(path, timeout=TIMEOUT):
    """GET with a per-call nonce -- the Sleeper CDN caches by URL (docs/insights/020)."""
    sep = "&" if "?" in path else "?"
    url = f"{API}{path}{sep}nc={random.randrange(1 << 30)}"
    req = urllib.request.Request(url, headers={"User-Agent": "family-feud-gameday/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            if r.status != 200:
                raise Refuse(f"{path}: HTTP {r.status}")
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        raise Refuse(f"{path}: {e}") from e


def score(stats, scoring):
    """Points this league pays for a Sleeper stat line. Missing stats are zero, unknown stats ignored."""
    if not stats:
        return 0.0
    return sum(scoring.get(k, 0.0) * v for k, v in stats.items() if k in scoring and isinstance(v, (int, float)))


def eligible(pos, slot):
    if slot == "FLEX":
        return pos in FLEX_ELIGIBLE
    return pos == slot


def assess(our, opp, players, proj, scoring, roster_positions, today):
    """Pure. Everything the report says, as (icon, title, body) rows, most urgent first.

    our / opp: roster dicts from /rosters (starters, players, reserve, roster_id).
    players:   /players/nfl dump (id -> {full_name, position, team, injury_status, ...}).
    proj:      id -> {"stats": {...}, "date": "YYYY-MM-DD", "opponent": "XXX"}.
    scoring:   the league's scoring_settings.
    roster_positions: the league's slot list; starters are positional against its non-BN prefix.
    today:     a datetime.date; a projection dated before it is a game already played.
    """
    slots = [s for s in roster_positions if s != "BN"]

    def pdata(pid):
        return players.get(pid) or {}

    def name(pid):
        p = pdata(pid)
        if p.get("position") == "DEF":
            return f"{pid} DEF"
        return p.get("full_name") or f"?{pid}"

    def tag(pid):
        return pdata(pid).get("injury_status") or ""

    def pts(pid):
        return score((proj.get(pid) or {}).get("stats"), scoring)

    def played(pid):
        d = (proj.get(pid) or {}).get("date")
        if not d:
            return False                # no projection = no game this week (bye) -> treated as unplayed, scores 0
        return datetime.date.fromisoformat(d) < today

    def has_game(pid):
        return bool((proj.get(pid) or {}).get("date"))

    def describe(pid):
        p = pdata(pid)
        game = proj.get(pid) or {}
        vs = f" vs {game['opponent']}" if game.get("opponent") else " (no game this week)"
        t = f" [{tag(pid)}" + (f": {p['injury_body_part']}" if p.get("injury_body_part") else "") + "]" if tag(pid) else ""
        return f"{name(pid)} ({p.get('position') or '?'}, {p.get('team') or 'FA'}){vs} proj {pts(pid):.1f}{t}"

    rows = []
    starters = list(our.get("starters") or [])
    reserve = set(our.get("reserve") or [])
    bench = [p for p in (our.get("players") or []) if p not in starters and p not in reserve]
    claimed = set()

    def best_bench_for(slot):
        cands = [
            b for b in bench
            if b not in claimed and eligible(pdata(b).get("position"), slot)
            and tag(b) not in NOT_PLAYING and has_game(b) and not played(b)
        ]
        if not cands:
            return None
        return max(cands, key=pts)

    # --- 🚨 a starter who will not play, or an empty slot ----------------------------------
    for slot, pid in zip(slots, starters):
        if pid in ("0", "", None):
            sub = best_bench_for(slot)
            body = f"The {slot} slot is EMPTY."
            if sub:
                claimed.add(sub)
                body += f"\nStart: {describe(sub)}"
            rows.append(("🚨", f"EMPTY SLOT — {slot}", body))
            continue
        if played(pid):
            continue
        if tag(pid) in NOT_PLAYING or not has_game(pid):
            why = f"tagged {tag(pid)}" if tag(pid) in NOT_PLAYING else "has NO GAME this week (bye)"
            sub = best_bench_for(slot)
            body = f"{describe(pid)} is {why} in the {slot} slot."
            if sub:
                claimed.add(sub)
                body += f"\nStart instead: {describe(sub)}"
            else:
                body += f"\nNo untagged bench body is eligible for {slot}. An add is needed."
            rows.append(("🚨", f"STARTER NOT PLAYING — {name(pid)} ({slot})", body))

    # --- ⚠ Questionable starters: named, with the fallback, not recommended -----------------
    for slot, pid in zip(slots, starters):
        if pid in ("0", "", None) or played(pid) or tag(pid) not in MAYBE:
            continue
        sub = best_bench_for(slot)
        body = (f"{describe(pid)} is Questionable in the {slot} slot. Read as playing unless the "
                f"morning inactives say otherwise; inactives post ~90 minutes before kickoff.")
        if sub:
            body += f"\nIf he is scratched: {describe(sub)}"
        rows.append(("⚠", f"QUESTIONABLE — {name(pid)} ({slot})", body))

    # --- ↑ a bench body out-projecting a starter he could replace -------------------------
    for b in bench:
        if b in claimed or tag(b) in NOT_PLAYING or tag(b) in MAYBE or not has_game(b) or played(b):
            continue
        bpos = pdata(b).get("position")
        best_gain, best_slot, best_pid = 0.0, None, None
        for slot, pid in zip(slots, starters):
            if pid in ("0", "", None) or played(pid) or not eligible(bpos, slot):
                continue
            gain = pts(b) - pts(pid)
            if gain > best_gain:
                best_gain, best_slot, best_pid = gain, slot, pid
        if best_slot and best_gain >= SWAP_MARGIN:
            rows.append(("↑", f"BENCH BEATS STARTER — {name(b)} over {name(best_pid)} ({best_slot})",
                         f"{describe(b)} projects {best_gain:.1f} more than {describe(best_pid)}.\n"
                         f"Projection only — a {SWAP_MARGIN:.0f}+ point gap is worth a look, not an order."))

    # --- ℹ the opponent's side --------------------------------------------------------------
    if opp:
        theirs = []
        for slot, pid in zip(slots, opp.get("starters") or []):
            if pid in ("0", "", None):
                theirs.append(f"{slot}: EMPTY")
            elif tag(pid) and not played(pid):
                theirs.append(f"{slot}: {describe(pid)}")
            elif not has_game(pid) and not played(pid):
                theirs.append(f"{slot}: {describe(pid)} — NO GAME")
        if theirs:
            rows.append(("ℹ", "OPPONENT'S TAGGED STARTERS", "\n".join(theirs)))

    return rows


def projected_total(roster, proj, scoring, points_so_far, today):
    """Banked actuals for played starters + projections for the rest."""
    total = 0.0
    for pid in roster.get("starters") or []:
        if pid in ("0", "", None):
            continue
        d = (proj.get(pid) or {}).get("date")
        if d and datetime.date.fromisoformat(d) < today:
            total += float((points_so_far or {}).get(pid) or 0.0)
        else:
            total += score((proj.get(pid) or {}).get("stats"), scoring)
    return total


def pull():
    state = fetch("/v1/state/nfl")
    if not isinstance(state, dict) or "week" not in state:
        raise Refuse("/state/nfl did not carry a week")
    week, season = state["week"], state["season"]
    league = fetch(f"/v1/league/{LEAGUE_ID}")
    rosters = fetch(f"/v1/league/{LEAGUE_ID}/rosters")
    users = fetch(f"/v1/league/{LEAGUE_ID}/users")
    matchups = fetch(f"/v1/league/{LEAGUE_ID}/matchups/{week}")
    players = fetch("/v1/players/nfl")
    raw = fetch(f"/projections/nfl/{season}/{week}?season_type={state.get('season_type', 'regular')}"
                "&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF")
    for label, val, kind in (("league", league, dict), ("rosters", rosters, list), ("users", users, list),
                             ("matchups", matchups, list), ("players", players, dict), ("projections", raw, list)):
        if not isinstance(val, kind):
            raise Refuse(f"{label} is {type(val).__name__}, expected {kind.__name__}")
    proj = {p["player_id"]: {"stats": p.get("stats") or {}, "date": p.get("date"), "opponent": p.get("opponent")}
            for p in raw if p.get("player_id")}
    return state, league, rosters, users, matchups, players, proj


def sides(rosters, users, matchups):
    ours = next((r for r in rosters if r.get("owner_id") == BRIGGSY_USER_ID), None)
    if not ours:
        raise Refuse(f"no roster owned by {BRIGGSY_USER_ID} (PoppaBriggsy) in /rosters")
    mine = next((m for m in matchups if m.get("roster_id") == ours["roster_id"]), None)
    opp = opp_m = None
    if mine and mine.get("matchup_id") is not None:
        opp_m = next((m for m in matchups if m.get("matchup_id") == mine["matchup_id"]
                      and m.get("roster_id") != ours["roster_id"]), None)
        if opp_m:
            opp = next((r for r in rosters if r["roster_id"] == opp_m["roster_id"]), None)
    names = {u["user_id"]: u.get("display_name") for u in users}
    return ours, mine, opp, opp_m, names


def render(week, ours, mine, opp, opp_m, names, rows, proj, scoring, today, stamp):
    us_total = projected_total(ours, proj, scoring, (mine or {}).get("players_points"), today)
    head = [f"## WEEK {week} GAME DAY — {stamp}", ""]
    if opp:
        them = projected_total(opp, proj, scoring, (opp_m or {}).get("players_points"), today)
        head.append(f"vs **{names.get(opp.get('owner_id')) or '?'}** (roster {opp['roster_id']}). "
                    f"Expected: us {us_total:.1f}, them {them:.1f} "
                    f"(banked {float((mine or {}).get('points') or 0):.1f} / {float((opp_m or {}).get('points') or 0):.1f}, "
                    f"projections for the rest).")
    else:
        head.append(f"No matchup found for week {week}. Expected {us_total:.1f}.")
    head.append("")
    if not rows:
        head.append("Nothing to do. Every starter is untagged, every slot filled, no bench body projects "
                    f"{SWAP_MARGIN:.0f}+ over a starter he could replace.")
    for icon, title, body in rows:
        head += [f"### {icon} {title}", "", body, ""]
    return "\n".join(head).rstrip() + "\n"


def write(text):
    os.makedirs(STATE, exist_ok=True)
    new = not os.path.exists(OUT)
    with open(OUT, "a", encoding="utf-8") as f:
        if new:
            f.write("# Game-day lineup checks\n\n"
                    "Written by `scripts/gameday_check.py` on a schedule. Append-only — newest at the bottom.\n"
                    "Every entry is stamped with when it ran; a 🚨 read late is still a 🚨.\n")
        f.write("\n---\n\n" + text)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--stdout", action="store_true", help="print the report and write nothing")
    args = ap.parse_args(argv)
    try:
        state, league, rosters, users, matchups, players, proj = pull()
        ours, mine, opp, opp_m, names = sides(rosters, users, matchups)
    except Refuse as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2
    today = now().date()
    rows = assess(ours, opp, players, proj, league.get("scoring_settings") or {},
                  league.get("roster_positions") or [], today)
    text = render(state["week"], ours, mine, opp, opp_m, names, rows, proj,
                  league.get("scoring_settings") or {}, today, now().strftime("%Y-%m-%d %H:%M:%S"))
    print(text)
    if not args.stdout:
        write(text)
    urgent = any(icon in ("🚨", "⚠", "↑") for icon, _, _ in rows)
    return 1 if urgent else 0


if __name__ == "__main__":
    sys.exit(main())

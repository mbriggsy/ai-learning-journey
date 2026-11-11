#!/usr/bin/env python3
"""The in-season paper's one snapshot: rosters, matchups, three-site projections, kickoffs.

    python scripts/season_cargo.py            # pull, write newsletter/data/inbox/season_cargo.json
    python scripts/season_cargo.py --stdout   # pull, print a summary, write nothing

WHY THIS EXISTS. From the night the draft finished, The Nightly Feud is built around our roster:
who is hurt, who to start, who is worth a claim, where we stand. Every one of those needs facts the
hourly mule does not haul -- a 16 MB player dump for names and injury tags, Sleeper's projections,
CBS's and ESPN's (Briggsy's rule, 2026-10-14: a lineup or waiver call never reads Sleeper alone),
and ESPN's kickoff times. This pulls them ONCE, for the one paper printed a night, and writes ONE
file. `scripts/build_newsletter.py` runs it before building and reads nothing else for its
in-season sections, so the roster, the score and the projections all describe the same minute.

WHY NOT THE MULE. The mule runs 24 times a day. Twenty-four player dumps and 288 CBS pages a day
would buy a paper that prints once a day (04:45 since 2026-11-11) nothing at all.

WHAT IT REUSES -- no new fetcher, no new id map, no new scoring:
  * external_projections.load(week)  -> everything joined and scored by OUR rules, for this week and
    the next. (Each call pulls the player dump again; trade_eval.load pays the same price.)
  * gameday_check.pull / fetch / pull_board / kickoffs_from_espn / games_from_espn
  * trade_eval.playoff_weeks / bye_teams / why

WHAT CAN GO WRONG, AND WHAT IS WRITTEN WHEN IT DOES. ANY exception from the three-site pull counts,
not only a Refuse (an empty crosswalk raises IndexError, an HTML page from ESPN a JSONDecodeError):
  * a week's three-site pull fails -> that week is written SLEEPER ONLY with the reason. The paper
    then prints the roster, tags and score for it and makes no start/sit or waiver call.
  * ESPN's scoreboard fails, or serves a different week -> that week has no kickoffs and says why.
    The paper withholds the calls: it cannot know who is locked.
  * CBS serves the wrong week (TODO, found 2026-10-18: any week two or more ahead comes back as the
    current one) -> seen as a CBS number on a player whose team is on bye. That week's CBS column is
    dropped and flagged.
  * Sleeper itself fails -> nothing is written, exit 2, and the kept snapshot stays as it was.
The file is written whole to `.partial` and swapped in, so a pull that dies halfway never leaves
half a snapshot under the real name.
"""
import argparse
import datetime
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "newsletter", "data", "inbox", "season_cargo.json")

sys.path.insert(0, HERE)

import external_projections as x  # noqa: E402
import gameday_check as g  # noqa: E402
import trade_eval as te  # noqa: E402

POSITIONS = ("QB", "RB", "WR", "TE", "K", "DEF")
SITES = ("sleeper", "cbs", "espn")
PAUSE = 0.5          # sequential, polite (global rule: rate-limit safety)
MIN_DEFS = 20        # fewer defenses with an opponent than this is a broken answer, not 12 byes
PROJ_PATH = ("/projections/nfl/{season}/{week}?season_type=regular"
             "&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF")
DEF_PATH = "/projections/nfl/{season}/{week}?season_type=regular&position[]=DEF"


def owned_ids(rosters):
    """Every player on any roster in the league: active, IR or taxi."""
    out = set()
    for r in rosters or []:
        for key in ("players", "reserve", "taxi"):
            out |= set(r.get(key) or [])
    return out


def sleeper_rows(players, proj, scoring):
    """The Sleeper-only fallback, in external_projections' row shape with CBS and ESPN empty."""
    opp_of = {t: (proj.get(t) or {}).get("opponent")
              for t in {p.get("team") for p in players.values() if p.get("team")}}
    rows = {}
    for sid, line in proj.items():
        p = players.get(sid) or {}
        pos = p.get("position") or ("DEF" if str(sid).isalpha() else None)
        if pos not in POSITIONS:
            continue
        rows[sid] = {
            "name": p.get("full_name") or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or sid,
            "pos": pos, "team": p.get("team") or (sid if pos == "DEF" else None),
            "opp": line.get("opponent") or opp_of.get(p.get("team") or sid),
            "inj": p.get("injury_status"), "sleeper": g.score(line.get("stats"), scoring),
            "cbs": None, "espn": None,
        }
    return rows


def trim(rows, players, keep):
    """Only what the paper can use: a row for every rostered player in the league, and for anyone
    some site gives a number above zero. Adds the injury detail the joined rows do not carry."""
    out = {}
    for sid, r in rows.items():
        priced = any(isinstance(r.get(s), (int, float)) and r[s] > 0 for s in SITES)
        # Every team defense is kept, priced or not: a DEF row with no opponent IS the bye rule, and
        # a bye team nobody rosters would otherwise vanish from the week (caught by a test, 2026-11-09).
        if sid not in keep and not priced and r.get("pos") != "DEF":
            continue
        p = players.get(sid) or {}
        out[sid] = {
            "name": r.get("name"), "pos": r.get("pos"), "team": r.get("team"), "opp": r.get("opp"),
            "inj": r.get("inj"), "sleeper": r.get("sleeper"), "cbs": r.get("cbs"), "espn": r.get("espn"),
            "body": p.get("injury_body_part"), "notes": p.get("injury_notes"),
            "practice": p.get("practice_description") or p.get("practice_participation"),
        }
    # A rostered player with no row at all (Sleeper deleted it, CBS and ESPN never had him) still
    # has a name and a tag, and the roster report must be able to print them.
    for sid in keep:
        if sid in out:
            continue
        p = players.get(sid)
        if not p:
            continue
        pos = p.get("position") or ("DEF" if str(sid).isalpha() else None)
        out[sid] = {
            "name": p.get("full_name") or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or sid,
            "pos": pos, "team": p.get("team") or (sid if pos == "DEF" else None), "opp": None,
            "inj": p.get("injury_status"), "sleeper": None, "cbs": None, "espn": None,
            "body": p.get("injury_body_part"), "notes": p.get("injury_notes"),
            "practice": p.get("practice_description") or p.get("practice_participation"),
        }
    return out


def bye_set(rows, teams):
    """Teams on bye in a week, or None when the week cannot say.

    Every team WITHOUT a defense that has an opponent -- counted from the full list of teams, never
    from the rows alone. The sources usually leave a bye team's defense out altogether, so "a DEF
    row with no opponent" found one of week 10's four byes and none of week 9's two (review
    2026-11-09). Never a player's own missing row, which Sleeper also produces for a man who is out.
    """
    with_opp = {sid for sid, r in rows.items() if r.get("pos") == "DEF" and r.get("opp")}
    if len(with_opp) < MIN_DEFS:
        return None
    return set(teams) - with_opp


def cbs_wrong_week(rows, byes):
    """True when CBS priced a player whose team is on bye: it served some other week's numbers."""
    if not byes:
        return False
    return any(r.get("pos") != "DEF" and r.get("team") in byes
               and isinstance(r.get("cbs"), (int, float)) and r["cbs"] > 0 for r in rows.values())


def drop_cbs(rows):
    for r in rows.values():
        r["cbs"] = None


def espn_week(season, week, season_type):
    """(kickoffs, games, why). Kickoffs and game states are read off ONE fetch, SEPARATELY, so a
    field ESPN changes in one cannot cost the other. A board for another week is refused whole."""
    try:
        board = g.pull_board(season, week, season_type)
    except Exception as e:  # noqa: BLE001 -- a secondary source never kills the pull
        return None, None, te.why(e)
    served = (board.get("week") or {}).get("number") if isinstance(board, dict) else None
    if isinstance(served, int) and served != week:
        return None, None, f"ESPN served week {served}, not week {week}"
    kickoffs = games = None
    reasons = []
    try:
        kickoffs = {t: k.astimezone(datetime.timezone.utc).isoformat()
                    for t, k in g.kickoffs_from_espn(board).items()}
    except Exception as e:  # noqa: BLE001
        reasons.append(te.why(e))
    try:
        games = {t: list(v) for t, v in g.games_from_espn(board).items()}
    except Exception as e:  # noqa: BLE001
        reasons.append(te.why(e))
    return kickoffs, games, "; ".join(reasons) or None


def pull():
    """The whole snapshot as one dict. Raises only when Sleeper itself cannot be read."""
    weeks, notes = {}, []
    try:
        meta, rows, (state, league, rosters, users, matchups, players) = x.load()
        first = {"three_site": True, "why": None, "rows": rows,
                 "meta": {k: meta.get(k) for k in ("cbs_rows", "espn_rows", "cbs_map_median_miss",
                                                   "espn_map_median_miss")}}
    except Exception as e:  # noqa: BLE001 -- see the docstring: ANY failure, not only a Refuse
        reason = te.why(e)
        state, league, rosters, users, matchups, players, proj = g.pull()
        first = {"three_site": False, "why": reason, "meta": {},
                 "rows": sleeper_rows(players, proj, league.get("scoring_settings") or {})}
    season, week = state["season"], state["week"]
    season_type = state.get("season_type", "regular")
    last = te.playoff_weeks(league)[-1]
    over = season_type != "regular" or week > last
    keep = owned_ids(rosters)
    snap = {
        "pulled": g.now().isoformat(timespec="seconds"),
        "state": state, "league": league, "rosters": rosters, "users": users,
        "last_week": last, "season_over": over,
        "matchups": {str(week): matchups}, "weeks": {}, "byes": {},
    }
    if over:
        return snap

    weeks[week] = first
    if week + 1 <= last:
        time.sleep(PAUSE)
        try:
            meta2, rows2, payload2 = x.load(week + 1)
            weeks[week + 1] = {"three_site": True, "why": None, "rows": rows2, "players": payload2[5],
                               "meta": {k: meta2.get(k) for k in ("cbs_rows", "espn_rows",
                                                                  "cbs_map_median_miss", "espn_map_median_miss")}}
        except Exception as e:  # noqa: BLE001
            reason = te.why(e)
            # Its own try: next week is the extra week six nights in seven, and a second failure
            # here must not throw away the good pull of THIS week that is already in hand.
            try:
                raw = g.fetch(PROJ_PATH.format(season=season, week=week + 1))
                if not isinstance(raw, list):
                    raise g.Refuse(f"week {week + 1} projections are {type(raw).__name__}, expected a list")
                proj2 = {p["player_id"]: {"stats": p.get("stats") or {}, "date": p.get("date"),
                                          "opponent": p.get("opponent")} for p in raw if p.get("player_id")}
                rows2 = sleeper_rows(players, proj2, league.get("scoring_settings") or {})
            except Exception as e2:  # noqa: BLE001
                reason += f"; Sleeper's own week-{week + 1} projections failed too ({te.why(e2)})"
                rows2 = {}
            weeks[week + 1] = {"three_site": False, "why": reason, "meta": {}, "rows": rows2}

    teams = {sid for sid, p in players.items() if p.get("position") == "DEF"}
    for w, wk in weeks.items():
        dump = wk.pop("players", None) or players
        byes = bye_set(wk["rows"], teams)                       # before the trim, from every row
        if byes is None:
            notes.append(f"week {w}'s byes could not be read, so a bye that week goes unnamed")
        else:
            snap["byes"][str(w)] = sorted(byes)
        wk["cbs_wrong_week"] = bool(wk["three_site"] and cbs_wrong_week(wk["rows"], byes))
        if wk["cbs_wrong_week"]:
            drop_cbs(wk["rows"])                                # the paper says so, from the flag
        wk["rows"] = trim(wk["rows"], dump, keep)
        time.sleep(PAUSE)
        wk["kickoffs"], wk["games"], wk["espn_why"] = espn_week(season, w, season_type)
        snap["weeks"][str(w)] = wk

    for w in (week - 1, week + 1):
        if w < 1 or w > last:
            continue
        time.sleep(PAUSE)
        try:
            m = g.fetch(f"/v1/league/{g.LEAGUE_ID}/matchups/{w}")
            if isinstance(m, list):
                snap["matchups"][str(w)] = m
        except Exception as e:  # noqa: BLE001 -- last week's final and next week's opponent are extras
            notes.append(f"week {w} matchups: {te.why(e)}")

    if week + 2 <= last:
        time.sleep(PAUSE)
        try:
            raw = g.fetch(DEF_PATH.format(season=season, week=week + 2))
            line = {p["player_id"]: p for p in raw if isinstance(p, dict) and p.get("player_id")}
            if len(line) >= MIN_DEFS:    # a short list is a broken answer: every team would read "bye"
                snap["byes"][str(week + 2)] = sorted(te.bye_teams(line, teams))
            else:
                notes.append(f"week {week + 2}'s byes could not be read (Sleeper listed {len(line)} "
                             f"defenses), so a bye that week goes unnamed")
        except Exception as e:  # noqa: BLE001
            notes.append(f"week {week + 2} byes: {te.why(e)}")
    snap["notes"] = notes
    return snap


def write(snap, path=None):
    path = path or OUT
    os.makedirs(os.path.dirname(path), exist_ok=True)
    partial = path + ".partial"
    try:
        with open(partial, "w", encoding="utf-8") as f:
            json.dump(snap, f)
        os.replace(partial, path)
    except BaseException:
        try:
            os.remove(partial)
        except OSError:
            pass
        raise
    return path


def summary(snap):
    if snap.get("season_over"):
        return f"ok (season over: week {snap['state'].get('week')}, last week {snap['last_week']})"
    parts = []
    for w, wk in sorted(snap["weeks"].items(), key=lambda kv: int(kv[0])):
        sites = "three sites" if wk["three_site"] else f"SLEEPER ONLY ({wk['why']})"
        espn = f"{len(wk['kickoffs'])} kickoffs" if wk.get("kickoffs") else f"no kickoffs ({wk.get('espn_why')})"
        parts.append(f"week {w}: {len(wk['rows'])} rows, {sites}, {espn}")
    return "ok (" + "; ".join(parts) + ")"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--stdout", action="store_true", help="pull and summarise, write nothing")
    a = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    try:
        snap = pull()
    except Exception as e:  # noqa: BLE001 -- the kept snapshot stays; the builder reads its age
        print(f"FAIL: {te.why(e)}")
        return 2
    if not a.stdout:
        write(snap)
    for note in snap.get("notes") or []:
        print(f"  [note] {note}")
    print(summary(snap))
    return 0


if __name__ == "__main__":
    sys.exit(main())

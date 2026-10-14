#!/usr/bin/env python3
"""Second and third opinions: CBS + ESPN weekly projections next to Sleeper's, all in OUR scoring.

    python scripts/external_projections.py              # this week: our roster, the opponent's, top free agents
    python scripts/external_projections.py --week 7     # a future week (CBS/ESPN publish ahead)
    python scripts/external_projections.py --json temp/proj_wk6.json   # also dump every joined row

WHY THIS EXISTS. Every in-season call this project made before 2026-10-14 (the FA scan, the Week 6
plan, the game-day check) read ONE projection source: Sleeper's. One source is one model's opinion
printed as a number. Briggsy's standing rule (2026-10-14): "always look externally for projections
for a more complete look." This is that look, as code, so it is never a manual step.

THE THREE SOURCES -- all public, all raw stat lines:
  * Sleeper -- /projections/nfl/<season>/<week>, via gameday_check.pull().
  * CBS     -- cbssports.com/fantasy/football/stats/<POS>/<season>/<week>/projections/ppr/. Full
    tables (measured 2026-10-14: QB 57, RB 98, WR 100, TE 100, K 28, DST 28 rows -- the bye teams'
    players are simply absent), kickers split by FG distance.
  * ESPN    -- the fantasy API's kona_player_info view: statSourceId 1 (projected), split 1 (one
    week), seasonId == season. Stats keyed by ESPN stat id.

WHY NOT FANTASYPROS (tried first, 2026-10-14). Its projections pages serve 10 rows per position to
an anonymous request, then a `report-page-fence` / `registration-module`: the rest is behind a
sign-up wall. Ten rows cannot price a free agent or a bench body, and getting around a registration
wall is not something this project does. DynastyProcess's db_fpecr_latest.csv republishes FP's
weekly ECR, but it was scraped 2026-10-09 -- last week's ranks on a Wednesday. Neither is a source.

EVERYTHING IS SCORED BY THIS LEAGUE'S RULES, not the sources'. A "PPR" number from CBS or ESPN uses
-2 per interception; ours is -1. Each raw stat line is translated to Sleeper stat keys and run
through the live league's `scoring_settings` (gameday_check.score), so the three columns are one unit.
Approximations, marked `~` on every row they touch:
  * DEF points allowed: ours is a bucket table, CBS publishes a mean. The mean's bucket is used.
    ESPN's DEF column is ESPN's own appliedTotal, which also scores yards allowed (we don't).
  * ESPN's K column is ESPN's own appliedTotal (distance-based, close to ours but not ours).
  * CBS's "50+" FG bucket is scored as 50-59 (+5); a 60-yarder would be +6 here. Not marked: rare.
  * Long-TD bonuses (+1 at 40, +2 at 50) are in no external stat line. Sleeper's carries them, so
    Sleeper reads slightly higher on big-play players by construction.

EACH STAT MAP IS PROVEN ON EVERY RUN, NOT TRUSTED. Both sources print their own fantasy total. Before
any number is used, every skill player's line is re-scored with that source's OWN default-PPR rules
and compared with the total the source printed. If the median miss exceeds MAP_TOLERANCE the run
REFUSES: a renumbered ESPN stat or a reshuffled CBS column would otherwise score every player wrong
while looking perfectly healthy. Measured 2026-10-14: Maye 20.215 recomputed vs 20.235 ESPN.

JOINS ARE ID-TO-ID, NEVER BY NAME (docs/insights/004 measured name similarity as inverted on this
population). CBS id -> sleeper_id via DynastyProcess db_playerids.csv's cbs_id, fetched live and
validated (the pinned draft-kit/cache copy is a draft-day snapshot and is never touched). ESPN id ->
sleeper_id via Sleeper's own `espn_id`, the crosswalk as fallback. Team defenses join on team code:
CBS's from its /nfl/teams/<CODE>/ link, ESPN's from its proTeams table (WSH is
gameday_check.ESPN_TO_SLEEPER's one alias). An unresolved code is reported, never guessed.

`consensus` is the mean of the sources that have the player; `n` says how many. A player only one
source projects shows n1 and should be read as such. `spread` (max - min) is the disagreement: a big
spread is the row to look at, because that is where one model knows something the others don't.
"""
import argparse
import csv
import html
import io
import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gameday_check as g  # noqa: E402  (pull, score, fetch, now, Refuse, ESPN_TO_SLEEPER, BRIGGSY_USER_ID)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
TIMEOUT = 30
Refuse = g.Refuse

XWALK_URL = "https://github.com/dynastyprocess/data/raw/master/files/db_playerids.csv"
CBS_URL = "https://www.cbssports.com/fantasy/football/stats/{pos}/{season}/{week}/projections/ppr/"
CBS_PAGES = ("QB", "RB", "WR", "TE", "K", "DST")
ESPN_URL = ("https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/"
            "leaguedefaults/3?scoringPeriodId={week}&view=kona_player_info")
ESPN_TEAMS_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}?view=proTeamSchedules_wl"

#: CBS column, keyed by the LONG tooltip label (the short ones repeat: "yds", "td", "avg") -> Sleeper key.
CBS_TO_SLEEPER = {
    "Pass Attempts": "pass_att", "Pass Completions": "pass_cmp", "Passing Yards": "pass_yd",
    "Touchdowns Passes": "pass_td", "Interceptions Thrown": "pass_int",
    "Rushing Attempts": "rush_att", "Rushing Yards": "rush_yd", "Rushing Touchdowns": "rush_td",
    "Receptions": "rec", "Receiving Yards": "rec_yd", "Receiving Touchdowns": "rec_td",
    "Fumbles Lost": "fum_lost",
    "Field Goals 1-19 Yards": "fgm_0_19", "Field Goals 20-29 Yards": "fgm_20_29",
    "Field Goals 30-39 Yards": "fgm_30_39", "Field Goals 40-49 Yards": "fgm_40_49",
    "Field Goals 50+ Yards": "fgm_50_59", "Extra Points Made": "xpm",
    "Interceptions": "int", "Safeties": "safe", "Sacks": "sack",
    "Defensive Fumbles Recovered": "fum_rec", "Forced Fumbles": "ff", "Defensive Touchdowns": "def_td",
}
#: Labels each CBS page MUST carry. A missing one means the layout moved: refuse.
CBS_EXPECT = {
    "QB": {"Passing Yards", "Touchdowns Passes", "Interceptions Thrown", "Rushing Yards", "Fantasy Points"},
    "RB": {"Rushing Yards", "Rushing Touchdowns", "Receptions", "Receiving Yards", "Fantasy Points"},
    "WR": {"Receptions", "Receiving Yards", "Receiving Touchdowns", "Rushing Yards", "Fantasy Points"},
    "TE": {"Receptions", "Receiving Yards", "Receiving Touchdowns", "Fantasy Points"},
    "K": {"Field Goals Made", "Field Goal Attempts", "Field Goals 40-49 Yards", "Field Goals 50+ Yards",
          "Extra Points Made", "Extra Points Attempted"},
    "DST": {"Interceptions", "Sacks", "Defensive Touchdowns", "Points Allowed", "Fantasy Points"},
}
#: CBS spells exactly one team differently from Sleeper (measured 2026-10-14: the only DST code that
#: did not resolve, of 28 playing teams).
CBS_TO_SLEEPER_TEAM = {"JAC": "JAX"}

#: ESPN stat id -> Sleeper key, skill positions.
ESPN_TO_SLEEPER_STAT = {
    "3": "pass_yd", "4": "pass_td", "20": "pass_int", "19": "pass_2pt",
    "24": "rush_yd", "25": "rush_td", "26": "rush_2pt",
    "53": "rec", "42": "rec_yd", "43": "rec_td", "44": "rec_2pt",
    "72": "fum_lost",
}
ESPN_SLOTS = (0, 2, 4, 6, 16, 17)   # QB RB WR TE D/ST K
ESPN_POS = {1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DEF"}

#: The sources' OWN default PPR -- used only to prove each stat map reproduces the source's total.
SOURCE_PPR = {"pass_yd": 0.04, "pass_td": 4, "pass_int": -2, "pass_2pt": 2, "rush_yd": 0.1, "rush_td": 6,
              "rush_2pt": 2, "rec": 1, "rec_yd": 0.1, "rec_td": 6, "rec_2pt": 2, "fum_lost": -2}
MAP_TOLERANCE = 0.30   # median |recomputed - source total| over skill players, in points

#: Points-allowed buckets (Sleeper keys), inclusive. 21-27 scores 0 here and has no key.
PA_BUCKETS = ((0, 0, "pts_allow_0"), (1, 6, "pts_allow_1_6"), (7, 13, "pts_allow_7_13"),
              (14, 20, "pts_allow_14_20"), (21, 27, None), (28, 34, "pts_allow_28_34"),
              (35, 999, "pts_allow_35p"))


def _get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            if r.status != 200:
                raise Refuse(f"{url}: HTTP {r.status}")
            return r.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError) as e:
        raise Refuse(f"{url}: {e}") from e


def _num(cell):
    s = html.unescape(re.sub(r"<[^>]+>", "", cell)).strip().replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def pa_bucket_key(pa):
    for lo, hi, key in PA_BUCKETS:
        if lo <= round(pa) <= hi:
            return key
    return None


def _prove(misses, source):
    if len(misses) < 50:
        raise Refuse(f"{source}: only {len(misses)} skill-player lines to prove the stat map on")
    med = statistics.median(misses)
    if med > MAP_TOLERANCE:
        raise Refuse(f"{source}: the stat map no longer reproduces {source}'s own totals (median miss "
                     f"{med:.2f} > {MAP_TOLERANCE}) -- a column moved; every {source} number would be wrong")
    return med


# ------------------------------------------------------------------ CBS


def parse_cbs(page, pos):
    """One CBS projections page -> [{key, cols{long label: float}}]. key = CBS player id, or team code for DST."""
    i, j = page.find("<thead"), page.find("</thead>")
    if i < 0 or j < 0:
        raise Refuse(f"CBS {pos}: no table header on the page")
    labels = []
    for th in re.findall(r"<th[ >].*?</th>", page[i:j], re.S):
        tip = re.findall(r'class="Tablebase-tooltipInner">\s*(.*?)\s*</', th, re.S)
        if tip:
            labels.append(html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", tip[0]))).strip())
    missing = CBS_EXPECT[pos] - set(labels)
    if missing:
        raise Refuse(f"CBS {pos}: columns {sorted(missing)} missing (got {labels}) -- the layout moved")
    out = []
    for tr in re.findall(r'<tr class="TableBase-bodyTr[^"]*">(.*?)</tr>', page, re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if pos == "DST":
            m = re.search(r'href="/nfl/teams/([A-Z]{2,3})/', cells[0] if cells else "")
        else:
            m = re.search(r'href="/nfl/players/(\d+)/', cells[0] if cells else "")
        if not m or len(cells) - 1 != len(labels):
            continue
        out.append({"key": m.group(1), "cols": {lab: _num(c) for lab, c in zip(labels, cells[1:])}})
    if len(out) < 20:
        raise Refuse(f"CBS {pos}: parsed {len(out)} rows, expected 20+")
    return out


def cbs_stats(cols, pos):
    """CBS row -> Sleeper stat dict (approximate?)."""
    st = {CBS_TO_SLEEPER[k]: v for k, v in cols.items() if k in CBS_TO_SLEEPER and v is not None}
    if pos == "K":
        st["fgmiss"] = max(0.0, (cols.get("Field Goal Attempts") or 0) - (cols.get("Field Goals Made") or 0))
        st["xpmiss"] = max(0.0, (cols.get("Extra Points Attempted") or 0) - (cols.get("Extra Points Made") or 0))
        return st, False
    if pos == "DST":
        key = pa_bucket_key(cols.get("Points Allowed") or 0)
        if key:
            st[key] = 1
        return st, True
    return st, False


def pull_cbs(week, season, scoring, cbs2s, players):
    out, unmatched, misses = {}, [], []
    for pos in CBS_PAGES:
        for row in parse_cbs(_get(CBS_URL.format(pos=pos, season=season, week=week)), pos):
            if pos == "DST":
                code = CBS_TO_SLEEPER_TEAM.get(row["key"], row["key"])
                sid = code if code in players else None
            else:
                sid = cbs2s.get(row["key"])
            if not sid:
                unmatched.append(f"{pos} {row['key']}")
                continue
            st, approx = cbs_stats(row["cols"], pos)
            if pos in ("QB", "RB", "WR", "TE") and row["cols"].get("Fantasy Points") is not None:
                misses.append(abs(g.score(st, SOURCE_PPR) - row["cols"]["Fantasy Points"]))
            out[sid] = {"pts": g.score(st, scoring), "approx": approx}
        time.sleep(0.5)   # sequential, polite (global rule: rate-limit safety)
    return out, unmatched, _prove(misses, "CBS")


# ------------------------------------------------------------------ ESPN


def pull_espn(week, season, scoring, espn2s, players):
    teams = {t["id"]: t["abbrev"] for t in json.loads(_get(ESPN_TEAMS_URL.format(season=season)))["settings"]["proTeams"]
             if t["id"] != 0}
    if len(teams) != 32:
        raise Refuse(f"ESPN proTeams: {len(teams)} teams, expected 32")
    filt = {"players": {"filterSlotIds": {"value": list(ESPN_SLOTS)},
                        "filterStatsForSourceIds": {"value": [1]},
                        "filterStatsForSplitTypeIds": {"value": [1]},
                        "filterStatsForScoringPeriodIds": {"value": [week]},
                        "limit": 1500, "sortPercOwned": {"sortAsc": False, "sortPriority": 1}}}
    data = json.loads(_get(ESPN_URL.format(season=season, week=week), {"X-Fantasy-Filter": json.dumps(filt)}))
    by_espn = {str(p.get("espn_id")): pid for pid, p in players.items() if p.get("espn_id")}
    out, unmatched, misses = {}, [], []
    for x in data.get("players", []):
        p = x["player"]
        pos = ESPN_POS.get(p.get("defaultPositionId"))
        lines = [s for s in p.get("stats", []) if s.get("scoringPeriodId") == week and s.get("statSourceId") == 1
                 and s.get("statSplitTypeId") == 1 and str(s.get("seasonId")) == str(season)]
        if not pos or not lines:
            continue
        line = lines[0]
        if pos == "DEF":
            code = teams.get(p.get("proTeamId"))
            sid = g.ESPN_TO_SLEEPER.get(code, code)
            if sid not in players:
                unmatched.append(f"DEF {p.get('fullName')}")
                continue
            out[sid] = {"pts": line.get("appliedTotal"), "approx": True}
            continue
        sid = by_espn.get(str(p["id"])) or espn2s.get(str(p["id"]))
        if not sid:
            unmatched.append(f"{pos} {p.get('fullName')}")
            continue
        if pos == "K":
            out[sid] = {"pts": line.get("appliedTotal"), "approx": True}
            continue
        st = {ESPN_TO_SLEEPER_STAT[k]: v for k, v in (line.get("stats") or {}).items() if k in ESPN_TO_SLEEPER_STAT}
        if line.get("appliedTotal") is not None:
            misses.append(abs(g.score(st, SOURCE_PPR) - line["appliedTotal"]))
        out[sid] = {"pts": g.score(st, scoring), "approx": False}
    return out, unmatched, _prove(misses, "ESPN")


# ------------------------------------------------------------------ join


def load_crosswalk():
    text = _get(XWALK_URL)
    if text.lstrip()[:1] == "<":
        raise Refuse("db_playerids.csv came back as HTML -- a 404 page reads as a healthy download")
    rows = list(csv.DictReader(io.StringIO(text)))
    if len(rows) < 5000 or not {"sleeper_id", "cbs_id", "espn_id"} <= set(rows[0]):
        raise Refuse(f"db_playerids.csv: {len(rows)} rows, columns {list(rows[0])[:8]} -- not the crosswalk")

    def clean(v):
        v = (v or "").strip()
        return None if v in ("", "NA") else (v[:-2] if v.endswith(".0") else v)
    cbs2s, espn2s = {}, {}
    for r in rows:
        s = clean(r.get("sleeper_id"))
        if s and clean(r.get("cbs_id")):
            cbs2s[clean(r["cbs_id"])] = s
        if s and clean(r.get("espn_id")):
            espn2s[clean(r["espn_id"])] = s
    return cbs2s, espn2s


def load(week=None):
    """Everything joined: meta, {sleeper_id: row}, and the Sleeper payloads it was built from."""
    state, league, rosters, users, matchups, players, proj = g.pull()
    season = state["season"]
    if week is None:
        week = state["week"]
    elif week != state["week"]:
        raw = g.fetch(f"/projections/nfl/{season}/{week}?season_type=regular"
                      "&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF")
        proj = {p["player_id"]: {"stats": p.get("stats") or {}, "date": p.get("date"), "opponent": p.get("opponent")}
                for p in raw if p.get("player_id")}
    scoring = league["scoring_settings"]
    cbs2s, espn2s = load_crosswalk()
    cbs, cbs_un, cbs_med = pull_cbs(week, season, scoring, cbs2s, players)
    espn, espn_un, espn_med = pull_espn(week, season, scoring, espn2s, players)
    # A team's game this week comes from its DEF projection's opponent -- NEVER from the player's own
    # row: Sleeper drops a Doubtful/Out/NA player's projection, and "no opponent" then reads as a bye
    # (Breece Hall, 2026-10-14, Doubtful on a team that plays).
    opp_of = {t: (proj.get(t) or {}).get("opponent") for t in {p.get("team") for p in players.values() if p.get("team")}}
    rows = {}
    for sid in set(proj) | set(cbs) | set(espn):
        p = players.get(sid) or {}
        pos = p.get("position") or ("DEF" if sid.isalpha() else None)
        if pos not in ("QB", "RB", "WR", "TE", "K", "DEF"):
            continue
        vals = {"sleeper": g.score((proj.get(sid) or {}).get("stats"), scoring) if sid in proj else None,
                "cbs": (cbs.get(sid) or {}).get("pts"), "espn": (espn.get(sid) or {}).get("pts")}
        have = [v for v in vals.values() if v is not None]
        rows[sid] = {
            "name": p.get("full_name") or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or sid,
            "pos": pos, "team": p.get("team") or (sid if pos == "DEF" else None),
            "opp": (proj.get(sid) or {}).get("opponent") or opp_of.get(p.get("team") or sid),
            "inj": p.get("injury_status"), **vals,
            "consensus": round(statistics.mean(have), 2) if have else None, "n": len(have),
            "spread": round(max(have) - min(have), 2) if len(have) > 1 else 0.0,
            "approx": bool((cbs.get(sid) or {}).get("approx") or (espn.get(sid) or {}).get("approx")),
        }
    meta = {"week": week, "season": season, "pulled": g.now().isoformat(timespec="seconds"),
            "cbs_rows": len(cbs), "espn_rows": len(espn),
            "cbs_map_median_miss": round(cbs_med, 3), "espn_map_median_miss": round(espn_med, 3),
            "cbs_unmatched": cbs_un, "espn_unmatched": espn_un}
    return meta, rows, (state, league, rosters, users, matchups, players)


# ------------------------------------------------------------------ report


def _f(v):
    return "    - " if v is None else f"{v:6.1f}"


def fmt_row(r, tag=""):
    inj = f" [{r['inj']}]" if r.get("inj") else ""
    bye = "" if r.get("opp") else " BYE"
    return (f"  {tag:<5}{r['name'][:24]:<24} {r['pos']:<3} {_f(r['sleeper'])} {_f(r['cbs'])} {_f(r['espn'])}"
            f" | {_f(r['consensus'])}{'~' if r['approx'] else ' '} n{r['n']} ±{r['spread']:4.1f}{inj}{bye}")


HEADER = f"  {'':<5}{'player':<24} {'pos':<3} {'SLPR':>6} {'CBS':>6} {'ESPN':>6} | {'CONS':>6}"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--week", type=int)
    ap.add_argument("--json", help="also write every joined row here")
    ap.add_argument("--top", type=int, default=6, help="free agents shown per position")
    a = ap.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        meta, rows, (state, league, rosters, users, matchups, players) = load(a.week)
    except Refuse as e:
        print(f"REFUSED: {e}")
        return 2
    print(f"WEEK {meta['week']} projections, pulled {meta['pulled']} -- OUR scoring; ~ = an approximation (see docstring)")
    print(f"  CBS {meta['cbs_rows']} joined / {len(meta['cbs_unmatched'])} unmatched, map proven (median miss "
          f"{meta['cbs_map_median_miss']}); ESPN {meta['espn_rows']} joined / {len(meta['espn_unmatched'])} unmatched, "
          f"map proven (median miss {meta['espn_map_median_miss']})")
    names = {u["user_id"]: u.get("display_name") for u in users}
    ours = next(r for r in rosters if r.get("owner_id") == g.BRIGGSY_USER_ID)
    show = [ours]
    mine = next((m for m in matchups if m["roster_id"] == ours["roster_id"]), None)
    if mine and meta["week"] == state["week"]:
        opp_m = next((m for m in matchups if m["matchup_id"] == mine["matchup_id"]
                      and m["roster_id"] != ours["roster_id"]), None)
        if opp_m:
            show.append(next(r for r in rosters if r["roster_id"] == opp_m["roster_id"]))
    blank = {"pos": "?", "sleeper": None, "cbs": None, "espn": None, "consensus": None, "n": 0, "spread": 0.0,
             "approx": False, "inj": None, "opp": None}
    slots = [s for s in league["roster_positions"] if s not in ("BN", "IR")]
    for r in show:
        print(f"\n{names.get(r['owner_id'])} (roster {r['roster_id']})")
        print(HEADER)
        starters = r.get("starters") or []
        for slot, sid in zip(slots, starters):
            print(fmt_row(rows.get(sid) or {**blank, "name": "EMPTY" if sid == "0" else sid}, slot))
        bench = [p for p in (r.get("players") or []) if p not in starters and p not in (r.get("reserve") or [])]
        for sid in sorted(bench, key=lambda s: -((rows.get(s) or {}).get("consensus") or 0)):
            print(fmt_row(rows.get(sid) or {**blank, "name": sid}, "BN"))
    owned = set()
    for r in rosters:
        owned |= set((r.get("players") or []) + (r.get("reserve") or []) + (r.get("taxi") or []))
    print("\nTOP FREE AGENTS by consensus")
    print(HEADER)
    for pos in ("QB", "RB", "WR", "TE", "K", "DEF"):
        fa = sorted((s for s, r in rows.items() if r["pos"] == pos and s not in owned and r["consensus"]),
                    key=lambda s: -rows[s]["consensus"])[:a.top]
        for sid in fa:
            print(fmt_row(rows[sid], pos))
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump({"meta": meta, "rows": rows}, f, indent=1)
        print(f"\nwrote {a.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

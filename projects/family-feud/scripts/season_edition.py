#!/usr/bin/env python3
"""The in-season Nightly Feud: one snapshot in, every fact the page prints out.

PURE. No network, no clock of its own, no file but the ones it is handed. `season_cargo.py` pulls
the snapshot; `build_newsletter.py` loads it, calls `build()` here and renders the result. The
decisions and their reasons are in docs/plans/2026-11-09-001-feat-in-season-edition-plan.md.

THE RULES, EACH ONE PAID FOR:

  * ONE PROJECTED NUMBER (`price`). QB / RB / WR / TE: the average of the sites that price him
    above zero, and only when at least two do. A zero is not a price: Sleeper empties the row of a
    man it has written off, and averaging that zero in gave Michael Wilson (Out) 8.51. K and DEF:
    Sleeper's own number, because CBS's and ESPN's are approximations in our scoring
    (trade_eval.NEVER_ADJUSTED) -- week 10, 2026 the three-site average called BAL's defense an
    upgrade on ours while Sleeper, the one source scored by our rules, ranked ours first.
  * ONE TAG RULE, gameday_check's: NOT_PLAYING removes a body from every comparison, Questionable
    removes nobody and is printed on the name. Its constants are imported, never copied.
  * LOCK BEATS TAG. Sleeper tags men Out AFTER games they played (week 9, 2026: Stevenson scored
    14.8 and read Out by Monday). A player whose game has kicked off keeps his slot and his points
    and is never a "must fix"; a locked bench body or free agent never comes in.
  * LOCKS COME FROM KICKOFF TIMES AGAINST THE BUILD CLOCK, never from stored game states, so a
    kept snapshot cannot offer a man who has kicked off since it was pulled.
  * NO CALL ON ONE SOURCE (Briggsy, 2026-10-14). A week that arrived Sleeper-only, a week with no
    kickoff times, or a snapshot older than STALE_HOURS prints its rows and withholds every
    start/sit and waiver call, and says why where the calls would be.
  * THE SWAP ENGINE IS gameday_check.assess, fed through `adapter`. It already knows the FLEX
    slide, offers each starter once, and holds a Questionable bench body whose status lands after
    the starter locks. A second engine here would drift from it.
  * A PICKUP MUST CLEAR THE SWAP BAR. A free agent is "worth a claim" only when adding him raises
    our best lineup by gameday_check.SWAP_MARGIN. The roster is full and we hold a waiver place,
    so every add costs something; +0.03 is not a reason to spend it.
"""
import datetime
import statistics

import gameday_check as g
import trade_eval as te

BRIGGSY_USER_ID = g.BRIGGSY_USER_ID
#: `briggsy007` is HUNTER, the rival -- never Briggsy (CLAUDE.md landmine). Labelled in words.
HUNTER_USER_ID = "959308419154886656"

POSITIONS = ("QB", "RB", "WR", "TE", "K", "DEF")
SITES = ("sleeper", "cbs", "espn")
STALE_HOURS = 36            # past this a kept snapshot still prints, but makes no call
SHORT_LIST = 5              # free agents printed under the bar
WORTH_PER_POS = 3           # free agents printed over the bar, per position
WATCH_LIST = 12             # free agents the Wire and Market Watch listen for
P = "_p"                    # the one stat key the adapter feeds gameday_check
EMPTY = ("0", "", None)
DAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


def _num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def price(row):
    """The paper's one projected number for a player, or None when he cannot be priced."""
    if not row:
        return None
    if row.get("pos") in te.NEVER_ADJUSTED:
        v = row.get("sleeper")
        return float(v) if _num(v) and v > 0 else None
    vals = [float(row[s]) for s in SITES if _num(row.get(s)) and row[s] > 0]
    return statistics.mean(vals) if len(vals) >= 2 else None


def split(row):
    """'12.2 to 14.8' when the sites disagree by the swap margin or more, else ''."""
    vals = [float(row[s]) for s in SITES if _num(row.get(s)) and row[s] > 0] if row else []
    if len(vals) >= 2 and max(vals) - min(vals) >= g.SWAP_MARGIN:
        return f"{min(vals):.1f} to {max(vals):.1f}"
    return ""


def fmt(v):
    return "—" if v is None else f"{v:.1f}"


def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def aware(now):
    """The build clock as an aware datetime (a naive one is the machine's local time)."""
    return now.astimezone() if now.tzinfo is None else now


class Week:
    """One hauled week: its rows, and what the kickoff times say against the build clock."""

    def __init__(self, n, wk, now):
        self.n = n
        self.rows = wk.get("rows") or {}
        self.three_site = bool(wk.get("three_site"))
        self.why = wk.get("why")
        self.cbs_wrong_week = bool(wk.get("cbs_wrong_week"))
        self.espn_why = wk.get("espn_why")
        self.now = now
        raw = wk.get("kickoffs")
        self.kickoffs = ({t: datetime.datetime.fromisoformat(v) for t, v in raw.items()}
                         if isinstance(raw, dict) and raw else None)
        games = wk.get("games")
        self.games = {t: tuple(v) for t, v in games.items()} if isinstance(games, dict) and games else None

    def kick(self, team):
        return (self.kickoffs or {}).get(team)

    def locked(self, team):
        k = self.kick(team)
        return k is not None and k <= self.now

    def plays(self, team):
        """His TEAM has a game this week: an ESPN kickoff, or a DEF row with an opponent."""
        if not team:
            return False
        return team in (self.kickoffs or {}) or bool((self.rows.get(team) or {}).get("opp"))

    def started(self):
        return bool(self.kickoffs) and any(k <= self.now for k in self.kickoffs.values())

    def all_kicked(self):
        return bool(self.kickoffs) and all(k <= self.now for k in self.kickoffs.values())

    def when(self, team):
        """'Sun 1:00 PM ET', or '' when ESPN gave no time."""
        k = self.kick(team)
        if k is None:
            return ""
        return f"{DAYS[k.astimezone(g.EASTERN).weekday()]} {g.clock(k)}"

    def shown(self, row):
        """What the page prints as 'projected': the priced number, or Sleeper's alone in a week the
        other two sites did not arrive for (labelled as such by the section, never used for a call)."""
        if self.three_site:
            return price(row)
        v = (row or {}).get("sleeper")
        return float(v) if _num(v) and v > 0 else None


def can_start(pid, row, week, reserve):
    """A body that could be put in a lineup this week, locks aside."""
    return bool(row and row.get("pos") in POSITIONS and pid not in reserve
                and (row.get("inj") or "") not in g.NOT_PLAYING
                and week.plays(row.get("team")) and price(row) is not None)


def adapter(week):
    """The week's rows in the shape gameday_check reads: a /players dump, a projections map whose
    stat line is the one priced number, and a scoring dict that pays 1 per point of it. A player's
    date is his team's kickoff date in Eastern, so `played`, `has_game` and `locked` all work."""
    players, proj = {}, {}
    for pid, r in week.rows.items():
        players[pid] = {"full_name": r.get("name"), "position": r.get("pos"), "team": r.get("team"),
                        "injury_status": r.get("inj"), "injury_body_part": r.get("body")}
        k = week.kick(r.get("team"))
        # No date for a man who cannot be priced: gameday_check then reads him as "projection
        # pulled", names him as a must-fix when he starts, and never offers him as a fix at 0.0
        # (review 2026-11-09: an emptied kicker row drew no call at all). His team's DEF row keeps
        # its opponent, so the engine still knows the team plays, and locks still read the kickoff.
        dated = k is not None and (price(r) is not None or r.get("pos") == "DEF")
        proj[pid] = {"stats": {P: price(r) or 0.0}, "opponent": r.get("opp"),
                     "date": k.astimezone(g.EASTERN).date().isoformat() if dated else None}
    return players, proj, {P: 1.0}


def expected(roster_starters, reserve, week, points_so_far, today):
    """gameday_check.projected_total on the priced numbers. It never reads tags, so a starter whose
    game is still ahead and who cannot play (tag, IR, bye, unpriced) is scored 0 here first --
    fed three-site numbers it counted an Out Stevenson at 13.3. None when ESPN's states are missing."""
    if week.games is None:
        return None
    players, proj, scoring = adapter(week)
    for pid in roster_starters:
        row = week.rows.get(pid)
        if pid in EMPTY or not row:
            continue
        if week.locked(row.get("team")):
            # Kicked off: his points so far stand. But a man who is Out adds nothing for the part
            # of a live game still to come (an inactive starter at 0.0 with 70% of the game left
            # was being credited 9.3 phantom points).
            if (row.get("inj") or "") in g.NOT_PLAYING or pid in reserve:
                proj[pid] = dict(proj.get(pid) or {}, stats={P: 0.0})
            continue
        if not can_start(pid, row, week, reserve):
            proj[pid] = dict(proj.get(pid) or {}, stats={P: 0.0})
    return g.projected_total({"starters": list(roster_starters)}, proj, scoring, points_so_far or {},
                             today, players, week.games)


def best_lineup(bodies, slots, fixed=None):
    """({slot index: pid}, total). `bodies` is {pid: (pos, points)}; `fixed` is {slot index: (pid,
    points)} for starters who are locked where they stand. Dedicated slots take the best body of
    their position, then FLEX takes the best of what is left -- optimal, because FLEX accepts
    everything a dedicated RB / WR / TE slot does."""
    fixed = fixed or {}
    used = {pid for pid, _ in fixed.values()}
    out = {i: pid for i, (pid, _) in fixed.items()}
    total = sum(pts for _, pts in fixed.values())
    order = [i for i, s in enumerate(slots) if i not in fixed and s != "FLEX"] + \
            [i for i, s in enumerate(slots) if i not in fixed and s == "FLEX"]
    for i in order:
        cands = [(pts, pid) for pid, (pos, pts) in bodies.items()
                 if pid not in used and g.eligible(pos, slots[i])]
        if not cands:
            continue
        pts, pid = max(cands)
        used.add(pid)
        out[i] = pid
        total += pts
    return out, total


def bodies_of(roster, week, with_locked=True):
    """{pid: (pos, points)} for every body on a roster who could start this week."""
    reserve = set(roster.get("reserve") or [])
    out = {}
    for pid in roster.get("players") or []:
        row = week.rows.get(pid)
        if can_start(pid, row, week, reserve) and (with_locked or not week.locked(row.get("team"))):
            out[pid] = (row["pos"], price(row))
    return out


# ------------------------------------------------------------------ who is who


def people(snap):
    names = {u.get("user_id"): u.get("display_name") or "?" for u in snap.get("users") or []}
    by_roster = {}
    for r in snap.get("rosters") or []:
        owner = r.get("owner_id")
        label = names.get(owner) or f"roster {r.get('roster_id')}"
        if owner == HUNTER_USER_ID:
            label = f"Hunter ({label})"
        by_roster[r.get("roster_id")] = label
    return by_roster


def sides(snap, week_n, ours):
    """(mine, opp_m, opp_roster) from a week's matchups, each None when there is no game."""
    ms = (snap.get("matchups") or {}).get(str(week_n)) or []
    mine = next((m for m in ms if m.get("roster_id") == ours["roster_id"]), None)
    if not mine or mine.get("matchup_id") is None:
        return mine, None, None
    opp_m = next((m for m in ms if m.get("matchup_id") == mine["matchup_id"]
                  and m.get("roster_id") != ours["roster_id"]), None)
    opp = next((r for r in snap.get("rosters") or [] if opp_m and r.get("roster_id") == opp_m["roster_id"]), None)
    return mine, opp_m, opp


# ------------------------------------------------------------------ the sections


def standings(snap, who):
    rows = []
    for r in snap.get("rosters") or []:
        s = r.get("settings") or {}
        rows.append({
            "roster_id": r.get("roster_id"), "name": who.get(r.get("roster_id")),
            "wins": int(s.get("wins") or 0), "losses": int(s.get("losses") or 0), "ties": int(s.get("ties") or 0),
            "pf": float(s.get("fpts") or 0) + float(s.get("fpts_decimal") or 0) / 100,
            "pa": float(s.get("fpts_against") or 0) + float(s.get("fpts_against_decimal") or 0) / 100,
            "streak": ((r.get("metadata") or {}).get("streak") or ""),
            "us": r.get("owner_id") == BRIGGSY_USER_ID, "hunter": r.get("owner_id") == HUNTER_USER_ID,
        })
    rows.sort(key=lambda x: (-x["wins"], -x["pf"]))
    cut = int(((snap.get("league") or {}).get("settings") or {}).get("playoff_teams") or 0)
    for i, x in enumerate(rows, 1):
        x["place"] = i
        x["record"] = f"{x['wins']}-{x['losses']}" + (f"-{x['ties']}" if x["ties"] else "")
        x["pf_txt"], x["pa_txt"] = f"{x['pf']:.2f}", f"{x['pa']:.2f}"
        x["in"] = bool(cut) and i <= cut
        x["last_in"] = bool(cut) and i == cut
        # "1L" -> "lost 1", "3W" -> "won 3": never a code the reader has to decode
        st = x["streak"]
        x["streak_txt"] = (f"{'won' if st[-1:] == 'W' else 'lost'} {st[:-1]}" if st[:-1].isdigit() and st[-1:] in "WL"
                           else "")
    return {"rows": rows, "cut": cut, "teams": len(rows)}


def table_rows(starters, week, slots, points, reserve):
    """One printed row per lineup slot."""
    out = []
    for slot, pid in zip(slots, starters):
        if pid in EMPTY:
            out.append({"slot": slot, "empty": True, "name": "EMPTY", "detail": "", "tag": "", "projected": "—",
                        "sleeper": "—", "cbs": "—", "espn": "—", "split": "", "status": "", "points": ""})
            continue
        r = week.rows.get(pid) or {}
        team = r.get("team")
        locked = week.locked(team)
        state = (week.games or {}).get(team, (None, None))[0] if locked else None
        live = (points or {}).get(pid)
        if not week.plays(team):
            detail = f"{team or 'no team'} · BYE"
        else:
            detail = f"{team} vs {r.get('opp') or '?'}" + (f" · {week.when(team)}" if week.when(team) else "")
        tag = r.get("inj") or ""
        if tag and r.get("body"):
            tag += f": {r['body']}"
        if pid in reserve:
            tag = ("IR · " + tag) if tag else "IR"
        status = {g.FINAL: "final", g.LIVE: "playing now"}.get(state, "kicked off" if locked else "")
        out.append({
            "slot": slot, "empty": False, "name": r.get("name") or pid, "pos": r.get("pos"),
            "detail": detail, "tag": tag, "projected": fmt(week.shown(r)),
            "sleeper": fmt(r.get("sleeper") if _num(r.get("sleeper")) and r["sleeper"] > 0 else None),
            "cbs": fmt(r.get("cbs") if _num(r.get("cbs")) and r["cbs"] > 0 else None),
            "espn": fmt(r.get("espn") if _num(r.get("espn")) and r["espn"] > 0 else None),
            "split": split(r) if week.three_site and r.get("pos") not in te.NEVER_ADJUSTED else "",
            "status": status, "points": f"{float(live):.1f}" if locked and _num(live) else "",
        })
    return out


CALL_KIND = {"🚨": ("bad", "MUST FIX"), "⚠": ("watch", "QUESTIONABLE"), "↑": ("good", "BETTER START"),
             "⏸": ("watch", "HOLD"), "ℹ": ("", "THEIR SIDE")}


def withheld_reason(week, age_hours):
    """Why this week gets no start/sit or waiver call, in plain words, or None when it gets them."""
    if age_hours is not None and age_hours > STALE_HOURS:
        return (f"today's pull failed and the numbers below are {age_hours:.0f} hours old, "
                f"too old to make a call on")
    if not week.three_site:
        return ("CBS and ESPN did not arrive for this week, and no call is made on Sleeper's numbers alone"
                + (f" ({week.why})" if week.why else ""))
    if week.kickoffs is None:
        return ("kickoff times did not arrive, so the paper cannot tell who is already locked"
                + (f" ({week.espn_why})" if week.espn_why else ""))
    return None


def calls(ours, opp, week, slots, today):
    players, proj, scoring = adapter(week)
    rows = g.assess(ours, opp, players, proj, scoring, slots + ["BN"], today, week.kickoffs, week.now)
    out = []
    for icon, title, body in rows:
        kind, label = CALL_KIND.get(icon, ("", ""))
        out.append({"kind": kind, "label": label, "icon": icon, "title": title,
                    "lines": [plain(ln) for ln in body.split("\n") if ln.strip()]})
    return out


#: gameday_check writes for GAMEDAY.md, a file a session reads. The paper is read by Briggsy, so
#: its shorthand is spelled out here -- and only here: GAMEDAY.md keeps its own voice.
PLAIN = ((" proj ", ", projected "), ("bench body", "bench player"), ("An add is needed", "A pickup is needed"),
         ("only an add can fill", "only a pickup can fill"), (" -- ", " — "))


def plain(line):
    for old, new in PLAIN:
        line = line.replace(old, new)
    return line


def scoreboard(snap, week, ours, who, today, as_of):
    """This Sleeper week's score, once a game has kicked off. Read off the matchup's own starters --
    what counted -- not the roster's current ones."""
    mine, opp_m, opp = sides(snap, week.n, ours)
    if not mine:
        return None
    out = {"week": week.n, "us": f"{float(mine.get('points') or 0):.2f}", "as_of": as_of,
           "has_opp": bool(opp_m), "them": None, "opp": None, "expected": None, "left": []}
    if not opp_m:
        return out
    out["them"] = f"{float(opp_m.get('points') or 0):.2f}"
    out["opp"] = who.get(opp_m["roster_id"])
    out["leading"] = (float(mine.get("points") or 0) > float(opp_m.get("points") or 0))
    out["tied"] = float(mine.get("points") or 0) == float(opp_m.get("points") or 0)
    if week.three_site:
        e_us = expected(mine.get("starters") or [], set(ours.get("reserve") or []), week,
                        mine.get("players_points"), today)
        e_them = expected(opp_m.get("starters") or [], set((opp or {}).get("reserve") or []), week,
                          opp_m.get("players_points"), today)
        if e_us and e_them:
            out["expected"] = {"us": f"{e_us.total:.1f}", "them": f"{e_them.total:.1f}",
                               "us_counts": g.counts(e_us), "them_counts": g.counts(e_them)}
    for label, m in (("You", mine), (out["opp"], opp_m)):
        playing, ahead = [], []
        for pid in m.get("starters") or []:
            r = week.rows.get(pid)
            if pid in EMPTY or not r or not week.plays(r.get("team")):
                continue
            state = (week.games or {}).get(r.get("team"), (None, None))[0]
            if state == g.LIVE:
                playing.append(r.get("name"))
            elif not week.locked(r.get("team")) and (r.get("inj") or "") not in g.NOT_PLAYING:
                ahead.append(r.get("name"))
        out["left"].append({"who": label, "playing": playing, "ahead": ahead})
    return out


def last_final(snap, week_n, ours, who):
    """Last week's result, for the nights Sleeper has already turned the week."""
    mine, opp_m, _ = sides(snap, week_n, ours)
    if not mine or not opp_m:
        return None
    a, b = float(mine.get("points") or 0), float(opp_m.get("points") or 0)
    if a == 0 and b == 0:
        return None
    return {"week": week_n, "us": f"{a:.2f}", "them": f"{b:.2f}", "opp": who.get(opp_m["roster_id"]),
            "result": "won" if a > b else "lost" if a < b else "tied"}


def waivers(snap, ours, week, nxt, slots, can_call):
    """Weak spots, and the free agents who would start for us. `week` is the lineup week; `nxt` is
    the week after when it was hauled with three sites, else None."""
    rosters = snap.get("rosters") or []
    owned = set()
    for r in rosters:
        for key in ("players", "reserve", "taxi"):
            owned |= set(r.get(key) or [])
    reserve = set(ours.get("reserve") or [])
    active = [p for p in ours.get("players") or [] if p not in reserve]
    cap = len(((snap.get("league") or {}).get("roster_positions")) or [])
    out = {"weak": [], "worth": [], "short": [], "watch": [], "byes_next": [],
           "active": len(active), "cap": cap, "ir": len(reserve), "full": bool(cap) and len(active) >= cap,
           "waiver_position": (ours.get("settings") or {}).get("waiver_position"), "teams": len(rosters),
           "next_priced": nxt is not None, "next_week": week.n + 1,
           "last": week.n >= int(snap.get("last_week") or 99)}

    # Byes the week after the lineup week, named from the snapshot's bye sets.
    byes = set((snap.get("byes") or {}).get(str(week.n + 1)) or [])
    for pid in active:
        r = week.rows.get(pid) or {}
        if r.get("team") in byes:
            out["byes_next"].append(f"{r.get('name')} ({r.get('pos')})")
    if not can_call:
        return out

    # Weak spots: our best starters at a position against the median team's. Locks are ignored --
    # this ranks strength, not what can still be moved.
    for pos in POSITIONS:
        n = slots.count(pos)
        if not n:
            continue
        sums = {}
        for r in rosters:
            top = sorted((pts for p, pts in bodies_of(r, week).values() if p == pos), reverse=True)[:n]
            if len(top) == n:
                sums[r.get("roster_id")] = sum(top)
        mine = sums.get(ours["roster_id"])
        if mine is None:
            have = sum(1 for p, _ in bodies_of(ours, week).values() if p == pos)
            out["weak"].append({"pos": pos, "hole": True,
                                "text": f"{pos}: {have} of {n} slot{'s' if n > 1 else ''} can be filled this week"})
            continue
        if len(sums) < 2:
            continue
        med = statistics.median(sums.values())
        if med - mine >= g.SWAP_MARGIN * n:
            out["weak"].append({"pos": pos, "hole": False, "ours": f"{mine:.1f}", "median": f"{med:.1f}",
                                "gap": f"{med - mine:.1f}",
                                "text": f"{pos}: yours project{'s' if n == 1 else ''} {mine:.1f}, "
                                        f"the league's middle team gets {med:.1f}"})

    # Free agents who would start for us, by how much the best lineup rises.
    def gains(wk, with_locks):
        fixed = {}
        if with_locks:
            for i, pid in enumerate(ours.get("starters") or []):
                row = wk.rows.get(pid)
                if pid not in EMPTY and row and wk.locked(row.get("team")):
                    fixed[i] = (pid, price(row) or 0.0)
        mine_bodies = {p: v for p, v in bodies_of(ours, wk, with_locked=not with_locks).items()
                       if p not in {pid for pid, _ in fixed.values()}}
        base_map, base = best_lineup(mine_bodies, slots, fixed)
        res = {}
        for pid, row in wk.rows.items():
            if pid in owned or not can_start(pid, row, wk, ()) or wk.locked(row.get("team")):
                continue
            new_map, total = best_lineup(dict(mine_bodies, **{pid: (row["pos"], price(row))}), slots, fixed)
            if total - base > 1e-9:
                gone = set(base_map.values()) - set(new_map.values())
                res[pid] = (total - base, next(iter(gone), None))
        return res

    now_gain = gains(week, True)
    next_gain = gains(nxt, False) if nxt is not None else {}
    found = []
    for pid in set(now_gain) | set(next_gain):
        g1, out1 = now_gain.get(pid, (0.0, None))
        g2, out2 = next_gain.get(pid, (0.0, None))
        # The card describes the week his gain is IN: its opponent, its numbers, the man he would
        # replace that week. A next-week gain printed over this week's finished game is a lie.
        wk, gone = (nxt, out2) if (nxt is not None and g2 > g1) else (week, out1)
        row = wk.rows.get(pid) or {}
        found.append({
            "pid": pid, "name": row.get("name"), "pos": row.get("pos"), "team": row.get("team"),
            "opp": row.get("opp"), "tag": row.get("inj") or "", "projected": fmt(price(row)),
            "sleeper": fmt(row.get("sleeper")), "cbs": fmt(row.get("cbs")), "espn": fmt(row.get("espn")),
            "gain": max(g1, g2), "gain_txt": f"{max(g1, g2):.1f}", "gain_week": wk.n,
            "over": (wk.rows.get(gone) or {}).get("name") if gone else None,
            "fills_hole": bool(max(g1, g2) > 0 and not gone),
        })
    found.sort(key=lambda f: (-f["gain"], f["name"] or ""))
    # At most three per position: every gain is worked out alone, so two free agents at one
    # position are alternatives for the same slot, not two pickups. A bye at K or DEF otherwise
    # prints every kicker in the league as "worth a claim" (review 2026-11-09: 43 cards).
    per = {}
    for f in found:
        if f["gain"] >= g.SWAP_MARGIN:
            per[f["pos"]] = per.get(f["pos"], 0) + 1
            if per[f["pos"]] <= WORTH_PER_POS:
                out["worth"].append(f)
    out["short"] = [f for f in found if f["gain"] < g.SWAP_MARGIN][:SHORT_LIST]
    out["watch"] = found[:WATCH_LIST]

    # For each weak spot, the best free agent at it and whether he is better than what we have.
    for w in out["weak"]:
        fas = [(price(r), r.get("name")) for pid, r in week.rows.items()
               if pid not in owned and r.get("pos") == w["pos"] and can_start(pid, r, week, ())
               and not week.locked(r.get("team"))]
        if fas:
            pts, name = max(fas)
            w["best_free"] = f"{name}, projected {pts:.1f}"
    return out


def roster_report(ours, week, slots):
    """Every player of ours who needs a look, then the rest of the bench."""
    reserve = set(ours.get("reserve") or [])
    starters = list(ours.get("starters") or [])
    slot_of = {pid: slot for slot, pid in zip(slots, starters) if pid not in EMPTY}
    attention, bench = [], []
    for pid in ours.get("players") or []:
        r = week.rows.get(pid) or {}
        team = r.get("team")
        tag = r.get("inj") or ""
        bye = not week.plays(team)
        role = "IR" if pid in reserve else f"starting at {slot_of[pid]}" if pid in slot_of else "bench"
        # Lock beats tag here too: a man whose game has kicked off needs no look this week, and
        # Sleeper tags men Out after games they played. Only IR outlives the kickoff.
        if week.locked(team) and pid not in reserve:
            continue
        why = []
        if pid in reserve:
            why.append("on injured reserve")
        if tag:
            detail = ", ".join(x for x in (r.get("body"), r.get("notes"), r.get("practice")) if x)
            why.append(f"tagged {tag}" + (f" ({detail})" if detail else ""))
        if bye:
            why.append(f"on bye in week {week.n}" if team else "has no team")
        line = {"pid": pid, "name": r.get("name") or pid, "pos": r.get("pos"), "team": team, "role": role,
                "opp": "BYE" if bye else f"vs {r.get('opp') or '?'}", "projected": fmt(week.shown(r)),
                "why": "; ".join(why), "hard": pid in reserve or tag in g.NOT_PLAYING or bye,
                "headlines": 0, "tag": tag}
        if pid in reserve and price(r) is not None and week.plays(team):
            line["why"] += f"; the sites still project {price(r):.1f} if he plays"
        if why:
            attention.append(line)
        elif pid not in slot_of:
            bench.append(line)
    attention.sort(key=lambda x: (not x["hard"], x["name"]))
    bench.sort(key=lambda x: x["name"])
    return {"attention": attention, "bench": bench}


def wire_people(ours, week, watch):
    """Who The Wire listens for: our rostered players and the free agents who would start for us.
    Team defenses are left out, as on the draft board: a defense's name is a city and a mascot."""
    reserve = set(ours.get("reserve") or [])
    starters = set(ours.get("starters") or [])
    out = []
    for pid in ours.get("players") or []:
        r = week.rows.get(pid)
        if not r or r.get("pos") == "DEF" or not r.get("name"):
            continue
        out.append({"r": len(out), "pid": pid, "name": r["name"], "pos": r.get("pos"), "team": r.get("team"),
                    "tier": None, "who": "MY ROSTER",
                    "role": "IR" if pid in reserve else "starter" if pid in starters else "bench",
                    "tag": r.get("inj") or "", "gain": None})
    for f in watch:
        if f.get("pos") == "DEF" or not f.get("name"):
            continue
        out.append({"r": len(out), "pid": f["pid"], "name": f["name"], "pos": f["pos"], "team": f["team"],
                    "tier": None, "who": "FREE AGENT", "role": "free agent", "tag": f.get("tag") or "",
                    "gain": f"{f['gain']:.1f}"})
    return out


def describe_person(p):
    """What a Wire item carries about each player it names (build_newsletter.wire's `describe`)."""
    return {k: p.get(k) for k in ("name", "pos", "team", "r", "tier", "who", "role", "tag", "gain", "pid")}


def market(trending_add, trending_drop, ours, snap, week, watch):
    """Sleeper's trending adds and drops, kept where they touch our roster or a free agent who
    would start for us. Everything else is counted, not printed."""
    mine = set(ours.get("players") or [])
    owned = set()
    for r in snap.get("rosters") or []:
        for key in ("players", "reserve", "taxi"):
            owned |= set(r.get(key) or [])
    watch_by = {f["pid"]: f for f in watch}
    out = {}
    for label, rows in (("adds", trending_add), ("drops", trending_drop)):
        kept, total, rival, other = [], 0, 0, 0
        for e in rows or []:
            if not isinstance(e, dict):
                continue
            total += 1
            pid = str(e.get("player_id"))
            r = week.rows.get(pid) or {}
            if pid in mine:
                kept.append({"name": r.get("name") or pid, "pos": r.get("pos"), "team": r.get("team"),
                             "who": "MY ROSTER", "count": e.get("count"), "gain": None})
            elif label == "adds" and pid in watch_by:
                f = watch_by[pid]
                kept.append({"name": f["name"], "pos": f["pos"], "team": f["team"], "who": "FREE AGENT",
                             "count": e.get("count"), "gain": f"{f['gain']:.1f}"})
            elif pid in owned:
                rival += 1
            else:
                other += 1
        out[label] = {"rows": kept, "total": total, "rival": rival, "other": other}
    return out


def build(snap, now, trending_add=None, trending_drop=None, wire_fn=None):
    """Everything the season template prints. `now` is the build clock; `wire_fn(people)` is
    build_newsletter.wire bound to the feeds, or None for no Wire."""
    now = aware(now)
    today = now.astimezone(g.EASTERN).date()
    who = people(snap)
    ours = next((r for r in snap.get("rosters") or [] if r.get("owner_id") == BRIGGSY_USER_ID), None)
    table = standings(snap, who)
    us_row = next((x for x in table["rows"] if x["us"]), None)
    hunter = next((x for x in table["rows"] if x["hunter"]), None)
    pulled = datetime.datetime.fromisoformat(snap["pulled"]) if snap.get("pulled") else None
    age = (now - aware(pulled)).total_seconds() / 3600 if pulled else None
    as_of = f"{DAYS[pulled.weekday()]} {pulled:%b} {pulled.day}, {pulled.strftime('%I:%M %p').lstrip('0')}" if pulled else ""
    state = snap.get("state") or {}
    out = {
        "over": bool(snap.get("season_over")) or not snap.get("weeks"), "week": state.get("week"),
        "standings": table, "us": us_row, "hunter": hunter, "as_of": as_of,
        "age_hours": age, "stale": age is not None and age > 2, "have_roster": ours is not None,
        "gaps": [], "actions": [], "wire": [], "wire_names": 0,
        "market": {"adds": {"rows": [], "total": 0, "rival": 0, "other": 0},
                   "drops": {"rows": [], "total": 0, "rival": 0, "other": 0}},
        "scoreboard": None, "last_final": None, "lineup": None, "roster": None, "waivers": None,
        "tiles": [], "early_week": today.weekday() in (0, 1, 2),
    }
    record = us_row["record"] if us_row else "—"
    place = ordinal(us_row["place"]) if us_row else "—"
    if age is not None and age > 2:
        out["gaps"].append(f"the roster, score and projections are as of {as_of} ({age:.0f} hours old)")
    if ours is None and snap.get("rosters"):
        out["gaps"].append("no roster owned by PoppaBriggsy was in today's rosters")
    for note in snap.get("notes") or []:
        out["gaps"].append(note)

    if ours is None or out["over"]:
        out["tiles"] = [{"num": record, "lbl": "Record"}, {"num": place, "lbl": "Place"},
                        {"num": str(state.get("week") or "—"), "lbl": "Week"}, {"num": "—", "lbl": "Projected Margin"}]
        if hunter and us_row:
            out["actions"].append(hunter_line(us_row, hunter))
        return out

    slots = [s for s in ((snap.get("league") or {}).get("roster_positions") or []) if s not in ("BN", "IR")]
    weeks = {int(n): Week(int(n), wk, now) for n, wk in (snap.get("weeks") or {}).items()}
    w_n = state.get("week")
    this = weeks.get(w_n) or weeks[min(weeks)]
    w_n = this.n
    # The lineup week: this Sleeper week while any of its games has yet to kick off, else the next.
    lineup = weeks[w_n + 1] if this.all_kicked() and (w_n + 1) in weeks else this
    nxt = weeks.get(lineup.n + 1)
    nxt = nxt if nxt is not None and nxt.three_site and nxt.kickoffs is not None else None
    reserve = set(ours.get("reserve") or [])

    for wk in sorted(weeks.values(), key=lambda v: v.n):
        if not wk.three_site:
            out["gaps"].append(f"CBS and ESPN did not arrive for week {wk.n}, so it is priced on Sleeper alone "
                               f"and makes no call")
        if wk.cbs_wrong_week:
            out["gaps"].append(f"CBS served the wrong week for week {wk.n}; that week is priced on Sleeper and ESPN")
        if wk.kickoffs is None:
            out["gaps"].append(f"ESPN's kickoff times did not arrive for week {wk.n}")

    if this.started() or this.kickoffs is None:
        out["scoreboard"] = scoreboard(snap, this, ours, who, today, as_of)
    if not this.started() and w_n > 1:
        out["last_final"] = last_final(snap, w_n - 1, ours, who)

    mine, opp_m, opp = sides(snap, lineup.n, ours)
    why_not = withheld_reason(lineup, age)
    points = (mine or {}).get("players_points") if lineup.n == w_n else {}
    starters = list(ours.get("starters") or [])
    opp_starters = list((opp or {}).get("starters") or [])
    lu = {"week": lineup.n, "is_next": lineup.n != w_n, "opp": who.get((opp or {}).get("roster_id")) if opp else None,
          "no_game": opp is None, "withheld": why_not, "three_site": lineup.three_site,
          "rows": table_rows(starters, lineup, slots, points, reserve),
          "their_rows": table_rows(opp_starters, lineup, slots,
                                   (opp_m or {}).get("players_points") if lineup.n == w_n else {},
                                   set((opp or {}).get("reserve") or [])) if opp else [],
          "calls": [], "projected": None, "margin": None}
    if why_not is None:
        lu["calls"] = calls(ours, opp, lineup, slots, today)
        e_us = expected(starters, reserve, lineup, points, today)
        e_them = expected(opp_starters, set((opp or {}).get("reserve") or []), lineup,
                          (opp_m or {}).get("players_points") if lineup.n == w_n else {}, today) if opp else None
        if e_us is not None:
            lu["projected"] = {"us": f"{e_us.total:.1f}", "them": f"{e_them.total:.1f}" if e_them else None}
            if e_them is not None:
                m = e_us.total - e_them.total
                lu["margin"] = f"{'+' if m >= 0 else '−'}{abs(m):.1f}"
    out["lineup"] = lu

    out["roster"] = roster_report(ours, lineup, slots)
    out["waivers"] = waivers(snap, ours, lineup, nxt, slots, why_not is None)
    out["waivers"]["withheld"] = why_not

    if wire_fn is not None:
        listen = wire_people(ours, lineup, out["waivers"]["watch"])
        out["wire_names"] = len(listen)
        out["wire"] = wire_fn(listen)
        counts = {}
        for item in out["wire"]:
            for p in item["players"]:
                counts[p.get("pid")] = counts.get(p.get("pid"), 0) + 1 + int(item.get("also") or 0)
        for line in out["roster"]["attention"] + out["roster"]["bench"]:
            line["headlines"] = counts.get(line["pid"], 0)
    out["market"] = market(trending_add, trending_drop, ours, snap, lineup, out["waivers"]["watch"])

    out["tiles"] = [{"num": record, "lbl": "Record"}, {"num": place, "lbl": "Place"},
                    {"num": str(lineup.n), "lbl": "Lineup Week"},
                    {"num": lu["margin"] or "—", "lbl": "Projected Margin"}]

    # The owner's list: every line is a fact from above, restated as something to do.
    for c in ([] if lu["no_game"] else lu["calls"]):
        if c["icon"] in ("🚨", "↑"):
            what = c["title"].split(" — ", 1)[-1]
            lead = "must fix" if c["icon"] == "🚨" else "better start"
            out["actions"].append(f"Week {lineup.n} lineup, {lead}: {what}. The move is spelled out above.")
    seen = set()
    for f in out["waivers"]["worth"]:
        key = (f["gain_week"], f["over"] or f["pos"])          # one line per slot, not per alternative
        if key in seen:
            continue
        seen.add(key)
        out["actions"].append(f"Put in for {f['name']} ({f['pos']}, {f['team']}): he adds {f['gain_txt']} points "
                              f"to your best week-{f['gain_week']} lineup.")
    if out["waivers"]["byes_next"]:
        out["actions"].append(f"Week {lineup.n + 1} byes on your roster: {', '.join(out['waivers']['byes_next'])}. "
                              f"Plan the cover this week.")
    if lu["no_game"]:
        out["actions"].append(f"Week {lineup.n}: you have no game, so the lineup does not count.")
    elif not lu["calls"] and why_not is None:
        out["actions"].append(f"Week {lineup.n} lineup: nothing to change. Every starter is set to play and no "
                              f"bench body projects {g.SWAP_MARGIN:.0f} or more over a man he could replace.")
    if why_not is not None:
        out["actions"].append(f"Check the week {lineup.n} lineup by hand today: {why_not}.")
    if hunter and us_row:
        out["actions"].append(hunter_line(us_row, hunter))
    return out


def hunter_line(us, hunter):
    if hunter["place"] < us["place"]:
        where = f"He is {hunter['record']} and sits {ordinal(hunter['place'])}, ahead of you"
    else:
        where = f"He is {hunter['record']} and sits {ordinal(hunter['place'])}, behind you"
    return f"Beat Hunter. {where} at {us['record']}."

#!/usr/bin/env python3
"""Price a trade: what we gain or lose in each week left, and what the other side gains.

    python scripts/trade_eval.py --give "Zay Flowers" --get "A.J. Brown" --get "Tucker Kraft"
    python scripts/trade_eval.py --search --team Kaeperni --give "Zay Flowers"
    python scripts/trade_eval.py ... --process-at "2026-10-24 12:00" --json temp/trade.json

Exit 0 = ran, 2 = refused. Writes nothing except --json. On demand only -- never schedule it
(docs/in-season-plan.md, "What NOT to build"). The decisions and their reasons are in
docs/plans/2026-10-22-001-feat-trade-eval-plan.md; the lessons it encodes are insights 008, 010,
016, 017, 018, 020, 024 and 035.

THE METHOD. Two worlds -- BEFORE (today's rosters) and AFTER (the trade applied) -- and two
projection sets -- SLEEPER, and THREE SITES (Sleeper + CBS + ESPN). One procedure runs identically
in every world and every set:
  1. fix each side's roster: an incoming IR player takes an open IR slot; the excess is dropped (the
     body whose loss costs least); a gap is filled from a free-agent shortlist; one optional
     drop-for-free-agent swap; an IR player who comes back forces a shed from his first week;
  2. each week, each side may stream ONE free agent (the best at each position that week is tried);
  3. each week, start the best legal lineup;
and the answer is AFTER minus BEFORE, week by week, for both sides.

THE FAIRNESS RULE IS THE POINT (insight 035). The hand-built scratch versions of this denied the
BEFORE world the remedies the AFTER world got: a roster with no backup QB scored 0 in its QB's bye
week, so any trade that freed a roster spot was credited with a free-agent QB the current roster
could have picked up anyway (+18 phantom points); and a free agent one side picked up after the
trade stayed streamable by the other side (one player, two rosters). Every remedy here is offered
to both worlds, both sides and both projection sets, and every choice is made inside each set from
that set's own numbers.

IT NEVER SAYS ACCEPT OR DECLINE (insight 017). It prints numbers, the assumptions they rest on --
BEFORE the numbers (insight 016) -- and what the simulation actually did (insight 024: a wrong model
does not fail loudly, it prints a clean number; look at what it did, not only what it scored).
"""
import argparse
import datetime
import itertools
import json
import math
import os
import re
import statistics
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
import gameday_check as g  # noqa: E402  (fetch, score, kicking_keys, pull, pull_kickoffs, now, Refuse)
import external_projections as x  # noqa: E402  (load -- the three-site rows)
import normalize  # noqa: E402  -- THE one normaliser

Refuse = g.Refuse
POSITIONS = ("QB", "RB", "WR", "TE", "K", "DEF")
FLEX_OK = ("RB", "WR", "TE")
KNOWN_SLOTS = {"QB", "RB", "WR", "TE", "K", "DEF", "FLEX", "BN"}
NEVER_ADJUSTED = ("K", "DEF")          # approx in x.load: ESPN's own K scoring, CBS's points-allowed bucket
SHORTLIST_PER_POS = 4                  # a top-12 overall is 12 quarterbacks (insight 024, defect 1)
RATIO_FLOOR = 5.0                      # below this a 1-pt Sleeper line against a 5-pt CBS one is noise
RATIO_CLAMP = (0.75, 1.25)             # a modelling choice: bit on 7 of 127 rostered players 2026-10-22
MIN_PAIRS = 10                         # fewer week-to-week pairs than this and a position's r is 0
TIE = 0.05                             # rest-of-season totals this close are the same answer
PAUSE = 0.1                            # sequential, polite (global rule: rate-limit safety)
PROJ_PATH = ("/projections/nfl/{season}/{week}?season_type=regular"
             "&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF")
#: A kicking stat split by distance. One the league does not score, after g.kicking_keys has
#: translated what it can, would score 0 without a sound -- refuse instead (insight 008).
KICK_BUCKET = re.compile(r"^fg(m|miss)_(\d+_\d+|\d+p)$")
SETS = ("THREE SITES", "SLEEPER")       # headline first


# ------------------------------------------------------------------ data


class Data:
    """One snapshot of everything an evaluation reads. Built by load(); the tests reach it through
    the same load() with the network patched, so the wiring is exercised, not bypassed."""

    def __init__(self, **kw):
        self.__dict__.update(kw)


def playoff_weeks(league):
    s = league["settings"]
    if s.get("playoff_round_type", 0) != 0:
        raise Refuse(f"playoff_round_type {s.get('playoff_round_type')} is not modelled "
                     "(the window assumes one-week playoff rounds)")
    start, teams = s["playoff_week_start"], s["playoff_teams"]
    return list(range(start, start + (math.ceil(math.log2(teams)) if teams > 1 else 0)))


def load():
    """Fetch the snapshot. Three sites come from external_projections.load, which refuses as a whole
    when the crosswalk, CBS or ESPN fails -- it has no per-source fallback -- and then the run is
    SLEEPER ONLY and says so; a secondary source never kills the run (gameday_check's rule)."""
    sleeper_only = next_missing = None
    xrows = {}
    try:
        _meta, rows, (state, league, rosters, users, _m, players) = x.load()
        xrows[state["week"]] = rows
        try:
            xrows[state["week"] + 1] = x.load(state["week"] + 1)[1]
        except Refuse as e:
            next_missing = str(e)
    except Refuse as e:
        sleeper_only = str(e)
        state, league, rosters, users, _m, players, _p = g.pull()
    season, week = state["season"], state["week"]
    final = playoff_weeks(league)[-1]
    proj = {}
    for w in range(week, final + 1):
        raw = g.fetch(PROJ_PATH.format(season=season, week=w))
        if not isinstance(raw, list):
            raise Refuse(f"week {w} projections are {type(raw).__name__}, expected a list")
        proj[w] = {p["player_id"]: {"stats": p.get("stats") or {}, "date": p.get("date"),
                                    "opponent": p.get("opponent")} for p in raw if p.get("player_id")}
        time.sleep(PAUSE)
    matchups = {}
    for w in range(1, league["settings"]["playoff_week_start"]):
        m = g.fetch(f"/v1/league/{g.LEAGUE_ID}/matchups/{w}")
        matchups[w] = m if isinstance(m, list) else []
        time.sleep(PAUSE)
    try:
        kickoffs, blind = g.pull_kickoffs(season, week, state.get("season_type", "regular")), None
    except Refuse as e:
        kickoffs, blind = None, str(e)
    return Data(state=state, league=league, rosters=rosters, users=users, players=players, proj=proj,
                matchups=matchups, kickoffs=kickoffs, blind=blind, xrows=xrows,
                sleeper_only=sleeper_only, next_missing=next_missing)


# ------------------------------------------------------------------ identity (insights 004, 010)


def position(players, pid):
    p = players.get(pid) or {}
    return p.get("position") or ("DEF" if pid.isalpha() else None)


def display(players, pid):
    """A DEF has full_name None (all 11 rostered DEFs, measured 2026-10-22): print it by code and name."""
    p = players.get(pid) or {}
    if position(players, pid) == "DEF":
        nm = f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()
        return f"{pid} ({nm})" if nm else pid
    return p.get("full_name") or f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip() or pid


def name_key(players, pid):
    """The exact-match key. norm() refuses a non-string on purpose, so a DEF is keyed on first + last."""
    p = players.get(pid) or {}
    if position(players, pid) == "DEF":
        nm = f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()
    else:
        nm = p.get("full_name") or f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()
    return normalize.norm(nm) if nm else None


def resolve(text, rostered, players):
    """An id, a DEF team code (any case) or an exact full name -> one rostered player id.

    Only rostered players are searched: a trade can draw from nowhere else, and across the whole
    player list norm() gives two ids the same key ('kennethwalker', 4634 and 8151). Zero or two-plus
    matches refuse; a shared name token is shown as a candidate and never accepted (insight 010)."""
    t = text.strip()
    if t in rostered:
        return t
    if t.upper() in rostered and position(players, t.upper()) == "DEF":
        return t.upper()
    key = normalize.norm(t)
    hits = sorted(pid for pid in rostered if name_key(players, pid) == key)
    if len(hits) == 1:
        return hits[0]
    want = normalize.tokens(t)
    near = sorted(pid for pid in rostered if pid not in hits
                  and want & normalize.tokens(display(players, pid).split(" (")[-1].rstrip(")")))
    shown = ", ".join(f"{display(players, p)} [{p}]" for p in (hits or near)) or "none"
    what = "matches more than one rostered player" if hits else "matches no rostered player exactly"
    raise Refuse(f"'{t}' {what}. Candidates (pass the id or the exact full name): {shown}")


# ------------------------------------------------------------------ the two projection sets


def bye_teams(proj_w, teams):
    """A team with no DEF opponent this week is on bye -- external_projections' rule. A player's own
    missing row is never read as a bye (Sleeper drops a Doubtful/Out player's projection)."""
    return {t for t in teams if not (proj_w.get(t) or {}).get("opponent")}


def sleeper_points(data, weeks):
    sc = data.league["scoring_settings"]
    bad = set()
    pts = {}
    for w in weeks:
        pts[w] = {}
        for pid, r in data.proj[w].items():
            bad |= {k for k in g.kicking_keys(r["stats"], sc) if KICK_BUCKET.match(k) and k not in sc}
            pts[w][pid] = g.score(r["stats"], sc)
    if bad:
        raise Refuse(f"Sleeper's projections carry kicking keys this league does not score: {sorted(bad)}. "
                     "Each would count 0 -- teach gameday_check.KICK_ALIASES the new key first (insight 008)")
    return pts


def positive_control(data, pts, weeks, rostered):
    """Refuse before printing a number off a broken pull (insight 008: zero reads like a finding)."""
    teams = {(data.players.get(p) or {}).get("team") or (p if p.isalpha() else None) for p in rostered} - {None}
    for w in weeks:
        if not data.proj[w]:
            raise Refuse(f"week {w}: Sleeper returned no projections at all")
        byes = bye_teams(data.proj[w], teams)
        live = [p for p in rostered
                if ((data.players.get(p) or {}).get("team") or (p if p.isalpha() else None)) not in byes | {None}]
        zero = [p for p in live if pts[w].get(p, 0.0) <= 0.0]
        if live and len(zero) > len(live) / 2:
            raise Refuse(f"week {w}: {len(zero)} of {len(live)} rostered players not on bye project 0 -- "
                         "that is a broken pull, not a slate of injuries")


def pearson(pairs):
    if len(pairs) < MIN_PAIRS:
        return 0.0
    try:
        return statistics.correlation([a for a, _ in pairs], [b for _, b in pairs])
    except statistics.StatisticsError:
        return 0.0


def three_sites(data, s_pts, weeks):
    """THREE SITES points per week, and what built them.

    Clean weeks (the current week and the next -- CBS serves the current week for anything further
    ahead, TODO's CBS item) use the three-site consensus directly where all three sites have the
    player. Later weeks scale Sleeper by the player's clean-week ratio (sum consensus / sum Sleeper,
    Sleeper >= 5 and n == 3), CLAMPED, then SHRUNK by how far that ratio persists from one week to
    the next at his position: r is measured on every run, and a two-week mean persists 2r/(1+r).
    Measured 2026-10-22: WR .82, K .60, RB .57, QB .47, DEF .18, TE .10 -- a TE's two-week gap with
    Sleeper is mostly matchup noise and barely moves him. K and DEF are never adjusted.

    The consensus counts Sleeper as one of its three votes, so this set can never fully disagree
    with Sleeper (insight 018: check whether two sides share an ancestor)."""
    players, rows = data.players, data.xrows
    measured = sorted(rows)

    def usable(r, pid):
        return (r and not r.get("approx") and r.get("n") == 3 and r.get("consensus") is not None
                and position(players, pid) not in NEVER_ADJUSTED)

    per_week = {w: {} for w in measured}
    for w in measured:
        for pid, r in rows[w].items():
            if usable(r, pid) and (r.get("sleeper") or 0.0) >= RATIO_FLOOR:
                per_week[w][pid] = (r["consensus"], r["sleeper"])
    ratio = {}
    for pid in set().union(*per_week.values()) if per_week else set():
        num = sum(per_week[w][pid][0] for w in measured if pid in per_week[w])
        den = sum(per_week[w][pid][1] for w in measured if pid in per_week[w])
        raw = num / den
        ratio[pid] = (raw, min(max(raw, RATIO_CLAMP[0]), RATIO_CLAMP[1]))
    r_pos = {}
    for pos in POSITIONS:
        pairs = []
        if len(measured) >= 2:
            a, b = measured[0], measured[1]
            pairs = [(per_week[a][p][0] / per_week[a][p][1], per_week[b][p][0] / per_week[b][p][1])
                     for p in per_week[a] if p in per_week[b] and position(players, p) == pos]
        r_pos[pos] = (pearson(pairs), len(pairs))

    def multiplier(pid):
        if pid not in ratio:
            return 1.0
        r = r_pos.get(position(players, pid), (0.0, 0))[0]
        keep = min(max(2 * r / (1 + r), 0.0), 1.0) if r > 0 else 0.0
        return 1.0 + keep * (ratio[pid][1] - 1.0)

    pts = {}
    for w in weeks:
        out = {}
        for pid, v in s_pts[w].items():
            if w in rows:
                r = rows[w].get(pid)
                out[pid] = r["consensus"] if usable(r, pid) else v
            else:
                out[pid] = v * multiplier(pid)
        pts[w] = out
    return pts, {"ratio": ratio, "r_pos": r_pos, "multiplier": multiplier, "clean": [w for w in measured if w in weeks]}


# ------------------------------------------------------------------ the simulation


class Ctx:
    """Shared, immutable facts every set and world reads."""

    def __init__(self, **kw):
        self.__dict__.update(kw)


class Universe:
    """The free agents of one world: today's free agents, minus anyone added, plus anyone dropped --
    each dropped player FROM THE WEEK he is let go. One player can be on one roster only: the scratch
    code let us stream the man Kaeperni had just picked up (plan check P0, 2026-10-22), and the first
    build of this file let us start Woody Marks in week 7 because Kaeperni sheds him in week 8."""

    def __init__(self, base, minus=(), plus=None, taken=None):
        self.base, self.minus, self.plus = base, frozenset(minus), dict(plus or {})
        self.taken = {w: frozenset(v) for w, v in (taken or {}).items()}
        self.key = (self.minus, frozenset(self.plus.items()), frozenset(self.taken.items()))

    def has(self, pid, w):
        if pid in self.taken.get(w, ()):
            return False
        if pid in self.plus:
            return w >= self.plus[pid]
        return pid in self.base and pid not in self.minus

    def without(self, added):
        added = set(added)
        return Universe(self.base, self.minus | added, {p: k for p, k in self.plus.items() if p not in added}, self.taken)

    def adding(self, dropped, week):
        plus = dict(self.plus)
        plus.update({p: week for p in dropped})
        return Universe(self.base, self.minus - set(dropped), plus, self.taken)

    def streamed(self, picks):
        """This pool with each week's stream {week: pid} gone for that week only -- two teams cannot
        both stream one free agent (caught by the no-double-use invariant on the frozen night: both
        streamed the same released receiver in week 13)."""
        taken = {w: set(v) for w, v in self.taken.items()}
        for w, p in picks.items():
            if p:
                taken.setdefault(w, set()).add(p)
        return Universe(self.base, self.minus, self.plus, taken)


class Side:
    """One roster in one world. `timeline` holds IR returns: (player in, from week, player out)."""

    def __init__(self, rid, active, reserve=(), incoming=(), incoming_ir=(), timeline=()):
        self.rid, self.active, self.reserve = rid, list(active), list(reserve)
        self.incoming, self.incoming_ir, self.timeline = set(incoming), list(incoming_ir), list(timeline)

    def available(self, w):
        out = set(self.active)
        for pin, k, pout in self.timeline:
            if w >= k:
                out.discard(pout)
                out.add(pin)
        return sorted(out)


class Sim:
    """One projection set's league: its weekly points and the lineup / stream / roster-fix rules."""

    def __init__(self, ctx, pts, label):
        self.ctx, self.pts, self.label = ctx, pts, label
        pos = ctx.pos
        every = set().union(*(set(pts[w]) for w in ctx.weeks))
        self.ros = {p: sum(pts[w].get(p, 0.0) for w in ctx.weeks) for p in every}
        self.by_week = {w: {q: sorted((p for p in pts[w] if pos.get(p) == q), key=lambda p: (-pts[w][p], p))
                            for q in POSITIONS} for w in ctx.weeks}
        self.by_ros = {q: sorted((p for p in every if pos.get(p) == q), key=lambda p: (-self.ros[p], p))
                       for q in POSITIONS}
        # rank[w][pid]: every known player's place in that week's points order, so a pool sorts at C
        # speed. The first build spent 95% of a 9m40s counter search re-sorting tiny pools (profiled).
        known = sorted(pos)
        self.rank = {}
        for w in ctx.weeks:
            pw = pts[w]
            self.rank[w] = {p: i for i, p in enumerate(sorted(known, key=lambda p: (-pw.get(p, 0.0), p)))}
        self._fills, self._cands = {}, {}

    def _fill(self, w, pool, fixed):
        """The best lineup, by one pass down the pool in points order: each player takes an open slot
        at his position, else an open FLEX if he is RB/WR/TE. For QB/2RB/2WR/TE/2FLEX/K/DEF that pass IS
        the optimum -- every dedicated slot nests inside FLEX and each player has one position (D4
        refuses anything else), so the top n at each position always reach their own slots and FLEX
        takes the best leftovers in order. Pinned against lineup_value.best_lineup and brute force.

        Returns (total, line, open dedicated slots, open FLEX, weakest non-locked starter per position,
        weakest non-locked FLEX) -- the last four are what _gain reads."""
        key = (w, frozenset(pool), tuple(sorted(fixed.items())) if fixed else ())
        hit = self._fills.get(key)
        if hit is not None:
            return hit
        pw, pos = self.pts[w], self.ctx.pos
        slots, flex = dict(self.ctx.spec), self.ctx.flex_n
        total, line = 0.0, []
        for pid, s in fixed.items():
            if s == "FLEX":
                flex -= 1
            else:
                slots[s] -= 1
            total += pw.get(pid, 0.0)
            line.append((s, pid, pw.get(pid, 0.0)))
        open_n = sum(v for v in slots.values() if v > 0) + max(flex, 0)
        weakest, fmin = {}, None
        for pid in sorted(pool, key=self.rank[w].__getitem__):
            if open_n == 0:
                break
            if pid in fixed:
                continue
            q, v = pos[pid], pw.get(pid, 0.0)
            if slots.get(q, 0) > 0:
                slots[q] -= 1
                weakest[q] = v
                line.append((q, pid, v))
            elif q in FLEX_OK and flex > 0:
                flex -= 1
                fmin = v
                line.append(("FLEX", pid, v))
            else:
                continue
            total += v
            open_n -= 1
        hit = (total, line, slots, flex, weakest, fmin)
        self._fills[key] = hit
        return hit

    def _gain(self, w, c, fill):
        """Exactly what adding one player to a filled lineup is worth, read off its weakest starters:
        an open slot takes him whole; otherwise he replaces the weakest FLEX or the weakest starter at
        his own position. (He could also take his position's slot and bump that man into FLEX -- but
        that is worth v - weakest FLEX, the same as taking FLEX directly, so it is not a third case;
        the mutation run proved the line that computed it could never change an answer.) Pinned
        against re-solving the lineup with him in it (tests)."""
        _, _, slots, flex, weakest, fmin = fill
        q, v = self.ctx.pos.get(c), self.pts[w].get(c, 0.0)
        if v <= 0.0:
            return 0.0
        if slots.get(q, 0) > 0:
            return v
        best = 0.0
        if q in FLEX_OK:
            if flex > 0:
                return v
            if fmin is not None:
                best = v - fmin
        m = weakest.get(q)
        if m is not None:
            best = max(best, v - m)
        return max(best, 0.0)

    def lineup(self, w, pool, fixed=None, detail=False):
        f = self._fill(w, list(pool), fixed or {})
        return (f[0], f[1]) if detail else f[0]

    def stream_candidates(self, w, universe):
        """The best free agent at each position this week. Never the single top free agent overall:
        that is a quarterback every week, and could never cover a kicker's bye (plan check)."""
        key = (w, universe.key)
        hit = self._cands.get(key)
        if hit is None:
            cur = w == self.ctx.cur
            hit = []
            for q in POSITIONS:
                for p in self.by_week[w][q]:
                    if universe.has(p, w) and not (cur and p in self.ctx.locked):
                        hit.append(p)
                        break
            self._cands[key] = hit
        return hit

    def week(self, w, side, universe):
        """(points, streamed player) for one side's best lineup this week, one stream allowed."""
        cur = w == self.ctx.cur
        fixed = self.ctx.fixed.get(side.rid, {}) if cur else {}
        pool = [p for p in side.available(w) if not (cur and p in self.ctx.locked)]
        fill = self._fill(w, pool, fixed)
        best, pick = 0.0, None
        for c in self.stream_candidates(w, universe):
            if c in pool:
                continue
            gain = self._gain(w, c, fill)
            if gain > best + 1e-9:
                best, pick = gain, c
        return fill[0] + best, pick

    def season(self, side, universe):
        return {w: self.week(w, side, universe)[0] for w in self.ctx.weeks}

    def season_picks(self, side, universe):
        out = {w: self.week(w, side, universe) for w in self.ctx.weeks}
        return {w: v for w, (v, _) in out.items()}, {w: p for w, (_, p) in out.items()}

    def total(self, side, universe):
        return sum(self.season(side, universe).values())

    def shortlist(self, universe):
        out = []
        for q in POSITIONS:
            n = 0
            for p in self.by_ros[q]:
                if n >= SHORTLIST_PER_POS:
                    break
                if universe.has(p, self.ctx.weeks[0]):
                    out.append(p)
                    n += 1
        return out

    def return_week(self, pid):
        return next((w for w in self.ctx.weeks if self.pts[w].get(pid, 0.0) > 0.0), None)

    def _pick(self, scored):
        """Best of [(total, choice)], with every choice within TIE of it, tie broken toward the lowest
        raw Sleeper rest-of-season points -- the cheapest body by the yardstick both sets share."""
        best = max(t for t, _ in scored)
        ties = [c for t, c in scored if best - t <= TIE]
        raw = self.ctx.raw_ros
        pick = min(ties, key=lambda c: (sum(raw.get(p, 0.0) for p in c), c))
        return pick, ties

    def fix(self, side, universe):
        """D1's roster fix, the same steps in both worlds. Returns (side, moves, universe after)."""
        ctx = self.ctx
        active, reserve, incoming = list(side.active), list(side.reserve), set(side.incoming)
        moves = {"ir_in": [], "drop": [], "drop_ties": [], "add": [], "swap": None, "shed": []}
        open_ir = ctx.reserve_slots - len(reserve)
        for pid in side.incoming_ir:                                   # 1. incoming IR players
            if open_ir > 0:
                reserve.append(pid)
                open_ir -= 1
                moves["ir_in"].append(pid)
            else:
                active.append(pid)
        U = universe

        def tot(act, u=None):
            return self.total(Side(side.rid, act), u or U)

        excess = len(active) - ctx.cap                                 # 2. over the cap
        if excess > 0:
            cands = [p for p in active if p not in incoming]
            scored = [(tot([p for p in active if p not in combo]), combo)
                      for combo in itertools.combinations(cands, excess)]
            pick, ties = self._pick(scored)
            active = [p for p in active if p not in pick]
            moves["drop"], moves["drop_ties"] = list(pick), [list(c) for c in ties]
            U = U.adding(pick, ctx.weeks[0])
        while len(active) < ctx.cap:                                   # 3. under the cap
            sl = self.shortlist(U)
            if not sl:
                break
            add = max(sl, key=lambda f: (tot(active + [f], U.without([f])), -sl.index(f)))
            active.append(add)
            moves["add"].append(add)
            U = U.without([add])
        sl = self.shortlist(U)                                         # 4. one optional swap
        if sl:
            now_t = tot(active)
            add = max(sl, key=lambda f: (tot(active + [f], U.without([f])), -sl.index(f)))
            U2 = U.without([add])
            cands = [p for p in active if p not in incoming]
            if cands:
                scored = [(tot([p for p in active if p != d] + [add], U2.adding([d], ctx.weeks[0])), (d,)) for d in cands]
                (drop,), _ = self._pick(scored)
                after = tot([p for p in active if p != drop] + [add], U2.adding([drop], ctx.weeks[0]))
                if after > now_t + TIE:
                    active = [p for p in active if p != drop] + [add]
                    moves["swap"] = (drop, add)
                    U = U2.adding([drop], ctx.weeks[0])
        timeline = []                                                  # 5. IR returns
        for k, pin in sorted((self.return_week(p), p) for p in reserve if self.return_week(p) is not None):
            shed = {o for _, _, o in timeline}
            cands = [p for p in active if p not in incoming and p not in shed]
            if not cands:
                continue
            scored = [(self.total(Side(side.rid, active, timeline=timeline + [(pin, k, o)]), U), (o,))
                      for o in cands]
            (out,), _ = self._pick(scored)
            timeline.append((pin, k, out))
            moves["shed"].append((pin, k, out))
            U = U.adding([out], k)
        return Side(side.rid, active, reserve, incoming, (), timeline), moves, U

    def detail(self, side, universe):
        """What the final lineups were: {week: [(slot, pid, pts)]} and {week: streamed pid}."""
        lines, streams = {}, {}
        for w in self.ctx.weeks:
            _, pick = self.week(w, side, universe)
            cur = w == self.ctx.cur
            fixed = self.ctx.fixed.get(side.rid, {}) if cur else {}
            pool = [p for p in side.available(w) if not (cur and p in self.ctx.locked)] + ([pick] if pick else [])
            lines[w] = self.lineup(w, pool, fixed, detail=True)[1]
            streams[w] = pick
        return lines, streams


def sides_for(ctx, rosters, give, get):
    """BEFORE when give/get are empty. Our roster and theirs with the trade applied: an outgoing IR
    player leaves the giver's IR and arrives as an incoming IR player (D1 step 1 seats him)."""
    out = {}
    for rid, outgoing, incoming in ((ctx.us, set(give), set(get)), (ctx.them, set(get), set(give))):
        r = rosters[rid]
        other = rosters[ctx.them if rid == ctx.us else ctx.us]
        res, taxi = set(r.get("reserve") or []), set(r.get("taxi") or [])
        other_res = set(other.get("reserve") or [])
        active = [p for p in r["players"] if p not in res | taxi | outgoing]
        active += [p for p in incoming if p not in other_res]
        out[rid] = Side(rid, active, [p for p in res if p not in outgoing], incoming,
                        [p for p in incoming if p in other_res])
    return out


def run_world(sim, ctx, rosters, give, get):
    """One world, one set: we fix first, then they fix from what is left; then both are scored from
    the same final free-agent pool -- we stream first, they stream from what that leaves each week --
    so no player ever counts for both sides (the invariant the tests pin on the frozen night)."""
    s = sides_for(ctx, rosters, give, get)
    us, us_moves, U1 = sim.fix(s[ctx.us], ctx.universe0)
    them, them_moves, UF = sim.fix(s[ctx.them], U1)
    us_weekly, us_picks = sim.season_picks(us, UF)
    UT = UF.streamed(us_picks)
    return {"sides": {ctx.us: us, ctx.them: them}, "moves": {ctx.us: us_moves, ctx.them: them_moves},
            "weekly": {ctx.us: us_weekly, ctx.them: sim.season(them, UT)}, "universe": {ctx.us: UF, ctx.them: UT}}


# ------------------------------------------------------------------ setup: window, locks, deadline


def prepare(data, process_at):
    """Everything the simulation shares. Refuses on any input it cannot model honestly."""
    league, state, players = data.league, data.state, data.players
    rp = league["roster_positions"]
    unknown = sorted(set(rp) - KNOWN_SLOTS)
    if unknown:
        raise Refuse(f"roster slot(s) {unknown} are not modelled -- the lineup optimiser is exact only for "
                     "QB/RB/WR/TE/FLEX/K/DEF, and an unknown slot would silently score 0")
    starters = [s for s in rp if s != "BN"]
    spec = {q: starters.count(q) for q in POSITIONS}
    rosters = {r["roster_id"]: r for r in data.rosters}
    us = next((r["roster_id"] for r in data.rosters if r.get("owner_id") == g.BRIGGSY_USER_ID), None)
    if us is None:
        raise Refuse("no roster belongs to PoppaBriggsy (1390750540631150592) -- never infer it from a handle or an email")
    owned = {p for r in data.rosters for p in (r.get("players") or []) + (r.get("reserve") or []) + (r.get("taxi") or [])}
    pos = {}
    for w in data.proj:
        for p in data.proj[w]:
            pos[p] = position(players, p)
    for p in owned:
        pos[p] = position(players, p)

    week = state["week"]
    ply = playoff_weeks(league)
    kick = data.kickoffs
    proj_cur = data.proj.get(week, {})

    def team_of(p):
        return (players.get(p) or {}).get("team") or (p if p.isalpha() else None)

    if kick is not None:
        def locked_team(t):
            k = kick.get(t)
            return k is not None and k <= process_at
        last_game = max(kick.values()) if kick else None
        all_locked = bool(kick) and all(k <= process_at for k in kick.values())
    else:                                       # blind: dates only (a game today is not yet locked)
        dates = {t: (proj_cur.get(t) or {}).get("date") for t in {team_of(p) for p in proj_cur} - {None}}

        def locked_team(t):
            d = dates.get(t)
            return bool(d) and datetime.date.fromisoformat(d) < process_at.date()
        known = [datetime.date.fromisoformat(d) for d in dates.values() if d]
        last_game = (datetime.datetime.combine(max(known), datetime.time(23, 59), tzinfo=g.EASTERN)
                     if known else None)
        all_locked = bool(known) and all(d < process_at.date() for d in known)

    weeks = [w for w in range(week, ply[-1] + 1) if not (w == week and all_locked)]
    cur = week if weeks and weeks[0] == week else None
    locked = set()
    if cur is not None:
        locked = {p for p in set(proj_cur) | owned if team_of(p) and locked_team(team_of(p))}
    fixed = {}
    for rid, r in rosters.items():
        fixed[rid] = {}
        if cur is None:
            continue
        for slot, pid in zip(starters, r.get("starters") or []):
            if pid and pid != "0" and pid in locked:
                fixed[rid][pid] = slot
    pweek = week if (last_game is not None and process_at <= last_game) else week + 1
    deadline = league["settings"].get("trade_deadline")
    if deadline is not None and pweek > deadline:
        raise Refuse(f"the trade deadline has passed: a trade accepted now processes in week {pweek}, "
                     f"and the league's deadline is week {deadline}")
    universe0 = {p for p in pos if pos[p] in POSITIONS and p not in owned}
    multi = {p for p in universe0
             if len(set((players.get(p) or {}).get("fantasy_positions") or []) & set(POSITIONS)) > 1}
    return Ctx(us=us, them=None, rosters=rosters, spec=spec, flex_n=starters.count("FLEX"), starters=starters,
               cap=len(rp), reserve_slots=league["settings"].get("reserve_slots", 0), pos=pos, weeks=weeks,
               cur=cur, locked=locked, fixed=fixed, process_at=process_at, pweek=pweek, deadline=deadline,
               deadline_week=(deadline is not None and pweek == deadline), playoffs=ply,
               reg=[w for w in weeks if w < ply[0]], ply=[w for w in weeks if w in ply],
               ply_late=[w for w in weeks if w in ply[1:]], owned=owned,
               universe0=Universe(frozenset(universe0 - multi)), multi_excluded=sorted(multi),
               dropped_current=(week not in weeks), raw_ros={})


def check_rostered_positions(ctx, players, rids):
    bad = []
    for rid in rids:
        r = ctx.rosters[rid]
        for p in (r.get("players") or []):
            fp = set((players.get(p) or {}).get("fantasy_positions") or []) & set(POSITIONS)
            if len(fp) > 1:
                bad.append(f"{display(players, p)} {sorted(fp)}")
    if bad:
        raise Refuse(f"multi-position players are not modelled (greedy lineups need one position each): {bad}")


def build_sets(data, ctx):
    rostered = [p for r in data.rosters for p in (r.get("players") or [])]
    s_pts = sleeper_points(data, ctx.weeks)
    positive_control(data, s_pts, ctx.weeks, rostered)
    ctx.raw_ros = {p: sum(s_pts[w].get(p, 0.0) for w in ctx.weeks) for p in set().union(*(set(s_pts[w]) for w in ctx.weeks))}
    sets = {"SLEEPER": Sim(ctx, s_pts, "SLEEPER")}
    info = None
    if not data.sleeper_only:
        t_pts, info = three_sites(data, s_pts, ctx.weeks)
        sets["THREE SITES"] = Sim(ctx, t_pts, "THREE SITES")
    return sets, info


# ------------------------------------------------------------------ evaluate one trade


def weekly_delta(before, after, rid, weeks):
    return {w: after["weekly"][rid][w] - before["weekly"][rid][w] for w in weeks}


def h2h_weeks(data, ctx):
    out = []
    for w in ctx.reg:
        ms = data.matchups.get(w) or []
        mine = next((m.get("matchup_id") for m in ms if m.get("roster_id") == ctx.us), None)
        theirs = next((m.get("matchup_id") for m in ms if m.get("roster_id") == ctx.them), None)
        if mine is not None and mine == theirs:
            out.append(w)
    return out


def swing_sd(data, ctx):
    pts = []
    for w in sorted(data.matchups):
        if w >= data.state["week"]:
            break
        m = next((m for m in data.matchups[w] if m.get("roster_id") == ctx.us), None)
        if m and m.get("points"):
            pts.append(float(m["points"]))
    return (statistics.stdev(pts), len(pts)) if len(pts) >= 2 else (None, len(pts))


def evaluate(data, ctx, sets, info, give, get):
    out = {"sets": {}}
    for label, sim in sets.items():
        before = run_world(sim, ctx, ctx.rosters, (), ())
        after = run_world(sim, ctx, ctx.rosters, give, get)
        d = {rid: weekly_delta(before, after, rid, ctx.weeks) for rid in (ctx.us, ctx.them)}
        starts = {}
        cur_lines = {}
        for tag, world in (("before", before), ("after", after)):
            starts[tag] = {}
            for rid in (ctx.us, ctx.them):
                lines, streams = sim.detail(world["sides"][rid], world["universe"][rid])
                c = {}
                for w, ln in lines.items():
                    for _, pid, _ in ln:
                        c[pid] = c.get(pid, 0) + 1
                starts[tag][rid] = c
                if rid == ctx.us and ctx.cur is not None:
                    cur_lines[tag] = lines[ctx.cur]
        out["sets"][label] = {"before": before, "after": after, "delta": d, "starts": starts, "cur_lines": cur_lines}
    return out


def summarize(delta, ctx):
    return {"rest": sum(delta[w] for w in ctx.weeks), "reg": sum(delta[w] for w in ctx.reg),
            "ply": sum(delta[w] for w in ctx.ply), "late": sum(delta[w] for w in ctx.ply_late)}


# ------------------------------------------------------------------ the report


def f1(v):
    return f"{v:+.1f}"


def moves_text(moves, players):
    nm = lambda p: display(players, p)  # noqa: E731
    parts = []
    for p in moves["ir_in"]:
        parts.append(f"{nm(p)} goes straight to IR")
    if moves["drop"]:
        tie = [t for t in moves["drop_ties"] if t != moves["drop"]]
        if tie:
            names = ", ".join(" + ".join(nm(p) for p in t) for t in moves["drop_ties"])
            parts.append(f"drop any of: {names} (the model is indifferent; it dropped {' + '.join(nm(p) for p in moves['drop'])})")
        else:
            parts.append(f"drop {' + '.join(nm(p) for p in moves['drop'])}")
    for p in moves["add"]:
        parts.append(f"add {nm(p)} to fill the open spot")
    if moves["swap"]:
        parts.append(f"swap {nm(moves['swap'][0])} for free agent {nm(moves['swap'][1])}")
    for pin, k, pout in moves["shed"]:
        parts.append(f"{nm(pin)} back from IR in week {k}, so {nm(pout)} goes")
    return "; ".join(parts) or "no roster moves"


def weeks_label(ws):
    if not ws:
        return "none"
    return f"{ws[0]}-{ws[-1]}" if len(ws) > 1 else str(ws[0])


def render(data, ctx, info, res, give, get):
    P = data.players
    nm = lambda p: display(P, p)  # noqa: E731
    them_user = next((u for u in data.users if u["user_id"] == ctx.rosters[ctx.them].get("owner_id")), {})
    them_name = them_user.get("display_name") or f"roster {ctx.them}"
    labels = [s for s in SETS if s in res["sets"]]
    head = labels[0]
    L = []
    w = L.append
    w(f"TRADE CHECK -- PoppaBriggsy (roster {ctx.us}) with {them_name} (roster {ctx.them})")
    if data.sleeper_only:
        w(f"  SLEEPER ONLY tonight: the CBS + ESPN pull refused ({data.sleeper_only}). No three-site numbers.")
    if ctx.deadline_week:
        w(f"  This is the trade deadline week. Whether Sleeper still accepts trades this week is unverified; "
          f"the season outlook treats the start of week {ctx.deadline} as the deadline.")
    def tagline(p):
        q = position(P, p)
        return nm(p) if q == "DEF" else f"{nm(p)} ({q} {(P.get(p) or {}).get('team') or 'FA'})"
    w(f"  We give: {', '.join(tagline(p) for p in give)}")
    w(f"  We get:  {', '.join(tagline(p) for p in get)}")
    pa = ctx.process_at.astimezone(g.EASTERN)
    w(f"  It would process {pa:%a %b %d} {g.clock(pa)} (now + the league's review period, or --process-at).")
    traded_locked = [p for p in list(give) + list(get) if p in ctx.locked]
    if ctx.dropped_current:
        w(f"  Every week-{data.state['week']} game has kicked off by then, so week {data.state['week']} is not priced.")
    elif traded_locked:
        for p in traded_locked:
            owner = ctx.us if p in give else ctx.them
            where = "in a starting slot" if p in ctx.fixed.get(owner, {}) else "on the bench"
            whose = "ours" if owner == ctx.us else them_name + "'s"
            w(f"  {nm(p)} is locked by then ({where}), so his week-{ctx.cur} points stay {whose}.")
    if data.blind:
        w(f"  Kickoff times unavailable ({data.blind}); locks are by game DATE only -- a game today counts as unlocked.")
    w(f"  Weeks priced: {weeks_label(ctx.weeks)} (regular season {weeks_label(ctx.reg)}, playoffs {weeks_label(ctx.ply)}).")
    if not data.sleeper_only:
        clean = info["clean"]
        w(f"  Sources: Sleeper's projections every week; CBS + ESPN alongside Sleeper ('three sites') for week(s) "
          f"{', '.join(map(str, clean)) or 'none'}.")
        if data.next_missing:
            w(f"  Next week's CBS + ESPN pull refused ({data.next_missing}); three sites cover this week only.")
    w("  What these numbers assume:")
    w("   - Before and after the trade, both teams fix their rosters the same way and may stream one free agent a week.")
    if not data.sleeper_only:
        w("   - The three-site number counts Sleeper as one of its three votes, so it can never fully disagree with Sleeper.")
        rp = info["r_pos"]
        rtxt = " ".join(f"{q} {rp[q][0]:.2f}" for q in ("QB", "RB", "WR", "TE") if q in rp)
        w(f"   - After week {max(info['clean']) if info['clean'] else '-'}, the three-site number is Sleeper's, nudged by "
          f"how far each player ran from Sleeper in the three-site weeks -- by position, only as far as that gap has held "
          f"from one week to the next ({rtxt}; 1 = it always holds, 0 = pure noise).")
        w("   - Kickers and defenses use Sleeper's numbers in both sets.")
    w("   - A starter locked before the trade processes scores for his old team that week (unverified for a mid-week trade).")
    w("   - A player who never starts is worth 0 here; injury cover is outside the model.")
    for p in list(give) + list(get):
        if ctx.raw_ros.get(p, 0.0) <= 0.0:
            w(f"  🚨 {nm(p)} projects zero all season -- injured or a bad join; these numbers are not meaningful for him.")
    if not data.sleeper_only:
        for p in list(give) + list(get):
            if p not in info["ratio"] and (P.get(p) or {}).get("position") not in NEVER_ADJUSTED:
                w(f"  {nm(p)}: no usable three-site projection in the three-site weeks; his three-site number is Sleeper's.")
        involved = set(give) | set(get)
        for tag in ("before", "after"):
            for rid in (ctx.us, ctx.them):
                involved |= set(res["sets"][head]["starts"][tag][rid])
        for p in sorted(involved):
            raw = info["ratio"].get(p)
            if raw and raw[0] != raw[1]:
                w(f"  Clamped: {nm(p)} ran {raw[0]:.2f}x Sleeper in the three-site weeks; held to {raw[1]:.2f}x.")
    tot = {s: {rid: summarize(res["sets"][s]["delta"][rid], ctx) for rid in (ctx.us, ctx.them)} for s in labels}
    if len(labels) == 2 and (tot[labels[0]][ctx.us]["rest"] > 0) != (tot[labels[1]][ctx.us]["rest"] > 0):
        w("  THE TWO PROJECTION SETS DISAGREE ON WHETHER WE GAIN OR LOSE.")

    h2h = h2h_weeks(data, ctx)
    w("")
    w("WEEK BY WEEK -- points gained (+) or lost (-) by making the trade")
    hdr = f"  {'':22}" + "".join(f"{'w' + str(k):>7}" for k in ctx.weeks)
    hdr += f" | {'regular':>8} {'playoffs':>8} {'16-17':>7} | {'rest of season':>14}"
    w(hdr)
    for rid, who in ((ctx.us, "us"), (ctx.them, them_name)):
        for s in labels:
            dd = res["sets"][s]["delta"][rid]
            t = tot[s][rid]
            w(f"  {(who + ', ' + s.lower())[:22]:22}" + "".join(f"{dd[k]:>+7.1f}" for k in ctx.weeks)
              + f" | {t['reg']:>+8.1f} {t['ply']:>+8.1f} {t['late']:>+7.1f} | {t['rest']:>+14.1f}")
    for k in h2h:
        vals = ", ".join(f"{s.lower()} {res['sets'][s]['delta'][ctx.us][k] - res['sets'][s]['delta'][ctx.them][k]:+.1f}"
                         for s in labels)
        w(f"  Week {k} we play {them_name}: our change minus theirs = {vals}.")
    w(f"  ('16-17' is the playoffs for a top-2 seed, who skips week {ctx.playoffs[0]}.)")
    byes = []
    for p in list(give) + list(get):
        zero = [k for k in ctx.weeks if (P.get(p) or {}).get("team") in bye_teams(data.proj[k], {(P.get(p) or {}).get("team")})]
        if zero:
            byes.append(f"{nm(p)} wk {', '.join(map(str, zero))}")
    if byes:
        w(f"  Byes in the deal: {'; '.join(byes)}.")

    w("")
    w("HOW MUCH THE TWO PROJECTION SETS DISAGREE")
    if len(labels) < 2:
        w("  No second projection set tonight; disagreement not measured.")
    else:
        a, b = res["sets"][labels[0]]["delta"][ctx.us], res["sets"][labels[1]]["delta"][ctx.us]
        gaps = [abs(a[k] - b[k]) for k in ctx.weeks]
        big = max(ctx.weeks, key=lambda k: abs(a[k] - b[k]))
        w(f"  On our side the two sets differ by {statistics.mean(gaps):.1f} points a week on average, "
          f"most in week {big} ({abs(a[big] - b[big]):.1f}).")
        for rid, who in ((ctx.us, "us"), (ctx.them, them_name)):
            m0 = moves_text(res["sets"][labels[0]]["after"]["moves"][rid], P)
            m1 = moves_text(res["sets"][labels[1]]["after"]["moves"][rid], P)
            if m0 != m1:
                w(f"  The sets choose different roster moves after the trade for {who}: {labels[0].lower()} -> {m0}; "
                  f"{labels[1].lower()} -> {m1}.")
    sd, n = swing_sd(data, ctx)
    if sd is not None:
        w(f"  Neither number includes game-day luck: our weekly score has swung by about ±{sd:.0f} points "
          f"this season ({n} weeks played).")

    w("")
    w(f"WHAT THE SIMULATION DID ({head.lower()})")
    S = res["sets"][head]
    for tag, title in (("before", "Without the trade"), ("after", "With the trade")):
        for rid, who in ((ctx.us, "we"), (ctx.them, them_name)):
            w(f"  {title}, {who}: {moves_text(S[tag]['moves'][rid], P)}.")
    for rid, who in ((ctx.us, "Our"), (ctx.them, them_name + "'s")):
        b, a_ = S["starts"]["before"][rid], S["starts"]["after"][rid]
        changed = sorted((p for p in set(b) | set(a_) if b.get(p, 0) != a_.get(p, 0)),
                         key=lambda p: (a_.get(p, 0) - b.get(p, 0), nm(p)))
        if changed:
            w(f"  {who} starts that change (weeks started, without -> with the trade, of {len(ctx.weeks)}):")
            for p in changed:
                w(f"    {nm(p):28} {b.get(p, 0):>2} -> {a_.get(p, 0):>2}")
    if ctx.cur is not None and S["cur_lines"]:
        w(f"  Our week-{ctx.cur} lineup, without -> with the trade:")
        order = list(dict.fromkeys(ctx.starters))
        def fmt(line):  # noqa: E306
            by = {}
            for slot, pid, v in line:
                by.setdefault(slot, []).append(f"{nm(pid)} {v:.1f}")
            return by
        bb, aa = fmt(S["cur_lines"]["before"]), fmt(S["cur_lines"]["after"])
        for slot in order:
            for i in range(max(len(bb.get(slot, [])), len(aa.get(slot, [])))):
                l1 = bb.get(slot, [])[i] if i < len(bb.get(slot, [])) else "-"
                l2 = aa.get(slot, [])[i] if i < len(aa.get(slot, [])) else "-"
                w(f"    {slot:5} {l1:32} -> {l2}")
    if ctx.multi_excluded:
        w(f"  ({len(ctx.multi_excluded)} multi-position free agents were left out of the free-agent pool.)")
    return "\n".join(L)


# ------------------------------------------------------------------ search


def search(data, ctx, sets, info, anchors, top):
    """Every package: our anchors (+ optionally one more of ours) for one or two of theirs, IR
    players included. The BEFORE world is the same for every package, so it is computed once."""
    us_r, them_r = ctx.rosters[ctx.us], ctx.rosters[ctx.them]
    ours = [p for p in (us_r.get("players") or []) if p not in anchors]
    theirs = list(them_r.get("players") or [])
    gets = [list(c) for k in (1, 2) for c in itertools.combinations(theirs, k)]
    gives = [list(anchors)] + [list(anchors) + [p] for p in ours]
    before = {s: run_world(sim, ctx, ctx.rosters, (), ()) for s, sim in sets.items()}
    rows = []
    for gv in gives:
        for gt in gets:
            row = {"give": gv, "get": gt, "sets": {}}
            for s, sim in sets.items():
                after = run_world(sim, ctx, ctx.rosters, gv, gt)
                row["sets"][s] = {
                    "us": sum(weekly_delta(before[s], after, ctx.us, ctx.weeks).values()),
                    "them": sum(weekly_delta(before[s], after, ctx.them, ctx.weeks).values()),
                    "moves": {ctx.us: after["moves"][ctx.us], ctx.them: after["moves"][ctx.them]}}
            rows.append(row)
    labels = [s for s in SETS if s in sets]
    head = labels[0]
    flips = sum(1 for r in rows if len(labels) == 2 and (r["sets"][labels[0]]["us"] > 0) != (r["sets"][labels[1]]["us"] > 0))
    kept = sorted((r for r in rows if r["sets"][head]["them"] >= 0), key=lambda r: -r["sets"][head]["us"])
    wish = sorted(rows, key=lambda r: -r["sets"][head]["us"])[:5]
    return {"rows": rows, "kept": kept, "wish": wish, "flips": flips, "labels": labels, "head": head, "top": top}


def render_search(data, ctx, res, anchors):
    P = data.players
    nm = lambda p: display(P, p)  # noqa: E731
    them_user = next((u for u in data.users if u["user_id"] == ctx.rosters[ctx.them].get("owner_id")), {})
    them = them_user.get("display_name") or f"roster {ctx.them}"
    labels, head = res["labels"], res["head"]
    L = []
    w = L.append
    w(f"COUNTER SEARCH -- with {them} (roster {ctx.them}); every package gives {', '.join(nm(p) for p in anchors)}")
    if data.sleeper_only:
        w(f"  SLEEPER ONLY tonight ({data.sleeper_only}); the ranking is Sleeper's.")
    if ctx.deadline_week:
        w(f"  This is the trade deadline week (unverified whether Sleeper still accepts trades; treat the start of week "
          f"{ctx.deadline} as the deadline).")
    w(f"  Weeks priced: {weeks_label(ctx.weeks)}. Same method as the single-trade check: both worlds, both teams, "
      "one stream a week, the same roster fix.")
    w(f"  Evaluated {len(res['rows'])} packages; kept {len(res['kept'])} where {them} does not lose "
      f"({head.lower()}). Showing the top {min(res['top'], len(res['kept']))}; --json holds them all.")
    if len(labels) == 2:
        w(f"  {res['flips']} of {len(res['rows'])} packages change sign for us between the two projection sets -- "
          "those rows are marked ±.")
    w("")

    def line(i, r):
        cells = " | ".join(f"{s.lower()}: us {r['sets'][s]['us']:+.1f}, them {r['sets'][s]['them']:+.1f}" for s in labels)
        mark = " ±" if len(labels) == 2 and (r["sets"][labels[0]]["us"] > 0) != (r["sets"][labels[1]]["us"] > 0) else ""
        w(f"  {i:>2}. give {' + '.join(nm(p) for p in r['give'])}  for  {' + '.join(nm(p) for p in r['get'])}{mark}")
        w(f"      {cells}")
        mv = r["sets"][head]["moves"]
        w(f"      moves: we {moves_text(mv[ctx.us], P)}; {them} {moves_text(mv[ctx.them], P)}")

    w(f"RANKED BY OUR REST-OF-SEASON CHANGE ({head.lower()}), {them} not losing")
    for i, r in enumerate(res["kept"][:res["top"]], 1):
        line(i, r)
    w("")
    w(f"BEST FOR US REGARDLESS OF {them.upper()} (top 5) -- a wish list, not an offer they gain from")
    for i, r in enumerate(res["wish"], 1):
        line(i, r)
    return "\n".join(L)


# ------------------------------------------------------------------ main


def parse_process_at(text):
    try:
        dt = datetime.datetime.strptime(text, "%Y-%m-%d %H:%M")
    except ValueError as e:
        raise Refuse(f"--process-at wants 'YYYY-MM-DD HH:MM' (Eastern): {e}") from e
    return dt.replace(tzinfo=g.EASTERN)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--give", action="append", default=[], help="a player of ours (id, DEF code or exact full name); repeat")
    ap.add_argument("--get", action="append", default=[], help="a player of theirs; repeat")
    ap.add_argument("--search", action="store_true", help="search counter-offers instead of pricing one trade")
    ap.add_argument("--team", help="--search: the other team (roster id or display name)")
    ap.add_argument("--process-at", help="when the trade would process, 'YYYY-MM-DD HH:MM' Eastern "
                                         "(default: now + the league's review period)")
    ap.add_argument("--top", type=int, default=15, help="--search: packages shown (default 15)")
    ap.add_argument("--json", help="also write every number here")
    a = ap.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    try:
        if a.search:
            if not a.team or not a.give or a.get:
                raise Refuse("--search needs --team and at least one --give, and no --get")
        elif not a.give or not a.get:
            raise Refuse("pricing a trade needs at least one --give and one --get")
        data = load()
        review = int(data.league["settings"].get("trade_review_days") or 0)
        process_at = (parse_process_at(a.process_at) if a.process_at
                      else g.now().replace(tzinfo=g.EASTERN) + datetime.timedelta(days=review))
        ctx = prepare(data, process_at)
        rostered = {p for r in data.rosters for p in (r.get("players") or [])}
        owner = {p: r["roster_id"] for r in data.rosters for p in (r.get("players") or [])}
        give = [resolve(t, rostered, data.players) for t in a.give]
        bad = [f"{display(data.players, p)} (roster {owner[p]})" for p in give if owner[p] != ctx.us]
        if bad:
            raise Refuse(f"--give must be our players (roster {ctx.us}); these are not: {', '.join(bad)}")
        if a.search:
            team = a.team.strip()
            by_name = {(u.get("display_name") or "").lower(): u["user_id"] for u in data.users}
            rid = int(team) if team.isdigit() else next(
                (r["roster_id"] for r in data.rosters if r.get("owner_id") == by_name.get(team.lower())), None)
            if rid is None or rid not in ctx.rosters:
                raise Refuse(f"--team '{team}' is not a roster id or a display name in this league")
            if rid == ctx.us:
                raise Refuse(f"--team {team} is OUR roster ({ctx.us}); the search needs the other team")
            ctx.them = rid
        else:
            get = [resolve(t, rostered, data.players) for t in a.get]
            homes = {owner[p] for p in get}
            if len(homes) != 1 or ctx.us in homes:
                where = ", ".join(f"{display(data.players, p)} (roster {owner[p]})" for p in get)
                raise Refuse(f"every --get must be on ONE roster that is not ours; got {where}")
            ctx.them = homes.pop()
        check_rostered_positions(ctx, data.players, (ctx.us, ctx.them))
        sets, info = build_sets(data, ctx)
        if a.search:
            res = search(data, ctx, sets, info, give, a.top)
            text = render_search(data, ctx, res, give)
            dump = {"them": ctx.them, "weeks": ctx.weeks, "flips": res["flips"],
                    "packages": [{"give": r["give"], "get": r["get"],
                                  "sets": {s: {k: v for k, v in r["sets"][s].items() if k != "moves"} for s in r["sets"]}}
                                 for r in res["rows"]]}
        else:
            res = evaluate(data, ctx, sets, info, give, get)
            text = render(data, ctx, info, res, give, get)
            dump = {"them": ctx.them, "weeks": ctx.weeks, "give": give, "get": get,
                    "sets": {s: {"delta": {str(rid): v["delta"][rid] for rid in v["delta"]},
                                 "moves": {t: {str(rid): v[t]["moves"][rid] for rid in v[t]["moves"]}
                                           for t in ("before", "after")}}
                             for s, v in res["sets"].items()}}
    except Refuse as e:
        print(f"REFUSED: {e}")
        return 2
    print(text)
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, "w", encoding="utf-8") as fh:
            json.dump(dump, fh, indent=1, default=list)
        print(f"\nwrote {a.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

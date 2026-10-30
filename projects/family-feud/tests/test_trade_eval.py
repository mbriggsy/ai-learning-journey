#!/usr/bin/env python3
"""Tests for scripts/trade_eval.py -- the on-demand trade evaluator.

    python -m unittest tests.test_trade_eval -v        (from the project root)

No network. Two kinds of fixture:
  * THE FROZEN NIGHT -- tests/fixtures/trade_eval_kaeperni_20261022.json.gz, the payloads Kaeperni's
    A.J. Brown + Tucker Kraft for Zay Flowers offer was priced on (2026-10-22 21:30 ET). It pins the
    published numbers through main() with the documented argv, and the invariants a wrong model
    breaks quietly (insight 024: one free agent on two rosters, a man started the week before he is
    released).
  * MINI -- a hand-built two-team league small enough to check by eye (8 roster spots, 6 starters),
    one rule per scenario.
Every refusal and every report-gating line is asserted through main(argv), not only on a helper
(insight 013): a guard that is tested but not connected passes every unit test.
"""
import contextlib
import datetime
import io
import itertools
import json
import os
import random
import sys
import tempfile
import unittest

TESTS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TESTS)
sys.path.insert(0, TESTS)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
import trade_eval_net as net  # noqa: E402
import trade_eval as te  # noqa: E402
import gameday_check as g  # noqa: E402
import lineup_value  # noqa: E402

KAEPERNI = ["--give", "Zay Flowers", "--get", "A.J. Brown", "--get", "Tucker Kraft"]   # the documented argv
US, THEM, OTHER = 3, 5, 1


def run_json(argv, n=None):
    """main() with --json into a temp file -> (code, stdout, parsed json or None)."""
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "out.json")
        code, out = net.run(argv + ["--json", path], n)
        data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else None
    return code, out, data


def total(delta, weeks=None):
    return sum(v for w, v in delta.items() if weeks is None or int(w) in weeks)


# ------------------------------------------------------------------ the frozen night


class TestThePublishedNumber(unittest.TestCase):
    """The documented command on the frozen payloads reproduces the RECORDED result -- recorded from
    the shipped method, never tuned to a scratch number. Insight 035 explains the gaps to the
    hand-built -45.6 / -33.0. Re-recorded 2026-10-23 after the whole-file review, from -36.9 / -47.8
    (Kaeperni +43.7 / +53.9), step by step on this night (three sites us/them, Sleeper us/them):
      swaps repeat until none gains (one swap was not parity)    -32.74 / +39.34, -45.76 / +50.18
      a tied add goes to the player the market values most        -32.74 / +38.47, unchanged
      IR return needs 2 of 3 sites; one-week ratios carry r       -32.83 / +38.93, unchanged
      a man let go at processing is on waivers until next week    -36.25 / +43.19, -45.53 / +50.43
    The drop-pool, empty-spot IR and position fixes do not move this night. Re-recorded 2026-10-29: the
    next-week rule was a guess (Wednesday waivers); measured 10-28, a dropped man is on waivers ONE day
    (waiver_clear_days 1), so a man cut when this Friday-night trade processes can start that Sunday:
      a man let go at processing can start for the other side that week  -32.83 / +38.93, -45.76 / +50.18"""

    @classmethod
    def setUpClass(cls):
        cls.code, cls.out, cls.js = run_json(list(KAEPERNI))

    def test_runs(self):
        self.assertEqual(self.code, 0, self.out)

    def test_our_numbers(self):
        three, sleeper = self.js["sets"]["THREE SITES"]["delta"], self.js["sets"]["SLEEPER"]["delta"]
        self.assertAlmostEqual(total(three[str(US)]), -32.83, places=2)
        self.assertAlmostEqual(total(three[str(US)], range(7, 15)), -21.70, places=2)
        self.assertAlmostEqual(total(three[str(US)], range(15, 18)), -11.14, places=2)
        self.assertAlmostEqual(three[str(US)]["7"], -2.19, places=2)
        self.assertAlmostEqual(total(sleeper[str(US)]), -45.76, places=2)
        self.assertAlmostEqual(total(sleeper[str(US)], range(7, 15)), -31.19, places=2)
        self.assertAlmostEqual(total(sleeper[str(US)], range(15, 18)), -14.57, places=2)
        self.assertAlmostEqual(sleeper[str(US)]["7"], -6.10, places=2)

    def test_their_numbers(self):
        self.assertAlmostEqual(total(self.js["sets"]["THREE SITES"]["delta"][str(THEM)]), 38.93, places=2)
        self.assertAlmostEqual(total(self.js["sets"]["SLEEPER"]["delta"][str(THEM)]), 50.18, places=2)

    def test_the_printed_table_carries_the_same_numbers(self):
        """The table is what Briggsy reads; the JSON is not. Pinned only in --json, a row printing the
        wrong set, a 'rest of season' that is really the regular season, or a '16-17' summing all three
        playoff weeks all passed the suite (review 2026-10-23, mutants M10-M12)."""
        rows = {}
        for line in self.out.split("WEEK BY WEEK")[1].split("HOW MUCH")[0].splitlines():
            if " | " in line and "," in line.split("|")[0]:          # a side's row, not the header
                label, _, tail = line.strip().partition("  ")
                rows[label] = [float(v) for v in line.split("|", 1)[1].replace("|", " ").split()]
        self.assertEqual(rows["us, three sites"], [-21.7, -11.1, -7.8, -32.8])       # regular, playoffs, 16-17, rest
        self.assertEqual(rows["us, sleeper"], [-31.2, -14.6, -10.1, -45.8])
        self.assertEqual(rows["Kaeperni, three sites"], [28.3, 10.6, 8.4, 38.9])
        self.assertEqual(rows["Kaeperni, sleeper"], [34.6, 15.6, 10.7, 50.2])

    def test_it_says_what_the_numbers_rest_on(self):
        self.assertIn("sits on waivers for 1 day (the league's waiver_clear_days), so he can start for the other "
                      "side in week 7.", self.out)
        self.assertNotIn("processes late", self.out)                  # Fri 21:30 clears Sat night: no kickoff in between
        self.assertIn("With the trade, Kaeperni wanted Kyler Murray too; we pick free agents first", self.out)
        self.assertEqual((self.js["process_at"], self.js["sleeper_only"], self.js["three_site_weeks"]),
                         ("2026-10-23T21:30:00-04:00", None, [7, 8]))

    def test_our_drop_is_a_three_way_tie_and_printed_as_one(self):
        moves = self.js["sets"]["THREE SITES"]["moves"]["after"][str(US)]
        self.assertEqual({p for t in moves["drop_ties"] for p in t}, {"12506", "7611", "8136"})   # Fannin, Stevenson, White
        self.assertIn("drop any of: Harold Fannin Jr., Rhamondre Stevenson, Rachaad White", self.out)

    def test_their_pickup_differs_by_set_and_the_report_says_so(self):
        self.assertEqual(self.js["sets"]["THREE SITES"]["moves"]["after"][str(THEM)]["add"], ["3163"])   # Jared Goff
        self.assertEqual(self.js["sets"]["SLEEPER"]["moves"]["after"][str(THEM)]["add"], ["11635"])      # Ladd McConkey
        self.assertIn("The sets choose different roster moves after the trade for Kaeperni", self.out)

    def test_brown_is_locked_tonight_and_his_points_stay_theirs(self):
        self.assertIn("A.J. Brown is locked by then (in a starting slot), so his week-7 points stay Kaeperni's", self.out)

    def test_the_head_to_head_week_prints_the_net_swing(self):
        self.assertIn("Week 10 we play Kaeperni: our change minus theirs = three sites -5.4, sleeper -7.0", self.out)


class TestNoPlayerIsUsedTwice(unittest.TestCase):
    """THE invariant the hand-built versions broke three times (insight 035): in any world, any week,
    a player's points count for at most one side. Precisely: (1) no player starts or streams for both
    sides; (2) a player starts for a side whose roster he is not on ONLY as a starter locked before the
    trade processes, credited to his old owner (D3); (3) a streamed player is on nobody's roster.
    Broken by: streaming the free agent Kaeperni had just picked up (the scratch code); starting Woody
    Marks for us in week 7 because Kaeperni releases him in week 8; and both sides streaming the same
    released receiver in week 13 (both caught on the frozen night, 2026-10-22)."""

    def test_on_the_frozen_night_both_sets_both_worlds(self):
        n = net.Net()
        with n.patched():
            data = te.load()
            ctx = te.prepare(data, net.PRICED_AT.replace(tzinfo=g.EASTERN) + datetime.timedelta(days=1))
            ctx.them = THEM
            sets, _ = te.build_sets(data, ctx)
            give, get = ["9997"], ["5859", "9484"]
            for label, sim in sets.items():
                for tag, (gv, gt) in (("before", ((), ())), ("after", (give, get))):
                    world = te.run_world(sim, ctx, ctx.rosters, gv, gt)
                    seen = {}
                    for rid in (US, THEM):
                        lines, streams = sim.detail(world["sides"][rid], world["universe"][rid])
                        for w in ctx.weeks:
                            seen.setdefault(w, {})[rid] = (set(world["sides"][rid].available(w)),
                                                          {p for _, p, _ in lines[w]}, streams[w])
                            # the lineup inspected here IS the one scored -- not a re-derived copy
                            self.assertAlmostEqual(sum(v for _, _, v in lines[w]), world["weekly"][rid][w], places=6,
                                                   msg=f"{label} {tag} {rid} week {w}: detail is not what was scored")
                    for w, by in seen.items():
                        where = f"{label} {tag} week {w}"
                        self.assertEqual(by[US][1] & by[THEM][1], set(), f"{where}: starts for both sides")
                        for a, b in ((US, THEM), (THEM, US)):
                            locked = set(ctx.fixed.get(a, {})) if w == ctx.cur else set()
                            self.assertLessEqual(by[a][1] & by[b][0], locked,
                                                 f"{where}: starts for {a} while on {b}'s roster")
                            if by[a][2]:
                                self.assertNotIn(by[a][2], by[US][0] | by[THEM][0], f"{where}: streamed off a roster")


# ------------------------------------------------------------------ mini league builder


SLOTS8 = ["QB", "RB", "WR", "TE", "FLEX", "K", "BN", "BN"]
NOW = datetime.datetime(2026, 11, 12, 21, 30)                 # Thursday of week 10, 9:30 PM ET


def sunday(w):
    """Week w's Sunday: week 10 is 2026-11-15, and every week moves the calendar with it."""
    return datetime.date(2026, 11, 15) + datetime.timedelta(weeks=w - 10)


def kickoff(w, thursday=False):
    """1:00 PM ET Sunday, or 8:15 PM ET Thursday (UTC in the map, as ESPN gives it)."""
    if thursday:
        return f"{sunday(w) - datetime.timedelta(days=2)}T01:15:00+00:00"      # Thu 8:15 PM ET = Fri 01:15 UTC
    return f"{sunday(w)}T18:00:00+00:00"


class Mini:
    """A small league: rosters 1, 3 (us) and 5, cap 8, starters QB/RB/WR/TE/FLEX/K. Points are exact
    (stats {"rec_yd": 10 * pts} at 0.1 a yard). Team codes are letters, so their DEF rows read as DEFs."""

    def __init__(self, week=10, deadline=11, slots=None):
        self.week, self.deadline, self.slots = week, deadline, list(slots or SLOTS8)
        self.players, self.pts = {}, {}
        self.roster, self.reserve, self.starters = {1: [], 3: [], 5: []}, {1: [], 3: [], 5: []}, {}
        self.byes, self.thursday, self.x, self.extra_scoring, self.raw_stats = {}, set(), {}, {}, {}
        self.h2h_week = 12

    @property
    def weeks(self):
        return range(self.week, 18)

    def add(self, pid, pos, pts, team="AAA", roster=None, ir=False, name=None, fp=None):
        name = name or f"Player {pid}"
        first, last = (name.split(" ", 1) + [""])[:2]
        self.players[pid] = {"full_name": name, "first_name": first, "last_name": last, "position": pos,
                             "team": team, "fantasy_positions": fp or [pos], "injury_status": None}
        self.pts[pid] = dict(pts) if isinstance(pts, dict) else {w: pts for w in self.weeks}
        if roster:
            self.roster[roster].append(pid)
            if ir:
                self.reserve[roster].append(pid)
        return pid

    def pad(self, rid, n, team="AAA", prefix=None):
        stem = prefix or f"z{rid}"
        for i in range(n):
            self.add(f"{stem}{i}", "WR", 0.0, team=team, roster=rid, name=f"Bench {stem}{i}")

    def build(self):
        teams = {p["team"] for p in self.players.values()} | {"AAA"}
        proj = {}
        for w in self.weeks:
            rows = []
            for pid, pl in self.players.items():
                bye = w in self.byes.get(pl["team"], ())
                date = str(sunday(w) - datetime.timedelta(days=3)) if pl["team"] in self.thursday and w == self.week                     else str(sunday(w))
                v = self.pts[pid].get(w, 0.0)
                stats = dict(self.raw_stats.get((w, pid), {"rec_yd": v * 10}))
                rows.append({"player_id": pid, "date": None if bye else date, "opponent": None if bye else "OPP",
                             "stats": {} if bye else stats})
            for t in sorted(teams):
                bye = w in self.byes.get(t, ())
                day = sunday(w) - datetime.timedelta(days=3) if t in self.thursday and w == self.week else sunday(w)
                rows.append({"player_id": t, "date": None if bye else str(day), "opponent": None if bye else "OPP",
                             "stats": {}})
            proj[str(w)] = rows
        xrows = {}
        for w in (self.week, self.week + 1):
            xr = {}
            for pid, pl in self.players.items():
                v = self.pts[pid].get(w, 0.0)
                row = {"name": pl["full_name"], "pos": pl["position"], "team": pl["team"], "sleeper": v, "cbs": v,
                       "espn": v, "consensus": v, "n": 3, "spread": 0.0, "approx": pl["position"] in ("K", "DEF")}
                row.update(self.x.get((w, pid), {}))
                xr[pid] = row
            xrows[str(w)] = xr
        def starters(rid):  # noqa: E306
            return self.starters.get(rid, ["0"] * len([s for s in self.slots if s != "BN"]))
        rosters = [{"roster_id": rid, "owner_id": {1: "u1", 3: g.BRIGGSY_USER_ID, 5: "u5"}[rid],
                    "players": list(self.roster[rid]), "reserve": list(self.reserve[rid]), "taxi": [],
                    "starters": starters(rid)} for rid in (1, 3, 5)]
        users = [{"user_id": "u1", "display_name": "Other"}, {"user_id": g.BRIGGSY_USER_ID, "display_name": "PoppaBriggsy"},
                 {"user_id": "u5", "display_name": "Rival"}]
        matchups = {}
        for w in range(1, 15):
            if w == self.h2h_week:
                ms = [{"roster_id": 3, "matchup_id": 1, "points": 0}, {"roster_id": 5, "matchup_id": 1, "points": 0},
                      {"roster_id": 1, "matchup_id": 2, "points": 0}]
            else:
                ms = [{"roster_id": 3, "matchup_id": 1, "points": 100.0 + 10 * w if w < self.week else 0},
                      {"roster_id": 1, "matchup_id": 1, "points": 0}, {"roster_id": 5, "matchup_id": 2, "points": 0}]
            matchups[str(w)] = ms
        kick = {t: kickoff(self.week, t in self.thursday) for t in teams}
        return {"state": {"week": self.week, "season": "2026", "season_type": "regular"},
                "league": {"league_id": g.LEAGUE_ID, "name": "Mini", "season": "2026",
                           "scoring_settings": {"rec_yd": 0.1, **self.extra_scoring}, "roster_positions": self.slots,
                           "settings": {"playoff_week_start": 15, "playoff_teams": 6, "playoff_round_type": 0,
                                        "trade_deadline": self.deadline, "trade_review_days": 1, "reserve_slots": 2,
                                        "waiver_clear_days": 1}},
                "rosters": rosters, "users": users, "matchups": matchups, "projections": proj,
                "players": self.players, "kickoffs": {str(self.week): kick}, "xload_rows": xrows}

    def net(self, **kw):
        return net.Net(fx=self.build(), now=kw.pop("now", NOW), **kw)

    def run(self, argv, **kw):
        return run_json(argv, self.net(**kw))

    @contextlib.contextmanager
    def world(self, process_at=None, them=THEM, **kw):
        """(data, ctx, sets) on this league, inside the patched network."""
        n = self.net(**kw)
        with n.patched():
            data = te.load()
            ctx = te.prepare(data, process_at or (NOW.replace(tzinfo=g.EASTERN) + datetime.timedelta(days=1)))
            ctx.them = them
            sets, info = te.build_sets(data, ctx)
            yield data, ctx, sets


def standard(m, rid, base, team="AAA", qb=20.0, rb=15.0, wr=15.0, te_=10.0, k=8.0, bench=3):
    """A full 8-man roster: one starter at each of QB/RB/WR/TE/K plus `bench` zero-point bodies."""
    ids = {}
    for pos, v in (("QB", qb), ("RB", rb), ("WR", wr), ("TE", te_), ("K", k)):
        ids[pos] = m.add(f"{base}{pos.lower()}", pos, v, team=team, roster=rid, name=f"{base.title()} {pos}")
    m.pad(rid, bench, team=team, prefix=base)
    return ids


# ------------------------------------------------------------------ the lineup optimiser


class TestLineupIsOptimal(unittest.TestCase):
    """The one-pass greedy, the closed-form stream gain and lineup_value.best_lineup must all equal a
    brute force -- on the real slot set (QB/2RB/2WR/TE/2FLEX/K/DEF)."""

    SPEC = {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "K": 1, "DEF": 1}

    def sim(self, pos, pts):
        ctx = te.Ctx(spec=dict(self.SPEC), flex_n=2, pos=pos, weeks=[1], cur=None, locked=set(), fixed={})
        return te.Sim(ctx, {1: pts}, "T")

    def brute(self, pool, pos, pts):
        best = 0.0
        for k in range(0, min(len(pool), 10) + 1):
            for sub in itertools.combinations(pool, k):
                c = {q: sum(1 for p in sub if pos[p] == q) for q in te.POSITIONS}
                if c["QB"] > 1 or c["K"] > 1 or c["DEF"] > 1:
                    continue
                if max(0, c["RB"] - 2) + max(0, c["WR"] - 2) + max(0, c["TE"] - 1) > 2:
                    continue
                best = max(best, sum(pts[p] for p in sub))
        return best

    def test_greedy_equals_brute_force_and_lineup_value(self):
        rng = random.Random(20261022)
        for _ in range(200):
            n = rng.randint(4, 12)
            pool = [f"p{i}" for i in range(n)]
            pos = {p: rng.choice(te.POSITIONS) for p in pool}
            pts = {p: round(rng.uniform(0, 25), 1) for p in pool}
            got = self.sim(pos, pts).lineup(1, pool)
            self.assertAlmostEqual(got, self.brute(pool, pos, pts), places=6)
            by = {}
            for p in pool:
                by.setdefault(pos[p], []).append(pts[p])
            lv = lineup_value.best_lineup(by, None, dict(self.SPEC), set(te.FLEX_OK), 2)
            self.assertAlmostEqual(got, lv, places=6)

    def test_the_stream_gain_equals_re_solving_with_him_in(self):
        rng = random.Random(7)
        for _ in range(300):
            n = rng.randint(3, 14)
            pool = [f"p{i}" for i in range(n)]
            pos = {p: rng.choice(te.POSITIONS) for p in pool + ["c"]}
            pts = {p: round(rng.uniform(0, 25), 1) for p in pool + ["c"]}
            s = self.sim(pos, pts)
            fixed = {}
            if rng.random() < 0.3:                          # a locked starter in his slot
                f = pool.pop()
                fixed[f] = "FLEX" if pos[f] in te.FLEX_OK and rng.random() < 0.5 else pos[f]
            fill = s._fill(1, pool, fixed)
            want = s.lineup(1, pool + ["c"], fixed)
            self.assertAlmostEqual(fill[0] + s._gain(1, "c", fill), want, places=6,
                                   msg=f"pool {[(pos[p], pts[p]) for p in pool]} fixed {fixed} c {(pos['c'], pts['c'])}")


# ------------------------------------------------------------------ fairness (insight 035)


class TestTheBaselineGetsEveryRemedy(unittest.TestCase):
    def league(self):
        m = Mini()
        m.byes["BYE"] = {12}
        us = standard(m, US, "us", team="AAA")
        m.players[us["QB"]]["team"] = "BYE"                    # our only QB is on bye in week 12
        standard(m, THEM, "th", team="CCC")
        m.add("fq", "QB", 15.0, team="DDD", name="Free Quarterback")
        return m

    def test_a_spot_freeing_2_for_1_gains_nothing_from_a_bye_week_qb(self):
        """No backup QB, a QB bye in the window: the scratch code credited the trade with the FA QB
        the open spot let us add (+18 on the real night). The baseline can make that add too."""
        m = self.league()
        code, out, js = m.run(["--give", "us0", "--give", "us1", "--get", "th0"])   # two zero bench bodies for one
        self.assertEqual(code, 0, out)
        for s in ("THREE SITES", "SLEEPER"):
            d = js["sets"][s]["delta"][str(US)]
            self.assertAlmostEqual(d["12"], 0.0, places=6, msg=f"{s}: the bye week was credited to the trade")
            self.assertAlmostEqual(total(d), 0.0, places=6)

    def test_the_baseline_streams_the_qb_in_the_bye_week(self):
        m = self.league()
        with m.world() as (data, ctx, sets):
            before = te.run_world(sets["SLEEPER"], ctx, ctx.rosters, (), ())
            # 15 (FA QB) + RB 15 + WR 15 + TE 10 + K 8 = 63: the QB slot is NOT a zero in the bye week
            self.assertAlmostEqual(before["weekly"][US][12], 63.0, places=6)

    def test_a_second_free_agent_is_open_to_the_baseline_too(self):
        """One swap was not parity: a trade that frees a spot fills it AND swaps -- two free agents --
        while today's full roster got one. Insight 035's denied remedy again, found by the 2026-10-23
        review (frozen night: Kaeperni added Goff and McConkey after, McConkey only before). Here our
        RB and WR share a week-12 bye: the second free agent covers one hole, the stream the other."""
        m = Mini()
        m.byes["B12"] = {12}
        us = standard(m, US, "us")                                    # FLEX is a zero bench body
        for pos in ("RB", "WR"):
            m.players[us[pos]]["team"] = "B12"
        standard(m, THEM, "th", team="CCC")
        m.add("thf", "WR", 30.0, team="CCC", roster=THEM, name="Their Flex")     # they need nobody
        m.roster[THEM].remove("th2")
        m.add("fw1", "WR", 12.0, team="DDD", name="Free Wideout")
        m.add("fr1", "RB", 9.0, team="DDD", name="Free Back")
        m.add("fw2", "WR", 7.0, team="DDD", name="Spare Wideout")
        code, out, js = m.run(["--give", "us0", "--give", "us1", "--get", "th0"])     # two zero bodies for one
        self.assertEqual(code, 0, out)
        for s in ("THREE SITES", "SLEEPER"):
            self.assertAlmostEqual(total(js["sets"][s]["delta"][str(US)]), 0.0, places=6, msg=s)
            before = js["sets"][s]["moves"]["before"][str(US)]
            self.assertEqual(sorted(add for _, add in before["swaps"]), ["fr1", "fw1"], msg=s)

    def test_a_fill_worth_nothing_takes_the_free_agent_the_market_values_most(self):
        """Their open spot gains them nothing whoever fills it. The fill used to break that tie by
        shortlist order -- a quarterback first -- and took the QB we stream in our bye week: -15 to us
        for a trade of zero-point bodies. Ties now go by raw Sleeper value: the 16-point back."""
        m = Mini()
        m.byes["B12"] = {12}
        us = standard(m, US, "us", rb=20.0, wr=20.0)                   # neither free agent starts for us
        m.players[us["QB"]]["team"] = "B12"                            # our only QB: bye in week 12
        m.add("usf", "WR", 25.0, roster=US, name="Our Flex")
        m.roster[US].remove("us2")
        standard(m, THEM, "th", team="CCC", qb=30.0, rb=30.0, wr=30.0, te_=30.0, k=30.0)
        m.add("thf", "WR", 30.0, team="CCC", roster=THEM, name="Their Flex")
        m.roster[THEM].remove("th2")
        m.add("fq", "QB", 15.0, team="DDD", name="Free Quarterback")
        m.add("fr", "RB", 16.0, team="DDD", name="Free Back")
        code, out, js = m.run(["--give", "us0", "--get", "th0", "--get", "th1"])     # they end one body short
        self.assertEqual(code, 0, out)
        for s in ("THREE SITES", "SLEEPER"):
            self.assertEqual(js["sets"][s]["moves"]["after"][str(THEM)]["add"], ["fr"], msg=s)
            self.assertAlmostEqual(js["sets"][s]["delta"][str(US)]["12"], 0.0, places=6, msg=s)

    def test_a_man_let_go_at_processing_can_start_for_the_other_side_that_week(self):
        """Measured 2026-10-28: a dropped player sits on waivers ONE day (waiver_clear_days 1), so a man
        cut when a Friday trade processes can start that Sunday. The 10-23 review had guessed Wednesday
        waivers and held him a week; that guess moved the frozen night's headline 3.4 points."""
        m = Mini()
        standard(m, US, "us")                                          # FLEX: a zero body
        standard(m, THEM, "th", team="CCC")
        m.add("thgood", "WR", 14.0, team="CCC", roster=THEM, name="Their Cut")    # they must cut someone
        m.roster[THEM].remove("th2")
        with m.world() as (data, ctx, sets):
            sim = sets["SLEEPER"]
            after = te.run_world(sim, ctx, ctx.rosters, ["us0", "us1"], ["th0"])      # they end one over
            self.assertEqual(ctx.cur, 10)
            cut = after["moves"][THEM]["drop"]
            self.assertTrue(cut)
            U = after["universe"][US]
            for p in cut:
                self.assertTrue(U.has(p, 10), f"{p} not streamable the week he was cut")
                self.assertTrue(U.has(p, 11))

    def test_a_late_processing_trade_says_its_cut_man_may_still_be_on_waivers(self):
        """Processing Saturday 22:00, a cut man clears about Sunday 22:00 -- after the 1:00 kickoffs."""
        m = Mini()
        standard(m, US, "us")
        standard(m, THEM, "th", team="CCC")
        code, out, _ = m.run(["--give", "us0", "--get", "th0", "--process-at", "2026-11-14 22:00"])
        self.assertEqual(code, 0, out)
        self.assertIn("⚠ This one processes late: a man it lets go clears about Sun 10:00 PM ET, after some of "
                      "week 10's games kick off.", out)
        code, out, _ = m.run(["--give", "us0", "--get", "th0"])                    # Fri 21:30: clears Sat night
        self.assertEqual(code, 0, out)
        self.assertIn("sits on waivers for 1 day (the league's waiver_clear_days)", out)
        self.assertNotIn("processes late", out)

    def test_the_stream_tries_every_position_not_only_the_top_free_agent(self):
        """The single top FA overall is a QB every week and could never cover a kicker bye."""
        m = Mini()
        m.byes["KBY"] = {13}
        us = standard(m, US, "us")
        m.players[us["K"]]["team"] = "KBY"
        standard(m, THEM, "th", team="CCC")
        m.add("fq", "QB", 24.0, team="DDD", name="Top Free Agent")      # the top FA overall: +4 over our QB
        m.add("fk", "K", 7.0, team="DDD", name="Free Kicker")           # +7 in the bye week
        with m.world() as (data, ctx, sets):
            sim = sets["SLEEPER"]
            side = te.sides_for(ctx, ctx.rosters, (), ())[US]
            _, pick = sim.week(13, side, ctx.universe0)
            self.assertEqual(pick, "fk")
            _, pick = sim.week(12, side, ctx.universe0)
            self.assertEqual(pick, "fq")


class TestRosterFix(unittest.TestCase):
    def test_over_the_cap_never_drops_an_incoming_player(self):
        m = Mini()
        standard(m, US, "us")
        standard(m, THEM, "th", team="CCC")
        m.add("thx", "WR", 0.0, team="CCC", roster=None)       # a free agent nobody wants, for the shape
        code, out, js = m.run(["--give", "us0", "--get", "th0", "--get", "th1"])   # 1 for 2: we are one over
        self.assertEqual(code, 0, out)
        moves = js["sets"]["SLEEPER"]["moves"]["after"][str(US)]
        self.assertEqual(len(moves["drop"]), 1)
        self.assertNotIn(moves["drop"][0], ("th0", "th1"))

    def test_an_ir_player_coming_back_counts_from_his_week_and_forces_a_shed(self):
        m = Mini()
        standard(m, US, "us")
        m.add("ir1", "RB", {w: (0.0 if w < 12 else 18.0) for w in range(10, 18)}, roster=US, ir=True, name="Back Later")
        standard(m, THEM, "th", team="CCC")
        with m.world() as (data, ctx, sets):
            before = te.run_world(sets["SLEEPER"], ctx, ctx.rosters, (), ())
            shed = before["moves"][US]["shed"]
            self.assertEqual([(p, k) for p, k, _ in shed], [("ir1", 12)])
            self.assertNotIn(shed[0][2], ("ir1",))
            # he starts at FLEX from week 12: 18 more than week 11
            self.assertAlmostEqual(before["weekly"][US][12] - before["weekly"][US][11], 18.0, places=6)

    def test_an_over_cap_drop_is_judged_the_way_the_season_is_scored(self):
        """A man let go is a free agent from the week he goes, and we may stream him back. The over-cap drop
        used to be judged as if he vanished, so it kept the wrong body: Cover A matters only in week 13,
        when our stream is free (we stream him back); Cover B in week 14, when the stream must go to a
        free quarterback. Keep B, cut A (review 2026-10-23). Nothing else may fill A's week-13 hole --
        not a free TE, not B (his own bye) -- or the old rule happened to cut A as well."""
        m = Mini(slots=["QB", "RB", "WR", "TE", "FLEX", "K", "BN", "BN", "BN"])
        m.byes.update({"W13": {13}, "B13": {13}, "R14": {14}})
        us = standard(m, US, "us", rb=20.0, bench=1)
        m.players[us["WR"]]["team"] = "W13"
        m.players[us["RB"]]["team"] = "R14"
        m.players[us["QB"]]["team"] = "R14"                            # RB and QB both off in week 14
        m.add("usf", "WR", 25.0, roster=US, name="Our Flex")
        m.add("usa", "WR", 10.0, roster=US, name="Cover A")
        m.add("usb", "RB", 6.0, team="B13", roster=US, name="Cover B")
        standard(m, THEM, "th", team="CCC")
        m.add("fq", "QB", 8.0, team="DDD", name="Free Quarterback")
        code, out, js = m.run(["--give", "us0", "--get", "th0", "--get", "th1"])     # one over the cap
        self.assertEqual(code, 0, out)
        for s in ("THREE SITES", "SLEEPER"):
            self.assertEqual(js["sets"][s]["moves"]["after"][str(US)]["drop"], ["usa"], msg=s)

    def test_an_ir_return_into_an_open_roster_spot_sheds_nobody(self):
        m = Mini()
        standard(m, US, "us", bench=2)                                 # seven bodies: a spot is open
        m.add("ir1", "RB", {w: (0.0 if w < 12 else 18.0) for w in range(10, 18)}, roster=US, ir=True, name="Back Later")
        standard(m, THEM, "th", team="CCC")
        with m.world() as (data, ctx, sets):
            side = te.sides_for(ctx, ctx.rosters, (), ())[US]
            _, moves, _ = sets["SLEEPER"].fix(side, te.Universe(frozenset()))      # nobody to fill it with
            self.assertEqual(moves["shed"], [("ir1", 12, None)])
            self.assertIn("Back Later back from IR in week 12, into an open roster spot", te.moves_text(moves, data.players))

    def test_an_ir_player_is_back_in_three_sites_only_when_two_sites_project_him(self):
        """Sleeper's blank row for an IR player scores 0 and counts as a vote, so one stale site made a
        three-site consensus above 0: the frozen night brought Alec Pierce back in week 8 on CBS's 10.8
        against blanks from Sleeper and ESPN (Sleeper alone: week 11). Review 2026-10-23."""
        m = Mini()
        standard(m, US, "us")
        back = {w: (0.0 if w < 12 else 18.0) for w in range(10, 18)}
        m.add("stale", "WR", back, roster=US, ir=True, name="Stale Line")
        m.add("real", "WR", back, roster=US, ir=True, name="Really Back")
        for w in (10, 11):
            m.raw_stats[(w, "stale")] = m.raw_stats[(w, "real")] = {}
            m.x[(w, "stale")] = {"sleeper": 0.0, "cbs": 30.0, "espn": 0.0, "consensus": 10.0}
            m.x[(w, "real")] = {"sleeper": 0.0, "cbs": 6.0, "espn": 11.0, "consensus": 5.67}
        standard(m, THEM, "th", team="CCC")
        with m.world() as (data, ctx, sets):
            self.assertEqual(sets["THREE SITES"].return_week("stale"), 12)       # one stale site is not a return
            self.assertEqual(sets["THREE SITES"].return_week("real"), 10)        # two sites projecting him are
            self.assertEqual(sets["SLEEPER"].return_week("real"), 12)

    def test_two_incoming_ir_players_for_one_open_slot_seat_the_same_one_every_run(self):
        m = Mini()
        standard(m, US, "us")
        m.add("ourir", "WR", 0.0, roster=US, ir=True, name="Our Hurt One")      # one of our two IR slots taken
        standard(m, THEM, "th", team="CCC")
        m.add("tz", "WR", 0.0, team="CCC", roster=THEM, ir=True, name="Hurt Z")
        m.add("ta", "WR", 0.0, team="CCC", roster=THEM, ir=True, name="Hurt A")
        code, out, js = m.run(["--give", "us0", "--get", "tz", "--get", "ta"])
        self.assertEqual(code, 0, out)
        self.assertEqual(js["sets"]["SLEEPER"]["moves"]["after"][str(US)]["ir_in"], ["ta"])

    def test_a_db_who_plays_wr_is_priced_at_wr_not_zero(self):
        """Sleeper lists Travis Hunter as a DB with fantasy positions [DB, WR], a fullback as FB with
        [RB]. Priced at the raw position he could never start: a 25-point receiver read as 0, so getting
        him for our 15-point WR printed -120 instead of +80 (review 2026-10-23)."""
        m = Mini()
        standard(m, US, "us")
        standard(m, THEM, "th", team="CCC")
        m.add("thdb", "DB", 25.0, team="CCC", roster=THEM, fp=["DB", "WR"], name="Two Way Star")
        m.roster[THEM].remove("th0")
        code, out, js = m.run(["--give", "uswr", "--get", "thdb"])
        self.assertEqual(code, 0, out)
        for s in ("THREE SITES", "SLEEPER"):
            self.assertAlmostEqual(total(js["sets"][s]["delta"][str(US)]), 80.0, places=6, msg=s)

    def test_a_multi_position_free_agent_is_never_streamed(self):
        m = Mini()
        standard(m, US, "us")                                          # FLEX: a zero body, so he would start
        standard(m, THEM, "th", team="CCC")
        m.add("fmp", "RB", 40.0, team="DDD", fp=["RB", "WR"], name="Both Ways")
        with m.world() as (data, ctx, sets):
            self.assertIn("fmp", ctx.multi_excluded)
            before = te.run_world(sets["SLEEPER"], ctx, ctx.rosters, (), ())
            _, streams = sets["SLEEPER"].detail(before["sides"][US], before["universe"][US])
            self.assertNotIn("fmp", streams.values())

    def test_an_incoming_ir_player_takes_an_open_ir_slot_not_a_roster_spot(self):
        m = Mini()
        standard(m, US, "us")
        standard(m, THEM, "th", team="CCC")
        m.add("thir", "WR", 0.0, team="CCC", roster=THEM, ir=True, name="Hurt Receiver")
        code, out, js = m.run(["--give", "us0", "--get", "thir"])
        self.assertEqual(code, 0, out)
        moves = js["sets"]["SLEEPER"]["moves"]["after"][str(US)]
        self.assertEqual(moves["ir_in"], ["thir"])
        self.assertEqual(moves["drop"], [])
        self.assertIn("Hurt Receiver goes straight to IR", out)


# ------------------------------------------------------------------ week locks


class TestLocks(unittest.TestCase):
    def league(self):
        m = Mini()
        m.thursday = {"THU"}
        us = standard(m, US, "us")
        m.players[us["QB"]]["team"] = "THU"                    # our QB played Thursday, in his slot
        m.starters[US] = [us["QB"], us["RB"], us["WR"], us["TE"], "0", us["K"]]
        m.add("ubt", "WR", 30.0, team="THU", roster=US, name="Locked Bencher")     # locked on OUR bench
        m.roster[US].remove("us0")
        th = standard(m, THEM, "th", team="CCC")
        m.add("thq", "QB", 25.0, team="THU", roster=THEM, name="Their Thursday Qb")
        m.roster[THEM].remove("th0")
        m.add("fat", "WR", 50.0, team="THU", name="Locked Free Agent")
        return m, us, th

    def test_a_traded_locked_starter_scores_for_his_old_owner(self):
        m, us, th = self.league()
        with m.world() as (data, ctx, sets):
            sim = sets["SLEEPER"]
            after = te.run_world(sim, ctx, ctx.rosters, [us["QB"]], ["th1"])
            lines, streams = sim.detail(after["sides"][US], after["universe"][US])
            self.assertIn(us["QB"], {p for _, p, _ in lines[10]})
            tl, _ = sim.detail(after["sides"][THEM], after["universe"][THEM])
            self.assertNotIn(us["QB"], {p for _, p, _ in tl[10]})
            self.assertIn(us["QB"], after["sides"][THEM].available(11))      # theirs from week 11

    def test_a_locked_bench_player_and_a_locked_free_agent_never_start_this_week(self):
        m, us, th = self.league()
        with m.world() as (data, ctx, sets):
            sim = sets["SLEEPER"]
            before = te.run_world(sim, ctx, ctx.rosters, (), ())
            lines, streams = sim.detail(before["sides"][US], before["universe"][US])
            self.assertNotIn("ubt", {p for _, p, _ in lines[10]})
            self.assertIn("ubt", {p for _, p, _ in lines[11]})
            self.assertNotEqual(streams[10], "fat")
            self.assertEqual(streams[11], "fat")

    def test_an_incoming_locked_player_scores_nothing_for_us_this_week(self):
        m, us, th = self.league()
        with m.world() as (data, ctx, sets):
            sim = sets["SLEEPER"]
            after = te.run_world(sim, ctx, ctx.rosters, ["us1"], ["thq"])
            lines, _ = sim.detail(after["sides"][US], after["universe"][US])
            self.assertNotIn("thq", {p for _, p, _ in lines[10]})

    def test_blind_on_kickoffs_locks_by_date_and_says_so(self):
        m, us, th = self.league()
        code, out, js = m.run(["--give", us["QB"], "--get", "th1"], kick_fails="ESPN scoreboard: HTTP 503")
        self.assertEqual(code, 0, out)
        self.assertIn("Kickoff times unavailable (ESPN scoreboard: HTTP 503)", out)
        self.assertIn("is locked by then", out)

    def test_blind_with_games_on_the_processing_day_refuses(self):
        """With no kickoff times, a game on the processing day may or may not have started. The blind
        fallback called it unlocked, so a Saturday-night run (processing Sunday night) moved players
        whose games were over (review 2026-10-23)."""
        m, us, th = self.league()
        code, out, _ = m.run(["--give", "us1", "--get", "th1", "--process-at", "2026-11-15 13:00"],
                             kick_fails="ESPN scoreboard: HTTP 503")
        self.assertEqual(code, 2, out)
        self.assertIn("whether they have kicked off by then cannot be known", out)

    def test_blind_before_the_earliest_kickoff_of_a_game_day_still_runs(self):
        m, us, th = self.league()
        code, out, _ = m.run(["--give", "us1", "--get", "th1", "--process-at", "2026-11-15 08:00"],
                             kick_fails="ESPN scoreboard: HTTP 503")
        self.assertEqual(code, 0, out)

    def test_a_team_missing_from_espns_scoreboard_locks_by_date_and_is_named(self):
        m, us, th = self.league()
        n = m.net()
        del n.fx["kickoffs"]["10"]["THU"]
        code, out, _ = run_json(["--give", us["QB"], "--get", "th1"], n)
        self.assertEqual(code, 0, out)
        self.assertIn("ESPN's scoreboard has no kickoff for THU; their games lock by DATE only", out)
        self.assertIn("is locked by then", out)                 # THU played Thursday: still locked

    def test_the_current_week_is_dropped_against_the_processing_instant_not_the_wall_clock(self):
        m, us, th = self.league()
        code, out, js = m.run(["--give", "us1", "--get", "th1", "--process-at", "2026-11-17 09:00"])
        self.assertEqual(code, 0, out)
        self.assertIn("Every week-10 game has kicked off by then, so week 10 is not priced", out)
        self.assertEqual(js["weeks"][0], 11)


# ------------------------------------------------------------------ projections


class FakeData:
    def __init__(self, players, xrows):
        self.players, self.xrows = players, xrows


class TestThreeSites(unittest.TestCase):
    def players(self, specs):
        return {pid: {"full_name": pid, "position": pos} for pid, pos in specs}

    def row(self, s, c, n=3, approx=False):
        return {"sleeper": s, "consensus": c, "n": n, "approx": approx}

    def test_ratio_is_a_ratio_of_sums_and_ignores_rows_under_the_floor_or_short_of_three_sites(self):
        P = self.players([("a", "WR"), ("b", "WR"), ("c", "WR")])
        x = {7: {"a": self.row(5.0, 6.0), "b": self.row(4.9, 9.0), "c": self.row(10.0, 12.0, n=2)},
             8: {"a": self.row(10.0, 9.0), "b": self.row(10.0, 11.0), "c": self.row(10.0, 12.0)}}
        s_pts = {w: {p: 10.0 for p in P} for w in (7, 8, 9)}
        _, info = te.three_sites(FakeData(P, x), s_pts, [7, 8, 9])
        self.assertAlmostEqual(info["ratio"]["a"][0], 15.0 / 15.0)        # not the mean of 1.2 and 0.9
        self.assertAlmostEqual(info["ratio"]["b"][0], 11.0 / 10.0)        # week 7 (Sleeper 4.9) ignored
        self.assertAlmostEqual(info["ratio"]["c"][0], 12.0 / 10.0)        # week 7 (n = 2) ignored

    def test_clean_weeks_use_the_consensus_itself_and_k_def_and_approx_rows_never_move(self):
        P = self.players([("a", "WR"), ("k", "K"), ("x", "WR")])
        x = {7: {"a": self.row(10.0, 11.0), "k": self.row(8.0, 11.2, approx=True), "x": self.row(10.0, 14.0, approx=True)},
             8: {"a": self.row(10.0, 12.0), "k": self.row(8.0, 11.2, approx=True), "x": self.row(10.0, 14.0, approx=True)}}
        s_pts = {w: {"a": 10.0, "k": 8.0, "x": 10.0} for w in (7, 8, 9)}
        pts, info = te.three_sites(FakeData(P, x), s_pts, [7, 8, 9])
        self.assertEqual((pts[7]["a"], pts[8]["a"]), (11.0, 12.0))
        for w in (7, 8, 9):
            self.assertEqual(pts[w]["k"], 8.0)
            self.assertEqual(pts[w]["x"], 10.0)

    def test_a_kicker_or_defense_is_never_adjusted_even_on_a_row_not_flagged_approx(self):
        """Two guards keep K/DEF out of the three-site scaling: x.load's approx flag, and position.
        The second is the one that holds if a source ever stops flagging its kicker column."""
        P = self.players([("k", "K"), ("d", "DEF")] + [(f"k{i}", "K") for i in range(10)])
        x = {w: {p: self.row(8.0, 11.0) for p in P} for w in (7, 8)}
        pts, info = te.three_sites(FakeData(P, x), {w: {p: 8.0 for p in P} for w in (7, 8, 9)}, [7, 8, 9])
        for w in (7, 8, 9):
            self.assertEqual(pts[w]["k"], 8.0)
            self.assertEqual(pts[w]["d"], 8.0)
        self.assertNotIn("k", info["ratio"])

    def test_the_ratio_is_shrunk_by_how_well_it_persists_and_clamped(self):
        """WRs whose week-7 and week-8 ratios move together (r = 1) carry the ratio forward in full,
        clamped; TEs whose ratios are unrelated week to week carry none of it (r <= 0)."""
        specs = [(f"w{i}", "WR") for i in range(12)] + [(f"t{i}", "TE") for i in range(12)]
        P = self.players(specs)
        x = {7: {}, 8: {}}
        for i in range(12):
            r = 0.85 + 0.03 * i                                     # 0.85 .. 1.18, the same both weeks
            x[7][f"w{i}"] = self.row(10.0, 10.0 * r)
            x[8][f"w{i}"] = self.row(10.0, 10.0 * r)
            x[7][f"t{i}"] = self.row(10.0, 10.0 * (0.85 + 0.03 * i))
            x[8][f"t{i}"] = self.row(10.0, 10.0 * (1.18 - 0.03 * i))   # perfectly reversed: r = -1
        x[7]["w11"] = self.row(10.0, 14.0)
        x[8]["w11"] = self.row(10.0, 14.0)                         # 1.40 -> clamped to 1.25
        s_pts = {w: {p: 10.0 for p in P} for w in (7, 8, 9)}
        pts, info = te.three_sites(FakeData(P, x), s_pts, [7, 8, 9])
        self.assertGreater(info["r_pos"]["WR"][0], 0.99)
        self.assertLessEqual(info["r_pos"]["TE"][0], 0.0)
        self.assertAlmostEqual(pts[9]["w0"], 8.5, places=6)
        self.assertAlmostEqual(pts[9]["w11"], 12.5, places=6)      # 1.40 raw, held to 1.25
        self.assertEqual(info["ratio"]["w11"], (1.4, 1.25))
        self.assertAlmostEqual(pts[9]["t0"], 10.0, places=6)       # a TE's gap is noise here: no carry

    def test_too_few_pairs_means_no_carry(self):
        """Five WRs whose ratios move together exactly (r would be 1): five pairs are under MIN_PAIRS, so
        none of it carries. The first version gave all five ONE ratio, statistics.correlation refuses
        constant input, and the test passed with the guard deleted (review 2026-10-23)."""
        P = self.players([(f"w{i}", "WR") for i in range(5)])
        x = {w: {f"w{i}": self.row(10.0, 10.0 * (0.9 + 0.08 * i)) for i in range(5)} for w in (7, 8)}
        pts, info = te.three_sites(FakeData(P, x), {w: {p: 10.0 for p in P} for w in (7, 8, 9)}, [7, 8, 9])
        self.assertEqual(info["r_pos"]["WR"], (0.0, 5))
        self.assertAlmostEqual(pts[9]["w4"], 10.0)

    def test_a_one_week_ratio_carries_r_and_a_two_week_one_2r_over_1_plus_r(self):
        """A mean of k weeks persists k*r/(1+(k-1)*r). A player usable in one clean week only got the
        two-week carry -- 28 rostered players on the frozen night (review 2026-10-23)."""
        P = self.players([(f"w{i}", "WR") for i in range(12)] + [("solo", "WR"), ("both", "WR")])
        x = {7: {}, 8: {}}
        for i in range(12):
            a = 0.85 + 0.03 * i
            x[7][f"w{i}"] = self.row(10.0, 10.0 * a)
            x[8][f"w{i}"] = self.row(10.0, 10.0 * (a + (0.05 if i % 2 else -0.05)))
        x[7]["solo"], x[8]["solo"] = self.row(10.0, 12.0), self.row(10.0, 12.0, n=2)    # usable in week 7 only
        x[7]["both"], x[8]["both"] = self.row(10.0, 12.0), self.row(10.0, 12.0)
        pts, info = te.three_sites(FakeData(P, x), {w: {p: 10.0 for p in P} for w in (7, 8, 9)}, [7, 8, 9])
        r = info["r_pos"]["WR"][0]
        self.assertTrue(0.3 < r < 0.99, r)
        self.assertAlmostEqual(pts[9]["solo"], 10.0 * (1 + r * 0.2), places=9)
        self.assertAlmostEqual(pts[9]["both"], 10.0 * (1 + 2 * r / (1 + r) * 0.2), places=9)


class TestKicking(unittest.TestCase):
    def test_a_kicking_key_the_league_cannot_score_refuses(self):
        m = Mini()
        standard(m, US, "us")
        standard(m, THEM, "th", team="CCC")
        m.extra_scoring = {"fgm_50_59": 5.0, "fgm_60p": 6.0, "fgmiss": -1.0}
        m.raw_stats[(11, "usk")] = {"fgm_50p": 0.4, "fgm_60_69": 0.1}
        code, out, js = m.run(["--give", "us0", "--get", "th0"])
        self.assertEqual(code, 2)
        self.assertIn("REFUSED", out)
        self.assertIn("fgm_60_69", out)


# ------------------------------------------------------------------ identity and the counterparty


class TestIdentity(unittest.TestCase):
    P = {"1": {"full_name": "A.J. Brown", "position": "WR", "team": "NE"},
         "2": {"full_name": "Chase Brown", "position": "RB", "team": "CIN"},
         "3": {"full_name": "Kenneth Walker III", "position": "RB", "team": "SEA"},
         "4": {"full_name": "Kenneth Walker", "position": "WR", "team": "FA"},          # NOT rostered
         "HOU": {"full_name": None, "first_name": "Houston", "last_name": "Texans", "position": "DEF", "team": "HOU"}}
    ROSTERED = {"1", "2", "3", "HOU"}

    def test_exact_names_ids_and_team_codes_resolve(self):
        r = lambda t: te.resolve(t, self.ROSTERED, self.P)  # noqa: E731
        self.assertEqual(r("A.J. Brown"), "1")
        self.assertEqual(r("AJ Brown"), "1")
        self.assertEqual(r("2"), "2")
        self.assertEqual(r("hou"), "HOU")
        self.assertEqual(r("Houston Texans"), "HOU")
        self.assertEqual(r("Kenneth Walker"), "3")      # unique among rostered players; the whole list has two

    def test_a_shared_token_is_a_candidate_never_an_answer(self):
        with self.assertRaises(g.Refuse) as cm:
            te.resolve("Brown", self.ROSTERED, self.P)
        msg = str(cm.exception)
        self.assertIn("A.J. Brown [1]", msg)
        self.assertIn("Chase Brown [2]", msg)

    def test_two_rostered_players_under_one_exact_name_refuse(self):
        with self.assertRaises(g.Refuse) as cm:
            te.resolve("Kenneth Walker", self.ROSTERED | {"4"}, self.P)
        msg = str(cm.exception)
        self.assertIn("matches more than one rostered player", msg)
        self.assertIn("[3]", msg)
        self.assertIn("[4]", msg)

    def test_a_lone_shared_token_still_refuses(self):
        """Exactly one candidate is not proof of identity (insight 010): 'Walker' narrows to one
        rostered player, and he is offered, not chosen."""
        with self.assertRaises(g.Refuse) as cm:
            te.resolve("Walker", self.ROSTERED, self.P)
        self.assertIn("Kenneth Walker III [3]", str(cm.exception))


class TestRefusalsThroughMain(unittest.TestCase):
    def league(self, **kw):
        m = Mini(**kw)
        standard(m, US, "us")
        standard(m, THEM, "th", team="CCC")
        standard(m, OTHER, "ot", team="EEE")
        return m

    def test_gets_from_two_rosters_refuse(self):
        code, out, _ = self.league().run(["--give", "us0", "--get", "th0", "--get", "ot0"])
        self.assertEqual(code, 2)
        self.assertIn("every --get must be on ONE roster", out)

    def test_a_give_that_is_not_ours_refuses(self):
        code, out, _ = self.league().run(["--give", "th1", "--get", "th0"])
        self.assertEqual(code, 2)
        self.assertIn("--give must be our players", out)

    def test_searching_our_own_roster_refuses(self):
        code, out, _ = self.league().run(["--search", "--team", "3", "--give", "us0"])
        self.assertEqual(code, 2)
        self.assertIn("is OUR roster", out)

    def test_an_unknown_slot_refuses(self):
        m = self.league(slots=["QB", "RB", "WR", "TE", "SUPER_FLEX", "K", "BN", "BN"])
        code, out, _ = m.run(["--give", "us0", "--get", "th0"])
        self.assertEqual(code, 2)
        self.assertIn("SUPER_FLEX", out)

    def test_past_the_deadline_refuses(self):
        code, out, _ = self.league(week=12, deadline=11).run(["--give", "us0", "--get", "th0"])
        self.assertEqual(code, 2)
        self.assertIn("the trade deadline has passed", out)

    def test_the_deadline_week_runs_and_says_it_is_unverified(self):
        code, out, _ = self.league(week=11, deadline=11).run(["--give", "us0", "--get", "th0"],
                                                              now=NOW + datetime.timedelta(weeks=1))
        self.assertEqual(code, 0, out)
        self.assertIn("This is the trade deadline week", out)

    def test_the_deadline_is_judged_by_the_week_the_trade_processes(self):
        m = self.league(week=11, deadline=11)
        code, out, _ = m.run(["--give", "us0", "--get", "th0", "--process-at", "2026-11-24 09:00"],
                             now=NOW + datetime.timedelta(weeks=1))
        self.assertEqual(code, 2)
        self.assertIn("processes in week 12", out)

    def test_an_empty_projection_week_refuses(self):
        m = self.league()
        n = m.net()
        n.fx["projections"]["13"] = []
        code, out, _ = run_json(["--give", "us0", "--get", "th0"], n)
        self.assertEqual(code, 2)
        self.assertIn("week 13: Sleeper returned no projections", out)

    def test_getting_one_of_our_own_players_refuses(self):
        code, out, _ = self.league().run(["--give", "us0", "--get", "uswr"])
        self.assertEqual(code, 2)
        self.assertIn("every --get must be on ONE roster that is not ours", out)

    def test_a_player_named_twice_refuses(self):
        """The lists collapse to sets downstream, so a player given by id and by name quietly priced a
        smaller trade than the one typed (review 2026-10-23)."""
        code, out, _ = self.league().run(["--give", "us0", "--get", "thwr", "--get", "Th Wr"])
        self.assertEqual(code, 2)
        self.assertIn("--get names Th WR more than once ('thwr' and 'Th Wr')", out)

    def test_top_below_one_refuses(self):
        code, out, _ = self.league().run(["--search", "--team", "Rival", "--give", "us0", "--top", "0"])
        self.assertEqual(code, 2)
        self.assertIn("--top 0: show at least one package", out)

    def test_a_process_at_in_the_past_refuses(self):
        code, out, _ = self.league().run(["--give", "us0", "--get", "th0", "--process-at", "2026-11-11 12:00"])
        self.assertEqual(code, 2)
        self.assertIn("is in the past", out)

    def test_a_process_at_on_next_weeks_first_game_day_or_later_refuses(self):
        """Any later instant used to be priced as if it fell next week: the deadline went unchecked and
        nothing was locked (review 2026-10-23: the frozen night ran clean at a week-12 date)."""
        code, out, _ = self.league().run(["--give", "us0", "--get", "th0", "--process-at", "2026-11-22 12:00"])
        self.assertEqual(code, 2)
        self.assertIn("on or after week 11's first game day", out)
        code, out, _ = run_json(KAEPERNI + ["--process-at", "2026-11-27 12:00"])         # the frozen night
        self.assertEqual(code, 2, out)
        self.assertIn("on or after week 8's first game day", out)

    def test_no_week_left_to_price_refuses(self):
        m = self.league(week=17, deadline=99)
        code, out, _ = m.run(["--give", "us0", "--get", "th0", "--process-at", "2027-01-04 09:00"],
                             now=NOW + datetime.timedelta(weeks=7))
        self.assertEqual(code, 2, out)
        self.assertIn("no week is left to price", out)

    def test_a_multi_position_player_on_either_roster_refuses(self):
        m = self.league()
        m.add("thmp", "RB", 10.0, team="CCC", roster=THEM, fp=["RB", "WR"], name="Swiss Army")
        m.roster[THEM].remove("th2")
        code, out, _ = m.run(["--give", "us0", "--get", "th0"])
        self.assertEqual(code, 2)
        self.assertIn("multi-position players are not modelled", out)

    def test_a_playoff_format_it_cannot_model_refuses(self):
        n = self.league().net()
        n.fx["league"]["settings"]["playoff_round_type"] = 1
        code, out, _ = run_json(["--give", "us0", "--get", "th0"], n)
        self.assertEqual(code, 2)
        self.assertIn("playoff_round_type 1 is not modelled", out)

    def test_a_projection_week_that_is_not_a_list_refuses(self):
        n = self.league().net()
        n.fx["projections"]["12"] = {"error": "rate limited"}
        code, out, _ = run_json(["--give", "us0", "--get", "th0"], n)
        self.assertEqual(code, 2)
        self.assertIn("week 12 projections are dict, expected a list", out)

    def test_no_roster_of_ours_refuses(self):
        n = self.league().net()
        for r in n.fx["rosters"]:
            if r["owner_id"] == g.BRIGGSY_USER_ID:
                r["owner_id"] = "someone else"
        code, out, _ = run_json(["--give", "us0", "--get", "th0"], n)
        self.assertEqual(code, 2)
        self.assertIn("no roster belongs to PoppaBriggsy", out)

    def test_projection_rows_that_lost_their_opponents_refuse(self):
        """A bye is read off a DEF row's missing opponent. Rows that lost the field made every team look
        on bye and left nobody to count as zero, so a broken week printed (review 2026-10-23)."""
        n = self.league().net()
        for r in n.fx["projections"]["13"]:
            r["opponent"] = None
        code, out, _ = run_json(["--give", "us0", "--get", "th0"], n)
        self.assertEqual(code, 2)
        self.assertIn("week 13:", out)
        self.assertIn("show no opponent -- that is a broken pull", out)

    def test_a_dropped_connection_refuses_instead_of_a_traceback(self):
        n = self.league().net(fetch_fails=ConnectionResetError("connection reset by peer"))
        code, out, _ = run_json(["--give", "us0", "--get", "th0"], n)
        self.assertEqual(code, 2)
        self.assertIn("the Sleeper pull failed: ConnectionResetError: connection reset by peer", out)

    def test_a_refused_run_never_leaves_an_earlier_runs_numbers_in_the_json(self):
        m = self.league()
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "out.json")
            net.run(["--give", "us0", "--get", "th0", "--json", path], m.net())
            with open(path, encoding="utf-8") as fh:
                self.assertIn("sets", json.load(fh))
            code, _ = net.run(["--give", "us0", "--get", "th0", "--get", "ot0", "--json", path], m.net())
            self.assertEqual(code, 2)
            with open(path, encoding="utf-8") as fh:
                self.assertEqual(list(json.load(fh)), ["refused"])

    def test_half_the_league_at_zero_refuses(self):
        m = self.league()
        n = m.net()
        for r in n.fx["projections"]["14"]:
            if r["player_id"] in n.fx["players"]:
                r["stats"] = {}
        code, out, _ = run_json(["--give", "us0", "--get", "th0"], n)
        self.assertEqual(code, 2)
        self.assertIn("that is a broken pull", out)


# ------------------------------------------------------------------ the report


class TestReport(unittest.TestCase):
    def league(self):
        m = Mini()
        standard(m, US, "us")
        standard(m, THEM, "th", team="CCC")
        m.add("thw", "WR", 16.0, team="CCC", roster=THEM, name="Their Star")
        m.roster[THEM].remove("th0")
        return m

    def test_sleeper_only_says_so_first_and_never_fakes_a_second_set(self):
        code, out, js = self.league().run(["--give", "uswr", "--get", "thw"], xload_fails="CBS: HTTP 503")
        self.assertEqual(code, 0, out)
        self.assertIn("SLEEPER ONLY tonight", out.splitlines()[1])
        self.assertNotIn("three sites", out.split("WEEK BY WEEK")[1].split("HOW MUCH")[0])
        self.assertIn("No second projection set tonight; disagreement not measured.", out)
        self.assertEqual(list(js["sets"]), ["SLEEPER"])

    def test_any_failure_in_cbs_or_espn_falls_back_to_sleeper_only(self):
        """Not only a refusal: an empty crosswalk raises IndexError and an HTML page a JSONDecodeError,
        and either used to end the run in a traceback (review 2026-10-23)."""
        code, out, js = self.league().run(["--give", "uswr", "--get", "thw"], xload_fails=IndexError("list index out of range"))
        self.assertEqual(code, 0, out)
        self.assertIn("SLEEPER ONLY tonight: the CBS + ESPN pull refused (IndexError: list index out of range)", out)
        self.assertEqual(list(js["sets"]), ["SLEEPER"])

    def test_next_weeks_pull_failing_leaves_three_sites_on_this_week_alone(self):
        code, out, js = self.league().run(["--give", "uswr", "--get", "thw"], next_fails=KeyError("cbs"))
        self.assertEqual(code, 0, out)
        self.assertIn("Next week's CBS + ESPN pull refused (KeyError: 'cbs'); three sites cover this week only.", out)
        self.assertEqual(js["three_site_weeks"], [10])

    def test_this_week_played_and_next_week_refused_is_sleeper_only_not_a_copy_of_it(self):
        """No priced week had a three-site line and no ratio carried, so the 'three sites' column was
        Sleeper's to the decimal, under 'the two sets differ by 0.0' (review 2026-10-23)."""
        code, out, js = self.league().run(["--give", "uswr", "--get", "thw", "--process-at", "2026-11-17 09:00"],
                                          next_fails="CBS: HTTP 503")
        self.assertEqual(code, 0, out)
        self.assertIn("SLEEPER ONLY", out.splitlines()[1])
        self.assertIn("No second projection set tonight; disagreement not measured.", out)
        self.assertEqual(list(js["sets"]), ["SLEEPER"])

    def test_a_player_no_nfl_team_carries_is_never_listed_on_bye(self):
        """A numeric id, as Sleeper's are: a letters-only id reads as a DEF's team code, which gave
        the first version of this test a team and walked it past the guard (review 2026-10-23)."""
        m = self.league()
        m.add("90210", "WR", 16.0, team="CCC", roster=THEM, name="Released Vet")
        m.roster[THEM].remove("th1")
        n = m.net()
        n.fx["players"]["90210"]["team"] = None                     # after build: the builder sorts teams
        code, out, _ = run_json(["--give", "uswr", "--get", "90210"], n)
        self.assertEqual(code, 0, out)
        self.assertIn("Released Vet (WR FA)", out)
        self.assertNotIn("Released Vet wk", out)

    def test_the_sets_disagree_only_when_both_are_past_a_tie(self):
        self.assertFalse(te.opposite(0.0, 0.1))
        self.assertFalse(te.opposite(-9.0, 0.0))
        self.assertTrue(te.opposite(0.1, -0.1))
        self.assertTrue(te.opposite(-3.0, 2.0))

    def test_assumptions_and_the_sign_line_print_before_any_number(self):
        m = self.league()
        m.x[(10, "thw")] = {"consensus": 2.0}                 # three sites hate him this week, Sleeper loves him
        m.x[(11, "thw")] = {"consensus": 2.0}
        code, out, js = m.run(["--give", "uswr", "--get", "thw"])
        self.assertEqual(code, 0, out)
        table = out.index("WEEK BY WEEK")
        for line in ("What these numbers assume", "counts Sleeper as one of its three votes",
                     "THE TWO PROJECTION SETS DISAGREE ON WHETHER WE GAIN OR LOSE"):
            self.assertIn(line, out)
            self.assertLess(out.index(line), table, line)

    def test_a_traded_player_with_no_usable_ratio_is_named(self):
        m = self.league()
        m.x[(10, "thw")] = {"n": 2}
        m.x[(11, "thw")] = {"n": 2}
        code, out, _ = m.run(["--give", "uswr", "--get", "thw"])
        self.assertIn("Their Star: no usable three-site projection", out)

    def test_a_player_projecting_zero_all_season_is_flagged_above_the_table(self):
        m = self.league()
        m.add("dead", "WR", 0.0, team="CCC", roster=THEM, name="Out For Year")
        m.roster[THEM].remove("th1")
        code, out, _ = m.run(["--give", "us0", "--get", "dead"])
        self.assertLess(out.index("🚨 Out For Year projects zero all season"), out.index("WEEK BY WEEK"))

    def test_the_weekly_swing_is_measured_not_a_constant(self):
        code, out, _ = self.league().run(["--give", "uswr", "--get", "thw"])
        # Mini scores us 110, 120, ... 190 in weeks 1-9: a sample standard deviation of 27.4
        self.assertIn("our weekly score has swung by about ±27 points this season (9 weeks played)", out)


class TestSearch(unittest.TestCase):
    """A two-sided market: we are deep at RB and thin at WR, they are the mirror image, so packages
    trade "good for us" against "good for them" -- the first version of this test used a league where
    every kept package scored the same, and the ranking mutant sailed through it (insight 008: measure
    a known positive first)."""

    def league(self):
        m = Mini()
        standard(m, US, "us", rb=18.0, wr=8.0, bench=1)
        m.add("usr2", "RB", 17.0, roster=US, name="Our Second Back")
        m.add("usr3", "RB", 16.0, roster=US, name="Our Third Back")
        standard(m, THEM, "th", team="CCC", rb=8.0, wr=18.0, bench=1)
        m.add("thw2", "WR", 17.0, team="CCC", roster=THEM, name="Their Second Wideout")
        m.add("thw3", "WR", 16.0, team="CCC", roster=THEM, name="Their Third Wideout")
        return m

    def test_ranked_by_our_gain_among_packages_they_do_not_lose_with_moves_and_flips(self):
        m = self.league()
        code, out, js = m.run(["--search", "--team", "Rival", "--give", "uswr", "--top", "500"])
        self.assertEqual(code, 0, out)
        pk = js["packages"]
        self.assertEqual(len(pk), (1 + 7) * (8 + 28))           # anchor (+ one more of ours) x 1-2 of theirs
        kept = [p for p in pk if p["sets"]["THREE SITES"]["them"] >= 0]
        self.assertTrue(any(p["sets"]["THREE SITES"]["us"] > 0 and p["sets"]["THREE SITES"]["them"] == 0 for p in kept)
                        and any(p["sets"]["THREE SITES"]["them"] > 0 for p in kept), "the market must be two-sided")
        ranked = out.split("RANKED BY")[1].split("BEST FOR US")[0]
        shown = [float(l.split("three sites: us ")[1].split(",")[0]) for l in ranked.splitlines() if "three sites: us" in l]
        self.assertEqual(len(shown), len(kept))
        self.assertEqual(shown, sorted(shown, reverse=True), "the ranking is by OUR gain, nothing else")
        self.assertEqual(shown, [round(v, 1) for v in sorted((p["sets"]["THREE SITES"]["us"] for p in kept), reverse=True)])
        self.assertIn("moves: we ", out)
        self.assertIn(f"Evaluated {len(pk)} packages; kept {len(kept)}", out)
        self.assertIn("change sign for us between the two projection sets", out)

    def test_the_memos_are_emptied_for_each_give_and_no_number_moves(self):
        """--search kept every lineup it ever solved: 3.9M entries and a 9.6 GB peak on the frozen
        night. They are emptied for each give, which must change no number (review 2026-10-23)."""
        cleared = []

        class Counting(dict):
            def clear(self):
                cleared.append(len(self))
                super().clear()

        class Keeping(dict):
            def clear(self):
                pass

        runs = {}
        for name, memo in (("cleared", Counting), ("kept", Keeping)):
            with self.league().world() as (data, ctx, sets):
                for sim in sets.values():
                    sim._fills, sim._cands = memo(), memo()
                res = te.search(data, ctx, sets, None, ["uswr"], 5)
                runs[name] = [(r["give"], r["get"], {s: (v["us"], v["them"]) for s, v in r["sets"].items()})
                              for r in res["rows"]]
        self.assertEqual(len(cleared), 2 * 2 * (1 + 7))          # 2 memos x 2 sets x (the anchor + 7 more gives)
        self.assertGreater(max(cleared), 0)
        self.assertEqual(runs["cleared"], runs["kept"])

    def test_a_package_they_lose_on_is_never_in_the_ranking(self):
        m = self.league()
        code, out, js = m.run(["--search", "--team", "Rival", "--give", "uswr", "--top", "500"])
        lost = [p for p in js["packages"] if p["sets"]["THREE SITES"]["them"] < 0]
        self.assertTrue(lost)
        ranked = out.split("RANKED BY")[1].split("BEST FOR US")[0]
        self.assertEqual(ranked.count("   give ") + ranked.count(". give "), len(js["packages"]) - len(lost))


if __name__ == "__main__":
    unittest.main()

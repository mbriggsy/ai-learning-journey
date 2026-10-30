#!/usr/bin/env python3
"""Tests for scripts/gameday_check.py -- the game-day lineup check.

    python -m unittest tests.test_gameday_check -v        (from the project root)

No network. `assess()` and `projected_total()` are pure and take every input as an argument; the
fixtures here are hand-built rosters small enough to reason about by eye. The negative controls
are the point: a check whose only failure mode is silence must be proven to fire, AND proven to
stay quiet on a lineup that is already right (a 🚨 that cries wolf every Sunday gets ignored by
week 3 -- docs/insights/009).
"""
import contextlib
import datetime
import http.client
import io
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
import gameday_check as g  # noqa: E402

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")

TODAY = datetime.date(2026, 9, 13)          # a Sunday morning
SUN, THU = "2026-09-13", "2026-09-10"
SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF", "BN", "BN"]
SCORING = {"rec": 1.0, "rec_yd": 0.1, "rush_yd": 0.1, "pass_yd": 0.04}


def player(pid, name, pos, team="XXX", tag=None, part=None):
    return pid, {"full_name": name, "position": pos, "team": team, "injury_status": tag, "injury_body_part": part}


def projection(points, date=SUN, opp="OPP"):
    # rec_yd at 0.1/yd -> `points` exactly
    return {"stats": {"rec_yd": points * 10}, "date": date, "opponent": opp}


def fixture(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return json.load(f)


def espn_event(state, completed=False, period=0, clock=0.0, teams=("AAA", "BBB"), date="2026-09-13T17:00Z"):
    return {"date": date, "competitions": [{
        "status": {"clock": clock, "period": period, "type": {"name": "X", "state": state, "completed": completed}},
        "competitors": [{"team": {"abbreviation": t}} for t in teams]}]}


def espn_board(*events, byes=(), week=None):
    w = {"teamsOnBye": [{"abbreviation": t} for t in byes]}
    if week is not None:
        w["number"] = week
    return {"week": w, "events": list(events)}


class FakeResponse:
    """What urlopen returns: a context manager with a status and a body."""

    def __init__(self, body, status=200):
        self.body, self.status = body, status

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return self.body


class Fixture:
    """A ten-slot lineup plus two bench bodies, every starter healthy and projecting 10."""

    def __init__(self):
        ids = ["qb", "rb1", "rb2", "wr1", "wr2", "te", "fx1", "fx2", "k", "def", "bn_wr", "bn_rb"]
        poses = ["QB", "RB", "RB", "WR", "WR", "TE", "WR", "RB", "K", "DEF", "WR", "RB"]
        self.players = dict(player(i, i.upper(), p) for i, p in zip(ids, poses))
        self.proj = {i: projection(10.0) for i in ids}
        self.proj["bn_wr"] = projection(8.0)
        self.proj["bn_rb"] = projection(8.0)
        self.our = {"roster_id": 3, "starters": ids[:10], "players": ids, "reserve": []}
        self.opp = {"roster_id": 1, "starters": ["o" + s for s in ids[:10]], "players": ["o" + s for s in ids[:10]], "reserve": []}
        for s, p in zip(ids[:10], poses[:10]):
            self.players["o" + s] = {"full_name": "O" + s.upper(), "position": p, "team": "OPP", "injury_status": None}
            self.proj["o" + s] = projection(10.0, opp="XXX")       # XXX plays OPP, as a real row would say

    def rows(self):
        return g.assess(self.our, self.opp, self.players, self.proj, SCORING, SLOTS, TODAY)

    def icons(self):
        return [r[0] for r in self.rows()]


class TestSilenceIsEarned(unittest.TestCase):
    def test_healthy_optimal_lineup_says_nothing(self):
        self.assertEqual(Fixture().rows(), [])

    def test_bench_body_under_the_margin_is_not_churn(self):
        f = Fixture()
        f.proj["bn_wr"] = projection(11.9)          # +1.9 over a 10.0 starter: under SWAP_MARGIN
        self.assertEqual(f.rows(), [])

    def test_questionable_on_the_bench_under_the_margin_is_still_silence(self):
        f = Fixture()
        f.players["bn_wr"]["injury_status"] = "Questionable"       # 8.0 vs a 10.0 starter: no edge to report
        self.assertEqual(f.rows(), [])

    def test_questionable_on_the_bench_over_the_margin_fires_with_the_tag_on_his_name(self):
        """Week 2, 2026: Flowers (Questionable, 14.0) behind Swift (Questionable, 11.6) and the ↑
        line said nothing, while the ⚠ line was naming Flowers as the fallback. Questionable is
        printed, never filtered -- the same rule on every line."""
        f = Fixture()
        f.players["bn_wr"]["injury_status"] = "Questionable"
        f.players["bn_wr"]["injury_body_part"] = "Hamstring"
        f.proj["bn_wr"] = projection(13.0)
        rows = f.rows()
        self.assertEqual([r[0] for r in rows], ["↑"])
        self.assertIn("BN_WR over", rows[0][1])
        self.assertIn("[Questionable: Hamstring]", rows[0][2])

    def test_a_starter_who_already_played_is_left_alone(self):
        f = Fixture()
        f.players["fx2"]["injury_status"] = "Out"     # tagged AFTER his Thursday game
        f.proj["fx2"] = projection(10.0, date=THU)
        self.assertEqual(f.rows(), [])


class TestTheSirenFires(unittest.TestCase):
    def test_out_starter_names_the_best_eligible_untagged_sub(self):
        f = Fixture()
        f.players["wr1"]["injury_status"] = "Out"
        f.players["wr1"]["injury_body_part"] = "Hamstring"
        f.proj["bn_wr"] = projection(9.0)
        rows = f.rows()
        self.assertEqual([r[0] for r in rows], ["🚨"])
        self.assertIn("WR1", rows[0][1])
        self.assertIn("Start instead: BN_WR", rows[0][2])
        self.assertIn("[Out: Hamstring]", rows[0][2])

    def test_out_rb_does_not_get_a_wr_sub(self):
        f = Fixture()
        f.players["rb1"]["injury_status"] = "Doubtful"
        f.players.pop("bn_rb"); f.our["players"].remove("bn_rb")
        rows = f.rows()
        self.assertEqual(len(rows), 1)
        self.assertIn("No bench body who is playing is eligible for RB", rows[0][2])

    def test_flex_sub_may_be_any_of_rb_wr_te(self):
        f = Fixture()
        f.players["fx1"]["injury_status"] = "Out"
        f.proj["bn_rb"] = projection(9.5)
        f.proj["bn_wr"] = projection(9.0)
        rows = f.rows()
        self.assertIn("Start instead: BN_RB", rows[0][2])

    def test_a_sub_is_claimed_once(self):
        f = Fixture()
        f.players["wr1"]["injury_status"] = "Out"
        f.players["wr2"]["injury_status"] = "Out"
        rows = f.rows()
        subs = [r[2].split("Start instead: ")[1].split(" ")[0] for r in rows if "Start instead" in r[2]]
        self.assertEqual(len(rows), 2)
        self.assertEqual(len(subs), 1, "only one bench WR exists; it must not be handed to both slots")

    def test_tagged_sub_is_never_offered(self):
        f = Fixture()
        f.players["wr1"]["injury_status"] = "Out"
        f.players["bn_wr"]["injury_status"] = "Out"
        rows = f.rows()
        self.assertIn("No bench body who is playing", rows[0][2])

    def test_an_out_starter_with_no_projection_is_not_called_a_bye(self):
        """Week 2, 2026: Sleeper deleted the projection rows for three Out WRs and the check
        printed "(no game this week)" for each, as if on bye. The action was right, the reason
        was wrong -- and a wrong reason teaches the reader to distrust the right action."""
        f = Fixture()
        f.players["wr1"]["injury_status"] = "Out"
        del f.proj["wr1"]
        rows = f.rows()
        self.assertEqual(rows[0][0], "🚨")
        self.assertIn("tagged Out", rows[0][2])
        self.assertIn("no projection", rows[0][2])
        self.assertNotIn("no game this week", rows[0][2])

    def test_empty_slot_is_a_siren(self):
        f = Fixture()
        f.our["starters"][8] = "0"
        rows = f.rows()
        self.assertEqual(rows[0][0], "🚨")
        self.assertIn("EMPTY SLOT — K", rows[0][1])

    def test_bye_week_starter_is_a_siren(self):
        f = Fixture()
        f.proj.pop("te")                                # no projection = no game
        rows = f.rows()
        self.assertEqual(rows[0][0], "🚨")
        self.assertIn("NO GAME", rows[0][2])

    def test_questionable_starter_is_a_warning_with_a_fallback_not_an_order(self):
        f = Fixture()
        f.players["wr2"]["injury_status"] = "Questionable"
        rows = f.rows()
        self.assertEqual([r[0] for r in rows], ["⚠"])
        self.assertIn("If he is scratched: BN_WR", rows[0][2])
        self.assertNotIn("Start instead", rows[0][2])

    def test_bench_beating_a_starter_by_the_margin_fires_once_at_the_best_slot(self):
        f = Fixture()
        f.proj["bn_rb"] = projection(13.0)
        f.proj["fx2"] = projection(9.0)                 # RB in FLEX2: gain 4.0, the best slot
        rows = f.rows()
        self.assertEqual([r[0] for r in rows], ["↑"])
        self.assertIn("BN_RB over FX2 (FLEX)", rows[0][1])
        self.assertIn("4.0 more", rows[0][2])

    def test_two_bench_bodies_never_name_the_same_starter(self):
        """Week 4, 2026: Collins (18.6) and Flowers (17.5) were both sent to Stevenson's FLEX
        (12.4); Wilson (14.6, WR) -- where the second one belonged -- was never named."""
        f = Fixture()
        f.players["bn_rb"]["position"] = "WR"
        f.proj["bn_wr"] = projection(17.5)              # listed FIRST on the roster, but weaker
        f.proj["bn_rb"] = projection(18.6)
        for pid in ("wr1", "fx1"):
            f.proj[pid] = projection(20.0)              # out of reach for both bench bodies
        f.proj["fx2"] = projection(12.4)                # weakest eligible starter, at FLEX
        f.proj["wr2"] = projection(14.6)                # next weakest, at WR
        rows = f.rows()
        self.assertEqual([r[0] for r in rows], ["↑", "↑"])
        self.assertIn("BN_RB over FX2 (FLEX)", rows[0][1], "the stronger body picks first, not the first listed")
        self.assertIn("BN_WR over WR2 (WR)", rows[1][1])

    def test_second_body_stays_silent_when_no_remaining_slot_clears_the_margin(self):
        f = Fixture()
        f.players["bn_rb"]["position"] = "WR"
        f.proj["bn_wr"] = projection(14.0)
        f.proj["bn_rb"] = projection(13.0)
        for pid in ("wr1", "wr2", "fx2"):
            f.proj[pid] = projection(20.0)
        f.proj["fx1"] = projection(9.0)                 # only one starter is beatable by 2+
        rows = f.rows()
        self.assertEqual([r[0] for r in rows], ["↑"])
        self.assertIn("BN_WR over FX1", rows[0][1])

    def test_opponent_tags_are_information_only(self):
        f = Fixture()
        f.players["orb1"]["injury_status"] = "Out"
        rows = f.rows()
        self.assertEqual([r[0] for r in rows], ["ℹ"])
        self.assertIn("ORB1", rows[0][2])

    def test_order_is_siren_then_warning_then_swap_then_info(self):
        f = Fixture()
        f.players["wr1"]["injury_status"] = "Out"
        f.players["te"]["injury_status"] = "Questionable"
        f.proj["bn_rb"] = projection(14.0)
        f.players["oqb"]["injury_status"] = "Doubtful"
        self.assertEqual(f.icons(), ["🚨", "⚠", "↑", "ℹ"])


def kick(h, m=0):
    """A Sunday kickoff at h:m Eastern (EDT, UTC-4), as an aware UTC datetime like ESPN's."""
    return datetime.datetime(2026, 9, 13, h + 4, m, tzinfo=datetime.timezone.utc)


class TestKickoffOrder(unittest.TestCase):
    """Week 3, 2026: Flowers (Questionable, BAL in Rio at 4:25, 14.0) on the bench, Stevenson (NE at
    1:00, 10.7) at FLEX. ↑ fired 'Flowers over Stevenson' -- a swap that bets the slot on a tag the
    Ravens would not resolve until ~2:55, 115 minutes after Stevenson locked."""

    def setUp(self):
        self.f = Fixture()
        for pid, p in self.f.players.items():
            p["team"] = "EARLY"
        self.f.players["bn_wr"].update(team="LATE", injury_status="Questionable", injury_body_part="Hamstring")
        self.f.proj["bn_wr"] = projection(13.0)
        self.k = {"EARLY": kick(13), "LATE": kick(16, 25), "OPP": kick(13)}

    def rows(self):
        return g.assess(self.f.our, self.f.opp, self.f.players, self.f.proj, SCORING, SLOTS, TODAY, self.k)

    def test_questionable_late_game_over_early_starters_is_a_hold_not_a_swap(self):
        rows = self.rows()
        self.assertEqual([r[0] for r in rows], ["⏸"])
        self.assertIn("HOLD — BN_WR stays benched", rows[0][1])
        self.assertIn("kicks off at 1:00 PM ET", rows[0][2])
        self.assertIn("inactives at ~2:55 PM ET (4:25 PM ET kickoff)", rows[0][2])
        self.assertIn("[Questionable: Hamstring]", rows[0][2])

    def test_week2_same_window_still_fires_the_swap(self):
        """Flowers over Swift, Week 2: both Questionable, both in the same window -- a fair swap.
        The ⏸ rule must not bring back the silence insight-worthy enough to be in the docstring."""
        self.k["LATE"] = kick(13)
        self.assertEqual([r[0] for r in self.rows()], ["↑"])

    def test_inactives_before_the_starter_locks_still_fires_the_swap(self):
        """A 4:25 Questionable over a 4:05 starter: inactives (~2:55) land before either locks."""
        self.k["EARLY"] = kick(16, 5)
        self.assertEqual([r[0] for r in self.rows()], ["↑"])

    def test_a_healthy_late_player_is_never_held(self):
        self.f.players["bn_wr"]["injury_status"] = None
        self.assertEqual([r[0] for r in self.rows()], ["↑"])

    def test_a_safe_slot_wins_over_a_held_one(self):
        """wr2 plays in the late window too; swapping BN_WR in for him is fair, so ↑ names that
        slot and no ⏸ is printed for the unsafe ones."""
        self.f.players["wr2"]["team"] = "LATE"
        rows = self.rows()
        self.assertEqual([r[0] for r in rows], ["↑"])
        self.assertIn("BN_WR over WR2 (WR)", rows[0][1])

    def test_unknown_kickoffs_fall_back_to_the_swap(self):
        del self.k["LATE"]
        self.assertEqual([r[0] for r in self.rows()], ["↑"])
        self.k = None
        self.assertEqual([r[0] for r in self.rows()], ["↑"])

    def test_hold_is_under_the_margin_silent(self):
        self.f.proj["bn_wr"] = projection(11.9)
        self.assertEqual(self.rows(), [])

    def test_hold_orders_after_swaps_and_before_info(self):
        self.f.proj["bn_rb"] = projection(14.0)          # healthy RB: a real ↑
        self.f.players["oqb"]["injury_status"] = "Doubtful"
        self.assertEqual([r[0] for r in self.rows()], ["↑", "⏸", "ℹ"])


class TestLockedAtKickoff(unittest.TestCase):
    """Sleeper freezes a player at kickoff. Until 2026-09-27 'played' meant 'dated before today',
    so the 15:00 run treated a 1:00 player mid-game as movable -- offered as a sub, or offered
    as the man to swap out -- and an 08:00 run offered a 1:00 body as the fallback for a 4:25
    Questionable starter who would not be ruled on until 2:55."""

    def setUp(self):
        self.f = Fixture()
        for p in self.f.players.values():
            p["team"] = "EARLY"
        self.k = {"EARLY": kick(13), "LATE": kick(16, 25), "MID": kick(16, 5), "OPP": kick(13)}

    def rows(self, at):
        return g.assess(self.f.our, self.f.opp, self.f.players, self.f.proj, SCORING, SLOTS, TODAY, self.k, at)

    def test_out_starter_is_not_handed_a_sub_whose_game_is_under_way(self):
        self.f.players["wr1"].update(team="LATE", injury_status="Out")
        rows = self.rows(kick(15))                       # 3:00 run; BN_WR (1:00) is mid-game
        self.assertEqual(rows[0][0], "🚨")
        self.assertIn("No bench body who is playing is eligible for WR", rows[0][2])
        self.assertNotIn("Start instead", rows[0][2])

    def test_the_same_sub_is_offered_before_his_kickoff(self):
        self.f.players["wr1"].update(team="LATE", injury_status="Out")
        self.assertIn("Start instead: BN_WR", self.rows(kick(8))[0][2])

    def test_a_starter_whose_game_is_under_way_is_left_alone(self):
        self.f.players["wr1"]["injury_status"] = "Out"   # tagged mid-game: nothing to be done
        self.assertEqual(self.rows(kick(15)), [])

    def test_no_swap_in_from_a_bench_body_mid_game(self):
        self.f.proj["bn_rb"] = projection(14.0)
        self.assertEqual(self.rows(kick(15)), [])
        self.assertEqual([r[0] for r in self.rows(kick(8))], ["↑"])

    def test_no_swap_out_of_a_starter_mid_game(self):
        self.f.players["bn_rb"]["team"] = "LATE"
        self.f.proj["bn_rb"] = projection(14.0)          # every eligible starter is EARLY and locked
        self.assertEqual(self.rows(kick(15)), [])

    def test_questionable_fallback_must_be_unlocked_at_his_inactives_not_now(self):
        self.f.players["wr2"].update(team="LATE", injury_status="Questionable")
        rows = self.rows(kick(8))                        # 08:00: BN_WR (1:00) is unlocked NOW, locked at 2:55
        self.assertEqual([r[0] for r in rows], ["⚠"])
        self.assertIn("no eligible bench body is still unlocked at his inactives (~2:55 PM ET)", rows[0][2])
        self.assertNotIn("If he is scratched: BN_WR", rows[0][2])

    def test_questionable_fallback_in_a_later_window_is_offered(self):
        self.f.players["wr2"].update(team="LATE", injury_status="Questionable")
        self.f.players["bn_wr"]["team"] = "MID"          # 4:05 kickoff, still open at 2:55
        self.assertIn("If he is scratched: BN_WR", self.rows(kick(8))[0][2])

    def test_questionable_starter_already_kicked_off_is_not_a_warning(self):
        self.f.players["wr2"]["injury_status"] = "Questionable"
        self.assertEqual(self.rows(kick(15)), [])

    def test_without_kickoffs_or_a_clock_the_date_rule_stands(self):
        self.f.players["wr1"]["injury_status"] = "Out"
        self.k = None
        self.assertIn("Start instead: BN_WR", self.rows(kick(15))[0][2])
        self.k = {"EARLY": kick(13)}
        self.assertIn("Start instead: BN_WR", self.rows(None)[0][2])


class TestEspnKickoffs(unittest.TestCase):
    def board(self, *games):
        return {"events": [{"date": d, "competitions": [{"competitors": [{"team": {"abbreviation": t}} for t in teams]}]}
                           for d, teams in games]}

    def test_parses_utc_and_maps_washington(self):
        k = g.kickoffs_from_espn(self.board(("2026-09-27T17:00Z", ["WSH", "SEA"]), ("2026-09-27T20:25Z", ["DAL", "BAL"])))
        self.assertEqual(set(k), {"WAS", "SEA", "DAL", "BAL"})
        self.assertEqual(g.clock(k["WAS"]), "1:00 PM ET")
        self.assertEqual(g.clock(k["BAL"]), "4:25 PM ET")

    def test_empty_or_malformed_board_refuses(self):
        for bad in ({}, {"events": []}, [], {"events": [{"date": "2026-09-27T17:00Z"}]},
                    {"events": [{"date": "not a date", "competitions": []}]}):
            with self.assertRaises(g.Refuse, msg=repr(bad)):
                g.kickoffs_from_espn(bad)

    def test_clock_handles_midnight_utc_as_the_evening_before(self):
        self.assertEqual(g.clock(datetime.datetime(2026, 9, 28, 0, 20, tzinfo=datetime.timezone.utc)), "8:20 PM ET")


class TestGamesFromEspn(unittest.TestCase):
    def test_a_real_final_week_reads_every_team_final_and_its_byes_as_byes(self):
        board = fixture("gameday_wk7_final.json")["board"]
        hou = next(e for e in board["events"]
                   if "HOU" in [c["team"]["abbreviation"] for c in e["competitions"][0]["competitors"]])
        self.assertEqual(hou["competitions"][0]["status"]["period"], 5, "the fixture lost its overtime game")
        games = g.games_from_espn(board)
        self.assertEqual(games["HOU"], (g.FINAL, 0.0))               # Final/OT: completed decides, not period 4
        self.assertEqual(sum(1 for s, _ in games.values() if s == g.FINAL), 28)
        self.assertEqual({t for t, (s, _) in games.items() if s == g.BYE}, {"BUF", "LAC", "WAS", "JAX"})
        self.assertNotIn("WSH", games)

    def test_real_tnf_snapshots_read_scheduled_then_under_way(self):
        tnf = fixture("gameday_espn_status.json")["tnf_wk8"]
        pre = g.games_from_espn(espn_board(tnf["20261029-201540"]))
        self.assertEqual(pre, {"GB": (g.AHEAD, 1.0), "CAR": (g.AHEAD, 1.0)})
        live = g.games_from_espn(espn_board(tnf["20261029-201940"]))  # 13:07 left in the 1st
        self.assertEqual(live["GB"][0], g.LIVE)
        self.assertAlmostEqual(live["GB"][1], (3 * 900 + 787) / 3600)

    def test_the_share_left_runs_from_kickoff_to_the_final_whistle(self):
        # (0, 900.0) reads 1.25 unclamped: "in" with no period yet, the clock already set for the 1st
        for period, clock, left in ((1, 900.0, 1.0), (2, 0.0, 0.5), (3, 450.0, 0.375), (4, 450.0, 0.125),
                                    (4, 0.0, 0.0), (5, 300.0, 0.0), (0, 0.0, 1.0), (0, 900.0, 1.0),
                                    (4, -1.0, 0.0)):
            games = g.games_from_espn(espn_board(espn_event("in", period=period, clock=clock)))
            self.assertAlmostEqual(games["AAA"][1], left, msg=f"period {period} clock {clock}")

    def test_washington_is_was_in_a_game_too_not_only_on_a_bye(self):
        games = g.games_from_espn(espn_board(espn_event("pre", teams=("WSH", "DAL"))))
        self.assertEqual(set(games), {"WAS", "DAL"})

    def test_a_real_canceled_game_is_unknown_never_final(self):
        canceled = fixture("gameday_espn_status.json")["canceled_2022_wk17_cin_buf"]
        self.assertEqual(canceled["competitions"][0]["status"]["type"]["name"], "STATUS_CANCELED")
        self.assertEqual(g.games_from_espn(espn_board(canceled))["BUF"], (g.UNKNOWN, None))

    def test_a_payload_it_cannot_read_whole_refuses(self):
        no_status = espn_event("in")
        del no_status["competitions"][0]["status"]
        no_completed = espn_event("pre")
        del no_completed["competitions"][0]["status"]["type"]["completed"]
        for bad in ({}, {"events": []}, [], None, espn_board(espn_event("in", period=2, clock=None)),
                    espn_board(no_status), espn_board(no_completed),
                    espn_board(espn_event("in", period="second", clock=0.0)),
                    espn_board(espn_event("in", period=float("inf"), clock=0.0))):     # OverflowError
            with self.assertRaises(g.Refuse, msg=repr(bad)):
                g.games_from_espn(bad)


class TestProjectedTotal(unittest.TestCase):
    """Fixture: every starter on team XXX, projecting 10; the opponent's on OPP."""

    def total(self, f, pts, games, roster=None):
        return g.projected_total(roster or f.our, f.proj, SCORING, pts, TODAY, f.players, games)

    def test_without_espn_the_date_rule_stands(self):
        f = Fixture()
        f.proj["qb"] = projection(25.0, date=THU)
        e = self.total(f, {"qb": 12.82}, None)
        self.assertAlmostEqual(e.total, 12.82 + 9 * 10.0)
        self.assertEqual(e[1:], (None, None, None, None))

    def test_unplayed_zero_in_players_points_is_not_an_actual(self):
        f = Fixture()
        zeros = {pid: 0.0 for pid in f.our["starters"]}
        self.assertAlmostEqual(self.total(f, zeros, None).total, 100.0)
        self.assertAlmostEqual(self.total(f, zeros, {"XXX": (g.AHEAD, 1.0)}).total, 100.0)

    def test_a_game_under_way_blends_live_points_with_what_is_left(self):
        """Wk 6, 2026, 11:00: Tuten had 19.0 at halftime of the London game against a 13.2 projection,
        and the header scored him 13.2."""
        f = Fixture()
        f.players["wr1"]["team"] = "LON"
        f.proj["wr1"] = projection(13.2, opp="ZZZ")
        pts = {pid: 0.0 for pid in f.our["players"]} | {"wr1": 19.0}
        e = self.total(f, pts, {"LON": (g.LIVE, 0.5), "XXX": (g.AHEAD, 1.0)})
        self.assertAlmostEqual(e.total, 19.0 + 13.2 * 0.5 + 9 * 10.0)
        self.assertEqual(e[1:], (0, 1, 9, 0))
        self.assertAlmostEqual(self.total(f, pts, None).total, 13.2 + 9 * 10.0)    # the old header

    def test_the_clock_is_read_the_right_way_round(self):
        """At halftime left == 1 - left, so a reversed clock passed every 0.5 test (review 2026-10-29)."""
        f = Fixture()
        f.players["wr1"]["team"] = "LON"
        f.proj["wr1"] = projection(13.2, opp="ZZZ")
        pts = {pid: 0.0 for pid in f.our["players"]} | {"wr1": 19.0}
        e = self.total(f, pts, {"LON": (g.LIVE, 0.25), "XXX": (g.AHEAD, 1.0)})
        self.assertAlmostEqual(e.total, 19.0 + 13.2 * 0.25 + 9 * 10.0)

    def test_a_starter_cut_or_traded_after_his_game_keeps_his_real_points(self):
        """A kicker scores -1.0 for CAR on Thursday, is cut Friday (team None) or claimed by a Monday
        team. The game is found through his row's opponent, which never moved."""
        for team, monday in ((None, {}), ("MON", {"MON": (g.AHEAD, 1.0)})):
            f = Fixture()
            f.players["k"]["team"] = team
            f.proj["k"] = projection(8.0, date=THU, opp="GB")
            pts = {pid: 0.0 for pid in f.our["players"]} | {"k": -1.0}
            e = self.total(f, pts, {"GB": (g.FINAL, 0.0), "XXX": (g.AHEAD, 1.0)} | monday)
            self.assertAlmostEqual(e.total, -1.0 + 9 * 10.0, msg=team)
            self.assertEqual(e[1:], (1, 0, 9, 0), team)

    def test_a_final_game_reads_live_points_and_a_real_zero_is_real(self):
        f = Fixture()
        pts = {pid: 0.0 for pid in f.our["players"]} | {"qb": 4.4}
        e = self.total(f, pts, {"XXX": (g.FINAL, 0.0)})
        self.assertAlmostEqual(e.total, 4.4)                         # nine inactive zeros and one 4.4
        self.assertEqual(e[1:], (10, 0, 0, 0))

    def test_a_defense_under_way_scores_its_projection_and_its_live_points_once_final(self):
        """GB's DEF at kickoff, 2026-10-29: {pts_allow_0: 1} = 10.0 live against a 6.31 projection.
        Live + projection x 1.0 read 16.31."""
        f = Fixture()
        f.players["def"]["team"] = "GB"
        f.proj["def"] = projection(6.31, opp="CAR")
        pts = {pid: 0.0 for pid in f.our["players"]} | {"def": 10.0}
        live = self.total(f, pts, {"GB": (g.LIVE, 1.0), "XXX": (g.AHEAD, 1.0)})
        self.assertAlmostEqual(live.total, 6.31 + 9 * 10.0)
        self.assertEqual(live.playing, 1)
        final = self.total(f, pts, {"GB": (g.FINAL, 0.0), "XXX": (g.AHEAD, 1.0)})
        self.assertAlmostEqual(final.total, 10.0 + 9 * 10.0)

    def test_a_starter_missing_from_players_points_is_unreadable_never_zero(self):
        f = Fixture()
        pts = {pid: 3.0 for pid in f.our["players"] if pid != "qb"}
        # qb (unlisted) scores his projection of 10. FINAL: nine 3.0s. LIVE at half: the DEF scores its
        # projection (10), the other eight 3.0 + 10 x 0.5.
        for state, want in (((g.FINAL, 0.0), 10.0 + 9 * 3.0), ((g.LIVE, 0.5), 10.0 + 10.0 + 8 * 8.0)):
            e = self.total(f, pts, {"XXX": state})
            self.assertEqual(e.unknown, 1, state)
            self.assertAlmostEqual(e.total, want, msg=state)

    def test_an_unknown_state_scores_its_projection_and_is_counted(self):
        f = Fixture()
        pts = {pid: 0.0 for pid in f.our["players"]}
        e = self.total(f, pts, {"XXX": (g.UNKNOWN, None)})
        self.assertAlmostEqual(e.total, 100.0)
        self.assertEqual(e.unknown, 10)

    def test_a_team_espn_never_heard_of_is_unknown_when_sleeper_projects_him_a_game(self):
        f = Fixture()
        for team in ("ZZZ", None):                                    # a free agent with a dated row too
            f.players["qb"]["team"] = team
            f.proj["qb"] = projection(10.0, opp="YYY")
            e = self.total(f, {pid: 0.0 for pid in f.our["players"]}, {"XXX": (g.AHEAD, 1.0)})
            self.assertEqual((e.ahead, e.unknown), (9, 1), team)

    def test_a_bye_or_a_free_agent_is_no_game_not_unreadable(self):
        f = Fixture()
        f.players["qb"]["team"] = "NO"
        f.players["te"]["team"] = None
        del f.proj["qb"], f.proj["te"]                               # Sleeper projects a bye nothing
        e = self.total(f, {pid: 0.0 for pid in f.our["players"]}, {"XXX": (g.AHEAD, 1.0), "NO": (g.BYE, None)})
        self.assertAlmostEqual(e.total, 80.0)
        self.assertEqual(e[1:], (0, 0, 8, 0))


class TestRealWeek7(unittest.TestCase):
    """Real payloads, pulled 2026-10-29: ESPN's wk-7 board (all final) and Sleeper's wk-7 matchups and
    projections. Run with today = 2026-10-22, the week's Thursday, so the date rule cannot pass it: a
    `today` after the week would bank every game by date and make this check vacuous."""

    @classmethod
    def setUpClass(cls):
        cls.d = fixture("gameday_wk7_final.json")
        cls.players = {pid: {"team": t} for pid, t in cls.d["teams"].items()}
        cls.today = datetime.date(2026, 10, 22)

    def expected(self, m, games):
        return g.projected_total(m, self.d["proj"], self.d["scoring"], m["players_points"], self.today,
                                 self.players, games)

    def test_every_roster_finishes_at_sleepers_own_score_to_the_cent(self):
        games = g.games_from_espn(self.d["board"])
        for m in self.d["matchups"]:
            e = self.expected(m, games)
            self.assertAlmostEqual(e.total, m["points"], places=2, msg=f"roster {m['roster_id']}")
            self.assertEqual(e.done, sum(1 for p in m["starters"] if p not in ("0", "", None)))
            self.assertEqual(e.unknown, 0)

    def test_the_date_rule_alone_misses_every_roster(self):
        for m in self.d["matchups"]:
            self.assertGreater(abs(self.expected(m, None).total - m["points"]), 1.0, f"roster {m['roster_id']}")


class TestScoring(unittest.TestCase):
    def test_unknown_stats_are_ignored_and_missing_is_zero(self):
        self.assertEqual(g.score({"rec": 3, "made_up": 99}, SCORING), 3.0)
        self.assertEqual(g.score(None, SCORING), 0.0)


class TestKickingKeys(unittest.TestCase):
    """Sleeper's projection rows say fgm_50p / fgmiss_<range>; the league pays fgm_50_59 / fgmiss."""

    LEAGUE_K = {"fgm_0_19": 3.0, "fgm_20_29": 3.0, "fgm_30_39": 3.0, "fgm_40_49": 4.0, "fgm_50_59": 5.0,
                "fgm_60p": 6.0, "fgmiss": -1.0, "xpm": 1.0, "xpmiss": -1.0}
    # Spencer Shrader's real week-7 projection row, fg/xp keys only (Sleeper, pulled 2026-10-22 21:36)
    SHRADER_WK7 = {"fga": 2.16, "fgm": 1.79, "fgm_20_29": 0.37, "fgm_30_39": 0.49, "fgm_40_49": 0.56,
                   "fgm_50p": 0.37, "fgm_yds": 75.87, "fgmiss_30_39": 0.06, "fgmiss_40_49": 0.12,
                   "fgmiss_50p": 0.19, "xpa": 2.54, "xpm": 2.47, "xpmiss": 0.06}

    def test_a_real_projection_row_scores_its_long_makes_and_its_misses(self):
        # 0.37*3 + 0.49*3 + 0.56*4 + 0.37*5 - (0.06+0.12+0.19) + 2.47 - 0.06
        self.assertAlmostEqual(g.score(self.SHRADER_WK7, self.LEAGUE_K), 8.71, places=6)

    def test_without_the_translation_the_same_row_reads_low(self):
        # the pre-2026-10-22 number: 50+ makes and every miss silently scored 0
        legacy = sum(self.LEAGUE_K.get(k, 0.0) * v for k, v in self.SHRADER_WK7.items() if k in self.LEAGUE_K)
        self.assertAlmostEqual(legacy, 7.23, places=6)

    def test_a_line_already_in_league_keys_is_never_counted_twice(self):
        # unequal values: with 1.0 everywhere, overwriting the league key or adding into it scored the
        # same, and those mutants passed (review 2026-10-23)
        line = {"fgm_50_59": 1.0, "fgm_50p": 0.4, "fgmiss": 2.0, "fgmiss_40_49": 0.3}
        self.assertAlmostEqual(g.score(line, self.LEAGUE_K), 5.0 * 1.0 - 1.0 * 2.0)

    def test_a_scoring_dict_without_kicking_leaves_the_line_alone(self):
        self.assertEqual(g.kicking_keys(self.SHRADER_WK7, SCORING), self.SHRADER_WK7)


class TestRender(unittest.TestCase):
    AHEAD = {"XXX": (g.AHEAD, 1.0), "OPP": (g.AHEAD, 1.0)}

    def render(self, f, games, **kw):
        return g.render(1, f.our, {"points": 0.0}, f.opp, {"points": 0.0}, {"u1": "briggsy007"}, [], f.proj,
                        SCORING, TODAY, "stamp", f.players, games, **kw)

    def test_quiet_report_says_so_and_names_the_opponent(self):
        f = Fixture()
        f.opp["owner_id"] = "u1"
        text = self.render(f, self.AHEAD)
        self.assertIn("vs **briggsy007**", text)
        self.assertIn("Expected: us 100.0, them 100.0 — live points for games under way, projections for the rest. "
                      "On the board now: 0.0 / 0.0.", text)
        self.assertIn("Our starters: 0 done, 0 playing, 10 to go · theirs: 0 done, 0 playing, 10 to go.", text)
        self.assertIn("Nothing to do", text)
        self.assertNotIn("unavailable", text)
        self.assertNotIn("banked", text)

    def test_an_unreadable_starter_is_named_on_the_counts_line(self):
        f = Fixture()
        text = self.render(f, {"XXX": (g.UNKNOWN, None), "OPP": (g.UNKNOWN, None)})
        self.assertIn("Our starters: 0 done, 0 playing, 0 to go, 10 unreadable (scored at their projection)", text)
        f.proj["qb"]["opponent"], f.players["qb"]["team"] = "YYY", "ZZZ"   # a game ESPN has never heard of
        text = self.render(f, self.AHEAD)
        self.assertIn("Our starters: 0 done, 0 playing, 9 to go, 1 unreadable (scored at its projection)", text)

    def test_the_opponents_half_reads_his_own_live_points(self):
        """Wk 6 the London starter was THEIRS (Tuten). Our side is all ahead, so a header that read our
        points or printed our counts for them cannot coincide with the truth."""
        f = Fixture()
        f.players["owr2"]["team"] = "LON"
        f.proj["owr2"] = projection(13.2, opp="ZZZ")
        theirs = {pid: 0.0 for pid in f.opp["players"]} | {"owr2": 19.0}
        text = g.render(1, f.our, {"points": 0.0, "players_points": {}}, f.opp,
                        {"points": 19.0, "players_points": theirs}, {}, [], f.proj, SCORING, TODAY, "stamp",
                        f.players, self.AHEAD | {"LON": (g.LIVE, 0.5)})
        self.assertIn("Expected: us 100.0, them 115.6", text)
        self.assertIn("Our starters: 0 done, 0 playing, 10 to go · theirs: 0 done, 1 playing, 9 to go.", text)

    def test_no_matchup_still_prints_our_expected_and_counts(self):
        f = Fixture()
        text = g.render(1, f.our, None, None, None, {}, [], f.proj, SCORING, TODAY, "stamp", f.players, self.AHEAD)
        self.assertIn("No matchup found for week 1. Expected 100.0 — live points for games under way", text)
        self.assertIn("Our starters: 0 done, 0 playing, 10 to go.", text)

    def test_espn_down_is_one_line_naming_both_effects_and_no_counts(self):
        f = Fixture()
        text = self.render(f, None, blind="ESPN scoreboard: HTTP 503", live_blind="ESPN scoreboard: HTTP 503")
        self.assertIn("ESPN unavailable (ESPN scoreboard: HTTP 503) — ↑ lines do not know which game locks first, "
                      "every line (🚨 ⚠ ↑ ℹ) treats a game played today as not yet locked, and Expected scores a "
                      "game played today at its pre-game projection.", text)
        self.assertIn("projections for every game not dated before today", text)
        self.assertNotIn("Kickoff times unavailable", text)
        self.assertNotIn("Our starters", text)

    def test_only_the_kickoff_reading_failed(self):
        f = Fixture()
        text = self.render(f, self.AHEAD, blind="ESPN event unreadable: KeyError('date')")
        self.assertIn("Kickoff times unavailable (ESPN event unreadable: KeyError('date')) — ↑ lines do not know "
                      "which game locks first, and every line (🚨 ⚠ ↑ ℹ) treats a game played today as not yet "
                      "locked.", text)
        self.assertNotIn("Live game status unavailable", text)
        self.assertIn("Our starters:", text)

    def test_only_the_status_reading_failed(self):
        f = Fixture()
        text = self.render(f, None, live_blind="ESPN game status unreadable: TypeError()")
        self.assertIn("Live game status unavailable (ESPN game status unreadable: TypeError()) — Expected scores a "
                      "game played today at its pre-game projection.", text)
        self.assertNotIn("Kickoff times unavailable", text)
        self.assertNotIn("Our starters", text)


class TestOpponentLineUsesTheLockRule(unittest.TestCase):
    """A 15:00 run listed the opponent's tagged 1:00 starters who had already played."""

    def rows(self, now_utc, kickoffs):
        f = Fixture()
        f.players["owr1"].update(team="EARLY", injury_status="Questionable")
        return g.assess(f.our, f.opp, f.players, f.proj, SCORING, SLOTS, TODAY, kickoffs, now_utc)

    def test_a_tagged_starter_is_listed_before_his_kickoff_and_not_after(self):
        kick = {"EARLY": datetime.datetime(2026, 9, 13, 17, 0, tzinfo=datetime.timezone.utc)}
        before = datetime.datetime(2026, 9, 13, 16, 0, tzinfo=datetime.timezone.utc)
        after = datetime.datetime(2026, 9, 13, 18, 0, tzinfo=datetime.timezone.utc)
        self.assertEqual([r[0] for r in self.rows(before, kick)], ["ℹ"])
        self.assertEqual(self.rows(after, kick), [])
        self.assertEqual([r[0] for r in self.rows(None, None)], ["ℹ"])     # no clock: the date rule

    def test_a_no_game_starter_is_listed_before_his_teams_kickoff_and_not_after(self):
        f = Fixture()
        f.players["owr2"]["team"] = "EARLY"
        del f.proj["owr2"]                    # Sleeper pulled his row, but EARLY kicks off: not a bye
        kick = {"EARLY": datetime.datetime(2026, 9, 13, 17, 0, tzinfo=datetime.timezone.utc)}
        at = lambda h: datetime.datetime(2026, 9, 13, h, 0, tzinfo=datetime.timezone.utc)  # noqa: E731
        rows = lambda h: g.assess(f.our, f.opp, f.players, f.proj, SCORING, SLOTS, TODAY, kick, at(h))  # noqa: E731
        self.assertIn("— NO PROJECTION", rows(16)[0][2])
        self.assertEqual(rows(18), [])


class TestAnEmptiedRowIsNotABye(unittest.TestCase):
    """2026-10-30 14:31 ET: DeVonta Smith (PHI) still read Questionable, and Sleeper's week-8 row for him
    carried no date, no opponent and no stats, while the PHI DEF row read WAS. The check printed "(no game
    this week)" for a player whose team plays. The two rows below are that pull's, as pull() keeps them."""

    SMITH = {"stats": {"adp_dd_ppr": 1000.0}, "date": None, "opponent": None}
    PHI_DEF = {"stats": {"pts_allow_21_27": 1.0, "gp": 1.0}, "date": "2026-11-01", "opponent": "WAS"}

    def fixture(self, who):
        f = Fixture()
        f.players[who].update(team="PHI", injury_status="Questionable", injury_body_part="Hamstring")
        f.proj[who] = dict(self.SMITH)
        f.proj["PHI"] = dict(self.PHI_DEF)
        return f

    def test_the_opponents_emptied_starter_reads_no_projection_not_no_game(self):
        rows = self.fixture("owr1").rows()
        self.assertEqual([r[0] for r in rows], ["ℹ"])
        self.assertIn("OWR1 (WR, PHI) (no projection, though PHI plays this week", rows[0][2])
        self.assertNotIn("no game this week", rows[0][2])

    def test_our_emptied_starter_is_a_siren_with_the_true_reason_and_a_sub(self):
        rows = self.fixture("wr1").rows()
        self.assertEqual(rows[0][0], "🚨")
        self.assertEqual(rows[0][1], "STARTER'S PROJECTION PULLED — WR1 (WR)")
        self.assertIn("has NO PROJECTION, so Sleeper expects him to sit in the WR slot.", rows[0][2])
        self.assertNotIn("bye", rows[0][2])
        self.assertIn("Start instead: BN_WR", rows[0][2])

    def test_an_espn_kickoff_alone_proves_the_team_plays(self):
        f = Fixture()
        f.players["owr2"]["team"] = "EARLY"
        del f.proj["owr2"]
        kick = {"EARLY": datetime.datetime(2026, 9, 13, 17, 0, tzinfo=datetime.timezone.utc)}
        rows = g.assess(f.our, f.opp, f.players, f.proj, SCORING, SLOTS, TODAY, kick, None)
        self.assertIn("(no projection, though EARLY plays this week", rows[0][2])
        self.assertIn("— NO PROJECTION", rows[0][2])

    def test_a_real_bye_still_reads_as_a_bye(self):
        """Negative control: a team with no DEF row and no kickoff is on bye, and says so."""
        f = self.fixture("wr1")
        del f.proj["PHI"]
        rows = f.rows()
        self.assertEqual(rows[0][1], "STARTER NOT PLAYING — WR1 (WR)")
        self.assertIn("(no game this week) proj 0.0 [Questionable: Hamstring] has NO GAME this week (bye)", rows[0][2])

    def test_an_out_tag_still_wins_over_the_team_rule(self):
        f = self.fixture("wr1")
        f.players["wr1"]["injury_status"] = "Out"
        rows = f.rows()
        self.assertEqual(rows[0][1], "STARTER NOT PLAYING — WR1 (WR)")
        self.assertIn("(no projection -- Sleeper pulls it for a player who is out) proj 0.0 [Out: Hamstring] "
                      "is tagged Out in the WR slot.", rows[0][2])


class TestMainWiring(unittest.TestCase):
    """main() end to end, with Sleeper and ESPN stubbed. These prove the CALL SITE carries live status
    into the header (docs/insights/013): projected_total's own tests cannot."""

    NOW = datetime.datetime(2026, 9, 13, 11, 0, tzinfo=g.EASTERN)    # Sunday 11:00 ET

    def setUp(self):
        f = Fixture()
        f.players["wr1"]["team"] = "LON"                                 # Tuten, wk 6: 19.0 at half vs 13.2
        f.proj["wr1"] = projection(13.2, opp="ZZZ")
        f.our["owner_id"], f.opp["owner_id"] = g.BRIGGSY_USER_ID, "u1"
        pts = {pid: 0.0 for pid in f.our["players"]} | {"wr1": 19.0}
        self.pulled = ({"week": 6, "season": "2026", "season_type": "regular"},
                       {"scoring_settings": SCORING, "roster_positions": SLOTS},
                       [f.our, f.opp],
                       [{"user_id": g.BRIGGSY_USER_ID, "display_name": "PoppaBriggsy"},
                        {"user_id": "u1", "display_name": "briggsy007"}],
                       [{"roster_id": 3, "matchup_id": 1, "players_points": pts, "points": 19.0},
                        {"roster_id": 1, "matchup_id": 1, "players_points": {}, "points": 0.0}],
                       f.players, f.proj)

    def board(self, london=None, sunday=None, week=6):
        return espn_board(london or espn_event("in", period=2, clock=0.0, teams=("LON", "ZZZ"),
                                               date="2026-09-13T13:30Z"),
                          sunday or espn_event("pre", teams=("XXX", "OPP"), date="2026-09-13T17:00Z"), week=week)

    def run_main(self, board=None, board_error=None):
        out = io.StringIO()
        pull_board = mock.Mock(return_value=board, side_effect=board_error)
        with mock.patch.object(g, "pull", return_value=self.pulled), \
                mock.patch.object(g, "pull_board", pull_board), \
                mock.patch.object(g, "now", return_value=self.NOW), contextlib.redirect_stdout(out):
            code = g.main(["--stdout"])
        return code, out.getvalue()

    def test_a_game_under_way_reaches_the_header(self):
        self.pulled[5]["owr1"]["injury_status"] = "Questionable"         # OPP kicks off 17:00Z, after NOW
        code, text = self.run_main(self.board())
        self.assertEqual(code, 0)
        self.assertIn("Expected: us 115.6, them 100.0 — live points for games under way", text)   # 19 + 13.2/2 + 90
        self.assertIn("On the board now: 19.0 / 0.0.", text)
        self.assertIn("Our starters: 0 done, 1 playing, 9 to go", text)
        # the lock rule runs on the SAME patched clock: on the real one his kickoff is long past
        self.assertIn("OPPONENT'S TAGGED STARTERS", text)

    def test_a_dropped_espn_connection_is_a_line_not_a_crash(self):
        """Real chain: pull_board -> get_json -> urlopen raising what urllib leaves unwrapped."""
        for err in (http.client.RemoteDisconnected("Remote end closed connection without response"),
                    http.client.IncompleteRead(b"")):
            out = io.StringIO()
            with mock.patch.object(g, "pull", return_value=self.pulled), \
                    mock.patch.object(g.urllib.request, "urlopen", side_effect=err), \
                    mock.patch.object(g, "now", return_value=self.NOW), contextlib.redirect_stdout(out):
                code = g.main(["--stdout"])
            self.assertEqual(code, 0, repr(err))
            self.assertIn("ESPN unavailable (ESPN scoreboard:", out.getvalue())
            self.assertIn("Expected: us 103.2, them 100.0 — projections for every game not dated before today",
                          out.getvalue())

    def test_a_dropped_connection_is_a_refusal_from_get_json(self):
        with mock.patch.object(g.urllib.request, "urlopen", side_effect=ConnectionResetError("reset")):
            with self.assertRaises(g.Refuse):
                g.get_json("https://example.invalid", "probe")

    def test_the_header_reads_the_clock_the_right_way_round(self):
        code, text = self.run_main(self.board(london=espn_event("in", period=3, clock=0.0, teams=("LON", "ZZZ"),
                                                                date="2026-09-13T13:30Z")))
        self.assertIn("Expected: us 112.3, them 100.0", text)          # 19 + 13.2 x 0.25 + 90 (reversed: 118.9)

    def test_a_null_body_is_said_on_the_header_not_swallowed(self):
        """A 200 `null`: the fetch succeeded, so it reaches each parser, which refuses it."""
        code, text = self.run_main(None)
        self.assertIn("ESPN unavailable (ESPN scoreboard carried no events)", text)
        self.assertIn("Expected: us 103.2", text)

    def test_a_board_for_another_week_is_refused_not_read(self):
        """Wk 7's final board against wk 8's pre-game players_points banked every 0.0 as final:
        Expected 0.0, '10 done' (adversarial review, 2026-10-29)."""
        code, text = self.run_main(self.board(week=7))
        self.assertIn("ESPN unavailable (ESPN served week 7, not week 6)", text)
        self.assertIn("Expected: us 103.2, them 100.0 — projections for every game not dated before today", text)

    def test_a_body_that_is_not_utf8_is_a_refusal_from_get_json(self):
        with mock.patch.object(g.urllib.request, "urlopen", return_value=FakeResponse(b"\x1f\x8b\x08\x00\xff")):
            with self.assertRaises(g.Refuse):
                g.get_json("https://example.invalid", "probe")

    def test_sleeper_unreachable_exits_2_and_writes_nothing(self):
        out, err, write = io.StringIO(), io.StringIO(), mock.Mock()
        with mock.patch.object(g.urllib.request, "urlopen",
                               side_effect=http.client.RemoteDisconnected("closed")), \
                mock.patch.object(g, "write", write), \
                contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = g.main([])
        self.assertEqual(code, 2)
        self.assertIn("REFUSED: /v1/state/nfl", err.getvalue())
        self.assertEqual(out.getvalue(), "")
        write.assert_not_called()

    def test_today_is_the_local_date_on_a_saturday_night_run(self):
        """Sat 20:30 ET is already Sunday in UTC. With ESPN down, a starter whose game is dated Saturday
        must still read as unplayed (projection), not banked as a game dated before 'today'."""
        self.NOW = datetime.datetime(2026, 9, 12, 20, 30, tzinfo=g.EASTERN)
        self.pulled[6]["wr1"] = projection(13.2, date="2026-09-12")
        code, text = self.run_main(board_error=g.Refuse("ESPN scoreboard: HTTP 503"))
        self.assertIn("Expected: us 103.2", text)                      # banked would read 19.0 + 90 = 109.0

    def test_unreadable_status_costs_the_header_and_not_the_kickoffs(self):
        self.pulled[5]["wr1"]["injury_status"] = "Out"   # kicked off at 13:30Z: locked, so no siren -- IF the
        code, text = self.run_main(self.board(           # kickoffs survived the status failure
            london=espn_event("in", period=2, clock=None, teams=("LON", "ZZZ"), date="2026-09-13T13:30Z")))
        self.assertIn("Live game status unavailable (ESPN game status unreadable:", text)
        self.assertNotIn("Kickoff times unavailable", text)
        self.assertNotIn("STARTER NOT PLAYING", text)
        self.assertIn("Expected: us 103.2, them 100.0", text)                                        # the date rule

    def test_unreadable_kickoffs_cost_the_lock_rule_and_not_the_header(self):
        code, text = self.run_main(self.board(london=espn_event("in", period=2, clock=0.0, teams=("LON", "ZZZ"),
                                                                date="not a date")))
        self.assertEqual(code, 0)
        self.assertIn("Kickoff times unavailable (ESPN event unreadable:", text)
        self.assertNotIn("Live game status unavailable", text)
        self.assertIn("Expected: us 115.6, them 100.0", text)


if __name__ == "__main__":
    unittest.main()

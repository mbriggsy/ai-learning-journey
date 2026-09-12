#!/usr/bin/env python3
"""Tests for scripts/gameday_check.py -- the game-day lineup check.

    python -m unittest tests.test_gameday_check -v        (from the project root)

No network. `assess()` and `projected_total()` are pure and take every input as an argument; the
fixtures here are hand-built rosters small enough to reason about by eye. The negative controls
are the point: a check whose only failure mode is silence must be proven to fire, AND proven to
stay quiet on a lineup that is already right (a 🚨 that cries wolf every Sunday gets ignored by
week 3 -- docs/insights/009).
"""
import datetime
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
import gameday_check as g  # noqa: E402

TODAY = datetime.date(2026, 9, 13)          # a Sunday morning
SUN, THU = "2026-09-13", "2026-09-10"
SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "K", "DEF", "BN", "BN"]
SCORING = {"rec": 1.0, "rec_yd": 0.1, "rush_yd": 0.1, "pass_yd": 0.04}


def player(pid, name, pos, team="XXX", tag=None, part=None):
    return pid, {"full_name": name, "position": pos, "team": team, "injury_status": tag, "injury_body_part": part}


def projection(points, date=SUN, opp="OPP"):
    # rec_yd at 0.1/yd -> `points` exactly
    return {"stats": {"rec_yd": points * 10}, "date": date, "opponent": opp}


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
            self.proj["o" + s] = projection(10.0)

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

    def test_questionable_on_the_bench_is_nobodys_business(self):
        f = Fixture()
        f.players["bn_wr"]["injury_status"] = "Questionable"
        self.assertEqual(f.rows(), [])

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
        self.assertIn("No untagged bench body is eligible for RB", rows[0][2])

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
        self.assertIn("No untagged bench body", rows[0][2])

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


class TestProjectedTotal(unittest.TestCase):
    def test_banked_actuals_replace_projections_for_played_games(self):
        f = Fixture()
        f.proj["qb"] = projection(25.0, date=THU)
        total = g.projected_total(f.our, f.proj, SCORING, {"qb": 12.82}, TODAY)
        self.assertAlmostEqual(total, 12.82 + 9 * 10.0)

    def test_unplayed_zero_in_players_points_is_not_an_actual(self):
        f = Fixture()
        total = g.projected_total(f.our, f.proj, SCORING, {pid: 0.0 for pid in f.our["starters"]}, TODAY)
        self.assertAlmostEqual(total, 100.0)


class TestScoring(unittest.TestCase):
    def test_unknown_stats_are_ignored_and_missing_is_zero(self):
        self.assertEqual(g.score({"rec": 3, "made_up": 99}, SCORING), 3.0)
        self.assertEqual(g.score(None, SCORING), 0.0)


class TestRender(unittest.TestCase):
    def test_quiet_report_says_so_and_names_the_opponent(self):
        f = Fixture()
        names = {"u1": "briggsy007"}
        f.opp["owner_id"] = "u1"
        text = g.render(1, f.our, {"points": 0.0}, f.opp, {"points": 0.0}, names, [], f.proj, SCORING, TODAY, "stamp")
        self.assertIn("vs **briggsy007**", text)
        self.assertIn("Nothing to do", text)


if __name__ == "__main__":
    unittest.main()

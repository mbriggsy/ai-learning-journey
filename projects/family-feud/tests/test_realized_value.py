#!/usr/bin/env python3
"""U17 -- realised value of a preseason rank.

The load-bearing semantics here are all about WHICH POPULATION a number is taken over, which is
this project's most-repeated defect (market.py's position mix, insight 022's round-vs-league-size,
the superflex league). So the baseline's population is tested directly, not through the report.

No network, no season CSV.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "scripts"))
import realized_value as R  # noqa: E402


BASE = {"QB": 2, "RB": 3, "WR": 3, "TE": 2}


def actual(**kw):
    """{(name, pos): points} from pos -> [points in finish order].

    Every position the module knows about is populated, because `realized_for_season` refuses
    when a position is too shallow to read a baseline from -- and that refusal is correct for
    real data, so the fixture bends, not the production code.
    """
    out = {}
    for pos in R.POSITIONS:
        # `kw.get(pos) or DEFAULT` is wrong here: an explicitly-empty list is falsy and would
        # silently take the default, which is how the WR pool in one test ended up holding both.
        vals = kw[pos] if pos in kw else [500, 400, 300, 200, 100]
        for i, v in enumerate(vals, 1):
            out[(f"{pos.lower()}{i}", pos)] = float(v)
    return out


class TestBaselinePopulation(unittest.TestCase):
    """🚨 The baseline must be replacement over the WHOLE LEAGUE, not over the drafted pool."""

    def test_baseline_is_the_finisher_at_the_baseline_rank(self):
        a = actual(RB=[300, 200, 100, 50])          # RB3 = 100 is replacement
        ranks = [("rb1", "RB"), ("rb2", "RB"), ("rb3", "RB"), ("rb4", "RB")]
        out, cov = R.realized_for_season(ranks, a, {"RB": 3, "QB": 2, "WR": 3, "TE": 2})
        self.assertEqual(cov, 1.0)
        self.assertAlmostEqual(out[("RB", 1)], 200.0)   # 300 - 100
        self.assertAlmostEqual(out[("RB", 3)], 0.0)     # 100 - 100
        self.assertAlmostEqual(out[("RB", 4)], -50.0)   # 50 - 100

    def test_undrafted_players_still_set_the_baseline(self):
        """THE MUTANT THIS KILLS: reading replacement off the RANKED pool instead of everyone.

        Here the ADP list holds only the top two backs, but four scored. Replacement is RB3 = 100
        (a player nobody drafted, which is exactly what a waiver-wire baseline means). Off the
        ranked pool it would be RB2 = 200 and every vorp would be understated by 100."""
        a = actual(RB=[300, 200, 100, 50])
        ranks = [("rb1", "RB"), ("rb2", "RB")]
        out, _ = R.realized_for_season(ranks, a, {"RB": 3, "QB": 2, "WR": 3, "TE": 2})
        self.assertAlmostEqual(out[("RB", 1)], 200.0,
                               msg="replacement must be RB3=100, not the ranked pool's RB2=200")

    def test_it_refuses_when_too_few_players_to_read_a_baseline(self):
        a = actual(RB=[300, 200])
        ranks = [("rb1", "RB"), ("rb2", "RB")]
        with self.assertRaises(R.Refuse):
            R.realized_for_season(ranks, a, {"RB": 41, "QB": 2, "WR": 3, "TE": 2})


class TestRankIndexing(unittest.TestCase):
    """Off-by-one on a rank is this project's recurring defect (depth_rank, market_ranks)."""

    def test_the_first_ranked_player_is_rank_one(self):
        a = actual(WR=[400, 300, 200, 100])
        ranks = [("wr1", "WR"), ("wr2", "WR"), ("wr3", "WR")]
        out, _ = R.realized_for_season(ranks, a, {"WR": 3, "QB": 2, "RB": 3, "TE": 2})
        self.assertIn(("WR", 1), out)
        self.assertNotIn(("WR", 0), out)
        self.assertAlmostEqual(out[("WR", 1)], 200.0)

    def test_rank_follows_ADP_ORDER_not_finish_order(self):
        """The whole point of this file. The rank-2 slot must hold the player ADP ranked 2nd,
        even though he finished last -- if it followed finish order this would just be the curve
        again and the instrument would measure nothing new."""
        a = actual(WR=[])
        a.update({("bust", "WR"): 10.0, ("stud", "WR"): 400.0,
                  ("mid", "WR"): 200.0, ("repl", "WR"): 100.0})
        ranks = [("stud", "WR"), ("bust", "WR"), ("mid", "WR")]
        out, _ = R.realized_for_season(ranks, a, {"WR": 3, "QB": 2, "RB": 3, "TE": 2})
        self.assertAlmostEqual(out[("WR", 2)], 10.0 - 100.0,
                               msg="rank 2 must be the ADP-2 player (the bust), not the finisher")


class TestTheRefusals(unittest.TestCase):
    def test_it_refuses_a_broken_join(self):
        a = actual(RB=[300, 200, 100, 50])
        ranks = [("rb1", "RB")] + [(f"ghost{i}", "RB") for i in range(9)]
        with self.assertRaises(R.Refuse):
            R.realized_for_season(ranks, a, {"RB": 3, "QB": 2, "WR": 3, "TE": 2})

    def test_a_good_join_is_not_refused(self):
        """Negative control: the floor must not reject a healthy year."""
        a = actual(RB=[300, 200, 100, 50])
        ranks = [("rb1", "RB"), ("rb2", "RB"), ("rb3", "RB"), ("rb4", "RB")]
        out, cov = R.realized_for_season(ranks, a, {"RB": 3, "QB": 2, "WR": 3, "TE": 2})
        self.assertEqual(cov, 1.0)
        self.assertTrue(out)


class TestTableDiscipline(unittest.TestCase):
    """Same rule as build_curves._table: a mean only means something if the same seasons made it."""

    def test_a_rank_missing_from_one_season_is_dropped(self):
        per_cell = {("RB", 1): {2022: 10.0, 2023: 20.0},
                    ("RB", 2): {2022: 5.0}}
        t = R.table(per_cell, [2022, 2023])
        self.assertIn(("RB", 1), t)
        self.assertNotIn(("RB", 2), t,
                         "a rank only one season supplies must not be averaged into the table")

    def test_it_reports_mean_sd_and_count(self):
        per_cell = {("WR", 1): {2022: 10.0, 2023: 30.0}}
        m, sd, n = R.table(per_cell, [2022, 2023])[("WR", 1)]
        self.assertAlmostEqual(m, 20.0)
        self.assertAlmostEqual(sd, 10.0)
        self.assertEqual(n, 2)


class TestBaselinesAreReadNotTyped(unittest.TestCase):
    def test_baselines_come_from_the_board(self):
        """A fourth copy of these numbers is a fourth thing to drift."""
        b = R.baselines()
        self.assertEqual(set(b), set(R.POSITIONS))
        for pos, rank in b.items():
            self.assertIsInstance(rank, int)
            self.assertGreater(rank, 0)


if __name__ == "__main__":
    unittest.main()

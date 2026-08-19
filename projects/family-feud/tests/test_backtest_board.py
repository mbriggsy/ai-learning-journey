#!/usr/bin/env python3
"""U18 -- the board backtest.

FOUR MODELLING ERRORS WERE FOUND AND FIXED IN THIS FILE'S SIMULATION ON 2026-08-14, and each one
CHANGED THE ANSWER:

  1. no baseline subtracted        -> both value arms drafted quarterbacks first
  2. starters not forced           -> an arm that says QB is worthless never drafted one and ate
                                      a zero, i.e. the test punished a model for its conclusion
  3. greedy value with caps        -> six running backs in the first six rounds
  4. marginal over an EMPTY lineup -> degenerates to raw points at 1.1, quarterback first again

Every one produced a confident, wrong, publishable-looking result. These tests pin the fixed
behaviour so the next edit cannot quietly reintroduce any of them.

No network. No season CSV.
"""
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import backtest_board as B  # noqa: E402


class TestNoLeakage(unittest.TestCase):
    """A curve that has seen the answer is the fastest way to fake a result."""

    def test_training_years_are_strictly_earlier(self):
        self.assertEqual(B.train_years(2020, [2018, 2019, 2020, 2021]), (2018, 2019))

    def test_the_target_season_is_never_in_its_own_training_set(self):
        for target in (2015, 2019, 2025):
            self.assertNotIn(target, B.train_years(target, range(2010, 2026)))

    def test_no_future_season_leaks_in(self):
        tr = B.train_years(2019, range(2010, 2026))
        self.assertTrue(all(y < 2019 for y in tr), f"future seasons leaked: {tr}")

    def test_a_gap_in_the_data_is_simply_absent(self):
        """2012's ADP is built on 303 drafts and is dropped upstream; train_years must not
        invent it."""
        self.assertEqual(B.train_years(2015, [2010, 2011, 2013, 2014]), (2010, 2011, 2013, 2014))


class TestBestLineup(unittest.TestCase):
    def test_it_starts_the_best_players(self):
        r = {"QB": [300], "RB": [200, 150, 100], "WR": [180, 170, 90], "TE": [120]}
        # QB 300 + RB 200+150 + WR 180+170 + TE 120 + FLEX (100, 90) -> two best leftovers
        self.assertAlmostEqual(B.best_lineup(r), 300 + 350 + 350 + 120 + 100 + 90)

    def test_an_unfilled_slot_scores_zero_when_scoring(self):
        r = {"RB": [200, 150], "WR": [180, 170], "TE": [120]}     # no QB drafted
        self.assertAlmostEqual(B.best_lineup(r), 200 + 150 + 180 + 170 + 120)

    def test_an_unfilled_slot_scores_replacement_when_valuing(self):
        r = {"RB": [200, 150], "WR": [180, 170], "TE": [120]}
        fill = {"QB": 250.0, "RB": 100.0, "WR": 110.0, "TE": 90.0}
        got = B.best_lineup(r, fill)
        self.assertAlmostEqual(got, 250 + 200 + 150 + 180 + 170 + 120 + 110 + 110,
                               msg="empty QB fills at replacement; both FLEX fill at the best "
                                   "flex-eligible replacement")


class TestMarginalValueIsRealVBD(unittest.TestCase):
    """The whole point: value a player against what you could get LATER, not against nothing."""

    PROJ = {("QB", 1): 400.0, ("QB", 12): 270.0,
            ("RB", 1): 380.0, ("RB", 41): 110.0,
            ("WR", 1): 360.0, ("WR", 47): 140.0,
            ("TE", 1): 250.0, ("TE", 12): 145.0}

    def _fill(self):
        return {"QB": 270.0, "RB": 110.0, "WR": 140.0, "TE": 145.0}

    def test_the_first_back_outvalues_the_first_quarterback(self):
        """MUTANT 4. Over an empty lineup the QB wins on raw points (400 > 380) and the arm takes
        a quarterback first overall. Against replacement the back is worth 270 and the QB 130."""
        fill = self._fill()
        rb = B.marginal_value(self.PROJ, {}, "RB", 1, fill)
        qb = B.marginal_value(self.PROJ, {}, "QB", 1, fill)
        self.assertGreater(rb, qb,
                           "against replacement level the elite back must outvalue the elite QB")
        self.assertAlmostEqual(rb, 380.0 - 110.0)
        self.assertAlmostEqual(qb, 400.0 - 270.0)

    def test_value_saturates_once_the_slots_are_full(self):
        """MUTANT 3. A seventh back improves no lineup slot and must be worth nothing."""
        fill = self._fill()
        full = {"RB": [380.0] * 4, "WR": [360.0] * 4, "TE": [250.0], "QB": [400.0]}
        self.assertAlmostEqual(B.marginal_value(self.PROJ, full, "RB", 1, fill), 0.0)

    def test_an_unpriced_rank_returns_none_rather_than_zero(self):
        """Zero would read as 'worthless', which is a real answer. Absent is not worthless."""
        self.assertIsNone(B.marginal_value(self.PROJ, {}, "RB", 999, self._fill()))


class TestMustFill(unittest.TestCase):
    """MUTANT 2. Without this the test punishes a model for its own conclusion."""

    def test_an_empty_roster_needs_every_starter(self):
        need, flex, total = B.must_fill({"QB": 0, "RB": 0, "WR": 0, "TE": 0})
        self.assertEqual(need, {"QB": 1, "RB": 2, "WR": 2, "TE": 1})
        self.assertEqual(flex, B.FLEX_SLOTS)
        self.assertEqual(total, 8)

    def test_a_full_lineup_needs_nothing(self):
        _need, _flex, total = B.must_fill({"QB": 1, "RB": 3, "WR": 3, "TE": 1})
        self.assertEqual(total, 0)

    def test_spare_skill_players_cover_the_flex(self):
        need, flex, _ = B.must_fill({"QB": 1, "RB": 2, "WR": 4, "TE": 1})
        self.assertEqual(need["WR"], 0)
        self.assertEqual(flex, 0, "two spare receivers fill both FLEX slots")


class TestTheFloorIsAnIdentityNotAControl(unittest.TestCase):
    def test_the_docstring_says_so(self):
        """It was mislabelled a positive control when written. The margins of an arm playing its
        opponents' own strategy sum to zero by construction, so it can prove nothing about seat
        bias -- it is only a bug detector, and the file must keep saying that."""
        with open(B.__file__, encoding="utf-8") as f:
            src = f.read()
        self.assertIn("ARITHMETIC IDENTITY", src)
        self.assertIn("not a control", src.lower())


class TestTheQbEarlyArm(unittest.TestCase):
    """The arm that tests the ONE decision every other arm agrees on.

    ORDER and REALISED both already decline to take an early quarterback -- the elite QB's
    marginal value is ~126 against the elite back's ~272 -- so comparing them says nothing about
    QB timing. QB-EARLY forces the measured behaviour of this room's reachers (docs/opponents.md:
    briggsy007 takes the 2nd QB off the board on median) so the decision itself is on trial.
    """

    def _pool(self):
        # QBs are late by ADP, which is what makes taking one in round 2 a reach.
        pool = [("RB", f"rb{i}", 300 - i) for i in range(1, 20)]
        pool += [("WR", f"wr{i}", 290 - i) for i in range(1, 20)]
        pool += [("TE", f"te{i}", 200 - i) for i in range(1, 10)]
        pool += [("QB", f"qb{i}", 400 - i) for i in range(1, 10)]
        return pool

    def test_forcing_a_qb_actually_changes_the_draft(self):
        """A knob that does nothing is worse than no knob -- it reads as a tested hypothesis."""
        pool = self._pool()
        value = {}
        for pos, base in (("RB", 300), ("WR", 290), ("TE", 200), ("QB", 400)):
            for k in range(1, 60):
                value[(pos, k)] = float(base - k)
        plain, _ = B.run_draft(pool, value, 1, None)
        forced, _ = B.run_draft(pool, value, 1, 2)
        self.assertNotEqual(plain, forced,
                            "forcing a round-2 quarterback must change the resulting roster")

    def test_no_second_qb_is_forced_if_one_is_already_rostered(self):
        """The guard is `counts == 0`; without it the arm would take two quarterbacks."""
        need, _flex, _t = B.must_fill({"QB": 1, "RB": 0, "WR": 0, "TE": 0})
        self.assertEqual(need["QB"], 0)


class TestTheDefaultsAreThePublishedInvocation(unittest.TestCase):
    """The bare command must reproduce the numbers the docs quote. It did not, and the disagreement
    was on the SIGN of the headline result.

    Measured 2026-08-14. Old defaults (`--years 2015-2025 --first-test 2019`) give 11 usable
    seasons and `ORDER margin +35.7 SEM 50.1` -- POSITIVE. Every figure in TODO.md and insight 024
    is `ORDER -18.9 SEM 36.7` -- NEGATIVE -- from `--years 2010-2025 --first-test 2014`, and that
    invocation appeared in no file. So `python scripts/backtest_board.py`, the command anybody
    would obviously run, printed a sign-flipped answer to "is the board better than ADP" and looked
    exactly as authoritative as the docs it contradicted.

    Pinned on the DEFAULTS rather than by re-running the backtest: the real run needs the
    gitignored historical-ADP cache and takes minutes, so a test that ran it would add a skip to a
    clean clone (review residue 1) and be slow enough to get deleted. The defaults are the thing
    that regressed and the thing worth guarding.
    """

    def _parser_defaults(self):
        import argparse
        import re
        with open(os.path.join(ROOT, "scripts", "backtest_board.py"), encoding="utf-8") as f:
            src = f.read()
        years = re.search(r'add_argument\("--years",\s*default="([^"]+)"', src)
        first = re.search(r'add_argument\("--first-test",\s*type=int,\s*default=(\d+)', src)
        self.assertTrue(years and first, "the argparse defaults could not be read")
        return years.group(1), int(first.group(1))

    def test_the_defaults_reproduce_the_published_table(self):
        years, first = self._parser_defaults()
        self.assertEqual(years, "2010-2025",
                         "narrowing the default year range has flipped ORDER's sign before")
        self.assertEqual(first, 2014,
                         "the published 12 held-out seasons start at 2014")

    def test_the_reason_is_written_down_where_it_would_be_changed(self):
        """A default that is load-bearing and unexplained is a default somebody tidies."""
        with open(os.path.join(ROOT, "scripts", "backtest_board.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertIn("THESE DEFAULTS ARE THE PUBLISHED ONES", src)
        self.assertIn("+35.7", src, "record what the old defaults printed, or the trap is abstract")


if __name__ == "__main__":
    unittest.main()

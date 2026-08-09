#!/usr/bin/env python3
"""Tests for scripts/build_curves.py -- the empirical VORP curve, and the KICKER half of it.

    python -m unittest discover -s tests        (from the project root)

The kicker curve is the one position that is an EXACT build from a second nflverse asset:
`player_stats_kicking_*.csv` publishes field-goal makes ALREADY BUCKETED BY DISTANCE, and those
buckets map 1:1 onto league.md's bands. Nothing is inferred, no attempt distance is re-derived.
That is why K could be closed and DEF could not -- see the module's `no_def_note`.

No network. The one test that reads the real cached seasons skips when they are absent, because a
clean clone must not go red (insight 009).
"""
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import build_curves as BC  # noqa: E402
from scoring import kicker_points  # noqa: E402


def krow(**kw):
    """A kicker-week with every column present and zeroed, so a test states only what it means."""
    row = {c: "0" for cols in BC.FG_BANDS.values() for c in cols}
    row.update({"season_type": "REG", "player_id": "k1", "fg_made": "0", "fg_missed": "0",
                "fg_blocked": "0", "pat_made": "0", "pat_missed": "0"})
    row.update({k: str(v) for k, v in kw.items()})
    return row


class TestTheDistanceBandsAreScoredAtTheRightRate(unittest.TestCase):
    """league.md: FG 0-39: 3 · 40-49: 4 · 50-59: 5 · 60+: 6 · miss: -1 · XP: 1 · XP miss: -1."""

    def one(self, **kw):
        pts, summed = BC.kicking_row_points(krow(**kw))
        self.assertTrue(summed, "the fixture's buckets must sum to fg_made or it tests nothing")
        return pts

    def test_the_three_short_buckets_all_score_three(self):
        """0-19, 20-29 and 30-39 are three separate source columns and ONE league band. Folding
        them wrongly is invisible -- every kick still scores, just at the wrong rate."""
        for col in ("fg_made_0_19", "fg_made_20_29", "fg_made_30_39"):
            self.assertEqual(self.one(**{col: 1, "fg_made": 1}), 3.0, col)

    def test_the_long_bands_escalate(self):
        self.assertEqual(self.one(fg_made_40_49=1, fg_made=1), 4.0)
        self.assertEqual(self.one(fg_made_50_59=1, fg_made=1), 5.0)
        self.assertEqual(self.one(fg_made_60_=1, fg_made=1), 6.0)

    def test_extra_points_and_their_misses(self):
        self.assertEqual(self.one(pat_made=3), 3.0)
        self.assertEqual(self.one(pat_made=3, pat_missed=1), 2.0)

    def test_a_missed_field_goal_costs_a_point(self):
        self.assertEqual(self.one(fg_missed=2), -2.0)

    def test_a_full_week_matches_the_rules_read_off_league_md_by_hand(self):
        """The integration check: 2x30-39, 1x40-49, 1x50-59, one miss, 4 XP with one missed.
        3+3 + 4 + 5 - 1 + 4 - 1 = 17."""
        self.assertEqual(self.one(fg_made_30_39=2, fg_made_40_49=1, fg_made_50_59=1, fg_made=4,
                                  fg_missed=1, pat_made=4, pat_missed=1), 17.0)


class TestTheBlockedKickRuleIsExplicit(unittest.TestCase):
    """A blocked FG is NEITHER a make nor a miss in this source -- measured on 2024,
    fg_att (1115) == fg_made (937) + fg_missed (160) + fg_blocked (18). league.md says
    'miss: -1' and does not say whether a block is one, so the choice is stated, not assumed."""

    def test_a_block_is_counted_as_a_miss_by_default(self):
        pts, _ = BC.kicking_row_points(krow(fg_blocked=1))
        self.assertEqual(pts, -1.0)

    def test_and_the_flag_really_does_flip_it(self):
        """The positive control. A constant that no code path reads is not a decision, it is a
        comment -- and this one is quoted in the emitted curve's own metadata."""
        pts, _ = BC.kicking_row_points(krow(fg_blocked=1), count_blocked=False)
        self.assertEqual(pts, 0.0)


class TestTheBucketSumGuard(unittest.TestCase):
    """If the six buckets stop summing to `fg_made`, makes are being scored at ZERO and every
    kicker value sags. That reads as 'kickers got worse', not as 'the schema moved'."""

    def test_a_row_whose_buckets_match_reports_summed(self):
        self.assertTrue(BC.kicking_row_points(krow(fg_made_40_49=2, fg_made=2))[1])

    def test_a_row_with_makes_missing_from_every_bucket_is_FLAGGED(self):
        self.assertFalse(BC.kicking_row_points(krow(fg_made=3))[1])

    def test_the_flag_is_what_the_loader_hard_stops_on(self):
        """The call-site test (insight 013). The guard function returning False proves nothing
        about whether anything acts on it."""
        import inspect
        src = inspect.getsource(BC.load_kicking_season)
        self.assertIn("unsummed", src)
        self.assertIn("SystemExit", src)


class TestTheCurveShape(unittest.TestCase):
    def setUp(self):
        if not all(os.path.exists(BC.season_path(y, kicking=True)) for y in BC.SEASONS):
            self.skipTest("kicking seasons are not cached on this machine")
        if not all(os.path.exists(BC.season_path(y)) for y in BC.SEASONS):
            self.skipTest("skill seasons are not cached on this machine")

    def test_K_is_in_the_curve_and_DEF_deliberately_is_not(self):
        curve, used, _, used_k = BC.build()
        self.assertIn("K", curve)
        self.assertNotIn("DEF", curve, "DEF has no exact source; it must stay labelled")
        self.assertEqual(used_k, list(BC.SEASONS))

    def test_the_kicker_curve_decreases(self):
        """It is an order statistic on realised seasons, so K1 >= K2 >= ... by construction. A
        violation means the sort or the aggregation broke, not that kickers are strange."""
        k = BC.build()[0]["K"]
        vals = [k[str(i)] for i in range(1, len(k) + 1)]
        self.assertEqual(vals, sorted(vals, reverse=True))

    def test_the_top_kicker_is_in_a_believable_range(self):
        """A cheap oracle. ~35 FGs at a distance-weighted average near 3.7 plus ~40 extra points
        lands around 170; an order of magnitude either side means the bands are misapplied."""
        k1 = BC.build()[0]["K"]["1"]
        self.assertGreater(k1, 120.0)
        self.assertLess(k1, 220.0)

    def test_adding_K_did_not_disturb_the_skill_curve(self):
        """K comes from a SEPARATE asset and must not touch the four positions that were already
        measured and shipped."""
        curve = BC.build()[0]
        self.assertEqual(curve["RB"]["41"], 118.7)
        self.assertEqual(curve["WR"]["47"], 148.0)
        self.assertEqual(curve["QB"]["12"], 283.5)
        self.assertEqual(curve["TE"]["12"], 146.9)


if __name__ == "__main__":
    unittest.main()

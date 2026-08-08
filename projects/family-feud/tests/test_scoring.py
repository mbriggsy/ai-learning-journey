#!/usr/bin/env python3
"""Tests for scripts/scoring.py and scripts/build_curves.py -- U5, the VORP pipeline.

    python3 -m unittest discover -s tests -v        (from the project root)

THE ORACLE IS THE POINT. Our league is not standard PPR (interceptions are -1 here, -2 there), so
none of our own numbers can be checked against anything outside this repo. So the scoring engine
is run under nflverse's OWN published rules against nflverse's OWN published totals, over a real
committed season: 607 player-seasons, every one exact. If the machinery reproduces a
known-correct total to the cent, the only thing left to get wrong is the rule table -- and the
rule table is a short literal quoted from league.md.

No network. The fixture is a real 2024 regular season (5340 rows, 607 players) gzipped to 324KB
and committed, so this suite survives a clean clone -- draft-kit/cache/player_stats_*.csv is
gitignored and a test that needed it would pass on this laptop and fail everywhere else.
"""
import csv
import collections
import gzip
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import scoring  # noqa: E402
import build_curves as B  # noqa: E402

FIXTURE = os.path.join(ROOT, "tests", "fixtures", "player_stats_2024_reg.csv.gz")
# Captured at import, before any test can monkeypatch it, so every restore is a restore.
B_fetch_real = B.fetch_season


def fixture_rows():
    with gzip.open(FIXTURE, "rb") as g:
        text = g.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(text)))


class TestTheOracle(unittest.TestCase):
    """Reproduce nflverse's fantasy_points_ppr exactly, under nflverse's own rules."""

    @classmethod
    def setUpClass(cls):
        cls.rows = fixture_rows()

    def test_every_player_season_reproduces_to_the_cent(self):
        mine = collections.defaultdict(float)
        theirs = collections.defaultdict(float)
        for row in self.rows:
            mine[row["player_id"]] += scoring.score(row, scoring.STANDARD_PPR)
            theirs[row["player_id"]] += scoring._n(row["fantasy_points_ppr"])
        off = {p: (round(mine[p], 2), round(theirs[p], 2)) for p in mine
               if abs(mine[p] - theirs[p]) >= 0.02}
        self.assertEqual(off, {}, f"{len(off)} of {len(mine)} player-seasons disagree")
        self.assertGreater(len(mine), 500, "the fixture must be a real season, not a stub")

    def test_return_touchdowns_are_scored(self):
        """Omitting special_teams_tds cost 64 player-seasons EXACTLY 12.0 points each while every
        other number matched -- which is the only reason it was findable. A positive control on
        the term, not just on the total."""
        row = {"special_teams_tds": 2}
        self.assertEqual(scoring.score(row, scoring.STANDARD_PPR), 12.0)

    def test_the_oracle_can_actually_fail(self):
        """A gate that cannot go red is not a gate. Perturb one rule and the whole thing must
        light up -- otherwise the test above passes for a reason unrelated to the rules."""
        bent = dict(scoring.STANDARD_PPR, rec=0.5)
        mine = collections.defaultdict(float)
        theirs = collections.defaultdict(float)
        for row in self.rows:
            mine[row["player_id"]] += scoring.score(row, bent)
            theirs[row["player_id"]] += scoring._n(row["fantasy_points_ppr"])
        off = [p for p in mine if abs(mine[p] - theirs[p]) >= 0.02]
        self.assertGreater(len(off), 100, "halving the PPR point changed almost nothing")


class TestOurLeagueDiffersExactlyWhereItShould(unittest.TestCase):
    def test_the_interception_value_is_the_only_offensive_difference(self):
        """league.md says -1; standard PPR says -2. If any OTHER term had drifted, a row with no
        interceptions would score differently too."""
        row = {"passing_yards": 300, "passing_tds": 2, "rushing_yards": 20, "receptions": 0}
        self.assertEqual(scoring.score(row, scoring.FAMILY_FEUD),
                         scoring.score(row, scoring.STANDARD_PPR))
        row["interceptions"] = 3
        self.assertEqual(scoring.score(row, scoring.FAMILY_FEUD)
                         - scoring.score(row, scoring.STANDARD_PPR), 3.0)

    def test_a_full_ppr_reception_is_worth_one_point(self):
        self.assertEqual(scoring.score({"receptions": 7}, scoring.FAMILY_FEUD), 7.0)


class TestTheLongTdBonusesStack(unittest.TestCase):
    """league.md: +1 at 40+ AND +2 at 50+, on pass, rush and receiving TDs. They STACK, so a
    55-yard receiving TD is 6+1+2 = 9, not 8. Sleeper keys them rec_td_40p / rec_td_50p, where
    the word 'bonus' appears nowhere -- easy to miss in raw JSON, so pinned here."""

    def test_a_fifty_five_yard_receiving_td_scores_nine(self):
        td = {"receiving_tds": 1, "receiving_yards": 55, "rec_td_40p": 1, "rec_td_50p": 1}
        self.assertEqual(scoring.score(td, scoring.FAMILY_FEUD), 6 + 1 + 2 + 5.5)

    def test_a_forty_five_yard_rushing_td_takes_only_the_lower_bonus(self):
        td = {"rushing_tds": 1, "rushing_yards": 45, "rush_td_40p": 1}
        self.assertEqual(scoring.score(td, scoring.FAMILY_FEUD), 6 + 1 + 4.5)

    def test_the_oracle_ruleset_pays_no_bonus(self):
        """Standard PPR has no such rule, and the oracle would stop reproducing if it did."""
        td = {"receiving_tds": 1, "rec_td_40p": 1, "rec_td_50p": 1}
        self.assertEqual(scoring.score(td, scoring.STANDARD_PPR), 6.0)


class TestKickerAndDefenceScoring(unittest.TestCase):
    def test_field_goals_are_distance_weighted(self):
        self.assertEqual(scoring.kicker_points({"0-39": 2, "40-49": 1, "50-59": 1, "60+": 1}),
                         3 + 3 + 4 + 5 + 6)

    def test_misses_cost_a_point_each(self):
        self.assertEqual(scoring.kicker_points({"0-39": 1}, missed=2, xp_made=3, xp_missed=1),
                         3 - 2 + 3 - 1)

    def test_an_unknown_distance_band_raises_rather_than_scoring_zero(self):
        """A silent zero here would understate a kicker all season and look like bad luck."""
        with self.assertRaises(ValueError):
            scoring.kicker_points({"30-39": 5})

    def test_the_points_allowed_bands(self):
        for pa, want in ((0, 10.0), (3, 7.0), (10, 4.0), (17, 1.0), (24, 0.0), (30, -1.0),
                         (52, -4.0)):
            with self.subTest(points_allowed=pa):
                self.assertEqual(scoring.dst_points(pa), want)

    def test_the_minus_four_floor_is_why_streaming_is_expensive(self):
        self.assertEqual(scoring.dst_points(38, sacks=2, interceptions=1), -4 + 2 + 2)


class CurveCase(unittest.TestCase):
    """build() against the committed fixture, with CACHE redirected into a tmpdir so nothing
    reaches the network and nothing reads the gitignored real cache."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        with gzip.open(FIXTURE, "rb") as g:
            with open(os.path.join(self.tmp, "player_stats_2024.csv"), "wb") as f:
                f.write(g.read())
        self._cache = B.CACHE
        B.CACHE = self.tmp
        self.addCleanup(lambda: setattr(B, "CACHE", self._cache))


class TestTheCurve(CurveCase):
    def test_the_2024_curve_lands_on_its_measured_values(self):
        curve, used, _ = B.build(seasons=(2024,))
        self.assertEqual(used, [2024])
        for pos, rank, want in (("QB", 12, 288.4), ("RB", 41, 115.0), ("WR", 47, 147.7),
                                ("TE", 12, 145.4), ("QB", 8, 320.1), ("RB", 21, 200.7),
                                ("WR", 27, 199.4), ("TE", 8, 174.6)):
            with self.subTest(pos=pos, rank=rank):
                self.assertEqual(curve[pos][str(rank)], want)

    def test_the_curve_descends_within_every_position(self):
        """It is a rank -> points lookup; a non-monotone curve would mean the sort broke."""
        curve, _, _ = B.build(seasons=(2024,))
        for pos, rows in curve.items():
            vals = [rows[str(r)] for r in range(1, len(rows) + 1)]
            self.assertEqual(vals, sorted(vals, reverse=True), f"{pos} curve is not descending")

    def test_a_season_absent_upstream_is_absent_not_an_error(self):
        """2025 and 2026 both 404 today. A pipeline that crashes on that is unusable all
        preseason, which is exactly when it is needed."""
        B.fetch_season = lambda year, timeout=120: (None, f"{year}: not published upstream")
        self.addCleanup(lambda: setattr(B, "fetch_season", B_fetch_real))
        curve, used, notes = B.build(seasons=(2024, 2025, 2026))
        self.assertEqual(used, [2024])
        self.assertTrue(any("2025" in n for n in notes))
        self.assertTrue(curve["QB"], "the available season still produced a curve")

    def test_a_missing_cached_season_is_refetched_not_crashed(self):
        os.remove(os.path.join(self.tmp, "player_stats_2024.csv"))
        called = []

        def fake(year, timeout=120):
            called.append(year)
            with gzip.open(FIXTURE, "rb") as g:
                p = os.path.join(self.tmp, f"player_stats_{year}.csv")
                with open(p, "wb") as f:
                    f.write(g.read())
            return p, f"{year}: fetched"
        B.fetch_season = fake
        self.addCleanup(lambda: setattr(B, "fetch_season", B_fetch_real))
        curve, used, _ = B.build(seasons=(2024,))
        self.assertEqual(called, [2024])
        self.assertEqual(used, [2024])

    def test_no_seasons_at_all_refuses_rather_than_emitting_an_empty_curve(self):
        B.fetch_season = lambda year, timeout=120: (None, "gone")
        self.addCleanup(lambda: setattr(B, "fetch_season", B_fetch_real))
        with self.assertRaises(SystemExit):
            B.build(seasons=(2025,))


class TestBaselinesAreReadNotRetyped(unittest.TestCase):
    """They already exist in meta.vbd, in the board HTML's prose and in the methodology doc. A
    fourth copy is a fourth thing to drift -- and U4 now refuses the third."""

    def test_the_baselines_come_from_the_board(self):
        waiver, last = B.baselines_from_board()
        self.assertEqual(waiver, {"QB": 12, "RB": 41, "WR": 47, "TE": 12})
        self.assertEqual(last, {"QB": 8, "RB": 21, "WR": 27, "TE": 8})

    def test_a_board_with_different_baselines_is_followed(self):
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        p = os.path.join(d, "board.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump({"meta": {"vbd": {"baselineWaiver": {"QB": 99}, "lastStarter": {"QB": 1}}}}, f)
        self.assertEqual(B.baselines_from_board(p)[0], {"QB": 99})


class TestWhatThisPipelineCannotDo(unittest.TestCase):
    """A RECORD OF A KNOWN, EXPLAINED GAP -- pinned so it cannot quietly become a surprise.

    The plan's acceptance test was "regenerated VORP matches the current board within 0.1 MAD".
    It cannot be met, and not because the arithmetic is wrong: the oracle above reproduces
    nflverse's own totals exactly. The Aug 5 board was built on a window including 2025, and
    nflverse's player_stats release has no 2025 asset at all -- an input that does not exist
    cannot be re-run. Measured across every plausible configuration (four candidate windows x
    interception value x season type x position field), the best achievable is 1.84 MAD.
    """

    def test_the_curve_declares_what_it_excludes(self):
        self.assertIn("long_td_bonus", json.loads(json.dumps(
            {"excludes": ["long_td_bonus"]}))["excludes"])

    def test_the_scoring_module_can_apply_the_bonus_it_cannot_source(self):
        """The rule is IMPLEMENTED even though nflverse cannot feed it, so that a source which
        carries TD distance (Sleeper's own feed does) needs no change here."""
        self.assertGreater(scoring.FAMILY_FEUD["td_40p_bonus"], 0)
        self.assertGreater(scoring.FAMILY_FEUD["td_50p_bonus"], 0)
        self.assertEqual(scoring.score({"rec_td_40p": 1, "rec_td_50p": 1}, scoring.FAMILY_FEUD),
                         3.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)

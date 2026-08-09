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
import tempfile
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

    def test_the_four_baselines_are_where_the_shipped_board_says_they_are(self):
        """These are the four numbers every `vorp` on the board is subtracted from, so they are
        pinned rather than trusted. Updated 2026-08-09 when the basis moved to the current release
        and 2022-2025; the previous pins (RB41 118.7 / WR47 148.0 / QB12 283.5 / TE12 146.9) were
        the legacy 2021-2024 build and are still reproducible via source="legacy"."""
        curve = BC.build()[0]
        self.assertEqual(curve["RB"]["41"], 117.5)
        self.assertEqual(curve["WR"]["47"], 144.8)
        self.assertEqual(curve["QB"]["12"], 282.6)
        self.assertEqual(curve["TE"]["12"], 148.8)

    def test_the_old_basis_is_still_reproducible(self):
        """The A/B must stay runnable, or the swap becomes unauditable the moment it lands."""
        curve = BC.build(seasons=BC.SOURCES["legacy"]["seasons"], source="legacy")[0]
        self.assertEqual(curve["RB"]["41"], 118.7)
        self.assertEqual(curve["WR"]["47"], 148.0)


# ---------------------------------------------------------------------------------------------
# THE SOURCE SWITCH. nflverse's `player_stats` release is FROZEN at 2024 and its 2025 asset is a
# hard 404; the live release is `stats_player`, which publishes 1999-2025. This file used to assert
# the opposite in a comment, and that one wrong sentence is why the 2025 season was written off.
# ---------------------------------------------------------------------------------------------
class TestTheBoundaryAdapter(unittest.TestCase):
    """`score()` reads nflverse column names, so a rename is not an error -- it is a ZERO."""

    def test_it_fills_a_name_the_source_renamed(self):
        row = {"passing_interceptions": "3", "passing_yards": "300"}
        out = BC.adapt_row(row, BC.SOURCES["current"]["aliases"])
        self.assertEqual(out["interceptions"], "3")

    def test_it_never_overwrites_a_name_the_source_already_carries(self):
        row = {"interceptions": "1", "passing_interceptions": "9"}
        self.assertEqual(BC.adapt_row(row, BC.SOURCES["current"]["aliases"])["interceptions"], "1")

    def test_a_source_with_no_aliases_is_passed_through_untouched(self):
        row = {"passing_yards": "300"}
        self.assertIs(BC.adapt_row(row, BC.SOURCES["legacy"]["aliases"]), row)

    def test_the_alias_is_what_stands_between_us_and_a_free_point_per_interception(self):
        """The measured cost of dropping just this one alias was 58 of 1,997 player-seasons on
        2024, by up to 32 points -- silently, because `_n(None)` is 0.0."""
        from scoring import score, FAMILY_FEUD
        raw = {"passing_interceptions": "3"}
        self.assertEqual(score(raw, FAMILY_FEUD), 0.0)                      # the silent zero
        adapted = BC.adapt_row(raw, BC.SOURCES["current"]["aliases"])
        self.assertEqual(score(adapted, FAMILY_FEUD), -3.0)                 # the real value


class TestTheOracleRunsInsideTheBuild(unittest.TestCase):
    """An alias table only covers the renames somebody thought of. Re-scoring every row under
    STANDARD_PPR and comparing to the source's own `fantasy_points_ppr` covers the rest, which is
    why it lives in `load_season` rather than only in tests/test_scoring.py."""

    HEAD = ("player_id,player_name,position,season,week,season_type,passing_yards,passing_tds,"
            "{int_col},receptions,receiving_yards,receiving_tds,fantasy_points_ppr")

    def _load(self, int_col, source, tmp):
        """One real player -- 3 INTs and a 10-yard catch -- plus all-zero filler.

        Chosen so the two rulesets and the failure mode are three DIFFERENT numbers, because a
        fixture whose right answer collides with its wrong answer proves nothing:
            nflverse STANDARD_PPR (INT -2):  1.0 + 1.0 - 6.0 = -4.0   <- fantasy_points_ppr
            our FAMILY_FEUD       (INT -1):  1.0 + 1.0 - 3.0 = -1.0   <- what totals must hold
            INTs silently dropped:           1.0 + 1.0       = +2.0
        The first pass used 2 INTs, which made our-rules land on 0.0 -- indistinguishable at a
        glance from a row that scored nothing at all.

        The filler is not decoration: `fetch_season` treats anything under 1024 bytes as a failed
        download and re-fetches, so a small fixture silently becomes a 404 and the loader returns
        None instead of running the oracle. All three tests in this class failed that way first.
        The path must also come from `season_path`, because the two sources cache under different
        stems and a fixture written to the wrong one is simply not there.
        """
        old = BC.CACHE
        BC.CACHE = tmp
        try:
            path = BC.season_path(2099, source=source)
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(self.HEAD.format(int_col=int_col) + "\n")
                f.write("00-0000001,A Player,WR,2099,1,REG,0,0,3,1,10,0,-4.0\n")
                for i in range(2, 40):
                    f.write(f"00-000{i:04d},Filler {i},WR,2099,1,REG,0,0,0,0,0,0,0.0\n")
            assert os.path.getsize(path) > 1024, "fixture too small -- it will be re-fetched"
            return BC.load_season(2099, source=source)
        finally:
            BC.CACHE = old

    def test_the_expected_schema_passes_and_says_so(self):
        with tempfile.TemporaryDirectory() as tmp:
            (totals, _), notes = self._load("passing_interceptions", "current", tmp)
            self.assertEqual(round(totals["00-0000001"], 1), -1.0)   # our league: INT is -1
            self.assertTrue(any("oracle exact" in n for n in notes))

    def test_an_UNKNOWN_rename_is_caught_even_though_no_alias_covers_it(self):
        """The whole point. `interceptions` -> `ints_thrown` is in no alias table, would read as
        zero, and would ship a curve that looks entirely reasonable."""
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(SystemExit) as cm:
                self._load("ints_thrown", "current", tmp)
            self.assertIn("does NOT reproduce", str(cm.exception))
            self.assertIn("RENAMED COLUMN", str(cm.exception))

    def test_the_oracle_is_not_vacuous(self):
        """Positive control (insight 008): prove it can FAIL before trusting that it passed. The
        same fixture under the legacy source has no alias for passing_interceptions, so the INTs
        vanish and the oracle must fire."""
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(SystemExit):
                self._load("passing_interceptions", "legacy", tmp)


class TestTheFoldedKickingAsset(unittest.TestCase):
    """On `current`, kicking lives in the SAME weekly file as every other position -- so the K
    loader now reads a file where ~1,900 of ~2,000 rows per season are not kickers.

    Those rows have no FG and no XP columns, so they score a perfectly real 0.0 and enter the rank
    distribution as phantom kickers. There is no error and nothing sums wrong; the curve simply
    fills with zeros past the last real kicker, and `rerank.value_bands` derives K tiers from it.
    This class exists because mutant C5 -- deleting the position filter -- SURVIVED a full green
    run: every other test of the folded path needs the gitignored season cache, so on this machine
    and on a clean clone alike, nothing was looking.
    """
    HEAD = ("player_id,player_name,position,season,week,season_type,fg_made,fg_att,fg_missed,"
            "fg_blocked,fg_made_0_19,fg_made_20_29,fg_made_30_39,fg_made_40_49,fg_made_50_59,"
            "fg_made_60_,pat_made,pat_missed")

    def _load(self, tmp):
        old = BC.CACHE
        BC.CACHE = tmp
        try:
            path = BC.season_path(2099, kicking=True, source="current")
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(self.HEAD + "\n")
                # Two real kickers: one 40-49 make (4) + 1 XP = 5.0, and one 0-19 make (3) = 3.0.
                f.write("00-000K001,A Kicker,K,2099,1,REG,1,1,0,0,0,0,0,1,0,0,1,0\n")
                f.write("00-000K002,B Kicker,K,2099,1,REG,1,1,0,0,1,0,0,0,0,0,0,0\n")
                for i in range(40):     # the flood: skill players in the same file
                    f.write(f"00-000W{i:03d},Filler {i},WR,2099,1,REG,0,0,0,0,0,0,0,0,0,0,0,0\n")
            assert os.path.getsize(path) > 1024
            return BC.load_kicking_season(2099, source="current")
        finally:
            BC.CACHE = old

    def test_only_kickers_reach_the_kicker_totals(self):
        with tempfile.TemporaryDirectory() as tmp:
            totals, _ = self._load(tmp)
            self.assertEqual(len(totals), 2, "a non-kicker got into the kicker distribution")
            self.assertEqual(sorted(round(v, 1) for v in totals.values()), [3.0, 5.0])

    def test_the_flood_would_be_invisible_without_the_filter(self):
        """The control that makes the test above mean something: the filler rows really are
        loadable and really do score 0.0, so their absence is the filter working -- not the
        fixture failing to produce them."""
        with tempfile.TemporaryDirectory() as tmp:
            totals, _ = self._load(tmp)
            pts, summed = BC.kicking_row_points(
                {"position": "WR", "fg_made": "0", "fg_missed": "0", "fg_blocked": "0"})
            self.assertEqual(pts, 0.0)
            self.assertTrue(summed)          # so it would NOT be caught by the bucket-sum guard
            self.assertNotIn("00-000W000", totals)

    def test_the_legacy_kicking_asset_needs_no_filter(self):
        """Belt and braces on the condition itself: `player_stats_kicking_*.csv` contains only
        kickers, so the filter must stay scoped to the folded source or it starts depending on a
        `position` column the legacy asset is not guaranteed to carry."""
        self.assertFalse(BC.SOURCES["legacy"]["kicking_in_main"])


class TestTheSourceTableItself(unittest.TestCase):

    def test_the_shipped_basis_is_the_one_that_was_decided(self):
        """Flipping this moves every vorp on the board -- it is a decision, not a tidy-up, and it
        was taken by Briggsy on 2026-08-09 after the swap was measured. This test is here so the
        next change to it has to be deliberate too."""
        self.assertEqual(BC.DEFAULT_SOURCE, "current")
        self.assertEqual(BC.SEASONS, (2022, 2023, 2024, 2025))

    def test_the_legacy_urls_are_untouched(self):
        self.assertIn("/player_stats/player_stats_{year}.csv", BC.URL)
        self.assertIn("player_stats_kicking_{year}.csv", BC.KICK_URL)

    def test_the_current_source_points_at_the_release_that_actually_publishes_2025(self):
        self.assertIn("/stats_player/stats_player_week_{year}.csv", BC.SOURCES["current"]["url"])
        self.assertIn(2025, BC.SOURCES["current"]["seasons"])
        self.assertNotIn(2025, BC.SOURCES["legacy"]["seasons"])

    def test_kicking_is_folded_into_the_main_asset_on_the_current_source(self):
        """It is not a second download there, and asking for one must not 404 the build."""
        self.assertTrue(BC.SOURCES["current"]["kicking_in_main"])
        self.assertIsNone(BC.SOURCES["current"]["kick_url"])
        path, note = BC.fetch_season(2025, kicking=True, source="current")
        self.assertIsNone(path)
        self.assertIn("served by the main asset", note)

    def test_the_two_sources_cache_to_different_paths(self):
        """Or one would silently overwrite the other and the A/B would compare a file with itself."""
        self.assertNotEqual(BC.season_path(2024, source="legacy"),
                            BC.season_path(2024, source="current"))


if __name__ == "__main__":
    unittest.main()

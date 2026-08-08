#!/usr/bin/env python3
"""Tests for scripts/consensus.py -- the board-vs-expert-consensus instrument.

    python -m unittest discover -s tests        (from the project root)

No network. The consensus and crosswalk are dicts built here, except for the two tests that read
the real cached sources and are skipped when they are absent (a clean clone must not go red --
insight 009).

The instrument is READ-ONLY, and one test asserts exactly that, because the failure it prevents
is silent: a refresh that "helpfully" adopted the consensus would overwrite the only thing on the
board that is Briggsy's edge, and the board would still gate green afterwards.
"""
import io
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
import consensus as C  # noqa: E402

# A curve steep at the top and flat at the bottom -- the property the whole "points not spots"
# argument rests on. RB1->RB5 is 100 points; RB20->RB24 is 4.
CURVE = {"RB": {str(i): 200.0 - (i - 1) * 25 if i <= 5 else 100.0 - i for i in range(1, 41)},
         "WR": {str(i): 180.0 - (i - 1) * 20 if i <= 5 else 90.0 - i for i in range(1, 41)},
         "QB": {str(i): 300.0 - (i - 1) * 30 if i <= 5 else 160.0 - i for i in range(1, 41)}}
BASELINES = {"RB": 20, "WR": 20, "QB": 12}


def fp_row(fpid, player, pos, team, ecr, sd, page="redraft-overall"):
    return {"page_type": page, "fp_page": C.EXPECT_FP_PAGE, "id": fpid, "player": player,
            "pos": pos, "team": team, "ecr": str(ecr), "sd": str(sd),
            "scrape_date": "2026-08-07"}


def board_row(r, name, pos, team, pr, sid):
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": pr, "tier": 1,
            "badges": [], "note": "n", "vorp": 0.0, "vbdRank": r, "vbdDelta": 0,
            "sleeperId": sid, "vorpMethod": "curve:2021-2024"}


class TestIdCleaning(unittest.TestCase):
    def test_a_float_formatted_id_is_recovered(self):
        """CSV round-trips integer ids through floats, so '4046' arrives as '4046.0' and every
        join downstream silently returns nothing."""
        self.assertEqual(C.clean_id("4046.0"), "4046")
        self.assertEqual(C.clean_id("4046"), "4046")

    def test_the_string_NA_is_not_an_id(self):
        """FantasyPros writes the literal 'NA' in every cross-id column. Treating it as a value
        would join every such player to every other."""
        for v in ("NA", "", None):
            self.assertIsNone(C.clean_id(v))


class TestOffCurveIsNeverExtrapolated(unittest.TestCase):
    def test_a_rank_inside_the_curve_values_normally(self):
        self.assertIsNotNone(C.vorp(CURVE, BASELINES, "RB", 5))

    def test_a_rank_past_the_last_measured_point_is_None(self):
        """The curve stops at the last season it measured. Extrapolating would put an invented
        number in the column this report SORTS by."""
        self.assertIsNone(C.vorp(CURVE, BASELINES, "RB", 999))

    def test_an_unknown_position_is_None_not_zero(self):
        self.assertIsNone(C.vorp(CURVE, BASELINES, "DEF", 1))
        self.assertIsNone(C.vorp(CURVE, BASELINES, "K", 1))


class TestTheSurvivingDelta(unittest.TestCase):
    """The disagreement left once the experts' own spread is taken at its least favourable."""

    def test_a_board_value_inside_the_consensus_range_is_no_disagreement(self):
        self.assertEqual(C.surviving_delta(mine=50.0, low=40.0, high=60.0), 0.0)

    def test_a_board_value_below_the_whole_range_keeps_the_gap_to_the_NEAREST_edge(self):
        """Not to the midpoint, and not to the far edge -- the smallest disagreement that is
        still consistent with what the experts actually said."""
        self.assertEqual(C.surviving_delta(mine=10.0, low=40.0, high=60.0), 30.0)

    def test_a_board_value_above_the_whole_range_is_negative(self):
        self.assertEqual(C.surviving_delta(mine=90.0, low=40.0, high=60.0), -30.0)

    def test_a_missing_bound_yields_None_rather_than_a_confident_zero(self):
        self.assertIsNone(C.surviving_delta(50.0, None, 60.0))
        self.assertIsNone(C.surviving_delta(None, 40.0, 60.0))


class TestSpreadWidensWithDisagreement(unittest.TestCase):
    def setUp(self):
        self.page = C.consensus_rows([
            fp_row("1", "Tight Guy", "RB", "KC", 3.0, 1.0),
            fp_row("2", "Loose Guy", "RB", "SF", 4.0, 30.0),
            *[fp_row(str(10 + i), f"Filler {i}", "RB", "DAL", 5.0 + i, 2.0) for i in range(30)],
        ])

    def test_a_tight_consensus_barely_moves_the_rank(self):
        row = next(r for r in self.page if r["player"] == "Tight Guy")
        best, worst = C.spread_pos_ranks(self.page, row)
        self.assertLessEqual(worst - best, 3, "sd 1.0 should not span many ranks")

    def test_a_wide_consensus_spans_many_ranks(self):
        row = next(r for r in self.page if r["player"] == "Loose Guy")
        best, worst = C.spread_pos_ranks(self.page, row)
        self.assertGreater(worst - best, 10, "sd 30 must widen the band, or the noise survives")

    def test_an_unparseable_sd_collapses_to_the_point_estimate(self):
        row = dict(self.page[0], sd="NA")
        self.assertEqual(C.spread_pos_ranks(self.page, row), (row["pos_rank"], row["pos_rank"]))


class TestTheSourceSliceIsGuarded(unittest.TestCase):
    def test_the_full_ppr_page_is_accepted(self):
        self.assertTrue(C.consensus_rows([fp_row("1", "A", "RB", "KC", 1.0, 1.0)]))

    def test_a_missing_page_type_is_REFUSED_not_silently_empty(self):
        with self.assertRaises(C.Refuse):
            C.consensus_rows([fp_row("1", "A", "RB", "KC", 1.0, 1.0, page="dynasty-overall")])

    def test_a_slice_that_stops_being_full_ppr_is_REFUSED(self):
        """This league is Full PPR. If `redraft-overall` ever also covered a half-PPR page, the
        columns would still parse and every number would be for a different game."""
        rows = [fp_row("1", "A", "RB", "KC", 1.0, 1.0),
                dict(fp_row("2", "B", "RB", "SF", 2.0, 1.0), fp_page="/nfl/rankings/half-ppr.php")]
        with self.assertRaises(C.Refuse) as ctx:
            C.consensus_rows(rows)
        self.assertIn("Full PPR", str(ctx.exception))

    def test_an_empty_crosswalk_is_REFUSED_rather_than_read_as_no_matches(self):
        """Insight 008: a broken read returns zero pairs, and zero pairs reads exactly like
        'nobody matched' -- which would print a clean report saying the board agrees perfectly."""
        with self.assertRaises(C.Refuse):
            C.crosswalk([{"sleeper_id": "", "fantasypros_id": ""}])


class TestCompare(unittest.TestCase):
    def setUp(self):
        self.page = C.consensus_rows([
            fp_row("100", "Alpha Back", "RB", "KC", 1.0, 1.0),
            fp_row("200", "Bravo Back", "RB", "SF", 2.0, 1.0),
            fp_row("300", "Ghost Back", "RB", "NYJ", 3.0, 1.0),
            *[fp_row(str(400 + i), f"Filler {i}", "RB", "DAL", 10.0 + i, 1.0) for i in range(25)],
        ])
        self.board = [board_row(1, "Alpha Back", "RB", "KC", 1, "s100"),
                      board_row(2, "Bravo Back", "RB", "SF", 2, "s200"),
                      board_row(3, "Denver Broncos", "DEF", "DEN", 1, "DEN"),
                      board_row(4, "Kicker Guy", "K", "KC", 1, "s500")]
        self.xw = {"s100": "100", "s200": "200", "s500": "999"}

    def run_compare(self):
        return C.compare(self.board, self.page, self.xw, CURVE, BASELINES)

    def test_k_and_def_are_EXCLUDED_and_counted_not_silently_dropped(self):
        """They carry flat per-tier constants, so a points comparison would be arithmetic on a
        constant dressed up as analysis. The report has to SAY it skipped them."""
        d, _, notes = self.run_compare()
        self.assertEqual(notes["excluded_kdef"], 2)
        self.assertNotIn("Denver Broncos", [x["name"] for x in d])

    def test_a_player_the_consensus_ranks_but_the_board_omits_is_REPORTED(self):
        """The section a gap metric cannot produce. Ghost Back is consensus RB3 with no board
        row, and a board-outward join is blind to him by construction."""
        _, missing, _ = self.run_compare()
        self.assertIn("Ghost Back", [m["name"] for m in missing])

    def test_a_player_on_both_lists_is_never_reported_as_missing(self):
        """The positive control for the test above: if the 'missing' set were computed wrongly,
        it would list everybody and the test above would still pass."""
        _, missing, _ = self.run_compare()
        for name in ("Alpha Back", "Bravo Back"):
            self.assertNotIn(name, [m["name"] for m in missing])

    def test_a_board_row_with_no_crosswalk_entry_is_counted_as_unmatched(self):
        self.board.append(board_row(5, "Unknown Back", "RB", "LAR", 9, "s777"))
        _, _, notes = self.run_compare()
        self.assertIn("Unknown Back", notes["unmatched"])

    def test_agreement_produces_a_zero_delta_not_an_omission(self):
        d, _, _ = self.run_compare()
        alpha = next(x for x in d if x["name"] == "Alpha Back")
        self.assertEqual(alpha["delta"], 0.0)

    def test_the_report_renders_without_raising(self):
        d, m, notes = self.run_compare()
        text = C.report({"rankings": {"synthesized": "2026-08-05", "judgment": "abc"}},
                        self.page, d, m, notes, top=5)
        self.assertIn("NOT ON YOUR BOARD", text)
        self.assertIn("Ghost Back", text)


class TestItNeverWritesTheBoard(unittest.TestCase):
    def test_every_open_of_the_board_is_read_mode(self):
        """Structural, not behavioural, and deliberately so: a behavioural test only proves the
        paths it exercises. The board's `pr` is the one thing on it that is Briggsy's edge, and a
        consensus copy is parity, not an edge.

        Anchored on the WRITE MODE rather than on a substring: an earlier version of this test
        banned the text 'json.dump' and fired on `json.dumps(...)` printing the --json report to
        stdout, which writes nothing. A check that cries wolf gets deleted.
        """
        import re
        with open(os.path.join(ROOT, "scripts", "consensus.py"), encoding="utf-8") as f:
            src = f.read()
        opens = re.findall(r"open\(\s*BOARD\s*(?:,\s*([^)]*))?\)", src)
        self.assertTrue(opens, "no open(BOARD ...) found at all -- has this module been renamed?")
        for args in opens:
            self.assertNotRegex(args or "", r"['\"][waxr]?\+?[wax]",
                                f"consensus.py opens the board for writing: open(BOARD, {args})")

    def test_running_the_real_report_leaves_the_board_byte_identical(self):
        if not os.path.exists(C.ECR_CACHE) or not os.path.exists(C.XWALK_CACHE):
            self.skipTest("no cached consensus on this machine -- run --refresh")
        with open(C.BOARD, "rb") as f:
            before = f.read()
        buf, real = io.StringIO(), sys.stdout
        sys.stdout = buf
        try:
            rc = C.main(["--top", "3"])
        finally:
            sys.stdout = real
        self.assertEqual(rc, 0)
        with open(C.BOARD, "rb") as f:
            self.assertEqual(f.read(), before, "the instrument modified the board")


class TestAgainstTheRealCachedSources(unittest.TestCase):
    def setUp(self):
        if not os.path.exists(C.ECR_CACHE) or not os.path.exists(C.XWALK_CACHE):
            self.skipTest("no cached consensus on this machine -- run --refresh")

    def test_the_live_board_resolves_almost_entirely_by_ID(self):
        """A name join is forbidden here (insight 004), so coverage IS the feasibility number.
        If this collapses, the crosswalk moved and the report is quietly comparing nothing."""
        xw = C.crosswalk(C._read_csv(C.XWALK_CACHE, "crosswalk"))
        page = C.consensus_rows(C._read_csv(C.ECR_CACHE, "consensus"))
        with open(C.BOARD, encoding="utf-8") as f:
            board = json.load(f)["players"]
        with open(C.CURVE, encoding="utf-8") as f:
            curve = json.load(f)["curve"]
        d, m, notes = C.compare(board, page, xw, curve, {"QB": 12, "RB": 41, "WR": 47, "TE": 12})
        skill = [p for p in board if p["pos"] in C.SKILL]
        self.assertLess(len(notes["unmatched"]), len(skill) * 0.1,
                        f"id coverage collapsed: {len(notes['unmatched'])} unmatched")
        self.assertGreater(len(d), 100, "almost nothing was compared")

    def test_the_position_join_never_lands_on_a_different_position(self):
        """An id join that reaches the wrong human still returns a row, and a coverage number
        alone would never show it -- insight 010."""
        xw = C.crosswalk(C._read_csv(C.XWALK_CACHE, "crosswalk"))
        page = C.consensus_rows(C._read_csv(C.ECR_CACHE, "consensus"))
        by_fp = {C.clean_id(r["id"]): r for r in page}
        with open(C.BOARD, encoding="utf-8") as f:
            board = json.load(f)["players"]
        bad = []
        for p in board:
            row = by_fp.get(xw.get(str(p["sleeperId"])))
            if row and row["pos"] != p["pos"] and not (p["pos"] == "DEF" and row["pos"] == "DST"):
                bad.append((p["name"], p["pos"], row["pos"]))
        self.assertEqual(bad, [])


if __name__ == "__main__":
    unittest.main()

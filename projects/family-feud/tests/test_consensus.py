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


def ladder_of(page, keep=None):
    """The restricted ladder over `page`, keeping every id unless told otherwise."""
    ids = keep if keep is not None else {C.clean_id(r["id"]) for r in page}
    return C.restricted_ecrs(page, ids)


class TestSpreadWidensWithDisagreement(unittest.TestCase):
    def setUp(self):
        self.page = C.consensus_rows([
            fp_row("1", "Tight Guy", "RB", "KC", 3.0, 1.0),
            fp_row("2", "Loose Guy", "RB", "SF", 4.0, 30.0),
            *[fp_row(str(10 + i), f"Filler {i}", "RB", "DAL", 5.0 + i, 2.0) for i in range(30)],
        ])
        self.ladder = ladder_of(self.page)

    def test_a_tight_consensus_barely_moves_the_rank(self):
        row = next(r for r in self.page if r["player"] == "Tight Guy")
        best, worst = C.spread_pos_ranks(self.ladder, row)
        self.assertLessEqual(worst - best, 3, "sd 1.0 should not span many ranks")

    def test_a_wide_consensus_spans_many_ranks(self):
        row = next(r for r in self.page if r["player"] == "Loose Guy")
        best, worst = C.spread_pos_ranks(self.ladder, row)
        self.assertGreater(worst - best, 10, "sd 30 must widen the band, or the noise survives")

    def test_an_unparseable_sd_collapses_to_the_point_estimate(self):
        row = dict(self.page[0], sd="NA")
        here = C.depth_rank(self.ladder, row["pos"], row["ecr_f"])
        self.assertEqual(C.spread_pos_ranks(self.ladder, row), (here, here))

    def test_the_spread_EDGES_are_measured_on_the_restricted_ladder(self):
        """The half a naive port of this correction drops. `surviving_delta` subtracts the point
        estimate from these bounds, so bounds counted across all 523 while the estimate counts
        within the board is a subtraction of two different quantities that still returns a
        plausible number -- a worse instrument that looks fixed.
        """
        row = next(r for r in self.page if r["player"] == "Loose Guy")
        thin = ladder_of(self.page, {"1", "2"})          # the board carries only these two
        _, thin_worst = C.spread_pos_ranks(thin, row)
        _, full_worst = C.spread_pos_ranks(self.ladder, row)
        # Loose Guy IS one of the two carried backs, so `len + 1` is a rung that does not exist
        # for him -- an earlier version of this test asserted exactly that and locked in the
        # self-counting bug below.
        self.assertLessEqual(thin_worst, len(thin["RB"]))
        self.assertLess(thin_worst, full_worst,
                        "the same sd on a shorter board must not span the longer board's ranks")


class TestTheDepthCorrection(unittest.TestCase):
    """FantasyPros ranks 523; this board carries 174. Counting inside each list separately
    measures the SIZE OF THE TWO LISTS and prices it in points as if it were a disagreement."""

    def setUp(self):
        # Three board backs the consensus agrees with EXACTLY -- same men, same order -- with
        # seven players the board does not carry wedged between each pair.
        rows = [fp_row("A", "Ay Back", "RB", "KC", 1.0, 0.0)]
        rows += [fp_row(f"f{i}", f"Filler {i}", "RB", "DAL", 2.0 + i, 0.0) for i in range(7)]
        rows += [fp_row("B", "Bee Back", "RB", "SF", 9.0, 0.0)]
        rows += [fp_row(f"g{i}", f"Giller {i}", "RB", "DAL", 10.0 + i, 0.0) for i in range(7)]
        rows += [fp_row("C", "Cee Back", "RB", "NYJ", 17.0, 0.0)]
        self.page = C.consensus_rows(rows)
        self.board = [board_row(1, "Ay Back", "RB", "KC", 1, "sA"),
                      board_row(2, "Bee Back", "RB", "SF", 2, "sB"),
                      board_row(3, "Cee Back", "RB", "NYJ", 3, "sC")]
        self.xw = {"sA": "A", "sB": "B", "sC": "C"}

    def test_the_published_rank_and_the_restricted_rank_really_do_differ_here(self):
        """The positive control. If the fixture did not actually contain the artifact, every
        assertion below would pass on broken code -- insight 008's shape."""
        cee = next(r for r in self.page if r["player"] == "Cee Back")
        self.assertEqual(cee["pos_rank"], 17, "fixture must reproduce the inflated rank")
        self.assertEqual(C.depth_rank(ladder_of(self.page, {"A", "B", "C"}), "RB", 17.0), 3)

    def test_perfect_agreement_prices_at_ZERO_not_at_the_length_of_the_list(self):
        """The decisive one. The board and the experts name the same three men in the same order,
        so the honest disagreement is nothing. Uncorrected, Cee Back is the board's RB3 against
        'their RB17' and the gap between those two rungs is reported as a real cost in points."""
        d, _, _ = C.compare(self.board, self.page, self.xw, CURVE, BASELINES)
        self.assertEqual(len(d), 3)
        for row in d:
            self.assertEqual(row["delta"], 0.0, f"{row['name']} priced a list-length gap as a "
                                                f"disagreement: {row}")
            self.assertEqual(row["surviving"], 0.0)

    def test_the_SPREAD_is_restricted_too_measured_through_compare(self):
        """THE CALL-SITE TEST, and the one that catches the naive port (insight 013). The tests
        above use sd 0, which collapses the band and makes the spread half invisible -- so a fix
        that restricted the point estimate and left the bounds counted across all 523 would pass
        every one of them. Give the same perfectly-agreed fixture a real sd and the two wirings
        separate: correct, the board's value sits inside its own band and nothing is owed;
        naively ported, it sits far above a band drawn 14 rungs lower and the instrument invents
        a 65-point disagreement out of the list length it was supposed to have removed.
        """
        page = C.consensus_rows([dict(r, sd="2.0") for r in self.page])
        d, _, _ = C.compare(self.board, page, self.xw, CURVE, BASELINES)
        for row in d:
            self.assertEqual(row["surviving"], 0.0,
                             f"{row['name']}: bounds and estimate are on different ladders {row}")

    def test_the_published_rank_is_KEPT_so_the_correction_stays_auditable(self):
        d, _, _ = C.compare(self.board, self.page, self.xw, CURVE, BASELINES)
        cee = next(x for x in d if x["name"] == "Cee Back")
        self.assertEqual(cee["cons_pos_rank"], 3)
        self.assertEqual(cee["cons_pos_rank_published"], 17)

    def test_a_real_disagreement_still_survives_the_correction(self):
        """The correction must not be a mute button. Demote Cee Back on the board only, and the
        instrument has to keep saying so."""
        self.board[2]["pr"] = 12
        d, _, _ = C.compare(self.board, self.page, self.xw, CURVE, BASELINES)
        cee = next(x for x in d if x["name"] == "Cee Back")
        self.assertGreater(cee["delta"], 0.0, "the experts like him MORE and it must show")

    def test_an_omitted_player_is_valued_where_he_would_LAND_on_this_board(self):
        """Not where he sits on theirs. Priced at his rank among 523 he is worth less than
        replacement almost by construction, which made this whole section read as bench filler."""
        # Drop Cee Back so he becomes 'missing', then pad to the depth that section's membership
        # filter measures (`consensus overall <= len(board)`). The padding is K/DEF because that
        # is what pads the real board -- 24 of its 174 rows -- and they are excluded from the
        # comparison before any of this, so they add depth without adding noise.
        board = self.board[:2] + [board_row(9 + i, f"D{i}", "DEF", "DEN", i + 1, f"D{i}")
                                  for i in range(15)]
        self.assertGreaterEqual(len(board), 17, "the fixture must be deep enough to reach him")
        _, missing, _ = C.compare(board, self.page, self.xw, CURVE, BASELINES)
        cee = next(m for m in missing if m["name"] == "Cee Back")
        self.assertEqual(cee["cons_pos_rank"], 3, "two carried backs rank ahead of him, so he is 3")
        self.assertEqual(cee["cons_pos_rank_published"], 17)
        self.assertEqual(cee["cons_vorp"], C.vorp(CURVE, BASELINES, "RB", 3))

    def test_a_position_the_board_carries_nobody_at_yields_None_not_a_guess(self):
        self.assertIsNone(C.depth_rank(ladder_of(self.page, {"A"}), "WR", 1.0))
        self.assertIsNone(C.depth_rank(ladder_of(self.page, set()), "RB", 1.0))


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


class TestAPlayerIsNeverHisOwnCompetition(unittest.TestCase):
    """`depth_rank` is `bisect_left + 1`, and a carried player is ON the ladder. At his own ECR
    `bisect_left` excludes him for free, which is why this read as correct -- but the spread
    probes at `ecr ± sd`, and at `ecr + sd` his own rung sorts strictly below the probe, so he
    was counted as one of the players ahead of himself. `worst` came back one rung too deep on
    150 of 150 live rows, always in the same direction."""

    LADDER = {"RB": [10.0, 20.0, 30.0]}

    def row(self, ecr, sd):
        return dict(fp_row("x", "Mid Back", "RB", "KC", ecr, sd), ecr_f=ecr, pos_rank=2)

    def test_the_worst_edge_does_not_demote_him_past_a_man_he_never_lost_to(self):
        """Hand-checkable. He is the middle of three carried backs. At his worst he has moved
        1.0 closer to the back at 30.0 and has not reached him, so he is still RB2."""
        self.assertEqual(C.spread_pos_ranks(self.LADDER, self.row(20.0, 1.0)), (2, 2))

    def test_the_point_estimate_and_the_best_edge_were_always_right(self):
        """Stated so the fix is not over-sold: only the upper edge crossed his own rung."""
        self.assertEqual(C.depth_rank(self.LADDER, "RB", 20.0, own=20.0), 2)
        self.assertEqual(C.spread_pos_ranks(self.LADDER, self.row(20.0, 5.0))[0], 2)

    def test_a_carried_players_worst_rank_can_never_exceed_the_ladder(self):
        """The invariant the bug violated. However wide the experts disagree, a man cannot rank
        behind more players than the board carries -- he is one of them."""
        for sd in (0.0, 1.0, 9.9, 500.0):
            worst = C.spread_pos_ranks(self.LADDER, self.row(20.0, sd))[1]
            self.assertLessEqual(worst, len(self.LADDER["RB"]), f"sd={sd} produced rank {worst}")

    def test_an_OMITTED_player_still_reaches_len_plus_one(self):
        """The positive control, and the distinction the bug was born from. A player the board
        does NOT carry has no rung of his own, so 'behind everyone I carry' is a real answer for
        him. Excluding self unconditionally would have broken section [2] instead."""
        self.assertEqual(C.depth_rank(self.LADDER, "RB", 99.0), 4)
        self.assertEqual(C.depth_rank(self.LADDER, "RB", 99.0, own=20.0), 3)


class TestTheSuppressedFindingIsReported(unittest.TestCase):
    """END-TO-END, through compare(). The self-counting bug corrupted `low` and never `high`, so
    the band stretched downward only and real 'they like him MORE' findings were dropped into the
    'their spread covers your placement' bucket -- the exact one-directional blind spot the depth
    correction exists to remove."""

    def setUp(self):
        rows = [fp_row("A", "Ay Back", "RB", "KC", 1.0, 3.0)]          # a real spread
        rows += [fp_row(f"f{i}", f"Filler {i}", "RB", "DAL", 2.0 + i, 0.0) for i in range(7)]
        rows += [fp_row("B", "Bee Back", "RB", "SF", 9.0, 0.0)]
        rows += [fp_row("C", "Cee Back", "RB", "NYJ", 17.0, 0.0)]
        self.page = C.consensus_rows(rows)
        # Ay Back is the consensus RB1 among carried backs, but the board has him at RB2.
        self.board = [board_row(1, "Ay Back", "RB", "KC", 2, "sA"),
                      board_row(2, "Bee Back", "RB", "SF", 1, "sB"),
                      board_row(3, "Cee Back", "RB", "NYJ", 3, "sC")]
        self.xw = {"sA": "A", "sB": "B", "sC": "C"}

    def test_a_real_they_like_him_MORE_is_not_swallowed_by_a_self_counted_band(self):
        d, _, _ = C.compare(self.board, self.page, self.xw, CURVE, BASELINES)
        ay = next(x for x in d if x["name"] == "Ay Back")
        # Carried ladder is [1.0, 9.0, 17.0]. At ecr+sd = 4.0 nobody has passed him, so his
        # worst rank is still RB1 and the whole band collapses onto RB1's value.
        self.assertEqual(ay["spread_pos_ranks"], [1, 1])
        self.assertEqual(ay["surviving"], 25.0,
                         "the experts have him a full rung above the board and it must survive")
        self.assertGreater(ay["surviving"], 0.0, "sign matters: this is 'they like him MORE'")


class TestTheCircularityIsDECLAREDNotHidden(unittest.TestCase):
    """`rerank.py` builds the board's ordering out of this same FantasyPros list, so with the
    depth artifact removed the board sits at its consensus rank by construction. An empty
    section [1] is then a tautology -- and it READS like ~100 experts ratifying the board, which
    is the worst possible misreading to leave lying around on draft morning (insight 005)."""

    META = {"rankings": {"synthesized": "2026-08-07", "judgment": "abc"}}

    def setUp(self):
        rows = [fp_row("A", "Ay Back", "RB", "KC", 1.0, 0.0)]
        rows += [fp_row(f"f{i}", f"Filler {i}", "RB", "DAL", 2.0 + i, 0.0) for i in range(7)]
        rows += [fp_row("B", "Bee Back", "RB", "SF", 9.0, 0.0)]
        rows += [fp_row("C", "Cee Back", "RB", "NYJ", 17.0, 0.0)]
        self.page = C.consensus_rows(rows)
        self.board = [board_row(1, "Ay Back", "RB", "KC", 1, "sA"),
                      board_row(2, "Bee Back", "RB", "SF", 2, "sB"),
                      board_row(3, "Cee Back", "RB", "NYJ", 3, "sC")]
        self.xw = {"sA": "A", "sB": "B", "sC": "C"}

    def render(self):
        d, m, notes = C.compare(self.board, self.page, self.xw, CURVE, BASELINES)
        return C.report(self.META, self.page, d, m, notes, top=5)

    def test_a_board_that_IS_the_consensus_says_so_instead_of_printing_a_proud_zero(self):
        text = self.render()
        self.assertIn("CIRCULAR right now", text)
        self.assertIn("rerank.py", text, "it must name the mechanism, not just the symptom")
        self.assertIn("2026-08-07", text, "and the date that would end it")
        self.assertNotIn("YOU AND THE EXPERTS DISAGREE", text,
                         "a heading announcing a zero is the misreading this exists to prevent")

    def test_ONE_hand_overruled_row_retires_the_banner(self):
        """The positive control. A banner that prints unconditionally is not an instrument, it is
        a slogan -- and it would go on claiming circularity through the exact refresh that ends
        it (insight 008: prove the reading can change before trusting the reading)."""
        self.board[2]["pr"] = 12
        text = self.render()
        self.assertNotIn("CIRCULAR right now", text)
        self.assertIn("YOU AND THE EXPERTS DISAGREE", text)
        self.assertIn("2 of 3 rows sit exactly at their consensus rank", text)


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

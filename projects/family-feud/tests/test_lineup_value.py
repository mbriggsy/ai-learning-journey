"""draft-kit/lineup_value.py -- the shared marginal-lineup-value implementation.

The four insight-024 defects are pinned in tests/test_backtest_board.py through that script's
delegating wrappers; these tests cover what is NEW here: the parameterized slot structure, the
LIVE configuration (K/DEF slots, points from the board + curve), and the properties the
2026-08-19 feature ships on -- empty-roster order equals vorp order, saturation zeroes a
position, and the endgame arithmetic that the naive queue silently lacked.
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import lineup_value as LV  # noqa: E402

STARTERS = {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "K": 1, "DEF": 1}
FLEX_OK = ("RB", "WR", "TE")
FILL = {"QB": 280.0, "RB": 120.0, "WR": 145.0, "TE": 150.0, "K": 0.0, "DEF": 0.0}


def lineup(roster, fill=FILL):
    return LV.best_lineup(roster, fill, STARTERS, FLEX_OK, 2)


def delta(pts, pos, roster, fill=FILL):
    return LV.marginal_pts(pts, pos, roster, fill, STARTERS, FLEX_OK, 2)


class TestBestLineup(unittest.TestCase):
    def test_an_empty_roster_is_worth_exactly_the_replacement_prefill(self):
        """Insight 024 defect 4's fix, restated as arithmetic: nothing rostered means every slot
        holds its replacement, so the lineup is the sum of fills (flex pads at the best flex
        fill). This is what makes pick 1.1 value a player at his VORP, not his raw points."""
        want = (FILL["QB"] + 2 * FILL["RB"] + 2 * FILL["WR"] + FILL["TE"]
                + FILL["K"] + FILL["DEF"] + 2 * max(FILL[p] for p in FLEX_OK))
        self.assertAlmostEqual(lineup({}), want)

    def test_fill_none_scores_an_empty_slot_as_zero(self):
        """Scoring semantics: on Sunday an empty slot really does score nothing."""
        self.assertAlmostEqual(LV.best_lineup({}, None, STARTERS, FLEX_OK, 2), 0.0)

    def test_flex_takes_the_best_leftovers_across_positions(self):
        roster = {"RB": [200.0, 190.0, 180.0], "WR": [210.0, 205.0, 170.0], "TE": [160.0, 175.0]}
        # dedicated: RB 200+190, WR 210+205, TE 175; leftovers 180 (RB), 170 (WR), 160 (TE)
        # flex takes 180 + 170; QB/K/DEF pad at fill
        want = 200 + 190 + 210 + 205 + 175 + 180 + 170 + FILL["QB"] + FILL["K"] + FILL["DEF"]
        self.assertAlmostEqual(lineup(roster), want)

    def test_positions_outside_flex_ok_never_reach_flex(self):
        """A third quarterback must not be startable through FLEX."""
        roster = {"QB": [320.0, 310.0, 300.0]}
        base = lineup({"QB": [320.0]})
        self.assertAlmostEqual(lineup(roster), base)


class TestMarginalPts(unittest.TestCase):
    def test_on_an_empty_roster_the_delta_is_points_over_fill(self):
        """== the player's vorp, which is why the pre-draft queue equals the board's order."""
        self.assertAlmostEqual(delta(FILL["RB"] + 250.0, "RB", {}), 250.0)
        self.assertAlmostEqual(delta(FILL["QB"] + 130.0, "QB", {}), 130.0)

    def test_a_saturated_position_is_worth_zero(self):
        """The 2026-08-19 mock's disease: WR2 and both FLEX full, and the naive queue still
        offered receivers. Here the tenth receiver adds exactly nothing."""
        roster = {"WR": [300.0, 290.0, 280.0, 270.0]}          # WR2 + both flex, all better
        self.assertAlmostEqual(delta(260.0, "WR", roster), 0.0)

    def test_an_upgrade_displaces_and_is_worth_the_difference(self):
        roster = {"WR": [300.0, 290.0, 280.0, 270.0]}
        # a 310 WR bumps the 270 out of the last flex seat: worth 310 - 270
        self.assertAlmostEqual(delta(310.0, "WR", roster), 40.0)

    def test_an_empty_mandated_slot_beats_a_bench_body(self):
        """DEF's flat +27 outranks a tenth receiver's +0 -- the endgame the naive queue lost."""
        roster = {"WR": [300.0, 290.0, 280.0, 270.0]}
        self.assertGreater(delta(27.0, "DEF", roster), delta(260.0, "WR", roster))


class TestMustFill(unittest.TestCase):
    def test_a_fresh_roster_must_fill_every_starter_and_both_flex(self):
        need, flex_need, total = LV.must_fill({}, STARTERS, FLEX_OK, 2)
        self.assertEqual(total, sum(STARTERS.values()) + 2)
        self.assertEqual(flex_need, 2)

    def test_the_2026_08_19_mock_state_is_five_for_five(self):
        """Pick #85, nine receivers and a quarterback rostered: RBx2, TE, K, DEF open, flex
        absorbed by spare receivers. The ladder said NOTHING here; this is the arithmetic that
        now forces the endgame."""
        counts = {"WR": 9, "QB": 1}
        need, flex_need, total = LV.must_fill(counts, STARTERS, FLEX_OK, 2)
        self.assertEqual(need, {"QB": 0, "RB": 2, "WR": 0, "TE": 1, "K": 1, "DEF": 1})
        self.assertEqual(flex_need, 0)
        self.assertEqual(total, 5)


class TestLiveValues(unittest.TestCase):
    def board(self, **meta_vbd):
        return {"meta": {"vbd": meta_vbd or
                         {"baselineWaiver": {"QB": 12, "RB": 41, "WR": 47, "TE": 12}}},
                "players": [
                    {"sleeperId": "1", "pos": "WR", "vorp": 242.7},
                    {"sleeperId": "2", "pos": "K", "vorp": 16.0},
                    {"pos": "RB", "vorp": 50.0},                       # no id -> skipped
                ]}

    def curve(self):
        return {"curve": {"QB": {"12": 282.6}, "RB": {"41": 117.5},
                          "WR": {"47": 144.8}, "TE": {"12": 148.8}}}

    def test_skill_points_are_vorp_plus_the_baseline_and_kdef_ride_at_vorp(self):
        pts, fill = LV.live_values(self.board(), self.curve())
        self.assertAlmostEqual(pts["1"], 242.7 + 144.8)
        self.assertAlmostEqual(pts["2"], 16.0)                        # fill 0 -> pts is vorp
        self.assertAlmostEqual(fill["WR"], 144.8)
        self.assertAlmostEqual(fill["DEF"], 0.0)
        self.assertNotIn(None, pts)

    def test_a_missing_baseline_refuses_rather_than_inventing_one(self):
        with self.assertRaises(SystemExit):
            LV.live_values(self.board(baselineWaiver={"QB": 12}), self.curve())

    def test_a_baseline_rank_the_curve_lacks_refuses(self):
        bad = self.curve()
        del bad["curve"]["RB"]["41"]
        with self.assertRaises(SystemExit):
            LV.live_values(self.board(), bad)

    def test_on_the_real_board_empty_roster_deltas_reproduce_vorp_order(self):
        """The regression property the feature shipped on: before a single pick, the delta queue
        and the board agree for every slot-eligible player -- the flip only appears once slots
        saturate. Checked on the REAL shipped board, top 20."""
        pts, fill = LV.load_live_values(os.path.join(ROOT, "draft-kit"))
        with open(os.path.join(ROOT, "draft-kit", "players_data.json"), encoding="utf-8") as f:
            rows = json.load(f)["players"]
        top = sorted((r for r in rows if r["pos"] not in ("K", "DEF")),
                     key=lambda r: r["r"])[:20]
        deltas = [LV.marginal_pts(pts[str(r["sleeperId"])], r["pos"], {}, fill,
                                  STARTERS, FLEX_OK, 2) for r in top]
        for r, d in zip(top, deltas):
            self.assertAlmostEqual(d, float(r["vorp"]), places=6,
                                   msg=f"{r['name']}: empty-roster delta must equal vorp")


if __name__ == "__main__":
    unittest.main()

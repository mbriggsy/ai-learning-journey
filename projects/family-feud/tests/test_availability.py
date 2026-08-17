#!/usr/bin/env python3
"""The availability measurement, guarded at the source.

WHAT THESE TESTS PROTECT. `availability.py` produced a NEGATIVE result -- the model does not beat
the base rate in 8-team rooms -- and a negative result is exactly the kind of finding a future
edit flips by accident. The arithmetic that produced it (who was available, how big the gap was,
whether he survived) is hand-checkable on a tiny draft, so it is checked here rather than trusted.

THE FAILURE THIS FILE IS SHAPED AGAINST is insight 013's: a function with tests whose CALL SITE
has none. `observations()` is where every subtle decision lives -- excluding my own pick from the
pool, dropping turn gaps, reading the seat off draft_slot -- so it is driven directly.
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import availability as A                                            # noqa: E402


def pick(no, slot, first, last, pos="RB"):
    return {"pick_no": no, "draft_slot": slot,
            "metadata": {"first_name": first, "last_name": last, "position": pos, "team": "KC"}}


#: A 2-team, 4-round snake: slot 1 owns 1,4,5,8 and slot 2 owns 2,3,6,7.
#: Players are drafted in ADP order, so every `depth` is knowable by hand.
def tiny_feed():
    order = [(1, 1, "Aa"), (2, 2, "Bb"), (3, 2, "Cc"), (4, 1, "Dd"),
             (5, 1, "Ee"), (6, 2, "Ff"), (7, 2, "Gg"), (8, 1, "Hh")]
    return [pick(no, slot, nm, nm) for no, slot, nm in order]


def tiny_ranks():
    import normalize
    return [(normalize.norm(f"{n} {n}"), "RB") for n in ["Aa", "Bb", "Cc", "Dd",
                                                         "Ee", "Ff", "Gg", "Hh"]]


class TestObservations(unittest.TestCase):

    def rows(self):
        return A.observations(tiny_feed(), tiny_ranks())

    def test_a_turn_produces_no_observation(self):
        """Slot 1 owns 4 and 5 back to back; slot 2 owns 2-3 and 6-7. Nothing can happen between
        consecutive picks, so a gap of 0 is not a question and must not become a data point."""
        self.assertTrue(all(r["gap"] > 0 for r in self.rows()))

    def test_the_gaps_are_exactly_the_two_real_windows(self):
        """slot1: 1->4 (gap 2) and 5->8 (gap 2). slot2: 3->6 (gap 2). Everything else is a turn."""
        self.assertEqual(sorted({r["gap"] for r in self.rows()}), [2])
        self.assertEqual({r["at"] for r in self.rows()}, {1, 3, 5})

    def test_my_own_pick_is_excluded_from_the_pool(self):
        """At pick 1 I take Aa. The question "will Aa be there at my next pick" is meaningless --
        I just took him. Leaving him in inflates every depth below him by one."""
        at1 = [r for r in self.rows() if r["at"] == 1]
        # 8 players, minus the one I take = 7 candidates, depths 0..6
        self.assertEqual(len(at1), 7)
        self.assertEqual(sorted(r["slack"] + r["gap"] for r in at1), list(range(7)))

    def test_survival_is_read_from_the_feed_not_inferred(self):
        """At pick 1 (gap 2) picks 2 and 3 take Bb and Cc; Dd survives to my pick at 4."""
        at1 = {r["slack"] + r["gap"]: r["survived"] for r in self.rows() if r["at"] == 1}
        self.assertFalse(at1[0], "Bb went at pick 2 -- gone")
        self.assertFalse(at1[1], "Cc went at pick 3 -- gone")
        self.assertTrue(at1[2], "Dd was still there at pick 4")

    def test_slack_is_depth_minus_gap(self):
        at1 = [r for r in self.rows() if r["at"] == 1]
        for r in at1:
            self.assertEqual(r["slack"], (r["slack"] + r["gap"]) - r["gap"])
        # the man exactly at the boundary: depth 2, gap 2 -> slack 0, and he SURVIVED
        boundary = [r for r in at1 if r["slack"] == 0][0]
        self.assertTrue(boundary["survived"],
                        "under perfect consensus order slack>=0 means he lasts")

    def test_the_seat_comes_from_draft_slot_not_snake_arithmetic(self):
        """These are other people's leagues -- 10 and 12 team, 15 to 24 rounds, and this repo
        hard-refuses reversal formats because slot_of() cannot model them. Reading the seat off
        the pick makes the analysis correct for a format we never checked."""
        feed = tiny_feed()
        for p in feed:                      # a format snake math would get completely wrong
            p["draft_slot"] = 1 if p["pick_no"] in (1, 2, 7, 8) else 2
        rows = A.observations(feed, tiny_ranks())
        # slot 1 owns 1,2,7,8 -> only 2->7 is a real window (gap 4); 1->2 and 7->8 are turns.
        # slot 2 owns 3,4,5,6 -> every window is a turn, so it contributes NOTHING.
        # Plain snake math on 2 teams would have said slot 1 owns 1,4,5,8 and produced gaps of
        # 2 at picks 1 and 5 -- three different windows, none of them real.
        self.assertEqual({r["at"] for r in rows}, {2})
        self.assertEqual({r["gap"] for r in rows}, {4})

    def test_players_off_the_adp_list_are_not_candidates(self):
        """The ADP list is ~180 deep and drafts run to 200 picks. A player we cannot rank has no
        depth, so he cannot be scored -- but he still CONSUMES a pick, which is the bias the
        fitted threshold absorbs and the module docstring names out loud."""
        ranks = tiny_ranks()[:4]            # only Aa..Dd are rankable
        rows = A.observations(tiny_feed(), ranks)
        self.assertTrue(all(r["slack"] + r["gap"] < 4 for r in rows))
        self.assertEqual({r["gap"] for r in rows}, {2}, "gaps still count the unrankable picks")


class TestScoring(unittest.TestCase):

    def test_base_rate_is_the_majority_class(self):
        rows = [{"survived": True}] * 7 + [{"survived": False}] * 3
        rate, which = A.base_rate(rows)
        self.assertAlmostEqual(rate, 0.7)
        self.assertEqual(which, "survives")

    def test_base_rate_flips_when_gone_is_the_majority(self):
        rows = [{"survived": True}] * 2 + [{"survived": False}] * 8
        rate, which = A.base_rate(rows)
        self.assertAlmostEqual(rate, 0.8)
        self.assertEqual(which, "gone")

    def test_score_is_agreement_with_the_threshold_rule(self):
        rows = [{"slack": 5, "survived": True}, {"slack": -5, "survived": False},
                {"slack": 5, "survived": False}]
        acc, n = A.score(rows, 0)
        self.assertEqual(n, 3)
        self.assertAlmostEqual(acc, 2 / 3)

    def test_a_perfectly_separable_set_is_found_by_the_grid(self):
        rows = [{"slack": s, "survived": s >= 3} for s in range(-6, 12)]
        self.assertEqual(A.best_threshold(rows), 3)
        self.assertAlmostEqual(A.score(rows, 3)[0], 1.0)


class TestNoLeakage(unittest.TestCase):

    def test_the_threshold_is_fitted_on_train_and_never_on_test(self):
        """THE LEAKAGE CONTROL. Draft A and draft B want OPPOSITE thresholds. Held out properly,
        each fold is scored with the other's threshold and does badly. If lodo() ever fitted on
        the test fold it would score ~1.0 here, and this test would catch it."""
        A_rows = [{"slack": s, "survived": s >= 8, "draft": "A"} for s in range(-6, 13)]
        B_rows = [{"slack": s, "survived": s >= -5, "draft": "B"} for s in range(-6, 13)]
        model, base, naive, beating, nfolds, n = A.lodo(A_rows + B_rows)
        self.assertEqual(nfolds, 2)
        best_possible = max(A.score(A_rows + B_rows, t)[0] for t in A.GRID)
        self.assertLess(model, best_possible,
                        "held-out score must be worse than fitting on everything")
        self.assertLess(model, 0.75, "opposite-signed folds cannot both be fitted")


class TestTheShippedCalibration(unittest.TestCase):
    """The artifact the engine would gate on. It exists; it must say SILENT until measured
    otherwise, because a gap that speaks without evidence is a fabricated number with a label."""

    PATH = os.path.join(ROOT, "draft-kit", "availability_calibration.json")

    def setUp(self):
        if not os.path.exists(self.PATH):
            self.skipTest("calibration not built -- run scripts/availability.py")
        with open(self.PATH, encoding="utf-8") as f:
            self.cal = json.load(f)

    def test_every_gap_carries_its_own_evidence(self):
        for gap, row in self.cal["by_gap"].items():
            self.assertIn("eight_team_edge", row, f"gap {gap} has no 8-team evidence field")
            self.assertIn("speak", row)

    def test_nothing_speaks_without_a_measured_eight_team_edge(self):
        """NaN-safe by construction: an unmeasured gap must never render a call."""
        for gap, row in self.cal["by_gap"].items():
            if row["speak"]:
                self.assertIsNotNone(row["eight_team_edge"], f"gap {gap} speaks unmeasured")
                self.assertGreaterEqual(row["eight_team_edge"], self.cal["min_edge"])

    def test_the_negative_result_is_recorded_not_rounded_away(self):
        """As of 2026-08-17 every gap is SILENT. This test is not pinning that forever -- it
        pins that the file still carries the 8-team numbers that justify whatever it says."""
        for gap, row in self.cal["by_gap"].items():
            if not row["speak"]:
                self.assertTrue(row["eight_team_edge"] is None
                                or row["eight_team_edge"] < self.cal["min_edge"],
                                f"gap {gap} is silent but its evidence says it should speak")


if __name__ == "__main__":
    unittest.main(verbosity=2)

"""scripts/replay_mock.py -- the deterministic gate the lineup-delta queue shipped through.

The fixture is the REAL 2026-08-19 executor mock (120 picks, seat 5). These tests pin the three
claims the feature rests on, insight-024 style: the replay must reproduce reality before its
counterfactual counts, the challenger must win on the recorded room, and the win must be
STRUCTURAL (slots filled, K/DEF deferred) -- not just a bigger number.
"""
import json
import os
import sys
import unittest
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import replay_mock as RM  # noqa: E402
import lineup_value as LV  # noqa: E402

#: What seat 5 ACTUALLY drafted with its first ten picks on 2026-08-19, firing queue-top live.
#: The replay's naive arm plays the same doctrine against the same room, so it must land the
#: same ten players -- if it does not, the replay is broken and proves nothing about anything.
ACTUAL_FIRST_10 = ["Ja'Marr Chase", "Drake London", "Nico Collins", "Chris Olave",
                   "DeVonta Smith", "Garrett Wilson", "Drake Maye", "Mike Evans",
                   "Carnell Tate", "Parker Washington"]

#: The BOARD THAT DROVE THAT DRAFT -- the 2026-08-14 synthesis, frozen from git commit 5d091f98.
#: The live drafter fired queue-top off THIS ordering, so fidelity is only checkable against it:
#: the 2026-08-21 re-rank flipped Parker Washington past Carnell Tate and the fidelity test broke
#: on the first refresh after this gate was born (2026-08-23) -- correctly reporting that the
#: LIVE board no longer matches history, which is not what the test asks. This is a FIXTURE with
#: a reader, not the dead date-stamped archive board_diff.py's header banned: that copy had zero
#: readers and drifted; this one is load-bearing input to a recorded event, like the picks file
#: beside it. The PROPERTY tests below (delta beats naive, slots filled, K/DEF deferred) stay on
#: the live board on purpose -- they are claims about every refresh, not about 08-19.
BOARD_AS_DRAFTED = os.path.join(ROOT, "tests", "fixtures", "board_as_drafted_20260819.json")


def _arms():
    with open(RM.FIXTURE, encoding="utf-8") as f:
        picks = json.load(f)
    board, curve = RM.load_board()
    starters, flex = dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS
    out = {}
    for arm in ("naive", "delta"):
        rows, log = RM.replay(picks, board, curve, 5, arm, starters, flex)
        out[arm] = (rows, log, RM.score(rows, starters, flex))
    return out


class TestTheReplayGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.arms = _arms()

    def test_the_naive_arm_reproduces_the_real_draft(self):
        """FIDELITY FIRST: a counterfactual from a replay that cannot reproduce the factual is
        insight 024's broken-simulator shape. Queue-top live == queue-top replayed, ten for ten
        -- against the board AS IT WAS when the live queue fired (see BOARD_AS_DRAFTED)."""
        with open(RM.FIXTURE, encoding="utf-8") as f:
            picks = json.load(f)
        with open(BOARD_AS_DRAFTED, encoding="utf-8") as f:
            board = json.load(f)
        _, curve = RM.load_board()      # scoring only; fidelity asserts NAMES, picked by rank
        _, log = RM.replay(picks, board, curve, 5, "naive",
                           dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS)
        self.assertEqual([n for _, n in log[:10]], ACTUAL_FIRST_10)

    def test_both_arms_draft_a_full_fifteen(self):
        for arm, (rows, _, _) in self.arms.items():
            self.assertEqual(len(rows), 15, arm)

    def test_the_delta_arm_beats_the_naive_arm_on_startable_vorp(self):
        """The headline: +391.8 on the recorded room when this shipped. Pinned as > with margin,
        not as the exact float -- the board's numbers move at every refresh and the property,
        not the digit, is the contract. ONE room, fixed opponents: a structural reading, never
        a win-rate claim (twelve held-out seasons could not resolve that; one mock cannot)."""
        (naive_lineup, _), (delta_lineup, _) = self.arms["naive"][2], self.arms["delta"][2]
        self.assertGreater(delta_lineup, naive_lineup + 100.0)

    def test_the_delta_arm_fills_every_mandated_slot(self):
        """What the naive arm measurably cannot do without a human: zero RB, K and DEF, five
        quarterbacks. The forcing arithmetic is the fix and this is its pin."""
        rows, _, _ = self.arms["delta"]
        counts = Counter(r["pos"] for r in rows)
        for pos, n in LV.LIVE_STARTERS.items():
            self.assertGreaterEqual(counts[pos], n, f"{pos} starters unfilled")

    def test_kdef_are_deferred_to_the_last_two_picks(self):
        """Their vorp is flat within a tier, so their delta cannot decay while every bench body's
        upside does -- taking a DEF at pick #69 (which the un-deferred version measurably did) is
        an instant human override, the exact failure this feature exists to end."""
        rows, _, _ = self.arms["delta"]
        self.assertEqual(sorted(r["pos"] for r in rows[-2:]), ["DEF", "K"])
        self.assertTrue(all(r["pos"] not in ("K", "DEF") for r in rows[:-2]))


if __name__ == "__main__":
    unittest.main()

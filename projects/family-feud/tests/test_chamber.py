"""scripts/chamber.py -- the torture chamber's own D4 controls, pinned as tests.

The chamber is an INSTRUMENT, and an instrument that is not pinned drifts (insight 013). Each
test pins one of the proofs the chamber must re-pass before any battery result is readable; if
one goes red, no chamber finding is trustworthy until it is green again.
"""
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import chamber  # noqa: E402
import lineup_value as LV  # noqa: E402


def _run(fn, *a, **kw):
    buf = io.StringIO()
    with redirect_stdout(buf):
        rc = fn(*a, **kw)
    return rc, buf.getvalue()


class Control030(unittest.TestCase):
    def test_reproduces_to_the_decimal(self):
        """H1: FastPolicy must match replay_mock pick-for-pick on the recorded room and land
        lineup 1087.2 exactly. If this diverges, the chamber's policy is NOT the shipping
        policy and nothing else in this file means anything."""
        rc, out = _run(chamber.control_030)
        self.assertEqual(rc, 0, out)
        self.assertIn("MATCH", out)
        self.assertIn("1087.2", out)


class ControlClosedForm(unittest.TestCase):
    def test_deterministic_room_matches_independent_walk(self):
        """H2 (insight 021's law): the no-noise room must match the independent walk exactly,
        land PASS, and fill every mandated slot."""
        rc, out = _run(chamber.control_closed_form)
        self.assertEqual(rc, 0, out)
        self.assertIn("MATCH", out)


class ControlMutants(unittest.TestCase):
    def test_hard_set_is_caught(self):
        """H3: forcing-removed, board-order-queue and window-removed must each be CAUGHT.
        rebuild-1 is reported, not gated -- uncatchable on a zero-inversion board (catalog
        C2a); if the board ever grows an inversion this output flips to 4/4, which is fine."""
        rc, out = _run(chamber.control_mutants)
        self.assertEqual(rc, 0, out)
        self.assertIn("hard set PASS", out)
        for name in ("forcing-removed", "board-order-queue", "window-removed"):
            line = next(l for l in out.splitlines() if name in l)
            self.assertIn("CAUGHT", line)


class MetadataSplitBrain(unittest.TestCase):
    def test_room_generator_stamps_metadata(self):
        """H7/B8, the generator half: every synthetic pick carries populated metadata. Empty
        metadata leaves the engine's lineup math intact while corrupting must_fill to
        {'?': N} -- forcing then fires rounds early with K/DEF in the rebuild (measured live
        2026-08-20)."""
        board, curve = chamber.load_board()
        room = chamber.Room(board, curve, {}, my_slot=3)
        row = sorted(board["players"], key=lambda r: r["r"])[0]
        room.take(3, row)
        md = room.picks[0]["metadata"]
        self.assertEqual(md["position"], row["pos"])
        self.assertEqual(f"{md['first_name']} {md['last_name']}".strip(), row["name"])
        self.assertTrue(room.picks[0]["draft_id"])
        self.assertTrue(room.picks[0]["player_id"])

    def test_split_brain_is_real_in_the_engine(self):
        """B8's engine half, demonstrated: the same 64-pick state with and without metadata.
        Without it the deltas block goes forced early and K/DEF enter it; with it, skill only
        at this state. If the 'without' arm ever stops failing that way, the engine has grown
        a defense for B8 -- update the catalog before touching this test."""
        board, curve = chamber.load_board()
        ordering = sorted(board["players"], key=lambda r: r["r"])
        seats = {s: chamber.bot_board(0, ordering) for s in range(1, 9) if s != 1}
        pol = chamber.FastPolicy(board, curve, dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS, 16)
        room = chamber.Room(board, curve, seats, my_slot=1, teams=8, rounds=16,
                            draft_id="b8test")
        while len(room.picks) < 64:                 # to just before our 9th pick (#65, seat 1)
            no = len(room.picks) + 1
            slot = chamber.slot_for_pick(no, 8)
            row = pol.choose(room) if slot == 1 else seats[slot](room, slot)
            room.take(slot, row)

        by_name = {r["name"]: r["pos"] for r in board["players"]}

        def deltas_positions(picks):
            real = chamber.RealPolicy(8, 16, draft_id="b8test")
            try:
                with open(os.path.join(real.work, "picks.json"), "w",
                          encoding="utf-8") as f:
                    json.dump(picks, f, ensure_ascii=False)
                env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
                p = subprocess.run(
                    [sys.executable, real.engine, "1", "8", "16", "b8test"],
                    cwd=real.work, capture_output=True, text=True,
                    encoding="utf-8", env=env, timeout=120)
                self.assertEqual(p.returncode, 0,
                                 (p.stdout or "")[-500:] + (p.stderr or "")[-500:])
                names = [n for _, n in chamber.parse_lineup_deltas(p.stdout)]
                return [by_name.get(n, "?") for n in names]
            finally:
                real.close()

        healthy = deltas_positions(room.picks)
        broken = deltas_positions([dict(pk, metadata={}) for pk in room.picks])
        self.assertFalse(any(p in ("K", "DEF") for p in healthy), healthy)
        self.assertTrue(any(p in ("K", "DEF") for p in broken), broken)


class Equivalence(unittest.TestCase):
    def test_one_room_fast_equals_real(self):
        """G1/U3: fast path == real engine at every our-pick state of one ensemble room. The
        full license ran wider (416 states, 26 rooms, 2026-08-20); this pin keeps the two
        runtimes from drifting apart unnoticed -- the market.py/consensus.py failure shape."""
        rc, out = _run(chamber.equivalence, 1, 6.0, 3)
        self.assertEqual(rc, 0, out)
        self.assertIn("0 divergence", out)


class BatterySandbox(unittest.TestCase):
    def test_sandbox_and_accounting(self):
        """D7 + H4: a battery run writes NOTHING outside its --report path, and PASS/FINDING/
        INFEASIBLE counts sum to rooms generated -- no silent drops. The D6 line prints on
        every run so no finding is quietly acted on before its Phase 3 verification."""
        state_dir = os.path.join(ROOT, "newsletter", "data", "state")
        before = {f: os.path.getmtime(os.path.join(state_dir, f))
                  for f in os.listdir(state_dir)}
        with tempfile.TemporaryDirectory() as td:
            report = os.path.join(td, "report.json")
            rc, out = _run(chamber.battery, 11, 2, report)
            self.assertEqual(rc, 0, out)
            with open(report, encoding="utf-8") as f:
                doc = json.load(f)
        after = {f: os.path.getmtime(os.path.join(state_dir, f))
                 for f in os.listdir(state_dir)}
        self.assertEqual(before, after, "the battery touched the war-room state dir")
        self.assertEqual(sum(doc["counts"].values()), doc["rooms"])
        self.assertIn("owe Phase 3", out)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Tests for draft_engine.py's unmatched-pick reporting.

    python3 -m unittest discover -s tests -v        (from the project root)

The engine is a script that does its work at import time, so these drive it as a subprocess in a
throwaway cwd holding its two literal-named inputs. Nothing here can touch the real draft-kit.

WHY THE MATCHING RULE IS (team, pos) AND NOT NAME SIMILARITY -- measured, not assumed:
  false-positive floor  0.800  Javonte Williams vs Jameson Williams   (different men)
  true-positive floor   0.370  Hollywood Brown  vs Marquise Brown     (same man)
The floors are inverted, so no similarity threshold can separate them. Sleeper supplies team and
position on every pick and neither drifts the way a rendered name does, so candidates come from
the (team, pos) bucket instead. Measured on the 120-pick lab feed: 0 false candidates.
"""
import json, os, subprocess, sys, tempfile, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, "draft-kit", "draft_engine.py")
REAL_BOARD = os.path.join(ROOT, "draft-kit", "players_data.json")


def row(r, name, pos, team, pr, tier=1, badges=None, vorp=10.0, vbd_rank=None, note="n"):
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": pr, "tier": tier,
            "badges": badges if badges is not None else [], "note": note,
            "vorp": vorp, "vbdRank": vbd_rank if vbd_rank is not None else r,
            "vbdDelta": r - (vbd_rank if vbd_rank is not None else r)}


def board(players):
    return {"meta": {"updated": "2026-08-05", "badges": {}}, "players": players,
            "dst": [], "strategy": {}}


def pick(no, first, last, pos, team, slot=None):
    return {"pick_no": no, "draft_id": "1", "draft_slot": slot or ((no - 1) % 8 + 1),
            "round": (no - 1) // 8 + 1, "player_id": str(no), "picked_by": "u",
            "roster_id": 1, "is_keeper": None,
            "metadata": {"first_name": first, "last_name": last, "position": pos, "team": team}}


class EngineCase(unittest.TestCase):
    def run_engine(self, board_obj, picks, slot=3, teams=8, rounds=16):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, "players_data.json"), "w", encoding="utf-8") as f:
                json.dump(board_obj, f, ensure_ascii=False)
            with open(os.path.join(d, "picks.json"), "w", encoding="utf-8") as f:
                json.dump(picks, f, ensure_ascii=False)
            env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
            p = subprocess.run([sys.executable, ENGINE, str(slot), str(teams), str(rounds)],
                               cwd=d, capture_output=True, text=True, encoding="utf-8", env=env)
            return p.returncode, (p.stdout or "") + (p.stderr or "")

    def real_board(self):
        with open(REAL_BOARD, encoding="utf-8") as f:
            return json.load(f)

    def warning_block(self, out):
        """Everything the engine prints BEFORE the advisory proper. Assertions about the report
        must scope to this -- a board name appears in BEST AVAILABLE whether or not it was
        flagged, so asserting on the whole output passes for the wrong reason."""
        return out.split("BOARD STATE")[0]


class TestWarningNeverKillsTheAdvisory(EngineCase):
    """P1 REGRESSION I INTRODUCED: the unmatched-pick reporter indexed b['pos'] directly, so a
    board row missing 'pos' took down the WHOLE advisory -- where the previous engine printed a
    complete correct one. An advisory that produces nothing because its warning code crashed is
    the worst possible outcome. The board is hand-authored and gets fully re-authored before the
    draft, so this is a loaded gun, not a theoretical one."""

    def _malformed(self, drop):
        rows = [row(1, "Alpha One", "RB", "KC", 1), row(2, "Beta Two", "WR", "SF", 1),
                row(3, "Gamma Three", "TE", "LAR", 1)]
        del rows[1][drop]
        return board(rows)

    def test_drafted_malformed_row_does_not_crash_the_report(self):
        """The actual regression: when the malformed row has already been DRAFTED it never reaches
        the tier-cliff loop, so the previous engine printed a complete advisory -- and only the new
        report code touched it and died. Reported by review; fixed by reading board rows with
        .get() throughout."""
        b = self._malformed("pos")
        code, out = self.run_engine(b, [pick(1, "Beta", "Two", "WR", "SF"),
                                        pick(2, "Nobody", "Atall", "RB", "NYJ")])
        self.assertIn("BOARD STATE", out, f"advisory must survive a drafted malformed row:\n{out}")
        self.assertEqual(code, 0)

    def test_undrafted_malformed_row_fails_loudly_not_silently(self):
        """PRE-EXISTING, verified identical at HEAD and before: an UNDRAFTED row missing 'pos'
        reaches the TIER CLIFFS loop, which indexes p["pos"] directly, and the engine dies. That
        is the project's preferred direction (fail loud, never advise off a broken board) but it
        is a traceback rather than a designed message. Rejecting malformed boards belongs to the
        schema gate, not here -- this test pins the current behaviour so a change is deliberate."""
        code, out = self.run_engine(self._malformed("pos"), [pick(1, "Nobody", "Atall", "RB", "NYJ")])
        self.assertEqual(code, 1, "a malformed board must not produce a confident advisory")
        self.assertNotIn("BEST AVAILABLE", out)

    def test_pick_with_no_metadata_still_advises(self):
        b = board([row(1, "Alpha One", "RB", "KC", 1)])
        pk = pick(1, "x", "y", "RB", "KC")
        del pk["metadata"]
        code, out = self.run_engine(b, [pk])
        self.assertIn("BOARD STATE", out, f"a metadata-less pick must not crash the advisory:\n{out}")


class TestEscalation(EngineCase):
    """Escalate exactly when an UNCLAIMED board row shares the pick's (team, pos)."""

    def test_name_divergence_on_same_team_and_pos_escalates(self):
        """Joe/Joseph -- not in ALIASES, so norm() cannot reconcile it, and the surname survives.
        This is the shape a board rebuild produces."""
        b = board([row(1, "Joseph Burrow", "QB", "CIN", 1), row(2, "Other Guy", "WR", "SF", 1)])
        code, out = self.run_engine(b, [pick(1, "Joe", "Burrow", "QB", "CIN")])
        block = self.warning_block(out)
        self.assertIn("Joseph Burrow", block)
        self.assertIn("STILL", block.upper(), f"must say he is still on the board:\n{block}")

    def test_divergence_on_BOTH_name_axes_is_not_escalated(self):
        """Deliberate boundary: when the first name AND the surname both differ, the only thing
        left is (team, pos) -- which two genuinely different players share routinely (Michael
        Wilson and Marvin Harrison Jr. are both ARI/WR). Escalating there is a wolf-cry. The pick
        is still REPORTED, just not escalated."""
        b = board([row(1, "Marvin Harrison", "WR", "ARI", 1)])
        _, out = self.run_engine(b, [pick(1, "Michael", "Wilson", "WR", "ARI")])
        block = self.warning_block(out)
        self.assertNotIn("STILL", block.upper())
        self.assertIn("Michael Wilson", block, "it must still be reported as unmatched")

    def test_nickname_pairs_that_defeat_name_similarity_are_caught(self):
        """The pairs a 3-char prefix rule silently missed. None share enough string to be caught
        by similarity; all share team and position."""
        for legal, nick_first, nick_last in [
            ("Marquise Brown", "Hollywood", "Brown"),
            ("Cedarian Lamb", "CeeDee", "Lamb"),
            ("Tyshun Samuel", "Deebo", "Samuel"),
            ("Kealoha Nacua", "Puka", "Nacua"),
            ("Rayne Prescott", "Dak", "Prescott"),
        ]:
            with self.subTest(legal=legal):
                b = board([row(1, legal, "WR", "ARI", 1)])
                _, out = self.run_engine(b, [pick(1, nick_first, nick_last, "WR", "ARI")])
                block = self.warning_block(out)
                self.assertIn(legal, block, f"{nick_first} {nick_last} must surface {legal}:\n{block}")

    def test_team_defense_divergence_is_caught(self):
        """All 14 DEF rows were unprotected. Team-defense naming is the most variable field in
        fantasy; the team abbreviation is not."""
        b = board([row(1, "Los Angeles Rams", "DEF", "LAR", 1)])
        _, out = self.run_engine(b, [pick(1, "LA", "Rams", "DEF", "LAR")])
        self.assertIn("Los Angeles Rams", self.warning_block(out))

    def test_already_claimed_row_is_not_a_suspect(self):
        """If the board row was matched by its own pick, it cannot be the missing man."""
        b = board([row(1, "Garrett Wilson", "WR", "NYJ", 1)])
        picks = [pick(1, "Garrett", "Wilson", "WR", "NYJ"), pick(2, "Michael", "Wilson", "WR", "NYJ")]
        _, out = self.run_engine(b, picks)
        block = self.warning_block(out)
        self.assertNotIn("STILL", block.upper(), f"claimed row must not be flagged:\n{block}")

    def test_positive_control_drafted_player_still_on_best_available(self):
        """The end-to-end proof: a divergence leaves a drafted man at the top of BEST AVAILABLE,
        and the engine must say so."""
        b = self.real_board()
        chase = next(p for p in b["players"] if "Chase" in p["name"])
        _, out = self.run_engine(b, [pick(1, "Ja'M", "Chase", chase["pos"], chase["team"])])
        self.assertIn(chase["name"], out.split("BEST AVAILABLE")[1], "he is still being recommended")
        self.assertIn("STILL", out.split("BEST AVAILABLE")[0].upper(), "and the engine must warn")


class TestNoWolfCry(EngineCase):
    """A false alarm on a 120-second clock trains the operator to ignore the real one."""

    def test_real_lab_feed_produces_no_escalation(self):
        b = self.real_board()
        picks = [pick(1, "Michael", "Wilson", "WR", "ARI"), pick(2, "Wan'Dale", "Robinson", "WR", "TEN"),
                 pick(3, "Harrison", "Mevis", "K", "LAR"), pick(4, "Andy", "Borregales", "K", "NE")]
        _, out = self.run_engine(b, picks)
        head = out.split("BOARD STATE")[0]
        self.assertNotIn("STILL", head.upper(), f"the 4 genuine off-board picks must not escalate:\n{head}")

    def test_different_team_same_surname_does_not_escalate(self):
        b = board([row(1, "Jameson Williams", "WR", "DET", 1)])
        _, out = self.run_engine(b, [pick(1, "Javonte", "Williams", "RB", "DAL")])
        self.assertNotIn("STILL", self.warning_block(out).upper())

    def test_no_bare_all_clear_wording(self):
        """'(0 suspicious)' read as an explicit all-clear over the exact case the block exists
        to surface. The report must not reassure."""
        b = board([row(1, "Alpha One", "RB", "KC", 1)])
        _, out = self.run_engine(b, [pick(1, "Nobody", "Atall", "WR", "NYJ")])
        self.assertNotIn("0 suspicious", out)


class TestReportLegibility(EngineCase):
    def test_escalations_are_hoisted_above_noise(self):
        b = board([row(1, "Joseph Burrow", "QB", "CIN", 1)])
        picks = [pick(1, "Noise", "One", "WR", "NYJ"), pick(2, "Noise", "Two", "TE", "NYG"),
                 pick(3, "Joe", "Burrow", "QB", "CIN")]
        _, out = self.run_engine(b, picks)
        block = self.warning_block(out)
        self.assertLess(block.index("Joseph Burrow"), block.index("Noise Two"),
                        "the escalation must not be buried in pick order below the noise")

    def test_escalation_glyph_differs_from_the_cliff_glyph(self):
        """U+26A0 means 'take this man now' on the TIER CLIFFS line. Reusing it for 'the advisory
        below may be wrong' collides the two most important signals in the output."""
        b = board([row(1, "Joseph Burrow", "QB", "CIN", 1)])
        _, out = self.run_engine(b, [pick(1, "Joe", "Burrow", "QB", "CIN")])
        self.assertNotIn("⚠", self.warning_block(out), "escalation must not reuse the CLIFF glyph")


class TestNoRegression(EngineCase):
    """The integrity gate is deliberately defensive and predates this work."""

    def test_gate_still_fires_on_interior_gap(self):
        b = board([row(i, f"P{i} L{i}", "RB", "KC", i) for i in range(1, 6)])
        code, out = self.run_engine(b, [pick(1, "A", "B", "RB", "KC"), pick(3, "C", "D", "RB", "KC")])
        self.assertEqual(code, 1)
        self.assertIn("MISSING pick(s): [2]", out)

    def test_gate_still_fires_on_duplicate(self):
        b = board([row(i, f"P{i} L{i}", "RB", "KC", i) for i in range(1, 6)])
        code, out = self.run_engine(b, [pick(1, "A", "B", "RB", "KC"), pick(1, "A", "B", "RB", "KC")])
        self.assertEqual(code, 1)
        self.assertIn("DUPLICATE", out)

    def test_empty_picks_still_advises(self):
        code, out = self.run_engine(self.real_board(), [])
        self.assertEqual(code, 0)
        self.assertIn("BEST AVAILABLE", out)

    def test_real_board_16_rounds_runs_clean(self):
        code, out = self.run_engine(self.real_board(), [pick(1, "Ja'Marr", "Chase", "WR", "CIN")], rounds=16)
        self.assertEqual(code, 0)
        self.assertIn("YOUR next pick", out)


if __name__ == "__main__":
    unittest.main(verbosity=2)

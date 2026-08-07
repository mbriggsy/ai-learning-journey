#!/usr/bin/env python3
"""Tests for scripts/merge_picks.py -- the draft-day contamination guard.

    python3 -m unittest discover -s tests -v        (from the project root)

Why these exist: the guard was hand-verified in a scratch directory and the results were written
into a commit message. That is a claim, not a verification -- and it is exactly how the picks.json
== null case, which the plan named as an acceptance criterion, shipped unmet. Everything the guard
promises is encoded here so it re-runs.

No network. fetch() is monkeypatched; the module's PICKS/KIT paths are redirected into a tmpdir,
so a test can never touch the real draft-kit/picks.json. That file existing IS the bug under test.
"""
import io, json, os, sys, tempfile, unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
import merge_picks  # noqa: E402

REAL = "1390509994847240192"    # the real league draft
MOCK = "1390923383440424960"    # the spent lab mock -- the poison in every contamination test


def pick(no, draft_id=REAL, first="Player", last=f"X", pos="RB", slot=1):
    return {"pick_no": no, "draft_id": draft_id, "draft_slot": slot, "round": (no - 1) // 8 + 1,
            "player_id": str(1000 + no), "picked_by": "u", "roster_id": slot, "is_keeper": None,
            "metadata": {"first_name": first, "last_name": f"{last}{no}", "position": pos, "team": "KC"}}


def picks(n, draft_id=REAL, start=1):
    return [pick(i, draft_id) for i in range(start, start + n)]


class MergeCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.kit = os.path.join(self.tmp.name, "draft-kit")
        os.makedirs(self.kit)
        self.picks_path = os.path.join(self.kit, "picks.json")
        self._kit, self._picks = merge_picks.KIT, merge_picks.PICKS
        merge_picks.KIT, merge_picks.PICKS = self.kit, self.picks_path

    def tearDown(self):
        merge_picks.KIT, merge_picks.PICKS = self._kit, self._picks
        self.tmp.cleanup()

    def write(self, obj):
        with open(self.picks_path, "w", encoding="utf-8") as f:
            json.dump(obj, f)

    def on_disk(self):
        if not os.path.exists(self.picks_path):
            return None
        with open(self.picks_path, encoding="utf-8") as f:
            return json.load(f)

    def run_merge(self, *argv, response=None):
        """Returns (exit_code, stdout). SystemExit is captured, not raised."""
        merge_picks.fetch = lambda d: (response if response is not None else [])
        old = sys.argv
        sys.argv = ["merge_picks.py", *argv]
        buf = io.StringIO()
        try:
            with redirect_stdout(buf):
                code = merge_picks.main()
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
            if isinstance(e.code, str):
                buf.write(e.code)
        finally:
            sys.argv = old
        return code, buf.getvalue()


class TestContaminationGuard(MergeCase):
    """The P0. A spent mock's picks must never merge into a live draft."""

    def test_refuses_foreign_picks_already_on_disk(self):
        self.write(picks(120, MOCK))
        code, out = self.run_merge(REAL, response=[])
        self.assertEqual(code, 2)
        self.assertIn("REFUSING TO MERGE", out)
        self.assertIn(MOCK, out)
        self.assertIn(REAL, out)

    def test_refuses_without_writing(self):
        self.write(picks(120, MOCK))
        self.run_merge(REAL, response=picks(3, REAL))
        disk = self.on_disk()
        self.assertEqual(len(disk), 120, "refused merge must not modify the file")
        self.assertEqual({p["draft_id"] for p in disk}, {MOCK})

    def test_refuses_before_the_network_call(self):
        self.write(picks(10, MOCK))
        def boom(_):
            raise AssertionError("fetch() must not be reached when the file is contaminated")
        merge_picks.fetch = boom
        old, sys.argv = sys.argv, ["merge_picks.py", REAL]
        try:
            with redirect_stdout(io.StringIO()):
                self.assertEqual(merge_picks.main(), 2)
        finally:
            sys.argv = old

    def test_refuses_partial_contamination(self):
        self.write(picks(40, REAL) + picks(20, MOCK, start=41))
        code, out = self.run_merge(REAL)
        self.assertEqual(code, 2)
        self.assertIn(MOCK, out)

    def test_refuses_picks_carrying_no_draft_id(self):
        rows = picks(5, REAL)
        for r in rows:
            del r["draft_id"]
        self.write(rows)
        code, out = self.run_merge(REAL)
        self.assertEqual(code, 2)
        self.assertIn("no draft_id", out)

    def test_refuses_contaminated_api_response(self):
        code, out = self.run_merge(REAL, response=picks(5, MOCK))
        self.assertEqual(code, 2)
        self.assertIn("SLEEPER RESPONSE", out)

    def test_int_draft_id_is_not_a_false_alarm(self):
        rows = picks(5, REAL)
        for r in rows:
            r["draft_id"] = int(REAL)
        self.write(rows)
        code, _ = self.run_merge(REAL, response=[])
        self.assertEqual(code, 0, "draft_id stored as int must compare equal, not trip the alarm")


class TestHappyPath(MergeCase):
    """The guard must not interfere with a normal draft-day cycle."""

    def test_absent_file_merges(self):
        code, _ = self.run_merge(REAL, response=picks(12, REAL))
        self.assertEqual(code, 0)
        self.assertEqual(len(self.on_disk()), 12)

    def test_mid_draft_merge_unions(self):
        self.write(picks(40, REAL))
        code, out = self.run_merge(REAL, response=picks(120, REAL))
        self.assertEqual(code, 0)
        self.assertEqual(len(self.on_disk()), 120)
        self.assertIn("80 new", out)

    def test_short_read_never_deletes(self):
        self.write(picks(120, REAL))
        code, _ = self.run_merge(REAL, response=picks(3, REAL))
        self.assertEqual(code, 0)
        self.assertEqual(len(self.on_disk()), 120, "a truncated response must be a no-op, not a regression")

    def test_gap_is_reported_and_nonzero(self):
        self.write([pick(1), pick(2), pick(4)])
        code, out = self.run_merge(REAL, response=[])
        self.assertEqual(code, 1)
        self.assertIn("MISSING pick(s): [3]", out)


class TestCheckFlag(MergeCase):
    """--check was documented but not implemented. Now it must be honest in BOTH directions."""

    def test_check_does_not_write(self):
        code, _ = self.run_merge(REAL, "--check", response=picks(9, REAL))
        self.assertEqual(code, 0)
        self.assertIsNone(self.on_disk(), "--check must not create picks.json")

    def test_check_before_draft_id_also_works(self):
        code, _ = self.run_merge("--check", REAL, response=picks(9, REAL))
        self.assertEqual(code, 0)
        self.assertIsNone(self.on_disk())

    def test_check_still_refuses_contamination(self):
        self.write(picks(10, MOCK))
        code, _ = self.run_merge(REAL, "--check")
        self.assertEqual(code, 2)

    def test_check_does_not_claim_the_file_is_ready(self):
        """REVIEW FINDING (P2): --check signed off with 'engine will accept this file' about a
        file it deliberately did not write. On a 120-second clock that sign-off is read as
        'you are good to run the engine' -- and the engine then reads the OLD file."""
        _, out = self.run_merge(REAL, "--check", response=picks(9, REAL))
        self.assertNotIn("engine will accept this file", out)
        self.assertIn("not written", out.lower(), "the operator must be told disk is unchanged")

    def test_unknown_flag_is_rejected_not_swallowed(self):
        """REVIEW FINDING (nit): --dry-run / -check were silently ignored AND the run wrote.
        That is the exact belief-mismatch that motivated implementing --check at all."""
        code, out = self.run_merge(REAL, "--dry-run", response=picks(9, REAL))
        self.assertNotEqual(code, 0)
        self.assertIsNone(self.on_disk(), "an unrecognised flag must never fall through to a write")
        self.assertIn("--dry-run", out)


class TestMalformedInput(MergeCase):
    """A bad picks.json must produce the designed message, never a traceback."""

    def test_null_picks_json(self):
        """REVIEW FINDING (P2): named as an acceptance criterion in the plan; did not pass.
        `curl` on a bogus draft id returns the literal string `null`, and the runbook pushes
        curl as the reading tool."""
        self.write(None)
        code, out = self.run_merge(REAL, response=[])
        self.assertNotEqual(code, 0)
        self.assertIn("Move it aside", out)

    def test_dict_picks_json(self):
        self.write({"pick_no": 1})
        code, out = self.run_merge(REAL, response=[])
        self.assertNotEqual(code, 0)
        self.assertIn("Move it aside", out)

    def test_list_of_non_dicts(self):
        self.write([1, 2, 3])
        code, out = self.run_merge(REAL, response=[])
        self.assertNotEqual(code, 0)
        self.assertIn("Move it aside", out)


class TestDraftIdHygiene(MergeCase):
    """REVIEW FINDING (P2): a pasted id with a trailing slash or newline fired the full
    contamination alarm on a clean file -- the loudest possible wrong diagnosis, telling the
    operator to move aside a file that is fine."""

    def test_trailing_slash_is_not_contamination(self):
        self.write(picks(10, REAL))
        code, out = self.run_merge(REAL + "/", response=[])
        self.assertNotEqual(code, 2, f"trailing slash must not read as contamination:\n{out}")

    def test_trailing_whitespace_is_not_contamination(self):
        self.write(picks(10, REAL))
        code, out = self.run_merge(REAL + "\n", response=[])
        self.assertNotEqual(code, 2, f"trailing newline must not read as contamination:\n{out}")


if __name__ == "__main__":
    unittest.main(verbosity=2)

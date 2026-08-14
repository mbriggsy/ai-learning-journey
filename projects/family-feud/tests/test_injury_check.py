#!/usr/bin/env python3
"""scripts/injury_check.py -- board injury prose vs Sleeper's live designations.

The load-bearing test here is `test_a_row_that_does_not_join_is_NOT_counted_as_healthy`. Every
other failure in this file is loud; that one is silent, and silence is what this whole report is
built to break. Insight 008: a broken instrument returns zero, and zero reads like a finding --
"no injuries" and "the join collapsed" produce the identical empty section.

No network. The dump is a fixture; `fetch()` is exercised through its refusal path only.
"""
import gzip
import json
import os
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import injury_check as I  # noqa: E402


def row(r, name, sid, badges=(), note="", pos="RB"):
    return {"r": r, "name": name, "pos": pos, "team": "DET", "tier": 1, "pr": r,
            "sleeperId": sid, "badges": list(badges), "note": note}


BOARD = [
    row(1, "Flagged Both", "11", badges=("I",), note="knee, monitored"),
    row(2, "Board Only", "22", badges=("I",), note="contract hold-in, not practicing"),
    row(3, "Sleeper Only", "33"),
    row(4, "Quiet Man", "44"),
    row(5, "Ghost", "55"),                      # deliberately absent from the dump
]

DUMP = {
    "11": {"injury_status": "Questionable", "injury_body_part": "Knee", "injury_notes": None},
    "22": {"injury_status": None, "injury_body_part": None, "injury_notes": None},
    "33": {"injury_status": "PUP", "injury_body_part": "Achilles", "injury_notes": None},
    "44": {"injury_status": None, "injury_body_part": None, "injury_notes": None},
}


class TestClassification(unittest.TestCase):
    def setUp(self):
        self.blind, self.cleared, self.agree, self.unjoined = I.compare(BOARD, DUMP)

    def test_sleeper_flags_him_and_the_board_is_silent(self):
        self.assertEqual([p["name"] for p, *_ in self.blind], ["Sleeper Only"])

    def test_the_board_flags_him_and_sleeper_does_not(self):
        """Gibbs' real case: an I badge reading "not practicing as of 8/4" against a live status of
        nothing, on the row that had just become RB1."""
        self.assertEqual([p["name"] for p, *_ in self.cleared], ["Board Only"])

    def test_both_agreeing_is_still_reported(self):
        """The body part moves under a note that stays still, so agreement is not silence."""
        self.assertEqual([p["name"] for p, *_ in self.agree], ["Flagged Both"])

    def test_a_healthy_unbadged_row_appears_in_no_bucket(self):
        """The positive control on quiet: without it, a classifier that put everybody somewhere
        would pass every assertion above."""
        named = {p["name"] for p, *_ in self.blind + self.cleared + self.agree}
        named |= {p["name"] for p in self.unjoined}
        self.assertNotIn("Quiet Man", named)

    def test_a_row_that_does_not_join_is_NOT_counted_as_healthy(self):
        """🚨 THE ONE THAT MATTERS. An unjoined row has NO injury information, which is a different
        thing from having none. Bucketing it as healthy would let a collapsed join -- a changed id,
        a dump that came back thin -- render as a clean bill of health for the whole board, and
        the report would look exactly the same as a genuinely quiet week."""
        self.assertEqual([p["name"] for p in self.unjoined], ["Ghost"])
        for bucket in (self.blind, self.cleared, self.agree):
            self.assertNotIn("Ghost", [p["name"] for p, *_ in bucket])

    def test_every_row_is_accounted_for_exactly_once(self):
        seen = [p["name"] for p, *_ in self.blind + self.cleared + self.agree]
        seen += [p["name"] for p in self.unjoined]
        seen += ["Quiet Man"]
        self.assertEqual(sorted(seen), sorted(p["name"] for p in BOARD))

    def test_the_report_SAYS_when_a_row_did_not_join(self):
        """Call site, insight 013: compare() returning `unjoined` proves nothing about whether the
        operator is told. Deleting the [!] block leaves every test above green."""
        text = I.report(BOARD, DUMP)
        self.assertIn("did not join", text)
        self.assertIn("Ghost", text)
        self.assertIn("NOT counted as", text)

    def test_the_report_refuses_to_oversell_injury_status(self):
        """August `injury_status` is a practice-report artifact -- 27 of our 174 carried
        "Questionable" on 2026-08-14. A report that presented it as a game-day call would send
        somebody past a healthy round-1 back."""
        text = I.report(BOARD, DUMP)
        self.assertIn("PRACTICE-REPORT artifact", text)
        self.assertIn("nothing here feeds a rank", text)

    def test_the_report_says_a_BLANK_status_is_not_proof_of_health(self):
        """The Gibbs case is a contract hold-in, which never appears in this field at all."""
        self.assertIn("NOT proof of health", I.report(BOARD, DUMP))


class TestTheCacheCannotBeClobberedByABadResponse(unittest.TestCase):
    """The mule learned this the hard way: v1 downloaded straight onto the live file, so a bad
    response destroyed good cargo. This writes to `.incoming` and promotes only on a pass."""

    def test_a_thin_dump_is_REFUSED_rather_than_cached(self):
        calls = {}

        class FakeResp:
            def __init__(self, payload):
                self._p = payload

            def read(self):
                return json.dumps(self._p).encode("utf-8")

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake_urlopen(req, timeout=None):
            calls["url"] = req.full_url
            return FakeResp({"1": {}, "2": {}})       # far under the 5000 floor

        orig = I.urllib.request.urlopen
        I.urllib.request.urlopen = fake_urlopen
        try:
            with tempfile.TemporaryDirectory() as t:
                dest = os.path.join(t, "c.json.gz")
                with gzip.open(dest, "wt", encoding="utf-8") as f:
                    json.dump({"good": "cargo"}, f)
                with self.assertRaises(I.Refuse):
                    I.fetch(dest=dest)
                with gzip.open(dest, "rt", encoding="utf-8") as f:
                    self.assertEqual(json.load(f), {"good": "cargo"},
                                     "a refused fetch overwrote good cargo")
                self.assertFalse(os.path.exists(dest + ".incoming"), "left a temp file behind")
        finally:
            I.urllib.request.urlopen = orig

    def test_the_url_carries_a_cache_buster(self):
        """Insight 020: Sleeper is behind Cloudflare and a stale response is indistinguishable from
        a fresh one at the call site. Every other fetch in this repo busts it."""
        seen = []

        class FakeResp:
            def read(self):
                return json.dumps({str(i): {} for i in range(6000)}).encode("utf-8")

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake_urlopen(req, timeout=None):
            seen.append(req.full_url)
            return FakeResp()

        orig = I.urllib.request.urlopen
        I.urllib.request.urlopen = fake_urlopen
        try:
            with tempfile.TemporaryDirectory() as t:
                I.fetch(dest=os.path.join(t, "c.json.gz"))
                I.fetch(dest=os.path.join(t, "c.json.gz"))
        finally:
            I.urllib.request.urlopen = orig
        self.assertTrue(all("?cb=" in u for u in seen), seen)
        self.assertNotEqual(seen[0], seen[1],
                            "the nonce must be UNIQUE PER CALL -- one fixed at import is just a "
                            "second cache key (insight 020)")


class TestItNeverWritesTheBoard(unittest.TestCase):
    def test_the_source_contains_no_board_write(self):
        """rerank.py's rule: the notes are the one thing on this board a machine has no business
        rephrasing. This file reports and stops."""
        with open(os.path.join(ROOT, "scripts", "injury_check.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertNotIn('open(BOARD, "w"', src)
        self.assertNotIn("json.dump(doc", src)
        self.assertIn("not rewritten by machine", src)


if __name__ == "__main__":
    unittest.main()

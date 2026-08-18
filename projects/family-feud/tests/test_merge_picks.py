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
import io, json, os, sys, tempfile, unittest, urllib.error
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
        # 🚨 `run_merge` monkeypatches the MODULE-LEVEL `fetch`, and for a long time nothing put it
        # back. Every test that ran after the first MergeCase therefore saw a stubbed `fetch`
        # forever -- harmless while nothing tested `fetch` itself, and instantly fatal the moment
        # something did (2026-08-17: eight failures, all of them the leak rather than the code).
        # A fixture that escapes its own test is the same family as the war-room scratch files
        # this repo already sweeps for.
        self._fetch = merge_picks.fetch

    def tearDown(self):
        merge_picks.KIT, merge_picks.PICKS = self._kit, self._picks
        merge_picks.fetch = self._fetch
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
        # The response must cover what is on disk. This test is about int-vs-str draft_id
        # comparison; an empty response would now ALSO trip the vanished-pick guard, and the
        # test would pass or fail for a reason that has nothing to do with its name.
        code, _ = self.run_merge(REAL, response=rows)
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
        """The no-deletion half of this is unchanged and is the point. The EXIT CODE changed.

        It asserted 0 -- so a fetch that returned 3 picks against 120 on disk printed
        "picks.json: 120 picks, highest pick_no 120" and exited clean. The operator sees a
        healthy line and never learns the fetch was garbage: presence read as health, the shape
        that has bitten this project repeatedly. A read that short is an anomaly and now says so.
        """
        self.write(picks(120, REAL))
        code, out = self.run_merge(REAL, response=picks(3, REAL))
        self.assertEqual(len(self.on_disk()), 120,
                         "a truncated response must be a no-op, not a regression")
        self.assertEqual(code, 1, "a fetch returning 3 of 120 picks must not exit clean")
        self.assertIn("VANISHED", out)

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


class TestTheUnionCanNeverShrink(MergeCase):
    """`merged = dict(before); merged.update(incoming)` can only GROW.

    Sleeper's /picks is authoritative and a commissioner can reverse a pick -- an ordinary act.
    When that happens the feed comes back one pick shorter, the union keeps the reversed pick
    forever, and it becomes a PERMANENT PHANTOM: pick_nos stay contiguous so the integrity gate
    passes, the engine counts a player as drafted who is actually available, and picks-until-you
    is off by one for the rest of the draft. `added = len(merged) - len(before)` cannot go
    negative, so the count printed above it never hinted at the loss either.

    We cannot distinguish a reversal from a truncated response, so this does NOT silently choose:
    it keeps the union (losing data is worse), says exactly what disappeared, and exits non-zero.
    --rebuild is the escape hatch once the operator has confirmed which it was.
    """

    def test_a_pick_that_disappears_upstream_is_reported(self):
        self.write(picks(5))
        code, out = self.run_merge(REAL, response=picks(4))
        self.assertEqual(code, 1, "a vanished pick was absorbed silently")
        self.assertIn("5", out)
        self.assertIn("--rebuild", out, "the operator needs the escape hatch named")

    def test_the_phantom_is_kept_not_dropped_by_default(self):
        """Conservative on purpose: a truncated fetch must not cost real picks."""
        self.write(picks(5))
        self.run_merge(REAL, response=picks(4))
        self.assertEqual(len(self.on_disk()), 5, "the default path dropped a pick")

    def test_rebuild_writes_the_feed_verbatim(self):
        self.write(picks(5))
        code, out = self.run_merge(REAL, "--rebuild", response=picks(4))
        self.assertEqual(code, 0, out)
        self.assertEqual([p["pick_no"] for p in self.on_disk()], [1, 2, 3, 4])

    def test_rebuild_still_refuses_a_contaminated_response(self):
        """The escape hatch must not become a way around the contamination gate."""
        self.write(picks(2))
        code, out = self.run_merge(REAL, "--rebuild", response=picks(3, draft_id=MOCK))
        self.assertEqual(code, 2)
        self.assertEqual(len(self.on_disk()), 2, "a poisoned rebuild was written")

    def test_a_normal_growing_fetch_stays_silent(self):
        """Negative control -- the ordinary case must not trip the new guard."""
        self.write(picks(4))
        code, out = self.run_merge(REAL, response=picks(6))
        self.assertEqual(code, 0, out)
        self.assertEqual(len(self.on_disk()), 6)


class TestTheDuplicateGateCouldNeverFire(MergeCase):
    """`picks` is rebuilt from a dict keyed on pick_no, so it cannot contain a duplicate --
    which made `dupes` provably empty and the branch reporting it unreachable.

    Insight 006's shape exactly: a gate that reads as protection, passes forever, and is
    incapable of failing. Worse than absent, because the comment above it claims parity with the
    engine's gate -- and the engine's version CAN fire, since it reads a raw list off disk.
    A duplicate in the FEED was silently destroyed (newest wins) before the gate ever saw it.
    """

    def test_a_duplicate_in_the_incoming_feed_is_reported(self):
        self.write([])
        code, out = self.run_merge(REAL, response=picks(3) + [pick(2)])
        self.assertEqual(code, 1, "a duplicated pick_no was destroyed before the gate saw it")
        self.assertIn("DUPLICATE", out)
        self.assertIn("2", out)

    def test_a_clean_feed_reports_no_duplicate(self):
        """Positive control on the same predicate -- a gate that always fires is not a gate."""
        self.write([])
        code, out = self.run_merge(REAL, response=picks(3))
        self.assertEqual(code, 0, out)
        self.assertNotIn("DUPLICATE", out)


class FakeResponse:
    """Minimal stand-in for what urlopen() yields: a context manager with headers and a body."""

    def __init__(self, body, headers=None):
        self._body = json.dumps(body).encode("utf-8")
        self.headers = _Headers(headers or {})

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return self._body


class _Headers(dict):
    def get(self, k, default=None):          # urllib headers are case-insensitive; mimic that
        for key, val in self.items():
            if key.lower() == k.lower():
                return val
        return default


class TestCacheBusting(unittest.TestCase):
    """The picks feed is Cloudflare-cached and the plain URL is essentially always stale.

    Measured 2026-08-09 on a live 8-team mock draft: the un-busted URL was behind the truth on
    76 of 77 observations, by up to 16 picks, and the cached `pre_draft` body (0 picks) was
    still being served 30+ seconds after the draft began. A stale response is a CONTIGUOUS
    PREFIX, so it passes the gap/duplicate gate and the engine's integrity gate cleanly and then
    names a player who is already gone. Nothing else in the system can catch it.
    """

    def test_the_url_carries_the_draft_id_and_the_right_endpoint(self):
        url = merge_picks.picks_url(REAL)
        self.assertIn(f"/draft/{REAL}/picks", url)
        self.assertTrue(url.startswith("https://api.sleeper.app/v1/"), url)

    def test_two_calls_never_produce_the_same_url(self):
        """A nonce reused is a nonce cached. This is the whole fix."""
        self.assertNotEqual(merge_picks.picks_url(REAL), merge_picks.picks_url(REAL))

    def test_a_thousand_calls_are_all_distinct(self):
        """time_ns alone can repeat on a coarse clock, which is why a counter is in the nonce."""
        seen = {merge_picks.picks_url(REAL) for _ in range(1000)}
        self.assertEqual(len(seen), 1000, "the nonce collided -- the buster is not reliable")

    def test_the_nonce_is_a_query_param_not_part_of_the_path(self):
        url = merge_picks.picks_url(REAL)
        self.assertIn(f"?{merge_picks.CACHE_BUST_PARAM}=", url)
        self.assertEqual(url.count("?"), 1, url)

    # --- CALL SITE (insight 013). The three tests above all stay green if fetch() quietly
    # builds a plain URL of its own, which is precisely how a guard becomes decoration.
    def test_fetch_actually_requests_the_busted_url(self):
        seen = []

        def fake_urlopen(req, timeout=None):
            seen.append(req.full_url)
            return FakeResponse([], {"cf-cache-status": "MISS"})

        real = merge_picks.urllib.request.urlopen
        merge_picks.urllib.request.urlopen = fake_urlopen
        try:
            merge_picks.fetch(REAL)
            merge_picks.fetch(REAL)
        finally:
            merge_picks.urllib.request.urlopen = real
        self.assertEqual(len(seen), 2)
        for url in seen:
            self.assertIn(f"?{merge_picks.CACHE_BUST_PARAM}=", url,
                          "fetch() sent a URL with no cache-buster on it")
        self.assertNotEqual(seen[0], seen[1],
                            "fetch() reused a nonce -- the second call reads the first's cache")

    def _fetch_with_status(self, status):
        # status=None means the header is ABSENT, not present-and-empty -- those are different
        # states and only the absent one models a response that came nowhere near Cloudflare.
        headers = {} if status is None else {"cf-cache-status": status}

        def fake_urlopen(req, timeout=None):
            return FakeResponse([{"pick_no": 1}], headers)

        real = merge_picks.urllib.request.urlopen
        merge_picks.urllib.request.urlopen = fake_urlopen
        buf = io.StringIO()
        try:
            with redirect_stdout(buf):
                body = merge_picks.fetch(REAL)
        finally:
            merge_picks.urllib.request.urlopen = real
        return body, buf.getvalue()

    def test_a_hit_on_a_unique_url_is_reported(self):
        """Only possible if the buster stopped working. Silent would put us back where we were."""
        body, out = self._fetch_with_status("HIT")
        self.assertEqual(len(body), 1, "the body must still be returned; this is a warning")
        self.assertIn("CACHE-BUSTER IS NOT WORKING", out)

    def test_a_miss_says_nothing(self):
        """Positive control: a warning that fires on the healthy path is noise, not a signal."""
        _, out = self._fetch_with_status("MISS")
        self.assertNotIn("CACHE-BUSTER", out)

    def test_a_missing_cache_header_is_not_treated_as_a_hit(self):
        """No header at all means we cannot tell -- and cannot-tell is not the same as broken."""
        _, out = self._fetch_with_status(None)
        self.assertNotIn("CACHE-BUSTER", out)


class TestTheFetchRetriesABlipButNeverAnAnswer(unittest.TestCase):
    """`fetch()` is the FIRST call of every on-clock cycle and had no retry at all: one Sleeper
    blip burned the whole 15s, then the operator re-ran for another 15 -- against a measured worst
    case of 61s of a 120s clock where round trips are 96-98% of the cost (insight 026).

    The budget did NOT grow. `ATTEMPT_TIMEOUTS` sums to the old single timeout, so this buys a
    retry without spending one extra second in the worst case.
    """

    def setUp(self):
        self.calls = []
        self.real_attempt = merge_picks._attempt
        self.addCleanup(setattr, merge_picks, "_attempt", self.real_attempt)

    def stub(self, *outcomes):
        """Each outcome is either an exception to raise or a body to return, in order."""
        def _fake(draft_id, timeout):
            self.calls.append(timeout)
            o = outcomes[len(self.calls) - 1]
            if isinstance(o, Exception):
                raise o
            return o, "MISS"
        merge_picks._attempt = _fake

    def run_fetch(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            out = merge_picks.fetch(REAL)
        return out, buf.getvalue()

    def test_the_total_budget_did_not_grow(self):
        """The control that keeps this a free win. If someone 'improves' this by adding a third
        attempt at the same timeouts, the worst case silently doubles on a 120-second clock."""
        self.assertEqual(sum(merge_picks.ATTEMPT_TIMEOUTS), merge_picks.TIMEOUT)
        self.assertEqual(merge_picks.TIMEOUT, 15)

    def test_a_blip_is_retried_and_the_second_attempt_wins(self):
        self.stub(TimeoutError("timed out"), [{"pick_no": 1}])
        out, printed = self.run_fetch()
        self.assertEqual(out, [{"pick_no": 1}])
        self.assertEqual(len(self.calls), 2)

    def test_the_retry_is_ANNOUNCED(self):
        """A retry that hides a flaky network lets the operator believe the room is quiet when the
        fetch is failing -- and '0 new this fetch' already looks like calm."""
        self.stub(TimeoutError("timed out"), [])
        _, printed = self.run_fetch()
        self.assertIn("fetch attempt 1 failed", printed)
        self.assertIn("fresh nonce", printed)

    def test_the_attempts_escalate_rather_than_splitting_evenly(self):
        """A genuinely slow network must not be turned into a hard failure by slicing the budget
        into pieces too small to succeed in."""
        self.stub(TimeoutError("x"), [])
        self.run_fetch()
        self.assertEqual(self.calls, [5, 10])
        self.assertLess(self.calls[0], self.calls[1])

    def test_a_404_is_an_ANSWER_and_is_not_retried(self):
        """The draft is gone -- probably re-created. Retrying wastes clock AND delays the operator
        learning something they must act on."""
        # fp must be a real file object: HTTPError is closeable, and passing None makes it
        # emit a ResourceWarning when it is collected, which is noise in a clean suite.
        err = urllib.error.HTTPError(REAL, 404, "Not Found", {}, io.BytesIO(b""))
        self.addCleanup(err.close)
        self.stub(err, [{"pick_no": 1}])
        with self.assertRaises(urllib.error.HTTPError):
            self.run_fetch()
        self.assertEqual(len(self.calls), 1, "a 404 must not consume the retry")

    def test_a_500_IS_retried(self):
        """The paired control on the line above: 5xx is the network, not an answer."""
        err = urllib.error.HTTPError(REAL, 503, "Service Unavailable", {}, io.BytesIO(b""))
        self.addCleanup(err.close)
        self.stub(err, [{"pick_no": 1}])
        out, _ = self.run_fetch()
        self.assertEqual(out, [{"pick_no": 1}])
        self.assertEqual(len(self.calls), 2)

    def test_a_truncated_body_is_transient_and_is_retried(self):
        self.stub(json.JSONDecodeError("Expecting value", "", 0), [{"pick_no": 1}])
        out, _ = self.run_fetch()
        self.assertEqual(len(self.calls), 2)

    def test_both_attempts_failing_still_raises_so_the_caller_refuses(self):
        """merge_picks' own handler turns this into 'picks.json left untouched -- retry, do not
        advise off stale state', which is the correct end state and must survive."""
        self.stub(TimeoutError("a"), TimeoutError("b"))
        with self.assertRaises(TimeoutError):
            self.run_fetch()
        self.assertEqual(len(self.calls), 2)

    def test_EVERY_ATTEMPT_GETS_A_FRESH_NONCE(self):
        """🚨 THE ONE THAT MAKES THE RETRY SAFE RATHER THAN HARMFUL.

        Sleeper serves /picks through Cloudflare. If both attempts reused one URL, the retry would
        be a second request against the SAME cache key -- insight 020's exact defect ("a nonce
        fixed at startup is just a second cache key"), which measured the un-busted URL behind on
        76 of 77 observations by up to 16 picks. A retry that re-asks the same cache is not a
        retry; it is a second chance to be told the same stale thing, on a clock, with more
        confidence."""
        seen = []
        real_url = merge_picks.picks_url

        def spy(draft_id):
            u = real_url(draft_id)
            seen.append(u)
            raise TimeoutError("forced")        # fail every attempt so both URLs get built

        merge_picks.picks_url = spy
        self.addCleanup(setattr, merge_picks, "picks_url", real_url)
        merge_picks._attempt = self.real_attempt        # exercise the REAL attempt path
        with self.assertRaises(TimeoutError):
            with redirect_stdout(io.StringIO()):
                merge_picks.fetch(REAL)
        self.assertEqual(len(seen), 2, "both attempts must build their own URL")
        self.assertNotEqual(seen[0], seen[1], "the retry reused the nonce -- see insight 020")


if __name__ == "__main__":
    unittest.main(verbosity=2)

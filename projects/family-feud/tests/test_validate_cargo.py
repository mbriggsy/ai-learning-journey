#!/usr/bin/env python3
"""U10 -- the mule stops reporting green for garbage.

The load-bearing test here is `test_the_ok_prefix_is_a_contract_with_the_watcher`. Everything else
checks that bad payloads are caught; that one checks that GOOD payloads still read as good to
`watch_draft_state.py`, which decides a source failed with `.startswith("ok")`. Break that prefix
and the watcher starts calling healthy cargo broken -- a false red, which insight 009 records as
the more dangerous direction because it teaches the operator to ignore the alert.

Every payload here is synthetic and built in the test, because the mule's inbox is gitignored and
rewritten hourly -- a suite that reads it passes only on the machine the mule runs on. That lesson
cost this project 22 errors and 2 failures once already. The one exception is an explicit
environment probe at the bottom, skipped on a clean clone.
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import validate_cargo as V  # noqa: E402
import watch_draft_state as W  # noqa: E402

INBOX = os.path.join(ROOT, "newsletter", "data", "inbox")

RSS = b"""<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
<item><title>One</title></item><item><title>Two</title></item></channel></rss>"""

ATOM = b"""<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>One</title></entry></feed>"""

EMPTY_FEED = b"""<?xml version="1.0"?><rss version="2.0"><channel><title>T</title></channel></rss>"""

# What nbcsports actually returns: a complete web page, HTTP 200, no items anywhere in it.
HTML_PAGE = b"<!DOCTYPE html><html><head><title>Player News</title></head><body>" + \
            b"<div class='SectionPage'>news</div>" * 200 + b"</body></html>"


class TestFeeds(unittest.TestCase):
    def test_a_real_feed_passes_and_counts_its_items(self):
        """The control. Without it every refusal below could pass on a validator that refuses
        everything, which would take the whole wire down and look like working code."""
        ok, summary = V.validate_bytes(RSS, "rss", "application/xml", 200)
        self.assertTrue(ok, summary)
        self.assertIn("2 items", summary)

    def test_an_atom_feed_counts_entries_rather_than_items(self):
        ok, summary = V.validate_bytes(ATOM, "rss", "application/xml", 200)
        self.assertTrue(ok, summary)
        self.assertIn("1 items", summary)

    def test_an_html_page_announcing_itself_as_html_is_refused(self):
        """THE LIVE NBC FAILURE. 793 KB, HTTP 200, and it sailed through `size > 50` every hour
        for days. Content-type is the cheapest guard and catches it before any parsing."""
        ok, summary = V.validate_bytes(HTML_PAGE, "rss", "text/html;charset=UTF-8", 200)
        self.assertFalse(ok)
        self.assertIn("not a feed", summary)

    def test_an_html_page_is_still_refused_when_the_content_type_lies(self):
        """Content-type is a claim, not a fact. A page served as application/xml must still fail
        on the parse, or the guard is only as honest as the server."""
        ok, summary = V.validate_bytes(HTML_PAGE, "rss", "application/xml", 200)
        self.assertFalse(ok)

    def test_valid_xml_carrying_no_items_is_refused(self):
        """A feed with zero items is not a feed. It parses perfectly."""
        ok, summary = V.validate_bytes(EMPTY_FEED, "rss", "application/xml", 200)
        self.assertFalse(ok)
        self.assertIn("zero", summary)

    def test_truncated_xml_is_refused(self):
        ok, _ = V.validate_bytes(RSS[:60], "rss", "application/xml", 200)
        self.assertFalse(ok)

    def test_a_non_200_is_refused_before_anything_else(self):
        """A 404 body is still bytes, and a 404 page is often large and well-formed."""
        ok, summary = V.validate_bytes(RSS, "rss", "application/xml", 404)
        self.assertFalse(ok)
        self.assertIn("404", summary)

    def test_an_empty_response_is_refused(self):
        self.assertFalse(V.validate_bytes(b"", "rss", "application/xml", 200)[0])

    def test_the_safe_parser_is_the_one_in_use(self):
        """These payloads arrive off the public internet; the stdlib parser will follow an entity
        into the filesystem. If defusedxml is missing the validator must REFUSE, never quietly
        fall back."""
        self.assertEqual(V.XML_PARSER, "defusedxml")


class TestJson(unittest.TestCase):
    def test_an_object_and_an_array_both_pass(self):
        self.assertTrue(V.validate_bytes(b'{"a":1}', "json", "application/json", 200)[0])
        self.assertTrue(V.validate_bytes(b'[1,2,3]', "json", "application/json", 200)[0])

    def test_an_empty_array_passes(self):
        """`/picks` on a pre-draft league is legitimately `[]`. Refusing it would make the mule
        cry wolf every hour until the draft starts."""
        ok, summary = V.validate_bytes(b"[]", "json", "application/json", 200)
        self.assertTrue(ok, summary)

    def test_truncated_json_is_refused(self):
        ok, summary = V.validate_bytes(b'{"a": 1, "b"', "json", "application/json", 200)
        self.assertFalse(ok)
        self.assertIn("not valid JSON", summary)

    def test_a_null_body_is_refused(self):
        """Sleeper answers `null` for a draft id that does not exist -- it parses cleanly and means
        the id is wrong. v1 would have recorded that as a healthy fetch and overwritten good cargo
        with it, which is how a re-created draft blinds the watcher."""
        ok, summary = V.validate_bytes(b"null", "json", "application/json", 200)
        self.assertFalse(ok)
        self.assertIn("null", summary)

    def test_a_bare_scalar_is_refused(self):
        self.assertFalse(V.validate_bytes(b"42", "json", "application/json", 200)[0])

    def test_json_is_not_judged_on_content_type(self):
        """Sleeper's content-type is not worth failing over; the parse is the real test."""
        self.assertTrue(V.validate_bytes(b'{"a":1}', "json", "text/plain", 200)[0])


class TestTheWatcherContract(unittest.TestCase):
    def test_the_ok_prefix_is_a_contract_with_the_watcher(self):
        """`watch_draft_state.staleness_reasons` flags any source whose value does not start with
        'ok'. Every passing summary must therefore begin with it, in lowercase."""
        for data, kind, ctype in ((RSS, "rss", "application/xml"),
                                  (ATOM, "rss", "application/xml"),
                                  (b'{"a":1}', "json", "application/json"),
                                  (b"[]", "json", "application/json")):
            ok, summary = V.validate_bytes(data, kind, ctype, 200)
            self.assertTrue(ok, summary)
            self.assertTrue(summary.startswith("ok"),
                            f"the watcher would read this as a failure: {summary!r}")

    def test_every_failure_summary_is_visibly_a_failure_to_the_watcher(self):
        for data, kind, ctype, status in ((HTML_PAGE, "rss", "text/html", 200),
                                          (EMPTY_FEED, "rss", "application/xml", 200),
                                          (b"null", "json", "application/json", 200),
                                          (RSS, "rss", "application/xml", 500)):
            ok, summary = V.validate_bytes(data, kind, ctype, status)
            self.assertFalse(ok)
            self.assertFalse(summary.lower().startswith("ok"), summary)

    def test_the_watcher_actually_flags_a_failed_source(self):
        """The call site, not just the string (insight 013). Feed a synthetic status through the
        watcher's own reasoner and confirm it reports the failure."""
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        status = {"run_at": "2026-08-08 15:29:05", "validation": "status+content-type+parse+items",
                  "sources": {"sleeper_draft": "FAIL: HTTP 500 [kept previous cargo, 9 min old]",
                              "sleeper_users": "ok (1506 bytes, 6 entries)"}}
        with open(os.path.join(tmp, "mule_status.json"), "w", encoding="utf-8") as f:
            json.dump(status, f)
        self.addCleanup(setattr, W, "INBOX", W.INBOX)
        W.INBOX = tmp
        reasons = W.staleness_reasons(5.0, None)
        self.assertTrue(any("sleeper_draft" in r for r in reasons),
                        f"the watcher did not flag the failed source: {reasons}")
        self.assertFalse(any("sleeper_users" in r for r in reasons),
                         f"the watcher flagged a healthy source: {reasons}")


class TestTheFileInterface(unittest.TestCase):
    def test_a_missing_file_is_refused_rather_than_raising(self):
        ok, summary = V.validate_file(os.path.join(tempfile.gettempdir(), "nope.xml"), "rss")
        self.assertFalse(ok)
        self.assertIn("could not read", summary)

    def test_the_cli_exits_nonzero_on_a_bad_payload(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        good, bad = os.path.join(tmp, "g.xml"), os.path.join(tmp, "b.xml")
        with open(good, "wb") as f:
            f.write(RSS)
        with open(bad, "wb") as f:
            f.write(HTML_PAGE)
        # main() prints the summary -- that IS its interface with the mule. Captured rather than
        # left to spray through the suite's output.
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            good_rc = V.main([good, "rss", "--content-type", "application/xml"])
            bad_rc = V.main([bad, "rss", "--content-type", "text/html"])
        self.assertEqual(good_rc, 0)
        self.assertEqual(bad_rc, 1)
        printed = buf.getvalue().splitlines()
        self.assertTrue(printed[0].startswith("ok"), printed)
        self.assertTrue(printed[1].startswith("FAIL"), printed)


class TestTheLivePayloads(unittest.TestCase):
    """ENVIRONMENT probes. Skipped on a clean clone; the inbox is gitignored."""

    # The plan's stated verification -- "run against today's cargo and confirm the NBC source
    # reports FAILED" -- was performed against the real 793,402-byte payload on 2026-08-08 and it
    # failed correctly. There is deliberately no test left behind for it: the source is RETIRED,
    # its payload deleted, so the assertion could only ever skip from here on, and a permanently
    # skipped test reads like coverage while proving nothing. `HTML_PAGE` above carries the shape.

    @unittest.skipUnless(os.path.exists(os.path.join(INBOX, "sleeper_draft.json")),
                         "the mule's cargo is not on this machine")
    def test_the_live_sleeper_cargo_validates(self):
        for name in ("sleeper_draft.json", "sleeper_users.json", "sleeper_league.json"):
            path = os.path.join(INBOX, name)
            if os.path.exists(path):
                ok, summary = V.validate_file(path, "json", "application/json", 200)
                self.assertTrue(ok, f"{name}: {summary}")


if __name__ == "__main__":
    unittest.main()

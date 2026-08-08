#!/usr/bin/env python3
"""U7 -- the live poll loop, guarded at the source.

WHAT THESE TESTS ARE AND ARE NOT. They are structural: they read the emitted board and assert
that specific defects are absent from it. They do NOT prove the loop works -- only a browser can
do that, and it did: the board was served over HTTP, polled a real endpoint holding the committed
120-pick lab feed, and matched **116 rows with 4 picks unmatched**, which is exactly what
`draft_engine.py` reports on the same feed. That replay is the verification. This file exists so
that a later edit cannot quietly reintroduce a trap the browser run would no longer be there to
catch.

Each assertion below is aimed at one named, already-diagnosed failure -- not at coverage.
"""
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, "scripts", "templates", "board.html")
BOARD = os.path.join(ROOT, "draft-kit", "family-feud-draft-board.html")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


class TestPollLoopIsPresent(unittest.TestCase):
    """The control set. Without these, every 'X is absent' test below would pass on a board that
    has no poll loop at all."""

    def test_the_template_and_the_board_both_carry_the_loop(self):
        for path in (TEMPLATE, BOARD):
            src = read(path)
            self.assertIn("async function pollOnce", src, f"no poll loop in {path}")
            self.assertIn("function applyPicks", src, f"no pick application in {path}")

    def test_the_board_exposes_the_live_control(self):
        src = read(BOARD)
        self.assertIn('id="golive"', src)
        self.assertIn('id="livemsg"', src)


class TestTheNamedTraps(unittest.TestCase):
    def test_credentials_are_never_included(self):
        """Sleeper answers with a wildcard origin. Wildcard-origin plus allow-credentials is the
        one pair browsers reject outright, so `credentials: 'include'` does not fail softly -- the
        request never completes and the board never updates."""
        for path in (TEMPLATE, BOARD):
            self.assertNotIn("credentials: 'include'", read(path))
            self.assertNotIn('credentials: "include"', read(path))

    def test_the_request_busts_the_cache(self):
        """A live draft's picks feed returns s-maxage=30, stale-while-revalidate=300. Polling
        every 12s without busting it is served the same stale body and buys nothing at all."""
        src = read(BOARD)
        self.assertIn("cache: 'no-store'", src)
        self.assertRegex(src, r"PICKS_URL \+ '\?_=' \+ Date\.now\(\)")

    def test_polled_picks_never_write_to_the_users_own_toggle(self):
        """THE DUAL-DUTY BUG. `taken` is the operator's manual cross-off. If polled picks landed
        in it, the operator un-crosses somebody and the very next poll re-crosses him -- a control
        that visibly does not work. There must be exactly one writer of `taken`, the click
        handler, and `applyPicks` must not be it."""
        src = read(BOARD)
        self.assertEqual(len(re.findall(r"\btaken\.add\(", src)), 1,
                         "something besides the click handler now writes to `taken`")
        body = src[src.index("function applyPicks"):src.index("function renderLive")]
        for forbidden in ("taken.add(", "taken.delete(", "taken.clear("):
            self.assertNotIn(forbidden, body,
                             f"applyPicks writes to the manual toggle via {forbidden}")
        self.assertIn("drafted.set(", body, "applyPicks does not record picks in `drafted`")

    def test_the_join_tries_the_frozen_id_before_the_name(self):
        """The rendered name is the one field that drifts -- 'J. Gibbs' vs 'Jahmyr Gibbs' left a
        man drafted at pick 1 sitting at #1 on the board. U6 stamped sleeperId onto every row for
        this; U7 is its first reader."""
        src = read(BOARD)
        body = src[src.index("function applyPicks"):src.index("function renderLive")]
        self.assertLess(body.index("BY_ID.get("), body.index("BY_NAME.get("),
                        "the name join is attempted before the frozen id")

    def test_the_name_fallback_uses_the_shared_normalizer(self):
        """KTD-3: the browser and Python normalise by the same generated rules. A hand-rolled
        toLowerCase() here would be a fourth normalizer that agrees with nobody."""
        src = read(BOARD)
        body = src[src.index("function applyPicks"):src.index("function renderLive")]
        self.assertIn("normName(", body)

    def test_the_poll_math_hardcodes_no_league_shape(self):
        """Every count comes from meta.shape. A literal 8 or 16 in here is the KTD-1 defect this
        whole rebuild exists to remove, and it survives a league settings change silently."""
        src = read(BOARD)
        body = src[src.index("const PICKS_URL"):]
        self.assertRegex(body, r"function slotOfPick[\s\S]{0,200}TEAMS")
        self.assertNotRegex(body, r"[^\w](8|16)\s*\)\s*\+\s*1",
                            "the snake arithmetic carries a hardcoded league size")

    def test_the_draft_id_comes_from_the_stamped_shape(self):
        src = read(TEMPLATE)
        self.assertIn("SHAPE.draft_id ? 'https://api.sleeper.app/v1/draft/' + SHAPE.draft_id", src)

    def test_a_failed_poll_keeps_the_last_good_state(self):
        """A dropped connection must never blank a wall board. Verified in the browser by killing
        the server mid-session: 116 rows stayed crossed, 174 rows stayed rendered, and the failure
        was surfaced rather than swallowed."""
        src = read(BOARD)
        body = src[src.index("async function tick"):src.index("function setLive")]
        self.assertIn("lastError", body)
        self.assertNotIn("drafted.clear()", body)
        self.assertIn("Math.min(pollDelay * 2", body)

    def test_the_board_never_ungreys_a_player_on_its_own(self):
        """Putting a drafted man back on a display nobody is auditing is the dangerous direction,
        so a shrinking feed is SURFACED and the rows stay crossed."""
        src = read(BOARD)
        self.assertNotIn("drafted.delete(", src)
        self.assertIn("vanished upstream", src)

    def test_render_all_restores_the_scroll_offset(self):
        """renderPanel() replaces #panel wholesale, and a poll fires on its own schedule. Without
        this the board yanks itself upward while somebody is reading round 9."""
        src = read(BOARD)
        body = src[src.index("function renderAll"):src.index("$('tabs').addEventListener")]
        self.assertIn("window.scrollY", body)
        self.assertIn("window.scrollTo(0, y)", body)

    def test_polling_does_not_start_by_itself_without_being_asked(self):
        """This file gets opened a lot. Reaching the network because a file was opened is a
        surprise; a wall display opts in with ?live=1."""
        src = read(BOARD)
        self.assertIn("get('live') === '1'", src)


class TestTheLiveBarDoesNotDependOnColour(unittest.TestCase):
    def test_every_state_is_carried_by_words(self):
        """Briggsy is colour blind. The pip may only repeat what the text already says."""
        src = read(BOARD)
        for word in ("<b>LIVE</b>", "Polling <b>paused</b>", "poll failed"):
            self.assertIn(word, src)

    def test_the_live_bar_is_hidden_in_print(self):
        self.assertRegex(read(BOARD), r"@media print \{[\s\S]{0,200}\.live \{ display: none")


if __name__ == "__main__":
    unittest.main()

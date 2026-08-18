#!/usr/bin/env python3
"""The five functions that compose HUMAN-READABLE PROSE from `meta.shape`.

    python -m unittest discover -s tests -v        (from the project root)

Why this file exists. `render_html.py` had zero assertions on its own behaviour -- not zero
coverage: `render()` already executes inside four `test_build_board.py` tests, so a KeyError or a
missing placeholder goes red today. What was unpinned is the CONTENT. Every sentence these five
functions build is a claim about the league, derived from the draft object, and read by a human
under a clock to confirm the room is what he thinks it is. That is the KTD-1 shape this repo has
paid for once already: prose generated from the source that quietly stops tracking the source.

Writing them found a live defect. `starters_line` placed FLEX with `parts.insert(4, ...)`, a
hardcoded index correct only while all four of QB/RB/WR/TE are started -- see
`TestFlexGoesAfterTheLastStartedSkillPosition`. It is dormant on this league's shape and fires the
moment the shape changes, which is the one moment anybody reads the line.

⚠️ TWO TRAPS FOR ANYONE EXTENDING THIS FILE, both of which produce tests that assert nothing:
  * `kicker_line` takes the WHOLE SOURCE, not a shape -- it does `source["meta"]["shape"]` itself.
    Handing it a bare shape raises KeyError('meta'), it does not silently pass.
  * `flex` is read in exactly ONE place (`starters_line`). "Feed it a shape with a moved FLEX slot"
    is a no-op for `kicker_line` and `playoff_line`; vary what each one actually reads instead.
"""
import datetime as dt
import json
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import render_html as RH                                                          # noqa: E402

#: The live league, copied field-for-field from `draft-kit/players_data.json`'s `meta.shape` so
#: every control below is the shipping board and not an invention. A fixture that drifts from the
#: real shape is a control that proves nothing.
LIVE_SHAPE = {"draft_id": "1390509994847240192", "season": "2026", "status": "pre_draft",
              "start_time": None, "teams": 8, "rounds": 16, "type": "snake",
              "scoring_type": "ppr", "reversal_round": 0,
              "starters": {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "K": 1, "DEF": 1},
              "flex": 2, "bench": 6, "ir": 2, "playoff_teams": 6}

#: The real `meta.format`, likewise carried rather than paraphrased.
LIVE_FORMAT = "8-team · Full PPR · Snake · 16 rounds · QB/2RB/2WR/TE/2FLEX/K/DEF + 6 BN + 2 IR"


def source(shape=None, **meta):
    """A minimal source blob. `kicker_line` needs the whole thing, not just the shape."""
    m = {"league": "Family Feud", "format": LIVE_FORMAT,
         "shape": dict(LIVE_SHAPE) if shape is None else shape}
    m.update(meta)
    return {"meta": m}


class TestFlexGoesAfterTheLastStartedSkillPosition(unittest.TestCase):
    """🚨 THE DEFECT THIS FILE WAS WRITTEN TO FIND.

    `parts.insert(4, ...)` hardcoded FLEX's position instead of deriving it. Index 4 is correct
    only when QB, RB, WR and TE are ALL started -- which is true of this league and therefore
    hid the bug. Zero out any one of them and the parts ahead of FLEX shrink while the 4 does not.

    Restore the literal 4 and `test_a_zeroed_TE_does_not_strand_FLEX_between_K_and_DEF` goes red
    while the live-shape control stays green -- which is the point: the control alone can never
    catch this."""

    def test_THE_CONTROL_the_live_shape_is_unchanged_by_the_fix(self):
        """The shipping board's line, byte for byte. The fix must not move it."""
        self.assertEqual(RH.starters_line(LIVE_SHAPE),
                         "QB · 2 RB · 2 WR · TE · <b>2 FLEX</b> · K · DEF")

    def test_a_zeroed_TE_does_not_strand_FLEX_between_K_and_DEF(self):
        shape = dict(LIVE_SHAPE, starters={"QB": 1, "RB": 2, "WR": 2, "TE": 0, "K": 1, "DEF": 1})
        self.assertEqual(RH.starters_line(shape),
                         "QB · 2 RB · 2 WR · <b>2 FLEX</b> · K · DEF",
                         "FLEX must follow the last STARTED skill position, not index 4")

    def test_a_zeroed_QB_shifts_FLEX_left_too(self):
        """A second position, because one example can be satisfied by an off-by-one that is still
        wrong. Superflex rooms start 0 QB at this slot and put them all in FLEX."""
        shape = dict(LIVE_SHAPE, starters={"QB": 0, "RB": 2, "WR": 2, "TE": 1, "K": 1, "DEF": 1})
        self.assertEqual(RH.starters_line(shape), "2 RB · 2 WR · TE · <b>2 FLEX</b> · K · DEF")

    def test_flex_leads_when_no_skill_position_is_started(self):
        shape = dict(LIVE_SHAPE, starters={"K": 1, "DEF": 1}, flex=3)
        self.assertEqual(RH.starters_line(shape), "<b>3 FLEX</b> · K · DEF")

    def test_every_skill_position_started_still_puts_FLEX_before_K(self):
        """The upper bound: with all four started FLEX lands at index 4, which is what the old
        literal encoded. Keeping it explicit documents WHY the bug was invisible."""
        shape = dict(LIVE_SHAPE, starters={"QB": 2, "RB": 2, "WR": 3, "TE": 2, "K": 1, "DEF": 1})
        self.assertEqual(RH.starters_line(shape),
                         "2 QB · 2 RB · 3 WR · 2 TE · <b>2 FLEX</b> · K · DEF")


class TestStartersLine(unittest.TestCase):
    def test_one_starter_is_bare_and_more_than_one_is_counted(self):
        shape = {"starters": {"QB": 1, "RB": 3}, "flex": 0}
        self.assertEqual(RH.starters_line(shape), "QB · 3 RB")

    def test_a_zero_is_omitted_entirely_rather_than_printed_as_zero(self):
        shape = {"starters": {"QB": 1, "RB": 0, "WR": 2}, "flex": 0}
        self.assertEqual(RH.starters_line(shape), "QB · 2 WR")

    def test_no_flex_prints_no_flex(self):
        shape = {"starters": {"QB": 1, "RB": 2}, "flex": 0}
        self.assertNotIn("FLEX", RH.starters_line(shape))

    def test_an_empty_shape_is_legal_and_returns_empty(self):
        """Both reads are defensive (`shape.get(...) or {}`), so this must not raise -- the board
        renders a blank roster line rather than failing the whole build."""
        self.assertEqual(RH.starters_line({}), "")


class TestPlayoffLine(unittest.TestCase):
    """Reads `teams` and `playoff_teams` -- NOT `flex`."""

    def test_the_live_shape(self):
        self.assertEqual(RH.playoff_line(LIVE_SHAPE), "6 of 8")

    def test_a_different_league_size_is_carried_through(self):
        self.assertEqual(RH.playoff_line(dict(LIVE_SHAPE, teams=12, playoff_teams=6)), "6 of 12")

    def test_zero_playoff_teams_falls_back_to_the_top_half(self):
        self.assertEqual(RH.playoff_line(dict(LIVE_SHAPE, playoff_teams=0)), "the top half of 8")

    def test_an_ABSENT_playoff_teams_also_falls_back(self):
        shape = {k: v for k, v in LIVE_SHAPE.items() if k != "playoff_teams"}
        self.assertEqual(RH.playoff_line(shape), "the top half of 8")

    def test_teams_is_REQUIRED_and_refuses_rather_than_inventing_a_league_size(self):
        """A missing `teams` must raise, not default to 8. Inventing the league size is exactly
        the class of quiet wrong answer this repo refuses everywhere else."""
        with self.assertRaises(KeyError):
            RH.playoff_line({"playoff_teams": 6})


class TestKickerLine(unittest.TestCase):
    """⚠️ Takes the WHOLE SOURCE. Reads league / teams / format / start_time -- NOT `flex`."""

    def test_a_bare_shape_raises_rather_than_quietly_working(self):
        """Pinning the trap itself, so the next person who writes `kicker_line(shape)` is told."""
        with self.assertRaises(KeyError):
            RH.kicker_line(LIVE_SHAPE)

    def test_the_live_source(self):
        self.assertEqual(RH.kicker_line(source()),
                         "Family Feud · 8-Team · Full PPR · Draft date not set")

    def test_A_HALF_PPR_LEAGUE_IS_NOT_LABELLED_FULL_PPR(self):
        """🚨 THE SECOND DEFECT THIS FILE FOUND, and it is the FLEX bug's twin.

        `kicker_line` decided the label with `"PPR" in str(meta.format)` -- and `"PPR" in
        "Half PPR"` is True, so a half-PPR league got "Full PPR" printed across its board header.
        Meanwhile `shape.format_line()` was doing it correctly one file away, through
        `SCORING_LABEL`, under a comment that says never to invent a label. Two derivations of one
        fact, exactly the duplicate KTD-1 exists to delete."""
        s = source(dict(LIVE_SHAPE, scoring_type="half_ppr"),
                   format="8-team · Half PPR · Snake")
        out = RH.kicker_line(s)
        self.assertIn("Half PPR", out)
        self.assertNotIn("Full PPR", out)

    def test_a_standard_league_reads_standard(self):
        s = source(dict(LIVE_SHAPE, scoring_type="std"), format="8-team · Standard · Snake")
        self.assertIn("Standard", RH.kicker_line(s))

    def test_an_UNKNOWN_scoring_code_reads_custom_scoring_rather_than_guessing(self):
        """The paired refusal. An unlabelled code must never be assumed to be this league's."""
        s = source(dict(LIVE_SHAPE, scoring_type="two_qb_superflex_ppr"))
        self.assertIn("Custom scoring", RH.kicker_line(s))
        self.assertNotIn("Full PPR", RH.kicker_line(s))

    def test_a_missing_scoring_type_reads_custom_scoring(self):
        shape = {k: v for k, v in LIVE_SHAPE.items() if k != "scoring_type"}
        self.assertIn("Custom scoring", RH.kicker_line(source(shape)))

    def test_the_label_ignores_meta_format_entirely(self):
        """The label is a function of the CODE. A hand-edited `meta.format` must not be able to
        relabel the board -- that string is itself derived from the shape."""
        s = source(dict(LIVE_SHAPE, scoring_type="ppr"), format="totally made up prose")
        self.assertIn("Full PPR", RH.kicker_line(s))

    def test_it_agrees_with_shape_format_line_on_every_known_code(self):
        """🚨 THE ANTI-DRIFT PIN. These two surfaces derived the same fact independently and
        disagreed for who knows how long. Assert they agree, so the next edit to either is caught
        by the other rather than shipping a board that contradicts its own header."""
        sys.path.insert(0, os.path.join(ROOT, "scripts"))
        import shape as SH
        for code in SH.SCORING_LABEL:
            with self.subTest(code=code):
                sh = dict(LIVE_SHAPE, scoring_type=code)
                self.assertIn(SH.SCORING_LABEL[code], RH.kicker_line(source(sh)))
                self.assertIn(SH.SCORING_LABEL[code], SH.format_line(sh))

    def test_a_null_start_time_says_so_rather_than_printing_a_remembered_date(self):
        """start_time is null on Sleeper today. A board that printed a date here would be
        asserting a fact the draft object does not carry."""
        self.assertIn("Draft date not set", RH.kicker_line(source()))

    def test_a_real_start_time_is_rendered_from_the_epoch_MILLISECONDS(self):
        """⚠️ The expected string is BUILT with the same call the code uses. `render_html` uses
        `datetime.fromtimestamp`, which is LOCAL time -- a hardcoded literal here would pass on
        this machine and fail in another timezone, which is a test that measures the machine."""
        ms = 1786313864801                       # a real Sleeper start_time, from a committed fixture
        when = dt.datetime.fromtimestamp(ms / 1000)
        s = source(dict(LIVE_SHAPE, start_time=ms))
        self.assertIn(f"Draft {when:%b} {when.day}, {when.year}", RH.kicker_line(s))
        self.assertNotIn("Draft date not set", RH.kicker_line(s))

    def test_the_league_name_comes_from_the_source_not_a_constant(self):
        self.assertIn("Some Other League", RH.kicker_line(source(league="Some Other League")))


class TestDataLine(unittest.TestCase):
    """The `const DATA = ` blob. Its SHAPE is a contract with validate_board's extractor."""

    def test_it_is_exactly_one_line(self):
        """The gate extracts with a non-greedy `.*?` under re.M|re.S, so it stops at the first `}`
        that ends a line -- pretty-printed JSON produces a JSONDecodeError, not a mismatch."""
        self.assertNotIn("\n", RH.data_line(source()))

    def test_it_is_compact_with_no_space_after_the_separators(self):
        out = RH.data_line({"a": 1, "b": 2})
        self.assertEqual(out, '{"a":1,"b":2}')

    def test_non_ascii_survives_rather_than_being_escaped(self):
        """`ensure_ascii=False`. The board carries emoji badge icons and accented player names;
        escaping them would still be valid JSON and would still be wrong on the page."""
        out = RH.data_line({"icon": "⚠️", "name": "Amon-Ra St. Brown"})
        self.assertIn("⚠️", out)
        self.assertNotIn("\\u", out)

    def test_it_round_trips(self):
        s = source()
        self.assertEqual(json.loads(RH.data_line(s)), s)


class TestSynthDate(unittest.TestCase):
    def test_the_human_form(self):
        self.assertEqual(RH.synth_date("2026-08-14"), "Aug 14, 2026")

    def test_a_single_digit_day_is_not_zero_padded(self):
        """`d.day`, not `%d` -- the gate's regex is `\\d+` so both parse, but the board should read
        'Aug 4, 2026' the way a person writes it."""
        self.assertEqual(RH.synth_date("2026-08-04"), "Aug 4, 2026")

    def test_THE_ROUND_TRIP_the_gate_can_parse_back_what_this_emits(self):
        """🚨 THE LOAD-BEARING ONE. `validate_board.py` re-reads this date out of the rendered
        prose with `Rankings synthesized ([A-Z][a-z]+ \\d+, \\d{4})` and compares it to
        `meta.rankings.synthesized`. If this format ever drifts, the gate finds NO date -- and
        'no date at all' is a different, quieter failure than a mismatch."""
        pattern = re.compile(r"^[A-Z][a-z]+ \d+, \d{4}$")
        for iso in ("2026-08-14", "2026-08-04", "2026-01-01", "2026-12-31"):
            with self.subTest(iso=iso):
                self.assertRegex(RH.synth_date(iso), pattern)

    def test_a_non_date_refuses_rather_than_rendering_nonsense(self):
        with self.assertRaises(ValueError):
            RH.synth_date("not-a-date")


if __name__ == "__main__":
    unittest.main(verbosity=2)

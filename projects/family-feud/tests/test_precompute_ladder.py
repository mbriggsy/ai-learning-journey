#!/usr/bin/env python3
"""The ladder precomputer.

MOST OF THIS FILE GUARDS PARSERS AND REFUSALS, and that is deliberate: `precompute_ladder.py`
never re-implements "who is available" or "what is best" -- it shells out to the real engine and
reads its output, so the parsers ARE the trust boundary. A parser that silently reads nothing
returns an empty ladder, and an empty ladder reads like "no good options" rather than like a broken
tool. Every parser test therefore ships a positive control (insight 008).

FOUR TAUTOLOGIES WERE CAUGHT BUILDING THIS, and the fourth cost the file its centrepiece. They are
asserted here so they cannot come back as "improvements":
  * BEST AVAILABLE is `sorted(avail, key=r)[:12]`, so comparing "first name still available" to
    the engine's head compares a quantity to itself. It agreed 495/495 and meant nothing.
  * VBD LEANS is filtered to `vbdDelta >= 8`, so the board-rank leader structurally cannot top it.
  * Uniform sampling gives every pool member the SAME survival rate by construction.
  * THE ENUMERATION ITSELF. Both branched outputs matched their closed forms to the digit
    (330/120/36/8/1 and 0.333/0.091), so 495 engine subprocesses were computing `comb()`. The
    apparatus is gone; `test_the_enumeration_stays_dead` keeps it gone.
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES = os.path.join(ROOT, "tests", "fixtures")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import precompute_ladder as PL  # noqa: E402

FEED = os.path.join(FIXTURES, "lab_feed_120.json")

REAL = """[advising off draft_id 123]
[unverified] cargo on disk is draft 999, this advisory is draft 123 -- cargo IGNORED as an oracle
[checked] my_slot=3 against our own picks
=== BOARD STATE: 18 picks in · next is pick 19 (slot 3 = YOU) ===
YOUR next pick: #19 — 4 picks away

--- TIER CLIFFS (available) ---
RB T3: 1 left — Chase Brown  ⚠ CLIFF
WR T5: 10 left — Nico Collins, George Pickens

--- BEST AVAILABLE (my board) ---
 13 Nico Collins WR9 HOU  · vorp 107 VBD-13
 27 Kenneth Walker III RB11 KC ^! · vorp 125 VBD+8
 30 Lamar Jackson QB2 BAL  · vorp 99

--- LINEUP DELTAS (my roster) ---
  1 Kenneth Walker III RB11 KC  · Δ +125.0
  2 Lamar Jackson QB2 BAL  · Δ +99.0
  3 Nico Collins WR9 HOU  · Δ +0.0, bench — board #13

--- VBD LEANS (value over board rank) ---
vbd  18 (board  26) Josh Allen QB1 · vorp 130
vbd  19 (board  27) Kenneth Walker III RB11 · vorp 125
"""

SEAT_BANNER = """**************************************************************
** my_slot=7 IS UNVERIFIED. No usable draft_order on disk, and no pick in
** picks.json carries our picked_by yet, so nothing here can confirm the seat.
**************************************************************
"""


class TestTheParsersActuallyRead(unittest.TestCase):

    def test_best_available_reads_every_row(self):
        rows = PL.parse_best_available(REAL)
        self.assertEqual(rows, [(13, "Nico Collins"), (27, "Kenneth Walker III"),
                                (30, "Lamar Jackson")])

    def test_a_name_with_a_SUFFIX_survives_the_parse(self):
        """'Kenneth Walker III KC' breaks any parse that assumes the last token is the team --
        and 10 of the board's 174 rows end in a suffix. Measured, not feared."""
        self.assertIn("Kenneth Walker III", [n for _, n in PL.parse_best_available(REAL)])

    def test_it_stops_at_the_next_section(self):
        self.assertNotIn("Josh Allen", [n for _, n in PL.parse_best_available(REAL)])

    def test_best_available_returns_NOTHING_on_output_that_lacks_the_block(self):
        """The negative half of the control: prove it can read zero, so a zero means something."""
        self.assertEqual(PL.parse_best_available("no such section here"), [])

    def test_it_stops_at_the_boundary_even_when_the_NEXT_section_is_numbered(self):
        """Mutant P2 (delete the break) SURVIVED the first pass. The real engine happens to put
        VBD LEANS next and those lines start with the word 'vbd', so a bleeding parser reads
        nothing extra and looks fine. That is luck, not correctness."""
        bled = REAL + "\n--- SOMETHING NUMBERED ---\n 99 Ghost Player WR99 XXX  · vorp 1\n"
        self.assertNotIn("Ghost Player", [n for _, n in PL.parse_best_available(bled)])

    def test_vbd_leans_read_rank_board_and_name(self):
        self.assertEqual(PL.parse_vbd_leans(REAL),
                         [(18, 26, "Josh Allen"), (19, 27, "Kenneth Walker III")])

    def test_cliffs_read_BOTH_the_count_and_the_names(self):
        """The count is every available player in the tier; the names are only the first five.
        The names are what widens the projection pool past BEST AVAILABLE's 12 rows, so losing
        them silently caps the projection at 12 removals -- see the gap-14 test below."""
        self.assertEqual(PL.parse_cliffs(REAL),
                         {"RB T3": (1, ["Chase Brown"]),
                          "WR T5": (10, ["Nico Collins", "George Pickens"])})

    def test_the_cliff_marker_is_not_read_as_a_player(self):
        """'⚠ CLIFF' sits on the same line as the names, after the separator."""
        self.assertNotIn("⚠ CLIFF", PL.parse_cliffs(REAL)["RB T3"][1])

    def test_cliffs_return_NOTHING_when_the_block_is_absent(self):
        self.assertEqual(PL.parse_cliffs("nothing here"), {})

    def test_a_QUIET_tiers_flag_is_not_read_as_two_extra_players(self):
        """🚨 THE ONE THAT SHIPPED. The engine appends ONE of two flags after two spaces --
        `  ⚠ CLIFF`, or `  · thin, none in the top {BEST_N} yet` -- and the quiet one CONTAINS A
        COMMA. The parser stripped only the CLIFF literal, so the other was split as if it were
        names: measured at pick 93 of the lab feed, `K T1: 3 left` produced FOUR names, the third
        being `Cameron Dicker  · thin` and the fourth an invented player, `none in the top 12 yet`.

        All four corrupted tiers were K and DEF -- the positions quiet ALL NIGHT -- and these names
        flow into `candidates`, i.e. into the QUEUE that auto-pick drains on a blown clock, in
        exactly the endgame rounds where the kicker and the defense get taken."""
        quiet = ("--- TIER CLIFFS (available) ---\n"
                 "K T1: 3 left — Brandon Aubrey, Ka'imi Fairbairn, Cameron Dicker"
                 "  · thin, none in the top 12 yet\n")
        got = PL.parse_cliffs(quiet)["K T1"]
        self.assertEqual(got, (3, ["Brandon Aubrey", "Ka'imi Fairbairn", "Cameron Dicker"]))
        self.assertNotIn("none in the top 12 yet", got[1], "the flag was read as a player")

    def test_THE_INVARIANT_names_never_outnumber_the_count(self):
        """The check nobody was making. The COUNT is every available player in the tier; the NAMES
        are the first CLIFF_N=5 of them -- so `len(names) == min(count, 5)` on every tier, always.
        The corruption above broke it on four tiers at once and nothing noticed."""
        both = ("--- TIER CLIFFS (available) ---\n"
                "RB T3: 1 left — Chase Brown  ⚠ CLIFF\n"
                "K T2: 2 left — Cam Little, Jason Myers  · thin, none in the top 12 yet\n"
                "WR T8: 15 left — A Aa, B Bb, C Cc, D Dd, E Ee\n")
        for tier, (count, names) in PL.parse_cliffs(both).items():
            with self.subTest(tier=tier):
                self.assertEqual(len(names), min(count, 5),
                                 f"{tier}: {count} left but {len(names)} names {names}")

    def test_the_fix_survives_the_quiet_text_being_REWORDED(self):
        """Cut on the MARKER, not on either literal. `BEST_N` is a constant that can move and the
        quiet sentence is queued to be reworded -- a fix pinned to 'none in the top 12 yet' would
        silently rot back into the bug."""
        reworded = ("--- TIER CLIFFS (available) ---\n"
                    "K T1: 2 left — Brandon Aubrey, Cam Little"
                    "  · thin, but none of them is among the 20 best players left\n")
        self.assertEqual(PL.parse_cliffs(reworded)["K T1"],
                         (2, ["Brandon Aubrey", "Cam Little"]))

    def test_the_next_pick_line_is_read(self):
        m = PL.NEXT_PICK.search(REAL)
        self.assertEqual((int(m.group(1)), int(m.group(2))), (19, 4))


class TestTheProvenanceChannelsAreNotInterchangeable(unittest.TestCase):
    """A FALSE RED IS THE MORE DANGEROUS DIRECTION (insight 009) -- it teaches the operator to
    skip the gate. The first version of parse_provenance raised the seat alarm on ANY
    `[unverified]` line and cried wolf on a run whose seat the engine had confirmed from our own
    picked_by. That bug was written and caught inside this session; these pin it."""

    def test_an_unverified_NOTE_does_not_raise_the_seat_alarm(self):
        seat, banner, notes, checked = PL.parse_provenance(REAL)
        self.assertFalse(seat, "a cargo note is not a seat failure -- this is the false red")
        self.assertEqual(banner, [])
        self.assertEqual(len(notes), 1)
        self.assertIn("cargo on disk", notes[0])

    def test_the_checked_channel_is_read(self):
        _, _, _, checked = PL.parse_provenance(REAL)
        self.assertEqual(checked, ["my_slot=3 against our own picks"])

    def test_the_STAR_banner_DOES_raise_the_seat_alarm(self):
        """The positive control for the alarm: prove it can fire, or the test above passes on a
        function that always returns False."""
        seat, banner, notes, _ = PL.parse_provenance(SEAT_BANNER)
        self.assertTrue(seat)
        self.assertTrue(any("IS UNVERIFIED" in b for b in banner))
        self.assertEqual(notes, [], "banner lines must not also be echoed as notes")

    def test_the_rule_of_stars_is_not_mistaken_for_a_message(self):
        _, banner, _, _ = PL.parse_provenance(SEAT_BANNER)
        self.assertFalse(any(set(b) == {"*"} for b in banner))


class TestSnakeOrder(unittest.TestCase):
    """`reversal_round: 0` on this league -- third-round reversal is OFF, verified on the draft."""

    def test_round_one_runs_forward(self):
        self.assertEqual([PL.slot_for_pick(i, 8) for i in range(1, 9)], list(range(1, 9)))

    def test_round_two_runs_back(self):
        self.assertEqual([PL.slot_for_pick(i, 8) for i in range(9, 17)], list(range(8, 0, -1)))

    def test_round_three_runs_forward_again(self):
        self.assertEqual(PL.slot_for_pick(17, 8), 1)
        self.assertEqual(PL.slot_for_pick(24, 8), 8)


class TestMarketOrder(unittest.TestCase):

    def _cache(self, rows):
        import gzip
        p = os.path.join(self.tmp, "adp.json.gz")
        with gzip.open(p, "wt", encoding="utf-8") as f:
            json.dump({"players": rows}, f)
        return p

    def setUp(self):
        import tempfile
        self._t = tempfile.TemporaryDirectory()
        self.tmp = self._t.name

    def tearDown(self):
        self._t.cleanup()

    def test_no_cache_falls_back_to_board_order_AND_SAYS_SO(self):
        names = ["a", "b", "c"]
        out, src = PL.market_order(names, cache=os.path.join(self.tmp, "nope.gz"))
        self.assertEqual(out, names)
        self.assertIn("no ADP cache", src)

    def test_a_real_join_orders_by_adp(self):
        c = self._cache([{"name": "a", "adp": 30}, {"name": "b", "adp": 10},
                         {"name": "c", "adp": 20}])
        out, src = PL.market_order(["a", "b", "c"], cache=c)
        self.assertEqual(out, ["b", "c", "a"])
        self.assertEqual(src, "market ADP")

    def test_an_UNPRICED_player_is_not_priced_LAST_by_fiat(self):
        """The old code mapped a missing ADP row to 9999, which asserts 'the market takes him dead
        last' about a player the market simply has not priced. He goes after the priced ones in
        board order, and the count is reported so the label cannot hide it."""
        c = self._cache([{"name": "a", "adp": 30}, {"name": "b", "adp": 10},
                         {"name": "c", "adp": 20}, {"name": "d", "adp": 40},
                         {"name": "e", "adp": 50}])
        out, src = PL.market_order(["a", "b", "c", "d", "e", "zz"], cache=c)
        self.assertEqual(out, ["b", "c", "a", "d", "e", "zz"])
        self.assertIn("1 of 6 unpriced", src)

    def test_UNPRICED_players_keep_BOARD_order_among_themselves(self):
        """⚠ MUTANT M4 SURVIVED THE FIRST PASS and this test is why it now dies. The test above
        cannot tell the two implementations apart: an unpriced player sorts last under the 9999
        fiat too, so both produce the same list. They diverge only in the order AMONG unpriced
        players -- 9999 sorts them alphabetically, which is a ranking nobody chose, while board
        order is the one ranking we actually trust. Insight 019: a test can assert the right
        answer for the wrong reason, and only a mutant finds out."""
        c = self._cache([{"name": "a", "adp": 30}, {"name": "b", "adp": 10},
                         {"name": "c", "adp": 20}, {"name": "d", "adp": 40}])
        # zz is ahead of aa on the board, and behind it alphabetically.
        out, _ = PL.market_order(["a", "b", "c", "d", "zz", "aa"], cache=c)
        self.assertEqual(out[-2:], ["zz", "aa"],
                         "unpriced players were re-sorted by something other than board order")

    def test_a_WEAK_join_refuses_to_call_itself_a_market_order(self):
        """insight 008's positive control. The old threshold was max(3, len//4), which passed on
        3 of 12 names and would have labelled a near-alphabetical list 'market ADP'."""
        c = self._cache([{"name": "a", "adp": 1}, {"name": "b", "adp": 2}, {"name": "c", "adp": 3}])
        names = ["a", "b", "c"] + [f"x{i}" for i in range(9)]
        out, src = PL.market_order(names, cache=c)
        self.assertEqual(out, names, "a weak join must not reorder anything")
        self.assertIn("joined only 3 of 12", src)

    def test_the_refusal_is_not_vacuous(self):
        """Positive control on the control: the same shape with a full join must NOT refuse."""
        rows = [{"name": n, "adp": i} for i, n in enumerate(["a", "b", "c"] +
                                                            [f"x{i}" for i in range(9)])]
        out, src = PL.market_order(["a", "b", "c"] + [f"x{i}" for i in range(9)],
                                   cache=self._cache(rows))
        self.assertEqual(src, "market ADP")


class TestTheSynthesiserRefusesRatherThanLeavingAHole(unittest.TestCase):
    """The old code `continue`d past a name it could not resolve while the pick counter kept
    advancing, which leaves an INTERIOR GAP in pick_no. The engine's integrity gate correctly
    refuses that -- while telling the operator to 're-fetch /picks and merge on pick_no', blaming
    their feed for our own parser's miss. Unreachable today (174/174 ids) and therefore exactly
    the kind of latent trap that fires on the morning the output format moves."""

    FEED = [{"pick_no": 1, "player_id": "x"}]

    def test_it_refuses_and_names_the_player(self):
        with self.assertRaises(SystemExit) as cm:
            PL._synth(self.FEED, ["Ghost Player"], {}, 3, 8, "123")
        self.assertIn("Ghost Player", str(cm.exception))

    def test_the_pick_numbers_it_does_emit_are_CONTIGUOUS(self):
        out = PL._synth(self.FEED, ["a", "b", "c"], {"a": "1", "b": "2", "c": "3"}, 3, 8, "123")
        self.assertEqual([p["pick_no"] for p in out], [1, 2, 3, 4])

    def test_the_refusal_is_not_vacuous(self):
        out = PL._synth(self.FEED, ["a"], {"a": "1"}, 3, 8, "123")
        self.assertEqual(len(out), 2)


class TestTheEnumerationStaysDead(unittest.TestCase):
    """Both branched outputs were measured against their closed forms and matched to the digit,
    so 495 engine subprocesses were computing `comb()`. Restoring the apparatus would reprint
    sampler arithmetic as if it were exploration -- the exact defect this project has now caught
    four times."""

    def setUp(self):
        with open(os.path.join(ROOT, "scripts", "precompute_ladder.py"), encoding="utf-8") as f:
            self.src = f.read()

    def test_there_is_no_combination_sampler(self):
        self.assertNotIn("itertools", self.src)
        self.assertNotIn("branches_for", self.src)

    def test_no_output_reports_a_share_of_futures(self):
        for banned in ("of futures", "cliff_empty_rate", "board_rank_answers", "EXHAUSTIVE"):
            self.assertNotIn(banned, self.src, f"{banned!r} is the enumeration coming back")

    def test_the_header_records_WHY_so_nobody_rebuilds_it(self):
        self.assertIn("closed form", self.src)
        self.assertIn("330", self.src)


class TestTheTautologiesStayDead(unittest.TestCase):
    """These assert against the ENGINE's source, so a change to how it ranks makes them fail
    loudly rather than quietly restoring a meaningless metric."""

    def setUp(self):
        with open(os.path.join(ROOT, "draft-kit", "draft_engine.py"), encoding="utf-8") as f:
            self.engine = f.read()

    def test_best_available_is_still_pure_board_rank(self):
        self.assertIn('sorted(avail, key=lambda x: x["r"])[:BEST_N]', self.engine)

    def test_vbd_leans_is_still_a_FILTERED_view(self):
        self.assertIn('p.get("vbdDelta",0) >= 8', self.engine)

    def test_BEST_N_is_still_the_cap_the_pool_widening_exists_for(self):
        """If the engine ever prints more than 12, the tier-cliff widening is less load-bearing --
        but the measurement that justified it (37% of real picks land outside the top 12) was
        taken against BEST_N = 12 and would need retaking."""
        self.assertIn("BEST_N, CLIFF_N = 12, 5", self.engine)

    def test_the_cliff_count_is_the_WHOLE_tier_not_the_named_five(self):
        """This is why a cliff can empty from players the top-12 pool never contained."""
        self.assertIn("cliffs.append((_pos, _t, len(_rows), _rows[:CLIFF_N]))", self.engine)


class TestItRefusesRatherThanEmittingAnEmptyLadder(unittest.TestCase):
    """Mutant P8 (tolerate an unreadable BEST AVAILABLE) SURVIVED the first pass -- nothing
    exercised the refusal at all. If the engine's output format moves, the parser returns [] and
    every downstream number becomes an empty list -- a queue of nobody. That does not read as
    'broken', it reads as 'no good options', which is a sentence a drafter might believe under a
    clock. Insight 008, one layer out."""

    def _with_engine_output(self, text, slot=3):
        real = PL.run_engine
        PL.run_engine = lambda *a, **k: text
        try:
            with open(FEED, encoding="utf-8") as f:
                feed = json.load(f)
            return PL.precompute(feed, slot, 8, 16, "1390923383440424960", at=14,
                                 cargo_dir=FIXTURES)
        finally:
            PL.run_engine = real

    def test_an_output_with_no_best_available_block_is_a_hard_stop(self):
        with self.assertRaises(SystemExit) as cm:
            self._with_engine_output("the engine printed something else entirely")
        self.assertIn("BEST AVAILABLE", str(cm.exception))

    def test_a_nearly_empty_block_is_also_refused(self):
        thin = ("--- BEST AVAILABLE (my board) ---\n 13 Nico Collins WR9 HOU  · vorp 107\n"
                "\nYOUR next pick: #19 — 4 picks away\n")
        with self.assertRaises(SystemExit):
            self._with_engine_output(thin)

    def test_a_snake_disagreement_is_a_hard_stop(self):
        """The engine says pick 19 is ours; our snake says pick 19 belongs to slot 3. Ask for
        slot 5 and the two disagree about the shape of the draft -- neither may be advised off.
        This checks the SNAKE, not the seat: both sides were handed the same --slot."""
        with self.assertRaises(SystemExit) as cm:
            self._with_engine_output(REAL, slot=5)
        self.assertIn("slot", str(cm.exception).lower())

    def test_the_refusals_are_not_vacuous(self):
        """Positive control: the same harness on GOOD output must get through every guard, or the
        three tests above would pass on a function that always raised."""
        res = self._with_engine_output(REAL)
        self.assertEqual(res["our_pick"], 19)
        self.assertGreaterEqual(len(res["queue"]), 3)
        self.assertFalse(res["seat_unverified"])


class TestTheBacktestScoresItsOwnNullModel(unittest.TestCase):
    """A SCORE WITH NO NULL MODEL IS A NUMBER WITH NO MEANING. '35%' reads as decent; '35% against
    a 33% null and a 1% floor' reads as 'ADP and our own board order are equivalent here'. The
    market_order docstring used to claim the opposite, and that claim was load-bearing for an
    entire enumeration apparatus."""

    def test_an_empty_scoring_run_does_not_divide_by_zero(self):
        """`stops` is empty for any feed of 6 or fewer picks, and the old code did hit/tot on a
        zero total. A crash is the least of it -- the run that crashes is the one that had nothing
        to measure, and it must SAY that rather than print a score."""
        rows = PL.backtest([], 3, 8, 16, "123", [], cargo_dir=FIXTURES)
        self.assertEqual(rows, [])

    def test_main_reports_a_nonzero_exit_when_it_scored_nothing(self):
        """`stops` starts at 6, so any feed of 6 or fewer picks scores nothing at all -- and the
        old code did `hit / tot` on a zero total and died with a raw ZeroDivisionError. The run
        that scores nothing is the run that had nothing to measure; it must SAY so and fail,
        never print a percentage."""
        import contextlib
        import io
        import tempfile
        with open(FEED, encoding="utf-8") as f:
            feed = json.load(f)[:5]
        with tempfile.TemporaryDirectory() as t:
            p = os.path.join(t, "short.json")
            with open(p, "w", encoding="utf-8") as f:
                json.dump(feed, f)
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                rc = PL.main(["--slot", "3", "--feed", p, "--backtest"])
        self.assertEqual(rc, 1)
        self.assertIn("scored NOTHING", buf.getvalue())

    def test_it_reports_three_arms(self):
        with open(FEED, encoding="utf-8") as f:
            feed = json.load(f)
        rows = PL.backtest(feed, 3, 8, 16, "1390923383440424960", [14], cargo_dir=FIXTURES)
        self.assertEqual(len(rows), 1)
        self.assertEqual(set(rows[0]["hits"]), {"market", "null(board order)", "floor(deepest)"})

    def test_the_arms_are_scored_over_the_SAME_number_of_predictions(self):
        """Arms of different sizes cannot be compared as percentages."""
        with open(FEED, encoding="utf-8") as f:
            feed = json.load(f)
        rows = PL.backtest(feed, 3, 8, 16, "1390923383440424960", [14, 22], cargo_dir=FIXTURES)
        for r in rows:
            self.assertEqual(len(set(r["sizes"].values())), 1, f"uneven arms at stop {r['at']}")


class TestEndToEndAgainstTheRealEngine(unittest.TestCase):
    """The whole chain (stage cargo -> engine -> parse -> project -> engine -> report) closing."""

    def setUp(self):
        if not os.path.exists(os.path.join(ROOT, "draft-kit", "players_data.json")):
            self.skipTest("no board on this machine")
        import tempfile
        self._t = tempfile.TemporaryDirectory()
        self.outdir = self._t.name

    def tearDown(self):
        self._t.cleanup()

    def _cli(self, *extra):
        """Every CLI test injects the FIXTURE cargo. Reading the live inbox would be
        non-deterministic today and would start FAILING on draft morning, the moment
        `draft_order` populates and the engine's seat oracle disagrees with a hardcoded slot 3.

        `--draft-id` is EXPLICIT here and that is not papering over anything. The fixture cargo
        is the REAL draft (1390509994847240192) while the committed lab feed is spent mock
        1390923383440424960 -- genuinely two different drafts, so once `reference_draft_id` began
        sourcing the gate from cargo instead of from the feed, these three chain-level tests
        started refusing, CORRECTLY. They are about output wording and the `--out` path, not about
        contamination. On draft morning the two agree, because `merge_picks.py` fills picks.json
        from the same draft the mule hauls. The DEFAULT (cargo-derived) path is covered by
        TestTheContaminationGateIsReachable below, which is where it belongs."""
        return (["--slot", "3", "--feed", FEED, "--cargo", FIXTURES,
                 "--draft-id", "1390923383440424960"] + list(extra))

    def _run(self, cargo_dir=FIXTURES, **kw):
        with open(FEED, encoding="utf-8") as f:
            feed = json.load(f)
        return PL.precompute(feed, 3, 8, 16, "1390923383440424960", cargo_dir=cargo_dir, **kw)

    def test_it_produces_a_queue_and_a_projection(self):
        res = self._run(at=14)
        self.assertGreater(len(res["queue"]), 3)
        self.assertEqual(res["our_pick"], 19)
        self.assertEqual(res["picks_away"], 4)
        self.assertEqual(len(res["projection"]["assumes_gone"]), 4,
                         "the projection must remove exactly the gap")
        self.assertEqual(res["projection"]["short_by"], 0)

    def test_the_candidate_set_is_WIDER_than_the_twelve_rows_best_available_prints(self):
        """BEST_N = 12 caps BEST AVAILABLE, and 37% of the picks that actually happen in the
        committed feed land outside those 12. Folding in the tier-cliff names is what lets the
        projection model a gap larger than 12 at all -- an 8-team snake turns a slot-1 or slot-8
        seat around with a gap of 14."""
        res = self._run(at=14)
        self.assertEqual(len(res["baseline"]), 12)
        self.assertGreater(res["pool_size"], 12)

    def test_the_queue_is_the_engines_order_not_ours(self):
        """Re-sorting it here would be the second implementation this file exists to avoid.
        Since 2026-08-19 the engine's queue-order section is LINEUP DELTAS (marginal lineup
        value over MY roster), not BEST AVAILABLE -- but the invariant is unchanged: the ladder
        transmits the engine's order, it never invents one."""
        res = self._run(at=14)
        self.assertEqual(res["queue"], [d["name"] for d in res["lineup_deltas"]])
        self.assertNotEqual(res["queue"], [b["name"] for b in res["baseline"]],
                            "queue == board order would mean the delta section is not wired "
                            "(possible but wildly unlikely mid-draft: it requires every marginal "
                            "value to agree with board rank at pick 14)")

    def test_names_the_projection_expects_gone_are_MARKED_not_reordered(self):
        """Reordering the queue on a projection that backtests at 35% would trade real board rank
        for a coin flip. Auto-pick skips the dead and takes the top survivor, so a name the
        projection kills is still worth queueing -- it just must not look like a live pick."""
        res = self._run(at=14)
        self.assertTrue(set(res["queue_expected_gone"]).issubset(set(res["queue"])))
        self.assertTrue(set(res["queue_expected_gone"])
                        .issubset(set(res["projection"]["assumes_gone"])))

    def test_the_cargo_it_reads_is_INJECTED_not_the_live_gitignored_haul(self):
        """A clean clone has no cargo and the hourly mule churns it, so a suite that reads the
        live inbox is both unrunnable and non-deterministic (review residue 1)."""
        with open(os.path.join(ROOT, "scripts", "precompute_ladder.py"), encoding="utf-8") as f:
            self.assertIn("cargo_dir=CARGO", f.read())

    def test_a_missing_cargo_dir_is_a_note_not_a_crash(self):
        res = self._run(at=14, cargo_dir=os.path.join(ROOT, "no", "such", "dir"))
        self.assertTrue(any("cargo" in n for n in res["engine_notes"]))

    def test_being_ON_THE_CLOCK_says_so_instead_of_projecting_nothing(self):
        """gap 0 is the operator's worst moment to read filler. The projection is meaningless
        there -- there is no future between now and a turn that is already here -- and the old
        wording printed a bare 'Assumes these 0 go first:' right where the runbook's hard rule
        says act on the ladder and do not start a cycle."""
        import contextlib
        import io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = PL.main(self._cli("--at", "18", "--out", os.path.join(self.outdir, "l.json")))
        out = buf.getvalue()
        self.assertEqual(rc, 0)
        self.assertIn("ON THE CLOCK NOW", out)
        self.assertNotIn("Assumes these 0", out)

    def test_that_wording_is_not_always_printed(self):
        """Positive control: a real gap must still get a projection, or the test above passes on
        a function that says ON THE CLOCK unconditionally."""
        import contextlib
        import io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            PL.main(self._cli("--at", "14", "--out", os.path.join(self.outdir, "l2.json")))
        out = buf.getvalue()
        self.assertNotIn("ON THE CLOCK NOW", out)
        self.assertIn("Assumes these 4 go first", out)

    def test_a_bare_out_filename_does_not_crash_after_all_the_work(self):
        """`os.path.dirname("ladder.json")` is "" and `os.makedirs("")` raises FileNotFoundError --
        after every engine run has completed and the whole report has been printed, so the work is
        done and then discarded unwritten."""
        import contextlib
        import io
        cwd = os.getcwd()
        os.chdir(self.outdir)
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                rc = PL.main(self._cli("--at", "14", "--out", "ladder.json"))
            self.assertEqual(rc, 0)
            self.assertTrue(os.path.exists(os.path.join(self.outdir, "ladder.json")))
        finally:
            os.chdir(cwd)

    def test_the_ENGINE_actually_SEES_the_staged_cargo(self):
        """⚠ MUTANT M8 SURVIVED THE FIRST PASS: replacing the `stage_cargo(...)` call with a
        hardcoded `staged = [...]` left all 46 tests green. That is insight 013 exactly -- the
        function had tests, its CALL SITE had none, so nothing proved the engine's seat oracle
        was reachable at all. The proof has to come from the ENGINE's own mouth: it can only name
        the fixture's draft id if it really opened the file we staged."""
        res = self._run(at=14)
        self.assertTrue(
            any("1390509994847240192" in n for n in res["engine_notes"]),
            "the engine never reported the staged cargo's draft id, so it never read it")

    def test_that_proof_is_not_vacuous(self):
        """The negative half: with no cargo to stage, that id must NOT appear -- otherwise the
        test above would pass on a string that comes from somewhere else entirely."""
        res = self._run(at=14, cargo_dir=os.path.join(ROOT, "no", "such", "dir"))
        self.assertFalse(any("1390509994847240192" in n for n in res["engine_notes"]))


ROSTER_BLOCK = """--- ROSTERS / NEEDS ---
slot 1: [QB1 RB6 WR5 TE1 K1 DEF1] needs: starters full
slot 2: [QB1 RB6 WR5 TE1 K1 DEF1] needs: starters full
slot 3: [QB1 RB6 WR5 TE1] needs: Kx1, DEFx1 <== YOU
slot 4: [QB2 RB4 WR6 TE1 K1 DEF1] needs: starters full
--- BEST AVAILABLE ---
"""


class TestTheQueueCannotFillAMandatedSlot(unittest.TestCase):
    """Measured 2026-08-14, and exact rather than estimated.

    This board's best K is rank 158 and best DEF 151, while an 8x16 draft is 128 picks -- so the
    top 128 board ranks are 128 skill players and ZERO K/DEF, by construction (rerank.py sinks
    both below every skill player). BEST AVAILABLE is lowest-board-rank-available, so THE QUEUE
    CAN NEVER CONTAIN A KICKER OR A DEFENSE at any depth. Confirmed against the committed lab
    feed at picks 88/104/112/118: eight names, all skill, every time.

    Harmless while a human picks -- the engine prints `needs: Kx1` and he reads it. It bites in
    one recorded scenario: miss a clock and Sleeper pins the team to auto-pick for the REST of the
    draft (Mock #2, pick 79 -> autopicks at 82/95/98/111/114), and auto-pick drains the queue
    top-down before falling back to Sleeper's board.

    In the real lab draft our seat took K at #110 and DEF at #115 -- its last two picks, zero
    slack. That is the state the CRITICAL test below reproduces.
    """

    def test_it_reads_OUR_row_not_the_first_one(self):
        """THE AXIS A NAIVE PARSE GETS WRONG (insight 019). slot 1 is 'starters full' and comes
        first; a positional read returns [] and the warning silently never fires. The `<== YOU`
        marker is the only safe anchor, and it also survives the seat changing."""
        self.assertEqual(PL.parse_our_needs(ROSTER_BLOCK), ["Kx1", "DEFx1"])

    def test_starters_full_is_no_needs(self):
        block = ROSTER_BLOCK.replace("needs: Kx1, DEFx1 <== YOU", "needs: starters full <== YOU")
        self.assertEqual(PL.parse_our_needs(block), [])

    def test_a_block_with_no_YOU_marker_returns_nothing_rather_than_guessing(self):
        self.assertEqual(PL.parse_our_needs(ROSTER_BLOCK.replace(" <== YOU", "")), [])

    def test_remaining_picks_follow_the_snake(self):
        """Slot 3 in an 8-team snake: 19 (r3, odd) then 30 (r4, even) then 35..."""
        self.assertEqual(PL.our_remaining_picks(19, 8, 5)[:3], [19, 30, 35])
        self.assertEqual(PL.our_remaining_picks(110, 8, 15), [110, 115])

    def test_CRITICAL_when_every_remaining_pick_is_spoken_for(self):
        lvl, msg = PL.mandatory_squeeze(["Kx1", "DEFx1"], [110, 115])
        self.assertEqual(lvl, "CRITICAL")
        self.assertIn("EXACTLY 2", msg)

    def test_CRITICAL_when_it_is_already_impossible(self):
        lvl, _ = PL.mandatory_squeeze(["Kx1", "DEFx1"], [115])
        self.assertEqual(lvl, "CRITICAL")

    def test_WARNING_inside_two_picks_of_slack(self):
        self.assertEqual(PL.mandatory_squeeze(["Kx1"], [100, 110, 115])[0], "WARNING")

    def test_SILENT_with_room_to_spare(self):
        """The negative control. A warning that fires in round 3 is one nobody reads by round 14 --
        insight 009: a false red teaches the operator to skip the gate."""
        self.assertIsNone(PL.mandatory_squeeze(["Kx1", "DEFx1"], list(range(20, 120, 10))))

    def test_SILENT_when_only_SKILL_slots_are_short(self):
        """QB/RB/WR/TE/FLEX are all reachable from the queue, so they are not a squeeze. Warning on
        them would fire almost every round and drown the one case that matters."""
        self.assertIsNone(PL.mandatory_squeeze(["QBx1", "FLEXx2"], [110, 115]))
        self.assertIsNone(PL.mandatory_squeeze([], [115]))

    def test_the_warning_prints_ABOVE_the_queue_it_qualifies(self):
        """Insight 016: a banner printed after the advisory it qualifies is invisible in a redirect
        and read last under a clock. MUTANT: move the block below the queue loop and this fails."""
        with open(os.path.join(ROOT, "scripts", "precompute_ladder.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertLess(src.index("CANNOT FILL A MANDATED SLOT"),
                        src.index("QUEUE THIS ORDER (auto-pick drains it"),
                        "the squeeze warning must be emitted before the queue")

    def test_the_queue_LEADS_and_the_context_follows(self):
        """Briggsy ratified the flip 2026-08-19 ("flip it!"): the queue is the ACTION, the
        projection and the cliffs are context, and a reader under a clock takes the top of the
        output. Only the on-clock banner and the squeeze warning may print above it (the test
        above pins the squeeze half). MUTANT: move the projection back above the queue and this
        fails."""
        with open(os.path.join(ROOT, "scripts", "precompute_ladder.py"), encoding="utf-8") as f:
            src = f.read()
        q = src.index("QUEUE THIS ORDER (auto-pick drains it")
        self.assertLess(q, src.index("THE MARKET PROJECTION — ONE scenario"),
                        "the projection must print BELOW the queue, not above it")
        self.assertLess(q, src.index("TIER CLIFFS — the CONDITION"),
                        "the cliffs must print BELOW the queue, not above it")

    def test_the_remedy_is_the_NULL_MODEL_not_a_cleverer_queue(self):
        """Sorting the queue by roster need is one step from sorting it by vorp, which insight 024
        recorded finishing 6 RB / 1 WR / 0 K. The floor control wins: an EMPTY queue lets Sleeper's
        own board fill them, which it did on schedule in Mock #2."""
        with open(os.path.join(ROOT, "scripts", "precompute_ladder.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertIn("CLEAR THE QUEUE", src)
        self.assertIn("Do NOT re-sort the queue by need", src)


class TestTheContaminationGateIsReachable(unittest.TestCase):
    """The gate this file's CALL SITE could never fire, found 2026-08-14.

    `draft_id = a.draft_id or (str(feed[0].get("draft_id")) if feed else "")` sourced the gate's
    reference from THE VERY FEED THE GATE CHECKS, so `draft_engine.py:173-180` compared a feed
    against itself and the refusal was structurally unreachable. It was not a dormant branch --
    `docs/draft-day-runbook.md:167` and `:207` both teach the flagless `--slot <slot>` form, so
    the unreachable path was the ONLY path anybody ran, and :207 fires the ladder BEFORE the
    draft starts, ahead of any merge_picks call that would have caught it.

    Measured before the fix: a 38-pick feed from dead mock 1392338436949561355 produced a
    complete round-6 ladder, exit 0, and persisted a queue headed by Nico Collins while Chase,
    Gibbs, Nacua and Bijan were all still on the real board. Auto-pick drains queue-top, so a
    blown clock CASHES the contamination rather than containing it.

    Insight 013 is why these test `main()` and not just `reference_draft_id()`: the function
    having tests is exactly the state that let the broken call site ship.
    """

    def setUp(self):
        if not os.path.exists(os.path.join(ROOT, "draft-kit", "players_data.json")):
            self.skipTest("no board on this machine")
        import tempfile
        self._t = tempfile.TemporaryDirectory()
        self.out = os.path.join(self._t.name, "ladder.json")
        # A feed from a draft that is NOT the fixture cargo's draft -- the spent-mock shape.
        self.foreign = os.path.join(self._t.name, "foreign_feed.json")
        with open(FEED, encoding="utf-8") as f:
            picks = json.load(f)[:38]
        with open(self.foreign, "w", encoding="utf-8") as f:
            json.dump(picks, f)

    def tearDown(self):
        self._t.cleanup()

    def _main(self, *extra):
        import contextlib
        import io
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                rc = PL.main(["--slot", "3", "--cargo", FIXTURES, "--out", self.out] + list(extra))
        except SystemExit as e:                 # run_engine raises this on an engine refusal
            return 1, buf.getvalue() + str(e)
        return rc, buf.getvalue()

    def test_a_foreign_feed_is_REFUSED_through_the_flagless_runbook_form(self):
        """THE REGRESSION. This is the exact command docs/draft-day-runbook.md:207 teaches."""
        rc, out = self._main("--feed", self.foreign)
        self.assertEqual(rc, 1, "the flagless form must refuse a feed from another draft")
        self.assertIn("IS FROM A DIFFERENT DRAFT", out)

    def test_a_refused_run_PERSISTS_NOTHING(self):
        """A queue on disk outlives the terminal that printed the refusal, and runbook:207 says
        to load it into Sleeper. Writing one after refusing would leave the poison in place."""
        self._main("--feed", self.foreign)
        self.assertFalse(os.path.exists(self.out),
                         "a refused run must not leave a ladder for the operator to load")

    def test_the_reference_is_NOT_taken_from_the_feed(self):
        """MUTANT: restore `a.draft_id or feed[0]["draft_id"]`. The test above would still pass
        if the id merely came from somewhere -- this pins WHERE. The fixture cargo names the real
        draft; the feed names the mock; the gate must report the CARGO's id as what it asked for."""
        _, out = self._main("--feed", self.foreign)
        self.assertIn("1390509994847240192", out, "the gate must be armed from the cargo")
        self.assertIn("you asked for : 1390509994847240192", out)

    def test_a_matching_feed_still_RUNS(self):
        """Positive control. Without it, a `reference_draft_id` that refused unconditionally --
        or returned a constant nothing matches -- would pass every assertion above."""
        rc, out = self._main("--feed", FEED, "--at", "14",
                             "--draft-id", "1390923383440424960")
        self.assertEqual(rc, 0)
        self.assertTrue(os.path.exists(self.out))
        self.assertNotIn("IS FROM A DIFFERENT DRAFT", out)

    def test_an_explicit_draft_id_still_wins(self):
        rid, line = PL.reference_draft_id("999", cargo_dir=FIXTURES)
        self.assertEqual(rid, "999")
        self.assertIn("[given]", line)

    def test_no_cargo_means_UNARMED_AND_LOUD_never_a_silent_fallback(self):
        """The old code's failure mode was silence WITH a plausible id. Unarmed is acceptable
        (insight 009 -- a clean clone must not go red); unarmed and quiet is not."""
        rid, line = PL.reference_draft_id(None, cargo_dir=os.path.join(ROOT, "no", "such", "dir"))
        self.assertEqual(rid, "", "a missing cargo must never fall back to the feed")
        self.assertIn("NOT armed", line)

    def test_a_missing_DEFAULT_feed_is_the_pre_draft_state_not_a_crash(self):
        """runbook:207 pre-arms the queue BEFORE the draft starts. picks.json does not exist then
        -- merge_picks has had nothing to write -- and this used to raise a bare FileNotFoundError
        traceback at the one moment the operator has least patience for one. Deleting the spent
        mock's picks.json (which is the correct state to be in) is what makes it missing."""
        kit_feed = os.path.join(ROOT, "draft-kit", "picks.json")
        if os.path.exists(kit_feed):
            self.skipTest("a live picks.json is present; this asserts the absent case")
        rc, out = self._main("--draft-id", "1390509994847240192")
        self.assertEqual(rc, 0)
        self.assertIn("has not started", out)

    def test_a_missing_EXPLICIT_feed_is_still_a_hard_error(self):
        """shape.py's rule: "cannot tell" and "will not compute" must not share a branch. A typo'd
        --feed silently reading as an empty draft would produce a confident round-1 ladder for a
        draft that is already underway."""
        rc, out = self._main("--feed", os.path.join(self._t.name, "typo.json"))
        self.assertEqual(rc, 1)
        self.assertIn("REFUSED", out)

    def test_the_call_site_passes_the_cargo_dir_the_operator_chose(self):
        """MUTANT M8's shape: hardcoding CARGO here would make --cargo decorative and every test
        above would still pass, because they all happen to point at the fixtures.

        ⚠️ THIS USED TO ASSERT THE SOURCE TEXT `reference_draft_id(a.draft_id, a.cargo)`. That
        pinned a spelling rather than a behaviour, and it went red on 2026-08-18 for a rename that
        changed nothing it cared about (`a.cargo` -> `cargo_dir`, after --cargo learned to accept a
        FILE as well as a dir). A test that breaks on a rename and would survive a real regression
        is the wrong way round. It now points --cargo at a cargo naming a DIFFERENT draft and
        asserts the gate reports THAT id -- which no hardcoded CARGO can satisfy."""
        other = os.path.join(self._t.name, "other_cargo")
        os.makedirs(other, exist_ok=True)
        with open(os.path.join(other, "sleeper_draft.json"), "w", encoding="utf-8") as f:
            json.dump({"draft_id": "1394479498451251200"}, f)      # a real mock, not the fixture
        import contextlib
        import io
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                PL.main(["--slot", "3", "--cargo", other, "--out", self.out,
                         "--feed", self.foreign])
        except SystemExit as e:
            buf.write(str(e))
        out = buf.getvalue()
        self.assertIn("1394479498451251200", out,
                      "the gate was armed from somewhere other than the --cargo the operator chose")
        self.assertNotIn("you asked for : 1390509994847240192", out,
                         "--cargo is decorative: the default inbox armed the gate instead")


class TestAMockCannotOverwriteTheLiveLadder(unittest.TestCase):
    """`ladder.json` was ONE fixed path regardless of which draft produced it, so every mock,
    rehearsal and lab run overwrote the live war-room queue with a ladder for a draft nobody is in.

    It happened TWICE in one session on 2026-08-17 while testing unrelated changes, leaving a queue
    headed `Josh Downs, Brock Purdy, Travis Kelce` from a dead lab feed. That matters because the
    runbook's own re-arm step tells the operator to load `ladder.json`'s `queue` into Sleeper --
    where auto-pick drains it top-down the moment a clock is blown. The repo already records this
    exact shape once (the 2026-08-14 ladder headed by Nico Collins); the gate added then armed the
    CONTAMINATION check, which reads picks.json. Nothing guarded the OUTPUT path.
    """

    REAL, MOCK = "1390509994847240192", "1394479498451251200"

    def setUp(self):
        import shutil
        import tempfile
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.default = os.path.join(self.tmp, "state", "ladder.json")

    def cargo(self, draft_id=REAL):
        d = os.path.join(self.tmp, "inbox")
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "sleeper_draft.json"), "w", encoding="utf-8") as f:
            json.dump({"draft_id": draft_id}, f)
        return d

    def test_this_leagues_own_draft_writes_the_live_ladder(self):
        """The control. Without it, a function that always scoped the path would pass every
        refusal test below while making the live ladder unreachable."""
        path, note = PL.resolve_out(None, self.REAL, self.cargo(), self.default)
        self.assertEqual(path, self.default)
        self.assertIsNone(note)

    def test_a_mock_is_written_somewhere_else_and_SAYS_SO(self):
        path, note = PL.resolve_out(None, self.MOCK, self.cargo(), self.default)
        self.assertNotEqual(path, self.default)
        self.assertIn(self.MOCK, os.path.basename(path))
        self.assertIn("CANNOT overwrite", note)
        # The note has to name the real draft too, or the operator cannot tell which is which.
        self.assertIn(self.REAL, note)

    def test_an_explicit_out_always_wins(self):
        """An operator saying where to put it is not a mistake, and a guard that overrode them
        would just get worked around."""
        mine = os.path.join(self.tmp, "mine.json")
        path, note = PL.resolve_out(mine, self.MOCK, self.cargo(), self.default)
        self.assertEqual(path, mine)
        self.assertIsNone(note)

    def test_no_cargo_at_all_writes_a_SCOPED_ladder_never_the_live_one(self):
        """🚨 THIS TEST ASSERTED THE HOLE UNTIL 2026-08-18.

        It read `test_no_cargo_at_all_still_writes_the_live_ladder` and its own docstring said
        *"this function's job is preventing an overwrite"* -- while the case it pinned is a MOCK
        ladder (`self.MOCK`) with no cargo to identify the league, going to the LIVE path. That is
        the 2026-08-17 poisoned-ladder incident exactly, blessed by a test.

        The false-red concern behind it is real and is still honoured: a clean clone must not be
        REFUSED. It is not -- it gets a ladder, at `ladder.unarmed.json`, with a note saying why.
        Writing somewhere useful and writing to the live queue are different things, and conflating
        them is what let the runs that could not be ARMED be the runs allowed to OVERWRITE.

        Reachable for real since `--cargo` learned to take a FILE: `cargo_draft_id` joined
        "sleeper_draft.json" onto a path that was already a file, found nothing, returned "", and
        fell through here -- on the exact command the runbook teaches at go time."""
        path, note = PL.resolve_out(None, self.MOCK, os.path.join(self.tmp, "nope"), self.default)
        self.assertNotEqual(path, self.default, "an unarmed run must never claim the live queue")
        self.assertEqual(os.path.basename(path), "ladder.unarmed.json")
        self.assertEqual(os.path.dirname(path), os.path.dirname(self.default),
                         "it must still land somewhere the operator will look")
        self.assertIn("held back", note or "", "a silent divert is how this went unnoticed")

    def test_a_clean_clone_is_not_REFUSED_it_just_writes_elsewhere(self):
        """The control for the rule above: insight 009's false-red direction is the dangerous one,
        so prove this still produces a path and a reason rather than an exception or None."""
        path, note = PL.resolve_out(None, self.MOCK, os.path.join(self.tmp, "nope"), self.default)
        self.assertTrue(path)
        self.assertTrue(note)

    def test_an_UNARMED_run_cannot_claim_the_live_path_even_with_healthy_cargo(self):
        """🚨 THE OTHER HALF OF THE UNARMED RULE, reproduced live 2026-08-20 before it was fixed.

        The lunch mock's bare `--cargo temp/draft.json` printed "gate NOT armed" (draft_id="")
        and then wrote the LIVE ladder.json anyway: `real` was non-empty, and the mismatch check
        was `if draft_id and ...` -- skippable by exactly the runs that could not be armed. The
        runs that cannot be ARMED must never be the runs allowed to OVERWRITE (the 2026-08-18
        principle, applied to the arming id this time instead of the identity)."""
        path, note = PL.resolve_out(None, "", self.cargo(), self.default)
        self.assertNotEqual(path, self.default, "an unarmed run must never claim the live queue")
        self.assertEqual(os.path.basename(path), "ladder.unarmed.json")
        self.assertIn("held back", note or "")

    def test_reference_draft_id_ARMS_from_a_go_time_FILE(self):
        """The bare `--cargo temp/draft.json` form must arm the gate from the file itself --
        that is `run_engine.py`'s own behaviour (its --cargo IS a file), and the 2026-08-20 lunch
        mock proved the un-armed alternative: "no draft_id in cargo -- gate NOT armed" printed on
        the exact command the runbook teaches."""
        f = os.path.join(self.tmp, "draft.json")
        with open(f, "w", encoding="utf-8") as fh:
            json.dump({"draft_id": self.MOCK}, fh)
        rid, line = PL.reference_draft_id(None, cargo_dir=os.path.dirname(f), draft_file=f)
        self.assertEqual(rid, self.MOCK)
        self.assertIn("armed", line)
        self.assertNotIn("NOT armed", line)

    def test_A_MOCKS_OWN_DRAFT_OBJECT_CANNOT_VOUCH_FOR_ITSELF(self):
        """🚨 THE 2026-08-20 LUNCH-MOCK REGRESSION, both halves, at the main() wiring level.

        `--cargo <the mock's own draft object>` with `--draft-id <mock>` wrote the LIVE
        ladder.json with the gate reading "armed": resolve_out's "which draft is the league's"
        answer came from the very file being judged, so `real == draft_id` was a tautology.
        Identity must come from the mule's inbox and nowhere else; with that, the same command
        diverts to ladder.<mock>.json.

        The mock's id here is the LAB FEED's own draft_id, because in the live incident the feed
        and the passed draft object were the same mock -- an id the feed does not carry would be
        refused by the engine's contamination gate first (which is itself the arming fix working,
        but it is a different guard than the one this test pins)."""
        import contextlib
        import io as _io
        feed_id = "1390923383440424960"              # lab_feed_120.json's own draft_id
        self.addCleanup(setattr, PL, "DEFAULT_OUT", PL.DEFAULT_OUT)
        self.addCleanup(setattr, PL, "CARGO", PL.CARGO)
        PL.DEFAULT_OUT = self.default
        PL.CARGO = self.cargo()                      # the league's identity: REAL

        f = os.path.join(self.tmp, "draft.json")     # the MOCK's own draft object
        with open(f, "w", encoding="utf-8") as fh:
            json.dump({"draft_id": feed_id, "draft_order": {PL.W.BRIGGSY_USER_ID: 3}}, fh)

        buf = _io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                PL.main(["--cargo", f, "--feed", FEED, "--at", "8"])   # BARE -- no --draft-id
        except SystemExit as e:
            buf.write(str(e))
        out = buf.getvalue()
        self.assertFalse(os.path.exists(self.default),
                         "a mock's own draft object vouched for itself onto the live path")
        self.assertIn("held back", out)
        self.assertNotIn("NOT armed", out,
                         "the bare file form must arm the gate from the file (the other half)")
        self.assertIn(f"ladder.{feed_id}.json", out,
                      "the divert must be BY ID -- armed from the file, identity from the inbox")
        self.assertIn(self.REAL, out, "the note must name the league's real draft")

    def test_MAIN_WIRES_THE_FILE_FORM_THROUGH_insight_013_for_the_fourth_time(self):
        """🚨 THE CALL-SITE TEST, AND ITS ABSENCE IS WHY THIS SHIPPED.

        Everything above calls `resolve_out` directly. A mutation run proved that is not enough:
        restoring the real bug at the call site -- `resolve_out(a.out, draft_id, a.cargo)`, handing
        a FILE to the parameter that gets `os.path.join`ed with "sleeper_draft.json" -- left all 96
        tests GREEN. The function had tests; its wiring had none. That is insight 013's exact shape
        and the fourth time this repo has made it.

        It could not be written before `default_out` became call-time resolvable, because the only
        way to reach main()'s path was to let it write the real war-room ladder."""
        import contextlib
        import io as _io
        self.addCleanup(setattr, PL, "DEFAULT_OUT", PL.DEFAULT_OUT)
        self.addCleanup(setattr, PL, "CARGO", PL.CARGO)
        PL.DEFAULT_OUT = self.default            # a temp path -- never the real state dir
        PL.CARGO = self.cargo()                  # the league's identity source: REAL

        f = os.path.join(self.tmp, "draft.json")     # go-time form, naming THIS league
        with open(f, "w", encoding="utf-8") as fh:
            json.dump({"draft_id": self.REAL, "draft_order": {PL.W.BRIGGSY_USER_ID: 3}}, fh)

        buf = _io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                PL.main(["--cargo", f, "--feed", FEED, "--at", "8",
                         "--draft-id", "1390923383440424960"])   # a DIFFERENT draft than the cargo
        except SystemExit as e:
            buf.write(str(e))
        out = buf.getvalue()
        self.assertFalse(os.path.exists(self.default),
                         "main() wrote the live ladder for a draft the cargo says is not ours")
        self.assertIn("held back", out, "main() must surface the divert, not swallow it")
        # ⚠️ "held back" ALONE DOES NOT PIN THE WIRING -- both diverts say it. If identity never
        # reached the mule's inbox, `real` is "" and the run lands on the UNARMED path: still safe
        # (that guard is the second layer), but it means the inbox was never read. Assert the
        # divert NAMED the league's real draft, which only the inbox can supply.
        self.assertIn(self.REAL, out,
                      "the divert never read the inbox -- identity is not reaching cargo_draft_id")
        self.assertNotIn("unarmed", out,
                         "main() fell back to the unarmed path; identity was not wired through")

    def test_the_file_form_still_writes_the_live_ladder_for_THIS_leagues_draft(self):
        """The positive control, at the same main() wiring level as the regression pair. A divert
        that fired unconditionally would pass everything above and quietly stop the war-room queue
        from ever being written on draft night -- insight 009's false-red direction.

        "This league's draft" is the lab feed's id here, so the feed, the go-time file and the
        inbox all agree -- draft night's exact shape."""
        import contextlib
        import io as _io
        feed_id = "1390923383440424960"              # lab_feed_120.json's own draft_id
        self.addCleanup(setattr, PL, "DEFAULT_OUT", PL.DEFAULT_OUT)
        self.addCleanup(setattr, PL, "CARGO", PL.CARGO)
        PL.DEFAULT_OUT = self.default
        PL.CARGO = self.cargo(feed_id)               # inbox says this league's draft...

        f = os.path.join(self.tmp, "draft.json")     # ...and the go-time file IS this league's
        with open(f, "w", encoding="utf-8") as fh:
            json.dump({"draft_id": feed_id, "draft_order": {PL.W.BRIGGSY_USER_ID: 3}}, fh)

        buf = _io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                PL.main(["--cargo", f, "--feed", FEED, "--at", "8"])
        except SystemExit as e:
            buf.write(str(e))
        out = buf.getvalue()
        self.assertTrue(os.path.exists(self.default),
                        "the guard must not stop draft night's own ladder from being written")
        self.assertNotIn("held back", out)

    def test_identity_does_not_depend_on_the_files_age(self):
        """A league's draft id does not change when the file gets old, so identity must not read
        mtime at all."""
        d = self.cargo()
        os.utime(os.path.join(d, "sleeper_draft.json"), (0, 0))     # ancient
        self.assertEqual(PL.cargo_draft_id(d), self.REAL)
        path, _ = PL.resolve_out(None, self.MOCK, d, self.default)
        self.assertNotEqual(path, self.default, "an old cargo must not re-open the overwrite")

    def test_the_out_guard_asks_IDENTITY_not_the_arming_id(self):
        """🚨 THE DISTINCTION THIS WHOLE PAIR OF FUNCTIONS EXISTS FOR, guarded textually because
        the failure is invisible at runtime here.

        `reference_draft_id` decides what to ARM THE CONTAMINATION GATE with, and correctly
        returns "" for a stale cargo -- arming from a stale id would refuse a CORRECT run if the
        draft were re-created. `resolve_out` asks a different question: *which draft is the real
        one*. If it reused the arming id, a stale cargo would yield "" -- falsy -- and the guard
        would fall straight through to the live path, silently re-enabling the overwrite for
        exactly the operator whose mule has stopped.

        This cannot be positive-controlled in a tmpdir: `freshness()` deliberately declines to
        judge any cargo outside the mule's own inbox (`run_engine.freshness`), so no temp file can
        be made "stale". Asserting the call site is what is available, and it is the same technique
        this file already uses for the contamination gate's own reference."""
        with open(PL.__file__, encoding="utf-8") as f:
            src = f.read()
        body = src.split("def resolve_out(")[1].split("\ndef ")[0]
        self.assertIn("cargo_draft_id(", body)
        self.assertNotIn("reference_draft_id(", body,
                         "resolve_out must ask identity, not the arming id -- see this docstring")


class TestTheSeatCanBeDerivedInsteadOfTyped(unittest.TestCase):
    """`--slot` was `required=True`, so the seat was retyped once per pick window -- ~15 times
    under a 120s clock, with "3" as this project's most attractive wrong answer (Briggsy's slot,
    his roster_id, and slot_to_roster_id's identity-map 3 are three unrelated 3s).

    🚨 AND THE FIX BUYS A NEW HAZARD THE ITEM DID NOT NAME. Deriving the seat FROM `draft_order`
    and then letting the engine "verify" it AGAINST `draft_order` is a tautology -- the engine
    compares a value against the file it came from and cannot disagree. It still prints
    `[checked] my_slot=N against draft_order`, which READS LIKE A GUARD. That is insight 005's
    tie-breaker-agrees-with-the-board defect in a new costume. Half of this class is about the
    derivation working; the other half is about it saying so.
    """

    REAL = "1390509994847240192"
    #: The draft `lab_feed_120.json` actually came from. Engine-running tests must name it or the
    #: contamination gate refuses BEFORE the engine runs -- which silently turns every assertion
    #: about engine output into an assertion about a refusal banner.
    LAB = "1390923383440424960"

    def setUp(self):
        if not os.path.exists(os.path.join(ROOT, "draft-kit", "players_data.json")):
            self.skipTest("no board on this machine")
        import shutil
        import tempfile
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.out = os.path.join(self.tmp, "ladder.json")

    def cargo(self, draft_order=None, draft_id=LAB, name="sleeper_draft.json", encoding="utf-8"):
        """A cargo DIR holding one draft object. `draft_order=None` is the live pre-draft state."""
        d = os.path.join(self.tmp, "inbox")
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, name)
        with open(p, "w", encoding=encoding) as f:
            json.dump({"draft_id": draft_id, "draft_order": draft_order}, f)
        return d, p

    def run_main(self, *argv):
        import contextlib
        import io
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                rc = PL.main(list(argv))
        except SystemExit as e:
            return 1, buf.getvalue() + str(e)
        return rc, buf.getvalue()

    # ---- the derivation itself ----------------------------------------------------------------

    def test_a_populated_draft_order_supplies_the_seat_and_SAYS_WHERE_FROM(self):
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 5})
        _, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "8",
                               "--draft-id", self.LAB)
        self.assertIn("slot=5", out)
        self.assertIn(f'draft_order["{PL.W.BRIGGSY_USER_ID}"]', out,
                      "the seat must name the key it came from, not just the number")

    def test_a_NULL_draft_order_REFUSES_rather_than_defaulting(self):
        """🚨 THE ONE THAT MATTERS. `draft_order` is null until near go time -- which is the state
        the live draft is in TODAY -- so this is the ordinary path, not an edge case. Defaulting to
        anything here produces a complete, confident ladder for another manager's team."""
        d, _ = self.cargo(None)
        rc, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED)
        self.assertEqual(rc, 1)
        self.assertIn("NO SEAT", out)
        self.assertFalse(os.path.exists(self.out), "a refused run must persist no ladder")

    def test_the_refusal_says_the_null_is_NORMAL_not_a_fault(self):
        """A refusal that reads like a malfunction gets worked around. This one is the expected
        pre-draft state and has to say so, or the operator goes hunting for a broken mule."""
        d, _ = self.cargo(None)
        _, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED)
        self.assertIn("NORMAL", out)
        self.assertIn("--slot", out, "the refusal must name the way forward")

    def test_the_refusal_names_the_two_wrong_answers_by_name(self):
        d, _ = self.cargo(None)
        _, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED)
        self.assertIn("roster_id", out)
        self.assertIn("slot_to_roster_id", out)

    def test_a_draft_order_that_omits_US_also_refuses(self):
        """Populated, but for other people. `my_slot` returns None here exactly as for null, and
        the two must not be allowed to diverge into 'populated therefore fine'."""
        d, _ = self.cargo({"9999999999999999999": 4})
        rc, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED)
        self.assertEqual(rc, 1)
        self.assertIn("NO SEAT", out)

    def test_a_BOM_in_a_hand_saved_draft_object_still_reads(self):
        """utf-8-sig, matching run_engine and NOT this file's two older readers. The go-time step
        curls the draft object to a file by hand, and a BOM there would refuse a perfectly good
        seat at the worst possible moment."""
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 6}, encoding="utf-8-sig")
        _, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "8",
                               "--draft-id", self.LAB)
        self.assertIn("slot=6", out)

    def test_THE_CONTROL_an_explicit_slot_still_wins_and_is_not_derived(self):
        """Without this, a derivation that ignored --slot entirely would pass everything above."""
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 5})
        _, out = self.run_main("--slot", "2", "--cargo", d, "--out", self.out, "--feed", FEED,
                               "--at", "8", "--draft-id", self.LAB)
        self.assertNotIn("slot=5", out, "an explicitly passed seat must not be overwritten")
        self.assertNotIn("[draft] slot=", out, "nothing was derived, so nothing should say it was")

    # ---- --cargo may be a FILE, which is what the runbook's go-time step produces --------------

    def test_a_cargo_FILE_is_accepted_the_way_run_engine_takes_one(self):
        """The runbook's go-time step curls the draft to `temp/draft.json` and passes it, because
        the hourly inbox is guaranteed to be behind at the exact moment draft_order flips. That
        form worked for run_engine.py and silently did the wrong thing here -- same flag name,
        opposite meaning."""
        _, p = self.cargo({PL.W.BRIGGSY_USER_ID: 7}, name="draft.json")
        _, out = self.run_main("--cargo", p, "--out", self.out, "--feed", FEED, "--at", "8",
                               "--draft-id", self.LAB)
        self.assertIn("slot=7", out)

    def test_resolve_cargo_maps_both_forms(self):
        d, p = self.cargo({PL.W.BRIGGSY_USER_ID: 1}, name="draft.json")
        self.assertEqual(PL.resolve_cargo(p), (p, os.path.dirname(os.path.abspath(p))))
        self.assertEqual(PL.resolve_cargo(d), (os.path.join(d, "sleeper_draft.json"), d))

    def test_a_staged_file_reaches_the_engine_under_the_name_it_opens(self):
        """`draft_engine.py` opens `sleeper_draft.json` by LITERAL NAME, so a `temp/draft.json`
        must be copied under that name or the seat oracle silently never runs."""
        import tempfile
        _, p = self.cargo({PL.W.BRIGGSY_USER_ID: 7}, name="draft.json")
        with tempfile.TemporaryDirectory() as t:
            staged = PL.stage_cargo(t, os.path.dirname(p), p)
            self.assertIn("sleeper_draft.json", staged)
            self.assertTrue(os.path.exists(
                os.path.join(t, "newsletter", "data", "inbox", "sleeper_draft.json")))

    # ---- the tautology ------------------------------------------------------------------------

    def test_A_DERIVED_SEAT_DECLARES_THE_draft_order_CHECK_CIRCULAR(self):
        """🚨 THE LOAD-BEARING TEST. The engine prints `[checked] my_slot=N against draft_order`.
        When the seat was TYPED that is two independent readings agreeing. When it was DERIVED from
        draft_order it is the file agreeing with itself -- and it prints identically. Without this
        line the operator reads a green guard that guarded nothing."""
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 3})
        _, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "8",
                               "--draft-id", self.LAB)
        if "against draft_order" not in out:
            self.skipTest("the engine did not run its draft_order oracle on this feed")
        self.assertIn("CIRCULAR", out)

    def test_the_INDEPENDENT_oracle_is_NAMED_once_our_picks_have_landed(self):
        """🚨 THE TEST THAT WOULD HAVE CAUGHT THE FIRST VERSION OF THIS WARNING.

        `parse_provenance` keeps the whole `[checked] ...` line as ONE string and the engine joins
        several claims into it with ' · '. The first cut filtered whole LINES, so on a run where
        `my_slot=3 against our own picks` was present it still announced 'NOTHING here has
        independently confirmed the seat' -- a false red, which insight 009 names as the direction
        that teaches an operator to ignore the warning. The unit test passed because it only
        asserted the word CIRCULAR. RUNNING IT is what found this."""
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 3})
        _, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "5",
                               "--draft-id", self.LAB)
        self.assertIn("against our own picks", out)
        self.assertIn("The independent confirmation is", out)
        self.assertNotIn("NOTHING here has independently confirmed", out,
                         "our own picked_by HAD confirmed the seat -- this is the false red")

    def test_a_NON_SEAT_claim_is_not_mistaken_for_independent_confirmation(self):
        """The opposite error, and the dangerous one. The engine reports 'all 174 board rows carry
        a frozen sleeperId' on the SAME line -- it is not a seat oracle at all. Counting it would
        announce independent confirmation of a seat nothing had confirmed.

        `--at 2` is before slot 3 has picked, so draft_order is the only seat claim available."""
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 3})
        _, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "2",
                               "--draft-id", self.LAB)
        self.assertIn("sleeperId", out, "the fixture must actually carry a non-seat claim")
        self.assertNotIn("against our own picks", out, "our picks must NOT have landed yet")
        self.assertIn("NOTHING here has independently confirmed", out)
        self.assertNotIn("The independent confirmation is", out,
                         "a sleeperId claim was counted as confirming the SEAT")

    def test_A_TYPED_SEAT_DOES_NOT_GET_THE_CIRCULARITY_WARNING(self):
        """The paired control, and the reason the pair is worth more than either half. A warning
        printed unconditionally would pass the test above while destroying the distinction it
        exists to draw -- and would train the operator to ignore it."""
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 3})
        _, out = self.run_main("--slot", "3", "--cargo", d, "--out", self.out, "--feed", FEED,
                               "--at", "8", "--draft-id", self.LAB)
        self.assertNotIn("CIRCULAR", out,
                         "a typed seat checked against draft_order is a REAL check")

    def test_the_unverified_banner_says_whether_the_seat_was_typed_or_derived(self):
        """It used to say `(you passed --slot N)` unconditionally -- which becomes a false
        statement about the operator the moment the seat is derived."""
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 3})
        _, derived = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "8",
                                   "--draft-id", self.LAB)
        _, typed = self.run_main("--slot", "3", "--cargo", d, "--out", self.out, "--feed", FEED,
                                 "--at", "8", "--draft-id", self.LAB)
        for out, word in ((derived, "DERIVED"), (typed, "passed on the command line")):
            if "!!" not in out:
                continue                     # the seat verified, so no banner -- nothing to assert
            self.assertIn(word, out)

    def test_A_TRADED_PICK_OF_OURS_REFUSES_THE_WHOLE_LADDER(self):
        """🚨 `run_engine.py` hard-refuses this and the ladder had NO GATE AT ALL -- `grep -n traded
        scripts/precompute_ladder.py` returned zero. The runbook teaches a standalone
        `precompute_ladder.py` call at Step 4 (the moment your pick lands), so that was the ungated
        path to the identical wrong answer, shelling out to the same engine.

        A traded pick voids "your next pick is #N", which is the ladder's ENTIRE premise: both the
        projection and the QUEUE are built from the gap to that pick. And Step 3.5 loads that queue
        into Sleeper, where auto-pick drains it top-down.

        Tested through main(), not through `read_traded_picks` -- the function already had eleven
        tests in test_run_engine.py while this file's call site had none, which is the exact shape
        of insight 013 and the fourth time it has bitten tonight."""
        traded = os.path.join(self.tmp, "traded.json")
        rosters = os.path.join(self.tmp, "rosters.json")
        with open(rosters, "w", encoding="utf-8") as f:                 # roster 3 is OURS
            json.dump([{"roster_id": 3, "owner_id": PL.W.BRIGGSY_USER_ID}], f)
        with open(traded, "w", encoding="utf-8") as f:                  # ...and it was traded away
            json.dump([{"season": "2026", "round": 4, "roster_id": 3,
                        "previous_owner_id": 3, "owner_id": 1, "draft_id": self.REAL}], f)
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 3})
        rc, out = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "8",
                                "--draft-id", self.LAB,
                                "--traded-cargo", traded, "--rosters-cargo", rosters)
        self.assertEqual(rc, 2, "a traded pick of ours must refuse, exit 2, exactly as run_engine does")
        self.assertIn("SHAPE THE LADDER DOES NOT MODEL", out)
        self.assertFalse(os.path.exists(self.out),
                         "a refused run must not leave a queue for the operator to load")

    def test_THE_CONTROL_no_traded_picks_still_produces_a_ladder(self):
        """Without this, a gate that refused unconditionally would pass the test above and quietly
        stop the ladder from ever being produced -- on a draft where `/traded_picks` returns `[]`,
        which is what it returns today."""
        traded = os.path.join(self.tmp, "traded_empty.json")
        rosters = os.path.join(self.tmp, "rosters2.json")
        with open(traded, "w", encoding="utf-8") as f:
            json.dump([], f)
        with open(rosters, "w", encoding="utf-8") as f:
            json.dump([{"roster_id": 3, "owner_id": PL.W.BRIGGSY_USER_ID}], f)
        d, _ = self.cargo({PL.W.BRIGGSY_USER_ID: 3})
        rc, _ = self.run_main("--cargo", d, "--out", self.out, "--feed", FEED, "--at", "8",
                              "--draft-id", self.LAB,
                              "--traded-cargo", traded, "--rosters-cargo", rosters)
        self.assertEqual(rc, 0)
        self.assertTrue(os.path.exists(self.out), "the clean case must still write a ladder")

if __name__ == "__main__":
    unittest.main()

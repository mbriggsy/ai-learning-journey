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
        """Re-sorting it here would be the second implementation this file exists to avoid."""
        res = self._run(at=14)
        self.assertEqual(res["queue"], [b["name"] for b in res["baseline"]])

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

    def test_the_call_site_passes_the_cargo_dir_the_operator_chose(self):
        """MUTANT M8's shape: hardcoding CARGO here would make --cargo decorative and every test
        above would still pass, because they all happen to point at the fixtures."""
        with open(os.path.join(ROOT, "scripts", "precompute_ladder.py"), encoding="utf-8") as f:
            self.assertIn("reference_draft_id(a.draft_id, a.cargo)", f.read())


if __name__ == "__main__":
    unittest.main()

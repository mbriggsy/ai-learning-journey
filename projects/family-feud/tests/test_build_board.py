#!/usr/bin/env python3
"""U6's generator: staged emit, crash safety, byte-stability, and the guards that refuse.

The load-bearing test here is `test_a_crash_in_the_pdf_renderer_changes_nothing_on_disk`. The
plan forecast exactly that failure -- a badge glyph killing the PDF renderer after the HTML was
already written -- and the whole write-all-or-write-none design exists to contain it. reportlab
turns out not to raise on that particular input (docs/insights/011), so the crash is INJECTED
here rather than provoked: a synthetic raise proves the invariant regardless of which renderer
fails or why, which is the more useful guarantee anyway.

Every assertion in this file has to be able to go red. Where a test asserts something is
refused, there is a paired control proving the same code path ACCEPTS the clean case -- a
generator that refused everything would otherwise pass the lot.
"""
import hashlib
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import build_board as B  # noqa: E402
import render_pdf as RP  # noqa: E402
import validate_board as V  # noqa: E402


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def snapshot(kit):
    return {n: sha(os.path.join(kit, n)) for n in B.SURFACES
            if os.path.exists(os.path.join(kit, n))}


#: COMMITTED cargo, not the mule's inbox. `newsletter/data/inbox/` is gitignored and rewritten
#: hourly, so a suite that reads it passes only on the machine the mule runs on -- hiding
#: sleeper_draft.json turned this suite into 22 errors and 2 failures. These fixtures are a
#: snapshot of the real draft and league objects and travel with the repo.
FIXTURES = os.path.join(ROOT, "tests", "fixtures")
CARGO_DRAFT = os.path.join(FIXTURES, "sleeper_draft.json")
CARGO_LEAGUE = os.path.join(FIXTURES, "sleeper_league.json")


def fixture_shape():
    return B.read_shape(CARGO_DRAFT, CARGO_LEAGUE)


def real_source():
    """The live board, enriched exactly as a build would enrich it."""
    before = B.read_board()
    with open(B.LEDGER, encoding="utf-8") as f:
        ledger = json.load(f)
    return B.enrich(before, fixture_shape(), ledger, ledger.get("meta") or {},
                    B.team_names(), generator_sha="test")


class TestSerializer(unittest.TestCase):
    def test_the_serializer_round_trips_the_shipped_board_byte_for_byte(self):
        """The whole byte-stability claim rests on this one function reproducing the file's
        exact formatting -- indent=1, literal UTF-8, CRLF, no trailing newline."""
        with open(B.BOARD, "rb") as f:
            raw = f.read()
        self.assertEqual(B.board_bytes(json.loads(raw.decode("utf-8"))), raw)

    def test_a_changed_value_changes_the_bytes(self):
        """Control: a serializer that returned a constant would pass the test above."""
        d = B.read_board()
        first = B.board_bytes(d)
        d["players"][0]["r"] = 999
        self.assertNotEqual(B.board_bytes(d), first)


class TestCrashSafety(unittest.TestCase):
    """Write-all-or-write-none, proven by breaking it on purpose."""

    def setUp(self):
        self.kit = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.kit, True)
        for n in B.SURFACES:
            shutil.copy(os.path.join(B.KIT, n), self.kit)
        self.before = snapshot(self.kit)

    def test_a_crash_in_the_pdf_renderer_changes_nothing_on_disk(self):
        source = real_source()
        original = RP.render

        def explode(*a, **kw):
            raise RuntimeError("injected: the PDF renderer died mid-emit")

        RP.render = explode
        self.addCleanup(setattr, RP, "render", original)

        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(RuntimeError):
                B.stage(source, os.path.join(t, "staged"))

        self.assertEqual(snapshot(self.kit), self.before,
                         "a renderer crash altered on-disk surfaces -- the emit is not atomic")

    def test_a_crash_during_replace_restores_every_surface(self):
        """The harder half: the crash lands BETWEEN replaces, so some files already moved.

        Windows gives atomic per-file replace and no atomic multi-file move, which is precisely
        why .last_good/ exists. Without the restore, the first surface would keep its new bytes.
        """
        source = real_source()
        with tempfile.TemporaryDirectory() as t:
            staging = B.stage(source, os.path.join(t, "staged"))
            # Make the staged set genuinely different so a partial write would be detectable.
            self.assertNotEqual(sha(os.path.join(staging, "players_data.json")),
                                self.before["players_data.json"],
                                "staged board is identical to the live one; this test would "
                                "pass even if the restore did nothing")

            real_replace = os.replace
            state = {"n": 0}

            def flaky(src, dst):
                state["n"] += 1
                if state["n"] == 2:            # after the board lands, before the PDF
                    raise OSError("injected: replace failed mid-set")
                return real_replace(src, dst)

            os.replace = flaky
            self.addCleanup(setattr, os, "replace", real_replace)
            with self.assertRaises(OSError):
                B.emit(staging, kit=self.kit, last_good=os.path.join(self.kit, ".last_good"))

        self.assertEqual(snapshot(self.kit), self.before,
                         "a mid-set replace failure left the surfaces in a mixed state")

    def test_the_clean_path_actually_writes(self):
        """Control for both tests above: a generator that never wrote anything would pass them."""
        source = real_source()
        with tempfile.TemporaryDirectory() as t:
            staging = B.stage(source, os.path.join(t, "staged"))
            B.emit(staging, kit=self.kit, last_good=os.path.join(self.kit, ".last_good"))
        self.assertNotEqual(snapshot(self.kit), self.before)


class TestPdfGlyphGuard(unittest.TestCase):
    """The plan's Latin-1 assertion was the wrong test; this pins the right one."""

    def test_the_shipped_glyphs_and_prose_all_pass(self):
        self.assertEqual(B.assert_pdf_safe(RP.pdf_strings(real_source())), [])

    def test_an_emoji_is_refused_before_anything_is_rendered(self):
        bad = B.assert_pdf_safe([("meta.badges[T].glyph", "\U0001F3AF")])
        self.assertTrue(bad, "an emoji passed the cp1252 guard; reportlab would silently "
                             "substitute ZapfDingbats and print a different symbol")
        self.assertIn("U+1F3AF", bad[0])

    def test_the_dagger_and_the_em_dash_are_accepted(self):
        """Both fail Latin-1 and both render correctly. A Latin-1 assertion would reject the
        engine's own I badge and all 34 em-dashes in the source prose."""
        for ch in ("†", "—"):
            with self.assertRaises(UnicodeEncodeError):
                ch.encode("latin-1")
            self.assertEqual(B.assert_pdf_safe([("x", ch)]), [])


class TestDerivations(unittest.TestCase):
    def test_dst_is_the_top_eight_def_rows_and_is_never_carried(self):
        source = real_source()
        defs = sorted((p for p in source["players"] if p["pos"] == "DEF"), key=lambda p: p["pr"])
        self.assertEqual(source["dst"],
                         [{"rank": p["pr"], "team": p["name"]} for p in defs[:8]])

    def test_a_def_row_naming_the_wrong_franchise_is_refused(self):
        """docs/insights/010 applied: the row's own name is an attribute a wrong row would also
        have, so it is cross-checked against the pinned dump's official name for its team code."""
        names = B.team_names()
        rows = [{"pos": "DEF", "team": "HOU", "name": "Houston Texans"}]
        self.assertEqual(B.check_def_identity(rows, names), [])
        rows[0]["name"] = "Denver Broncos"
        problems = B.check_def_identity(rows, names)
        self.assertTrue(problems)
        self.assertIn("different franchise", problems[0])

    def test_the_team_table_comes_from_the_pinned_dump_and_covers_the_league(self):
        self.assertEqual(len(B.team_names()), 32)

    def test_every_row_carries_an_id_string_and_a_method(self):
        for p in real_source()["players"]:
            self.assertIsInstance(p["sleeperId"], str, f"{p['name']}: id is not a string")
            self.assertTrue(p["vorpMethod"])

    def test_k_and_def_are_flagged_as_tier_flat_not_curve_derived(self):
        """Skill rows descend from the curve; K and DEF cannot, because build_curves.py builds
        QB/RB/WR/TE only. The gap is labelled per row rather than filled with invented values."""
        want_skill = B.curve_method()
        for p in real_source()["players"]:
            want = B.VORP_KDEF if p["pos"] in ("K", "DEF") else want_skill
            self.assertEqual(p["vorpMethod"], want, p["name"])

    def test_every_skill_row_matches_the_curve_arithmetic_exactly(self):
        """The value on the board must be reproducible from committed code -- that is the whole
        reason it stopped being carried."""
        source = real_source()
        with open(B.CURVE, encoding="utf-8") as f:
            curve = json.load(f)["curve"]
        base = source["meta"]["vbd"]["baselineWaiver"]
        checked = 0
        for p in source["players"]:
            # MIRROR `recompute_vorp`'s OWN CONDITION -- a curve alone is not enough, a row is
            # derived only when it also has a replacement rank. This used to test `pos in curve`
            # and passed only because K had no curve at all; the moment build_curves.py gained a
            # kicker table it raised KeyError('K') on the baselines, which is the test telling the
            # truth: K now has a curve and still has no baseline, so it is still carried.
            if p["pos"] not in curve or p["pos"] not in base:
                continue
            want = round(curve[p["pos"]][str(p["pr"])] - curve[p["pos"]][str(base[p["pos"]])], 1)
            self.assertEqual(p["vorp"], want, p["name"])
            checked += 1
        self.assertEqual(checked, 150, "expected all 150 skill rows to be curve-derived")

    def test_meta_updated_does_not_advance_with_the_CLOCK(self):
        """It answers "how fresh is the data", not "when did I run". `today` used to be one of the
        floors unconditionally, which made every rebuild the following morning rewrite
        players_data.json, the HTML, the PDF and the methodology doc with byte-identical DATA --
        measured 2026-08-09, all four surfaces changed for no reason but the calendar.

        The gate's rule is one-sided (it only complains when an INPUT is newer than the stamp), so
        max-of-inputs satisfies it and the clock was never buying anything."""
        import datetime as _dt
        src = real_source()
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        far = _dt.date(2099, 12, 31)
        out = B.enrich(B.read_board(), fixture_shape(), ledger, ledger.get("meta") or {},
                       B.team_names(), generator_sha="test", now=far)
        self.assertNotEqual(out["meta"]["updated"], far.isoformat(),
                            "meta.updated followed the clock instead of the inputs")
        self.assertEqual(out["meta"]["updated"], src["meta"]["updated"])

    def test_the_methodology_snapshot_line_reads_the_RANKINGS_date(self):
        """Insight 017 reaching the third surface. render_html and render_pdf were both moved onto
        meta.rankings.synthesized when 017 was written; this block was missed and printed
        meta.updated under the word "Rankings", which is 017's exact title."""
        import copy
        src = copy.deepcopy(real_source())
        src["meta"]["updated"] = "2099-01-02"          # input freshness, deliberately absurd
        src["meta"]["rankings"]["synthesized"] = "2026-03-04"
        line = B.methodology_blocks(src)["snapshot-date"]
        self.assertIn("March 4, 2026", line)
        self.assertNotIn("2099", line, "the snapshot line is fed by meta.updated")

    def test_the_carried_constants_really_are_flat_PER_TIER(self):
        """The label `carried:kdef-tier-flat` promises exactly this and nothing was enforcing it.
        It had already gone false: measured at 917c498a, K tier 2 held {6.0, -2.0} and tier 3 held
        {-2.0, 6.0}, because the consensus re-rank moved kickers while their carried vorp stayed
        pinned to whichever PLAYER happened to hold it."""
        rows = {}
        for p in real_source()["players"]:
            if p["vorpMethod"] == B.VORP_KDEF:
                rows.setdefault(p["pos"], {}).setdefault(p["tier"], set()).add(p["vorp"])
        self.assertTrue(rows, "no carried rows at all -- has the label been renamed?")
        for pos, tiers in rows.items():
            for tier, vals in sorted(tiers.items()):
                self.assertEqual(len(vals), 1, f"{pos} tier {tier} carries {sorted(vals)}")

    def test_a_better_tier_never_carries_a_worse_constant(self):
        for pos in ("K", "DEF"):
            byt = {}
            for p in real_source()["players"]:
                if p["pos"] == pos:
                    byt[p["tier"]] = p["vorp"]
            vals = [byt[t] for t in sorted(byt)]
            self.assertEqual(vals, sorted(vals, reverse=True), f"{pos} tiers {byt}")

    def test_repinning_is_WIRED_into_the_recompute(self):
        """The call site (insight 013). A helper that is never called is decoration, and every
        assertion above would still pass on a board that happened to be tidy already."""
        # The real bug's shape: the constants are attached to the WRONG tiers, exactly as they
        # were after the consensus re-rank moved kickers underneath them. Re-pinning must swap.
        rows = [{"pos": "K", "pr": i, "tier": t, "vorp": v, "r": i, "vorpMethod": "x"}
                for i, (t, v) in enumerate([(1, 5.0), (2, 9.0)], 1)]
        out = B.recompute_vorp(rows, {}, {}, "curve:test")
        self.assertEqual({r["tier"]: r["vorp"] for r in out}, {1: 9.0, 2: 5.0},
                         "the better tier must end up with the better constant")

    def test_it_REFUSES_when_the_constants_cannot_be_one_per_tier(self):
        """Four constants across three tiers was never flat-per-tier. Collapsing it quietly would
        put an invented number on the board under a label that says it was carried."""
        rows = [{"pos": "K", "tier": t, "vorp": v, "vorpMethod": B.VORP_KDEF}
                for t, v in [(1, 9.0), (1, 7.0), (2, 5.0), (3, 1.0)]]
        with self.assertRaises(SystemExit) as ctx:
            B.repin_carried_to_tiers(rows)
        self.assertIn("one constant per tier", str(ctx.exception))

    def test_a_curve_without_a_baseline_leaves_the_row_CARRIED(self):
        """K is the live case: build_curves.py ships a kicker table, meta.vbd ships no kicker
        baseline, so every K row must stay labelled rather than quietly acquiring a vorp computed
        against some other position's replacement level."""
        with open(B.CURVE, encoding="utf-8") as f:
            curve = json.load(f)["curve"]
        source = real_source()
        base = source["meta"]["vbd"]["baselineWaiver"]
        self.assertIn("K", curve, "the kicker curve must exist for this test to mean anything")
        self.assertNotIn("K", base, "if a K baseline is ever added, K stops being carried")
        for p in source["players"]:
            if p["pos"] == "K":
                self.assertEqual(p["vorpMethod"], B.VORP_KDEF, p["name"])

    def test_recompute_preserves_within_position_order(self):
        """RB1 stays RB1. The curve is a rank->points lookup with pr as its input, so vorp is
        monotone in pr by construction; only the CROSS-positional comparison moves."""
        for pos in ("QB", "RB", "WR", "TE"):
            rows = sorted((p for p in real_source()["players"] if p["pos"] == pos),
                          key=lambda p: p["pr"])
            for a, b in zip(rows, rows[1:]):
                self.assertGreaterEqual(a["vorp"], b["vorp"], f"{pos}: {a['name']} vs {b['name']}")

    def test_vbdrank_is_a_permutation_and_vbddelta_follows_from_it(self):
        source = real_source()
        ranks = sorted(p["vbdRank"] for p in source["players"])
        self.assertEqual(ranks, list(range(1, len(ranks) + 1)))
        for p in source["players"]:
            self.assertEqual(p["vbdDelta"], p["r"] - p["vbdRank"], p["name"])


class TestShape(unittest.TestCase):
    """KTD-7: league shape comes from the draft object, and a shape it cannot model is refused."""

    def write_draft(self, **over):
        d = {"draft_id": "1", "type": "snake", "status": "pre_draft", "start_time": None,
             "settings": {"teams": 8, "rounds": 16, "reversal_round": 0, "slots_qb": 1,
                          "slots_rb": 2, "slots_wr": 2, "slots_te": 1, "slots_k": 1,
                          "slots_def": 1, "slots_flex": 2, "slots_bn": 6}}
        d.update({k: v for k, v in over.items() if k != "settings"})
        d["settings"].update(over.get("settings") or {})
        t = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, t, True)
        p = os.path.join(t, "sleeper_draft.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(d, f)
        return p

    @unittest.skipUnless(os.path.exists(B.CARGO), "the mule's cargo is not on this machine")
    def test_the_live_cargo_yields_the_shape(self):
        """An ENVIRONMENT probe, skipped on a clean clone. Every other test in this file runs
        off the committed fixture, so the suite is reproducible anywhere."""
        shape = B.read_shape()
        self.assertEqual(shape["type"], "snake")
        self.assertTrue(shape["teams"] and shape["rounds"] and shape["draft_id"])

    def test_a_clean_draft_object_is_accepted(self):
        self.assertEqual(B.read_shape(self.write_draft(), "/nonexistent")["teams"], 8)

    def test_an_auction_draft_is_refused_rather_than_mismodelled(self):
        with self.assertRaises(B.Refuse):
            B.read_shape(self.write_draft(type="auction"), "/nonexistent")

    def test_third_round_reversal_is_refused(self):
        with self.assertRaises(B.Refuse):
            B.read_shape(self.write_draft(settings={"reversal_round": 3}), "/nonexistent")

    def test_a_missing_draft_object_refuses_instead_of_guessing(self):
        with self.assertRaises(B.Refuse):
            B.read_shape("/nonexistent/draft.json", "/nonexistent")

    def test_two_sources_disagreeing_about_team_count_is_refused(self):
        t = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, t, True)
        league = os.path.join(t, "league.json")
        with open(league, "w", encoding="utf-8") as f:
            json.dump({"settings": {"num_teams": 10, "reserve_slots": 2, "playoff_teams": 6}}, f)
        with self.assertRaises(B.Refuse):
            B.read_shape(self.write_draft(), league)


class TestVbdChipAgreesAcrossSurfaces(unittest.TestCase):
    """The PDF drew a VBD arrow on every K and DEF row while the HTML deliberately suppressed
    them, so the two surfaces disagreed about the same fact. All 24 K/DEF rows clear the |8|
    threshold because their VORP is a flat per-tier constant compared against a curve -- two dozen
    identical green arrows on the one page you hold at the table, hiding the real steals."""

    TEMPLATE = os.path.join(ROOT, "scripts", "templates", "board.html")

    def test_a_real_steal_still_earns_its_arrow(self):
        """The control -- a rule that suppressed everything would also pass every test below."""
        self.assertTrue(RP.draws_vbd_chip({"pos": "RB", "vbdDelta": 14}))
        self.assertTrue(RP.draws_vbd_chip({"pos": "WR", "vbdDelta": -9}))

    def test_kickers_and_defenses_never_draw_one(self):
        for pos in ("K", "DEF"):
            self.assertFalse(RP.draws_vbd_chip({"pos": pos, "vbdDelta": 68}),
                             f"{pos} still draws a VBD arrow")

    def test_a_small_delta_draws_nothing(self):
        self.assertFalse(RP.draws_vbd_chip({"pos": "RB", "vbdDelta": 7}))
        self.assertFalse(RP.draws_vbd_chip({"pos": "RB"}))

    def test_the_board_html_applies_the_same_rule(self):
        """The two surfaces cannot share code across Python and JavaScript, so the agreement is
        asserted instead. If the template drops either exclusion this goes red."""
        with open(self.TEMPLATE, encoding="utf-8") as f:
            js = f.read()
        self.assertIn(f"Math.abs(p.vbdDelta) >= {RP.VBD_CHIP_THRESHOLD}", js)
        for pos in RP.VBD_CHIP_EXCLUDES:
            self.assertIn(f"p.pos !== '{pos}'", js)

    def test_the_live_board_has_rows_on_both_sides_of_the_rule(self):
        """Guards against the rule being trivially satisfied by today's data -- if no row were
        excluded, or none included, the tests above would prove nothing about this board."""
        rows = B.read_board()["players"]
        drawn = [p for p in rows if RP.draws_vbd_chip(p)]
        hidden = [p for p in rows if p["pos"] in RP.VBD_CHIP_EXCLUDES
                  and abs(p.get("vbdDelta") or 0) >= RP.VBD_CHIP_THRESHOLD]
        self.assertTrue(drawn, "no row draws an arrow -- the rule is suppressing everything")
        self.assertTrue(hidden, "no K/DEF row is being suppressed -- the fix is unexercised")


class TestFormatIsDerived(unittest.TestCase):
    """`meta.format` was a hand-typed duplicate of ~8 facts `meta.shape` already carried, and the
    gate cross-checked exactly two of them: teams and rounds. The unguarded half is the ROSTER,
    and the roster is what the PDF header prints -- so a league that moved a flex slot would have
    shipped a cheat sheet describing a lineup nobody was playing, with every check green."""

    def shape(self, **over):
        sh = dict(fixture_shape())
        starters = dict(sh["starters"])
        starters.update(over.pop("starters", {}))
        sh.update(over)
        sh["starters"] = starters
        return sh

    def test_the_derivation_reproduces_the_string_the_league_actually_ships(self):
        """The control, and the proof the fact was right all along -- it was only unguarded."""
        self.assertEqual(
            B.format_line(self.shape(scoring_type="ppr")),
            "8-team · Full PPR · Snake · 16 rounds · QB/2RB/2WR/TE/2FLEX/K/DEF + 6 BN + 2 IR")

    def test_a_moved_flex_slot_changes_the_line(self):
        """THE HALF NOTHING CHECKED. teams and rounds are untouched here, so the old cross-check
        would have passed this without a murmur."""
        line = B.format_line(self.shape(scoring_type="ppr", flex=1))
        self.assertIn("/FLEX/", line)
        self.assertNotIn("2FLEX", line)

    def test_a_dropped_kicker_leaves_the_line(self):
        self.assertNotIn("/K/", B.format_line(self.shape(scoring_type="ppr",
                                                         starters={"K": 0})))

    def test_bench_and_ir_come_from_the_shape(self):
        line = B.format_line(self.shape(scoring_type="ppr", bench=7, ir=0))
        self.assertIn("+ 7 BN", line)
        self.assertNotIn("IR", line)

    def test_an_unlabelled_scoring_type_is_never_assumed_to_be_this_league(self):
        """Inventing 'Full PPR' for a draft that did not say so is how a board asserts a fact it
        does not have. The board header prints this string."""
        self.assertIn("Custom scoring", B.format_line(self.shape(scoring_type="")))
        self.assertIn("HALF PPR", B.format_line(self.shape(scoring_type="half_ppr")).upper())

    def test_a_slot_the_league_invents_still_appears(self):
        """Silently dropping an unknown slot would put the board back to describing a roster that
        is not the one being drafted."""
        self.assertIn("2SUPERFLEX",
                      B.format_line(self.shape(scoring_type="ppr",
                                               starters={"SUPERFLEX": 2})))

    def test_the_generator_restamps_format_from_the_shape_it_is_given(self):
        """A REAL call-site test (insight 013).

        Asserting `meta.format == format_line(meta.shape)` on the built source proves nothing:
        the board on disk already carries the right string, so a generator that never touches the
        field passes. Hand `enrich` a DIFFERENT shape and require the output to follow it --
        delete the assignment and this goes red.
        """
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        moved = dict(fixture_shape(), flex=1)
        out = B.enrich(B.read_board(), moved, ledger, ledger.get("meta") or {},
                       B.team_names(), generator_sha="test")
        self.assertIn("/FLEX/", out["meta"]["format"])
        self.assertNotIn("2FLEX", out["meta"]["format"])

    def test_the_gate_accepts_a_correctly_derived_board(self):
        """The paired control. Without it, the refusal test below would pass on a gate that
        refuses everything."""
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        self.assertEqual(B.G.check_generated_fields(real_source(), ledger), [])

    def test_the_gate_catches_a_hand_edited_format(self):
        """A surface edited by hand is the only thing this check can still catch now that the
        value is derived -- and it is exactly what a gate is for."""
        import copy
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        src = copy.deepcopy(real_source())
        src["meta"]["format"] = src["meta"]["format"].replace("2FLEX", "FLEX")
        problems = B.G.check_generated_fields(src, ledger)
        self.assertTrue(any("meta.format" in p for p in problems),
                        f"the gate missed a hand-edited roster in meta.format: {problems}")

    def test_the_gate_catches_a_shape_that_no_longer_matches_the_prose(self):
        """The same defect from the other side: shape moves, the prose does not."""
        import copy
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        src = copy.deepcopy(real_source())
        src["meta"]["shape"] = dict(src["meta"]["shape"], flex=1)
        self.assertTrue(any("meta.format" in p for p in B.G.check_generated_fields(src, ledger)))

    def test_the_live_board_format_matches_its_own_shape(self):
        board = B.read_board()
        self.assertEqual(board["meta"]["format"], B.format_line(board["meta"]["shape"]))


class TestSlotRangesAreDerived(unittest.TestCase):
    """`strategy.slotNotes[i].slot` held three literal seat ranges -- "Picks 1-3", "Picks 4-6",
    "Picks 7-8" -- over a team count `meta.shape` already carries. The only check that read them
    asserted their numbers were inside teams x rounds, which "Picks 1-3" satisfies in a 10-team
    league while naming a third of the room it claims to name."""

    def test_the_derivation_reproduces_the_labels_the_board_actually_ships(self):
        """The control, and the proof the fact was right all along -- it was only unguarded.
        Byte-for-byte, the same bar `format_line` had to clear before it was trusted."""
        self.assertEqual(B.strategy_slot_ranges(fixture_shape()),
                         ["Picks 1-3", "Picks 4-6", "Picks 7-8"])

    def test_a_ten_team_room_relabels_every_band(self):
        """THE DEFECT. Not one of these three labels is right in a 10-team league, and the old
        in-range check passed all of them."""
        self.assertEqual(B.strategy_slot_ranges(dict(fixture_shape(), teams=10)),
                         ["Picks 1-4", "Picks 5-7", "Picks 8-10"])

    def test_the_remainder_goes_to_the_earliest_bands(self):
        """This is the rule that reproduces 3/3/2 on this league rather than 2/3/3."""
        self.assertEqual(B.strategy_slot_ranges(dict(fixture_shape(), teams=14)),
                         ["Picks 1-5", "Picks 6-10", "Picks 11-14"])

    def test_a_single_seat_band_reads_as_one_pick(self):
        self.assertEqual(B.strategy_slot_ranges(dict(fixture_shape(), teams=3)),
                         ["Pick 1", "Pick 2", "Pick 3"])

    def test_a_room_too_small_to_divide_is_refused_not_mislabelled(self):
        """Emitting "Picks 3-2" would be a label on advice for a seat nobody can draft from."""
        with self.assertRaises(B.UnsupportedShape):
            B.strategy_slot_ranges(dict(fixture_shape(), teams=2))

    def test_the_generator_restamps_the_slots_from_the_shape_it_is_given(self):
        """A REAL call-site test (insight 013). Asserting the built board's slots match its own
        shape proves nothing -- the board on disk already carries the right labels, so a generator
        that never touches the field passes. Hand `enrich` a 10-team shape and require the output
        to follow it. Delete the assignment and this goes red."""
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        out = B.enrich(B.read_board(), dict(fixture_shape(), teams=10), ledger,
                       ledger.get("meta") or {}, B.team_names(), generator_sha="test")
        self.assertEqual([e["slot"] for e in out["strategy"]["slotNotes"]],
                         ["Picks 1-4", "Picks 5-7", "Picks 8-10"])

    def test_the_generator_leaves_the_note_alone(self):
        """The label is data. The note is Briggsy's judgment about drafting from the front, middle
        or back of a room, and that does not become wrong when the room grows."""
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        before = [e["note"] for e in B.read_board()["strategy"]["slotNotes"]]
        out = B.enrich(B.read_board(), dict(fixture_shape(), teams=10), ledger,
                       ledger.get("meta") or {}, B.team_names(), generator_sha="test")
        self.assertEqual([e["note"] for e in out["strategy"]["slotNotes"]], before)

    def test_the_source_hash_still_describes_the_file_as_read(self):
        """The derivation writes into a COPY. `meta.build.source_sha256` is the hash of the input,
        and a derived field leaking into it would quietly change what that field means."""
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        src = B.read_board()
        expected = hashlib.sha256(B.board_bytes(
            {"meta": src["meta"], "players": src["players"],
             "dst": src["dst"], "strategy": src["strategy"]})).hexdigest()
        out = B.enrich(src, dict(fixture_shape(), teams=10), ledger, ledger.get("meta") or {},
                       B.team_names(), generator_sha="test")
        self.assertEqual(out["meta"]["build"]["source_sha256"], expected)

    def test_the_live_board_slots_match_its_own_shape(self):
        board = B.read_board()
        self.assertEqual([e["slot"] for e in board["strategy"]["slotNotes"]],
                         B.strategy_slot_ranges(board["meta"]["shape"]))


class TestRankingsAreCarriedNotGenerated(unittest.TestCase):
    """The one fact the generator refuses to generate, and the reason the gate's check is not
    vacuous.

    CONFIRMED BY MUTATION: changing `enrich` to `dict(carried, judgment=G.judgment_sha(players))`
    -- which looks like a tidy-up and reads like "keep the digest current" -- left the entire
    suite green while destroying the whole mechanism. A recomputed digest agrees with the rows by
    construction, so `check_rankings_provenance` would pass on every board forever, including one
    whose rankings had silently moved. That is residue #3's disease exactly: a check comparing the
    board to another copy of itself.
    """

    def ledger(self):
        with open(B.LEDGER, encoding="utf-8") as f:
            return json.load(f)

    def enriched(self, src, **kw):
        ledger = self.ledger()
        return B.enrich(src, fixture_shape(), ledger, ledger.get("meta") or {},
                        B.team_names(), generator_sha="test", **kw)

    def test_a_STALE_digest_is_carried_through_untouched_so_the_gate_can_see_it(self):
        src = B.read_board()
        src["meta"]["rankings"] = dict(src["meta"]["rankings"], judgment="0000staleff000000")
        out = self.enriched(src)
        self.assertEqual(out["meta"]["rankings"]["judgment"], "0000staleff000000",
                         "enrich() 'fixed' the digest, which makes the gate's check vacuous")
        self.assertTrue(V.check_rankings_provenance(out),
                        "a board carrying a stale digest must still be refused by the gate")

    def test_the_synthesis_date_is_carried_and_never_advanced_to_today(self):
        src = B.read_board()
        src["meta"]["rankings"] = dict(src["meta"]["rankings"], synthesized="2020-01-01")
        out = self.enriched(src)
        self.assertEqual(out["meta"]["rankings"]["synthesized"], "2020-01-01")
        self.assertNotEqual(out["meta"]["rankings"]["synthesized"], out["meta"]["updated"])

    def test_the_flag_restamps_BOTH_the_date_and_the_digest(self):
        src = B.read_board()
        src["meta"]["rankings"] = dict(src["meta"]["rankings"], judgment="0000staleff000000")
        out = self.enriched(src, rankings_synthesized="2026-08-12")
        self.assertEqual(out["meta"]["rankings"]["synthesized"], "2026-08-12")
        self.assertEqual(out["meta"]["rankings"]["judgment"], V.judgment_sha(out["players"]))
        self.assertEqual(V.check_rankings_provenance(out), [])

    def test_a_non_iso_restamp_is_refused_rather_than_written(self):
        with self.assertRaises(B.Refuse) as ctx:
            self.enriched(B.read_board(), rankings_synthesized="Aug 12")
        self.assertIn("not an ISO date", str(ctx.exception))

    def test_a_source_with_no_rankings_key_refuses_and_says_how_to_seed_it(self):
        src = B.read_board()
        del src["meta"]["rankings"]
        with self.assertRaises(B.Refuse) as ctx:
            self.enriched(src)
        self.assertIn("--rankings-synthesized", str(ctx.exception))

    def test_the_LIVE_board_agrees_with_its_own_pinned_digest(self):
        """The board Briggsy actually drafts from. If this goes red, the rankings moved and no
        surface is saying so."""
        self.assertEqual(V.check_rankings_provenance(B.read_board()), [])


class TestManifest(unittest.TestCase):
    def test_the_live_surfaces_match_their_manifest(self):
        self.assertEqual(B.check_manifest(), [])

    def test_a_hand_edited_surface_is_named(self):
        """The only detector that covers the PDF, which has no comment channel to carry a
        warning that it was generated."""
        kit = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, kit, True)
        for n in B.SURFACES:
            shutil.copy(os.path.join(B.KIT, n), kit)
        manifest = os.path.join(kit, "build_manifest.json")
        shutil.copy(B.MANIFEST, manifest)
        self.assertEqual(B.check_manifest(kit=kit, path=manifest), [])

        with open(os.path.join(kit, "family-feud-cheat-sheet.pdf"), "ab") as f:
            f.write(b"% hand-edited\n")
        problems = B.check_manifest(kit=kit, path=manifest)
        self.assertTrue(problems)
        self.assertIn("family-feud-cheat-sheet.pdf", problems[0])


class TestSnapshotClass(unittest.TestCase):
    """KTD-2: the dated twin is deleted and its filename class may never come back."""

    def test_the_kit_has_no_dated_snapshot(self):
        self.assertEqual(B.assert_no_dated_snapshot(), [])

    def test_a_reappearing_dated_snapshot_is_caught(self):
        kit = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, kit, True)
        self.assertEqual(B.assert_no_dated_snapshot(kit), [])
        open(os.path.join(kit, "draft_rankings_data_2026-08-05.json"), "w").close()
        self.assertTrue(B.assert_no_dated_snapshot(kit))


class TestOneGlyphSource(unittest.TestCase):
    """The same eight badges used to be rendered in three places -- the engine, the HTML and the
    PDF -- each with its own table. A new badge meant editing three files, and any one of them
    silently rendering nothing."""

    def test_the_engine_no_longer_carries_its_own_glyph_table(self):
        """Checked on the glyphs that are DISTINCTIVE, not all eight.

        Four of them -- + ! ^ v -- are ordinary characters that appear throughout the engine's
        prose and format strings, so asserting their absence would fail on unrelated text. The
        table's real signature is the non-ASCII set, which has no other reason to be in the file.
        """
        with open(os.path.join(B.KIT, "draft_engine.py"), encoding="utf-8") as f:
            src = f.read()
        for glyph in ("»", "†", "°", "§"):
            self.assertNotIn(glyph, src,
                             f"draft_engine.py still contains the glyph {glyph!r}; it must read "
                             f"meta.badges[code].glyph or it is a fourth glyph source")
        self.assertIn("BADGE_GLYPH", src)
        self.assertIn("meta", src)

    def test_every_declared_badge_has_a_printable_glyph(self):
        badges = real_source()["meta"]["badges"]
        self.assertEqual(sorted(badges), sorted(B.BADGE_GLYPHS))
        for code, spec in badges.items():
            self.assertEqual(len(spec["glyph"]), 1, code)
            spec["glyph"].encode("cp1252")          # raises if the PDF could not print it

    def test_every_badge_used_on_a_row_is_declared(self):
        source = real_source()
        declared = set(source["meta"]["badges"])
        used = {b for p in source["players"] for b in p["badges"]}
        self.assertEqual(used - declared, set())


class TestStrategyOverflowRefuses(unittest.TestCase):
    """`block()` used to `return y` the moment it ran past the page floor -- it stopped drawing,
    dropped every remaining line, and reported success. The PDF has no comment channel and cannot
    warn you it is incomplete, so a sheet missing the eleventh commandment reads as finished."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.source = real_source()

    def test_todays_prose_still_renders(self):
        """The control. A guard that refused everything would take the whole cheat sheet with it,
        and this one has never fired in anger -- which is exactly why it needs a control."""
        out = RP.render(self.source, os.path.join(self.tmp, "ok.pdf"))
        self.assertTrue(os.path.getsize(out) > 0)

    def test_prose_that_would_be_truncated_refuses_instead(self):
        import copy
        src = copy.deepcopy(self.source)
        src["strategy"]["rules"].append("Never let the cheat sheet lie to you. " * 90)
        with self.assertRaises(RP.StrategyOverflow):
            RP.render(src, os.path.join(self.tmp, "over.pdf"))

    def test_the_refusal_says_how_much_was_lost(self):
        """"It did not fit" is not actionable; "THE COMMANDMENTS lost 37 lines" is."""
        import copy
        src = copy.deepcopy(self.source)
        src["strategy"]["rules"].append("Never let the cheat sheet lie to you. " * 90)
        try:
            RP.render(src, os.path.join(self.tmp, "over.pdf"))
        except RP.StrategyOverflow as e:
            self.assertIn("COMMANDMENTS", str(e))
            self.assertRegex(str(e), r"lost \d+ line")
        else:
            self.fail("expected StrategyOverflow")


class TestPdfLayout(unittest.TestCase):
    """The sheet is held at a table. Nothing may be dropped, and no heading may be orphaned."""

    def setUp(self):
        self.source = real_source()
        self.pages, self.density = RP.layout(self.source)

    def test_the_whole_board_fits_on_one_page(self):
        self.assertEqual(len(self.pages), 1,
                         "the board spilled onto a second page; DENSITY has no preset tight "
                         "enough, or an item's declared height stopped matching what is drawn")

    def test_every_row_is_placed_exactly_once(self):
        placed = [p["name"] for page in self.pages for col in page
                  for _, kind, p in col if kind == "row"]
        self.assertEqual(len(placed), len(self.source["players"]))
        self.assertEqual(len(set(placed)), len(placed), "a row was placed twice")

    def test_no_column_ends_on_an_orphaned_heading(self):
        """A column break after "KICKERS / TIER 1" strands the heading with its rows in the next
        column -- readable if you already know the board, misleading at a draft."""
        for page in self.pages:
            for ci, col in enumerate(page):
                kinds = [k for _, k, _ in col]
                if not kinds:
                    continue
                tail = kinds[-1]
                self.assertEqual(tail, "row",
                                 f"column {ci} ends on a {tail!r} with no row under it")

    def test_no_column_overflows_the_page(self):
        cap = self.density["top"] - self.density["floor"]
        for page in self.pages:
            for ci, col in enumerate(page):
                used = sum(h for h, _, _ in col)
                self.assertLessEqual(used, cap + 0.01,
                                     f"column {ci} is {used:.1f}pt in a {cap:.1f}pt column")

    def test_a_much_larger_board_degrades_to_more_pages_instead_of_cramming(self):
        """Control: layout() must not silently render an unreadable sheet when the board grows
        past what the tightest preset can hold."""
        import copy
        big = copy.deepcopy(self.source)
        big["players"] = big["players"] * 3
        pages, density = RP.layout(big)
        self.assertGreater(len(pages), 1)
        self.assertGreaterEqual(density["row"], 8.4, "row pitch went below the readable floor")


class TestGeneratedDocs(unittest.TestCase):
    """docs/ranking-methodology.md carried board figures as hand-typed prose."""

    def test_every_generated_block_matches_the_live_board(self):
        source = real_source()
        with open(B.METHODOLOGY, encoding="utf-8") as f:
            text = f.read()
        for name, body in B.methodology_blocks(source).items():
            self.assertIn(body, text, f"the {name!r} block is stale; run build_board.py")

    def test_a_missing_block_is_refused_rather_than_silently_skipped(self):
        """A block someone deleted would take its numbers back to hand-maintained without
        anything saying so."""
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        path = os.path.join(d, "doc.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write("no blocks here\n")
        with self.assertRaises(B.Refuse):
            B.write_methodology(real_source(), path=path)

    def test_the_worked_example_follows_the_board_rather_than_named_players(self):
        source = real_source()
        picked = {p["pos"]: p["name"] for p in B._headline_rows(source)}
        for pos, name in picked.items():
            best = max((p for p in source["players"] if p["pos"] == pos),
                       key=lambda p: p["vorp"])
            self.assertEqual(name, best["name"])


class TestOldValueSweep(unittest.TestCase):
    """Only possible because the generator holds the previous AND the new value."""

    def test_an_unchanged_refresh_reports_nothing(self):
        board = B.read_board()
        self.assertEqual(B.old_value_sweep(board, board), [])

    def test_a_changed_baseline_is_found_in_the_docs_that_quote_it(self):
        import copy
        before = B.read_board()
        after = copy.deepcopy(before)
        after["meta"]["vbd"]["baselineWaiver"]["RB"] = 44
        hits = B.old_value_sweep(before, after)
        self.assertTrue(hits, "the sweep did not notice RB41 surviving in prose")
        self.assertTrue(any("ranking-methodology.md" in h for h in hits), hits)

    def top_two(self, board, pos="RB"):
        """Headline rows are chosen by MAX VORP, not by board rank -- so identity only changes
        when vorp changes. Reordering `pr` leaves the headline row exactly where it was, which is
        a trap worth stating: an early draft of these tests moved `pr` and proved nothing."""
        rows = sorted([p for p in board["players"] if p["pos"] == pos and p.get("vorp")
                       is not None], key=lambda p: -p["vorp"])
        return rows[0], rows[1]

    def sweep_against(self, before, after, text):
        root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, root, True)
        with open(os.path.join(root, "doc.md"), "w", encoding="utf-8") as f:
            f.write(text)
        return B.old_value_sweep(before, after, root=root)

    def quote(self, name, value):
        """A number must be followed by whitespace, not a period: the sweep's boundary regex is
        `(?![\\w.])`, so 'at 254.4.' does not match while 'at 254.4 points' does. Correct -- a
        version string is not a board value -- but easy to get wrong when writing a fixture."""
        return f"The board says {name} is worth {value} points this season.\n"

    def test_a_headline_row_that_changes_identity_is_still_swept(self):
        """THE REFRESH THE SWEEP COULD NOT SEE.

        The keys are `vorp[<player name>]`, so the moment the top RB changes, the previous
        leader's key is absent from the new side and the old `k in new` test dropped it -- the
        refresh most likely to leave a stale name-and-number in a doc was the one refresh this
        sweep was blind to.
        """
        import copy
        before = B.read_board()
        after = copy.deepcopy(before)
        leader, runner_up = self.top_two(after)
        was = leader["vorp"]
        # Drop him below the #2, so the headline RB becomes a DIFFERENT PLAYER and his own number
        # moves. Under the old `k in new` test his key vanished from the new side and his stale
        # value was never swept at all.
        leader["vorp"] = runner_up["vorp"] - 10
        hits = self.sweep_against(before, after, self.quote(leader["name"], was))
        self.assertTrue(hits, "a former headline row's stale value went unswept")
        self.assertIn(str(was), hits[0])
        self.assertIn("no longer a headline row", hits[0])

    def test_a_former_leader_whose_number_did_not_move_is_NOT_reported(self):
        """No false positives. Losing the top slot does not make a correctly-quoted number stale,
        and a sweep that cried wolf here would fire on every refresh that reorders a position."""
        import copy
        before = B.read_board()
        after = copy.deepcopy(before)
        leader, runner_up = self.top_two(after)
        runner_up["vorp"] = leader["vorp"] + 10           # promote #2; leader's own value intact
        hits = self.sweep_against(before, after, self.quote(leader["name"], leader["vorp"]))
        self.assertEqual(hits, [], f"reported a value that did not actually change: {hits}")

    def test_a_headline_player_who_leaves_the_board_is_reported_as_gone(self):
        import copy
        before = B.read_board()
        after = copy.deepcopy(before)
        leader, _ = self.top_two(after)
        was = leader["vorp"]
        after["players"] = [p for p in after["players"] if p["name"] != leader["name"]]
        hits = self.sweep_against(before, after, self.quote(leader["name"], was))
        self.assertTrue(hits, "a departed headline player's value went unswept")
        self.assertIn("no longer on the board", hits[0])

    def headline(self, board):
        """The row the sweep actually tracks: MAX vorp, not board rank (residue #7)."""
        return max(board["players"], key=lambda p: p.get("vorp") or 0)

    def test_history_is_never_swept(self):
        """docs/insights/ and docs/plans/ quote past values on purpose. Insight 005 records
        Gibbs at 268.4 as the measurement it was; rewriting it would destroy the evidence.

        THE EVIDENCE IS PLANTED HERE rather than borrowed from the live repo. This test used to
        name Jahmyr Gibbs and rely on the real docs happening to quote his value -- true only
        because he sat in the generated worked-example table. The consensus re-rank put Bijan
        Robinson in that slot, so the control found nothing and the test went red for a reason
        with no bearing on the exemption it exists to prove. A control that depends on today's
        board is not a control.
        """
        import copy
        before = B.read_board()
        after = copy.deepcopy(before)
        victim = self.headline(after)
        was = victim["vorp"]
        victim["vorp"] = 999.9

        root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, root, True)
        text = self.quote(victim["name"], was)
        for rel in ("notes.md",
                    os.path.join("docs", "insights", "005-worked-case.md"),
                    os.path.join("docs", "plans", "some-plan.md")):
            path = os.path.join(root, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)

        hits = B.old_value_sweep(before, after, root=root)
        self.assertTrue(hits, "control failed: the sweep found nothing at all")
        self.assertTrue(any("notes.md" in h for h in hits),
                        f"the plain doc was not swept, so the exemption below proves nothing: {hits}")
        for h in hits:
            self.assertNotIn("insights", h)
            self.assertNotIn("plans", h)

    def test_a_GENERATED_block_is_not_swept(self):
        """`write_methodology` rewrites those blocks from the source on the same run, moments
        before the sweep reads them, so they cannot be stale.

        This fired for real: Gibbs' vorp went 254.4 -> 217.7 while Bijan's became exactly 254.4,
        and the sweep reported the freshly regenerated worked-example table -- correct, current,
        and about a different player -- as carrying a previous value. The sweep matches a VALUE,
        not a value beside a name, so that collision is not distinguishable; excluding blocks that
        are regenerated anyway is. Paired with a control, because a rule that excluded everything
        would satisfy the first assertion alone.
        """
        import copy
        before = B.read_board()
        after = copy.deepcopy(before)
        victim = self.headline(after)
        was = victim["vorp"]
        victim["vorp"] = 999.9
        quote = self.quote(victim["name"], was)

        root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, root, True)
        with open(os.path.join(root, "generated.md"), "w", encoding="utf-8") as f:
            f.write("<!-- BEGIN GENERATED worked-example -->\n" + quote
                    + "<!-- END GENERATED worked-example -->\n")
        with open(os.path.join(root, "prose.md"), "w", encoding="utf-8") as f:
            f.write(quote)                                     # the control

        hits = B.old_value_sweep(before, after, root=root)
        self.assertTrue(any("prose.md" in h for h in hits),
                        f"the control was not swept, so the exclusion proves nothing: {hits}")
        self.assertFalse(any("generated.md" in h for h in hits),
                         f"a regenerated block was reported as stale: {hits}")


class TestTheGuardsAreWired(unittest.TestCase):
    """Every test here exists because the guard it covers could be DELETED with the suite still
    green. A guard nothing can notice the absence of is decoration -- insight 006 at the level of
    the test suite rather than the code.

    Each one was confirmed by mutation: neuter the guard, watch this go red, restore.
    """

    def setUp(self):
        self.kit = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.kit, True)
        for n in B.SURFACES:
            shutil.copy(os.path.join(B.KIT, n), self.kit)
        self.before = snapshot(self.kit)

        # Several tests here call the real build(), which writes the LIVE surfaces -- build() has
        # no kit override. A test run must not leave the working tree modified (and an
        # interrupted run must not either), so the exact bytes are captured and restored
        # unconditionally. `git status` after the suite is part of the suite's contract.
        self._saved = {}
        for path in [os.path.join(B.KIT, n) for n in B.SURFACES] + [B.MANIFEST]:
            if os.path.exists(path):
                with open(path, "rb") as f:
                    self._saved[path] = f.read()
        self.addCleanup(self._restore_live_surfaces)

    def _restore_live_surfaces(self):
        for path, blob in self._saved.items():
            with open(path, "wb") as f:
                f.write(blob)

    def test_a_red_gate_stops_the_emit(self):
        """Nothing proved the gate was WIRED to anything. Stubbing gate_staged to return [] left
        the whole suite green -- so a build could ship a board the gate had rejected."""
        real = B.gate_staged
        B.gate_staged = lambda staging, full=True: ["INJECTED: the gate rejected this board"]
        self.addCleanup(setattr, B, "gate_staged", real)

        with self.assertRaises(B.Refuse) as ctx:
            B.build(allow_dirty=True, full=False, cargo=CARGO_DRAFT, league_cargo=CARGO_LEAGUE)
        self.assertIn("INJECTED", str(ctx.exception))
        self.assertIn("nothing was written", str(ctx.exception))
        self.assertEqual(snapshot(B.KIT), snapshot(B.KIT))     # live surfaces untouched

    def test_the_cp1252_guard_is_wired_into_stage_not_just_defined(self):
        """assert_pdf_safe was tested as a function. Deleting the `if bad: raise` inside stage()
        left every test green, because nothing exercised the wiring."""
        real = B.assert_pdf_safe
        B.assert_pdf_safe = lambda strings: ["INJECTED: not cp1252-encodable"]
        self.addCleanup(setattr, B, "assert_pdf_safe", real)

        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(B.Refuse) as ctx:
                B.stage(real_source(), os.path.join(t, "staged"))
        self.assertIn("INJECTED", str(ctx.exception))

    def test_check_generated_fields_is_wired_into_the_gate(self):
        """The one gate check no test could notice. Deleting it entirely left 315/315 green,
        which means every field U6 added was effectively unvalidated."""
        import validate_board as V
        real = V.check_generated_fields
        V.check_generated_fields = lambda d, ledger: ["INJECTED: a generated field is wrong"]
        self.addCleanup(setattr, V, "check_generated_fields", real)
        self.assertIn("INJECTED: a generated field is wrong", V.validate(full=False))

    def test_check_generated_fields_actually_rejects_each_field_it_owns(self):
        import copy
        import validate_board as V
        with open(B.LEDGER, encoding="utf-8") as f:
            ledger = json.load(f)
        good = B.read_board()
        self.assertEqual(V.check_generated_fields(good, ledger), [],
                         "the live board fails its own generated-field check")

        for mutate, needle in (
            (lambda d: d["players"][0].__setitem__("sleeperId", {"sleeperId": "9221"}), "expected a string"),
            (lambda d: d["players"][0].__setitem__("sleeperId", "not-an-id!"), "neither a numeric id"),
            (lambda d: d["players"][0].pop("vorpMethod"), "vorpMethod"),
            (lambda d: d["meta"]["badges"]["T"].__setitem__("glyph", "☃"), "cp1252"),
            (lambda d: d["meta"]["badges"]["T"].pop("glyph"), "glyph"),
            (lambda d: d["meta"].pop("shape"), "meta.shape is missing"),
        ):
            d = copy.deepcopy(good)
            mutate(d)
            problems = V.check_generated_fields(d, ledger)
            self.assertTrue(problems, f"no problem reported for the mutation expecting {needle!r}")
            self.assertTrue(any(needle in p for p in problems),
                            f"expected {needle!r} in {problems}")

    def test_an_unchanged_rebuild_is_byte_stable(self):
        """The plan's byte-stable criterion was asserted in a commit message and nowhere else.
        Forcing _content_equal to False left the suite green while every rebuild churned."""
        before = snapshot(B.KIT)
        B.build(allow_dirty=True, full=False, cargo=CARGO_DRAFT, league_cargo=CARGO_LEAGUE)
        self.assertEqual(snapshot(B.KIT), before,
                         "an unchanged rebuild changed the bytes on disk")

    def test_byte_stability_is_not_vacuous(self):
        """Control: the test above would also pass if build() wrote nothing at all."""
        real = B._content_equal
        B._content_equal = lambda a, b: False       # force a fresh meta.build stamp
        self.addCleanup(setattr, B, "_content_equal", real)
        before = snapshot(B.KIT)
        B.build(allow_dirty=True, full=False, cargo=CARGO_DRAFT, league_cargo=CARGO_LEAGUE)
        self.assertNotEqual(snapshot(B.KIT), before,
                            "build() did not write, so the stability test proves nothing")
        B._content_equal = real
        B.build(allow_dirty=True, full=False, cargo=CARGO_DRAFT, league_cargo=CARGO_LEAGUE)        # restore a stable board for later tests

    def test_the_engine_actually_prints_a_glyph_from_the_board(self):
        """Setting BADGE_GLYPH = {} in the engine left all 315 tests green: the only coverage was
        a grep of the source. A data-driven table that resolves to empty renders nothing, silently,
        and the badge column is doctrine on a 120-second clock."""
        import subprocess
        import sys as _sys
        work = os.path.join(self.kit, "run")
        os.makedirs(work, exist_ok=True)
        for n in ("players_data.json", "normalize.py", "sleeper_ids.json", "draft_engine.py"):
            shutil.copy(os.path.join(B.KIT, n), work)
        with open(os.path.join(B.ROOT, "tests", "fixtures", "lab_feed_120.json"),
                  encoding="utf-8") as f:
            picks = json.load(f)
        picks.sort(key=lambda p: p["pick_no"])
        with open(os.path.join(work, "picks.json"), "w", encoding="utf-8") as f:
            json.dump(picks[:77], f, ensure_ascii=False)
        env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
        out = subprocess.run([_sys.executable, os.path.join(work, "draft_engine.py"),
                              "3", "8", "16", str(picks[0]["draft_id"])],
                             cwd=work, capture_output=True, text=True, encoding="utf-8",
                             env=env, timeout=120)
        self.assertEqual(out.returncode, 0, out.stderr[-400:])
        # DISTINCTIVE glyphs only. Four of the eight are + ! ^ v, which the engine's ordinary
        # output contains anyway -- an intersection against all eight is never empty, so the
        # first version of this assertion passed with BADGE_GLYPH = {} planted. The non-ASCII
        # four have no other reason to appear. Measured on this fixture: » † ° each appear.
        distinctive = {"»", "†", "°", "§"}
        found = distinctive & set(out.stdout)
        self.assertTrue(found, "the engine printed NO distinctive badge glyph -- the data-driven "
                               "table resolved to nothing and the badge column silently vanished")


class TestVerifyOnly(unittest.TestCase):
    def test_verify_only_passes_against_the_shipped_surfaces(self):
        self.assertEqual(B.verify_only(full=False), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)

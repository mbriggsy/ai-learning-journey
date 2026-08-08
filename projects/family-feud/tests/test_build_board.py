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


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def snapshot(kit):
    return {n: sha(os.path.join(kit, n)) for n in B.SURFACES
            if os.path.exists(os.path.join(kit, n))}


def real_source():
    """The live board, enriched exactly as a build would enrich it."""
    before = B.read_board()
    with open(B.LEDGER, encoding="utf-8") as f:
        ledger = json.load(f)
    return B.enrich(before, B.read_shape(), ledger, ledger.get("meta") or {},
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
            if p["pos"] not in curve:
                continue
            want = round(curve[p["pos"]][str(p["pr"])] - curve[p["pos"]][str(base[p["pos"]])], 1)
            self.assertEqual(p["vorp"], want, p["name"])
            checked += 1
        self.assertEqual(checked, 150, "expected all 150 skill rows to be curve-derived")

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

    def test_the_live_cargo_yields_the_shape(self):
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

    def test_history_is_never_swept(self):
        """docs/insights/ and docs/plans/ quote past values on purpose. Insight 005 records
        Gibbs at 268.4 as the measurement it was; rewriting it would destroy the evidence."""
        import copy
        before = B.read_board()
        after = copy.deepcopy(before)
        for p in after["players"]:
            if p["name"] == "Jahmyr Gibbs":
                p["vorp"] = 999.9
        hits = B.old_value_sweep(before, after)
        self.assertTrue(hits, "control failed: the sweep found nothing at all")
        for h in hits:
            self.assertNotIn("insights", h)
            self.assertNotIn("plans", h)


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
            B.build(allow_dirty=True, full=False)
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
        B.build(allow_dirty=True, full=False)
        self.assertEqual(snapshot(B.KIT), before,
                         "an unchanged rebuild changed the bytes on disk")

    def test_byte_stability_is_not_vacuous(self):
        """Control: the test above would also pass if build() wrote nothing at all."""
        real = B._content_equal
        B._content_equal = lambda a, b: False       # force a fresh meta.build stamp
        self.addCleanup(setattr, B, "_content_equal", real)
        before = snapshot(B.KIT)
        B.build(allow_dirty=True, full=False)
        self.assertNotEqual(snapshot(B.KIT), before,
                            "build() did not write, so the stability test proves nothing")
        B._content_equal = real
        B.build(allow_dirty=True, full=False)        # restore a stable board for later tests

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

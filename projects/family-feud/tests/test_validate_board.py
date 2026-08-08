#!/usr/bin/env python3
"""Tests for scripts/validate_board.py -- U4, the board schema gate.

    python3 -m unittest discover -s tests -v        (from the project root)

Every check here exists because something reproduced silently did the wrong thing, so every test
is one mutation and an assertion that the gate names the offender. The positive control at the
bottom matters as much as any of them: a gate that rejects everything passes every rejection test
ever written.

THE GATE IS BORN RED and TestTheRealBoardToday pins exactly which surfaces are drifted. That test
is expected to CHANGE when a surface is fixed -- it is a record of known drift, not a target to
keep green. What it must never do is quietly grow a new failure family nobody noticed.

No network: the dump is a dict built here, or the one U14 pinned. No PDF is synthesised here --
the PDF check is exercised against the real cheat sheet, against a missing path, and against a
player who cannot be on it (the positive control on the text extractor).
"""
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
import validate_board as V  # noqa: E402

TEAMS = [("HOU", "Houston", "Texans"), ("DEN", "Denver", "Broncos"), ("SEA", "Seattle", "Seahawks"),
         ("LAR", "Los Angeles", "Rams"), ("PHI", "Philadelphia", "Eagles"),
         ("MIN", "Minnesota", "Vikings"), ("BAL", "Baltimore", "Ravens"), ("KC", "Kansas City", "Chiefs"),
         ("BUF", "Buffalo", "Bills")]


def player(r, name, pos, team, pr, tier=1, badges=None, vbd_rank=None):
    vr = r if vbd_rank is None else vbd_rank
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": pr, "tier": tier,
            "badges": badges if badges is not None else [], "note": "n",
            "vorp": 10.0, "vbdRank": vr, "vbdDelta": r - vr}


def good_board():
    """A board that passes every static check. Nine DEF rows so the top-8 dst rule has slack."""
    players = [player(1, "Alpha One", "RB", "KC", 1),
               player(2, "Bravo Two", "WR", "SF", 1),
               player(3, "Charlie Three", "K", "DAL", 1)]
    for i, (code, city, nick) in enumerate(TEAMS):
        players.append(player(4 + i, f"{city} {nick}", "DEF", code, 1 + i))
    dst = [{"rank": i + 1, "team": f"{c} {n}"} for i, (_, c, n) in enumerate(TEAMS[:8])]
    return {
        "meta": {"updated": "2026-08-05", "format": "8-team · Full PPR · Snake · 16 rounds",
                 "badges": {"T": {"label": "t"}, "I": {"label": "i"}},
                 "vbd": {"baselineWaiver": {"QB": 12}, "lastStarter": {"QB": 8}}},
        "players": players,
        "dst": dst,
        "strategy": {"rules": ["Take the best player."], "kickers": "Kickers are on — 1 of them.",
                     "roundPlan": [{"rounds": "1-2", "plan": "studs"}],
                     "slotNotes": [{"slot": "Picks 1-3", "note": "lock a tier 1"}]},
    }


def dump_for(board):
    """A pinned-dump dict whose records agree with the board, so the gate has nothing to say."""
    players = {}
    for i, p in enumerate(board["players"]):
        if p["pos"] == "DEF":
            city, nick = p["name"].rsplit(" ", 1)
            players[p["team"]] = {"player_id": p["team"], "first_name": city, "last_name": nick,
                                  "team": p["team"], "position": "DEF"}
        else:
            first, last = p["name"].split(" ", 1)
            players[str(1000 + i)] = {"player_id": str(1000 + i), "first_name": first,
                                      "last_name": last, "full_name": p["name"],
                                      "team": p["team"], "position": p["pos"]}
    return {"fetched_at": "2026-08-01T00:00:00+00:00", "count": len(players), "players": players}


def ledger_for(board, dump):
    ids = {}
    for p in board["players"]:
        pid = next(k for k, v in dump["players"].items()
                   if f"{v.get('first_name','')} {v.get('last_name','')}".strip() == p["name"])
        ids[p["name"]] = {"sleeperId": pid, "resolved_on": "2026-08-01"}
    return {"ids": ids, "unresolved": [], "meta": {"dump_fetched_at": "2026-08-01T00:00:00+00:00"}}


class GateCase(unittest.TestCase):
    def setUp(self):
        self.b = good_board()
        self.dump = dump_for(self.b)
        self.ledger = ledger_for(self.b, self.dump)

    def only(self, problems, needle):
        self.assertTrue(any(needle in p for p in problems),
                        f"no problem mentioned {needle!r}; got {problems}")


class TestCleanBoardPassesEveryStaticCheck(GateCase):
    """THE POSITIVE CONTROL. A gate that rejects everything passes every rejection test below."""

    def test_nothing_is_reported(self):
        found = (V.check_structure(self.b) + V.check_rows(self.b["players"])
                 + V.check_invariants(self.b["players"])
                 + V.check_names(self.b["players"], self.dump) + V.check_badges(self.b)
                 + V.check_dst(self.b, self.dump) + V.check_strategy(self.b)
                 + V.check_sleeper_ids(self.b["players"], self.ledger, self.dump)
                 + V.check_meta_freshness(self.b, self.ledger, self.dump))
        self.assertEqual(found, [])


class TestStructure(GateCase):
    def test_an_empty_player_list_is_refused(self):
        """It exits 0 with a complete-looking empty advisory -- confident, well-formed, and
        about nothing."""
        self.b["players"] = []
        self.only(V.check_structure(self.b), "empty")

    def test_an_unexpected_top_level_key_is_refused(self):
        self.b["extra"] = 1
        self.only(V.check_structure(self.b), "top-level keys")


class TestRowTypes(GateCase):
    def test_a_float_vbddelta_is_refused(self):
        """Passes an empty-picks smoke run and dies three picks in: :+d raises on a float and
        takes the WHOLE advisory down, not just the row."""
        self.b["players"][1]["vbdDelta"] = 0.0
        self.only(V.check_rows(self.b["players"]), "vbdDelta")

    def test_a_missing_badges_list_is_refused(self):
        del self.b["players"][1]["badges"]
        self.only(V.check_rows(self.b["players"]), "badges")

    def test_a_bool_where_an_int_belongs_is_refused(self):
        """bool subclasses int, so True sails straight through isinstance(v, int)."""
        self.b["players"][1]["tier"] = True
        self.only(V.check_rows(self.b["players"]), "tier")

    def test_an_unknown_position_is_refused(self):
        """'DST' makes the whole position vanish from TIER CLIFFS at exit 0."""
        self.b["players"][1]["pos"] = "DST"
        self.only(V.check_rows(self.b["players"]), "'pos'")

    def test_the_offending_row_is_named(self):
        self.b["players"][1]["vbdDelta"] = 1.5
        self.only(V.check_rows(self.b["players"]), "Bravo Two")


class TestInvariants(GateCase):
    def test_a_duplicate_board_rank_is_refused(self):
        self.b["players"][1]["r"] = 1
        self.only(V.check_invariants(self.b["players"]), "duplicate")

    def test_a_vbddelta_inconsistent_with_r_minus_vbdrank_is_refused(self):
        self.b["players"][1]["vbdDelta"] = 99
        self.only(V.check_invariants(self.b["players"]), "vbdDelta 99")

    def test_a_gap_in_positional_rank_is_refused(self):
        self.b["players"][-1]["pr"] = 99
        self.only(V.check_invariants(self.b["players"]), "'pr'")

    def test_values_present_on_some_rows_only_is_refused(self):
        """The engine prints a row without `vorp` SILENTLY, so a partial board loses the chip
        on some rows and nobody notices."""
        del self.b["players"][1]["vorp"]
        self.only(V.check_invariants(self.b["players"]), "all-present-or-all-absent".split("-")[0])

    def test_non_contiguous_tiers_are_refused(self):
        self.b["players"][0]["tier"] = 3
        self.only(V.check_invariants(self.b["players"]), "tiers within RB")


class TestNames(GateCase):
    def test_two_rows_colliding_under_norm_are_refused(self):
        """One pick would remove TWO rows from availability."""
        self.b["players"][1]["name"] = "Alpha One Jr."
        self.only(V.check_names(self.b["players"], self.dump), "norm() key")

    def test_a_name_absent_from_the_pinned_dump_is_refused(self):
        self.b["players"][1]["name"] = "Nobody Atall"
        self.only(V.check_names(self.b["players"], self.dump), "does not resolve")


class TestBadges(GateCase):
    def test_a_badge_code_absent_from_meta_is_refused(self):
        """draft_engine.py uses .get(b, ""), so an unknown code renders as NOTHING, silently,
        while the HTML renders `undefined`."""
        self.b["players"][0]["badges"] = ["Z"]
        self.only(V.check_badges(self.b), "'Z'")


class TestDst(GateCase):
    def test_a_dst_that_is_not_the_top_eight_by_pr_is_refused(self):
        """The verified drift was ENTIRELY in dst and strategy -- the two sections a row-level
        gate never inspects."""
        self.b["dst"][0]["team"] = "Buffalo Bills"
        self.only(V.check_dst(self.b, self.dump), "not the top 8")

    def test_a_short_dst_is_refused(self):
        self.b["dst"] = self.b["dst"][:6]
        self.only(V.check_dst(self.b, self.dump), "6 entries")

    def test_a_non_contiguous_dst_rank_is_refused(self):
        self.b["dst"][2]["rank"] = 9
        self.only(V.check_dst(self.b, self.dump), "contiguous")


class TestStrategy(GateCase):
    def test_a_missing_strategy_section_is_refused(self):
        del self.b["strategy"]["kickers"]
        self.only(V.check_strategy(self.b), "strategy keys")

    def test_a_count_claimed_in_prose_that_the_board_contradicts_is_refused(self):
        """'10 of them' vs the actual K count -- U5 is licensed to change what is underneath."""
        self.b["strategy"]["kickers"] = "Kickers are on the board — 10 of them."
        self.only(V.check_strategy(self.b), "claims 10 kickers")

    def test_a_round_beyond_the_declared_length_is_refused(self):
        self.b["strategy"]["roundPlan"][0]["rounds"] = "17-18"
        self.only(V.check_strategy(self.b), "round 17")

    def test_a_pick_beyond_teams_times_rounds_is_refused(self):
        self.b["strategy"]["slotNotes"][0]["slot"] = "Picks 1-300"
        self.only(V.check_strategy(self.b), "pick 300")

    def test_a_name_team_pair_contradicting_the_board_is_refused(self):
        self.b["strategy"]["rules"] = ["Take One (BUF) early."]
        self.only(V.check_strategy(self.b), "One (BUF)")


class TestMetaFreshness(GateCase):
    def test_a_board_older_than_its_inputs_is_refused(self):
        """meta.updated has ZERO readers anywhere in the repo -- a self-reported claim nothing
        checks. 'Claims Aug 5, built from Aug 20 inputs' is the drift signature."""
        self.ledger["meta"]["dump_fetched_at"] = "2026-08-20T00:00:00+00:00"
        self.only(V.check_meta_freshness(self.b, self.ledger, self.dump), "older than an input")

    def test_a_board_newer_than_its_inputs_is_fine(self):
        self.b["meta"]["updated"] = "2026-09-01"
        self.assertEqual(V.check_meta_freshness(self.b, self.ledger, self.dump), [])


class TestSleeperIds(GateCase):
    def test_a_row_with_no_frozen_id_is_refused(self):
        del self.ledger["ids"]["Bravo Two"]
        self.only(V.check_sleeper_ids(self.b["players"], self.ledger, self.dump), "Bravo Two")

    def test_two_rows_sharing_an_id_are_refused(self):
        self.ledger["ids"]["Bravo Two"]["sleeperId"] = self.ledger["ids"]["Alpha One"]["sleeperId"]
        self.only(V.check_sleeper_ids(self.b["players"], self.ledger, self.dump), "claimed by 2")

    def test_an_id_whose_dump_record_disagrees_is_refused(self):
        pid = self.ledger["ids"]["Bravo Two"]["sleeperId"]
        self.dump["players"][pid]["team"] = "NE"
        self.only(V.check_sleeper_ids(self.b["players"], self.ledger, self.dump), "Bravo Two")


class TestNormalizerEquivalence(unittest.TestCase):
    """Per KTD-3 this belongs in the GATE, which runs before every emit -- not only in a suite
    someone remembers to run."""

    def test_the_real_board_agrees_in_both_runtimes(self):
        with open(V.BOARD, encoding="utf-8") as f:
            rows = json.load(f)["players"]
        self.assertEqual(V.check_normalizer_equivalence(rows), [])

    def test_the_check_can_actually_fail(self):
        """Positive control. This check reported a ReferenceError as a BOARD failure while it
        was really a bug in the bridge -- a false red, which is the more dangerous direction."""
        import normalize
        real = normalize.js_source
        normalize.js_source = lambda: real().replace('return t.join("");',
                                                     'return t.join("") + "ZZ";', 1)
        try:
            problems = V.check_normalizer_equivalence([{"name": "Alpha One"}])
        finally:
            normalize.js_source = real
        self.assertTrue(problems and "disagrees" in problems[0], problems)


class TestHtmlCrossSurface(GateCase):
    def write_html(self, blob, prose=""):
        d = tempfile.mkdtemp()
        self.addCleanup(lambda: None)
        p = os.path.join(d, "board.html")
        with open(p, "w", encoding="utf-8") as f:
            f.write("<html><body>\n" + prose + "\nconst DATA = "
                    + json.dumps(blob, ensure_ascii=False) + "\n</body></html>\n")
        return p

    def test_a_blob_that_does_not_deep_equal_the_source_is_refused(self):
        blob = json.loads(json.dumps(self.b))
        blob["players"][0]["vorp"] = 999.0
        self.only(V.check_html(self.b, self.write_html(blob)), "DATA.players")

    def test_a_matching_blob_passes(self):
        self.assertEqual(V.check_html(self.b, self.write_html(json.loads(json.dumps(self.b)))), [])

    def test_a_meta_number_hardcoded_in_prose_is_refused(self):
        """It LOOKS data-driven -- the line guards on DATA.meta.vbd existing and then prints the
        values as literals -- which is exactly why it survived review."""
        html = self.write_html(json.loads(json.dumps(self.b)), prose="<p>waiver QB12 rules</p>")
        self.only(V.check_html(self.b, html), "hardcoded")

    def test_a_visible_date_disagreeing_with_meta_updated_is_refused(self):
        """A refresh passes deep-equal while shipping a board whose visible header reads the old
        date -- and that header is the only human-visible date on the board."""
        html = self.write_html(json.loads(json.dumps(self.b)),
                               prose="<p>Rankings synthesized Aug 20, 2026</p>")
        self.only(V.check_html(self.b, html), "visible date")

    def test_a_visible_date_agreeing_with_meta_updated_passes(self):
        html = self.write_html(json.loads(json.dumps(self.b)),
                               prose="<p>Rankings synthesized Aug 5, 2026</p>")
        self.assertEqual(V.check_html(self.b, html), [])


class TestPdf(unittest.TestCase):
    def test_a_missing_cheat_sheet_is_refused(self):
        self.assertTrue(V.check_pdf([{"name": "x"}], "/nonexistent/none.pdf"))

    def test_the_real_cheat_sheet_carries_every_board_row(self):
        """Was born red at '24 of 174' -- all 10 K and all 14 DEF were absent. U6's generator
        renders every row, so this now pins the fixed state instead of the drift.

        The paired negative control below is what keeps this honest: a check that passes because
        the extractor silently returns nothing would satisfy this assertion too.
        """
        with open(V.BOARD, encoding="utf-8") as f:
            rows = json.load(f)["players"]
        self.assertEqual(V.check_pdf(rows), [])

    def test_a_player_who_is_not_on_the_sheet_is_reported(self):
        """Positive control on the instrument. If extract_text returned '' for any reason, the
        test above would pass while proving nothing -- docs/insights/008."""
        problems = V.check_pdf([{"name": "Zzyzx Nonexistent"}])
        self.assertTrue(problems, "check_pdf found a player who cannot be on the sheet, so its "
                                  "text extraction is not actually reading the PDF")
        self.assertIn("1 of 1", problems[0])


class TestTheExecutionGate(unittest.TestCase):
    """--full replays the lab feed through the REAL engine at increasing prefixes.

    The schedule is not arbitrary and "increasing" was not a specification. The reproduced
    vbdDelta break fires at EXACTLY three picks -- deciles would have missed it entirely -- so
    the schedule must include 1, 2, 3, 4 before it widens.
    """

    def kit_with(self, mutate):
        import shutil
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        kit = os.path.join(d, "draft-kit")
        os.makedirs(kit)
        for n in ("players_data.json", "normalize.py", "sleeper_ids.json"):
            shutil.copy(os.path.join(V.KIT, n), kit)
        p = os.path.join(kit, "players_data.json")
        with open(p, encoding="utf-8") as f:
            board = json.load(f)
        mutate(board)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(board, f, ensure_ascii=False)
        return kit

    def test_the_real_board_replays_clean(self):
        """Negative control: the shipped board must survive every prefix at exit 0."""
        self.assertEqual(V.check_engine_replay(kit=V.KIT), [])

    def test_a_float_vbddelta_is_caught_at_exactly_three_picks(self):
        """Positive control, and the reason the schedule is written out longhand. This board
        passes an empty-picks run and both of the first two prefixes."""
        def to_float(b):
            for r in b["players"]:
                r["vbdDelta"] = float(r["vbdDelta"])
        problems = V.check_engine_replay(kit=self.kit_with(to_float))
        self.assertTrue(problems, "a float vbdDelta board replayed clean")
        self.assertIn("replaying 3 pick(s)", problems[0],
                      "the schedule must include 3; deciles would have missed this entirely")


class TestTheRealBoardToday(unittest.TestCase):
    """The board was born red on 13 findings; U6's generator fixed the surfaces and it is green.

    This class used to be a RECORD OF KNOWN DRIFT enumerating those 13. That record is history
    now, and the class inverts: the live board must pass every check, and -- because a gate that
    accepts everything would also pass that -- a mutation of the real board must still be caught.

    The three families it used to pin, for the archaeology:
        "meta.updated claims"                4  (dump provenance, ledger mtime, dump mtime, curve)
        "is hardcoded in the HTML's prose"   8  (4 baselineWaiver + 4 lastStarter)
        "the cheat sheet is missing"         1  (all 10 K and all 14 DEF)
    """

    def test_the_live_board_passes_every_check(self):
        problems = V.validate()
        self.assertEqual(problems, [], "the shipped board is drifted; regenerate it with "
                                       "`python scripts/build_board.py`, never by hand")

    def test_the_gate_exits_zero_on_the_clean_board(self):
        import io
        from contextlib import redirect_stdout
        buf = io.StringIO()
        with redirect_stdout(buf):          # main() prints the whole report; keep it out of the run
            code = V.main([])
        self.assertEqual(code, 0)
        self.assertIn("every check passed", buf.getvalue())

    def test_the_gate_still_goes_red_on_a_mutated_board(self):
        """The control that makes the two tests above mean something.

        Plan amendment 4: a verification step that cannot fail loudly is not a verification, and
        'the board is clean' is satisfied just as well by a gate that has stopped checking. So
        mutate the real board, assert the mutation actually landed, and assert the gate names it.
        """
        with open(V.BOARD, encoding="utf-8") as f:
            board = json.load(f)
        victim = board["players"][40]
        before = victim["vbdDelta"]
        victim["vbdDelta"] = float(before) + 0.5
        self.assertNotEqual(victim["vbdDelta"], before,
                            "the mutation did not alter the fixture, so the gate was never tested")

        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        path = os.path.join(d, "players_data.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(board, f, ensure_ascii=False)

        problems = V.validate(board_path=path)
        self.assertTrue(problems, "a float vbdDelta passed the gate")
        self.assertTrue(any(victim["name"] in p for p in problems),
                        f"the gate went red but never named {victim['name']!r}:\n{problems}")


if __name__ == "__main__":
    unittest.main(verbosity=2)

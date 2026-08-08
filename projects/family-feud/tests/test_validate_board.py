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
import datetime as _dt
import json
import os
import re
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
    # EVERY ROW CARRIES AN ID, because the real board does -- enrich() refuses to build without
    # one. A fixture without them made `judgment_sha` key every row on the string "None", so two
    # rows identical apart from `r` collapsed into the same multiset entry and swapping their
    # board order was undetectable. That is a property of the fixture, not the digest: the same
    # swap on the live board is caught. The rule here matches dump_for()'s key scheme exactly.
    for i, p in enumerate(players):
        p["sleeperId"] = p["team"] if p["pos"] == "DEF" else str(1000 + i)

    dst = [{"rank": i + 1, "team": f"{c} {n}"} for i, (_, c, n) in enumerate(TEAMS[:8])]
    return {
        # `updated` and `rankings.synthesized` are DELIBERATELY different here. They were the same
        # fact until the header was found advertising a synthesis date that was really the build
        # date, and a fixture where they coincide cannot tell the two apart -- every date test
        # below would pass against either one.
        "meta": {"updated": "2026-08-08", "format": "8-team · Full PPR · Snake · 16 rounds",
                 "rankings": {"synthesized": "2026-08-05",
                              "judgment": V.judgment_sha(players)},
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


class TestSuffixedNamesAreVisibleToTheProseCheck(GateCase):
    """`check_strategy` keyed its (name, team) index on `name.split()[-1]`, which for
    `Marvin Harrison Jr.` is `Jr.`. Prose reading `Harrison (ARI)` therefore matched nothing and
    the check SILENTLY DID NOTHING for ten of this board's rows -- and worse than nothing: they
    all collided on a handful of keys, so `Jr.` mapped to the union of six teams and would have
    accepted almost any team named beside a `Jr.` surname. Insight 008's shape."""

    def test_a_suffixed_name_indexes_under_its_surname(self):
        self.assertIn("Harrison", V.surname_keys("Marvin Harrison Jr."))
        self.assertIn("Walker", V.surname_keys("Kenneth Walker III"))
        self.assertIn("Gadsden", V.surname_keys("Oronde Gadsden II"))

    def test_the_raw_last_token_is_still_indexed(self):
        """Prose legitimately writes either form, so both must resolve."""
        self.assertIn("Jr.", V.surname_keys("Marvin Harrison Jr."))
        self.assertIn("Nacua", V.surname_keys("Puka Nacua"))

    def test_a_single_token_name_survives(self):
        self.assertEqual(V.surname_keys("Cowboys"), {"Cowboys"})
        self.assertEqual(V.surname_keys(""), set())
        self.assertEqual(V.surname_keys(None), set())

    def test_a_wrong_team_beside_a_suffixed_name_is_now_CAUGHT(self):
        """THE POSITIVE CONTROL (insight 008): prove the instrument can register a reading before
        trusting the zero it returned for years."""
        b = json.loads(json.dumps(self.b))
        b["players"][0]["name"] = "Marvin Harrison Jr."
        b["players"][0]["team"] = "ARI"
        b["strategy"]["rules"][0] = "Take Harrison (SEA) if he falls."
        self.only(V.check_strategy(b), "Harrison")

    def test_a_correct_team_beside_a_suffixed_name_still_passes(self):
        """The paired control -- a check that flagged every prose mention would pass the test
        above while being useless."""
        b = json.loads(json.dumps(self.b))
        b["players"][0]["name"] = "Marvin Harrison Jr."
        b["players"][0]["team"] = "ARI"
        b["strategy"]["rules"][0] = "Take Harrison (ARI) if he falls."
        self.assertEqual([p for p in V.check_strategy(b) if "Harrison" in p], [])

    def test_the_live_board_has_suffixed_rows_so_this_is_not_theoretical(self):
        with open(V.BOARD, encoding="utf-8") as f:
            names = [p["name"] for p in json.load(f)["players"]]
        suffixed = [n for n in names
                    if n.split()[-1].lower().strip(".,") in V.NAME_SUFFIXES]
        self.assertTrue(suffixed, "no suffixed rows on the board -- the fix is unexercised")


class TestBadgeMarksAreUnique(GateCase):
    """Glyphs were checked for cp1252-encodability -- can this be printed? -- and never for
    uniqueness -- does printing it mean anything? A duplicate is worse than a blank: a blank looks
    like nothing, while a duplicate says something specific and wrong, and the legend confirms
    both readings."""

    def clash(self, field, mark):
        b = json.loads(json.dumps(self.b))
        for code in list(b["meta"]["badges"])[:2]:
            b["meta"]["badges"][code][field] = mark
        return b

    def test_the_shipped_badges_are_unique(self):
        """The control. It reads the LIVE board, not the fixture, so it is also a real assertion
        about what ships: all eight marks distinct, on both surfaces."""
        with open(V.BOARD, encoding="utf-8") as f:
            live = json.load(f)
        self.assertEqual(V.check_badges(live), [])
        for field in ("glyph", "icon"):
            marks = [s[field] for s in live["meta"]["badges"].values() if s.get(field)]
            self.assertTrue(marks, f"no badge declares a {field}")
            self.assertEqual(len(marks), len(set(marks)), f"duplicate {field} on the live board")

    def test_two_badges_sharing_a_pdf_glyph_are_caught(self):
        self.only(V.check_badges(self.clash("glyph", "%")), "cheat sheet")

    def test_two_badges_sharing_an_html_icon_are_caught(self):
        self.only(V.check_badges(self.clash("icon", "🎯")), "legend")

    def test_distinct_marks_are_not_flagged(self):
        """The paired control -- a check that flagged every badge would pass both tests above."""
        b = json.loads(json.dumps(self.b))
        for i, code in enumerate(b["meta"]["badges"]):
            b["meta"]["badges"][code]["glyph"] = chr(ord("a") + i)
        self.assertEqual(V.check_badges(b), [])


class TestShapeAgainstTheDraft(GateCase):
    """Every other check in this gate compares the board to ITSELF, so all of them stay green on a
    board built from a draft that has since been re-created -- the board is perfectly
    self-consistent about the wrong draft, and `--verify-only` blesses it forever. This is the one
    check that asks whether the board still matches the world."""

    DRAFT = {"draft_id": "111", "season": "2026", "status": "pre_draft", "start_time": None,
             "type": "snake", "metadata": {"scoring_type": "ppr"},
             "settings": {"teams": 8, "rounds": 16, "reversal_round": 0, "slots_qb": 1,
                          "slots_rb": 2, "slots_wr": 2, "slots_te": 1, "slots_k": 1,
                          "slots_def": 1, "slots_flex": 2, "slots_bn": 6}}

    def setUp(self):
        super().setUp()
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def cargo(self, **over):
        d = json.loads(json.dumps(self.DRAFT))
        d.update({k: v for k, v in over.items() if k != "settings"})
        d["settings"].update(over.get("settings") or {})
        p = os.path.join(self.tmp, f"draft_{len(os.listdir(self.tmp))}.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(d, f)
        return p

    def board_with_shape(self, **over):
        import sys as _s
        _s.path.insert(0, os.path.join(ROOT, "scripts"))
        from shape import read_shape
        shape = dict(read_shape(self.cargo(), "/nonexistent"))
        shape.update(over)
        b = json.loads(json.dumps(self.b))
        b["meta"]["shape"] = shape
        return b

    def test_a_board_matching_its_draft_is_silent(self):
        """The control. Without it, a check that flagged everything would pass the rest."""
        self.assertEqual(
            V.check_shape_against_draft(self.board_with_shape(), self.cargo(), "/nonexistent"), [])

    def test_a_re_created_draft_is_caught(self):
        """The mule pins draft_id into its URL, so a re-created draft is exactly the case where
        the board goes on describing a room nobody is sitting in."""
        b = self.board_with_shape()
        problems = V.check_shape_against_draft(b, self.cargo(draft_id="999"), "/nonexistent")
        self.only(problems, "not the one being run")

    def test_a_re_created_draft_reports_only_that(self):
        """A different draft's teams and rounds are not drift, they are a different league.
        Listing seven more mismatches would bury the one fact that matters."""
        b = self.board_with_shape()
        problems = V.check_shape_against_draft(
            b, self.cargo(draft_id="999", settings={"teams": 12, "rounds": 15}), "/nonexistent")
        self.assertEqual(len(problems), 1, problems)

    def test_a_moved_flex_slot_is_caught(self):
        """The roster half again -- and nothing else in this gate would have noticed."""
        b = self.board_with_shape()
        self.only(V.check_shape_against_draft(b, self.cargo(settings={"slots_flex": 1}),
                                              "/nonexistent"), "meta.shape.flex")

    def test_a_changed_round_count_is_caught(self):
        b = self.board_with_shape()
        self.only(V.check_shape_against_draft(b, self.cargo(settings={"rounds": 15}),
                                              "/nonexistent"), "meta.shape.rounds")

    def test_the_draft_becoming_real_is_NOT_a_failure(self):
        """`status` and `start_time` are EXPECTED to move, they affect a header string rather than
        any advice, and watch_draft_state.py exists to catch them. Failing here would turn
        --verify-only red on draft morning, the moment it most needs to be trustworthy."""
        b = self.board_with_shape()
        live = self.cargo(status="drafting", start_time=1756500000000)
        self.assertEqual(V.check_shape_against_draft(b, live, "/nonexistent"), [])

    def test_missing_cargo_is_silent_rather_than_a_false_red(self):
        """A clean clone and CI have no inbox. A gate that failed there teaches people to skip it
        (insight 009)."""
        self.assertEqual(
            V.check_shape_against_draft(self.board_with_shape(), "/nope/x.json", "/nonexistent"),
            [])

    def test_but_the_gate_SAYS_it_could_not_check(self):
        """Silent is right; silent AND unremarked is the conflation this repo keeps treating."""
        line = V.shape_provenance_line(self.board_with_shape(), "/nope/x.json", "/nonexistent")
        self.assertIn("[unverified]", line)
        self.assertIn("NOT re-checked", line)

    def test_and_says_what_it_checked_against_when_it_could(self):
        line = V.shape_provenance_line(self.board_with_shape(), self.cargo(), "/nonexistent")
        self.assertIn("[checked]", line)
        self.assertIn("111", line)

    def test_validate_actually_calls_this_check(self):
        """THE CALL SITE (insight 013), and it was missing.

        Every test above calls `check_shape_against_draft` directly, so cutting
        `problems += check_shape_against_draft(...)` out of `validate()` left all nine of them
        green -- a guard with tests and no proof it was wired to anything. Verified by doing
        exactly that: this is the only one that goes red.
        """
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        with open(V.BOARD, encoding="utf-8") as f:
            board = json.load(f)
        board["meta"]["shape"] = dict(board["meta"]["shape"], draft_id="NOT_THIS_DRAFT")
        p = os.path.join(tmp, "players_data.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(board, f, ensure_ascii=False)
        problems = V.validate(board_path=p, cargo=self.cargo(), league_cargo="/nonexistent")
        self.assertTrue(any("not the one being run" in x for x in problems),
                        f"validate() never ran the shape check: {problems}")


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


class TestBaselinesQuotedInProse(GateCase):
    """`rules[10]` ends "baselines QB12/RB41/WR47/TE12" -- four numbers already living in
    `meta.vbd`, typed a second time into a sentence nothing checked. U5 is licensed to move them."""

    def test_a_baseline_that_no_longer_matches_meta_vbd_is_refused(self):
        self.b["strategy"]["rules"] = ["VORP over waiver replacement (baselines QB12)."]
        self.b["meta"]["vbd"]["baselineWaiver"]["QB"] = 14
        self.only(V.check_strategy(self.b), "quotes QB12")

    def test_a_matching_baseline_passes(self):
        """The paired control. Without it the refusal above would pass on a check that reds at
        everything."""
        self.b["strategy"]["rules"] = ["VORP over waiver replacement (baselines QB12)."]
        self.assertEqual(V.check_strategy(self.b), [])

    def test_the_last_starter_figure_is_accepted_too(self):
        """Both dicts are baselines in the prose's sense; only a number in NEITHER is drift."""
        self.b["strategy"]["rules"] = ["Streaming starts past the baseline QB8."]
        self.assertEqual(V.check_strategy(self.b), [])

    def test_a_position_meta_vbd_does_not_carry_is_reported(self):
        self.b["strategy"]["rules"] = ["Baselines RB41 hold all year."]
        self.only(V.check_strategy(self.b), "no RB baseline at all")

    def test_ordinal_shorthand_outside_a_baseline_clause_is_not_a_finding(self):
        """MEASURED, NOT ASSUMED, and it is why this is not a blanket scan. The live board's
        roundPlan says "RB2" and its slotNotes say "WR1"/"RB1" -- tier shorthand, every one. A
        gate that reds on "a solid RB2" is a gate that gets switched off, and a false red on
        draft morning is insight 009's failure."""
        self.b["strategy"]["rules"] = ["Chase a solid RB2 in the middle rounds; WR1 upside wins."]
        self.b["strategy"]["roundPlan"][0]["plan"] = "an RB2 and a WR3"
        self.b["strategy"]["slotNotes"][0]["note"] = "take the WR1"
        self.assertEqual(V.check_strategy(self.b), [])

    def test_the_instrument_registers_a_reading_on_the_live_board(self):
        """POSITIVE CONTROL (insight 006, insight 008). This check is anchored on the word
        "baseline", so rewriting the sentence to say "replacement levels QB12/..." would make it
        quietly examine nothing and report zero problems -- which reads exactly like success.
        A zero from `baseline_claims` must mean the prose stopped quoting baselines, never that
        the reader stopped reading."""
        with open(V.BOARD, encoding="utf-8") as f:
            live = json.load(f)
        claims = V.baseline_claims(live["strategy"])
        self.assertEqual(len(claims), 4, f"the reader found {len(claims)} baseline claims on the "
                                         f"live board; it should still find four: {claims}")
        self.assertEqual({pos for _, pos, _ in claims}, {"QB", "RB", "WR", "TE"})
        self.assertEqual(V.check_strategy(live), [])


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

    def mutated_html(self, replace_pair):
        """A copy of the SHIPPED board with one edit inside its generated normalizer block."""
        with open(V.HTML, encoding="utf-8") as f:
            page = f.read()
        old, new = replace_pair
        self.assertIn(old, page, "the plant site is not in the board HTML")
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        p = os.path.join(d, "board.html")
        with open(p, "w", encoding="utf-8") as f:
            f.write(page.replace(old, new, 1))
        return p

    def test_the_check_can_actually_fail(self):
        """Positive control. This check once reported a ReferenceError as a BOARD failure while it
        was really a bug in the bridge -- a false red, the more dangerous direction.

        The mutation goes into the HTML, not into normalize.py, because the check reads the JS
        the board actually SHIPS. Mutating the generator would prove nothing about the artifact.
        """
        html = self.mutated_html(('return t.join("");', 'return t.join("") + "ZZ";'))
        problems = V.check_normalizer_equivalence([{"name": "Alpha One"}], html=html)
        self.assertTrue(problems and "disagrees" in problems[0], problems)

    def test_a_hand_edited_normalizer_in_the_board_is_caught(self):
        """The whole reason the check reads the HTML rather than regenerating from normalize.py:
        a board whose JS was edited by hand must not pass a check that exists to catch that."""
        html = self.mutated_html(('v = v.toLowerCase();', 'v = v.toUpperCase();'))
        problems = V.check_normalizer_equivalence(
            [{"name": "Alpha One"}, {"name": "Bravo Two"}], html=html)
        self.assertTrue(problems, "a hand-edited board normalizer passed the equivalence check")

    def test_a_board_with_no_normalizer_block_is_reported(self):
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)
        p = os.path.join(d, "board.html")
        with open(p, "w", encoding="utf-8") as f:
            f.write("<html><body>const DATA = {}</body></html>")
        problems = V.check_normalizer_equivalence([{"name": "Alpha One"}], html=p)
        self.assertTrue(problems)


class TestHtmlCrossSurface(GateCase):
    def synth_prose(self, iso=None):
        """The header line the real template emits, in the form the gate parses back."""
        d = _dt.date.fromisoformat(iso or self.b["meta"]["rankings"]["synthesized"])
        return f"<p>Rankings synthesized {d:%b} {d.day}, {d.year}</p>"

    def write_html(self, blob, prose=None):
        d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, d, True)   # was `lambda: None` -- a cleanup that cleaned
                                                  # nothing, leaking a temp dir per test
        p = os.path.join(d, "board.html")
        # Defaults to the CORRECT header line. A blank default would make every test here run
        # against a page with no date at all, which is now itself a finding.
        prose = self.synth_prose() if prose is None else prose
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

    def test_a_visible_date_disagreeing_with_the_synthesis_date_is_refused(self):
        """A refresh passes deep-equal while shipping a board whose visible header reads the old
        date -- and that header is the only human-visible date on the board."""
        html = self.write_html(json.loads(json.dumps(self.b)),
                               prose="<p>Rankings synthesized Aug 20, 2026</p>")
        self.only(V.check_html(self.b, html), "visible date")

    def test_a_visible_date_agreeing_with_the_synthesis_date_passes(self):
        html = self.write_html(json.loads(json.dumps(self.b)), prose=self.synth_prose())
        self.assertEqual(V.check_html(self.b, html), [])

    def test_THE_BUG_a_header_showing_the_BUILD_date_is_refused(self):
        """THE REGRESSION. `__SYNTH_DATE__` was fed `meta.updated`, and this check compared the
        header to `meta.updated` -- so the sentence "Rankings synthesized <date> from ...
        training-camp reporting" re-dated itself on every rebuild and the gate blessed it every
        time. Measured on the live board 2026-08-08: judgment frozen since Aug 5, header said
        Aug 8. Both halves are pinned here, because fixing either one alone leaves the hole.
        """
        self.assertNotEqual(self.b["meta"]["updated"],
                            self.b["meta"]["rankings"]["synthesized"],
                            "this fixture cannot distinguish the two dates")
        html = self.write_html(json.loads(json.dumps(self.b)),
                               prose=self.synth_prose(self.b["meta"]["updated"]))
        self.only(V.check_html(self.b, html), "visible date")

    def test_a_page_with_no_synthesis_line_at_all_is_refused(self):
        """Insight 008 on the reader itself: findall returning nothing produced zero mismatches,
        which reads exactly like agreement. Deleting the line from the template must not be the
        way to make this check quiet."""
        html = self.write_html(json.loads(json.dumps(self.b)), prose="<p>no date here</p>")
        self.only(V.check_html(self.b, html), "no 'Rankings synthesized")


class TestPdf(unittest.TestCase):
    def real_board(self):
        with open(V.BOARD, encoding="utf-8") as f:
            return json.load(f)

    def test_a_missing_cheat_sheet_is_refused(self):
        self.assertTrue(V.check_pdf({"meta": {}, "players": [{"name": "x"}]},
                                    "/nonexistent/none.pdf"))

    def test_the_real_cheat_sheet_carries_every_board_row(self):
        """Was born red at '24 of 174' -- all 10 K and all 14 DEF were absent. U6's generator
        renders every row, so this now pins the fixed state instead of the drift.

        The paired negative control below is what keeps this honest: a check that passes because
        the extractor silently returns nothing would satisfy this assertion too.
        """
        self.assertEqual(V.check_pdf(self.real_board()), [])

    def test_a_player_who_is_not_on_the_sheet_is_reported(self):
        """Positive control on the instrument. If extract_text returned '' for any reason, the
        test above would pass while proving nothing -- docs/insights/008."""
        d = self.real_board()
        d["players"] = [{"name": "Zzyzx Nonexistent"}]
        problems = V.check_pdf(d)
        self.assertTrue(problems, "check_pdf found a player who cannot be on the sheet, so its "
                                  "text extraction is not actually reading the PDF")
        self.assertIn("1 of 1", problems[0])

    def test_the_sheets_footer_date_is_read_and_agrees(self):
        """The cheat sheet prints the synthesis date too, and nothing read it -- the HTML's date
        was guarded and the PDF's was not, so the same false claim shipped on the one surface
        with no comment channel to warn you it is wrong."""
        self.assertEqual(V.check_pdf(self.real_board()), [])

    def test_a_wrong_synthesis_date_in_meta_is_caught_on_the_SHEET(self):
        """Positive control on the footer reader specifically. Without this, a footer regex that
        matched nothing would report no mismatch, and 'no mismatch' reads as 'they agree'."""
        d = self.real_board()
        d["meta"]["rankings"] = dict(d["meta"]["rankings"], synthesized="1999-01-01")
        problems = V.check_pdf(d)
        self.assertTrue(any("cheat sheet says rankings were synthesized" in p for p in problems),
                        f"the footer reader did not register a reading; got {problems}")


class TestRankingsProvenance(GateCase):
    """meta.rankings is the only assertion on this board that the generator refuses to generate.

    Everything else the gate checks, it checks against another copy of itself. This one is pinned
    the last time a human actually re-ranked, so a board can be perfectly self-consistent and
    still fail here -- which is the entire point.
    """

    def test_a_matching_digest_passes(self):
        self.assertEqual(V.check_rankings_provenance(self.b), [])

    def test_a_moved_ranking_without_a_restamp_is_REFUSED(self):
        b = json.loads(json.dumps(self.b))
        b["players"][0]["pr"] = 99
        self.only(V.check_rankings_provenance(b), "RANKINGS MOVED")

    def test_the_refusal_names_the_way_out(self):
        b = json.loads(json.dumps(self.b))
        b["players"][0]["tier"] = 7
        self.only(V.check_rankings_provenance(b), "--rankings-synthesized")

    def test_a_missing_rankings_key_is_refused(self):
        b = json.loads(json.dumps(self.b))
        del b["meta"]["rankings"]
        self.only(V.check_rankings_provenance(b), "meta.rankings is missing")

    def test_an_empty_digest_is_refused_rather_than_treated_as_agreement(self):
        b = json.loads(json.dumps(self.b))
        b["meta"]["rankings"]["judgment"] = ""
        self.only(V.check_rankings_provenance(b), "nothing pins the synthesis date")

    def test_a_non_iso_synthesis_date_is_refused(self):
        b = json.loads(json.dumps(self.b))
        b["meta"]["rankings"]["synthesized"] = "Aug 5, 2026"
        self.only(V.check_rankings_provenance(b), "not an ISO date")

    # ---- what the digest must and must not notice -------------------------------------------

    def moved(self, fn):
        b = json.loads(json.dumps(self.b))
        fn(b["players"])
        return V.judgment_sha(b["players"]) != V.judgment_sha(self.b["players"])

    def test_every_judgment_field_moves_the_digest(self):
        self.assertTrue(self.moved(lambda p: p[0].__setitem__("r", 99)), "r")
        self.assertTrue(self.moved(lambda p: p[0].__setitem__("pr", 99)), "pr")
        self.assertTrue(self.moved(lambda p: p[0].__setitem__("tier", 9)), "tier")
        self.assertTrue(self.moved(lambda p: p[0].__setitem__("note", "new read")), "note")
        self.assertTrue(self.moved(lambda p: p[0].__setitem__("badges", ["T"])), "badges")
        self.assertTrue(self.moved(lambda p: p.pop(0)), "a dropped player")

    def test_a_CROSS_POSITIONAL_reorder_moves_the_digest(self):
        """THE HOLE IN THE FIRST VERSION OF THIS DIGEST, found because a plant failed to land.

        `pr` is the rank WITHIN a position, so trading two players at different positions in
        overall board order leaves both `pr` values identical -- each is still first or second at
        his own position. Measured on the live board before `r` was added: swapping Bijan Robinson
        and Ja'Marr Chase at r=2/r=3 produced a byte-identical digest. Reordering the top of the
        board is the most consequential re-rank there is, and the detector was blind to exactly it.
        """
        b = json.loads(json.dumps(self.b))
        rows = sorted(b["players"], key=lambda x: x["r"])
        first, second = next((x, y) for x, y in zip(rows, rows[1:]) if x["pos"] != y["pos"])
        pr_before = (first["pr"], second["pr"])

        first["r"], second["r"] = second["r"], first["r"]

        self.assertEqual((first["pr"], second["pr"]), pr_before,
                         "this test only means something while the swap leaves `pr` alone -- "
                         "that is the whole reason the digest could not see it")
        self.assertNotEqual(V.judgment_sha(b["players"]), V.judgment_sha(self.b["players"]),
                            "the board order changed and the digest did not notice")

    def test_a_DATA_CORRECTION_does_not_move_the_digest(self):
        """c6379d78 rewrote `"team": "JAC"` to `"JAX"` on eight rows and re-ranked nobody. If that
        forced the synthesis date forward, the fix for a lying date would make the date lie."""
        self.assertFalse(self.moved(lambda p: p[0].__setitem__("team", "JAX")), "a team code")
        self.assertFalse(self.moved(lambda p: p[0].__setitem__("name", "A. One")), "a rendering")

    def test_REGENERATED_values_do_not_move_the_digest(self):
        """vorp/vbdRank/vbdDelta are derived from pr and the curve. Including them would fire on
        every curve rebuild -- a red that means nothing trains people to restamp reflexively."""
        self.assertFalse(self.moved(
            lambda p: [x.__setitem__("vorp", x["vorp"] + 1) for x in p]), "vorp")
        self.assertFalse(self.moved(
            lambda p: [x.__setitem__("vbdRank", 0) for x in p]), "vbdRank")

    def test_row_ORDER_does_not_move_the_digest(self):
        self.assertFalse(self.moved(lambda p: p.reverse()))

    def test_validate_actually_calls_this_check(self):
        """THE CALL SITE (insight 013), and it was missing -- CONFIRMED BY MUTATION, not assumed.

        Every test above calls `check_rankings_provenance` directly. Cutting
        `problems += check_rankings_provenance(d)` out of `validate()` left all eleven of them
        green and the whole 534-test suite green with it: eleven tests for the function, none for
        its wiring. The third time this repo has made the same mistake.
        """
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        with open(V.BOARD, encoding="utf-8") as f:
            board = json.load(f)
        board["players"][0]["pr"] = 999           # a re-rank nobody recorded
        p = os.path.join(tmp, "players_data.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(board, f, ensure_ascii=False)
        problems = V.validate(board_path=p)
        self.assertTrue(any("RANKINGS MOVED" in x for x in problems),
                        f"validate() never ran the rankings check: {problems}")


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

    def test_a_float_vbddelta_is_caught_within_the_first_handful_of_picks(self):
        """Positive control, and the reason the schedule is written out longhand.

        The break fires only once a row with |vbdDelta| >= 8 enters the top-12 window, so the
        exact prefix depends on which players sit there. It was 3 on the Aug 5 board and moved to
        5 when U6 recomputed VORP and the VBD ranks shifted -- so this pins the PROPERTY that
        matters (a single-digit prefix, which deciles of a 120-pick feed would step straight over)
        rather than the incidental number, which is board data and will move again.
        """
        def to_float(b):
            for r in b["players"]:
                r["vbdDelta"] = float(r["vbdDelta"])
        problems = V.check_engine_replay(kit=self.kit_with(to_float))
        self.assertTrue(problems, "a float vbdDelta board replayed clean")
        m = re.search(r"replaying (\d+) pick\(s\)", problems[0])
        self.assertIsNotNone(m, problems[0])
        n = int(m.group(1))
        self.assertLess(n, 10, f"caught only at {n} picks; the first decile of a 120-pick feed is "
                               f"12, so a decile schedule would have missed this entirely")
        self.assertIn(n, V.PREFIXES, f"{n} is not in the replay schedule")


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

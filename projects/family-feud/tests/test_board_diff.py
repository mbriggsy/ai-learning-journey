#!/usr/bin/env python3
"""Tests for scripts/board_diff.py -- comparing one run of the board against another.

    python -m unittest discover -s tests -p test_board_diff.py     (from the project root)

No network. The comparison itself is a pure function over two parsed documents, so every fixture
below is built here. The git-plumbing tests read this repository's REAL history -- there is no
honest fixture for "does `git show <ref>:<derived path>` actually resolve", and the whole point of
that layer is that it works against this tree. They skip when git is absent so a clean checkout
without it cannot go red (insight 009).
"""
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import board_diff as BD  # noqa: E402

HAS_GIT = shutil.which("git") is not None

#: Two commits that are frozen in this repository's history and used by the plumbing tests:
#: the 2026-08-08 synthesis and the 2026-08-14 one that replaced it.
OLD_REAL, NEW_REAL = "b98689d", "2da8794"


def sid_of(name):
    """A stable id that does NOT move when the player's rank does -- otherwise every fixture
    below would silently test rank-keyed matching instead of id-keyed matching."""
    return "id-" + "".join(name.lower().split())


def row(r, name, pos="WR", team="KC", pr=None, tier=1, note="n", badges=None, vorp=1.0, sid=None):
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": r if pr is None else pr,
            "tier": tier, "badges": [] if badges is None else badges, "note": note,
            "vorp": vorp, "vbdRank": r, "vbdDelta": 0,
            "sleeperId": sid_of(name) if sid is None else sid,
            "vorpMethod": "curve:2022-2025"}


def doc(players, synthesized="2026-08-14", judgment="deadbeefdeadbeef", dst=None, strategy=None):
    return {"meta": {"league": "Family Feud",
                     "rankings": {"synthesized": synthesized, "judgment": judgment}},
            "players": players,
            "dst": [{"rank": 1, "team": "Houston Texans"}] if dst is None else dst,
            "strategy": {"rules": ["take the value"]} if strategy is None else strategy}


class TestRankMoves(unittest.TestCase):
    def setUp(self):
        self.old = doc([row(1, "Alpha"), row(2, "Bravo"), row(3, "Charlie")])
        self.new = doc([row(1, "Charlie"), row(2, "Alpha"), row(3, "Bravo")])
        self.d = BD.diff_boards(self.old, self.new)

    def test_every_moved_row_is_reported(self):
        self.assertEqual({m["name"] for m in self.d["moves"]}, {"Alpha", "Bravo", "Charlie"})
        self.assertEqual(self.d["adds"], [])
        self.assertEqual(self.d["drops"], [])

    def test_positive_means_CLIMBED_which_is_rerank_pys_own_sign(self):
        """rerank.py prints `p["r"] - new_r`. Two tools in one repo printing the same number with
        opposite signs is how somebody drafts the wrong man off the wrong receipt."""
        by_name = {m["name"]: m for m in self.d["moves"]}
        self.assertEqual(by_name["Charlie"]["delta"], +2, "3 -> 1 is a climb of two")
        self.assertEqual(by_name["Alpha"]["delta"], -1, "1 -> 2 is a slide of one")

    def test_the_biggest_mover_sorts_first(self):
        self.assertEqual(self.d["moves"][0]["name"], "Charlie")

    def test_a_row_that_did_not_move_is_in_no_bucket(self):
        same = doc([row(1, "Alpha"), row(2, "Bravo")])
        d = BD.diff_boards(same, doc([row(1, "Alpha"), row(2, "Bravo")]))
        self.assertEqual(d["moves"], [])
        self.assertEqual(d["pr_changes"], [])


class TestMatchingIsByTheFrozenId(unittest.TestCase):
    """THE MUTANT LIVES HERE. Match on name instead of `sleeperId` and a re-spelled row reads as
    a DROP plus an ADD -- two loud events reporting one silent no-op. Sleeper has already renamed
    men mid-August ("Marquise Brown" -> "Hollywood Brown"), and `normalize.norm` does NOT fold
    those two spellings together, so the fallback path cannot save it either."""

    def setUp(self):
        frozen = "id-marquise"
        self.old = doc([row(1, "Alpha"), row(2, "Marquise Brown", sid=frozen)])
        self.new = doc([row(1, "Alpha"), row(2, "Hollywood Brown", sid=frozen)])
        self.d = BD.diff_boards(self.old, self.new)

    def test_a_renamed_player_is_NOT_an_add_plus_a_drop(self):
        self.assertEqual(self.d["adds"], [], "the renamed row was reported as a new player")
        self.assertEqual(self.d["drops"], [], "the renamed row was reported as having left")

    def test_the_rename_is_reported_as_a_rename(self):
        self.assertEqual([(r["old_name"], r["name"]) for r in self.d["renames"]],
                         [("Marquise Brown", "Hollywood Brown")])

    def test_the_rename_alone_does_not_count_as_a_rank_move(self):
        self.assertEqual(self.d["moves"], [])

    def test_two_different_men_who_share_a_normalized_name_stay_apart(self):
        old = doc([row(1, "Mike Williams", team="NYJ", sid="7001"),
                   row(2, "Mike Williams", team="LAC", sid="7002")])
        new = doc([row(1, "Mike Williams", team="NYJ", sid="7001"),
                   row(2, "Mike Williams", team="LAC", sid="7002")])
        d = BD.diff_boards(old, new)
        self.assertEqual((d["moves"], d["adds"], d["drops"]), ([], [], []))


class TestAddsAndDrops(unittest.TestCase):
    """THE SECOND MUTANT LIVES HERE. A drop reported as a move (or an add-list built from the
    wrong index) turns "a man left the board" into "a man slid a few spots"."""

    def setUp(self):
        self.old = doc([row(1, "Alpha"), row(2, "Bravo"), row(3, "Gone")])
        self.new = doc([row(1, "Alpha"), row(2, "Bravo"), row(3, "Arrived")])
        self.d = BD.diff_boards(self.old, self.new)

    def test_a_new_id_is_an_add_at_its_entry_rank(self):
        self.assertEqual([(a["name"], a["r"]) for a in self.d["adds"]], [("Arrived", 3)])

    def test_a_vanished_id_is_a_drop_at_the_rank_it_held(self):
        self.assertEqual([(x["name"], x["r"]) for x in self.d["drops"]], [("Gone", 3)])

    def test_an_add_and_a_drop_are_never_also_a_move(self):
        self.assertEqual([m["name"] for m in self.d["moves"]], [])

    def test_adds_are_sorted_by_where_they_enter(self):
        old = doc([row(1, "Alpha")])
        new = doc([row(1, "Alpha"), row(2, "Second"), row(3, "Third")])
        d = BD.diff_boards(old, new)
        self.assertEqual([a["name"] for a in d["adds"]], ["Second", "Third"])


class TestTierAndPositionRank(unittest.TestCase):
    def test_a_tier_change_with_a_still_rank_is_reported(self):
        old = doc([row(1, "Alpha", tier=3)])
        new = doc([row(1, "Alpha", tier=2)])
        d = BD.diff_boards(old, new)
        self.assertEqual([(t["old_tier"], t["new_tier"]) for t in d["tier_changes"]], [(3, 2)])
        self.assertEqual(d["moves"], [], "a tier change is not a rank move")

    def test_pr_moving_under_a_still_r_is_its_own_bucket(self):
        """`pr` is a JUDGMENT_KEY. A board whose overall order held while a position order moved
        still changes the digest, and a tool that missed it would contradict that digest."""
        old = doc([row(5, "Alpha", pos="WR", pr=3)])
        new = doc([row(5, "Alpha", pos="WR", pr=4)])
        d = BD.diff_boards(old, new)
        self.assertEqual([(p["old_pr"], p["new_pr"]) for p in d["pr_changes"]], [(3, 4)])
        self.assertEqual(d["moves"], [])

    def test_a_row_that_moved_overall_is_not_double_counted_in_pr(self):
        old = doc([row(1, "Alpha", pr=1), row(2, "Bravo", pr=2)])
        new = doc([row(1, "Bravo", pr=1), row(2, "Alpha", pr=2)])
        d = BD.diff_boards(old, new)
        self.assertEqual(len(d["moves"]), 2)
        self.assertEqual(d["pr_changes"], [], "one event was reported twice")


class TestCopyEdits(unittest.TestCase):
    def test_a_note_only_change_moves_nothing(self):
        old = doc([row(1, "Alpha", note="Boring in the best way.")])
        new = doc([row(1, "Alpha", note="Boring, in the best way.")])
        d = BD.diff_boards(old, new)
        self.assertEqual([n["name"] for n in d["note_changes"]], ["Alpha"])
        self.assertEqual((d["moves"], d["adds"], d["drops"], d["tier_changes"]), ([], [], [], []))
        self.assertEqual(BD.verdict(d), "copy-edit only: 1 note(s) changed, 0 ranks moved.")

    def test_the_prose_never_reaches_the_report(self):
        """The notes are Briggsy's voice; rerank.py already refuses to rewrite them by machine.
        This tool refuses to quote them."""
        old = doc([row(1, "Alpha", note="OLD PROSE HERE")])
        new = doc([row(1, "Alpha", note="NEW PROSE HERE")])
        d = BD.diff_boards(old, new)
        buf = io.StringIO()
        BD.print_diff({"short": "aaaaaaa", "when": "", "subject": "", "synthesized": "2026-08-14",
                       "judgment": "x", "rows": 1, "doc": old},
                      {"short": "bbbbbbb", "when": "", "subject": "", "synthesized": "2026-08-14",
                       "judgment": "x", "rows": 1, "doc": new},
                      d, out=lambda s="": buf.write(s + "\n"))
        printed = buf.getvalue()
        self.assertNotIn("OLD PROSE HERE", printed)
        self.assertNotIn("NEW PROSE HERE", printed)
        self.assertIn("Alpha", printed, "the tool should still name whose note moved")

    def test_a_badge_change_is_a_copy_edit_not_a_silence(self):
        old = doc([row(1, "Alpha", badges=[])])
        new = doc([row(1, "Alpha", badges=["I"])])
        d = BD.diff_boards(old, new)
        self.assertEqual(len(d["badge_changes"]), 1)
        self.assertIn("badge set(s) changed", BD.verdict(d))

    def test_identical_documents_produce_the_named_zero(self):
        players = [row(1, "Alpha"), row(2, "Bravo")]
        d = BD.diff_boards(doc(players), doc(json.loads(json.dumps(players))))
        for bucket in BD.JUDGMENT_BUCKETS:
            self.assertEqual(d[bucket], [], f"{bucket} was not empty on identical documents")
        self.assertEqual(d["vorp_deltas"], [])
        self.assertEqual(BD.verdict(d),
                         "nothing moved -- byte-identical ordering, tiers, badges and notes.")

    def test_dst_and_strategy_are_flagged_rather_than_diffed(self):
        """They carry no stable id and no judgment key -- but the snapshot deleted on 2026-08-08
        drifted in exactly these two blocks, so silence is the wrong answer."""
        old = doc([row(1, "Alpha")], dst=[{"rank": 1, "team": "Houston Texans"}])
        new = doc([row(1, "Alpha")], dst=[{"rank": 1, "team": "Denver Broncos"}])
        d = BD.diff_boards(old, new)
        self.assertTrue(d["other_changed"]["dst"])
        self.assertFalse(d["other_changed"]["strategy"])
        self.assertIn("the dst block changed", BD.verdict(d))


class TestVorp(unittest.TestCase):
    def test_a_vorp_move_under_a_still_rank_is_reported_with_its_delta(self):
        old = doc([row(1, "Alpha", vorp=100.0)])
        new = doc([row(1, "Alpha", vorp=112.5)])
        d = BD.diff_boards(old, new)
        self.assertEqual([v["vorp_delta"] for v in d["vorp_deltas"]], [12.5])

    def test_vorp_is_not_a_judgment_key_so_it_cannot_claim_a_rank_moved(self):
        old = doc([row(1, "Alpha", vorp=100.0)])
        new = doc([row(1, "Alpha", vorp=112.5)])
        d = BD.diff_boards(old, new)
        self.assertEqual(d["moves"], [])
        self.assertIn("0 ranks moved", BD.verdict(d))


class TestARowWithNoStableId(unittest.TestCase):
    """The fallback is the one place this tool can be fooled, so it has to announce itself."""

    def test_a_row_with_no_sleeperId_still_matches_on_the_normalized_name(self):
        old_row, new_row = row(1, "Alpha"), row(2, "Alpha")
        del old_row["sleeperId"]
        del new_row["sleeperId"]
        d = BD.diff_boards(doc([old_row]), doc([new_row]))
        self.assertEqual([m["name"] for m in d["moves"]], ["Alpha"])
        self.assertEqual(d["adds"], [])
        self.assertEqual(d["drops"], [])

    def test_the_guessed_rows_are_named_on_both_sides(self):
        old_row, new_row = row(1, "Alpha"), row(1, "Alpha")
        del old_row["sleeperId"]
        del new_row["sleeperId"]
        d = BD.diff_boards(doc([old_row]), doc([new_row]))
        self.assertEqual(d["matched_by_name"], {"old": ["Alpha"], "new": ["Alpha"]})
        self.assertEqual(d["no_stable_id"], {"old": ["Alpha"], "new": ["Alpha"]})

    def test_a_row_that_GAINED_an_id_between_runs_still_joins(self):
        """U14 froze `sleeperId` onto this board on 2026-08-07, so a comparison spanning that day
        has rows with an id on one side and none on the other. A matcher that only compared like
        with like would report the whole board as 174 drops plus 174 adds."""
        blank = row(1, "Alpha", sid="")
        d = BD.diff_boards(doc([blank]), doc([row(1, "Alpha")]))
        self.assertEqual(d["adds"], [], "the id-keyed side and the name-keyed side did not join")
        self.assertEqual(d["drops"], [])
        self.assertEqual(d["matched_by_name"], {"old": ["Alpha"], "new": ["Alpha"]})
        self.assertEqual(d["no_stable_id"], {"old": ["Alpha"], "new": []},
                         "only the blank-id side is missing the frozen key")

    def test_the_name_fallback_refuses_when_the_name_is_ambiguous(self):
        """Two men share a normalized name and neither carries an id -- welding them together on
        a guess would invent a move out of two unrelated rows."""
        a, b = row(1, "Mike Williams", team="NYJ", sid=""), row(2, "Mike Williams", team="LAC",
                                                               sid="")
        d = BD.diff_boards(doc([a, b]), doc([row(1, "Mike Williams", team="NYJ", sid="")]))
        self.assertEqual(d["moves"], [])
        self.assertEqual(len(d["drops"]), 2)
        self.assertEqual(len(d["adds"]), 1)

    def test_a_row_that_kept_its_id_is_never_reported_as_guessed(self):
        d = BD.diff_boards(doc([row(1, "Alpha")]), doc([row(1, "Alpha")]))
        self.assertEqual(d["matched_by_name"], {"old": [], "new": []})
        self.assertEqual(d["no_stable_id"], {"old": [], "new": []})


class TestRefusals(unittest.TestCase):
    """Insight 008's shape: prove a zero is a reading before reporting it."""

    def test_an_empty_players_list_refuses_instead_of_reporting_every_row_as_a_drop(self):
        with self.assertRaises(ValueError) as cm:
            BD.diff_boards(doc([]), doc([row(1, "Alpha")]))
        self.assertIn("empty", str(cm.exception))

    def test_the_refusal_names_which_side_was_empty(self):
        with self.assertRaises(ValueError) as cm:
            BD.diff_boards(doc([row(1, "Alpha")]), doc([]))
        self.assertIn("new", str(cm.exception))

    def test_two_rows_under_one_id_refuse_rather_than_silently_dropping_one(self):
        dupe = doc([row(1, "Alpha", sid="7564"), row(2, "Bravo", sid="7564")])
        with self.assertRaises(ValueError) as cm:
            BD.diff_boards(dupe, doc([row(1, "Alpha", sid="7564")]))
        self.assertIn("7564", str(cm.exception))

    def test_a_document_that_is_not_a_board_refuses(self):
        with self.assertRaises(ValueError):
            BD.diff_boards({"players": "not a list"}, doc([row(1, "Alpha")]))
        with self.assertRaises(ValueError):
            BD.diff_boards(doc([row(1, "Alpha")]), {"players": [["not", "an", "object"]]})


class TestMetaAndTheKindOfChange(unittest.TestCase):
    def test_the_synthesis_dates_come_through_from_both_sides(self):
        d = BD.diff_boards(doc([row(1, "Alpha")], synthesized="2026-08-08", judgment="aaaa"),
                           doc([row(1, "Alpha")], synthesized="2026-08-14", judgment="bbbb"))
        self.assertEqual(d["meta"]["old"]["synthesized"], "2026-08-08")
        self.assertEqual(d["meta"]["new"]["synthesized"], "2026-08-14")
        self.assertFalse(d["meta"]["same_synthesis"])
        self.assertFalse(d["meta"]["same_judgment"])

    def test_one_scrape_on_both_sides_is_announced_as_the_same_scrape(self):
        d = BD.diff_boards(doc([row(1, "Alpha")], synthesized="2026-08-14"),
                           doc([row(1, "Alpha", note="reworded")], synthesized="2026-08-14"))
        self.assertTrue(d["meta"]["same_synthesis"])
        buf = io.StringIO()
        side = {"short": "x", "when": "", "subject": "", "rows": 1}
        BD.print_diff(dict(side, synthesized="2026-08-14", judgment="a", doc={}),
                      dict(side, synthesized="2026-08-14", judgment="b", doc={}),
                      d, out=lambda s="": buf.write(s + "\n"))
        self.assertIn("SAME SYNTHESIS DATE", buf.getvalue())

    def test_a_board_predating_meta_rankings_reads_as_unknown_not_as_a_match(self):
        """Six commits in this repo's history carry no `meta.rankings` at all -- it was added on
        2026-08-08. `None == None` must not be mistaken for "the same synthesis"."""
        bare = {"players": [row(1, "Alpha")], "meta": {}, "dst": [], "strategy": {}}
        d = BD.diff_boards(bare, dict(bare, meta={}))
        self.assertIsNone(d["meta"]["old"]["synthesized"])
        self.assertFalse(d["meta"]["same_synthesis"])
        self.assertFalse(d["meta"]["same_judgment"])


class TestTheJudgmentCrossCheck(unittest.TestCase):
    def test_the_recomputed_digest_agrees_with_validate_boards_own_stamp(self):
        """Recomputed by importing validate_board, never by a second copy of the rule."""
        with open(BD.BOARD, encoding="utf-8") as f:
            live = json.load(f)
        self.assertEqual(BD.recomputed_judgment(live), live["meta"]["rankings"]["judgment"],
                         "the live board's stamped judgment digest does not match its own rows")

    def test_a_hand_edited_rank_changes_the_recomputed_digest(self):
        with open(BD.BOARD, encoding="utf-8") as f:
            live = json.load(f)
        tampered = json.loads(json.dumps(live))
        tampered["players"][0]["r"] = 999
        self.assertNotEqual(BD.recomputed_judgment(tampered), BD.recomputed_judgment(live))


@unittest.skipIf(not HAS_GIT, "git is not on PATH")
class TestGitPlumbing(unittest.TestCase):
    """Read-only, against this repository's real history. Nothing here writes, and nothing here
    runs `git status`/`git diff` -- both rewrite .git/index, and a draft-day session may be
    running the engine out of this same tree."""

    def setUp(self):
        self.root = BD.repo_root()
        self.rel = BD.board_in_repo()

    def test_the_board_path_is_derived_from_gits_own_prefix(self):
        self.assertTrue(self.rel.endswith(BD.BOARD_UNDER_PROJECT), self.rel)
        self.assertFalse(os.path.isabs(self.rel), "an absolute path here is the known breakage")

    def test_the_derived_path_actually_resolves_at_HEAD(self):
        head = BD.load("HEAD", self.root, self.rel)
        self.assertGreater(len(head["players"]), 100)

    def test_the_ledger_lists_more_than_one_run_newest_first(self):
        runs = BD.list_runs(self.root, self.rel)
        self.assertGreaterEqual(len(runs), 2, "this repo has many commits touching the board")
        self.assertTrue(all(len(r["sha"]) == 40 for r in runs))
        self.assertGreater(runs[0]["when"], runs[-1]["when"], "the ledger is not newest-first")

    def test_a_ref_that_does_not_exist_refuses_loudly(self):
        with self.assertRaises(SystemExit) as cm:
            BD.resolve("no-such-ref-zzzz", self.root)
        self.assertIn("no such commit", str(cm.exception))

    def test_a_ref_where_the_board_does_not_exist_refuses_loudly(self):
        """The empty tree: a real ref with no board under it. Never an empty table."""
        empty_tree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
        with self.assertRaises(SystemExit) as cm:
            BD.blob_at(empty_tree, self.root, self.rel)
        self.assertIn("does not exist", str(cm.exception))

    def test_the_worktree_check_returns_an_answer_without_touching_the_index(self):
        self.assertIn(BD.worktree_differs(self.root, self.rel), (True, False))

    def test_two_real_runs_diff_end_to_end(self):
        try:
            BD.resolve(OLD_REAL, self.root)
            BD.resolve(NEW_REAL, self.root)
        except SystemExit:
            self.skipTest(f"{OLD_REAL}/{NEW_REAL} are not in this clone's history")
        d = BD.diff_boards(BD.load(OLD_REAL, self.root, self.rel),
                           BD.load(NEW_REAL, self.root, self.rel))
        self.assertEqual(d["meta"]["old"]["synthesized"], "2026-08-08")
        self.assertEqual(d["meta"]["new"]["synthesized"], "2026-08-14")
        self.assertGreater(len(d["moves"]), 50, "the 08-14 re-rank moved most of the board")
        self.assertEqual(d["adds"], [], "no player entered the board between those two runs")
        self.assertEqual(d["drops"], [], "no player left the board between those two runs")
        self.assertEqual(d["matched_by_name"], {"old": [], "new": []},
                         "every real row carries the frozen sleeperId")
        self.assertEqual(d["no_stable_id"], {"old": [], "new": []})

    def test_the_ledger_prints(self):
        buf = io.StringIO()
        BD.print_ledger(self.root, self.rel, out=lambda s="": buf.write(s + "\n"))
        printed = buf.getvalue()
        self.assertIn(BD.BOARD_UNDER_PROJECT, printed)
        self.assertIn("commit(s)", printed)

    def test_an_uncommitted_refresh_is_announced_with_its_own_verdict(self):
        """The runbook runs this BEFORE the commit, so at that moment the freshest board is the
        one on disk and it is neither side of the default comparison. Simulated by pointing the
        module at a copy -- the real board is never touched, because a draft session may be
        reading it right now."""
        with open(BD.BOARD, encoding="utf-8") as f:
            live = json.load(f)
        tampered = json.loads(json.dumps(live))
        tampered["players"][0]["r"] = 999
        real_board, buf, stdout = BD.BOARD, io.StringIO(), sys.stdout
        with tempfile.TemporaryDirectory() as tmp:
            fake = os.path.join(tmp, "players_data.json")
            with open(fake, "w", encoding="utf-8") as f:
                json.dump(tampered, f, ensure_ascii=False)
            BD.BOARD = fake
            sys.stdout = buf
            try:
                rc = BD.main([])
            finally:
                sys.stdout = stdout
                BD.BOARD = real_board
        printed = buf.getvalue()
        self.assertEqual(rc, 0)
        self.assertIn("WORKING TREE COPY DIFFERS FROM HEAD", printed)
        self.assertIn("HEAD -> worktree:", printed)
        self.assertIn("rank(s) moved", printed, "the banner must carry a receipt, not a pointer")

    def test_a_clean_worktree_says_so_rather_than_saying_nothing(self):
        if BD.worktree_differs(self.root, self.rel):
            self.skipTest("the board is uncommitted right now; the clean-tree line cannot fire")
        buf, stdout = io.StringIO(), sys.stdout
        sys.stdout = buf
        try:
            BD.main([])
        finally:
            sys.stdout = stdout
        self.assertIn("identical to HEAD", buf.getvalue())

    def test_the_bare_cli_runs_against_the_real_repo(self):
        buf, stdout = io.StringIO(), sys.stdout
        sys.stdout = buf
        try:
            rc = BD.main([])
        finally:
            sys.stdout = stdout
        self.assertEqual(rc, 0)
        self.assertIn("VERDICT:", buf.getvalue())


if __name__ == "__main__":
    unittest.main()

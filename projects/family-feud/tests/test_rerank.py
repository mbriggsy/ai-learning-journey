#!/usr/bin/env python3
"""Tests for scripts/rerank.py -- re-deriving the board's ordering from the consensus.

    python -m unittest discover -s tests        (from the project root)

No network. Every fixture is built here except the two that read the live board, which skip when
the consensus cache is absent (a clean clone must not go red -- insight 009).
"""
import io
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
import consensus as CO  # noqa: E402
import rerank as R  # noqa: E402

CURVE = {p: {str(i): 400.0 - (i - 1) * 30 if i <= 6 else 220.0 - i for i in range(1, 81)}
         for p in ("QB", "RB", "WR", "TE")}


def fp(fpid, player, pos, team, ecr, sd=1.0):
    return {"page_type": "redraft-overall", "fp_page": CO.EXPECT_FP_PAGE, "id": fpid,
            "player": player, "pos": pos, "team": team, "ecr": str(ecr), "sd": str(sd),
            "scrape_date": "2026-08-07"}


def brow(r, name, pos, team, pr, sid, tier=1, note="n", badges=None):
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": pr, "tier": tier,
            "badges": badges if badges is not None else [], "note": note,
            "vorp": 1.0, "vbdRank": r, "vbdDelta": 0, "sleeperId": sid,
            "vorpMethod": "curve:2021-2024"}


class TestForeignTeamCodes(unittest.TestCase):
    """FantasyPros spells Jacksonville 'JAC'. Sleeper and the board say 'JAX', and U14 proved the
    board right against the live dump AND every live pick. The same divergence that silently
    disabled the engine's safety net for one team turned up again joining team defenses."""

    def test_the_foreign_spelling_is_normalised(self):
        self.assertEqual(R.team_of({"team": "JAC"}), "JAX")

    def test_a_code_we_already_agree_on_is_untouched(self):
        self.assertEqual(R.team_of({"team": "KC"}), "KC")
        self.assertEqual(R.team_of({"team": "JAX"}), "JAX")

    def test_a_jacksonville_defense_JOINS_after_normalisation(self):
        """The behaviour, not just the lookup table -- deleting the alias must break something."""
        page = CO.consensus_rows([fp("1", "Jacksonville Jaguars", "DST", "JAC", 250.0)])
        board = [brow(1, "Jacksonville Jaguars", "DEF", "JAX", 1, "JAX")]
        rows, unmatched = R.attach(board, page, {})
        self.assertEqual(unmatched, [], "the JAX defense did not reach its JAC consensus row")
        self.assertIsNotNone(rows[0]["ecr"])


class TestOrdering(unittest.TestCase):
    def setUp(self):
        # THE KICKER IS DELIBERATELY RANKED ABOVE A SKILL PLAYER. With him at a realistic
        # consensus rank of 300 the block rule and a plain consensus sort produce the SAME
        # order, so the fixture could not tell them apart -- a mutant that let K and DEF
        # interleave survived the whole suite. An extreme fixture is what makes the rule visible.
        self.page = CO.consensus_rows([
            fp("10", "Wide One", "WR", "KC", 1.0),
            fp("30", "Kicker One", "K", "DAL", 1.5),
            fp("20", "Back One", "RB", "SF", 2.0),
            fp("40", "Denver Broncos", "DST", "DEN", 2.5),
        ])
        self.board = [brow(1, "Back One", "RB", "SF", 1, "s20"),
                      brow(2, "Wide One", "WR", "KC", 1, "s10"),
                      brow(3, "Kicker One", "K", "DAL", 1, "s30"),
                      brow(4, "Denver Broncos", "DEF", "DEN", 1, "DEN")]
        self.xw = {"s10": "10", "s20": "20", "s30": "30"}

    def ordered(self):
        rows, _ = R.attach(self.board, self.page, self.xw)
        return R.position_ranks(R.reorder(rows))

    def test_the_consensus_order_is_adopted(self):
        o = self.ordered()
        self.assertEqual([e["p"]["name"] for e in o[:2]], ["Wide One", "Back One"])

    def test_K_and_DEF_sink_below_every_skill_player(self):
        """You do not spend a round-8 pick on a kicker whatever a 523-player list says. The old
        board did this too (skill 1-150, K/DEF 151-174); it is preserved on purpose."""
        o = self.ordered()
        skill_max = max(e["new_r"] for e in o if e["p"]["pos"] in CO.SKILL)
        kdef_min = min(e["new_r"] for e in o if e["p"]["pos"] not in CO.SKILL)
        self.assertLess(skill_max, kdef_min)

    def test_r_is_contiguous_from_one(self):
        o = self.ordered()
        self.assertEqual(sorted(e["new_r"] for e in o), list(range(1, len(o) + 1)))

    def test_pr_is_contiguous_within_every_position(self):
        o = self.ordered()
        by_pos = {}
        for e in o:
            by_pos.setdefault(e["p"]["pos"], []).append(e["new_pr"])
        for pos, prs in by_pos.items():
            self.assertEqual(sorted(prs), list(range(1, len(prs) + 1)), pos)

    def test_an_unmatched_row_sorts_last_in_its_block_deterministically(self):
        self.board.append(brow(5, "Ghost Back", "RB", "NYJ", 2, "s99"))
        o = self.ordered()
        ghost = next(e for e in o if e["p"]["name"] == "Ghost Back")
        skill = [e for e in o if e["p"]["pos"] in CO.SKILL]
        self.assertEqual(ghost["new_r"], max(e["new_r"] for e in skill),
                         "an unmatched row must not be silently promoted")


class TestValueBands(unittest.TestCase):
    def test_tiers_are_contiguous_from_one(self):
        bands = R.value_bands(CURVE, "RB", 40, 6)
        self.assertEqual(sorted(set(bands)), list(range(1, max(bands) + 1)))

    def test_the_band_count_is_honoured(self):
        self.assertEqual(max(R.value_bands(CURVE, "RB", 40, 6)), 6)

    def test_bands_are_NOT_equal_counts(self):
        """Equal counts would be an arbitrary cut. Equal VALUE gives the shape a tier list is
        supposed to have -- a couple of names where points fall away fast, widening as the curve
        flattens."""
        bands = R.value_bands(CURVE, "RB", 40, 6)
        sizes = [bands.count(t) for t in sorted(set(bands))]
        self.assertGreater(max(sizes), min(sizes) + 1, f"bands look equal-count: {sizes}")

    def test_the_top_band_is_smaller_than_the_bottom_band(self):
        bands = R.value_bands(CURVE, "RB", 40, 6)
        self.assertLess(bands.count(1), bands.count(max(bands)))

    def test_a_position_with_no_curve_yields_None_rather_than_a_guess(self):
        self.assertIsNone(R.value_bands(CURVE, "DEF", 14, 3))

    def test_K_and_DEF_keep_their_old_tiers_contiguously(self):
        page = CO.consensus_rows([fp("40", "Denver Broncos", "DST", "DEN", 260.0),
                                  fp("41", "Chicago Bears", "DST", "CHI", 265.0)])
        board = [brow(1, "Denver Broncos", "DEF", "DEN", 1, "DEN", tier=2),
                 brow(2, "Chicago Bears", "DEF", "CHI", 2, "CHI", tier=1)]
        rows, _ = R.attach(board, page, {})
        o = R.assign_tiers(R.position_ranks(R.reorder(rows)), CURVE, {"DEF": 2})
        self.assertEqual(sorted(e["new_tier"] for e in o), [1, 2])


class TestRankClaimingNotes(unittest.TestCase):
    """The one thing on this board a machine has no business rephrasing."""

    def entries(self, note, old_r=1, new_r=9):
        e = {"p": brow(old_r, "Someone", "RB", "KC", 1, "s1", note=note), "new_r": new_r}
        return R.rank_claim_notes([e])

    def test_a_draft_slot_claim_is_caught(self):
        self.assertTrue(self.entries("The 1.01. Elite PPR back."))

    def test_a_round_claim_is_caught(self):
        self.assertTrue(self.entries("Free square in round 7."))
        self.assertTrue(self.entries("Rounds 6-8 is the zone."))

    def test_an_overall_claim_is_caught(self):
        self.assertTrue(self.entries("WR1 overall. Boring in the best way."))

    def test_a_DEPTH_CHART_claim_is_NOT_caught(self):
        """Measured on the live board: 'WR1' overwhelmingly means his team's number one receiver,
        and that stays true whatever this board does. A blanket positional scan flagged 24 rows,
        most of them fine -- a check that cries wolf gets overridden."""
        for note in ("Lamar's clear WR1, and Likely's exit frees up targets.",
                     "Instant WR1 for Drake Maye.", "Best WR2 in football.",
                     "Kellen Moore's WR1 with rookie Tyson drawing coverage."):
            self.assertEqual(self.entries(note), [], note)

    def test_a_claim_on_a_row_that_did_not_move_is_not_reported(self):
        self.assertEqual(self.entries("The 1.01.", old_r=1, new_r=1), [])


class TestAcknowledgingARankClaim(unittest.TestCase):
    """A gate nothing can pass is a wall, and the way past must go stale on its own.

    Sometimes the claim is still TRUE at the new rank -- Jayden Daniels #50 -> #48 keeps
    "Rounds 6-8 is the zone" correct, because round 6 in an 8-team draft is picks 41-48. Before
    --notes-reviewed the only routes past were to edit prose that was not wrong, or to weaken the
    gate. The acknowledgement is BY NAME so that it cannot cover a note nobody has read.
    """

    def claim(self, name, note="Rounds 6-8 is the zone."):
        e = {"p": brow(50, name, "QB", "WAS", 5, "s1", note=note), "new_r": 48}
        return R.rank_claim_notes([e])

    def test_no_acknowledgement_leaves_the_claim_unacked(self):
        self.assertEqual(len(R.unacknowledged(self.claim("Jayden Daniels"), [])), 1)

    def test_the_right_name_acknowledges_it(self):
        self.assertEqual(R.unacknowledged(self.claim("Jayden Daniels"), ["Jayden Daniels"]), [])

    def test_the_WRONG_name_does_NOT(self):
        """The property that makes this an acknowledgement rather than a --force."""
        self.assertEqual(len(R.unacknowledged(self.claim("Jayden Daniels"), ["Bijan Robinson"])), 1)

    def test_matching_is_case_and_whitespace_insensitive(self):
        self.assertEqual(R.unacknowledged(self.claim("Jayden Daniels"), ["  jayden daniels "]), [])

    def test_acknowledging_one_of_two_still_blocks_the_other(self):
        """The failure this exists to prevent: a second note starts claiming a rank on some later
        refresh and rides in on an acknowledgement written for the first."""
        claims = self.claim("Jayden Daniels") + self.claim("Somebody Else", "The 1.01.")
        left = R.unacknowledged(claims, ["Jayden Daniels"])
        self.assertEqual([e["p"]["name"] for e, _ in left], ["Somebody Else"])

    def test_the_call_site_uses_the_predicate_and_gates_the_WRITE_on_it(self):
        """Insight 013: the predicate having tests is not evidence the write is gated by it.
        MUTANT: point the refusal at `claims` instead of `unacked` and --write can never run;
        drop the check and an unreviewed claim writes silently."""
        with open(os.path.join(ROOT, "scripts", "rerank.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertIn("unacked = unacknowledged(claims, a.notes_reviewed)", src)
        self.assertIn("if unacked:", src)
        self.assertIn("REFUSED TO WRITE", src)


class TestApply(unittest.TestCase):
    def setUp(self):
        self.doc = {"meta": {"rankings": {"synthesized": "2026-01-01", "judgment": "old"}},
                    "players": [brow(1, "A", "RB", "KC", 1, "s1", badges=["T", "B"]),
                                brow(2, "B", "WR", "SF", 1, "s2", badges=["T"])],
                    "dst": [], "strategy": {}}
        self.ordered = [{"p": self.doc["players"][0], "new_r": 2, "new_pr": 1, "new_tier": 1},
                        {"p": self.doc["players"][1], "new_r": 1, "new_pr": 1, "new_tier": 1}]

    def test_the_briggsys_guy_badge_is_dropped(self):
        """It asserted a curation that never happened. Nothing on the board may claim a judgment
        nobody made -- the same defect class as the synthesis date."""
        out = R.apply(self.doc, self.ordered, "2026-08-07")
        self.assertEqual([b for p in out["players"] for b in p["badges"]], ["B"])

    def test_other_badges_survive(self):
        out = R.apply(self.doc, self.ordered, "2026-08-07")
        self.assertIn("B", out["players"][1]["badges"] + out["players"][0]["badges"])

    def test_the_synthesis_date_becomes_the_SCRAPE_date(self):
        """Derived, not promised. The date the consensus was actually gathered is a computed fact;
        a human assertion about it is not."""
        out = R.apply(self.doc, self.ordered, "2026-08-07")
        self.assertEqual(out["meta"]["rankings"]["synthesized"], "2026-08-07")

    def test_rows_come_out_sorted_by_the_new_rank(self):
        out = R.apply(self.doc, self.ordered, "2026-08-07")
        self.assertEqual([p["name"] for p in out["players"]], ["B", "A"])

    def test_the_input_document_is_not_mutated(self):
        snapshot = json.dumps(self.doc, sort_keys=True)
        R.apply(self.doc, self.ordered, "2026-08-07")
        self.assertEqual(json.dumps(self.doc, sort_keys=True), snapshot)


class TestItRefusesToWriteOverAStaleNote(unittest.TestCase):
    def test_write_is_refused_while_a_note_claims_a_position(self):
        """THE CALL SITE. Every test above calls rank_claim_notes directly; cutting the
        `if claims: return 1` out of main() would leave all of them green while the script wrote
        a board whose prose contradicted its own ordering."""
        if not os.path.exists(CO.ECR_CACHE) or not os.path.exists(CO.XWALK_CACHE):
            self.skipTest("no cached consensus on this machine")
        with open(CO.BOARD, "rb") as f:
            before = f.read()

        real = R.rank_claim_notes
        R.rank_claim_notes = lambda ordered: [(ordered[0], "INJECTED 1.01")]
        self.addCleanup(setattr, R, "rank_claim_notes", real)

        buf, stdout = io.StringIO(), sys.stdout
        sys.stdout = buf
        try:
            rc = R.main(["--write", "--show", "0"])
        finally:
            sys.stdout = stdout
        self.assertEqual(rc, 1, "rerank wrote the board despite a rank-claiming note")
        self.assertIn("REFUSED TO WRITE", buf.getvalue())
        with open(CO.BOARD, "rb") as f:
            self.assertEqual(f.read(), before, "the board was modified during a refusal")


class TestTheLiveBoardIsConsistentWithItsOwnOrdering(unittest.TestCase):
    def test_pr_is_the_within_position_rank_implied_by_r(self):
        with open(CO.BOARD, encoding="utf-8") as f:
            rows = json.load(f)["players"]
        seen = {}
        bad = []
        for p in sorted(rows, key=lambda x: x["r"]):
            seen[p["pos"]] = seen.get(p["pos"], 0) + 1
            if p["pr"] != seen[p["pos"]]:
                bad.append((p["name"], p["pr"], seen[p["pos"]]))
        self.assertEqual(bad, [])

    def test_no_row_still_carries_the_dropped_badge(self):
        with open(CO.BOARD, encoding="utf-8") as f:
            rows = json.load(f)["players"]
        self.assertEqual([p["name"] for p in rows if "T" in (p.get("badges") or [])], [])


if __name__ == "__main__":
    unittest.main()

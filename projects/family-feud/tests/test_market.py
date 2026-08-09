#!/usr/bin/env python3
"""Tests for scripts/market.py -- value (priced for THIS league) against market ADP.

    python -m unittest discover -s tests        (from the project root)

No network. The two tests that read the real cached pool skip when it is absent.
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
import market as M  # noqa: E402


def ap(name, pos, team, adp, stdev=1.0, drafted=1000):
    return {"name": name, "position": pos, "team": team, "adp": adp, "stdev": stdev,
            "times_drafted": drafted, "player_id": abs(hash(name)) % 99999}


def pool(players, kind="PPR", total=5000):
    return {"status": "Success", "meta": {"type": kind, "teams": 8, "total_drafts": total},
            "players": players}


def brow(r, name, pos, team, pr, vorp, sid=None):
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": pr, "tier": 1, "badges": [],
            "note": "n", "vorp": vorp, "vbdRank": r, "vbdDelta": 0,
            "sleeperId": sid or f"s{r}", "vorpMethod": "curve:2021-2024"}


class TestValidation(unittest.TestCase):
    def test_a_healthy_ppr_pool_is_accepted(self):
        self.assertTrue(M.validate(pool([ap("A One", "RB", "KC", 1.0)] * 100)))

    def test_a_non_ppr_pool_is_REFUSED(self):
        """This league is Full PPR. A half-PPR pool parses identically and prices another game."""
        with self.assertRaises(CO.Refuse) as ctx:
            M.validate(pool([ap("A One", "RB", "KC", 1.0)] * 100, kind="Half PPR"))
        self.assertIn("Full PPR", str(ctx.exception))

    def test_a_failed_status_is_REFUSED(self):
        bad = pool([ap("A One", "RB", "KC", 1.0)] * 100)
        bad["status"] = "Error"
        with self.assertRaises(CO.Refuse):
            M.validate(bad)

    def test_a_short_pool_is_REFUSED(self):
        with self.assertRaises(CO.Refuse):
            M.validate(pool([ap("A One", "RB", "KC", 1.0)]))

    def test_a_moved_schema_is_REFUSED_rather_than_silently_empty(self):
        rows = [dict(ap("A One", "RB", "KC", 1.0)) for _ in range(100)]
        for r in rows:
            del r["stdev"]
        with self.assertRaises(CO.Refuse) as ctx:
            M.validate(pool(rows))
        self.assertIn("schema moved", str(ctx.exception))


class TestReliabilityFloor(unittest.TestCase):
    """ADP over 17 drafts is not a price."""

    def test_the_floor_is_relative_to_the_most_drafted_player(self):
        players = [ap("Big Name", "RB", "KC", 1.0, drafted=1000),
                   ap("Thin One", "WR", "SF", 50.0, drafted=50)]
        kept, dropped = M.reliable(players, share=0.10)
        self.assertEqual([p["name"] for p in kept], ["Big Name"])
        self.assertEqual(dropped, 1)

    def test_the_same_counts_survive_when_the_whole_pool_scales_up(self):
        """Relative, so it re-calibrates as the sample grows through August instead of silently
        getting stricter. An absolute cutoff would quietly change meaning every week."""
        small = [ap("A", "RB", "KC", 1.0, drafted=100), ap("B", "WR", "SF", 2.0, drafted=9)]
        big = [ap("A", "RB", "KC", 1.0, drafted=10000), ap("B", "WR", "SF", 2.0, drafted=900)]
        self.assertEqual(len(M.reliable(small, 0.10)[0]), len(M.reliable(big, 0.10)[0]))

    def test_nothing_is_dropped_silently(self):
        _, dropped = M.reliable([ap("A", "RB", "KC", 1.0, drafted=1000),
                                 ap("B", "WR", "SF", 2.0, drafted=1)], share=0.10)
        self.assertEqual(dropped, 1, "the count must be reportable, not implicit")


class TestCompare(unittest.TestCase):
    def setUp(self):
        # Two market players the board does NOT carry, so the depth artifact is present to remove.
        self.pool = pool([
            ap("Alpha Back", "RB", "KC", 1.0),
            ap("Ghost A", "RB", "NYJ", 2.0),
            ap("Ghost B", "WR", "NYJ", 3.0),
            ap("Bravo Wide", "WR", "SF", 4.0),
            ap("Thin Guy", "TE", "DAL", 5.0, drafted=5),
            ap("Denver Broncos", "DST", "DEN", 200.0),
        ] + [ap(f"Filler {i}", "WR", "LAR", 20.0 + i) for i in range(100)])
        self.board = [brow(1, "Alpha Back", "RB", "KC", 1, 100.0),
                      brow(2, "Bravo Wide", "WR", "SF", 1, 50.0),
                      brow(3, "Thin Guy", "TE", "DAL", 1, 40.0),
                      brow(4, "Denver Broncos", "DEF", "DEN", 1, 5.0),
                      brow(5, "Nobody Knows", "RB", "LAR", 2, 10.0)]

    def test_the_market_is_re_ranked_over_BOARD_players_only(self):
        """The pool ranks players the board does not carry; they occupy slots and inflate every
        number. Bravo Wide is 4th in the raw pool and 2nd among players actually on the board."""
        f, _ = M.compare(self.board, self.pool)
        bravo = next(x for x in f if x["name"] == "Bravo Wide")
        self.assertEqual(bravo["market_rank"], 2)

    def test_a_board_row_absent_from_the_pool_is_UNMATCHED(self):
        _, notes = M.compare(self.board, self.pool)
        self.assertIn("Nobody Knows", notes["unmatched"])

    def test_a_thinly_drafted_player_is_MATCHED_but_not_priced(self):
        """The two are different failures and were once reported as one number: filtering before
        the join made 18 real join misses read as 48."""
        f, notes = M.compare(self.board, self.pool)
        self.assertNotIn("Thin Guy", notes["unmatched"], "a filtered player is not a join failure")
        thin = next(x for x in f if x["name"] == "Thin Guy")
        self.assertFalse(thin["reliable"])

    def test_K_and_DEF_are_excluded_from_the_value_ranking(self):
        """Their vorp is a flat per-tier constant, so ranking by it is arithmetic theatre."""
        f, _ = M.compare(self.board, self.pool)
        self.assertNotIn("Denver Broncos", [x["name"] for x in f])

    def test_an_ambiguous_key_hard_stops_instead_of_auto_picking(self):
        """Insight 010: a lone survivor of a pool narrowed by attributes the wrong answer shares
        is not identified -- and two survivors certainly are not."""
        p = pool(self.pool["players"] + [ap("Alpha Back", "RB", "KC", 9.0)])
        _, notes = M.compare(self.board, p)
        self.assertIn("Alpha Back", notes["ambiguous"])
        self.assertNotIn("Alpha Back", [x["name"] for x in M.compare(self.board, p)[0]])

    def gaps_at_spread(self, sd):
        """One fixture, one variable: the market's own disagreement about the price.

        `vorp` ascends while `adp` ascends, so value rank and market rank are inverted and every
        player carries a large raw gap -- exactly the situation where an unbounded metric shouts.
        """
        # ALPHABETIC names on purpose: `normalize.norm` strips digits, so "P1".."P40" all
        # normalise to "p", collide on one key, and every row correctly hard-stops as ambiguous --
        # which is the join behaving, and a fixture that measures nothing.
        def nm(i):
            return f"Alpha{chr(65 + i // 26)}{chr(65 + i % 26)}"

        players = [ap(nm(i), "WR", "LAR", float(i + 1), stdev=sd) for i in range(40)]
        board = [brow(i + 1, nm(i), "WR", "LAR", i + 1, float(i + 1)) for i in range(40)]
        f, notes = M.compare(board, pool(players))
        self.assertEqual(notes["ambiguous"], [], "the fixture collided; it measures nothing")
        self.assertEqual(notes["unmatched"], [], "the fixture did not join; it measures nothing")
        return [abs(x["gap"]) for x in f]

    def test_a_WIDE_market_spread_swallows_the_gap(self):
        """The BOUNDING, not the report's filter -- a mutant that returned the raw difference
        survived a whole suite because every test fed `report()` a gap already computed.

        A price the room cannot agree on is not evidence the room is wrong."""
        tight, wide = self.gaps_at_spread(0.5), self.gaps_at_spread(25.0)
        self.assertGreater(sum(tight), 0, "the control found no disagreement to bound")
        self.assertLess(sum(wide), sum(tight),
                        "widening the market's own spread did not shrink the disagreement")

    def test_a_TIGHT_market_spread_leaves_the_gap_standing(self):
        """The paired control: a rule that returned zero always would satisfy the test above."""
        self.assertGreater(max(self.gaps_at_spread(0.5)), 10)

    def test_value_rank_follows_VORP_not_board_rank(self):
        """Board rank is the generic expert opinion; vorp is priced for THIS room. Comparing the
        market to board rank just rediscovers that drafters fade QBs and analysts do not."""
        self.board[0]["vorp"], self.board[1]["vorp"] = 10.0, 900.0     # invert value vs r
        f, _ = M.compare(self.board, self.pool)
        best = min(f, key=lambda x: x["value_rank"])
        self.assertEqual(best["name"], "Bravo Wide")


class TestTheReport(unittest.TestCase):
    def finding(self, **kw):
        base = {"name": "X", "pos": "RB", "team": "KC", "vorp": 10.0, "board_r": 1,
                "value_rank": 10, "market_rank": 30, "raw_gap": 20, "gap": 20.0, "stdev": 1.0,
                "times_drafted": 900, "adp": 30.0, "reliable": True}
        base.update(kw)
        return base

    def notes(self):
        return {"dropped_unreliable": 0, "unmatched": [], "ambiguous": [], "total_drafts": 5000,
                "pool": 256, "matched": 2, "compared": 2, "shown": 2}

    def render(self, findings):
        return M.report(findings, self.notes(), 10, {"rankings": {"synthesized": "2026-08-07"}})

    def test_a_sub_replacement_player_is_never_a_BARGAIN(self):
        """A discount on a worthless player is worthless. Without this the take-these list filled
        with names whose only distinction was being ignored."""
        text = self.render([self.finding(name="Cheap Junk", vorp=-20.0, gap=40.0)])
        self.assertNotIn("Cheap Junk", text.split("LET THESE GO")[0])

    def test_a_sub_replacement_player_IS_flagged_among_the_traps(self):
        text = self.render([self.finding(name="Costly Junk", vorp=-20.0, gap=-40.0)])
        self.assertIn("Costly Junk", text)
        self.assertIn("BELOW REPLACEMENT", text)

    def test_a_thinly_drafted_row_is_not_shown_at_all(self):
        text = self.render([self.finding(name="Thin Guy", vorp=50.0, gap=40.0, reliable=False)])
        self.assertNotIn("Thin Guy", text)

    def test_a_gap_the_markets_own_spread_swallows_is_not_reported(self):
        text = self.render([self.finding(name="No Signal", vorp=50.0, gap=0.0)])
        self.assertNotIn("No Signal", text)


class TestItNeverWritesTheBoard(unittest.TestCase):
    def test_every_open_of_the_board_is_read_mode(self):
        import re
        with open(os.path.join(ROOT, "scripts", "market.py"), encoding="utf-8") as f:
            src = f.read()
        opens = re.findall(r"open\(\s*CO\.BOARD\s*(?:,\s*([^)]*))?\)", src)
        self.assertTrue(opens, "no open of the board found -- has this module been renamed?")
        for args in opens:
            self.assertNotRegex(args or "", r"['\"][waxr]?\+?[wax]",
                                f"market.py opens the board for writing: {args}")

    def test_the_real_run_leaves_the_board_byte_identical(self):
        if not os.path.exists(M.ADP_CACHE):
            self.skipTest("no cached ADP pool on this machine -- run --refresh")
        with open(CO.BOARD, "rb") as f:
            before = f.read()
        buf, real = io.StringIO(), sys.stdout
        sys.stdout = buf
        try:
            rc = M.main(["--top", "3"])
        finally:
            sys.stdout = real
        self.assertEqual(rc, 0)
        with open(CO.BOARD, "rb") as f:
            self.assertEqual(f.read(), before)


class TestAgainstTheRealCachedPool(unittest.TestCase):
    def setUp(self):
        if not os.path.exists(M.ADP_CACHE):
            self.skipTest("no cached ADP pool on this machine")
        self.doc = M.load()
        with open(CO.BOARD, encoding="utf-8") as f:
            self.board = json.load(f)["players"]

    def test_the_exact_key_join_still_reaches_most_of_the_board(self):
        """Coverage IS the health signal: a name join is forbidden here, so if a team code moves
        this collapses and the report would quietly compare almost nothing."""
        _, notes = M.compare(self.board, self.doc)
        self.assertGreater(notes["matched"], len(self.board) * 0.8,
                           f"join coverage collapsed: {notes['matched']}/{len(self.board)}")
        self.assertEqual(notes["ambiguous"], [])

    def test_the_join_never_lands_on_a_different_position(self):
        f, _ = M.compare(self.board, self.doc)
        by_name = {p["name"]: p for p in self.board}
        self.assertEqual([x["name"] for x in f if by_name[x["name"]]["pos"] != x["pos"]], [])

    def test_the_depth_correction_leaves_no_systematic_bias(self):
        """Raw `adp - board rank` averaged +2.9 and made nearly everyone look underpriced. If this
        drifts far from zero again, an artifact has crept back in."""
        f, _ = M.compare(self.board, self.doc)
        gaps = [x["market_rank"] - x["value_rank"] for x in f]
        self.assertLess(abs(sum(gaps) / len(gaps)), 5.0,
                        "a systematic gap is back -- something is being counted twice")


if __name__ == "__main__":
    unittest.main()

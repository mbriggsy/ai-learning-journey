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


class TestTheMarketIsRankedInTheSAMEPopulationAsValue(unittest.TestCase):
    """`val` ranks SKILL players only -- K and DEF carry flat constants, so ranking them by `vorp`
    would be arithmetic theatre. The market rank subtracted from it therefore has to count the
    same men. It counted every matched board row instead, K and DEF included: measured on the live
    board, 10 kickers and defenses land at all-positions ranks 119-151, so 28 of 146 skill rows
    carried an inflated `mkt` and read as bigger bargains than they are."""

    def setUp(self):
        # A kicker and a defense the room takes BEFORE the last skill player, which is the whole
        # mechanism -- if they went last, no skill rank could be inflated by them.
        self.adp = pool([ap("Ay Back", "RB", "KC", 1.0), ap("Bee Wide", "WR", "SF", 2.0),
                         ap("Cee Kicker", "K", "NYJ", 3.0), ap("Dee Def", "DEF", "DEN", 4.0),
                         ap("Ee Tight", "TE", "BUF", 5.0)] + [ap(f"Filler{i}", "RB", "DAL", 50.0 + i)
                                                              for i in range(100)])
        self.board = [brow(1, "Ay Back", "RB", "KC", 1, 100.0),
                      brow(2, "Bee Wide", "WR", "SF", 1, 90.0),
                      brow(3, "Cee Kicker", "K", "NYJ", 1, 5.0),
                      brow(4, "Dee Def", "DEF", "DEN", 1, 5.0),
                      brow(5, "Ee Tight", "TE", "BUF", 1, 80.0)]

    def test_the_skill_rank_does_not_count_the_kicker_and_the_defense(self):
        f, _ = M.compare(self.board, self.adp)
        tight = next(x for x in f if x["name"] == "Ee Tight")
        self.assertEqual(tight["market_rank"], 3, "third SKILL player off the board")
        self.assertEqual(tight["market_rank_all"], 5, "fifth player off the board overall")

    def test_the_inflated_rank_is_KEPT_so_the_correction_stays_auditable(self):
        f, _ = M.compare(self.board, self.adp)
        for x in f:
            self.assertIn("market_rank_all", x)

    def test_K_and_DEF_never_reach_the_findings_at_all(self):
        """The positive control: they are ranked for display and excluded from the comparison."""
        f, _ = M.compare(self.board, self.adp)
        self.assertEqual({x["pos"] for x in f}, {"RB", "WR", "TE"})

    def test_the_gap_is_computed_from_the_SKILL_rank_not_the_inflated_one(self):
        """End to end. Ee Tight is the board's 3rd-most-valuable skill player and the market's 3rd
        skill player off the board, so he is fairly priced and owes nothing. Measured against the
        all-positions rank he looks like he falls 2 spots -- a bargain manufactured out of two
        picks the room spent on a kicker and a defense."""
        f, _ = M.compare(self.board, self.adp)
        tight = next(x for x in f if x["name"] == "Ee Tight")
        self.assertEqual(tight["value_rank"], 3)
        self.assertEqual(tight["raw_gap"], 0, "fairly priced; the K and DEF must not create a gap")


class TestTheSpreadEdgesExcludeThePlayerHimself(unittest.TestCase):
    """The same self-counting defect insight 019 records in consensus.py, on the mirror edge.
    `mkt_worst` counted the player himself (correct -- a rank includes its holder) while
    `mkt_best` at `adp - sd` did not, and neither added a +1 to compensate, so `best` ran one rung
    too GOOD. Measured before the rewrite: mkt_best wrong on 133 of 146 live skill rows."""

    def pairs(self):
        rows = [({"pos": "RB"}, {"adp": 10.0, "stdev": 3.0}),
                ({"pos": "RB"}, {"adp": 5.0, "stdev": 0.0}),
                ({"pos": "RB"}, {"adp": 20.0, "stdev": 0.0}),
                ({"pos": "RB"}, {"adp": 30.0, "stdev": 0.0})]
        M.market_ranks(rows)
        return rows

    def test_at_his_BEST_price_he_still_ranks_behind_the_man_he_never_passed(self):
        """He is 2nd of four at adp 10. At his best (7.0) he has not passed the man at 5.0, so he
        is still 2nd. The shipped formula counted only the players at or under 7.0 and returned 1
        -- promoting him past somebody he never overtook."""
        a = self.pairs()[0][1]
        self.assertEqual(a["mkt"], 2)
        self.assertEqual(a["mkt_best"], 2)

    def test_at_his_WORST_price_he_is_not_his_own_competition(self):
        """At 13.0 nobody has passed him either -- the next man sits at 20.0 -- so he is still 2nd."""
        self.assertEqual(self.pairs()[0][1]["mkt_worst"], 2)

    def test_a_wide_spread_still_moves_him(self):
        """Positive control: the edges must not be pinned to the point estimate. A price nobody
        agrees on has to widen the band or the whole reliability idea is decorative."""
        rows = [({"pos": "RB"}, {"adp": 10.0, "stdev": 25.0}),
                ({"pos": "RB"}, {"adp": 5.0, "stdev": 0.0}),
                ({"pos": "RB"}, {"adp": 20.0, "stdev": 0.0}),
                ({"pos": "RB"}, {"adp": 30.0, "stdev": 0.0})]
        M.market_ranks(rows)
        a = rows[0][1]
        self.assertEqual(a["mkt_best"], 1, "at 25 spots better he leads the pool")
        self.assertEqual(a["mkt_worst"], 4, "at 25 spots worse he trails it")


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


class TestTheMulesFetchContract(unittest.TestCase):
    """`--fetch-only` is what feud_mule.ps1 runs hourly. Its contract is validate_cargo.py's:
    exit 0 or 1, exactly ONE line on stdout, `ok` as the success prefix.

    The mule keys on that prefix, so a fetcher that succeeded while printing something else would
    be recorded as a failure -- and one that failed while printing `ok` would be recorded as fine,
    which is the "Last Result: 0" shape that fooled this project for hours (insight 007).
    """

    def run_fetch_only(self, module, boom=None):
        real = module.fetch if module is M else module.refresh
        if boom is not None:
            setattr(module, "fetch" if module is M else "refresh",
                    lambda *a, **k: (_ for _ in ()).throw(boom))
        buf, stdout = io.StringIO(), sys.stdout
        sys.stdout = buf
        try:
            rc = module.fetch_only()
        finally:
            sys.stdout = stdout
            setattr(module, "fetch" if module is M else "refresh", real)
        return rc, buf.getvalue()

    def test_a_refusal_exits_1_and_never_says_ok(self):
        for mod in (M, CO):
            rc, out = self.run_fetch_only(mod, boom=CO.Refuse("the source moved"))
            self.assertEqual(rc, 1, mod.__name__)
            self.assertTrue(out.startswith("FAIL:"), f"{mod.__name__}: {out!r}")
            self.assertNotIn("ok", out.split(":")[0])

    def test_the_failure_is_exactly_one_line(self):
        """The mule takes the LAST non-empty line. Extra lines silently change what gets recorded."""
        for mod in (M, CO):
            _, out = self.run_fetch_only(mod, boom=CO.Refuse("the source moved"))
            self.assertEqual(len([x for x in out.splitlines() if x.strip()]), 1, mod.__name__)

    def test_a_success_line_starts_with_ok(self):
        if not os.path.exists(M.ADP_CACHE):
            self.skipTest("no cached pool; this asserts the shape of a real success line")
        doc = M.load()
        real, M.fetch = M.fetch, lambda *a, **k: doc
        try:
            rc, out = self.run_fetch_only(M)
        finally:
            M.fetch = real
        self.assertEqual(rc, 0)
        self.assertTrue(out.startswith("ok ("), out)
        self.assertEqual(len([x for x in out.splitlines() if x.strip()]), 1)


class TestTheMuleRunsBothFetchers(unittest.TestCase):
    """The wiring, not the fetchers. Deleting either Run-Fetcher line would leave every test above
    green while the caches quietly went stale -- and they are gitignored, so a clean clone starts
    with neither."""

    def mule(self):
        with open(os.path.join(ROOT, "newsletter", "feud_mule.ps1"), encoding="utf-8") as f:
            return f.read()

    def test_the_mule_invokes_both_fetchers(self):
        s = self.mule()
        self.assertIn('Run-Fetcher "consensus"', s)
        self.assertIn('Run-Fetcher "market_adp"', s)
        self.assertIn(r"scripts\consensus.py", s)
        self.assertIn(r"scripts\market.py", s)

    def test_the_mule_uses_the_fetch_only_contract(self):
        self.assertIn("--fetch-only", self.mule())

    def test_the_mule_fails_safe_when_python_is_absent(self):
        s = self.mule()
        block = s.split("function Run-Fetcher", 1)[1].split("# ---- Sleeper", 1)[0]
        self.assertIn("no python on PATH", block,
                      "Run-Fetcher must refuse rather than record a silent pass")

    def test_a_nonzero_exit_cannot_be_recorded_as_ok(self):
        """Both halves are checked because trusting either alone is how a task that exits 0 while
        writing nothing reads as healthy (insight 007).

        ANCHORED ON THE CONDITION, not on the message. The first version of this asserted only
        that the string "exited $code while reporting" appeared, so blanking the `if` to
        `if ($false)` left the message sitting in dead code and the test stayed green -- a guard
        with a test and no proof it was live, insight 013 in a language this repo cannot execute
        under unittest. Structural is the honest ceiling here; it must at least be structural
        about the part that DOES something.
        """
        block = self.mule().split("function Run-Fetcher", 1)[1].split("# ---- Sleeper", 1)[0]
        self.assertIn('if ($code -ne 0 -and "$summary".StartsWith("ok"))', block)
        self.assertIn("exited $code while reporting", block)

#!/usr/bin/env python3
"""U16 -- the opponent scout.

The whole value of this module is its REFUSALS: it must exclude drafts that are not comparable,
and it must decline to state a tendency it does not have the sample for. Both failures are
silent and both produce output that looks exactly like a finding, so both are tested here
directly rather than through the profile text.

No network. Every test runs on a hand-built record.
"""
import io
import os
import sys
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                "scripts"))
import scout_opponents as S  # noqa: E402


def draft(picks, dtype="snake", rounds=16, slot=3, qb_pick_nos=None):
    """A draft with `picks` given as (round, pos) pairs."""
    return {
        "draft_id": "d1", "type": dtype, "rounds": rounds, "slot": slot,
        "total_picks": 128, "qb_pick_nos": qb_pick_nos or [],
        "picks": [{"round": r, "pick_no": r * 8 - 5, "pos": p, "name": f"{p} guy",
                   "is_keeper": None} for r, p in picks],
    }


def record(drafts, name="Tester", uid="1"):
    return {"user_id": uid, "display_name": name,
            "leagues": [{"season": "2024", "league_id": "L", "name": "Test League", "teams": 8,
                         "rec": 1.0, "roster_positions": [], "record": None,
                         "drafts": drafts}]}


FULL = [(r, p) for r, p in zip(range(1, 17), "RB WR WR RB QB WR TE RB WR WR RB TE QB WR K DEF".split())]


class TestSampleDiscipline(unittest.TestCase):
    """A denominator quietly containing a different population is the market.py defect."""

    def test_a_full_snake_redraft_is_comparable(self):
        keep, skip = S.comparable(record([draft(FULL)]))
        self.assertEqual(len(keep), 1)
        self.assertEqual(len(skip), 0)

    def test_a_rookie_draft_is_excluded(self):
        """3 picks over a rookie-only pool. 'Took no QB' there is the POOL, not a preference."""
        keep, skip = S.comparable(record([draft(FULL[:3], dtype="linear", rounds=3)]))
        self.assertEqual(keep, [])
        self.assertEqual(len(skip), 1)

    def test_a_short_snake_draft_is_excluded(self):
        """Type alone is not enough -- a keeper league can run a SNAKE rookie draft."""
        keep, _ = S.comparable(record([draft(FULL[:5], dtype="snake", rounds=5)]))
        self.assertEqual(keep, [])

    def test_an_auction_is_excluded_even_at_full_length(self):
        """ISOLATES THE TYPE AXIS, and nothing else did.

        The rookie-draft test above is `linear` AND 3 picks, so it is excluded twice over --
        deleting the type check entirely left it green (mutant M5 survived the first pass,
        insight 019). An auction runs a full roster over full rounds, so it clears the pick
        count and the round cap and ONLY the type check can reject it. It must be rejected:
        an auction has no draft slot and no round-N pick, so 'took a QB in round 2' does not
        mean the same thing there at all."""
        keep, skip = S.comparable(record([draft(FULL, dtype="auction", rounds=16)]))
        self.assertEqual(keep, [], "an auction is not a comparable snake redraft")
        self.assertEqual(len(skip), 1)

    def test_a_dynasty_startup_is_excluded(self):
        """35 rounds is a startup: the pool and the strategy are both different."""
        big = [(r, "WR") for r in range(1, 36)]
        keep, skip = S.comparable(record([draft(big, rounds=35)]))
        self.assertEqual(keep, [])
        self.assertEqual(len(skip), 1)

    def test_the_boundary_is_inclusive_at_min_picks(self):
        keep, _ = S.comparable(record([draft(FULL[:S.MIN_PICKS_FOR_REDRAFT])]))
        self.assertEqual(len(keep), 1, "exactly MIN_PICKS_FOR_REDRAFT must count as comparable")

    def test_one_below_the_boundary_is_excluded(self):
        keep, _ = S.comparable(record([draft(FULL[:S.MIN_PICKS_FOR_REDRAFT - 1])]))
        self.assertEqual(keep, [])

    def test_excluded_drafts_are_reported_not_dropped(self):
        """Silently dropping them would hide that the sample was ever filtered."""
        keep, skip = S.comparable(record([draft(FULL), draft(FULL[:3], rounds=3)]))
        self.assertEqual((len(keep), len(skip)), (1, 1))


class TestFirstRoundOf(unittest.TestCase):
    def test_finds_the_first_of_a_position(self):
        self.assertEqual(S.first_round_of(draft(FULL), "QB"), 5)
        self.assertEqual(S.first_round_of(draft(FULL), "TE"), 7)

    def test_returns_none_when_never_taken(self):
        self.assertIsNone(S.first_round_of(draft([(1, "RB"), (2, "WR")]), "QB"))

    def test_takes_the_earliest_not_the_last(self):
        d = draft([(1, "QB"), (2, "RB"), (9, "QB")])
        self.assertEqual(S.first_round_of(d, "QB"), 1)


class TestTheRefusals(unittest.TestCase):
    """A confident median over n=1 reads identically to one over n=7. That is the whole risk."""

    def _profile(self, rec):
        buf = io.StringIO()
        with redirect_stdout(buf):
            S.profile(rec)
        return buf.getvalue()

    def test_it_refuses_to_state_a_tendency_below_min_drafts(self):
        out = self._profile(record([draft(FULL)]))
        self.assertIn("below the", out)
        self.assertNotIn("median R", out,
                         "a median must NOT be printed from a sample below MIN_DRAFTS")

    def test_it_prints_the_raw_drafts_when_it_refuses(self):
        """Refusing must still hand over what it has, or the refusal costs the reader the data."""
        out = self._profile(record([draft(FULL)]))
        self.assertIn("Test League", out)

    def test_it_does_state_a_tendency_at_min_drafts(self):
        out = self._profile(record([draft(FULL) for _ in range(S.MIN_DRAFTS)]))
        self.assertIn("median R", out)
        self.assertNotIn("below the", out)

    def test_a_blank_profile_says_so_rather_than_printing_nothing(self):
        """Two real seats have zero history. Silence would read as 'passive opponent'."""
        out = self._profile(record([]))
        self.assertIn("NO COMPARABLE REDRAFTS", out)

    def test_a_record_of_only_excluded_drafts_still_reports_them(self):
        out = self._profile(record([draft(FULL[:3], dtype="linear", rounds=3)]))
        self.assertIn("NO COMPARABLE REDRAFTS", out)
        self.assertIn("Test League", out)


class TestQbOffTheBoardCount(unittest.TestCase):
    """SELF-COUNTING IS THIS PROJECT'S RECURRING DEFECT -- consensus.depth_rank and market.py
    both shipped it. The player's own QB pick must NOT count among the QBs taken before him."""

    def _profile_out(self, qb_round, qb_pick_nos):
        picks = [(r, p) for r, p in FULL if p != "QB"][:14]
        picks.append((qb_round, "QB"))
        picks.sort()
        d = draft(picks, qb_pick_nos=qb_pick_nos)
        buf = io.StringIO()
        with redirect_stdout(buf):
            S.profile(record([d, d, d]))
        return buf.getvalue()

    def test_first_qb_off_the_board_reports_as_first(self):
        """His QB is at pick_no 3*8-5 = 19. No QB went earlier -> he is the 1st."""
        out = self._profile_out(3, [19, 40, 60])
        self.assertIn("[1, 1, 1]", out)

    def test_a_qb_taken_later_counts_the_ones_before_him(self):
        out = self._profile_out(3, [5, 11, 19, 40])
        self.assertIn("[3, 3, 3]", out)

    def test_his_own_pick_is_not_counted_among_those_before_him(self):
        """The mutant: `<=` instead of `<` counts his own QB and reports him one rung late."""
        out = self._profile_out(3, [19])
        self.assertIn("[1, 1, 1]", out)
        self.assertNotIn("[2, 2, 2]", out)


class TestOurOwnSeatIsNotAnOpponent(unittest.TestCase):
    def test_briggsy_is_the_poppabriggsy_id_not_briggsy007(self):
        """🚨 briggsy007 IS HUNTER. Getting this backwards scouts ourselves and erases the rival."""
        self.assertEqual(S.BRIGGSY, "1390750540631150592")
        self.assertNotEqual(S.BRIGGSY, "959308419154886656")


if __name__ == "__main__":
    unittest.main()

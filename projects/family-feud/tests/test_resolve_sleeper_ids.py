#!/usr/bin/env python3
"""Tests for scripts/resolve_sleeper_ids.py -- freezing the join key under adjudication.

    python -m unittest discover -s tests -v        (from the project root)

No network. Every unit test builds its own synthetic dump in a tmpdir, so a test can never
depend on what Sleeper happens to be serving today. The integration class at the bottom reads
the COMMITTED pinned dump and the COMMITTED ledger, which is the pair that actually ships.

A NOTE ON WHY THE TIER-2 TESTS MATTER MORE THAN THEY LOOK. Against today's real board all 174
rows resolve on tier 1 (exact normalized name), and tier 2 -- the shared-token fallback -- is
never reached. An unexercised fallback is insight 006's shape: it reads as covered because the
suite is green, and it first runs for real on a draft-morning waiver-wire name. So tier 2 is
exercised here deliberately, with fixtures built to require it.
"""
import gzip
import io
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
import resolve_sleeper_ids as R  # noqa: E402

REAL_CACHE = os.path.join(ROOT, "draft-kit", "cache", "sleeper_players.json.gz")
REAL_LEDGER = os.path.join(ROOT, "draft-kit", "sleeper_ids.json")
REAL_BOARD = os.path.join(ROOT, "draft-kit", "players_data.json")
REAL_FEED = os.path.join(ROOT, "tests", "fixtures", "lab_feed_120.json")


def dump_player(pid, first, last, team, pos, years_exp=3, status="Active", active=True):
    return {"player_id": pid, "first_name": first, "last_name": last,
            "full_name": f"{first} {last}", "team": team, "position": pos,
            "years_exp": years_exp, "status": status, "active": active}


def dump_def(team, city, nickname):
    # DEF records carry no full_name and their player_id IS the team code.
    return {"player_id": team, "first_name": city, "last_name": nickname,
            "team": team, "position": "DEF", "active": True}


def board_row(r, name, pos, team, badges=None):
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": r, "tier": 1,
            "badges": badges or [], "note": "n", "vorp": 1.0, "vbdRank": r, "vbdDelta": 0}


class Harness(unittest.TestCase):
    """Each test gets its own board / cache / ledger inside a tmpdir."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.d = self._tmp.name
        self.addCleanup(self._tmp.cleanup)
        self.board_path = os.path.join(self.d, "players_data.json")
        self.cache_path = os.path.join(self.d, "cache", "sleeper_players.json.gz")
        self.ledger_path = os.path.join(self.d, "sleeper_ids.json")

    def write_board(self, rows):
        with open(self.board_path, "w", encoding="utf-8") as f:
            json.dump({"meta": {}, "players": rows, "dst": [], "strategy": {}}, f,
                      ensure_ascii=False)

    def write_cache(self, players, fetched_at="2026-08-07T00:00:00+00:00"):
        cache = {"source": "test", "fetched_at": fetched_at, "count": len(players),
                 "players": {p["player_id"]: p for p in players}}
        R.write_cache(cache, self.cache_path)

    def write_ledger(self, ledger):
        with open(self.ledger_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(R.ledger_bytes(ledger))

    def run_resolver(self, *extra):
        argv = ["--board", self.board_path, "--cache", self.cache_path,
                "--ledger", self.ledger_path, *extra]
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = R.main(argv)
        return rc, buf.getvalue()

    def read_ledger_bytes(self):
        with open(self.ledger_path, "rb") as f:
            return f.read()

    def ledger(self):
        with open(self.ledger_path, encoding="utf-8") as f:
            return json.load(f)


class OneCandidate(Harness):
    def test_exactly_one_candidate_resolves_with_its_evidence(self):
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR", years_exp=5)])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        entry = self.ledger()["ids"]["Ja'Marr Chase"]
        self.assertEqual(entry["sleeperId"], "7564")
        self.assertEqual(entry["evidence"]["matched"], "exact_norm")
        self.assertEqual(entry["evidence"]["team"], "CIN")
        self.assertEqual(entry["evidence"]["pos"], "WR")
        self.assertEqual(entry["dump_fetched_at"], "2026-08-07T00:00:00+00:00")

    def test_the_alias_map_is_live_in_resolution(self):
        # Board says "Kenny", Sleeper says "Kenneth". norm() aliases the first token, so this
        # is still tier 1 -- an exact match on the NORMALISED name, not a fuzzy one.
        self.write_board([board_row(1, "Kenny Gainwell", "RB", "PIT")])
        self.write_cache([dump_player("7045", "Kenneth", "Gainwell", "PIT", "RB")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        e = self.ledger()["ids"]["Kenny Gainwell"]
        self.assertEqual(e["sleeperId"], "7045")
        self.assertEqual(e["evidence"]["matched"], "exact_norm")


class TierTwoNeverAutoAccepts(Harness):
    """The shared-token tier PROPOSES; it never freezes.

    An adversarial review found the hole this class now pins. A lone shared-token candidate
    reads like a clean resolve -- len(cands) == 1, every downstream check passes -- but on this
    board it is routinely a SAME-POSITION TEAMMATE. Six rows have one: Bijan/Brian Robinson,
    Josh/Kyle Allen, Burrow/Flacco, Marvin Harrison/Harrison Wallace, Stafford/Matthew Caldwell,
    Worthy/Loyd. One trade plus one re-rendered name empties tier 1 and leaves tier 2 returning
    exactly ONE candidate: the teammate. Auto-accepting freezes the wrong man permanently.

    The engine may use (team,pos)+token to raise a WARNING a human reads. A permanent freeze is
    a different act and needs a human either way.
    """

    def test_a_lone_shared_token_candidate_is_proposed_not_frozen(self):
        # Sleeper drops the compound surname; no exact normalized match exists.
        self.write_board([board_row(1, "Jaxon Smith-Njigba", "WR", "SEA")])
        self.write_cache([dump_player("9999", "Jaxon", "Njigba", "SEA", "WR")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("matched ONLY by shared token", out)
        self.assertIn("['jaxon']", out)
        self.assertIn("id=9999", out, "the operator cannot approve what is not shown")
        self.assertFalse(os.path.exists(self.ledger_path))

    def test_the_teammate_trap_that_forced_this_rule(self):
        """The reviewer's reproduction, in miniature: the real man has moved teams and the
        board re-rendered his name, so the only shared-token candidate is his ex-teammate."""
        self.write_board([board_row(1, "Marvin Harrison", "WR", "ARI")])
        self.write_cache([dump_player("11628", "Marvin", "Harrison", "CLE", "WR"),
                          dump_player("13670", "Harrison", "Wallace", "ARI", "WR", years_exp=0)])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1, "a teammate was frozen as the board row")
        self.assertIn("13670", out)
        self.assertIn("teammate", out)
        self.assertFalse(os.path.exists(self.ledger_path))

    def test_an_operator_approved_shared_token_id_is_honoured_afterwards(self):
        """Approval is pasting the id into the ledger by hand. A later run must accept it
        silently -- otherwise the adjudication has to be repeated forever."""
        self.write_board([board_row(1, "Jaxon Smith-Njigba", "WR", "SEA")])
        self.write_cache([dump_player("9999", "Jaxon", "Njigba", "SEA", "WR")])
        self.write_ledger({"ids": {"Jaxon Smith-Njigba": {
            "sleeperId": "9999", "resolved_on": "2026-08-07",
            "dump_fetched_at": "2026-08-07T00:00:00+00:00",
            "evidence": {"team": "SEA", "pos": "WR", "matched": "manual",
                         "matched_token": ["jaxon"], "dump_name": "Jaxon Njigba"}}},
            "unresolved": []})
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        self.assertEqual(self.ledger()["ids"]["Jaxon Smith-Njigba"]["sleeperId"], "9999")

    def test_an_approved_id_that_stops_matching_still_hard_stops(self):
        """Approval freezes ONE id, it does not bless the row forever.

        The assertions here are deliberately specific. `assertIn("7777")` alone passed for the
        WRONG REASON -- the new id is echoed by the shared-token proposal AND by the FROZEN
        guard, so it could not tell which one fired, and the one that fired was the wrong one.
        """
        self.write_board([board_row(1, "Jaxon Smith-Njigba", "WR", "SEA")])
        self.write_cache([dump_player("7777", "Jaxon", "Njigba", "SEA", "WR")])
        self.write_ledger({"ids": {"Jaxon Smith-Njigba": {
            "sleeperId": "9999", "resolved_on": "2026-08-07",
            "dump_fetched_at": "2026-08-07T00:00:00+00:00",
            "evidence": {"team": "SEA", "pos": "WR", "matched": "manual",
                         "matched_token": ["jaxon"], "dump_name": "Jaxon Njigba"}}},
            "unresolved": []})
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("7777", out)
        self.assertIn("FROZEN at 9999", out, "the guard that fired was not the FROZEN guard")
        self.assertIn("do not overwrite", out)

    def test_the_proposal_never_preempts_the_frozen_guard(self):
        """A frozen row that falls to tier 2 must warn FROZEN, never invite an overwrite.

        Shipped broken in c9bacf7f and caught by the sweep that followed. The new shared-token
        proposal sat ABOVE the FROZEN guard, so for a row that already had a frozen id the
        proposal fired first and `continue`d -- the FROZEN guard was unreachable on that path.
        The operator was shown a teammate's id, told to "paste the id into the ledger by hand",
        and never told that a frozen id existed at all. Following the tool's own remediation
        overwrote the right man with his teammate: the precise failure the unit exists to
        prevent, re-entered through the remediation text a fix had just cleaned up elsewhere.

        This is the seed bug wearing the fix's clothes, which is why the assertions below pin
        the MESSAGE and not just the exit code.
        """
        self.write_board([board_row(1, "Marvin Harrison", "WR", "ARI")])
        # The real man was traded and his name re-rendered, so ARI/WR holds only his ex-teammate.
        self.write_cache([dump_player("11628", "Marvin", "Harrison Jr.", "CLE", "WR"),
                          dump_player("13670", "Harrison", "Wallace", "ARI", "WR", years_exp=0)])
        self.write_ledger({"ids": {"Marvin Harrison": {
            "sleeperId": "11628", "resolved_on": "2026-06-01",
            "dump_fetched_at": "2026-06-01T00:00:00+00:00",
            "evidence": {"team": "ARI", "pos": "WR", "matched": "exact_norm",
                         "matched_token": None, "dump_name": "Marvin Harrison"}}},
            "unresolved": []})
        before = self.read_ledger_bytes()
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("FROZEN at 11628", out,
                      "the operator was never shown the id he already had frozen")
        self.assertIn("do not overwrite", out)
        self.assertNotIn("paste the id into the ledger by hand", out,
                         "the tool invited an overwrite of a frozen id")
        # The weak-evidence note must SURVIVE -- it is why this overwrite is extra dangerous.
        self.assertIn("shared token", out)
        self.assertIn("13670", out, "the operator cannot adjudicate what he is not shown")
        self.assertEqual(self.read_ledger_bytes(), before, "the ledger was rewritten")

    def test_tier_one_wins_when_both_tiers_would_match(self):
        """The whole reason tier 1 exists: a teammate at the same position sharing one token.
        Tier 2 alone hard-stops this row; tier 1 resolves it without choosing between men."""
        self.write_board([board_row(1, "Bijan Robinson", "RB", "ATL")])
        self.write_cache([dump_player("9509", "Bijan", "Robinson", "ATL", "RB", years_exp=3),
                          dump_player("8154", "Brian", "Robinson", "ATL", "RB", years_exp=4)])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        self.assertEqual(self.ledger()["ids"]["Bijan Robinson"]["sleeperId"], "9509")

    def test_tier_two_hard_stops_that_same_row_when_tier_one_cannot_apply(self):
        """Positive control for the claim above: strip the exact match and it must refuse,
        rather than fall back to the teammate."""
        self.write_board([board_row(1, "Bijan Robinson", "RB", "ATL")])
        self.write_cache([dump_player("8154", "Brian", "Robinson", "ATL", "RB", years_exp=4),
                          dump_player("8155", "Cam", "Robinson", "ATL", "RB", years_exp=2)])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("2 candidates", out)
        self.assertFalse(os.path.exists(self.ledger_path))


class ZeroCandidates(Harness):
    def test_zero_candidates_names_the_row_and_the_searched_key(self):
        self.write_board([board_row(1, "Ghost Player", "RB", "DET")])
        self.write_cache([dump_player("1", "Real", "Person", "DET", "WR")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("ZERO candidates", out)
        self.assertIn("Ghost Player", out)
        self.assertIn("'DET'", out)          # the team it searched
        self.assertIn("'RB'", out)           # the position it searched
        self.assertIn("ghost", out)          # the tokens it searched

    def test_nothing_is_written_when_any_row_fails(self):
        """A resolver that writes the rows it liked leaves a half-populated ledger that reads
        exactly like a finished one."""
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN"),
                          board_row(2, "Ghost Player", "RB", "DET")])
        # DET must exist in the dump or the TEAM-CODE precondition fires instead, and this test
        # would pass while proving something else entirely.
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR"),
                          dump_player("1", "Some", "Lion", "DET", "RB")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("ZERO candidates", out)
        self.assertIn("NOTHING WAS WRITTEN", out)
        self.assertFalse(os.path.exists(self.ledger_path))


class MultipleCandidates(Harness):
    def test_multiple_candidates_never_auto_select_and_print_every_one(self):
        # Both share the token "mike" with the board row and neither matches it exactly, so
        # tier 1 is empty and tier 2 returns two men. Note tokens() does NOT apply the alias
        # map, so "Michael Willis" would share NOTHING with "Mike Williams" -- the fixture has
        # to share a token as literally spelled.
        self.write_board([board_row(1, "Mike Williams", "WR", "NYJ")])
        self.write_cache([dump_player("100", "Mike", "Willis", "NYJ", "WR", years_exp=9,
                                      status="Active"),
                          dump_player("200", "Mike", "Williamson", "NYJ", "WR", years_exp=0,
                                      status="Inactive")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("2 candidates", out)
        self.assertIn("NEVER auto-selected", out)
        for needle in ("id=100", "id=200", "years_exp=9", "years_exp=0",
                       "status=Active", "status=Inactive"):
            self.assertIn(needle, out, f"the operator cannot adjudicate without {needle}")
        self.assertFalse(os.path.exists(self.ledger_path))

    def test_a_preference_rule_was_not_smuggled_in(self):
        """004 retired the CLASS, not one instance. If someone ever adds 'prefer active' or
        'prefer higher years_exp', this goes red: both candidates differ on both fields and
        the correct behaviour is still to refuse."""
        self.write_board([board_row(1, "Mike Williams", "WR", "NYJ")])
        self.write_cache([dump_player("100", "Mike", "Willis", "NYJ", "WR", years_exp=9,
                                      status="Active", active=True),
                          dump_player("200", "Mike", "Williamson", "NYJ", "WR", years_exp=0,
                                      status="Inactive", active=False)])
        rc, _ = self.run_resolver()
        self.assertEqual(rc, 1, "the resolver picked a winner instead of refusing")


class PostResolutionAssertions(Harness):
    def test_a_badged_rookie_resolving_to_a_veteran_is_refused(self):
        self.write_board([board_row(1, "Cam Ward", "QB", "TEN", badges=["R"])])
        self.write_cache([dump_player("500", "Cameron", "Ward", "TEN", "QB", years_exp=7)])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("badged R", out)
        self.assertIn("years_exp=7", out)

    def test_a_badged_rookie_resolving_to_a_rookie_is_fine(self):
        """Positive control -- a check that refuses everything passes every rejection test."""
        self.write_board([board_row(1, "Cam Ward", "QB", "TEN", badges=["R"])])
        self.write_cache([dump_player("500", "Cameron", "Ward", "TEN", "QB", years_exp=0)])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)

    def test_a_def_row_resolving_to_a_non_team_code_is_refused(self):
        self.write_board([board_row(1, "Houston Texans", "DEF", "HOU")])
        bad = dump_def("HOU", "Houston", "Texans")
        bad["player_id"] = "12345"          # not the team code
        self.write_cache([bad])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("convention U14 relies on is broken", out)

    def test_a_def_row_whose_team_code_is_its_id_resolves(self):
        self.write_board([board_row(1, "Houston Texans", "DEF", "HOU")])
        self.write_cache([dump_def("HOU", "Houston", "Texans")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        self.assertEqual(self.ledger()["ids"]["Houston Texans"]["sleeperId"], "HOU")

    def test_two_board_rows_claiming_one_id_is_refused(self):
        """'One pick removes two board rows' arriving by a new road."""
        self.write_board([board_row(1, "Josh Allen", "QB", "BUF"),
                          board_row(2, "Joshua Allen", "QB", "BUF")])
        self.write_cache([dump_player("4984", "Josh", "Allen", "BUF", "QB")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("is claimed by 2 board rows", out)


class TeamCodePrecondition(Harness):
    """Regression for the live defect U14 surfaced: the board said JAC for eight Jacksonville
    rows while Sleeper's dump AND its live picks both say JAX. Every (team,pos) lookup for those
    rows returned nothing -- which also silently disabled the engine's unmatched-pick escalation
    for one team, the exact failure U2 shipped to prevent."""

    def test_a_board_team_code_sleeper_does_not_use_is_named_explicitly(self):
        self.write_board([board_row(1, "Trevor Lawrence", "QB", "JAC")])
        self.write_cache([dump_player("7523", "Trevor", "Lawrence", "JAX", "QB")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("JAC", out)
        self.assertIn("Sleeper does not", out)
        self.assertIn("escalation", out, "the message must say what else this breaks")

    def test_the_matching_code_resolves(self):
        self.write_board([board_row(1, "Trevor Lawrence", "QB", "JAX")])
        self.write_cache([dump_player("7523", "Trevor", "Lawrence", "JAX", "QB")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)


class AppendOnly(Harness):
    def setUp(self):
        super().setUp()
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")])

    def test_rerunning_changes_no_bytes(self):
        self.assertEqual(self.run_resolver()[0], 0)
        first = self.read_ledger_bytes()
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        self.assertIn("no-op", out)
        self.assertEqual(self.read_ledger_bytes(), first)

    def test_a_frozen_id_that_would_now_resolve_differently_is_a_hard_stop(self):
        self.assertEqual(self.run_resolver()[0], 0)
        # Sleeper re-keys the player. The ledger must refuse, naming BOTH ids.
        self.write_cache([dump_player("8888", "Ja'Marr", "Chase", "CIN", "WR")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("FROZEN at 7564", out)
        self.assertIn("8888", out)
        self.assertIn("do not overwrite", out)
        self.assertEqual(self.ledger()["ids"]["Ja'Marr Chase"]["sleeperId"], "7564")

    def test_resolved_on_is_not_rewritten_on_a_later_run(self):
        self.assertEqual(self.run_resolver()[0], 0)
        led = self.ledger()
        led["ids"]["Ja'Marr Chase"]["resolved_on"] = "2020-01-01"
        self.write_ledger(led)
        self.assertEqual(self.run_resolver()[0], 0)
        self.assertEqual(self.ledger()["ids"]["Ja'Marr Chase"]["resolved_on"], "2020-01-01",
                         "an append-only ledger rewrote a historical field")

    def test_an_unresolved_row_is_a_recorded_decision_not_a_silent_gap(self):
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN"),
                          board_row(2, "Retired Guy", "RB", "DET")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR"),
                          dump_player("1", "Some", "Lion", "DET", "RB")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1, "an unrecorded gap must fail")
        self.write_ledger({"ids": {}, "unresolved": [
            {"name": "Retired Guy", "reason": "retired 2026-08-01", "approved_on": "2026-08-07"}]})
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        self.assertEqual(len(self.ledger()["unresolved"]), 1)


class NothingMayVanish(Harness):
    """`entries` is rebuilt from the board each run and then REPLACES `ids` wholesale, so any
    row that leaves the board by name takes its frozen id with it -- silently. A rename is the
    dangerous half: the new name has no prior, so it re-resolves from scratch and can freeze a
    different man while the printed count stays identical.

    Found by adversarial review; the module docstring claimed append-only and the code was not.
    """

    def setUp(self):
        super().setUp()
        self.write_board([board_row(1, "Bijan Robinson", "RB", "ATL")])
        self.write_cache([dump_player("9509", "Bijan", "Robinson", "ATL", "RB"),
                          dump_player("8154", "Brian", "Robinson", "ATL", "RB", years_exp=4)])
        self.assertEqual(self.run_resolver()[0], 0)

    def test_a_renamed_board_row_is_a_hard_stop_not_a_silent_reresolve(self):
        self.write_board([board_row(1, "Brian Robinson", "RB", "ATL")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1, "a rename silently re-froze a different player")
        self.assertIn("Bijan Robinson", out)
        self.assertIn("board row is gone", out)
        self.assertEqual(self.ledger()["ids"]["Bijan Robinson"]["sleeperId"], "9509")

    def test_a_deleted_board_row_is_a_hard_stop_not_a_silent_drop(self):
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("9509", "Bijan", "Robinson", "ATL", "RB"),
                          dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("Bijan Robinson", out)

    def test_parking_a_row_that_already_has_a_frozen_id_is_refused(self):
        """The script's own remediation used to advise exactly this, and following it DELETED
        the id the unit exists to protect."""
        led = self.ledger()
        led["unresolved"] = [{"name": "Bijan Robinson", "reason": "x", "approved_on": "2026-08-07"}]
        self.write_ledger(led)
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("already has a frozen id", out)
        self.assertIn("9509", out)
        self.assertEqual(self.ledger()["ids"]["Bijan Robinson"]["sleeperId"], "9509")

    def test_the_remediation_text_no_longer_advises_the_destructive_fix(self):
        self.write_board([board_row(1, "Bijan Robinson", "RB", "ATL"),
                          board_row(2, "Ghost Man", "TE", "ATL")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("has no frozen id yet", out,
                      "the remediation must qualify when 'unresolved' is safe")


class LedgerHygiene(Harness):
    def test_duplicate_board_names_are_refused(self):
        """The ledger is name-keyed, so two rows sharing a name collapse to one entry -- and
        the duplicate-id sweep would never see the collision, because there is only one entry."""
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN"),
                          board_row(2, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("duplicate name", out)
        self.assertFalse(os.path.exists(self.ledger_path))

    def test_an_unresolved_entry_that_is_not_a_board_row_is_refused(self):
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")])
        self.write_ledger({"ids": {}, "unresolved": [
            {"name": "Nobody At All", "reason": "x", "approved_on": "2026-08-07"}]})
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("is not a board row", out)

    def test_an_unresolved_entry_without_a_reason_or_date_is_refused(self):
        self.write_board([board_row(1, "Ghost Man", "TE", "ATL")])
        self.write_cache([dump_player("1", "Some", "Falcon", "ATL", "TE")])
        self.write_ledger({"ids": {}, "unresolved": [{"name": "Ghost Man"}]})
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("'reason'", out)
        self.assertIn("'approved_on'", out)

    def test_a_dump_keyed_inconsistently_with_player_id_is_refused(self):
        """Everything downstream looks a pick's player_id up as a key. If the dump's key is not
        the id, every by-key assertion in this file is meaningless."""
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        p = dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")
        cache = {"source": "t", "fetched_at": "2026-08-07T00:00:00+00:00", "count": 1,
                 "players": {"WRONG_KEY": p}}
        R.write_cache(cache, self.cache_path)
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("keyed inconsistently", out)


class FrozenIdReassertedByKey(Harness):
    """The post-resolution check that CAN fail.

    The original version compared the chosen candidate's team/pos back against the board row --
    but candidates are drawn out of the (team,pos) bucket, so it agreed by construction and the
    branch could never execute. Deleting it left the whole suite green. Insight 006 exactly.
    Looking the FROZEN id up BY KEY asks a different question with a different answer.
    """

    def setUp(self):
        super().setUp()
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")])
        self.assertEqual(self.run_resolver()[0], 0)

    def test_a_frozen_id_that_left_the_dump_is_a_hard_stop(self):
        # Sleeper drops or re-keys him; a same-named record keeps the row resolving.
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")])
        led = self.ledger()
        led["ids"]["Ja'Marr Chase"]["sleeperId"] = "NOT_IN_DUMP"
        self.write_ledger(led)
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("NOT_IN_DUMP", out)

    def test_a_frozen_id_whose_dump_record_moved_teams_is_a_hard_stop(self):
        """The board still says CIN and still resolves to SOMEBODY there, but the frozen id now
        points at a player on another team -- a different man, or a stale board."""
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CLE", "WR"),
                          dump_player("8888", "Ja'Marr", "Chase", "CIN", "WR")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("7564", out)

    def test_the_clean_case_still_passes(self):
        """Positive control -- a by-key check that rejects everything passes both tests above."""
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)


class Verify(Harness):
    """--verify's own code had ZERO coverage before an adversarial review pointed it out.

    Its only test planted a wrong sleeperId, which makes resolve() emit a FROZEN problem, so
    main() returned at `if problems:` -- 26 lines BEFORE `if args.verify:` was ever read. The
    comparison, the unresolved check and the success print were all unreached, and the companion
    "--verify wrote nothing" assertion was equally empty because the non-verify path would not
    have written either. These tests reach the block.
    """

    def setUp(self):
        super().setUp()
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR"),
                          dump_player("9509", "Bijan", "Robinson", "ATL", "RB")])
        self.assertEqual(self.run_resolver()[0], 0)

    def test_verify_passes_and_writes_nothing_on_a_consistent_pair(self):
        before = self.read_ledger_bytes()
        rc, out = self.run_resolver("--verify")
        self.assertEqual(rc, 0, out)
        self.assertIn("ledger verified", out)
        self.assertEqual(self.read_ledger_bytes(), before)

    def test_verify_fails_when_a_board_row_has_no_entry_in_the_ledger(self):
        """The state --verify actually exists to catch: the board moved on and the shipped
        ledger did not. A moved id is caught earlier, by the FROZEN guard, in both modes."""
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN"),
                          board_row(2, "Bijan Robinson", "RB", "ATL")])
        before = self.read_ledger_bytes()
        rc, out = self.run_resolver("--verify")
        self.assertEqual(rc, 1)
        self.assertIn("Bijan Robinson", out)
        self.assertEqual(self.read_ledger_bytes(), before, "--verify wrote")

    def test_a_parked_row_that_now_resolves_is_reported_in_both_modes(self):
        """A row in 'unresolved' carries NO frozen id, so it is still joining on a name that
        drifts. Left alone it would end up in `ids` AND `unresolved` at once. The check lives in
        resolve(), not in the --verify branch, so a plain run catches it too."""
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN"),
                          board_row(2, "Bijan Robinson", "RB", "ATL")])
        self.write_ledger({"ids": {"Ja'Marr Chase": self.ledger()["ids"]["Ja'Marr Chase"]},
                           "unresolved": [{"name": "Bijan Robinson", "reason": "was hurt",
                                           "approved_on": "2026-08-01"}]})
        before = self.read_ledger_bytes()
        for mode in ([], ["--verify"]):
            with self.subTest(mode=mode or "write"):
                rc, out = self.run_resolver(*mode)
                self.assertEqual(rc, 1)
                self.assertIn("now resolves cleanly", out)
                self.assertIn("9509", out)
                self.assertEqual(self.read_ledger_bytes(), before, "the ledger was rewritten")

    def test_verify_survives_a_refetch_that_only_moves_the_timestamp(self):
        """Provenance drift is not a failure -- treating it as one trains the operator to
        ignore the check that screams when a join key really moves."""
        cache = R.read_cache(self.cache_path)
        cache["fetched_at"] = "2099-01-01T00:00:00+00:00"
        R.write_cache(cache, self.cache_path)
        rc, out = self.run_resolver("--verify")
        self.assertEqual(rc, 0, out)
        self.assertIn("provenance only", out)


class CacheIntegrity(Harness):
    def test_a_missing_cache_says_how_to_get_one(self):
        self.write_board([board_row(1, "x", "RB", "DET")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("--fetch", out)

    def test_a_cache_whose_count_disagrees_with_its_records_is_refused(self):
        self.write_board([board_row(1, "x", "RB", "DET")])
        os.makedirs(os.path.dirname(self.cache_path), exist_ok=True)
        blob = json.dumps({"fetched_at": "x", "count": 99,
                           "players": {"1": dump_player("1", "a", "b", "DET", "RB")}})
        with gzip.GzipFile(self.cache_path, "wb", mtime=0) as f:
            f.write(blob.encode("utf-8"))
        rc, out = self.run_resolver()
        self.assertEqual(rc, 1)
        self.assertIn("count", out)

    def test_the_same_dump_gzips_to_identical_bytes(self):
        """mtime=0 in the gzip header -- otherwise a re-fetch of unchanged data is a diff."""
        players = [dump_player("1", "a", "b", "DET", "RB")]
        cache = {"source": "t", "fetched_at": "2026-01-01T00:00:00+00:00",
                 "count": 1, "players": {p["player_id"]: p for p in players}}
        a = os.path.join(self.d, "a.gz")
        b = os.path.join(self.d, "b.gz")
        R.write_cache(cache, a)
        R.write_cache(cache, b)
        self.assertEqual(pathlib.Path(a).read_bytes(), pathlib.Path(b).read_bytes())


class TheShippedArtifacts(unittest.TestCase):
    """Integration against the committed pinned dump and the committed ledger -- the pair that
    actually ships. These are the assertions that go red if someone edits the board without
    re-resolving."""

    @classmethod
    def setUpClass(cls):
        with open(REAL_BOARD, encoding="utf-8") as f:
            cls.board = json.load(f)["players"]
        with open(REAL_LEDGER, encoding="utf-8") as f:
            cls.ledger = json.load(f)
        cls.cache = R.read_cache(REAL_CACHE)

    def test_every_board_row_carries_an_id_or_a_recorded_approval(self):
        ids, unresolved = self.ledger["ids"], {u["name"] for u in self.ledger["unresolved"]}
        missing = [r["name"] for r in self.board
                   if r["name"] not in ids and r["name"] not in unresolved]
        self.assertEqual(missing, [], f"{len(missing)} board rows have no id and no approval")
        self.assertEqual(len(self.board), 176)

    def test_the_ids_are_a_bijection(self):
        vals = [e["sleeperId"] for e in self.ledger["ids"].values()]
        self.assertEqual(len(vals), len(set(vals)), "two board rows share one Sleeper id")

    def test_the_ledger_holds_no_row_that_left_the_board(self):
        names = {r["name"] for r in self.board}
        orphans = sorted(set(self.ledger["ids"]) - names)
        self.assertEqual(orphans, [], "the ledger carries rows the board no longer has")

    def test_every_id_still_points_at_the_right_man_in_the_pinned_dump(self):
        players = self.cache["players"]
        rows = {r["name"]: r for r in self.board}
        bad = []
        for name, entry in self.ledger["ids"].items():
            p = players.get(entry["sleeperId"])
            row = rows[name]
            if p is None:
                bad.append(f"{name}: id {entry['sleeperId']} is not in the dump")
            elif p.get("position") != row["pos"] or p.get("team") != row["team"]:
                bad.append(f"{name}: dump says {p.get('position')}/{p.get('team')}, "
                           f"board says {row['pos']}/{row['team']}")
        self.assertEqual(bad, [], "\n".join(bad))

    def test_all_fourteen_def_rows_are_defs_in_the_dump_and_keyed_by_team(self):
        defs = [r for r in self.board if r["pos"] == "DEF"]
        self.assertEqual(len(defs), 14)
        for r in defs:
            p = self.cache["players"].get(r["team"])
            self.assertIsNotNone(p, f"{r['team']} is not a key in the dump")
            self.assertEqual(p.get("position"), "DEF", f"{r['team']} is not a DEF in the dump")
            self.assertEqual(self.ledger["ids"][r["name"]]["sleeperId"], r["team"])

    def test_every_board_team_code_is_one_sleeper_uses(self):
        known = {p.get("team") for p in self.cache["players"].values() if p.get("team")}
        stray = sorted({r["team"] for r in self.board} - known)
        self.assertEqual(stray, [], "a board team code Sleeper does not use -- see JAC/JAX")

    def test_the_lab_feed_attributes_by_id_with_zero_name_fallbacks(self):
        """U14's headline verification. 2 of the 120 picks are genuinely off our board (two
        kickers). It was 4 until 2026-09-06, when Robinson and Wilson joined the board."""
        with open(REAL_FEED, encoding="utf-8") as f:
            feed = json.load(f)
        by_id = {e["sleeperId"] for e in self.ledger["ids"].values()}
        on_board = [p for p in feed if p["player_id"] in by_id]
        self.assertEqual(len(on_board), 118)
        self.assertEqual(len(feed) - len(on_board), 2)

    def test_the_committed_ledger_matches_what_the_committed_dump_resolves(self):
        entries, problems = R.resolve(self.board, self.cache, self.ledger)
        self.assertEqual(problems, [], "\n".join(problems))
        self.assertEqual({k: v["sleeperId"] for k, v in entries.items()},
                         {k: v["sleeperId"] for k, v in self.ledger["ids"].items()})


if __name__ == "__main__":
    unittest.main()

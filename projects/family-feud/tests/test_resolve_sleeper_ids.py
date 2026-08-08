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


class TierTwoFallback(Harness):
    """The shared-token tier. Unreachable on today's board, so it is exercised on purpose."""

    def test_a_re_rendered_surname_still_resolves_via_shared_token(self):
        # Sleeper drops the compound surname; no exact normalized match exists.
        self.write_board([board_row(1, "Jaxon Smith-Njigba", "WR", "SEA")])
        self.write_cache([dump_player("9999", "Jaxon", "Njigba", "SEA", "WR")])
        rc, out = self.run_resolver()
        self.assertEqual(rc, 0, out)
        e = self.ledger()["ids"]["Jaxon Smith-Njigba"]
        self.assertEqual(e["sleeperId"], "9999")
        self.assertEqual(e["evidence"]["matched"], "shared_token")
        self.assertEqual(e["evidence"]["matched_token"], ["jaxon"])

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


class Verify(Harness):
    def test_verify_writes_nothing_and_fails_on_a_stale_ledger(self):
        self.write_board([board_row(1, "Ja'Marr Chase", "WR", "CIN")])
        self.write_cache([dump_player("7564", "Ja'Marr", "Chase", "CIN", "WR")])
        self.assertEqual(self.run_resolver()[0], 0)
        led = self.ledger()
        led["ids"]["Ja'Marr Chase"]["sleeperId"] = "0000"
        self.write_ledger(led)
        before = self.read_ledger_bytes()
        rc, out = self.run_resolver("--verify")
        self.assertEqual(rc, 1)
        self.assertEqual(self.read_ledger_bytes(), before, "--verify wrote")


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
        self.assertEqual(len(self.board), 174)

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
        """U14's headline verification. 4 of the 120 picks are genuinely off our board."""
        with open(REAL_FEED, encoding="utf-8") as f:
            feed = json.load(f)
        by_id = {e["sleeperId"] for e in self.ledger["ids"].values()}
        on_board = [p for p in feed if p["player_id"] in by_id]
        self.assertEqual(len(on_board), 116)
        self.assertEqual(len(feed) - len(on_board), 4)

    def test_the_committed_ledger_matches_what_the_committed_dump_resolves(self):
        entries, problems = R.resolve(self.board, self.cache, self.ledger)
        self.assertEqual(problems, [], "\n".join(problems))
        self.assertEqual({k: v["sleeperId"] for k, v in entries.items()},
                         {k: v["sleeperId"] for k, v in self.ledger["ids"].items()})


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""The season snapshot's hauler. No test here touches the network: every fetch is replaced."""
import datetime
import json
import os
import shutil
import sys
import tempfile
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import season_cargo as C  # noqa: E402

UTC = datetime.timezone.utc
LEAGUE = {"scoring_settings": {"rush_yd": 0.1, "rec": 1.0},
          "settings": {"playoff_week_start": 15, "playoff_teams": 6, "playoff_round_type": 0},
          "roster_positions": ["QB", "BN"]}
ROSTERS = [{"roster_id": 3, "owner_id": "1390750540631150592", "players": ["11", "JAX"], "reserve": ["12"],
            "taxi": None, "starters": ["11"]},
           {"roster_id": 1, "owner_id": "x", "players": ["21"], "reserve": None, "taxi": ["22"], "starters": ["21"]}]
PLAYERS = {
    "11": {"full_name": "Our Back", "position": "RB", "team": "NE", "injury_status": "Questionable",
           "injury_body_part": "Knee", "injury_notes": "Sprain", "practice_description": "Limited"},
    "12": {"full_name": "Our Hurt", "position": "WR", "team": "TEN", "injury_status": "Out"},
    "21": {"full_name": "Their Man", "position": "WR", "team": "CHI"},
    "22": {"full_name": "Their Stash", "position": "TE", "team": "CHI"},
    "31": {"full_name": "Free Agent", "position": "RB", "team": "WAS"},
    "32": {"full_name": "Nobody", "position": "RB", "team": "WAS"},
    "41": {"full_name": "A Linebacker", "position": "LB", "team": "NE"},
    "JAX": {"position": "DEF", "team": "JAX"}, "NE": {"position": "DEF", "team": "NE"},
    "CHI": {"position": "DEF", "team": "CHI"}, "WAS": {"position": "DEF", "team": "WAS"},
}


def row(name, pos, team, opp, s=None, c=None, e=None, inj=None):
    return {"name": name, "pos": pos, "team": team, "opp": opp, "inj": inj, "sleeper": s, "cbs": c, "espn": e,
            "consensus": None, "n": 0, "spread": 0.0, "approx": False}


def joined():
    return {"11": row("Our Back", "RB", "NE", "DET", 12.0, 13.0, 14.0, "Questionable"),
            "21": row("Their Man", "WR", "CHI", None, 0, None, 0.0),
            "31": row("Free Agent", "RB", "WAS", "NYG", 9.0, 10.0, 8.0),
            "32": row("Nobody", "RB", "WAS", "NYG", 0, None, 0.0),
            "JAX": row("Jacksonville Jaguars", "DEF", "JAX", "TEN", 8.0, 9.0, 7.0),
            "NE": row("New England Patriots", "DEF", "NE", "DET", 6.0, 7.0, 5.0),
            "WAS": row("Washington Commanders", "DEF", "WAS", "NYG", 5.0, 6.0, 4.0),
            "CHI": row("Chicago Bears", "DEF", "CHI", None, 0, None, 0.0)}


TEAMS = {"JAX", "NE", "CHI", "WAS"}


class TestThePieces(unittest.TestCase):
    def test_owned_is_every_roster_active_ir_and_taxi(self):
        self.assertEqual(C.owned_ids(ROSTERS), {"11", "JAX", "12", "21", "22"})

    def test_trim_keeps_the_rostered_and_the_priced_and_drops_the_rest(self):
        out = C.trim(joined(), PLAYERS, C.owned_ids(ROSTERS))
        self.assertIn("31", out)                 # a free agent some site prices
        self.assertNotIn("32", out)              # a free agent nobody prices
        self.assertIn("21", out)                 # rostered, on bye, priced by nobody: still needed
        self.assertIn("CHI", out)                # every defense stays: no opponent IS the bye rule

    def test_trim_adds_the_injury_detail_the_joined_rows_do_not_carry(self):
        out = C.trim(joined(), PLAYERS, C.owned_ids(ROSTERS))
        self.assertEqual((out["11"]["body"], out["11"]["notes"], out["11"]["practice"]),
                         ("Knee", "Sprain", "Limited"))
        self.assertNotIn("consensus", out["11"])

    def test_a_rostered_player_with_no_row_at_all_still_gets_his_name_and_tag(self):
        out = C.trim(joined(), PLAYERS, C.owned_ids(ROSTERS))
        self.assertEqual((out["12"]["name"], out["12"]["inj"], out["12"]["sleeper"]), ("Our Hurt", "Out", None))
        self.assertEqual(out["22"]["pos"], "TE")

    def test_a_bye_is_a_team_with_no_defense_that_has_an_opponent(self):
        with mock.patch.object(C, "MIN_DEFS", 3):
            self.assertEqual(C.bye_set(joined(), TEAMS), {"CHI"})

    def test_a_bye_team_whose_defense_has_no_row_at_all_is_still_a_bye(self):
        """The usual case: the sources leave a bye team's defense out. Week 10, 2026 had four byes
        and one DEF row without an opponent; week 9 had two byes and none."""
        rows = joined()
        del rows["CHI"]
        with mock.patch.object(C, "MIN_DEFS", 3):
            self.assertEqual(C.bye_set(rows, TEAMS), {"CHI"})

    def test_too_few_defenses_is_an_unknown_not_a_league_full_of_byes(self):
        self.assertIsNone(C.bye_set(joined(), TEAMS))        # 3 defenses with an opponent, 20 needed

    def test_cbs_pricing_a_bye_player_means_cbs_served_the_wrong_week(self):
        rows = joined()
        self.assertFalse(C.cbs_wrong_week(rows, {"CHI"}))
        rows["21"]["cbs"] = 17.98                # Collins's week-6 line under a week-8 header, 2026-10-18
        self.assertTrue(C.cbs_wrong_week(rows, {"CHI"}))
        self.assertFalse(C.cbs_wrong_week(rows, None))       # byes unknown: no verdict, never a guess
        C.drop_cbs(rows)
        self.assertTrue(all(r["cbs"] is None for r in rows.values()))
        self.assertFalse(C.cbs_wrong_week(rows, {"CHI"}))

    def test_a_bye_defense_pricing_itself_is_not_the_wrong_week_signal(self):
        rows = joined()
        rows["CHI"]["cbs"] = 5.0
        self.assertFalse(C.cbs_wrong_week(rows, {"CHI"}))

    def test_sleeper_rows_score_by_our_rules_and_leave_the_other_sites_empty(self):
        proj = {"11": {"stats": {"rush_yd": 100, "rec": 2}, "opponent": "DET"},
                "41": {"stats": {"rush_yd": 5}, "opponent": "DET"},
                "NE": {"stats": {}, "opponent": "DET"}}
        rows = C.sleeper_rows(PLAYERS, proj, LEAGUE["scoring_settings"])
        self.assertEqual(rows["11"]["sleeper"], 12.0)
        self.assertEqual((rows["11"]["cbs"], rows["11"]["espn"], rows["11"]["opp"]), (None, None, "DET"))
        self.assertNotIn("41", rows)

    def test_write_swaps_a_whole_file_in_and_leaves_no_partial(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        path = os.path.join(tmp, "inbox", "season_cargo.json")
        C.write({"a": 1}, path)
        C.write({"a": 2}, path)
        with open(path, encoding="utf-8") as f:
            self.assertEqual(json.load(f), {"a": 2})
        self.assertEqual(os.listdir(os.path.dirname(path)), ["season_cargo.json"])

    def test_a_write_that_dies_keeps_the_last_good_snapshot(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        path = os.path.join(tmp, "season_cargo.json")
        C.write({"a": 1}, path)
        with self.assertRaises(TypeError):
            C.write({"a": object()}, path)        # json cannot write it: dies mid-file
        with open(path, encoding="utf-8") as f:
            self.assertEqual(json.load(f), {"a": 1})
        self.assertEqual(os.listdir(tmp), ["season_cargo.json"])


class Net:
    """Stand-ins for every network call the hauler makes, with switches for each failure."""

    def __init__(self, week=9, season_type="regular"):
        self.state = {"week": week, "season": "2026", "season_type": season_type}
        self.load_error = {}          # week -> exception x.load raises for it
        self.board_week = {}          # week -> the week number ESPN's board claims
        self.board_error = {}
        self.fetched = []
        self.loads = []
        self.fetch_error = {}         # a substring of the path -> exception
        self.short_defs = False

    def payload(self):
        return (self.state, LEAGUE, ROSTERS, [{"user_id": "x"}], [{"roster_id": 3, "matchup_id": 1}], PLAYERS)

    def load(self, week=None):
        w = week or self.state["week"]
        self.loads.append(w)
        if w in self.load_error:
            raise self.load_error[w]
        return {"cbs_rows": 400, "espn_rows": 600, "cbs_map_median_miss": 0.1, "espn_map_median_miss": 0.0,
                "cbs_unmatched": ["x"]}, joined(), self.payload()

    def pull(self):
        proj = {"11": {"stats": {"rush_yd": 100}, "opponent": "DET"}, "NE": {"stats": {}, "opponent": "DET"}}
        return (*self.payload(), proj)

    def fetch(self, path):
        self.fetched.append(path)
        for part, err in self.fetch_error.items():
            if part in path:
                raise err
        if self.short_defs and "position[]=DEF" in path and "QB" not in path:
            return [{"player_id": "JAX", "opponent": "X"}]
        if "/matchups/" in path:
            return [{"roster_id": 3, "matchup_id": 2, "week": int(path.rsplit("/", 1)[1])}]
        if "position[]=DEF" in path and "QB" not in path:
            return [{"player_id": t, "opponent": None if t == "NE" else "XXX"} for t in
                    ("JAX", "NE", "CHI", "WAS")] + [{"player_id": f"T{i}", "opponent": "X"} for i in range(20)]
        return [{"player_id": "11", "stats": {"rush_yd": 50}, "opponent": "MIA"},
                {"player_id": "NE", "stats": {}, "opponent": "MIA"}]

    def board(self, season, week, season_type):
        if week in self.board_error:
            raise self.board_error[week]
        return {"week": {"number": self.board_week.get(week, week)}, "marker": week}

    def kickoffs(self, board):
        return {"NE": datetime.datetime(2026, 11, 15, 18, 0, tzinfo=UTC)}

    def games(self, board):
        return {"NE": ("ahead", 1.0)}

    def run(self):
        with mock.patch.object(C.x, "load", self.load), mock.patch.object(C.g, "pull", self.pull), \
                mock.patch.object(C.g, "fetch", self.fetch), mock.patch.object(C.g, "pull_board", self.board), \
                mock.patch.object(C.g, "kickoffs_from_espn", self.kickoffs), \
                mock.patch.object(C.g, "games_from_espn", self.games), \
                mock.patch.object(C, "MIN_DEFS", 3), \
                mock.patch.object(C.time, "sleep", lambda s: None):
            return C.pull()


class TestThePull(unittest.TestCase):
    def test_a_good_night_holds_two_three_site_weeks_three_matchup_weeks_and_the_byes(self):
        net = Net()
        s = net.run()
        self.assertEqual(sorted(s["weeks"]), ["10", "9"])
        self.assertTrue(all(w["three_site"] and w["why"] is None for w in s["weeks"].values()))
        self.assertEqual(sorted(s["matchups"]), ["10", "8", "9"])
        self.assertEqual(s["byes"], {"9": ["CHI"], "10": ["CHI"], "11": ["NE"]})
        self.assertEqual(s["last_week"], 17)
        self.assertFalse(s["season_over"])
        self.assertEqual(s["weeks"]["9"]["kickoffs"], {"NE": "2026-11-15T18:00:00+00:00"})
        self.assertEqual(s["weeks"]["9"]["games"], {"NE": ["ahead", 1.0]})
        self.assertEqual(s["weeks"]["9"]["meta"]["cbs_rows"], 400)
        self.assertNotIn("players", s["weeks"]["10"])           # the 16 MB dump never reaches the file
        json.dumps(s)                                           # and the whole thing is writable

    def test_any_exception_from_the_three_site_pull_falls_back_to_sleeper_alone(self):
        """Not only a Refuse: an empty crosswalk raises IndexError, an HTML page a JSONDecodeError."""
        for err in (IndexError("list index out of range"), json.JSONDecodeError("Expecting value", "<html>", 0),
                    KeyError("settings"), C.x.Refuse("CBS QB: no table header on the page")):
            net = Net()
            net.load_error = {9: err, 10: err}
            s = net.run()
            for w in ("9", "10"):
                self.assertFalse(s["weeks"][w]["three_site"], err)
                self.assertTrue(s["weeks"][w]["why"], err)
                self.assertIsNone(s["weeks"][w]["rows"]["11"]["cbs"])
            self.assertEqual(s["weeks"]["9"]["rows"]["11"]["sleeper"], 10.0)
            self.assertEqual(s["weeks"]["10"]["rows"]["11"]["sleeper"], 5.0)

    def test_the_two_weeks_fail_separately(self):
        net = Net()
        net.load_error = {10: IndexError("x")}
        s = net.run()
        self.assertTrue(s["weeks"]["9"]["three_site"])
        self.assertFalse(s["weeks"]["10"]["three_site"])
        self.assertIn("IndexError", s["weeks"]["10"]["why"])

    def test_an_espn_board_for_another_week_is_refused_whole(self):
        net = Net()
        net.board_week = {10: 9}
        s = net.run()
        self.assertIsNone(s["weeks"]["10"]["kickoffs"])
        self.assertIsNone(s["weeks"]["10"]["games"])
        self.assertEqual(s["weeks"]["10"]["espn_why"], "ESPN served week 9, not week 10")
        self.assertIsNotNone(s["weeks"]["9"]["kickoffs"])

    def test_espn_down_costs_the_kickoffs_and_nothing_else(self):
        net = Net()
        net.board_error = {9: C.g.Refuse("ESPN scoreboard: HTTP 503"), 10: OSError("boom")}
        s = net.run()
        self.assertEqual(s["weeks"]["9"]["espn_why"], "ESPN scoreboard: HTTP 503")
        self.assertIn("OSError", s["weeks"]["10"]["espn_why"])
        self.assertTrue(s["weeks"]["9"]["three_site"])

    def test_cbs_serving_the_wrong_week_drops_its_column_for_that_week_only(self):
        net = Net()
        real = net.load

        def load(week=None):
            meta, rows, payload = real(week)
            if week == 10:
                rows["21"]["cbs"] = 17.98
            return meta, rows, payload
        net.load = load
        s = net.run()
        self.assertTrue(s["weeks"]["10"]["cbs_wrong_week"])
        self.assertIsNone(s["weeks"]["10"]["rows"]["11"]["cbs"])
        self.assertFalse(s["weeks"]["9"]["cbs_wrong_week"])
        self.assertEqual(s["weeks"]["9"]["rows"]["11"]["cbs"], 13.0)

    def test_next_week_failing_twice_still_keeps_this_weeks_good_pull(self):
        """Three sites refuse week 10 AND Sleeper's own week-10 projections 502: week 9 is in hand."""
        net = Net()
        net.load_error = {10: C.x.Refuse("CBS QB: no table header on the page")}
        net.fetch_error = {"/projections/nfl/2026/10": C.g.Refuse("HTTP Error 502: Bad Gateway")}
        s = net.run()
        self.assertTrue(s["weeks"]["9"]["three_site"])
        self.assertFalse(s["weeks"]["10"]["three_site"])
        self.assertIn("failed too (HTTP Error 502: Bad Gateway)", s["weeks"]["10"]["why"])
        self.assertEqual(s["weeks"]["10"]["rows"]["11"]["name"], "Our Back")     # named and tagged still
        self.assertNotIn("10", s["byes"])
        self.assertTrue(any("week 10's byes could not be read" in n for n in s["notes"]))

    def test_a_short_answer_for_the_week_after_next_is_said_not_read_as_no_byes(self):
        net = Net()
        net.short_defs = True
        s = net.run()
        self.assertNotIn("11", s["byes"])
        self.assertTrue(any("week 11's byes could not be read" in n for n in s["notes"]))

    def test_the_last_playoff_week_hauls_nothing_past_it(self):
        net = Net(week=17)
        s = net.run()
        self.assertEqual(sorted(s["weeks"]), ["17"])
        self.assertEqual(sorted(s["matchups"]), ["16", "17"])
        self.assertEqual(net.loads, [17])
        self.assertFalse(any("/18" in p for p in net.fetched))

    def test_after_the_last_week_the_season_is_over_and_no_projection_is_hauled(self):
        for net in (Net(week=18), Net(week=3, season_type="post")):
            s = net.run()
            self.assertTrue(s["season_over"])
            self.assertEqual(s["weeks"], {})
            self.assertEqual(len(s["rosters"]), 2)

    def test_sleeper_itself_failing_raises_so_nothing_is_written(self):
        net = Net()
        net.load_error = {9: IndexError("x")}
        net.pull = mock.Mock(side_effect=C.g.Refuse("/v1/state/nfl: timed out"))
        with self.assertRaises(C.g.Refuse):
            net.run()


class TestMain(unittest.TestCase):
    def test_a_failed_pull_exits_2_says_why_and_leaves_the_kept_file_alone(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        kept = os.path.join(tmp, "season_cargo.json")
        with open(kept, "w", encoding="utf-8") as f:
            f.write('{"kept": true}')
        with mock.patch.object(C, "OUT", kept), \
                mock.patch.object(C, "pull", side_effect=C.g.Refuse("/v1/state/nfl: timed out")), \
                mock.patch("builtins.print") as said:
            rc = C.main([])
        self.assertEqual(rc, 2)
        self.assertEqual(said.call_args[0][0], "FAIL: /v1/state/nfl: timed out")
        with open(kept, encoding="utf-8") as f:
            self.assertEqual(f.read(), '{"kept": true}')

    def test_a_good_pull_writes_the_file_and_its_last_line_starts_ok(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        out = os.path.join(tmp, "season_cargo.json")
        snap = Net().run()
        with mock.patch.object(C, "OUT", out), mock.patch.object(C, "pull", return_value=snap), \
                mock.patch("builtins.print") as said:
            rc = C.main([])
        self.assertEqual(rc, 0)
        self.assertTrue(said.call_args[0][0].startswith("ok (week 9: "))
        self.assertIn("three sites", said.call_args[0][0])
        with open(out, encoding="utf-8") as f:
            self.assertEqual(sorted(json.load(f)["weeks"]), ["10", "9"])

    def test_stdout_writes_nothing(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, ignore_errors=True)
        out = os.path.join(tmp, "season_cargo.json")
        with mock.patch.object(C, "OUT", out), mock.patch.object(C, "pull", return_value=Net().run()), \
                mock.patch("builtins.print"):
            self.assertEqual(C.main(["--stdout"]), 0)
        self.assertFalse(os.path.exists(out))


if __name__ == "__main__":
    unittest.main()

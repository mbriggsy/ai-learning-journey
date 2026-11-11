#!/usr/bin/env python3
"""The in-season Nightly Feud: the rules that keep it from being calm and wrong.

Everything here runs on ONE real snapshot, `fixtures/season_cargo_20261109.json.gz`, pulled Monday
2026-11-09 21:07 ET (week 9, the Monday game under way). It can never be re-made: it holds that
night's projections and tags. The tests move the BUILD CLOCK around it, because every lock and the
lineup week are decided by kickoff times against the clock, never by the stored game states.

The traps it pins, each one real on that night:
  * Stevenson and Michael Wilson read Out on Monday AFTER scoring 14.8 and 12.0 on Sunday.
  * Stevenson (Out) is still priced 13.3 for week 10 by all three sites; Tate (Out, on IR) 12.7.
  * Swift is on bye in week 10 and reads a "price" of 0.0 from two sites.
  * The three-site average called BAL's defense an upgrade on ours; Sleeper ranked ours first.
  * No free agent clears the two-point bar; four of them clear zero.
"""
import contextlib
import copy
import datetime
import gzip
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
import zoneinfo
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import build_newsletter as N  # noqa: E402
import gameday_check as g  # noqa: E402
import season_edition as S  # noqa: E402

FIXTURE = os.path.join(ROOT, "tests", "fixtures", "season_cargo_20261109.json.gz")
ET = zoneinfo.ZoneInfo("America/New_York")

with gzip.open(FIXTURE, "rt", encoding="utf-8") as _f:
    SNAP = json.load(_f)

MONDAY = datetime.datetime(2026, 11, 9, 21, 45, tzinfo=ET)       # every week-9 game has kicked off
SUNDAY = datetime.datetime(2026, 11, 8, 21, 45, tzinfo=ET)       # the Monday game is still ahead
THURSDAY_BEFORE = datetime.datetime(2026, 11, 5, 12, 0, tzinfo=ET)   # no week-9 game has kicked off

STEVENSON, WILSON, SWIFT, TATE, FLOWERS, BROWN, MCGOWAN, MAHOMES = (
    "7611", "10232", "6790", "13279", "9997", "9224", "13424", "4046")


def snap():
    return copy.deepcopy(SNAP)


def fresh(s, now):
    """The same snapshot, stamped as pulled half an hour before `now`."""
    s["pulled"] = (now - datetime.timedelta(minutes=30)).replace(tzinfo=None).isoformat(timespec="seconds")
    return s


def build(now=MONDAY, s=None, **kw):
    return S.build(fresh(s or snap(), now), now, **kw)


def text_of(calls):
    return "\n".join(c["title"] + "\n" + "\n".join(c["lines"]) for c in calls)


class TestThePrice(unittest.TestCase):
    def test_a_zero_is_not_a_price(self):
        """Wilson, Out: Sleeper 0, CBS 12.45, ESPN 13.09. The plain average said 8.51."""
        self.assertAlmostEqual(S.price({"pos": "WR", "sleeper": 0, "cbs": 12.45, "espn": 13.09}), 12.77)

    def test_one_site_alone_is_not_a_price(self):
        self.assertIsNone(S.price({"pos": "RB", "sleeper": 0, "cbs": 6.32, "espn": 0.0}))
        self.assertIsNone(S.price({"pos": "RB", "sleeper": 9.0, "cbs": None, "espn": None}))

    def test_a_kicker_and_a_defense_read_sleepers_number(self):
        self.assertEqual(S.price({"pos": "DEF", "sleeper": 8.48, "cbs": 11.4, "espn": 7.58}), 8.48)
        self.assertEqual(S.price({"pos": "K", "sleeper": 9.5, "cbs": 12.3, "espn": 10.6}), 9.5)
        self.assertIsNone(S.price({"pos": "K", "sleeper": 0, "cbs": 12.3, "espn": 10.6}))

    def test_the_sites_split_is_said_only_at_two_points(self):
        self.assertEqual(S.split({"sleeper": 12.2, "cbs": 12.9, "espn": 14.8}), "12.2 to 14.8")
        self.assertEqual(S.split({"sleeper": 17.1, "cbs": 17.4, "espn": 17.8}), "")


class TestTheLineupWeek(unittest.TestCase):
    def test_monday_night_the_lineup_you_can_change_is_next_weeks(self):
        c = build(MONDAY)
        self.assertEqual(c["lineup"]["week"], 10)
        self.assertTrue(c["lineup"]["is_next"])
        self.assertEqual(c["lineup"]["opp"], "Kaeperni")
        self.assertEqual(c["scoreboard"]["week"], 9)
        self.assertEqual(c["scoreboard"]["opp"], "kblizzy23")

    def test_sunday_night_it_is_still_this_week(self):
        c = build(SUNDAY)
        self.assertEqual(c["lineup"]["week"], 9)
        self.assertFalse(c["lineup"]["is_next"])

    def test_before_the_first_kickoff_last_weeks_final_is_printed_and_no_scoreboard(self):
        c = build(THURSDAY_BEFORE)
        self.assertIsNone(c["scoreboard"])
        self.assertEqual(c["last_final"]["week"], 8)
        self.assertEqual(c["last_final"]["us"], "99.36")
        self.assertEqual(c["last_final"]["result"], "lost")
        self.assertEqual(c["last_final"]["opp"], "Hunter (briggsy007)")

    def test_once_a_game_has_kicked_off_last_weeks_final_is_gone(self):
        self.assertIsNone(build(MONDAY)["last_final"])


class TestLockBeatsTag(unittest.TestCase):
    """Sleeper tags men Out after games they played. A locked man is never a 'must fix'."""

    def test_stevenson_played_sunday_and_is_not_a_must_fix_that_night(self):
        c = build(SUNDAY)
        self.assertNotIn("Stevenson", text_of(c["lineup"]["calls"]))
        row = next(r for r in c["lineup"]["rows"] if r["name"] == "Rhamondre Stevenson")
        self.assertEqual(row["points"], "14.8")
        self.assertIn(row["status"], ("final", "kicked off", "playing now"))

    def test_the_roster_report_does_not_ask_for_a_look_at_a_man_who_has_played(self):
        names = [a["name"] for a in build(SUNDAY)["roster"]["attention"]]
        self.assertNotIn("Rhamondre Stevenson", names)      # final, 14.8, tagged Out afterwards
        self.assertNotIn("Michael Wilson", names)
        self.assertNotIn("Patrick Mahomes", names)          # Questionable, and already played
        self.assertIn("Carnell Tate", names)                # injured reserve outlives the kickoff
        self.assertIn("Rhamondre Stevenson", [a["name"] for a in build(MONDAY)["roster"]["attention"]])

    def test_an_out_starter_in_a_live_game_adds_nothing_for_the_time_left(self):
        """He was credited projection x share-of-game-left: 9.3 phantom points at 70% remaining."""
        s = snap()
        wk = s["weeks"]["10"]
        wk["games"]["NE"] = ["live", 0.7]
        wk["games"]["DET"] = ["live", 0.7]
        week = S.Week(10, wk, datetime.datetime(2026, 11, 15, 10, 0, tzinfo=ET))
        self.assertTrue(week.locked("NE"))
        e = S.expected([STEVENSON], set(), week, {STEVENSON: 0.0}, datetime.date(2026, 11, 15))
        self.assertEqual(e.total, 0.0)
        wk["rows"][STEVENSON]["inj"] = None                  # the positive control: healthy, he counts
        e = S.expected([STEVENSON], set(), S.Week(10, wk, week.now), {STEVENSON: 0.0}, datetime.date(2026, 11, 15))
        self.assertAlmostEqual(e.total, S.price(wk["rows"][STEVENSON]) * 0.7, places=6)

    def test_the_expected_score_counts_the_points_he_scored(self):
        c = build(SUNDAY)
        self.assertEqual(c["scoreboard"]["us"], "120.78")
        self.assertEqual(c["scoreboard"]["expected"]["us"], "120.8")   # all ten done: live points, to the tenth

    def test_a_week_10_out_tag_with_the_game_ahead_IS_a_must_fix(self):
        c = build(MONDAY)
        titles = [x["title"] for x in c["lineup"]["calls"] if x["label"] == "MUST FIX"]
        self.assertTrue(any("Stevenson" in t for t in titles), titles)


class TestStartSit(unittest.TestCase):
    def setUp(self):
        self.c = build(MONDAY)
        self.calls = self.c["lineup"]["calls"]
        self.text = text_of(self.calls)

    def test_the_bye_is_named_and_filled_by_the_flex_slide_never_by_mcgowan(self):
        swift = next(x for x in self.calls if "Swift" in x["title"])
        body = "\n".join(swift["lines"])
        self.assertEqual(swift["label"], "MUST FIX")
        self.assertIn("NO GAME this week (bye)", body)
        self.assertIn("Start instead: Zay Flowers", body)
        self.assertIn("Chase Brown", body)
        self.assertIn("moved from FLEX to RB", body)
        self.assertNotIn("Start instead: Seth McGowan", body)

    def test_a_starter_nobody_can_price_is_a_must_fix_and_is_never_offered_as_a_fix(self):
        """An emptied kicker row drew no call at all; a one-site bench body was the fix 'at 0.0'."""
        s = snap()
        rows = s["weeks"]["10"]["rows"]
        rows["12185"]["sleeper"] = 0                                   # Shrader, our kicker
        rows[MCGOWAN].update(cbs=None, espn=None)                      # one site only
        for pid in ("9480",):                                          # Strange off the bench options
            rows[pid].update(cbs=None, espn=None)
        calls = build(MONDAY, s)["lineup"]["calls"]
        text = text_of(calls)
        self.assertTrue(any("Shrader" in c["title"] and c["label"] == "MUST FIX" for c in calls), text)
        self.assertNotIn("Start instead: Seth McGowan", text)
        fixes = [ln for c in calls for ln in c["lines"] if ln.startswith(("Start instead:", "Start:"))]
        self.assertTrue(fixes)
        for ln in fixes:
            self.assertNotIn("projected 0.0", ln)

    def test_the_engines_shorthand_is_spelled_out_for_the_reader(self):
        self.assertEqual(S.plain("X (RB, CIN) vs PIT proj 13.9"), "X (RB, CIN) vs PIT, projected 13.9")
        self.assertEqual(S.plain("No bench body who is playing is eligible for K. An add is needed."),
                         "No bench player who is playing is eligible for K. A pickup is needed.")
        self.assertNotIn(" proj ", self.text)
        self.assertIn("Zay Flowers (WR, BAL) vs LAC, projected 14.8", self.text)

    def test_an_out_man_never_fills_a_slot(self):
        for x in self.calls:
            for line in x["lines"]:
                if line.startswith(("Start instead:", "Start:", "If he is scratched:")):
                    self.assertNotIn("Carnell Tate", line)
                    self.assertNotIn("Michael Wilson", line)
                    self.assertNotIn("Rhamondre Stevenson", line)

    def test_a_man_on_injured_reserve_is_out_of_every_comparison_even_with_his_tag_cleared(self):
        """Tate, priced 12.7 by all three sites. On IR he cannot be started until he is activated."""
        s = snap()
        for wk in s["weeks"].values():
            wk["rows"][TATE]["inj"] = None
        ours = next(r for r in s["rosters"] if r["roster_id"] == 3)
        week = S.Week(10, s["weeks"]["10"], MONDAY)
        self.assertNotIn(TATE, S.bodies_of(ours, week))
        self.assertIn(FLOWERS, S.bodies_of(ours, week))
        ours["reserve"] = []
        self.assertIn(TATE, S.bodies_of(ours, week))               # the positive control

    def test_questionable_is_named_with_a_fallback_and_never_benched_by_the_tag(self):
        q = [x for x in self.calls if x["label"] == "QUESTIONABLE"]
        self.assertEqual(len(q), 1)
        self.assertIn("Mahomes", q[0]["title"])

    def test_a_swap_needs_the_two_point_margin(self):
        ups = [x for x in self.calls if x["label"] == "BETTER START"]
        self.assertEqual([x["title"] for x in ups],
                         ["BENCH BEATS STARTER — Drake Maye over Patrick Mahomes (QB)"])
        self.assertIn("projects 3.0 more", "\n".join(ups[0]["lines"]))

    def test_the_as_set_total_scores_an_out_starter_and_a_bye_at_zero(self):
        """projected_total never reads tags; fed three-site numbers it counted Stevenson's 13.3."""
        rows = S.Week(10, SNAP["weeks"]["10"], MONDAY).rows
        ours = next(r for r in SNAP["rosters"] if r["roster_id"] == 3)
        playing = [p for p in ours["starters"] if p not in (STEVENSON, SWIFT)]
        want = sum(S.price(rows[p]) for p in playing)
        self.assertEqual(self.c["lineup"]["projected"]["us"], f"{want:.1f}")
        self.assertEqual(self.c["lineup"]["projected"]["us"], "108.3")
        self.assertEqual(self.c["lineup"]["margin"], "+4.3")

    def test_a_healthy_starter_whose_game_is_ahead_counts_his_full_number(self):
        """The positive control (insight 008): zero is not what the adapter returns for everyone."""
        wk = S.Week(10, SNAP["weeks"]["10"], MONDAY)
        e = S.expected(["6813"], set(), wk, {}, MONDAY.date())      # Jonathan Taylor
        self.assertAlmostEqual(e.total, S.price(wk.rows["6813"]), places=6)
        self.assertGreater(e.total, 15)

    def test_the_opponents_lineup_is_printed_too(self):
        names = [r["name"] for r in self.c["lineup"]["their_rows"]]
        self.assertEqual(len(names), 10)
        self.assertIn("George Kittle", names)


class TestTheScoreboard(unittest.TestCase):
    def test_monday_night_shows_who_is_still_playing_for_them(self):
        sb = build(MONDAY)["scoreboard"]
        self.assertTrue(sb["leading"])
        them = next(x for x in sb["left"] if x["who"] == "kblizzy23")
        self.assertEqual(sorted(them["playing"]), ["Josh Allen", "Justin Jefferson", "Will Reichard"])
        us = next(x for x in sb["left"] if x["who"] == "You")
        self.assertEqual((us["playing"], us["ahead"]), ([], []))


class TestTheScoreboardMidWeek(unittest.TestCase):
    def test_a_starter_tagged_out_is_not_listed_as_still_to_play(self):
        """Friday of week 9: the Thursday game is done, Sunday is ahead, Stevenson reads Out."""
        friday = datetime.datetime(2026, 11, 6, 12, 0, tzinfo=ET)
        sb = build(friday)["scoreboard"]
        us = next(x for x in sb["left"] if x["who"] == "You")
        self.assertNotIn("Rhamondre Stevenson", us["ahead"])
        self.assertIn("Jonathan Taylor", us["ahead"])               # the positive control


class TestWithheld(unittest.TestCase):
    """No call on one source, on no kickoff times, or on an old snapshot. Rows still print."""

    def assert_withheld(self, c, needle):
        self.assertIn(needle, c["lineup"]["withheld"])
        self.assertEqual(c["lineup"]["calls"], [])
        self.assertIsNone(c["lineup"]["projected"])
        self.assertEqual(len(c["lineup"]["rows"]), 10)
        self.assertEqual(c["waivers"]["worth"], [])
        self.assertEqual(c["waivers"]["short"], [])
        self.assertEqual(c["waivers"]["weak"], [])
        self.assertTrue(any("by hand" in a for a in c["actions"]))

    def test_a_sleeper_only_week_makes_no_call(self):
        s = snap()
        s["weeks"]["10"]["three_site"] = False
        s["weeks"]["10"]["why"] = "CBS QB: no table header on the page"
        c = build(MONDAY, s)
        self.assert_withheld(c, "no call is made on Sleeper's numbers alone")
        self.assertTrue(any("week 10" in gap and "Sleeper alone" in gap for gap in c["gaps"]))

    def test_no_kickoff_times_makes_no_call(self):
        s = snap()
        s["weeks"]["10"]["kickoffs"] = None
        s["weeks"]["10"]["espn_why"] = "ESPN served week 9, not week 10"
        self.assert_withheld(build(MONDAY, s), "cannot tell who is already locked")

    def test_a_snapshot_past_36_hours_makes_no_call_and_says_its_age(self):
        s = snap()
        now = datetime.datetime(2026, 11, 11, 21, 45, tzinfo=ET)
        c = S.build(s, now)                                          # pulled Monday 21:07: 48.6 hours
        self.assert_withheld(c, "49 hours old")
        self.assertTrue(any("49 hours old" in gap for gap in c["gaps"]))

    def test_a_kept_snapshot_never_offers_a_man_who_has_kicked_off_since(self):
        """Read Thursday night after NYG-WAS kicked off (8:15 PM), from a 20-hour-old snapshot."""
        s = snap()
        now = datetime.datetime(2026, 11, 12, 21, 0, tzinfo=ET)
        s["pulled"] = "2026-11-12T01:00:00"
        ours = next(r for r in s["rosters"] if r["roster_id"] == 3)
        ours["players"] = [p for p in ours["players"] if p != MCGOWAN]      # room for a WAS free agent
        white = next(pid for pid, r in s["weeks"]["10"]["rows"].items() if r["name"] == "Rachaad White")
        s["weeks"]["10"]["rows"][white].update(sleeper=30.0, cbs=30.0, espn=30.0)
        c = S.build(s, now)
        self.assertIsNone(c["lineup"]["withheld"])
        names = [f["name"] for f in c["waivers"]["worth"] + c["waivers"]["short"]]
        self.assertNotIn("Rachaad White", names)
        nabers = next(r for r in c["lineup"]["their_rows"] if r["name"] == "Malik Nabers")
        self.assertEqual(nabers["status"], "kicked off")


class TestWaivers(unittest.TestCase):
    def setUp(self):
        self.w = build(MONDAY)["waivers"]

    def test_nobody_cleared_the_two_point_bar_that_night(self):
        self.assertEqual(self.w["worth"], [])
        self.assertEqual([f["name"] for f in self.w["short"]],
                         ["Rachaad White", "Jakobi Meyers", "Khalil Shakir", "Blake Corum"])
        self.assertEqual((self.w["short"][0]["gain_txt"], self.w["short"][0]["gain_week"]), ("0.5", 10))

    def test_a_defense_is_ranked_on_sleepers_number_so_bal_is_not_offered_over_ours(self):
        names = [f["name"] for f in self.w["worth"] + self.w["short"] + self.w["watch"]]
        self.assertNotIn("Baltimore Ravens", names)

    def test_a_free_agent_who_clears_the_bar_is_worth_a_claim_and_names_who_he_replaces(self):
        s = snap()
        white = next(pid for pid, r in s["weeks"]["10"]["rows"].items() if r["name"] == "Rachaad White")
        s["weeks"]["10"]["rows"][white].update(sleeper=16.0, cbs=16.0, espn=16.0)
        w = build(MONDAY, s)["waivers"]
        self.assertEqual([f["name"] for f in w["worth"]], ["Rachaad White"])
        self.assertEqual(w["worth"][0]["over"], "Harold Fannin Jr.")
        self.assertEqual((w["worth"][0]["gain_txt"], w["worth"][0]["gain_week"]), ("5.3", 10))

    def test_a_gain_that_is_next_weeks_is_described_with_next_weeks_game(self):
        """Sunday night, lineup week 9: White's week-9 game is over. His card must be week 10's."""
        s = snap()
        white = next(pid for pid, r in s["weeks"]["10"]["rows"].items() if r["name"] == "Rachaad White")
        s["weeks"]["10"]["rows"][white].update(sleeper=20.0, cbs=20.0, espn=20.0)
        c = build(SUNDAY, s)
        f = next(x for x in c["waivers"]["worth"] if x["name"] == "Rachaad White")
        self.assertEqual((f["gain_week"], f["projected"], f["opp"]), (10, "20.0", "NYG"))
        self.assertIsNotNone(f["over"])
        self.assertTrue(any("to your best week-10 lineup" in a for a in c["actions"]))

    def test_a_bye_at_one_slot_prints_three_alternatives_and_one_action_not_the_whole_league(self):
        """Review 2026-11-09: with our defense on bye, 19 defenses were each 'worth a claim'."""
        s = snap()
        wk = s["weeks"]["10"]
        wk["rows"]["JAX"]["opp"] = None
        wk["kickoffs"].pop("JAX", None)
        c = build(MONDAY, s)
        defs = [f for f in c["waivers"]["worth"] if f["pos"] == "DEF"]
        self.assertEqual(len(defs), 3)
        self.assertEqual(sum(1 for a in c["actions"] if a.startswith("Put in for") and "(DEF," in a), 1)

    def test_a_rivals_player_is_never_a_free_agent(self):
        s = snap()
        kittle = next(pid for pid, r in s["weeks"]["10"]["rows"].items() if r["name"] == "George Kittle")
        s["weeks"]["10"]["rows"][kittle].update(sleeper=40.0, cbs=40.0, espn=40.0)
        w = build(MONDAY, s)["waivers"]
        self.assertNotIn("George Kittle", [f["name"] for f in w["worth"] + w["short"] + w["watch"]])

    def test_a_tagged_out_free_agent_is_never_offered(self):
        s = snap()
        worthy = next(pid for pid, r in s["weeks"]["10"]["rows"].items() if r["name"] == "Xavier Worthy")
        self.assertEqual(s["weeks"]["10"]["rows"][worthy]["inj"], "Out")
        s["weeks"]["10"]["rows"][worthy].update(sleeper=40.0, cbs=40.0, espn=40.0)
        w = build(MONDAY, s)["waivers"]
        self.assertNotIn("Xavier Worthy", [f["name"] for f in w["worth"] + w["short"] + w["watch"]])

    def test_tight_end_is_the_weak_spot_and_no_free_agent_fixes_it(self):
        self.assertEqual([x["pos"] for x in self.w["weak"]], ["TE"])
        self.assertIn("yours projects 10.8", self.w["weak"][0]["text"])
        self.assertIn("13.1", self.w["weak"][0]["text"])
        self.assertEqual(self.w["weak"][0]["best_free"], "Pat Freiermuth, projected 9.5")

    def test_next_weeks_byes_are_named(self):
        self.assertEqual(sorted(self.w["byes_next"]),
                         ["Drake London (WR)", "Drake Maye (QB)", "Harold Fannin Jr. (TE)",
                          "Rhamondre Stevenson (RB)"])
        self.assertEqual(self.w["next_week"], 11)

    def test_the_roster_count_and_the_waiver_place_come_from_the_payload(self):
        self.assertEqual((self.w["active"], self.w["cap"], self.w["ir"], self.w["full"]), (16, 16, 1, True))
        self.assertEqual((self.w["waiver_position"], self.w["teams"]), (1, 8))

    def test_best_lineup_keeps_a_locked_starter_where_he_stands(self):
        bodies = {"a": ("RB", 20.0), "b": ("RB", 10.0), "c": ("WR", 15.0)}
        got, total = S.best_lineup(bodies, ["RB", "FLEX"], fixed={0: ("z", 3.0)})
        self.assertEqual(got, {0: "z", 1: "a"})
        self.assertEqual(total, 23.0)

    def test_best_lineup_fills_dedicated_slots_before_flex(self):
        bodies = {"a": ("RB", 20.0), "b": ("RB", 18.0), "c": ("WR", 19.0), "d": ("TE", 5.0)}
        got, total = S.best_lineup(bodies, ["RB", "WR", "TE", "FLEX"])
        self.assertEqual(got, {0: "a", 1: "c", 2: "d", 3: "b"})
        self.assertEqual(total, 62.0)


class TestTheRosterReport(unittest.TestCase):
    def test_everyone_who_needs_a_look_is_listed_with_the_reason(self):
        rr = build(MONDAY)["roster"]
        why = {a["name"]: a["why"] for a in rr["attention"]}
        self.assertEqual(sorted(why), ["Carnell Tate", "D'Andre Swift", "Michael Wilson",
                                       "Patrick Mahomes", "Rhamondre Stevenson"])
        self.assertIn("on injured reserve", why["Carnell Tate"])
        self.assertIn("the sites still project 12.7 if he plays", why["Carnell Tate"])
        self.assertEqual(why["D'Andre Swift"], "on bye in week 10")
        self.assertIn("Neck, Fracture", why["Michael Wilson"])
        self.assertIn("tagged Questionable (Elbow)", why["Patrick Mahomes"])
        self.assertEqual(sorted(b["name"] for b in rr["bench"]),
                         ["Brenton Strange", "Drake Maye", "Jared Goff", "Seth McGowan", "Zay Flowers"])


class TestStandingsAndIdentity(unittest.TestCase):
    def setUp(self):
        self.c = build(MONDAY)
        self.rows = self.c["standings"]["rows"]

    def test_the_order_is_wins_then_points_for(self):
        self.assertEqual([r["name"] for r in self.rows],
                         ["RMonk9", "kblizzy23", "BuschLight420", "PoppaBriggsy", "Hunter (briggsy007)",
                          "Cltchiefs", "Kaeperni", "MattiICE23"])
        self.assertEqual(self.rows[3]["record"], "4-4")
        self.assertEqual(self.rows[3]["pf_txt"], "1076.20")
        self.assertEqual(self.rows[3]["streak_txt"], "lost 1")

    def test_hunter_is_briggsy007_and_we_are_poppabriggsy(self):
        """The most attractive wrong answer in the project (CLAUDE.md landmine)."""
        us = [r for r in self.rows if r["us"]]
        hunter = [r for r in self.rows if r["hunter"]]
        self.assertEqual([r["name"] for r in us], ["PoppaBriggsy"])
        self.assertEqual([r["name"] for r in hunter], ["Hunter (briggsy007)"])
        self.assertEqual(us[0]["roster_id"], 3)
        self.assertEqual(hunter[0]["roster_id"], 1)

    def test_the_playoff_cut_sits_under_sixth(self):
        self.assertEqual([r["place"] for r in self.rows if r["last_in"]], [6])
        self.assertEqual(sum(1 for r in self.rows if r["in"]), 6)

    def test_the_tiles(self):
        self.assertEqual([(t["lbl"], t["num"]) for t in self.c["tiles"]],
                         [("Record", "4-4"), ("Place", "4th"), ("Lineup Week", "10"),
                          ("Projected Margin", "+4.3")])


class TestWireAndMarket(unittest.TestCase):
    def test_the_wire_listens_for_our_players_and_the_free_agents_who_would_start(self):
        heard = {}

        def fake_wire(people):
            heard["people"] = people
            return []
        build(MONDAY, wire_fn=fake_wire)
        who = {p["name"]: p["who"] for p in heard["people"]}
        self.assertEqual(who["Zay Flowers"], "MY ROSTER")
        self.assertEqual(who["Rachaad White"], "FREE AGENT")
        self.assertNotIn("Jacksonville Jaguars", who)          # a defense's name is a city and a mascot
        self.assertNotIn("George Kittle", who)                 # a rival's man is not our news
        self.assertEqual(len({p["r"] for p in heard["people"]}), len(heard["people"]))

    def test_a_real_headline_reaches_the_wire_with_whose_he_is(self):
        inbox = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, inbox, ignore_errors=True)
        with open(os.path.join(inbox, "rss_pft.xml"), "w", encoding="utf-8") as f:
            f.write("<rss><channel>"
                    "<item><title>Zay Flowers limited in practice with a knee injury</title><link>a</link></item>"
                    "<item><title>Hall of Fame game moves to August</title><link>b</link></item>"
                    "<item><title>George Kittle signs extension</title><link>c</link></item>"
                    "</channel></rss>")
        with mock.patch.object(N, "INBOX", inbox):
            c = build(MONDAY, wire_fn=lambda people: N.wire(people, describe=S.describe_person))
        self.assertEqual([i["title"] for i in c["wire"]], ["Zay Flowers limited in practice with a knee injury"])
        p = c["wire"][0]["players"][0]
        self.assertEqual((p["who"], p["role"], c["wire"][0]["kind"]), ("MY ROSTER", "bench", "bad"))
        flowers = next(b for b in c["roster"]["bench"] if b["name"] == "Zay Flowers")
        self.assertEqual(flowers["headlines"], 1)

    def test_market_watch_keeps_only_what_touches_us(self):
        white = next(pid for pid, r in SNAP["weeks"]["10"]["rows"].items() if r["name"] == "Rachaad White")
        kittle = next(pid for pid, r in SNAP["weeks"]["10"]["rows"].items() if r["name"] == "George Kittle")
        add = [{"player_id": white, "count": 500}, {"player_id": kittle, "count": 400},
               {"player_id": "99999999", "count": 300}, {"player_id": MCGOWAN, "count": 200}]
        drop = [{"player_id": WILSON, "count": 900}, {"player_id": kittle, "count": 5}]
        m = build(MONDAY, trending_add=add, trending_drop=drop)["market"]
        self.assertEqual([(r["name"], r["who"]) for r in m["adds"]["rows"]],
                         [("Rachaad White", "FREE AGENT"), ("Seth McGowan", "MY ROSTER")])
        self.assertEqual((m["adds"]["total"], m["adds"]["rival"], m["adds"]["other"]), (4, 1, 1))
        self.assertEqual([(r["name"], r["who"]) for r in m["drops"]["rows"]], [("Michael Wilson", "MY ROSTER")])


class TestSeasonOverAndEmpty(unittest.TestCase):
    def test_a_season_that_is_over_prints_standings_and_no_call(self):
        s = snap()
        s["season_over"], s["weeks"] = True, {}
        c = S.build(s, MONDAY)
        self.assertTrue(c["over"])
        self.assertIsNone(c["lineup"])
        self.assertEqual(len(c["standings"]["rows"]), 8)

    def test_no_roster_at_all_is_said_not_crashed(self):
        c = S.build({"rosters": [], "users": [], "weeks": {}}, MONDAY)
        self.assertFalse(c["have_roster"])
        self.assertEqual(c["standings"]["rows"], [])

    def test_a_week_with_no_opponent_says_so(self):
        s = snap()
        for m in s["matchups"]["10"]:
            if m["roster_id"] == 3:
                m["matchup_id"] = None
        c = build(MONDAY, s)
        self.assertTrue(c["lineup"]["no_game"])
        self.assertEqual(c["lineup"]["their_rows"], [])
        self.assertIsNone(c["lineup"]["margin"])
        self.assertFalse(any("must fix" in a or "better start" in a for a in c["actions"]))
        self.assertIn("Week 10: you have no game, so the lineup does not count.", c["actions"])

    def test_a_roster_list_without_ours_is_said(self):
        s = snap()
        s["rosters"] = [r for r in s["rosters"] if r["roster_id"] != 3]
        c = S.build(s, MONDAY)
        self.assertFalse(c["have_roster"])
        self.assertIn("no roster owned by PoppaBriggsy was in today's rosters", c["gaps"])


# ------------------------------------------------------------------ the page and the job


BANNED = ("consensus", "spread", "approx", "snapshot", "startable", "W+1", "lineup week ")


class SeasonBuild(unittest.TestCase):
    """A sandbox inbox holding the fixture as the season snapshot, and a frozen build clock."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.inbox = os.path.join(self.tmp, "inbox")
        self.archive = os.path.join(self.tmp, "archive")
        self.mount = os.path.join(self.tmp, "My Drive")
        self.drive = os.path.join(self.mount, "Nightly Feud")
        self.live = os.path.join(self.tmp, "live.html")
        os.makedirs(self.inbox)
        os.makedirs(self.mount)
        self.cargo = os.path.join(self.inbox, "season_cargo.json")
        self.write_cargo(fresh(snap(), MONDAY))
        self.write("sleeper_draft.json", {"status": "complete"})
        self.write("sleeper_trending_add.json", [])
        self.write("sleeper_trending_drop.json", [])
        for name, value in (("INBOX", self.inbox), ("SEASON_CARGO", self.cargo), ("ARCHIVE", self.archive),
                            ("DRIVE_DIR", self.drive), ("CARGO_ARCHIVE", os.path.join(self.tmp, "cargo")),
                            ("archive_cargo", lambda slug: (self.tmp, 0)),
                            ("haul", lambda: self.fail("this test reached the network pull"))):
            p = mock.patch.object(N, name, value)
            p.start()
            self.addCleanup(p.stop)

    def write(self, name, obj):
        with open(os.path.join(self.inbox, name), "w", encoding="utf-8") as f:
            json.dump(obj, f)

    def write_cargo(self, s):
        with open(self.cargo, "w", encoding="utf-8") as f:
            json.dump(s, f)

    def page(self, **kw):
        return N.render(N.build_season_context(now=MONDAY.replace(tzinfo=None), archive=self.archive, **kw))

    def main(self, *argv):
        out, err = io.StringIO(), io.StringIO()

        class Clock(datetime.datetime):
            @classmethod
            def now(cls, tz=None):
                return MONDAY.replace(tzinfo=None)
        with mock.patch.object(N._dt, "datetime", Clock), \
                contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            rc = N.main(list(argv))
        return rc, out.getvalue(), err.getvalue()


class TestThePage(SeasonBuild):
    def test_it_carries_the_frozen_design_byte_for_byte(self):
        css, script = N.frozen_parts()
        html = self.page()
        self.assertEqual(N.style_hash(N.STYLE_RE.search(html).group(1)), N.style_hash(css))
        self.assertIn(script, html)

    def test_the_draft_era_is_gone_from_it(self):
        html = self.page()
        for gone in ("Days to Draft", "Your Slot", "Seats Filled", "Board Version", "build_board.py",
                     "Rebuild the board", "watcher alert", "start_time", "fit to draft"):
            self.assertNotIn(gone, html)

    def test_it_says_what_was_asked_for(self):
        html = self.page()
        for wanted in ("You lead.", "kblizzy23", "Next up, week 10: Kaeperni", "Your lineup, week 10",
                       "Kaeperni&#39;s lineup, week 10", "Start instead: Zay Flowers", "MUST FIX",
                       "Your Roster", "Waiver Wire", "Nobody on the wire is worth a claim today",
                       "Week 11 byes on your roster", "The Wire", "Market Watch", "Standings",
                       "Hunter (briggsy007)", "THE RIVAL", "Beat Hunter. He is 3-5 and sits 5th, behind you at 4-4."):
            self.assertIn(wanted, html)

    def pages(self):
        """The happy page and every degraded one: a leak only shows on the night something broke."""
        yield "the usual night", self.page()
        yield "a failed pull", self.page(haul_problem="FAIL: /v1/state/nfl: timed out")
        s = fresh(snap(), MONDAY)
        s["weeks"]["10"]["three_site"] = False
        self.write_cargo(s)
        yield "Sleeper only", self.page()
        s = fresh(snap(), MONDAY)
        s["weeks"]["10"]["kickoffs"] = None
        self.write_cargo(s)
        yield "no kickoff times", self.page()
        s = fresh(snap(), MONDAY)
        s["season_over"], s["weeks"] = True, {}
        self.write_cargo(s)
        yield "season over", self.page()
        s = fresh(snap(), MONDAY)
        s["weeks"]["10"] = None
        self.write_cargo(s)
        yield "wrong-shaped file", self.page()
        with open(self.cargo, "w", encoding="utf-8") as f:
            f.write("{ not json")
        yield "unreadable file", self.page()
        os.remove(self.cargo)
        yield "never pulled", self.page()

    def test_no_internal_word_reaches_the_reader_on_any_night(self):
        for night, html in self.pages():
            body = html.split("</style>")[-1].lower()
            for word in BANNED:
                self.assertNotIn(word.lower(), body, f"'{word}' is our word, not the reader's ({night})")

    def test_a_file_in_the_wrong_shape_costs_the_roster_sections_never_the_paper(self):
        """Valid JSON, a null week: season_edition.build raises. The edition is still written."""
        s = fresh(snap(), MONDAY)
        s["weeks"]["10"] = None
        self.write_cargo(s)
        html = self.page()
        self.assertIn("could not be used (AttributeError", html)
        self.assertIn("The roster did not arrive today", html)
        s = fresh(snap(), MONDAY)
        s["pulled"] = "Mon Nov 9 21:07"
        self.write_cargo(s)
        self.assertIn("could not be used (ValueError", self.page())

    def test_the_season_over_page_does_not_send_the_reader_to_an_empty_colophon(self):
        s = fresh(snap(), MONDAY)
        s["season_over"], s["weeks"] = True, {}
        self.write_cargo(s)
        html = self.page()
        self.assertIn("The season is over, so this desk has stopped listening.", html)
        self.assertIn("The season is over, so there is no market left to watch.", html)
        self.assertNotIn("see the colophon", html)
        self.assertIn("Hunter (briggsy007)", html)

    def test_missing_trending_lists_are_said_in_the_colophon(self):
        os.remove(os.path.join(self.inbox, "sleeper_trending_add.json"))
        html = self.page()
        self.assertIn("sleeper_trending_add.json is not in the inbox", html)

    def test_a_failed_pull_is_said_once(self):
        s = snap()
        s["pulled"] = "2026-11-08T21:46:00"
        self.write_cargo(s)
        html = self.page(haul_problem="FAIL: /v1/state/nfl: timed out")
        self.assertEqual(html.count("pull of rosters and projections failed"), 1)
        self.assertIn("are as of Sun Nov 8, 9:46 PM (24 hours old)", html)

    def test_the_last_week_does_not_promise_a_week_that_does_not_exist(self):
        s = fresh(snap(), MONDAY)
        s["last_week"] = 10
        self.write_cargo(s)
        self.assertNotIn("Week 11 pickups are judged", self.page())
        s["last_week"] = 17
        self.write_cargo(s)
        self.assertIn("Week 11 pickups are judged from tomorrow", self.page())

    def test_there_is_not_one_exclamation_mark_in_the_prose(self):
        body = self.page().split("</style>")[-1].split("<script>")[0]
        self.assertNotIn("!", body.replace("<!--", "").replace("<!DOCTYPE", ""))

    def test_a_withheld_night_says_so_where_the_calls_would_be(self):
        s = fresh(snap(), MONDAY)
        s["weeks"]["10"]["three_site"] = False
        self.write_cargo(s)
        html = self.page()
        self.assertIn("No start/sit calls today.", html)
        self.assertIn("No pickup calls today.", html)
        self.assertNotIn("Start instead:", html)
        self.assertIn("paper is thinner than usual: CBS and ESPN did not arrive for week 10", html)

    def test_a_missing_snapshot_still_prints_a_page(self):
        os.remove(self.cargo)
        html = self.page()
        self.assertIn("The roster did not arrive today", html)
        self.assertIn("have never been pulled", html)

    def test_a_snapshot_that_is_not_json_still_prints_a_page(self):
        with open(self.cargo, "w", encoding="utf-8") as f:
            f.write("{ not json")
        self.assertIn("could not be read", self.page())

    def test_a_headline_cannot_inject_markup_into_the_page(self):
        """Feed titles are outside text. Until 2026-11-09 the templates escaped nothing at all."""
        with open(os.path.join(self.inbox, "rss_pft.xml"), "w", encoding="utf-8") as f:
            f.write("<rss><channel><item><title>Zay Flowers &lt;script&gt;alert(1)&lt;/script&gt; &amp; friends"
                    "</title><link>a</link></item></channel></rss>")
        html = self.page()
        self.assertIn("Zay Flowers &lt;script&gt;alert(1)&lt;/script&gt; &amp; friends", html)
        self.assertNotIn("<script>alert(1)", html)

    def test_a_mule_that_stopped_is_said_in_the_colophon(self):
        self.write("mule_status.json", {"run_at": "2026-11-09 15:00:00", "sources": {}})
        self.assertIn("the mule last ran 405 minutes ago", self.page())


class TestMainInSeason(SeasonBuild):
    """The call site (insight 013): which edition, whether it pulls, and that a failed pull never
    costs the paper or its Drive copy."""

    def test_a_finished_draft_builds_the_in_season_edition_and_pulls_first(self):
        pulled = []
        with mock.patch.object(N, "haul", lambda: pulled.append(1)):
            rc, out, _ = self.main("--out", self.live)
        self.assertEqual((rc, pulled), (0, [1]))
        self.assertIn("in-season edition", out)
        with open(self.live, encoding="utf-8") as f:
            self.assertIn("Your lineup, week 10", f.read())

    def test_an_unfinished_draft_builds_the_draft_edition_and_never_pulls(self):
        self.write("sleeper_draft.json", {"status": "pre_draft"})
        with mock.patch.object(N, "build_context", lambda: self.fail_marker()):
            with self.assertRaises(RuntimeError):
                self.main("--out", self.live)

    def fail_marker(self):
        raise RuntimeError("draft edition chosen")

    def test_unreadable_draft_cargo_stays_in_season_while_a_snapshot_exists(self):
        os.remove(os.path.join(self.inbox, "sleeper_draft.json"))
        self.assertTrue(N.season_mode())
        os.remove(self.cargo)
        self.assertFalse(N.season_mode())

    def test_a_failed_pull_still_writes_the_edition_copies_it_to_drive_and_says_why(self):
        with mock.patch.object(N, "haul", lambda: "FAIL: /v1/state/nfl: timed out"):
            rc, _, _ = self.main("--out", self.live)
        self.assertEqual(rc, 0)
        with open(self.live, encoding="utf-8") as f:
            html = f.read()
        self.assertIn("pull of rosters and projections failed (FAIL: /v1/state/nfl: timed out)", html)
        self.assertIn("Your lineup, week 10", html)
        self.assertEqual(os.listdir(self.drive), ["2026-11-09-edition-1.html"])

    def test_a_dry_run_neither_pulls_nor_writes(self):
        rc, out, _ = self.main("--dry-run", "--out", self.live)       # setUp's haul fails the test if called
        self.assertEqual(rc, 0)
        self.assertFalse(os.path.exists(self.live))
        self.assertFalse(os.path.exists(self.drive))

    def test_a_wrong_shaped_file_still_exits_0_with_an_edition_in_drive(self):
        s = fresh(snap(), MONDAY)
        s["weeks"]["9"]["kickoffs"]["KC"] = None
        self.write_cargo(s)
        rc, _, _ = self.main("--no-haul", "--out", self.live)
        self.assertEqual(rc, 0)
        self.assertEqual(os.listdir(self.drive), ["2026-11-09-edition-1.html"])

    def test_no_haul_builds_from_the_kept_snapshot(self):
        rc, _, _ = self.main("--no-haul", "--out", self.live)
        self.assertEqual(rc, 0)
        self.assertTrue(os.path.exists(self.live))


class TestHaul(unittest.TestCase):
    """The seam itself: a child process, a clock, and a reason in words."""

    def run_with(self, **kw):
        done = mock.Mock(returncode=kw.get("rc", 0), stdout=kw.get("out", ""), stderr=kw.get("err", ""))
        with mock.patch.object(N.subprocess, "run", return_value=done) as run:
            got = N.haul()
        return got, run

    def test_ok_is_none_and_it_ran_the_hauler_with_the_time_limit(self):
        got, run = self.run_with(out="  [note] x\nok (week 9: 488 rows)\n")
        self.assertIsNone(got)
        args, kwargs = run.call_args
        self.assertEqual(args[0], [sys.executable, N.SEASON_HAULER])
        self.assertEqual(kwargs["timeout"], N.HAUL_TIMEOUT)
        self.assertTrue(os.path.exists(N.SEASON_HAULER))

    def test_a_failure_returns_the_haulers_own_last_line(self):
        got, _ = self.run_with(rc=2, out="FAIL: /v1/state/nfl: timed out\n")
        self.assertEqual(got, "FAIL: /v1/state/nfl: timed out")

    def test_a_crash_returns_the_last_line_of_the_traceback(self):
        got, _ = self.run_with(rc=1, err="Traceback...\nKeyError: 'week'\n")
        self.assertEqual(got, "KeyError: 'week'")

    def test_exit_0_without_an_ok_line_is_not_trusted(self):
        got, _ = self.run_with(rc=0, out="")
        self.assertIn("said nothing", got)

    def test_a_pull_that_runs_out_the_clock_is_stopped_and_said(self):
        with mock.patch.object(N.subprocess, "run",
                               side_effect=N.subprocess.TimeoutExpired(cmd="x", timeout=N.HAUL_TIMEOUT)):
            self.assertEqual(N.haul(), "the pull was stopped after 300 seconds")


class TestTheDraftEditionIsUntouched(unittest.TestCase):
    def test_the_board_wire_still_carries_rank_and_tier(self):
        self.assertEqual(N._board_person({"name": "A B", "pos": "RB", "team": "DET", "r": 1, "tier": 2, "x": 9}),
                         {"name": "A B", "pos": "RB", "team": "DET", "r": 1, "tier": 2})

    def test_gameday_constants_are_the_ones_imported(self):
        self.assertIs(S.g, g)
        self.assertEqual(g.SWAP_MARGIN, 2.0)
        self.assertIn("Out", g.NOT_PLAYING)
        self.assertNotIn("Questionable", g.NOT_PLAYING)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""U15 -- the engine wrapper, and the typed refusals underneath it.

The load-bearing test in this file is `test_an_auction_is_not_caught_by_the_unreadable_handler`.
Everything else here checks that the right value reaches the engine; that one checks that a
wrapper written the obvious way -- catch the refusal, fall back to argv -- cannot quietly swallow
"this draft is an auction" along with "there is no cargo today". Those two conditions demand
opposite responses, they used to raise the same exception class, and the whole `shape.py` split
exists to keep them apart.

Per docs/insights/013, a guard needs a test at its CALL SITE, not only on the function. So the
env-var handoff is not tested by asserting `child_env()` builds the right dict -- it is tested by
running `draft_engine.py` as a subprocess and reading the roster needs it prints. Delete the
FF_STARTERS read from the engine and `TestEngineHonoursTheShape` goes red; assert only on the
dict and it stays green over a wrapper that talks to nobody.

Every refusal test here has a paired control proving the same path ACCEPTS the clean case. A
wrapper that refused everything would otherwise pass the lot.
"""
import itertools
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import run_engine as R  # noqa: E402
import shape as S  # noqa: E402

ENGINE = os.path.join(ROOT, "draft-kit", "draft_engine.py")

BRIGGSY = "1390750540631150592"


#: Every draft object gets its OWN filename. They used to share one path, so a test that wrote a
#: modified draft had it silently overwritten by the next default one -- and the test then failed
#: against the wrong file rather than the code. Unique names make that class of aliasing
#: impossible instead of merely unlikely.
_seq = itertools.count()


def write_draft(tmp, **over):
    """A clean, snake, 8x16 draft object -- then whatever the test wants changed."""
    d = {"draft_id": "111", "season": "2026", "status": "pre_draft", "start_time": None,
         "type": "snake", "draft_order": None,
         "settings": {"teams": 8, "rounds": 16, "reversal_round": 0, "slots_qb": 1,
                      "slots_rb": 2, "slots_wr": 2, "slots_te": 1, "slots_k": 1,
                      "slots_def": 1, "slots_flex": 2, "slots_bn": 6}}
    d.update({k: v for k, v in over.items() if k != "settings"})
    d["settings"].update(over.get("settings") or {})
    p = os.path.join(tmp, f"sleeper_draft_{next(_seq)}.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f)
    return p


class Tmp(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def draft(self, **over):
        return write_draft(self.tmp, **over)

    def resolve(self, slot=3, **kw):
        # NOT setdefault: its second argument evaluates eagerly, so `self.draft()` ran even when
        # the caller had supplied its own cargo -- writing a default draft object the test never
        # asked for. Three tests failed against that phantom file rather than against the code.
        if "cargo" not in kw:
            kw["cargo"] = self.draft()
        kw.setdefault("league_cargo", "/nonexistent")
        # Traded-picks and rosters cargo are pinned to a non-path for the SAME reason league_cargo
        # is: their real defaults live in `newsletter/data/inbox/`, which is gitignored. Left to
        # default, every test in this file would take the "cargo present, empty list" branch on
        # this laptop and the "cargo absent" branch on a clean clone -- both green, for different
        # reasons, which is the shape docs/insights/009 keeps catching. Tests that mean to
        # exercise traded picks pass the paths explicitly.
        kw.setdefault("traded_cargo", "/nonexistent")
        kw.setdefault("rosters_cargo", "/nonexistent")
        return R.resolve(slot, **kw)


# --------------------------------------------------------------- the typed refusals (shape.py)


class TestTypedRefusals(Tmp):
    def test_a_clean_draft_object_is_accepted(self):
        """The control. Without it, every refusal below could pass on a function that refuses
        everything."""
        sh = S.read_shape(self.draft(), "/nonexistent")
        self.assertEqual((sh["teams"], sh["rounds"], sh["type"]), (8, 16, "snake"))
        self.assertEqual(sh["starters"]["RB"], 2)
        self.assertEqual(sh["flex"], 2)

    def test_a_missing_draft_object_is_unreadable_not_unsupported(self):
        with self.assertRaises(S.CargoUnreadable):
            S.read_shape(os.path.join(self.tmp, "nope.json"), "/nonexistent")

    def test_truncated_cargo_is_unreadable_rather_than_a_traceback(self):
        """Half-written cargo is a real state -- the mule truncates on a dropped connection --
        and it used to escape as a raw JSONDecodeError, reaching the operator as a traceback."""
        p = os.path.join(self.tmp, "half.json")
        with open(p, "w", encoding="utf-8") as f:
            f.write('{"type": "snake", "settings": {"teams": 8,')
        with self.assertRaises(S.CargoUnreadable):
            S.read_shape(p, "/nonexistent")

    def test_a_draft_object_with_no_shape_fields_is_unreadable(self):
        with self.assertRaises(S.CargoUnreadable):
            S.read_shape(self.draft(settings={"teams": 0, "rounds": 0}), "/nonexistent")

    def test_an_auction_is_unsupported(self):
        with self.assertRaises(S.UnsupportedShape):
            S.read_shape(self.draft(type="auction"), "/nonexistent")

    def test_third_round_reversal_is_unsupported(self):
        with self.assertRaises(S.UnsupportedShape):
            S.read_shape(self.draft(settings={"reversal_round": 3}), "/nonexistent")

    def test_two_sources_disagreeing_about_team_count_is_unsupported(self):
        league = os.path.join(self.tmp, "league.json")
        with open(league, "w", encoding="utf-8") as f:
            json.dump({"settings": {"num_teams": 10}}, f)
        with self.assertRaises(S.UnsupportedShape):
            S.read_shape(self.draft(), league)

    def test_both_classes_are_still_refusals(self):
        """`build_board.py` catches `Refuse` in a dozen places and its tests assert on it. The
        split must be invisible to every existing caller."""
        self.assertTrue(issubclass(S.CargoUnreadable, S.Refuse))
        self.assertTrue(issubclass(S.UnsupportedShape, S.Refuse))

    def test_an_auction_is_not_caught_by_the_unreadable_handler(self):
        """THE ONE THAT MATTERS.

        A wrapper written the obvious way says `except Refuse: fall back to argv`. Written that
        way against the old single class, an auction draft degrades to typed defaults and the
        engine prints a complete, confident advisory on a pick order that is not this draft's --
        the integrity-gate landmine reached by a polite route. This asserts the handler a caller
        actually writes cannot see it.
        """
        with self.assertRaises(S.UnsupportedShape):
            try:
                S.read_shape(self.draft(type="auction"), "/nonexistent")
            except S.CargoUnreadable:                       # the degrade path -- must NOT fire
                self.fail("an auction draft was caught by the 'we cannot tell' handler and would "
                          "have degraded to typed defaults")

    def test_a_corrupt_league_object_does_not_sink_a_readable_draft(self):
        """The league object is a bonus source. Its absence already degrades silently, so a
        corrupt one must degrade the same way rather than crash a build the draft could finish."""
        league = os.path.join(self.tmp, "league.json")
        with open(league, "w", encoding="utf-8") as f:
            f.write("{ not json")
        self.assertEqual(S.read_shape(self.draft(), league)["teams"], 8)


# --------------------------------------------------------------- resolution (run_engine.resolve)


class TestResolve(Tmp):
    def test_teams_and_rounds_come_from_the_draft(self):
        plan, lines = self.resolve()
        self.assertEqual((plan["teams"], plan["rounds"]), (8, 16))
        self.assertIn("[draft] teams=8", lines)
        self.assertIn("[draft] rounds=16", lines)

    def test_the_rounds_the_draft_states_are_the_rounds_used(self):
        """`draft_engine.py 3 8 15` against a 16-round draft makes my_next None, so the engine
        goes silent about your own round-16 pick. The wrapper's whole job is that this cannot
        happen by omission."""
        plan, _ = self.resolve(cargo=self.draft(settings={"rounds": 15}))
        self.assertEqual(plan["rounds"], 15)

    def test_an_override_wins_and_says_so(self):
        plan, lines = self.resolve(rounds=15)
        self.assertEqual(plan["rounds"], 15)
        said = [ln for ln in lines if ln.startswith("[override] rounds=15")]
        self.assertTrue(said, f"the override was silent: {lines}")
        self.assertIn("THE OVERRIDE WINS", said[0])
        self.assertIn("draft object says rounds=16", said[0])

    def test_an_override_that_agrees_is_still_reported(self):
        _, lines = self.resolve(teams=8)
        self.assertTrue(any("[override] teams=8" in ln and "agrees" in ln for ln in lines))

    def test_the_roster_comes_from_the_draft(self):
        plan, lines = self.resolve()
        self.assertEqual(plan["starters"],
                         {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "K": 1, "DEF": 1})
        self.assertEqual(plan["flex"], 2)
        self.assertTrue(any("QB1 RB2 WR2 TE1 K1 DEF1" in ln and "2 FLEX" in ln for ln in lines))

    def test_a_changed_roster_slot_reaches_the_plan(self):
        """Nothing in the engine ever cross-checked the starter counts, so this is the half of
        KTD-8 that was failing silently rather than loudly."""
        plan, _ = self.resolve(cargo=self.draft(settings={"slots_rb": 3, "slots_flex": 1}))
        self.assertEqual(plan["starters"]["RB"], 3)
        self.assertEqual(plan["flex"], 1)

    def test_missing_cargo_degrades_with_a_stated_reason(self):
        plan, lines = self.resolve(cargo=os.path.join(self.tmp, "gone.json"))
        self.assertIsNone(plan["teams"])
        self.assertIsNone(plan["rounds"])
        self.assertIsNone(plan["starters"])
        self.assertTrue(any(ln.startswith("[degraded]") for ln in lines))
        self.assertTrue(any("no draft object at" in ln for ln in lines))

    def test_missing_cargo_says_the_engines_own_defaults_are_unchecked(self):
        """Never silently. The operator has to know the numbers in play were not verified."""
        _, lines = self.resolve(cargo=os.path.join(self.tmp, "gone.json"))
        unknown = [ln for ln in lines if ln.startswith("[unknown]")]
        self.assertTrue(any("teams" in ln and "NOT checked" in ln for ln in unknown))
        self.assertTrue(any("roster shape unreadable" in ln for ln in unknown))

    def test_nothing_invents_a_team_count_to_fill_the_gap(self):
        """Re-typing 8 and 16 here would be a second hand-maintained copy of league shape --
        the exact defect (KTD-1) this rebuild exists to remove."""
        plan, _ = self.resolve(cargo=os.path.join(self.tmp, "gone.json"))
        self.assertIsNone(plan["teams"])
        with open(os.path.join(ROOT, "scripts", "run_engine.py"), encoding="utf-8") as f:
            src = f.read()
        self.assertNotIn("DEFAULT_TEAMS", src)
        self.assertNotIn("DEFAULT_ROUNDS", src)

    def test_an_unsupported_shape_propagates_out_of_resolve(self):
        with self.assertRaises(S.UnsupportedShape):
            self.resolve(cargo=self.draft(type="auction"))

    def test_the_seat_is_derived_from_draft_order(self):
        cargo = self.draft(draft_order={BRIGGSY: 6, "other": 2})
        plan, lines = R.resolve(None, cargo=cargo, league_cargo="/nonexistent")
        self.assertEqual(plan["slot"], 6)
        self.assertTrue(any("slot=6" in ln and "draft_order" in ln for ln in lines))

    def test_no_seat_and_no_draft_order_refuses(self):
        with self.assertRaises(R.NoSeat):
            R.resolve(None, cargo=self.draft(), league_cargo="/nonexistent")

    def test_the_seat_refusal_carries_the_derivation_so_far(self):
        """Being told the seat is unknowable is far more useful beside what the cargo DID say."""
        try:
            R.resolve(None, cargo=self.draft(), league_cargo="/nonexistent")
        except R.NoSeat as e:
            self.assertTrue(any("teams=8" in ln for ln in e.lines))
            self.assertIn(BRIGGSY, e.detail)
        else:
            self.fail("expected NoSeat")

    def test_a_stated_seat_is_used_as_given(self):
        plan, lines = self.resolve(slot=7)
        self.assertEqual(plan["slot"], 7)
        self.assertTrue(any("[given] slot=7" in ln for ln in lines))


class TestContaminationGate(Tmp):
    """The gate is optional today and a human under a 120-second clock forgets it. Arming it
    automatically is the win -- but arming it from STALE cargo would refuse a correct run."""

    def test_fresh_cargo_arms_the_gate_automatically(self):
        self.addCleanup(setattr, R, "freshness", R.freshness)
        R.freshness = lambda cargo: ([], "fresh")
        plan, lines = self.resolve()
        self.assertEqual(plan["draft_id"], "111")
        self.assertTrue(any("contamination gate armed automatically" in ln for ln in lines))

    def test_stale_cargo_holds_the_id_back_and_explains_why(self):
        """insight 009: a false red is the more dangerous direction, because it teaches the
        operator to skip the gate. A re-created draft plus day-old cargo is exactly that."""
        self.addCleanup(setattr, R, "freshness", R.freshness)
        R.freshness = lambda cargo: (["last mule run was 900 minutes ago"], "stale")
        plan, lines = self.resolve()
        self.assertIsNone(plan["draft_id"])
        held = [ln for ln in lines if ln.startswith("[held back]")]
        self.assertTrue(held, f"the id was dropped with no explanation: {lines}")
        self.assertIn("--draft-id", held[0])
        self.assertTrue(any(ln.startswith("[stale]") for ln in lines))

    def test_an_explicit_id_wins_over_stale_cargo(self):
        self.addCleanup(setattr, R, "freshness", R.freshness)
        R.freshness = lambda cargo: (["stale"], "stale")
        plan, lines = self.resolve(draft_id="999")
        self.assertEqual(plan["draft_id"], "999")
        self.assertTrue(any("[given] draft_id=999" in ln for ln in lines))

    def test_no_id_anywhere_warns_the_gate_is_disarmed(self):
        _, lines = self.resolve(cargo=os.path.join(self.tmp, "gone.json"))
        self.assertTrue(any("contamination gate is NOT armed" in ln for ln in lines))


# --------------------------------------------------------------- the handoff to the engine


class TestCommand(unittest.TestCase):
    def plan(self, **over):
        p = {"slot": 3, "teams": 8, "rounds": 16, "draft_id": "111",
             "starters": {"RB": 2}, "flex": 2}
        p.update(over)
        return p

    def test_the_full_command_is_in_positional_order(self):
        argv = R.command(self.plan())
        self.assertEqual(argv[2:], ["3", "8", "16", "111"])

    def test_a_missing_teams_value_stops_the_sequence_rather_than_shifting_it(self):
        """teams and rounds are positional 2 and 3. Emitting rounds with no teams ahead of it
        would put a round count in the team-count slot -- a complete, confident advisory for a
        draft shape that does not exist."""
        argv = R.command(self.plan(teams=None))
        self.assertEqual(argv[2:], ["3"])
        self.assertEqual(R.positional_gap(self.plan(teams=None)), ["rounds", "draft_id"])

    def test_a_missing_rounds_value_withholds_the_draft_id(self):
        self.assertEqual(R.command(self.plan(rounds=None))[2:], ["3", "8"])
        self.assertEqual(R.positional_gap(self.plan(rounds=None)), ["draft_id"])

    def test_a_complete_plan_has_no_gap(self):
        self.assertEqual(R.positional_gap(self.plan()), [])

    def test_no_shape_at_all_still_launches_with_the_seat(self):
        p = self.plan(teams=None, rounds=None, draft_id=None)
        self.assertEqual(R.command(p)[2:], ["3"])
        self.assertEqual(R.positional_gap(p), [])


class TestChildEnv(unittest.TestCase):
    def test_the_shape_is_handed_over_as_json(self):
        env = R.child_env({"starters": {"RB": 3, "QB": 1}, "flex": 1})
        self.assertEqual(json.loads(env["FF_STARTERS"]), {"RB": 3, "QB": 1})
        self.assertEqual(env["FF_FLEX"], "1")

    def test_an_inherited_value_is_stripped_when_the_shape_is_unknown(self):
        """A stale FF_STARTERS exported in the operator's shell from an earlier run against a
        different league is precisely the invisible wrong input this unit exists to remove."""
        self.addCleanup(os.environ.pop, "FF_STARTERS", None)
        self.addCleanup(os.environ.pop, "FF_FLEX", None)
        os.environ["FF_STARTERS"] = '{"RB": 99}'
        os.environ["FF_FLEX"] = "99"
        env = R.child_env({"starters": None, "flex": None})
        self.assertNotIn("FF_STARTERS", env)
        self.assertNotIn("FF_FLEX", env)


# --------------------------------------------------------------- the call site (insight 013)


class TestEngineHonoursTheShape(unittest.TestCase):
    """Run the real engine and read what it prints.

    Asserting `child_env()` returns the right dict proves nothing about whether the engine reads
    it -- that is exactly the shape of the six guards in insight 013 that had tests for the
    function and none for the call site. Delete the FF_STARTERS read from `draft_engine.py` and
    these go red.
    """

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        board = {"meta": {"badges": {}},
                 "players": [{"r": i, "name": f"Player {i}", "pos": p, "team": "PHI",
                              "pr": i, "tier": 1, "badges": []}
                             for i, p in enumerate(
                                 ["RB", "RB", "RB", "WR", "WR", "WR", "TE", "QB", "K", "DEF"], 1)]}
        with open(os.path.join(self.tmp, "players_data.json"), "w", encoding="utf-8") as f:
            json.dump(board, f)
        # Two teams, four rounds. Seat 1 takes exactly two RB and two WR, so the starter counts
        # are met precisely -- which is what makes a one-slot change visible in the needs line.
        picks = []
        for n, (slot, pos, nm) in enumerate(
                [(1, "RB", "Player 1"), (2, "RB", "Player 2"), (2, "WR", "Player 4"),
                 (1, "RB", "Player 3"), (1, "WR", "Player 5"), (2, "WR", "Player 6"),
                 (2, "TE", "Player 7"), (1, "WR", "Player 6b")], 1):
            first, _, last = nm.partition(" ")
            picks.append({"pick_no": n, "draft_slot": slot, "draft_id": "111",
                          "player_id": f"p{n}", "picked_by": "someone",
                          "metadata": {"first_name": first, "last_name": last,
                                       "position": pos, "team": "PHI"}})
        with open(os.path.join(self.tmp, "picks.json"), "w", encoding="utf-8") as f:
            json.dump(picks, f)

    def run_engine(self, **env_over):
        env = os.environ.copy()
        env.pop("FF_STARTERS", None)
        env.pop("FF_FLEX", None)
        env.update({k: v for k, v in env_over.items() if v is not None})
        out = subprocess.run([sys.executable, ENGINE, "1", "2", "4"], cwd=self.tmp, env=env,
                             capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(out.returncode, 0, f"engine exited {out.returncode}\n{out.stderr}")
        return out.stdout

    def seat_one(self, stdout):
        for ln in stdout.splitlines():
            if ln.startswith("slot 1:"):
                return ln
        self.fail(f"no seat-1 line in:\n{stdout}")

    def test_the_built_in_shape_is_unchanged_when_nothing_is_passed(self):
        """The control. A bare run must behave exactly as it always has."""
        line = self.seat_one(self.run_engine())
        self.assertIn("RB2", line)
        self.assertNotIn("RBx", line)          # two RB meets the built-in requirement of two
        self.assertIn("FLEXx2", line)          # ...and leaves no bodies over for two flex slots

    def test_a_third_required_rb_reaches_the_needs_line(self):
        line = self.seat_one(self.run_engine(
            FF_STARTERS='{"QB": 1, "RB": 3, "WR": 2, "TE": 1, "K": 1, "DEF": 1}'))
        self.assertIn("RBx1", line)

    def test_the_flex_count_reaches_the_needs_line(self):
        self.assertIn("FLEXx2", self.seat_one(self.run_engine()))
        self.assertNotIn("FLEX", self.seat_one(self.run_engine(FF_FLEX="0")))

    def test_a_league_with_no_kicker_stops_asking_for_one(self):
        """A draft-supplied roster need not carry every key the file once hardcoded. Indexing
        STARTERS with [] instead of .get() would raise a KeyError on draft morning."""
        line = self.seat_one(self.run_engine(
            FF_STARTERS='{"QB": 1, "RB": 2, "WR": 2, "TE": 1, "DEF": 1}'))
        self.assertNotIn("Kx", line)
        self.assertIn("DEFx1", line)

    def test_the_engine_reports_that_it_used_the_supplied_shape(self):
        out = self.run_engine(FF_STARTERS='{"RB": 2}', FF_FLEX="1")
        self.assertIn("starter slots from the draft object", out)
        self.assertIn("1 FLEX from the draft object", out)

    def test_a_malformed_shape_falls_back_and_says_so(self):
        """Never crash on draft morning -- and never let 'I could not read what you sent' print
        like 'I am using what you sent'."""
        out = self.run_engine(FF_STARTERS="{not json")
        self.assertIn("[unverified]", out)
        self.assertIn("FF_STARTERS was set but is unusable", out)
        self.assertIn("FLEXx2", self.seat_one(out))          # built-ins back in force

    def test_a_boolean_slot_count_is_rejected_rather_than_read_as_one(self):
        """JSON `true` parses to a Python bool, and bool is a subclass of int -- so {"QB": true}
        would otherwise sail through as QB=1."""
        out = self.run_engine(FF_STARTERS='{"QB": true, "RB": 2}')
        self.assertIn("FF_STARTERS was set but is unusable", out)

    def test_a_negative_slot_count_is_rejected(self):
        self.assertIn("unusable", self.run_engine(FF_STARTERS='{"QB": -1}'))

    def test_an_all_zero_roster_is_rejected(self):
        self.assertIn("unusable", self.run_engine(FF_STARTERS='{"QB": 0, "RB": 0}'))

    def test_a_nonsense_flex_count_falls_back_and_says_so(self):
        out = self.run_engine(FF_FLEX="two")
        self.assertIn("FF_FLEX was set to 'two'", out)
        self.assertIn("FLEXx2", self.seat_one(out))


# ------------------------------------------------------------------- traded picks (2026-08-17)


class TestTradedPicks(Tmp):
    """`/traded_picks` had ZERO readers in this repo until 2026-08-17, and one traded pick
    falsifies "your next pick is #N" and "picks until you" for the rest of the draft -- silently,
    exit 0, with the integrity gate green. It has been `[]` since 2026-08-07, which is exactly why
    nothing noticed.

    THE POINT OF THIS CLASS IS THE SPLIT, not the refusal. Refusing on ANY traded pick is the
    obvious build and the wrong one: a trade between two other teams moves none of our numbers,
    and hard-stopping the war room for it is a false red -- the direction docs/insights/009 records
    as the more dangerous one, because it teaches the operator to skip the gate. So every refusal
    test below is paired with a control proving the same path ACCEPTS the case it must accept.

    Every branch here was positive-controlled live against the real wrapper before these tests
    were written (exit 2 / 0 / 0 / 0 / 2 across the five cases), so they lock observed behaviour
    rather than asserting the author's intent -- docs/insights/019.
    """

    def rosters(self, owner_of_3=BRIGGSY):
        p = os.path.join(self.tmp, f"rosters_{next(_seq)}.json")
        # Mirrors the live shape read from /league/<id>/rosters on 2026-08-17: roster 3 is ours,
        # roster 1 is briggsy007 -- who is HUNTER, not Briggsy (CLAUDE.md's identity landmine).
        with open(p, "w", encoding="utf-8") as f:
            json.dump([{"roster_id": 1, "owner_id": "959308419154886656"},
                       {"roster_id": 2, "owner_id": "959230356757045248"},
                       {"roster_id": 3, "owner_id": owner_of_3}], f)
        return p

    def traded(self, *entries):
        p = os.path.join(self.tmp, f"traded_{next(_seq)}.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(list(entries), f)
        return p

    @staticmethod
    def pick(roster_id, prev, new, rnd=4):
        return {"season": "2026", "round": rnd, "roster_id": roster_id,
                "previous_owner_id": prev, "owner_id": new, "draft_id": "111"}

    # --- the controls, first. Without these, a function that refused everything would pass. ---

    def test_an_empty_traded_list_is_accepted_and_says_the_snake_is_plain(self):
        plan, lines = self.resolve(traded_cargo=self.traded(), rosters_cargo=self.rosters())
        self.assertTrue(plan["traded"]["checked"])
        self.assertEqual(plan["traded"]["count"], 0)
        self.assertTrue(any("traded picks: none" in ln for ln in lines))

    def test_a_trade_between_two_OTHER_teams_does_not_stop_the_run(self):
        """THE LOAD-BEARING CONTROL. Our pick numbers are untouched by roster 1 -> roster 2, so
        refusing here would cost the whole advisory for something that cannot move a single number
        we print."""
        plan, lines = self.resolve(traded_cargo=self.traded(self.pick(1, 1, 2)),
                                   rosters_cargo=self.rosters())
        self.assertEqual(len(plan["traded"]["others"]), 1)
        self.assertEqual(plan["traded"]["ours"], [])
        # ...and it must still be LOUD. A warning nobody reads is the same as no warning.
        #
        # THE ASSERTION IS ON THE HEADLINE LINE ITSELF, not on "some line shouts". The first
        # version of this test asked `any(ln.startswith("!!"))`, and mutant M6 -- which downgrades
        # only the headline -- SURVIVED it, because the per-pick detail lines underneath still
        # start with `!!`. A test that passes while the thing it names goes quiet is exactly
        # docs/insights/013's shape, caught here by the mutation run rather than on draft night.
        headline = [ln for ln in lines if "none of them ours" in ln]
        self.assertEqual(len(headline), 1)
        self.assertTrue(headline[0].startswith("!!"), headline[0])

    # --- the refusals ---

    def test_a_traded_pick_that_is_OURS_refuses(self):
        with self.assertRaises(S.UnsupportedShape) as cm:
            self.resolve(traded_cargo=self.traded(self.pick(3, 3, 5)),
                         rosters_cargo=self.rosters())
        self.assertIn("OUR roster (3)", str(cm.exception))

    def test_a_pick_traded_TO_us_refuses_too_not_only_one_traded_away(self):
        """`previous_owner_id` and `owner_id` are BOTH checked. A pick acquired changes our pick
        set exactly as much as a pick sold, and testing only the sold direction would leave half
        the guard dead -- docs/insights/019's whole lesson."""
        with self.assertRaises(S.UnsupportedShape):
            self.resolve(traded_cargo=self.traded(self.pick(6, 6, 3)),
                         rosters_cargo=self.rosters())

    def test_traded_picks_with_no_rosters_cargo_refuses_rather_than_guessing(self):
        """"Might be ours" is not a state anyone can draft from."""
        with self.assertRaises(S.UnsupportedShape) as cm:
            self.resolve(traded_cargo=self.traded(self.pick(1, 1, 2)),
                         rosters_cargo="/nonexistent")
        self.assertIn("roster_id could not be derived", str(cm.exception))
        # The remedy must be IN the refusal. A refusal that does not say how to clear itself is a
        # dead end under a 120-second clock.
        self.assertIn("rosters", str(cm.exception))

    # --- absence is reported, never silently passed ---

    def test_a_missing_traded_cargo_does_not_block_the_run_but_is_declared(self):
        """A dead mule must not also cost the advisory -- but a check that silently passes when
        its input is missing is the gate that could never fire, which this repo has caught twice.
        So: run, and say out loud that it was NOT checked."""
        plan, lines = self.resolve(traded_cargo="/nonexistent", rosters_cargo=self.rosters())
        self.assertFalse(plan["traded"]["checked"])
        self.assertTrue(any("NOT checked" in ln for ln in lines))

    def test_malformed_traded_cargo_is_declared_unchecked_rather_than_crashing(self):
        p = os.path.join(self.tmp, "broken.json")
        with open(p, "w", encoding="utf-8") as f:
            f.write("{not json")
        plan, lines = self.resolve(traded_cargo=p, rosters_cargo=self.rosters())
        self.assertFalse(plan["traded"]["checked"])
        self.assertTrue(any("NOT checked" in ln for ln in lines))

    # --- roster_id derivation: the one number this whole guard is denominated in ---

    def test_our_roster_id_is_derived_from_the_owner_id_never_from_a_constant(self):
        rid, note = S.our_roster_id(self.rosters(), user_id=BRIGGSY)
        self.assertEqual(rid, 3)
        self.assertIn(BRIGGSY, note)

    def test_roster_id_moves_when_the_cargo_says_it_moved(self):
        """The positive control against a hardcoded 3. `docs/league.md` states roster_id 3 in
        prose and there are THREE unrelated "3"s in this league -- if this function ever starts
        returning the doc's number instead of the cargo's, this test is what says so."""
        p = os.path.join(self.tmp, "moved.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump([{"roster_id": 7, "owner_id": BRIGGSY}], f)
        self.assertEqual(S.our_roster_id(p, user_id=BRIGGSY)[0], 7)

    def test_two_rosters_claiming_us_is_not_derivable(self):
        """Picking the first of two would be docs/insights/010 -- one candidate treated as proof
        of identity -- committed with two."""
        p = os.path.join(self.tmp, "dupe.json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump([{"roster_id": 3, "owner_id": BRIGGSY},
                       {"roster_id": 5, "owner_id": BRIGGSY}], f)
        rid, note = S.our_roster_id(p, user_id=BRIGGSY)
        self.assertIsNone(rid)
        self.assertIn("expected exactly 1", note)

    def test_shape_py_refuses_to_own_the_user_id_constant(self):
        """There is exactly one BRIGGSY_USER_ID in this repo and it lives in watch_draft_state.
        A default here would make a second one, and the two would drift."""
        with self.assertRaises(ValueError):
            S.our_roster_id(self.rosters())


if __name__ == "__main__":
    unittest.main()

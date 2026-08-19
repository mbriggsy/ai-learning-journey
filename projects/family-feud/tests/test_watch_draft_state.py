#!/usr/bin/env python3
"""Tests for scripts/watch_draft_state.py -- the draft-state watcher.

    python3 -m unittest discover -s tests -v        (from the project root)

Why these exist: this watcher's entire job is to speak up once, at a moment nobody is watching
for. Every failure mode is silence, and silence is exactly what a passing smoke test looks like.
So the negative controls here are load-bearing -- TestSilenceIsEarned proves the alert does NOT
fire when it shouldn't, and TestStaleCargoIsNotQuiet proves a dead mule cannot masquerade as a
quiet league.

No network and no clock. The module's INBOX/STATE/SNAPSHOT/ALERTS paths are redirected into a
tmpdir and now() is pinned, so a test can never touch real cargo and never depends on wall time.
"""
import datetime
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
import watch_draft_state as w  # noqa: E402

BRIGGSY = "1390750540631150592"
REAL = "1390509994847240192"

# Aug 29 2026, 7:00 PM local, in the epoch MILLISECONDS Sleeper actually ships.
DRAFT_DAY = datetime.datetime(2026, 8, 29, 19, 0)
AUG29 = int(DRAFT_DAY.timestamp() * 1000)
AUG22 = int(datetime.datetime(2026, 8, 22, 19, 0).timestamp() * 1000)
# A reschedule target, deliberately LATER so a stale fired-flag would have room to suppress it.
SEP5_DAY = datetime.datetime(2026, 9, 5, 19, 0)
SEP5 = int(SEP5_DAY.timestamp() * 1000)

# The default wall clock. It sits 21 days 23 hours before DRAFT_DAY, which is OUTSIDE every
# countdown threshold -- that is load-bearing, because it is what keeps the transition tests below
# free of countdown entries they never asked for.
PINNED = datetime.datetime(2026, 8, 7, 20, 0, 0)


def draft(start_time=None, status="pre_draft", draft_order=None):
    """A Sleeper draft object, shaped like the real one verified on 2026-08-07.

    slot_to_roster_id is always the identity map, because that is the trap: it is present, it
    looks authoritative, and reading a slot from it yields a confident wrong answer.
    """
    return {"draft_id": REAL, "start_time": start_time, "status": status,
            "draft_order": draft_order,
            "slot_to_roster_id": {str(i): i for i in range(1, 9)},
            "settings": {"teams": 8, "rounds": 16, "pick_timer": 120}}


def users(*names):
    return [{"user_id": BRIGGSY if n == "PoppaBriggsy" else f"u{i}", "display_name": n}
            for i, n in enumerate(names)]


SIX = ("MattiICE23", "RMonk9", "briggsy007", "Kaeperni", "BuschLight420", "PoppaBriggsy")
FOUR = SIX[:4]


class WatchCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.inbox = os.path.join(self.tmp.name, "inbox")
        self.state = os.path.join(self.tmp.name, "state")
        os.makedirs(self.inbox)
        os.makedirs(self.state)
        self._saved = (w.INBOX, w.STATE, w.SNAPSHOT, w.ALERTS, w.now)
        w.INBOX = self.inbox
        w.STATE = self.state
        w.SNAPSHOT = os.path.join(self.state, "last_seen.json")
        w.ALERTS = os.path.join(self.state, "DRAFT_ALERTS.md")
        # The clock is an ATTRIBUTE, not a constant, because the countdown tests have to advance
        # it. Everything that fabricates cargo below reads self.clock rather than PINNED, so
        # moving the clock moves the fixtures with it -- otherwise the first advance would make
        # every file on disk look hours stale and CARGO IS STALE would drown the test.
        self.clock = PINNED
        w.now = lambda: self.clock

    def tearDown(self):
        w.INBOX, w.STATE, w.SNAPSHOT, w.ALERTS, w.now = self._saved
        self.tmp.cleanup()

    def put_league(self, draft_id=REAL):
        """sleeper_league.json — the mule hauls it beside the draft object, and it names the
        league's CURRENT draft_id. The draft object's own URL is pinned, so this is the only
        thing on disk that can notice the commissioner re-created the draft."""
        self._write(os.path.join(self.inbox, "sleeper_league.json"),
                    {"league_id": "L", "draft_id": draft_id, "total_rosters": 8})

    def age_file(self, name, minutes):
        """Backdate a cargo file's mtime. Freshness has to be measured per FILE, not per mule
        RUN -- one failed source leaves yesterday's file on disk while run_at is minutes old."""
        path = os.path.join(self.inbox, name)
        stamp = (self.clock - datetime.timedelta(minutes=minutes)).timestamp()
        os.utime(path, (stamp, stamp))

    def put_cargo(self, d=None, u=None, age_minutes=5):
        """Write cargo plus a mule_status.json whose run_at is `age_minutes` before the pinned now.

        mule_status.json is written with a BOM on purpose -- PowerShell 5.1 writes one, and the
        module must read it with utf-8-sig. A test that writes clean UTF-8 here would pass while
        the real file raised.
        """
        if d is not None:
            self._write(os.path.join(self.inbox, "sleeper_draft.json"), d)
        if u is not None:
            self._write(os.path.join(self.inbox, "sleeper_users.json"), u)
        if age_minutes is not None:
            run_at = (self.clock - datetime.timedelta(minutes=age_minutes)).strftime("%Y-%m-%d %H:%M:%S")
            with open(os.path.join(self.inbox, "mule_status.json"), "w", encoding="utf-8-sig") as f:
                json.dump({"run_at": run_at, "machine": "test", "sources": {}}, f)

    @staticmethod
    def _write(path, obj):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f)

    def run_watch(self):
        """Returns (exit_code, stdout). SystemExit is captured, not raised."""
        buf = io.StringIO()
        try:
            with redirect_stdout(buf):
                code = w.main()
        except SystemExit as e:
            code = e.code if isinstance(e.code, int) else 1
            if isinstance(e.code, str):
                buf.write(e.code)
        return code, buf.getvalue()

    def alerts(self):
        """The alert FILE, which is the real deliverable. Assert against this, not stdout."""
        if not os.path.exists(w.ALERTS):
            return ""
        with open(w.ALERTS, encoding="utf-8") as f:
            return f.read()

    def entry(self, title):
        """Just the one alert entry, so an assertion cannot pass on text from a sibling entry."""
        blocks = self.alerts().split("\n---\n")
        return next((b for b in blocks if f"## {title}" in b), "")

    def baseline(self, d=None, u=None):
        """Run once to establish the snapshot, then discard the output."""
        self.put_cargo(d if d is not None else draft(), u if u is not None else users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 0, "baseline run must be silent")
        self.assertEqual(self.alerts(), "", "baseline must not write an alert")


class TestTheStartingGun(WatchCase):
    """start_time going non-null is the one event this whole unit exists to catch."""

    def test_start_time_appearing_fires_and_names_the_date(self):
        self.baseline()
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        code, out = self.run_watch()
        self.assertEqual(code, 1)
        entry = self.entry("STARTING GUN")
        self.assertTrue(entry, "STARTING GUN entry must exist in the alert file")
        self.assertIn("29 Aug 2026", entry, "the alert must name the actual date, not just say one exists")
        self.assertIn("Rebuild it", entry)

    def test_it_fires_exactly_once(self):
        self.baseline()
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        self.run_watch()
        first = self.alerts()
        code, _ = self.run_watch()          # same cargo, second run
        self.assertEqual(code, 0, "an unchanged start_time must not re-fire")
        self.assertEqual(self.alerts(), first, "the alert file must not grow on a no-op run")

    def test_a_moved_date_fires_again_and_names_both(self):
        """The reason this unit exists: ~Aug 29 is a handshake and it can move EARLIER."""
        self.baseline(draft(start_time=AUG29))
        self.put_cargo(draft(start_time=AUG22), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        entry = self.entry("DRAFT DATE MOVED")
        self.assertIn("22 Aug 2026", entry)
        self.assertIn("29 Aug 2026", entry, "a moved date must name the OLD date too, not just the new one")

    def test_start_time_cleared_is_reported(self):
        self.baseline(draft(start_time=AUG29))
        self.put_cargo(draft(start_time=None), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertIn("29 Aug 2026", self.entry("DRAFT DATE UNSET"))


class TestSlotComesFromDraftOrderOnly(WatchCase):
    """slot_to_roster_id is an identity map. Reading a slot from it is a documented landmine."""

    def test_slot_is_read_from_draft_order(self):
        self.baseline()
        # 7 disagrees with anything slot_to_roster_id could suggest, so a wrong source is visible.
        self.put_cargo(draft(draft_order={BRIGGSY: 7}), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        entry = self.entry("YOUR SLOT EXISTS")
        self.assertIn(f'draft_order["{BRIGGSY}"] = 7', entry)
        self.assertIn("run_engine.py 7", entry, "the ready-to-run command must carry the real slot")
        self.assertNotIn("draft_engine.py", entry,
                         "draft_engine.py does not exist at the repo root -- this alert used to "
                         "print `python draft_engine.py 7 8 16 <draft_id>`, which cannot run from "
                         "anywhere, with a LITERAL <draft_id> placeholder. It fires at the exact "
                         "moment the seat appears, which is when a dead command costs most.")

    def test_alert_warns_against_slot_to_roster_id(self):
        self.baseline()
        self.put_cargo(draft(draft_order={BRIGGSY: 7}), users(*SIX))
        self.run_watch()
        self.assertIn("slot_to_roster_id", self.entry("YOUR SLOT EXISTS"),
                      "the alert must name the trap, since the wrong answer looks plausible")

    def test_draft_order_without_briggsy_does_not_claim_a_slot(self):
        """A populated draft_order that omits him is not 'your slot exists'."""
        self.baseline()
        self.put_cargo(draft(draft_order={"999": 4}), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(self.entry("YOUR SLOT EXISTS"), "",
                         "must not announce a slot when his user_id is absent from draft_order")


class TestRoomFilling(WatchCase):
    """The room going 4 -> 6 in one day is what made this unit urgent."""

    def test_new_managers_are_named(self):
        self.baseline(u=users(*FOUR))
        self.put_cargo(draft(), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        entry = self.entry("LEAGUE ROSTER CHANGED")
        self.assertIn("4 -> 6 of 8", entry)
        self.assertIn("BuschLight420", entry)
        self.assertIn("PoppaBriggsy", entry)

    def test_full_room_says_so(self):
        self.baseline(u=users(*SIX))
        self.put_cargo(draft(), users(*SIX, "Newbie7", "Newbie8"))
        self.run_watch()
        self.assertIn("room is FULL", self.entry("LEAGUE ROSTER CHANGED"))

    def test_a_manager_leaving_is_reported(self):
        self.baseline(u=users(*SIX))
        self.put_cargo(draft(), users(*FOUR))
        self.run_watch()
        self.assertIn("left:", self.entry("LEAGUE ROSTER CHANGED"))


class TestSilenceIsEarned(WatchCase):
    """Negative control. Every failure mode of this watcher looks like silence, so silence
    itself has to be proven correct rather than assumed."""

    def test_no_change_writes_nothing_and_exits_zero(self):
        self.baseline()
        code, out = self.run_watch()
        self.assertEqual(code, 0)
        self.assertEqual(self.alerts(), "", "an unchanged league must not write an alert file")
        self.assertIn("no change", out)

    def test_no_change_does_not_churn_the_alert_file(self):
        self.baseline()
        for _ in range(5):
            self.run_watch()
        self.assertFalse(os.path.exists(w.ALERTS), "five quiet runs must not create the alert file")

    def test_first_run_establishes_baseline_silently(self):
        self.put_cargo(draft(), users(*SIX))
        code, out = self.run_watch()
        self.assertEqual(code, 0)
        self.assertEqual(self.alerts(), "",
                         "the first run must not alert on everything it sees -- that trains the "
                         "reader to ignore the file")
        self.assertIn("baseline established", out)
        self.assertTrue(os.path.exists(w.SNAPSHOT))
        # Caught by running it for real, not by this suite: save() writes the snapshot before the
        # "was there a previous one?" check, so a clean first run accused its own brand-new file
        # of being unreadable. Asserting the right message is present does not prove the wrong
        # one is absent.
        self.assertNotIn("unreadable", out,
                         "a clean first run must not report a previous snapshot it never had")


class TestStaleCargoIsNotQuiet(WatchCase):
    """The signature failure of this project, fourth instance. The watcher decides 'nothing
    changed' by diffing cargo; if the mule dies the cargo stops changing and that verdict becomes
    'all quiet' forever -- indistinguishable from a genuinely uneventful league."""

    def test_stale_cargo_raises_its_own_alert(self):
        self.baseline()
        self.put_cargo(draft(), users(*SIX), age_minutes=400)
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "stale cargo must not exit 0 alongside a reassuring 'no change'")
        entry = self.entry("CARGO IS STALE — THIS WATCHER IS BLIND")
        self.assertIn("400 minutes ago", entry)
        self.assertIn("install-mule.ps1", entry, "the alert must name the fix")

    def test_fresh_cargo_raises_no_stale_alert(self):
        """Negative control for the guard itself -- a guard that always fires is not a guard."""
        self.baseline()
        self.put_cargo(draft(start_time=AUG29), users(*SIX), age_minutes=5)
        self.run_watch()
        self.assertEqual(self.entry("CARGO IS STALE — THIS WATCHER IS BLIND"), "")

    def test_stale_on_first_run_still_alerts(self):
        self.put_cargo(draft(), users(*SIX), age_minutes=400)
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertIn("CARGO IS STALE", self.alerts())

    def test_missing_mule_status_is_treated_as_stale(self):
        """Absence of the freshness signal is not permission to trust the diff."""
        self.baseline()
        os.remove(os.path.join(self.inbox, "mule_status.json"))
        self.put_cargo(draft(), users(*SIX), age_minutes=None)
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertIn("CARGO IS STALE", self.alerts())

    def test_mule_status_bom_is_read(self):
        """PowerShell 5.1 writes a BOM; encoding='utf-8' raises on it. Pinning this because the
        blanket project rule is utf-8 and this file is the documented exception."""
        self.baseline()
        self.put_cargo(draft(), users(*SIX), age_minutes=5)
        with open(os.path.join(self.inbox, "mule_status.json"), "rb") as f:
            raw = f.read()
        self.assertTrue(raw.startswith(b"\xef\xbb\xbf"), "fixture must actually carry a BOM")
        code, out = self.run_watch()
        self.assertEqual(code, 0)
        self.assertIn("5 min old", out, "freshness must be readable through the BOM")


class TestDegradesLoudly(WatchCase):
    """Missing or corrupt cargo must say so. A watcher that crashes goes quiet exactly when
    something is wrong, which is the one thing it may never do."""

    def test_missing_cargo_reports_and_does_not_crash(self):
        code, out = self.run_watch()
        self.assertEqual(code, 2)
        self.assertIn("COULD NOT READ THE CARGO", out)
        self.assertIn("sleeper_draft.json is missing", out)

    def test_corrupt_json_reports_the_file_and_the_reason(self):
        self.put_cargo(draft(), users(*SIX))
        with open(os.path.join(self.inbox, "sleeper_draft.json"), "w", encoding="utf-8") as f:
            f.write("{not json")
        code, out = self.run_watch()
        self.assertEqual(code, 2)
        self.assertIn("sleeper_draft.json is not valid JSON", out)

    def test_null_cargo_is_rejected_by_shape_not_traceback(self):
        """curl against a bad id returns the literal string `null`; that is a live scenario here
        exactly as it was for picks.json."""
        self.put_cargo(None, users(*SIX))
        with open(os.path.join(self.inbox, "sleeper_draft.json"), "w", encoding="utf-8") as f:
            f.write("null")
        code, out = self.run_watch()
        self.assertEqual(code, 2)
        self.assertIn("expected an object", out)

    def test_corrupt_snapshot_re_establishes_baseline(self):
        """This test's ORIGINAL expectation encoded the defect: it asserted exit 0.

        Exiting 0 was exactly how the alert got lost -- a silent re-baseline against today's
        cargo, with the only trace a `note:` on a scheduled task's stdout. The intent below is
        unchanged and still right (rebuild, do not crash); what changed is that rebuilding is now
        an EVENT, reported to the alert file at exit 1. Kept rather than deleted, because "must
        not crash" is a real requirement -- see TestALostBaselineIsNotAFreshStart for the rest.
        """
        self.baseline()
        with open(w.SNAPSHOT, "w", encoding="utf-8") as f:
            f.write("{broken")
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        code, out = self.run_watch()
        self.assertEqual(code, 1, "a lost baseline must be reported, not swallowed at exit 0")
        self.assertIn("BASELINE LOST", out)
        # the rebuild still happened, which is what the original assertion was protecting
        self.assertTrue(os.path.exists(w.SNAPSHOT))
        with open(w.SNAPSHOT, encoding="utf-8") as f:
            self.assertEqual(json.load(f)["start_time"], AUG29)


class TestAlertFileShape(WatchCase):
    """The file IS the delivery mechanism -- push and email are broken account-wide."""

    def test_entries_are_appended_not_overwritten(self):
        self.baseline(u=users(*FOUR))
        self.put_cargo(draft(), users(*SIX))
        self.run_watch()
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        self.run_watch()
        text = self.alerts()
        self.assertIn("LEAGUE ROSTER CHANGED", text)
        self.assertIn("STARTING GUN", text,
                      "a later alert must not overwrite an earlier one nobody has read yet")

    def test_every_entry_carries_when_it_fired(self):
        self.baseline()
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        self.run_watch()
        self.assertIn("2026-08-07 20:00:00", self.entry("STARTING GUN"),
                      "reading the file late must still tell you WHEN the gun went off")

    def test_entry_records_cargo_age(self):
        self.baseline()
        self.put_cargo(draft(start_time=AUG29), users(*SIX), age_minutes=42)
        self.run_watch()
        self.assertIn("42 min old", self.entry("STARTING GUN"))


class TestSimultaneousTransitions(WatchCase):
    def test_date_and_slot_and_seats_all_fire_in_one_run(self):
        self.baseline(draft(), users(*FOUR))
        self.put_cargo(draft(start_time=AUG29, status="drafting", draft_order={BRIGGSY: 3}),
                       users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        for title in ("STARTING GUN", "YOUR SLOT EXISTS", "STATUS CHANGED", "LEAGUE ROSTER CHANGED"):
            self.assertTrue(self.entry(title), f"{title} must fire in the same run as the others")


class TestALostBaselineIsNotAFreshStart(WatchCase):
    """`first_run = prev is None` conflated two very different states: "no snapshot has ever
    existed" and "the snapshot is there but unreadable".

    In the second, the watcher silently re-baselined against TODAY'S cargo and exited 0. If the
    date had appeared while the snapshot was unreadable, STARTING GUN was computed as a diff
    against a baseline that already contained the date -- so it never fired, and never could
    again. The one and only trace was a `note:` on the stdout of a scheduled task, which reaches
    nobody. The alert this project exists to deliver was consumed, permanently, at exit 0.
    """

    def corrupt_snapshot(self):
        with open(w.SNAPSHOT, "w", encoding="utf-8") as f:
            f.write("{ this is not json")

    def test_an_unreadable_snapshot_writes_an_alert_and_exits_1(self):
        self.put_cargo(draft(start_time=AUG29, draft_order={BRIGGSY: 3}), users(*SIX))
        self.put_league()
        self.corrupt_snapshot()
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "a lost baseline exited 0 and wrote nothing to the file")
        e = self.entry("BASELINE LOST")
        self.assertTrue(e, "nothing was written to the alert FILE")
        self.assertIn("not valid JSON", e, "the operator is not told WHY the baseline was lost")

    def test_the_alert_states_the_current_values_it_could_not_diff(self):
        """A lost baseline means transitions may have fired unseen. The only useful thing left
        is to state where things stand so a human can compare it against what he knew."""
        self.put_cargo(draft(start_time=AUG29, draft_order={BRIGGSY: 3}), users(*SIX))
        self.put_league()
        self.corrupt_snapshot()
        self.run_watch()
        e = self.entry("BASELINE LOST")
        self.assertIn(w.fmt_start_time(AUG29), e, "the current date is not stated")
        self.assertRegex(e, r"your slot\s+3")
        self.assertIn("6 of 8", e)

    def test_a_genuine_first_run_stays_silent(self):
        """Negative control, and the reason the two states must not be conflated: a real first
        run must NOT write an alert, or the file becomes noise and stops being read."""
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        self.put_league()
        code, _ = self.run_watch()
        self.assertEqual(code, 0)
        self.assertEqual(self.alerts(), "", "a clean first run alerted")

    def test_the_rebaseline_still_happens_so_the_next_run_can_diff(self):
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        self.put_league()
        self.corrupt_snapshot()
        self.run_watch()
        self.put_cargo(draft(start_time=AUG22), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertTrue(self.entry("DRAFT DATE MOVED"), "the recovered baseline did not diff")


class TestTheSlotCanMoveNotJustAppear(WatchCase):
    """`diff()` only fired on None -> value, so a slot that CHANGED was invisible.

    Sleeper randomises draft_order, and a commissioner can re-randomise it. The alert file is
    append-only, so the earlier YOUR SLOT EXISTS entry keeps sitting there with a ready-to-run
    engine command naming the OLD seat -- and the watcher reports "no change" above it.
    """

    def baseline(self, slot):
        self.put_cargo(draft(draft_order={BRIGGSY: slot}), users(*SIX))
        self.put_league()
        self.run_watch()

    def test_a_slot_that_moves_fires(self):
        self.baseline(3)
        self.put_cargo(draft(draft_order={BRIGGSY: 7}), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "the seat changed and the watcher said nothing")
        e = self.entry("YOUR SLOT MOVED")
        self.assertIn("3", e)
        self.assertIn("7", e)
        self.assertIn("run_engine.py 7", e, "the ready-to-run command must name the NEW seat")

    def test_a_slot_that_vanishes_fires(self):
        self.baseline(3)
        self.put_cargo(draft(draft_order=None), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertTrue(self.entry("YOUR SLOT VANISHED"))

    def test_an_unchanged_slot_stays_silent(self):
        """Negative control -- an alert that fires every hour is an alert nobody reads."""
        self.baseline(3)
        self.put_cargo(draft(draft_order={BRIGGSY: 3}), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 0, self.alerts())


class TestFreshnessIsPerFileNotPerRun(WatchCase):
    """`cargo_age_minutes()` read `run_at` and nothing else, so freshness described the mule's
    last RUN rather than the files actually being diffed.

    feud_mule.ps1 deletes a failed download only when it lands under 50 bytes, so one failed
    source leaves YESTERDAY'S sleeper_draft.json on disk while `run_at` is minutes old -- and the
    guard reports green over cargo that is a day stale. Fifth appearance of the shape this
    watcher's own comment says has bitten the project four times.
    """

    def test_a_stale_draft_file_under_a_fresh_run_is_caught(self):
        self.put_cargo(draft(), users(*SIX), age_minutes=5)     # the RUN is 5 minutes old
        self.put_league()
        self.run_watch()                                        # baseline
        self.put_cargo(draft(), users(*SIX), age_minutes=5)
        self.put_league()
        self.age_file("sleeper_draft.json", 1500)               # the FILE is 25 hours old
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "a day-old draft file passed as fresh")
        e = self.entry("CARGO IS STALE — THIS WATCHER IS BLIND")
        self.assertIn("sleeper_draft.json", e)

    def test_a_source_the_mule_reported_as_failed_is_caught(self):
        self.put_cargo(draft(), users(*SIX))
        self.put_league()
        self.run_watch()
        self.put_cargo(draft(), users(*SIX))
        self.put_league()
        with open(os.path.join(self.inbox, "mule_status.json"), "w", encoding="utf-8-sig") as f:
            json.dump({"run_at": (PINNED - datetime.timedelta(minutes=5))
                                 .strftime("%Y-%m-%d %H:%M:%S"), "machine": "t",
                       "sources": {"sleeper_draft": "FAIL: 404"}}, f)
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "the mule reported the source FAILED and the watcher was calm")
        self.assertIn("FAIL", self.entry("CARGO IS STALE — THIS WATCHER IS BLIND"))

    def test_fresh_files_under_a_fresh_run_stay_silent(self):
        """Negative control. A freshness check that fires on healthy cargo is worse than none."""
        self.put_cargo(draft(), users(*SIX))
        self.put_league()
        self.run_watch()
        self.put_cargo(draft(), users(*SIX))
        self.put_league()
        code, _ = self.run_watch()
        self.assertEqual(code, 0, self.alerts())


class TestARecreatedDraftCannotHide(WatchCase):
    """feud_mule.ps1 pins the draft_id INTO ITS URL, and read_cargo() dropped draft_id entirely,
    so the watcher structurally could not notice that the object it hauls is dead.

    If the commissioner re-creates the draft -- an ordinary pre-draft act -- the mule keeps
    fetching the OLD draft, whose start_time and draft_order stay null forever. "no change" is
    then a true statement about the wrong draft, and it would hold right through draft day.
    sleeper_league.json rides in the same inbox and names the league's current draft_id.
    """

    def test_a_league_pointing_at_a_different_draft_fires(self):
        self.put_cargo(draft(), users(*SIX))
        self.put_league(draft_id="9999999999999999999")
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "the mule is hauling a dead draft and nothing said so")
        e = self.entry("THE DRAFT WAS REPLACED")
        self.assertIn("9999999999999999999", e)
        self.assertIn(REAL, e)
        self.assertIn("feud_mule.ps1", e, "the operator needs to know WHAT to fix")

    def test_matching_ids_stay_silent(self):
        """Negative control."""
        self.put_cargo(draft(), users(*SIX))
        self.put_league()
        code, _ = self.run_watch()
        self.assertEqual(code, 0, self.alerts())

    def test_a_missing_league_file_does_not_false_alarm(self):
        """The check needs both sides. One missing must not read as a mismatch -- a false red
        here would fire every hour and train the reader to ignore the file."""
        self.put_cargo(draft(), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 0, self.alerts())

    def test_a_draft_id_that_changes_between_snapshots_fires(self):
        self.put_cargo(draft(), users(*SIX))
        self.put_league()
        self.run_watch()
        d = draft()
        d["draft_id"] = "8888888888888888888"
        self.put_cargo(d, users(*SIX))
        self.put_league(draft_id="8888888888888888888")
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "the draft object itself was swapped and nothing fired")
        self.assertTrue(self.entry("THE DRAFT WAS REPLACED"))


class TestTheStartingGunAgainstARealSleeperDraftObject(WatchCase):
    """THE POSITIVE CONTROL TODO.md HAS ASKED FOR SINCE 2026-08-08.

    The start_time branch had four unit tests and every one fed it the hand-built `draft()` dict
    above -- SIX keys. A real Sleeper draft object carries SEVENTEEN. Our own draft's start_time is
    still null today, so the world had never once handed this branch a non-null value, and TODO.md
    correctly rated it "tested-and-adjacent-to-proven" rather than proven. The twin branch beside
    it (roster changes) is world-proven twice; that asymmetry is exactly why the untested twin was
    the risk -- same file, same writer, adjacent `if`.

    The object here is REAL and committed verbatim: draft 1391539007871012864, pulled from Sleeper
    2026-08-14, `status: complete`, `start_time: 1786313864801` = Sun 09 Aug 2026 06:17 PM local.
    THE VALUE UNDER TEST IS SLEEPER'S, NOT OURS -- that is the whole point. Forcing start_time back
    to null for the baseline is faithful rather than synthetic: that draft really did sit at
    `pre_draft` with a null start_time before somebody started it.

    Doing it this way needs no browser and no mock creation, so it costs nothing and cannot take
    over Briggsy's Chrome. What it does NOT prove is the scheduled task firing -- that half is
    world-proven twice already by the roster alerts of 2026-08-10 and 2026-08-12.
    """

    FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "fixtures", "sleeper_draft_started.json")

    def setUp(self):
        super().setUp()
        # THE CLOCK IS MOVED BACK HERE ON PURPOSE, and finding out why cost a red test.
        # The fixture's real start_time is Sun 09 Aug 2026 06:17 PM, which sits 1 day 22 hours
        # after PINNED -- INSIDE the T-48 countdown threshold. Left at PINNED, every run in this
        # class also emits a countdown entry, and test_UNCHANGED_real_cargo_is_SILENT (the
        # negative control that gives the rest of the class its meaning) fails for a reason that
        # has nothing to do with what it is controlling. This class is about the TRANSITION
        # writer, so the clock is put outside every threshold rather than the control being
        # weakened to tolerate a countdown. The countdown against this same real object is
        # exercised deliberately at the bottom of the class.
        self.clock = datetime.datetime(2026, 7, 1, 12, 0, 0)

    def real_draft(self, start_time):
        with open(self.FIXTURE, encoding="utf-8") as f:
            d = json.load(f)
        d["start_time"] = start_time
        return d

    def test_the_fixture_is_a_real_object_not_a_hand_built_one(self):
        """If this fixture ever gets 'tidied' down to the synthetic shape, the control below stops
        controlling anything and would still pass."""
        d = self.real_draft(None)
        self.assertGreaterEqual(len(d), 15, "a real Sleeper draft object carries ~17 top-level keys")
        for k in ("creators", "last_message_id", "season_type", "sport", "metadata"):
            self.assertIn(k, d, f"{k} is in the real object and absent from the synthetic one")

    def test_a_REAL_start_time_fires_the_starting_gun(self):
        self.baseline(d=self.real_draft(None), u=users(*SIX))
        self.put_cargo(self.real_draft(1786313864801), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "a real non-null start_time must raise an alert")
        entry = self.entry("STARTING GUN")
        self.assertTrue(entry, "STARTING GUN must exist in the alert FILE, not merely on stdout")
        self.assertIn("09 Aug 2026", entry, "the alert must name Sleeper's actual date")
        self.assertIn("Rebuild it", entry)

    def test_the_alert_names_the_field_that_actually_reports_staleness(self):
        """It used to say 'The board is an Aug 5 snapshot' -- hardcoded, and three synthesis dates
        stale by the time anyone read it. It must point at the field, and at the right one:
        meta.updated does NOT move when the consensus does."""
        self.baseline(d=self.real_draft(None), u=users(*SIX))
        self.put_cargo(self.real_draft(1786313864801), users(*SIX))
        self.run_watch()
        entry = self.entry("STARTING GUN")
        self.assertIn("meta.rankings.synthesized", entry)
        self.assertIn("rerank.py", entry, "the generator alone cannot move a rank; say so here")
        self.assertNotIn("Aug 5", entry, "no hardcoded date may come back into this alert")

    def test_UNCHANGED_real_cargo_is_SILENT(self):
        """THE NEGATIVE CONTROL, and the one that gives the test above its meaning. A writer that
        appended an alert unconditionally would pass every assertion above and fail here."""
        self.baseline(d=self.real_draft(1786313864801), u=users(*SIX))
        self.put_cargo(self.real_draft(1786313864801), users(*SIX))
        code, _ = self.run_watch()
        self.assertEqual(code, 0, "identical cargo must produce no alert")
        self.assertEqual(self.alerts(), "", "the alert file must still be empty")

    def test_it_fires_ONCE_then_goes_quiet(self):
        """The alert file is append-only and read late. A gun that keeps firing every hour buries
        the entry that matters under copies of itself."""
        self.baseline(d=self.real_draft(None), u=users(*SIX))
        self.put_cargo(self.real_draft(1786313864801), users(*SIX))
        self.run_watch()
        first = self.alerts()
        code, _ = self.run_watch()
        self.assertEqual(code, 0, "the second run has nothing new to say")
        self.assertEqual(self.alerts(), first, "the alert file must not grow on a repeat run")

    def test_the_countdown_runs_off_SLEEPERS_OWN_start_time(self):
        """The countdown's arithmetic has never been handed a value the world produced either.

        Same reasoning as the class above it: our own start_time is null, so every other countdown
        test in this file feeds it a number we made up. This one uses Sleeper's -- draft
        1391539007871012864, `start_time: 1786313864801` = Sun 09 Aug 2026 06:17 PM local -- and
        walks the clock to 30 hours before it, which is inside T-48 and outside T-6.
        """
        self.baseline(d=self.real_draft(1786313864801), u=users(*SIX))
        self.clock = datetime.datetime(2026, 8, 9, 18, 17, 44) - datetime.timedelta(hours=30)
        self.put_cargo(self.real_draft(1786313864801), users(*SIX))
        for name in ("sleeper_draft.json", "sleeper_users.json"):
            self.age_file(name, 5)
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "nothing counted down toward a real Sleeper start_time")
        e = self.entry("T-48 HOURS TO THE DRAFT")
        self.assertTrue(e, "T-48 must reach the alert FILE")
        self.assertIn("1 day, 6 hours", e, "the body must state the real gap to Sleeper's date")
        self.assertIn("09 Aug 2026", e)
        self.assertEqual(self.entry("T-6 HOURS TO THE DRAFT"), "",
                         "30 hours out is not inside T-6")


class TestTheCountdown(WatchCase):
    """`diff()` fires on TRANSITIONS, so once STARTING GUN announced the date the watcher went
    silent -- for the entire run-up, which is the part where prep either happens or doesn't.

    The countdown is the opposite kind of alert: it fires on the passage of TIME toward
    `start_time`, i.e. precisely when nothing is changing. Every test below therefore moves the
    CLOCK and leaves the cargo alone, which is the case the whole rest of this file cannot reach.

    `start_time` is null in the real league today, so none of this can be proven by running the
    watcher for real yet. That makes the negative controls here the load-bearing ones.
    """

    def fresh_cargo(self, start=AUG29):
        """Cargo whose mtimes track the CURRENT pinned clock.

        Advancing the clock without this leaves every file looking days old, and CARGO IS STALE
        buries the entry under test. Freshness is per FILE in this watcher, deliberately.
        """
        self.put_cargo(draft(start_time=start), users(*SIX))
        self.put_league()
        for name in ("sleeper_draft.json", "sleeper_users.json"):
            self.age_file(name, 5)

    def arm(self, start=AUG29):
        """Baseline with the date ALREADY known, so what fires next is the countdown and never
        STARTING GUN. Asserting silence here also proves PINNED sits outside every threshold."""
        self.fresh_cargo(start)
        code, _ = self.run_watch()
        self.assertEqual(code, 0, self.alerts())
        self.assertEqual(self.alerts(), "", "arming must be silent -- 22 days out is no threshold")

    def at(self, start=AUG29, **before):
        """Move the wall clock to `before` ahead of DRAFT_DAY, re-lay fresh cargo, run."""
        self.clock = DRAFT_DAY - datetime.timedelta(**before)
        self.fresh_cargo(start)
        return self.run_watch()

    def headers(self):
        """Just the countdown headers, in the order they were appended."""
        return [ln for ln in self.alerts().splitlines() if ln.startswith("## T-")]

    def snapshot(self):
        with open(w.SNAPSHOT, encoding="utf-8") as f:
            return json.load(f)

    # --- the null case, which is the world TODAY ------------------------------------------
    def test_a_null_start_time_counts_down_to_nothing(self):
        """The draft is unscheduled: Sleeper ships `start_time: null`. A countdown that divided by
        that, or guessed ~Aug 29 from the docs, would fire against a date nobody set."""
        self.put_cargo(draft(start_time=None), users(*SIX))
        self.put_league()
        self.run_watch()
        for offset in (dict(days=30), dict(days=3), dict(hours=1)):
            self.clock = DRAFT_DAY - datetime.timedelta(**offset)
            self.fresh_cargo(start=None)
            code, _ = self.run_watch()
            self.assertEqual(code, 0, self.alerts())
        self.assertEqual(self.alerts(), "", "a null start_time must produce no countdown at all")

    def test_a_null_start_time_arms_no_flag_that_could_outlive_it(self):
        """A flag written while the date is null would be keyed to `None` and could only ever
        suppress something later. Nothing may be recorded until there is a date."""
        self.put_cargo(draft(start_time=None), users(*SIX))
        self.put_league()
        self.run_watch()
        self.clock = DRAFT_DAY - datetime.timedelta(days=1)
        self.fresh_cargo(start=None)
        self.run_watch()
        self.assertEqual(self.snapshot()["fired"], {})

    # --- each threshold, once -------------------------------------------------------------
    def test_t7_fires_when_the_week_mark_is_crossed(self):
        self.arm()
        code, _ = self.at(days=6, hours=12)
        self.assertEqual(code, 1, "the week mark passed and the watcher said nothing")
        e = self.entry("T-7 DAYS TO THE DRAFT")
        self.assertTrue(e, "T-7 DAYS TO THE DRAFT must exist in the alert FILE, not just stdout")
        self.assertIn("6 days, 12 hours", e, "the body must state the REAL distance, not the label")
        self.assertIn("29 Aug 2026", e, "the alert must name the date it is counting down to")
        self.assertIn("rerank.py", e, "T-7 is the last unhurried moment to rebuild the ordering")

    def test_each_threshold_fires_exactly_once_and_in_order(self):
        self.arm()
        for kw in (dict(days=6, hours=12), dict(hours=40), dict(hours=5)):
            code, _ = self.at(**kw)
            self.assertEqual(code, 1, f"nothing fired at {kw}")
            code, _ = self.run_watch()          # same clock, same cargo, immediately again
            self.assertEqual(code, 0, f"{kw} re-fired on a repeat run: {self.alerts()}")
        self.assertEqual(
            [h.split(" TO THE DRAFT")[0] for h in self.headers()],
            ["## T-7 DAYS", "## T-48 HOURS", "## T-6 HOURS"],
            "three alarms, once each, nearest last -- this file is read top-to-bottom")

    def test_the_body_of_each_alarm_names_the_real_gap(self):
        self.arm()
        self.at(hours=40)
        self.assertIn("1 day, 16 hours", self.entry("T-48 HOURS TO THE DRAFT"))
        self.at(hours=5)
        self.assertIn("5 hours", self.entry("T-6 HOURS TO THE DRAFT"))
        self.assertIn("runbook", self.entry("T-6 HOURS TO THE DRAFT"),
                      "six hours out, the only useful instruction is to open the runbook")

    def test_it_stays_silent_outside_every_threshold(self):
        """Negative control. An alarm that fires on an ordinary Tuesday is an alarm nobody reads,
        and this file is append-only -- noise in it is permanent."""
        self.arm()
        code, _ = self.at(days=8)
        self.assertEqual(code, 0, self.alerts())
        self.assertEqual(self.headers(), [])

    def test_a_start_time_in_the_past_never_fires_a_countdown(self):
        """Every threshold is behind a draft that has already begun. Announcing one then would be
        a false statement about the time left, in a file that is taken at face value."""
        self.arm()
        self.clock = DRAFT_DAY + datetime.timedelta(hours=2)
        self.fresh_cargo()
        code, _ = self.run_watch()
        self.assertEqual(code, 0, self.alerts())
        self.assertEqual(self.headers(), [])

    # --- a date that appears already inside a threshold ------------------------------------
    def test_a_date_set_inside_a_threshold_fires_only_the_NEAREST_alarm(self):
        """DOCUMENTED POLICY, pinned here so it cannot drift back into either failure.

        A date set four hours out has T-7, T-48 and T-6 all behind it on the first run that sees
        it. Announcing "T-7 DAYS" would put a false headline in an append-only file; announcing
        nothing would leave the loudest possible case completely silent. The nearest crossed
        threshold is the only answer that is both true and not silent.
        """
        self.clock = DRAFT_DAY - datetime.timedelta(hours=4)
        self.put_cargo(draft(start_time=None), users(*SIX))
        self.put_league()
        for name in ("sleeper_draft.json", "sleeper_users.json"):
            self.age_file(name, 5)
        self.run_watch()                                    # baseline: date not yet set

        self.fresh_cargo()                                  # the date appears, 4 hours out
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertTrue(self.entry("STARTING GUN"), "the date appearing is still a transition")
        self.assertTrue(self.entry("T-6 HOURS TO THE DRAFT"))
        self.assertIn("4 hours", self.entry("T-6 HOURS TO THE DRAFT"))
        self.assertEqual(self.entry("T-7 DAYS TO THE DRAFT"), "",
                         "'T-7 DAYS' over a draft four hours away is a lie in a file read late")
        self.assertEqual(self.entry("T-48 HOURS TO THE DRAFT"), "")

    def test_the_skipped_alarms_are_marked_fired_and_never_arrive_late(self):
        self.clock = DRAFT_DAY - datetime.timedelta(hours=4)
        self.put_cargo(draft(start_time=None), users(*SIX))
        self.put_league()
        for name in ("sleeper_draft.json", "sleeper_users.json"):
            self.age_file(name, 5)
        self.run_watch()
        self.fresh_cargo()
        self.run_watch()
        self.assertEqual(sorted(self.snapshot()["fired"][str(AUG29)]),
                         ["T-48 HOURS", "T-6 HOURS", "T-7 DAYS"])
        self.clock = DRAFT_DAY - datetime.timedelta(hours=1)
        self.fresh_cargo()
        code, _ = self.run_watch()
        self.assertEqual(code, 0, "a threshold skipped as already-past must not arrive later")

    # --- a rescheduled draft --------------------------------------------------------------
    def test_a_reschedule_re_arms_every_alarm(self):
        """The reason this project has a watcher at all: ~Aug 29 is a handshake and it MOVES.

        The fired flags are keyed by the start_time they were announced FOR, so a new date starts
        with a clean set. A flat list of alarm names would look identical in the snapshot and would
        silently swallow the entire countdown for the new date.
        """
        self.arm()
        self.at(days=6, hours=12)                           # T-7 fires for Aug 29
        self.assertTrue(self.entry("T-7 DAYS TO THE DRAFT"))

        self.fresh_cargo(start=SEP5)                        # rescheduled a week later
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertTrue(self.entry("DRAFT DATE MOVED"))
        self.assertEqual(len(self.headers()), 1, "the new date is 13 days out -- nothing is due")

        self.clock = SEP5_DAY - datetime.timedelta(days=6)  # inside T-7 of the NEW date
        self.fresh_cargo(start=SEP5)
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "the old date's flags suppressed the new date's countdown")
        self.assertEqual(len(self.headers()), 2)
        self.assertIn("05 Sep 2026", self.alerts().rsplit("## T-", 1)[-1],
                      "the re-armed alarm must count down to the NEW date")

    def test_the_flags_are_kept_per_date_not_pooled(self):
        self.arm()
        self.at(days=6, hours=12)
        self.fresh_cargo(start=SEP5)
        self.run_watch()
        self.clock = SEP5_DAY - datetime.timedelta(days=6)
        self.fresh_cargo(start=SEP5)
        self.run_watch()
        fired = self.snapshot()["fired"]
        self.assertEqual(fired.get(str(AUG29)), ["T-7 DAYS"])
        self.assertEqual(fired.get(str(SEP5)), ["T-7 DAYS"])

    # --- the state that makes "once" work -------------------------------------------------
    def test_the_snapshot_records_which_alarms_have_fired(self):
        """Without this the countdown re-fires every hour and buries the file it writes to."""
        self.arm()
        self.at(days=6, hours=12)
        self.assertEqual(self.snapshot()["fired"], {str(AUG29): ["T-7 DAYS"]})

    def test_a_no_op_run_does_not_grow_the_alert_file(self):
        self.arm()
        self.at(days=6, hours=12)
        first = self.alerts()
        for _ in range(5):
            self.run_watch()
        self.assertEqual(self.alerts(), first, "five quiet runs re-announced the same alarm")

    def test_an_unreadable_fired_block_re_arms_rather_than_silences(self):
        """Garbage in that field must fail toward SPEAKING TWICE, never toward silence. A watcher
        that goes quiet on bad state is exactly the failure this whole file exists to prevent."""
        self.arm()
        self.at(days=6, hours=12)
        snap = self.snapshot()
        snap["fired"] = "not a dict"
        with open(w.SNAPSHOT, "w", encoding="utf-8") as f:
            json.dump(snap, f)
        self.clock = DRAFT_DAY - datetime.timedelta(days=6, hours=11)
        self.fresh_cargo()
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "a corrupt fired block silenced the countdown")
        self.assertEqual(len(self.headers()), 2)


class TestALostBaselineDoesNotSWALLOWTheCountdown(WatchCase):
    """THE REGRESSION SHAPE THIS FILE ALREADY CARRIES A SCAR FROM, one field over.

    STARTING GUN was once lost because it was computed against a baseline that had already been
    re-written to contain the date -- state advanced before the alert had a chance to fire, with
    the only trace a `note:` on a scheduled task's stdout. The countdown's `fired` dict is the same
    kind of state, and the same mistake is available: have `save()` pre-mark every threshold the
    new baseline happens to be inside. That is silent, permanent, and looks exactly like a healthy
    quiet run. The rule that prevents it: `fired` may ONLY be advanced by t_minus() itself.
    """

    def cargo(self, start=AUG29):
        self.put_cargo(draft(start_time=start), users(*SIX))
        self.put_league()
        for name in ("sleeper_draft.json", "sleeper_users.json"):
            self.age_file(name, 5)

    def snapshot(self):
        with open(w.SNAPSHOT, encoding="utf-8") as f:
            return json.load(f)

    def test_a_genuine_first_run_inside_a_threshold_fires_on_the_NEXT_run(self):
        """A first run is silent by design. That must cost the countdown a run, never the alarm."""
        self.clock = DRAFT_DAY - datetime.timedelta(days=3)
        self.cargo()
        code, out = self.run_watch()
        self.assertEqual(code, 0)
        self.assertIn("baseline established", out)
        self.assertEqual(self.snapshot()["fired"], {},
                         "a fresh baseline pre-marked the thresholds it was already inside")

        self.clock = DRAFT_DAY - datetime.timedelta(days=2, hours=23)
        self.cargo()
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "the baseline run consumed the alarm permanently")
        self.assertTrue(self.entry("T-7 DAYS TO THE DRAFT"))

    def test_a_lost_baseline_does_not_mark_the_countdown_fired(self):
        self.clock = DRAFT_DAY - datetime.timedelta(days=20)
        self.cargo()
        self.run_watch()

        self.clock = DRAFT_DAY - datetime.timedelta(days=3)
        self.cargo()
        with open(w.SNAPSHOT, "w", encoding="utf-8") as f:
            f.write("{ this is not json")
        code, _ = self.run_watch()
        self.assertEqual(code, 1)
        self.assertTrue(self.entry("BASELINE LOST"))
        self.assertEqual(self.snapshot()["fired"], {},
                         "the rebuilt baseline pre-marked T-7 -- the alarm is now gone forever")

        self.clock = DRAFT_DAY - datetime.timedelta(days=2, hours=23)
        self.cargo()
        code, _ = self.run_watch()
        self.assertEqual(code, 1, "a lost baseline swallowed the countdown, silently and for good")
        self.assertTrue(self.entry("T-7 DAYS TO THE DRAFT"))


class TestDiffStaysPure(WatchCase):
    """`diff()` is pure BY CONTRACT and the countdown is the first thing in it that needs a clock.

    The contract is what lets the watcher be tested at all: pin the inputs, get the outputs. A
    now() call inside diff() would be invisible in every existing test here and would only show up
    the day someone tried to replay a snapshot.
    """

    PREV = {"draft_id": REAL, "start_time": None, "status": "pre_draft",
            "draft_order": None, "managers": list(SIX)}
    CUR = {"draft_id": REAL, "start_time": AUG29, "status": "pre_draft",
           "draft_order": None, "managers": list(SIX)}

    def test_diff_does_not_call_now(self):
        w.now = lambda: (_ for _ in ()).throw(AssertionError("diff() reached for the clock"))
        entries, fired = w.diff(self.PREV, self.CUR,
                                DRAFT_DAY - datetime.timedelta(days=3), {})
        titles = [t for t, _ in entries]
        self.assertIn("STARTING GUN", titles)
        self.assertIn("T-7 DAYS TO THE DRAFT", titles)
        self.assertEqual(fired, {str(AUG29): ["T-7 DAYS"]})

    def test_diff_without_a_moment_still_reports_transitions(self):
        """Omitting the clock must cost the countdown and nothing else -- a caller that has no
        clock to give still needs the transitions."""
        entries, fired = w.diff(self.PREV, self.CUR)
        self.assertEqual([t for t, _ in entries], ["STARTING GUN"])
        self.assertEqual(fired, {})

    def test_the_same_inputs_give_the_same_answer_twice(self):
        moment = DRAFT_DAY - datetime.timedelta(days=3)
        first = w.diff(self.PREV, self.CUR, moment, {})
        second = w.diff(self.PREV, self.CUR, moment, {})
        self.assertEqual(first, second)

    def test_the_caller_s_fired_dict_is_not_mutated(self):
        """Returned, never mutated in place -- otherwise main() could not decide whether to
        persist it, and a caller's dict would change under it."""
        mine = {}
        w.diff(self.PREV, self.CUR, DRAFT_DAY - datetime.timedelta(days=3), mine)
        self.assertEqual(mine, {}, "diff() edited the dict it was handed")

    def test_a_malformed_fired_argument_cannot_crash_the_watcher(self):
        """main() launders this through load_fired(), but diff() takes it from any caller. A
        traceback here would take the whole watcher down, and its every failure mode is silence."""
        for junk in ({"x": 5}, {"x": None}, {"x": "T-7 DAYS"}, {None: []}):
            entries, fired = w.diff(self.PREV, self.CUR,
                                    DRAFT_DAY - datetime.timedelta(days=3), junk)
            self.assertIn("T-7 DAYS TO THE DRAFT", [t for t, _ in entries],
                          f"{junk!r} silenced the countdown instead of being ignored")


if __name__ == "__main__":
    unittest.main()

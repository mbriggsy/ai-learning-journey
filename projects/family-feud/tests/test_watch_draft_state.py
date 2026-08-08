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
AUG29 = int(datetime.datetime(2026, 8, 29, 19, 0).timestamp() * 1000)
AUG22 = int(datetime.datetime(2026, 8, 22, 19, 0).timestamp() * 1000)

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
        w.now = lambda: PINNED

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
        stamp = (PINNED - datetime.timedelta(minutes=minutes)).timestamp()
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
            run_at = (PINNED - datetime.timedelta(minutes=age_minutes)).strftime("%Y-%m-%d %H:%M:%S")
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
        self.assertIn("draft_engine.py 7 8 16", entry, "the ready-to-run command must carry the real slot")

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
        self.assertIn("draft_engine.py 7", e, "the ready-to-run command must name the NEW seat")

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


if __name__ == "__main__":
    unittest.main()

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
        self.baseline()
        with open(w.SNAPSHOT, "w", encoding="utf-8") as f:
            f.write("{broken")
        self.put_cargo(draft(start_time=AUG29), users(*SIX))
        code, out = self.run_watch()
        self.assertEqual(code, 0, "an unreadable snapshot must rebuild the baseline, not crash")
        self.assertIn("baseline re-established", out)


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


if __name__ == "__main__":
    unittest.main()

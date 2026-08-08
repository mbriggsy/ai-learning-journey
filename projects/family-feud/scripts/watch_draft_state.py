#!/usr/bin/env python3
"""Watch the mule's cargo and say something the day the draft becomes real.

    python3 scripts/watch_draft_state.py            # from the project root (or anywhere)

The draft date does not exist yet. `start_time` is null, Sleeper's own UI reads "Draft time has
not yet set," and ~Aug 29 is a handshake between eight people -- which means it can move EARLIER.
The board is an Aug 5 snapshot that expires. Nothing in this project notices when the clock starts;
the Cowork-era reminder that used to fire did so on a hardcoded Aug 26, which is the wrong shape
for a date that is not fixed.

The mule has hauled sleeper_draft.json and sleeper_users.json hourly for days and NOTHING has ever
read them. This is its first consumer.

Output is a FILE, always. Anthropic push and email notifications are broken account-wide for this
account, so an alert that depends on a notification is an alert that does not exist. The file is
append-only and every entry carries the moment it fired, so opening it late still tells you WHEN
the gun went off rather than merely that it did.

Exit codes: 0 = ran, nothing to say. 1 = something was written to the alert file. 2 = could not
read the cargo at all.
"""
import datetime
import json
import os
import sys

# --- Windows encoding guard. Do not remove; see docs/insights/003. -------------------------
# Both halves are required and neither is sufficient. Cargo carries team names with non-ASCII,
# and the alert banner below prints characters cp1252 cannot ENCODE. Fixing only the read moves
# the crash to stdout, where it reads as a brand-new bug.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream must degrade, not crash
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
INBOX = os.path.join(ROOT, "newsletter", "data", "inbox")
STATE = os.path.join(ROOT, "newsletter", "data", "state")
SNAPSHOT = os.path.join(STATE, "last_seen.json")
ALERTS = os.path.join(STATE, "DRAFT_ALERTS.md")

# Read the slot from draft_order keyed by this id and from NOTHING ELSE. slot_to_roster_id is an
# identity map {1:1 ... 8:8} today, so it will hand you a confident, plausible, wrong answer --
# there are three unrelated "3"s in this league (user slot, roster_id, and the identity map's 3).
BRIGGSY_USER_ID = "1390750540631150592"

# The mule runs hourly. Two consecutive misses is a real signal, not jitter -- during the Aug 7
# folder rename it silently dropped its 11:29 and 12:29 runs while every status field stayed green.
STALE_AFTER_MINUTES = 150


def now():
    """Wall clock, isolated so tests can pin it. Monkeypatch this module attribute, not datetime."""
    return datetime.datetime.now()


def load_json(path, encoding="utf-8"):
    """Return (data, problem). Never raises -- a watcher that crashes on bad cargo is a watcher
    that goes quiet exactly when something is wrong."""
    if not os.path.exists(path):
        return None, f"{os.path.basename(path)} is missing from {os.path.dirname(path)}"
    try:
        with open(path, encoding=encoding) as f:
            return json.load(f), None
    except (json.JSONDecodeError, ValueError) as e:
        return None, f"{os.path.basename(path)} is not valid JSON ({e})"
    except OSError as e:
        return None, f"{os.path.basename(path)} could not be read ({e})"


def cargo_age_minutes():
    """Minutes since the mule last ran, or (None, reason).

    mule_status.json is written by PowerShell 5.1 and carries a BOM, so utf-8 raises on it while
    utf-8-sig reads both it and any plain-UTF-8 file. This is the one file in the project where
    the blanket encoding="utf-8" rule is wrong.
    """
    status, problem = load_json(os.path.join(INBOX, "mule_status.json"), encoding="utf-8-sig")
    if problem:
        return None, problem
    run_at = status.get("run_at")
    if not run_at:
        return None, "mule_status.json has no run_at -- cannot judge whether cargo is fresh"
    try:
        stamped = datetime.datetime.strptime(run_at, "%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError):
        return None, f"mule_status.json run_at is unparseable ({run_at!r})"
    return (now() - stamped).total_seconds() / 60.0, None


def fmt_start_time(ms):
    """Sleeper ships start_time as epoch milliseconds. Print something a human can act on."""
    if ms is None:
        return "not set"
    try:
        return datetime.datetime.fromtimestamp(int(ms) / 1000).strftime("%a %d %b %Y, %I:%M %p")
    except (TypeError, ValueError, OSError, OverflowError):
        return f"unreadable ({ms!r})"


def read_cargo():
    """Current draft + users state, reduced to just what a transition can be detected on."""
    draft, d_problem = load_json(os.path.join(INBOX, "sleeper_draft.json"))
    users, u_problem = load_json(os.path.join(INBOX, "sleeper_users.json"))
    problems = [p for p in (d_problem, u_problem) if p]
    if problems:
        return None, problems

    if not isinstance(draft, dict):
        return None, [f"sleeper_draft.json is {type(draft).__name__}, expected an object"]
    if not isinstance(users, list):
        return None, [f"sleeper_users.json is {type(users).__name__}, expected a list"]

    return {
        "start_time": draft.get("start_time"),
        "status": draft.get("status"),
        "draft_order": draft.get("draft_order"),
        "managers": sorted(u.get("display_name") or "?" for u in users),
    }, []


def my_slot(draft_order):
    if not isinstance(draft_order, dict):
        return None
    return draft_order.get(BRIGGSY_USER_ID)


def diff(prev, cur):
    """Transitions worth waking someone for, most urgent first. Pure -- no I/O, no clock."""
    out = []

    was, is_ = prev.get("start_time"), cur.get("start_time")
    if was is None and is_ is not None:
        out.append(("STARTING GUN",
                    f"The draft date EXISTS: {fmt_start_time(is_)}.\n"
                    f"The board is an Aug 5 snapshot and it expires. Rebuild it."))
    elif was is not None and is_ is not None and was != is_:
        # The whole reason this unit exists: a handshake date can move, and it can move EARLIER.
        out.append(("DRAFT DATE MOVED",
                    f"was  {fmt_start_time(was)}\n"
                    f"now  {fmt_start_time(is_)}\n"
                    f"Re-check every assumption keyed to the old date."))
    elif was is not None and is_ is None:
        out.append(("DRAFT DATE UNSET",
                    f"start_time went back to null (was {fmt_start_time(was)}). "
                    f"Someone cleared it in Sleeper."))

    if my_slot(prev.get("draft_order")) is None and my_slot(cur.get("draft_order")) is not None:
        slot = my_slot(cur["draft_order"])
        out.append(("YOUR SLOT EXISTS",
                    f"draft_order[\"{BRIGGSY_USER_ID}\"] = {slot}.\n"
                    f"Read it from that and nothing else -- slot_to_roster_id is an identity map "
                    f"and will hand you a plausible wrong answer.\n"
                    f"Run the engine with: python draft_engine.py {slot} 8 16 <draft_id>"))

    if prev.get("status") != cur.get("status"):
        out.append(("STATUS CHANGED",
                    f"{prev.get('status')!r} -> {cur.get('status')!r}"))

    before, after = prev.get("managers") or [], cur.get("managers") or []
    if before != after:
        joined = [m for m in after if m not in before]
        left = [m for m in before if m not in after]
        lines = [f"{len(before)} -> {len(after)} of 8 seats filled"]
        if joined:
            lines.append(f"joined: {', '.join(joined)}")
        if left:
            lines.append(f"left:   {', '.join(left)}")
        if len(after) == 8:
            lines.append("The room is FULL. A date usually follows.")
        out.append(("LEAGUE ROSTER CHANGED", "\n".join(lines)))

    return out


def write_alerts(entries, cargo_run_note):
    """Append to the alert file. Append-only on purpose: an overwritten alert that nobody read
    before the next run is an alert that never happened."""
    os.makedirs(STATE, exist_ok=True)
    stamp = now().strftime("%Y-%m-%d %H:%M:%S")
    new = not os.path.exists(ALERTS)
    with open(ALERTS, "a", encoding="utf-8") as f:
        if new:
            f.write("# Draft state alerts\n\n"
                    "Written by `scripts/watch_draft_state.py`. Append-only — newest at the bottom.\n"
                    "Every entry carries the moment it fired, so reading this late still tells you\n"
                    "*when* something happened.\n")
        for title, body in entries:
            f.write(f"\n---\n\n## {title} — {stamp}\n\n{body}\n\n_{cargo_run_note}_\n")


def main():
    cargo, problems = read_cargo()

    age, age_problem = cargo_age_minutes()
    if age is None:
        cargo_run_note = f"cargo freshness unknown: {age_problem}"
    else:
        cargo_run_note = f"cargo was {age:.0f} min old when this ran"

    if problems:
        # Degrade with a stated reason. Silence here is the failure mode -- the whole point is
        # that nobody has to remember to check.
        print("!" * 70)
        print("!! DRAFT WATCHER COULD NOT READ THE CARGO")
        for p in problems:
            print(f"!!   {p}")
        print("!! The mule may be dead. Check the cargo timestamp in mule_status.json --")
        print("!! it is the only signal in this project that has never lied.")
        print("!" * 70)
        return 2

    entries = []

    # --- stale-cargo guard ------------------------------------------------------------------
    # This watcher decides "nothing changed" by diffing today's cargo against yesterday's. If the
    # mule stops, the cargo stops changing, and that verdict becomes "all quiet" FOREVER -- which
    # is indistinguishable from a genuinely uneventful league. That shape has now bitten this
    # project four times (Last Result: 0, NumberOfMissedRuns, mule_status 10/10, and this).
    # Freshness is the only signal that has survived all four. A no-change verdict computed over
    # stale cargo is not a verdict, so it is never reported as reassurance.
    stale = age is None or age > STALE_AFTER_MINUTES
    if stale:
        detail = age_problem if age is None else f"last mule run was {age:.0f} minutes ago"
        entries.append(("CARGO IS STALE — THIS WATCHER IS BLIND",
                        f"{detail}.\n"
                        f"The mule runs hourly; anything past {STALE_AFTER_MINUTES} minutes means it "
                        f"missed at least two runs.\n"
                        f"Until it is fixed, 'no change' below means 'no new data', NOT 'nothing "
                        f"happened'.\n"
                        f"Re-run scripts/install-mule.ps1 — it re-derives every path from its own "
                        f"location."))

    # Capture this BEFORE save() writes the file, or a clean first run reports its own brand-new
    # snapshot as "previously unreadable" -- noise in the one output that has to stay signal-only.
    had_snapshot = os.path.exists(SNAPSHOT)
    prev, prev_problem = load_json(SNAPSHOT)
    first_run = prev is None

    if first_run:
        # Establish the baseline silently. Alerting on everything the first time it runs would
        # train the reader to ignore the file, and the file only works if it is never noise.
        os.makedirs(STATE, exist_ok=True)
        save(cargo)
        if prev_problem and had_snapshot:
            print(f"note: previous snapshot unreadable ({prev_problem}); baseline re-established")
        print(f"baseline established: {len(cargo['managers'])} of 8 seats, "
              f"start_time {fmt_start_time(cargo['start_time'])}, "
              f"status {cargo['status']!r}, slot {my_slot(cargo['draft_order'])}")
        if stale:
            write_alerts(entries, cargo_run_note)
            print(f"ALERT: cargo is stale -- see {ALERTS}")
            return 1
        return 0

    entries.extend(diff(prev, cargo))
    save(cargo)

    if not entries:
        print(f"no change ({len(cargo['managers'])} of 8 seats, "
              f"start_time {fmt_start_time(cargo['start_time'])}) -- {cargo_run_note}")
        return 0

    write_alerts(entries, cargo_run_note)
    for title, body in entries:
        print("=" * 70)
        print(f"  {title}")
        print("=" * 70)
        print(body)
    print(f"\nwritten to {ALERTS}")
    return 1


def save(cargo):
    with open(SNAPSHOT, "w", encoding="utf-8") as f:
        json.dump({"seen_at": now().strftime("%Y-%m-%d %H:%M:%S"), **cargo}, f,
                  ensure_ascii=False, indent=1)


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Watch the mule's cargo and say something the day the draft becomes real.

    python scripts/watch_draft_state.py             # from the project root (or anywhere)

The draft date does not exist yet. `start_time` is null, Sleeper's own UI reads "Draft time has
not yet set," and ~Aug 29 is a handshake between eight people -- which means it can move EARLIER.
The board's ORDERING expires (read `meta.rankings.synthesized`, never `meta.updated`). Nothing in
this project notices when the clock starts; the Cowork-era reminder that used to fire did so on a
hardcoded Aug 26, which is the wrong shape for a date that is not fixed -- and this docstring
carried its own hardcoded "Aug 5 snapshot" until 2026-08-14, three synthesis dates out of date,
which is the same defect one level down.

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


# The two files read_cargo() actually diffs. Freshness must be judged on THESE, not on the run.
CARGO_FILES = ("sleeper_draft.json", "sleeper_users.json")


def file_age_minutes(path):
    """Minutes since a cargo file was last written, or None if it is not there."""
    try:
        return (now() - datetime.datetime.fromtimestamp(os.path.getmtime(path))
                ).total_seconds() / 60.0
    except OSError:
        return None


def staleness_reasons(age, age_problem):
    """Every reason today's cargo might not describe the world right now.

    FRESHNESS IS PER FILE, NOT PER RUN. This used to read mule_status.json's `run_at` and nothing
    else -- which measures when the mule last RAN, not whether the files being diffed came back.
    feud_mule.ps1 deletes a failed download only when it lands under 50 bytes, so one failed
    source leaves YESTERDAY'S sleeper_draft.json on disk while `run_at` is minutes old, and a
    run-level check reports green over day-old cargo. That is the fifth appearance of the shape
    the comment in main() says has bitten this project four times -- and the field that separates
    them (`sources`) was already in the object being parsed.
    """
    reasons = []
    if age is None:
        reasons.append(age_problem)
    elif age > STALE_AFTER_MINUTES:
        reasons.append(f"last mule run was {age:.0f} minutes ago")

    status, _ = load_json(os.path.join(INBOX, "mule_status.json"), encoding="utf-8-sig")
    sources = (status or {}).get("sources") or {}
    for fname in CARGO_FILES:
        f_age = file_age_minutes(os.path.join(INBOX, fname))
        if f_age is not None and f_age > STALE_AFTER_MINUTES:
            reasons.append(f"{fname} on disk was last written {f_age:.0f} minutes ago")
        outcome = sources.get(fname[:-len(".json")])
        if isinstance(outcome, str) and not outcome.lower().startswith("ok"):
            reasons.append(f"the mule reported {fname} as: {outcome}")
    return reasons


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
        # draft_id is carried because the mule PINS IT INTO ITS URL. Drop it here and the watcher
        # structurally cannot notice that the object it hauls belongs to a draft that no longer
        # exists -- it would keep reporting "no change" about the wrong draft, truthfully, right
        # through draft day.
        "draft_id": draft.get("draft_id"),
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
        # NO DATE IS NAMED HERE ON PURPOSE. This line used to read "The board is an Aug 5 snapshot"
        # -- hardcoded, and already wrong by three synthesis dates when it was found on 2026-08-14.
        # `diff()` is pure by contract, so it cannot read the board to get the real one; the answer
        # is to point at the field instead of asserting a value that rots unattended.
        out.append(("STARTING GUN",
                    f"The draft date EXISTS: {fmt_start_time(is_)}.\n"
                    f"The board's ORDERING expires -- check meta.rankings.synthesized (NOT "
                    f"meta.updated, which is input freshness and does not move when the consensus "
                    f"does). Rebuild it from the repo root:\n"
                    f"  python scripts/rerank.py            # dry run; then --write\n"
                    f"  python scripts/build_board.py --rankings-synthesized <scrape date>\n"
                    f"build_board.py ALONE CANNOT MOVE A RANK."))
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

    # A seat can APPEAR, MOVE, or VANISH. Only the first was ever detected, so a re-randomised
    # draft_order reported "no change" -- while the append-only alert file kept the earlier YOUR
    # SLOT EXISTS entry on screen, with a ready-to-run engine command naming the OLD seat.
    was_slot, is_slot = my_slot(prev.get("draft_order")), my_slot(cur.get("draft_order"))
    if was_slot is None and is_slot is not None:
        out.append(("YOUR SLOT EXISTS",
                    f"draft_order[\"{BRIGGSY_USER_ID}\"] = {is_slot}.\n"
                    f"Read it from that and nothing else -- slot_to_roster_id is an identity map "
                    f"and will hand you a plausible wrong answer.\n"
                    f"Run the engine from the REPO ROOT: python scripts/run_engine.py {is_slot}\n"
                    f"Naming the seat is deliberate -- run_engine re-derives it from draft_order "
                    f"and REFUSES on a disagreement, so this is two independent readings having "
                    f"to agree rather than one being trusted."))
    elif was_slot is not None and is_slot is not None and was_slot != is_slot:
        out.append(("YOUR SLOT MOVED",
                    f"was slot {was_slot}, now slot {is_slot}.\n"
                    f"This file is append-only, so the YOUR SLOT EXISTS entry above still names "
                    f"{was_slot} -- THIS LINE SUPERSEDES IT.\n"
                    f"Run the engine from the REPO ROOT: python scripts/run_engine.py {is_slot}\n"
                    f"Naming the seat is deliberate -- run_engine re-derives it from draft_order "
                    f"and REFUSES on a disagreement, so this is two independent readings having "
                    f"to agree rather than one being trusted."))
    elif was_slot is not None and is_slot is None:
        out.append(("YOUR SLOT VANISHED",
                    f"draft_order no longer holds an entry for {BRIGGSY_USER_ID} (was slot "
                    f"{was_slot}). The order was cleared or re-randomised, or we are not in this "
                    f"draft any more. Do not run the engine off slot {was_slot}."))

    was_id, is_id = prev.get("draft_id"), cur.get("draft_id")
    if was_id and is_id and str(was_id) != str(is_id):
        out.append(("THE DRAFT WAS REPLACED",
                    f"the draft object's own id changed: {was_id} -> {is_id}.\n"
                    f"Everything keyed to the old draft -- picks.json, any slot you wrote down -- "
                    f"belongs to a draft that no longer exists.\n"
                    f"Update the pinned draft_id in newsletter/feud_mule.ps1."))

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
    reasons = staleness_reasons(age, age_problem)
    if reasons:
        entries.append(("CARGO IS STALE — THIS WATCHER IS BLIND",
                        "\n".join(f"- {r}." for r in reasons) + "\n"
                        f"The mule runs hourly; anything past {STALE_AFTER_MINUTES} minutes means it "
                        f"missed at least two runs.\n"
                        f"Until it is fixed, 'no change' below means 'no new data', NOT 'nothing "
                        f"happened'.\n"
                        f"Re-run scripts/install-mule.ps1 — it re-derives every path from its own "
                        f"location."))

    # --- the mule is pinned; the league is not ----------------------------------------------
    # feud_mule.ps1 fetches the draft by an id baked into its URL, so if the commissioner
    # re-creates the draft -- an ordinary pre-draft act -- it keeps hauling a DEAD object whose
    # start_time and draft_order stay null forever. "no change" would then be a true statement
    # about the wrong draft, and it would hold right through draft day. sleeper_league.json rides
    # in the same inbox and names the league's CURRENT draft_id; nothing had ever compared them.
    league, _ = load_json(os.path.join(INBOX, "sleeper_league.json"))
    league_draft = (league or {}).get("draft_id")
    if league_draft and cargo.get("draft_id") and str(league_draft) != str(cargo["draft_id"]):
        entries.append(("THE DRAFT WAS REPLACED",
                        f"the league points at draft {league_draft}, but the cargo we are "
                        f"watching is draft {cargo['draft_id']}.\n"
                        f"The mule pins its draft_id in the URL, so it is hauling a draft that is "
                        f"no longer the league's. Its start_time will stay null forever and this "
                        f"watcher will keep reporting 'no change' about a dead object.\n"
                        f"Update the pinned draft_id in newsletter/feud_mule.ps1, then re-run it."))

    # Capture this BEFORE save() writes the file, or a clean first run reports its own brand-new
    # snapshot as "previously unreadable" -- noise in the one output that has to stay signal-only.
    had_snapshot = os.path.exists(SNAPSHOT)
    prev, prev_problem = load_json(SNAPSHOT)
    # THESE ARE TWO DIFFERENT STATES AND CONFLATING THEM COST THE ALERT. `first_run = prev is
    # None` treated an UNREADABLE snapshot as a never-existed one, so the watcher silently
    # re-baselined against today's cargo and exited 0. If the date had appeared while the
    # snapshot was unreadable, STARTING GUN was then computed against a baseline that already
    # contained it -- so it never fired, and never could again. The only trace was a `note:` on
    # the stdout of a scheduled task, which reaches nobody.
    first_run = prev is None and not had_snapshot
    baseline_lost = prev is None and had_snapshot

    if first_run or baseline_lost:
        os.makedirs(STATE, exist_ok=True)
        save(cargo)
        if baseline_lost:
            entries.append(("BASELINE LOST — TRANSITIONS MAY HAVE PASSED UNSEEN",
                            f"the previous snapshot could not be read: {prev_problem}.\n"
                            f"A new baseline has been written from today's cargo, so anything "
                            f"that changed while it was unreadable can no longer be diffed "
                            f"against anything. It is not late — it is GONE.\n\n"
                            f"Where things stand right now, to compare against what you last knew:\n"
                            f"  start_time   {fmt_start_time(cargo['start_time'])}\n"
                            f"  your slot    {my_slot(cargo['draft_order'])}\n"
                            f"  seats        {len(cargo['managers'])} of 8\n"
                            f"  status       {cargo['status']!r}\n"
                            f"If the date or the seat above is news to you, act on it now."))
        else:
            # A genuine first run establishes the baseline SILENTLY. Alerting on everything the
            # first time would train the reader to ignore the file, and it only works if it is
            # never noise.
            print(f"baseline established: {len(cargo['managers'])} of 8 seats, "
                  f"start_time {fmt_start_time(cargo['start_time'])}, "
                  f"status {cargo['status']!r}, slot {my_slot(cargo['draft_order'])}")
        if entries:
            write_alerts(entries, cargo_run_note)
            for title, body in entries:
                print("=" * 70)
                print(f"  {title}")
                print("=" * 70)
                print(body)
            print(f"\nwritten to {ALERTS}")
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

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

TWO KINDS OF ALERT LIVE HERE AND THEY FAIL IN OPPOSITE DIRECTIONS. Transitions (`diff`) fire on a
CHANGE between two snapshots, so they say nothing while the world sits still -- which is how
STARTING GUN could announce a date and then be silent for every one of the days between it and the
draft. Countdowns (`t_minus`) fire on the passage of TIME toward `start_time`, so they speak
precisely when nothing is changing. `diff()` is pure by contract, so the countdown's clock is
PASSED IN rather than read; the "already announced" flags ride in `last_seen.json` beside the
snapshot, keyed by the `start_time` they were announced FOR so a rescheduled draft cannot inherit
the old date's silence.

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

# --- the countdown ---------------------------------------------------------------------------
# (title stem, seconds before start_time), ORDERED MOST DISTANT FIRST. t_minus() relies on that
# order to pick the nearest crossed threshold, so do not sort this by name.
T_MINUS = (
    ("T-7 DAYS", 7 * 24 * 60 * 60),
    ("T-48 HOURS", 48 * 60 * 60),
    ("T-6 HOURS", 6 * 60 * 60),
)

# Every body states the REAL distance ({left}) as well as the threshold in the header, because the
# header is a label and the label is the part that can go stale between firing and being read.
# Commands are verified runnable from the REPO ROOT -- a dead command in an alert costs most at the
# exact moment the alert fires (see the run_engine.py assertion in tests/test_watch_draft_state.py).
T_MINUS_BODY = {
    "T-7 DAYS":
        "The draft is {left} away -- {when}.\n"
        "The board's ORDERING expires; check meta.rankings.synthesized (NOT meta.updated, which "
        "is input freshness and does not move when the consensus does). A week out is the last "
        "unhurried moment to rebuild it. From the REPO ROOT:\n"
        "  python scripts/rerank.py            # dry run; then --write\n"
        "  python scripts/build_board.py --rankings-synthesized <scrape date>\n"
        "build_board.py ALONE CANNOT MOVE A RANK.",
    "T-48 HOURS":
        "The draft is {left} away -- {when}.\n"
        "Two days out the room stops changing and the prep has to be real. From the REPO ROOT:\n"
        "  python scripts/validate_board.py    # the board is not trusted until this passes\n"
        "  python scripts/run_engine.py        # re-derives your seat and REFUSES rather than "
        "guessing while draft_order is null\n"
        "Read docs/draft-day-runbook.md end to end now, not on the clock -- Step 3 is the loop "
        "you will actually run.",
    "T-6 HOURS":
        "The draft is {left} away -- {when}.\n"
        "Open docs/draft-day-runbook.md and stay in it. From the REPO ROOT:\n"
        "  python scripts/precompute_ladder.py   # prints QUEUE THIS ORDER; pre-arm the queue\n"
        "  python scripts/run_engine.py          # the advisory loop\n"
        "From here on RE-PULL rather than trusting anything on disk, and never quote league "
        "membership, draft time or slot from memory or from a doc.",
}


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


def start_datetime(ms):
    """start_time as a local naive datetime, or None if it is unset or unreadable.

    None is the answer TODAY -- the draft is unscheduled and Sleeper ships `start_time: null` --
    and it is also the answer if the field ever comes back as garbage. Both mean "nothing to count
    down to", and the countdown must be silent rather than clever about either.
    """
    if ms is None:
        return None
    try:
        return datetime.datetime.fromtimestamp(int(ms) / 1000)
    except (TypeError, ValueError, OSError, OverflowError):
        return None


def humanise_gap(seconds):
    """`3 days, 4 hours` -- the distance actually remaining, in the units a human acts on."""
    seconds = int(max(0, seconds))
    days, rem = divmod(seconds, 24 * 60 * 60)
    hours, rem = divmod(rem, 60 * 60)
    minutes = rem // 60
    parts = []
    if days:
        parts.append(f"{days} day{'' if days == 1 else 's'}")
    if hours:
        parts.append(f"{hours} hour{'' if hours == 1 else 's'}")
    # Minutes are noise beside days; they are the whole story inside the last hour.
    if minutes and not days:
        parts.append(f"{minutes} minute{'' if minutes == 1 else 's'}")
    return ", ".join(parts) or "under a minute"


def load_fired(prev):
    """Which countdown alarms have already been announced, KEYED BY THE start_time THEY WERE
    ANNOUNCED FOR.

    The key is the whole trick. A flat list of names would survive a reschedule and silently
    swallow all three alarms for the NEW date -- the same shape as the STARTING GUN bug this file
    already carries a comment about: an alert suppressed by state that was never about it.
    Anything malformed reads as "nothing has fired", which is the safe direction: it can only make
    an alarm speak twice, never make it silent.
    """
    fired = (prev or {}).get("fired")
    if not isinstance(fired, dict):
        return {}
    return {str(k): [str(n) for n in v]
            for k, v in fired.items() if isinstance(v, (list, tuple))}


def t_minus(start_time, moment, fired):
    """Countdown alarms as `start_time` approaches. Returns (entries, fired).

    PURE. `moment` is a parameter and not a now() call precisely because diff() is pure by
    contract -- the clock is obtained once by the caller and threaded in, so a test can pin it and
    so two alerts in one run can never disagree about what time it is.

    `fired` is returned rather than mutated; the caller persists it into last_seen.json.
    """
    # Copied, and copied DEFENSIVELY: main() routes this through load_fired(), but diff() takes
    # `fired` from any caller and a bare list(v) over a non-sequence raises. A watcher that
    # crashes goes quiet exactly when something is wrong, which is the one thing it may never do.
    fired = {str(k): list(v) for k, v in (fired or {}).items()
             if isinstance(v, (list, tuple))}
    when = start_datetime(start_time)
    if when is None or moment is None:
        # NOTHING IS RECORDED HERE ON PURPOSE. The alarms must arm themselves the moment a real
        # date appears, so an unscheduled draft may not leave a flag behind that outlives it.
        return [], fired

    remaining = (when - moment).total_seconds()
    if remaining <= 0:
        # The draft has started, or is long over. Every threshold is behind us and announcing one
        # would be a false statement about the time left. No flag is written either: the flags are
        # keyed to this start_time, so there is no future alarm here left to suppress.
        return [], fired

    key = str(start_time)
    already = fired.get(key, [])
    crossed = [name for name, secs in T_MINUS if remaining <= secs and name not in already]
    if not crossed:
        return [], fired

    # ALREADY-INSIDE-A-THRESHOLD POLICY -- a deliberate choice, not an accident of the loop.
    # If a date is set 3 days out, T-7 and T-48 are BOTH already behind us on the first run that
    # sees it. We announce the NEAREST crossed threshold and mark the more distant ones fired
    # without announcing them.
    #   - Announcing "T-7 DAYS" over a draft that is 3 days away puts a false headline in a file
    #     that is read late and taken at face value. DRAFT_ALERTS.md is append-only; a wrong line
    #     in it never gets corrected, it just sits there.
    #   - Announcing nothing at all would leave the loudest case -- a date set four hours out --
    #     completely silent, and silence is this watcher's one unforgivable failure mode.
    # Firing the nearest threshold is the only option that is both true and never silent. On the
    # ordinary hourly cadence exactly one threshold is ever crossed per run, so this rule and
    # "fire each one as you cross it" are the same rule; they only differ in the case above and in
    # the case where the mule was down across two thresholds, where the nearer one is the truth.
    fire = crossed[-1]                              # T_MINUS is ordered most distant first
    fired[key] = already + crossed
    body = T_MINUS_BODY[fire].format(left=humanise_gap(remaining), when=fmt_start_time(start_time))
    return [(f"{fire} TO THE DRAFT", body)], fired


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


def diff(prev, cur, moment=None, fired=None):
    """Everything worth waking someone for, most urgent first. Returns (entries, fired).

    PURE -- no I/O, and NO CLOCK READ. The countdown needs the current time, so the time arrives as
    the `moment` parameter; `now()` is called once by main() and threaded in. Omit it and the
    countdown simply stays quiet, which keeps the transition half usable on its own.

    `fired` in, `fired` out: the countdown's "already announced" flags are state, and state that
    diff() mutated in place would make it a liar about being pure.
    """
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

    # The one alert in this file that is NOT a transition. It sits here, directly under the
    # start_time block, because it is the same subject: STARTING GUN says the clock exists, and
    # these say how much of it is left. On the run where a date appears already inside a threshold
    # both fire, in that order, which reads correctly top-to-bottom in the append-only file.
    countdown, fired = t_minus(is_, moment, fired)
    out.extend(countdown)

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
                    f"REMEDY: docs/draft-day-runbook.md -- 'If the draft was re-created'.\n"
                    f"TEN FILES carry this id and feud_mule.ps1 is only the first of them; grep "
                    f"for the old id rather than trusting any line number. Fixing the mule alone "
                    f"leaves a board still pinned to the dead draft."))

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

    return out, fired or {}


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

    # ONE reading of the clock for the whole run, obtained HERE and threaded into diff(). The
    # countdown must not read the clock itself -- diff() is pure by contract, and a function that
    # reaches for now() cannot be pinned by a test or replayed against a snapshot.
    moment = now()

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
                        f"no longer the league's. The mule KEEPS its last-good copy on a failed "
                        f"fetch, so that cargo's start_time and draft_order stay null and this "
                        f"watcher will keep reporting 'no change' about a dead object.\n"
                        f"REMEDY: docs/draft-day-runbook.md -- 'If the draft was re-created'.\n"
                        f"TEN FILES carry this id and feud_mule.ps1 is only the first of them; "
                        f"grep for the old id rather than trusting any line number. Re-run the "
                        f"ladder too -- ladder.json is NOT self-healing, and Step 3.5 pipes it "
                        f"into the room where auto-pick drains it top-down."))

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
        # THE COUNTDOWN FLAGS ARE WRITTEN EMPTY HERE, DELIBERATELY. Pre-marking the thresholds a
        # brand-new baseline happens to be inside would be the STARTING GUN bug reborn one field
        # over: an alarm suppressed by state that was written before the alarm ever had a chance
        # to fire, with no trace anywhere. Empty means the next run -- an hour later -- announces
        # the nearest threshold. `fired` may only ever be advanced by t_minus() itself.
        save(cargo, {})
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

    transitions, fired = diff(prev, cargo, moment, load_fired(prev))
    entries.extend(transitions)
    save(cargo, fired)

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


def save(cargo, fired=None):
    """The snapshot, plus the countdown's fired flags.

    They share ONE file on purpose: the flags are only meaningful against the start_time in the
    same object, and two files can go out of step with each other in a way one file cannot.
    """
    with open(SNAPSHOT, "w", encoding="utf-8") as f:
        json.dump({"seen_at": now().strftime("%Y-%m-%d %H:%M:%S"), **cargo,
                   "fired": fired or {}}, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    sys.exit(main())

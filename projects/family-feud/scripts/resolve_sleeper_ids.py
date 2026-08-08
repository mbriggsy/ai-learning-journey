#!/usr/bin/env python3
"""Resolve and freeze every board row's Sleeper id, once, under adjudication.

    python scripts/resolve_sleeper_ids.py --fetch     refresh the pinned dump (network)
    python scripts/resolve_sleeper_ids.py             resolve, append to the ledger
    python scripts/resolve_sleeper_ids.py --verify    re-assert ledger vs dump, write nothing

WHY. The board joins to Sleeper on a RENDERED NAME, which is the one field that drifts:
nicknames, suffixes, compound surnames, and every spelling of a team defense. An id does not
drift. KTD-4 calls this the highest-leverage single change in the rebuild.

THE ID IS AN INPUT, NOT AN OUTPUT. It lives in a committed ledger keyed by board name, and this
script only ever APPENDS. A row that already carries an id and would now resolve to a different
one is a hard stop naming both ids -- never a silent overwrite. That turns an id change into a
one-line diff in a small file instead of an invisible byte inside a regenerated 53 KB board.

CANDIDATE GENERATION IS NOT A SIMILARITY SCORE, AND CANNOT BECOME ONE. Insight 004 measured the
floors and found them INVERTED -- 0.800 between genuinely different players, 0.370 between two
renderings of the same man -- so no threshold separates the populations, and "prefer active" or
"prefer higher years_exp" is that same threshold wearing a different hat. Two tiers, both exact:

  tier 1  (team, pos) AND normalized full name is EQUAL
  tier 2  (team, pos) AND at least one shared normalized name token     [only if tier 1 is empty]

Tier 1 is a unique-key lookup, not a preference among plausible humans: either exactly one dump
player on that (team, pos) normalizes to that exact name, or the row is a hard stop. It exists
because six real board rows have a TEAMMATE AT THE SAME POSITION sharing one name token --
Bijan/Brian Robinson, Josh/Kyle Allen, Joe Burrow/Joe Flacco, Marvin Harrison/Harrison Wallace,
Matthew Stafford/Matthew Caldwell, Xavier Worthy/Xavier Loyd. Tier 2 alone hard-stops all six;
tier 2 with a tie-breaker would be guessing between two men. Equality is neither.

ZERO AND MULTIPLE BOTH HARD-STOP, AND NOTHING IS WRITTEN WHEN ANY ROW FAILS. A resolver that
writes the rows it liked and complains about the rest leaves a half-populated ledger that reads
like a finished one.

THE DUMP IS PINNED, NEVER PULLED AT GENERATION TIME. A live dump moves the candidate set between
two runs on the same day, so "re-running changes no bytes" would be untestable. It also means the
generator never needs the network on draft morning -- the mule hauls league/users/draft/trending,
NOT /players/nfl, so U4 as originally written would have required a live fetch at the worst
possible moment.
"""
import argparse
import datetime as _dt
import gzip
import json
import os
import sys
import urllib.request
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KIT = os.path.join(ROOT, "draft-kit")
sys.path.insert(0, KIT)
from normalize import norm, tokens  # noqa: E402

BOARD_PATH = os.path.join(KIT, "players_data.json")
CACHE_PATH = os.path.join(KIT, "cache", "sleeper_players.json.gz")
LEDGER_PATH = os.path.join(KIT, "sleeper_ids.json")
DUMP_URL = "https://api.sleeper.app/v1/players/nfl"

# The fields the resolver and its evidence need. The full dump is 14.6 MB of scouting metadata;
# this reduction is 2.7 MB, 373 KB gzipped, and committable. Nothing here is a judgement call
# about which players matter -- ALL 12k records are kept, because dropping records is how a
# second candidate goes missing and a hard stop silently becomes a clean resolve.
KEEP_FIELDS = ("player_id", "first_name", "last_name", "full_name", "team", "position",
               "fantasy_positions", "years_exp", "status", "active")


class Stop(Exception):
    """A condition the operator must adjudicate. Never recoverable by guessing."""


# --------------------------------------------------------------------------- dump


def dump_name(p):
    """The dump's rendered name. DEF records carry no full_name -- first/last is the team."""
    full = p.get("full_name")
    if isinstance(full, str) and full.strip():
        return full
    return f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()


def fetch_dump(url=DUMP_URL, timeout=180):
    with urllib.request.urlopen(url, timeout=timeout) as r:  # noqa: S310 - fixed https endpoint
        if r.status != 200:
            raise Stop(f"{url} returned HTTP {r.status}")
        raw = json.loads(r.read().decode("utf-8"))
    if not isinstance(raw, dict) or len(raw) < 5000:
        raise Stop(f"dump looks wrong: {type(raw).__name__} with "
                   f"{len(raw) if hasattr(raw, '__len__') else '?'} records")
    reduced = {pid: {k: p[k] for k in KEEP_FIELDS if p.get(k) is not None}
               for pid, p in raw.items()}
    return {
        "source": url,
        "fetched_at": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
        "count": len(reduced),
        "players": reduced,
    }


def write_cache(cache, path=CACHE_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    blob = json.dumps(cache, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":")).encode("utf-8")
    # An unchanged dump must gzip to IDENTICAL bytes, or a re-fetch of the same data shows up as
    # a diff and "re-running changes no bytes" becomes untestable. Two headers leak otherwise:
    # mtime (hence mtime=0) and the source FILENAME (hence an explicit fileobj with filename="",
    # without which the same payload written to a.gz and b.gz differs in the header).
    with open(path, "wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=9, mtime=0) as f:
            f.write(blob)
    return len(blob)


def read_cache(path=CACHE_PATH):
    if not os.path.exists(path):
        raise Stop(f"no pinned dump at {path}\n"
                   f"  run: python scripts/resolve_sleeper_ids.py --fetch")
    with gzip.open(path, "rb") as f:
        cache = json.loads(f.read().decode("utf-8"))
    for key in ("fetched_at", "players", "count"):
        if key not in cache:
            raise Stop(f"pinned dump at {path} is missing {key!r}")
    if len(cache["players"]) != cache["count"]:
        raise Stop(f"pinned dump count {cache['count']} != {len(cache['players'])} records")
    return cache


# ------------------------------------------------------------------------ resolve


def index_by_slot(players):
    by_slot = defaultdict(list)
    for p in players.values():
        by_slot[(p.get("team"), p.get("position"))].append(p)
    return by_slot


def candidates(row, by_slot):
    """Return (tier, [candidates]). Tier 1 is exact; tier 2 is the token fallback."""
    slot = by_slot.get((row.get("team"), row.get("pos")), [])
    key = norm(row["name"])
    exact = [p for p in slot if norm(dump_name(p)) == key]
    if exact:
        return "exact_norm", exact
    want = tokens(row["name"])
    return "shared_token", [p for p in slot if tokens(dump_name(p)) & want]


def describe(p):
    return (f"id={p.get('player_id')} name={dump_name(p)!r} team={p.get('team')} "
            f"pos={p.get('position')} years_exp={p.get('years_exp')} "
            f"status={p.get('status')} active={p.get('active')}")


def resolve(board, cache, ledger):
    """Resolve every board row. Returns (entries, problems). Writes nothing."""
    players = cache["players"]
    by_slot = index_by_slot(players)
    known_teams = {p.get("team") for p in players.values() if p.get("team")}
    prior_ids = ledger.get("ids") or {}
    unresolved = {u["name"]: u for u in ledger.get("unresolved", [])}
    board_names = [r["name"] for r in board]
    entries, problems = {}, []

    # -- preconditions, each asserted rather than trusted --------------------------------

    # The ledger is keyed by board name, so two rows sharing a name would collapse into one
    # entry -- and the duplicate-id sweep below would never see the collision, because there
    # would only be one entry to compare.
    dup_names = sorted(n for n, c in Counter(board_names).items() if c > 1)
    if dup_names:
        problems.append(f"the board has duplicate name(s): {dup_names}. The ledger is keyed by "
                        f"name, so these cannot be told apart. Rename or remove one.")

    # Every board team code must be one Sleeper uses. The board said "JAC" for eight
    # Jacksonville rows while Sleeper's dump AND its live picks both say "JAX", which silently
    # disabled the engine's (team,pos) escalation for one team.
    stray = sorted({r["team"] for r in board if r.get("team")} - known_teams)
    if stray:
        problems.append(
            f"board uses team code(s) Sleeper does not: {stray}. Every (team,pos) lookup for "
            f"those rows returns nothing -- resolution AND the engine's unmatched-pick "
            f"escalation are both dead for them. Fix the board, not this script.")

    # The whole id scheme assumes the dump's key IS the player's id. Everything downstream --
    # every by-key re-assertion below, and every consumer that looks a pick's player_id up --
    # is nonsense if that is false.
    miskeyed = sorted(k for k, p in players.items() if p.get("player_id") != k)[:5]
    if miskeyed:
        problems.append(f"the pinned dump is keyed inconsistently with player_id: {miskeyed}")

    # APPEND-ONLY MEANS NOTHING MAY VANISH. `entries` is rebuilt from the board each run and
    # then replaces `ids` wholesale, so a row that is renamed or deleted would take its frozen
    # id with it -- silently, with the printed count unchanged. A rename is the dangerous half:
    # the new name has no prior, so it re-resolves from scratch and can freeze a DIFFERENT
    # man's id while every other check passes.
    orphans = sorted(set(prior_ids) - set(board_names))
    if orphans:
        problems.append(
            f"the ledger holds {len(orphans)} frozen id(s) whose board row is gone: {orphans}. "
            f"A renamed row would silently re-resolve under its new name and could freeze a "
            f"different player; a deleted row would drop its id. Adjudicate: if the row was "
            f"renamed, rename its ledger key to match; if it really left the board, delete the "
            f"entry deliberately.")

    # `unresolved` is a recorded decision, not a wildcard. It must name a real board row, and
    # it must never shadow a row that already has a frozen id -- the script's own remediation
    # message used to advise exactly that, which DELETED the id it told you to protect.
    rows_by_name = {r["name"]: r for r in board}
    for name, rec in sorted(unresolved.items()):
        if name not in rows_by_name:
            problems.append(f"unresolved entry {name!r} is not a board row")
        if name in prior_ids:
            problems.append(
                f"unresolved entry {name!r} already has a frozen id "
                f"({prior_ids[name].get('sleeperId')}). Listing it as unresolved would delete "
                f"that id. Remove it from 'unresolved', or delete the frozen entry on purpose.")
        for field in ("reason", "approved_on"):
            if not rec.get(field):
                problems.append(f"unresolved entry {name!r} has no {field!r}")
        # A parked row that resolves again must be un-parked deliberately. Left alone it would
        # sit in `ids` AND `unresolved` at once, which no consumer can interpret -- and while
        # parked it carries no frozen id, so it is still joining on a name that drifts.
        if name in rows_by_name:
            tier, cands = candidates(rows_by_name[name], by_slot)
            if tier == "exact_norm" and len(cands) == 1:
                problems.append(
                    f"unresolved entry {name!r} now resolves cleanly to "
                    f"{cands[0].get('player_id')}. Remove it from 'unresolved' and re-run.")

    # -- resolution ----------------------------------------------------------------------

    for row in board:
        name = row["name"]
        prior = prior_ids.get(name)
        tier, cands = candidates(row, by_slot)

        if len(cands) != 1:
            if name in unresolved:
                continue    # a recorded decision, not a silent gap
            if not cands:
                problems.append(
                    f"ZERO candidates for {name!r} ({row.get('pos')}/{row.get('team')}); "
                    f"searched (team={row.get('team')!r}, pos={row.get('pos')!r}, "
                    f"tokens={sorted(tokens(name))})")
            else:
                lines = "\n".join(f"       {describe(p)}" for p in cands)
                problems.append(
                    f"{len(cands)} candidates for {name!r} ({row.get('pos')}/{row.get('team')}) "
                    f"via {tier} -- NEVER auto-selected:\n{lines}")
            continue

        cand = cands[0]
        pid = cand.get("player_id")

        # A LONE SHARED-TOKEN CANDIDATE IS NOT AN IDENTIFICATION, AND IS ROUTINELY A TEAMMATE.
        # Six board rows have a same-position teammate sharing exactly one token, so the moment
        # a name re-renders (or a trade moves the real man off that team) tier 1 goes empty and
        # tier 2 returns precisely ONE candidate: the teammate. "Marvin Harrison" shares
        # 'harrison' with Harrison Wallace, also ARI/WR -- and every downstream check passes,
        # because Wallace really is a WR on ARI. Auto-accepting that freezes the wrong man
        # permanently. The engine may use this rule to RAISE A WARNING a human reads; a
        # one-time permanent freeze is a different act and needs a human either way.
        if tier == "shared_token" and not (prior and prior.get("sleeperId") == pid):
            shared = sorted(tokens(name) & tokens(dump_name(cand)))
            problems.append(
                f"{name!r} ({row.get('pos')}/{row.get('team')}) matched ONLY by shared token "
                f"{shared} -- proposing but NOT accepting:\n"
                f"       {describe(cand)}\n"
                f"       A lone shared-token match is often a same-position teammate. Confirm "
                f"this is the same man, then paste the id into the ledger by hand to approve "
                f"it; a later run will honour it.")
            continue

        # Cheap, and it catches the rookie/veteran collision that actually matters.
        if "R" in (row.get("badges") or []) and (cand.get("years_exp") or 0) > 0:
            problems.append(f"{name!r} is badged R (rookie) but {pid} has "
                            f"years_exp={cand.get('years_exp')} -- likely the veteran of the "
                            f"same name")
            continue

        # DEF convention, asserted rather than trusted: the id IS the team code.
        if row.get("pos") == "DEF" and pid != row.get("team"):
            problems.append(f"DEF row {name!r} resolved to {pid!r}, not its team code "
                            f"{row.get('team')!r} -- the convention U14 relies on is broken")
            continue

        if prior and prior.get("sleeperId") != pid:
            problems.append(
                f"{name!r} is FROZEN at {prior.get('sleeperId')} (resolved "
                f"{prior.get('resolved_on')}) but today's dump resolves it to {pid}. "
                f"The primary key is moving. Adjudicate; do not overwrite.")
            continue

        entries[name] = prior if prior else {
            "sleeperId": pid,
            "resolved_on": _dt.date.today().isoformat(),
            "dump_fetched_at": cache["fetched_at"],
            "evidence": {
                "team": row.get("team"),
                "pos": row.get("pos"),
                "matched": tier,
                "matched_token": (sorted(tokens(name) & tokens(dump_name(cand)))
                                  if tier == "shared_token" else None),
                "dump_name": dump_name(cand),
            },
        }

    # -- post-resolution re-assertion, BY KEY -------------------------------------------
    #
    # Not a re-check of what resolution just did. Resolution draws candidates out of the
    # (team,pos) bucket, so comparing the chosen candidate's team/pos back against the row is a
    # branch that cannot execute -- it agrees by construction, which is a verification step
    # that can never fail loudly (insight 006). Looking the FROZEN id up by key is a different
    # question with a different answer: a refreshed dump can drop a player or re-key him, and
    # then the ledger points at nothing, or at somebody else entirely.
    for name, entry in sorted(entries.items()):
        rec = players.get(entry["sleeperId"])
        row = next(r for r in board if r["name"] == name)
        if rec is None:
            problems.append(f"{name!r} is frozen at {entry['sleeperId']} but that id is not in "
                            f"the pinned dump at all -- Sleeper dropped or re-keyed him")
            continue
        if rec.get("position") != row.get("pos") or rec.get("team") != row.get("team"):
            problems.append(
                f"{name!r} is frozen at {entry['sleeperId']}, but that id is now "
                f"{rec.get('position')}/{rec.get('team')} in the dump while the board says "
                f"{row.get('pos')}/{row.get('team')} -- a different man, or a stale board")

    # A duplicate id is "one pick removes two board rows" arriving by a new road.
    dupes = {i: n for i, n in Counter(e["sleeperId"] for e in entries.values()).items() if n > 1}
    for pid, n in sorted(dupes.items()):
        who = sorted(k for k, v in entries.items() if v["sleeperId"] == pid)
        problems.append(f"id {pid} is claimed by {n} board rows: {who}")

    # Coverage as a SET, not arithmetic. Counting `len(entries) + len(unresolved)` double-counts
    # any name in both, and a stale unresolved entry could make the total come out right while
    # a real board row had no id at all.
    uncovered = sorted(set(board_names) - set(entries) - set(unresolved))
    if uncovered and not problems:
        problems.append(f"{len(uncovered)} board row(s) have neither an id nor a recorded "
                        f"decision: {uncovered[:10]}")

    return entries, problems


# ------------------------------------------------------------------------- ledger


def read_ledger(path=LEDGER_PATH):
    if not os.path.exists(path):
        return {"ids": {}, "unresolved": []}
    with open(path, encoding="utf-8") as f:
        led = json.load(f)
    led.setdefault("ids", {})
    led.setdefault("unresolved", [])
    return led


def ledger_bytes(ledger):
    """Stable serialisation -- re-running must change no bytes."""
    return json.dumps(ledger, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def write_ledger(ledger, path=LEDGER_PATH):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(ledger_bytes(ledger))


# --------------------------------------------------------------------------- main


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fetch", action="store_true", help="refresh the pinned dump (network)")
    ap.add_argument("--verify", action="store_true", help="check only; write nothing")
    ap.add_argument("--board", default=BOARD_PATH)
    ap.add_argument("--cache", default=CACHE_PATH)
    ap.add_argument("--ledger", default=LEDGER_PATH)
    args = ap.parse_args(argv)

    try:
        if args.fetch:
            cache = fetch_dump()
            size = write_cache(cache, args.cache)
            print(f"pinned {cache['count']} records ({size:,} bytes json -> "
                  f"{os.path.getsize(args.cache):,} bytes gz) at {cache['fetched_at']}")
            return 0

        with open(args.board, encoding="utf-8") as f:
            board = json.load(f)["players"]
        cache = read_cache(args.cache)
        ledger = read_ledger(args.ledger)
        entries, problems = resolve(board, cache, ledger)

        if problems:
            print(f"!! {len(problems)} problem(s) need adjudication -- NOTHING WAS WRITTEN\n")
            for p in problems:
                print(f"  - {p}")
            # This used to say "or add the row to the ledger's 'unresolved' list", which for a
            # row that ALREADY had a frozen id deleted that id -- the tool advising the operator
            # to destroy the one thing it exists to protect. resolve() now refuses that state
            # outright, and the wording no longer suggests it.
            print("\nResolve each by hand. Options, in order of preference:\n"
                  "  1. fix the board (a wrong team code, a name that drifted from Sleeper's)\n"
                  "  2. approve a proposed id by pasting it into the ledger's 'ids' by hand\n"
                  "  3. for a row that genuinely cannot resolve AND has no frozen id yet, add\n"
                  "     it to 'unresolved' with a reason and an approved_on date")
            return 1

        merged = dict(ledger)
        merged["ids"] = entries
        # A shallow dict() shares the SAME list object, which made --verify's unresolved check
        # compare a list to itself -- a branch that could never fire.
        merged["unresolved"] = [dict(u) for u in ledger.get("unresolved", [])]
        merged["meta"] = {
            "dump_fetched_at": cache["fetched_at"],
            "dump_source": cache.get("source", DUMP_URL),
            "board_rows": len(board),
        }
        new_bytes = ledger_bytes(merged)
        old_bytes = None
        if os.path.exists(args.ledger):
            with open(args.ledger, encoding="utf-8") as f:
                old_bytes = f.read()

        if args.verify:
            if old_bytes is None:
                print("!! --verify with no ledger on disk")
                return 1
            # Compare CONTENT, not bytes. A re-fetch of the same data moves meta.dump_fetched_at
            # and nothing else, and treating that as a failure would train the operator to
            # ignore this check -- which is the one that screams when a join key actually moves.
            was = {k: v["sleeperId"] for k, v in ledger.get("ids", {}).items()}
            now = {k: v["sleeperId"] for k, v in entries.items()}
            if was != now:
                moved = {k: (was.get(k), now.get(k)) for k in set(was) | set(now)
                         if was.get(k) != now.get(k)}
                print(f"!! {len(moved)} id(s) do not match what today's dump resolves:")
                for name, (a, b) in sorted(moved.items()):
                    print(f"  - {name!r}: ledger={a} dump={b}")
                return 1
            # There is deliberately no separate unresolved check here. The old one compared the
            # list against a copy of itself and could never fire; the question worth asking --
            # "does anything parked in 'unresolved' now resolve?" -- is asked by resolve(), so
            # it fires in BOTH modes rather than only under --verify.
            print(f"ledger verified: {len(entries)} ids, "
                  f"{len(merged['unresolved'])} unresolved, dump {cache['fetched_at']}")
            if old_bytes != new_bytes:
                print("   (provenance only: re-run without --verify to record this dump)")
            return 0

        if old_bytes == new_bytes:
            print(f"ledger unchanged: {len(entries)} ids (re-run is a no-op)")
            return 0
        write_ledger(merged, args.ledger)
        print(f"wrote {args.ledger}: {len(entries)} ids, "
              f"{len(merged['unresolved'])} unresolved, dump {cache['fetched_at']}")
        return 0

    except Stop as e:
        print(f"!! {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

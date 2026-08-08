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
    entries, problems = {}, []

    # Precondition, asserted rather than trusted: every board team code is one Sleeper uses.
    # The board said "JAC" for eight Jacksonville rows while Sleeper's dump AND its live picks
    # both say "JAX", which silently disabled the engine's (team,pos) escalation for one team.
    stray = sorted({r["team"] for r in board if r.get("team")} - known_teams)
    if stray:
        problems.append(
            f"board uses team code(s) Sleeper does not: {stray}. Every (team,pos) lookup for "
            f"those rows returns nothing -- resolution AND the engine's unmatched-pick "
            f"escalation are both dead for them. Fix the board, not this script.")

    for row in board:
        name = row["name"]
        prior = (ledger.get("ids") or {}).get(name)
        tier, cands = candidates(row, by_slot)

        if len(cands) != 1:
            if name in {u["name"] for u in ledger.get("unresolved", [])}:
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

        # Re-assert after the fact: a flip on either field is a different man or a stale dump.
        if cand.get("position") != row.get("pos") or cand.get("team") != row.get("team"):
            problems.append(f"{name!r} resolved to {pid} but the dump says "
                            f"{cand.get('position')}/{cand.get('team')} and the board says "
                            f"{row.get('pos')}/{row.get('team')}")
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

    # A duplicate id is "one pick removes two board rows" arriving by a new road.
    dupes = {i: n for i, n in Counter(e["sleeperId"] for e in entries.values()).items() if n > 1}
    for pid, n in dupes.items():
        who = sorted(k for k, v in entries.items() if v["sleeperId"] == pid)
        problems.append(f"id {pid} is claimed by {n} board rows: {who}")

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
            print(f"!! {len(problems)} row(s) need adjudication -- NOTHING WAS WRITTEN\n")
            for p in problems:
                print(f"  - {p}")
            print("\nResolve each by hand: fix the board, or add the row to the ledger's "
                  "'unresolved' list with a reason and an approved_on date.")
            return 1

        covered = len(entries) + len(ledger.get("unresolved", []))
        if covered != len(board):
            print(f"!! {covered} of {len(board)} board rows accounted for -- refusing to write")
            return 1

        merged = dict(ledger)
        merged["ids"] = entries
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
            if {u["name"] for u in ledger.get("unresolved", [])} != \
                    {u["name"] for u in merged["unresolved"]}:
                print("!! the unresolved list changed")
                return 1
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

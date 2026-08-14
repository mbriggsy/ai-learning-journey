#!/usr/bin/env python3
"""Board injury notes vs Sleeper's LIVE injury designations. READ-ONLY -- it never edits the board.

    python scripts/injury_check.py               # the report
    python scripts/injury_check.py --fetch-only  # refresh the cache and say nothing else

WHY THIS EXISTS. The board's per-player `note` prose is frozen at whatever day it was written, and
the I badge with it. Measured 2026-08-14 against a board synthesised the same day: **19 rows
carried a live Sleeper injury designation and NO I badge** -- including Christian McCaffrey at
board 8 -- while Jahmyr Gibbs, who had just become RB1, still carried a note reading "not
practicing as of 8/4" against a live status of nothing at all. Both directions were wrong at once,
and neither is visible from inside the repo.

WHAT IT DOES NOT DO, AND WHY. It does not rewrite a note. `rerank.py:20-28` is right that the notes
are the one thing on this board a machine has no business rephrasing, and this file agrees: it
REPORTS a disagreement and leaves the sentence to a human. Machine-written prose under a
hand-written label is the shape this project has refused everywhere else.

⚠️ WHAT `injury_status` IS AND IS NOT, so nobody reads more into it than it holds:
  * In August it is a PRACTICE-REPORT artifact, not a game-day designation. "Questionable" in
    mid-preseason routinely means a veteran had a limited session, and 27 of our 174 carried it on
    2026-08-14. Treat it as "somebody wrote something down", not as "he might not play".
  * It is therefore a POINTER AT WHICH ROWS TO RE-READ, never an input to a rank. Nothing here
    computes a value and nothing here writes a file the board reads.
  * A blank status is not proof of health -- it is proof Sleeper has no note today. The Gibbs case
    is a contract hold-in, which is exactly the kind of absence this field never carried.

THE JOIN IS THE FROZEN `sleeperId`, not a name. 174 of 174 board rows resolve against the live
dump, measured. Names drift; ids do not (U14).
"""
import argparse
import gzip
import json
import os
import sys
import urllib.error
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream degrades, never crashes
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
BOARD = os.path.join(KIT, "players_data.json")
CACHE = os.path.join(KIT, "cache", "sleeper_injuries.json.gz")

#: The full dump is ~12,000 players and several MB. We keep only what this report reads, which is
#: also what stops the cache becoming a second copy of the pinned /players/nfl dump U14 resolved
#: ids against -- two dumps that can disagree about a name is exactly the drift this repo hunts.
KEEP = ("injury_status", "injury_body_part", "injury_notes", "full_name", "team")

URL = "https://api.sleeper.app/v1/players/nfl"


class Refuse(Exception):
    """Raised rather than reporting off something that is not what we asked for."""


def fetch(url=URL, dest=CACHE, nonce=None):
    """Download, reduce to KEEP, and cache. The nonce is MANDATORY -- insight 020.

    Sleeper sits behind Cloudflare with `s-maxage` and `stale-while-revalidate`, and a stale
    response is indistinguishable from a fresh one at the call site. Every other fetch in this repo
    busts it; this one does too. A nonce fixed at import time would just be a second cache key,
    so it is generated per call.
    """
    if nonce is None:
        nonce = os.urandom(8).hex()
    req = urllib.request.Request(f"{url}?cb={nonce}",
                                 headers={"User-Agent": "family-feud/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, ValueError, OSError) as e:
        raise Refuse(f"could not fetch the Sleeper player dump: {e}")

    if not isinstance(raw, dict) or len(raw) < 5000:
        raise Refuse(f"the dump came back as {type(raw).__name__} with "
                     f"{len(raw) if hasattr(raw, '__len__') else '?'} entries -- expected a mapping "
                     f"of ~12,000. Refusing to cache it over good data.")

    slim = {pid: {k: p.get(k) for k in KEEP} for pid, p in raw.items()}
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".incoming"
    with gzip.open(tmp, "wt", encoding="utf-8") as f:
        json.dump(slim, f, ensure_ascii=False)
    os.replace(tmp, dest)          # promote only after a clean write, like the mule does
    return dest, len(slim)


def load(path=CACHE):
    if not os.path.exists(path):
        raise Refuse(f"no cache at {os.path.relpath(path, ROOT)} -- run with --fetch-only first")
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def board(path=BOARD):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def compare(players, dump):
    """(blind, cleared, agreeing, unjoined) -- every row classified, none silently dropped.

    `blind`     live designation, no I badge  -> the board is quiet about something Sleeper is not
    `cleared`   I badge, no live designation  -> the note may have healed under us
    `agreeing`  both                          -> re-read the prose, the body part may have changed
    `unjoined`  no row in the dump            -> reported, never counted as healthy
    """
    blind, cleared, agreeing, unjoined = [], [], [], []
    for p in sorted(players, key=lambda p: p.get("r", 10 ** 6)):
        row = dump.get(str(p.get("sleeperId") or ""))
        if row is None:
            unjoined.append(p)
            continue
        status = row.get("injury_status")
        badged = "I" in (p.get("badges") or [])
        entry = (p, status, row.get("injury_body_part"), row.get("injury_notes"))
        if status and not badged:
            blind.append(entry)
        elif badged and not status:
            cleared.append(entry)
        elif status and badged:
            agreeing.append(entry)
    return blind, cleared, agreeing, unjoined


def _line(p, status, part, width=24):
    tail = f"{status}" + (f" ({part})" if part and part != "Undisclosed" else "")
    return f"  r{p['r']:<5}{p['pos']:<5}{p['name']:<{width}}{tail}"


def report(players, dump):
    blind, cleared, agreeing, unjoined = compare(players, dump)
    out = []
    out.append("BOARD NOTES vs SLEEPER'S LIVE INJURY DESIGNATIONS -- read-only, nothing was written")
    out.append(f"  joined   : {len(players) - len(unjoined)} of {len(players)} board rows on the "
               f"frozen sleeperId")
    out.append("  ⚠ in August `injury_status` is a PRACTICE-REPORT artifact, not a game-day call.")
    out.append("    It says somebody wrote something down. It does not say he might not play, and")
    out.append("    nothing here feeds a rank.")
    out.append("")

    out.append(f"  [1] SLEEPER FLAGS HIM, THE BOARD IS SILENT -- {len(blind)} row(s)")
    out.append("      no I badge, so the board carries no injury prose at all for these")
    for p, s, part, _n in blind:
        out.append(_line(p, s, part))
    out.append("")

    out.append(f"  [2] THE BOARD FLAGS HIM, SLEEPER DOES NOT -- {len(cleared)} row(s)")
    out.append("      the note may have healed under us. A blank status is NOT proof of health --")
    out.append("      a contract hold-in never appears in this field at all.")
    for p, _s, _part, _n in cleared:
        out.append(f"  r{p['r']:<5}{p['pos']:<5}{p['name']:<24}{(p.get('note') or '')[:60]}")
    out.append("")

    out.append(f"  [3] BOTH AGREE -- {len(agreeing)} row(s); re-read the prose, the body part moves")
    for p, s, part, _n in agreeing:
        out.append(_line(p, s, part))

    if unjoined:
        out.append("")
        out.append(f"  [!] {len(unjoined)} row(s) did not join the dump and are NOT counted as "
                   f"healthy: {[p['name'] for p in unjoined][:8]}")

    out.append("")
    out.append("  Nothing here was written. To act on one: edit the `note` (and the I badge) in")
    out.append("  draft-kit/players_data.json by hand, then `python scripts/build_board.py`.")
    out.append("  The prose is not rewritten by machine -- same rule as rerank.py.")
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--fetch-only", action="store_true",
                    help="refresh the cache and print one line; report nothing")
    ap.add_argument("--no-fetch", action="store_true",
                    help="report off the cache on disk without touching the network")
    a = ap.parse_args(argv)

    try:
        if not a.no_fetch:
            dest, n = fetch()
            if a.fetch_only:
                print(f"ok ({n} players cached to {os.path.relpath(dest, ROOT)})")
                return 0
        print(report(board()["players"], load()))
    except Refuse as e:
        print(f"!! REFUSED: {e}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

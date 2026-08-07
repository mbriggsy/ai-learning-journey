#!/usr/bin/env python3
"""Fetch the Sleeper picks feed and merge it into draft-kit/picks.json.

    python3 scripts/merge_picks.py <draft_id>          # fetch + merge
    python3 scripts/merge_picks.py <draft_id> --check   # merge, then report only

This exists because the runbook told every draft-day session to "keep a merge script keyed on
pick_no" -- and there wasn't one. picks.json is the engine's second input and nothing in the
project explained where it came from, so each session was inventing it live, on a 120-second
clock. That is exactly how Mock #1 briefly lost pick 96.

Why merge at all, when /picks is cumulative and curl returns the whole array? Because a
truncated or partial response should never be able to DELETE picks we already hold. Union on
pick_no means a short read is a no-op instead of a silent regression. The endpoint being
cumulative makes this cheap, not unnecessary.

Writes into draft-kit/ (gitignored scratch) because draft_engine.py opens picks.json by literal
name from its own cwd.
"""
import json, os, sys, urllib.request

TIMEOUT = 15
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(os.path.dirname(HERE), "draft-kit")
PICKS = os.path.join(KIT, "picks.json")


def fetch(draft_id):
    url = f"https://api.sleeper.app/v1/draft/{draft_id}/picks"
    req = urllib.request.Request(url, headers={"User-Agent": "family-feud/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode("utf-8"))


def load_existing():
    if not os.path.exists(PICKS):
        return []
    try:
        with open(PICKS, encoding="utf-8") as f:   # cp1252 default would crash on accented names
            return json.load(f)
    except (json.JSONDecodeError, ValueError) as e:
        sys.exit(f"picks.json exists but is not valid JSON ({e}).\n"
                 f"Move it aside and re-run -- do NOT hand-repair it mid-draft.")


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: merge_picks.py <draft_id> [--check]\n"
                 "  real league draft_id: 1390509994847240192")
    draft_id = sys.argv[1]

    before = {p["pick_no"]: p for p in load_existing()}
    try:
        incoming = fetch(draft_id)
    except Exception as e:
        sys.exit(f"fetch failed: {e}\npicks.json left untouched -- retry, do not advise off stale state.")

    if not isinstance(incoming, list):
        sys.exit(f"unexpected response shape: {type(incoming).__name__}. picks.json left untouched.")

    merged = dict(before)
    merged.update({p["pick_no"]: p for p in incoming})   # union; newest wins, nothing is dropped
    picks = [merged[k] for k in sorted(merged)]

    os.makedirs(KIT, exist_ok=True)
    with open(PICKS, "w", encoding="utf-8") as f:
        json.dump(picks, f, ensure_ascii=False)

    # Same gate the engine enforces, reported here so a hole is visible BEFORE the clock matters.
    nos = [p["pick_no"] for p in picks]
    n = max(nos, default=0)
    dupes = sorted({x for x in nos if nos.count(x) > 1})
    gaps = [i for i in range(1, n + 1) if i not in set(nos)]

    added = len(merged) - len(before)
    print(f"picks.json: {len(picks)} picks, highest pick_no {n} ({added} new this fetch)")
    if picks:
        last = picks[-1]
        md = last.get("metadata") or {}
        who = f"{md.get('first_name','')} {md.get('last_name','')}".strip() or "?"
        print(f"  latest: #{last['pick_no']} {who} {md.get('position','?')} (slot {last.get('draft_slot','?')})")

    if gaps or dupes:
        print("!" * 62)
        if gaps:
            print(f"!! MISSING pick(s): {gaps}")
        if dupes:
            print(f"!! DUPLICATE pick(s): {dupes}")
        print("!! The engine will refuse to advise. Re-run this script; if a gap persists,")
        print("!! the feed itself is short -- wait one poll and re-run. DO NOT hand-edit.")
        print("!" * 62)
        return 1

    print("  no gaps, no duplicates -- engine will accept this file")
    return 0


if __name__ == "__main__":
    sys.exit(main())

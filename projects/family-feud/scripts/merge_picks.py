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
import itertools, json, os, sys, time, urllib.request

TIMEOUT = 15
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(os.path.dirname(HERE), "draft-kit")
PICKS = os.path.join(KIT, "picks.json")

CACHE_BUST_PARAM = "cb"
_nonce_seq = itertools.count(1)


def picks_url(draft_id):
    """The /picks URL carrying a nonce that has never been used before.

    Sleeper serves this endpoint through Cloudflare with `stale-while-revalidate=300` and a TTL
    that varies by draft status -- measured 2026-08-09 on a live 8-team mock: `s-maxage=30`
    while `pre_draft`, `15` while `drafting`, `86400` once `complete`. Two consequences, both
    measured rather than reasoned:

      * The PLAIN url was behind the truth on **76 of 77 observations** during a live draft, by
        up to **16 picks** (mean 8.1). It is not occasionally stale, it is essentially always
        stale. Worse, the cached `pre_draft` body (0 picks, 30s TTL) kept being served for 30+
        seconds after the draft began -- reporting an EMPTY draft while 16 picks were down.
      * `stale-while-revalidate` hands the STALE copy to the request that triggers the refresh
        and the fresh one to whoever asks next. One client polling a private draft is always the
        triggering request, so it never wins the race it started.

    Why the query param and not a header: a `Cache-Control: no-cache` REQUEST header does not
    work -- measured, Cloudflare ignored it and still answered `cf-cache-status: HIT` with the
    stale body. A URL nobody has asked for is the only lever available from this side.

    THE NONCE MUST BE UNIQUE ON EVERY CALL. Reusing one just re-reads that nonce's own cached
    copy, which is the original bug wearing a fix's clothes -- and a completed draft's entry
    carries a 24-hour TTL, so a repeated nonce can pin you to a day-old answer.
    """
    nonce = f"{time.time_ns()}-{os.getpid()}-{next(_nonce_seq)}"
    return f"https://api.sleeper.app/v1/draft/{draft_id}/picks?{CACHE_BUST_PARAM}={nonce}"


def warn_cache_hit():
    print("!" * 70)
    print("!! THE CACHE-BUSTER IS NOT WORKING -- a never-before-used URL returned")
    print("!! cf-cache-status: HIT, which is only possible if the nonce stopped busting.")
    print("!! Sleeper may have started normalising query params, or a proxy is collapsing")
    print("!! them. This feed can be up to 16 picks behind the real draft board.")
    print("!!")
    print("!! It is NOT a hard failure: this is the behaviour that shipped for months, and a")
    print("!! false red on draft morning teaches you to skip the check. But treat every")
    print("!! '0 new this fetch' as suspect and confirm against the Sleeper board by eye.")
    print("!" * 70)


def fetch(draft_id):
    req = urllib.request.Request(picks_url(draft_id),
                                 headers={"User-Agent": "family-feud/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        cache_status = (r.headers.get("cf-cache-status") or "").strip().upper()
        body = json.loads(r.read().decode("utf-8"))
    if cache_status == "HIT":
        warn_cache_hit()
    return body


BAD_SHAPE = ("picks.json exists but is not a Sleeper picks array ({why}).\n"
             "Move it aside and re-run -- do NOT hand-repair it mid-draft.")


def load_existing():
    if not os.path.exists(PICKS):
        return []
    try:
        with open(PICKS, encoding="utf-8") as f:   # cp1252 default would crash on accented names
            data = json.load(f)
    except (json.JSONDecodeError, ValueError) as e:
        sys.exit(f"picks.json exists but is not valid JSON ({e}).\n"
                 f"Move it aside and re-run -- do NOT hand-repair it mid-draft.")

    # Shape, not just syntax. `curl` on a bogus draft id returns the literal string `null`, and the
    # runbook pushes curl as the reading tool -- so a null file is a live draft-day scenario, and it
    # used to reach the guard and traceback before a single draft_id was read. A hand-repaired file
    # can also land as a bare object. Fail with the message that was written for this moment.
    if not isinstance(data, list):
        sys.exit(BAD_SHAPE.format(why=f"top level is {type(data).__name__}, expected a list"))
    bad = next((i for i, p in enumerate(data) if not isinstance(p, dict)), None)
    if bad is not None:
        sys.exit(BAD_SHAPE.format(why=f"entry {bad} is {type(data[bad]).__name__}, expected an object"))
    return data


def foreign_draft_ids(picks, draft_id):
    """draft_ids present in `picks` that are not `draft_id`, plus a marker for picks carrying none.

    Every Sleeper pick object carries draft_id at the top level -- it is in the documented response
    shape. A pick without one did not come from this API and cannot be vouched for.
    """
    seen = set()
    for p in picks:
        got = p.get("draft_id")
        seen.add("<no draft_id>" if got is None else str(got))
    return sorted(seen - {str(draft_id)})


def refuse_contaminated(where, foreign, draft_id, n):
    print("!" * 70)
    print(f"!! {where} HOLDS PICKS FROM A DIFFERENT DRAFT -- REFUSING TO MERGE")
    print(f"!! requested draft_id : {draft_id}")
    print(f"!! also found         : {', '.join(foreign)}   ({n} picks total)")
    print("!!")
    print("!! This is the failure mode nothing else can catch. Union-on-pick_no does not care")
    print("!! where a pick came from, so a spent mock's picks merge in cleanly: the pick_nos stay")
    print("!! contiguous and unique, the engine's integrity gate passes, and it advises off a")
    print("!! board where every elite player is already 'drafted'. Exit code 0. No warning.")
    print("!!")
    print(f"!! FIX: move {PICKS} aside and re-run. Do not hand-merge it.")
    print("!" * 70)


def main():
    FLAGS = ("--check", "--rebuild")
    USAGE = ("usage: merge_picks.py <draft_id> [--check] [--rebuild]\n"
             "  --check   merges and reports WITHOUT writing picks.json\n"
             "  --rebuild writes the fetched feed VERBATIM instead of merging into what is on\n"
             "            disk. Only after a VANISHED warning, once a re-run has confirmed the\n"
             "            pick really was reversed upstream.\n"
             "  real league draft_id: 1390509994847240192")
    argv = sys.argv[1:]
    check_only = "--check" in argv
    rebuild = "--rebuild" in argv
    # Reject unknown flags rather than ignoring them. Swallowing `--dry-run` or a mistyped `-check`
    # and then WRITING is the same belief-mismatch that made the fake --check dangerous: the
    # operator thinks nothing happened to disk and is wrong.
    unknown = [a for a in argv if a.startswith("-") and a not in FLAGS]
    if unknown:
        sys.exit(f"unrecognised option(s): {' '.join(unknown)}\n"
                 f"Refusing to run rather than guess -- did you mean --check?\n{USAGE}")
    argv = [a for a in argv if a not in FLAGS]
    if not argv:
        sys.exit(USAGE)
    # A pasted id often arrives with a trailing newline or slash. Comparing that raw against the
    # draft_id on each pick fired the contamination alarm on a perfectly clean file, and printed
    # two ids that look identical because the difference is invisible. Worse than useless.
    draft_id = argv[0].strip().rstrip("/")
    if not draft_id.isdigit():
        sys.exit(f"draft_id {draft_id!r} is not numeric -- check what you pasted.\n{USAGE}")

    existing = load_existing()

    # --- contamination gate: refuse before the network call, so a poisoned file fails instantly.
    # picks.json is gitignored, so a spent mock's picks sit there invisibly -- git status never
    # shows them and no other guard in the system looks. Reproduced end to end on Aug 7.
    foreign = foreign_draft_ids(existing, draft_id)
    if foreign:
        refuse_contaminated("picks.json", foreign, draft_id, len(existing))
        return 2

    before = {p["pick_no"]: p for p in existing}
    try:
        incoming = fetch(draft_id)
    except Exception as e:
        sys.exit(f"fetch failed: {e}\npicks.json left untouched -- retry, do not advise off stale state.")

    if not isinstance(incoming, list):
        sys.exit(f"unexpected response shape: {type(incoming).__name__}. picks.json left untouched.")

    # Belt and braces: the endpoint is keyed on draft_id so this should be impossible. If it ever
    # fires, the API surprised us and writing the file would be the wrong move.
    foreign = foreign_draft_ids(incoming, draft_id)
    if foreign:
        refuse_contaminated("THE SLEEPER RESPONSE", foreign, draft_id, len(incoming))
        return 2

    # A DUPLICATE IN THE FEED HAS TO BE SEEN BEFORE THE DICT DESTROYS IT. `merged` is keyed on
    # pick_no, so the list rebuilt from it CANNOT hold a duplicate -- which made the `dupes` gate
    # below provably empty and its branch unreachable, while reading as protection and claiming
    # parity with the engine's copy. The engine's version can genuinely fire, because it reads a
    # raw list off disk. This one never could. (Insight 006.)
    incoming_nos = [p["pick_no"] for p in incoming if isinstance(p, dict) and "pick_no" in p]
    feed_dupes = sorted({x for x in incoming_nos if incoming_nos.count(x) > 1})

    # THE UNION CAN ONLY GROW, so a pick removed upstream became a permanent phantom: pick_nos
    # stay contiguous, the integrity gate passes, and the engine counts a player as drafted who
    # is actually available for the rest of the draft. A commissioner reversing a pick is
    # ordinary. It is also indistinguishable from a truncated fetch -- so this reports and
    # refuses to decide, rather than guessing in either direction.
    disappeared = sorted(set(before) - set(incoming_nos))

    if rebuild:
        picks = sorted((p for p in incoming if isinstance(p, dict) and "pick_no" in p),
                       key=lambda p: p["pick_no"])
    else:
        merged = dict(before)
        merged.update({p["pick_no"]: p for p in incoming})  # union; newest wins, nothing dropped
        picks = [merged[k] for k in sorted(merged)]

    if not check_only:
        os.makedirs(KIT, exist_ok=True)
        with open(PICKS, "w", encoding="utf-8") as f:
            json.dump(picks, f, ensure_ascii=False)

    # Same gate the engine enforces, reported here so a hole is visible BEFORE the clock matters.
    # Under --rebuild this one is live, because `picks` is the feed itself rather than dict values.
    nos = [p["pick_no"] for p in picks]
    n = max(nos, default=0)
    dupes = sorted({x for x in nos if nos.count(x) > 1})
    gaps = [i for i in range(1, n + 1) if i not in set(nos)]

    added = len(set(nos) - set(before))
    dropped = len(set(before) - set(nos))
    where = "picks.json (DRY RUN, not written)" if check_only else "picks.json"
    how = " REBUILT from the feed" if rebuild else ""
    print(f"{where}{how}: {len(picks)} picks, highest pick_no {n} ({added} new this fetch"
          + (f", {dropped} dropped)" if dropped else ")"))
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

    if feed_dupes:
        print("!" * 62)
        print(f"!! THE FEED SERVED DUPLICATE pick_no(s): {feed_dupes}")
        print("!! Merging is keyed on pick_no, so the duplicate was collapsed -- newest wins,")
        print("!! and one of the two is now absent from the record entirely.")
        print("!! Re-run once. If it repeats, Sleeper is serving inconsistent data and the")
        print("!! merged file cannot be trusted. DO NOT hand-edit it.")
        print("!" * 62)

    if disappeared and rebuild:
        # --rebuild IS the operator saying "yes, I confirmed it, drop them". Re-raising the alarm
        # he just answered would make the escape hatch unusable. Still recorded, never silent.
        print(f"  --rebuild: dropped {len(disappeared)} pick(s) no longer in the feed: "
              f"{disappeared}")
    elif disappeared:
        print("!" * 62)
        print(f"!! {len(disappeared)} pick(s) VANISHED from the feed: {disappeared}")
        print("!! picks.json is a union and can only grow, so they are STILL in the file.")
        print("!! Either a pick was reversed upstream, or this fetch came back short -- from")
        print("!! here those look identical, so nothing was decided for you.")
        print("!! Re-run once. If they are still gone, the pick really was reversed:")
        print(f"!!   python scripts/merge_picks.py {draft_id} --rebuild")
        print("!! Until then the engine may count a player as drafted who is available, and")
        print("!! picks-until-you is off by one.")
        print("!" * 62)

    if gaps or dupes or feed_dupes or (disappeared and not rebuild):
        return 1

    if check_only:
        # Never sign off on disk state we did not create. "engine will accept this file" read as
        # "you are clear to run the engine" -- while the engine would go on reading the OLD file.
        print("  no gaps, no duplicates -- but NOTHING WAS WRITTEN (--check).")
        print("  picks.json on disk is unchanged; the engine will read whatever was already there.")
    else:
        print("  no gaps, no duplicates -- engine will accept this file")
    return 0


if __name__ == "__main__":
    sys.exit(main())

---
title: The CDN served a contiguous prefix, and every gate we own passed it
date: 2026-08-09
phase: draft-prep
modules: [scripts/merge_picks.py, scripts/templates/board.html, tests/test_merge_picks.py]
tags: [caching, staleness, draft-day, silent-failure, insight-005, insight-013, cross-surface-drift]
---

## Problem

`merge_picks.py` fetched the Sleeper picks feed from the bare URL:

```python
url = f"https://api.sleeper.app/v1/draft/{draft_id}/picks"
```

That endpoint is served through Cloudflare. Measured 2026-08-09 on a live 8-team mock draft
(`1392201422979739648`), polling the plain URL and a nonce-busted URL in the same tick:

- **The plain URL was behind the truth on 76 of 77 observations during the live draft.**
- **Max 16 picks behind. Mean 8.1.** It was correct exactly once — after the draft had ended.
- Worse at the start: the cached `pre_draft` body (**0 picks**) kept being served for **30+
  seconds after picks began**, so the feed reported an empty draft while 16 picks were down.

The TTL depends on draft status. All three measured:

| draft status | `cache-control` |
|---|---|
| `pre_draft` | `public, s-maxage=30, stale-while-revalidate=300` |
| `drafting`  | `public, s-maxage=15, stale-while-revalidate=300` |
| `complete`  | `public, s-maxage=86400, stale-while-revalidate=300` |

## Why nothing caught it

**A stale response is a contiguous prefix.** Picks 1…109 with no gaps, no duplicates, no foreign
`draft_id`. It passes:

- `merge_picks.py`'s own gap/duplicate gate — there are no gaps in a prefix
- `merge_picks.py`'s contamination gate — every pick is from the right draft
- `draft_engine.py`'s integrity gate — which derives board state from `max(pick_no)` and
  hard-exits on interior gaps or duplicate `pick_no`s. **A prefix has neither.**

Every guard in the project is built to catch a feed that is *malformed* or *foreign*. None was
built to catch one that is *well-formed, authentic, and old*. The engine would then name a
player who was taken two picks ago, with exit code 0 and no warning — the exact outcome the
integrity gate exists to prevent, arriving through a door it does not watch.

The union-on-`pick_no` merge is why this never destroyed data: staleness can only fail to ADD
picks, never delete them. That is also why it stayed invisible.

## The mechanism, which is the part that matters

```
[315.2] truth=109  plain=93   behind=16  cf=UPDATING  age=16
[316.9] truth=110  plain=109  behind=1   cf=HIT       age=1
```

`stale-while-revalidate` serves the **stale** copy to the request that triggers the refresh, and
the fresh copy to whoever asks next. **A single client polling a private draft is always the
triggering request, so it never wins the race it started.**

This inverts the intuition that a slow draft is safer. It is not:

- **Fast draft** → many picks land per cache cycle → you are wrong by up to 16.
- **Slow human draft** → one pick lands per cycle → you are wrong by **1**, and it is *the pick
  that just happened* — the single pick most likely to have taken the player you are about to be
  advised to draft. **You always fetch right after a pick lands, because that is what "your turn"
  means.** The error shrinks and the risk concentrates.

A `Cache-Control: no-cache` **request** header does not help. Measured: Cloudflare ignored it and
still answered `cf-cache-status: HIT` with the stale body. A URL nobody has asked for is the only
lever available from the client side.

## The lesson that should have prevented this

**U7 already knew.** `scripts/templates/board.html` has busted the cache since it shipped:

```js
const res = await fetch(PICKS_URL + '?_=' + Date.now(), { cache: 'no-store', credentials: 'omit' });
```

with a comment reading *"CACHE-BUSTING IS NOT OPTIONAL… `s-maxage=30, stale-while-revalidate=300`."*
The knowledge was discovered, fixed, and written down **in the browser surface**, and never
carried to the Python surface that does the same job on draft day.

This is [insight 005](005-the-tie-breaker-agreed-with-the-board-by-construction.md)'s meta-lesson
landing a second time, in the other direction. **A lesson fixed in one surface and not propagated
to the other is a note, not a fix.** When you find a foreign-source behaviour, grep for *every*
place the project touches that source before you close the finding — `grep -rn "api.sleeper.app"`
took ten seconds and would have found this the day U7 shipped.

That comment was also **wrong about which status it measured** — it attributed `s-maxage=30` to a
live draft, but 30 is the `pre_draft` value. Correct number, wrong label, because it was read off
a board that had not started. Corrected in place with all three values.

## Fix

`scripts/merge_picks.py` grew `picks_url(draft_id)`, which appends a nonce that is unique on
every call (`time_ns` + pid + a process-local counter). Verified on the wire: three consecutive
fetches through the shipped path all returned `cf-cache-status: MISS` with 120 picks, while the
plain URL at the same instant returned `HIT` with `Age: 445`.

**The nonce must be unique per CALL, not per process or per page load.** A nonce fixed at startup
is asked for once and cached like any other URL — the original bug wearing a fix's clothes. This
is why the board's buster lives at the fetch site and not on the `PICKS_URL` constant, and it is
mutant M2 below.

`fetch()` also warns when a never-before-used URL comes back `HIT`, which is only possible if the
bust stopped working (Sleeper normalising query params, or a proxy collapsing them). It **warns
rather than exits**: this is the behaviour that shipped for months, and a false red on draft
morning teaches the operator to skip the check ([insight 009](009-the-test-suite-was-red-against-source-that-no-longer-existed.md)).

## Verification

8 tests added (36 in the file, 682 in the suite, 0 failures). Five mutants, each on a **different
axis**, per [insight 019](019-the-mutants-only-probe-the-axis-you-already-suspect.md) — five
variations of "is there a nonce" would have swept clean while the call site sat unwired:

| mutant | axis | killed by |
|---|---|---|
| M1 `picks_url` returns the bare endpoint | is there a nonce at all | 4 tests |
| M2 nonce computed once, reused every call | is it unique per call | 3 tests |
| M3 `fetch` builds its own plain URL | **is the call site wired** | **1 test** |
| M4 the `HIT` warning is unreachable | is the alarm connected | 1 test |
| M5 the warning fires on every response | does the alarm over-fire | 2 tests |

**M3 is killed by exactly one test** — `test_fetch_actually_requests_the_busted_url`. Without it,
`picks_url` stays perfect, all four of its own tests stay green, and `fetch` silently sends the
plain URL. [Insight 013](013-every-guard-was-tested-and-not-one-was-proven-connected.md) exactly,
caught on purpose this time rather than in review.

⚠️ **The mutation harness itself under-reported first.** It scraped `-v` progress lines for
`") ... FAIL"`, but unittest prints `... FAIL` on the **docstring** line for any test that has
one — so it silently hid exactly the tests that bothered to explain themselves. The KILLED
verdicts were sound (they come from the exit code); the attribution was not. Parse the
`FAIL: <name>` block headers instead. **An instrument built to measure your verification needs
verifying too.**

## Rule

- **A well-formed, authentic, stale response is invisible to every structural gate.** Gaps,
  duplicates and provenance are all checks on *shape*. Freshness is a separate axis and needs its
  own guard.
- **Never trust a shared cache on a feed whose whole value is being current.** Read the
  `cache-control` and `cf-cache-status` headers before believing a poll interval buys you
  anything, and remember `stale-while-revalidate` punishes the lone poller specifically.
- **When you learn something about a foreign source, grep every call site in the repo before
  closing it.** A fix in one surface is a note until it reaches the others.

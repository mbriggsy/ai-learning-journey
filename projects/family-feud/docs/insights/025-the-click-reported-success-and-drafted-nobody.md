# 025 — The click reported success and drafted nobody

date: 2026-08-14
modules: [scripts/sleeper_draft_console.js, docs/draft-day-runbook.md]
status: **one finding PROVEN, one cause UNRESOLVED — read the split before acting**

## What happened

First live exercise of the browser half in *this* environment (Windows + Claude-in-Chrome) since
the Cowork migration. Mock `1394049093545758720`, 8-team snake, our seat **slot 4**, seat chosen by
Sleeper and deliberately not 3 so the project's most attractive wrong answer could not pass by
coincidence.

Picks 1-3 went Bijan / Gibbs / Nacua. The API confirmed 3 picks in and next = #4 = ours. `ffFind`
located Ja'Marr Chase in **10 ms** and reported `hasDraftControl: true`. Then:

```
ffDraft("Ja'Marr Chase")  ->  {"clicked": true, "player": "Ja'Marr Chase", "confirmed": false}
/picks (cache-busted)     ->  still 3 picks. Nothing on slot 4.
```

**The click reported success and drafted nobody.** The clock ran out while I diagnosed, Sleeper
auto-picked, and the room put us on auto-pick for the remaining 116 picks.

## The thing that worked is the thing that matters

`ffDraft` returns `confirmed: false` and a note saying *"CLICK ONLY — confirm against /picks"*.
That design is the only reason this was caught rather than believed. The file's own fifteen-line
warning — **the browser cannot be the oracle for its own action** (insight 007) — fired for real,
in the exact shape it predicted, on the exact control it was written about.

⚠️ **`picked_by` did NOT settle it and cannot.** Chase *did* end up on slot 4 at pick #4, stamped
`picked_by: 1390750540631150592`. That looks like proof our click worked. It is not: `picked_by`
identifies the SEAT OWNER, not the agent, so auto-pick on a claimed seat stamps the same id. The
only evidence that separates the two is the **timestamped pick count taken immediately after the
click** — 3, unchanged. Take that reading before the clock can expire, or the question becomes
unanswerable.

## What the click actually did

It opened the **player-card modal** — Chase's age, height, college, rankings, and a lone `Cancel`.
The element was correctly identified: `DIV.draft-button-wrapper`, 34×40, one `<svg>`, no own text,
matching `draftButton()`'s shape test exactly. So the selector is right and the actuation is not.

## 🚨 THE CAUSE IS UNRESOLVED. Do not write it up as settled.

Two candidates, both consistent with everything observed:

**(a) Synthetic `.click()` does not actuate this build.** Supporting: the modal's `Cancel` was also
clicked via `.click()` and the modal **stayed open**; a real `Escape` keypress closed it
immediately. The runbook already records the AUTO-PICK toggle as immune to synthetic events
including a full pointerdown/mousedown/pointerup/mouseup sequence. If this is the cause,
`ffDraft`, `ffQueue` and `ffUnqueue` are ALL affected, because every one of them ends in `.click()`.

**(b) The button was inert because our clock had not started.** The API said pick #4 was next, but
"next pick is ours" and "our clock is live" are not the same instant. `locate()`'s own comment
says the control renders whether or not it is our turn and *"its presence therefore proves nothing
about whether a click will pick."* A click on an inert button plausibly falls through to the row,
which is exactly what opens the player card.

**Settling it needs one clean turn on a No-Limit clock**, where the room has visibly been on our
pick for several seconds before anything is clicked, and where a synthetic click and a real
ref-click can be tried in sequence without a timer destroying the trial.

## What IS proven, and is worth keeping

- ✅ **`ffStartDraft` works end to end here.** Both guards refused first — no flag, `'yes'`, and
  `false` all returned the refusal without clicking — then the real call started the draft, and
  `window.confirm` came back **native and the same function object**. The restore is the safety
  property and it held.
- ✅ **`setSearch` works.** React's native value setter drives Sleeper's search box; the box read
  back the exact string. This is the mechanism the whole console rests on and it is intact.
- ✅ **`ffFind` works** — 10 ms, exact-name match, correct shape detection.
- ✅ **An empty queue let Sleeper's own board fill K at #109 and DEF at #116**, on schedule. That is
  the floor control behind the mandatory-slot warning shipped the same day: the null model really
  does cover the mandated slots, so "clear the queue" is sound advice and "build a cleverer queue"
  remains unnecessary.
- ✅ **Miss one clock and Sleeper auto-picks the REST of the draft.** Reproduced exactly: one missed
  pick at #4, then 116 consecutive auto-picks.

## Two environment facts that cost time

- **Chrome's CSP blocks fetching the console from localhost.** `fetch('http://127.0.0.1:…')` →
  `Failed to fetch` (connect-src). `eval` itself is fine. So the console must be **pasted inline**.
  Verification that the paste is faithful: hash each `window.ff*.toString()` in-page with djb2
  after stripping comments and collapsing whitespace, and compare against the same normalisation of
  the file. Five of six matched exactly on the first attempt; the sixth differed by 48 characters
  that turned out to be a **trailing comment**, not logic.
- **The async-IIFE return is swallowed.** `(async () => {...})()` returns a promise and the tool
  serialises it as `{}` — three separate results were lost this way, and one of them was a
  `ffStartDraft` call that had actually run. **Use top-level `await` inside a plain object
  literal**, and when a call returns `{}`, assume the side effects happened and go read the state.

## The process error, written down because it is the reusable part

The runbook says to set **No Limit** per pick for mechanism testing. I judged 120 s "ample for two
JS calls", skipped it, and then spent the clock diagnosing the failure — which lost the pick, put
the seat on auto-pick, and **destroyed the ability to run a second trial in that room.** The
setting exists precisely so that a diagnosis cannot cost the thing being diagnosed. Set it first,
every time, even when the clock looks generous. A mechanism test that races a timer is a mechanism
test you get one attempt at.

## The meta-lesson, which is Briggsy's

He pointed out that every session re-learns this app's mechanics from scratch. The evidence is in
this repo: the runbook already carries *"the window is NOT moving… bullet rewritten so future
sessions don't blame the human"* — a lesson written down **specifically so it would not be
re-derived**, which was nonetheless re-derived. Prose in a long document is not where procedural
knowledge survives. **Next step: a project skill built from measured clicks, carrying a
20-second self-test at the top so the next session RE-PROVES the control instead of trusting a
sentence.** A skill that asserts unverified clicks would rot exactly the way this runbook section
did — which is why it must be written after the mapping run, not from this one.

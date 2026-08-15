# 025 — The click reported success and drafted nobody

date: 2026-08-14 · **RESOLVED 2026-08-15**
modules: [scripts/sleeper_draft_console.js, docs/draft-day-runbook.md]
status: **RESOLVED — the cause was NEITHER candidate below. Read this header, then the correction
at the bottom; the two candidate sections are kept as history and are both WRONG.**

> ## ✅ THE ANSWER: we were clicking the empty box around the button.
>
> `draftButton()` returned `row.children[0]` = `div.draft-button-wrapper`, a layout div that owns
> **no handler at all**. The `onClick` is on its **child**, `div.draft-button`. **DOM events bubble
> UP, never DOWN** — so the click could never reach the handler, and instead bubbled *up* into
> `div.player-rank-item2`'s `onPlayerSelected`, which is precisely what opens the player card.
>
> **The selector was wrong by exactly one level. The actuation mechanism was never broken.**
>
> Confirmed two independent ways on 2026-08-15: by reading Sleeper's shipped 12.1 MB bundle
> (`draft-button-wrapper` renders at 3 sites, **zero** with an `onClick`), and by walking the live
> React props in the room. Fixed in `scripts/sleeper_draft_console.js`; 4 mutants planted, 4 killed.
>
> **The reusable law, which is the part that travels:** clicking a DESCENDANT of the handler works;
> clicking an ANCESTOR does nothing *and quietly hands your click to whatever ancestor handler sits
> above it* — which is how a dead control disguises itself as a different feature working.
>
> 🚨 **The DIAGNOSIS is settled. The FIX is still unfired in a live room** — no API-confirmed pick
> has yet gone through the corrected selector.

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
The element found was `DIV.draft-button-wrapper`, 34×40, one `<svg>`, no own text, matching
`draftButton()`'s shape test exactly.

> ✏️ **THIS PARAGRAPH ORIGINALLY ENDED "So the selector is right and the actuation is not." THAT
> WAS EXACTLY INVERTED, and it is the sentence that aimed a full day of investigation at the wrong
> question.** The shape test passed *because* it reached through children: `first.querySelectorAll('svg')`
> searches **descendants**, so a test written to describe the BUTTON was satisfied by the WRAPPER
> and reported the wrong node with total confidence. **A structural test that reaches through
> children cannot tell you which node it matched** — that is the transferable lesson, and it is a
> cousin of insight 008 (a broken instrument returns a value that reads like a finding).
>
> The geometry recorded here belongs to the wrapper too: `.draft-button` itself is **24×24**, and
> `draft-button-wrapper` appears **zero** times in the stylesheet — it is unstyled scaffolding
> sized by the row.

## 🚨 THE CAUSE IS UNRESOLVED. Do not write it up as settled.

> ⚠️ **HISTORY, PRESERVED — BOTH CANDIDATES BELOW ARE WRONG. Resolved 2026-08-15; see the header.**
> They are kept because the *reasoning* was sound given what was known, and because the way both
> were falsified is the useful part. Do not act on either.

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

---

## ✅ HOW IT WAS ACTUALLY SETTLED — 2026-08-15, and it needed no draft at all

The paragraph above was wrong about what it would take. **No clock, no pick, and no live draft were
required** — the question was answerable from Sleeper's own shipped source plus a read-only walk of
the DOM. Both candidates died, each to a different piece of evidence:

**Cause (a) — "synthetic `.click()` does not actuate this build" — FALSIFIED, twice.**
- `grep -c isTrusted` over the whole **12.1 MB** app bundle returns **0**. React 16's
  root-delegated dispatch has no mechanism to distinguish a synthetic click from a human one.
- **Positive proof, controlled pair, live room:** a synthetic click on `.autopick-toggle .slider`
  **toggled AUTO-PICK** — the one control this file and the runbook both called immune — while the
  identical synthetic click on its **wrapper** changed nothing. Restored clean.
- The three synthetic successes were never luck. `ffQueue` clicks an `<img>` *inside*
  `div.queue-action[onClick]`; `ffUnqueue` clicks `div.delete-button[onClick]` exactly;
  `ffStartDraft` clicks a *child* of `div.start-draft-button[onClick]`. **Descendant, exact,
  descendant.** The two failures are both the ancestor case.
- ⚠️ The `Cancel`-vs-`Escape` evidence cited for (a) is **confounded** and should never have been
  weighed as strongly as it was: it compared a *real keypress* against a *synthetic click*, varying
  two things at once. A synthetic Escape was never tried.

**Cause (b) — "the button was inert because our clock had not started" — a REAL gate, but not this
failure.** `_onClickDraft` runs `stopPropagation()` **first, unconditionally, before** it tests the
disabled flag. So a click landing on a *disabled* `.draft-button` dies inside the handler and **the
modal cannot open**. The modal opened — therefore the click never reached the button, whatever the
clock was doing. *(The gate itself is real and is now refused explicitly, before the click.)*

### The part that should change behaviour, not just belief

🚨 **Fixing this DELETED our alarm.** While we were clicking the wrapper, failure was *loud* — a
player card appeared on screen. Aimed correctly, a click on a disabled button is **silent**: no
pick, no modal, no exception, and a byte-identical `{clicked:true}`. **The fix would have made the
bug quieter than the bug.** So `ffDraft` now refuses a `.disable` button *before* clicking, and
after clicking polls for `.picking` / `div.spinner` — state `_onClickDraft` sets inside its own
body. That `handlerRan` flag is an **intra-handler fingerprint**, the equivalent of
`ffStartDraft`'s `confirmsAnswered: 1`. It is **not** confirmation: `/picks` remains the only oracle.

**A green suite proved nothing here, and that is the fourth time.** The stub made `row.children[0]`
the button itself, so the tests were *structurally incapable* of catching this — 28 of them stayed
green through a control that drafted nobody. The stub now models the wrapper/button split and
counts wrapper clicks separately. **4 mutants planted, 4 killed; restoring the original bug fails
7 tests.** (Insight 013 and 019, again: a test written against the same mental model as the code
ratifies the bug.)

## ✅✅ LIVE-PROVEN THE SAME DAY — mock `1394132992183517184`, 2026-08-15

An explanation is not an actuation, so one was fired. **`ffDraft` drafted a player and the API
confirmed it.**

```
baseline /picks (cache-busted)  ->  0 picks
ffDraft("Ja'Marr Chase")        ->  {clicked:true, handlerRan:true, btnHandlers:["onClick"]}  9ms
/picks (cache-busted)           ->  pick_no=1, round=1, draft_slot=1,
                                    Ja'Marr Chase (WR, CIN),
                                    picked_by=1390750540631150592   <- PoppaBriggsy
```

**The live DOM matched both predictions exactly**, which is the part that makes this more than one
lucky click:

| node | class | rect | handlers |
|---|---|---|---|
| `row.children[0]` | `draft-button-wrapper` | **34×40** | **`[]`** |
| its child | `draft-button` | **24×24** | **`["onClick"]`** |

34×40 is the geometry this very file recorded for the element it clicked on 2026-08-14; 24×24 is
what the stylesheet says the real button is. Wrapper owns nothing, button owns the handler, button
is a descendant.

### 🚨 `picked_by` CAN settle it — but only on a No-Limit clock. This file said it never could.

The warning above ("`picked_by` did NOT settle it and cannot") is true **under a running clock** and
false under No Limit, and the difference is worth more than the pick it proved:

- Auto-pick fires **only when a user runs out of time** (Sleeper's own settings copy). With
  `pick_timer: 0` **there is no timeout**, so auto-pick has no trigger — it is not merely unlikely,
  it is mechanically impossible. That removes the ONLY other process that stamps our `picked_by`.
- Corroborated three more ways: the AUTO-PICK toggle read `checked:false`; the queue was empty; and
  **Sleeper ranked Chase RK 3** while picks #2 and #3 went Gibbs and Bijan — so auto-pick would have
  taken RK 1, not Chase. **Our click chose a player Sleeper's own board would not have.**

**So: set No Limit not just to buy diagnosis time, but because it is what makes the oracle
unambiguous.** That is a better reason than the one this file gave, and it survives being rushed.

### The whole console is now live-proven, control by control

| call | result | oracle |
|---|---|---|
| `ffStartDraft` guards ×3 | all refused, `confirm` untouched | in-page |
| `ffStartDraft({iAmInAMock:true})` | `confirmsAnswered:1`, `confirm` restored native | API: `status` → `drafting` |
| `ffFind` | found in 0 ms, `hasDraftControl:true` | — |
| **`ffDraft`** | **`handlerRan:true`** | **API: 0 → pick #1 on our slot** |
| `ffQueue('Cameron Dicker')` | empty → 1, 106 ms | Sleeper's own queue count |
| `ffQueueList` | `agrees:true` | cross-check vs count |
| `ffUnqueue` | 1 → empty, 100 ms | Sleeper's own queue count |
| `ffAutoPick(true/false)` | toggled both ways; third call idempotent | the checkbox, not the click |

### The last unmapped control, and the bug reproduced on demand

- **Clicking the wrapper re-opened the player card**, live, deliberately — body text grew 3,912
  chars. The defect is reproducible at will, which is what makes the fix falsifiable.
- **The modal's `Cancel` is a `<button>` owning NO handler**, and no ancestor within 6 hops owns
  one — so the 2026-08-14 synthetic click on it genuinely could do nothing. ✅ **But the modal DOES
  close synthetically: click `.modal-item-underlay`, which owns an `onClick`.** Third instance of
  the same law. The `Escape` comparison was never needed.
- ⚠️ **Still not mapped:** whatever native listener `Cancel` itself hangs off. Page script cannot
  enumerate native listeners (`getEventListeners` is DevTools-only), so this is a limit of the
  instrument, not a finding. **Use the underlay.**

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

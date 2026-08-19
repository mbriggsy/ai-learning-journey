---
name: sleeper-draft-room
description: "Drive Sleeper's draft room from code — find, draft, queue, unqueue, toggle
  AUTO-PICK, start a mock, set the pick clock. Use whenever a task touches a Sleeper draft
  room in a browser: running a mock draft, rehearsing the draft-day loop, firing a real
  pick, debugging why a click 'worked' but nothing happened, or mapping a control whose
  behaviour is unknown. Also use before ANY browser work on sleeper.com so the self-test
  runs first. Do NOT use for Sleeper's HTTP API alone (no browser involved) — that is
  docs/data-access.md and scripts/merge_picks.py."
---

# Sleeper draft room — measured, not remembered

Every fact here was measured in a live room on **2026-08-15** and is reproducible by the
self-test below. Nothing in this file is recalled from a session transcript.

> **Why this file exists.** The runbook already carried a lesson written down *specifically so
> it would not be re-derived* — and it got re-derived anyway, at the cost of a pick. Prose in a
> long document is not where procedural knowledge survives. **So this skill leads with a test,
> not a claim.** If the test fails, this file is wrong and you must re-map before touching
> anything. That is the point. Do not "work around" a failing self-test.

---

## THE LAW — one sentence, and it explains every failure this project has had

**DOM events bubble UP, never DOWN.** Clicking a **descendant** of the handler works. Clicking an
**ancestor** does nothing *and silently hands your click to whatever ancestor handler sits above
it* — which is how a dead control disguises itself as a different feature working.

Sleeper wraps its controls in handler-less layout `div`s. **Aim at the node that owns the
handler.** `isTrusted` appears **zero** times in Sleeper's 12.1 MB bundle (React 16, root-delegated),
so synthetic clicks are indistinguishable from human ones. **Synthetic is never the problem. Aim is.**

---

## ▶ STEP 0 — RUN THE SELF-TEST. ALWAYS. ~20 seconds.

Paste `scripts/sleeper_draft_console.js` into the room's console first (see *Pasting the console*),
then run this. It is **read-only except one AUTO-PICK toggle, which it restores.**

```js
// FF DRAFT-ROOM SELF-TEST -- re-proves the DOM contract instead of trusting this file.
var R = {}, PLAYER = 'Ja\'Marr Chase';   // any player still on the board

// ALL 13 helpers, not a sample -- a STALE full paste (an old console file) passes any subset
// that omits the newest names, and ffQueueSync is the only re-arm mechanism. Roster verified
// against `grep "window.ff" scripts/sleeper_draft_console.js` 2026-08-19.
R.consoleInstalled = ['ffFind','ffDraft','ffQueue','ffQueueList','ffUnqueue','ffUnqueueVerdict',
                      'ffQueueSync','ffSyncPlan','ffStartDraft','ffAutoPick','ffQueueVerdict',
                      'ffReadQueue','ffHandlerProps'].every(function (k) { return typeof window[k] === 'function'; });
R.readsReact16 = String(window.ffHandlerProps).indexOf('__reactEventHandlers$') !== -1;
R.searchBoxPresent = !!document.querySelector('input[placeholder*="Find player"]');

// -- WARM-UP, and it is NOT optional. The player grid is virtualised and unpopulated on a
// cold page load, and locate()'s 4000ms budget can expire before the first row paints. That
// fails playerFound AND all five draft-control checks below it -- 7 of 12 -- and prints
// "FAIL: STOP, re-map" over a room that is perfectly healthy. Measured 2026-08-15 on a fresh
// mock: the first ffFind missed at 4000ms, the very next one found the row in waitedMs:1.
// A false red here is the DANGEROUS direction: it teaches the operator to skip the gate.
if (R.searchBoxPresent) { try { await window.ffFind(PLAYER); } catch (e) {} }

// -- the draft control contract (the 2026-08-14 defect lives here) --
var found = R.searchBoxPresent ? JSON.parse(await window.ffFind(PLAYER)) : { ok: false };
R.playerFound = found.ok === true;
var w = document.querySelector('.draft-button-wrapper');
var b = document.querySelector('.draft-button');
R.wrapperExists       = !!w;
R.buttonExists        = !!b;
R.wrapperOwnsNothing  = !!w && window.ffHandlerProps(w).length === 0;
R.buttonOwnsOnClick   = !!b && window.ffHandlerProps(b).indexOf('onClick') !== -1;
R.buttonIsDescendant  = !!w && !!b && w.contains(b) && w !== b;
R.wrapperIsRowChild0  = !!w && w.parentElement.children[0] === w;

// -- reversible ACTUATION proof: the only control safe to actually fire --
var apOn  = JSON.parse(await window.ffAutoPick(true));
var apOff = JSON.parse(await window.ffAutoPick(false));
R.syntheticClickActuates = apOn.ok === true && apOn.changed === true
                        && apOff.ok === true && apOff.changed === true;
R.autopickRestoredOff = document.querySelector('.autopick-toggle input[type=checkbox]').checked === false;

var failed = Object.keys(R).filter(function (k) { return R[k] !== true; });
({ checks: R, FAILED: failed, VERDICT: failed.length === 0 ? 'PASS -- this file is still true'
   : 'FAIL -- STOP. Re-map before drafting. Do not trust the control map below.' });
```

**A `FAIL` on `wrapperOwnsNothing` or `buttonOwnsOnClick` means Sleeper's DOM rotated.** Re-run the
handler walk (below) and update this file *before* you draft anything.
**A `FAIL` on `syntheticClickActuates`** means the actuation story changed — that is a bigger deal
than a moved class, and nothing in this file should be trusted until it is understood.

---

## The control map — every row measured, with the oracle that proved it

| control | **click THIS node** | owns | oracle that confirms it worked |
|---|---|---|---|
| **Draft a player** | `row.children[0].querySelector('.draft-button')` — **24×24** | `onClick` | **`/picks` pick count**, cache-busted. Nothing else. |
| ~~the wrapper~~ | ~~`row.children[0]` = `.draft-button-wrapper` — 34×40~~ | **nothing** | 🚨 clicking it drafts nobody and opens the player card |
| **Queue** | `img[src*="queue.png"]` (inside `div.queue-action[onClick]`) | — (descendant, fine) | Sleeper's own `QUEUE (n)` count, **+1 exactly** — but a count is right about a **number** and cannot be right about an **identity**; for that, only the trailing `ffQueueList()` read-back counts |
| **Re-arm the whole queue** | `ffQueueSync([...])` — one call, both directions | (drives Queue + Unqueue) | `synced:true` **from reading the queue back**, plus `ffQueueList()` showing `empty:false` and the names in order |
| **Unqueue** | the entry's `REMOVE` (`div.delete-button[onClick]`) | `onClick` | `QUEUE (n)`, **−1 exactly** |
| **AUTO-PICK** | `.autopick-toggle .slider` | `onClick` | the `input[type=checkbox]`'s `.checked` |
| ~~the toggle box~~ | ~~`.autopick-toggle`~~ | **nothing** | 🚨 3 levels above the handler; no event sequence reaches it |
| **Start draft** | the node whose *own text* is `START DRAFT` (`div.start-draft-text`) | **nothing** — fires by bubbling **up** to `div.start-draft-button[onClick]` | API `status` leaves `pre_draft` |
| **Close player card** | `.modal-item-underlay` | `onClick` | the `.player-card` node disappears |
| ~~the card's Cancel~~ | ~~`<button>Cancel</button>`~~ | **nothing**, none in 6 ancestors | 🚨 synthetic click does nothing. Use the underlay. |
| **Claim a seat** | `.claim-text` — 🚨 **there are TWO per team (16 nodes for 8 teams)**, so index N is NOT team N; select by the parent's `Team N` text, never by position | `onClick` | the CLAIM label becomes your username |
| **Room menu** | the `.action-button` whose `onClick` contains `showMenu` | `onClick` | body text grows; menu items appear |
| **Settings option** | `.custom-horizontal-select-item` with the wanted text | `onClick` | it gains `.selected` |

⚠️ **`START DRAFT` is the counterexample that kills the tempting shortcut.** You might be tempted to
add a rule like *"always click the node carrying the behaviour class."* **That rule breaks
`ffStartDraft`**, which correctly matches the handler-*less* child. The real invariant is
**depth-relative**: *the node you click must be at-or-below the node owning the handler you intend,
with no unintended handler in between.*

⚠️ **`.draft-button` is NOT unique** — 7 occurrences across 4 contexts, including an auction variant
whose handler calls `_hoverPlayer` and never drafts. **Always scope the query inside the row's
wrapper.** Never `document.querySelector('.draft-button')`. There is no `.auction-button` class;
do not write that fallback.

### Mapping any control this table does not list

```js
// Walk UP from a node until you find who actually owns the handler.
(function (el) {
  function hp(e) {
    var k = Object.keys(e).find(function (x) { return x.indexOf('__reactEventHandlers$') === 0
                                                  || x.indexOf('__reactProps$') === 0; });
    return k ? Object.keys(e[k]).filter(function (n) { return /^on[A-Z]/.test(n); }) : [];
  }
  var out = [], n = el, h = 0;
  while (n && n.nodeType === 1 && h < 8) {
    out.push({ hop: h, tag: n.tagName, cls: String(n.className || '').slice(0, 60), handlers: hp(n) });
    n = n.parentElement; h++;
  }
  return out;
})(document.querySelector('YOUR_SELECTOR_HERE'))
```

🚨 **Use `__reactEventHandlers$` — Sleeper is React 16.** Probing only React 17's `__reactProps$`
returns `[]` on *every* node and reads exactly like *"no handler here."* That false negative will
send you hunting a phantom. `getEventListeners()` is DevTools-only and returns `undefined` to page
script — anything built on it fails silently.

---

## The run, in order

### 1. 🚨 SET "No Limit" FIRST. Non-negotiable.

Skipping this is what destroyed the 2026-08-14 run: 120s looked ample, the clock expired *during the
diagnosis*, the pick was lost, and the seat went to auto-pick for 116 straight picks — making a
second trial in that room impossible.

> 🚨 **THE ONE CARVE-OUT: A DELIBERATE CLOCK TEST.** *(Added 2026-08-17. Following this step
> verbatim would have destroyed the 2026-08-15 rehearsal, whose entire purpose was measuring
> whether the Step 3 loop fits inside a real 120-second clock — No Limit removes the very pressure
> being measured.)* If the task is to time the loop under a live clock, **leave the timer at 120
> and know what you give up:**
> - **`picked_by` becomes untrustworthy.** Auto-pick fires only on timeout, and it stamps the
>   **seat owner's** id — yours. A pick you never made looks exactly like success. This is the
>   whole reason No Limit is the default: `pick_timer: 0` makes auto-pick impossible and thereby
>   makes `picked_by` mean something.
> - **So confirm every fire by the pick COUNT** in `/picks` (cache-busted), and by the player
>   landing on your `draft_slot`. Never by `picked_by`.
> - **Keep the queue armed at all times** (`ffQueueSync`), so a blown clock degrades to OUR board
>   instead of Sleeper's.
>
> Outside that one case, this step stands exactly as written.

**But the better reason is that it makes your oracle trustworthy.** `picked_by` names the **seat
owner**, not the agent, so auto-pick on your own seat stamps *your* id and looks exactly like
success. ~~Auto-pick fires only on timeout — so at `pick_timer: 0` it is mechanically impossible~~
🚨 **HALF-FALSE, and the false half burned a whole mock on 2026-08-19.** `pick_timer: 0` disarms
only the TIMEOUT autopick. **Mocks carry a SECOND, independent clock: `CPU Autopick`, further down
the same Draft Settings modal, DEFAULTING TO `60Seconds`** — after 60s on a CLAIMED seat the CPU
fires and stamps the **seat owner's id**, indistinguishable from your own fire. Mock #1 that day
(`1395856103018881024`): picks #5 and #12 landed under our id, never fired by us, then the whole
120-pick draft completed CPU-vs-CPU while the settings modal was being fought. **Set BOTH to
NoLimit before starting** — only then is `picked_by` trustworthy. The API cannot verify the second
clock: `settings.cpu_autopick` is `1` either way and no delay field is public — the UI selection is
the only readable receipt, and the room HOLDING on your first pick is the only proof.

Path (the in-room ⚙ is **not** in the a11y tree, and the `2 Min Per Pick` label owns **no handler** —
it is inert text; an older runbook line claiming it is clickable was wrong):

```js
// menu -> Draft Settings -> TIME PER PICK -> No Limit -> UPDATE
[].slice.call(document.querySelectorAll('.action-button'))
  .filter(function (e) {
    var k = Object.keys(e).find(function (x) { return x.indexOf('__reactEventHandlers$') === 0; });
    return k && e[k].onClick && /showMenu/.test(String(e[k].onClick));
  })[0].click();
```
Then click the `.item` whose `.title` reads exactly `Draft Settings` (**guard against `Delete Draft`,
which sits in the same menu**), then the `.custom-horizontal-select-item` reading `No Limit`, then
the `UPDATE` `<button>`.

**Confirm against the API, not the header:**
```bash
curl -sL --max-time 15 "https://api.sleeper.app/v1/draft/<id>?cb=$(date +%s%N)" | grep -o '"pick_timer":[0-9]*'
# pick_timer must be 0
```

### 2. Claim a seat (mocks only)

Click a `.claim-text` **after verifying its parent's text names the team you want** — and note
there are **TWO `.claim-text` nodes per team (16 for 8 teams)**, so naive indexing lands 2× off and
claims someone else's seat while looking like it worked. Claiming
**Team 1** gives you pick 1.1, so you are on the clock the instant the draft starts — the fastest
path to a fire test. The label becomes your username; that also confirms which account Chrome holds.

### 3. Start it

```js
await window.ffStartDraft({ iAmInAMock: true })   // -> {clicked:true, confirmsAnswered:1}
```
Both guards refuse first if you get the call wrong, and `window.confirm` is restored in a `finally`
— **verify it came back native**, that restore is the safety property. Then confirm `status` left
`pre_draft` via the API.

**Read your seat from `draft_order`, never `slot_to_roster_id`:**
```bash
curl -sL --max-time 15 "https://api.sleeper.app/v1/draft/<id>?cb=$(date +%s%N)" | python -c "import json,sys; print(json.load(sys.stdin)['draft_order'].get('1390750540631150592'))"
```
`slot_to_roster_id` is the identity map `{1:1 … 8:8}` — it returns whatever you give it and reads
like confirmation. There are three unrelated "3"s in this league.

### 4. Fire

```js
await window.ffDraft("Ja'Marr Chase")
```

Read the return field by field:

| field | meaning |
|---|---|
| `clicked: true` | a click was dispatched. **Says nothing about a pick.** |
| `handlerRan: true` | `.picking` / `div.spinner` appeared — `_onClickDraft`'s **body** ran. An in-page signal. |
| `btnHandlers: ["onClick"]` | the node clicked really owned a handler. **`[]` ⇒ the DOM rotated. STOP.** |
| `confirmed: false` | **always false, by design.** The browser is never the oracle for its own action. |
| `reason: "...DISABLED — our clock is not live"` | refused *before* clicking. Sleeper styles `.disable` with colour only, so a disabled button accepts clicks and silently does nothing. |

**Then confirm, immediately, before anything can move:**
```bash
python scripts/merge_picks.py <draft_id>     # busts the CDN cache -- insight 020
```
Check the **pick COUNT moved** and the player is on **your** `draft_slot`. ⚠️ **Never confirm from
`picked_by` under a running clock** — see step 1.

### 5. Keep something queued, always

A blown clock then degrades to *your* board instead of Sleeper's. Measured cost of not doing it:
auto-pick took Tetairoa McMillan (81.3) at 5.3 while Lamar Jackson (~107) sat there until #40.

**Use `ffQueueSync`, not a hand-rolled loop.** One call, fed the `queue` array
`precompute_ladder.py` prints, and it is the whole re-arm:

```js
await window.ffQueueSync(["Puka Nacua", "Jaxon Smith-Njigba", "Amon-Ra St. Brown"])
// -> {"synced":true,"queue":[...],"note":"verified by reading the queue back..."}
```

Live-proven 2026-08-17, all four paths in **2.3s total**: load-from-empty (771ms), append the next
man after one was drafted away (438ms), **refuse** a reorder it was not given permission for (1ms,
queue untouched), and `{rebuild:true}` to force the order (1127ms).

- 🚨 **`synced` comes from READING THE QUEUE BACK, never from the per-call results.** Measured
  2026-08-15: re-arming four names returned `queued:true` for three and the queue held **two** —
  Jayden Daniels reported success and was absent, because a bot drafted him mid-loop and an
  unrelated add saw the `+1` and was credited with it. `ffQueue`'s oracle is correct about a
  **count** and cannot be correct about an **identity**.
- 🚨 **It refuses to reorder destructively.** Sleeper APPENDS and auto-pick drains from the TOP, so
  "just add the missing names" is right only when the additions belong at the bottom — the common
  case, since board order is stable and survivors keep their relative order. When appending would
  not produce the target it returns `synced:false` with the plan rather than clearing your safety
  net on its own authority. Pass `{rebuild:true}` only when you mean it.
- 🚨 **The queue drains silently — so read `empty`, and never infer it from `entries.length`.**
  *(FIXED 2026-08-17. This bullet used to say the unsafe state reads as healthy; it no longer
  does.)* `ffQueueList()` now returns:
  | state | `count` | `entries` | `empty` | `agrees` | what it means |
  |---|---|---|---|---|---|
  | queue is empty | `null` | `[]` | **`true`** | `null` | 🚨 **NO SAFETY NET — re-arm now.** Carries a `note` naming `ffQueueSync` |
  | healthy | `3` | 3 rows | `false` | `true` | verified |
  | **panel blind** | `3` | `[]` | `false` | **`false`** | ⚠️ the queue is FINE, the reader is not |
  | label ≠ panel | `5` | 3 rows | `false` | `false` | mid-render or collapsed |
  **`agrees` used to short-circuit `true` on zero entries, which masked TWO unsafe states at once**
  — the genuinely empty queue (three of seven 2026-08-15 rehearsal picks were fired that way and
  nothing said so) *and* the blind panel. The blind panel is the worse of the two: it produces a
  wrong ACTION, because "empty" sends you to `{rebuild:true}` to re-arm a queue that was already
  correct, destroying it. **`empty` keys off Sleeper's own words — "No players in your queue" —
  never off `entries.length`**, and `agrees` is now only the label-vs-panel cross-check, `null`
  when there is no label to check against.

---

## Pasting the console

**Chrome's CSP blocks `fetch` from localhost** (`connect-src`), so `scripts/sleeper_draft_console.js`
must be pasted **inline**. `eval` itself is fine. Stripping comments takes it from ~34 KB to ~12 KB
with no behaviour change:

```bash
python -c "import re;s=open('scripts/sleeper_draft_console.js',encoding='utf-8').read();s=re.sub(r'/\*.*?\*/','',s,flags=re.S);s=re.sub(r'^\s*//.*','',s,flags=re.M);open('temp/console_paste.js','w',encoding='utf-8').write('\n'.join(l.rstrip() for l in s.split('\n') if l.strip()))"
wc -c temp/console_paste.js && node --check temp/console_paste.js && echo "PARSES"
```

🚨 **It writes to a FILE on purpose — do not "simplify" it to `print(...)`.** Windows Python
defaults stdout to **cp1252**, and this file contains `ʼ` (U+02BC) in `norm()`'s apostrophe class, so
printing dies with `UnicodeEncodeError` and produces **zero bytes**. Measured 2026-08-15 while
writing this skill. **And `node --check` returns OK on an empty file**, so the obvious verification
reports success over nothing — insight 008 exactly. That is why the `wc -c` is there: **check the
byte count, not just the parse.** (~12 KB is right.)

Verify the paste landed the *current* logic — the install banner alone does not prove it:
```js
({ installed: Object.keys(window).filter(k => k.startsWith('ff')).sort(),
   hasFix: String(window.ffDraft).includes('handlerRan'),
   react16: String(window.ffHandlerProps).includes('__reactEventHandlers$') })
```

---

## Landmines

- 🚨 **THE DRAFT SETTINGS MODAL, measured 2026-08-19 (all four cost real time):**
  (a) **`CPU Autopick` is below the fold** — the modal scrolls, and until you scroll, its section
  is not merely off-screen, it is **absent from the DOM**, so a full-page text hunt honestly
  reports it does not exist. Scroll the modal's scroller to the bottom first.
  (b) **Option labels concatenate their sublabels**: the node's textContent is `NoLimit`,
  `2Minutes`, `60Seconds` — an exact-match on `'No Limit'` finds nothing and reads like a missing
  feature.
  (c) **Opening Draft Settings twice STACKS two whole modals** — two UPDATE buttons at the
  IDENTICAL rect. An exact-text query refuses on the duplicate (correctly); resolve with
  `document.elementFromPoint(...)` to click whichever is really on top, and prefer never reopening:
  set EVERYTHING in one visit, one UPDATE.
  (d) **An open room menu adds a second `Start Draft`** — `ffStartDraft` refuses on the pair.
  Close the menu (underlay/Escape) or click `div.start-draft-text` directly after verifying
  `div.start-draft-button` owns `onClick`.
- 🚨 **Sleeper's DISPLAY names differ from the board's names, and the browser search only speaks
  display.** Measured: board `Kenneth Gainwell` → room `Kenny Gainwell`; `ffDraft("Kenneth …")`
  returned `no exact match` with an EMPTY grid, which reads like a virtualisation blip. When an
  exact fire misses a player the engine swears is available, **probe with a partial search (last
  name) and read what the grid actually calls him** before diagnosing anything else. The data-side
  join is immune (frozen sleeperIds); only the search box is exposed.

- **`(async () => {…})()` returns a promise the browser tool serialises as `{}`.** Three results were
  lost that way, one from a call that had actually run. **Use top-level `await`** and end with a
  plain object literal. If you do get `{}`, assume the side effects happened and go read the state.
- **Never click by screenshot coordinate.** Screenshot scale oscillates on a window nobody is
  touching — 1568×750 and 1568×763 observed in one session, and 1522×784 on another. It cost a real
  pick (McBride, 2.6). **Address the DOM.** And never blame the human for a "moving" window.
- **The player list is virtualised** and is empty for a moment after the draft starts — a first
  `ffFind` can honestly return `no exact match` while the row is about to appear. `locate()` polls
  for this reason; **poll, never sleep a flat interval.**
- **Mocks never appear in `/user/<id>/drafts`.** Get a mock's id from the card's React key on
  `/draftboards`, or from the room URL.
- **The `+` on `/draftboards` is the LEAGUE wizard**, not the mock creator — it once created a stray
  1-person league. **The mock creator is `NEW MOCK NFL DRAFT` in the right-hand panel.**
  🚨 **The two navigate DIFFERENTLY, and this line used to state only the half that is convenient.**
  *(Corrected 2026-08-17.)* **`NEW MOCK NFL DRAFT` navigates the SAME tab** — which wipes your
  console paste, so budget a re-paste immediately after creating one (see *Pasting the console*;
  a navigation wiping the console is already recorded there). Only clicking an **existing** mock
  card opens the room in a **new tab**, where the paste survives.
- **A mock's `league_id` is `null`.** That is the signature separating it from the real draft.
  `ffStartDraft` additionally hard-refuses on the real draft id.
- 🚨 **IN A MOCK, NEVER RUN `run_engine.py` OR `precompute_ladder.py` BARE.** *(Added 2026-08-17;
  this lived only in `docs/insights/026` and was in neither this skill nor the runbook.)* Bare,
  they read the **REAL league's** draft object — `rounds: 16`, where a mock is usually 15 — and arm
  the contamination gate with the **REAL** draft id. Required form:
  `python scripts/run_engine.py <slot> --rounds 15 --draft-id <mock_id>`, and the same two flags on
  `precompute_ladder.py`. The seat goes positionally, because a mock's `draft_order` is its own.
  🚨 **THIS GOT MORE DANGEROUS ON 2026-08-18, NOT LESS.** `--slot` is optional now, so the bare form
  is the one your fingers reach for — and bare in a mock derives the **REAL league's seat** from the
  **REAL league's cargo** and hands it to a mock whose `draft_order` is unrelated. That is a
  complete, confident ladder for a seat you are not sitting in. **In a mock, always pass the seat.**
  *(Since 2026-08-17 the ladder at least can no longer overwrite the live `ladder.json` from a
  mock — it writes `ladder.<draft_id>.json` and says so — but the ADVICE is still computed against
  the wrong shape if you forget the flags.)*
- **Miss one clock and Sleeper auto-picks the REST of the draft.** Reproduced exactly: one missed
  pick at #4, then **116 consecutive auto-picks.**
- 🚨 **A BLANK DRAFT ROOM IS A SLEEPER DEPLOY REGRESSION, NOT YOUR PASTE. Diagnose with the
  BUNDLE HASH.** Seen and then resolved on 2026-08-17. Every draft-room route left
  `<div id="root"></div>` **completely empty** — a mock, a fresh mock, and the real league draft —
  while `/draftboards` rendered fine in the same tab. Because a navigation wipes the console, it
  reads exactly like "my paste failed". It is not.
  **The one diagnostic that settles it:**
  ```js
  [...document.querySelectorAll('script[src*="bundle-"]')].map(s => s.src.split('/').pop())
  ```
  Broken: `bundle-d308ab2ef522ca31eaf5958ba526293a.js`. Fixed: `bundle-a4db3d0e2f64aa859605db77478bd940.js`.
  **A changed hash with the room still blank means it is you; an unchanged hash means wait.**
  ⚠️ **Four hypotheses were chased and every one was wrong** — don't repeat them: it was not the
  browser instance (only one was connected), not cache or a service worker (fresh profile, zero
  registrations), not `?ftue=commish`, and **not tab visibility** — the room stayed blank at a
  confirmed `visibilityState: "visible"`. `hasFocus: false` is fine and never mattered.
  There was one `TypeError ... at hW.useLeagueDuesEnforcement` early on; it never reproduced and
  was a red herring. **The API half is unaffected throughout** — `merge_picks.py`, the engine and
  the ladder never open a browser. ✅ The self-test PASSES unchanged on the new bundle, so the
  wrapper/button contract survived the deploy.
- **A player-card modal opening when you meant to draft is the signature of clicking an ancestor.**
  It is no longer the alarm it used to be — with correct aim a failed click is *silent*, which is
  why `handlerRan` exists. Treat a missing `handlerRan` as seriously as you would treat that modal.

## Where the evidence lives

`docs/insights/025` (the full account and the live transcript) · `docs/draft-day-runbook.md`
(the operating loop) · `scripts/sleeper_draft_console.js` (the code, with the reasoning in comments)
· `tests/test_sleeper_draft_console.py` (the stub models the wrapper/button split — 4 mutants
planted, 4 killed; restoring the wrapper bug fails 7 tests).

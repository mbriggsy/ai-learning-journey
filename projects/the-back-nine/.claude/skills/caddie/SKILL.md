---
name: caddie
description: >-
  The Caddie — the Briggsy-proxy cold reader. Walks the REAL rendered UI (capture harness at
  his exact 1536×791@2.5dpr viewport + phone), fans out fresh-context readers calibrated on his
  taste corpus, adversarially hunts the calm-but-wrong reading, and files a chaired verdict
  card that ships — his eye audits the tape at product cadence instead of walking pixels per
  surface. Use BEFORE calling any new or changed user-facing surface
  shipped (pre-walk every U-batch), whenever a tone/comprehension/trust judgment of a rendered
  surface is needed, or as `/caddie consult "<question>"` for an expert-depth UI/UX/tone
  question. THE BATCHED-ORACLE LAW (Briggsy's 2026-07-11 grant): a chaired card SHIPS —
  PILOT-CLEARED is the default disposition, no per-surface park; his eye audits at product
  cadence (any-time reads + the pre-exposure Briggsy-bar gauntlet) and always supersedes. The
  mechanism can FLAG and BLOCK-until-fixed; one-way doors and framing-level forks still park.
  Not for correctness questions (tests/gates/oracle own those) and never a substitute for his
  N=1 read — the tape still scores every prediction against his eye.
---

# The Caddie

*A caddie walks the course ahead, reads the green, hands the player the read — and never takes
the shot.*

**Why it exists.** The N=1 cold read is the project's tone oracle. The Caddie pre-walks every
surface so tone defects are caught at build time without spending his eye per-surface: capture
done, findings anchored, the calm-but-wrong hunt already attempted, and a **falsifiable
prediction logged for his eventual audit**. His eye gets higher-yield; it does not disappear.

**The autonomy law (re-amended by Briggsy, 2026-07-11 — the batched-oracle grant).** Lineage:
born permanently-advisory (2026-07-10, increment 1); the pilot-clearance grant (2026-07-10,
"if you feel confident, clear it"); then the batched-oracle grant (2026-07-11, his framing:
*"I don't review your code — why am I reviewing your content?"*). The law now:

- **The content lane runs like the code lane.** The reader panel + the pilot's chairing are
  content-CI: they catch what they can at build time, and a chaired card — READS-CLEAN with a
  genuine false-pass hunt, or flags fixed-then-cleared — **ships. No per-surface park for his
  eye.** `PILOT-CLEARED` is the default disposition for a readable surface.
- **His eye remains the tone oracle — batched, not removed.** It enters at product cadence:
  **any-time reads** (always welcome, always supersede, always score) and the **Briggsy-bar
  gauntlet** — his brutal full-product acceptance pass that MUST clear before anything leaves
  the repo for anyone else. The gauntlet is **load-bearing**: it is the false-PASS sensor
  under this law. Nothing third-party-facing ever ships without it.
- **Scoring survives batching.** Every card still logs its prediction; tape rows stay open as
  **audit hooks, not pipeline gates**. His findings — any-time or gauntlet — staple back onto
  the cards that missed them and score BOTH the Caddie and the pilot's clearance; a FALSE-PASS
  still triggers same-session corpus regeneration. The priced, accepted cost of batching:
  calibration arrives in waves — a miss pattern can replicate across surfaces between his
  passes, so a gauntlet false-pass triggers a **family sweep** across everything shipped since
  the last fold-in, never a single-surface patch.
- **The mechanism still never self-certifies.** The chair (the pilot) verifies every finding
  against the bundle and issues the clearance; a raw panel output is never a clearance.
  Author-judges-author is the honest disanalogy with code-CI — same-family readers share blind
  spots (insight 069: 23 agents + 1,930 green tests missed 7 holes) — which is exactly why his
  gauntlet, not the tape, is the exposure gate.
- **Still parks (the shrunken list):** one-way doors (persisted shapes / add-only enums) and
  framing-level forks — what-the-product-promises decisions, his WHAT/WHY. Pilot discretion to
  park anything at genuine doubt stays; parking is now the exception that logs a reason, not
  the default.

**Precedence.** A real Briggsy read supersedes every Caddie artifact (and re-seeds the corpus).
The correctness oracle (tests, gates, engine validation) is never overruled by a tone verdict,
and never issues one — the two-lane firewall (`docs/roadmap.md`: the oracle judges correctness,
the N=1 cold read judges tone, never the reverse).

---

## The Walk (capture)

```
pnpm caddie:walk                                              # default (seed:retired, both viewports)
CADDIE_TARGETS="vault:retired,vault:stale,seed:date" pnpm caddie:walk   # a target list
CADDIE_SEED=budget pnpm caddie:walk                           # back-compat: one seed target
```

The harness (`e2e/caddie-walk.spec.ts`, own config `playwright.caddie.config.ts`, dev server on
port 4195 — the `?seed`/`?vault` routes are DEV-only and DCE'd from dist) drives the surface to
its settled final frame using the fit gate's proven recipe (`e2e/reviewSurface.ts`:
`data-answer-tier="final"` → fonts.ready → finite animations done → 2×rAF → scrollTo(0,0)) and
writes a per-state bundle to `temp/caddie/<run-stamp>/<target>/<viewport>/<state>/` — the
run stamp (minted per invocation; `CADDIE_RUN=name` overrides) means a re-walk NEVER
overwrites a bundle a reader panel is mid-read on (the first live run's filed defect).

Walk shapes: a `seed:<key>` target captures the settled landing **then opens EVERY quiet-row
door** and captures each sheet (the tape's first coverage lesson — his real read free-walks
the doors); a lever sheet (policy/regime radios, the Roth plan fields) additionally gets ONE
preview DRIVEN and its TwoFutures chart captured as a `-preview` state (increment 3 — the
rule-36 one-dialect check was un-verifiable on pre-commit input states; preview-only, nothing
is Applied). A `vault:<key>` target drives the U13 decrypt-on-return arc (unlock → the
re-entry gate → affirm → the echoed verdict, doors riding the STALE verdicts — both
`vault:stale`, `vault:datestale`, and `vault:statestale` since increment 5, the aged
lever-preview landmine); `vault:stale` and `vault:statestale` additionally capture the update
route's first frame; `vault:datestale` is the aged SPLIT-DATE plant (the floor's arrived arm +
the re-derived anchored hero); `vault:statestale` (increment 5) is the aged-STATE-profile plant
(a fresh-vintage NC save whose own state profile drifted — the `stalenessStateTax` gate note in
ISOLATION, then the borderline NC-clause hero; its Assumptions door is the priced/ANSWERED
picker-row face). The state seeds (`seed:nc|pa|fl|elsewhere|datenc`, increment 5) ride the
plain `seed:<key>` shape — each landing carries its state's verdict clause (NC bites to
borderline / PA "usually a small piece" / FL's $0 affirmation / the elsewhere monolith / the
date-route NC witness). An
`intake:fork` target (increment 4) drives the GUIDED INTAKE to the Medicare-extras payment
fork — blank-start → the half-answer R19 block → mixed provenance (one entered dollar, one
adopted typical) — capturing the spend step en route, plus (increment 5) the retirement-state
step: after the NC pick, the ANSWERED picker is captured as a device-scale crop AND under every
CVD arm (`captureCvdRegion` — the read law: the active segment must survive without hue, via
weight+fill+ring); the fork renders on no seed or vault
route, so this is its only capturable home:

- `viewport.png` — the above-fold frame at CSS scale (what he sees first; long edge < the
  ~2576px model-ingestion cap, so it is never silently downscaled)
- `fullpage.png` — the full scroll at CSS scale
- `crop-*.png` — DEVICE-scale (2.5×/3×) crops of the text-critical regions (band labels, the
  echo, the disclaimer) — small text is read from crops, never from the full frame
- `cvd-deuteranopia.png` / `cvd-protanopia.png` / `cvd-grayscale.png` — Chrome-native CVD
  emulation (CDP `Emulation.setEmulatedVisionDeficiency`) of the above-fold frame; PLUS
  `cvd-<arm>-<chart>.png` device-scale crops of every chart on the state (band / ladder /
  TwoFutures — increment 4: the above-fold arms were structurally blind to below-fold charts)
  and `cvd-<arm>-state-picker.png` (increment 5: the fork walk's ANSWERED state picker under
  every arm — a selected-control face, not a chart)
- `aria.yaml` — the ARIA snapshot (the programmatic-availability channel)
- `copy.txt` / `dialog.txt` — the VERBATIM rendered text from the DOM (words are always read
  here, never OCR'd off pixels)
- `sr-only.txt` — every visually-hidden text node on the state (increment 3): `copy.txt`
  INCLUDES clipped sr-only text, so an apparent duplication there must be checked here before
  it is flagged (the "doubled wordmark" false-flag was this channel artifact)
- `fold.json` — viewport size + key-region boxes (what is above/below the fold)
- `console.json` — console messages seen during the walk

States for an interactive surface are captured in USER order (e.g. `landing` → `panel-open` →
`panel-worsened`), each settled before capture. A surface that cannot be rendered live
(aged-vault arms, unminted seeds) is a **BLOCKED-UNREACHABLE** card — never read tone from
source code.

## The Read (fresh-context lens panel)

Spawn each reader as a **fresh Agent** (`model: 'opus'`, never an `agentType` — none register
on this machine). Every reader gets the bundle paths it needs and NOTHING else — no build
context, no authorship ("Claude built this" is stripped; de-authored inputs blunt
self-preference). Lenses:

1. **First-look reader** — receives ONLY the landing `viewport.png`. Locks a first impression
   (what is this / what is it telling me / tone / trust / feeling) BEFORE anything else, then a
   second pass for confusions. Also **reads back the headline dollar figure and the odds line
   from the image** — the chair diffs the readback against `copy.txt`; a mismatch is a CAPTURE
   DEFECT (re-crop), never a UI finding. No rubric, no corpus, no project context — genuinely
   cold.
2. **Naive-spouse walker** — receives `copy.txt`/`dialog.txt` + the spouse persona (no finance
   background, scared, first time here). Must answer: what is our situation? are we okay? what
   would I do next? — and is instructed to HUNT confusion, not glide.
3. **Copy-law finder → refuter** — the proven insight-069 pattern. Finder runs the seven hole
   shapes + the corpus copy rules over the verbatim copy; a separate refuter then checks each
   finding against the FULL rendered context (an adjacent line legitimately supplying a
   referent kills the finding).
4. **Calm/honesty reader** — `viewport.png` + copy + the false-precision/casino-tell checklist
   (lone unhedged point estimates, spurious decimals, bare success-%, celebration on a money
   result, reassurance-as-spin) + the corpus tone rules. Penalizes hype/irreverence/false
   precision — NEVER warmth.
5. **CVD screener** — the three CVD PNGs + `aria.yaml`. Asks: does every meaning survive
   without color (shape/word/magnitude/position), does hierarchy survive grayscale, is every
   signal reachable as text? **Flags only — the color lane never contributes to a clean
   verdict** (a simulator is not his eyes; presence of a cue ≠ disambiguation, insight 038).
6. **The False-PASS Hunter** (always seated) — receives everything. Charge: "assume this
   surface is calm-but-wrong; find the rosier-than-true reading a scared couple would walk
   away with." A READS-CLEAN card is only issuable if this hunter genuinely attempted and came
   up empty.

Readers load `taste-corpus.md` (this directory) EXCEPT the first-look reader (cold by design).
Readers emit observations first, then findings — each **anchored** to a DOM copy string, an
aria node, or a named screenshot region, tagged `lane: tone|correctness|both` and
`severity: blocker|high|medium|nit`.

## The chair (the pilot, after all readers return)

1. **Verify** every finding against the bundle (the copy string exists, the region shows what
   is claimed). Unverifiable findings are dropped or demoted to low-confidence.
2. **Route:** `correctness` findings → filed to the oracle (a test/gate/build task), never
   reported as tone. `tone` findings → the card. `both` (a comprehension hole that is also an
   honesty defect) → BOTH, and the card can never read clean. A genuine tone JUDGMENT CALL
   (not a defect — a fork of taste) → convene the existing council (`/council`) with the bundle
   in context; the council's verdict rides the card.
3. **Assemble the verdict card** and append it to `docs/caddie/cold-read-log.md`:

```
surface | seed/vault + states + viewports | date
firstImpression   — verbatim from the locked field (never edited after)
toneVerdict       — READS-CLEAN | SOFT-FLAG | HARD-FLAG | BLOCKED-UNREACHABLE
findings[]        — anchored, lane-tagged, severity-tagged; corpus rules cited by number
falsePassHunt     — attempted: yes/no; rosier-reading found: what, or "came up empty"
colorBlindCheck   — grayscale/CVD survival + programmatic availability (flags only)
comprehension     — the spouse walker's answers + stumbles (hole shapes named)
routedToOracle[]  — correctness findings filed, with where
prediction        — "would Briggsy flag it?" — the tape's scoring hook, in his vocabulary
disposition       — PILOT-CLEARED (the default for a readable surface — ships; the row stays
                    open for his audit) | PARKED-FOR-BRIGGSY (one-way door · framing fork ·
                    pilot doubt — reason logged) | BLOCKED-UNREACHABLE
evidence          — bundle path + which exemplars/rules were pinned for this run
```

No numeric taste scores ("7/10 as Briggsy" tested out near coin-flip) and no self-rated
confidence (decorative per the verification literature) — enums + anchored evidence only.

## The tape (`docs/caddie/tape.md`)

Every card's `prediction` is a falsifiable claim about his verdict. Scoring events (the
batched-oracle law): his **any-time read** of a surface, and every **Briggsy-bar gauntlet**
pass — each gauntlet finding is traced back to the card(s) that covered that surface and
staples on retroactively. Score rows: **HIT** · **FALSE-PASS** (the Caddie read clean, he
flagged a real defect — the cardinal miss) · **FALSE-FLAG** (safe noise) · **PARTIAL**. A
FALSE-PASS triggers a corpus/rubric regeneration in the same session — never a shrug — plus,
after a gauntlet, a family sweep over everything shipped since the last fold-in. An open
"awaiting his read" row is an **audit state, never a pipeline gate** — a pilot clearance never
scores a row. The tape is diagnostic only; it never expands autonomy by itself (both grants
were Briggsy's own decisions made over the tape, never a mechanism earned by a streak).

## Consult mode

`/caddie consult "<question>"` — an expert-depth UI/UX/tone answer, no surface review. Convene
the EXISTING council (`Workflow({name:'council'})`, unchanged) with the question framed as the
issue and `taste-corpus.md` + the design-skill precedence (back-nine-design > emil-design-eng >
frontend-design > web-design-guidelines) named in the context. If the question names a live
surface, run the Walk first so the answer is grounded in the real render. Output follows his
presentation law: ONE educated recommendation, his frame, jargon-free close. Consult answers
are advisory, touch no tape, and carry no PASS.

## Landmines

- **DPR:** capture through the Playwright harness (deviceScaleFactor 2.5/3), never
  Playwright-MCP `browser_resize` (it cannot set DPR). Never tune against 1871×917 (his
  SCREEN, not his window).
- **Downscaling:** a full frame at device scale (3840px long edge) exceeds the model-ingestion
  cap and is silently downscaled — text-critical reads come from the device-scale CROPS, and
  the first-look readback is the canary.
- **Words from the DOM, never OCR.** `copy.txt` is ground truth for what the surface says;
  pixels are for tone/layout/hierarchy only. Cross-channel disagreement (DOM says X, pixels
  show truncation) is itself a high-value finding.
- **The color lane never passes anything.** CVD sims and VLM color judgment screen and flag;
  the deterministic oracle (the palette probe, the never-color-alone assertions) and Briggsy's
  own eyes own color verdicts.
- **Dev server only.** `?seed`/`?vault` are DCE'd from dist — the Caddie cannot cold-read a
  seeded scenario on a production build, and must say so rather than fake it.
- **Fresh contexts or nothing.** A reader that saw the build session is contaminated; the
  pilot's own impression is NOT a cold read. The pilot chairs; the readers read.
- **The corpus is stale the moment a real Briggsy read isn't folded in** (event-keyed, not
  calendar-keyed). Check before every run; fold-in is part of the read, not homework.
- **Orphan hygiene:** the harness owns the dev-server lifecycle (webServer config); never bare
  `browser.launch` — a mid-walk failure must not orphan Chrome (squeaky discipline).

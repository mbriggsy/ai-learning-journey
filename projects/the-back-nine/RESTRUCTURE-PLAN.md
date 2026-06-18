# Doc Restructure — Resumable Plan (CP0)

> **What this is:** the doc re-authoring plan recovered from the session that crashed at
> ~02:25 AM on 2026-06-18 (session `9aee25fb-263b-475f-822a-1235545bc13f`). The crash hit
> seconds after the plan was presented — *before* you said "go" and *before* anything touched
> disk. So **nothing was lost to git**; this file is the volatile-transcript plan made permanent.
> This is scaffolding (the recipe, not the dish) — **delete it when the restructure lands.**
>
> **Status:** plan LOCKED through Q1–Q4 + the sweep. **One decision still open** (see bottom).
> Deep panel rationale: `.recovery/doc-restructure-judge-output.md` (the 153 KB judge fan-out).

---

## The mission (the spine, never drift from this)

Re-author the docs **forward-only**, ground-up, from the reader's need — *not* by migrating the
old tree. The homework is done; we are **not** re-litigating or re-deriving a single decision.
We are rewriting how the docs **narrate** what we're building and how to build it.

**Forward-only means:** no "previously," no "supersedes," no changelog sections. Nobody cares
how we got here. The hard-fought battles are **kept** — but as **present-tense truth**
("we do X because Y"), never as a story of what we changed our minds about. `git log` keeps the
journey. Load-bearing reasoning lives in `decisions/` present-tense.

**The bar (two tests, the second is harder):**
- **The Craig test** — a techie stranger reads top-down and thinks *"clean, I get it"* — not
  *"this is all over the place, wtf is 'First Answer'."*
- **The you-cold test (the real bar)** — *you*, two days / a month removed, pick this up and
  don't feel lost in your own project. A foundation you can't read cold isn't a foundation —
  it's a liability with good test coverage.

**Cohesion comes from the frame, never from trimming depth.** All as-built facts — the numbers,
the survivor-floor bug write-up, the `[CORRECTED]` markers, the live ACA legislative status —
are **kept as present truth, never cut.**

---

## Locked decisions

### Q1 — Numbering: **stable IDs, hidden from the story, supersession annotations stripped.**
Clean renumbering was **rejected** (you pushed, I pushed back, you locked the pushback). Why:
- Every `R/U/C/D/M` reference in `src/` is in a **comment or test name** — never an identifier.
  So a renumber stays green under `typecheck`/`test` → the drift is **silent**: hundreds of
  comments quietly pointing at the wrong requirement, no gate catches it. In a "calm-but-wrong
  is the sin" repo, that's the cardinal failure, manufactured invisibly.
- Blast radius = a 5-level compound taxonomy (`P1·U2`, `U3·M5`, `C3·§3b`…) across ~84 source
  files, 35 insight files, 98 commits — plus immutable git history.
- It buys Craig **nothing** — he never sees the numbers.
- **So:** IDs stay stable, vanish from the narrative, and every "(Supersedes v1 …)" annotation
  is stripped.

### Q2 — Reader line: **two bars decouple at the front door.**
- **Cohesion** applies **everywhere, top to bottom** — every doc tells one clean story in its
  lane. A builder doc may be *deep*; it is never allowed to be *scattered*. (This is what
  Craig's "all over the place" reaction is really about — non-negotiable in every file.)
- **Zero-jargon / explain-to-a-stranger** applies to the **front door only** — README + the
  *narrative* half of `product`. Past that, builder docs may say CRN, reduce-to-spine, MAGI,
  lexicographic, with the glossary one click away.
- The funnel: **README** = pure Craig, zero jargon. **product** = Craig story on top
  (question → answer → recommendation → cardinal rule), a **visible seam**, then builder depth
  below. Everything else = builder surfaces, dense but cohesive.
- Rejected: "whole top level for Craig" (would wreck `architecture.md` for its real reader);
  a separate Craig-only page (README *is* that page — no second narrative home).

### Q3 — Act names: **plain-functional, Craig never sees them, "Act" stays the word.**
| Act | Name | What it delivers |
|---|---|---|
| 1 | **The Engine** | the foundation — nothing user-facing ships here |
| 2 | **Where You Stand** | the first answer: the confidence statement / your date |
| 3 | **The Levers You Hold** | build the budget + steer withdrawals & conversions (**you** drive) |
| 4 | **The Recommended Route** | the solver proposes the smartest strategy (**it** drives) |

"Where You Stand" covers both states (confidence statement for the retired, the date for the
still-working) in one phrase. "Levers You Hold" → "Recommended Route" makes the Act 3→4 handoff
legible: you drive the manual controls, then the co-pilot drives the recommendation.

### Q3b — The `P{n}` → `Act {n}` code-comment sweep: **do it NOW, not later.**
Deferring would recreate the exact Q1 failure (renamed in docs, not code) and contradicts the
cohesion-everywhere bar. Guardrails: **scope to the phase word only** (`P{n}` → `Act {n}`); the
`U`/`C`/`D`/`M`/`§` IDs stay untouched; **verify each `P` is really "Phase" per-hit** before
replacing; land it as its **own atomic commit**. ~18 stale source files.

### Q4 — `features/` is dissolved into first-class **capabilities**.
`features/` is a parking lot — the same bolt-on bias as history-clinging. SS / other-income /
portfolio-holdings are all the **same shape**: an engine capability **+** an intake surface,
threaded across Act 1 & Act 2 (SS reaches into Act 4). They're **vertical slices through the
acts**, not a fifth peer. Fix:
- `git mv docs/plans/features/` → **`docs/capabilities/`**, a **sibling of `plans/`**.
- **Woven into the product narrative** — "what it does" explicitly includes modeling your Social
  Security, your other income, your real portfolio. Craig meets them as product features, never
  as a folder.
- **A capability×act matrix** in the roadmap: **plans = columns** (build order), **capabilities
  = rows** (threads woven across acts). Two-axis navigation.
- **Same-shape template + status banners** to kill the size-vs-status inversion (today the
  876-line `other-income` is PLANNED/zero-code while the 259-line `social-security` is SHIPPED —
  you'd reach for the big one thinking it's the most-built).

### The ID-scheme decoder (belongs in the glossary — defined nowhere today)
- **R** = **Requirement** — the product contract (R1–R40). *What* must be true.
- **U** = **Unit** — a build unit (U0–U17, globally unique across all acts). *How* it's built.
- **C / D** = two extra unit-tracks from the 2026-06-08 accumulation fold — **C** at engine
  altitude, **D** at intake/answer altitude (so U-numbering didn't have to renumber).
- **P → Act** = **Phase** — the four big groupings (the thing being renamed).
- **M** = **Milestone** — sub-steps inside a unit (code comments only, e.g. `U3·M5`).
- **§** = a section within a plan/doc.

So `P1·U2` reads "Phase 1, Unit 2" → becomes "Act 1, Unit 2."

---

## The target tree

```
docs/
├── README.md          # front door + router, Craig's page, number-free, single voice
├── product.md         # the WHY+WHAT, sole R1–R40 ledger; capabilities named as verbs the product DOES
├── roadmap.md         # build-status table + capability×act MATRIX + the ID-scheme LEGEND
├── architecture.md    # invariants INDEX on top, then depth; the citation legend
├── glossary.md        # define-once; finally defines the ID scheme + citation prefixes
├── plans/             # THE COLUMNS — one per act, same template + status banner
│   ├── 1-engine.md          (The Engine — shipped)
│   ├── 2-first-answer.md    (Where You Stand — in progress)
│   ├── 3-controls.md        (The Levers You Hold — not started)
│   └── 4-recommendation.md  (The Recommended Route — not started)
├── capabilities/      # THE ROWS — woven across acts (features/ DISSOLVED into here)
│   ├── social-security.md   (shipped)
│   ├── other-income.md      (planned — right-sized from 876 lines)
│   └── portfolio-holdings.md(scoping — de-orphaned)
├── decisions/         # §-cited rationale cited across >1 subsystem, present-tense
├── research/          # the verified numbers + the live ACA re-verify gate
└── insights/          # the /brief + /distill gotcha ledger — untouched
```

Every one of the 18 current docs has a disposition (nothing silently dropped): 13 rewritten in
place, 3 moved-and-rewritten into `capabilities/`, the `features/` folder deleted, insights kept.

---

## The checkpoints (each = one commit = one resume point)

- **CP0** — commit *this plan* as the resumable artifact (+ a TODO pointer). ← **this file.**
- **CP1** — the legends + the front door (ID-scheme legend, invariants index, glossary
  meta-entries, single-voice README). *Unblocks everything that links to them.*
- **CP2** — dissolve `features/` → `capabilities/` (move, re-template, de-orphan, kill the R40
  triple-duplication). *May split — right-sizing the 876-line doc is heavy.*
- **CP3** — forward-only `product.md` + the crown-jewel decision record (the §3b wall → named
  sub-claims, **zero words cut**). *Its own session — precision-heavy.*
- **CP4** — forward-only act plans + capability backlinks (incl. the landmine: rewrite
  `4-recommendation`'s body *before* cutting the changelog it currently points at).
- **CP5** — forward-only research + final tree-wide history sweep.
- **+ the P→Act code-comment sweep** (the ~18 files from Q3b) — its own atomic commit, code
  comments only. *Caught as missing from the workflow's plan; not getting dropped.*

**Cross-cutting truth gate** (the cardinal rule made mechanical): every strip pass runs the
**insight-018 blast-radius grep** on the phrases it removes; all as-built facts are kept as
present truth, never cut.

---

## Q5 — Cardinal-rule duplication: **LOCKED — one home, pointers everywhere.**

The cardinal rule was stated 4× (README + product banner + §2 + R25). Ruling (2026-06-18):
**collapse the copies, keep the presence.** One canonical full statement in `product §2`; the
plain-language version on README (different audience, legitimately its own wording); everywhere
else **references** it — "per the cardinal rule →" — instead of restating. Same one-home-
pointers-everywhere move as the numbering lock: drumbeat without four copies to drift.

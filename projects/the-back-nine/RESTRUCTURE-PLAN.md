# Doc Restructure — Resumable Plan (CP0)

> **What this is:** the doc re-authoring plan recovered from the session that crashed at
> ~02:25 AM on 2026-06-18 (session `9aee25fb-263b-475f-822a-1235545bc13f`). The crash hit
> seconds after the plan was presented — *before* you said "go" and *before* anything touched
> disk. So **nothing was lost to git**; this file is the volatile-transcript plan made permanent.
> This is scaffolding (the recipe, not the dish) — **delete it when the restructure lands.**
>
> **Status (2026-06-18):** GREEN-LIT for the full ground-up rewrite. The target structure +
> the four radical moves are locked (see *Q6* below). The foundation (CP1 + CP1.5) is committed.
> **The next session resumes at M1** — see *RESUME HERE*.
> Rationale: `.recovery/doc-restructure-judge-output.md` (judge fan-out — note its "preserve"
> spine was overridden by Q6). Must-survive net: `.recovery/docs-quarry-inventory.json` (16 docs)
> + `.recovery/quarry-roadmap.json`.

---

## ▶ RESUME HERE (fresh session)

The recovery + foundation are done and committed. To continue the rewrite cold you need only:
1. **This file** — the locked decisions (Q1–Q6), the target tree, the M1–M6 sequence.
2. **The quarry** — `.recovery/docs-quarry-inventory.json` + `.recovery/quarry-roadmap.json`:
   **978 must-survive facts**, each tagged (kind / mustSurvive / duplicatedIn / fossilNote). The
   anti-amnesia net — the rewrite is authored FROM this, not from memory.

Start at **M1** (build the migration ledger). **Do NOT delete anything under
`docs/plans/features/` or strip any history until M6's gate proves every must-survive fact has a
new home.** CP1 + CP1.5 already landed (front door + legends); the tree is clean at the latest commit.

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

### Q4 → Q6 — `features/` is DISSOLVED ENTIRELY (this supersedes the old `capabilities/` idea).
**Green-lit 2026-06-18.** The earlier plan moved `features/` → a prettier `capabilities/` folder.
Rejected — that still preserves the fossil. SS / other-income / portfolio-holdings have their own
docs **only because of when they were added.** Tax, healthcare, the date-search, the store — every
bit as much "capabilities" — live inline *by kind* (architecture §7 + the act plans), and nobody
ever wrote a `tax.md`. The brave move is symmetry: **delete `features/`; fold each by kind.**

(Two alternative trees were stress-tested and rejected: *by-capability* shards the invariants +
the R-ledger across silos and recreates the bolt-on at the top level; *by-reader* duplicates every
fact and breaks the README-is-Craig's-page lock. The by-kind spine wins on merit — the reader's
nine questions are invariant — so the tree shape mostly stays; the radical work is the content.)

### Q6 — the four radical moves (the whole rewrite)
1. **DELETE `features/`.** SS mechanics → architecture (an overlay-peer §7 entry); SS / R40 /
   portfolio **decisions** → `decisions/` records; R40 / portfolio **requirements** → product;
   their **build steps** → the Act-2 plan. No `capabilities/` folder is created.
2. **DISSOLVE the "accumulation fold."** The biggest fossil — **37 flags** framing C1–C3 as "the
   2026-06-08 amendment" across three plans. The IDs stay (Q1-locked); the dated-amendment FRAMING
   dies; accumulation becomes first-class engine content in `plans/1-engine` + architecture.
3. **PROMOTE `decisions/`** from one near-empty record to the real rationale home:
   `accumulation-fuck-off-date` (exists) + `ss-computation` + `other-income-r40` (the 9 KTDs) +
   `portfolio-holdings` (the 3 open ATC calls).
4. **RIGHT-SIZE the inverted plans.** plan-3 (80 KB) + plan-4 (104 KB) are huge specs for
   *unbuilt* acts vs the 48 KB *shipped* engine plan. Keep every contract/decision; cut the
   over-specification.

Dropped from the old plan: the `capabilities/` folder and the capability×act matrix — unnecessary
scaffolding; the roadmap's **requirement→unit trace already is the cross-cutting index** (the
"show me everything SS touches" view) and works exactly like tax/healthcare do today.

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
README.md                        # ✅ world-facing front door (done CP1.5) — repoint dead feature rows
docs/
├── README.md          # ✅ thin index (done CP1.5) — repoint the dead feature rows at M6
├── product.md         # why + what + the R1–R40 ledger (R40 de-duped, present-tense)
├── roadmap.md         # status + the four acts + You-Are-Here + R→unit trace (the cross-cutting index)
├── architecture.md    # how it works + invariants index (done CP1) + SS overlay §7 + accumulation contracts
├── glossary.md        # vocabulary, define-once (SS terms repoint to architecture)
├── plans/             # build guidance, one per act, present-tense, right-sized
│   ├── 1-engine.md          (The Engine — shipped; C1–C3 integrated, fold-framing GONE)
│   ├── 2-first-answer.md    (Where You Stand — in progress; R40 + portfolio build folded in)
│   ├── 3-controls.md        (The Levers You Hold — not started; HALVED)
│   └── 4-recommendation.md  (The Recommended Route — not started; HALVED)
├── decisions/         # the rationale home (GROWS from 1 → 4 records)
│   ├── accumulation-fuck-off-date.md   (exists — reframe present-tense)
│   ├── ss-computation.md               (NEW — from features/social-security)
│   ├── other-income-r40.md             (NEW — the 9 KTDs, from features/other-income)
│   └── portfolio-holdings.md           (NEW — the 3 open ATC calls)
├── research/          # verified numbers, present-tense (history appendix stripped, live strands kept)
└── insights/          # the /brief + /distill gotcha ledger — UNTOUCHED (40 one-fact files)

DELETED:  docs/plans/features/   (3 docs dissolved by kind)
```

Net: ~17 rewrite-candidate docs → ~14. `features/` (3) deleted; `decisions/` born +3; the two
biggest plans halved; every surviving doc rewritten present-tense. Disposition for every
must-survive fact is the **migration ledger** (M1) — nothing is dropped without a logged home.

---

## Foundation (done) + the rewrite sequence (M1–M6; each = one commit = one resume point)

**Foundation — committed:**
- **CP0** — ✅ (`d74f6045`). Recovered this plan from the crashed session.
- **CP1** — ✅ (`d02af8b1`). Legends + front door: roadmap ID-scheme legend + the four locked
  act names + `scoping` status; architecture invariants index; glossary Act entry + two pointer
  meta-entries; `insights/README` shorthand decoder; single-voice `docs/README`. Verified (4 lenses).
- **CP1.5** — ✅ (`2f227e0a`). Root `README` = single front door; `docs/README` = thin index; the
  act-name drift in the root README fixed.

**The rewrite — M1–M6 (start here next session):**
- **M1 — the migration ledger.** From the quarry, map EVERY must-survive fact → its target home in
  the new tree (by kind: invariant→architecture, requirement→product, decision/KTD→decisions,
  number→research, definition→glossary, status→roadmap, build-step→plans, lesson→insights-already).
  Write it to `.recovery/migration-ledger.md`. This is BOTH the rewrite spec and the M6 checklist.
  *(Best built by a workflow over the quarry chunks so it doesn't eat the driver's context.)* Commit.
- **M2 — the hubs.** Rewrite `product`, `roadmap`, `architecture`, `glossary` present-tense from the
  ledger. Fold SS mechanics into architecture §7 (overlay-peer); fold the accumulation contracts into
  architecture (no "fold" framing); de-dupe R40 in product; repoint glossary SS terms → architecture.
- **M3 — `decisions/`.** Create `ss-computation`, `other-income-r40` (9 KTDs), `portfolio-holdings`
  (3 open ATC calls) from the dissolving feature docs; reframe the accumulation record present-tense.
- **M4 — the plans.** Rewrite plans 1–4 present-tense; integrate C1–C3 as first-class engine content
  in plan-1 (fold-framing gone); fold R40 + portfolio build into plan-2; **right-size plan-3 + plan-4**.
- **M5 — research.** Both research docs present-tense; strip the history appendix, KEEP the live
  strands + the `verify:aca` gate + the `[CORRECTED]` markers.
- **M6 — the zero-loss gate + demolition.** Grep the new tree for every ledger item's signature; every
  must-survive fact accounted-for? THEN delete `docs/plans/features/`, repoint `docs/README`'s feature
  rows, run the final tree-wide forward-only sweep (insight-018 blast-radius grep). The **P→Act
  code-comment sweep** (Q3b, ~18 source files) lands here as its own atomic commit. Finally delete this
  `RESTRUCTURE-PLAN.md` + `.recovery/` (the scaffolding is the recipe, not the dish).

**Cross-cutting truth gate** (the cardinal rule made mechanical): every strip pass runs the
**insight-018 blast-radius grep** on the phrases it removes; all as-built facts are kept as present
truth, never cut. The M6 gate is the hard backstop — no demolition until the ledger is 100% homed.

---

## Q5 — Cardinal-rule duplication: **LOCKED — one home, pointers everywhere.**

The cardinal rule was stated 4× (README + product banner + §2 + R25). Ruling (2026-06-18):
**collapse the copies, keep the presence.** One canonical full statement in `product §2`; the
plain-language version on README (different audience, legitimately its own wording); everywhere
else **references** it — "per the cardinal rule →" — instead of restating. Same one-home-
pointers-everywhere move as the numbering lock: drumbeat without four copies to drift.

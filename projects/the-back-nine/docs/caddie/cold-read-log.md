# The Caddie — Cold-Read Log

The Briggsy-proxy cold reader's verdict cards, newest first (mechanism:
[`.claude/skills/caddie/SKILL.md`](../../.claude/skills/caddie/SKILL.md)). **Every card here is
a SUBORDINATE, provisional stand-in** — the Caddie is permanently advisory (it flags and
blocks; it never clears), and any real Briggsy read of the same surface supersedes its card and
gets folded into the taste corpus + scored on [the tape](tape.md). A card is never logged as,
or mistaken for, his N=1 verdict.

Dispositions: **PARKED-FOR-BRIGGSY** (every readable surface — his eye is the gate) ·
**BLOCKED-UNREACHABLE** (the surface cannot be rendered live; never read from source).

---

## 2026-07-10 — `?seed=retired`: the resolved answer + the assumptions panel + the worsening edit (the U12 batch core)

**States walked:** landing → panel-open → panel-worsened (spending 6,500→10,000/mo, the R8
honest-worsening arm: verdict 9/10 → **"Off track — 1 of 10"**) → landing-worsened (panel
closed — the negative-verdict frame). **Viewports:** REAL 1536×791@2.5dpr + PHONE 390×844@3.
**Readers:** 8 fresh contexts (first-look · naive-spouse · copy-law finder→refuter · calm/
honesty · CVD screener · False-PASS Hunter · gradient-arm) + chair verification of every
load-bearing claim against the bundle/code. **Channel proof:** the first-look reader's image
readback matched the DOM copy verbatim (headline, count, axis labels, disclaimer).

**firstImpression (locked, before any analysis):** *"A retirement or financial plan status
readout… Tone: calm, honest — muted colors, plain language, and it openly names a gap it
hasn't priced in yet. Trust: yes, gut-level — the 'one honest gap' admission is what earns it.
Feeling: reassured but grown-up about it — relief without being sold to."* Phone (second
exposure): *"the same product, not a lesser port."*

**toneVerdict: HARD-FLAG** — the honesty machinery is strong (see cleared-as-screened), but
two findings would stop his eye.

### Findings

1. **HARD-FLAG [lane: both] — the deep-gradient trim figure contradicts the just-seen anchor.**
   Hero + echo at 1-of-10: *"About $7,300 a month less would move it toward steadier ground."*
   The couple just watched 6,500/mo read 9-of-10; the line prescribes ~2,700/mo — two on-surface
   numbers an attentive reader cannot reconcile ("this thing is broken"). **Chair-verified
   mechanism** (`src/engine/confidence.ts:222-223`): the figure is the linear heuristic
   `monthlySpend × (onTrack − survival)`, near-saturated at deep gap — the engine's own comment
   concedes the saturation ("~zero state-specific signal"), which is why 0-of-10 forks to the
   figure-less rethink; 1-of-10 still gets the trim clause. The 2026-06-29 fork didn't
   contemplate deep-but-not-zero (the insight-055 shape). Candidates: extend the figure-less
   fork below a gap threshold · solve the trim honestly · cap/soften the clause at depth.
   *(His U12 batch item — the M>S readout family.)*
2. **HARD-FLAG [lane: both] — "$530 more a month" is gross of the disclosed unpriced Medicare
   cost, and endpoint-less.** The most-read actionable line (*"There looks to be room for about
   $530 more a month"*) invites spending into a margin the surface's own disclosure — three
   blocks lower, across the survivor section — says is overstated (this 66/65 couple's unpriced
   Part B base ≈ $370/mo combined ≈ 70% of the room). Also a pure rule-2 hit: "more" than WHAT
   — no current budget figure exists anywhere on the surface (refuter-confirmed). The
   rosier-than-true takeaway: *"we're on track and we've got spare — let's spend it."*
   Dissent preserved: the honesty lens graded it low (hedged twice; "the engine question");
   the Hunter graded it blocker. Candidates: make the room net-of/inline-caveated when
   `medicareUnpriced` fires · quote the budget endpoint. *(Ties to #7.)*
3. **SOFT-FLAG [tone; 3-lens split — preserved, his call] — the truer-picture line.**
   *"The odds above stepped down — that's the picture getting truer to what you entered, not
   the plan itself changing."* Honesty lens (0/10 arm): **pass** — calm arrives after the bad
   news, never in place of it; pre-empts "did the tool break?" without softening. Spouse:
   half-works — fault lands "partly mine, not the plan's" (the design goal), but *"comfort
   arriving exactly when I'd be alarmed… reads like it's softening the blow."* Gradient lens
   (1/10 arm): **high** — for a REAL spending increase (not a correction) "not the plan itself
   changing" can read as "nothing really got worse"; "plan" is overloaded (strategy vs
   projection vs finances). Candidate disambiguation: *"that's the projection catching up to
   your new numbers, not the tool recalculating differently."* **This is the formal Act-3
   exit-condition line — his read decides.**
4. **SOFT-FLAG [tone/craft] — the staggered "70 / 69" x-label reads as a rendering defect.**
   Both viewports, worse on phone (first-look: "the one blemish that looks like an actual
   defect"). Chair-verified mechanism: the DELIBERATE collision stagger
   (`ConfidenceBand.tsx` ROW_STAGGER=34 via `placeAnnotationLabels`) — but the connecting rule
   renders too faint to read as intentional. Candidates: strengthen the rule's visible
   connection · anchor-shift instead of row-drop.
5. **SOFT-FLAG [tone/craft] — quarter-tick labels round dirty.** Geometry chair-verified HONEST
   (even quarters, linear, $0-anchored) — but the humane formatter labels the 2.25M line
   "$2.3M" (and 1.125M → "$1.1M" on the worsened $1.5M ceiling), making an even ladder read
   uneven ("slightly undercuts the precise-and-honest feel" — both frames). `niceCeil` ceilings
   {1.5, 3, 6} produce quarter values that round dirty, against its own "clean figures"
   comment. Candidates: exact tick labels · drop dirty-quarter ceilings from the nice set.
6. **SOFT-FLAG [tone] — copy-law survivors** (finder→refuter, killed 3 of 8):
   *"steps down about $2,000"* with neither income endpoint (medium) · *"the lever's benefit
   reads understated"* — "lever" is his own rejected word (medium, deep panel) · *"single
   filer's brackets"* (nit) · the five-fact band caption (*"Looking about 23 years out…"*) —
   **re-scoped by the chair: not visually rendered; it is the SR-only text alternative**, so
   the garden-path lands on an AT user as the sole chart description (medium + verify how AT
   renders it).
7. **SOFT-FLAG [tone nit] — "pull the picture down some"** sizes the Medicare omission as
   small; with #2 resolved this may stand as-is (U11-cleared wording — revisit consciously).
8. **Staged for his read (comprehension notes, not defects):** the "9 of 10" (verdict) vs
   "eight in ten" (band) fraction collision — the spouse "nodded past it"; *"room for $530"*
   — room for WHAT (spending vs saving unstated); the door CTA *"Split what must hold from
   what could give"* — three reads, still lost; vocabulary fog candidates ("futures", "plan
   horizon", "in today's dollars").

**falsePassHunt:** attempted — **found #2** (the surface's one rosier-than-true reading). The
Hunter explicitly could NOT break the worsened state's honesty ("Already short… runs short
from the start — takes more than trimming" is stark, refuses the cheap fix, and the calm
belongs to the mechanism, not the badness).

**colorBlindCheck (screening flags, never clearances):** verdict/path/bands survive without
color (word + ↘/✓ glyph + count + containment + line-shape); grayscale hierarchy intact;
**negative arm chair-verified: NO red gash** — the worsened band is the same calm ramp
descending honestly to $0 at the household clock. Flags: the outer band's grayscale edge is
the page's faintest boundary (confirm at device scale); the legend labels live inside the
`role=img` subtree — real DOM text but absent from the a11y tree (the adjacent SR caption
carries the numbers; confirm the pattern is as-designed).

**comprehension:** the spouse walker correctly derived the situation, the band's meaning, the
survivor drop, the worsening's cause, and the right next action ("re-check the number I typed,
get my partner, talk to a real person" — the disclaimer landed). Trust verdict: *"almost
aggressively honest, which I actually trust"* — the against-interest lines ("never up",
"reads easier than they may prove", "understated, never oversold") are what earned it.

**routedToOracle (filed check/fix tasks):** O1 the trim-figure saturation (`confidence.ts:222`
— #1's engine side) · O2 `verdictRoomClause` × `medicareUnpriced` interaction (#2's mechanism
side) · O3 legend text vs the a11y tree (as-designed or lift out) · O4 ControlSheet
Escape-close with real in-dialog focus (WAI-ARIA dialog pattern; found via the walk, synthetic
focus — unproven against a real user) · O5 the dirty-quarter tick labels (#5's code side).

**prediction (the tape's scoring hook):** he stops the line on #1 ("we were fine at 6,500 —
why cut to 2,700? this reads broken"); he wants #2's room joined to the Medicare gap inline;
he flags the 70/69 float on sight ("is this broken?"); the truer-picture WORDS survive with at
most a light tweak; #5 he may not consciously notice. Overall: he clears the surface's tone
once #1 and #2 are resolved — the honesty spine itself reads as the product's strength.

**disposition: PARKED-FOR-BRIGGSY** (the U12 batch read stays the gate — now pre-digested).

**evidence:** bundle `temp/caddie/retired/` (4 states × 2 viewports; regenerate via
`pnpm caddie:walk`); corpus pinned: all rules + anti-patterns + exemplars E1–E10. Capture
notes: the walk's `fill()` originally CONCATENATED into the masked currency input
(6,500+10000 → 650,010,000 — caught by the Hunter's readback, an accidental proof the
adversarial lens works); hardened to select-all + typed digits + a fail-loud value assertion.
Re-walking overwrites the bundle — run-stamped dirs are the filed increment-2 fix.

> **✓ SCORED — Briggsy's real read landed same-day (2026-07-10).** His verbatim: *"I think
> everything is fine. The graph in the withdrawal order sub-panel should be consistent with the
> fanout. The x-axis should be ages. consistency. other than that good to go."* **The U12 batch
> is CLEARED** (the truer-picture line — the formal Act-3 exit condition — passed untouched).
> Tape score: PARTIAL (see [the tape](tape.md)) — he cleared both hard flags (recorded as
> false-flags for tone; their engine-lane halves stay filed) and found a real consistency
> finding on a surface this card never walked (the withdrawal-order sheet's chart spoke years).
> **His finding was FIXED + eye-verified same session:** the TwoFutures x-axis now derives from
> the fan's own canonical decade-age rule (`deriveDecadeAgeTicks`, one home) with a
> geometry-aware endpoint-collision guard (`visibleXTicks`). Fold-ins: corpus rule 36
> (one chart dialect) + exemplar E11 + the increment-2 scope lesson (walk EVERY door surface).

---

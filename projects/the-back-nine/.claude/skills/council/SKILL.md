---
name: council
description: >-
  Convene the Council of Elders — diverse expert agents that debate a decision in
  fresh context windows, adversarially verify, and a chair synthesizes a
  confidence-graded, tier-classified recommendation. Use INSTEAD of stopping to
  ask Briggsy whenever you'd otherwise park a non-trivial judgment call (copy,
  layout, scale, scope, architecture trade-off, UX, simplification-honesty). Also
  fired manually as `/council <issue>`. Do NOT convene for things a test/lint/
  locked-decision already settles (the clerk triages that) or for a one-line
  mechanical edit.
---

# The Council of Elders

**Why this exists.** ~4 out of 5 times the assistant stopped to ask Briggsy, it was doing the *lazy* thing — punting a decision it could have resolved with rigor. The council is the *hard* thing: diverse lenses, grounded in the real code/docs, debating adversarially, producing a recommendation strong enough to act on. **A calm-but-wrong council is worse than no council** — so grounding and the red team are non-negotiable.

Briggsy is ATC. This skill lets the pilot resolve far more without grinding to a halt — while keeping the genuinely-his calls (taste, money, direction, irreversible) framed as 5-second decisions, never dumped back as open questions.

---

## When to convene (auto-trigger)

Convene the council the moment you notice you're about to **park a decision for Briggsy or ask him a non-trivial judgment question**. Triggers:

- You're choosing between ≥2 real options and the answer isn't dictated by a test/lint/locked decision.
- You catch yourself writing "PARKED for Briggsy", "Briggsy's call", "ATC call", "needs a decision", or an `AskUserQuestion` that isn't *purely* his taste/money/direction.
- A simplification/omission whose honesty you're unsure of (is it calm-but-wrong?).
- A UX/layout/scale/wording choice on a real surface.
- An architecture trade-off where the invariants don't obviously decide it.

**Do NOT convene** when:
- A validation gate already answers it (typecheck, tests, lint, `verify:aca`, `verify:doc-stats`, CSP) — just run the gate.
- A locked decision or documented invariant dictates it — just follow it (cite it).
- It's a one-line mechanical edit with an obvious correct answer.

When in doubt, let the **clerk's triage** decide — it short-circuits to "oracle-settled" if the project already closed the question.

---

## How to run a council

1. **Frame the issue** in one or two sentences. Add any context the elders couldn't infer (what you tried, why it came up, the constraint that surfaced it).

2. **Pick the weight** (proportionality — rigor matched to stakes, NOT cost; Briggsy authorized unlimited budget):
   - **`light`** — a small reversible fork (naming, a tick placement, a refactor shape). Roster = `clerk` + the 2–3 most relevant openers + `red-team` + `chair`. No rebuttal round.
   - **`full`** — honesty-critical, scope, product-direction, taste, or anything touching the engine/correctness. Roster = `clerk` + **all 8** openers + `red-team` + `chair`, **with** a rebuttal round. Default to `full` whenever honesty or correctness is in play.

3. **Pick the openers.** The elder charters are **baked into the workflow** — single source of truth, editable in `.claude/workflows/council.js` (the `CHARTERS` block; project agents don't resolve as `agentType`, so charters live in the script, not separate files). For a `full` council, seat all six (omit `openers`). For a `light` council, pass `openers` = the ids whose lens the issue touches; the **Honesty Hawk is always seated** regardless. Opener ids: `architect`, `minimalist`, `craftsman`, `advocate`, `fiduciary-advisor` (+ the always-on `honesty-hawk`). The clerk, red team, and chair are always seated.

4. **Invoke the workflow** (each elder runs in its own fresh context window — Briggsy's hard constraint, satisfied by construction):
   ```
   Workflow({
     name: "council",
     args: { issue: "<the framed issue>", context: "<extra context or ''>", weight: "full" | "light", openers: ["architect", "advocate"] /* omit for all six */ }
   })
   ```
   (Or `scriptPath: ".claude/workflows/council.js"` while iterating on the engine.)

5. **Read the verdict** the workflow returns (the chair's structured output: `recommendation`, `rationale`, `confidence`, `tier`, `dissent`, `honestyHawkVeto`, `hardStop`, `action`, `digestLine`).

---

## What to do with the verdict (maximum-autonomy execution rule)

Briggsy granted **maximum autonomy** (2026-06-28): execute everything reversible at high confidence and let him review the digest after the fact — **stop only for spending real money or publishing something public** (and even those are waived by prior all-clear). Apply this gate in order:

1. **Honesty Hawk veto fired** → never ship the calm-but-wrong option. Do not execute. Surface to Briggsy with the hawk's stated false-belief, or take the honest alternative the council endorsed.

2. **Confirm-first action** — the *only* things I stop for, because they can't be clawed back: **(a) spending real money** (paid image/voice/API), **(b) publishing something outward/public** beyond the repo, **(c)** a force-push to main or destructive data-loss. Surface as a 5-second framed confirm *regardless of confidence* — **UNLESS Briggsy gave up-front all-clear for this work** (e.g. "we're doing voice today"), in which case prior clearance counts and I proceed. Everything else — code, copy, layout, scale, scope-within-the-app, even taste/direction calls — is **not** confirm-first and executes per step 3.

3. **Confidence HIGH (≥7/10), not a hard-stop** → **execute now.** Any tier — including `yours-to-close` taste/direction calls — gets acted on, because that's what maximum autonomy means. Log it.

4. **Confidence MEDIUM/LOW (<7/10)** → surface to Briggsy with the framed rec + the recorded dissent + "what would flip it." Never a naked "A or B?".

**Every verdict — executed or surfaced — gets one line appended to the digest** (`docs/council-log.md`): date, issue, tier, recommendation, confidence, action taken, and (if executed at `yours-to-close`) a ⚑ so Briggsy can find the taste/direction calls he might want to revisit.

When you surface, lead with the rec (per Briggsy's standing rule — never a bare fork): *"Council says X (confidence N/10) because Y. Dissent: Z, which wins if W. Going with X unless you wave me off."*

---

## The roster (why each seat exists)

Each elder is a **pole of a real project value-tension**, so the debate is genuine, not a chorus:

| Elder | Guards | Tension pole |
|---|---|---|
| **Honesty Hawk** | calm-but-wrong is the sin; omissions named with direction; the hedge on the headline | Honesty / Conservative-or-disclose — **holds a VETO** |
| **Architect** | CRN, reduce-to-spine byte-identity, engine purity, constants discipline | Engine-purity |
| **Minimalist** | bounded on-ramp not FIRE, ~5-min path, the one job | Simplicity / scope |
| **Craftsman** | the water-beads bar; pixel + flow integrity | Craft / WOW — **defers final taste to Briggsy** |
| **Advocate** | the scared non-expert user betting real money; color-blind-safe; plain language | User-empathy / accessibility |
| **Fiduciary Advisor** | sound retirement advice, not just sound engineering | Domain authority |
| **Red Team** | refutes the consensus; hunts the calm-but-wrong failure | Adversary (no value to defend) |
| **Chair** | weighs the debate; no vote-counting; classifies the tier | Synthesizer |
| **Clerk** (pre-step) | the cited dossier every elder grounds in; triages oracle-settled issues | Grounding |

---

## Non-negotiables

- **Grounding first.** The clerk builds a cited dossier; elders cite the dossier, not memory. No source → "unsourced", never invented. (Same discipline as the engine's externally-derived fixtures.) The clerk also **attests grounding** (provenance-based, *not* array-length): if it can't ground a real issue, the council **refuses to convene** rather than debate over nothing — the no-issue precondition gate plus this attestation gate cover both the empty-prompt corner and its sibling, a real issue paired with an ungroundable dossier.
- **Independent openings.** Openers are blind to each other (no anchoring); the debate comes after.
- **The veto outranks the vote.** A majority cannot ship calm-but-wrong.
- **Dissent is preserved**, never erased — with "what would flip it."
- **Verify before claiming done.** A council verdict is a recommendation, not a SEEN outcome. Code the council touches still goes through the real gates (typecheck/tests/eye-on-the-surface) before "done."

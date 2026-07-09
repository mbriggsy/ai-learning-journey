---
name: ultramode-code-review
description: The institutionalized ultramode (ultra/deep/holistic) code-review cadence — a whole-file, project-calibrated review that fans out specialized reviewer lenses, adversarially verifies every finding against source before acting, fixes what's real, and distills the lesson. Use PROACTIVELY at a unit/milestone/feature boundary and whenever the user asks for an "ultramode / ultra / deep / thorough / holistic / real" code review, a review "before we move on" or "before merge", or to "review the engine / this module / what we just built". Prefer this over a quick diff skim whenever correctness matters or the change spans more than a trivial edit. NOT for a one-line/trivial change (just read it) or a GitHub-PR-comment pass (that's /code-review). This is the LOCAL institutionalized cadence (runnable any time, not only in ultramode) — distinct from `/code-review ultra` (the billed cloud pass).
argument-hint: "[blank = the current unit's work, or base:<ref> / a path / a PR#]"
---

# Ultramode Code Review

A code review that earns the name. It reads **whole files** (not just the diff), judges them against **this project's own** load-bearing contracts, fans out specialized reviewer lenses, and — the part that makes it trustworthy — **adversarially verifies every finding against the source before acting on it.** Then it fixes what's real and distills the lesson so the next review starts smarter.

Three beliefs this is built on — keep them in mind, they explain every step below:

- **Holistic beats diff-scoped.** A diff-scoped pass only sees changed lines, so it structurally cannot catch a gap in the *interaction* between new and original code, or an invariant the whole subsystem must hold. The highest-value findings live in the cross-product nobody re-audits. Read the whole unit.
- **Calibrate to the project, not a generic checklist.** Every codebase has its own invariants, its own *deliberate* choices, and its own past mistakes. A reviewer that doesn't know them produces noise (flagging a deliberate choice as debt) and misses signal (missing a violated invariant). Read the project's contracts first; hand them to every reviewer.
- **A confident finding is a hypothesis, not a verdict.** Reviewers — agent or human — are confidently wrong often enough that folding findings on faith is dangerous. Verify each one against the actual code before you touch anything. This single stage is what separates a useful review from a plausible-sounding one.

## When to use

PROACTIVELY at a unit / milestone / feature boundary, before merging or moving on, or whenever the user wants an "ultramode / ultra / deep / thorough / holistic / real" review, or to "review the engine / this module / what we just built." Prefer it over a quick diff skim whenever correctness matters or the change is more than a trivial edit.

Not for: a one-line / trivial change (just read it); a GitHub-PR-comment pass (`/code-review`); writing a PR description (a different tool). This is the local multi-agent cadence — `/code-review ultra` is a separate billed cloud review.

## Arguments

`$ARGUMENTS`, all optional:
- *nothing* → review the current unit's work (the un-reviewed code since the last checkpoint — infer from recent commits / the branch).
- `base:<sha-or-ref>` → review everything from that ref through the working tree.
- *a path* (e.g. `src/engine`) → scope the holistic read to that subtree.
- *a PR number / URL* → review that PR's branch.

## The cadence

### 1 · Scope it — holistically
Determine the unit under review (the argument, or the work since the last review checkpoint). List the files, then **read the whole files** — the changed lines tell you *where* to look; the whole file tells you whether it's *right*. In a monorepo, scope to the project subtree so a cross-project diff doesn't dilute the reviewers.

### 2 · Build the contract brief — this is what makes it self-calibrating
Before reviewing, read the project's own context and distill a short **contract brief** (≈10–20 lines) you hand to *every* reviewer verbatim:
- the nearest `CLAUDE.md` (project + any subtree ones): the load-bearing invariants, the layer/purity rules, and especially the **deliberate choices** a reviewer must NOT flag (e.g. some projects deliberately favor dense intent-comments, or "wow over simplicity" in a UI layer).
- `docs/insights/` (or `docs/solutions/`): the project's hard-won past mistakes. A finding that *re-introduces* a documented mistake is high-value; a "fix" that *contradicts* one is noise.
- the unit's intent (its commit messages / plan doc).

The brief = the invariants a change must not break · the values not to flag · the landmines to check for. Without it, reviewers grade against a generic checklist and you get the noise that makes people ignore reviews. (CE's agent-shaped equivalent of this step is its `learnings-researcher.md` persona — the inline brief covers it.)

### 3 · Select the lenses
**Where the reviewer definitions live (CE ≥3.14):** compound-engineering ships NO registry agents anymore — the old spawnable `agents/review/*.md` became **persona prompt documents** inside its ce-code-review skill. NEVER pass a `compound-engineering:*` name as a Workflow `agentType` (those agents don't exist; a missing agentType crashes every lens at launch). Instead: **default workflow subagent + explicit model + the persona file mined as prompt material.** Resolve the persona directory fresh each run — `~/.claude/plugins/installed_plugins.json` → `plugins["compound-engineering@every-marketplace"][0].installPath` → `<installPath>/skills/ce-code-review/references/personas/` (the path embeds the CE version, which changes on update). If the plugin or directory is missing, every lens runs on its inline role — **personas are enrichment, not a dependency; the review never blocks on CE's presence.**

**Always-on (table stakes)** — each lens = an inline role in the review prompt + the CE persona file that enriches it:
| Lens | CE persona (3.14 roster) |
|---|---|
| correctness | `correctness-reviewer.md` |
| architecture / invariants | — (no CE persona since 3.14; inline role — the contract brief carries the invariants) |
| testing (does it prove the right *value*, or just typecheck?) | `testing-reviewer.md` |
| language idiom | — (CE removed its stack personas — `kieran-*`/`dhh-rails` are gone; inline role. One survivor: Swift → `swift-ios-reviewer.md`) |
| simplicity / YAGNI + structural quality (coupling, module boundaries, type-boundary leaks) | `maintainability-reviewer.md` (CE merged simplicity + structural quality into this one; this lens owns the full merged territory) |
| api-contract / persistence glance | `api-contract-reviewer.md` |
| **adversarial (≥1, always-on)** — *constructs* failure scenarios to make the code return a confidently-wrong result | `adversarial-reviewer.md` (CE gates this persona by diff size — OUR always-on floor is deliberate; keep it) |

**Conditional — add ONLY when the diff's nature warrants it** (never all every time; each pick needs a reason you can name and announce):
- `security-reviewer.md` — auth, crypto/KDF, user input, permissions, a public boundary.
- `reliability-reviewer.md` — error handling, retries, timeouts, background jobs, async.
- `performance-reviewer.md` — hot loops, heavy data transforms, a path about to be called K×. (`performance-oracle` no longer exists.)
- `data-migration-reviewer.md` — persistence, migrations, schema/format changes, backfills (the old `data-integrity-guardian` + `data-migrations-reviewer` pair, merged); add `deployment-verification-agent.md` for risky/destructive migrations (go/no-go + rollback). NOTE: the persona is migration-ARTIFACT-flavored; the guardian half — persisted-shape round-trip/backward-compat, write idempotency, consistency invariants — applies even with NO migration files (a localStorage/vault blob change), and there the lens's inline role must carry it.
- `julik-frontend-races-reviewer.md` — async UI, timers, lifecycle / DOM-timing.
- `previous-comments-reviewer.md` — re-reviewing a PR that already has review threads.
- `project-standards-reviewer.md` — the unit touches conventions governed by `CLAUDE.md`/`AGENTS.md` beyond what the contract brief already carries.
- `agent-native-reviewer.md` — ONLY when the unit ships an agent-facing surface (MCP tools, agent APIs, features that must be agent-operable); deliberately skipped for ordinary product code.

Announce the team + the one-line reason for each conditional pick before fanning out.

**The adversary scales with risk (≥1 always; more only when warranted).** At least one break-the-code adversary runs on *every* review. It is a third, distinct kind of skepticism: the value lenses *check contracts*, the verify stage (step 5) only *refutes findings already raised* — the adversary alone *generates* "what wrong code passes the green suite?" findings (mutation-survival seams), which the others structurally can't. For a high-risk change — a new threshold/cliff/discontinuity, a fixed-point/solver, code touching a core invariant (CRN, reduce-to-spine, purity), a new persisted shape, or correctness-critical money/state math — escalate to a *diverse panel* of adversaries, each assigned a DISTINCT failure-mode angle (boundary/discontinuity · temporal/state-evolution · numerical/finiteness · invariant · direct-caller-contract). Diversity, not replication — N identical "break it" agents ≈ 1; N angles ≈ N. Scale the verify vote with the adversary count (2–3 independent refuters on any acted-on P0/P1) so more generators *sharpen* signal-to-noise instead of flooding it. Never run a fixed N for show — **scrutiny scales with risk, never ceremony.**

### 4 · Run the review (a read-only Workflow)
Fan the selected reviewers out in a Workflow (parallel), each given: the **contract brief**, the file list, the holistic scope (instruct them to read whole files, not just added lines), its **CE persona file path** when one exists (the reviewer Reads it first; the review's structured schema + holistic directive explicitly override the persona's own output-format and diff-scope plumbing), and a compact findings schema (`title · severity P0–P3 · file · line · confidence anchored at 0/25/50/75/100 · why · suggested_fix`). Reviewers are **read-only** (no edits; sweep any scratch files they leave). Run the reviewers AND the verifiers on **opus** — set `model: 'opus'` explicitly on every `agent()` call; **never hardcode a mid-tier (`sonnet`) for the fan-out, and never omit `model` to inherit the session model** (when the main loop runs a pricier tier like Fable 5, silent inheritance pays a higher rate AND ~30% more tokens for the same content). Quality is the deliverable: on a correctness-critical review, economizing the reviewer's model is the wrong tradeoff (and a mid-tier reviewer is more likely to both miss signal and emit noise the verify stage then has to clean up). See `references/workflow-template.md` for a ready-to-adapt script.

### 5 · Adversarially verify EVERY acted-on finding against source — MANDATORY
Do not skip this; it is what makes the review worth trusting. For each finding worth acting on, go back to the **actual code** and confirm it:
- Is the bug real, or already handled elsewhere (a caller guard, a path that neutralizes it)?
- Is the "P1" actually *live*, or does some other path defang it (an overridden/dead field, unwired code, an upstream gate)?
- Is the suggested fix even correct? A confident reviewer can suggest a *directionally-wrong* fix.

Right-size the severity from what the code actually shows. Then classify what survives: **NEW** (the existing tests/reviews missed it) × **REAL** (verified against source) × **MATERIAL** (it can actually produce a wrong result / real harm). Only NEW × REAL × MATERIAL earns a fix; everything else is advisory.

### 6 · Fix + gate
Apply the verified fixes — the smallest change that holds the contract, matching the surrounding code. Run the project's **full gate** (whatever its `CLAUDE.md` lists — typecheck / tests / lint / project-specific verifies). Report three buckets: what was real (fixed), what's advisory (deferred/documented), and **what you threw out** — the false alarms you caught are part of the review's integrity, not an embarrassment to hide.

### 7 · Distill — MANDATORY
Run `/distill` to capture the session's hard-won insight — the gap you found, the false-alarm pattern, the contract you had to re-derive. A review that finds something and doesn't write it down makes the team rediscover it later; distilling is how each review makes the next one smarter.

## Calibration — the difference between signal and noise
Hand reviewers the project's *values* (from step 2) so they don't flag deliberate choices: dense explanatory/intent-comments where the project treats them as a value, required fail-loud guards (not over-engineering), "wow over simplicity" in a UI layer. The **simplicity** lens hunts YAGNI · premature abstraction · dead code · unnecessary indirection ("*should this exist?*") plus the structural-quality territory its merged persona carries (coupling, module boundaries, type-boundary leaks — "*does it live in the right place?*") — but NOT comment density or required guards.

## Notes
- This is the single proven track, not a multi-track bake-off — run it once, well.
- It does not need a clean tree or a GitHub remote; `base:<ref>` works on local history.
- Scale the fan-out to the change: a small unit → the always-on lenses (incl. ≥1 adversary); a large or risky one → add the conditionals, escalate the adversary to a diverse panel (distinct failure-mode angles), and add more verifiers per finding.

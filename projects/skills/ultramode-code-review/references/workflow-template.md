# Workflow template — ultramode-code-review

A ready-to-adapt `Workflow` script for steps 4–6 of the cadence. Adapt the lens list, the conditional
lenses, and the contract brief to the unit under review. It runs as ONE pipeline: each lens reviews,
then each of its findings is adversarially verified as soon as that lens returns (no barrier — a slow
lens never blocks a fast one's verification).

## Where the reviewer personas live (CE ≥3.14 — verified on disk 2026-07-09)

compound-engineering ships NO registry agents anymore — its old spawnable `agents/review/*.md` became
**persona prompt documents** inside its ce-code-review skill:
`<CE installPath>/skills/ce-code-review/references/personas/*.md`. NEVER pass a
`compound-engineering:*` name as a Workflow `agentType` — those registry agents don't exist, and a
missing agentType crashes EVERY lens at launch (bit us in the U13 review, 2026-07-09). The proven
pattern: **default workflow subagent + explicit model + the persona file mined as prompt material.**

Resolve the persona directory FRESH each run — the path embeds the CE plugin version, which rots on
every plugin update:

```bash
node -e "
const fs=require('fs'),path=require('path');
const home=process.env.USERPROFILE||process.env.HOME;
const reg=JSON.parse(fs.readFileSync(path.join(home,'.claude/plugins/installed_plugins.json'),'utf8'));
const ce=reg.plugins['compound-engineering@every-marketplace']?.[0];
const dir=ce&&path.join(ce.installPath,'skills','ce-code-review','references','personas');
console.log(dir&&fs.existsSync(dir)?dir:'PERSONAS-UNAVAILABLE');"
```

If it prints `PERSONAS-UNAVAILABLE`, set `PERSONA_DIR = null` — every lens then runs on its inline
role and the review proceeds. **Persona files are enrichment, not a dependency; the review NEVER
blocks on CE's presence or layout.** After resolving, `ls` the dir and null out any persona filename
you planned to use that doesn't exist (CE renames things across versions). Roster as of 3.14.3:
correctness, testing, maintainability, project-standards, security, performance, api-contract,
data-migration, reliability, adversarial, previous-comments, julik-frontend-races, swift-ios,
agent-native, learnings-researcher, deployment-verification-agent (mostly `<stem>-reviewer.md`, but
`learnings-researcher.md` and `deployment-verification-agent.md` are not — always use the on-disk
filename, never derive it from the stem).

## Before the Workflow (do this inline)

1. **Scope** — resolve the file list + a `base:` ref. Holistic: the reviewers read whole files.
2. **Contract brief** — read the project's `CLAUDE.md` (+ subtree ones) and `docs/insights/` (or
   `docs/solutions/`), plus the unit's commit messages, and distill ≈10–20 lines: the invariants a
   change must not break · the deliberate values NOT to flag · the landmines to check for. This string
   is `BRIEF` below — every reviewer gets it verbatim. (Skipping this is the #1 cause of noisy
   reviews.) CE's agent-shaped equivalent of this step is its `learnings-researcher.md` persona — the
   inline brief covers it; mine that persona only if the project's insight corpus is big enough to
   warrant a dedicated sweep.
3. **Select lenses + resolve personas** — always-on table stakes + the conditional lenses the diff
   warrants (name the reason for each). Resolve `PERSONA_DIR` (above); confirm each selected persona
   file exists on disk, else set that lens's `persona: null`.

## The script

```javascript
export const meta = {
  name: 'ultramode-code-review',
  description: 'Holistic, contract-calibrated review + per-finding adversarial verification',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

// ---- filled in from the inline prep above ----
const PROJ = '<absolute project root>'
const SCOPE = '<file list + how to get the diff, e.g. `git -C PROJ diff <base> -- <paths>`>'
const BRIEF = `<the 10-20 line contract brief: invariants · values-not-to-flag · landmines>`
const PERSONA_DIR = '<resolved personas dir, or null if PERSONAS-UNAVAILABLE>'

// Lens = inline role (always present) + CE persona file (enrichment, NOT a dependency).
// persona: null → the inline role carries the lens alone. No agentType, ever (see header note).
// CE 3.14 roster notes: maintainability-reviewer absorbed simplicity + structural quality; there is
// NO architecture or language-idiom persona anymore (inline roles only — Swift being the one
// stack survivor, swift-ios-reviewer.md); performance-oracle and the data-integrity-guardian /
// data-migrations-reviewer pair are gone (performance-reviewer.md and data-migration-reviewer.md
// are the survivors).
const LENSES = [
  { key: 'correctness', persona: 'correctness-reviewer.md', role: 'logic errors, edge cases, state bugs, error propagation — does the code do what the unit intends?' },
  { key: 'architecture', persona: null, role: 'layer/purity rules and whole-subsystem invariants from the contract brief; new↔existing interaction seams' },
  { key: 'testing', persona: 'testing-reviewer.md', role: 'do the tests prove the right VALUE (not just typecheck)? coverage gaps, weak assertions, brittle tests' },
  { key: 'idiom', persona: null, role: '<stack> idiom and API misuse — name the stack\'s concrete failure modes, e.g. TypeScript: unsafe casts / any leakage across boundaries, non-exhaustive discriminated unions, floating/unawaited promises, wrong generic variance — how a fluent <stack> engineer would write this' }, // ← name the stack + its failure modes
  { key: 'simplicity', persona: 'maintainability-reviewer.md', role: 'YAGNI, premature abstraction, dead code, unnecessary indirection, PLUS structural quality — coupling, module boundaries, type-boundary leaks: should this exist, and does it live in the right place?' }, // ← owns the full merged maintainability persona (CE folded simplicity + structure together)
  { key: 'api-contract', persona: 'api-contract-reviewer.md', role: 'exported/persisted shape changes, event schemas, versioning, caller contracts' },
  { key: 'adversarial', persona: 'adversarial-reviewer.md', role: 'construct concrete failure scenarios that make the unit return a confidently-wrong result' }, // ← ALWAYS-ON floor (≥1) — OUR deliberate value (CE gates this persona by diff size; we do not).
  // High-risk escalation — REPLACE the single adversary with a diverse panel. Keys MUST start with
  // 'adv' (the isAdversary gate below keys on it) and each entry gets ONE distinct `angle`, which is
  // spliced into its directive automatically — N identical adversaries ≈ 1, N angles ≈ N:
  // { key: 'adv-boundary', persona: 'adversarial-reviewer.md', angle: 'boundary/discontinuity — thresholds, cliffs, exact-edge values', role: 'construct concrete failure scenarios that make the unit return a confidently-wrong result' },
  // { key: 'adv-temporal', persona: 'adversarial-reviewer.md', angle: 'temporal/state-evolution — a mid-run state change that moves a threshold', role: 'construct concrete failure scenarios that make the unit return a confidently-wrong result' },
  // + conditionals, e.g.: { key: 'security', persona: 'security-reviewer.md', role: 'auth, crypto/KDF, user input, permission boundaries' },
]

const FINDING_SCHEMA = {
  type: 'object',
  required: ['lens', 'findings'],
  properties: {
    lens: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'file', 'line', 'confidence', 'why_it_matters', 'suggested_fix'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          file: { type: 'string' }, line: { type: 'integer' },
          // CE's anchored confidence rubric — behavioral anchors, not a continuous score:
          // 100 verifiable from code alone · 75 confirmed concrete consequence · 50 real but minor
          // (a VERIFIED nitpick / narrow edge — survives only as P0 or soft-bucket) · 25/0
          // unverified-or-false → suppress.
          confidence: { type: 'integer', enum: [0, 25, 50, 75, 100] },
          why_it_matters: { type: 'string' },
          suggested_fix: { type: 'string' },
        },
      },
    },
    residual_risks: { type: 'array', items: { type: 'string' } },
    testing_gaps: { type: 'array', items: { type: 'string' } },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real', 'new', 'material', 'corrected_severity', 'reasoning'],
  properties: {
    real: { type: 'boolean' },          // verified against source — not handled elsewhere / not dead/overridden
    new: { type: 'boolean' },           // existing tests/reviews missed it
    material: { type: 'boolean' },      // can actually produce a wrong result / real harm (not unreachable defense-in-depth)
    corrected_severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3', 'drop'] },
    reasoning: { type: 'string' },      // the source evidence that confirms/refutes + right-sizes
  },
}

// The persona block: point the reviewer at its CE persona file with an explicit precedence order,
// so the persona's own (diff-scoped, CE-schema'd) plumbing never fights this review's contract.
const PERSONA = (l) => (PERSONA_DIR && l.persona) ? `

YOUR PERSONA FILE: ${PERSONA_DIR}/${l.persona}
Read it FIRST — it is your full role definition (identity, hunting techniques, calibration, ownership
boundaries). Precedence where it conflicts with this prompt:
1. OUTPUT — the structured object you must return here WINS over the persona's own output-format
   section. Emit EXACTLY this schema's fields: the top-level key is "lens" (not "reviewer"), there are
   NO artifact-file writes anywhere, and the persona's evidence / autofix_class / owner / pre_existing /
   requires_verification fields do NOT exist here — fold your best evidence quotes into why_it_matters.
   suggested_fix and why_it_matters are REQUIRED on EVERY finding, including advisory/adversarial ones
   where the persona permits omitting a fix: propose the most defensible fix and name the assumption.
2. SCOPE — this review is HOLISTIC (whole files), not diff-scoped: apply the persona's techniques to
   the whole unit, and size its depth calibration by the unit's size and risk, not changed-line counts.
3. CONFIDENCE — the persona's anchor rubric (0/25/50/75/100) IS this schema's confidence enum; use it
   as written.
4. OWNERSHIP — the persona's "another reviewer owns this, don't flag it" boundaries apply ONLY to the
   lenses actually running in THIS review (listed in your prompt). If the owning lens was NOT spawned,
   do NOT suppress a concrete finding in that domain — emit it (or route it to residual_risks if it is
   beyond your depth) rather than defer to an absent owner.` : ''

// Adversary lenses (key 'adversarial', or 'adv-*' for a panel) get an extra directive — their job is
// to GENERATE failure scenarios, not check a list. It composes with the persona's four attack
// techniques (assumption violation, composition failures, cascades, abuse cases). Appended ONLY for
// those lenses, so every other reviewer's prompt stays byte-identical (a resume keeps them cached).
// A panel entry's `angle` is spliced in as its EXCLUSIVE assignment — that is what makes N angles ≈ N.
const isAdversary = (l) => l.key === 'adversarial' || l.key.startsWith('adv-')
const ANGLES = 'boundary/discontinuity (thresholds, cliffs, exact-edge values), temporal/state-evolution (a mid-run state change that moves a threshold), numerical/finiteness (NaN/Inf/sign flips, a default that masks a missing figure), core invariants (can you perturb a determinism/identity invariant?), the direct-caller contract (short/partial/edge inputs the production caller never sends)'
const ADVERSARIAL = (l) => `\n\nADVERSARY MODE — your job is to BREAK this code, not tick a checklist. Construct CONCRETE failure scenarios with EXACT inputs that make the unit return a confidently-WRONG result (the project's cardinal sin). Hunt the seams the value lenses miss — ${l.angle ? `YOUR ASSIGNED ANGLE, hunt ONLY this seam (the other panelists own the rest): ${l.angle}` : `pick the angle(s) that fit: ${ANGLES}`}. Think "what wrong code passes the green suite?" — mutation-survival seams. For EACH: give the exact input and the wrong output you predict, so a verifier can reproduce it against source. A scenario you cannot make concrete is not a finding. Do NOT target documented deliberate values.`

const REVIEW = (l) => `You are the ${l.key} reviewer in a HOLISTIC, contract-calibrated code review.
YOUR LENS: ${l.role}
LENSES RUNNING IN THIS REVIEW (the only "owners" you may defer to): ${LENSES.map((x) => x.key).join(', ')}
PROJECT: ${PROJ}.  SCOPE: ${SCOPE}
Read the WHOLE files (not just changed lines) — judge new↔existing interactions and whole-subsystem invariants.${PERSONA(l)}

PROJECT CONTRACT BRIEF (judge against THESE; do not flag the listed deliberate values):
${BRIEF}

Return ONLY the structured object. Suppress any finding you cannot honestly anchor at confidence 50;
anchor-50 findings survive only as severity P0 or routed into residual_risks/testing_gaps — actionable
findings need 75+. Concrete code evidence per finding.
Weight findings that could produce a confidently-WRONG result (the project's worst failure).${isAdversary(l) ? ADVERSARIAL(l) : ''}`

const VERIFY = (f) => `Adversarially verify this review finding AGAINST THE ACTUAL SOURCE in ${PROJ}.
Finding: ${JSON.stringify(f)}
A confident finding is a hypothesis, not a verdict. Read the code and decide:
- real? (or handled elsewhere / dead / overridden / unreachable)
- new? (did the existing tests/reviews already cover it)
- material? (can it actually produce a wrong result, or is it unreachable defense-in-depth)
- the suggested fix — is it even correct (could it be directionally wrong)?
Right-size the severity from what the code shows. Return ONLY the structured verdict with source evidence.`

phase('Review')
const reviewed = await pipeline(
  LENSES,
  (l) => agent(REVIEW(l), { label: `review:${l.key}`, phase: 'Review', schema: FINDING_SCHEMA, model: 'opus' }),
  (r, l) =>
    parallel((r?.findings ?? []).map((f) => () =>
      agent(VERIFY(f), { label: `verify:${l.key}:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA, model: 'opus' })
        .then((v) => ({ ...f, lens: l.key, verdict: v })),
    )),
)

const all = reviewed.flat().filter(Boolean)
const confirmed = all.filter((f) => f.verdict?.real && f.verdict?.new && f.verdict?.material && f.verdict?.corrected_severity !== 'drop')
return { confirmed, advisory: all.filter((f) => !confirmed.includes(f)) }
```

## After the Workflow (do this inline)

- **Synthesize** — present `confirmed` (NEW × REAL × MATERIAL, the fix list) vs `advisory` (real-but-immaterial / forward landmines) vs the false alarms verification dropped (report these — they are the review's integrity).
- **Fix** the confirmed findings (smallest change that holds the contract), run the project's **full gate**.
- **Distill** — `/distill` the session's insight.

## Notes
- The reviewer agents are read-only; still sweep `git status` + any scratch dirs after (they sometimes leave probe files).
- If the platform lacks subagents, run lenses sequentially — same stages, same schema.
- **Personas are enrichment, not a dependency.** A `persona: null` lens runs on its inline role; a vanished persona file (CE update, rename) degrades to the same. Never let a missing CE artifact block or crash the review.
- **Model: run reviewers AND verifiers on `model: 'opus'` — explicitly, on every `agent()` call.** Never hardcode a mid-tier (`sonnet`/`haiku`) for the fan-out, and never omit `model` to inherit the session model (a pricier main-loop tier like Fable 5 then bleeds into every fan-out agent: higher rate × ~30% more tokens).
- **Adversary: ≥1 always.** On a high-risk change escalate to a diverse panel — one adversary per failure-mode angle (boundary · temporal/state · numerical · invariant · direct-caller) via `adv-*` keys + the per-lens `angle` field, which is what makes each prompt DISTINCT (N identical ≈ 1; N angles ≈ N) — and scale the verify vote with it.
- Scale verifiers: for a high-stakes finding, fan out 2–3 independent verifiers and take the majority.

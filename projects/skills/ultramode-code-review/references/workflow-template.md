# Workflow template — ultramode-code-review

A ready-to-adapt `Workflow` script for steps 4–6 of the cadence. Adapt the lens list, the conditional
agents, and the contract brief to the unit under review. It runs as ONE pipeline: each lens reviews,
then each of its findings is adversarially verified as soon as that lens returns (no barrier — a slow
lens never blocks a fast one's verification).

## Before the Workflow (do this inline)

1. **Scope** — resolve the file list + a `base:` ref. Holistic: the reviewers read whole files.
2. **Contract brief** — read the project's `CLAUDE.md` (+ subtree ones) and `docs/insights/` (or
   `docs/solutions/`), plus the unit's commit messages, and distill ≈10–20 lines: the invariants a
   change must not break · the deliberate values NOT to flag · the landmines to check for. This string
   is `BRIEF` below — every reviewer gets it verbatim. (Skipping this is the #1 cause of noisy reviews.)
3. **Select lenses** — always-on table stakes + the conditional agents the diff warrants (name the
   reason for each). Map the language-idiom lens to the stack's agent.

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

// Always-on (map idiom to the stack); add conditionals with a named reason. agentType = the ce agent.
const LENSES = [
  { key: 'correctness', agentType: 'compound-engineering:review:correctness-reviewer' },
  { key: 'architecture', agentType: 'compound-engineering:review:architecture-strategist' },
  { key: 'testing', agentType: 'compound-engineering:review:testing-reviewer' },
  { key: 'idiom', agentType: 'compound-engineering:review:kieran-typescript-reviewer' }, // ← stack-specific
  { key: 'simplicity', agentType: 'compound-engineering:review:code-simplicity-reviewer' },
  { key: 'api-contract', agentType: 'compound-engineering:review:api-contract-reviewer' },
  { key: 'adversarial', agentType: 'compound-engineering:review:adversarial-reviewer' }, // ← ALWAYS-ON floor (≥1); on a high-risk change escalate to a diverse panel (one per failure-mode angle)
  // + conditionals, e.g.: { key: 'security', agentType: 'compound-engineering:review:security-reviewer' },
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
          confidence: { type: 'number' },
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

// The adversary (key 'adversarial') gets an extra directive — its job is to GENERATE failure scenarios,
// not check a list. Appended ONLY for that lens, so every other reviewer's prompt stays byte-identical
// (a resume keeps them cached). For a diverse panel, give each adversary ONE of the angles below.
const ADVERSARIAL = `\n\nADVERSARY MODE — your job is to BREAK this code, not tick a checklist. Construct CONCRETE failure scenarios with EXACT inputs that make the unit return a confidently-WRONG result (the project's cardinal sin). Hunt the seams the value lenses miss — pick the angle(s) that fit: boundary/discontinuity (thresholds, cliffs, exact-edge values), temporal/state-evolution (a mid-run state change that moves a threshold), numerical/finiteness (NaN/Inf/sign flips, a default that masks a missing figure), core invariants (can you perturb a determinism/identity invariant?), the direct-caller contract (short/partial/edge inputs the production caller never sends). Think "what wrong code passes the green suite?" — mutation-survival seams. For EACH: give the exact input and the wrong output you predict, so a verifier can reproduce it against source. A scenario you cannot make concrete is not a finding. Do NOT target documented deliberate values.`

const REVIEW = (l) => `You are the ${l.key} reviewer in a HOLISTIC, contract-calibrated code review.
PROJECT: ${PROJ}.  SCOPE: ${SCOPE}
Read the WHOLE files (not just changed lines) — judge new↔existing interactions and whole-subsystem invariants.

PROJECT CONTRACT BRIEF (judge against THESE; do not flag the listed deliberate values):
${BRIEF}

Return ONLY the structured object. Suppress confidence<0.60. Concrete code evidence per finding.
Weight findings that could produce a confidently-WRONG result (the project's worst failure).${l.key === 'adversarial' ? ADVERSARIAL : ''}`

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
  (l) => agent(REVIEW(l), { label: `review:${l.key}`, phase: 'Review', schema: FINDING_SCHEMA, model: 'opus', agentType: l.agentType }),
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
- **Model: run reviewers AND verifiers on the latest/greatest** (`model: 'opus'` or inherit the session model) — never hardcode a mid-tier for the fan-out.
- **Adversary: ≥1 always.** On a high-risk change escalate to a diverse panel — one adversary per failure-mode angle (boundary · temporal/state · numerical · invariant · direct-caller), each a DISTINCT prompt (N identical ≈ 1) — and scale the verify vote with it.
- Scale verifiers: for a high-stakes finding, fan out 2–3 independent verifiers and take the majority.

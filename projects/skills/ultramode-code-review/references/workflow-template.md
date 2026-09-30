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
  description: 'Holistic, contract-calibrated review + severity-scaled adversarial verification under the abstention-aware vote law',
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

// ---- STRUCTURED-OUTPUT SIZE LAW (insight 084) ----
// An oversized StructuredOutput call is TRUNCATED after its first property; validation then fails on
// the missing fields, every retry re-truncates identically, and the agent dies at the retry cap.
// Prose budgets alone do not hold: the U16 review carried them verbatim and still lost 4 of 42 agents
// on a schema allowing 8 findings × four ~450-char fields. The SCHEMA is the enforcement layer (caps
// sized so a maximal LEGAL payload stays small), the prompt line is the advisory half — and this ONE
// table feeds both, so they cannot drift. Maximal legal finder payload ≈ 5.3 KB; verdict ≈ 0.9 KB.
const CAP = { findings: 4, title: 100, file: 160, why: 400, fix: 300, overflow: 4, overflowLen: 100, residual: 3, residualLen: 200, reason: 500, betterFix: 300 }

// The one required top-level field (`findings`) comes FIRST, so a truncated call still carries it and
// fails loud on content, not on a missing property; inside a finding the short fields lead and the
// two long strings trail. No `lens` key: the script already knows which lens it spawned.
const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      maxItems: CAP.findings,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: CAP.title },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          file: { type: 'string', maxLength: CAP.file },
          line: { type: 'integer' },
          // CE's anchored confidence rubric — behavioral anchors, not a continuous score:
          // 100 verifiable from code alone · 75 confirmed concrete consequence · 50 real but minor
          // (a VERIFIED nitpick / narrow edge — survives only as P0 or soft-bucket) · 25/0
          // unverified-or-false → suppress.
          confidence: { type: 'integer', enum: [0, 25, 50, 75, 100] },
          why_it_matters: { type: 'string', maxLength: CAP.why },
          suggested_fix: { type: 'string', maxLength: CAP.fix },
        },
        required: ['title', 'severity', 'file', 'line', 'confidence', 'why_it_matters', 'suggested_fix'],
      },
    },
    // No silent caps: a lens with more concrete findings than the cap names the rest here (title only),
    // and coverage.overflow tells the coordinator that lens was BOUNDED, not exhausted.
    overflow: { type: 'array', maxItems: CAP.overflow, items: { type: 'string', maxLength: CAP.overflowLen } },
    // Risks and testing gaps the lens could not make concrete enough to stand as a finding.
    residual_risks: { type: 'array', maxItems: CAP.residual, items: { type: 'string', maxLength: CAP.residualLen } },
  },
  required: ['findings'],
}

// Each verifier answers real / material / new SEPARATELY — the aggregation below tallies them
// separately (insight 077), so never ask for one folded "valid" boolean. `real` leads; the long
// strings trail.
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },           // verified against source — not handled elsewhere / not dead/overridden
    material: { type: 'boolean' },       // can actually produce a wrong result / real harm (not unreachable defense-in-depth)
    new: { type: 'boolean' },            // existing tests/reviews missed it
    corrected_severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3', 'drop'] },
    fix_is_correct: { type: 'boolean' }, // the suggested fix is right, not directionally wrong
    reasoning: { type: 'string', maxLength: CAP.reason },     // the source evidence (file:line) that confirms/refutes + right-sizes
    better_fix: { type: 'string', maxLength: CAP.betterFix }, // '' unless the suggested fix is wrong or incomplete
  },
  required: ['real', 'material', 'new', 'corrected_severity', 'fix_is_correct', 'reasoning', 'better_fix'],
}

// The size-law lines — spliced into EVERY prompt that emits a schema call (finder and verifier).
const SIZE_LAW_FINDER = `STRUCTURED-OUTPUT SIZE LAW: an oversized StructuredOutput call is TRUNCATED after its first property and fails validation; every retry re-truncates until the retry cap kills you, and your lens then certifies NOTHING. Stay inside the schema caps: at most ${CAP.findings} findings (fewer and deeper beats many and shallow; name further concrete ones in overflow: at most ${CAP.overflow} titles, title only, <= ${CAP.overflowLen} chars each); per finding title <= ${CAP.title} chars, file <= ${CAP.file}, why_it_matters <= ${CAP.why}, suggested_fix <= ${CAP.fix}; at most ${CAP.residual} residual_risks, each <= ${CAP.residualLen}. Depth belongs in your working text BEFORE the call; the call is the summary, not the essay.`
const SIZE_LAW_VERIFIER = `STRUCTURED-OUTPUT SIZE LAW: an oversized StructuredOutput call is TRUNCATED after its first property and fails validation; every retry re-truncates until the retry cap kills you, and your vote becomes an abstention. reasoning <= ${CAP.reason} chars citing file:line; better_fix <= ${CAP.betterFix} chars, or '' when the suggested fix is right. Trace in your working text BEFORE the call; the call is the verdict, not the trace.`

// The persona block: point the reviewer at its CE persona file with an explicit precedence order,
// so the persona's own (diff-scoped, CE-schema'd) plumbing never fights this review's contract.
const PERSONA = (l) => (PERSONA_DIR && l.persona) ? `

YOUR PERSONA FILE: ${PERSONA_DIR}/${l.persona}
Read it FIRST — it is your full role definition (identity, hunting techniques, calibration, ownership
boundaries). Precedence where it conflicts with this prompt:
1. OUTPUT — the structured object you must return here WINS over the persona's own output-format
   section. Emit EXACTLY this schema's fields: "findings" first, then the optional "overflow" and
   "residual_risks" (there is NO "reviewer" or "lens" key), there are NO artifact-file writes
   anywhere, and the persona's evidence / autofix_class / owner / pre_existing /
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
const ADVERSARIAL = (l) => `\n\nADVERSARY MODE — your job is to BREAK this code, not tick a checklist. Construct CONCRETE failure scenarios with EXACT inputs that make the unit return a confidently-WRONG result (the project's cardinal sin). Hunt the seams the value lenses miss — ${l.angle ? `YOUR ASSIGNED ANGLE, hunt ONLY this seam (the other panelists own the rest): ${l.angle}` : `pick the angle(s) that fit: ${ANGLES}`}. Think "what wrong code passes the green suite?" — mutation-survival seams. For EACH: give the exact input and the wrong output you predict (in why_it_matters), so a verifier can reproduce it against source. A scenario you cannot make concrete is not a finding. Do NOT target documented deliberate values.`

const REVIEW = (l) => `You are the ${l.key} reviewer in a HOLISTIC, contract-calibrated code review.
YOUR LENS: ${l.role}
LENSES RUNNING IN THIS REVIEW (the only "owners" you may defer to): ${LENSES.map((x) => x.key).join(', ')}
PROJECT: ${PROJ}.  SCOPE: ${SCOPE}
Read the WHOLE files (not just changed lines) — judge new↔existing interactions and whole-subsystem invariants.
READ-ONLY: do not create, edit or delete any file (no scratch files, no notes).${PERSONA(l)}

PROJECT CONTRACT BRIEF (judge against THESE; do not flag the listed deliberate values):
${BRIEF}

Return ONLY the structured object. Suppress any finding you cannot honestly anchor at confidence 50;
anchor-50 findings survive only as severity P0 or routed into residual_risks — actionable findings
need 75+. Concrete code evidence per finding.
Weight findings that could produce a confidently-WRONG result (the project's worst failure).${isAdversary(l) ? ADVERSARIAL(l) : ''}

${SIZE_LAW_FINDER}`

// Distinct refuter angles — diversity, not replication (N identical refuters ≈ 1). The first n run.
const REFUTER_ANGLES = [
  'REPRODUCE-IN-SOURCE: trace the exact code path the finding describes, line by line; does it really happen?',
  'REACHABILITY: can a real user, flow or caller in THIS codebase reach it, or does a guard / gate / dead path defang it?',
  'FIX-CORRECTNESS + PROJECT VALUES: is the suggested fix right (or directionally wrong), and is the finding flagging a DELIBERATE choice the brief lists?',
]
// The verify vote scales with the stakes (SKILL.md step 3): 3 refuters on any P0/P1, 2 on P2, 1 on P3.
const refuterCount = (sev) => (sev === 'P0' || sev === 'P1' ? 3 : sev === 'P2' ? 2 : 1)

const VERIFY = (f, angle) => `You are an adversarial VERIFIER in a holistic code review of ${PROJ} (READ-ONLY: create, edit or delete no file).
A confident finding is a hypothesis, not a verdict. Your job is to REFUTE it by reading the ACTUAL SOURCE; default real=false if you cannot confirm it in the code.
YOUR REFUTER ANGLE: ${angle}

PROJECT CONTRACT BRIEF (a finding that flags a listed deliberate value is not material):
${BRIEF}

FINDING (JSON): ${JSON.stringify(f)}

Answer each question ON ITS OWN — they are tallied separately, so never fold one into another:
- real? the code actually does what the finding claims (not handled elsewhere / dead / overridden / unreachable)
- material? it can produce a wrong result or real harm on a reachable path (not unreachable defense-in-depth)
- new? the existing tests/reviews do not already cover it
- corrected_severity: right-size it from what the code shows ('drop' if it should not stand as a finding)
- fix_is_correct: is the suggested fix right, or could it be directionally wrong? If wrong or incomplete, give better_fix; else ''.
Return ONLY the structured verdict, with source evidence.

${SIZE_LAW_VERIFIER}`

// 'yes' = strict majority, 'no' = strict minority, 'tie' = exactly half.
const tally = (yes, of) => (2 * yes > of ? 'yes' : 2 * yes < of ? 'no' : 'tie')

// THE VOTE LAW (SKILL.md step 5; insights 019 + 077) → [status, basis]. `cast` holds only the votes
// that came back; `n` is how many refuters the severity asked for (refuterCount above).
// - An abstention (a crashed verifier, agent() → null) is NOT a vote: it never reads as "not real".
// - `real` is decided among the cast votes; `material` and `new` are tallied SEPARATELY, and only
//   among the verifiers who affirmed real, never as one majority over the conjunction.
// - HAND-VERIFY (the coordinator traces it to source; never rejected, never advisory) on EXACTLY:
//   (1) no cast votes; (2) a tie on real; (3) once real: a tie on material, or any real-voter
//   calling it material while most do not; (4) once real and material: a tie on new, or any
//   real-voter calling it new while most do not; (5) a would-be rejected or advisory verdict resting
//   on fewer cast votes than the severity quorum min(2, n): a P0/P1 or P2 left with ONE vote after
//   the rest abstained (a P3's lone refuter is its whole quorum).
// - Every other split follows its majority: a minority calling it real is still rejected (the
//   rejected pile keeps that vote texture), and a minority calling it immaterial or not new is still
//   confirmed. A finding a majority traced as real reaches advisory only when EVERY verifier who
//   affirmed it agrees on the demoting axis, and only with the quorum met.
const classify = (cast, n) => {
  if (cast.length === 0) return ['hand-verify', 'no votes: every verifier crashed — an abstention, not a refutation (resume the run to re-verify, or trace it by hand)']
  const quorum = Math.min(2, n)
  const demote = (status, basis) => cast.length < quorum
    ? ['hand-verify', `would be ${status} (${basis}), but on ${cast.length} of ${n} votes: the rest abstained, below the severity quorum of ${quorum}`]
    : [status, basis]
  const realVoters = cast.filter((v) => v.real)
  const R = realVoters.length
  const real = tally(R, cast.length)
  if (real === 'no') return demote('rejected', 'a majority of the cast votes traced it as not real')
  if (real === 'tie') return ['hand-verify', 'split on existence — a tie is not a refutation']
  const M = realVoters.filter((v) => v.material).length
  const material = tally(M, R)
  if (material === 'tie' || (material === 'no' && M > 0)) return ['hand-verify', 'agreed real, split on materiality — the project-values call is the coordinator\'s (insight 077)']
  if (material === 'no') return demote('advisory', 'real, and every verifier who affirmed it graded it immaterial')
  const F = realVoters.filter((v) => v.new).length
  const fresh = tally(F, R)
  if (fresh === 'tie' || (fresh === 'no' && F > 0)) return ['hand-verify', 'real and material, split on whether existing tests/reviews already cover it — a newness split never defers a real finding (insight 077)']
  if (fresh === 'no') return demote('advisory', 'real and material, and every verifier who affirmed it says existing tests/reviews already cover it')
  return ['confirmed', 'NEW × REAL × MATERIAL']
}

const verifyOne = async (f, lensKey, i) => {
  const n = refuterCount(f.severity)
  const votes = await parallel(REFUTER_ANGLES.slice(0, n).map((angle, k) => () =>
    agent(VERIFY(f, angle), { label: `verify:${lensKey}:${i + 1}.${k + 1}`, phase: 'Verify', schema: VERDICT_SCHEMA, model: 'opus' })))
  const cast = votes.filter(Boolean) // abstentions are counted below, never voted
  const realVoters = cast.filter((v) => v.real)
  const [status, basis] = classify(cast, n)
  return {
    ...f, lens: lensKey, status, basis,
    // vote texture — material and new are counted among the verifiers who affirmed real
    votes: `real ${realVoters.length}/${cast.length} · material ${realVoters.filter((v) => v.material).length}/${realVoters.length} · new ${realVoters.filter((v) => v.new).length}/${realVoters.length}${cast.length < n ? ` · abstained ${n - cast.length}/${n}` : ''}`,
    votedSeverity: cast.map((v) => v.corrected_severity),
    fixOk: `${cast.filter((v) => v.fix_is_correct).length}/${cast.length}`,
    reasons: cast.map((v) => v.reasoning),
    betterFix: cast.map((v) => v.better_fix).filter((s) => s && s.length > 0),
  }
}

phase('Review')
const perLens = await pipeline(
  LENSES,
  (l) => agent(REVIEW(l), { label: `review:${l.key}`, phase: 'Review', schema: FINDING_SCHEMA, model: 'opus' }),
  // A CRASHED LENS (agent() → null: a terminal API error, a skip, a size-law retry death) is an
  // ABSTENTION — it certified nothing about its domain. It is carried as a marker and reported in
  // coverage.crashedLenses, never flattened into "no findings" (insight 019's law at the finder layer).
  (r, l) => !r
    ? { lens: l.key, crashed: true }
    : parallel(r.findings.map((f, i) => () => verifyOne(f, l.key, i))).then((vs) => ({
        lens: l.key,
        overflow: r.overflow ?? [],
        residual: r.residual_risks ?? [],
        // parallel() turns a thrown thunk into null — keep that finding, marked, instead of dropping it.
        verified: vs.map((v, i) => v ?? { ...r.findings[i], lens: l.key, status: 'hand-verify', basis: 'its verify stage threw — unverified, not refuted', votes: 'none cast', votedSeverity: [], fixOk: '0/0', reasons: [], betterFix: [] }),
      })),
)

// Coverage FIRST. A lens counts as covered only if its result came back — keyed by lens name, not
// array position, so this holds whether pipeline() hands stage 2 a null or drops the item itself.
const done = perLens.filter((x) => x && !x.crashed)
const ran = new Set(done.map((x) => x.lens))
const crashedLenses = LENSES.map((l) => l.key).filter((k) => !ran.has(k))
const overflow = done.filter((x) => x.overflow.length > 0).map((x) => `${x.lens}: ${x.overflow.join(' | ')}`)
if (crashedLenses.length) log(`COVERAGE HOLE: ${crashedLenses.length}/${LENSES.length} lenses crashed and certified NOTHING (${crashedLenses.join(', ')}). Resume the run to re-run them; never report their domains clean.`)
if (overflow.length) log(`${overflow.length} lens(es) hit the ${CAP.findings}-finding cap; their overflow titles are in coverage.overflow (a bounded lens is not an exhausted one)`)

const all = done.flatMap((x) => x.verified)
const bucket = (s) => all.filter((f) => f.status === s)
// The rejected pile keeps its vote texture: read it before declaring the review clean (insight 077).
const texture = (f) => ({ lens: f.lens, severity: f.severity, at: `${f.file}:${f.line}`, title: f.title, votes: f.votes, votedSeverity: f.votedSeverity.join(','), reason: (f.reasons[0] || '').slice(0, 240) })
const result = {
  coverage: { lenses: LENSES.length, ran: ran.size, crashedLenses, findings: all.length, overflow, residualRisks: done.flatMap((x) => x.residual.map((s) => `${x.lens}: ${s}`)) },
  confirmed: bucket('confirmed'),
  handVerify: bucket('hand-verify'),
  advisory: bucket('advisory'),
  rejected: bucket('rejected').map(texture),
}
log(`${result.confirmed.length} confirmed · ${result.handVerify.length} hand-verify · ${result.advisory.length} advisory · ${result.rejected.length} rejected — from ${ran.size}/${LENSES.length} lenses`)
return result
```

## After the Workflow (do this inline)

- **Coverage first** — read `coverage.crashedLenses` before any bucket. A crashed lens is an
  ABSTENTION: its domain was never reviewed. Resume the run (`Workflow({scriptPath, resumeFromRunId})`
  — the journal replays every finished agent from cache and re-runs only the dead ones) or name the
  uncovered lens in the report; never report "no findings" for it. Read `coverage.overflow` too: a lens
  that hit the findings cap was bounded, not exhausted — re-run it narrower if its overflow titles look
  live.
- **Synthesize four buckets** — `confirmed` (NEW × REAL × MATERIAL, the fix list) · `handVerify` (no
  votes, a tie, a materiality or newness split on a real finding, or a rejection/deferral resting on
  fewer votes than the severity quorum — each item's `basis` names which; trace each to source yourself
  and decide; this pile is the coordinator's, never a silent drop) · `advisory` (real-but-immaterial,
  or real + material but already covered, each by EVERY verifier who affirmed it — forward landmines) ·
  `rejected` (the false alarms, each with its vote texture — read the texture before calling the
  review clean, and report them: they are the review's integrity).
- **Fix** the confirmed findings and the hand-verified ones that proved NEW × REAL × MATERIAL (smallest
  change that holds the contract), run the project's **full gate**.
- **Distill** — `/distill` the session's insight.

## Notes
- The reviewer agents are read-only; still sweep `git status` + any scratch dirs after (they sometimes leave probe files).
- If the platform lacks subagents, run lenses sequentially — same stages, same schema.
- **Personas are enrichment, not a dependency.** A `persona: null` lens runs on its inline role; a vanished persona file (CE update, rename) degrades to the same. Never let a missing CE artifact block or crash the review.
- **Model: run reviewers AND verifiers on `model: 'opus'` — explicitly, on every `agent()` call.** Never hardcode a mid-tier (`sonnet`/`haiku`) for the fan-out, and never omit `model` to inherit the session model (a pricier main-loop tier like Fable 5 then bleeds into every fan-out agent: higher rate × ~30% more tokens).
- **Adversary: ≥1 always.** On a high-risk change escalate to a diverse panel — one adversary per failure-mode angle (boundary · temporal/state · numerical · invariant · direct-caller) via `adv-*` keys + the per-lens `angle` field, which is what makes each prompt DISTINCT (N identical ≈ 1; N angles ≈ N) — and scale the verify vote with it.
- **The verify vote is never a majority over one boolean.** Refuters scale with severity (3 on P0/P1, 2 on P2, 1 on P3), each on a distinct refuter angle, and their votes aggregate under the SKILL.md step-5 law: a crashed verifier is an abstention, never a "not real" vote; `real` and `material` are tallied SEPARATELY, never as a majority over the conjunction; a finding the refuters affirm but split on impact or on newness — or any tie, or a rejection/deferral resting on fewer cast votes than the severity quorum `min(2, n)` because the rest abstained — is a hand-verification trigger for the coordinator, not a rejection (the exact list is the comment above `classify()`); and a review is never declared clean from the confirmed count alone — read the rejected pile's vote texture first. Sources: `projects/the-back-nine/docs/insights/019-a-crashed-verifier-is-not-a-refutation-missing-votes-must-abstain-not-discard.md` and `projects/the-back-nine/docs/insights/077-a-materiality-tie-on-an-agreed-real-gap-is-a-hand-verification-trigger-not-a-rejection.md`.
- **A crashed FINDER lens is an abstention too** — reported in `coverage.crashedLenses` (and logged as a coverage hole), never flattened into "no findings".
- **Schema size law.** Every schema carries `maxItems` / `maxLength` caps from the one `CAP` table, the one required field leads, and every finder and verifier prompt carries a size-law line built from the same table. Keep the maximal legal payload small when you adapt the caps — prose budgets alone lost 4 of 42 U16 agents. Source: `projects/the-back-nine/docs/insights/084-an-oversized-structured-output-call-truncates-after-its-first-property-and-dies-the-retry-loop.md`.

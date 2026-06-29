export const meta = {
  name: 'council',
  description: 'The Council of Elders — diverse expert agents debate a decision, a red team refutes the consensus, and a chair synthesizes a confidence-graded, tier-classified verdict. Each elder runs in its own fresh context window.',
  whenToUse: 'Invoked by the /council skill (or directly) instead of stopping to ask Briggsy a non-trivial judgment call. Pass { issue, context, weight, openers? } in args.',
  phases: [
    { title: 'Dossier', detail: 'the clerk grounds the issue in real code/docs and triages oracle-settled questions' },
    { title: 'Opening', detail: 'each elder takes an independent position, blind to the others' },
    { title: 'Red Team', detail: 'the adversary refutes the emerging consensus' },
    { title: 'Rebuttal', detail: 'elders debate — concede, hold, or sharpen (full councils only)' },
    { title: 'Synthesis', detail: 'the chair weighs the debate into a verdict' },
  ],
}

// ============================================================================
// CHARTERS — single source of truth for the elders. Edit here to tune a voice.
// (Plain text, not markdown — these are subagent prompts. No backticks inside.)
// ============================================================================
const CHARTERS = {
  clerk: [
    'You are the CLERK of the Council. You do not opine and you do not vote. You build the evidence packet every elder will cite. A council that debates from memory hallucinates — and calm-but-wrong is the cardinal sin of this project. Your dossier is the antidote.',
    '',
    'YOUR JOB: For the issue handed to you, READ THE REAL ARTIFACTS (do not work from memory). Start with the ones the issue touches:',
    '- docs/product.md — the why/what, the cardinal rule (section 2), locked decisions (section 4), the R-ledger.',
    '- docs/architecture.md — the load-bearing engine invariants.',
    '- docs/roadmap.md — the You-Are-Here status table, validation gates.',
    '- docs/decisions/*.md and docs/insights/*.md relevant to the issue.',
    '- CLAUDE.md (project) — project law, the bar.',
    '- the actual source under src/ that the issue touches (read it; cite line numbers).',
    '',
    'PRODUCE THE DOSSIER:',
    '1. facts — each a concrete claim WITH a citation (file:line or doc section). No claim without a source.',
    '2. bindingConstraints — locked decisions, invariants, or landmines that CONSTRAIN any answer (cite each). The walls the elders cannot debate through.',
    '3. relevantInsights — prior lessons / landmines (docs/insights/NNN) that bear on this issue.',
    '4. tension — which of the six value tensions this sits on: Honesty-vs-Calm, Purity-vs-Richness, Precision-vs-Simplicity, Conservative-vs-Disclosed, Craft-vs-Empathy, Oracle-vs-Principle. (It may sit on two.)',
    '5. oracleSettled — the triage. Is there already a test, lint rule, locked decision, or insight that SETTLES this without debate? If yes: settled=true with answer + basis (cite it). If no: settled=false. Do NOT manufacture a debate the project already closed, and do NOT claim settled when it is a genuine judgment call.',
    '6. grounding — ATTEST whether this dossier is genuinely grounded. Set grounded=true if you read real artifacts and the facts are actually cited. Set grounded=true ALSO for a legitimately novel/sparse issue with little prior art — but explain in note (e.g. "legitimately sparse: novel, no prior art; proceeding on first principles, marked unsourced"). Set grounded=false ONLY if you could not ground this at all AND it is not a characterizable novel case (the issue is empty, contradictory, or unintelligible). This is PROVENANCE-based, never array-length-based: empty fact lists can be perfectly legitimate for a novel issue, so never fail an issue merely because a list is short.',
    '',
    'DISCIPLINE: Cite everything. If you cannot find a source, label it "unsourced" — never invent a plausible value. Be complete but tight. If the dossier is wrong, the whole council is wrong. You are not the decider; you are why the decision will be grounded.',
  ].join('\n'),

  honestyHawk: [
    'You are the HONESTY HAWK — guardian of the cardinal rule. Your north star: CALM-BUT-WRONG IS THE SIN. Friends bet real retirement money on this answer with LESS protection than a commercial tool — so the honesty bar RISES, never softens. "It is just for friends" never excuses a confidently-wrong answer.',
    '',
    'YOU OPTIMIZE FOR: every omission named with its DIRECTION (does it err conservative or optimistic, and is that disclosed?); the hedge on every headline; no false precision; conservative-or-disclose. You would rather the product say LESS and be RIGHT than say MORE and be calm-but-wrong.',
    '',
    'GROUND IN (cite the dossier): docs/product.md section 2 (the cardinal rule), the calm-but-wrong insights (008, 014, 039, 043, 044, 048), docs/architecture.md (the honesty gates, copyGuard "require the hedge").',
    '',
    'HOW YOU DEBATE: Attack any position that buys calm, simplicity, or polish at the cost of truth. Your two questions: (1) "What will the user wrongly believe if we do this?" (2) "Which direction does this err — and is that error disclosed?" Simplicity and craft are real values, but they SERVE honesty, never override it.',
    '',
    'YOUR VETO: If the council is about to ship something calm-but-wrong, raise a VETO. A veto OUTRANKS a majority vote. State it explicitly: the specific FALSE BELIEF the option would create in the user, and the honest alternative.',
    '',
    'OUTPUT: recommendation; the honestyRisk you see; the direction of any error (conservative/optimistic/none) and whether disclosed (put this in worriedAbout); set veto=true/false and, if you veto, vetoFalseBelief. optimizingFor = honesty. Cite the dossier.',
  ].join('\n'),

  architect: [
    'You are the ARCHITECT — guardian of the engine. Your north star: the load-bearing contracts must NEVER break. They were won the hard way and the golden cases depend on them.',
    '',
    'THE INVARIANTS YOU GUARD:',
    '- Single shared market draw / CRN. All buckets share ONE market-return draw per year; per-bucket draws are forbidden (they break CRN and re-enable asset-location).',
    '- Stateless Box-Muller. No cached spare across calls.',
    '- Reduce-to-spine byte-identity. Every overlay, when OFF, reduces byte-identically (same seed) to the Trinity/Bengen-validated decumulation.',
    '- Engine purity. src/engine/** is a pure function of (params, seed) — no clock, entropy, env, or feature-layer imports.',
    '- Constants discipline. ONE canonical year-keyed table; every figure {value, citation, directionalUntilPinned}; no in-range default fallbacks (an unsourced figure throws); never re-type a dated figure elsewhere.',
    '- Externally-derived fixtures. A golden computed via the engine own formula proves typing, not correctness.',
    '',
    'GROUND IN (cite the dossier): docs/architecture.md (canonical invariants), CLAUDE.md (load-bearing contracts), the engine insights (001, 007, 028, 029, 034), the relevant src/engine/ source.',
    '',
    'HOW YOU DEBATE: Check every proposal against the invariants — Does this preserve CRN / the single shared draw? Does the empty/OFF path reduce byte-identically? Does this leak a clock, entropy, or env into the engine? Is this constant sourced, or a default fallback in disguise? If a proposal violates an invariant, that is USUALLY FATAL — say so and propose the invariant-preserving alternative. Architecture serves correctness; never wave an invariant through for convenience or polish.',
    '',
    'OUTPUT: recommendation; which invariants it touches and whether it preserves them (in reasoning); the safe alternative if not (in worriedAbout); optimizingFor = engine integrity. Cite the dossier.',
  ].join('\n'),

  minimalist: [
    'You are the MINIMALIST — guardian of scope and calm. Your north star: this is a CALM CO-PILOT, NOT A FIRE CALCULATOR. Accumulation is a bounded near-retirement on-ramp. The intake is a ~5-minute single pass. The one job: a married couple decumulation strategy. The center of gravity stays decumulation.',
    '',
    'YOU OPTIMIZE FOR: cutting gold-plating (polish bolted onto wrong bones); deferring "chapter two" (off-thesis-for-now, not off-thesis-forever); protecting the calm on-ramp (fewer knobs, no coarse-then-detailed re-entry). Your favorite question: "Is this the one job, or is this scope creep wearing a good costume?"',
    '',
    'GROUND IN (cite the dossier): docs/product.md (scope boundaries, "accumulation is a bounded on-ramp", chapter-two-deferred), docs/roadmap.md (R32, R35), the decisions that DEFERRED things (portfolio multi-holding, NIIT/state OUT-but-disclosed).',
    '',
    'HOW YOU DEBATE: Push to DO LESS. Challenge complexity and every new control. YOUR HARD LIMIT: never argue to cut something whose OMISSION makes the answer wrong — that is not simplicity, that is calm-but-wrong, and the Honesty Hawk is right to veto it. Simplicity SERVES honesty; it never overrides it. (You do not get to drop a survivor%, a cliff, or an ongoing-income stream just to keep the form short.)',
    '',
    'OUTPUT: recommendation; what it adds to scope and whether it is the-one-job or chapter-two (in reasoning); the simpler alternative (in worriedAbout); optimizingFor = simplicity/scope. Cite the dossier.',
  ].join('\n'),

  craftsman: [
    'You are the CRAFTSMAN — guardian of the bar ("water beads off it"). Your north star: the PRODUCT STANDS ON ITS OWN. The magic of how it was built disappears, and the joy of the product itself takes over. The named bar: water beading on a deep-gloss car hood — polished WITH ATTITUDE, not generic clean. WOW over merely tidy.',
    '',
    'YOU OPTIMIZE FOR: pixel integrity (nothing clips anything; holds at any viewport); flow integrity (moves the way a USER expects, not the way a builder structured it); user-seat empathy (you are consuming the product, not auditing the build); the strongest, most intentional aesthetic + interaction-design position.',
    '',
    'YOUR ONE HUMILITY (CRITICAL): on taste you PROPOSE — Briggsy holds final authority. But "final authority" means he can OVERRIDE after the fact via the digest, NOT that you pre-confirm with him. So COMMIT to your single strongest taste pick as the lead; at high confidence it SHIPS and he reviews it (mark it yours-to-close so it is digest-flagged for his eye). Do NOT kick a confident, reversible taste choice back as an "A or B, your call" — that over-deferral reads as no confidence and is exactly what Briggsy rejected (2026-06-28). Mechanical craft (a measurable clip, a broken focus ring, a contrast failure) is council-decided outright.',
    '',
    'GROUND IN (cite the dossier): the project design law (back-nine-design, emil-design-eng, the Every frontend-design variant, web-design-guidelines), the visual insights, and the ACTUAL rendered surfaces in src/ui and src/viz.',
    '',
    'HOW YOU DEBATE: Argue for craft and WOW — but NEVER at the cost of honesty (a beautiful calm-but-wrong chart is still the sin) or accessibility (color is never the only signal; Briggsy is color-blind; WCAG AA contrast does not by itself satisfy color-blind-safe encoding). When the Honesty Hawk or the Advocate pushes back, they usually outrank you.',
    '',
    'OUTPUT: recommendation; the craft upside (in reasoning); whether final sign-off is yours-to-close (taste) or council-decided (mechanical), plus the accessibility check (in worriedAbout); optimizingFor = craft/WOW. Cite the dossier.',
  ].join('\n'),

  advocate: [
    'You are the ADVOCATE — the user in the seat. You ARE the user: a married person near or in retirement, betting real money on this answer. You are NOT a finance expert. You may be color-blind (Briggsy is). You are reading on a laptop (the primary surface) or a phone. You speak for comprehension, trust, and dignity.',
    '',
    'YOU OPTIMIZE FOR: plain language, no jargon ("your estimated monthly benefit at 67", not "PIA"; "leave more / pay less tax / live bigger now", not "lexicographic objective"); the right emotional landing (on-track reads as RELIEF; borderline reads as HONEST AND CALM, never alarmist, never falsely soothing); color is NEVER the only signal (every encoding needs a second channel — shape, label, position, texture; WCAG AA contrast does not satisfy this alone); the ~5-minute path is not betrayed.',
    '',
    'GROUND IN (cite the dossier): docs/product.md (the user, the cardinal rule), back-nine-design (color-blind-safe encoding, intake UX), the cold-read insights, the accessibility decisions (ask SS in monthly terms, route to mySSA with honest "$0 future earnings").',
    '',
    'HOW YOU DEBATE: Your question — "Would a real, scared, non-expert user understand this and trust it?" Defend accessibility hard; it is not negotiable. Challenge anything correct-but-incomprehensible, anything that leans on color alone, anything that makes the calm on-ramp feel like a tax form. You and the Honesty Hawk are allies: an answer the user MISUNDERSTANDS is as bad as one that is wrong.',
    '',
    'OUTPUT: recommendation; the comprehension/trust read (in reasoning); the accessibility check (esp. color-blind-safe) and where a real user would stumble (in worriedAbout); optimizingFor = user comprehension/trust. Cite the dossier.',
  ].join('\n'),

  fiduciaryAdvisor: [
    'You are the FIDUCIARY ADVISOR — the domain authority. You are a seasoned, fee-only CFP in the Kitces / Bogleheads tradition, with a real FIDUCIARY DUTY. You channel what a good retirement advisor would actually say about the SUBSTANCE — not the engineering, the advice.',
    '',
    'YOU OPTIMIZE FOR: the recommendation being GENUINELY SOUND retirement planning, not merely well-built. You hold the domain reality the engine is modeling:',
    '- Withdrawal sequencing and Roth conversion as coupled levers — fill brackets now vs. RMDs + IRMAA later.',
    '- The survival floor vs. lifestyle trade-off (the lexicographic objective made real for a household).',
    '- Social Security claiming and the survivor picture — the widow(er) tax cliff when one spouse dies and brackets halve.',
    '- The cliffs that INVERT winners: the 400% FPL ACA subsidy cliff (pre-65), IRMAA brackets (post-65).',
    '- Sequence-of-returns risk and the optimizer curse — why a single lucky path must never be sold as a plan.',
    '',
    'GROUND IN (cite the dossier): docs/research/, docs/product.md (D1 lexicographic, D4 search space, D6 tax scope — "IN iff sequencing or conversion can move it"), the SS / tax / ACA decisions and constants, and real fiduciary practice.',
    '',
    'HOW YOU DEBATE: Your question — "Is this what a good advisor would actually do for THIS household?" Flag where engineering elegance diverges from sound advice, and where a real planner would worry (the widow cliff, the conversion that looks bad tax-blind but wins after the cliff, the ACA cliff a conversion trips). RESPECT THE HONESTY HAWK: a defensible-but-uncertain advisory call must be DISCLOSED, never stated as certain. You bring authority, not false confidence.',
    '',
    'OUTPUT: recommendation; the domain soundness check (in reasoning); the real-world failure mode an advisor would fear and what a fiduciary would disclose (in worriedAbout); optimizingFor = sound retirement advice. Cite the dossier.',
  ].join('\n'),

  redTeam: [
    'You are the RED TEAM — the adversary. You have NO value to defend and NO position to protect. You have one job: REFUTE THE EMERGING CONSENSUS. Find the calm-but-wrong failure, the inverted winner, the edge case, the invariant the elders missed, the way this looks right and IS wrong.',
    '',
    'METHOD: Default to skeptical. Take the position the council is converging on and attack it from every angle — correctness, honesty, the engine invariants, the user actual lived experience, the domain reality, and the UNSTATED ASSUMPTION holding it up. Attack the MOST CONFIDENT claim hardest (confidence is where blind spots hide). Use the project own history — the insights catalog is a list of times this project shipped (or nearly shipped) calm-but-wrong; if this consensus rhymes with a past failure, name it. Steelman, then break.',
    '',
    'GROUND IN (cite the dossier): the clerk dossier (your attacks must be grounded, not vibes), the docs/insights/ failure catalog, docs/architecture.md (the invariants that are EASY to violate).',
    '',
    'HONESTY ABOUT YOUR OWN ATTACKS: If you genuinely CANNOT break the consensus after a real attempt, SAY SO plainly. Do not manufacture weak attacks to look busy — a fake objection wastes the chair judgment and erodes trust in the real ones. A clean "I tried these N angles and the consensus holds because..." is a valuable result.',
    '',
    'OUTPUT: attacks (each: target, failureMode, severity high/med/low, evidence from the dossier); the single mostDangerousCalmButWrongRisk in the consensus; couldBreakConsensus true/false with the reason.',
  ].join('\n'),

  chair: [
    'You are the CHAIR — the synthesizer. You weigh the whole debate and produce THE VERDICT. You do NOT vote-count. MAJORITY IS NOT TRUTH.',
    '',
    'HARD RULES:',
    '- The VETO outranks the vote. If the Honesty Hawk vetoed, the council does NOT ship the calm-but-wrong option — full stop, regardless of how many elders liked it. Take the honest alternative the council endorsed, or escalate.',
    '- Preserve the dissent. Record the STRONGEST opposing view (close to verbatim) plus "what would have to be true for the dissent to win." Never erase the minority view — it is how Briggsy sanity-checks you.',
    '- Grade confidence with a reason. high/medium/low AND 1-10, plus what specifically makes you (un)sure. "8/10 — three independent lenses agreed and the red team could not break it" beats a bare number.',
    '- Honor the red team. If it landed a real hit the elders did not answer, your confidence drops and you say why.',
    '',
    'CLASSIFY THE TIER:',
    '- oracle-settled — a test/lint/locked decision/insight already answered it (the clerk should have caught this; if you see it late, say so).',
    '- council-decided — reversible/internal; safe to execute (wording drafts, refactors, mechanical craft, scale/consistency with a clear honest answer).',
    '- yours-to-close — TASTE / product-direction or scope expansion / real-money spend / irreversible or outward-facing. This means Briggsy REVIEWS it (flagged in the digest), NOT that you pre-confirm with him. At high confidence a REVERSIBLE taste/direction call still SHIPS (action=execute): COMMIT to the lead pick; the runner-up goes in dissent, never as a co-equal "A or B?" punt. Only money/public/irreversible (hardStop) actually waits on Briggsy before it lands.',
    'A verdict may SPLIT: e.g. council-decided on the wording, yours-to-close on the tone sign-off. Say so in "split" and give the action for each part.',
    '',
    'FLAG HARD-STOPS: set hardStop.is=true (+ reason) ONLY if the action (a) spends real money, (b) publishes something outward/public beyond the repo, or (c) is destructive data-loss / a force-push to main. These go to Briggsy regardless of confidence — review-after-the-fact is meaningless when it cannot be undone. EXCEPTION: money/outward are WAIVED when the caller notes Briggsy gave up-front all-clear for this work (prior clearance counts). Everything else — code, copy, layout, scale, scope-within-the-app, even taste/direction calls — is NOT a hard-stop and executes at high confidence.',
    '',
    'RECOMMEND THE ACTION: at confidence >= 7/10, not a hard-stop, no live veto -> action=execute AND commit to ONE recommendation (ship the lead; the runner-up lives in dissent). Do NOT hedge a confident, reversible call into "A or B, your call" — if the council resolved it, ship it and let Briggsy override via the digest (the over-deferral he rejected 2026-06-28). action=surface ONLY when confidence < 7/10, OR a live veto, OR hardStop.is=true (money/public/irreversible).',
    '',
    'OUTPUT THE VERDICT: recommendation (the SPECIFIC action to take); rationale (grounded, cite the dossier); confidence {level, score, reason}; tier (+ split if any); dissent {position, who, whatWouldFlipIt}; honestyHawkVeto {fired, falseBelief}; hardStop {is, reason}; action; and a one-line digestLine for the log.',
  ].join('\n'),
}

// ---- roster construction -----------------------------------------------------
const ALL_OPENERS = [
  { id: 'honesty-hawk', charter: CHARTERS.honestyHawk },
  { id: 'architect', charter: CHARTERS.architect },
  { id: 'minimalist', charter: CHARTERS.minimalist },
  { id: 'craftsman', charter: CHARTERS.craftsman },
  { id: 'advocate', charter: CHARTERS.advocate },
  { id: 'fiduciary-advisor', charter: CHARTERS.fiduciaryAdvisor },
]

// args may arrive as a real object OR (the untyped-param footgun) as a JSON
// string — tolerate both so a stringified payload never silently degrades to
// "(no issue supplied)" and burns a full council over nothing.
let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch { A = {} } }
A = A || {}

const issue = (A.issue ? String(A.issue).trim() : '')
const context = (A.context ? String(A.context).trim() : '') || '(none)'
const weight = A.weight || 'full'
const seat = Array.isArray(A.openers) ? A.openers : null

// FAIL-LOUD PRECONDITION GATE (the council's own dogfooded recommendation):
// refuse BEFORE spawning any elder when there is no real issue to decide. A
// confident verdict synthesized over an empty prompt is the purest calm-but-
// wrong artifact this council exists to prevent.
if (!issue || issue === '(no issue supplied)') {
  throw new Error('council: no issue supplied. Pass args.issue (a concrete decision to resolve). ' +
    'Refusing to spawn elders over an empty prompt — that would be the calm-but-wrong sin. ' +
    '(If you passed args, it likely arrived as a JSON string and failed to parse; check the payload.)')
}

// honesty-hawk is ALWAYS seated; a light council may seat a subset of the rest.
let openers = ALL_OPENERS
if (seat && seat.length) {
  openers = ALL_OPENERS.filter(o => o.id === 'honesty-hawk' || seat.includes(o.id))
}

// ---- schemas -----------------------------------------------------------------
const DOSSIER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['facts', 'bindingConstraints', 'relevantInsights', 'tension', 'oracleSettled', 'grounding'],
  properties: {
    facts: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['claim', 'citation'],
      properties: { claim: { type: 'string' }, citation: { type: 'string' } } } },
    bindingConstraints: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['constraint', 'citation'],
      properties: { constraint: { type: 'string' }, citation: { type: 'string' } } } },
    relevantInsights: { type: 'array', items: { type: 'string' } },
    tension: { type: 'array', items: { type: 'string' } },
    oracleSettled: {
      type: 'object', additionalProperties: false, required: ['settled'],
      properties: { settled: { type: 'boolean' }, answer: { type: 'string' }, basis: { type: 'string' } } },
    grounding: {
      type: 'object', additionalProperties: false, required: ['grounded', 'note'],
      properties: { grounded: { type: 'boolean' }, note: { type: 'string' } } },
  },
}

const POSITION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['recommendation', 'reasoning', 'optimizingFor', 'worriedAbout', 'confidence'],
  properties: {
    recommendation: { type: 'string' }, reasoning: { type: 'string' },
    optimizingFor: { type: 'string' }, worriedAbout: { type: 'string' },
    confidence: { type: 'number' },
    veto: { type: 'boolean' }, vetoFalseBelief: { type: 'string' },
  },
}

const REDTEAM_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['attacks', 'mostDangerousCalmButWrongRisk', 'couldBreakConsensus'],
  properties: {
    attacks: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['target', 'failureMode', 'severity', 'evidence'],
      properties: {
        target: { type: 'string' }, failureMode: { type: 'string' },
        severity: { type: 'string', enum: ['high', 'medium', 'low'] }, evidence: { type: 'string' } } } },
    mostDangerousCalmButWrongRisk: { type: 'string' },
    couldBreakConsensus: { type: 'boolean' }, reason: { type: 'string' },
  },
}

const REBUTTAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['concede', 'hold', 'sharpenedRecommendation', 'confidence'],
  properties: {
    concede: { type: 'string' }, hold: { type: 'string' },
    sharpenedRecommendation: { type: 'string' }, confidence: { type: 'number' },
    changedMind: { type: 'boolean' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['recommendation', 'rationale', 'confidence', 'tier', 'dissent', 'honestyHawkVeto', 'hardStop', 'action', 'digestLine'],
  properties: {
    recommendation: { type: 'string' }, rationale: { type: 'string' },
    confidence: {
      type: 'object', additionalProperties: false, required: ['level', 'score', 'reason'],
      properties: {
        level: { type: 'string', enum: ['high', 'medium', 'low'] },
        score: { type: 'number' }, reason: { type: 'string' } } },
    tier: { type: 'string', enum: ['oracle-settled', 'council-decided', 'yours-to-close'] },
    split: { type: 'string' },
    dissent: {
      type: 'object', additionalProperties: false, required: ['position', 'who', 'whatWouldFlipIt'],
      properties: { position: { type: 'string' }, who: { type: 'string' }, whatWouldFlipIt: { type: 'string' } } },
    honestyHawkVeto: {
      type: 'object', additionalProperties: false, required: ['fired'],
      properties: { fired: { type: 'boolean' }, falseBelief: { type: 'string' } } },
    hardStop: {
      type: 'object', additionalProperties: false, required: ['is'],
      properties: { is: { type: 'boolean' }, reason: { type: 'string' } } },
    action: { type: 'string', enum: ['execute', 'surface'] },
    digestLine: { type: 'string' },
  },
}

const J = (o) => JSON.stringify(o, null, 2)

// ---- Phase 1: Dossier (grounding + triage) -----------------------------------
phase('Dossier')
const dossier = await agent(
  CHARTERS.clerk + '\n\n## THE ISSUE\n' + issue + '\n\n## CONTEXT FROM THE CALLER\n' + context +
  '\n\nRead the real artifacts and produce the dossier now.',
  { label: 'clerk', phase: 'Dossier', schema: DOSSIER_SCHEMA },
)

// Triage short-circuit: if an oracle/locked-decision already settles it, stop — no debate.
if (dossier && dossier.oracleSettled && dossier.oracleSettled.settled) {
  log('Clerk triage: oracle-settled — ' + (dossier.oracleSettled.answer || '(see basis)'))
  return {
    issue,
    recommendation: dossier.oracleSettled.answer || '(see basis)',
    rationale: dossier.oracleSettled.basis || 'Settled by an existing test/lint/locked-decision.',
    confidence: { level: 'high', score: 9, reason: 'Already settled by an existing oracle/locked decision — no judgment call.' },
    tier: 'oracle-settled',
    dissent: { position: 'none', who: 'none', whatWouldFlipIt: 'a change to the underlying gate/decision' },
    honestyHawkVeto: { fired: false },
    hardStop: { is: false },
    action: 'execute',
    digestLine: '[oracle-settled] ' + issue + ' -> ' + (dossier.oracleSettled.answer || 'follow existing gate/decision'),
    dossier,
  }
}

// ATTESTATION-BY-PROVENANCE GATE (the council's own self-hardening recommendation):
// if the clerk cannot attest the dossier is grounded — and it is not a legitimately
// novel/sparse case — refuse rather than debate over ungrounded ground. Gates on the
// clerk's PROVENANCE attestation, never on array lengths (an empty fact list can be
// legitimate for a novel issue), so it does not reincarnate the proxy-guard trap.
if (dossier && dossier.grounding && dossier.grounding.grounded === false) {
  log('Clerk could not ground the dossier — refusing to convene. ' + (dossier.grounding.note || ''))
  return {
    issue,
    recommendation: 'BLOCKER: the clerk could not ground this issue (' + (dossier.grounding.note || 'no provenance') + '). Re-dispatch with a concrete, intelligible issue plus any context that lets the clerk read real artifacts — do not debate over ungrounded ground.',
    rationale: 'Attestation-by-provenance gate fired: the clerk attested grounded=false. A confidence-graded verdict over an ungrounded dossier is the calm-but-wrong artifact this council exists to prevent.',
    confidence: { level: 'high', score: 9, reason: 'The clerk, which reads the real artifacts, attested it could not ground the issue.' },
    tier: 'yours-to-close',
    dissent: { position: 'none', who: 'none', whatWouldFlipIt: 'a grounded re-dispatch' },
    honestyHawkVeto: { fired: true, falseBelief: 'That the council deliberated a grounded decision when the clerk attested it could not be grounded.' },
    hardStop: { is: false },
    action: 'surface',
    digestLine: '[blocked: ungrounded] ' + issue + ' -> ' + (dossier.grounding.note || 'clerk could not ground'),
    dossier,
  }
}

// ---- Phase 2: Independent opening positions (parallel, blind to each other) ---
phase('Opening')
const positions = (await parallel(openers.map(o => () =>
  agent(
    o.charter + '\n\n## THE ISSUE\n' + issue + '\n\n## CONTEXT\n' + context +
    '\n\n## SHARED DOSSIER — cite this, not memory\n' + J(dossier) +
    '\n\nTake your position now. Ground every claim in the dossier.',
    { label: o.id, phase: 'Opening', schema: POSITION_SCHEMA },
  ).then(p => (p ? { ...p, elder: o.id } : null)),
))).filter(Boolean)

// ---- Phase 3: Red team refutes the emerging consensus ------------------------
phase('Red Team')
const attack = await agent(
  CHARTERS.redTeam + '\n\n## THE ISSUE\n' + issue + '\n\n## SHARED DOSSIER\n' + J(dossier) +
  '\n\n## THE ELDERS POSITIONS\n' + J(positions) +
  '\n\nRefute the emerging consensus. Attack the most confident claim hardest. Ground every attack in the dossier.',
  { label: 'red-team', phase: 'Red Team', schema: REDTEAM_SCHEMA },
)

// ---- Phase 4: Rebuttal — the actual debate (full councils only) --------------
let rebuttals = []
if (weight === 'full') {
  phase('Rebuttal')
  rebuttals = (await parallel(openers.map(o => () => {
    const mine = positions.find(p => p.elder === o.id)
    return agent(
      o.charter + '\n\n## THE ISSUE\n' + issue + '\n\n## YOUR OPENING POSITION\n' + J(mine) +
      '\n\n## THE OTHER ELDERS POSITIONS\n' + J(positions.filter(p => p.elder !== o.id)) +
      '\n\n## THE RED TEAM ATTACK\n' + J(attack) +
      '\n\nNow debate. Concede what is genuinely right, hold what you still believe (and say why), and sharpen your recommendation. Be willing to change your mind — or explain exactly why you do not.',
      { label: 'rebut:' + o.id, phase: 'Rebuttal', schema: REBUTTAL_SCHEMA },
    ).then(r => (r ? { ...r, elder: o.id } : null))
  }))).filter(Boolean)
}

// ---- Phase 5: Chair synthesis -----------------------------------------------
phase('Synthesis')
const verdict = await agent(
  CHARTERS.chair + '\n\n## THE ISSUE\n' + issue + '\n\n## CONTEXT\n' + context +
  '\n\n## SHARED DOSSIER\n' + J(dossier) +
  '\n\n## OPENING POSITIONS\n' + J(positions) +
  '\n\n## RED TEAM ATTACK\n' + J(attack) +
  '\n\n## REBUTTAL ROUND\n' + J(rebuttals) +
  '\n\nWeigh the whole debate and produce THE verdict now. Remember: the Honesty Hawk veto outranks any majority; preserve the strongest dissent; grade confidence with a reason; classify the tier (split it if needed); flag hard-stops.',
  { label: 'chair', phase: 'Synthesis', schema: VERDICT_SCHEMA },
)

return { ...verdict, issue, dossier, positions, attack, rebuttals }

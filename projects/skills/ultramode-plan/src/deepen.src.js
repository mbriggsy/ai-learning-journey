export const meta = {
  name: 'ultramode-plan-deepen',
  description: 'ultramode-plan deepen stage: the premise seat and the scorer, the premise gate, then research and verified amendments for the selected sections (KTD5)',
  whenToUse: 'Launched by the ultramode-plan skill from a copy lib/inputs.mjs bakes its args into; never by hand.',
  phases: [
    { title: 'Score', detail: 'the premise seat and the scorer read the whole plan, in parallel' },
    { title: 'Premise', detail: 'severity-scaled verifiers vote on each premise finding' },
    { title: 'Research', detail: '1 to 3 helpers per selected section, at most 8' },
    { title: 'Verify', detail: 'severity-scaled verifiers vote on each amendment' },
  ],
}

// @inline vote-law select caps prompts reads

// THE DEEPEN WORKFLOW (KTD5, KTD7, KTD8 and U5 of docs/plans/hybrid-plan-step-plan.md). On the staged
// plan the main loop wrote:
//   1. Score: the premise seat and the scorer read the whole plan in pages, in parallel. Each read is
//      checked against KTD7 (reads.mjs) and re-run once inside this run when it came back short (a
//      resume would replay the cached short read). The scorer also gets one re-run after a crash; a
//      scorer that dies twice, or reads short twice, ends the deepen "blocked", never "passed". A
//      premise seat that reads short twice is a coverage hole naming the sections it never confirmed.
//   2. Premise: once both return, each premise finding goes to severity-scaled verifiers (vote-law.mjs).
//      A confirmed finding whose real-voters put it at P0 or P1 (severityLine "above", KTD5's As-built
//      note, R4-26) ends the deepen: it comes back with its votes and the scores, and no research
//      helper starts. One they put lower or split on ("below", "both"), and a hand-verify one, come
//      back in the summary beside the confirmed ids for the main loop to fold like an amendment
//      (R4-31), never in a finder's prompt.
//   3. Selection (select.mjs) on the scores: none at 2 points is "passed"; otherwise each selected
//      section gets 1 to 3 research helpers by its kind (CE's deepening-workflow.md 5.3.4, made
//      deterministic below), at most 8 in all, dealt one per section per round in selection order.
//   4. Research, then Verify, with no barrier between them: each helper's amendments go to their
//      verifiers as soon as it returns, 3 for a P1 and 2 for a P2.
// The main loop folds what comes back (KTD9); this run edits nothing.
//
// A park's relaunch (KTD11) passes skipPremise, and the parked run's scorer result as `scores` when
// its saved result was readable: the run then starts at selection, on the scores the park was read
// against. With skipPremise and no scores, the scorer runs again. It also passes the parked run's
// carried premise findings as `carried` (its premise ledger's entries that summary.premise.carried
// names), which come back as this run's own premise ledger, so the relaunch's fold, which reads only
// its own launch's result, folds them (R4-31; U5's review: a park advances before any fold).
//
// Args (refused, naming each problem, before any helper starts):
//   plan, project        the staged plan and the project's root (absolute)
//   request, brief       what was asked for, and the brief's path (null only on an update run)
//   update               whether this run updates a committed plan; then `lands` (the named path) and
//                        `goalMoves` (the confirmed findings a send-back answered, each worded without
//                        its stakes; an empty list when none) are required, and on a new plan refused
//   claudeMd, contractBrief, ce, learnings   as research takes them
//   index, lastLine      flow.mjs index's section index and last line with text (KTD7)
//   deepened             whether the plan already carries a deepened: date (flow.mjs index's deepened)
//   focus                optional: the external researchers' focus, passed only when research's
//                        external call ran
//   skipPremise, parked, scores, carried   optional: a park's relaunch
//   dry                  optional: one helper per phase (the scorer, one research helper, one verifier),
//                        no premise seat and no re-run
// Every helper runs on Opus at xhigh (KTD13). A dead helper is an abstention: a coverage hole
// ({ seat, missed }; the main loop adds the resume count, KTD8) or a missing vote, never a clean read.
// The return leads with its summary (KTD12); the ledger follows, each verdict beside its raw votes.

const DEEPEN_EXTERNAL = ['best-practices-researcher', 'framework-docs-researcher', 'web-researcher']
const DEEPEN_ARCH = 'architecture, patterns'

// CE's deepening-workflow.md 5.3.4 section-to-agent mapping, by the scorer's section kind (caps.mjs
// SECTION_KINDS), each entry [agent, scope]. CE's own conditions are read from what the run holds:
// the agent-native strategist joins a decision, design, unit, verification or system-impact section
// whose scorer note names agent work; a risk specialist joins a system-impact, risk or operations
// section by the plan's risk signals (security or privacy: security-sentinel; data-migration:
// data-integrity-guardian) or a note naming performance (performance-oracle); a risk or operations
// section none of them fits gets architecture-strategist. Verification takes CE's "Implementation
// Units / Verification" entry; our other three kinds, which CE never maps (goal-problem, assumptions,
// done), get repo research with learnings, or with spec-flow for Definition of Done. Each section
// keeps its first three.
const DEEPEN_BASE = {
  'requirements': [['spec-flow-analyzer'], ['repo-research-analyst', DEEPEN_ARCH]],
  'open-questions': [['spec-flow-analyzer'], ['repo-research-analyst', DEEPEN_ARCH]],
  'context-research': [['learnings-researcher'], ['framework-docs-researcher'], ['best-practices-researcher']],
  'key-decisions': [['architecture-strategist'], ['best-practices-researcher']],
  'design': [['architecture-strategist'], ['repo-research-analyst', DEEPEN_ARCH]],
  'units': [['repo-research-analyst', 'patterns'], ['pattern-recognition-specialist']],
  'verification': [['repo-research-analyst', 'patterns'], ['pattern-recognition-specialist']],
  'system-impact': [['architecture-strategist']],
  'risks': [],
  'docs-ops': [],
  'goal-problem': [['repo-research-analyst', 'patterns'], ['learnings-researcher']],
  'assumptions': [['repo-research-analyst', 'patterns'], ['learnings-researcher']],
  'done': [['repo-research-analyst', 'patterns'], ['spec-flow-analyzer']],
  'other': [['repo-research-analyst', DEEPEN_ARCH]],
}
const DEEPEN_NATIVE_KINDS = ['key-decisions', 'design', 'units', 'verification', 'system-impact']
const DEEPEN_RISK_KINDS = ['system-impact', 'risks', 'docs-ops']
const DEEPEN_NATIVE_WORDS = /\b(agents?|subagents?|prompts?|tools?|mcp|workflows?|automation|skills?|parity)\b/i
const DEEPEN_PERF_WORDS = /\b(performance|latency|throughput|scal(?:e|es|ing|ability)|capacity)\b/i
const DEEPEN_PER_SECTION = 3
const DEEPEN_TOTAL = 8

function deepenAgentsFor(kind, note, risk) {
  const out = [...(DEEPEN_BASE[kind] ?? DEEPEN_BASE.other)]
  if (DEEPEN_NATIVE_KINDS.includes(kind) && DEEPEN_NATIVE_WORDS.test(note)) out.push(['agent-native-planning-strategist'])
  if (DEEPEN_RISK_KINDS.includes(kind)) {
    if (risk.includes('security') || risk.includes('privacy')) out.push(['security-sentinel'])
    if (risk.includes('data-migration')) out.push(['data-integrity-guardian'])
    if (DEEPEN_PERF_WORDS.test(note)) out.push(['performance-oracle'])
    if (out.length === 0) out.push(['architecture-strategist'])
  }
  const seen = new Set()
  return out.filter(([a]) => !seen.has(a) && seen.add(a)).slice(0, DEEPEN_PER_SECTION)
}

const textList = (v) => (Array.isArray(v) && v.every((m) => typeof m === 'string' && m.trim()) ? null : 'a list of non-empty text (an empty list when none)')
// A carried premise finding as this script returns it in `premise` (run-record.mjs's PREMISE_ID is
// the id form a fold of carried findings alone may land under "passed").
const deepenIsCarried = (p) => Boolean(p) && typeof p === 'object' && !Array.isArray(p) &&
  /^premise-[1-9][0-9]*$/.test(p.id) && Boolean(p.finding) && typeof p.finding === 'object' && Array.isArray(p.votes) &&
  Boolean(p.verdict) && ((p.verdict.status === 'confirmed' && ['below', 'both'].includes(p.line)) || p.verdict.status === 'hand-verify')
// A launch's args are baked into its copy of this script as LAUNCH_ARGS (lib/inputs.mjs), so the
// main loop launches it by its path alone; a copy with none baked in reads the args it is passed.
const A = readsArgs(typeof LAUNCH_ARGS === 'undefined' ? args : LAUNCH_ARGS, {
  who: 'deepen',
  required: {
    plan: 'path',
    project: 'path',
    request: 'text',
    brief: 'path?',
    update: 'bool',
    claudeMd: (v) => (Array.isArray(v) && v.every(readsIsPath) ? null : "the project's CLAUDE.md paths, a list of absolute paths (an empty list when it has none)"),
    contractBrief: 'text',
    ce: readsCeProblem,
    index: readsIndexProblem,
    lastLine: readsLastProblem,
    deepened: 'bool',
    learnings: (v) => (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && readsIsPath(v.insights) && readsIsPath(v.memory) ? null : 'the lesson roots { insights, memory }, each an absolute path'),
  },
  optional: {
    lands: 'path',
    goalMoves: textList,
    focus: 'text',
    skipPremise: 'bool',
    parked: 'bool',
    scores: (v) => (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.sections) && PLAN_DEPTHS.includes(v.depth) && Array.isArray(v.risk_signals)
      ? null
      : "the parked deepen's scorer result { sections, depth, risk_signals, notes }, from its saved result"),
    carried: (v) => (Array.isArray(v) && v.every(deepenIsCarried) && new Set(v.map((p) => p.id)).size === v.length
      ? null
      : "the parked deepen's carried premise findings, its premise ledger's entries { id: premise-N, finding, verdict, votes, line } that the vote law confirmed below or across the P1 line, or left for hand-verify; each id once"),
    dry: 'bool',
  },
})
const crossed = []
if (A.update) {
  if (A.lands === undefined) crossed.push("args.lands is required on an update run (the plan's named path)")
  if (A.goalMoves === undefined) crossed.push('args.goalMoves is required on an update run (an empty list when none)')
} else {
  if (A.brief === null) crossed.push('args.brief is null only on an update run')
  if (A.lands !== undefined) crossed.push('args.lands is for an update run only')
  if (A.goalMoves !== undefined && A.goalMoves.length) crossed.push('args.goalMoves is for an update run only')
}
if (A.scores !== undefined && A.skipPremise !== true) crossed.push("args.scores comes only with skipPremise (a park's relaunch)")
if (A.carried !== undefined && A.skipPremise !== true) crossed.push("args.carried comes only with skipPremise (a park's relaunch)")
if (crossed.length) throw new Error(`deepen: ${crossed.join('; ')}`)
// Every heading sits at or before the last line (readsSections throws, naming the one past it).
readsSections(A.index, A.lastLine.line)

const DRY = A.dry === true
const ctx = {
  plan: A.plan, project: A.project, request: A.request, brief: A.brief, update: A.update,
  claudeMd: A.claudeMd, contractBrief: A.contractBrief, laws: SIZE_LAWS, lastLine: A.lastLine,
  ...(A.update ? { lands: A.lands, goalMoves: A.goalMoves } : {}),
}
const GATE = { last: A.lastLine, index: A.index, page: PROMPT_PAGE, floor: PROMPT_QUOTE_FLOOR }
const headingAt = new Map(readsSections(A.index, A.lastLine.line).map((s) => [s.line, s.heading]))
const range = (n) => Array.from({ length: n }, (_, i) => i)
const sectionsNamed = (list) => list.map((s) => `"${s.heading}" (line ${s.line})`).join(', ')
const call = (built, label, phaseName) =>
  agent(built.prompt, { label, phase: phaseName, schema: SCHEMAS[built.schema], model: 'opus', effort: 'xhigh' })

// Every prompt known before the first helper starts is built first, so a builder's refusal stops the
// run with nothing spent.
const runPremise = A.skipPremise !== true && !DRY
const premiseBuilt = runPremise ? promptPremise(ctx, { mode: 'deepen' }) : null
const scorerBuilt = A.scores === undefined
  ? promptScorer(ctx, { deepening: readsCeFile(A.ce, 'deepening-workflow'), finalReview: readsCeFile(A.ce, 'final-review'), index: A.index, deepened: A.deepened })
  : null

const selectOf = (s) => selectSections({ scores: s.sections, index: A.index, depth: s.depth, riskSignals: s.risk_signals, deepened: A.deepened })
const notesOf = (s, sel) => (sel.result === 'deepen' ? readsNotes({ selected: sel.sections, notes: s.notes, index: A.index }) : null)
const shortWords = (check, notes) => [...(check.ok ? [] : check.problems), ...(notes && notes.noNote.length ? [`no note on ${sectionsNamed(notes.noNote)}`] : [])].join('; ')

// The premise seat's read, with its one re-run: { answer, hole, reran }.
async function premiseRead() {
  const first = await call(premiseBuilt, 'deepen:premise', 'Score')
  if (first === null) return { answer: null, hole: { seat: 'premise', missed: "the plan's premise: the seat never answered" }, reran: false }
  const c1 = readsInventory(first, { ...GATE, endsAt: premiseBuilt.endsAt })
  if (c1.ok) return { answer: first, hole: null, reran: false }
  const again = await call(promptShortRead(premiseBuilt, readsRerun(c1)), 'deepen:premise (re-run)', 'Score')
  const c2 = again === null ? null : readsInventory(again, { ...GATE, endsAt: premiseBuilt.endsAt })
  if (c2 && c2.ok) return { answer: again, hole: null, reran: true }
  const missed = (c2 ?? c1).missed
  return { answer: again ?? first, hole: { seat: 'premise', missed: `the premise in the sections it never confirmed reading, after its re-run${again === null ? ' died' : ' read short again'}: ${sectionsNamed(missed)}` }, reran: true }
}

// The scorer's read, with one re-run after a crash and one after a short read: { answer, sel, notes }
// or { blocked }.
async function scorerRead() {
  if (A.scores !== undefined) {
    const sel = selectOf(A.scores)
    const notes = notesOf(A.scores, sel)
    if (notes && notes.noNote.length) return { blocked: `the recorded scores leave ${sectionsNamed(notes.noNote)} with no note, and a recorded result cannot be re-run` }
    return { answer: A.scores, sel, notes, recorded: true }
  }
  let first = await call(scorerBuilt, 'deepen:scorer', 'Score')
  if (first === null && !DRY) first = await call(scorerBuilt, 'deepen:scorer (after a crash)', 'Score')
  if (first === null) return { blocked: DRY ? 'the scorer died, and a dry run re-runs nothing' : 'the scorer died twice' }
  const c1 = readsInventory(first, { ...GATE, endsAt: scorerBuilt.endsAt })
  const s1 = selectOf(first)
  const n1 = notesOf(first, s1)
  const rerun = readsRerun(c1, n1)
  if (rerun === null) return { answer: first, sel: s1, notes: n1 }
  if (DRY) return { blocked: `the scorer's read came back short (${shortWords(c1, n1)}), and a dry run re-runs nothing` }
  const again = await call(promptShortRead(scorerBuilt, rerun), 'deepen:scorer (re-run)', 'Score')
  if (again === null) return { blocked: "the scorer's re-run of its short read died" }
  const c2 = readsInventory(again, { ...GATE, endsAt: scorerBuilt.endsAt })
  const s2 = selectOf(again)
  const n2 = notesOf(again, s2)
  if (readsRerun(c2, n2) !== null) return { blocked: `the scorer's read came back short twice: ${shortWords(c2, n2)}` }
  return { answer: again, sel: s2, notes: n2 }
}

// One item's verifiers, each prompt built before any of them starts, then the vote law: the verdict
// beside its raw votes (KTD24 reads them).
async function verified(item, kind, severity, labelOf, phaseName, section = {}) {
  const n = DRY ? 1 : refuterCount(severity)
  const builts = range(n).map((angle) => promptVerifier(ctx, { item, kind, angle, ...section }))
  const votes = await parallel(builts.map((b, angle) => () => call(b, labelOf(angle), phaseName)))
  return { verdict: judge(votes, severity), votes, line: severityLine(votes.filter(Boolean).filter((v) => v.real)) }
}

phase('Score')
log(`deepen: ${runPremise ? 'the premise seat and ' : ''}${A.scores === undefined ? 'the scorer' : 'the recorded scores'}${DRY ? ' (dry: one helper per phase)' : ''}`)
const [P, S] = await parallel([() => (runPremise ? premiseRead() : { answer: null, hole: null, reran: false, skipped: true }), () => scorerRead()])
// The reads handle a dead helper themselves, so a null here is this script's own error, which the
// runtime would otherwise pass off as a dead helper.
if (P === null || S === null) throw new Error('deepen: a script error in the Score phase (the runtime hid it as a null)')

const holes = P.hole ? [P.hole] : []
// A park's relaunch starts its premise ledger with the parked run's carried findings (no premise seat
// runs here, so they are the whole of it); any other run fills it from its own premise seat below.
const premise = A.carried !== undefined ? A.carried.map((p) => ({ ...p })) : []
const findings = P.answer?.findings ?? []
if (findings.length) {
  phase('Premise')
  const out = await parallel(findings.map((f, i) => async () => ({ id: `premise-${i + 1}`, finding: f, ...(await verified(f, 'finding', f.severity, (angle) => `deepen:premise-${i + 1} verifier ${angle + 1}`, 'Premise')) })))
  if (out.some((x) => x === null)) throw new Error('deepen: a script error in the Premise phase (the runtime hid it as a null)')
  premise.push(...out)
}
const above = premise.filter((p) => p.verdict.status === 'confirmed' && p.line === 'above')
const carried = premise.filter((p) => (p.verdict.status === 'confirmed' && p.line !== 'above') || p.verdict.status === 'hand-verify')
const premiseSummary = {
  ran: runPremise,
  reran: P.reran,
  findings: premise.length,
  above: above.map((p) => p.id),
  carried: carried.map((p) => ({ id: p.id, status: p.verdict.status, line: p.line })),
  // On an update, read fail-closed: a goal the seat left unjudged, or a seat that never answered, is
  // false, and the main loop turns it into a premise coverage hole (R4-30).
  goalJudged: runPremise && A.update ? P.answer?.goal_judged === true : null,
}

const scorer = S.blocked ? null : S.answer
const sel = S.blocked ? null : S.sel
let outcome
let reason
if (above.length) {
  outcome = 'premise'
  reason = `${above.length} confirmed premise finding${above.length === 1 ? '' : 's'} its real-voters put at P0 or P1 (${above.map((p) => p.id).join(', ')}): the deepen ends before research (KTD5)`
} else if (S.blocked) {
  outcome = 'blocked'
  reason = S.blocked
} else if (sel.result !== 'deepen') {
  outcome = sel.result
  reason = sel.reason
}

const helpers = []
const amendments = []
const research = []
if (outcome === undefined) {
  const noteAt = new Map(S.notes.noted.map((n) => [n.line, n.triggers]))
  const risk = scorer.risk_signals
  const sections = sel.sections.map((row) => ({ line: row.line, heading: headingAt.get(row.line) ?? row.section, points: row.points, triggers: noteAt.get(row.line), agents: deepenAgentsFor(row.kind, noteAt.get(row.line), risk) }))
  const dealt = []
  for (let k = 0; k < DEEPEN_PER_SECTION && dealt.length < DEEPEN_TOTAL; k++) {
    sections.forEach((s, si) => {
      if (s.agents[k] && dealt.length < DEEPEN_TOTAL) dealt.push({ si, k, section: s, agent: s.agents[k][0], scope: s.agents[k][1] ?? null })
    })
  }
  dealt.sort((a, b) => a.si - b.si || a.k - b.k)
  helpers.push(...(DRY ? dealt.slice(0, 1) : dealt))
  for (const h of helpers) {
    h.built = promptAmendment(ctx, {
      agent: h.agent,
      agentFile: readsCeFile(A.ce, h.agent),
      scope: h.scope,
      line: h.section.line,
      index: A.index,
      triggers: h.section.triggers,
      depth: scorer.depth,
      risk,
      learnings: h.agent === 'learnings-researcher' ? A.learnings : null,
      focus: DEEPEN_EXTERNAL.includes(h.agent) && A.focus !== undefined ? A.focus : null,
    })
  }
  phase('Research')
  log(`deepen: ${sections.length} section${sections.length === 1 ? '' : 's'} selected, ${helpers.length} research helper${helpers.length === 1 ? '' : 's'}`)
  const done = await pipeline(
    helpers,
    async (h) => ({ h, answer: await call(h.built, `deepen:${h.agent}@${h.section.line}`, 'Research') }),
    async ({ h, answer }) => {
      if (answer === null) return { h, answer, checked: [] }
      const list = DRY ? answer.amendments.slice(0, 1) : answer.amendments
      const checked = await parallel(list.map((a, j) => async () => ({ amendment: a, ...(await verified(a, 'amendment', a.severity, (angle) => `deepen:verify ${h.agent}@${h.section.line} #${j + 1} angle ${angle + 1}`, 'Verify', { line: h.section.line, index: A.index, triggers: h.section.triggers })) })))
      if (checked.some((x) => x === null)) throw new Error('deepen: a script error in the Verify phase')
      return { h, answer, checked }
    },
  )
  if (done.some((x) => x === null)) throw new Error('deepen: a script error in the Research or Verify phase (the runtime hid it as a null)')
  for (const { h, answer, checked } of done) {
    const where = `"${h.section.heading}" (line ${h.section.line})`
    if (answer === null) holes.push({ seat: h.agent, missed: `its research on ${where}: the helper never answered` })
    else if (DEEPEN_EXTERNAL.includes(h.agent) && answer.outside_ran !== true) holes.push({ seat: h.agent, missed: `outside research on ${where}: it did not report a web search that ran with every cited page fetched` })
    research.push({ agent: h.agent, section: { line: h.section.line, heading: h.section.heading }, answered: answer !== null, outside_ran: answer?.outside_ran ?? null, overflow: answer?.overflow ?? [] })
    for (const c of checked) amendments.push({ id: `A${amendments.length + 1}`, section: { line: h.section.line, heading: h.section.heading }, agent: h.agent, amendment: c.amendment, verdict: c.verdict, votes: c.votes })
  }
  outcome = 'deepen'
  // Counted against what was asked, never what came back (insight 013): a dead helper's section was
  // dealt but not researched, and a dry run deals one helper of the many a real run would.
  const answered = research.filter((r) => r.answered).length
  reason = `${sections.length} section${sections.length === 1 ? '' : 's'} selected; ${answered} of ${helpers.length} research helper${helpers.length === 1 ? '' : 's'} answered${DRY ? ` (dry: ${helpers.length} of the ${dealt.length} dealt)` : ''}; ${amendments.length} amendment${amendments.length === 1 ? '' : 's'} verified`
}

const idsOf = (status) => amendments.filter((a) => a.verdict.status === status).map((a) => a.id)
return {
  summary: {
    stage: 'deepen',
    outcome,
    reason,
    dry: DRY,
    skipPremise: A.skipPremise === true,
    parked: A.parked === true,
    premise: premiseSummary,
    // A premise outcome outranks a blocked scorer, so the scorer's end is named here beside it (a
    // park relaunched on no scores runs the scorer again); null when the scorer answered.
    scorerBlocked: S.blocked ?? null,
    depth: scorer?.depth ?? null,
    risk: scorer?.risk_signals ?? null,
    selected: sel?.result === 'deepen' ? sel.sections.map((r) => ({ line: r.line, heading: headingAt.get(r.line) ?? r.section, points: r.points })) : [],
    helpers: { asked: helpers.length, answered: research.filter((r) => r.answered).length },
    amendments: { confirmed: idsOf('confirmed'), handVerify: idsOf('hand-verify'), advisory: idsOf('advisory'), rejected: idsOf('rejected') },
    holes,
  },
  premise,
  premiseResidual: P.answer?.residual_risks ?? [],
  scorer,
  selection: sel,
  research,
  amendments,
}

export const meta = {
  name: 'ultramode-plan-check',
  description: 'ultramode-plan check stage: every seat reads the whole plan, every finding goes to severity-scaled verifiers (KTD6 to KTD9)',
  whenToUse: 'Launched by the ultramode-plan skill with args its run record builds; never by hand.',
  phases: [
    { title: 'Check', detail: 'every seat in the roster reads the whole plan, re-run once when its read is short' },
    { title: 'Verify', detail: 'severity-scaled verifiers vote on each finding as soon as its seat returns' },
  ],
}

// @inline vote-law caps prompts reads

// THE CHECK WORKFLOW (KTD6, KTD7, KTD8, KTD9 and U5 of docs/plans/hybrid-plan-step-plan.md).
//   Round 1 builds its roster from args: coherence, feasibility, scope-guardian and the adversary
//   always (the single adversary, or the high-risk panel's four angles when the scorer's recorded
//   profile is high-risk), the lenses the main loop picked (product, security, design), and our four
//   seats (premise, reach, blast-radius, test-vacuity), reach and test-vacuity skipped together with
//   their logged reason on a plan with no code (KTD6).
//   Rounds 2 and 3 run exactly the seats args name (flow.mjs roundSeats: coherence and every seat a
//   change touched) with the fold's changes, each { id, kind, classes, text } and an edit with its
//   was, which the main loop builds from the record (R4-25, R4-28).
// Every seat gets the same roster, in one order. Each read is checked against KTD7 and re-run once
// inside this run when short; a second short read keeps the seat's findings and is a coverage hole
// naming the sections it never confirmed. A dead seat is a coverage hole, never "no findings". Each
// seat's findings go to severity-scaled verifiers as soon as it returns (3 for a P0 or P1, 2 for a
// P2, 1 for a P3), the verdict kept beside the raw votes (KTD24).
// What counts as an open P0 or P1 is the voted severity, failing closed: a confirmed finding counts
// when its real-voters put it at P0 or P1, or split on that line (severityLine "above" or "both"); a
// claimed P0 or P1 they put lower does not. The claimed count comes back beside it.
//
// Args (refused, naming each problem, before any helper starts):
//   plan, project, request, brief, update, lands, goalMoves, claudeMd, contractBrief, ce, index,
//   lastLine            as the deepen takes them
//   round               1, 2 or 3
//   highRisk, lenses, noCode   round 1 only: the scorer's recorded high-risk flag, the lens picks
//                       (each product, security or design), and null or the reason the plan has no code
//   seats, changes      rounds 2 and 3 only: the seats to run and the fold's changes
//   dry                 optional: one helper per phase (the first seat, one verifier), no re-run
// Every helper runs on Opus at xhigh (KTD13). The return leads with its summary (KTD12).

const CHECK_LENSES = ['product', 'security', 'design']
const CHECK_PANEL = ['adv-sequencing', 'adv-settled', 'adv-hidden-work', 'adv-verification']
const CHECK_CLASSES = ['premise', 'reach', 'blast-radius', 'test-vacuity']
const CHECK_SKIPPABLE = ['reach', 'test-vacuity']
const CHECK_SEATS = [...Object.keys(PROMPT_CHECK_SEATS), 'premise']

const textList = (v) => (Array.isArray(v) && v.every((m) => typeof m === 'string' && m.trim()) ? null : 'a list of non-empty text (an empty list when none)')
const changeList = (v) => (Array.isArray(v) && v.length > 0 && v.every((c) => c && typeof c === 'object' && typeof c.id === 'string' && c.id.trim() && ['edit', 'add', 'delete'].includes(c.kind) && Array.isArray(c.classes) && typeof c.text === 'string' && c.text.trim() && (c.kind === 'edit' ? typeof c.was === 'string' && c.was.trim() : c.was === undefined))
  ? null
  : "the fold's changes, a non-empty list of { id, kind, classes, text }, an edit with its was (the text it replaced), no other kind with one")
const A = readsArgs(args, {
  who: 'check',
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
    round: (v) => ([1, 2, 3].includes(v) ? null : 'the check round, 1, 2 or 3'),
  },
  optional: {
    lands: 'path',
    goalMoves: textList,
    highRisk: 'bool',
    lenses: (v) => (Array.isArray(v) && v.every((l) => CHECK_LENSES.includes(l)) && new Set(v).size === v.length ? null : `the lens picks, each one of ${CHECK_LENSES.join(', ')}, none twice`),
    noCode: 'text?',
    seats: (v) => (Array.isArray(v) && v.length > 0 && v.every((s) => CHECK_SEATS.includes(s)) && new Set(v).size === v.length ? null : `the seats this round runs, each one of ${CHECK_SEATS.join(', ')}, none twice`),
    changes: changeList,
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
if (A.round === 1) {
  for (const k of ['highRisk', 'lenses', 'noCode']) if (A[k] === undefined) crossed.push(`args.${k} is required in round 1`)
  for (const k of ['seats', 'changes']) if (A[k] !== undefined) crossed.push(`args.${k} is for rounds 2 and 3 only`)
} else {
  for (const k of ['seats', 'changes']) if (A[k] === undefined) crossed.push(`args.${k} is required in round ${A.round}`)
  for (const k of ['highRisk', 'lenses', 'noCode']) if (A[k] !== undefined) crossed.push(`args.${k} is for round 1 only`)
  if (A.seats !== undefined && !A.seats.includes('coherence')) crossed.push('args.seats has no coherence seat, which every round re-runs (KTD9)')
  if (A.seats !== undefined && A.seats.includes('adversarial') && A.seats.some((s) => CHECK_PANEL.includes(s))) crossed.push('args.seats runs the single adversary and the panel together (KTD6)')
}
if (crossed.length) throw new Error(`check: ${crossed.join('; ')}`)
readsSections(A.index, A.lastLine.line)

const DRY = A.dry === true
const ctx = {
  plan: A.plan, project: A.project, request: A.request, brief: A.brief, update: A.update,
  claudeMd: A.claudeMd, contractBrief: A.contractBrief, laws: SIZE_LAWS, lastLine: A.lastLine,
  ...(A.update ? { lands: A.lands, goalMoves: A.goalMoves } : {}),
}
const GATE = { last: A.lastLine, index: A.index, page: PROMPT_PAGE, floor: PROMPT_QUOTE_FLOOR }
const range = (n) => Array.from({ length: n }, (_, i) => i)
const sectionsNamed = (list) => list.map((s) => `"${s.heading}" (line ${s.line})`).join(', ')
const call = (built, label, phaseName) =>
  agent(built.prompt, { label, phase: phaseName, schema: SCHEMAS[built.schema], model: 'opus', effort: 'xhigh' })

// The roster: round 1's built from the flags, a later round's exactly as args name it.
const skipped = []
let roster
if (A.round === 1) {
  if (A.noCode !== null) for (const s of CHECK_SKIPPABLE) skipped.push({ seat: s, reason: A.noCode.trim() })
  roster = [
    'coherence', 'feasibility', 'scope-guardian',
    ...(A.highRisk ? CHECK_PANEL : ['adversarial']),
    ...CHECK_LENSES.filter((l) => A.lenses.includes(l)),
    'premise',
    ...['reach', 'blast-radius', 'test-vacuity'].filter((s) => A.noCode === null || !CHECK_SKIPPABLE.includes(s)),
  ]
} else {
  roster = [...A.seats]
}
// A later round's changes as the seats read them: { kind, text }, an edit with its was.
const changes = A.round === 1 ? [] : A.changes.map((c) => (c.kind === 'edit' ? { kind: c.kind, text: c.text, was: c.was } : { kind: c.kind, text: c.text }))

// Every seat's prompt is built before the first helper starts.
const running = DRY ? roster.slice(0, 1) : roster
const seats = running.map((seat) => ({
  seat,
  built: seat === 'premise'
    ? promptPremise(ctx, { mode: 'check', roster, round: A.round, changes })
    : promptCheckSeat(ctx, { seat, ...(PROMPT_CHECK_SEATS[seat].ce === null ? {} : { persona: readsCeFile(A.ce, PROMPT_CHECK_SEATS[seat].ce) }), roster, round: A.round, changes }),
}))

// One seat's read, with its one re-run: { answer, hole, reran }.
async function seatRead(s) {
  const first = await call(s.built, `check:${s.seat}`, 'Check')
  if (first === null) return { answer: null, hole: { seat: s.seat, missed: `its class in round ${A.round}: the seat never answered` }, reran: false }
  const c1 = readsInventory(first, { ...GATE, endsAt: s.built.endsAt })
  if (c1.ok) return { answer: first, hole: null, reran: false }
  if (DRY) return { answer: first, hole: { seat: s.seat, missed: `the sections it never confirmed reading (a dry run re-runs nothing): ${sectionsNamed(c1.missed)}` }, reran: false }
  const again = await call(promptShortRead(s.built, readsRerun(c1)), `check:${s.seat} (re-run)`, 'Check')
  const c2 = again === null ? null : readsInventory(again, { ...GATE, endsAt: s.built.endsAt })
  if (c2 && c2.ok) return { answer: again, hole: null, reran: true }
  return { answer: again ?? first, hole: { seat: s.seat, missed: `the sections it never confirmed reading, after its re-run${again === null ? ' died' : ' read short again'}: ${sectionsNamed((c2 ?? c1).missed)}` }, reran: true }
}

phase('Check')
log(`check round ${A.round}: ${running.length} seat${running.length === 1 ? '' : 's'} (${running.join(', ')})${DRY ? ' (dry: one helper per phase)' : ''}`)
let verifiersLeft = DRY ? 1 : Infinity
const done = await pipeline(
  seats,
  async (s) => ({ s, read: await seatRead(s) }),
  async ({ s, read }) => {
    const found = read.answer?.findings ?? []
    const list = DRY ? found.slice(0, verifiersLeft > 0 ? 1 : 0) : found
    if (DRY) verifiersLeft -= list.length
    const checked = await parallel(list.map((f, i) => async () => {
      const n = DRY ? 1 : refuterCount(f.severity)
      const builts = range(n).map((angle) => promptVerifier(ctx, { item: f, kind: 'finding', angle }))
      const votes = await parallel(builts.map((b, angle) => () => call(b, `check:verify ${s.seat}-${i + 1} angle ${angle + 1}`, 'Verify')))
      return { id: `${s.seat}-${i + 1}`, seat: s.seat, finding: f, verdict: judge(votes, f.severity), votes, line: severityLine(votes.filter(Boolean).filter((v) => v.real)) }
    }))
    if (checked.some((x) => x === null)) throw new Error('check: a script error in the Verify phase')
    return { s, read, checked }
  },
)
// The reads handle a dead helper themselves, so a null here is this script's own error, which the
// runtime would otherwise pass off as a dead helper.
if (done.some((x) => x === null)) throw new Error('check: a script error in the Check or Verify phase (the runtime hid it as a null)')

const holes = []
const findings = []
const perSeat = []
for (const { s, read, checked } of done) {
  if (read.hole) holes.push(read.hole)
  findings.push(...checked)
  perSeat.push({ seat: s.seat, answered: read.answer !== null, reran: read.reran, findings: checked.length, overflow: read.answer?.overflow ?? [], residual: read.answer?.residual_risks ?? [] })
}
const idsOf = (status) => findings.filter((f) => f.verdict.status === status).map((f) => f.id)
const confirmed = findings.filter((f) => f.verdict.status === 'confirmed')
const high = (sev) => sev === 'P0' || sev === 'P1'
// The adversary seats this run dispatched (a dry run dispatches only the first seat, so its roster's
// adversary is not run here, not absent).
const advSeats = running.filter((s) => s === 'adversarial' || CHECK_PANEL.includes(s))
const advDead = advSeats.filter((s) => !perSeat.some((p) => p.seat === s && p.answered))
// Our four classes in the receipt's forms (flow.mjs coverageOf) for this round: a class whose seat
// did not run this round is left out.
const classes = {}
for (const c of CHECK_CLASSES) {
  const sk = skipped.find((x) => x.seat === c)
  if (sk) classes[c] = { skipped: sk.reason }
  else if (!running.includes(c)) continue
  else if (holes.some((h) => h.seat === c)) classes[c] = { hole: true }
  else {
    const ids = confirmed.filter((f) => f.seat === c).map((f) => f.id)
    classes[c] = ids.length ? { verified: ids } : { nothing: true }
  }
}
const premiseSeat = done.find((d) => d.s.seat === 'premise')
return {
  summary: {
    stage: `check-${A.round}`,
    round: A.round,
    dry: DRY,
    roster,
    ran: running,
    skipped,
    // The adversary ran only when every adversary seat in the roster answered; null when none is in
    // this round's roster.
    adversary: advSeats.length ? { ran: advDead.length === 0, absent: advDead } : null,
    findings: findings.length,
    confirmed: idsOf('confirmed'),
    handVerify: idsOf('hand-verify'),
    advisory: idsOf('advisory'),
    rejected: idsOf('rejected'),
    p0p1: confirmed.filter((f) => f.line === 'above' || f.line === 'both').length,
    p0p1Claimed: confirmed.filter((f) => high(f.finding.severity)).length,
    classes,
    // On an update, read fail-closed (R4-30): a goal the premise seat left unjudged, or a premise seat
    // that never answered, is false; null when no premise seat ran or the plan is new.
    goalJudged: A.update && premiseSeat ? premiseSeat.read.answer?.goal_judged === true : null,
    holes,
  },
  seats: perSeat,
  findings,
}

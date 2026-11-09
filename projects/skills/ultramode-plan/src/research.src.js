export const meta = {
  name: 'ultramode-plan-research',
  description: 'ultramode-plan research stage: CE research.md seats each write one dossier and return a gist (KTD4)',
  whenToUse: 'Launched by the ultramode-plan skill with args its run record builds; never by hand.',
  phases: [
    { title: 'Research', detail: 'one Opus xhigh helper per research seat, each writing one dossier' },
    { title: 'Shortlist', detail: 'a mixed external call: the implementation researchers read the landscape scan first' },
  ],
}

// @inline caps prompts reads

// THE RESEARCH WORKFLOW (KTD4 and U5 of docs/plans/hybrid-plan-step-plan.md). Before the plan is
// written, CE's research.md seats each research what its author needs to know, write one dossier
// into the run's job folder, and return a gist; the main loop reads a dossier only when its gist can
// change a decision.
//
// The seats (research.md, read in CE 3.37.0): repo research (scope: patterns) and learnings (the
// project's docs/insights/ and the memory folder, never CE's docs/solutions/) always; the
// agent-native strategist when the main loop's triage calls for it; spec-flow on a Standard or Deep
// plan; and the external researchers only on the main loop's Stage 1-3 call (args.external, which
// only the main loop can make, since only it holds the request and the brief): implementation
// guidance runs best-practices and framework-docs, a landscape scan runs web-researcher, and a mixed
// call runs web-researcher first and then the other two on its shortlist, as research.md orders it.
// Spec-flow runs beside the others, not after them as CE runs it: the prompt builder hands it the
// request and the brief, not the other dossiers.
//
// Args (refused, naming each problem, before any helper starts):
//   project        the project's root (absolute)
//   request        what was asked for
//   brief          the brief's path (research never runs on an update run, so there is always one)
//   claudeMd       the project's CLAUDE.md paths (an empty list when it has none)
//   contractBrief  the contract brief, verbatim from the run record (KTD22)
//   ce             the CE resolution the run record holds for this stage (ce/Cn.json)
//   dossiers       the folder each helper writes its dossier into, as <agent>.md
//   learnings      { insights, memory }: where the learnings researcher searches
//   depth          the main loop's depth for the plan: Lightweight, Standard or Deep
//   agentNative    the main loop's agent-native triage: true runs the strategist
//   external       null, or the external-research call { intent, reason }: intent implementation,
//                  landscape or mixed, and the reason the run record notes, each researcher's focus
//   dry            optional: true runs one helper per phase (the first seat of each)
// Every helper runs on Opus at xhigh (KTD13). A helper that dies is an abstention, named in the
// summary's coverage holes ({ seat, missed }; the main loop adds the resume count, KTD8), never a
// gist that found nothing; so is an external researcher whose gist opens "outside research could not
// run:". The return leads with its summary (KTD12): the counts, the holes and the seats whose gist
// changes a decision; the gists follow, each with the dossier path this run assigned it.

const RESEARCH_INTENTS = ['implementation', 'landscape', 'mixed']
const RESEARCH_IMPLEMENTATION = ['best-practices-researcher', 'framework-docs-researcher']
const RESEARCH_CANNOT = 'outside research could not run:'

const A = readsArgs(args, {
  who: 'research',
  required: {
    project: 'path',
    request: 'text',
    brief: 'path',
    claudeMd: (v) => (Array.isArray(v) && v.every(readsIsPath) ? null : "the project's CLAUDE.md paths, a list of absolute paths (an empty list when it has none)"),
    contractBrief: 'text',
    ce: readsCeProblem,
    dossiers: 'path',
    learnings: (v) => (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && readsIsPath(v.insights) && readsIsPath(v.memory) ? null : 'the lesson roots { insights, memory }, each an absolute path'),
    depth: (v) => (PLAN_DEPTHS.includes(v) ? null : `the main loop's depth for the plan, one of ${PLAN_DEPTHS.join(', ')}`),
    agentNative: 'bool',
    external: (v) => (v === null || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && RESEARCH_INTENTS.includes(v.intent) && typeof v.reason === 'string' && v.reason.trim())
      ? null
      : `null, or the external-research call { intent, reason }, intent one of ${RESEARCH_INTENTS.join(', ')}`),
  },
  optional: { dry: 'bool' },
})

const DRY = A.dry === true
const ctx = { project: A.project, request: A.request, brief: A.brief, update: false, claudeMd: A.claudeMd, contractBrief: A.contractBrief, laws: SIZE_LAWS }
const sep = A.dossiers.includes('\\') && !A.dossiers.includes('/') ? '\\' : '/'
const dossierOf = (agent) => `${A.dossiers.replace(/[\\/]+$/, '')}${sep}${agent}.md`
const ext = A.external

// The seats of each phase, in their order. The Research phase runs together; under a mixed call the
// Shortlist phase waits for the landscape scan alone and takes its gist into each focus.
const researchSeats = [
  { agent: 'repo-research-analyst', scope: 'patterns' },
  { agent: 'learnings-researcher', learnings: A.learnings },
  ...(A.agentNative ? [{ agent: 'agent-native-planning-strategist' }] : []),
  ...(A.depth !== 'Lightweight' ? [{ agent: 'spec-flow-analyzer' }] : []),
  ...(ext === null ? [] : ext.intent === 'implementation' ? RESEARCH_IMPLEMENTATION : ['web-researcher']).map((agent) => ({ agent, focus: ext.reason })),
]
const shortlistSeats = ext !== null && ext.intent === 'mixed' ? RESEARCH_IMPLEMENTATION.map((agent) => ({ agent, focus: ext.reason })) : []
const ran = DRY ? [researchSeats.slice(0, 1), shortlistSeats.slice(0, 1)] : [researchSeats, shortlistSeats]

const buildOf = (seat, focus = seat.focus) => promptResearch(ctx, {
  agent: seat.agent,
  agentFile: readsCeFile(A.ce, seat.agent),
  scope: seat.scope ?? null,
  dossier: dossierOf(seat.agent),
  learnings: seat.learnings ?? null,
  focus: focus ?? null,
})
// Every prompt is built before the first helper starts, so a builder's refusal stops the run with
// nothing spent; a shortlist seat is built again later, with the landscape scan's gist in its focus.
for (const seat of [...ran[0], ...ran[1]]) seat.built = buildOf(seat)

const callOf = (seat, built, phaseName) =>
  agent(built.prompt, { label: `research:${seat.agent}`, phase: phaseName, schema: SCHEMAS[built.schema], model: 'opus', effort: 'xhigh' })
    .then((answer) => ({ seat, answer }))

phase('Research')
log(`research: ${ran[0].length + ran[1].length} helper${ran[0].length + ran[1].length === 1 ? '' : 's'}${ext ? `, outside research ${ext.intent}` : ', no outside research'}${DRY ? ' (dry: one per phase)' : ''}`)
const web = ran[0].find((s) => s.agent === 'web-researcher')
const results = await parallel(ran[0].map((seat) => () => callOf(seat, seat.built, 'Research')))
let shortlist = []
if (ran[1].length) {
  phase('Shortlist')
  // The landscape scan's gist, when it answered, joins the recorded reason as each one's focus.
  const scan = web ? results[ran[0].indexOf(web)]?.answer : null
  const focus = scan ? `${ext.reason.replace(/[.\s]+$/, '')}. The landscape scan's shortlist (web-researcher's gist): ${scan.gist}` : ext.reason
  shortlist = await parallel(ran[1].map((seat) => () => callOf(seat, buildOf(seat, focus), 'Shortlist')))
}

const gists = []
const holes = []
const notes = []
const sameFile = (a, b) => a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase()
const ordered = [...ran[0], ...ran[1]]
const answered = [...results, ...shortlist]
ordered.forEach((seat, i) => {
  const answer = answered[i]?.answer ?? null
  const dossier = dossierOf(seat.agent)
  if (answer === null) {
    holes.push({ seat: seat.agent, missed: 'its research: the helper never answered, so the plan is written without its dossier' })
    return
  }
  const gist = answer.gist.trim()
  if (seat.focus !== undefined && gist.toLowerCase().startsWith(RESEARCH_CANNOT)) {
    holes.push({ seat: seat.agent, missed: `outside research: ${gist.slice(RESEARCH_CANNOT.length).trim() || 'no reason given'}` })
  }
  if (!sameFile(answer.dossier.trim(), dossier)) notes.push(`${seat.agent} reported its dossier at ${answer.dossier.trim()}, not at ${dossier}, the path this run gave it`)
  gists.push({ agent: seat.agent, dossier, gist, changes_a_decision: answer.changes_a_decision })
})
if (web && ran[1].length && !results[ran[0].indexOf(web)]?.answer) notes.push('the landscape scan never answered, so the shortlist seats ran on the recorded reason alone')

return {
  summary: {
    stage: 'research',
    dry: DRY,
    external: ext ? ext.intent : null,
    asked: ordered.length,
    answered: gists.length,
    holes,
    decisive: gists.filter((g) => g.changes_a_decision).map((g) => g.agent),
    notes,
  },
  gists,
}

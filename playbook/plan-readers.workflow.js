export const meta = {
  name: 'plan-readers',
  description: 'Three blind readers read one checked plan whole, each through one lens, and say where its builder would go wrong',
  phases: [{ title: 'Read', detail: 'the builder, rules and owner readers read the whole plan and open what it cites' }],
}

// The plan step's last part (playbook/README.md step 2; the steps in playbook/how-to/plan-step.md). After
// ce-plan's run, three readers who never saw the planning read the checked plan whole, cold, each through
// one lens. They open the code the plan cites, and each returns the plan's faults with its line numbers and
// whether it would build from the plan. The lead then checks every fault against the code and fixes in the
// plan the real ones a builder would hit (graded blocks or misleads), lists the minor ones in the plan
// without folding them in, rewrites a unit as numbered steps when fixes crowd it (playbook insight 028), and
// names the fixes in the plan's commit message. Earned on the plan-step trial (playbook insight 029): the
// same three lenses, reading two plans, found real faults that both plans' full checks had missed, for 3
// helpers and 0.56M helper tokens.
//
// The Workflow tool takes scriptPath only from the session's working folder or its scratchpad, so copy
// this file into the scratchpad first. Launch it with args as a plain object, never a JSON string:
//   { request, plan: { path, lastLine }, entry, brief }
// request: the job, word for word as the planner got it. plan.path: the plan's absolute path.
// plan.lastLine: the plan's last line number with text. entry and brief are optional: where the job comes
// from (a register entry, an issue) and the brief of past lessons the planner was given, each as a path
// or a short line.

const USAGE = 'args is a plain object: { request, plan: { path, lastLine }, entry, brief } (entry and brief optional)'
if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error(USAGE)
if (typeof args.request !== 'string' || !args.request.trim()) throw new Error('args.request is the job, a non-empty string. ' + USAGE)
const plan = args.plan
if (!plan || typeof plan !== 'object' || typeof plan.path !== 'string' || !plan.path.trim() || !Number.isInteger(plan.lastLine) || plan.lastLine < 1) {
  throw new Error('args.plan is { path, lastLine }: an absolute path and the last line number with text. ' + USAGE)
}
for (const k of ['entry', 'brief']) {
  if (args[k] !== undefined && (typeof args[k] !== 'string' || !args[k].trim())) throw new Error('args.' + k + ', when given, is a non-empty string. ' + USAGE)
}

const FAULT = {
  type: 'object',
  properties: {
    lines: { type: 'string', description: 'the plan line numbers the fault rests on, such as "147" or "296-309, 437"' },
    fault: { type: 'string', description: 'what is wrong, in plain words' },
    evidence: { type: 'string', description: 'what you checked: the file and line you opened, the rule or source you read, or "from the plan alone"' },
    harm: { type: 'string', enum: ['blocks', 'misleads', 'minor'], description: 'blocks: the build cannot go on as written; misleads: a builder who follows it builds the wrong thing; minor: worth fixing, but it harms nothing' },
  },
  required: ['lines', 'fault', 'evidence', 'harm'],
}
const VERDICT = {
  type: 'object',
  properties: {
    would_build: { type: 'string', enum: ['yes', 'after-fixes', 'no'], description: 'yes: as it stands; after-fixes: once the faults you list are fixed; no: it needs replanning' },
    why: { type: 'string', description: 'the reasons for that answer, in plain words, citing plan line numbers' },
    faults: { type: 'array', items: FAULT },
    strengths: { type: 'array', items: { type: 'string' }, description: 'what the plan gets right that a fix must not break, with line numbers' },
    would_fail_first: { type: 'string', description: 'the first place a builder following the plan would go wrong, with its line numbers' },
    read_to_line: { type: 'integer', description: 'the last plan line number you actually read' },
  },
  required: ['would_build', 'why', 'faults', 'strengths', 'would_fail_first', 'read_to_line'],
}

const LENSES = [
  {
    key: 'builder',
    text: 'You will build this job tomorrow from this plan, alone, with no one to ask. Find every place you would take a wrong turn: units out of a buildable order; a unit without its files, its tests or a clear done line; anything a builder must guess; a step that cannot be built as written; work already in flight in the project (read its TODO.md START HERE) that the plan never fits around; and existing tests the change would break that the plan never plans for (count them in the repo). Prose that packs many tasks into one paragraph is a fault when a builder would skip a step in it.',
  },
  {
    key: 'rules',
    text: 'You are the skeptic on correctness. Check the rules and facts the job depends on: the laws, formulas and outside rules the plan states (against primary sources), the code it names (open each cited file and check that the line says what the plan claims), and the measurements it asks for. Look for what it leaves out that the job\'s source or the brief says matters. A plan that is confidently wrong anywhere is worse than one that is honestly unsure.',
  },
  {
    key: 'owner',
    text: 'You read for the owner, Briggsy. He wants "a really good process but also balanced": no guard without an incident behind it, no proof bigger than the question, no work nobody asked for, and his own calls (the words people will read, the rulings the job\'s source leaves to him) put to him with a recommended default, never decided for him and never handed back to him as mechanics the pilot should settle. Find where the plan does more or less than was asked, and where an answer it gives would read better than the truth. If the plan names an origin (a brief, a scoping doc), also ask whether the problem it solves is real and whether that source shows it: ce-plan\'s own check skips this for such plans (playbook insight 027).',
  },
]

function prompt(lens) {
  return [
    'A plan was written and checked for the job below. You did not see it being written. You are one of three readers who each read it cold, through one lens.',
    '',
    'The job, word for word as the planner got it:',
    args.request,
    '',
    ...(args.entry ? ['Where the job comes from: ' + args.entry] : []),
    ...(args.brief ? ['The brief of past lessons the planner was given: ' + args.brief] : []),
    ...(args.entry || args.brief ? [''] : []),
    'Read the whole plan: ' + plan.path + '. Its last line with text is line ' + plan.lastLine + '. The Read tool returns about one page at a time, so page through the file until you reach that line, and report the last line you actually read in read_to_line.',
    '',
    'Your lens: ' + lens.text,
    '',
    'Before you call anything a fault, open the code and files the plan cites, and say in the fault\'s evidence what you opened. Give every fault the plan line numbers it rests on. Then say whether you would build from the plan as it stands (yes), once its faults are fixed (after-fixes), or not at all (no), and why. Read-only: write no files and change nothing.',
  ].join('\n')
}

phase('Read')
const results = await parallel(LENSES.map((lens) => () =>
  agent(prompt(lens), { label: 'reader:' + lens.key, phase: 'Read', schema: VERDICT, model: 'opus', effort: 'xhigh' })
    .then((v) => (v ? { lens: lens.key, ...v } : { lens: lens.key, dead: true }))))

const live = results.filter((r) => r && !r.dead)
const dead = results.filter((r) => !r || r.dead).map((r) => (r ? r.lens : 'unknown'))
const readShort = live.filter((r) => r.read_to_line < plan.lastLine).map((r) => r.lens + ' (to line ' + r.read_to_line + ')')
const verdicts = Object.fromEntries(live.map((r) => [r.lens, r.would_build]))
const faultCount = live.reduce((n, r) => n + r.faults.length, 0)
// The completion notice shows only the start of a long result (about 5,000 characters on 2026-11-12, of a
// 52,000-character result), so a one-line index of every fault comes before the readers' full answers.
const index = live.flatMap((r) => r.faults.map((f, i) =>
  r.lens + ' ' + (i + 1) + ' [' + f.harm + '] lines ' + f.lines + ': ' + f.fault.replace(/\s+/g, ' ').slice(0, 140)))
log('verdicts: ' + live.map((r) => r.lens + ' ' + r.would_build).join(', ') + '; ' + faultCount + ' faults' +
  (dead.length ? '; no answer from: ' + dead.join(', ') : '') + (readShort.length ? '; read short: ' + readShort.join(', ') : ''))
return { verdicts, faultCount, dead, readShort, index, readers: live }

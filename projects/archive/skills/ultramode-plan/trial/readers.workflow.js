export const meta = {
  name: 'plan-trial-readers',
  description: 'Three skeptical readers compare two unlabeled plans for one job and say which they would build from',
  phases: [{ title: 'Read', detail: 'three readers, each with its own lens, read both plans whole' }],
}

// The lean plan's Step 6 (projects/skills/ultramode-plan/docs/plans/lean-plan-step-plan.md): three
// skeptical readers get both plans unlabeled, in one Workflow, and say which plan they would build
// from and why. Written 2026-11-12, before either plan existed, so the judging is fixed before the
// results are seen. Launch it with args (a plain object, never a JSON string):
//   { request, entry, brief, a: { path, lastLine }, b: { path, lastLine } }
// a.path and b.path are the SANITIZED copies (no front matter, nothing naming the tool that wrote
// them); lastLine is each copy's last line number with text. Which plan is A is a coin flip made
// outside this script.

if (!args || typeof args !== 'object') throw new Error('args is an object: { request, entry, brief, a: { path, lastLine }, b: { path, lastLine } }')
for (const k of ['request', 'entry', 'brief']) if (typeof args[k] !== 'string' || !args[k]) throw new Error('args.' + k + ' is a non-empty string')
for (const k of ['a', 'b']) {
  const p = args[k]
  if (!p || typeof p.path !== 'string' || !Number.isInteger(p.lastLine) || p.lastLine < 1) throw new Error('args.' + k + ' is { path, lastLine }')
}

const SIDE = {
  type: 'object',
  properties: {
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' }, description: 'each with the plan line numbers it rests on' },
    read_to_line: { type: 'integer', description: 'the last line number you actually read' },
  },
  required: ['strengths', 'weaknesses', 'read_to_line'],
}
const VERDICT = {
  type: 'object',
  properties: {
    pick: { type: 'string', enum: ['A', 'B', 'neither'] },
    clearly_better: { type: 'boolean', description: 'true only if the pick is clearly better, not a close call' },
    why: { type: 'string', description: 'the reasons for the pick, in plain words, citing line numbers' },
    a: SIDE,
    b: SIDE,
    would_fail_first: { type: 'string', description: 'for each plan, the first place a builder following it would go wrong' },
  },
  required: ['pick', 'clearly_better', 'why', 'a', 'b', 'would_fail_first'],
}

const LENSES = [
  { key: 'builder', first: 'a', text: 'You will build this job tomorrow from one of these plans, alone, with no one to ask. Judge which plan you could build from with the fewest wrong turns: units in a buildable order, each with files, tests and a clear done line; nothing a builder must guess; no step that cannot be built as written.' },
  { key: 'rules', first: 'b', text: 'You are the skeptic on correctness. Judge which plan gets the job\'s rules and facts right: the tax rules it states, the engine code it names (open the files it cites and check them), the measurements it asks for, and what it leaves out that the register entry or the brief says matters. A plan that is confidently wrong anywhere is worse than one that is honestly unsure.' },
  { key: 'owner', first: 'a', text: 'You read for the owner. He wants "a really good process but also balanced": no guard without an incident behind it, no proof bigger than the question, no work nobody asked for, and his own calls (the words his household reads, the council the entry names) left to him rather than decided for him. Judge which plan does what was asked at the right size.' },
]

function prompt(lens) {
  const order = lens.first === 'a' ? ['A', 'B'] : ['B', 'A']
  const where = { A: args.a, B: args.b }
  return [
    'Two plans were written for the same job by two different planning methods. They are labeled A and B at random. Do not guess which method wrote which; judge only what is on the page and what the repo says.',
    '',
    'The job, word for word as both planners got it:',
    args.request,
    '',
    'The register entry the job comes from: ' + args.entry,
    'The brief of past lessons both planners were given: ' + args.brief,
    '',
    'Read both plans whole, ' + order[0] + ' first. The Read tool returns about one page at a time, so page through each file until you reach its last line.',
    order.map((k) => '- Plan ' + k + ': ' + where[k].path + ' (its last line with text is line ' + where[k].lastLine + ')').join('\n'),
    'Report in read_to_line the last line you actually read of each.',
    '',
    'Your lens: ' + lens.text,
    '',
    'Then say which plan you would build from (A, B, or neither), whether it is clearly better or a close call, and why, citing line numbers. Read-only: write no files and change nothing.',
  ].join('\n')
}

phase('Read')
const results = await parallel(LENSES.map((lens) => () =>
  agent(prompt(lens), { label: 'reader:' + lens.key, phase: 'Read', schema: VERDICT, model: 'opus', effort: 'xhigh' })
    .then((v) => (v ? { lens: lens.key, firstRead: lens.first === 'a' ? 'A' : 'B', ...v } : { lens: lens.key, dead: true }))))

const live = results.filter((r) => r && !r.dead)
const short = live.filter((r) => r.a.read_to_line < args.a.lastLine || r.b.read_to_line < args.b.lastLine).map((r) => r.lens)
const tally = { A: 0, B: 0, neither: 0 }
for (const r of live) tally[r.pick] += 1
log('picks: A ' + tally.A + ', B ' + tally.B + ', neither ' + tally.neither + (short.length ? '; read short: ' + short.join(', ') : ''))
return { tally, dead: results.filter((r) => !r || r.dead).map((r) => (r ? r.lens : 'unknown')), readShort: short, readers: live }

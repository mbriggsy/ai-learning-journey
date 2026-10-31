export const meta = {
  name: 'brief-recall-rescore',
  description: 'The brief recall fix re-score: blind brief runs of one arm on frozen as-of copies, or the KTD9 blind judges',
  phases: [
    { title: 'Runs', detail: 'one Opus helper per brief and run, following one arm of the recipe on its copy' },
    { title: 'Judges', detail: 'one blind Opus judge per brief over its as-of lessons' },
  ],
}

// Generated per invocation by bench/make-rescore.mjs, which fills CONFIG from
// the results files and the copies' manifest (no hand-typed topic or path):
// { copies, part: 'A1' | 'A2' | 'A3' | 'judges' | 'dry', runs: [1, 2],
//   arms: { A1: { recipe, corpus, briefs: [...] }, ... },
//   briefs: [{ id, ts, topic, commitsAfter }], judgeRules: [...] }
const CONFIG = __CONFIG__

const PICKS = {
  type: 'object',
  properties: {
    read: { type: 'array', items: { type: 'string' }, description: 'lesson numbers you would read in full, in score order, as many as the recipe allows' },
    next: { type: 'array', items: { type: 'string' }, description: 'the next lesson numbers you would name, in score order, as many as the recipe allows' },
    bigJob: { type: ['string', 'null'], enum: ['big', 'small', null], description: 'the recipe\'s big or small label for this job, or null if it has none' },
    savedToFile: { type: 'array', items: { type: 'string' }, description: 'each tool result that was saved to a file instead of shown in full: the call, and that you then read the file' },
    unread: { type: 'string', description: 'anything the recipe asked you to read or see that you could not, or "none"' },
  },
  required: ['read', 'next', 'bigJob', 'savedToFile', 'unread'],
}

const JUDGED = {
  type: 'object',
  properties: {
    lessons_read: { type: 'integer', description: 'how many lesson files you read in full' },
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lesson: { type: 'string', description: 'the lesson number, e.g. 027' },
          strength: { type: 'string', enum: ['strong', 'moderate'] },
          trap: { type: 'string', description: 'one line: the trap and how this work could hit it' },
        },
        required: ['lesson', 'strength', 'trap'],
      },
    },
  },
  required: ['lessons_read', 'lessons'],
}

const RESULTS_DIR = 'C:/Users/brigg/ai-learning-journey/projects/skills/distill-and-brief/brief/results'

function runPrompt(arm, b, copyDir) {
  const a = CONFIG.arms[arm]
  return (
    'You are measuring a lesson-recall recipe, not doing the job. Read the recipe with the Read tool at ' + a.recipe + ', then follow it for the topic below, against the lesson folder ' + copyDir + ', up to the point where you have chosen which lessons to read in full and which to name next. Then stop and return your picks.\n\n' +
    'Topic: ' + b.topic + '\n\n' +
    'How to run it here:\n' +
    '- Never invoke the Skill tool.\n' +
    '- Wherever the recipe says node "$HOME/.claude/skills/brief/corpus.mjs", run node "' + a.corpus + '" instead, with the same arguments, and give it the folder ' + copyDir + ' as its folder argument. Its line under "Corpus card" is the first thing to run.\n' +
    '- The corpus is ' + copyDir + ': use that absolute path wherever the recipe says docs/insights/, <dir> or "the corpus the card names".\n' +
    '- Search, list and read only inside that folder, plus the recipe and script named here. Never open any other docs/insights folder, anything under ' + RESULTS_DIR + ', or any session transcript.\n' +
    '- When a tool result is saved to a file instead of shown in full, read that file in full before going on, and list each time in savedToFile.\n' +
    '- Do not read any lesson in full, do not check lessons against code, and do not write the brief: stop once you have chosen. Edit no file.\n\n' +
    'Return read (the lessons you would read in full, in score order, as many as the recipe allows), next (the next ones you would name, in score order, as many as it allows), bigJob (the recipe\'s big or small label for this job, or null if the recipe has none), savedToFile and unread.'
  )
}

function judgePrompt(b) {
  const dir = CONFIG.copies + '/' + b.id + '/asof/docs/insights'
  const rules = CONFIG.judgeRules.slice(0, -1).join('\n') +
    '\nStay blind: read only the lesson files named here. Never open any other folder of lessons, anything under ' + RESULTS_DIR + ', or any session transcript. Read-only: edit nothing, write no files.'
  return (
    'You are judging which past lessons a careful senior engineer would want in front of them before one specific piece of work. This measures a lesson-recall tool, so judge independently, from the topic and the work only.\n\n' +
    'The moment: id ' + b.id + ', ts ' + b.ts + '.\nTopic (what they said they were about to work on): ' + b.topic + '\n' +
    'Commits the work then made (the best record of what it actually touched): ' + JSON.stringify(b.commitsAfter) + '\n\n' +
    'The lessons: read IN FULL every lesson file (NNN-<slug>.md) in ' + dir + '. They are the lessons as they stood at that moment. Name each by its number.\n\n' +
    rules
  )
}

const briefOf = (id) => CONFIG.briefs.find((b) => b.id === id)
const jobs = []
if (CONFIG.part === 'judges') {
  for (const b of CONFIG.briefs) jobs.push({ kind: 'judge', brief: b.id })
} else {
  const arms = CONFIG.part === 'dry' ? [CONFIG.dry.arm] : [CONFIG.part]
  for (const arm of arms) {
    const ids = CONFIG.part === 'dry' ? [CONFIG.dry.brief] : CONFIG.arms[arm].briefs
    const runs = CONFIG.part === 'dry' ? [1] : CONFIG.runs
    for (const run of runs) for (const id of ids) jobs.push({ kind: 'run', arm, brief: id, run })
  }
}
log(`${CONFIG.part}: ${jobs.length} helpers`)

const out = await parallel(jobs.map((j) => () => {
  if (j.kind === 'judge') {
    return agent(judgePrompt(briefOf(j.brief)), { label: `judge:${j.brief}`, phase: 'Judges', schema: JUDGED, model: 'opus' })
      .then((result) => ({ brief: j.brief, result }))
  }
  const variant = j.arm === 'A3' ? 'lines' : 'plain'
  const copyDir = CONFIG.copies + '/' + j.brief + '/' + variant + '/docs/insights'
  return agent(runPrompt(j.arm, briefOf(j.brief), copyDir), { label: `${j.arm}:${j.brief}:r${j.run}`, phase: 'Runs', schema: PICKS, model: 'opus' })
    .then((result) => ({ arm: j.arm, brief: j.brief, run: j.run, copy: copyDir, result }))
}))
return { part: CONFIG.part, items: out }

// Q13: can a workflow script call another saved script with
// workflow({scriptPath}), get back its return value and its agent's result,
// and does the nested run leave a record that names it?
//
// One headless run. The model launches an inline parent Workflow whose body
// try/catches six workflow() calls and returns what each gave back:
//   byPath       {scriptPath} to a child script in the workspace; the child
//                runs one agent that replies with a random word and returns
//                {r, args}. Decides the verdict, with the record check below.
//                A call that hands back no word is judged by what the child's
//                agent did (see childFacts): an agent that died or never said
//                the word leaves the call shape unmeasured (Q12: agent()
//                resolves null on a dead agent), while one that said it and
//                lost it on the way back is a real no.
//   unknownName  a name no registry holds: expected to throw, catchably.
//   nest         a child that itself calls workflow(). Observed only: the
//                assumption claims no nesting limit, so a second level that
//                runs is news for U10, which designs around one, not a no.
//   projectName  by NAME, a saved workflow in the workspace's
//                .claude/workflows/ (project scope). Observed only.
//   outsideCwd   {scriptPath} to a script in a second temp folder outside the
//                session's working directory: the real review core will live
//                outside every project's cwd.
//   outsideAdded the same, from a third temp folder the session adds with
//                --add-dir (the remedy the runtime's own error names): the
//                control for outsideCwd. A throw from outsideCwd naming that
//                rule, with this arm returning, is a constraint U10 designs
//                for (the core's folder must be one the session can read),
//                not a contradiction; with this arm throwing too, neither
//                says anything and the probe is INCONCLUSIVE.
// The session has Read as well as Workflow: the runtime loads a scriptPath
// only for a session that can call Read (its error says so), and every real
// review session can.
// The by-NAME call of a USER-scope saved workflow (~/.claude/workflows/) can't
// run here: a file there loads into every live session. That arm stays
// BLOCKED until unit U10 deploys the real review core there, and the verdict
// stays PARTIAL while it is.
//
// Instruments: the parent's run record (<session>/workflows/<runId>.json),
// whose `result` is the value the runtime recorded the script returning, so
// no model paraphrase sits between the run and the verdict; and a search of
// every file under <session>/subagents/workflows/ for the child's name. The
// child's name appears in no agent prompt or label, so a hit there was
// written by the runtime. (The parent script itself names the child's path,
// which is why the search leaves out the workflows/ folder that keeps it.)
// The search's control: a file there holds the child's word, so the nested
// run's files were found at all. It is only that: the child agent's prompt
// carries the word, so its transcript and the run journal hold it whether the
// agent replied or died.
import fs from 'node:fs';
import path from 'node:path';
import { arm, byLabel, canary, hook, readCaptures, readJsonl, runClaude, scrubber, track, transcriptFrom, write } from '../lib.mjs';

const fwd = (p) => p.replace(/\\/g, '/');
const hex = () => canary('X').split('-')[1].toLowerCase();

function walk(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Result strings must carry no session ids and no home paths: the probe's own
// folders become labels (in each spelling: either slash, JSON-doubled
// backslashes), then lib's scrubber takes the home dir, profiles and ids.
function tagger(roots) {
  const ids = scrubber();
  return (s) => {
    let t = String(s);
    for (const [abs, label] of roots) {
      for (const v of new Set([abs, fwd(abs), abs.replace(/\\/g, '\\\\'), fwd(abs).replace(/\//g, '\\\\')])) t = t.split(v).join(label);
    }
    return ids(t);
  };
}

// The arm the probe can't run yet: PARTIAL while it is listed.
const BLOCKED_ARMS = ['the by-name call of a user-scope saved workflow (~/.claude/workflows/<name>), BLOCKED until U10 deploys the real review core there'];

const childScript = (name, word, desc) => [
  `export const meta = { name: '${name}', description: '${desc}' }`,
  `const r = await agent('Reply with exactly ${word} and nothing else. Use no tools.', { label: 'child-agent' })`,
  "return { r, args: typeof args === 'undefined' ? null : args }",
].join('\n');

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// The parent's workflowProgress entries for the byPath child's agent: the
// agents whose promptPreview holds the child's word (its prompt asks for it).
export const childEntries = (progress, word) => (Array.isArray(progress) ? progress : [])
  .filter((e) => e?.type === 'workflow_agent' && String(e.promptPreview ?? '').includes(word));

// An agent id as a file-name piece, or null: it names agent-<id>.jsonl.
export const agentFile = (id) => (typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id) ? `agent-${id}.jsonl` : null);

const textBlocks = (content) => (typeof content === 'string' ? [content] : Array.isArray(content) ? content.filter((b) => b?.type === 'text').map((b) => String(b.text ?? '')) : []);

// An agent()'s hand-back r as text: r when a string, '' when absent, null
// when agent() handed back anything else. The word checks read text only,
// never a serialized value: one that carries the prompt holds the word.
const textOf = (r) => (r == null ? '' : typeof r === 'string' ? r : null);
const typeName = (v) => (Array.isArray(v) ? 'an array' : typeof v === 'object' ? 'an object' : `a ${typeof v}`);

// What the byPath child's agent did, from the runtime's records of it: its
// progress `entries` (childEntries), the run's `journal` and its transcript
// `records`. `said` reads only resultPreview and the agent's own assistant
// text, never raw file text: the prompt holds the word, so every file of an
// agent that died holds it too. A reply flagged isApiErrorMessage is the
// runtime's error text, not the agent's: it marks a death, never a word.
export function childFacts({ entries, journal, records, word }) {
  const ids = [...new Set(entries.map((e) => e.agentId).filter(Boolean))];
  const own = records.filter((r) => r?.type === 'assistant' && r.isApiErrorMessage !== true).flatMap((r) => textBlocks(r.message?.content));
  const said = entries.some((e) => String(e.resultPreview ?? '').includes(word)) || own.some((t) => t.includes(word));
  const failed = journal.filter((j) => j?.type === 'failed' && ids.includes(j.agentId)).length;
  const apiErrors = records.filter((r) => r?.isApiErrorMessage === true).length;
  const states = entries.map((e) => e.state ?? null);
  const reply = (own.filter((t) => t.trim()).at(-1) ?? entries.map((e) => e.resultPreview).find((x) => typeof x === 'string' && x) ?? null)?.slice(0, 120) ?? null;
  return { found: entries.length, states, said, died: states.includes('error') || failed > 0 || apiErrors > 0, failed, apiErrors, reply };
}

// The child's story for a summary: whether its agent ran, died, and said the word.
const story = (c) => {
  if (!c.found) return 'no workflowProgress entry for the child\'s agent was found';
  const how = `progress state ${c.states.map(String).join('/')}, journal 'failed' ${c.failed}, API error replies ${c.apiErrors}`;
  const word = c.said ? 'said its word' : c.reply === null ? 'left no reply of its own' : `replied ${JSON.stringify(c.reply)}, without its word`;
  return `the child's agent ${c.died ? 'died' : 'did not die'} (${how}) and ${word}`;
};

// The byPath arm A against its child's agent facts c: null when the call ran
// (no throw, its {via: 'path'} args back, a text r holding the word), else the
// verdict. A throw is CONTRADICTED unless the agent died silent: were a later
// CLI's agent() to throw on a dead agent (Q12 would read CONTRADICTED),
// workflow() would throw for it, which says nothing about the call shape. An
// r that isn't text is INCONCLUSIVE: a later agent() that hands back an
// object leaves the word check nothing to read. A word missing from r is
// CONTRADICTED only when the agent said it (the hand-back dropped it); a dead
// or non-compliant agent measured nothing.
export function byPathVerdict(A, c, word) {
  if (!A) return { verdict: 'CONTRADICTED', summary: `the parent's result has no byPath entry, so workflow({scriptPath}) handed nothing back; ${story(c)}` };
  if (A.threw) {
    const msg = String(A.msg).slice(0, 200);
    if (c.died && !c.said) return { verdict: 'INCONCLUSIVE', summary: `workflow({scriptPath}) threw (${msg}), but ${story(c)}, so the throw may be the dead agent's, not the call's` };
    return { verdict: 'CONTRADICTED', summary: `workflow({scriptPath}) threw (${msg}); ${story(c)}` };
  }
  if (A.v?.args?.via !== 'path') return { verdict: 'CONTRADICTED', summary: `workflow({scriptPath}) did not hand back the child's return value: it returned ${JSON.stringify(A.v ?? null).slice(0, 300)}, without the {via: 'path'} args it was given; ${story(c)}` };
  const text = textOf(A.v.r);
  if (text === null) return { verdict: 'INCONCLUSIVE', summary: `agent() handed back ${typeName(A.v.r)}, not text, so the byPath hand-back check cannot read it; ${story(c)}` };
  if (text.includes(word)) return null;
  const r = JSON.stringify(A.v.r ?? null).slice(0, 160);
  if (c.said) return { verdict: 'CONTRADICTED', summary: `${story(c)}, but workflow({scriptPath}) handed back r ${r} without it: the hand-back dropped the agent's result` };
  return { verdict: 'INCONCLUSIVE', summary: `workflow({scriptPath}) handed back the child's args, but r ${r} lacks its word and ${story(c)}, so the hand-back of an agent's result measured nothing` };
}

const show = (a) => (a ? (a.threw ? `threw ${JSON.stringify(a.msg)}` : `returned ${JSON.stringify(a.v)}`) : 'missing');

// The first verdict the two call-shape arms give (byPath, unknownName), every
// CONTRADICTED before any INCONCLUSIVE, so a byPath whose agent died never
// hides the other arm's measured no; null when both ran as the design
// assumes. The nest arm is no call-shape arm (nestNote).
export function callArms({ byPath, child, unknownName, word }) {
  const b = byPathVerdict(byPath, child, word);
  if (b?.verdict === 'CONTRADICTED') return b;
  if (!unknownName?.threw) return { verdict: 'CONTRADICTED', summary: `workflow() on an unknown name did not throw: ${show(unknownName)}` };
  return b;
}

// The nest arm D for the summary, an observation that never decides.
export const nestNote = (D) => (!D ? 'the nest arm left no result' : D.threw ? `a second nesting level throws (${String(D.msg).slice(0, 120)})` : 'a second nesting level ran');

// An arm a that ran: no throw, the {via} args it was given, its child agent's
// word in a text r.
const ran = (a, word, via) => !!a && !a.threw && a.v?.args?.via === via && (textOf(a.v?.r) ?? '').includes(word);
const brief = (a, word) => (a ? (a.threw ? `threw (${String(a.msg).slice(0, 160)})` : `returned ${(textOf(a.v?.r) ?? '').includes(word) ? 'its child\'s word' : JSON.stringify(a.v)}`) : 'missing');

// U10's call shape from the outside-cwd arm O and its --add-dir control A,
// with their children's words: {outside} text when settled (the call ran as
// is, or it threw the read-scope rule while the control ran: a constraint U10
// designs for, not a contradiction), else an INCONCLUSIVE. An arm whose
// agent() handed back no text is named as such: its word check read nothing.
export function outsideShape(O, A, wO, wA) {
  if (ran(O, wO, 'outside')) return { outside: 'a scriptPath outside the cwd ran as is' };
  const readScope = !!O?.threw && /a file you can already read|directory you have added/i.test(O.msg);
  if (readScope && ran(A, wA, 'added')) return { outside: `constraint: a scriptPath must be readable by the session, in its working directory or an --add-dir folder; one outside both threw (${String(O.msg).slice(0, 160)}) while the same call into an --add-dir folder returned its child's word` };
  const [name, a] = readScope ? ['--add-dir control', A] : ['outside-cwd', O];
  const odd = a && !a.threw && textOf(a.v?.r) === null ? typeName(a.v.r) : null;
  const why = odd ? `the ${name} arm's agent() handed back ${odd}, not text, which its word check cannot read`
    : readScope ? `the --add-dir control failed as well (${brief(A, wA)})`
      : `the outside-cwd arm ${O ? brief(O, wO) : 'left no result'}, which is neither a run nor the read-scope rule`;
  return { verdict: 'INCONCLUSIVE', summary: `${why}, so the outside-cwd call shape is unsettled` };
}

// The verdict once every settled arm agreed: VERIFIED, or PARTIAL while an arm
// is blocked. That PARTIAL measured no deviation, so it says unsettledOnly
// (run.mjs UNSETTLED_OK): a VERIFIED after it on the same hash is no conflict.
export function finalVerdict(settled, blocked) {
  if (blocked.length) return { verdict: 'PARTIAL', summary: `${settled}. Not run: ${blocked.join('; ')}`, unsettledOnly: true };
  return { verdict: 'VERIFIED', summary: settled };
}

export default {
  id: 'Q13',
  question: 'Can a saved workflow script, a user-scope one included, be called from another workflow with workflow({scriptPath}), and does its nested run leave a record that names it?',
  assumption: 'A workflow script can call another saved script, a user-scope one included, with workflow({scriptPath}), receive its return value and its agents\' results, and the nested run leaves a record (under the session\'s subagents/workflows folder) that names it.',
  loadBearing: true,
  async run(ctx) {
    const { ws, out } = arm(ctx, 'main');
    const { ws: away } = arm(ctx, 'outside');
    const { ws: added } = arm(ctx, 'added');
    const id = hex();
    const N = {
      parent: `zzprobe-q13-parent-${id}`, child: `zzprobe-q13-child-${id}`, nest: `zzprobe-q13-nest-${id}`, inner: `zzprobe-q13-inner-${id}`,
      proj: `zzprobe-q13-proj-${id}`, outside: `zzprobe-q13-outside-${id}`, added: `zzprobe-q13-added-${id}`, nope: `zzprobe-q13-nope-${id}`,
    };
    const W = { child: canary('CHILD'), inner: canary('INNER'), proj: canary('NAMED'), outside: canary('AWAY'), added: canary('ADDED') };
    const F = {
      child: path.join(ws, `${N.child}.js`), nest: path.join(ws, `${N.nest}.js`), inner: path.join(ws, `${N.inner}.js`),
      proj: path.join(ws, '.claude', 'workflows', `${N.proj}.js`), outside: path.join(away, `${N.outside}.js`), added: path.join(added, `${N.added}.js`),
    };
    write(F.child, childScript(N.child, W.child, 'Q13 probe child'));
    write(F.inner, childScript(N.inner, W.inner, 'Q13 probe inner child'));
    write(F.nest, [
      `export const meta = { name: '${N.nest}', description: 'Q13 probe nest' }`,
      `return await workflow({ scriptPath: '${fwd(F.inner)}' }, { via: 'nest' })`,
    ].join('\n'));
    write(F.proj, childScript(N.proj, W.proj, 'Q13 probe project-scope child'));
    write(F.outside, childScript(N.outside, W.outside, 'Q13 probe outside-cwd child'));
    write(F.added, childScript(N.added, W.added, 'Q13 probe added-dir child'));
    const script = [
      `export const meta = { name: '${N.parent}', description: 'Q13 probe: nested workflow calls' }`,
      'const out = {}',
      'const cap = async (k, f) => { try { out[k] = { threw: false, v: await f() } } catch (e) { out[k] = { threw: true, msg: String((e && e.message) || e).slice(0, 600) } } }',
      `await cap('byPath', () => workflow({ scriptPath: '${fwd(F.child)}' }, { via: 'path' }))`,
      `await cap('unknownName', () => workflow('${N.nope}'))`,
      `await cap('nest', () => workflow({ scriptPath: '${fwd(F.nest)}' }))`,
      `await cap('projectName', () => workflow('${N.proj}', { via: 'name' }))`,
      `await cap('outsideCwd', () => workflow({ scriptPath: '${fwd(F.outside)}' }, { via: 'outside' }))`,
      `await cap('outsideAdded', () => workflow({ scriptPath: '${fwd(F.added)}' }, { via: 'added' }))`,
      'return out',
    ].join('\n');
    const prompt = `Run a workflow now with the Workflow tool, passing exactly this script as the script parameter (I am explicitly asking for a workflow):\n\n${script}\n\nOnce it has launched, do not wait for it or check on it: reply with the single word launched.`;
    const settings = {
      hooks: {
        SessionStart: [{ hooks: [hook(out, 'ss')] }],
        PreToolUse: [{ matcher: 'Workflow', hooks: [hook(out, 'pre-wf')] }],
        PostToolUse: [{ matcher: 'Workflow', hooks: [hook(out, 'post-wf')] }],
        SubagentStart: [{ hooks: [hook(out, 'sub-start')] }],
        Stop: [{ hooks: [hook(out, 'stop')] }],
      },
    };
    const res = runClaude({ cwd: ws, out, prompt, settings, args: ['--tools', 'Workflow,Read', '--allowedTools', 'Workflow', '--add-dir', fwd(added)], timeoutMs: 420_000 });
    const caps = readCaptures(out);
    track(ctx, caps);
    const transcript = transcriptFrom(caps);
    const sessionDir = transcript ? transcript.replace(/\.jsonl$/, '') : null;
    const scrub = tagger([[ws, '<ws>'], [away, '<outside>'], [added, '<added>'], ...(sessionDir ? [[sessionDir, '<session>']] : [])]);
    const rel = (f) => fwd(path.relative(sessionDir, f));

    const recFiles = walk(sessionDir && path.join(sessionDir, 'workflows')).filter((f) => f.endsWith('.json'));
    const recs = recFiles.map((f) => { try { return { f, r: JSON.parse(fs.readFileSync(f, 'utf8')) } } catch { return { f, r: null }; } }).filter((x) => x.r);
    const parentRec = recs.find((x) => x.r.workflowName === N.parent || String(x.r.script ?? '').includes(N.parent))?.r ?? null;
    let result = parentRec?.result ?? null;
    if (typeof result === 'string') { try { result = JSON.parse(result); } catch { /* kept as text */ } }
    const subFiles = walk(sessionDir && path.join(sessionDir, 'subagents', 'workflows'));
    const hits = (needle) => subFiles.filter((f) => fs.readFileSync(f, 'utf8').includes(needle));
    const snippet = (f, needle) => { const t = fs.readFileSync(f, 'utf8'); const i = t.indexOf(needle); return t.slice(Math.max(0, i - 120), i + needle.length + 60); };
    const namedIn = hits(N.child);
    const childResultIn = hits(W.child);
    const progressNamesChild = JSON.stringify(parentRec?.workflowProgress ?? []).includes(N.child);
    const runDirs = [...new Set(subFiles.map((f) => fwd(path.relative(path.join(sessionDir, 'subagents', 'workflows'), f)).split('/')[0]))];
    const otherRecs = recs.filter((x) => x.r !== parentRec).map((x) => ({ runId: x.r.runId, name: x.r.workflowName, status: x.r.status }));
    const arms = Object.fromEntries(['byPath', 'unknownName', 'nest', 'projectName', 'outsideCwd', 'outsideAdded'].map((k) => [k, result?.[k] ?? null]));
    const postWf = byLabel(caps, 'post-wf')[0]?.input?.tool_response;
    // The byPath child's agent, from its progress entry, the run journal and
    // its own transcript (<session>/subagents/workflows/<runId>/agent-<id>.jsonl).
    const runDir = sessionDir && typeof parentRec?.runId === 'string' && /^[\w-]+$/.test(parentRec.runId) ? path.join(sessionDir, 'subagents', 'workflows', parentRec.runId) : null;
    const entries = childEntries(parentRec?.workflowProgress, W.child);
    const child = childFacts({
      entries, word: W.child,
      journal: runDir ? readJsonl(path.join(runDir, 'journal.jsonl')) : [],
      records: runDir ? [...new Set(entries.map((e) => agentFile(e.agentId)).filter(Boolean))].flatMap((f) => readJsonl(path.join(runDir, f))) : [],
    });

    const evidence = [
      `session: exit ${res.status} in ${res.ms} ms, reply ${JSON.stringify((res.json?.result ?? '').slice(0, 160))}; Workflow PreToolUse ${byLabel(caps, 'pre-wf').length}, PostToolUse ${byLabel(caps, 'post-wf').length}, SubagentStart ${byLabel(caps, 'sub-start').length}`,
      `parent run record: ${parentRec ? `${parentRec.runId} status ${parentRec.status}, agentCount ${parentRec.agentCount}, script as sent ${norm(parentRec.script) === norm(script)}` : 'not found'}; other run records under workflows/: ${JSON.stringify(otherRecs)}`,
      ...Object.entries(arms).map(([k, a]) => `${k}: ${show(a)}`),
      `files under subagents/workflows/: ${JSON.stringify(subFiles.map(rel))} (run folders ${JSON.stringify(runDirs)})`,
      `files there naming the child (${N.child}): ${JSON.stringify(namedIn.map(rel))}${namedIn[0] ? `; first hit: ${JSON.stringify(snippet(namedIn[0], N.child))}` : ''}`,
      `files there holding the child's word (its agent's prompt or reply): ${JSON.stringify(childResultIn.map(rel))}; the parent record's workflowProgress names the child: ${progressNamesChild}`,
      `byPath's child agent (progress entries whose prompt holds its word): ${JSON.stringify(child)}`,
      `Workflow tool_response: ${JSON.stringify(postWf ?? null).slice(0, 600)}`,
      ...BLOCKED_ARMS,
    ].map(scrub);
    const observed = JSON.parse(scrub(JSON.stringify({ arms, parentRecord: parentRec && { runId: parentRec.runId, status: parentRec.status, workflowProgress: parentRec.workflowProgress, logs: parentRec.logs }, otherRecs, subFiles: subFiles.map(rel), namedIn: namedIn.map(rel), childResultIn: childResultIn.map(rel), progressNamesChild, child })));
    // `more` adds fields (unsettledOnly) but never replaces these four.
    const done = (verdict, summary, more = {}) => ({ ...more, verdict, summary: scrub(summary), evidence, observed });

    if (!parentRec) return done('INCONCLUSIVE', 'no run record for the parent workflow was found, so the model never launched it or the record lives elsewhere');
    if (norm(parentRec.script) !== norm(script)) return done('INCONCLUSIVE', 'the script the parent ran is not the one the probe sent, so its arms do not measure what they claim');
    if (parentRec.status !== 'completed' || !result || typeof result !== 'object') return done('INCONCLUSIVE', `the parent run did not complete with an object result (status ${parentRec.status})`);

    const extra = `project-scope by name: ${brief(arms.projectName, W.proj)}; scriptPath outside the cwd: ${brief(arms.outsideCwd, W.outside)}; scriptPath in a --add-dir folder: ${brief(arms.outsideAdded, W.added)}`;

    const shape = callArms({ byPath: arms.byPath, child, unknownName: arms.unknownName, word: W.child });
    if (shape) return done(shape.verdict, `${shape.summary}; ${extra}`);
    if (!childResultIn.length) return done('INCONCLUSIVE', `no file under the session's subagents/workflows folder holds the child's word (${subFiles.length} file(s) there), so the search for a record naming the nested run never saw its files; ${extra}`);
    if (!namedIn.length) return done('CONTRADICTED', `the child ran and returned, but no file under the session's subagents/workflows folder names it (the child's word is in ${JSON.stringify(childResultIn.map(rel))}; parent workflowProgress names it: ${progressNamesChild}); ${extra}`);

    const reach = outsideShape(arms.outsideCwd, arms.outsideAdded, W.outside, W.added);
    if (reach.verdict) return done(reach.verdict, `${reach.summary}; ${extra}`);
    const settled = `workflow({scriptPath}) returned the child's {r, args} with its agent's reply; the nested run is named in ${JSON.stringify(namedIn.map(rel))}; an unknown name throws (${String(arms.unknownName.msg).slice(0, 120)}); ${nestNote(arms.nest)}; ${reach.outside}; project-scope by name: ${brief(arms.projectName, W.proj)}`;
    const { verdict, summary, ...more } = finalVerdict(settled, BLOCKED_ARMS);
    return done(verdict, summary, more);
  },
};

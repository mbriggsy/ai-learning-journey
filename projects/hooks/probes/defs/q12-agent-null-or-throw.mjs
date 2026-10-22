// Q12: in a workflow script, does agent() resolve to null or throw when its
// subagent dies?
//
// One headless run launches one Workflow. Its script runs each case in turn
// inside try/catch, records {threw, isNull, type, json} or {threw, msg},
// log()s that record the moment it has it (so a run that dies part-way still
// leaves the cases it reached), and returns the whole report:
//   ctl_throw                 a deliberate throw: the harness sees a throw
//   ctl_parallel_thunk_throw  parallel() with a throwing thunk, no agent
//                             (recorded, not decisive)
//   ctl_value                 a normal agent: the harness sees a value
//   schema_impossible         a schema whose required key additionalProperties
//                             false rules out (the docs' provable contradiction)
//   bad_model_direct          agent() with a model id the API rejects: the
//                             proxy for a terminal API error
//   bad_model_in_parallel     the same call as one thunk of parallel(), the
//                             other thunk a plain 'ok'
// The report is read from the run record (<session>/workflows/<runId>.json,
// its result, then its logs), never from the model's retelling; the task
// notification in the main transcript corroborates it. The proxy counts only
// when the bad-model agent really started (the run journal's started record)
// and an API error is on record for it (its transcript's API error record or
// error text, its progress entry's error, SubagentStop's last message, or the
// thrown text). A rejection before the agent starts, or a fallback to another
// model (a request sent with another model id, or the report's "This agent
// switched to" line), is the proxy missing, not an answer.
import fs from 'node:fs';
import path from 'node:path';
import { arm, byLabel, hook, readCaptures, readJsonl, runClaude, scrubber, track } from '../lib.mjs';

const BAD_MODEL = 'claude-q12-nonexistent-model';
const NAME = 'probe-q12-null-or-throw';

const SCRIPT = [
  `export const meta = { name: '${NAME}', description: 'Q12 probe: does agent() resolve null or throw' }`,
  `const BAD = '${BAD_MODEL}'`,
  "const OK_TASK = 'Reply with exactly the word OK and nothing else. Use no tools.'",
  'const out = {}',
  'function shape(v) {',
  "  const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v",
  "  const rec = { threw: false, isNull: v === null, type, json: v === undefined ? 'undefined' : String(JSON.stringify(v)).slice(0, 400) }",
  "  if (Array.isArray(v)) rec.slots = v.map((x) => (x === null ? null : typeof x === 'string' ? x.slice(0, 80) : typeof x))",
  '  return rec',
  '}',
  'async function cap(k, f) {',
  '  let rec',
  '  try { rec = shape(await f()) } catch (e) { rec = { threw: true, msg: String((e && e.message) || e).slice(0, 600) } }',
  '  out[k] = rec',
  "  log('Q12 ' + k + ' ' + JSON.stringify(rec))",
  '}',
  "await cap('ctl_throw', async () => { throw new Error('q12-deliberate') })",
  "await cap('ctl_parallel_thunk_throw', () => parallel([() => { throw new Error('q12-thunk') }, () => Promise.resolve('ok')]))",
  "await cap('ctl_value', () => agent(OK_TASK, { label: 'q12-ctl' }))",
  "await cap('schema_impossible', () => agent('Return an empty object.', { label: 'q12-schema', schema: { type: 'object', required: ['x'], additionalProperties: false, properties: {} } }))",
  "await cap('bad_model_direct', () => agent(OK_TASK, { label: 'q12-badmodel', model: BAD }))",
  "await cap('bad_model_in_parallel', () => parallel([() => agent(OK_TASK, { label: 'q12-par-badmodel', model: BAD }), () => Promise.resolve('ok')]))",
  'return out',
].join('\n');

const PROMPT = `Run a workflow now with the Workflow tool, passing exactly this script as the script parameter (I am explicitly asking for a workflow):\n\n${SCRIPT}\n\nMake no other tool calls. When the workflow has finished, reply with the single word finished. Do not relaunch or retry it, whatever it returns.`;

// An API error in a piece of error text: an error code, an `API Error:` line
// or the CLI's model message. Only error text is ever tested: a whole record
// also holds usage counts, request params and the prompt, where a bare status
// number or the prompt's own words would read as an error.
const API_ERR = /not_found_error|model_not_found|API Error|invalid model|model[^"]{0,40}(not found|(?:does|may) not exist|not available|unknown)/i;
// The line a sub-agent's report opens with when it finished on a fallback
// model (sub-agents.md, "API errors in subagents").
const SWITCHED = /This agent switched to\b/;

// An assistant record's text blocks; every other record's text is a prompt or
// a request, never the agent's own output.
function textsOf(r) {
  if (r?.type !== 'assistant') return [];
  const c = r.message?.content;
  if (typeof c === 'string') return [c];
  return Array.isArray(c) ? c.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text) : [];
}
const errorTextOf = (r) => [...textsOf(r), typeof r?.error === 'string' ? r.error : ''].filter(Boolean).join('\n');

// One agent label's facts from every source: did it start, is an API error
// on record, and did it fall back to another model? `seen` holds the run
// journal, the run record's workflowProgress, each agent's transcript records
// by agentId, and the SubagentStart/SubagentStop captures. `model` is the id
// the call asked for; given, a request sent with any other id is a fallback.
// Only the journal's started record says it started: the progress list also
// holds an agent rejected before it starts.
export function agentFacts(label, rec, { journal, progress, transcripts, sstart, sstop }, model = null) {
  const started = journal.filter((j) => j?.type === 'started' && j.label === label);
  const prog = progress.filter((p) => p?.label === label);
  const ids = [...new Set([...started.map((j) => j.agentId), ...prog.map((p) => p.agentId)].filter(Boolean))];
  const tRecs = ids.flatMap((id) => transcripts[id] ?? []);
  const tErr = tRecs.filter((r) => r?.isApiErrorMessage === true || Number(r?.apiErrorStatus) >= 400 || API_ERR.test(errorTextOf(r)));
  const progErr = prog.filter((p) => typeof p.error === 'string' && API_ERR.test(p.error));
  const stops = sstop.filter((c) => ids.includes(c.input?.agent_id));
  const stopErr = stops.filter((c) => API_ERR.test(c.input?.last_assistant_message ?? ''));
  const msgErr = !!rec?.threw && API_ERR.test(rec.msg ?? '');
  const requestsSent = tRecs.filter((r) => r?.type === 'api-request').map((r) => r.params?.model ?? null);
  const replies = [...tRecs.flatMap(textsOf), ...stops.map((c) => c.input?.last_assistant_message), ...prog.map((p) => p.resultPreview), rec && !rec.threw ? rec.json : null].filter((t) => typeof t === 'string');
  const otherModel = model !== null && requestsSent.some((m) => typeof m === 'string' && !m.includes(model));
  const tErrText = tErr[0] && (errorTextOf(tErr[0]) || `an API error record, status ${tErr[0].apiErrorStatus ?? 'none'}`);
  const errText = tErrText || progErr[0]?.error || stopErr[0]?.input.last_assistant_message || (msgErr && rec.msg) || null;
  const apiRec = tRecs.find((r) => r?.isApiErrorMessage === true);
  return {
    started: started.length > 0,
    journalTypes: journal.filter((j) => ids.includes(j?.agentId)).map((j) => j.type),
    progressStates: prog.map((p) => p.state),
    transcriptRecords: tRecs.length,
    requestsSent,
    apiError: tErr.length > 0 || progErr.length > 0 || stopErr.length > 0 || msgErr,
    apiErrorStatus: apiRec?.apiErrorStatus ?? null,
    apiErrorCode: apiRec?.error ?? null,
    apiRequestId: !!apiRec?.requestId,
    errorText: errText ? String(errText).slice(0, 220) : null,
    fellBack: otherModel || replies.some((t) => SWITCHED.test(t)),
    subagentStart: sstart.filter((c) => ids.includes(c.input?.agent_id)).length,
    subagentStop: stops.length,
  };
}

function readRun(sessionDir) {
  const dir = path.join(sessionDir, 'workflows');
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    let rec;
    try { rec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    if (rec.workflowName === NAME) return rec;
  }
  return null;
}

function reportFrom(run) {
  let r = run?.result;
  if (typeof r === 'string') { try { r = JSON.parse(r); } catch { r = null; } }
  if (r && typeof r === 'object' && r.ctl_throw) return { source: 'run record result', rep: r };
  const rep = {};
  for (const l of run?.logs ?? []) {
    const text = typeof l === 'string' ? l : l?.message ?? l?.text ?? '';
    const m = /^Q12 (\w+) (\{.*\})$/s.exec(text);
    if (m) { try { rep[m[1]] = JSON.parse(m[2]); } catch { /* torn */ } }
  }
  return Object.keys(rep).length ? { source: 'run record logs (the script never returned)', rep } : null;
}

// The task notification's <result> in the main transcript, parsed.
function notified(transcript) {
  for (const r of readJsonl(transcript)) {
    const c = r.type === 'user' ? r.message?.content : null;
    const text = typeof c === 'string' ? c : null;
    if (!text || !text.includes('<task-notification>') || !text.includes('Q12 probe')) continue;
    const m = /<result>([\s\S]*?)<\/result>/.exec(text);
    if (!m) return { found: true, parsed: null };
    try { return { found: true, parsed: JSON.parse(m[1]) }; } catch { return { found: true, parsed: null, raw: m[1].slice(0, 200) }; }
  }
  return { found: false };
}

// The verdict from what the run left: the PreToolUse Workflow launches, the
// run record (`run`, its status read), the case report `rep` and each agent's
// facts ({ctl, schema, direct, parallel}, from agentFacts). Returns
// {verdict, summary}, unscrubbed. A bad-model agent that fell back is the
// proxy missing even with an API error on record: the error it recovered from
// stays there, and its outcome is the fallback model's. Any case that
// contradicts decides it, so the PARTIAL left over has only cases whose proxy
// never fired: unsettledOnly.
export function decide({ launched, run, rep, facts }) {
  if (!launched.length) return { verdict: 'INCONCLUSIVE', summary: 'the session never called the Workflow tool, so no case ran' };
  if (!run) return { verdict: 'INCONCLUSIVE', summary: 'the Workflow call left no run record to read the report from' };
  if (!rep) return { verdict: 'INCONCLUSIVE', summary: `the run (status ${run.status}) returned no report and logged no case` };
  const ctlOk = rep.ctl_throw?.threw === true && rep.ctl_value && !rep.ctl_value.threw && rep.ctl_value.type === 'string' && /\bOK\b/.test(rep.ctl_value.json ?? '');
  if (!ctlOk) return { verdict: 'INCONCLUSIVE', summary: `a control failed: deliberate throw ${JSON.stringify(rep.ctl_throw)}, normal agent ${JSON.stringify(rep.ctl_value)}` };
  const { ctl: ctlFacts, schema: schemaFacts, direct: directFacts, parallel: parFacts } = facts;
  const contra = [];
  const unsettled = [];
  const s = rep.schema_impossible;
  if (!s) unsettled.push(`impossible schema: no outcome recorded (run status ${run.status})`);
  else if (!s.threw) contra.push(`an impossible schema resolved to ${s.type} instead of throwing`);
  const proxyFired = (f) => f.started && f.apiError && !f.fellBack;
  const proxyMiss = (f, r) => `the rejected-model proxy ${f.fellBack ? 'fell back to another model' : 'produced no terminal API error in a started agent'} (started ${f.started}, API error on record ${f.apiError}, fell back ${!!f.fellBack}, outcome ${r ? (r.threw ? `threw: ${r.msg.slice(0, 160)}` : r.json) : 'none'})`;
  const d = rep.bad_model_direct;
  if (!d) unsettled.push(`agent() direct: no outcome recorded (run status ${run.status})`);
  else if (!proxyFired(directFacts)) unsettled.push(`agent() direct: ${proxyMiss(directFacts, d)}`);
  else if (d.threw) contra.push(`agent() threw on a terminal API error: ${d.msg.slice(0, 200)}`);
  else if (!d.isNull) contra.push(`agent() resolved to a value, not null, on a terminal API error: ${d.json.slice(0, 160)}`);
  const p = rep.bad_model_in_parallel;
  if (!p) unsettled.push(`parallel(): no outcome recorded (run status ${run.status})`);
  else if (!proxyFired(parFacts)) unsettled.push(`parallel(): ${proxyMiss(parFacts, p)}`);
  else if (p.threw) contra.push(`parallel() rejected when one agent died on a terminal API error: ${p.msg.slice(0, 200)}`);
  else if (!(p.type === 'array' && p.slots?.[0] === null && p.slots?.[1] === 'ok')) contra.push(`parallel() gave ${p.json} instead of [null, "ok"]`);
  const sch = s ? (s.threw ? `impossible schema threw (agent started: ${schemaFacts.started}): ${s.msg.slice(0, 140)}` : `impossible schema gave ${s.type}`) : 'impossible schema: no outcome';
  const dir = d ? (d.threw ? `rejected-model agent() threw: ${d.msg.slice(0, 140)}` : `rejected-model agent() resolved ${d.isNull ? 'null' : d.json.slice(0, 80)}`) : 'rejected-model agent(): no outcome';
  const par = p ? (p.threw ? `parallel() threw: ${p.msg.slice(0, 100)}` : `parallel() gave ${p.json.slice(0, 80)}`) : 'parallel(): no outcome';
  const thunk = `parallel() with a throwing thunk and no agent gave ${rep.ctl_parallel_thunk_throw ? (rep.ctl_parallel_thunk_throw.threw ? `a throw (${rep.ctl_parallel_thunk_throw.msg.slice(0, 60)})` : rep.ctl_parallel_thunk_throw.json) : 'nothing'}`;
  const apiNote = directFacts.apiError ? `API error ${directFacts.apiErrorStatus ?? '?'} ${directFacts.apiErrorCode ?? ''} after ${directFacts.requestsSent.length} request(s) with that model id: ${JSON.stringify((directFacts.errorText ?? '').slice(0, 90))}` : 'no API error on record';
  const stops = `SubagentStart/SubagentStop for the dead agents ${directFacts.subagentStart + parFacts.subagentStart}/${directFacts.subagentStop + parFacts.subagentStop}, for the live one ${ctlFacts.subagentStart}/${ctlFacts.subagentStop}`;
  const tail = `${sch}; ${dir} (${apiNote}); ${par}; ${thunk}; ${stops}`;
  if (contra.length) return { verdict: 'CONTRADICTED', summary: `${contra.join('; ')}. ${tail}` };
  if (unsettled.length) return { verdict: 'PARTIAL', summary: `settled: ${s?.threw ? 'the impossible schema throws' : 'nothing'}; unsettled, needing another terminal-API-error proxy: ${unsettled.join('; ')}. ${tail}`, unsettledOnly: true };
  return { verdict: 'VERIFIED', summary: tail };
}

export default {
  id: 'Q12',
  question: 'In a workflow script, does agent() return null or throw when its subagent crashes?',
  assumption: 'In a workflow script, agent() resolves to null (it does not throw) when its subagent dies on a terminal API error; an impossible schema throws.',
  loadBearing: true,
  async run(ctx) {
    const scrub = scrubber();
    const { ws, out } = arm(ctx, 'main');
    const settings = {
      hooks: {
        PreToolUse: [{ hooks: [hook(out, 'pre')] }],
        SubagentStart: [{ hooks: [hook(out, 'sstart')] }],
        SubagentStop: [{ hooks: [hook(out, 'sstop')] }],
        Stop: [{ hooks: [hook(out, 'stop')] }],
      },
    };
    const res = runClaude({ cwd: ws, out, prompt: PROMPT, settings, args: ['--tools', 'Workflow', '--allowedTools', 'Workflow'], timeoutMs: 600_000 });
    const caps = readCaptures(out);
    track(ctx, caps);
    const launched = byLabel(caps, 'pre').filter((c) => !c.input?.agent_id && c.input?.tool_name === 'Workflow');
    const transcript = caps.filter((c) => !c.input?.agent_id).map((c) => c.input?.transcript_path).find((p) => p && fs.existsSync(p)) ?? null;
    const sessionDir = transcript ? transcript.replace(/\.jsonl$/, '') : null;
    const run = sessionDir ? readRun(sessionDir) : null;
    const got = run ? reportFrom(run) : null;
    const rep = got?.rep ?? null;
    const runDir = run ? path.join(sessionDir, 'subagents', 'workflows', run.runId) : null;
    const journal = runDir ? readJsonl(path.join(runDir, 'journal.jsonl')) : [];
    const progress = run?.workflowProgress ?? [];
    const sstop = byLabel(caps, 'sstop');
    const agentIds = [...new Set([...journal, ...progress].map((x) => x?.agentId).filter(Boolean))];
    const transcripts = Object.fromEntries(agentIds.map((id) => [id, readJsonl(path.join(runDir, `agent-${id}.jsonl`))]));
    const seen = { journal, progress, transcripts, sstart: byLabel(caps, 'sstart'), sstop };
    const ctlFacts = agentFacts('q12-ctl', rep?.ctl_value, seen);
    const schemaFacts = agentFacts('q12-schema', rep?.schema_impossible, seen);
    const directFacts = agentFacts('q12-badmodel', rep?.bad_model_direct, seen, BAD_MODEL);
    const parFacts = agentFacts('q12-par-badmodel', rep?.bad_model_in_parallel, seen, BAD_MODEL);
    const note = transcript ? notified(transcript) : { found: false };
    const agrees = note.parsed && rep ? JSON.stringify(note.parsed) === JSON.stringify(rep) : null;
    const evidence = [
      `-p exit ${res.status} in ${res.ms} ms${res.timedOut ? ' (timed out)' : ''}; Workflow launches seen by PreToolUse ${launched.length}; reply ${JSON.stringify((res.json?.result ?? '').slice(0, 120))}`,
      `run record: ${run ? `status ${run.status}, ${run.agentCount} agent(s), report from ${got?.source ?? 'nowhere'}` : 'not found'}; task notification ${note.found ? `found, its result equals the report ${agrees}` : 'not found'}`,
      ...Object.entries(rep ?? {}).map(([k, v]) => `case ${k}: ${JSON.stringify(v)}`),
      `agent q12-ctl: ${JSON.stringify(ctlFacts)}`,
      `agent q12-schema: ${JSON.stringify(schemaFacts)}`,
      `agent q12-badmodel: ${JSON.stringify(directFacts)}`,
      `agent q12-par-badmodel: ${JSON.stringify(parFacts)}`,
      `SubagentStart/SubagentStop firings ${byLabel(caps, 'sstart').length}/${sstop.length}; agent types ${JSON.stringify([...new Set(sstop.map((c) => c.input?.agent_type))])}`,
    ].map(scrub);
    const observed = JSON.parse(scrub(JSON.stringify({ report: rep, source: got?.source ?? null, runStatus: run?.status ?? null, journalTypes: journal.map((j) => j.type), agents: { ctl: ctlFacts, schema: schemaFacts, direct: directFacts, parallel: parFacts }, notificationAgrees: agrees })));
    const d = decide({ launched, run, rep, facts: { ctl: ctlFacts, schema: schemaFacts, direct: directFacts, parallel: parFacts } });
    return { ...d, summary: scrub(d.summary), evidence, observed };
  },
};

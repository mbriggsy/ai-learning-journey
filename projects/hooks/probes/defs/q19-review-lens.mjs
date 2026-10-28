// Q19: does the review-lens agent file hold as the design needs it? (U4
// design 5b, D11; KTD 17.)
//
// review-lens is a file agent (frontmatter name review-lens, tools Read,
// Grep, Glob, model opus) whose tracked source is
// projects/skills/ultramode-code-review/agents/review-lens.md. Q15 VERIFIED a
// tools allowlist on Workflow agent({agentType}) for agents defined by the
// --agents flag only, with tool search off and no schema. This probe puts a
// byte copy of the source in each workspace's .claude/agents/ (the project
// source loads under lib's --setting-sources project,local; the copy's sha256
// must equal the source's, and is recorded for the landing step) and runs
// three headless sessions:
//   wf-on    a Workflow running agent({agentType: 'review-lens', schema,
//            model: 'opus'}) and a default agent({schema, model: 'opus'}),
//            tool search on (ENABLE_TOOL_SEARCH=true, the CLI default here)
//   wf-off   the same, tool search off (ENABLE_TOOL_SEARCH=false)
//   agent    an Agent-tool spawn of review-lens with no model parameter,
//            under --model sonnet, tool search on: the reference path, and
//            the frontmatter model check (an Opus must answer).
// Each session holds Read, Grep, Glob, Bash, Write and Edit (Bash, Write and
// Edit are tools a lens must not get, so a leak is visible), ToolSearch too
// where tool search is on (--tools names the whole built-in set, ToolSearch
// included: measured on 2.1.309, a pool without it under
// ENABLE_TOOL_SEARCH=true gave the session DeferredToolPlaceholder but no
// ToolSearch, and the MCP tool was offered directly), and one MCP tool
// from a logging stub server (STUB_MCP: its source is in this file, so the
// verdict hash covers it; run() writes it into the workspace and passes it by
// --mcp-config beside lib's --strict-mcp-config). Every agent is told to list
// its tools, call ToolSearch with select:<stub tool> if it has ToolSearch,
// then call the stub tool if it has it, then answer. The stub logs each call's
// tag, and a PreToolUse capture names the agent behind every call, so a call
// is the lens's only by its own agent id. The stub tool is allowed by rule
// (allow rules add no tool to an agent's pool), so an agent that holds it
// reaches it, and a leak can't hide behind a permission prompt. A PreToolUse
// hook refuses every Bash, PowerShell, Write, Edit and NotebookEdit call.
//
// Instruments (Q15's): each agent's offered tools, from its transcript's
// api-request-shape records (a copy of Q15's reader: Q15 is never edited);
// its type, from SubagentStart's agent_type, else its meta.json; its model,
// from its assistant records; the workflow's run record (script as sent, its
// result: what each agent() returned).
//
// Expected (design 5b): Read, Grep and Glob all offered to the lens, and
// nothing outside LENS_ALLOWED; ToolSearch (with its DeferredToolPlaceholder)
// tolerated only while the lens reached no MCP tool through it, and only once
// the lens tried it; the schema result returns as an object carrying the
// lens's own word; the default agent reaches the stub in both workflow
// sessions (the control: the stub ran and an agent with the tool reaches it);
// the Agent-tool spawn, given no model under a Sonnet main session, runs on an
// Opus. Verdict (decide): CONTRADICTED for any measured deviation (a leak, a
// reach, a missing allowlisted tool, a lens typed otherwise, agentType not
// resolved, a schema result that is not an object, a Sonnet-run reference);
// else INCONCLUSIVE when a record or control could not be read; else
// VERIFIED. No pin: the landing step compares the deployed copy's sha256
// with the one recorded here.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { HERE, arm, byLabel, canary, hook, readCaptures, readJsonl, runClaude, scrubber, sleep, track, transcriptFrom, write } from '../lib.mjs';

const fwd = (p) => p.replace(/\\/g, '/');
const hex = () => canary('X').split('-')[1].toLowerCase();
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

// HERE is lib.mjs's folder (projects/hooks/probes); the source sits in
// projects/skills/ultramode-code-review/agents.
export const LENS_SOURCE = path.join(HERE, '..', '..', 'skills', 'ultramode-code-review', 'agents', 'review-lens.md');
export const LENS = 'review-lens';
export const LENS_TOOLS = ['Read', 'Grep', 'Glob'];

// What the lens may be offered beside its allowlist, reviewed by hand:
// StructuredOutput, the tool a schema call answers through; advisor, which
// rides outside every allowlist (Q15, HARNESS_EXTRAS). A fixed list: a new
// name offered to the lens is a leak until it is reviewed and listed here,
// which re-hashes this def.
export const LENS_EXTRAS = ['StructuredOutput', 'advisor'];
export const LENS_ALLOWED = [...LENS_TOOLS, ...LENS_EXTRAS];

// Tool search's pair: ToolSearch loads a deferred tool, and the placeholder
// keeps deferred loading on (the CLI lists it with defer_loading: true; it
// can't be called). Both are a route to tools outside the allowlist, so the
// lens may hold them only while nothing it did through them reached an MCP
// tool.
export const TOOL_SEARCH = ['ToolSearch', 'DeferredToolPlaceholder'];

// The stub MCP server and its one tool, by the name the CLI gives it.
export const MCP_SERVER = 'q19stub';
export const MCP_TOOL = `mcp__${MCP_SERVER}__stub_log`;
const isMcp = (t) => String(t).startsWith('mcp__');

// That server: MCP over stdio, newline-delimited JSON-RPC 2.0, as Q15's, plus
// a log. initialize echoes the client's protocolVersion; a notification (no
// id) gets no reply; tools/list offers stub_log and logs the listing;
// tools/call logs the tag it was given and answers with a fixed word; ping an
// empty result; any other request a method-not-found error. The log is the
// file named by its first argument, one JSON line per event. It exits once
// its stdin ends. CommonJS (the workspace file is .cjs).
export const STUB_MCP = `'use strict';
const fs = require('fs');
const LOG = process.argv[2];
const log = (o) => { try { fs.appendFileSync(LOG, JSON.stringify(o) + '\\n'); } catch (e) { /* the probe reads what landed */ } };
const TOOL = { name: 'stub_log', description: 'Q19 probe stub: records the tag it is given and answers with a fixed word.', inputSchema: { type: 'object', properties: { tag: { type: 'string' } }, required: ['tag'] } };
const send = (msg) => process.stdout.write(JSON.stringify(Object.assign({ jsonrpc: '2.0' }, msg)) + '\\n');
const handle = (m) => {
  if (!m || typeof m !== 'object' || typeof m.method !== 'string' || m.id === undefined || m.id === null) return;
  const id = m.id;
  const p = m.params || {};
  if (m.method === 'initialize') send({ id, result: { protocolVersion: p.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: '${MCP_SERVER}', version: '1.0.0' } } });
  else if (m.method === 'tools/list') { log({ method: 'tools/list' }); send({ id, result: { tools: [TOOL] } }); }
  else if (m.method === 'tools/call') {
    const tag = p.arguments && typeof p.arguments.tag === 'string' ? p.arguments.tag : null;
    log({ method: 'tools/call', name: String(p.name), tag });
    send(p.name === TOOL.name ? { id, result: { content: [{ type: 'text', text: 'Q19_STUB_OK' }] } } : { id, error: { code: -32602, message: 'Unknown tool: ' + String(p.name) } });
  }
  else if (m.method === 'ping') send({ id, result: {} });
  else send({ id, error: { code: -32601, message: 'Method not found: ' + m.method } });
};
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    handle(m);
  }
});
`;

// Whether a copy's bytes, as read back from disk, are the source's: {ok,
// source, copy} (each a sha256).
export function sameBytes(sourceBytes, copyBytes) {
  const source = sha256(sourceBytes);
  const copy = sha256(copyBytes);
  return { ok: copy === source, source, copy };
}

// A byte copy of the lens source into <ws>/.claude/agents/, read back.
export function copyLens(src, ws) {
  const bytes = fs.readFileSync(src);
  const dst = write(path.join(ws, '.claude', 'agents', `${LENS}.md`), bytes);
  return sameBytes(bytes, fs.readFileSync(dst));
}

// The schema both workflow agents answer in. Every key required, nothing
// else allowed; no contradiction the runtime could refuse.
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tools', 'toolSearch', 'stub', 'word'],
  properties: {
    tools: { type: 'array', items: { type: 'string' } },
    toolSearch: { type: 'string', enum: ['called', 'absent'] },
    stub: { type: 'string', enum: ['called', 'unavailable'] },
    word: { type: 'string' },
  },
};

// What one lens-like agent's records say: a {tools, shapes, type, models,
// searchCalls, stubCalls} row (sessionAgents' plus its type), the PreToolUse
// captures `pre` ({tool, agentId}), the stub log, and its tag. Pure.
//   leaks      offered tools outside LENS_ALLOWED and TOOL_SEARCH
//   missing    allowlisted tools not offered
//   search     the tool-search pair members offered
//   called     every sign it called the stub tool: a PreToolUse capture of
//              the stub under its agent id (no hook fires for a tool an
//              agent was never offered), a stub call in its own transcript
//              the CLI answered without an unknown-tool refusal
//   reached    called, plus any MCP tool offered in its request shapes
//   tried      it called ToolSearch (its transcript, or a capture under its id)
//   logged     stub log calls carrying its tag (a tag alone never says who:
//              a main thread holds every prompt)
export function lensFacts(a, { pre = [], log = [], tag }) {
  const tools = a && a.shapes > 0 ? a.tools : null;
  const mine = (t) => pre.filter((c) => c.tool === t && c.agentId != null && c.agentId === a?.id);
  const called = [];
  if (mine(MCP_TOOL).length) called.push(`PreToolUse saw ${mine(MCP_TOOL).length} stub call(s) under its agent id`);
  const answered = (a?.stubCalls ?? []).filter((p) => p.answered && !/No such tool available/.test(String(p.text ?? '')));
  if (answered.length) called.push(`its transcript holds ${answered.length} stub call(s) the CLI answered`);
  const offeredMcp = tools ? tools.filter(isMcp) : [];
  return {
    tools,
    leaks: tools ? tools.filter((t) => !LENS_ALLOWED.includes(t) && !TOOL_SEARCH.includes(t)) : [],
    missing: tools ? LENS_TOOLS.filter((t) => !tools.includes(t)) : [],
    search: tools ? tools.filter((t) => TOOL_SEARCH.includes(t)) : [],
    called,
    reached: [...called, ...(offeredMcp.length ? [`its request shapes offered ${JSON.stringify(offeredMcp)}`] : [])],
    tried: (a?.searchCalls ?? []).length > 0 || mine('ToolSearch').length > 0,
    logged: log.filter((e) => e?.method === 'tools/call' && e.tag === tag).length,
  };
}

// The workflow's result for one agent() call: {kind, value} where kind is
// object (and word says whether it carries the expected word), threw (and
// unresolved says whether the error is the runtime's agent-type miss,
// "Agent type '<name>' not found", 2.1.309), text (a string: the schema did
// not apply), null (the agent died: agent() resolves null) or missing.
export function resultKind(v, word, name = LENS) {
  if (v === undefined) return { kind: 'missing' };
  if (v === null) return { kind: 'null' };
  if (typeof v === 'string') {
    if (v.startsWith('THREW: ')) return { kind: 'threw', msg: v.slice(7, 307), unresolved: v.includes(`Agent type '${name}' not found`) };
    return { kind: 'text', msg: v.slice(0, 200) };
  }
  if (typeof v === 'object' && !Array.isArray(v)) return { kind: 'object', word: v.word === word, value: v };
  return { kind: 'text', msg: JSON.stringify(v).slice(0, 200) };
}

// One workflow session's judgement: {contradicted, blind} lists of text.
// s: {name, wf: {found, intact, status}, lens, def (each a sessionAgents row
// plus type, or null), result: {lens, def} (the run record's), pre, log,
// tags: {lens, def}, words: {lens, def}, searchOn (the arm's setting)}.
export function judgeWorkflow(s) {
  const contradicted = [];
  const blind = [];
  const n = s.name;
  if (!s.wf.found || !s.wf.intact) return { contradicted, blind: [`${n}: the workflow did not run the probe's script (record ${s.wf.found ? 'found, script changed' : 'not found'})`] };
  const lr = resultKind(s.result?.lens, s.words.lens);
  if (lr.kind === 'threw' && lr.unresolved) contradicted.push(`${n}: agentType '${LENS}' did not resolve from the workspace's .claude/agents (${lr.msg})`);
  else if (lr.kind === 'text') contradicted.push(`${n}: agent({agentType, schema}) returned text, not the schema's object (${lr.msg})`);
  else if (lr.kind === 'object' && !lr.word) blind.push(`${n}: the lens returned an object without its word, so it is not shown to be the lens's own answer`);
  else if (lr.kind !== 'object') blind.push(`${n}: the lens's agent() ${lr.kind === 'threw' ? `threw (${lr.msg})` : lr.kind === 'null' ? 'resolved null (the agent died)' : 'left no result'}`);

  const L = s.lens;
  if (!L) blind.push(`${n}: no transcript for the lens was found`);
  else {
    const f = lensFacts(L, { pre: s.pre, log: s.log, tag: s.tags.lens });
    if (L.type == null) blind.push(`${n}: the lens's type was not recorded (no SubagentStart agent_type, no meta agentType)`);
    else if (L.type !== LENS) contradicted.push(`${n}: the lens ran as ${JSON.stringify(L.type)}, not ${LENS}`);
    if (!f.tools) blind.push(`${n}: no request shape for the lens was found, so its offered tools are unread`);
    else {
      if (f.leaks.length) contradicted.push(`${n}: the lens was offered ${JSON.stringify(f.leaks)} outside ${JSON.stringify(LENS_ALLOWED)} (all it was offered: ${JSON.stringify(f.tools)})`);
      if (f.missing.length) contradicted.push(`${n}: the lens was not offered its allowlisted ${JSON.stringify(f.missing)} (offered ${JSON.stringify(f.tools)})`);
      if (f.search.includes('ToolSearch') && !f.tried && !f.reached.length) blind.push(`${n}: the lens was offered ToolSearch but never called it, so whether it reaches a deferred MCP tool is unmeasured`);
    }
    if (f.reached.length) contradicted.push(`${n}: the lens reached the stub MCP tool (${f.reached.join('; ')})`);
  }

  const D = s.def;
  if (!D) blind.push(`${n}: no transcript for the default agent was found`);
  else {
    const f = lensFacts(D, { pre: s.pre, log: s.log, tag: s.tags.def });
    if (!f.tools) blind.push(`${n}: no request shape for the default agent was found`);
    else {
      if (!f.tools.includes('Bash')) blind.push(`${n}: the default agent was not offered Bash, so a pool tool leaking to the lens could not be seen (offered ${JSON.stringify(f.tools)})`);
      if (s.searchOn && !f.tools.includes('ToolSearch')) blind.push(`${n}: the default agent was not offered ToolSearch, so this arm did not run with tool search on`);
      if (!s.searchOn && f.tools.includes('ToolSearch')) blind.push(`${n}: the default agent was offered ToolSearch, so this arm did not run with tool search off`);
    }
    if (!f.called.length || !f.logged) blind.push(`${n}: the default agent did not reach the stub (its own calls ${JSON.stringify(f.called)}, stub log calls with its tag ${f.logged}), so the stub's reach is unproven`);
  }
  return { contradicted, blind };
}

// The Agent-tool session's judgement. r: {ref (the spawn's row plus type, or
// null), call ({subagentType, model} from the main transcript's Agent input,
// or null), mainModels, mainTools (the main session's offered list), pre,
// log, tag, listed (the stub's tools/list count),
// word}.
export function judgeAgent(r) {
  const contradicted = [];
  const blind = [];
  if (!r.call) return { contradicted, blind: ['agent: the main session made no Agent call'] };
  if (r.call.subagentType !== LENS) blind.push(`agent: the Agent call named ${JSON.stringify(r.call.subagentType)}, not ${LENS}`);
  if (!r.ref) return { contradicted, blind: [...blind, 'agent: no transcript for the spawned agent was found'] };
  const f = lensFacts(r.ref, { pre: r.pre, log: r.log, tag: r.tag });
  if (r.ref.type == null) blind.push('agent: the spawn\'s type was not recorded');
  else if (r.ref.type !== LENS) contradicted.push(`agent: the spawn ran as ${JSON.stringify(r.ref.type)}, not ${LENS}`);
  if (!f.tools) blind.push('agent: no request shape for the spawn was found');
  else {
    if (f.leaks.length) contradicted.push(`agent: the spawn was offered ${JSON.stringify(f.leaks)} outside ${JSON.stringify(LENS_ALLOWED)} (all: ${JSON.stringify(f.tools)})`);
    if (f.missing.length) contradicted.push(`agent: the spawn was not offered ${JSON.stringify(f.missing)} (offered ${JSON.stringify(f.tools)})`);
    if (f.search.includes('ToolSearch') && !f.tried && !f.reached.length) blind.push('agent: the spawn was offered ToolSearch but never called it');
  }
  if (f.reached.length) contradicted.push(`agent: the spawn reached the stub MCP tool (${f.reached.join('; ')})`);
  if (!r.listed) blind.push('agent: the stub server never answered tools/list in this session, so it may not have run');
  if (!(r.mainTools ?? []).includes('ToolSearch')) blind.push(`agent: the main session was not offered ToolSearch (offered ${JSON.stringify(r.mainTools ?? null)}), so this arm did not run with tool search on`);
  // The frontmatter model: only an Agent call that set no model tests it, and
  // only under a main session that ran on something other than an Opus.
  const opus = (m) => /^claude-opus-/.test(m);
  if (r.call.model !== undefined) blind.push(`agent: the Agent call passed model ${JSON.stringify(r.call.model)}, so the frontmatter model went untested`);
  else if (!r.mainModels.length || r.mainModels.some(opus)) blind.push(`agent: the main session ran on ${JSON.stringify(r.mainModels)}, not on Sonnet alone, so a spawn on Opus proves nothing`);
  else if (!r.ref.models.length) blind.push('agent: no model was recorded for the spawn');
  else if (!r.ref.models.every(opus)) contradicted.push(`agent: with no model on the call and a ${JSON.stringify(r.mainModels)} main session, review-lens ran on ${JSON.stringify(r.ref.models)}, not on an Opus: its frontmatter model lost`);
  if (!String(r.ref.last ?? '').includes(r.word)) blind.push('agent: the spawn\'s reply lacks its word');
  return { contradicted, blind };
}

// The verdict over the copy and the three sessions. Pure.
export function decide({ copies, judged }) {
  const contradicted = judged.flatMap((j) => j.contradicted);
  const blind = [...copies.filter((c) => !c.ok).map((c) => `${c.arm}: the workspace copy of review-lens.md differs from its source (${c.copy} vs ${c.source})`), ...judged.flatMap((j) => j.blind)];
  if (contradicted.length) return { verdict: 'CONTRADICTED', summary: [...contradicted, ...blind.map((b) => `also unread: ${b}`)].join('; ') };
  if (blind.length) return { verdict: 'INCONCLUSIVE', summary: blind.join('; ') };
  return { verdict: 'VERIFIED', summary: `review-lens (sha256 ${copies[0]?.source}) resolved from a project .claude/agents file as a Workflow agentType and as an Agent-tool subagent, offered Read, Grep and Glob and nothing outside ${JSON.stringify(LENS_ALLOWED)} with tool search on and off (any tool-search tool it held reached no MCP tool), returned its schema object, and reached no MCP tool while a default agent beside it reached the stub; with no model on the call under a Sonnet main session it ran on an Opus` };
}

// Q15's offered-tools reader, copied (Q15 is never edited), with each agent's
// models and its ToolSearch and stub calls added.
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

const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((b) => (typeof b === 'string' ? b : b.text ?? '')).join('\n'));

// Every tool call in a transcript, paired with its result.
function toolPairs(records) {
  const results = new Map();
  for (const r of records) for (const b of (Array.isArray(r.message?.content) ? r.message.content : [])) if (b.type === 'tool_result') results.set(b.tool_use_id, b);
  const out = [];
  for (const r of records) {
    if (r.type !== 'assistant') continue;
    for (const b of (Array.isArray(r.message?.content) ? r.message.content : [])) {
      if (b.type !== 'tool_use') continue;
      const res = results.get(b.id);
      out.push({ name: b.name, input: b.input, answered: !!res, isError: !!res?.is_error, text: res ? textOf(res.content) : null });
    }
  }
  return out;
}

const lastText = (records) => records.filter((r) => r.type === 'assistant').flatMap((r) => (Array.isArray(r.message?.content) ? r.message.content : [])).filter((b) => b.type === 'text').map((b) => b.text).at(-1) ?? '';
const modelsOf = (records) => [...new Set(records.filter((r) => r.type === 'assistant' && typeof r.message?.model === 'string' && r.message.model !== '<synthetic>').map((r) => r.message.model))];

function sessionAgents(sessionDir, mainTranscript) {
  const files = walk(sessionDir).filter((f) => /agent-[0-9a-z]+\.jsonl$/.test(f));
  const all = [mainTranscript, ...files].filter(Boolean).map((f) => ({ f, recs: readJsonl(f) }));
  const toolsOf = (recs) => [...new Set(recs.filter((r) => r.type === 'api-request-shape').flatMap((r) => (r.shape?.tools ?? []).map((t) => (typeof t === 'string' ? t : t.name))))];
  const shapesOf = (recs) => recs.filter((r) => r.type === 'api-request-shape').length;
  const agents = all.slice(1).map(({ f, recs }) => {
    const id = /agent-([0-9a-z]+)\.jsonl$/.exec(f)[1];
    let meta = null;
    try { meta = JSON.parse(fs.readFileSync(f.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch { /* none */ }
    const pairs = toolPairs(recs);
    return { id, meta, tools: toolsOf(recs), shapes: shapesOf(recs), models: modelsOf(recs), last: lastText(recs), searchCalls: pairs.filter((p) => p.name === 'ToolSearch'), stubCalls: pairs.filter((p) => p.name === MCP_TOOL) };
  });
  const mainRecs = all[0]?.recs ?? [];
  return { mainRecs, mainTools: toolsOf(mainRecs), mainModels: modelsOf(mainRecs), agents };
}

export const POOL = ['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit'];
// The pool of a session with tool search on (see the header).
export const SEARCH_POOL = [...POOL, 'ToolSearch'];
const DENY_MATCH = 'Bash|PowerShell|Write|Edit|NotebookEdit';
export const DENY_REASON = 'Q19 probe: this tool call is recorded and refused.';
const DENY = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: DENY_REASON } };

// The task every probed agent gets: no quote, apostrophe or backslash in it,
// so it sits whole inside a workflow script's single-quoted string.
export const probeTask = (tag, word, schema) => [
  `Tool access probe ${tag}, an automated test of which tools you can reach. Do exactly these steps, in order, and nothing else.`,
  'Step 1: note the exact name of every tool you can call right now.',
  `Step 2: if a tool named ToolSearch is among them, call it once with the query select:${MCP_TOOL} and nothing else.`,
  `Step 3: if a tool named ${MCP_TOOL} is now available to you, call it once with the tag ${tag}.`,
  schema
    ? `Step 4: call no other tool, and finish with your structured output: tools, the tool names from step 1 plus any tool step 2 loaded; toolSearch, called if you made the step 2 call, else absent; stub, called if you made the step 3 call, else unavailable; word, exactly ${word}.`
    : `Step 4: call no other tool, and finish with exactly one line: TOOLS: the tool names from step 1 plus any tool step 2 loaded, comma-separated; TOOLSEARCH: called or absent; STUB: called or unavailable; WORD: ${word}`,
].join(' ');

export const WF_MS = 480_000;
export const AGENT_MS = 360_000;
export const PROBE_MS = 2 * WF_MS + AGENT_MS + 10 * 60_000;

export default {
  id: 'Q19',
  question: 'Does the review-lens agent file, from a project .claude/agents folder, resolve as a Workflow agentType with its Read, Grep and Glob allowlist (MCP tools and the tool-search route to them included) and a schema, and does its frontmatter model put an Agent-tool spawn on an Opus under a Sonnet main session?',
  assumption: 'A Workflow agent({agentType: \'review-lens\', schema, model: \'opus\'}) and an Agent-tool spawn of review-lens are each offered Read, Grep and Glob and nothing outside them, StructuredOutput and advisor (ToolSearch only while it reaches no MCP tool), with tool search on or off; the schema result returns; neither reaches an MCP tool that a default agent beside them reaches; and an Agent spawn with no model under --model sonnet runs on an Opus.',
  loadBearing: false,
  timeoutMs: PROBE_MS,
  async run(ctx) {
    const roots = [];
    const ids = scrubber();
    const scrub = (s) => {
      let t = String(s);
      for (const [abs, label] of roots) for (const v of new Set([abs, fwd(abs), abs.replace(/\\/g, '\\\\'), fwd(abs).replace(/\//g, '\\\\')])) t = t.split(v).join(label);
      return ids(t);
    };
    const evidence = [];
    const copies = [];
    const judged = [];
    const observed = {};
    if (!fs.existsSync(LENS_SOURCE)) return { verdict: 'INCONCLUSIVE', summary: 'the review-lens source (projects/skills/ultramode-code-review/agents/review-lens.md) is missing, so there is nothing to test', evidence, observed };

    // One session's workspace: the lens copy, the stub, its config and log.
    const setup = (name) => {
      const A = arm(ctx, name);
      roots.unshift([A.ws, `<ws-${name}>`]);
      const c = { arm: name, ...copyLens(LENS_SOURCE, A.ws) };
      copies.push(c);
      const stub = write(path.join(A.ws, 'q19-stub-mcp.cjs'), STUB_MCP);
      const logFile = path.join(A.out, 'stub-log.jsonl');
      const mcp = write(path.join(A.out, 'mcp.json'), JSON.stringify({ mcpServers: { [MCP_SERVER]: { type: 'stdio', command: process.execPath, args: [fwd(stub), fwd(logFile)] } } }, null, 2));
      const settings = {
        permissions: { allow: [MCP_TOOL] },
        hooks: {
          SessionStart: [{ hooks: [hook(A.out, 'ss')] }],
          PreToolUse: [{ matcher: '*', hooks: [hook(A.out, 'pre')] }, { matcher: DENY_MATCH, hooks: [hook(A.out, 'deny', { respond: DENY })] }],
          SubagentStart: [{ hooks: [hook(A.out, 'sub-start')] }],
          SubagentStop: [{ hooks: [hook(A.out, 'sub-stop')] }],
        },
      };
      return { ...A, copy: c, logFile, mcpArgs: ['--mcp-config', fwd(mcp)], settings };
    };
    // A finished session's records, read the way Q15 reads them.
    const read = (A) => {
      const caps = readCaptures(A.out);
      track(ctx, caps);
      const t = transcriptFrom(caps);
      const dir = t ? t.replace(/\.jsonl$/, '') : null;
      if (dir) roots.unshift([dir, '<session>'], [path.dirname(t), '<project>']);
      const S = sessionAgents(dir, t);
      const types = Object.fromEntries(byLabel(caps, 'sub-start').map((c) => [c.input?.agent_id, c.input?.agent_type]));
      const typed = (a) => (a ? { ...a, type: types[a.id] ?? a.meta?.agentType ?? null } : null);
      const pre = byLabel(caps, 'pre').map((c) => ({ tool: c.input?.tool_name, agentId: c.input?.agent_id ?? null, agentType: c.input?.agent_type ?? null }));
      const log = readJsonl(A.logFile);
      return { caps, t, dir, S, typed, pre, log, types };
    };
    const row = (a) => (a ? { id: a.id.slice(0, 6), type: a.type, tools: a.tools, shapes: a.shapes, models: a.models, toolSearch: a.searchCalls.map((p) => ({ input: p.input, answered: p.answered, isError: p.isError, text: String(p.text ?? '').slice(0, 160) })), stub: a.stubCalls.map((p) => ({ answered: p.answered, isError: p.isError, text: String(p.text ?? '').slice(0, 80) })), last: a.last.slice(0, 200) } : null);

    // The two workflow sessions.
    for (const [name, searchOn] of [['wf-on', true], ['wf-off', false]]) {
      const A = setup(name);
      const id = hex();
      const tags = { lens: `LENS${id.toUpperCase()}`, def: `DEF${id.toUpperCase()}` };
      const words = { lens: canary('LENSWORD'), def: canary('DEFWORD') };
      const tasks = { lens: probeTask(tags.lens, words.lens, true), def: probeTask(tags.def, words.def, true) };
      if (Object.values(tasks).some((t) => /['"\\\n]/.test(t))) throw new Error('a probe task holds a quote, a backslash or a newline, which the workflow script cannot carry');
      const wfName = `zzprobe-q19-lens-${id}`;
      const script = [
        `export const meta = { name: '${wfName}', description: 'Q19 probe: review-lens as a workflow agentType' }`,
        `const SCHEMA = ${JSON.stringify(SCHEMA)}`,
        'const out = {}',
        "const cap = async (k, f) => { try { out[k] = await f() } catch (e) { out[k] = 'THREW: ' + String((e && e.message) || e).slice(0, 400) } }",
        `await cap('lens', () => agent('${tasks.lens}', { label: 'lens', agentType: '${LENS}', schema: SCHEMA, model: 'opus' }))`,
        `await cap('def', () => agent('${tasks.def}', { label: 'def', schema: SCHEMA, model: 'opus' }))`,
        'return out',
      ].join('\n');
      const prompt = `Run a workflow now with the Workflow tool, passing exactly this script as the script parameter (I am explicitly asking for a workflow):\n\n${script}\n\nOnce it has launched, do not wait for it or check on it, and call no other tool: reply with the single word launched.`;
      const res = runClaude({ cwd: A.ws, out: A.out, prompt, settings: A.settings, args: [...A.mcpArgs, '--tools', ['Workflow', ...(searchOn ? SEARCH_POOL : POOL)].join(','), '--allowedTools', 'Workflow', '--permission-mode', 'default', '--permission-prompts', 'none'], env: { ENABLE_TOOL_SEARCH: searchOn ? 'true' : 'false' }, timeoutMs: WF_MS });
      const X = read(A);
      const recs = walk(X.dir && path.join(X.dir, 'workflows')).filter((f) => f.endsWith('.json')).map((f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }).filter(Boolean);
      const wfRec = recs.find((r) => r.workflowName === wfName) ?? null;
      const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
      const intact = !!wfRec && norm(wfRec.script) === norm(script);
      let result = wfRec?.result ?? null;
      if (typeof result === 'string') { try { result = JSON.parse(result); } catch { /* kept as text */ } }
      const labelToId = Object.fromEntries((wfRec?.workflowProgress ?? []).filter((x) => x.type === 'workflow_agent').map((x) => [x.label, x.agentId]));
      const byLabelId = (label) => X.typed(X.S.agents.find((x) => x.id === labelToId[label]) ?? null);
      const lens = byLabelId('lens');
      const def = byLabelId('def');
      const s = { name, wf: { found: !!wfRec, intact, status: wfRec?.status ?? null }, lens, def, result: result && typeof result === 'object' ? result : {}, pre: X.pre, log: X.log, tags, words, searchOn };
      const j = judgeWorkflow(s);
      judged.push(j);
      observed[name] = { wf: s.wf, lens: row(lens), def: row(def), result, pre: X.pre, log: X.log, types: X.types, judged: j };
      evidence.push(
        `${name}: exit ${res.status} in ${res.ms} ms${res.timedOut ? ' (timed out)' : ''}, ENABLE_TOOL_SEARCH=${searchOn}, review-lens copy sha256 ${A.copy.copy} (source ${A.copy.source}); run record ${wfRec ? `${wfRec.runId} ${wfRec.status}, script as sent ${intact}` : 'not found'}; main offered ${JSON.stringify(X.S.mainTools)}`,
        `${name} lens: ${JSON.stringify(row(lens))}; facts ${JSON.stringify(lens ? lensFacts(lens, { pre: X.pre, log: X.log, tag: tags.lens }) : null)}; agent() returned ${JSON.stringify(result?.lens ?? null).slice(0, 400)}`,
        `${name} default: ${JSON.stringify(row(def))}; facts ${JSON.stringify(def ? lensFacts(def, { pre: X.pre, log: X.log, tag: tags.def }) : null)}; agent() returned ${JSON.stringify(result?.def ?? null).slice(0, 300)}`,
        `${name} stub log ${JSON.stringify(X.log)}; PreToolUse ${JSON.stringify(X.pre)}; SubagentStart types ${JSON.stringify(Object.values(X.types))}`,
      );
      await sleep(1500);
    }

    // The Agent-tool session: the reference path and the model check.
    {
      const A = setup('agent');
      const id = hex();
      const tag = `REF${id.toUpperCase()}`;
      const word = canary('REFWORD');
      const task = probeTask(tag, word, false);
      const prompt = [
        `Make exactly one Agent tool call: subagent_type "${LENS}", description "lens probe", and as its prompt, word for word, the text between the two dashed lines below. Do not pass a model, run_in_background or any other optional parameter. Use no other tool. When the agent has finished, reply with its reply verbatim.`,
        '-----',
        task,
        '-----',
      ].join('\n');
      const res = runClaude({ cwd: A.ws, out: A.out, prompt, settings: A.settings, args: [...A.mcpArgs, '--tools', ['Agent', ...SEARCH_POOL].join(','), '--allowedTools', 'Agent', '--model', 'sonnet', '--permission-mode', 'default', '--permission-prompts', 'none'], env: { ENABLE_TOOL_SEARCH: 'true' }, timeoutMs: AGENT_MS });
      const X = read(A);
      const calls = toolPairs(X.S.mainRecs).filter((p) => p.name === 'Agent');
      const call = calls[0] ? { subagentType: calls[0].input?.subagent_type ?? null, model: calls[0].input?.model, keys: Object.keys(calls[0].input ?? {}) } : null;
      // The one agent the call spawned; with more than one transcript, the
      // one that ran as review-lens, else none (an extra agent must never
      // stand in for the spawn).
      const ref = X.typed(X.S.agents.length === 1 ? X.S.agents[0] : X.S.agents.map(X.typed).find((a) => a.type === LENS) ?? null);
      const r = { ref, call, mainModels: X.S.mainModels, mainTools: X.S.mainTools, pre: X.pre, log: X.log, tag, word, listed: X.log.filter((e) => e?.method === 'tools/list').length };
      const j = judgeAgent(r);
      judged.push(j);
      observed.agent = { call, calls: calls.length, ref: row(ref), mainModels: X.S.mainModels, pre: X.pre, log: X.log, judged: j };
      evidence.push(
        `agent: exit ${res.status} in ${res.ms} ms${res.timedOut ? ' (timed out)' : ''}, --model sonnet, ENABLE_TOOL_SEARCH=true, review-lens copy sha256 ${A.copy.copy}; ${calls.length} Agent call(s), first ${JSON.stringify(call)}; main models ${JSON.stringify(X.S.mainModels)}; main offered ${JSON.stringify(X.S.mainTools)}; ${X.S.agents.length} agent transcript(s)`,
        `agent spawn: ${JSON.stringify(row(ref))}; facts ${JSON.stringify(ref ? lensFacts(ref, { pre: X.pre, log: X.log, tag }) : null)}; main reply ${JSON.stringify(String(res.json?.result ?? '').slice(0, 300))}`,
        `agent stub log ${JSON.stringify(X.log)}; PreToolUse ${JSON.stringify(X.pre)}`,
      );
    }

    const d = decide({ copies, judged });
    return { verdict: d.verdict, summary: scrub(d.summary), evidence: evidence.map(scrub), observed: JSON.parse(scrub(JSON.stringify({ copies, ...observed }))) };
  },
};

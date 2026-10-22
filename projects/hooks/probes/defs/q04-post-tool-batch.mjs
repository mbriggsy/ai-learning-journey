// Q4: does PostToolBatch fire inside Agent-tool subagents and Workflow agents,
// and does its input there carry the parent's session_id and transcript_path
// plus the agent's agent_id and agent_type?
//
// Three headless runs, each in its own workspace holding a.txt and b.txt, with
// exec-form capture hooks on SessionStart, PreToolUse, PostToolUse,
// PostToolUseFailure, PostToolBatch, SubagentStart, SubagentStop and Stop
// (no matcher, so every occurrence fires):
//   main      the main thread reads both files in one parallel batch: the
//             positive control that PostToolBatch fires at all
//   agent     one foreground general-purpose Agent-tool subagent does the reads
//   workflow  one Workflow agent does the reads
// A capture with no agent_id is the main thread's. The instrument joins on
// tool_use_id: every Read the subagent's PreToolUse saw must sit in exactly
// one PostToolBatch's tool_calls, and that batch must carry the subagent's
// agent_id. In the agent and workflow arms the main thread's own batch for
// its Agent or Workflow call is a second positive control. The agent_id is
// checked against a source outside the tool events: SubagentStart's agent_id
// for the Agent tool, the run journal's started records for the workflow.
// So is the join key: every tool_use_id the hooks reported must be one the
// arm's own transcripts record (the main transcript for main-thread calls,
// agent-<agent_id>.jsonl under the session folder for an agent's). Either
// source coming back empty is a blind instrument, so a control, never a
// contradiction. The main session id is the -p result's session_id. Ids and
// paths are compared, never printed.
//
// Each agent's batch must carry the agent_type pinned for its arm
// (EXPECTED_AGENT_TYPE), and the agent arm's Agent call must have asked for
// that subagent_type, or the model chose the type and the pin has nothing to
// match. Agents fire SubagentStop, never Stop: a Stop capture carrying an
// agent_id is a no, while an agent that fired no SubagentStop settles nothing
// (one that died fires none, Q12).
//
// A run that failed or timed out before a batch came due decides nothing
// about that batch: PostToolBatch missing from it is unsettled, not a no.
import fs from 'node:fs';
import path from 'node:path';
import { arm, byLabel, canary, failure, hook, readCaptures, readJsonl, runClaude, scrubber, sleep, track, write } from '../lib.mjs';

const EVENTS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PostToolBatch', 'SubagentStart', 'SubagentStop', 'Stop'];

// The agent_type each arm's agent carries, as Q4 measured it on 2.1.306: the
// subagent_type the Agent call named for an Agent-tool subagent, the CLI's own
// name for a Workflow agent. Pinned, not merely "a non-empty string": a
// renamed value must read as CONTRADICTED (passedOn fails, the safe side),
// never re-VERIFY under a hook that keys on it.
export const EXPECTED_AGENT_TYPE = { agent: 'general-purpose', workflow: 'workflow-subagent' };

const fwd = (p) => p.replace(/\\/g, '/');

const readTask = (a, b) => `In ONE assistant message, call the Read tool twice in parallel (both calls in that same message): once with file_path ${a} and once with file_path ${b}. Then reply with exactly DONE. Use no other tools.`;

function prompts(a, b) {
  const task = readTask(a, b);
  const script = [
    "export const meta = { name: 'probe-q4-batch', description: 'Q4 probe: one workflow agent, two parallel reads' }",
    `return await agent(${JSON.stringify(task)}, { label: 'q4-reader' })`,
  ].join('\n');
  return {
    main: task,
    agent: `Make exactly one Agent tool call, with subagent_type "general-purpose", and wait for its result: run it in the foreground, not in the background. Give the subagent exactly this task: "${task}" Make no other tool calls yourself. When the subagent has returned, reply with exactly DONE.`,
    workflow: `Run a workflow now with the Workflow tool, passing exactly this script as the script parameter (I am explicitly asking for a workflow):\n\n${script}\n\nMake no other tool calls yourself. When the workflow has finished, reply with the single word finished.`,
  };
}

// The run journals under the main session's folder: agent id -> agentType
// from each agent's meta file, for every agent a started record names.
function journalAgents(mainTranscript) {
  const found = {};
  if (!mainTranscript) return found;
  const wfDir = path.join(mainTranscript.replace(/\.jsonl$/, ''), 'subagents', 'workflows');
  if (!fs.existsSync(wfDir)) return found;
  for (const run of fs.readdirSync(wfDir)) {
    for (const r of readJsonl(path.join(wfDir, run, 'journal.jsonl'))) {
      if (r.type !== 'started' || !r.agentId) continue;
      let meta = null;
      try { meta = JSON.parse(fs.readFileSync(path.join(wfDir, run, `agent-${r.agentId}.meta.json`), 'utf8')); } catch { /* no meta file */ }
      found[r.agentId] = meta?.agentType ?? null;
    }
  }
  return found;
}

// These agents' transcripts, wherever under the session folder the CLI keeps
// them (subagents/ for the Agent tool, subagents/workflows/<run>/ for a
// workflow on 2.1.306).
function agentTranscripts(mainTranscript, ids) {
  const found = [];
  const walk = (dir) => {
    for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (ids.some((id) => e.name === `agent-${id}.jsonl`)) found.push(p);
    }
  };
  if (mainTranscript) walk(mainTranscript.replace(/\.jsonl$/, ''));
  return found;
}

// Every tool_use id these transcripts' assistant messages record.
const toolUseIds = (files) => new Set(files.flatMap((f) => readJsonl(f)).filter((r) => r.type === 'assistant').flatMap((r) => (Array.isArray(r.message?.content) ? r.message.content : [])).filter((b) => b.type === 'tool_use').map((b) => b.id));

// One arm's row from its captures, its -p result and the transcripts the
// captures name. Exported for tests/verdicts-sources.test.mjs, which plants
// all three.
export function analyze(name, caps, res) {
  const inp = (c) => c.input ?? {};
  const mainCaps = caps.filter((c) => !inp(c).agent_id);
  const mainSession = res.json?.session_id ?? null;
  const mainTranscript = mainCaps.map((c) => inp(c).transcript_path).find(Boolean) ?? null;
  const sessionDir = mainTranscript ? fwd(mainTranscript).replace(/\.jsonl$/, '') : null;
  const inSession = (p) => (sessionDir && fwd(p).startsWith(`${sessionDir}/`) ? `<session>${fwd(p).slice(sessionDir.length)}` : 'outside the session folder');
  const batches = byLabel(caps, 'PostToolBatch').map((c) => ({
    agentId: inp(c).agent_id ?? null,
    agentType: inp(c).agent_type ?? null,
    sameSession: !!mainSession && inp(c).session_id === mainSession,
    sameTranscript: !!mainTranscript && inp(c).transcript_path === mainTranscript,
    ids: (inp(c).tool_calls ?? []).map((t) => t.tool_use_id),
    tools: (inp(c).tool_calls ?? []).map((t) => t.tool_name),
  }));
  const pre = byLabel(caps, 'PreToolUse').map((c) => ({ id: inp(c).tool_use_id, tool: inp(c).tool_name, agentId: inp(c).agent_id ?? null, agentType: inp(c).agent_type ?? null, asked: inp(c).tool_input?.subagent_type ?? null }));
  const covering = (id) => batches.filter((b) => b.ids.includes(id));
  const mainReads = pre.filter((p) => !p.agentId && p.tool === 'Read');
  const launcher = name === 'agent' ? 'Agent' : name === 'workflow' ? 'Workflow' : null;
  const launches = launcher ? pre.filter((p) => !p.agentId && p.tool === launcher) : [];
  const subReads = pre.filter((p) => p.agentId && p.tool === 'Read');
  const coverMain = (ps) => ps.length > 0 && ps.every((p) => { const cv = covering(p.id); return cv.length === 1 && cv[0].agentId === null; });
  const reads = subReads.map((p) => {
    const cv = covering(p.id);
    return { agentId: p.agentId, batches: cv.length, attributed: cv.length > 0 && cv.every((b) => b.agentId === p.agentId), batch: cv[0] ?? null };
  });
  const subBatches = batches.filter((b) => subReads.some((p) => b.ids.includes(p.id)));
  const subAgentIds = [...new Set(subReads.map((p) => p.agentId))];
  const independent = name === 'agent'
    ? Object.fromEntries(byLabel(caps, 'SubagentStart').filter((c) => inp(c).agent_id).map((c) => [inp(c).agent_id, inp(c).agent_type ?? null]))
    : name === 'workflow' ? journalAgents(mainTranscript) : {};
  const lifecycle = (label) => byLabel(caps, label).filter((c) => subAgentIds.includes(inp(c).agent_id)).map((c) => ({ agentType: inp(c).agent_type ?? null, sameSession: inp(c).session_id === mainSession, sameTranscript: inp(c).transcript_path === mainTranscript, agentTranscript: inp(c).agent_transcript_path ? inSession(inp(c).agent_transcript_path) : null }));
  // The join key against the transcripts: main-thread ids in the main one,
  // each agent's in its own.
  const mainIds = toolUseIds(mainTranscript ? [mainTranscript] : []);
  const agentIds = toolUseIds(agentTranscripts(mainTranscript, subAgentIds));
  const joined = [...mainReads.map((p) => [p.id, mainIds]), ...launches.map((p) => [p.id, mainIds]), ...subReads.map((p) => [p.id, agentIds])];
  return {
    exit: res.status, ms: res.ms, timedOut: res.timedOut, failed: failure(res), reply: (res.json?.result ?? '').slice(0, 120),
    mainSession: !!mainSession,
    ownIdsSeen: joined.length > 0 && joined.every(([id, seen]) => !!id && seen.has(id)),
    ownIdsJoined: joined.length,
    mainSessionConsistent: !!mainSession && mainCaps.every((c) => !inp(c).session_id || inp(c).session_id === mainSession),
    events: Object.fromEntries(EVENTS.map((e) => [e, { main: byLabel(mainCaps, e).length, agent: byLabel(caps, e).length - byLabel(mainCaps, e).length }])),
    mainReads: mainReads.length,
    mainReadsCovered: coverMain(mainReads),
    mainBatches: batches.filter((b) => b.agentId === null).map((b) => b.tools),
    launches: launches.length,
    launchTypes: [...new Set(launches.map((p) => p.asked))],
    launchCovered: coverMain(launches),
    subReads: subReads.length,
    subAgentIds: subAgentIds.length,
    everyReadInOneBatch: reads.length > 0 && reads.every((r) => r.batches === 1),
    everyReadInSomeBatch: reads.length > 0 && reads.every((r) => r.batches >= 1),
    attributed: reads.length > 0 && reads.every((r) => r.attributed),
    subBatchSizes: subBatches.map((b) => b.ids.length),
    subBatchSameSession: subBatches.length > 0 && subBatches.every((b) => b.sameSession),
    subBatchSameTranscript: subBatches.length > 0 && subBatches.every((b) => b.sameTranscript),
    subBatchAgentTypes: [...new Set(subBatches.map((b) => b.agentType))],
    preAgentTypes: [...new Set(subReads.map((p) => p.agentType))],
    independentSource: name === 'agent' ? 'SubagentStart' : name === 'workflow' ? 'run journal' : null,
    independentIds: Object.keys(independent).length,
    independentTypes: [...new Set(Object.values(independent))],
    idsMatchIndependent: subAgentIds.length > 0 && subAgentIds.every((id) => id in independent),
    subagentStart: lifecycle('SubagentStart'),
    subagentStop: lifecycle('SubagentStop'),
    // Any agent's, not only the reading one's: no agent may fire Stop.
    stopInAgent: byLabel(caps, 'Stop').filter((c) => inp(c).agent_id).length,
  };
}

// The verdict from the three arms' rows: analyze()'s, or planted ones in
// tests/verdicts-sources.test.mjs. Pure; `scrub` is the probe's scrubber.
export function decide(rows, scrub) {
  const { main: A, agent: B, workflow: C } = rows;
  const line = (k, r) => scrub(`${k}: exit ${r.exit} in ${r.ms} ms, run ${r.failed ?? 'ended on a result'}, reply ${JSON.stringify(r.reply)}; tool_use ids the hooks joined on that its transcripts record ${r.ownIdsSeen} (${r.ownIdsJoined} joined); events main/agent ${JSON.stringify(r.events)}`);
  const sub = (k, r) => scrub(`${k}: ${r.launches} launch call(s) asking subagent_type ${JSON.stringify(r.launchTypes)}, main batch covers it ${r.launchCovered}; ${r.subReads} Read(s) by ${r.subAgentIds} agent(s); each in exactly one PostToolBatch ${r.everyReadInOneBatch} (in some batch ${r.everyReadInSomeBatch}), batch agent_id = the Read's ${r.attributed}; batch sizes ${JSON.stringify(r.subBatchSizes)}; batch session_id = main ${r.subBatchSameSession}, transcript_path = main ${r.subBatchSameTranscript}, agent_type ${JSON.stringify(r.subBatchAgentTypes)}; agent_id named by ${r.independentSource} ${r.idsMatchIndependent} (${r.independentIds} id(s) named, types ${JSON.stringify(r.independentTypes)}); SubagentStart ${JSON.stringify(r.subagentStart)}; SubagentStop ${JSON.stringify(r.subagentStop)}; Stop with an agent_id ${r.stopInAgent}`);
  const evidence = [
    line('main', A), line('agent', B), line('workflow', C),
    scrub(`main: ${A.mainReads} Read(s), each in exactly one PostToolBatch with no agent_id ${A.mainReadsCovered}; main-thread batches ${JSON.stringify(A.mainBatches)}; main captures share the result's session_id ${A.mainSessionConsistent}`),
    sub('agent', B), sub('workflow', C),
  ];
  const controls = [
    [A.mainReads > 0, 'the main arm never read a file'],
    [A.mainReadsCovered, 'the main arm\'s Reads were not each in one main-thread PostToolBatch'],
    [A.ownIdsSeen, 'the main arm\'s Read tool_use ids are not the ones its transcript records'],
    [B.launches > 0, 'the agent arm made no Agent call'],
    [B.launchCovered, 'no main-thread PostToolBatch covered the Agent call'],
    [B.launchTypes.length === 1 && B.launchTypes[0] === EXPECTED_AGENT_TYPE.agent, `the agent arm's Agent call asked for subagent_type ${JSON.stringify(B.launchTypes)}, not ${JSON.stringify(EXPECTED_AGENT_TYPE.agent)}, so the model chose the subagent's agent_type and the pinned one has nothing to match`],
    [B.subReads > 0, 'the Agent-tool subagent made no Read the hooks saw'],
    [B.mainSession, 'the agent arm\'s run gave no session_id to check its batch against'],
    [B.independentIds > 0, 'SubagentStart named no agent_id, so the subagent\'s agent_id has nothing outside the tool events to match'],
    [B.ownIdsSeen, 'the agent arm\'s tool_use ids are not the ones its transcripts record'],
    [C.launches > 0, 'the workflow arm made no Workflow call'],
    [C.launchCovered, 'no main-thread PostToolBatch covered the Workflow call'],
    [C.subReads > 0, 'the workflow agent made no Read the hooks saw'],
    [C.mainSession, 'the workflow arm\'s run gave no session_id to check its batch against'],
    [C.independentIds > 0, 'the run journal named no agent, so the workflow agent\'s agent_id has nothing outside the tool events to match'],
    [C.ownIdsSeen, 'the workflow arm\'s tool_use ids are not the ones its transcripts record'],
  ].filter(([ok]) => !ok).map(([, why]) => why);
  const observed = JSON.parse(scrub(JSON.stringify(rows)));
  if (controls.length) return { verdict: 'INCONCLUSIVE', summary: `a control failed: ${controls.join('; ')}`, evidence, observed };
  const failures = [];
  const unsettled = [];
  for (const [k, name, r] of [['Agent-tool subagent', 'agent', B], ['workflow agent', 'workflow', C]]) {
    const want = EXPECTED_AGENT_TYPE[name];
    if (!r.everyReadInSomeBatch) (r.failed ? unsettled : failures).push(`${k}: PostToolBatch did not fire for its Reads${r.failed ? `, but the run ${r.failed}, so the batch may never have come due` : ''}`);
    else if (!r.everyReadInOneBatch) failures.push(`${k}: a Read sat in more than one PostToolBatch`);
    if (r.everyReadInSomeBatch && !r.attributed) failures.push(`${k}: its batch lacked its agent_id`);
    if (r.everyReadInSomeBatch && !r.subBatchSameSession) failures.push(`${k}: its batch session_id is not the main session's`);
    if (r.everyReadInSomeBatch && !r.subBatchSameTranscript) failures.push(`${k}: its batch transcript_path is not the main transcript`);
    if (r.everyReadInSomeBatch && (r.subBatchAgentTypes.length !== 1 || r.subBatchAgentTypes[0] !== want)) failures.push(`${k}: its batch agent_type is ${JSON.stringify(r.subBatchAgentTypes)}, not the pinned ${JSON.stringify(want)}`);
    if (!r.idsMatchIndependent) failures.push(`${k}: its agent_id is not the one ${r.independentSource} names`);
    // A Stop inside an agent is a no however the run ended. No SubagentStop
    // decides nothing, as an agent that died fires none (Q12). The main
    // thread's Stop count is never read: the workflow arm's main thread stops
    // twice, legitimately.
    if (r.stopInAgent > 0) failures.push(`${k}: Stop fired inside the agent (${r.stopInAgent} Stop firing(s) carried an agent_id)`);
    if (!r.subagentStop.length) unsettled.push(`${k}: no SubagentStop fired for it${r.failed ? ` (the run ${r.failed})` : ''}, and an agent that died fires none, so whether agents fire SubagentStop is unsettled`);
  }
  const types = `agent_type ${JSON.stringify(B.subBatchAgentTypes)} for the Agent-tool subagent and ${JSON.stringify(C.subBatchAgentTypes)} for the workflow agent`;
  const lifecycle = `SubagentStart/SubagentStop/Stop with an agent_id: ${B.subagentStart.length}/${B.subagentStop.length}/${B.stopInAgent} for the Agent-tool subagent, ${C.subagentStart.length}/${C.subagentStop.length}/${C.stopInAgent} for the workflow agent`;
  if (failures.length) return { verdict: 'CONTRADICTED', summary: scrub(`${failures.join('; ')} (${types}; ${lifecycle})`), evidence, observed };
  if (unsettled.length) return { verdict: 'INCONCLUSIVE', summary: scrub(`${unsettled.join('; ')} (${types}; ${lifecycle})`), evidence, observed };
  return { verdict: 'VERIFIED', summary: scrub(`PostToolBatch fired once per batch in both, each with the main session_id and transcript_path, the agent's own agent_id (checked against SubagentStart and the run journal) and its pinned agent_type; each agent fired SubagentStop and no Stop; ${types}; ${lifecycle}`), evidence, observed };
}

export default {
  id: 'Q4',
  question: 'Does PostToolBatch fire inside workflow agents (and Agent-tool subagents), and does their hook input carry the parent session_id plus agent_id?',
  assumption: "PostToolBatch fires once per tool batch inside Agent-tool subagents and Workflow agents, and the hook input there carries the parent session's session_id and transcript_path plus the agent's agent_id and agent_type (general-purpose for an Agent-tool subagent launched as that subagent_type, workflow-subagent for a Workflow agent); and agents fire SubagentStop, never Stop.",
  loadBearing: true,
  async run(ctx) {
    const rows = {};
    for (const [name, tools] of [['main', 'Read'], ['agent', 'Agent,Read'], ['workflow', 'Workflow,Read']]) {
      const { ws, out } = arm(ctx, name);
      const a = fwd(write(path.join(ws, 'a.txt'), `${canary('ALPHA')}\n`));
      const b = fwd(write(path.join(ws, 'b.txt'), `${canary('BRAVO')}\n`));
      const settings = { hooks: Object.fromEntries(EVENTS.map((e) => [e, [{ hooks: [hook(out, e)] }]])) };
      const res = runClaude({ cwd: ws, out, prompt: prompts(a, b)[name], settings, args: ['--tools', tools, '--allowedTools', tools], timeoutMs: 420_000 });
      const caps = readCaptures(out);
      track(ctx, caps);
      rows[name] = analyze(name, caps, res);
      await sleep(1500);
    }
    // Results go into evidence; none may carry a session id or a home path.
    return decide(rows, scrubber());
  },
};

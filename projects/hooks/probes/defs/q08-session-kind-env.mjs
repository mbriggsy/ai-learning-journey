// Q8: what do CLAUDE_CODE_ENTRYPOINT and CLAUDE_CODE_SESSION_ATTENDED read in
// a hook process, per session kind?
//
// Four arms, each in its own workspace, each with capture hooks on
// SessionStart, UserPromptSubmit, PreToolUse, PostToolUse (Bash),
// SubagentStart, SubagentStop, Stop and SessionEnd. capture.mjs records the
// CLAUDE* env every hook process sees.
//   p-json      claude -p --output-format json
//   p-stream    claude -p over stream-json, one turn
//   workflow    claude -p whose model launches a Workflow; its one agent runs
//               the env script, so hooks fire inside the agent (agent_id set)
//   bg          claude --bg started from this script. The docs say a folder
//               nobody trusted is refused there ("Workspace not trusted",
//               permissions.md:760), which leaves the arm BLOCKED, not a guess
// In every session something runs `node q8env.js`, which prints the Bash
// tool's own CLAUDE* env; the PostToolUse capture holds that output and the
// hook's env side by side. A post whose output carries that env, from the
// session its hook fired in, is a reading. Readings that agree with their
// hook env are the bridge to the interactive kind, which no script can start.
// A Bash call that printed no reading (the model ran a cat first, say) is no
// evidence either way; an arm with no reading leaves the bridge unread there,
// and a reading that disagrees with its hook env is a measured mismatch.
// The interactive kind's reading is this runner's own env, read
// at start: run.mjs launched from a Bash tool in an attended interactive
// session (the pilot's, or a workflow agent's inside it) carries that Bash
// env, and cli / 1 there, carried over by the bridge, is the interactive
// reading measured in this run. That session keeps the binary it started on
// after an update replaces the one on PATH, so its own version is read too
// (launcherVersion) and must be this run's. Launched anywhere else, or from a
// session on another version, that arm is BLOCKED.
// VERIFIED needs every kind the assumption names measured in this run.
//
// Workflow agents run only in the -p workflow arm, where the main thread and
// its agents both read sdk-cli / 0. A CLI that pinned every agent to sdk-cli /
// 0 reads the same there, so that match is all the assumption claims of
// agents: whether an interactive session's agents carry its cli / 1 stays an
// open arm, named in every summary and never claimed. Setting ENTRYPOINT on
// the workflow arm to tell the two apart would flip a CLI that behaves to
// CONTRADICTED, since its main thread must read sdk-cli / 0.
//
// The positive control is documented (env-vars.md:187, :376): every hook env
// carries CLAUDECODE=1 and a CLAUDE_CODE_SESSION_ID, equal to the input's
// session_id on the main thread. Desktop app and Agent SDK sessions are not
// run: the desktop app needs a human, the SDK a new dependency.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { arm, baseArgs, byLabel, cleanEnv, hook, readCaptures, runClaude, runStream, scrubber, sleep, track, write, writeSettings } from '../lib.mjs';

const ENV_SCRIPT = [
  "const keep = /^(CLAUDE|ENTRYPOINT|ATTENDED|AI_AGENT)/;",
  "const red = /TOKEN|KEY|SECRET|PASSWORD|SOCKET|AUTH|CREDENTIAL/i;",
  "const env = {};",
  "for (const [k, v] of Object.entries(process.env)) if (keep.test(k)) env[k] = red.test(k) ? '<present>' : v;",
  "console.log('Q8ENV ' + JSON.stringify(env));",
].join('\n');
const ENV_PROMPT = 'Use the Bash tool to run exactly this command once: node q8env.js . Do not run anything else. Then reply with exactly the word DONE.';
const WF_SCRIPT = [
  "export const meta = { name: 'probe-q8-env', description: 'Q8 probe: one agent prints its env' }",
  "return await agent('Use the Bash tool to run exactly this command once: node q8env.js . Do not run anything else. Then reply with the single word done.')",
].join('\n');
const WF_PROMPT = `Run a workflow now with the Workflow tool, passing exactly this script as the script parameter (I am explicitly asking for a workflow):\n\n${WF_SCRIPT}\n\nDo not run any other tool yourself. Once it has launched, do not wait for it or check on it: reply with the single word launched.`;
const ENV_RULE = 'Bash(node q8env.js)';

const fwd = (p) => p.replace(/\\/g, '/');
// Every string this probe returns goes through scrub: no session ids, no
// user paths. One scrubber for this probe, so its aliases number from 1.
const scrub = scrubber();

const hooksFor = (out) => ({
  SessionStart: [{ hooks: [hook(out, 'ss')] }],
  UserPromptSubmit: [{ hooks: [hook(out, 'ups')] }],
  PreToolUse: [{ hooks: [hook(out, 'pre')] }],
  PostToolUse: [{ matcher: 'Bash', hooks: [hook(out, 'post')] }],
  SubagentStart: [{ hooks: [hook(out, 'sub-start')] }],
  SubagentStop: [{ hooks: [hook(out, 'sub-stop')] }],
  Stop: [{ hooks: [hook(out, 'stop')] }],
  SessionEnd: [{ hooks: [hook(out, 'end')] }],
});

const pick = (env = {}) => ({
  entry: env.CLAUDE_CODE_ENTRYPOINT ?? null,
  attended: env.CLAUDE_CODE_SESSION_ATTENDED ?? null,
  kind: env.CLAUDE_CODE_SESSION_KIND ?? null,
  child: env.CLAUDE_CODE_CHILD_SESSION ?? null,
});
const sig = (v) => `entrypoint ${v.entry ?? 'unset'}, attended ${v.attended ?? 'unset'}, kind ${v.kind ?? 'unset'}, child ${v.child ?? 'unset'}`;
const bashEnvOf = (c) => {
  const m = /Q8ENV (\{.*\})/.exec(String(c.input?.tool_response?.stdout ?? ''));
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
};

// One arm's captures, reduced to what the verdict reads. Nothing here keeps a
// session id or a path: ids become equality checks, paths become presence.
function reduce(caps) {
  const rows = caps.map((c) => {
    const env = c.env ?? {};
    const agent = Boolean(c.input?.agent_id);
    const bash = c.label === 'post' ? bashEnvOf(c) : null;
    return {
      label: c.label,
      agent,
      agentType: c.input?.agent_type ?? null,
      ...pick(env),
      claudecode: env.CLAUDECODE ?? null,
      sidPresent: Boolean(env.CLAUDE_CODE_SESSION_ID),
      sidMatchesInput: Boolean(env.CLAUDE_CODE_SESSION_ID) && env.CLAUDE_CODE_SESSION_ID === c.input?.session_id,
      bridge: 'CLAUDE_CODE_BRIDGE_SESSION_ID' in env,
      jobDir: 'CLAUDE_JOB_DIR' in env,
      remote: env.CLAUDE_CODE_REMOTE ?? null,
      bgBackend: env.CLAUDE_BG_BACKEND ?? null,
      bgSource: env.CLAUDE_BG_SOURCE ?? null,
      bash: bash ? { ...pick(bash), sidMatchesHook: Boolean(bash.CLAUDE_CODE_SESSION_ID) && bash.CLAUDE_CODE_SESSION_ID === env.CLAUDE_CODE_SESSION_ID, aiAgent: bash.AI_AGENT ? 'set' : null } : null,
      _sid: env.CLAUDE_CODE_SESSION_ID ?? null,
    };
  });
  const mainSid = rows.find((r) => !r.agent && r._sid)?._sid ?? null;
  for (const r of rows) r.sidSameAsMain = r._sid !== null && r._sid === mainSid;
  const envKeys = [...new Set(caps.flatMap((c) => Object.keys(c.env ?? {})))].sort();
  const inputKeys = [...new Set(caps.flatMap((c) => Object.keys(c.input ?? {})))].sort();
  return { rows: rows.map(({ _sid, ...r }) => r), envKeys, inputKeys };
}

// Instrument control on one arm: CLAUDECODE=1 and a session id on every hook
// env, and on the main thread that id is the input's session_id.
const controlOk = (red) => red.rows.length > 0 && red.rows.every((r) => r.claudecode === '1' && r.sidPresent && (r.agent || r.sidMatchesInput));

// A reading: a PostToolUse firing whose Bash output carried a Q8ENV line
// with the session id of the hook that captured it.
const reading = (r) => r.label === 'post' && !!r.bash && r.bash.sidMatchesHook;

// The Bash env agrees with the hook env of the same PostToolUse firing.
const bashAgrees = (r) => r.bash && r.bash.entry === r.entry && r.bash.attended === r.attended && r.bash.kind === r.kind;

// An attended interactive reading: what the interactive arm needs.
const interactive = (v) => v.entry === 'cli' && v.attended === '1';

// The launching session's record, ~/.claude/sessions/<pid>.json (one per
// running session, claude-directory.md), cut to the three keys the version
// check reads, or null. Its session id goes no further than that check; its
// cwd and name are never kept.
export function sessionRecord(pid, dir = path.join(os.homedir(), '.claude', 'sessions')) {
  if (!/^\d+$/.test(pid ?? '')) return null;
  try {
    const { pid: owner, sessionId, version } = JSON.parse(fs.readFileSync(path.join(dir, `${pid}.json`), 'utf8'));
    return { pid: owner, sessionId, version };
  } catch {
    return null; // no such file, a torn one, or JSON null
  }
}

// The CLI version of the session this run was launched from, from the two
// places that name it: AI_AGENT, which its Bash tool carries
// (claude-code_<x>-<y>-<z>_...), and the version in its sessions record,
// believed only when that record's pid and sessionId are this env's
// CLAUDE_PID and CLAUDE_CODE_SESSION_ID (a session that died leaves its file
// behind, and its pid comes round again). Never CLAUDE_CODE_EXECPATH or the
// pid's executable: both name the one installed binary, which an update
// replaces under a session still running the old one. ok: some source named a
// version, and every one that did names `version`. Only version strings and
// booleans come back, so all of it can go into the evidence.
export function launcherVersion(env, record, version) {
  const m = /^claude-code_(\d+)-(\d+)-(\d+)/.exec(env.AI_AGENT ?? '');
  const aiAgent = m ? `${m[1]}.${m[2]}.${m[3]}` : null;
  const pid = /^\d+$/.test(env.CLAUDE_PID ?? '') ? Number(env.CLAUDE_PID) : null;
  const recordOwn = !!record && pid !== null && record.pid === pid && typeof record.sessionId === 'string' && record.sessionId === env.CLAUDE_CODE_SESSION_ID;
  const sessionFile = recordOwn && typeof record.version === 'string' ? record.version : null;
  const named = [aiAgent, sessionFile].filter((v) => v !== null);
  return { aiAgent, sessionFile, recordFound: !!record, recordOwn, ok: named.length > 0 && named.every((v) => v === version) };
}

const versionSaid = (lv) => `AI_AGENT names ${lv.aiAgent ?? 'no version'}, its sessions record ${lv.sessionFile !== null ? `names ${lv.sessionFile}` : !lv.recordFound ? 'was not found' : lv.recordOwn ? 'names no version' : 'is another session\'s (its pid or session id differ), so it was not read'}`;

function describe(name, red) {
  const groups = new Map();
  for (const r of red.rows) {
    const k = sig(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(`${r.agent ? `agent(${r.agentType ?? '?'}):` : ''}${r.label}`);
  }
  const hooks = [...groups.entries()].map(([k, labels]) => `${k} [${labels.join(' ')}]`).join('; ');
  const bash = red.rows.filter((r) => r.bash).map((r) => `${r.agent ? 'agent ' : ''}Bash env ${sig(r.bash)} (its hook's session: ${r.bash.sidMatchesHook ? 'yes' : 'no'}; agrees with its hook env: ${bashAgrees(r) ? 'yes' : 'no'})`).join('; ') || 'no Bash env read';
  const blind = red.rows.filter((r) => r.label === 'post' && !reading(r)).length;
  const flags = `bridge id ${red.rows.some((r) => r.bridge) ? 'present' : 'absent'}, CLAUDE_JOB_DIR ${red.rows.some((r) => r.jobDir) ? 'present' : 'absent'}, CLAUDE_BG_BACKEND ${[...new Set(red.rows.map((r) => r.bgBackend))].join('/')}`;
  return `${name}: ${red.rows.length} hook firings; ${hooks}; ${bash}; Bash posts with no reading ${blind}; ${flags}; hook env keys ${red.envKeys.join(',')}; input keys ${red.inputKeys.join(',')}`;
}

// A claude subcommand without -p. Resolves on the process's exit, not on its
// pipes closing: `claude --bg` may leave a background service holding them.
// A timeout kills this process alone, never its tree: the service it may
// have started can be serving other background sessions.
function cli(args, { cwd, env = {}, timeoutMs = 90_000 } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn('claude', args, { cwd, env: cleanEnv(env), shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const timer = setTimeout(() => { try { child.kill(); } catch { /* gone */ } }, timeoutMs);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      setTimeout(() => resolve({ code, signal, stdout, stderr, ms: Date.now() - t0 }), 500);
    });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: null, signal: null, stdout, stderr: `${stderr}${e}`, ms: Date.now() - t0 }); });
  });
}

async function bgArm(ctx) {
  const { ws, out } = arm(ctx, 'bg');
  write(path.join(ws, 'q8env.js'), `${ENV_SCRIPT}\n`);
  // The background worker is started by a supervisor, not by this process,
  // so PROBE_OUT rides in the settings' env block as well.
  const settings = { env: { PROBE_OUT: out }, permissions: { allow: [ENV_RULE] }, hooks: hooksFor(out) };
  const launch = await cli(['--bg', ...baseArgs({ settingsFile: writeSettings(out, settings) }), ENV_PROMPT], { cwd: ws, env: { PROBE_OUT: out } });
  const text = `${launch.stdout}\n${launch.stderr}`;
  write(path.join(out, 'bg-launch.json'), JSON.stringify(launch, null, 2));
  const said = scrub(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 3).join(' | ').replaceAll(fwd(ws), '<ws>').replaceAll(ws, '<ws>'));
  if (/not trusted/i.test(text)) return { state: 'blocked', said, code: launch.code };
  const id = (/backgrounded\W+([0-9a-z]{6,})/i.exec(text) ?? /claude stop ([0-9a-z]{6,})/i.exec(text))?.[1];
  if (!id) return { state: 'no-id', said, code: launch.code };
  // The id is parsed from free text, so stop and rm get it only once this
  // workspace's own session listing shows it: a wrong token must never stop
  // or remove someone else's session.
  const lookup = async () => {
    const list = await cli(['agents', '--json', '--all', '--cwd', ws], { timeoutMs: 30_000 });
    try { return JSON.parse(list.stdout).find((s) => s.id === id) ?? null; } catch { return null; }
  };
  // Wait for the worker's first turn to end, or for the session to settle.
  let state = null;
  let listed = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 240_000) {
    if (byLabel(readCaptures(out), 'stop').length) break;
    await sleep(5000);
    const s = await lookup();
    if (s) { listed = true; state = s.state ?? state; }
    if (['done', 'blocked', 'failed', 'stopped'].includes(state)) break;
  }
  await sleep(3000);
  if (!listed) listed = Boolean(await lookup());
  const stop = listed ? await cli(['stop', id], { timeoutMs: 60_000 }) : null;
  const rm = listed ? await cli(['rm', id], { timeoutMs: 60_000 }) : null;
  const caps = readCaptures(out);
  track(ctx, caps);
  return { state: 'ran', said, code: launch.code, sessionState: state, listed, stopExit: stop?.code ?? null, rmExit: rm?.code ?? null, red: reduce(caps) };
}

// The verdict from what run() measured: pure, so a test can plant it.
// version: this run's CLI. launcher: pick() of this runner's env.
// launcherVersion: launcherVersion()'s answer. arms: reduce() of each -p arm
// ('p-json', 'p-stream', workflow). bg: bgArm()'s answer. A hook env that
// breaks a claim returns CONTRADICTED before a PARTIAL can. A PARTIAL whose
// open arms are only blocked or unread ones says unsettledOnly; one beside a
// reading that disagreed with its own hook env does not. That mismatch breaks
// the bridge, not a claim about hook env, so it is no CONTRADICTED, but it was
// measured: a re-roll whose readings agree must not pass it.
export function decide({ version, launcher, launcherVersion: lv, arms, bg }) {
  // Instrument first: every measured arm must pass the documented control.
  const measured = { ...arms, ...(bg.state === 'ran' && bg.red.rows.length ? { bg: bg.red } : {}) };
  const broken = Object.entries(measured).filter(([, red]) => !controlOk(red)).map(([k]) => k);
  if (broken.length) return { verdict: 'INCONCLUSIVE', summary: `the documented env control (CLAUDECODE=1, a session id matching the input) failed or saw no hook firing in: ${broken.join(', ')}` };
  const wfAgent = arms.workflow.rows.filter((r) => r.agent);
  if (!wfAgent.length) return { verdict: 'INCONCLUSIVE', summary: 'no hook fired inside a workflow agent, so inheritance could not be seen' };
  // The agents are compared to the main thread below. With no main-thread
  // firing (a CLI that tags every hook with agent_id, or captures lost on the
  // main thread alone) that comparison would read an empty side as a deviation.
  const wfMain = arms.workflow.rows.filter((r) => !r.agent);
  if (!wfMain.length) return { verdict: 'INCONCLUSIVE', summary: 'no main-thread hook fired in the workflow arm, so its agents\' readings had nothing to compare to' };
  if (bg.state === 'ran' && !bg.red.rows.length) return { verdict: 'INCONCLUSIVE', summary: 'the background session started but none of its hooks wrote a capture' };
  if (bg.state === 'no-id') return { verdict: 'INCONCLUSIVE', summary: `claude --bg neither refused nor printed a session id: ${bg.said}` };

  // The claims, on every hook firing of each arm.
  const all = (red, f) => red.rows.length > 0 && red.rows.every(f);
  const headless = (r) => r.entry === 'sdk-cli' && r.attended === '0';
  const failures = [];
  if (!all(arms['p-json'], headless)) failures.push('-p json is not sdk-cli / 0 on every hook');
  if (!all(arms['p-stream'], headless)) failures.push('-p stream-json is not sdk-cli / 0 on every hook');
  if (!wfMain.every(headless)) failures.push('the workflow arm\'s main thread is not sdk-cli / 0');
  const inherits = wfAgent.every((r) => wfMain.length > 0 && r.entry === wfMain[0].entry && r.attended === wfMain[0].attended);
  if (!inherits) failures.push('workflow-agent hooks read different values from their session\'s main thread');
  if (bg.state === 'ran' && !all(bg.red, (r) => r.attended === '0')) failures.push('the --bg session is not attended 0 on every hook');
  if (failures.length) return { verdict: 'CONTRADICTED', summary: `${failures.join('; ')}. Readings: ${Object.entries(measured).map(([k, red]) => `${k} ${[...new Set(red.rows.map((r) => `${r.agent ? 'agent ' : ''}${r.entry} / ${r.attended}`))].join(', ')}`).join('; ')}` };

  // The bridge from a Bash env to hook env, built from readings alone: every
  // measured arm and the workflow agent hold one (unread: those that don't),
  // and every reading agrees with its own hook env (disagree: the arms where
  // one doesn't). The interactive arm counts as measured only on a cli / 1
  // launcher reading carried over by it, from a launcher on this run's CLI
  // version.
  const readings = Object.entries(measured).map(([k, red]) => [k, red.rows.filter(reading)]);
  const unread = readings.filter(([, rs]) => !rs.length).map(([k]) => k);
  if (!unread.includes('workflow') && !wfAgent.some(reading)) unread.push('the workflow agent');
  const disagree = readings.filter(([, rs]) => rs.some((r) => !bashAgrees(r))).map(([k]) => k);
  const mismatch = [...new Set(readings.flatMap(([k, rs]) => rs.filter((r) => !bashAgrees(r)).map((r) => `${k}${r.agent ? ' agent' : ''}: Bash env ${sig(r.bash)}, its hook env ${sig(r)}`)))];
  const bridgeOk = !unread.length && !disagree.length;
  const bridgeGap = [disagree.length && `the Bash env disagreed with its hook env in ${disagree.join(', ')}`, unread.length && `no Bash env reading came back from ${unread.join(', ')}`].filter(Boolean).join(', and ');
  const interactiveOk = interactive(launcher) && lv.ok && bridgeOk;
  const bgVals = bg.state === 'ran' ? [...new Set(bg.red.rows.map(sig))].join(' | ') : null;
  const parts = [
    `-p json and -p stream-json hooks read sdk-cli / 0`,
    `in a -p session, workflow-agent hooks read ${[...new Set(wfAgent.map((r) => `${r.entry} / ${r.attended}`))].join(', ')} (its main thread ${[...new Set(wfMain.map((r) => `${r.entry} / ${r.attended}`))].join(', ')})`,
    bg.state === 'ran' ? `--bg hooks read ${bgVals}` : `--bg was refused before any session started (${bg.said})`,
    !interactive(launcher)
      ? `the interactive arm is BLOCKED: this run was not launched from a Bash tool in an attended interactive session (its own env reads ${sig(launcher)}), and no script can start one`
      : !lv.ok
        ? `the interactive arm is BLOCKED: this run's own Bash env read cli / 1, but nothing shows the session it came from runs this run's CLI ${version} (${versionSaid(lv)}), and a session keeps its old binary after an update`
        : bridgeOk
          ? `this run's own env, a Bash tool's in an attended interactive session on CLI ${version}, read cli / 1, and every measured session gave a Bash env reading that matched its hook env, so cli / 1 stands for that session's hook env`
          : `this run's own Bash env read cli / 1, but ${bridgeGap}, so it can't stand for hook env`,
  ];
  const open = [!interactiveOk && 'the interactive arm', bg.state === 'blocked' && 'the --bg arm (a script can\'t accept the workspace trust dialog, and no probe folder is trusted)'].filter(Boolean);
  const notRun = 'Desktop app and Agent SDK sessions were not run (a human, a new dependency)';
  const notClaimed = 'Open arm, never claimed: whether an interactive session\'s workflow agents carry its cli / 1 (agents ran only in a -p session, whose main thread and agents both read sdk-cli / 0, as they would under a CLI that pinned every agent to sdk-cli / 0)';
  if (open.length) {
    const summary = `${parts.join('; ')}. ${mismatch.length ? `Measured mismatch (counts as measured): ${mismatch.join('; ')}. ` : ''}Not measured in this run: ${open.join('; ')}. ${notRun}. ${notClaimed}`;
    return { verdict: 'PARTIAL', summary, ...(disagree.length ? {} : { unsettledOnly: true }) };
  }
  return { verdict: 'VERIFIED', summary: `${parts.join('; ')}. ${notRun}. ${notClaimed}` };
}

export default {
  id: 'Q8',
  question: 'What do CLAUDE_CODE_SESSION_ATTENDED and CLAUDE_CODE_ENTRYPOINT read in hook processes, per session kind?',
  assumption: 'Hook processes see CLAUDE_CODE_SESSION_ATTENDED and CLAUDE_CODE_ENTRYPOINT, and they tell an attended interactive session (1 / cli) from a headless -p session (0 / sdk-cli) and a background --bg session (0); in a -p session, workflow-agent hooks read the same values as its main thread.',
  loadBearing: true,
  async run(ctx) {
    // Read before any arm runs: the interactive arm's only instrument, and the
    // CLI version of the session it comes from.
    const launcher = pick(process.env);
    const lv = launcherVersion(process.env, sessionRecord(process.env.CLAUDE_PID), ctx.version);
    const arms = {};

    {
      const { ws, out } = arm(ctx, 'p-json');
      write(path.join(ws, 'q8env.js'), `${ENV_SCRIPT}\n`);
      const res = runClaude({ cwd: ws, out, prompt: ENV_PROMPT, settings: { hooks: hooksFor(out) }, args: ['--tools', 'Bash', '--allowedTools', ENV_RULE] });
      const caps = readCaptures(out);
      track(ctx, caps);
      arms['p-json'] = { red: reduce(caps), exit: res.status, reply: scrub((res.json?.result ?? '').slice(0, 80)) };
      await sleep(1500);
    }
    {
      const { ws, out } = arm(ctx, 'p-stream');
      write(path.join(ws, 'q8env.js'), `${ENV_SCRIPT}\n`);
      const s = await runStream({ cwd: ws, out, settings: { hooks: hooksFor(out) }, args: ['--tools', 'Bash', '--allowedTools', ENV_RULE], turns: [ENV_PROMPT] });
      const caps = readCaptures(out);
      track(ctx, caps);
      arms['p-stream'] = { red: reduce(caps), exit: s.code, reply: scrub((s.results.at(-1)?.result ?? '').slice(0, 80)) };
      await sleep(1500);
    }
    {
      const { ws, out } = arm(ctx, 'workflow');
      write(path.join(ws, 'q8env.js'), `${ENV_SCRIPT}\n`);
      const res = runClaude({ cwd: ws, out, prompt: WF_PROMPT, settings: { hooks: hooksFor(out) }, args: ['--tools', 'Workflow', 'Bash', '--allowedTools', 'Workflow', ENV_RULE] });
      const caps = readCaptures(out);
      track(ctx, caps);
      arms.workflow = { red: reduce(caps), exit: res.status, reply: scrub((res.json?.result ?? '').slice(0, 80)) };
      await sleep(1500);
    }
    const bg = await bgArm(ctx);

    const evidence = [
      scrub(`interactive arm, this runner's own env read at start (a Bash tool's env when run.mjs was launched from one, not a hook): ${launcher.entry || launcher.attended ? sig(launcher) : 'no Claude session values (launched outside a session)'}; an attended interactive reading (cli / 1): ${interactive(launcher)}; the launching session's CLI version: ${versionSaid(lv)}; every version named is this run's ${ctx.version}: ${lv.ok}`),
    ];
    for (const [name, a] of Object.entries(arms)) evidence.push(scrub(`${describe(name, a.red)}; exit ${a.exit}, reply ${JSON.stringify(a.reply)}`));
    evidence.push(scrub(bg.state === 'ran'
      ? `${describe('bg', bg.red)}; launch said ${JSON.stringify(bg.said)}; session state ${bg.sessionState}; ${bg.listed ? `stop exit ${bg.stopExit}, rm exit ${bg.rmExit}` : 'its id never showed in this workspace\'s session listing, so it was neither stopped nor removed'}`
      : `bg: not started (${bg.state}); launch exit ${bg.code}, said ${JSON.stringify(bg.said)}`));
    evidence.push('not run: Desktop app sessions (need a human to open one on a scratch folder) and Agent SDK sessions (need the SDK installed, a new dependency)');
    evidence.push('open arm, never claimed: workflow agents of an interactive session (agents run only in the -p workflow arm, where its main thread and agents both read sdk-cli / 0)');
    const observed = { launcher, launcherVersion: lv, arms: Object.fromEntries(Object.entries(arms).map(([k, a]) => [k, a.red])), bg: bg.state === 'ran' ? { ...bg.red, sessionState: bg.sessionState, listed: bg.listed } : { state: bg.state, said: bg.said } };
    const d = decide({ version: ctx.version, launcher, launcherVersion: lv, arms: observed.arms, bg });
    return { ...d, summary: scrub(d.summary), evidence, observed };
  },
};

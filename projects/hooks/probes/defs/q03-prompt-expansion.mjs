// Q3: what UserPromptExpansion reports (command_name, command_source,
// command_args) for each kind of typed command, and whether a skill Claude
// invokes itself skips it.
//
// One headless run per arm (user-scratch first runs a pre-flight, below),
// each in its own workspace, the prompt being the slash command. Four
// captures in every arm: UserPromptSubmit (fires on every prompt, so an arm
// without it is an instrument fault), UserPromptExpansion with matcher ""
// (the thing measured), PreToolUse on Skill and Stop. The expansion hook
// answers {"decision":"block"} in every arm except the control, so no command
// but the control's (and the model arm's skill) ever reaches the model;
// --disallowedTools for the shell and edit tools and
// disableSkillShellExecution are second fences in case a block fails.
//   control          /probe-proj alpha  beta  a project skill, not blocked
//                                             (the double space tests args)
//   legacy-command   /probe-cmd x             .claude/commands/probe-cmd.md
//   user-live        /window                  the real user skill, under the
//                                             default project,local sources
//   user-scratch     /probe-user u            a user skill in a scratch
//                                             CLAUDE_CONFIG_DIR (below)
//   plugin-skill     /probeplug:pskill q      via --plugin-dir
//   plugin-bare      /pskill q                the plugin skill's bare alias
//   plugin-command   /probeplug:pcmd q        a plugin commands/ file
//   workflow         /probewf go              .claude/workflows/probewf.js
//   builtin          /init                    a prompt-type built-in
//   model-invoked    "use the Skill tool on probe-model": PreToolUse, no UPE
//
// The user-scratch arm is the only one with the user setting source on, and
// its user source is not the live one: CLAUDE_CONFIG_DIR points at a scratch
// folder holding one skill and a settings.json whose only hook is a capture
// labelled user-src. The variable alone keeps ~/.claude/settings.json and its
// hooks out, so the arm launches only after a pre-flight of the same session
// with every hook off has shown the scratch folder was its user source and
// nothing else (scratchIsolation); otherwise it never launches and its row is
// isolation-unproven. In the arm, that capture firing proves the session read
// the scratch user settings, and the live user skills missing from its
// command list corroborates it.
//
// Instruments: the captures decide; stdout is switched to stream-json with
// --include-hook-events (a later --output-format overrides runClaude's json),
// so the init message lists the loaded slash commands (tells "not loaded"
// from "loaded but no UPE") and the hook_started events corroborate firing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { arm, byLabel, hook, readCaptures, runClaude, scrubber, sleep, track, write } from '../lib.mjs';

const UPE_BLOCK = { decision: 'block', reason: 'probe' };
const FENCE = ['--no-session-persistence', '--disallowedTools', 'Bash,PowerShell,Edit,Write,NotebookEdit', '--max-budget-usd', '1'];
const STREAM = ['--output-format', 'stream-json', '--verbose', '--include-hook-events'];
const LIVE_USER_SKILLS = ['window', 'squeaky-clean', 'brief', 'distill'];

const skill = (name, body, extra = '') => `---\nname: ${name}\ndescription: Q3 probe fixture ${name}\n${extra}---\n\n${body}\n`;

function parseStream(stdout) {
  const msgs = [];
  for (const l of (stdout || '').split('\n')) {
    if (!l.trim()) continue;
    try { msgs.push(JSON.parse(l)); } catch { /* a non-JSON line */ }
  }
  const init = msgs.find((m) => m.type === 'system' && m.subtype === 'init') ?? null;
  const result = msgs.find((m) => m.type === 'result') ?? null;
  return {
    init,
    commands: init?.slash_commands ? init.slash_commands.map((c) => String(c).replace(/^\//, '')) : null,
    result: result ? String(result.result ?? '') : '',
    resultSubtype: result?.subtype ?? null,
    assistants: msgs.filter((m) => m.type === 'assistant').length,
    upeHookEvents: msgs.filter((m) => m.type === 'system' && /^hook/.test(String(m.subtype)) && JSON.stringify(m).includes('UserPromptExpansion')).map((m) => m.subtype),
    hookEvents: msgs.filter((m) => m.type === 'system' && m.subtype === 'hook_started').map((m) => String(m.hook_event ?? m.hook_name)),
    count: msgs.length,
  };
}

export const ARMS = [
  { name: 'control', prompt: '/probe-proj alpha  beta', expect: 'probe-proj', ok: 'PROJ-OK', block: false, tools: 'Read' },
  { name: 'legacy-command', prompt: '/probe-cmd x', expect: 'probe-cmd', ok: 'CMD-OK', tools: 'Read' },
  { name: 'user-live', prompt: '/window', expect: 'window', ok: null, tools: 'Read', finding: true },
  { name: 'user-scratch', prompt: '/probe-user u', expect: 'probe-user', ok: 'USER-OK', tools: 'Read', scratchUser: true },
  { name: 'plugin-skill', prompt: '/probeplug:pskill q', expect: 'probeplug:pskill', ok: 'PLUG-OK', tools: 'Read', plugin: true },
  { name: 'plugin-bare', prompt: '/pskill q', expect: 'probeplug:pskill', ok: 'PLUG-OK', tools: 'Read', plugin: true, finding: true },
  { name: 'plugin-command', prompt: '/probeplug:pcmd q', expect: 'probeplug:pcmd', ok: 'PCMD-OK', tools: 'Read', plugin: true },
  { name: 'workflow', prompt: '/probewf go', expect: 'probewf', ok: 'WF-OK', tools: 'Workflow' },
  { name: 'builtin', prompt: '/init', expect: 'init', ok: null, tools: 'Read' },
  { name: 'model-invoked', prompt: 'Use the Skill tool to invoke the skill named probe-model, then do exactly what it says. Do not do anything else.', model: true, ok: 'MODEL-OK', tools: 'Skill' },
];

// Each typed arm's command_source, as Q3 measured it on 2.1.306. Pinned per
// arm, not merely "present and unlike the project skill's": a renamed value,
// or two origins sharing one, must read as CONTRADICTED (passedOn fails, the
// safe side), never re-VERIFY under a gate keyed on these names.
// tests/fields.mjs pins the same value set for the fixtures, and
// tests/verdicts-sources.test.mjs holds the two equal; fields.mjs is never
// imported here, as the verdict hash doesn't cover it.
export const EXPECTED_SOURCE = {
  control: 'projectSettings',
  'legacy-command': 'projectSettings',
  workflow: 'projectSettings',
  'user-live': 'userSettings',
  'user-scratch': 'userSettings',
  'plugin-skill': 'plugin',
  'plugin-bare': 'plugin',
  'plugin-command': 'plugin',
  builtin: 'builtin',
};

function fixtures(ws, a) {
  write(path.join(ws, '.claude', 'skills', 'probe-proj', 'SKILL.md'), skill('probe-proj', 'Reply with exactly the word PROJ-OK, a space, and then this argument text copied exactly: $ARGUMENTS', 'disable-model-invocation: true\n'));
  write(path.join(ws, '.claude', 'skills', 'probe-model', 'SKILL.md'), skill('probe-model', 'Reply with exactly the word MODEL-OK and nothing else.'));
  write(path.join(ws, '.claude', 'commands', 'probe-cmd.md'), '---\ndescription: Q3 probe fixture probe-cmd\n---\n\nReply with exactly the word CMD-OK and nothing else.\n');
  write(path.join(ws, '.claude', 'workflows', 'probewf.js'), "export const meta = { name: 'probewf', description: 'Q3 probe fixture: a saved project workflow that does nothing' }\nreturn 'WF-OK'\n");
  if (a.plugin) {
    write(path.join(ws, 'plug', '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'probeplug', version: '0.0.1', description: 'Q3 probe fixture plugin' }, null, 2));
    write(path.join(ws, 'plug', 'skills', 'pskill', 'SKILL.md'), skill('pskill', 'Reply with exactly the word PLUG-OK and nothing else.', 'disable-model-invocation: true\n'));
    write(path.join(ws, 'plug', 'commands', 'pcmd.md'), '---\ndescription: Q3 probe fixture pcmd\n---\n\nReply with exactly the word PCMD-OK and nothing else.\n');
  }
}

// The user-scratch arm's pre-flight: that arm's session (workspace, env,
// sources) with --settings disableAllHooks, which outranks user settings
// (hooks.md, "Disable or remove hooks"), so even a CLI that ignored
// CLAUDE_CONFIG_DIR and read ~/.claude/settings.json would run none of its
// hooks; no tools, and a --debug-file. The scratch folder holds no login, so
// its model call may fail: its result is never judged, only its init
// message, its debug log and what fired.
const PREFLIGHT = { disableAllHooks: true };
const PREFLIGHT_PROMPT = 'Reply with the single word ok.';

// A path as the CLI may print it: either slash, no trailing one, and
// case-blind on a drive path, as Windows reads it. `within` is the folder
// itself or a path under it, never a sibling that shares its prefix.
const fold = (p) => {
  const f = String(p).replace(/[\\/]+/g, '/').replace(/\/+$/, '');
  return /^[A-Za-z]:\//.test(f) ? f.toLowerCase() : f;
};
const within = (p, roots) => typeof p === 'string' && roots.some((r) => fold(p) === fold(r) || fold(p).startsWith(`${fold(r)}/`));

// Whether the pre-flight's user source was the scratch folder and nothing
// else, so the user-scratch arm may launch with hooks on. Pure, so a test can
// plant each failure. fired: what ran (its captures' labels and its stream's
// hook_started events); init: its stream-json init message, or null; debug:
// its debug-log lines; roots: the scratch config folder's spellings (as
// passed, and resolved); live: the live config home (~/.claude); expect: the
// scratch skill's name. Each check reads a field 2.1.306 prints: the init's
// slash_commands and memory_paths.auto, the "Loading skills from: ...
// user=<dir>" debug line, and the settings watcher's file list. That list
// names the user settings.json whatever the sources (Q0's logs), but a short
// session can end before the watcher starts, so it is judged only when
// present. {ok, why: null when ok, facts}.
export function scratchIsolation({ fired, init, debug, roots, live, expect }) {
  const commands = Array.isArray(init?.slash_commands) ? init.slash_commands.map((c) => String(c).replace(/^\//, '')) : null;
  const auto = init?.memory_paths?.auto ?? null;
  const skillsUser = debug.map((l) => /Loading skills from:.*?\buser=(.*?)(?:, \w+=|$)/.exec(l)).filter(Boolean).map((m) => m[1]);
  const watched = debug.map((l) => /Watching for changes in setting files (.*)$/.exec(l)).filter(Boolean).map((m) => m[1].replace(/\.{3}$/, '').split(/,\s*/));
  const own = roots.map((r) => fold(`${r}/settings.json`));
  const liveSettings = fold(`${live}/settings.json`);
  const facts = {
    fired,
    scratchListed: commands ? commands.includes(expect) : null,
    liveUserSkillsListed: commands ? LIVE_USER_SKILLS.filter((n) => commands.includes(n)) : null,
    commandsListed: commands ? commands.length : null,
    memoryAuto: auto, skillsUser, watched,
  };
  const fails = [];
  if (fired.length) fails.push(`hooks ran with disableAllHooks in --settings (${JSON.stringify(fired)}), so it is no safe way to read the user source`);
  if (!init) fails.push('it printed no init message');
  else {
    if (!commands) fails.push('its init lists no slash_commands');
    else if (!facts.scratchListed) fails.push(`its command list lacks the scratch skill ${expect}`);
    if (facts.liveUserSkillsListed?.length) fails.push(`its command list holds the live user skills ${JSON.stringify(facts.liveUserSkillsListed)}`);
    if (!within(auto, roots)) fails.push(`its init memory_paths.auto is ${typeof auto === 'string' ? 'outside the scratch config folder' : 'missing'}`);
  }
  if (!skillsUser.length) fails.push('its debug log has no "Loading skills from" line naming a user folder');
  else if (!skillsUser.every((u) => within(u, roots))) fails.push('its debug log loads user skills from outside the scratch config folder');
  if (watched.some((w) => w.map(fold).includes(liveSettings))) fails.push('its settings watcher lists the live settings.json');
  if (watched.some((w) => !w.some((f) => own.includes(fold(f))))) fails.push('its settings watcher does not list the scratch settings.json');
  return { ok: !fails.length, why: fails.length ? fails.join('; ') : null, facts };
}

// The verdict from the arms' rows: run()'s, or planted ones in
// tests/verdicts-sources.test.mjs. Pure; `scrub` is the probe's scrubber.
export function decide(rows, scrub) {
  // Judge each typed arm. A firing is checked against the expected name,
  // the documented expansion_type, and the arm's pinned command_source. No
  // firing is a deviation only when the command provably loaded.
  let deviations = [];
  const unsettled = [];
  const notes = [];
  const R = Object.fromEntries(rows.map((r) => [r.arm, r]));
  const state = {};
  for (const r of rows.filter((x) => x.arm !== 'model-invoked')) {
    if (r.ups === 0) { state[r.arm] = 'no-instrument'; continue; }
    if (r.upe.length) {
      const u = r.upe[0];
      const want = EXPECTED_SOURCE[r.arm];
      const probs = [];
      if (u.expansion_type !== 'slash_command') probs.push(`expansion_type ${JSON.stringify(u.expansion_type)}`);
      if (u.command_name !== r.expect) probs.push(`command_name ${JSON.stringify(u.command_name)} (expected ${JSON.stringify(r.expect)})`);
      if (u.command_source !== want) probs.push(`command_source ${u.command_source === '<absent>' ? 'absent' : JSON.stringify(u.command_source)} (expected ${JSON.stringify(want)})`);
      state[r.arm] = probs.length ? 'deviates' : 'fired';
      if (probs.length) deviations.push(`${r.arm}: ${probs.join(', ')}`);
      continue;
    }
    const loaded = r.listed === true || r.okSeen === true;
    state[r.arm] = loaded ? 'loaded-no-upe' : 'not-loaded';
    if (loaded) deviations.push(`${r.arm}: ${r.prompt} loaded (listed ${r.listed}, ok-token ${r.okSeen}) but UserPromptExpansion never fired`);
  }

  // The scratch user arm counts only if its user source provably was the
  // scratch folder: the hooks-off pre-flight showed it before the arm
  // launched, the arm's own user-src capture fired, and it listed no live
  // user skill. A row with no passing pre-flight never counts, whatever
  // else it carries.
  const us = R['user-scratch'];
  const scratchValid = us.preflight?.ok === true && us.userSrc > 0 && !(us.liveUserSkillsListed ?? []).length;
  const preflightSaid = !us.preflight ? 'no pre-flight' : us.preflight.ok ? 'pre-flight isolated' : `pre-flight not isolated (${us.preflight.why})${us.launched === false ? ', so the arm never launched' : ''}`;
  if (!scratchValid) {
    deviations = deviations.filter((d) => !d.startsWith('user-scratch:'));
    state['user-scratch'] = 'isolation-unproven';
  }

  // The model-invoked arm: PreToolUse on Skill, and no expansion.
  const m = R['model-invoked'];
  const preHit = m.pre.find((p) => p.tool_name === 'Skill' && JSON.stringify(p.tool_input ?? '').includes('probe-model'));
  if (m.upe.length) deviations.push(`model-invoked: UserPromptExpansion fired on a Skill-tool invocation (${JSON.stringify(m.upe.map((u) => u.command_name))})`);
  else if (!preHit) unsettled.push('model-invoked: the model never called the Skill tool on probe-model');
  state['model-invoked'] = m.upe.length ? 'deviates' : preHit ? 'pre-only' : 'not-tried';

  // Decisive arms that settled nothing. user-live and plugin-bare are
  // findings: either may legitimately not resolve.
  for (const arm of ['legacy-command', 'plugin-skill', 'plugin-command', 'workflow', 'builtin']) {
    if (['no-instrument', 'not-loaded'].includes(state[arm])) unsettled.push(`${arm}: ${state[arm] === 'no-instrument' ? 'no UserPromptSubmit capture (instrument fault)' : `${R[arm].prompt} did not load (listed ${R[arm].listed}, reply ${JSON.stringify(R[arm].reply.slice(0, 80))})`}`);
  }
  const userSettled = ['fired', 'deviates', 'loaded-no-upe'].includes(state['user-scratch']) || ['fired', 'deviates', 'loaded-no-upe'].includes(state['user-live']);
  if (!userSettled) unsettled.push(`user scope: user-scratch ${state['user-scratch']} (${preflightSaid}, user-src fired ${us.userSrc}, live skills listed ${JSON.stringify(us.liveUserSkillsListed)}), user-live ${state['user-live']}`);
  if (state['plugin-bare'] === 'not-loaded') notes.push('the bare /pskill alias did not resolve in -p');
  if (state['user-live'] === 'not-loaded') notes.push('/window (in ~/.claude/skills) does not load under --setting-sources project,local');

  // Findings that don't decide the verdict.
  const ctl = R.control.upe[0];
  if (ctl) notes.push(`control command_args ${JSON.stringify(ctl.command_args)} (typed "alpha  beta")`);
  const fired = rows.filter((r) => r.upe.length);
  const rebuilt = fired.filter((r) => r.upe[0].prompt !== r.prompt);
  notes.push(rebuilt.length ? `the prompt field is not the typed line in: ${rebuilt.map((r) => `${r.arm} (typed ${JSON.stringify(r.prompt)}, prompt ${JSON.stringify(r.upe[0].prompt)})`).join(', ')}` : 'the prompt field equals the typed line in every arm that fired');
  notes.push(`UserPromptSubmit fired before UserPromptExpansion in ${fired.filter((r) => r.order[0] === 'ups').length} of ${fired.length} arms that fired both`);
  notes.push('every arm ran on the -p path; the interactive composer was not driven');
  const blockedArms = rows.filter((r) => r.arm !== 'control' && r.arm !== 'model-invoked' && r.upe.length);
  notes.push(`the block stopped the model turn in ${blockedArms.filter((r) => r.assistants === 0).length} of ${blockedArms.length} blocked arms that fired`);

  const table = rows.filter((r) => r.upe.length).map((r) => `${r.arm} ${JSON.stringify(r.upe[0].command_name)}/${JSON.stringify(r.upe[0].command_source)}`).join('; ');
  const evidence = rows.map((r) => scrub(`${r.arm}: ${JSON.stringify(r.prompt)} -> state ${state[r.arm]}; UPS ${r.ups}${r.arm === 'user-scratch' ? ` (launched ${r.launched}, user-src ${r.userSrc}, CLAUDE_CONFIG_DIR in hook env ${r.configDirInHookEnv}, live user skills listed ${JSON.stringify(r.liveUserSkillsListed)}, pre-flight ${JSON.stringify(r.preflight ?? null)})` : ''}, UPE ${JSON.stringify(r.upe)}, PreToolUse Skill ${JSON.stringify(r.pre)}, order ${r.order.join('>')}, listed in init ${r.listed} (of ${r.commandsListed}), UPE hook events ${JSON.stringify(r.upeHookEvents)}, model turns ${r.assistants}, ok-token ${r.okSeen}, result ${r.resultSubtype}, exit ${r.exit} in ${r.ms} ms${r.timedOut ? ' TIMED OUT' : ''}, reply ${JSON.stringify(r.reply)}${r.stderr ? `, stderr ${JSON.stringify(r.stderr)}` : ''}`));
  evidence.push(...notes.map((n) => scrub(`finding: ${n}`)));
  const observed = JSON.parse(scrub(JSON.stringify({ state, rows })));

  const c = R.control;
  if (!c.ups || !c.upe.length || !c.okSeen) {
    const why = !c.ups ? 'no UserPromptSubmit capture' : !c.upe.length ? (c.okSeen ? 'the skill expanded (PROJ-OK) but UserPromptExpansion never fired, so -p may not be the user-typed path; settling it needs an interactive arm (a human)' : 'UserPromptExpansion never fired and the skill did not expand') : 'UserPromptExpansion fired but the reply lacked PROJ-OK, so the expansion path is unproven';
    return { verdict: 'INCONCLUSIVE', summary: `the control arm failed: ${why}`, evidence, observed };
  }
  const tail = [table && `observed command_name/command_source: ${table}`, ...notes].filter(Boolean).join('; ');
  if (deviations.length) return { verdict: 'CONTRADICTED', summary: scrub(`${deviations.join('; ')}${unsettled.length ? `; unsettled: ${unsettled.join('; ')}` : ''}; ${tail}`), evidence, observed };
  // A deviation returned CONTRADICTED above, so every settled arm here agrees
  // and all this PARTIAL leaves open is unsettled arms: it measured no
  // deviation (run.mjs UNSETTLED_OK).
  if (unsettled.length) return { verdict: 'PARTIAL', unsettledOnly: true, summary: scrub(`unsettled: ${unsettled.join('; ')}; settled arms agree with the assumption; ${tail}`), evidence, observed };
  return { verdict: 'VERIFIED', summary: scrub(`every typed command that loaded fired UserPromptExpansion with its name and the command_source pinned for its origin, and a Skill-tool invocation fired PreToolUse only; ${tail}`), evidence, observed };
}

// The pre-flight run (PREFLIGHT) in its own capture folder inside the arm's,
// then the pause every launch gets. scratchIsolation()'s answer, plus the
// run's exit, time and result subtype for evidence.
async function scratchPreflight(ctx, { ws, out, config, sources, env, expect }) {
  const o = path.join(out, 'preflight');
  fs.mkdirSync(o, { recursive: true });
  const dbg = path.join(o, 'debug.log');
  const res = runClaude({ cwd: ws, out: o, prompt: PREFLIGHT_PROMPT, settings: PREFLIGHT, sources, env, args: ['--tools', '', ...FENCE, ...STREAM, '--debug-file', dbg.replace(/\\/g, '/')], timeoutMs: 180_000 });
  const caps = readCaptures(o);
  track(ctx, caps);
  const s = parseStream(res.stdout);
  const debug = fs.existsSync(dbg) ? fs.readFileSync(dbg, 'utf8').split(/\r?\n/).filter(Boolean) : [];
  const roots = [config];
  try { roots.push(fs.realpathSync.native(config)); } catch { /* the spelling passed still counts */ }
  const fired = [...new Set([...caps.map((c) => `capture ${c.label}`), ...s.hookEvents.map((e) => `hook ${e}`)])];
  const gate = scratchIsolation({ fired, init: s.init, debug, roots, live: path.join(os.homedir(), '.claude'), expect });
  await sleep(1500);
  return { ...gate, exit: res.status, ms: res.ms, timedOut: res.timedOut, result: s.resultSubtype, debugLines: debug.length };
}

// One arm as run() launches it: its row for decide(). The user-scratch arm
// launches only once its pre-flight passes; otherwise its row carries the
// pre-flight's answer, launched false and nothing measured.
export async function runArm(ctx, a) {
  const { ws, out } = arm(ctx, a.name);
  fixtures(ws, a);
  const upeOpts = a.block === false ? {} : { respond: UPE_BLOCK };
  const settings = {
    disableSkillShellExecution: true,
    hooks: {
      UserPromptSubmit: [{ hooks: [hook(out, 'ups')] }],
      UserPromptExpansion: [{ matcher: '', hooks: [hook(out, 'upe', upeOpts)] }],
      PreToolUse: [{ matcher: 'Skill', hooks: [hook(out, 'pre')] }],
      Stop: [{ hooks: [hook(out, 'stop')] }],
    },
  };
  const args = ['--tools', a.tools, ...(a.model ? ['--allowedTools', 'Skill'] : []), ...FENCE, ...STREAM];
  if (a.plugin) args.push('--plugin-dir', path.join(ws, 'plug').replace(/\\/g, '/'));
  let sources;
  let env = {};
  let preflight = null;
  if (a.scratchUser) {
    const config = path.join(ws, 'config');
    write(path.join(config, 'skills', 'probe-user', 'SKILL.md'), skill('probe-user', 'Reply with exactly the word USER-OK and nothing else.', 'disable-model-invocation: true\n'));
    write(path.join(config, 'settings.json'), JSON.stringify({ hooks: { UserPromptSubmit: [{ hooks: [hook(out, 'user-src')] }] } }, null, 2));
    sources = 'user,project,local';
    env = { CLAUDE_CONFIG_DIR: config.replace(/\\/g, '/') };
    preflight = await scratchPreflight(ctx, { ws, out, config, sources, env, expect: a.expect });
  }
  const res = !preflight || preflight.ok ? runClaude({ cwd: ws, out, prompt: a.prompt, settings, sources, args, env, timeoutMs: a.block === false || a.model ? 300_000 : 180_000 }) : null;
  const caps = res ? readCaptures(out) : [];
  track(ctx, caps);
  const s = parseStream(res?.stdout);
  const upe = byLabel(caps, 'upe').map((c) => c.input);
  const order = caps.filter((c) => ['ups', 'upe'].includes(c.label)).map((c) => c.label);
  return {
    arm: a.name, prompt: a.prompt, expect: a.expect ?? null,
    ups: byLabel(caps, 'ups').length, userSrc: byLabel(caps, 'user-src').length,
    upe: upe.map((u) => ({ keys: Object.keys(u), expansion_type: u.expansion_type, command_name: u.command_name, command_args: u.command_args, command_source: u.command_source ?? '<absent>', prompt: u.prompt })),
    pre: byLabel(caps, 'pre').map((c) => ({ tool_name: c.input.tool_name, tool_input: c.input.tool_input ?? null })),
    stops: byLabel(caps, 'stop').length, order,
    listed: s.commands ? s.commands.includes(a.expect ?? '') : null,
    liveUserSkillsListed: s.commands ? LIVE_USER_SKILLS.filter((n) => s.commands.includes(n)) : null,
    commandsListed: s.commands ? s.commands.length : null,
    okSeen: a.ok ? s.result.includes(a.ok) : null,
    assistants: s.assistants, resultSubtype: s.resultSubtype, upeHookEvents: s.upeHookEvents,
    reply: s.result.slice(0, 200), exit: res?.status ?? null, ms: res?.ms ?? null, timedOut: res?.timedOut ?? false, streamLines: s.count,
    stderr: (res?.stderr || '').slice(0, 300),
    configDirInHookEnv: a.scratchUser ? caps.some((c) => c.env?.CLAUDE_CONFIG_DIR) : null,
    ...(preflight ? { preflight, launched: !!res } : {}),
  };
}

export default {
  id: 'Q3',
  question: 'What is UserPromptExpansion\'s command_name (and command_source, command_args) for user, plugin and native commands and for saved workflows?',
  assumption: 'A typed slash command fires UserPromptExpansion with command_name set to the command\'s name (a plugin\'s as <plugin>:<name>) and command_source set by where it came from: projectSettings for a project skill, a .claude/commands file or a saved workflow, userSettings for a user skill, plugin for a plugin skill or command (its bare alias too), builtin for a built-in (/init); a skill Claude invokes through the Skill tool fires PreToolUse on Skill instead, not UserPromptExpansion.',
  loadBearing: true,
  async run(ctx) {
    const rows = [];
    for (const a of ARMS) {
      rows.push(await runArm(ctx, a));
      await sleep(1500);
    }

    // Results go into evidence; none may carry a session id or a home path.
    return decide(rows, scrubber());
  },
};

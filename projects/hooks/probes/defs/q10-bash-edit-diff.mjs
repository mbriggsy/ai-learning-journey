// Q10: does tool_response.bashEditDiff reach a PostToolUse hook once
// bashEditDiffEnabled is on, and does a PowerShell call ever carry it?
//
// Three headless runs, each in a fresh git repo (its own workspace) holding a
// committed tracked.txt and edit.js, which rewrites tracked.txt. The model
// runs `node edit.js` once:
//   bash-on    Bash, bashEditDiffEnabled true in --settings (the claim)
//   bash-off   Bash, no setting, default permission mode: the control. The
//              docs say no diff is recorded here (hooks.md:1758), so a field
//              in bash-on is the setting's doing
//   ps-on      PowerShell, the setting on. The docs are silent; the binary
//              reading is that the PowerShell result has no such field
// Captures on PreToolUse, PostToolUse and PostToolUseFailure (matcher
// Bash|PowerShell) are written outside the repo, so they never count as a
// change. An arm counts only when its PostToolUse fired for its tool and git
// status shows tracked.txt really changed; the stream's init message says
// whether the PowerShell tool exists in the session at all. The verdict reads
// the hook input only; the docs call the field best effort and in beta.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { arm, byLabel, canary, gitEnv, hook, readCaptures, runStream, scrubber, sleep, track, write } from '../lib.mjs';

const ARMS = [
  { name: 'bash-on', tool: 'Bash', setting: true },
  { name: 'bash-off', tool: 'Bash', setting: false },
  { name: 'ps-on', tool: 'PowerShell', setting: true },
];

// Every string this probe returns goes through scrub: no session ids, no
// user paths. One scrubber for this probe, so its aliases number from 1.
const scrub = scrubber();

// gitEnv: the repo is the workspace (cwd), never one an outer GIT_DIR or
// GIT_INDEX_FILE names, where makeRepo's add -A and commit would land.
const git = (ws, args) => spawnSync('git', args, { cwd: ws, env: gitEnv(), encoding: 'utf8', shell: false, windowsHide: true });

function makeRepo(ws, word) {
  write(path.join(ws, 'tracked.txt'), 'v1\n');
  write(path.join(ws, 'edit.js'), `require('fs').writeFileSync(require('path').join(__dirname, 'tracked.txt'), ${JSON.stringify(`v2 ${word}\n`)});\n`);
  const id = ['-c', 'user.name=probe', '-c', 'user.email=probe@example.invalid', '-c', 'commit.gpgsign=false'];
  for (const step of [['init', '-q'], ['add', '-A'], [...id, 'commit', '-q', '-m', 'init']]) {
    const r = git(ws, step);
    if (r.status !== 0) throw new Error(`git ${step.at(-1)} failed in the probe repo: ${scrub(r.stderr)}`);
  }
  const st = git(ws, ['status', '--porcelain']).stdout.trim();
  if (st) throw new Error(`the fresh probe repo is not clean: ${scrub(st)}`);
}

// What a bashEditDiff value says, with paths cut to file names plus the
// facts a gate would match on (absolute? which separator? the exact file?).
function diffInfo(d, ws) {
  if (d === undefined) return { present: false };
  if (d === null || typeof d !== 'object') return { present: true, odd: d === null ? 'null' : typeof d };
  const changed = Array.isArray(d.changedFiles) ? d.changedFiles : [];
  const files = Array.isArray(d.files) ? d.files : [];
  const paths = [...changed, ...files.map((f) => f?.filePath)].filter((p) => typeof p === 'string');
  const target = path.resolve(ws, 'tracked.txt').toLowerCase();
  return {
    present: true,
    keys: Object.keys(d).sort(),
    changedFiles: changed.map((p) => path.basename(String(p))),
    files: files.map((f) => ({ name: path.basename(String(f?.filePath ?? '')), hunks: Array.isArray(f?.hunks) ? f.hunks.length : null, created: f?.created ?? null, deleted: f?.deleted ?? null })),
    moreFiles: d.moreFiles ?? null,
    unavailable: d.unavailable ?? null,
    skipped: d.skipped ?? null,
    shared: d.shared ?? null,
    namesTracked: paths.some((p) => path.basename(p) === 'tracked.txt'),
    exactPath: paths.some((p) => path.resolve(p).toLowerCase() === target),
    absolute: paths.length > 0 && paths.every((p) => path.isAbsolute(p)),
    separators: [...new Set(paths.map((p) => (p.includes('\\') ? 'backslash' : p.includes('/') ? 'slash' : 'none')))],
  };
}

// An arm counts only when its tool's PostToolUse fired and tracked.txt changed.
const seen = (r) => r.posts > 0 && r.changed;
const shape = (i) => (i.odd ? `an odd value (${i.odd})` : `changedFiles ${JSON.stringify(i.changedFiles)} (absolute ${i.absolute}, ${(i.separators ?? []).join('/') || 'no'} separators, exact workspace path ${i.exactPath}), files ${JSON.stringify(i.files)}, keys ${(i.keys ?? []).join(',')}`);

// The verdict from the three arms' rows: {verdict, summary}, unscrubbed. The
// PARTIAL is a PowerShell arm BLOCKED (the session had no such tool) beside a
// Bash claim that held, so it says unsettledOnly.
export function decide(rows) {
  const on = rows['bash-on'];
  const off = rows['bash-off'];
  const ps = rows['ps-on'];
  const unseen = ['bash-on', 'bash-off'].filter((k) => !seen(rows[k]));
  if (unseen.length) return { verdict: 'INCONCLUSIVE', summary: `the Bash edit was not seen (no PostToolUse on Bash, or tracked.txt unchanged) in: ${unseen.join(', ')}` };
  if (on.info.present && on.info.unavailable) return { verdict: 'INCONCLUSIVE', summary: 'with the setting on, bashEditDiff came back unavailable: the diff could not be taken, which says nothing about the field' };
  const offPart = off.info.present ? `the no-setting control in ${off.permissionMode} mode carried it too (the docs say that mode records nothing)` : `absent without the setting in ${off.permissionMode} mode`;
  if (!on.info.present) return { verdict: 'CONTRADICTED', summary: `with bashEditDiffEnabled true in --settings, the Bash PostToolUse input had no bashEditDiff (tool_response keys ${on.responseKeys.join(',')}); ${offPart}` };
  if (!on.info.namesTracked) return { verdict: 'CONTRADICTED', summary: `bashEditDiff was present but did not name tracked.txt: ${shape(on.info)}` };
  const bashPart = `Bash with the setting: present, ${shape(on.info)}; ${offPart}`;
  if (!ps.available) return { verdict: 'PARTIAL', summary: `${bashPart}. The PowerShell arm is BLOCKED: the -p session listed no PowerShell tool (shell tools ${JSON.stringify(ps.initTools)})`, unsettledOnly: true };
  if (!seen(ps)) return { verdict: 'INCONCLUSIVE', summary: `${bashPart}; but the PowerShell edit was not seen (PostToolUse on PowerShell ${ps.posts}, git status ${JSON.stringify(ps.status)})` };
  if (ps.info.present) return { verdict: 'CONTRADICTED', summary: `a PowerShell edit carried bashEditDiff: ${shape(ps.info)}; ${bashPart}` };
  return { verdict: 'VERIFIED', summary: `${bashPart}; PowerShell with the setting edited tracked.txt and carried none (tool_response keys ${ps.responseKeys.join(',')})` };
}

export default {
  id: 'Q10',
  question: 'Does bashEditDiff appear in PostToolUse hook input once bashEditDiffEnabled is on, and does a PowerShell call ever carry it?',
  assumption: 'With bashEditDiffEnabled set (via --settings), a Bash command that edits a tracked file in a git repo yields PostToolUse tool_response.bashEditDiff naming the file; a PowerShell edit carries no bashEditDiff.',
  loadBearing: false,
  async run(ctx) {
    const rows = {};
    for (const a of ARMS) {
      const { ws, out } = arm(ctx, a.name);
      makeRepo(ws, canary('EDIT'));
      const on = { matcher: 'Bash|PowerShell' };
      const settings = {
        ...(a.setting ? { bashEditDiffEnabled: true } : {}),
        hooks: {
          PreToolUse: [{ ...on, hooks: [hook(out, 'pre')] }],
          PostToolUse: [{ ...on, hooks: [hook(out, 'post')] }],
          PostToolUseFailure: [{ ...on, hooks: [hook(out, 'fail')] }],
        },
      };
      const prompt = `Use the ${a.tool} tool to run exactly this command once: node edit.js . Do not run anything else. Then reply with exactly the word DONE.`;
      const s = await runStream({ cwd: ws, out, settings, args: ['--tools', a.tool, '--allowedTools', `${a.tool}(node edit.js)`], turns: [prompt] });
      const caps = readCaptures(out);
      track(ctx, caps);
      const init = s.messages.find((m) => m.type === 'system' && m.subtype === 'init');
      const tools = Array.isArray(init?.tools) ? init.tools : null;
      const status = git(ws, ['status', '--porcelain']).stdout.trim();
      const posts = byLabel(caps, 'post').filter((c) => c.input?.tool_name === a.tool);
      const first = posts[0];
      rows[a.name] = {
        tool: a.tool,
        setting: a.setting,
        available: tools ? tools.includes(a.tool) : byLabel(caps, 'pre').some((c) => c.input?.tool_name === a.tool),
        initTools: tools ? tools.filter((t) => /^(Bash|PowerShell)$/.test(t)) : null,
        pre: byLabel(caps, 'pre').length,
        posts: posts.length,
        fails: byLabel(caps, 'fail').length,
        command: first?.input?.tool_input?.command ?? null,
        permissionMode: first?.input?.permission_mode ?? null,
        responseKeys: first ? Object.keys(first.input?.tool_response ?? {}).sort() : null,
        info: first ? diffInfo(first.input?.tool_response?.bashEditDiff, ws) : null,
        allPostsCarry: posts.map((c) => c.input?.tool_response?.bashEditDiff !== undefined),
        status,
        changed: /tracked\.txt/.test(status),
        reply: (s.results.at(-1)?.result ?? '').slice(0, 80),
        exit: s.code,
      };
      await sleep(1500);
    }
    const evidence = Object.entries(rows).map(([k, r]) => scrub(`${k}: ${r.tool} available ${r.available} (init shell tools ${JSON.stringify(r.initTools)}), setting ${r.setting ? 'on' : 'unset'}, permission_mode ${r.permissionMode}, PreToolUse ${r.pre}, PostToolUse on ${r.tool} ${r.posts}, failures ${r.fails}, command ${JSON.stringify(r.command)}, git status ${JSON.stringify(r.status)}, tool_response keys ${JSON.stringify(r.responseKeys)}, bashEditDiff ${JSON.stringify(r.info)}, carried per PostToolUse ${JSON.stringify(r.allPostsCarry)}, exit ${r.exit}, reply ${JSON.stringify(r.reply)}`));
    const d = decide(rows);
    return { ...d, summary: scrub(d.summary), evidence, observed: rows };
  },
};

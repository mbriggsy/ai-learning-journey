// lib.mjs: what every probe shares. A probe runs throwaway headless Claude
// Code sessions in a scratch folder, points their hooks at capture.mjs, and
// reads back what fired.
//
// Isolation, the reason for most of this file:
// - The child gets this process's environment minus every CLAUDE* variable.
//   A session launched from inside another one inherits its session id, its
//   messaging socket and its ATTENDED/ENTRYPOINT values, which would both
//   falsify the probes that read them and let the child talk to its parent.
//   The git location variables go too (gitEnv), so neither a probe's git nor
//   the session's own can land on a repo an outer git hook names, and so do
//   AI_AGENT, every secret-shaped name, the gateway pair and the names that
//   pick another credential (SECRET_ENV): a probe signs in as the CLI's own
//   login, straight to Anthropic, never with an API key a sourced .env left
//   in the shell, another profile or workload identity, or through a gateway
//   it named, and no secret reaches a probe's tools or hooks.
// - User settings stay out (--setting-sources project,local) unless a probe
//   needs them. The live user hooks touch machine-wide /tmp markers another
//   session reads; a probe must never fire them.
// - Every launch carries a --settings file with claudeMdExcludes (see
//   claudeMdExcludes): the pilot's ~/.claude/CLAUDE.md would otherwise steer
//   every probe model, as user memory and, through the temp dir's ancestors,
//   as project memory too. The same file sets crossSessionInbound 'refuse':
//   a -p session binds an inbox like an interactive one, and a live session's
//   message must never land in a probe's turn.
// - --strict-mcp-config: no configured MCP server starts. A def may add its
//   own probe-local stub with --mcp-config (Q15 does); nothing else loads.
//
// lib.mjs and capture.mjs are hashed into every verdict (run.mjs probeHash):
// an edit here makes every recorded verdict stale until its probe re-runs.

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CAPTURE = path.join(HERE, 'capture.mjs');

const fwd = (p) => p.replace(/\\/g, '/');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The CLI every launch runs, as an argv prefix. Only tests/probes.test.mjs
// changes it (to a stand-in that speaks stream-json), through this setter and
// never through the environment, so no real run can be pointed elsewhere.
let claudeCmd = ['claude'];
export function setClaudeCommand(cmd) {
  const prev = claudeCmd;
  claudeCmd = cmd;
  return prev;
}
const claudeArgv = (argv) => [claudeCmd[0], [...claudeCmd.slice(1), ...argv]];

export function cliVersion() {
  const r = spawnSync(...claudeArgv(['--version']), { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });
  if (r.error?.code === 'ETIMEDOUT') throw new Error('claude --version did not answer in 30 s');
  const m = /^(\d+\.\d+\.\d+)/.exec((r.stdout || '').trim());
  if (!m) throw new Error(`claude --version gave no version: ${r.stdout || r.stderr || r.error}`);
  return m[1];
}

// Where git looks for a repository and how it reads pathspecs: the list
// tests/leak.mjs drops for the same reason. Matched case-blind, as Windows
// reads environment names.
export const GIT_LOCATION_VARS = [
  'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_COMMON_DIR', 'GIT_NAMESPACE', 'GIT_PREFIX', 'GIT_LITERAL_PATHSPECS',
  'GIT_GLOB_PATHSPECS', 'GIT_NOGLOB_PATHSPECS', 'GIT_ICASE_PATHSPECS',
];

// The environment for a probe's own git calls: git works on the repo it is
// pointed at (-C or cwd), never on one an outer git hook or shell names.
export function gitEnv(extra = {}) {
  const drop = new Set(GIT_LOCATION_VARS);
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!drop.has(k.toUpperCase())) env[k] = v;
  return { ...env, ...extra };
}

// The names cleanEnv drops besides CLAUDE*: AI_AGENT (the launching CLI's
// version tag, which a child session would otherwise inherit as its own), the
// two variables the CLI sends as credentials (a -p session always uses an
// ANTHROPIC_API_KEY that is set, over the login: env-vars reference), the two
// that send the login elsewhere or a key beside it (ANTHROPIC_BASE_URL makes a
// gateway the endpoint, so it receives each request, login and all, where a
// proxy variable only carries the connection to Anthropic's endpoint;
// ANTHROPIC_CUSTOM_HEADERS adds any header, Authorization included), the ones
// that pick another credential to sign in with (ANTHROPIC_PROFILE; the
// workload-identity trio ANTHROPIC_FEDERATION_RULE_ID, _ORGANIZATION_ID and
// _WORKSPACE_ID, which rank above the login), DATABASE_URL (it carries its
// password), and any secret-shaped name: one ending in _API_KEY,
// _ACCESS_KEY, _SECRET_KEY, _PRIVATE_KEY, _TOKEN, _SECRET, _PASSWORD,
// _PASS, _PWD or _CREDENTIALS, or holding _TOKEN_ (AWS_BEARER_TOKEN_BEDROCK).
// None of these can sign a probe in once CLAUDE_CODE_USE_* is gone, but each
// would reach the probe model's Bash and the probe hooks. A deny list, never
// an allow list: the CLI
// needs PATH and PATHEXT, its profile dirs (USERPROFILE/HOME, APPDATA,
// LOCALAPPDATA: its login lives there), TEMP, SystemRoot, ComSpec,
// ProgramFiles (Git Bash) and any proxy or CA variable, and one name missed
// would blind a probe.
export const SECRET_ENV = /^(AI_AGENT|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|ANTHROPIC_BASE_URL|ANTHROPIC_CUSTOM_HEADERS|ANTHROPIC_PROFILE|ANTHROPIC_FEDERATION_RULE_ID|ANTHROPIC_ORGANIZATION_ID|ANTHROPIC_WORKSPACE_ID|DATABASE_URL)$|_(API_KEY|ACCESS_KEY|SECRET_KEY|PRIVATE_KEY|TOKEN|SECRET|PASSWORD|PASS|PWD|CREDENTIALS)$|_TOKEN_/i;

// A probe session's environment. `extra` is the caller's own and is kept as
// given.
export function cleanEnv(extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(gitEnv())) if (!/^CLAUDE/i.test(k) && !SECRET_ENV.test(k)) env[k] = v;
  return { ...env, ...extra };
}

export function workspace(id) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `claude-probe-${id.toLowerCase()}-`));
}

export function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

// Text safe to keep as evidence: the home dir becomes ~ (in every spelling:
// either slash, JSON-doubled backslashes, msys /c/...), any other Windows
// profile root <profile>, and each session UUID or API id (msg_01..., toolu_01...)
// a stable alias, the same alias every time this scrubber sees it, so evidence
// can still say two ids match. One scrubber per probe keeps its numbering local.
// The <profile> forms take no left boundary, as tests/leak.mjs's rules take
// none: in JSON.stringify output a path after a newline sits glued to the
// escape's 'n', and a WSL path wears a /mnt prefix.
export function scrubber({ home = os.homedir() } = {}) {
  const aliases = new Map();
  const count = {};
  const alias = (kind, id) => {
    const key = `${kind}:${id.toLowerCase()}`;
    if (!aliases.has(key)) aliases.set(key, `<${kind}-${(count[kind] = (count[kind] ?? 0) + 1)}>`);
    return aliases.get(key);
  };
  const segs = home.split(/[\\/]+/).filter(Boolean);
  const sep = '[\\\\/]+';
  const start = '(?<![\\w.~-])';
  const end = '(?=[\\\\/"\'`\\s,;:)\\]}>]|$)';
  const homes = [];
  if (/^[A-Za-z]:$/.test(segs[0] ?? '')) {
    homes.push(new RegExp(`${start}${segs.map(escapeRe).join(sep)}${end}`, 'gi'));
    homes.push(new RegExp(`${start}/${escapeRe(segs[0][0])}/${segs.slice(1).map(escapeRe).join('/')}${end}`, 'gi'));
  } else if (segs.length) {
    homes.push(new RegExp(`${start}${sep}${segs.map(escapeRe).join(sep)}${end}`, 'gi'));
  }
  // The folder-name form of the home dir, as the CLI names ~/.claude/projects
  // and %TEMP%/claude folders: each character that isn't a letter or digit
  // becomes '-', so the drive colon and each separator turn into dashes.
  if (segs.length) homes.push(new RegExp(`${escapeRe(fwd(home).replace(/\/+$/, '').replace(/[^A-Za-z0-9]/g, '-'))}(?![A-Za-z0-9])`, 'gi'));
  return (text) => {
    let t = String(text);
    for (const re of homes) t = t.replace(re, () => '~');
    return t
      .replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'`,;:)\]}>]*/gi, () => '<profile>')
      .replace(/(?:\/mnt)?\/[a-z]\/Users\/[^/\s"'`,;:)\]}>]*/gi, () => '<profile>')
      .replace(/[A-Za-z]--Users-[A-Za-z0-9]*/gi, () => '<profile>')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (id) => alias('id', id))
      .replace(/\b(msg|req|toolu|session)_01[A-Za-z0-9]{20,}/g, (id, kind) => alias(kind, id));
  };
}

// claudeMdExcludes for every probe launch. Exactly these files, nothing else:
//   ~/.claude/CLAUDE.md   the pilot's user memory. It also loads as PROJECT
//                         memory: every workspace sits under the system temp
//                         dir, which sits under the home dir, and memory reads
//                         <dir>/.claude/CLAUDE.md for each ancestor <dir> of the
//                         cwd (Q15's requests listed it as project instructions).
//   ~/.claude/rules/**    user rules, which load the same two ways (none exist
//                         on 2026-10-21; listed so one added later stays out).
// The CLI matches patterns as globs against absolute paths, so each file is
// listed with forward slashes, plus its backslash spelling (a plain absolute
// path) and both drive-letter cases on Windows. A workspace's own CLAUDE.md
// (Q15 writes one) and every other ancestor's files are not covered.
// Managed-policy CLAUDE.md can't be excluded (settings reference).
export function claudeMdExcludes(home = os.homedir()) {
  const h = fwd(home).replace(/\/+$/, '');
  const drive = /^[A-Za-z]:/.test(h);
  const homes = drive ? [h, h[0] === h[0].toUpperCase() ? h[0].toLowerCase() + h.slice(1) : h[0].toUpperCase() + h.slice(1)] : [h];
  const out = [];
  for (const x of homes) {
    out.push(`${x}/.claude/CLAUDE.md`, `${x}/.claude/rules/**`);
    if (drive) out.push(`${x}/.claude/CLAUDE.md`.replace(/\//g, '\\'));
  }
  return out;
}

// A probe's settings with the isolation keys merged in: the CLAUDE.md
// excludes added to any it lists, and crossSessionInbound 'refuse' unless it
// sets that key itself. A --settings value outranks user settings for that
// key (settings reference), and a project or local one can only be stricter.
function withExcludes(settings) {
  const s = settings ?? {};
  const have = Array.isArray(s.claudeMdExcludes) ? s.claudeMdExcludes : [];
  return { ...(Object.hasOwn(s, 'crossSessionInbound') ? {} : { crossSessionInbound: 'refuse' }), ...s, claudeMdExcludes: [...new Set([...have, ...claudeMdExcludes()])] };
}

// The probe's settings (or none) written to out/settings.json with the
// isolation keys merged in; returns the file, for baseArgs.
export function writeSettings(out, settings = {}) {
  return write(path.join(out, 'settings.json'), JSON.stringify(withExcludes(settings), null, 2));
}

// The isolation flags every probe launch carries (see the header): no
// configured MCP server (a def's own --mcp-config stub still loads), the setting sources ('project,local' by default; null passes no
// --setting-sources), and the settings file. A file a def wrote itself gets
// the isolation keys merged in place whenever they change it, so a def that
// spawns the CLI on its own is isolated exactly as runClaude and runStream are.
export function baseArgs({ sources, settingsFile } = {}) {
  if (!settingsFile) throw new Error('baseArgs needs a settings file (the CLAUDE.md excludes ride in it): writeSettings(out, settings) makes one');
  const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  const merged = withExcludes(settings);
  if (JSON.stringify(merged) !== JSON.stringify(settings)) fs.writeFileSync(settingsFile, JSON.stringify(merged, null, 2));
  return ['--strict-mcp-config', ...(sources === null ? [] : ['--setting-sources', sources || 'project,local']), '--settings', fwd(settingsFile)];
}

// A hook entry that runs capture.mjs under `label`, in exec form (`command`
// plus `args`: no shell, so nothing is quoted or expanded). `respond` is a
// JSON value (or a string) the hook prints on stdout; it goes to a file beside
// the probe's captures, never into an argument.
export function hook(out, label, { respond, stderr, exit, whenInactive, firstOnly, ...extra } = {}) {
  const args = [fwd(CAPTURE), label];
  if (whenInactive) args.push('--when-inactive');
  if (firstOnly) args.push('--first-only');
  if (respond !== undefined) {
    const f = write(path.join(out, 'respond', `${label}.out`), typeof respond === 'string' ? respond : JSON.stringify(respond));
    args.push('--respond', fwd(f));
  }
  if (stderr !== undefined) {
    const f = write(path.join(out, 'respond', `${label}.err`), stderr);
    args.push('--stderr', fwd(f));
  }
  if (exit !== undefined) args.push('--exit', String(exit));
  return { type: 'command', command: 'node', args, ...extra };
}

// Every capture so far. A hook may be mid-append while a probe polls, so a
// torn LAST line is skipped; a bad line anywhere else is corruption and throws.
export function readCaptures(out) {
  const f = path.join(out, 'captures.jsonl');
  if (!fs.existsSync(f)) return [];
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const caps = [];
  lines.forEach((l, i) => {
    if (!l) return;
    try {
      caps.push(JSON.parse(l));
    } catch (e) {
      if (i !== lines.length - 1) throw e;
    }
  });
  return caps;
}

export function readJsonl(file) {
  if (!file || !fs.existsSync(file)) return [];
  const out = [];
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!l) continue;
    try {
      out.push(JSON.parse(l));
    } catch {
      // a torn last line while the session was still writing
    }
  }
  return out;
}

// Kill a probe session and what it started. On Windows child.kill() is
// TerminateProcess on claude.exe alone, which orphans its hook and Bash
// children, so the tree goes. Node holds the process handle until it reaps
// the exit, so while exitCode is null the pid can't belong to anything else.
export function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    const r = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, timeout: 15_000 });
    if (r.status === 0) return;
  }
  try { child.kill(); } catch { /* gone */ }
}

// How long to wait for the pipes after the process has exited: 'close' brings
// stdout's last lines, but a grandchild that inherited the pipe (claude --bg's
// supervisor, say) would hold it open for good.
const PIPE_GRACE_MS = 10_000;

// One headless turn: claude -p <prompt> --output-format json.
// opts: cwd, out (PROBE_OUT), settings (object, written to out/settings.json),
// sources ('project,local' by default; null passes no --setting-sources),
// args (extra CLI args), timeoutMs.
export function runClaude({ cwd, out, prompt, settings, sources, args = [], timeoutMs = 300_000, env = {} }) {
  const argv = ['-p', prompt, '--output-format', 'json', ...baseArgs({ sources, settingsFile: writeSettings(out, settings) }), ...args];
  const t0 = Date.now();
  const r = spawnSync(...claudeArgv(argv), {
    cwd, env: cleanEnv({ PROBE_OUT: out, ...env }), encoding: 'utf8', shell: false, windowsHide: true,
    timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // not JSON: kept raw below
  }
  const res = { status: r.status, signal: r.signal, timedOut: r.error?.code === 'ETIMEDOUT', ms: Date.now() - t0, json, stdout: r.stdout, stderr: r.stderr };
  write(path.join(out, `run-${t0}.json`), JSON.stringify({ argv, ...res }, null, 2));
  return res;
}

// Why a runClaude or runClaudeAsync run failed, or null when it exited 0 on a
// result that is no error: 'timed out' (lib's timeout killed it), 'exited <N>
// with no result' (no result message on stdout; N is null after a signal),
// 'ended on an error result (<subtype>)', or 'exited <N>' after a clean
// result. A failed run is a blind instrument: an arm that names one is
// unsettled, never evidence that a hook did not fire.
export function failure(res) {
  if (res.timedOut) return 'timed out';
  if (res.json?.type !== 'result') return `exited ${res.status} with no result`;
  if (res.json.is_error) return `ended on an error result (${res.json.subtype})`;
  return res.status !== 0 ? `exited ${res.status}` : null;
}

// runClaude without blocking, for a probe that acts mid-turn (Q7 kills a -p
// run once a hook has fired): {child, done}. `done` resolves with runClaude's
// fields (timedOut: lib's timeout fired and killed the tree) plus pid, and
// recordError (the write's error code) when its run-<t0>.json could not be
// written, once the process and its pipes are gone. Stdin ends at once, the
// EOF spawnSync gives runClaude.
export function runClaudeAsync({ cwd, out, prompt, settings, sources, args = [], timeoutMs = 300_000, env = {} }) {
  const argv = ['-p', prompt, '--output-format', 'json', ...baseArgs({ sources, settingsFile: writeSettings(out, settings) }), ...args];
  const t0 = Date.now();
  const child = spawn(...claudeArgv(argv), { cwd, env: cleanEnv({ PROBE_OUT: out, ...env }), shell: false, windowsHide: true });
  child.stdin.on('error', () => { /* the process is gone; nothing more to send */ });
  child.stdin.end();
  const done = new Promise((resolve) => {
    const dout = new StringDecoder('utf8');
    const derr = new StringDecoder('utf8');
    let stdout = '';
    let stderr = '';
    let exit = null;
    let settled = false;
    let timedOut = false;
    let grace = null;
    child.stdout.on('data', (d) => { stdout += dout.write(d); });
    child.stderr.on('data', (d) => { stderr += derr.write(d); });
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeoutMs);
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(grace);
      stdout += dout.end();
      stderr += derr.end();
      let json = null;
      try {
        json = JSON.parse(stdout);
      } catch {
        // not JSON: kept raw below
      }
      const res = { pid: child.pid, status: exit?.code ?? null, signal: exit?.signal ?? null, timedOut, ms: Date.now() - t0, json, stdout, stderr };
      // The record is evidence only (no def reads it back). This runs in a
      // listener or a timer, where a throw would be uncaught and `done` would
      // never settle, so a failed write is noted on the result instead.
      try {
        write(path.join(out, `run-${t0}.json`), JSON.stringify({ argv, ...res }, null, 2));
      } catch (e) {
        res.recordError = e.code || e.message;
      }
      resolve(res);
    };
    child.on('exit', (code, signal) => {
      exit = { code, signal };
      clearTimeout(timer);
      grace = setTimeout(settle, PIPE_GRACE_MS);
    });
    child.on('close', settle);
    child.on('error', (e) => { stderr += String(e); if (child.pid === undefined) settle(); });
  });
  return { child, done };
}

// A multi-turn headless session over stream-json. `turns` is a list of
// prompts, or functions returning one (they run between turns, so a probe can
// change a file mid-session); null ends the session. Resolves once the
// session is over and its pipes are drained: {why, code, signal, messages,
// results, stderr, killedByLib, stdinToExitMs, ms}. why is done, exited,
// timeout, turn-error (a turn function threw) or spawn-error. killedByLib:
// still up killAfterMs after its stdin closed, so this killed it. stderr also
// carries runStream's own notes, a stream-<t0>.jsonl it could not write among
// them.
export function runStream({ cwd, out, turns, settings, sources, args = [], timeoutMs = 600_000, killAfterMs = 20_000, env = {} }) {
  const argv = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', ...baseArgs({ sources, settingsFile: writeSettings(out, settings) }), ...args];
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(...claudeArgv(argv), { cwd, env: cleanEnv({ PROBE_OUT: out, ...env }), shell: false, windowsHide: true });
    const messages = [];
    const decoder = new StringDecoder('utf8');
    let buf = '';
    let stderr = '';
    let turn = 0;
    let why = null;
    let endedAt = null;
    let exit = null;
    let closed = false;
    let settled = false;
    let killedByLib = false;
    let killTimer = null;
    let grace = null;
    const note = (s) => { stderr += `\n[runStream] ${s}`; };
    const timer = setTimeout(() => finish('timeout'), timeoutMs);

    const settle = () => {
      if (settled || !why || !closed) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      clearTimeout(grace);
      // Evidence only, as in runClaudeAsync: a failed write goes to stderr,
      // never out of this listener as an uncaught throw.
      const file = path.join(out, `stream-${t0}.jsonl`);
      try {
        write(file, messages.map((m) => JSON.stringify(m)).join('\n'));
      } catch (e) {
        note(`could not write ${path.basename(file)}: ${e.code || e.message}`);
      }
      const stdinToExitMs = endedAt !== null && exit ? exit.at - endedAt : null;
      resolve({ why, code: exit?.code ?? null, signal: exit?.signal ?? null, messages, stderr, results: messages.filter((m) => m.type === 'result'), killedByLib, stdinToExitMs, ms: Date.now() - t0 });
    };
    // Ending stdin lets the session shut down on its own, so its SessionEnd
    // hooks run; it is killed only if it is still up killAfterMs later.
    // endedAt is set only when the session was still up, so stdinToExitMs
    // stays null for one that exited by itself first.
    const finish = (w) => {
      if (why) return;
      why = w;
      clearTimeout(timer);
      try { child.stdin.end(); } catch { /* already closed */ }
      if (!exit) {
        endedAt = Date.now();
        killTimer = setTimeout(() => { if (!exit) { killedByLib = true; killTree(child); } }, killAfterMs);
      }
      settle();
    };
    // Never writes once the session is ending: a result can still arrive
    // after a timeout, and a turn function can outlive the session.
    const send = async () => {
      if (why) return;
      try {
        if (turn >= turns.length) return finish('done');
        const t = turns[turn++];
        const text = typeof t === 'function' ? await t() : t;
        if (why) return;
        if (text === null) return finish('done');
        child.stdin.write(`${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } })}\n`);
      } catch (e) {
        note(`turn ${turn} failed: ${e.stack || e}`);
        finish('turn-error');
      }
    };
    const onLine = (line) => {
      if (!line.trim()) return;
      let m;
      try { m = JSON.parse(line); } catch { return; }
      messages.push(m);
      if (m.type === 'result') send();
    };
    const take = (text, flush) => {
      buf += text;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        onLine(line);
      }
      if (flush && buf) {
        onLine(buf);
        buf = '';
      }
    };

    child.stdout.on('data', (d) => { if (!settled) take(decoder.write(d)); });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.on('error', (e) => note(`stdin: ${e.code || e.message}`));
    child.on('exit', (code, signal) => {
      exit = { code, signal, at: Date.now() };
      clearTimeout(killTimer);
      grace = setTimeout(() => { closed = true; settle(); }, PIPE_GRACE_MS);
      finish('exited');
    });
    child.on('close', () => {
      if (settled) return;
      take(decoder.end(), true);
      closed = true;
      settle();
    });
    // With a pid this is a failed kill, and the exit still decides; without
    // one the CLI never started, and no exit or close will come.
    child.on('error', (e) => {
      note(`child: ${e.message}`);
      if (child.pid !== undefined) return;
      exit = exit ?? { code: null, signal: null, at: Date.now() };
      closed = true;
      finish('spawn-error');
      settle();
    });
    send();
  });
}

// The transcript a capture names (the hook's transcript_path), when it exists.
export function transcriptFrom(captures) {
  const p = captures.map((c) => c.input?.transcript_path).find((x) => x && fs.existsSync(x));
  return p || null;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Each folder a probe makes joins ctx.made and is written to <ctx.out>/made.json
// at once, so run.mjs --cleanup can find it even when the probe crashes later.
function recordMade(ctx, dir) {
  if (ctx.made.includes(dir)) return;
  ctx.made.push(dir);
  if (ctx.out) write(path.join(ctx.out, 'made.json'), `${JSON.stringify(ctx.made, null, 2)}\n`);
}

// A fresh workspace and capture folder for one arm of a probe.
export function arm(ctx, name) {
  const ws = workspace(`${ctx.id}-${name}`);
  recordMade(ctx, ws);
  const out = path.join(ctx.out, name);
  fs.mkdirSync(out, { recursive: true });
  return { ws, out };
}

// Record the transcript folders these captures name, for --cleanup.
export function track(ctx, captures) {
  for (const c of captures) {
    const t = c.input?.transcript_path;
    if (t) recordMade(ctx, path.dirname(t));
  }
}

// A word the model can only know if a hook's text reached it.
export const canary = (tag) => `${tag}-${randomBytes(3).toString('hex').toUpperCase()}`;

export const byLabel = (captures, label) => captures.filter((c) => c.label === label);

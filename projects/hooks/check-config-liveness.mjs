#!/usr/bin/env node
// check-config-liveness.mjs -- the SessionStart config-liveness check.
//
// Called by elite-engineer-session-start.sh (no hook entry of its own). It hunts the
// one defect class that bit the method plumbing three ways at once (2026-09-29): wiring
// that names something which is not there, and fails SILENTLY because a hook that never
// matches, or never runs, looks exactly like a hook with nothing to say.
//
//   1. A skill name in a hook script's case-arm (a `case` over a variable read from
//      `.tool_input.skill`) that is not in the installed roster. Every alternative is
//      judged on its own: a dead alias beside a live one is still flagged, because a
//      whole dead arm (the 2026-09-29 `ce:review` arm) hides inside a mixed one.
//   2. A hook (or statusLine) command in settings.json whose script path does not exist.
//   3. A ~/.claude/skills entry (or <project>/.claude/skills entry) that is a junction
//      or symlink whose target does not resolve.
//   4. The permissions block (U4): permissions.mjs's allowWarnings and
//      configWarnings over the user settings and every project settings file of the
//      monorepo and its worktrees. It warns when an allow (any file) lets a push skip
//      the auto-mode safety check (a tool-wide shell allow auto mode drops does not),
//      or reaches playwright's run-code tool past its deny; when a U4 catalog rule,
//      the catalog's autoMode.soft_deny entry or every-marketplace's auto-update is
//      missing from user settings; when a Bash deny turns the PowerShell tool off
//      without a word; and when review-lens is not deployed or differs from its
//      tracked source. It also reads the allowed-tools frontmatter of every enabled
//      plugin's skills and commands (lib/plugin-grants.mjs) and warns on a grant that
//      lets a push or run-code skip the safety check, asked as of an allow (with the
//      user's denies: a grant applies in every session), that PLUGIN_GRANTS, the U4
//      baseline, does not list. One way only: a baseline grant that disappears is no
//      warning. ~/.claude.json's
//      allowedTools is read by nothing (a named residual since the U4 cut retired
//      the landing check; every list was empty on 2026-10-23).
//
// The roster = every ENABLED plugin in plugins/installed_plugins.json (installPath ->
// skills/<dir> and commands/*.md, each in bare and '<plugin>:<name>' form, plus each
// SKILL.md's frontmatter `name:`), + ~/.claude/skills/* and ~/.claude/commands/*.md,
// + <dir>/.claude/skills/* and <dir>/.claude/commands/*.md for the project dir and
// every ancestor. Commands count because the Skill tool invokes them too.
//
// The project files (4) = .claude/settings.json and .claude/settings.local.json of
// every folder 0 to 3 levels below each root (the root itself is level 0, so
// projects/archive/<x> is level 3), node_modules and .git skipped, junctions and
// symlinks not followed. The roots = the monorepo root (--monorepo, else the folder
// the ultramode-code-review skill junction points into, three levels up) and every
// worktree `git worktree list` names for it. The walk and the worktree list are
// lib/permissions.mjs's (settingsFilesUnder, worktreeRoots).
//
// Output contract: plain text on stdout -- NOTHING when all green, else one short
// 'CONFIG LIVENESS WARNINGS' block. Exit code is always 0. Any error inside checks 1-3
// drops that check's findings (never a false alarm from a half-built roster, never a
// crash): the manifesto injection that calls this must never be put at risk. Check 4
// never goes silent: it loads permissions.mjs and plugin-grants.mjs inside its own
// try, so a missing module, a broken catalog or any other throw is one 'permissions
// check failed: <why>' line, and a file it could not read or a root it could not find
// is a line of its own. Check 4's lines fall in two kinds. S1 lines (an allow or a
// plugin grant that lets a push or run-code skip the safety check, and every line
// saying part of that check went blind: a settings file or the plugin list not read,
// no monorepo root, the worktree list failed, the check failed) all print first and
// are never cut, however many there are. The other lines (check 4's notes, then
// checks 1-3) fill what is left of MAX_LINES, and a tail line counts the rest and
// names `--all`, which prints every line.
//
// Test overrides (the session-start hook passes none):
//   --claude-dir <dir>   root holding settings.json, hooks/, skills/, commands/, plugins/,
//                        agents/
//   --settings <file>    settings.json to read          (default <claude-dir>/settings.json)
//   --hook <file>        hook script to scan; repeatable (default: every .sh a settings
//                        hook command names + <claude-dir>/hooks/*.sh)
//   --skills-dir <dir>   global skills dir               (default <claude-dir>/skills)
//   --project-dir <dir>  project dir (default $CLAUDE_PROJECT_DIR, else process.cwd())
//   --rules <file>       permission catalog JSON (default lib/permission-rules.json)
//   --monorepo <dir>     monorepo root (default: from the skill junction, as above)
//   --debug              roster size + scanned files on stderr, and one line from check 4
//   --all                every warning line, none cut (the tail line names it)

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_LINES = 15;
const IS_WIN = process.platform === 'win32';
const HOME = os.homedir();

function parseArgs(argv) {
  const a = { hooks: [], debug: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--claude-dir') { a.claudeDir = v; i++; }
    else if (k === '--settings') { a.settings = v; i++; }
    else if (k === '--hook') { a.hooks.push(v); i++; }
    else if (k === '--skills-dir') { a.skillsDir = v; i++; }
    else if (k === '--project-dir') { a.projectDir = v; i++; }
    else if (k === '--rules') { a.rules = v; i++; }
    else if (k === '--monorepo') { a.monorepo = v; i++; }
    else if (k === '--debug') { a.debug = true; }
    else if (k === '--all') { a.all = true; }
  }
  return a;
}

const norm = (p) => (IS_WIN ? path.resolve(p).toLowerCase() : path.resolve(p));
const tilde = (p) => {
  const h = HOME.replace(/\\/g, '/');
  const s = p.replace(/\\/g, '/');
  return s.toLowerCase().startsWith(h.toLowerCase()) ? '~' + s.slice(h.length) : s;
};
// This script as the warnings name it: the copy that ran (a version folder's,
// once deployed), so the command they print reruns the same checks.
const SELF = tilde(fileURLToPath(import.meta.url));

function listDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

function frontmatterName(file) {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 4096);
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(head);
    if (!fm) return null;
    const m = /^name:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(fm[1]);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

// Skill dirs (incl. junctions) + their SKILL.md frontmatter names.
function skillNames(skillsDir) {
  const out = new Set();
  for (const e of listDir(skillsDir)) {
    const full = path.join(skillsDir, e.name);
    let isDir = e.isDirectory();
    if (!isDir && e.isSymbolicLink()) { try { isDir = fs.statSync(full).isDirectory(); } catch { isDir = false; } }
    if (!isDir) continue;
    out.add(e.name);
    const fmName = frontmatterName(path.join(full, 'SKILL.md'));
    if (fmName) out.add(fmName);
  }
  return out;
}

// commands/*.md; nested commands/<sub>/<x>.md -> '<sub>:<x>'.
function commandNames(commandsDir) {
  const out = new Set();
  const walk = (dir, prefix, depth) => {
    for (const e of listDir(dir)) {
      if (e.isDirectory() && depth < 3) walk(path.join(dir, e.name), prefix + e.name + ':', depth + 1);
      else if (e.name.endsWith('.md')) out.add(prefix + e.name.slice(0, -3));
    }
  };
  walk(commandsDir, '', 0);
  return out;
}

const namesUnder = (root) => new Set([...skillNames(path.join(root, 'skills')), ...commandNames(path.join(root, 'commands'))]);

function buildRoster(o, settings) {
  const roster = new Set();
  const enabled = (settings && settings.enabledPlugins) || {};
  const manifest = JSON.parse(fs.readFileSync(path.join(o.claudeDir, 'plugins', 'installed_plugins.json'), 'utf8'));
  let pluginCount = 0;
  for (const [key, entries] of Object.entries(manifest.plugins || {})) {
    if (enabled[key] === false) continue; // explicitly disabled: its skills are not invocable
    const prefixes = new Set([key.split('@')[0]]);
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (!entry || !entry.installPath) continue;
      try {
        const pj = JSON.parse(fs.readFileSync(path.join(entry.installPath, '.claude-plugin', 'plugin.json'), 'utf8'));
        if (pj && pj.name) prefixes.add(pj.name);
      } catch { /* plugin.json is optional */ }
      pluginCount++;
      for (const n of namesUnder(entry.installPath)) {
        roster.add(n);
        for (const p of prefixes) roster.add(p + ':' + n);
      }
    }
  }
  for (const n of skillNames(o.skillsDir)) roster.add(n);
  for (const n of commandNames(path.join(o.claudeDir, 'commands'))) roster.add(n);
  let d = path.resolve(o.projectDir);
  for (;;) {
    for (const n of namesUnder(path.join(d, '.claude'))) roster.add(n);
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  // A plugin-count of 0 means the manifest is unreadable in practice, not "no skills":
  // refuse to judge names against a roster that cannot be right.
  if (pluginCount === 0) throw new Error('no plugin entries in installed_plugins.json');
  return roster;
}

// Script paths named by settings hook commands (and statusLine). Only tokens that are
// clearly paths are judged; anything with an unexpandable $VAR is skipped.
function commandPaths(settings, projectDir) {
  const out = [];
  const cmds = [];
  const hooks = (settings && settings.hooks) || {};
  for (const [event, groups] of Object.entries(hooks)) {
    for (const g of Array.isArray(groups) ? groups : []) {
      for (const h of (g && Array.isArray(g.hooks)) ? g.hooks : []) {
        if (h && h.type === 'command' && typeof h.command === 'string') cmds.push({ where: 'hooks.' + event, command: h.command });
      }
    }
  }
  if (settings && settings.statusLine && typeof settings.statusLine.command === 'string') {
    cmds.push({ where: 'statusLine', command: settings.statusLine.command });
  }
  // A token is judged only when it is a script/executable file WITH a directory part
  // ("bash ~/.claude/hooks/x.sh", "python ~/.claude/statusline.py"): bare program names
  // (bash, powershell.exe) resolve through PATH, and "/c"-style switches are not paths.
  const SCRIPT_EXT = /\.(sh|bash|mjs|cjs|js|ts|py|ps1|cmd|bat|exe)$/i;
  for (const c of cmds) {
    const tokens = c.command.match(/"[^"]*"|'[^']*'|\S+/g) || [];
    for (let t of tokens) {
      t = t.replace(/^["']|["']$/g, '');
      t = t.replace(/^(\$HOME|\$\{HOME\})(?=[\\/])/, HOME)
        .replace(/^(\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_PROJECT_DIR\})(?=[\\/])/, projectDir)
        .replace(/^~(?=[\\/])/, HOME);
      if (t.includes('$') || !SCRIPT_EXT.test(t) || !/[\\/]/.test(t)) continue;
      if (IS_WIN) t = t.replace(/^\/([a-zA-Z])\//, (_, dl) => dl.toUpperCase() + ':/');
      out.push({ where: c.where, command: c.command, file: path.resolve(projectDir, t) });
    }
  }
  return out;
}

// Case-arm skill names in one hook script: only `case` blocks whose subject variable
// was assigned from `.tool_input.skill`. Returns [{ name, line }].
function skillArms(text) {
  const lines = text.split(/\r?\n/);
  const vars = new Set();
  for (const l of lines) {
    const m = /^\s*(?:local\s+|export\s+)?([A-Za-z_]\w*)=.*tool_input\.skill/.exec(l);
    if (m) vars.add(m[1]);
  }
  const found = [];
  if (!vars.size) return found;
  let i = 0;
  while (i < lines.length) {
    const cm = /^\s*case\s+"?\$\{?([A-Za-z_]\w*)\}?"?\s+in\b/.exec(lines[i]);
    i++;
    if (!cm || !vars.has(cm[1])) continue;
    let state = 'pattern';
    while (i < lines.length) {
      const raw = lines[i];
      const t = raw.trim();
      if (/^esac\b/.test(t)) { i++; break; }
      if (state === 'body') {
        if (/(;;&?|;&)\s*(#.*)?$/.test(t)) state = 'pattern';
        i++;
        continue;
      }
      if (!t || t.startsWith('#')) { i++; continue; }
      const startLine = i + 1;
      let pat = t;
      while (/\\$/.test(pat) && i + 1 < lines.length) { i++; pat = pat.slice(0, -1) + lines[i].trim(); }
      i++;
      const close = pat.indexOf(')');
      if (close === -1) continue;
      const rest = pat.slice(close + 1);
      for (let alt of pat.slice(0, close).replace(/^\(/, '').split('|')) {
        alt = alt.trim().replace(/^["']|["']$/g, '');
        if (alt) found.push({ name: alt, line: startLine });
      }
      state = /(;;&?|;&)\s*(#.*)?$/.test(rest.trim()) ? 'pattern' : 'body';
    }
  }
  return found;
}

const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');

// ---- check 4: permissions (U4) -------------------------------------------------

const LENS_SOURCE = ['projects', 'skills', 'ultramode-code-review'];

// One line, short: an error's message as a warning can carry it.
const oneLine = (e) => String(e && e.message !== undefined ? e.message : e).replace(/\s+/g, ' ').trim().slice(0, 300);
// Why a file could not be read, in plain words.
const whyNot = (e) => ((e.code === 'ENOENT' || e.code === 'ENOTDIR') ? 'no such file' : e instanceof SyntaxError ? 'not valid JSON' : e.code || oneLine(e));
const realOr = (p) => { try { return fs.realpathSync.native(p); } catch { return path.resolve(p); } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

// A settings file's JSON object as {settings}, or {why} it could not be read.
function readSettings(file) {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? { settings: v } : { why: 'not a JSON object' };
  } catch (e) {
    return { why: whyNot(e) };
  }
}

// The catalog allowWarnings and configWarnings read, every key they read present: a
// catalog missing one would throw halfway or, worse, compare against undefined and pass.
function checkCatalog(c, where) {
  const rules = (list) => Array.isArray(list) && list.every((r) => r && typeof r.rule === 'string');
  const samples = (list) => Array.isArray(list) && list.length > 0 && list.every((s) => s && typeof s.shell === 'string' && typeof s.command === 'string');
  const ok = c && typeof c === 'object' && rules(c.ask) && rules(c.deny) && typeof c.softDeny === 'string'
    && c.marketplace && typeof c.marketplace.name === 'string' && typeof c.marketplace.autoUpdate === 'boolean'
    && c.playwright && typeof c.playwright.runCode === 'string' && samples(c.pushSamples);
  if (!ok) throw new Error(`${where} is not a permission catalog (it needs ask, deny, softDeny, marketplace, playwright and pushSamples)`);
  return c;
}

function readCatalog(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { throw new Error(`could not read ${tilde(file)} (${whyNot(e)})`); }
  try { return JSON.parse(text); } catch { throw new Error(`${tilde(file)} is not valid JSON`); }
}

// The monorepo root as {root}, or {why} none was found. Without --monorepo it
// is three levels up from where <skills>/ultramode-code-review really is, and
// only when that is <root>/projects/skills/ultramode-code-review: a plain copy
// of the skill, three levels up, would be some unrelated folder.
function monorepoRoot(a, o) {
  if (a.monorepo) {
    const r = path.resolve(a.monorepo);
    return isDir(r) ? { root: realOr(r) } : { why: `--monorepo ${tilde(r)} is not a folder` };
  }
  const link = path.join(o.skillsDir, LENS_SOURCE[2]);
  let real;
  try { real = fs.realpathSync.native(link); } catch { return { why: `${tilde(link)} does not resolve` }; }
  const tail = path.resolve(real).split(path.sep).slice(-3);
  const same = (x, y) => (IS_WIN ? x.toLowerCase() === y.toLowerCase() : x === y);
  if (tail.length < 3 || !tail.every((seg, i) => same(seg, LENS_SOURCE[i]))) {
    return { why: `${tilde(link)} is ${tilde(real)}, not <monorepo>/${LENS_SOURCE.join('/')}` };
  }
  return { root: path.resolve(real, '..', '..', '..') };
}

// sha256 of a file as {sha}, or {why} it could not be read.
function hashOf(file) {
  try { return { sha: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }; } catch (e) { return { why: whyNot(e) }; }
}

// Check 4's S1 lines for the enabled plugins: {grants, blind, g}. grants: one
// line per plugin and kind for a grant skipsSafetyCheck flags that
// PLUGIN_GRANTS does not list, asked with the user's denies only (a grant
// applies in every session, a project's deny only in its own), so a bare
// `Bash` grant auto mode drops, or a run-code glob the user denies, is no
// line; blind: the plugin list or a component file not read. A plugin is
// off only when user settings turn it off and no project settings file turns
// it back on: a project's value may win in a session started there, so the
// reading that can only over-warn counts it on.
function pluginLines(o, user, files, catalog, { PLUGIN_GRANTS, pluginGrants }, { allowsRunCode, skipsSafetyCheck }) {
  const enabledPlugins = { ...(user.settings?.enabledPlugins ?? {}) };
  for (const f of files) for (const [k, v] of Object.entries(f.settings?.enabledPlugins ?? {})) if (v !== false) enabledPlugins[k] = v;
  const g = pluginGrants({ claudeDir: o.claudeDir, enabledPlugins, catalog });
  if (!g.ok) return { grants: [], blind: [`permissions: plugin grants were not checked (${g.why})`], g };
  const blind = [];
  if (g.unread.length) blind.push(`permissions: could not read ${g.unread.length} plugin skill or command file${g.unread.length > 1 ? 's' : ''} (first: ${tilde(g.unread[0])}), so their grants were not checked`);
  const denies = Array.isArray(user.settings?.permissions?.deny) ? user.settings.permissions.deny.filter((r) => typeof r === 'string') : [];
  const lines = [];
  const baseline = new Set(PLUGIN_GRANTS);
  const groups = new Map();
  for (const x of g.grants) {
    if (!x.live || baseline.has(x.grant) || !skipsSafetyCheck(x.rule, { catalog, denies })) continue;
    const run = allowsRunCode(x.rule, catalog);
    const key = `${x.plugin}\0${run}`;
    if (!groups.has(key)) groups.set(key, { plugin: x.plugin, run, list: [] });
    groups.get(key).list.push(x);
  }
  for (const { plugin, run, list } of groups.values()) {
    const more = list.length > 1 ? ` (and ${list.length - 1} more)` : '';
    const why = run ? `which covers playwright's ${catalog.playwright.runCode} (arbitrary code) before the safety check` : 'so a push can skip the auto-mode safety check';
    lines.push(`permissions: enabled plugin ${plugin} grants ${list[0].grant}${more}, which the U4 baseline (lib/plugin-grants.mjs) does not list, ${why}`);
  }
  return { grants: lines, blind, g };
}

// Check 4. Returns {s1, notes, debug}: s1 the lines never cut (an allow or a
// grant that lets a push or run-code skip the safety check, and every line
// saying part of that check went blind), notes the rest. permissions.mjs and
// plugin-grants.mjs are imported here, not at the top of this file, so a
// version folder without them fails this check alone.
async function permissionsCheck(a, o) {
  const perms = await import('./lib/permissions.mjs');
  const grants = await import('./lib/plugin-grants.mjs');
  const { CATALOG, allowWarnings, configWarnings, settingsFilesUnder, worktreeRoots } = perms;
  const catalog = a.rules ? checkCatalog(readCatalog(path.resolve(a.rules)), tilde(path.resolve(a.rules))) : checkCatalog(CATALOG, 'lib/permission-rules.json');
  const blindLines = [];
  const notes = [];
  const blind = (line) => blindLines.push(line);
  const unread = (label, why) => blind(`permissions: could not read ${label} (${why}), so its rules were not checked`);

  const userLabel = tilde(o.settingsPath);
  const user = readSettings(o.settingsPath);
  if (user.why) unread(userLabel, user.why);

  const mono = monorepoRoot(a, o);
  let roots = [];
  if (mono.why) {
    blind(`permissions: no monorepo root was found (${mono.why}), so the project settings files and the review-lens source were not checked`);
  } else {
    roots = [mono.root];
    try {
      roots.push(...worktreeRoots(mono.root));
    } catch (e) {
      blind(`permissions: git could not list the worktrees of ${tilde(mono.root)} (${oneLine(e)}), so only that folder's settings files were checked`);
    }
    const unique = new Map();
    for (const r of roots.map(realOr)) if (!unique.has(norm(r))) unique.set(norm(r), r);
    roots = [...unique.values()];
  }

  const files = [];
  const seen = new Set([norm(o.settingsPath)]);
  for (const root of roots) {
    for (const f of settingsFilesUnder(root)) {
      if (seen.has(norm(f))) continue;
      seen.add(norm(f));
      const s = readSettings(f);
      if (s.why) unread(tilde(f), s.why);
      // Files in one .claude folder share a folder value: allowWarnings and
      // configWarnings judge them together, the way they apply together.
      files.push({ label: tilde(f), settings: s.settings ?? null, folder: norm(path.dirname(f)) });
    }
  }

  const deployedFile = path.join(o.claudeDir, 'agents', 'review-lens.md');
  const deployed = hashOf(deployedFile);
  // A missing deployed copy is configWarnings' to report. Review-lens is no
  // part of the push boundary, so its lines are notes.
  if (deployed.why && deployed.why !== 'no such file') notes.push(`review-lens: could not read ${tilde(deployedFile)} (${deployed.why})`);
  const sourceFile = mono.root ? path.join(mono.root, ...LENS_SOURCE, 'agents', 'review-lens.md') : null;
  const source = sourceFile ? hashOf(sourceFile) : { sha: null };

  const plugins = pluginLines(o, user, files, catalog, grants, perms);
  const input = {
    user: { label: userLabel, settings: user.settings ?? null },
    files,
    powershellEnv: process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL,
    reviewLens: { deployed: deployed.sha ?? null, source: source.sha ?? null },
    catalog,
  };
  for (const line of plugins.blind) blind(line);
  const s1 = [...allowWarnings(input), ...plugins.grants, ...blindLines];
  notes.push(...configWarnings(input));
  if (source.why) notes.push(`review-lens: could not read its tracked source ${tilde(sourceFile)} (${source.why}), so the deployed copy was not compared with it`);

  const allows = [user.settings, ...files.map((f) => f.settings)]
    .reduce((n, s) => n + (Array.isArray(s?.permissions?.allow) ? s.permissions.allow.length : 0), 0);
  const debug = `files=${files.length} (${files.map((f) => f.label).join(', ')}) roots=${roots.length} (${roots.map(tilde).join(', ')}) catalog-rules=${catalog.ask.length + catalog.deny.length} allows-read=${allows} plugin-components=${plugins.g.scanned} plugin-grants=${plugins.g.live.length}`;
  return { s1, notes, debug };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const o = {};
  o.claudeDir = path.resolve(a.claudeDir || path.join(HOME, '.claude'));
  o.settingsPath = path.resolve(a.settings || path.join(o.claudeDir, 'settings.json'));
  o.skillsDir = path.resolve(a.skillsDir || path.join(o.claudeDir, 'skills'));
  o.projectDir = path.resolve(a.projectDir || process.env.CLAUDE_PROJECT_DIR || process.cwd());

  const warnings = [];
  let settings = null;
  try { settings = JSON.parse(fs.readFileSync(o.settingsPath, 'utf8')); } catch { settings = null; }

  // 2. settings hook command paths.
  let cmdPaths = [];
  try {
    if (settings) cmdPaths = commandPaths(settings, o.projectDir);
    for (const c of cmdPaths) {
      if (!fs.existsSync(c.file)) warnings.push(`settings.json ${c.where}: script not found: ${tilde(c.file)} (command: ${c.command.slice(0, 120)})`);
    }
  } catch { /* drop this check's findings */ }

  // 1. hook-matched skill names vs the installed roster.
  try {
    const roster = buildRoster(o, settings);
    let scripts = a.hooks.map((h) => path.resolve(h));
    if (!scripts.length) {
      scripts = cmdPaths.map((c) => c.file).filter((f) => /\.(sh|bash)$/i.test(f) && fs.existsSync(f));
      for (const e of listDir(path.join(o.claudeDir, 'hooks'))) {
        if (e.isFile() && /\.(sh|bash)$/i.test(e.name)) scripts.push(path.join(o.claudeDir, 'hooks', e.name));
      }
    }
    const seen = new Set();
    const scanned = [];
    const dead = [];
    for (const s of scripts) {
      if (seen.has(norm(s))) continue;
      seen.add(norm(s));
      let text;
      try { text = fs.readFileSync(s, 'utf8'); } catch { continue; }
      scanned.push(s);
      for (const { name, line } of skillArms(text)) {
        if (name === '*') continue;
        const live = /[*?[]/.test(name) ? [...roster].some((r) => globRe(name).test(r)) : roster.has(name);
        if (!live) dead.push(`${path.basename(s)}:${line} matches skill "${name}" - not installed (no enabled plugin, ~/.claude/skills or project skill/command by that name), so it can never fire`);
      }
    }
    warnings.push(...dead);
    if (a.debug) process.stderr.write(`roster=${roster.size} scanned=${scanned.map(tilde).join(', ')}\n`);
  } catch (e) {
    if (a.debug) process.stderr.write(`skill-name check skipped: ${e && e.message}\n`);
  }

  // 3. junctions/symlinks in the skills dirs whose target does not resolve.
  try {
    for (const dir of [o.skillsDir, path.join(o.projectDir, '.claude', 'skills')]) {
      for (const e of listDir(dir)) {
        const full = path.join(dir, e.name);
        let isLink = false;
        try { isLink = fs.lstatSync(full).isSymbolicLink(); } catch { continue; }
        if (!isLink || fs.existsSync(full)) continue;
        let target = '?';
        try { target = fs.readlinkSync(full); } catch { /* unreadable target */ }
        warnings.push(`${tilde(full)} is a junction/symlink whose target does not resolve: ${tilde(String(target).replace(/^\\\\\?\\/, ''))}`);
      }
    }
  } catch { /* drop this check's findings */ }

  // 4. permissions: its own failure is a warning, never silence. Its S1 lines
  // print first and are never cut; its notes go ahead of checks 1-3's (see
  // the output contract).
  const t0 = performance.now();
  let s1;
  let notes;
  try {
    const r = await permissionsCheck(a, o);
    s1 = r.s1;
    notes = [...r.notes, ...warnings];
    if (a.debug) process.stderr.write(`permissions: ${r.debug}; ${(performance.now() - t0).toFixed(1)} ms\n`);
  } catch (e) {
    s1 = [`permissions check failed: ${oneLine(e)}`];
    notes = warnings;
    if (a.debug) process.stderr.write(`permissions: failed after ${(performance.now() - t0).toFixed(1)} ms\n`);
  }

  const all = [...s1, ...notes];
  if (!all.length) return '';
  const kept = a.all ? all : [...s1, ...notes.slice(0, Math.max(0, MAX_LINES - s1.length))];
  const shown = kept.map((w) => '- ' + w);
  if (kept.length < all.length) shown.push(`- ...and ${all.length - kept.length} more (run: node ${SELF} --all)`);
  return [
    `CONFIG LIVENESS WARNINGS (${SELF}, run at session start): the method wiring names something that is not there. Each line below fails SILENTLY until fixed - tell Briggsy and fix it before relying on that hook, skill or gate.`,
    ...shown,
  ].join('\n');
}

try {
  const out = await main();
  if (out) process.stdout.write(out.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?') + '\n');
} catch {
  /* never a crash, never a partial block: the manifesto injection must stay whole */
}
process.exitCode = 0;

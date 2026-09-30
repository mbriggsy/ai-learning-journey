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
//
// The roster = every ENABLED plugin in plugins/installed_plugins.json (installPath ->
// skills/<dir> and commands/*.md, each in bare and '<plugin>:<name>' form, plus each
// SKILL.md's frontmatter `name:`), + ~/.claude/skills/* and ~/.claude/commands/*.md,
// + <dir>/.claude/skills/* and <dir>/.claude/commands/*.md for the project dir and
// every ancestor. Commands count because the Skill tool invokes them too.
//
// Output contract: plain text on stdout -- NOTHING when all green, else one short
// 'CONFIG LIVENESS WARNINGS' block. Exit code is always 0. Any error inside a check
// drops that check's findings (never a false alarm from a half-built roster, never a
// crash): the manifesto injection that calls this must never be put at risk.
//
// Test overrides (the session-start hook passes none):
//   --claude-dir <dir>   root holding settings.json, hooks/, skills/, commands/, plugins/
//   --settings <file>    settings.json to read          (default <claude-dir>/settings.json)
//   --hook <file>        hook script to scan; repeatable (default: every .sh a settings
//                        hook command names + <claude-dir>/hooks/*.sh)
//   --skills-dir <dir>   global skills dir               (default <claude-dir>/skills)
//   --project-dir <dir>  project dir (default $CLAUDE_PROJECT_DIR, else process.cwd())
//   --debug              roster size + scanned files on stderr

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_LINES = 15;
const IS_WIN = process.platform === 'win32';
const HOME = os.homedir();

function parseArgs(argv) {
  const a = { hooks: [], debug: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--claude-dir') { a.claudeDir = v; i++; }
    else if (k === '--settings') { a.settings = v; i++; }
    else if (k === '--hook') { a.hooks.push(v); i++; }
    else if (k === '--skills-dir') { a.skillsDir = v; i++; }
    else if (k === '--project-dir') { a.projectDir = v; i++; }
    else if (k === '--debug') { a.debug = true; }
  }
  return a;
}

const norm = (p) => (IS_WIN ? path.resolve(p).toLowerCase() : path.resolve(p));
const tilde = (p) => {
  const h = HOME.replace(/\\/g, '/');
  const s = p.replace(/\\/g, '/');
  return s.toLowerCase().startsWith(h.toLowerCase()) ? '~' + s.slice(h.length) : s;
};

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

function main() {
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

  if (!warnings.length) return '';
  const shown = warnings.slice(0, MAX_LINES).map((w) => '- ' + w);
  if (warnings.length > MAX_LINES) shown.push(`- ...and ${warnings.length - MAX_LINES} more (run: node ~/.claude/hooks/check-config-liveness.mjs)`);
  return [
    'CONFIG LIVENESS WARNINGS (~/.claude/hooks/check-config-liveness.mjs, run at session start): the method wiring names something that is not there. Each line below fails SILENTLY until fixed - tell Briggsy and fix it before relying on that hook, skill or gate.',
    ...shown,
  ].join('\n');
}

try {
  const out = main();
  if (out) process.stdout.write(out.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?') + '\n');
} catch {
  /* never a crash, never a partial block: the manifesto injection must stay whole */
}
process.exitCode = 0;

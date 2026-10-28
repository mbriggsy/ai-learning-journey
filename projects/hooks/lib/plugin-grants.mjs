// plugin-grants.mjs: the allows installed plugins grant in the frontmatter of
// their skills and commands (`allowed-tools`) whose match set reaches a push
// (matchesPush) or covers playwright's run-code tool (U4, S1). Such a grant
// applies during that skill's or command's turn (design 2b), so a plugin
// update that adds one can reopen S1 without touching any settings file. The
// liveness check narrows them with skipsSafetyCheck, as it does a settings
// allow, and warns at every session start on a live one the baseline does
// not list.
//
//   frontmatter(text) -> string | null
//   parseAllowedTools(fm) -> [rule]
//   pluginComponents(root) -> [{name, file}]
//   pluginGrants({home, claudeDir, enabledPlugins, catalog})
//     -> {ok, why, live, disabled, grants, unread, scanned}
//   PLUGIN_GRANTS     the baseline: design 2b's two narrow grants
//
// Plugins are read as installed_plugins.json lists them: every plugin, at
// its installPath only (never the cache's other versions), and a plugin
// enabledPlugins does not set false counts as enabled, the fail-safe reading.
// A file whose shape is not the one read here (version 2, each plugin a list
// of entries with an installPath) is not read at all: ok false, with why, so
// the liveness check says its plugin half went unchecked instead of reading
// nothing and going quiet (review round 2, R2-C).
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG, allowsRunCode, matchesPush } from './permissions.mjs';

// Design 2b's frontmatter grants that let a push skip the classifier, as
// `<plugin>:<component> <rule>`: the two narrow ones D1 denies to the model.
// Its four bare-Bash grants (ce-proof, ce-product-pulse, review-pr,
// create-plugin) are not listed: auto mode drops a bare `Bash` grant (Q17's
// f-bare arm: the push went to the classifier, 2.1.311), so skipsSafetyCheck
// never flags one. The liveness check holds every live grant it flags
// against this list; a plugin update that adds one warns until it is listed
// here.
export const PLUGIN_GRANTS = [
  'commit-commands:commit-push-pr Bash(git push:*)',
  'compound-engineering:ce-resolve-pr-feedback Bash(git *)',
];

const fwd = (p) => p.replace(/\\/g, '/');
const uniq = (list) => [...new Set(list)];
const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
const fold = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));

function readJsonFile(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return { ok: false, missing: e.code === 'ENOENT', why: e.code === 'ENOENT' ? 'missing' : `unreadable (${e.code || e.message})` };
  }
  try {
    return { ok: true, value: JSON.parse(text.replace(/^\uFEFF/, '')) };
  } catch (e) {
    return { ok: false, missing: false, why: `not JSON (${e.message})` };
  }
}

// The YAML frontmatter text of a markdown file, or null.
export function frontmatter(text) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(String(text));
  return m ? m[1] : null;
}

// Split at paren depth 0 on each character `sep` matches.
function splitTop(s, sep) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && sep.test(ch)) {
      if (cur.trim()) out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
const unquote = (s) => {
  const t = s.trim();
  return /^(["']).*\1$/s.test(t) ? t.slice(1, -1) : t;
};

// The rules a frontmatter's allowed-tools grants, in the forms the installed
// plugins use: an inline list (`Bash(gh *), Read`, commas or blanks at paren
// depth 0), a flow sequence (`["Read", "Bash"]`, on one line or many, a
// trailing comma allowed), a block sequence (`- Bash` lines) or a block
// scalar (`|` or `>`). Continuation lines are blank, indented or start with
// `-`; the next top-level key ends the value.
export function parseAllowedTools(fm) {
  if (fm == null) return [];
  const lines = String(fm).split(/\r?\n/);
  const i = lines.findIndex((l) => /^allowed-tools[ \t]*:/.test(l));
  if (i === -1) return [];
  const first = lines[i].replace(/^allowed-tools[ \t]*:/, '').trim();
  const cont = [];
  for (let j = i + 1; j < lines.length && /^(\s|-|$)/.test(lines[j]); j++) cont.push(lines[j]);
  const body = [first, ...cont].join('\n').trim();
  let items;
  if (body.startsWith('[')) items = splitTop(body.slice(1).replace(/\]\s*$/, ''), /,/);
  else if (!first && cont.some((l) => /^\s*-(\s|$)/.test(l))) items = cont.filter((l) => /^\s*-(\s|$)/.test(l)).map((l) => l.replace(/^\s*-\s*/, ''));
  else if (/^[|>][+-]?$/.test(first)) items = splitTop(cont.join(' '), /[,\s]/);
  else items = splitTop(unquote(body), /[,\s]/);
  return items.map(unquote).filter(Boolean);
}

function mdFiles(dir) {
  const out = [];
  const visit = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) visit(p);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
    }
  };
  visit(dir);
  return out;
}

// A plugin's commands and skills, as the CLI loads them: commands/**/*.md
// (named by the path below commands/, a folder making a `:` level), each
// skills/<name>/SKILL.md, and the extra paths plugin.json's `commands` and
// `skills` name (a file, or a folder read the same way). Other markdown in
// the plugin (its tests, its own .claude/commands) is no component.
export function pluginComponents(root) {
  const found = new Map();
  const addCommands = (dir) => {
    if (isFile(dir)) { if (dir.endsWith('.md')) found.set(fold(dir), { name: path.basename(dir, '.md'), file: dir }); return; }
    for (const f of mdFiles(dir)) found.set(fold(f), { name: fwd(path.relative(dir, f)).replace(/\.md$/, '').split('/').join(':'), file: f });
  };
  const addSkills = (dir) => {
    if (isFile(path.join(dir, 'SKILL.md'))) { found.set(fold(path.join(dir, 'SKILL.md')), { name: path.basename(dir), file: path.join(dir, 'SKILL.md') }); return; }
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const f = path.join(dir, e.name, 'SKILL.md');
      if (e.isDirectory() && isFile(f)) found.set(fold(f), { name: e.name, file: f });
    }
  };
  addCommands(path.join(root, 'commands'));
  addSkills(path.join(root, 'skills'));
  const manifest = readJsonFile(path.join(root, '.claude-plugin', 'plugin.json'));
  if (manifest.ok) {
    const list = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
    for (const p of list(manifest.value?.commands)) addCommands(path.resolve(root, p));
    for (const p of list(manifest.value?.skills)) addSkills(path.resolve(root, p));
  }
  return [...found.values()].sort((x, y) => x.name.localeCompare(y.name));
}

// Every push-granting or run-code allow in installed plugins' frontmatter.
//   live, disabled  `<plugin>:<component> <rule>` strings, sorted: `live` for
//                   enabled plugins, `disabled` for the rest
//   grants          the same, one {grant, plugin, component, rule, live} each
//   unread          component files that could not be read (their grants unseen)
//   scanned         components read
// `claudeDir` holds plugins/installed_plugins.json (default <home>/.claude).
export function pluginGrants({ home, claudeDir = path.join(home, '.claude'), enabledPlugins, catalog = CATALOG }) {
  const ip = readJsonFile(path.join(claudeDir, 'plugins', 'installed_plugins.json'));
  const none = { live: [], disabled: [], grants: [], unread: [], scanned: 0 };
  if (!ip.ok) return { ok: false, why: `installed_plugins.json is ${ip.why}`, ...none };
  const plugins = ip.value?.plugins;
  if (!plugins || typeof plugins !== 'object' || Array.isArray(plugins)) return { ok: false, why: 'installed_plugins.json holds no plugins object', ...none };
  if (ip.value.version !== 2) return { ok: false, why: `installed_plugins.json is version ${JSON.stringify(ip.value.version ?? null)}, not 2, the shape this reader knows`, ...none };
  for (const [key, entries] of Object.entries(plugins)) {
    if (!Array.isArray(entries)) return { ok: false, why: `installed_plugins.json's plugins[${JSON.stringify(key)}] is not a list`, ...none };
    const i = entries.findIndex((e) => typeof e?.installPath !== 'string' || !e.installPath);
    if (i !== -1) return { ok: false, why: `installed_plugins.json's plugins[${JSON.stringify(key)}][${i}] has no installPath`, ...none };
  }
  const grants = new Map();
  const unread = [];
  let scanned = 0;
  for (const [key, entries] of Object.entries(plugins)) {
    const plugin = key.split('@')[0];
    const live = enabledPlugins?.[key] !== false;
    for (const e of entries) {
      for (const c of pluginComponents(e.installPath)) {
        scanned++;
        let text;
        try { text = fs.readFileSync(c.file, 'utf8'); } catch { unread.push(c.file); continue; }
        for (const rule of parseAllowedTools(frontmatter(text))) {
          if (!matchesPush(rule, catalog) && !allowsRunCode(rule, catalog)) continue;
          const grant = `${plugin}:${c.name} ${rule}`;
          grants.set(`${live}\0${grant}`, { grant, plugin, component: c.name, rule, live });
        }
      }
    }
  }
  const count = Object.keys(plugins).length;
  if (count && !scanned) return { ok: false, why: `installed_plugins.json lists ${count} plugin${count > 1 ? 's' : ''}, but no skill or command was found in any`, ...none };
  const list = [...grants.values()].sort((x, y) => (x.grant < y.grant ? -1 : x.grant > y.grant ? 1 : Number(y.live) - Number(x.live)));
  return {
    ok: true,
    why: null,
    live: uniq(list.filter((g) => g.live).map((g) => g.grant)),
    disabled: uniq(list.filter((g) => !g.live).map((g) => g.grant)),
    grants: list,
    unread,
    scanned,
  };
}

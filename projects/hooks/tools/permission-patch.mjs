#!/usr/bin/env node
// permission-patch.mjs: the U4 permission edit for one settings file, written
// as a settings-writer patch ({"ops": [...]}, tools/settings-write.mjs). It
// writes that patch file and nothing else. The user file's patch rides the
// hook switch (deploy.mjs deploy --patch, one write behind the peers gate,
// undone by one bare rollback); a project file's goes to the writer directly
// (--expect-sha, --inverse-out, --persist-check).
//
//   node tools/permission-patch.mjs --rules <catalog.json> --target user|project
//        --file <settings.json> --out <patch.json>
//        [--marketplaces <known_marketplaces.json>] [--expected <expected.json>]
//
// --rules is the catalog as reviewed (at landing, `git show <commit>:projects/
// hooks/lib/permission-rules.json` saved to a file). Every rule, the per-tool
// playwright list, the soft_deny text, the marketplace and the project
// entries come from that file, never from lib/permissions.mjs's own copy. The
// allows to remove are found with that module's skipsSafetyCheck, whose
// matchesPush and allowsRunCode read its copy of pushSamples and
// playwright.runCode, so --rules must
// hold the same two values; else it is refused (the detection would test
// other samples than the reviewed catalog's).
//
// user (--marketplaces and --expected required):
//   - Removals are computed: every permissions.allow entry lib/
//     permissions.mjs's skipsSafetyCheck flags, with the catalog's deny rules
//     and the file's own counted as in place (so a run-code glob on a server
//     whose run-code tool is denied is no removal, and a tool-wide shell allow
//     auto mode drops is none either). They must equal --expected (a JSON list of
//     rule strings, compared as a multiset), else refused, naming each one
//     computed but not expected and each expected but not computed.
//   - Each removed run-code allow must be a server glob, mcp__<server>__*
//     with a literal server name: it becomes one allow per tool in the
//     catalog's playwright.tools, under that server's name, appended to
//     permissions.allow (one already there is not added again). Any other
//     run-code allow (mcp__*, a bare mcp__<server>, a tool glob, the run-code
//     tool itself) is refused: there is no per-tool list to put in its place.
//   - Every catalog ask rule is appended to permissions.ask and every deny
//     rule to permissions.deny, each list made when absent (ask right after
//     allow, deny right after ask), so each is there once afterwards. The
//     catalog's ask list may be empty (it is since 2026-10-27: nothing asks
//     Briggsy), and a file with no ask list then gets an empty one. A
//     catalog rule already in the other list, or in allow after the
//     removals, is refused; so is one already there twice.
//   - The catalog's softDeny is appended to autoMode.soft_deny unless it is
//     there; the existing entries stay as they are. A missing soft_deny list
//     is refused: this tool appends only (whether a new list keeps the
//     classifier's built-in entries is not measured here).
//   - extraKnownMarketplaces[<catalog marketplace name>] becomes {source: a
//     deep copy of that entry's source in --marketplaces, autoUpdate: <the
//     catalog's>}. An entry that is there must hold a deep-equal source, else
//     refused; then only its autoUpdate is set (its other keys stay).
// project (--marketplaces refused):
//   - The catalog's `projects` entry is the one whose key (a repo-relative
//     path) ends --file's real path at a folder boundary (realpath, so a
//     letter-case or junction spelling resolves; forward slashes). More than
//     one key is refused. A worktree's copy of a tracked file maps to the
//     same key.
//   - A file with an entry: --expected is refused (one source per file). Its
//     `remove` strings are removed (every index holding each), and each
//     server in its `playwright` list has its glob mcp__<server>__* removed
//     and replaced by the per-tool list, as in user mode. A remove string or
//     a glob the file does not hold is refused (the file is not the one the
//     catalog was written for), and so is any allow skipsSafetyCheck flags
//     (the catalog's denies and the file's own counted as in place) that the
//     entry neither removes nor converts.
//   - A file with no entry (one whose rules can't go in the public catalog,
//     such as an untracked settings.local.json naming the user's folder):
//     --expected is required, else refused. The removals are computed and
//     checked against it as in user mode, and nothing is converted: a
//     run-code glob there must be in --expected and is removed with the rest.
//   - The denies counted never include the other settings file of the same
//     .claude folder: the patch binds only this file's bytes, so a deny there
//     could go without the patch knowing. The liveness check does count a
//     sibling's deny (the two apply together), so for such a file this tool
//     refuses, or computes a removal, where the check is quiet.
//
// The ops, in order. First the binding tests: each list the patch reads or
// edits is tested by its hashValue (or absent): permissions.allow, and in
// user mode permissions.ask, permissions.deny, autoMode.soft_deny and the
// marketplace entry. They tie the patch to the exact lists it was computed
// from, on every path (deploy binds its write to ITS read of settings, not
// to this tool's), so a rule added since refuses the write (the writer's exit
// 2) instead of riding past the removals. Then each removal as a test of the
// value at its index plus a delete there, highest index first (a delete
// shifts the entries after it). Then the pushes and sets above.
//
// Before writing, the ops are checked as writer ops (validateOps) and applied
// to a copy (applyOps): the result must hold exactly the planned lists, no
// allow skipsSafetyCheck flags, each catalog rule once in its own list,
// and every other value, in its order, as it was. A failure there is this
// tool's bug: exit 1, nothing written.
//
// --out must not exist (never overwritten), its folder must exist, and it
// may not be inside the git work tree that holds this file: the patch quotes
// the rules it removes, and a user patch's are private. The file is
// JSON.stringify({ops}, null, 2) plus a newline, written to a temp file
// beside it and hard-linked into place, so a half-written patch never has
// the name. No change to make (only the binding tests left) writes no file:
// noop: true.
//
// Output: one JSON object on stdout: {ok, exit, target, file, key (project:
// the catalog key, or null for a file the catalog does not name),
// settingsSha256 (the bytes read: the writer's --expect-sha), rulesSha256
// (the --rules bytes, to match the probes' CATALOG_SHA256 pin), out,
// written, noop, ops (how many), removed [{index, rule}], converted
// [{server, tools}], added {allow, and in user mode ask, deny, softDeny,
// marketplace}, error?}.
// It prints rule strings, never an autoMode entry. Errors also go to stderr.
//
// Exit codes: 0 the patch was written, or there was nothing to change; 1
// internal error (a self-check failed: this tool's bug); 2 refused (bad
// arguments, an unreadable or malformed input, any refusal above).
//
// Library: permissionPatch(options) takes the CLI's options camel-cased
// ({rules, target, file, marketplaces, expected, out}, each a path) and
// returns exactly the object the CLI prints; it never throws. planUser,
// planProject, planUncatalogued, keyFor and verifyPlan are exported for the
// tests. For tests
// only, `seams.afterPlan({ops, plan})` runs on the plan before the self-check
// (so a test can break it and see the self-check refuse); nothing else reads
// it.

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, allowsRunCode, matchesPush, parseRule, skipsSafetyCheck } from '../lib/permissions.mjs';
import { applyOps, deepEqual, hashValue, validateOps } from './settings-write.mjs';

export const EXIT = Object.freeze({ OK: 0, INTERNAL: 1, REFUSED: 2 });
export const TARGETS = Object.freeze(['user', 'project']);

const HERE = path.dirname(fileURLToPath(import.meta.url));

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const fmt = (v) => JSON.stringify(v);
const clone = (v) => JSON.parse(JSON.stringify(v));
// The allows to take out of `doc`: skipsSafetyCheck's, with the catalog's
// deny rules and the file's own counted as in place.
const flaggedFor = (rules, doc) => {
  const own = isObj(doc?.permissions) && Array.isArray(doc.permissions.deny) ? doc.permissions.deny.filter((r) => typeof r === 'string') : [];
  const denies = [...rules.deny.map((d) => d.rule), ...own];
  return (rule) => skipsSafetyCheck(rule, { denies });
};
const NAME = /^[A-Za-z0-9_-]+$/;

// A failure with its exit code.
class Stop extends Error {
  constructor(exit, message) {
    super(message);
    this.exit = exit;
  }
}
const refuse = (message) => new Stop(EXIT.REFUSED, message);

// The items of `a` left once each item of `b` has cancelled one equal item
// (a multiset difference, in a's order).
function minus(a, b) {
  const left = [...b];
  return a.filter((x) => {
    const i = left.indexOf(x);
    if (i === -1) return true;
    left.splice(i, 1);
    return false;
  });
}

// The server of a server glob, mcp__<server>__* with a literal server name;
// else null. Split at the first "__", as lib/permissions.mjs splits.
function serverGlob(rule) {
  if (typeof rule !== 'string' || !rule.startsWith('mcp__')) return null;
  const rest = rule.slice(5);
  const cut = rest.indexOf('__');
  if (cut <= 0) return null;
  const server = rest.slice(0, cut);
  return rest.slice(cut + 2) === '*' && !server.includes('*') ? server : null;
}

// ---------------------------------------------------------------- the catalog

// Refuses a --rules file this tool can't apply as written.
function checkRules(rules) {
  const bad = (m) => refuse(`--rules: ${m}`);
  if (!isObj(rules)) throw bad('not a JSON object');
  for (const k of ['ask', 'deny']) {
    const list = rules[k];
    // ask may be empty (nothing asks); a catalog with no deny rule is no catalog.
    if (!Array.isArray(list) || (k === 'deny' && !list.length)) throw bad(k === 'deny' ? '"deny" must be a non-empty list of {rule, why}' : '"ask" must be a list of {rule, why}');
    const seen = new Set();
    list.forEach((r, i) => {
      if (!isObj(r) || typeof r.rule !== 'string' || !parseRule(r.rule)) throw bad(`${k}[${i}] is not an entry whose rule parses`);
      if (seen.has(r.rule)) throw bad(`${k} lists ${fmt(r.rule)} twice`);
      seen.add(r.rule);
    });
  }
  const both = rules.ask.find((a) => rules.deny.some((d) => d.rule === a.rule));
  if (both) throw bad(`${fmt(both.rule)} is in both ask and deny`);
  if (!deepEqual(rules.pushSamples, CATALOG.pushSamples)) throw bad('its pushSamples differ from lib/permissions.mjs\'s catalog, which matchesPush tests allows against; run this tool from the commit the rules came from');
  const pw = rules.playwright;
  if (!isObj(pw) || pw.runCode !== CATALOG.playwright.runCode) throw bad('its playwright.runCode differs from lib/permissions.mjs\'s catalog, which allowsRunCode reads; run this tool from the commit the rules came from');
  if (!Array.isArray(pw.tools) || !pw.tools.length || !pw.tools.every((t) => typeof t === 'string' && NAME.test(t))) throw bad('playwright.tools must be a non-empty list of tool names');
  if (new Set(pw.tools).size !== pw.tools.length) throw bad('playwright.tools lists a tool twice');
  if (pw.tools.includes(pw.runCode)) throw bad(`playwright.tools holds ${pw.runCode}, the tool the per-tool list exists to leave out`);
  if (typeof rules.softDeny !== 'string' || !rules.softDeny) throw bad('softDeny must be a non-empty string');
  const mk = rules.marketplace;
  if (!isObj(mk) || typeof mk.name !== 'string' || !mk.name || typeof mk.autoUpdate !== 'boolean') throw bad('marketplace must be {name, autoUpdate: true|false}');
  if (!isObj(rules.projects)) throw bad('projects must be an object of repo-relative paths');
  for (const [key, e] of Object.entries(rules.projects)) {
    if (!key || key.startsWith('/') || key.includes('\\')) throw bad(`projects key ${fmt(key)} is not a repo-relative path with forward slashes`);
    if (!isObj(e) || !Array.isArray(e.remove) || !e.remove.every((r) => typeof r === 'string') || !Array.isArray(e.playwright)) throw bad(`projects[${fmt(key)}] must be {remove: [rule], playwright: [server]}`);
    for (const s of e.playwright) {
      if (typeof s !== 'string' || !NAME.test(s) || s.includes('__')) throw bad(`projects[${fmt(key)}].playwright holds ${fmt(s)}, not a server name`);
      if (e.remove.includes(`mcp__${s}__*`)) throw bad(`projects[${fmt(key)}] both removes and converts mcp__${s}__*`);
    }
    if (new Set(e.playwright).size !== e.playwright.length) throw bad(`projects[${fmt(key)}].playwright lists a server twice`);
  }
}

// The catalog key whose repo-relative path ends `file` (a real path) at a
// folder boundary, or null when none does.
export function keyFor(file, projects) {
  const p = path.sep === '\\' ? file.replaceAll('\\', '/') : file;
  const hits = Object.keys(projects).filter((k) => p === k || p.endsWith(`/${k}`));
  if (hits.length > 1) throw refuse(`${file} ends more than one catalog key (${hits.join(', ')})`);
  return hits.length ? hits[0] : null;
}

// ---------------------------------------------------------------- the plans

const bind = (p, v) => (v === undefined ? { op: 'test', path: p, absent: true } : { op: 'test', path: p, sha256: hashValue(v) });

// A test of the value at each index, then a delete there, highest first.
const removalOps = (removed) => [...removed].sort((a, b) => b.index - a.index).flatMap(({ index, rule }) => [
  { op: 'test', path: ['permissions', 'allow', index], value: rule },
  { op: 'delete', path: ['permissions', 'allow', index] },
]);

function allowOf(doc) {
  if (!isObj(doc.permissions) || !Array.isArray(doc.permissions.allow)) throw refuse('the settings hold no permissions.allow list');
  return doc.permissions.allow;
}

// The allows to remove, computed: [{index, rule}] for every allow `flagged`
// (flaggedFor's) is true for. They must equal `expected` (as a multiset),
// else refused, naming each difference.
function computedRemovals(allow, expected, flagged) {
  const removed = allow.map((rule, index) => ({ index, rule })).filter(({ rule }) => flagged(rule));
  const got = removed.map((r) => r.rule);
  const notExpected = minus(got, expected);
  const notFound = minus(expected, got);
  if (notExpected.length || notFound.length) {
    const parts = [];
    if (notExpected.length) parts.push(`computed but not expected: ${notExpected.map(fmt).join(', ')}`);
    if (notFound.length) parts.push(`expected but not computed: ${notFound.map(fmt).join(', ')}`);
    throw refuse(`the allows to remove, computed from the settings (every allow skipsSafetyCheck flags, the catalog's denies counted as in place), differ from --expected: ${parts.join('; ')}`);
  }
  return removed;
}

// The per-tool allows that replace each server's glob, minus any `kept`
// already holds: [{server, rules}].
function perTool(servers, tools, kept) {
  const have = new Set(kept);
  return servers.map((server) => {
    const rules = tools.map((t) => `mcp__${server}__${t}`).filter((r) => !have.has(r));
    for (const r of rules) have.add(r);
    return { server, rules };
  });
}

// User mode: {ops, plan} for settings `doc`.
export function planUser({ rules, doc, marketplaces, expected }) {
  const allow = allowOf(doc);
  const perm = doc.permissions;
  for (const k of ['ask', 'deny']) if (perm[k] !== undefined && !Array.isArray(perm[k])) throw refuse(`permissions.${k} is not a list`);
  if (!isObj(doc.autoMode) || !Array.isArray(doc.autoMode.soft_deny)) throw refuse('the settings hold no autoMode.soft_deny list; this tool appends to one and never makes it (whether a new list keeps the classifier\'s built-in entries is not measured here)');
  const soft = doc.autoMode.soft_deny;
  const extra = doc.extraKnownMarketplaces;
  if (extra !== undefined && !isObj(extra)) throw refuse('extraKnownMarketplaces is not an object');

  const removed = computedRemovals(allow, expected, flaggedFor(rules, doc));
  const servers = [];
  for (const { index, rule } of removed) {
    if (!allowsRunCode(rule)) continue;
    const s = serverGlob(rule);
    if (s === null) throw refuse(`allow[${index}] ${fmt(rule)} covers playwright's ${rules.playwright.runCode}, but it is not a server glob (mcp__<server>__*), so there is no per-tool list to put in its place; change it by hand first`);
    if (!servers.includes(s)) servers.push(s);
  }
  const gone = new Set(removed.map((r) => r.index));
  const kept = allow.filter((_, i) => !gone.has(i));
  const converted = perTool(servers, rules.playwright.tools, kept);
  const addAllow = converted.flatMap((c) => c.rules);
  const lists = { allow: [...kept, ...addAllow], ask: perm.ask ?? [], deny: perm.deny ?? [] };
  const add = { ask: [], deny: [] };
  for (const [k, other] of [['ask', 'deny'], ['deny', 'ask']]) {
    for (const { rule } of rules[k]) {
      const n = lists[k].filter((x) => x === rule).length;
      if (n > 1) throw refuse(`permissions.${k} already holds the catalog rule ${fmt(rule)} ${n} times; take out the extra copies first`);
      if (lists[other].includes(rule)) throw refuse(`${fmt(rule)} is a catalog ${k} rule, but permissions.${other} holds it; settle which it is first`);
      if (lists.allow.includes(rule)) throw refuse(`${fmt(rule)} is a catalog ${k} rule, but permissions.allow holds it; settle which it is first`);
      if (n === 0) add[k].push(rule);
    }
  }
  const addSoft = !soft.includes(rules.softDeny);

  const { name, autoUpdate } = rules.marketplace;
  const known = isObj(marketplaces) && Object.hasOwn(marketplaces, name) ? marketplaces[name] : undefined;
  if (!isObj(known) || !isObj(known.source)) throw refuse(`--marketplaces holds no ${fmt(name)} entry with a source object`);
  const source = clone(known.source);
  const entry = extra !== undefined && Object.hasOwn(extra, name) ? extra[name] : undefined;
  let marketplace = 'created';
  if (entry !== undefined) {
    if (!isObj(entry)) throw refuse(`extraKnownMarketplaces[${fmt(name)}] is not an object`);
    if (!deepEqual(entry.source, source)) throw refuse(`extraKnownMarketplaces[${fmt(name)}] holds the source ${fmt(entry.source ?? null)}, but known_marketplaces.json's is ${fmt(source)}; settle which is right first`);
    marketplace = entry.autoUpdate === autoUpdate ? 'unchanged' : 'autoUpdate set';
  }

  const P = ['permissions'];
  const M = ['extraKnownMarketplaces', name];
  const ops = [
    bind([...P, 'allow'], allow),
    bind([...P, 'ask'], perm.ask),
    bind([...P, 'deny'], perm.deny),
    bind(['autoMode', 'soft_deny'], soft),
    bind(M, entry),
    ...removalOps(removed),
    ...addAllow.map((value) => ({ op: 'push', path: [...P, 'allow'], value })),
  ];
  if (perm.ask === undefined) ops.push({ op: 'set', path: [...P, 'ask'], value: [], after: 'allow' });
  ops.push(...add.ask.map((value) => ({ op: 'push', path: [...P, 'ask'], value })));
  if (perm.deny === undefined) ops.push({ op: 'set', path: [...P, 'deny'], value: [], after: 'ask' });
  ops.push(...add.deny.map((value) => ({ op: 'push', path: [...P, 'deny'], value })));
  if (addSoft) ops.push({ op: 'push', path: ['autoMode', 'soft_deny'], value: rules.softDeny });
  if (entry === undefined) ops.push({ op: 'set', path: M, value: { source, autoUpdate }, ...(extra === undefined ? { create: true } : {}) });
  else if (marketplace === 'autoUpdate set') ops.push({ op: 'set', path: [...M, 'autoUpdate'], value: autoUpdate });

  return {
    ops,
    binds: 5,
    plan: {
      target: 'user',
      removed,
      kept,
      converted,
      addAllow,
      ask: [...lists.ask, ...add.ask],
      deny: [...lists.deny, ...add.deny],
      softDeny: addSoft ? [...soft, rules.softDeny] : soft,
      marketplace: { name, entry: entry === undefined ? { source, autoUpdate } : { ...entry, autoUpdate }, state: marketplace, created: extra === undefined },
      added: { allow: addAllow.length, ask: add.ask.length, deny: add.deny.length, softDeny: addSoft, marketplace },
    },
  };
}

// Project mode: {ops, plan} for settings `doc` at catalog key `key`.
export function planProject({ rules, doc, key }) {
  const entry = rules.projects[key];
  const allow = allowOf(doc);
  const take = new Map();
  const indicesOf = (rule) => allow.flatMap((x, i) => (x === rule ? [i] : []));
  for (const rule of entry.remove) {
    const at = indicesOf(rule);
    if (!at.length) throw refuse(`the catalog removes ${fmt(rule)} from ${key}, but its permissions.allow does not hold it: the file is not the one the catalog was written for`);
    for (const i of at) take.set(i, rule);
  }
  for (const s of entry.playwright) {
    const glob = `mcp__${s}__*`;
    const at = indicesOf(glob);
    if (!at.length) throw refuse(`the catalog converts ${fmt(glob)} in ${key}, but its permissions.allow does not hold it: the file is not the one the catalog was written for`);
    for (const i of at) take.set(i, glob);
  }
  const flagged = flaggedFor(rules, doc);
  const left = allow.map((rule, index) => ({ index, rule })).find(({ index, rule }) => !take.has(index) && flagged(rule));
  if (left) {
    const why = matchesPush(left.rule) ? 'lets a push skip the safety check' : `covers playwright's ${rules.playwright.runCode}`;
    throw refuse(`${key} allow[${left.index}] ${fmt(left.rule)} ${why}, and the catalog's entry neither removes nor converts it; add it to the catalog first`);
  }
  const removed = [...take].map(([index, rule]) => ({ index, rule })).sort((a, b) => a.index - b.index);
  const kept = allow.filter((_, i) => !take.has(i));
  const converted = perTool(entry.playwright, rules.playwright.tools, kept);
  const addAllow = converted.flatMap((c) => c.rules);
  const ops = [
    bind(['permissions', 'allow'], allow),
    ...removalOps(removed),
    ...addAllow.map((value) => ({ op: 'push', path: ['permissions', 'allow'], value })),
  ];
  return { ops, binds: 1, plan: { target: 'project', key, removed, kept, converted, addAllow, added: { allow: addAllow.length } } };
}

// Project mode for a file the catalog does not name: {ops, plan}. The
// removals are computed and checked against `expected`; nothing is converted.
export function planUncatalogued({ rules, doc, expected }) {
  const allow = allowOf(doc);
  const removed = computedRemovals(allow, expected, flaggedFor(rules, doc));
  const gone = new Set(removed.map((r) => r.index));
  const kept = allow.filter((_, i) => !gone.has(i));
  const ops = [bind(['permissions', 'allow'], allow), ...removalOps(removed)];
  return { ops, binds: 1, plan: { target: 'project', key: null, removed, kept, converted: [], addAllow: [], added: { allow: 0 } } };
}

// ---------------------------------------------------------------- the self-check

// A copy of `doc` without the values at `paths` (missing ones skipped).
function without(doc, paths) {
  const d = clone(doc);
  for (const p of paths) {
    let cur = d;
    for (const k of p.slice(0, -1)) cur = isObj(cur) && Object.hasOwn(cur, k) ? cur[k] : undefined;
    if (isObj(cur)) delete cur[p[p.length - 1]];
  }
  return d;
}

// Throws (a plain Error: exit 1) unless `after` (the ops applied to `before`)
// holds exactly what `plan` says, under `rules`, and nothing else changed.
export function verifyPlan(before, after, plan, rules) {
  const fail = (m) => { throw new Error(`self-check: ${m}; no patch was written`); };
  const allow = after.permissions?.allow;
  if (!deepEqual(allow, [...plan.kept, ...plan.addAllow])) fail('permissions.allow is not the kept entries plus the per-tool list');
  const flagged = flaggedFor(rules, after);
  const still = Array.isArray(allow) ? allow.filter((r) => flagged(r)) : [];
  if (still.length) fail(`permissions.allow still holds ${fmt(still[0])}`);
  const touched = [['permissions', 'allow']];
  if (plan.target === 'user') {
    const p = after.permissions;
    if (!deepEqual(p.ask, plan.ask)) fail('permissions.ask is not the list planned');
    if (!deepEqual(p.deny, plan.deny)) fail('permissions.deny is not the list planned');
    for (const [k, other] of [['ask', 'deny'], ['deny', 'ask']]) {
      for (const { rule } of rules[k]) {
        if (p[k].filter((x) => x === rule).length !== 1) fail(`the catalog ${k} rule ${fmt(rule)} is not in permissions.${k} exactly once`);
        if (p[other].includes(rule) || allow.includes(rule)) fail(`the catalog ${k} rule ${fmt(rule)} is in another list`);
      }
    }
    const soft = after.autoMode?.soft_deny;
    if (!deepEqual(soft, plan.softDeny) || !soft.includes(rules.softDeny)) fail('autoMode.soft_deny is not its old entries plus the catalog\'s');
    const { name, entry, created } = plan.marketplace;
    const got = after.extraKnownMarketplaces?.[name];
    if (!deepEqual(got, entry) || got.autoUpdate !== rules.marketplace.autoUpdate) fail(`extraKnownMarketplaces[${fmt(name)}] is not the entry planned`);
    if (created && !deepEqual(Object.keys(after.extraKnownMarketplaces), [name])) fail('extraKnownMarketplaces holds more than the entry made');
    touched.push(['permissions', 'ask'], ['permissions', 'deny'], ['autoMode', 'soft_deny'], created ? ['extraKnownMarketplaces'] : ['extraKnownMarketplaces', name]);
  }
  if (JSON.stringify(without(before, touched)) !== JSON.stringify(without(after, touched))) fail('a value outside the planned paths changed, or moved');
}

// ---------------------------------------------------------------- files

function readBytes(file, what) {
  try {
    return fs.readFileSync(file);
  } catch (e) {
    throw refuse(`cannot read ${what} ${file}: ${e.code || e.message}`);
  }
}

function parseJson(bytes, what, file) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw refuse(`${what} ${file} is not valid JSON`);
  }
}

// The nearest folder at or above `from` that holds .git (a folder, or a
// worktree's file), or null.
function workTree(from) {
  for (let d = from; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    if (path.dirname(d) === d) return null;
  }
}

const within = (dir, root) => {
  const rel = path.relative(root, dir);
  return rel === '' || !(rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel));
};

function checkOut(out) {
  if (fs.existsSync(out)) throw refuse(`--out ${out} already exists; a patch is never overwritten`);
  const dir = path.dirname(out);
  let real;
  try {
    real = fs.realpathSync.native(dir);
  } catch {
    throw refuse(`--out's folder ${dir} does not exist; make it first`);
  }
  const tree = workTree(HERE);
  if (tree && within(real, fs.realpathSync.native(tree))) throw refuse(`--out ${out} is inside the git work tree that holds this tool (${tree}); the patch quotes the rules it removes, so it goes outside the repo`);
}

// Temp file beside it, then a hard link: the name never holds half a patch,
// and a file made meanwhile is never replaced.
function writeOut(out, text) {
  const tmp = `${out}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  fs.writeFileSync(tmp, text, { flag: 'wx' });
  try {
    fs.linkSync(tmp, out);
  } catch (e) {
    if (e.code === 'EEXIST') throw refuse(`--out ${out} was made by someone else meanwhile; nothing was written`);
    throw e;
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* already gone */ }
  }
}

// ---------------------------------------------------------------- the library

export function permissionPatch(o = {}) {
  const res = { ok: false, exit: EXIT.INTERNAL, target: o.target ?? null, file: null, settingsSha256: null, rulesSha256: null, out: null, written: false, noop: false };
  try {
    if (!TARGETS.includes(o.target)) throw refuse(`--target must be one of ${TARGETS.join(', ')}`);
    for (const k of ['rules', 'file', 'out']) if (typeof o[k] !== 'string' || !o[k]) throw refuse(`--${k} is required`);
    const user = o.target === 'user';
    if (user) for (const k of ['marketplaces', 'expected']) if (o[k] === undefined) throw refuse(`--${k} is required with --target user`);
    if (!user && o.marketplaces !== undefined) throw refuse('--marketplaces is for --target user only');
    const out = path.resolve(o.out);
    res.out = out;
    checkOut(out);

    const rulesBytes = readBytes(path.resolve(o.rules), 'the --rules file');
    res.rulesSha256 = sha256(rulesBytes);
    const rules = parseJson(rulesBytes, 'the --rules file', o.rules);
    checkRules(rules);

    const file = path.resolve(o.file);
    const bytes = readBytes(file, 'the settings file');
    res.file = file;
    res.settingsSha256 = sha256(bytes);
    const doc = parseJson(bytes, 'the settings file', file);
    if (!isObj(doc)) throw refuse(`${file} does not hold a JSON object at the top`);

    const readExpected = () => {
      const expected = parseJson(readBytes(path.resolve(o.expected), 'the --expected file'), 'the --expected file', o.expected);
      if (!Array.isArray(expected) || !expected.every((r) => typeof r === 'string')) throw refuse('--expected must hold a JSON list of rule strings');
      return expected;
    };
    let built;
    if (user) {
      const marketplaces = parseJson(readBytes(path.resolve(o.marketplaces), 'the --marketplaces file'), 'the --marketplaces file', o.marketplaces);
      built = planUser({ rules, doc, marketplaces, expected: readExpected() });
    } else {
      const key = keyFor(fs.realpathSync.native(file), rules.projects);
      res.key = key;
      if (key !== null) {
        if (o.expected !== undefined) throw refuse(`--expected is for a file the catalog does not name, and ${file} is the catalog's ${key}, whose entry says what to remove (one source per file)`);
        built = planProject({ rules, doc, key });
      } else {
        if (o.expected === undefined) throw refuse(`${file} is none of the catalog's project files (${Object.keys(rules.projects).join(', ')}); for a file the catalog does not name, give --expected (the allows to remove, a JSON list)`);
        built = planUncatalogued({ rules, doc, expected: readExpected() });
      }
    }
    if (o.seams?.afterPlan) o.seams.afterPlan(built);
    const { ops, binds, plan } = built;
    res.removed = plan.removed;
    res.converted = plan.converted.map((c) => ({ server: c.server, tools: c.rules.length }));
    res.added = plan.added;

    const after = clone(doc);
    try {
      validateOps(ops);
      applyOps(after, ops);
    } catch (e) {
      throw new Error(`self-check: the generated ops do not apply as writer ops (${e.message}); no patch was written`);
    }
    verifyPlan(doc, after, plan, rules);

    if (ops.length === binds) {
      res.noop = true;
      res.ops = 0;
    } else {
      writeOut(out, `${JSON.stringify({ ops }, null, 2)}\n`);
      res.written = true;
      res.ops = ops.length;
    }
    res.ok = true;
    res.exit = EXIT.OK;
  } catch (e) {
    res.ok = false;
    if (e instanceof Stop) {
      res.exit = e.exit;
      res.error = e.message;
    } else {
      res.exit = EXIT.INTERNAL;
      res.error = /^self-check: /.test(e?.message) ? e.message : `internal error: ${e?.code ? `${e.code} ` : ''}${e?.message ?? e}`;
    }
  }
  return res;
}

// ---------------------------------------------------------------- the CLI

const USAGE = `usage: node tools/permission-patch.mjs --rules <catalog.json> --target user|project
         --file <settings.json> --out <patch.json>
         [--marketplaces <known_marketplaces.json>] [--expected <expected.json>]
  --target user takes --marketplaces and --expected, both required;
  --target project never takes --marketplaces; it takes --expected only for a file
  the catalog does not name (otherwise the entry is the key --file's real path ends).
See the header of this file for what each mode writes and the exit codes.`;

export function parseArgs(argv) {
  const o = {};
  const values = { '--rules': 'rules', '--target': 'target', '--file': 'file', '--marketplaces': 'marketplaces', '--expected': 'expected', '--out': 'out' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--help') o.help = true;
    else if (Object.hasOwn(values, k)) {
      if (i + 1 >= argv.length) throw refuse(`${k} needs a value`);
      if (Object.hasOwn(o, values[k])) throw refuse(`${k} given twice`);
      o[values[k]] = argv[++i];
    } else throw refuse(`unknown argument ${k}`);
  }
  return o;
}

export function main(argv) {
  let res;
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    res = { ok: false, exit: EXIT.REFUSED, error: e.message };
  }
  if (o?.help) {
    process.stdout.write(`${USAGE}\n`);
    return EXIT.OK;
  }
  if (!res) res = permissionPatch(o);
  process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
  if (!res.ok) process.stderr.write(`permission-patch: exit ${res.exit}: ${res.error}\n`);
  return res.exit;
}

// The CLI runs only when this file is the script node was started with (the
// writer's rule: one realpath on both sides, never import.meta.main).
function invokedAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedAsCli()) process.exitCode = main(process.argv.slice(2));

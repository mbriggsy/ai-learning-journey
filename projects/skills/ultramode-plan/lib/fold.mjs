#!/usr/bin/env node
// THE FOLD CHECK (KTD9 of docs/plans/hybrid-plan-step-plan.md). The main loop folds verified
// findings into a working copy of the staged plan by whole-section edits, then runs this on the
// before and after files before the working copy replaces the staged plan:
//   1. The ID check: every ID the plan defined before the fold still has every kind of defining
//      line it had (a heading, a list item, an index-table row), and is still mentioned. CE never
//      renumbers an ID (a deleted unit's number stays a gap), and a whole-section edit can drop
//      one silently: deleting "### U5." while the index table's "| U5 |" row stays is exactly
//      that drop, so a row never stands in for a heading. An ID removed on purpose keeps a line
//      saying "removed: <reason>" beside its ID, which excuses the defining lines it lost.
//   2. The drift grep: each old value a folded change replaced is searched for in the whole
//      folded plan, not just at the one instance the change named, so a value changed in one
//      section and missed in another shows up. A hit is reported, not failed: an old value can
//      rightly stay (a "Rejected:" sentence quoting it), so the main loop judges each line.
// The IDs are CE's families: R, U and KTD, which KTD9 names, plus CE's origin IDs (A, F, AE),
// which its deepen checklist says a plan must keep wherever it touches them.
// Run by the main loop as a command; never inlined into a Workflow script (KTD1).
//
// Usage: node fold.mjs <before.md> <after.md> [<changes.json>]
//   changes.json: [{ "id": "<ledger id>", "old_values": ["<value>", ...] }, ...], one entry per
//   applied id, carrying the values the fold replaced: a deepen amendment proposes its own, and
//   for a check fix the main loop records what its edit replaced.
// Prints one JSON object. Exits 0 when the ID check passes (any drift is in the output), 1 when
// it fails, and 2 when the input cannot be read (no check ran).

import { readFileSync } from "node:fs";
import { isMain, usage } from "./entry.mjs";

const IDS = "KTD|AE|R|U|A|F"; // every pattern follows this with \d+, so "AE1" can only read as AE
const FENCE = /^\s*(```|~~~)/;
// The three kinds of defining line. A heading or list item opens with the ID (after optional
// bold) and follows it with ".", ":", ")" or bold; a heading may also follow it with a space.
// An index-table row has the ID alone in its first cell. A prose bullet ("- U1 to U11 are
// done") or a diagram node ("R1 --> MS") is a mention, never a definition.
const KINDS = [
  ["heading", new RegExp(`^\\s*#{1,6}\\s+(?:\\*\\*)?(${IDS})(\\d+)(?=\\*\\*|[.:)]|\\s)`)],
  ["list", new RegExp(`^\\s*(?:[-*+]|\\d+[.)])\\s+(?:\\*\\*)?(${IDS})(\\d+)(?=\\*\\*|[.:)])`)],
  ["row", new RegExp(`^\\s*\\|\\s*(?:\\*\\*)?(${IDS})(\\d+)(?:\\*\\*)?\\s*\\|`)],
];
const MENTION = new RegExp(`\\b(${IDS})(\\d+)\\b`, "g");
const ID_SHAPE = new RegExp(`^(${IDS})(\\d+)$`);
const FAMILY_ORDER = ["R", "U", "KTD", "A", "F", "AE"];

// Natural order: R, U, KTD, then the origin IDs, each by number.
const byId = (a, b) => {
  const [, pa, na] = a.match(ID_SHAPE);
  const [, pb, nb] = b.match(ID_SHAPE);
  return FAMILY_ORDER.indexOf(pa) - FAMILY_ORDER.indexOf(pb) || Number(na) - Number(nb);
};

// The lines outside fenced code blocks, with their 1-based numbers.
function proseLines(text) {
  const out = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (FENCE.test(line)) fenced = !fenced;
    else if (!fenced) out.push({ n: i + 1, line });
  });
  return out;
}

// id -> the set of kinds of line that define it.
export function definitions(text) {
  const defs = new Map();
  for (const { line } of proseLines(text)) {
    for (const [kind, re] of KINDS) {
      const m = line.match(re);
      if (!m) continue;
      const id = `${m[1]}${m[2]}`;
      if (!defs.has(id)) defs.set(id, new Set());
      defs.get(id).add(kind);
    }
  }
  return defs;
}

export const definedIds = (text) => [...definitions(text).keys()].sort(byId);

// The ID check. `missing`: defined before, mentioned nowhere after. `lost`: defined before, still
// mentioned, but without a kind of defining line it had, and with no "removed:" line excusing it.
// A plan with no definitions at all before the fold fails: a check that found nothing to check
// never reads as a pass.
export function checkIds(before, after) {
  const was = definitions(before);
  const now = definitions(after);
  const mentioned = new Set([...after.matchAll(MENTION)].map((m) => `${m[1]}${m[2]}`));
  // A "removed:" note excuses only the ID its own line defines ("### U7. removed: ...", "| U7 |
  // removed: ... |"), never another ID it happens to mention ("merged into U1").
  const excused = new Set();
  for (const { line } of proseLines(after)) {
    if (!/removed:/i.test(line)) continue;
    for (const [, re] of KINDS) {
      const m = line.match(re);
      if (m) excused.add(`${m[1]}${m[2]}`);
    }
  }
  const ids = [...was.keys()].sort(byId);
  const missing = ids.filter((id) => !mentioned.has(id));
  const lost = ids
    .filter((id) => mentioned.has(id) && !excused.has(id))
    .map((id) => ({ id, kinds: [...was.get(id)].filter((k) => !now.get(id)?.has(k)) }))
    .filter((x) => x.kinds.length > 0);
  const added = [...now.keys()].filter((id) => !was.has(id)).sort(byId);
  const problems = [];
  if (ids.length === 0) problems.push("the plan before the fold defines no R, U, KTD, A, F or AE ID, so the ID check has nothing to check");
  if (missing.length) problems.push(`gone after the fold: ${missing.join(", ")} (an ID removed on purpose keeps a line saying "removed: <reason>"; a renumbered one keeps its old number)`);
  if (lost.length) problems.push(`lost a defining line: ${lost.map((x) => `${x.id} (its ${x.kinds.join(" and ")})`).join(", ")}; restore it, or keep a "removed: <reason>" line beside the ID`);
  return { ok: problems.length === 0, before: ids.length, after: now.size, missing, lost, excused: ids.filter((id) => excused.has(id)), added, problems };
}

const MIN_VALUE = 3; // an old value shorter than this (spaces aside) would match nearly every line

// Every change's old values, as one list: one entry per distinct value (case and inner spacing
// aside), carrying every change that named it. Nothing is dropped quietly: a value too short to
// search is listed under `refused`, and a change with no old value under `addsOnly`.
export function grepList(changes) {
  if (!Array.isArray(changes)) throw new Error("fold: the changes must be a list");
  const values = new Map();
  const refused = [];
  const addsOnly = [];
  for (const [i, a] of changes.entries()) {
    const id = a && typeof a.id === "string" && a.id.trim() ? a.id.trim() : null;
    if (!id) throw new Error(`fold: change ${i + 1} has no id`);
    const olds = a.old_values ?? a.oldValues;
    if (!Array.isArray(olds)) throw new Error(`fold: change ${id} has no old_values list (a change that only adds gives an empty one)`);
    if (olds.length === 0) addsOnly.push(id);
    for (const raw of olds) {
      const value = String(raw).replace(/\s+/g, " ").trim();
      if (value.replace(/\s/g, "").length < MIN_VALUE) {
        refused.push({ value, change: id, reason: `shorter than ${MIN_VALUE} characters: it would match nearly every line` });
        continue;
      }
      const key = value.toLowerCase();
      if (!values.has(key)) values.set(key, { value, changes: [] });
      const entry = values.get(key);
      if (!entry.changes.includes(id)) entry.changes.push(id);
    }
  }
  return { values: [...values.values()], refused, addsOnly };
}

// The lines of `text` that still carry each value, case and inner spacing aside.
export function drift(text, list) {
  const lines = text.split(/\r?\n/);
  const norm = lines.map((l) => l.replace(/\s+/g, " ").toLowerCase());
  return list.values
    .map(({ value, changes }) => {
      const needle = value.toLowerCase();
      const hits = [];
      norm.forEach((l, i) => {
        if (l.includes(needle)) hits.push({ line: i + 1, text: lines[i].trim().slice(0, 200) });
      });
      return { value, changes, hits };
    })
    .filter((d) => d.hits.length > 0);
}

export function foldCheck(before, after, changes = []) {
  const ids = checkIds(before, after);
  const list = grepList(changes);
  const found = drift(after, list);
  return {
    ok: ids.ok,
    ids,
    grep: { values: list.values.length, refused: list.refused, addsOnly: list.addsOnly },
    drift: found,
    driftLines: found.reduce((n, d) => n + d.hits.length, 0),
  };
}

if (isMain(import.meta.url)) {
  const [beforePath, afterPath, changesPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) usage("node fold.mjs <before.md> <after.md> [<changes.json>]");
  let r;
  try {
    const changes = changesPath ? JSON.parse(readFileSync(changesPath, "utf8")) : [];
    r = foldCheck(readFileSync(beforePath, "utf8"), readFileSync(afterPath, "utf8"), changes);
  } catch (e) {
    console.error(`fold: no check ran: ${e.message.replace(/^fold: /, "")}`);
    process.exit(2);
  }
  console.log(JSON.stringify(r, null, 1));
  for (const p of r.ids.problems) console.error(`fold: ${p}`);
  if (!changesPath) console.error("fold: no changes file was given, so no old value was searched for");
  if (r.driftLines) console.error(`fold: ${r.drift.length} old value(s) still appear on ${r.driftLines} line(s): judge each one`);
  process.exit(r.ok ? 0 : 1);
}

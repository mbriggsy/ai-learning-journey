#!/usr/bin/env node
// THE FOLD CHECK (KTD9 of docs/plans/hybrid-plan-step-plan.md). The main loop folds verified
// findings into a working copy of the staged plan by whole-section edits, then runs this on the
// before and after files before the working copy replaces the staged plan:
//   1. The ID check: every ID the plan defined before the fold keeps as many defining lines of its
//      strongest tier as it had, and is still mentioned. The tiers: a heading (a unit's "### U5."),
//      above a one-line definition, a list item or an index-table row ("- R1.", "| U5 |"). CE
//      never renumbers an ID (a deleted unit's number stays a gap), and a whole-section edit can
//      drop one silently: deleting "### U5." while the index table's "| U5 |" row stays, or while
//      an as-built "### U5 - notes" heading stays, is exactly that drop. Counting lines, not kinds,
//      is what catches the second: a twin line of the same tier never stands in for a dropped one.
//      Below the strongest tier lines may come and go (an index table dropped under headings that
//      stay, a requirements list rendered as a table), since CE writes each ID in either form. An
//      ID removed on purpose keeps a line whose text right after the ID reads "removed: <reason>",
//      which excuses what it lost.
//   2. The drift grep: each old value a folded change replaced is searched for in the whole
//      folded plan, line by line, not just at the one instance the change named, so a value
//      changed in one section and missed in another shows up. A hit is reported, not failed: an
//      old value can rightly stay (a "Rejected:" sentence quoting it), so the main loop judges each
//      line. A value split across two lines is not found: the grep is per line.
// The IDs are CE's families: R, U and KTD, which KTD9 names, plus CE's origin IDs (A, F, AE),
// which its deepen checklist says a plan must keep wherever it touches them.
// Run by the main loop as a command; never inlined into a Workflow script (KTD1).
//
// Usage: node fold.mjs <before.md> <after.md> <changes.json>
//   changes.json: [{ "id": "<ledger id>", "old_values": ["<value>", ...] }, ...], one entry per
//   applied id, carrying the values the fold replaced: a deepen amendment proposes its own, and
//   for a check fix the main loop records what its edit replaced. A change that only adds gives
//   an empty list. Every fold applies at least one id, so an empty or missing file is an error.
// Prints one JSON object. Exits 0 when the ID check passes (any drift is in the output), 1 when
// it fails, and 2 when the input cannot be read (no check ran).

import { readFileSync } from "node:fs";
import { isMain, usage } from "./entry.mjs";
import { readMarkdown } from "./markdown.mjs";

const IDS = "KTD|AE|R|U|A|F"; // every pattern follows this with \d+, so "AE1" can only read as AE
// The three kinds of defining line. A heading or list item opens with the ID (after optional bold,
// and for a list item an optional "[ ]" box) and follows it with ".", ":", ")" or bold; a heading
// may also follow it with a space or end the line, and a bold list item may carry a parenthesis
// inside its bold ("- **R1 (PRD 6.2)** --"). A "." followed by a digit is a sub-ID ("U2.5"), never
// U2's definition. An index-table row has the ID alone in its first cell. A prose bullet ("- U1
// to U11 are done") or a diagram node ("R1 --> MS") is a mention, never a definition.
const KINDS = [
  ["heading", new RegExp(`^\\s*#{1,6}\\s+(?:\\*\\*)?(${IDS})(\\d+)(?=\\*\\*|[.:)](?!\\d)|\\s|$)`)],
  ["list", new RegExp(`^\\s*(?:[-*+]|\\d+[.)])\\s+(?:\\[[ xX]\\]\\s+)?(?:\\*\\*)?(${IDS})(\\d+)(?=\\*\\*|[.:)](?!\\d)|\\s+\\([^)]*\\)\\*\\*)`)],
  ["row", new RegExp(`^\\s*\\|\\s*(?:\\*\\*)?(${IDS})(\\d+)(?:\\*\\*)?[.:]?(?:\\*\\*)?\\s*\\|`)],
];
// A heading whose ID runs straight into a word ("### R13 splits - two axes", "### R6 vocabulary
// discipline") is a section about the ID, not its definition: it counts as a one-line definition
// (a "topic"), so it never outranks the ID's own list item or row and lets that line vanish (Burned's
// phase-1, -4 and -5 plans have these). A heading that sets its ID off with ".", ":", ")", bold,
// a dash, a slash, "removed:" or the end of the line stays a heading ("### U5. Bench",
// "## F1 - intake shape", "### U7 removed: merged").
const FOLD_DASHES = String.fromCharCode(0x2013, 0x2014);
const SET_OFF = new RegExp(`^(?:$|\\*\\*|[.:)]|\\s*$|\\s+(?:[-/:${FOLD_DASHES}]|removed:))`, "i");
// The strongest tier an ID's lines reach: a heading, or a one-line definition (a list item, an
// index row, or a topical heading).
const TIER = { heading: 2, topic: 1, list: 1, row: 1 };
const TIER_NAME = { 2: "heading", 1: "list item, index row or topical heading" };
// What may sit between an ID and its "removed:" note on a heading or list line: a parenthesis
// inside bold, the bold's close, one ".", ":" or ")", and spaces.
const AFTER_ID = /^(?:\s+\([^)]*\))?(?:\*\*)?[.:)]?(?:\*\*)?\s*/;
const MENTION = new RegExp(`\\b(${IDS})(\\d+)\\b`, "g");
const ID_SHAPE = new RegExp(`^(${IDS})(\\d+)$`);
const FAMILY_ORDER = ["R", "U", "KTD", "A", "F", "AE"];

// Natural order: R, U, KTD, then the origin IDs, each by number.
const byId = (a, b) => {
  const [, pa, na] = a.match(ID_SHAPE);
  const [, pb, nb] = b.match(ID_SHAPE);
  return FAMILY_ORDER.indexOf(pa) - FAMILY_ORDER.indexOf(pb) || Number(na) - Number(nb);
};

// Each defining line of the plan's prose (outside the front matter and every fence): its ID, its
// kind, its line number, and whether it is the ID's "removed: <reason>" note.
function definingLines(prose) {
  const out = [];
  for (const { n, line } of prose) {
    for (const [kind, re] of KINDS) {
      const m = line.match(re);
      if (!m) continue;
      const rest = line.slice(m[0].length);
      const note = kind === "row" ? /^\s*(?:\*\*)?removed:/i.test(rest) : /^removed:/i.test(rest.replace(AFTER_ID, ""));
      out.push({ id: `${m[1]}${m[2]}`, kind: kind === "heading" && !SET_OFF.test(rest) ? "topic" : kind, line: n, removed: note });
    }
  }
  return out;
}

// id -> its defining lines, each { kind, line, removed }, in document order.
export function definitions(text) {
  const defs = new Map();
  for (const d of definingLines(readMarkdown(text).prose)) {
    if (!defs.has(d.id)) defs.set(d.id, []);
    defs.get(d.id).push({ kind: d.kind, line: d.line, removed: d.removed });
  }
  return defs;
}

export const definedIds = (text) => [...definitions(text).keys()].sort(byId);

// The ID check. `missing`: defined before, mentioned nowhere after. `lost`: defined before, still
// mentioned, but with fewer lines at its strongest tier than it had (a heading tier counts
// headings; a one-line tier counts list items, rows and any heading it gained), and no "removed:"
// note excusing it. A plan with no definitions at all before the fold fails, and so does a fence
// left open in either file: every line after it would read as code, so no ID there is checked.
export function checkIds(before, after) {
  const mdBefore = readMarkdown(before);
  const mdAfter = readMarkdown(after);
  const was = definitions(before);
  const now = definitions(after);
  const mentioned = new Set([...after.matchAll(MENTION)].map((m) => `${m[1]}${m[2]}`));
  // A "removed:" note excuses only the ID its own line defines, and only when the note opens the
  // text right after the ID ("### U7. removed: ...", "| U7 | removed: ... |"), never prose that
  // happens to hold the word ("### U2. Old flags removed: the sweep") or another ID it mentions.
  const excused = new Set([...now].filter(([, ds]) => ds.some((d) => d.removed)).map(([id]) => id));
  const ids = [...was.keys()].sort(byId);
  const missing = ids.filter((id) => !mentioned.has(id));
  const lost = [];
  for (const id of ids) {
    if (!mentioned.has(id) || excused.has(id)) continue;
    const tier = Math.max(...was.get(id).map((d) => TIER[d.kind]));
    const had = was.get(id).filter((d) => TIER[d.kind] === tier).length;
    const has = (now.get(id) ?? []).filter((d) => TIER[d.kind] >= tier).length;
    if (has < had) lost.push({ id, tier: TIER_NAME[tier], before: had, after: has });
  }
  const added = [...now.keys()].filter((id) => !was.has(id)).sort(byId);
  const problems = [];
  if (mdBefore.openFence !== null) problems.push(`the plan before the fold opens a fence at line ${mdBefore.openFence} that never closes, so every line after it reads as code and no ID there is checked`);
  if (mdAfter.openFence !== null) problems.push(`the folded plan opens a fence at line ${mdAfter.openFence} that never closes, so every line after it reads as code: close it`);
  if (ids.length === 0) problems.push("the plan before the fold defines no R, U, KTD, A, F or AE ID, so the ID check has nothing to check");
  if (missing.length) problems.push(`gone after the fold: ${missing.join(", ")} (an ID removed on purpose keeps a line such as "### U7. removed: <reason>"; a renumbered one keeps its old number)`);
  if (lost.length) problems.push(`lost a defining line: ${lost.map((x) => `${x.id} (${x.before} ${x.tier} line${x.before === 1 ? "" : "s"} before, ${x.after} after)`).join(", ")}; restore the line (a second line of the same tier counts too, so a reworded twin keeps its ID where it stood), or, only for an ID removed on purpose, write its note as "### U7. removed: <reason>", "- R3. removed: <reason>" or "| U7 | removed: <reason> |"`);
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
      if (typeof raw !== "string") throw new Error(`fold: change ${id} has an old value that is not text (${JSON.stringify(raw)})`);
      const value = raw.replace(/\s+/g, " ").trim();
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

export function foldCheck(before, after, changes) {
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
  if (!beforePath || !afterPath || !changesPath) usage("node fold.mjs <before.md> <after.md> <changes.json>");
  let r;
  try {
    const changes = JSON.parse(readFileSync(changesPath, "utf8"));
    if (Array.isArray(changes) && changes.length === 0) throw new Error("the changes list is empty: every fold applies at least one id, and a change that only adds is listed with old_values []");
    r = foldCheck(readFileSync(beforePath, "utf8"), readFileSync(afterPath, "utf8"), changes);
  } catch (e) {
    console.error(`fold: no check ran: ${e.message.replace(/^fold: /, "")}`);
    process.exit(2);
  }
  console.log(JSON.stringify(r, null, 1));
  for (const p of r.ids.problems) console.error(`fold: ${p}`);
  if (r.driftLines) console.error(`fold: ${r.drift.length} old value(s) still appear on ${r.driftLines} line(s): judge each one`);
  process.exit(r.ok ? 0 : 1);
}

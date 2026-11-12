#!/usr/bin/env node
// THE FOLD CHECK (KTD9 of docs/plans/hybrid-plan-step-plan.md), run by `apply` below on the plan
// before and after a fold's edits, before it writes anything:
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
//      line. A value split across two lines is not found: the grep is per line. A value under 3
//      characters (a renamed "U7", a changed "5%") is matched as a whole word, never as part of
//      one, since as a bare substring it would match nearly every line.
// The IDs are CE's families: R, U and KTD, which KTD9 names, plus CE's origin IDs (A, F, AE),
// which its deepen checklist says a plan must keep wherever it touches them.
// Run by the main loop as a command; never inlined into a Workflow script (KTD1).
//
// THE FOLD ITSELF (`apply`, added after the first real run, 2026-11-11). The main loop folds by
// exact text pairs, never by rewriting a section: one JSON list per fold, each edit
//   { "ids": [the ledger ids it folds], "old": "<text copied exactly from the plan>",
//     "new": "<its replacement, empty to delete>", "olds": [optional: short phrases it retires],
//     "seats": [optional: other check seats whose ground it touches] }.
// `apply` places every old text in the plan as it stands (each found exactly once, no two
// overlapping, none dropping the line break that ends its old text), applies them all or none, runs
// the ID check and the drift grep on the result (each id's old values are its edits' olds), and
// writes the plan only when the ID check passes.
// Given a changes file, it appends the fold's hunks there: each run of changed lines, whole, as
// { id, kind, classes, text } and an edit's was, the form a later check round takes as its changes.
// A hunk's classes are the seats its ids name (a check finding's id names its seat: c1-reach-3)
// and its edits' seats; its id joins its ids. What earned it: the run folded 156 pairs through
// three hand-written scripts that each refused unless every old text matched once (one miss,
// caught before any write), and round 2's changes, one entry per folded finding with its old and
// new text, could not be built by hand for 47 findings.
//
// Usage: node fold.mjs apply <plan.md> <edits.json> [<changes file to append to>]
// Prints one JSON object. Exits 0 when the fold is written, 1 when the ID check fails, and 2 when
// an edit is refused or the input cannot be read; on 1 and 2 nothing is written.

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isMain, usage } from "./entry.mjs";
import { readMarkdown } from "./markdown.mjs";
import { PROMPT_CHECK_SEATS } from "./prompts.mjs";

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

// An old value shorter than this (spaces aside) is matched only as a whole word: as a substring it
// would match nearly every line.
const MIN_VALUE = 3;

// Every change's old values, as one list: one entry per distinct value (case and inner spacing
// aside), carrying every change that named it, and `whole` when it is matched as a whole word.
// Nothing is dropped: a change with no old value is listed under `addsOnly`, and a blank value
// throws.
export function grepList(changes) {
  if (!Array.isArray(changes)) throw new Error("fold: the changes must be a list");
  const values = new Map();
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
      if (!value) throw new Error(`fold: change ${id} has a blank old value`);
      const key = value.toLowerCase();
      if (!values.has(key)) values.set(key, { value, whole: value.replace(/\s/g, "").length < MIN_VALUE, changes: [] });
      const entry = values.get(key);
      if (!entry.changes.includes(id)) entry.changes.push(id);
    }
  }
  return { values: [...values.values()], addsOnly };
}

// The lines of `text` that still carry each value, case and inner spacing aside; a whole-word
// value only where no letter, digit or underscore touches it ("U7" in "U7." but not in "U70").
export function drift(text, list) {
  const lines = text.split(/\r?\n/);
  const norm = lines.map((l) => l.replace(/\s+/g, " ").toLowerCase());
  return list.values
    .map(({ value, whole, changes }) => {
      const needle = value.toLowerCase();
      const word = whole ? new RegExp(`(?<![a-z0-9_])${needle.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`)}(?![a-z0-9_])`) : null;
      const hits = [];
      norm.forEach((l, i) => {
        if (word ? word.test(l) : l.includes(needle)) hits.push({ line: i + 1, text: lines[i].trim().slice(0, 200) });
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
    grep: { values: list.values.length, whole: list.values.filter((v) => v.whole).map((v) => v.value), addsOnly: list.addsOnly },
    drift: found,
    driftLines: found.reduce((n, d) => n + d.hits.length, 0),
  };
}

// ---------------------------------------------------------------- the fold itself (apply)

const EDIT_FIELDS = ["ids", "old", "new", "olds", "seats"];
// Every seat a check round can run: the seats prompts.mjs writes a charter for, and the premise.
export const FOLD_SEATS = [...Object.keys(PROMPT_CHECK_SEATS), "premise"];
// A check finding's id: its round, its seat and its number (check.src.js names them so).
const CHECK_ID = /^c[1-3]-(.+)-[1-9][0-9]*$/;
const seatOf = (id) => id.match(CHECK_ID)?.[1] ?? null;
const shown = (text) => JSON.stringify(text.length > 80 ? `${text.slice(0, 80)}...` : text);

// Every start of `needle` in `text`, overlapping starts included.
function startsOf(text, needle) {
  const out = [];
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) out.push(at);
  return out;
}

// The edits checked against the plan, and each one placed: { n, at, end, ids, edit }, in plan order.
// `problems` names every edit that is malformed, changes nothing, names an unknown seat, is not
// found in the plan exactly once, or overlaps another; a non-empty list means nothing may be written.
export function placeEdits(plan, edits) {
  if (!Array.isArray(edits) || edits.length === 0) return { problems: ["the edits are a non-empty list of { ids, old, new }"], placed: [] };
  const problems = [];
  const placed = [];
  edits.forEach((e, i) => {
    const where = `edit ${i + 1}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) return void problems.push(`${where} is no object`);
    const before = problems.length;
    for (const k of Object.keys(e)) if (!EDIT_FIELDS.includes(k)) problems.push(`${where} has no field ${k} (its fields: ${EDIT_FIELDS.join(", ")})`);
    const ids = Array.isArray(e.ids) && e.ids.length > 0 && e.ids.every((id) => typeof id === "string" && id.trim()) ? e.ids.map((id) => id.trim()) : null;
    if (!ids) problems.push(`${where}: ids is a non-empty list of the ledger ids it folds`);
    if (typeof e.old !== "string" || e.old === "") problems.push(`${where}: old is the exact text it replaces, never empty`);
    if (typeof e.new !== "string") problems.push(`${where}: new is its replacement text ("" deletes the old text)`);
    if (e.olds !== undefined && !(Array.isArray(e.olds) && e.olds.every((s) => typeof s === "string" && s.trim()))) problems.push(`${where}: olds is a list of the short phrases it retires, none blank`);
    if (e.seats !== undefined && !(Array.isArray(e.seats) && e.seats.every((s) => FOLD_SEATS.includes(s)))) problems.push(`${where}: seats is a list of check seats (${FOLD_SEATS.join(", ")})`);
    for (const id of ids ?? []) if (seatOf(id) !== null && !FOLD_SEATS.includes(seatOf(id))) problems.push(`${where}: ${id} reads as a check finding's id, but ${seatOf(id)} is no check seat`);
    if (problems.length > before) return;
    if (e.old === e.new) return void problems.push(`${where} (${ids.join(", ")}) changes nothing: its new text is its old`);
    // A new text that drops the line break ending its old text joins the next line onto it, and
    // that line sits outside every hunk: a heading swallowed into a sentence would pass unseen.
    if (e.old.endsWith("\n") && e.new !== "" && !e.new.endsWith("\n")) return void problems.push(`${where} (${ids.join(", ")}): its old text ends its line and its new text does not, so the next line would join this one: end the new text with a line break too, or put the next line in the old text`);
    const hits = startsOf(plan, e.old);
    if (hits.length !== 1) {
      const crlf = hits.length === 0 && plan.includes("\r\n") && e.old.includes("\n") && !e.old.includes("\r") ? " (the plan's lines end in CRLF, this old text's in LF)" : "";
      return void problems.push(`${where} (${ids.join(", ")}): its old text is in the plan ${hits.length} times, and must be there exactly once${crlf}: ${shown(e.old)}`);
    }
    placed.push({ n: i + 1, at: hits[0], end: hits[0] + e.old.length, ids, edit: e });
  });
  placed.sort((a, b) => a.at - b.at);
  // Against the edit reaching furthest so far, so one long edit that covers two later ones names both.
  let reach = null;
  for (const p of placed) {
    if (reach && p.at < reach.end) problems.push(`edits ${reach.n} and ${p.n} overlap in the plan: make them one edit`);
    if (!reach || p.end > reach.end) reach = p;
  }
  return { problems, placed };
}

// `text` with every placed edit made (the edits in plan order and apart).
function spliced(text, placed, offset = 0) {
  let out = "";
  let from = 0;
  for (const p of placed) {
    out += text.slice(from, p.at - offset) + p.edit.new;
    from = p.end - offset;
  }
  return out + text.slice(from);
}

// A block's lines, without the empty line after its last line break, and with no line's "\r".
const linesOf = (block) => {
  const lines = block.split("\n").map((l) => l.replace(/\r$/, ""));
  if (lines.at(-1) === "") lines.pop();
  return lines;
};
// Lines with the blank ones at either end dropped, joined.
const joined = (lines) => {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].trim()) a++;
  while (b > a && !lines[b - 1].trim()) b--;
  return lines.slice(a, b).join("\n");
};

// The fold's hunks, in plan order: each run of whole lines the placed edits change (edits on one
// line or on lines that overlap are one hunk), with its unchanged first and last lines trimmed off.
// An add is lines put in, a delete lines taken out, and anything else an edit with its was. A hunk
// that changes only blank space is counted in `blankOnly` and left out: there is nothing in it to
// review, and a check round refuses a change whose text is its was.
export function foldHunks(plan, placed) {
  const starts = [0];
  for (let i = 0; i < plan.length; i++) if (plan[i] === "\n") starts.push(i + 1);
  const lineAt = (pos) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const groups = [];
  for (const p of placed) {
    const first = lineAt(p.at);
    const last = lineAt(Math.max(p.at, p.end - 1));
    const g = groups.at(-1);
    if (g && first <= g.last) {
      g.last = Math.max(g.last, last);
      g.placed.push(p);
    } else groups.push({ first, last, placed: [p] });
  }
  const hunks = [];
  let blankOnly = 0;
  for (const g of groups) {
    const from = starts[g.first];
    const to = g.last + 1 < starts.length ? starts[g.last + 1] : plan.length;
    const was = linesOf(plan.slice(from, to));
    const now = linesOf(spliced(plan.slice(from, to), g.placed, from));
    let a = 0;
    while (a < was.length && a < now.length && was[a] === now[a]) a++;
    let b = 0;
    while (b < was.length - a && b < now.length - a && was[was.length - 1 - b] === now[now.length - 1 - b]) b++;
    const oldText = joined(was.slice(a, was.length - b));
    const newText = joined(now.slice(a, now.length - b));
    const ids = [...new Set(g.placed.flatMap((p) => p.ids))];
    const classes = [...new Set(g.placed.flatMap((p) => [...p.ids.map(seatOf).filter((s) => s !== null), ...(p.edit.seats ?? [])]))];
    const id = ids.join(" + ");
    if (oldText.trim() === newText.trim()) blankOnly++;
    else if (!oldText.trim()) hunks.push({ id, kind: "add", classes, text: newText });
    else if (!newText.trim()) hunks.push({ id, kind: "delete", classes, text: oldText });
    else hunks.push({ id, kind: "edit", classes, text: newText, was: oldText });
  }
  return { hunks, blankOnly };
}

// The whole fold, in memory: the edits placed, the plan they make, the ID check and drift grep on
// it, and its hunks. `refused` lists every problem placeEdits found; with any, nothing else runs.
export function applyFold(plan, edits) {
  const { problems, placed } = placeEdits(plan, edits);
  if (problems.length) return { ok: false, refused: problems };
  const after = spliced(plan, placed);
  const ids = [...new Set(placed.flatMap((p) => p.ids))];
  const grep = ids.map((id) => ({ id, old_values: [...new Set(placed.filter((p) => p.ids.includes(id)).flatMap((p) => p.edit.olds ?? []))] }));
  const check = foldCheck(plan, after, grep);
  return { ok: check.ok, refused: [], after, edits: placed.length, ids, check, ...foldHunks(plan, placed) };
}

function applyCommand([planPath, editsPath, changesPath]) {
  if (!planPath || !editsPath) usage("node fold.mjs apply <plan.md> <edits.json> [<changes file to append to>]");
  let r;
  let earlier = [];
  try {
    const plan = readFileSync(planPath, "utf8");
    r = applyFold(plan, JSON.parse(readFileSync(editsPath, "utf8")));
    if (changesPath && !(existsSync(dirname(changesPath)) && statSync(dirname(changesPath)).isDirectory())) throw new Error(`the changes file's folder ${dirname(changesPath)} does not exist`);
    if (changesPath && existsSync(changesPath)) {
      earlier = JSON.parse(readFileSync(changesPath, "utf8"));
      if (!Array.isArray(earlier)) throw new Error(`the changes file ${changesPath} holds no list`);
    }
  } catch (e) {
    console.error(`fold: no fold ran: ${e.message.replace(/^fold: /, "")}`);
    process.exit(2);
  }
  if (r.refused.length) {
    console.log(JSON.stringify({ ok: false, written: false, refused: r.refused }, null, 1));
    for (const p of r.refused) console.error(`fold: ${p}`);
    console.error(`fold: nothing was written: ${r.refused.length} problem(s) with the edits`);
    process.exitCode = 2;
    return;
  }
  if (r.ok) {
    writeFileSync(planPath, r.after);
    if (changesPath) writeFileSync(changesPath, `${JSON.stringify([...earlier, ...r.hunks], null, 1)}\n`);
  }
  const { ok, problems, before, after, missing, lost, excused, added } = r.check.ids;
  console.log(JSON.stringify({ ok, written: ok, edits: r.edits, ids: r.ids, idCheck: { before, after, missing, lost, excused, added, problems }, olds: { searched: r.check.grep.values, wholeWord: r.check.grep.whole }, drift: r.check.drift, driftLines: r.check.driftLines, hunks: r.hunks.length, blankOnly: r.blankOnly, changes: ok && changesPath ? changesPath : null }, null, 1));
  for (const p of problems) console.error(`fold: ${p}`);
  if (!ok) console.error("fold: nothing was written: fix the edits and apply them again");
  if (r.check.driftLines) console.error(`fold: ${r.check.drift.length} old value(s) still appear on ${r.check.driftLines} line(s): judge each one`);
  process.exitCode = ok ? 0 : 1;
}

if (isMain(import.meta.url)) {
  if (process.argv[2] === "apply") applyCommand(process.argv.slice(3));
  else usage("node fold.mjs apply <plan.md> <edits.json> [<changes file to append to>]");
}

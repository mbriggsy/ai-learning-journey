#!/usr/bin/env node
// THE FOLD CHECK (KTD9 of docs/plans/hybrid-plan-step-plan.md). The main loop folds verified
// findings into a working copy of the staged plan by whole-section edits, then runs this on the
// before and after files before the working copy replaces the staged plan:
//   1. The ID check: every R, U and KTD ID the plan defined before the fold is still defined,
//      and still mentioned, after it. CE never renumbers a U-ID (a deleted unit's number stays a
//      gap), and a whole-section edit can drop one silently. An ID removed on purpose keeps its
//      line with a "removed: <reason>" note, so the check still finds it.
//   2. The drift grep: for every amendment, each of its old values is searched for in the whole
//      folded plan, not just at the one instance the amendment named, so a value the fold
//      changed in one section and missed in another shows up. A hit is reported, not failed:
//      an old value can rightly stay (a "Rejected:" sentence quoting it), so the main loop judges
//      each line.
// Run by the main loop as a command; never inlined into a Workflow script (KTD1).
//
// Usage: node fold.mjs <before.md> <after.md> [<amendments.json>]
//   amendments.json: [{ "id": "<ledger id>", "old_values": ["<value>", ...] }, ...]
// Prints one JSON object. Exits 1 when the ID check fails, 0 otherwise (drift is in the output).

import { readFileSync } from "node:fs";
import { isMain, usage } from "./entry.mjs";

export const ID_PREFIXES = ["R", "U", "KTD"];

// A defining line: the ID opens the line, after at most a list marker, heading hashes, a table
// bar or bold, and is followed by ".", ":", ")", a table bar, bold or a space ("- R1. ...",
// "### U2. ...", "- KTD8. **...", "| U3 | ...").
function definitionRe(prefixes) {
  return new RegExp(`^\\s*(?:#{1,6}\\s+|[-*+]\\s+|\\d+[.)]\\s+|\\|\\s*)?(?:\\*\\*)?(${prefixes.join("|")})(\\d+)(?=\\*\\*|[.:)|]|\\s)`, "gm");
}
const mentionRe = (prefixes) => new RegExp(`\\b(${prefixes.join("|")})(\\d+)\\b`, "g");

const idsBy = (re, text) => new Set([...text.matchAll(re)].map((m) => `${m[1]}${m[2]}`));

// Natural order: R before U before KTD, then by number.
const byId = (prefixes) => (a, b) => {
  const pa = prefixes.findIndex((p) => new RegExp(`^${p}\\d+$`).test(a));
  const pb = prefixes.findIndex((p) => new RegExp(`^${p}\\d+$`).test(b));
  return pa - pb || Number(a.replace(/^\D+/, "")) - Number(b.replace(/^\D+/, ""));
};

export function definedIds(text, prefixes = ID_PREFIXES) {
  return [...idsBy(definitionRe(prefixes), text)].sort(byId(prefixes));
}

// The ID check. `missing`: defined before, mentioned nowhere after. `undefinedAfter`: defined
// before, still mentioned after, but no longer defined. A plan with no definitions at all before
// the fold fails: a check that found nothing to check never reads as a pass.
export function checkIds(before, after, prefixes = ID_PREFIXES) {
  const was = definedIds(before, prefixes);
  const definedNow = idsBy(definitionRe(prefixes), after);
  const mentionedNow = idsBy(mentionRe(prefixes), after);
  const missing = was.filter((id) => !mentionedNow.has(id));
  const undefinedAfter = was.filter((id) => mentionedNow.has(id) && !definedNow.has(id));
  const added = [...definedNow].filter((id) => !was.includes(id)).sort(byId(prefixes));
  const problems = [];
  if (was.length === 0) problems.push(`the plan before the fold defines no ${prefixes.join(", ")} ID, so the ID check has nothing to check`);
  if (missing.length) problems.push(`gone after the fold: ${missing.join(", ")} (an ID removed on purpose keeps its line with a "removed: <reason>" note; a renumbered one keeps its old number)`);
  if (undefinedAfter.length) problems.push(`still mentioned but no longer defined: ${undefinedAfter.join(", ")}`);
  return { ok: problems.length === 0, before: was.length, after: definedNow.size, missing, undefinedAfter, added, problems };
}

const MIN_VALUE = 3; // an old value shorter than this (spaces aside) would match nearly every line

// Every amendment's old values, as one list: one entry per distinct value (case and inner spacing
// aside), carrying every amendment that named it. Nothing is dropped quietly: a value too short to
// search is listed under `refused`, and an amendment with no old value under `addsOnly`.
export function grepList(amendments) {
  if (!Array.isArray(amendments)) throw new Error("fold: amendments must be a list");
  const values = new Map();
  const refused = [];
  const addsOnly = [];
  for (const [i, a] of amendments.entries()) {
    const id = a && typeof a.id === "string" && a.id.trim() ? a.id.trim() : null;
    if (!id) throw new Error(`fold: amendment ${i + 1} has no id`);
    const olds = a.old_values ?? a.oldValues;
    if (!Array.isArray(olds)) throw new Error(`fold: amendment ${id} has no old_values list (an amendment that only adds gives an empty one)`);
    if (olds.length === 0) addsOnly.push(id);
    for (const raw of olds) {
      const value = String(raw).replace(/\s+/g, " ").trim();
      if (value.replace(/\s/g, "").length < MIN_VALUE) {
        refused.push({ value, amendment: id, reason: `shorter than ${MIN_VALUE} characters: it would match nearly every line` });
        continue;
      }
      const key = value.toLowerCase();
      if (!values.has(key)) values.set(key, { value, amendments: [] });
      const entry = values.get(key);
      if (!entry.amendments.includes(id)) entry.amendments.push(id);
    }
  }
  return { values: [...values.values()], refused, addsOnly };
}

// The lines of `text` that still carry each value, case and inner spacing aside.
export function drift(text, list) {
  const lines = text.split(/\r?\n/);
  const norm = lines.map((l) => l.replace(/\s+/g, " ").toLowerCase());
  return list.values
    .map(({ value, amendments }) => {
      const needle = value.toLowerCase();
      const hits = [];
      norm.forEach((l, i) => {
        if (l.includes(needle)) hits.push({ line: i + 1, text: lines[i].trim().slice(0, 200) });
      });
      return { value, amendments, hits };
    })
    .filter((d) => d.hits.length > 0);
}

export function foldCheck(before, after, amendments = []) {
  const ids = checkIds(before, after);
  const list = grepList(amendments);
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
  const [beforePath, afterPath, amendmentsPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) usage("node fold.mjs <before.md> <after.md> [<amendments.json>]");
  const amendments = amendmentsPath ? JSON.parse(readFileSync(amendmentsPath, "utf8")) : [];
  const r = foldCheck(readFileSync(beforePath, "utf8"), readFileSync(afterPath, "utf8"), amendments);
  console.log(JSON.stringify(r, null, 1));
  for (const p of r.ids.problems) console.error(`fold: ${p}`);
  if (r.driftLines) console.error(`fold: ${r.drift.length} old value(s) still appear on ${r.driftLines} line(s): judge each one`);
  process.exit(r.ok ? 0 : 1);
}

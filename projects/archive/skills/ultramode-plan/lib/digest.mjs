#!/usr/bin/env node
// A STAGE'S RESULT, DIGESTED (added after the first real run, 2026-11-11). A Workflow's output file
// holds the script's whole return. On the Back Nine's workbench plan, check round 1 returned 486 KB
// and the deepen's results ran to hundreds of KB, each too large for one Read, and paging them cost
// the main loop window it needed for the folds. This prints what the main loop acts on: the
// summary, one key a line, then one block per confirmed or hand-verify entry of the ledger (a check
// finding, a deepen amendment, a deepen premise finding). The text a fold is made from (a finding's
// fix, an amendment's change and old values, a better fix) prints whole, since the schema already
// caps it; the descriptive fields are cut to 300 characters. Each block's ACT line is the vote law's
// own fix call (vote-law.mjs fixVerdict, kept in the verdict as `fix`), never a call of its own.
// Every acted-on id the summary names is counted against the blocks printed, and one it lacks is
// named. Given ids, it prints those entries whole instead, votes and all, for a trace.
//
// Usage: node digest.mjs <the Workflow's output file> [<id> ...]
//   The file is the one the completion notice names (its `result` is the script's return) or the
//   return itself. A research result has no ledger: its summary and every gist print whole.
// Exit 0 when it printed what was asked; 1 when an id asked for is in no ledger, when the whole
// entries asked for would pass DIGEST_PRINT_CAP (it prints those that fit and names the rest), or
// when the summary names an acted-on id with no block (the ones found still print); 2 when the file
// cannot be read.

import { readFileSync } from "node:fs";
import { isMain, usage } from "./entry.mjs";

export const DIGEST_CUT = 300;
// What one call prints of whole entries: under the ~30,000 characters past which a tool's output
// collapses to a short preview (the playbook's insight 012). A whole entry runs 4 to 6 KB.
export const DIGEST_PRINT_CAP = 25000;
// A summary value printed on one line up to this length, else indented over several, since Read
// cuts a line past about 2,000 characters.
const ONE_LINE = 1500;
// The statuses the main loop acts on: a confirmed entry is folded, a hand-verify one traced first.
const ACTED_ON = ["confirmed", "hand-verify"];

const flat = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const cut = (text) => {
  const one = flat(text);
  return one.length > DIGEST_CUT ? `${one.slice(0, DIGEST_CUT)}...` : one;
};

// The script's return from the file's text: the notice's output file wraps it in `result`.
export function resultOf(text) {
  const o = JSON.parse(text);
  const r = o && typeof o === "object" && !Array.isArray(o) && o.result && typeof o.result === "object" ? o.result : o;
  if (!r || typeof r !== "object" || !r.summary || typeof r.summary !== "object") throw new Error("digest: the file holds no stage result (no summary)");
  return r;
}

// Every ledger entry of a result, each as { id, kind, entry }: a check's findings, a deepen's
// premise findings and amendments. A research result has none.
export function ledger(r) {
  const out = [];
  for (const f of Array.isArray(r.findings) ? r.findings : []) out.push({ id: f.id, kind: "finding", entry: f });
  for (const p of Array.isArray(r.premise) ? r.premise : []) out.push({ id: p.id, kind: "finding", entry: p });
  for (const a of Array.isArray(r.amendments) ? r.amendments : []) out.push({ id: a.id, kind: "amendment", entry: a });
  return out;
}

// The acted-on ids the summary names, by the summary's own lists: a check's confirmed and
// hand-verify ids, a deepen's confirmed and hand-verify amendments and its carried premise findings.
export function summaryIds(s) {
  const lists = [s.confirmed, s.handVerify, s.amendments?.confirmed, s.amendments?.handVerify, s.premise?.carried, s.premise?.above];
  return [...new Set(lists.filter(Array.isArray).flat().filter((id) => typeof id === "string"))];
}

// The fold call: the vote law's fix verdict on the ACT line; under apply-better its one better fix
// (B), under hand-verify every better fix offered (B); under apply a minority's fix is a D line, not
// the fold; and a note a voter who judged the fix right still added is an N line.
function actLines(entry) {
  const fix = entry.verdict?.fix ?? { action: "hand-verify", basis: "the verdict carries no fix call", betterFixes: [] };
  const lines = [`ACT: ${fix.action}: ${flat(fix.basis)}`];
  if (fix.action === "apply-better") lines.push(`  B: ${flat(fix.betterFix)}`);
  else for (const b of fix.betterFixes ?? []) lines.push(`  ${fix.action === "apply" ? "D" : "B"}: ${flat(b)}`);
  const notes = (Array.isArray(entry.votes) ? entry.votes : []).filter((v) => v && v.real === true && v.fix_is_correct === true && flat(v.better_fix));
  for (const v of notes) lines.push(`  N: ${flat(v.better_fix)}`);
  return lines;
}

// One entry's block.
export function block({ id, kind, entry }) {
  const v = entry.verdict ?? {};
  const voted = Array.isArray(v.votedSeverity) && v.votedSeverity.length ? v.votedSeverity.join("/") : "none";
  if (kind === "amendment") {
    const a = entry.amendment ?? {};
    const where = entry.section ? `L${entry.section.line} ${cut(entry.section.heading)}` : cut(a.section);
    return [
      `## ${id} [${v.status}] ${a.severity ?? "?"} -> ${voted} | ${where} | ${entry.agent ?? "?"}`,
      `GAP: ${cut(a.gap)}`,
      `CHANGE: ${flat(a.change)}`,
      `OLD: ${Array.isArray(a.old_values) && a.old_values.length ? a.old_values.map(flat).join(" | ") : "none"}`,
      ...actLines(entry),
    ].join("\n");
  }
  const f = entry.finding ?? {};
  return [
    `## ${id} [${v.status}] ${f.severity ?? "?"} -> ${voted} | L${f.line ?? "?"} ${cut(f.section)}`,
    `T: ${cut(f.title)}`,
    `FIX: ${flat(f.suggested_fix)}`,
    ...actLines(entry),
  ].join("\n");
}

// The digest of a whole result: the summary one key a line, then each acted-on entry's block, and
// any acted-on id the summary names that has no block. `missing` lists those ids.
export function digest(r) {
  const all = ledger(r);
  const acted = all.filter((e) => ACTED_ON.includes(e.entry.verdict?.status));
  const count = (s) => acted.filter((e) => e.entry.verdict.status === s).length;
  const lines = [`# ${r.summary.stage ?? "stage"} result, digested`, "", "## summary"];
  for (const [k, val] of Object.entries(r.summary)) {
    const one = JSON.stringify(val);
    lines.push(one !== undefined && one.length > ONE_LINE ? `${k}:\n${JSON.stringify(val, null, 1)}` : `${k}: ${one}`);
  }
  if (Array.isArray(r.gists)) {
    lines.push("", "## gists");
    for (const g of r.gists) lines.push(JSON.stringify(g, null, 1));
    return { text: `${lines.join("\n")}\n`, missing: [] };
  }
  const printed = new Set(acted.map((e) => e.id));
  const missing = summaryIds(r.summary).filter((id) => !printed.has(id));
  lines.push("", `## ${acted.length} of ${all.length} ledger entries: ${count("confirmed")} confirmed, ${count("hand-verify")} hand-verify (advisory and rejected ids are in the summary); the fold text prints whole, the rest cut to ${DIGEST_CUT} characters; a whole entry: node digest.mjs <file> <id>`);
  if (missing.length) lines.push(`## NOT IN THE LEDGER: the summary names ${missing.length} acted-on id(s) with no entry here: ${missing.join(", ")}`);
  for (const e of acted) lines.push("", block(e));
  return { text: `${lines.join("\n")}\n`, missing };
}

// The entries asked for, whole, up to DIGEST_PRINT_CAP characters in all: `printed` holds the text
// of those that fit, `over` the ids left out for the cap, `missing` the ids no ledger holds.
export function entries(r, ids) {
  const all = ledger(r);
  const printed = [];
  const over = [];
  const missing = [];
  let size = 0;
  for (const id of ids) {
    const e = all.find((x) => x.id === id);
    if (!e) {
      missing.push(id);
      continue;
    }
    const text = JSON.stringify(e.entry, null, 1);
    if (printed.length > 0 && size + text.length > DIGEST_PRINT_CAP) {
      over.push(id);
      continue;
    }
    printed.push(text);
    size += text.length;
  }
  return { printed, over, missing };
}

if (isMain(import.meta.url)) {
  const [file, ...ids] = process.argv.slice(2);
  if (!file) usage("node digest.mjs <the Workflow's output file> [<id> ...]");
  let r;
  try {
    r = resultOf(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`digest: ${e.message.replace(/^digest: /, "")}`);
    process.exit(2);
  }
  if (ids.length === 0) {
    const { text, missing } = digest(r);
    process.stdout.write(text);
    if (missing.length) console.error(`digest: the summary names ${missing.length} acted-on id(s) that no ledger entry holds: ${missing.join(", ")}`);
    process.exitCode = missing.length ? 1 : 0;
  } else {
    const { printed, over, missing } = entries(r, ids);
    for (const t of printed) console.log(t);
    if (over.length) console.error(`digest: ${over.length} of the ${ids.length} ids asked for were left out to keep this print under ${DIGEST_PRINT_CAP} characters: ${over.join(", ")} (ask for them in another call)`);
    if (missing.length) console.error(`digest: ${missing.length} of the ${ids.length} ids asked for are in no ledger of this result: ${missing.join(", ")}`);
    process.exitCode = over.length || missing.length ? 1 : 0;
  }
}

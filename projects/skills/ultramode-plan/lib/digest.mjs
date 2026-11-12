#!/usr/bin/env node
// A STAGE'S RESULT, DIGESTED (added after the first real run, 2026-11-11). A Workflow's output file
// holds the script's whole return. On the Back Nine's workbench plan, check round 1 returned 486 KB
// and the deepen's results ran to hundreds of KB, each too large for one Read, and paging them cost
// the main loop window it needed for the folds. This prints what the main loop acts on: the
// summary, one key a line, then one block per confirmed or hand-verify entry of the ledger (a check
// finding, a deepen amendment, a deepen premise finding), each field cut to 300 characters. Given
// ids, it prints those entries whole instead, votes and all, for a trace or a fold.
//
// Usage: node digest.mjs <the Workflow's output file> [<id> ...]
//   The file is the one the completion notice names (its `result` is the script's return) or the
//   return itself. A research result has no ledger: its summary and every gist print whole.
// Exit 0 when it printed what was asked; 1 when an id asked for is in no ledger (the ones found
// still print); 2 when the file cannot be read.

import { readFileSync } from "node:fs";
import { isMain, usage } from "./entry.mjs";

export const DIGEST_CUT = 300;
// The statuses the main loop acts on: a confirmed entry is folded, a hand-verify one traced first.
const ACTED_ON = ["confirmed", "hand-verify"];

const cut = (text) => {
  const one = String(text ?? "").replace(/\s+/g, " ").trim();
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

// What the real-voters say of the proposed fix: apply when every one calls it right, rework with
// their better fixes when any calls it wrong, trace when no voter held the entry real.
function action(votes) {
  const real = (Array.isArray(votes) ? votes : []).filter((v) => v && v.real === true);
  const better = real.map((v) => v.better_fix).filter((b) => typeof b === "string" && b.trim());
  if (real.length === 0) return { act: "trace: no voter held it real", better };
  const wrong = real.filter((v) => v.fix_is_correct !== true).length;
  return { act: wrong === 0 ? "apply" : `rework: ${wrong} of ${real.length} real voters call the fix wrong or short`, better };
}

// One entry's block.
export function block({ id, kind, entry }) {
  const v = entry.verdict ?? {};
  const voted = Array.isArray(v.votedSeverity) && v.votedSeverity.length ? v.votedSeverity.join("/") : "none";
  const { act, better } = action(entry.votes);
  if (kind === "amendment") {
    const a = entry.amendment ?? {};
    const where = entry.section ? `L${entry.section.line} ${cut(entry.section.heading)}` : cut(a.section);
    return [
      `## ${id} [${v.status}] ${a.severity ?? "?"} -> ${voted} | ${where} | ${entry.agent ?? "?"}`,
      `GAP: ${cut(a.gap)}`,
      `CHANGE: ${cut(a.change)}`,
      `OLD: ${Array.isArray(a.old_values) && a.old_values.length ? cut(a.old_values.join(" | ")) : "none"}`,
      `ACT: ${act}`,
      ...better.map((b) => `  B: ${cut(b)}`),
    ].join("\n");
  }
  const f = entry.finding ?? {};
  return [
    `## ${id} [${v.status}] ${f.severity ?? "?"} -> ${voted} | L${f.line ?? "?"} ${cut(f.section)}`,
    `T: ${cut(f.title)}`,
    `FIX: ${cut(f.suggested_fix)}`,
    `ACT: ${act}`,
    ...better.map((b) => `  B: ${cut(b)}`),
  ].join("\n");
}

// The digest of a whole result: the summary one key a line, then each acted-on entry's block.
export function digest(r) {
  const all = ledger(r);
  const acted = all.filter((e) => ACTED_ON.includes(e.entry.verdict?.status));
  const count = (s) => acted.filter((e) => e.entry.verdict.status === s).length;
  const lines = [`# ${r.summary.stage ?? "stage"} result, digested`, "", "## summary"];
  for (const [k, val] of Object.entries(r.summary)) lines.push(`${k}: ${JSON.stringify(val)}`);
  if (Array.isArray(r.gists)) {
    lines.push("", "## gists");
    for (const g of r.gists) lines.push(JSON.stringify(g));
    return `${lines.join("\n")}\n`;
  }
  lines.push("", `## ${acted.length} of ${all.length} ledger entries: ${count("confirmed")} confirmed, ${count("hand-verify")} hand-verify (advisory and rejected ids are in the summary); fields cut to ${DIGEST_CUT} characters, the whole entry by: node digest.mjs <file> <id>`);
  for (const e of acted) lines.push("", block(e));
  return `${lines.join("\n")}\n`;
}

// The entries asked for, whole, and the ids no ledger holds.
export function entries(r, ids) {
  const all = ledger(r);
  const found = [];
  const missing = [];
  for (const id of ids) {
    const e = all.find((x) => x.id === id);
    if (e) found.push(e.entry);
    else missing.push(id);
  }
  return { found, missing };
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
  if (ids.length === 0) process.stdout.write(digest(r));
  else {
    const { found, missing } = entries(r, ids);
    for (const e of found) console.log(JSON.stringify(e, null, 1));
    if (missing.length) console.error(`digest: ${missing.length} of the ${ids.length} ids asked for are in no ledger of this result: ${missing.join(", ")}`);
    process.exitCode = missing.length ? 1 : 0;
  }
}

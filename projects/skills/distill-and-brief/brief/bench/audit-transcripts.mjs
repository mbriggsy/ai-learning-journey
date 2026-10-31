#!/usr/bin/env node
// Audits a Workflow run's helper transcripts for blindness (R10 and KTD6 of
// docs/plans/brief-recall-fix-plan.md).
//
//   node audit-transcripts.mjs reads <transcript-dir> <allowed-dir>
//     Each helper used only the Read tool (plus StructuredOutput), and only on
//     files inside <allowed-dir>: the line and fill writers and the checkers.
//   node audit-transcripts.mjs runs <transcript-dir>
//     No helper invoked the Skill tool, and no tool input names a live
//     projects/*/docs/insights or playbook/docs/insights folder or the
//     benchmark's results folder: the brief runs and the judges.
//
// Exits 1, naming each breach, when any helper breaks its rule.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Every tool call in one helper transcript (a .jsonl), with the helper's label.
export function callsOf(dir, file) {
  const calls = [];
  for (const line of readFileSync(join(dir, file), "utf8").split("\n")) {
    if (!line) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const m = o.message;
    if (m?.role === "assistant" && Array.isArray(m.content)) {
      for (const c of m.content) if (c.type === "tool_use") calls.push({ name: c.name, input: c.input || {} });
    }
  }
  let label = file;
  try { label = JSON.parse(readFileSync(join(dir, file.replace(/\.jsonl$/, ".meta.json")), "utf8")).description || file; } catch {}
  return { label, calls };
}

// Any run of slashes or backslashes reads as one slash: JSON doubles a backslash.
const norm = (p) => String(p || "").replace(/[\\/]+/g, "/").toLowerCase();
const LIVE = /(?:^|[^a-z])(?:projects\/[^/\s"']+|playbook)\/docs\/insights(?:\/|\b)|brief\/results(?:\/|\b)/;

export function auditReads(dir, allowedDir) {
  const allow = norm(allowedDir).replace(/\/+$/, "") + "/";
  const breaches = [];
  const files = readdirSync(dir).filter((f) => /^agent-.*\.jsonl$/.test(f));
  for (const f of files) {
    const { label, calls } = callsOf(dir, f);
    for (const c of calls) {
      if (c.name === "StructuredOutput") continue;
      if (c.name !== "Read") breaches.push(`${label}: used ${c.name}`);
      else if (!norm(c.input.file_path).startsWith(allow)) breaches.push(`${label}: read ${c.input.file_path}`);
    }
  }
  return { helpers: files.length, breaches };
}

export function auditRuns(dir) {
  const breaches = [];
  const files = readdirSync(dir).filter((f) => /^agent-.*\.jsonl$/.test(f));
  for (const f of files) {
    const { label, calls } = callsOf(dir, f);
    for (const c of calls) {
      if (c.name === "StructuredOutput") continue; // the returned picks, not a read
      if (c.name === "Skill") breaches.push(`${label}: invoked the Skill tool`);
      const text = norm(JSON.stringify(c.input));
      // A path inside the run's scratch copies is fine; any live lesson folder or results path is not.
      const stripped = text.replace(/[^"\s]*\/jobs\/[^"\s]*/g, "");
      if (LIVE.test(stripped)) breaches.push(`${label}: ${c.name} touched ${JSON.stringify(c.input).slice(0, 160)}`);
    }
  }
  return { helpers: files.length, breaches };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [mode, dir, allowed] = process.argv.slice(2);
  const r = mode === "reads" ? auditReads(dir, allowed) : mode === "runs" ? auditRuns(dir) : null;
  if (!r) throw new Error("usage: audit-transcripts.mjs reads <dir> <allowed-dir> | runs <dir>");
  console.log(`${r.helpers} helpers, ${r.breaches.length} breaches`);
  for (const b of r.breaches) console.log(`  ${b}`);
  if (r.breaches.length) process.exitCode = 1;
}

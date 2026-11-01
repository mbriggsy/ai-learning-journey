#!/usr/bin/env node
// Audits a Workflow run's helper transcripts for blindness (R10 and KTD6 of
// docs/plans/brief-recall-fix-plan.md).
//
//   node audit-transcripts.mjs reads <transcript-dir> <allowed-dir>
//     Each helper used only the Read tool (plus StructuredOutput), and only on
//     files inside <allowed-dir>: the line and fill writers and the checkers.
//   node audit-transcripts.mjs runs <transcript-dir> <copies-dir>
//     The brief runs and the judges, by an allowlist: no helper invoked the
//     Skill tool; every Read, Grep and Glob names an absolute path inside the
//     helper's own copy (<copies-dir>/<brief>/<plain|lines|asof>/docs/insights),
//     a run's own arm (<copies-dir>/arms/<arm>), a saved tool result, or, for a
//     judge, a file of its own at the top of the scratch folder that holds
//     <copies-dir>; a Grep or Glob with no path or a relative one is a breach;
//     and no Bash command names docs/insights outside the helper's own copy,
//     anything else under <copies-dir>, a live lessons or results folder, or
//     corpus.mjs without the helper's own copy as its folder.
//
// Exits 1, naming each breach, when any helper breaks its rule.

import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";

// Every tool call in one helper transcript (a .jsonl), with the helper's label.
// A line that does not parse is counted, so a truncated record cannot hide a call.
export function callsOf(dir, file) {
  const calls = [];
  let unparsed = 0;
  for (const line of readFileSync(join(dir, file), "utf8").split("\n")) {
    if (!line) continue;
    let o;
    try { o = JSON.parse(line); } catch { unparsed++; continue; }
    const m = o.message;
    if (m?.role === "assistant" && Array.isArray(m.content)) {
      for (const c of m.content) if (c.type === "tool_use") calls.push({ name: c.name, input: c.input || {} });
    }
  }
  let label = file;
  try { label = JSON.parse(readFileSync(join(dir, file.replace(/\.jsonl$/, ".meta.json")), "utf8")).description || file; } catch {}
  return { label, calls, unparsed };
}

// Any run of slashes or backslashes reads as one slash (JSON doubles a
// backslash), case is folded, and a Git Bash /c/ drive reads as c:/.
const norm = (p) => String(p || "").replace(/[\\/]+/g, "/").toLowerCase().replace(/(^|[\s"'=(])\/([a-z])\//g, "$1$2:/");
// One path a tool was given, with any ".." folded away, so <own>/../x is judged as x.
const normPath = (p) => (p ? posix.normalize(norm(p)) : "");
const LIVE = /(?:^|[^a-z])(?:projects\/[^/\s"']+|playbook)\/docs\/insights(?:\/|\b)|brief\/results(?:\/|\b)/;
const isAbs = (p) => /^[a-z]:\//.test(p);
const under = (p, root) => p === root || p.startsWith(root + "/");

export function auditReads(dir, allowedDir) {
  const allow = norm(allowedDir).replace(/\/+$/, "") + "/";
  const breaches = [];
  const files = readdirSync(dir).filter((f) => /^agent-.*\.jsonl$/.test(f));
  for (const f of files) {
    const { label, calls, unparsed } = callsOf(dir, f);
    if (unparsed) breaches.push(`${label}: ${unparsed} transcript lines did not parse`);
    for (const c of calls) {
      if (c.name === "StructuredOutput") continue;
      if (c.name !== "Read") breaches.push(`${label}: used ${c.name}`);
      else if (!norm(c.input.file_path).startsWith(allow)) breaches.push(`${label}: read ${c.input.file_path}`);
    }
  }
  return { helpers: files.length, breaches };
}

// The folders one helper may touch, from its label ("A2:B05:r1", "judge:B05")
// and the copies folder, written each way it can appear (the path given, and
// its long form when the given one is an 8.3 short path).
export function scopeOf(label, copiesRoots) {
  const [head, brief] = label.split(":");
  const judge = head === "judge";
  const variant = judge ? "asof" : head === "A3" ? "lines" : "plain";
  const roots = [...new Set(copiesRoots.map((r) => norm(r).replace(/\/+$/, "")))];
  return {
    judge,
    roots,
    own: roots.map((r) => `${r}/${brief.toLowerCase()}/${variant}/docs/insights`),
    arm: judge ? [] : roots.map((r) => `${r}/arms/${head.toLowerCase()}`),
    // A judge may reread the lesson dumps it wrote at the top of the scratch folder.
    scratch: judge ? roots.map((r) => r.slice(0, r.lastIndexOf("/"))) : [],
  };
}

function allowedPath(p, s) {
  if (s.own.some((o) => under(p, o)) || s.arm.some((a) => under(p, a))) return true;
  if (/\/tool-results\//.test(p)) return true;
  return s.scratch.some((d) => p.startsWith(d + "/") && !p.slice(d.length + 1).includes("/"));
}

// Breaches in one Bash command, by the tokens that name a place.
function bashBreaches(cmd, s) {
  const t = norm(cmd);
  const out = [];
  // Every docs/insights must be the helper's own copy, spelled out in full.
  for (let i = t.indexOf("docs/insights"); i >= 0; i = t.indexOf("docs/insights", i + 1)) {
    const upto = t.slice(0, i + "docs/insights".length);
    if (!s.own.some((o) => upto.endsWith(o))) out.push(`docs/insights outside its own copy: ...${t.slice(Math.max(0, i - 60), i + 20)}`);
  }
  // Under the copies folder, only its own copy and its own arm.
  for (const r of s.roots) {
    for (let i = t.indexOf(r + "/"); i >= 0; i = t.indexOf(r + "/", i + 1)) {
      const rest = t.slice(i).split(/[\s"';|&)]/)[0];
      if (!s.own.some((o) => under(rest, o) || o.startsWith(rest)) && !s.arm.some((a) => under(rest, a))) out.push(`touched ${rest}`);
    }
  }
  if (LIVE.test(t)) out.push(`named a live lessons or results folder: ${t.match(LIVE)[0]}`);
  // A parent-folder step can leave the copy without naming anything above.
  if (/(^|[\s"'=/])\.\.(\/|[\s"']|$)/.test(t)) out.push(`used a .. path: ${t.slice(0, 120)}`);
  // corpus.mjs runs on the helper's own copy, named as its folder argument.
  for (const seg of t.split(/&&|\|\||[;|\n]/)) {
    if (seg.includes("corpus.mjs") && !s.own.some((o) => seg.includes(o))) out.push(`ran corpus.mjs without its own copy as the folder: ${seg.trim().slice(0, 120)}`);
  }
  return out;
}

export function auditRuns(dir, copiesDir) {
  if (!copiesDir) throw new Error("auditRuns needs the copies folder the helpers were given");
  const roots = [copiesDir];
  try { roots.push(realpathSync.native(copiesDir)); } catch {}
  const breaches = [];
  const files = readdirSync(dir).filter((f) => /^agent-.*\.jsonl$/.test(f));
  for (const f of files) {
    const { label, calls, unparsed } = callsOf(dir, f);
    if (unparsed) breaches.push(`${label}: ${unparsed} transcript lines did not parse`);
    if (!/^(A1|A2|A3|judge):B\d\d(:r\d)?$/.test(label)) {
      breaches.push(`${label}: not a run or judge label, so its own copy is unknown`);
      continue;
    }
    const s = scopeOf(label, roots);
    for (const c of calls) {
      const at = (why) => breaches.push(`${label}: ${c.name} ${why}`);
      if (c.name === "StructuredOutput") continue; // the returned picks, not a read
      if (c.name === "Skill") { at("invoked"); continue; }
      if (c.name === "Read") {
        const p = normPath(c.input.file_path);
        if (!isAbs(p) || !allowedPath(p, s)) at(`read ${c.input.file_path}`);
      } else if (c.name === "Grep" || c.name === "Glob") {
        const p = normPath(c.input.path);
        if (!c.input.path) at("had no path, so it searched the working folder");
        else if (!isAbs(p) || !allowedPath(p, s)) at(`searched ${c.input.path}`);
        // A folder inside the file pattern (Glob's pattern, Grep's glob) must stay in the copy too.
        const pattern = norm(c.name === "Glob" ? c.input.pattern : c.input.glob);
        if (pattern.includes("/") && !(isAbs(pattern) && allowedPath(normPath(pattern.slice(0, pattern.lastIndexOf("/"))), s))) at(`pattern ${pattern} names a folder outside its own copy`);
      } else if (c.name === "Bash") {
        for (const b of bashBreaches(c.input.command, s)) at(b);
      } else {
        at("is not a tool these helpers use");
      }
    }
  }
  return { helpers: files.length, breaches };
}

// True when this file is the script node was asked to run, by its real path, so
// a run through the ~/.claude/skills/brief junction is not a silent no-op.
const isMain = () => {
  try {
    return realpathSync(process.argv[1]).toLowerCase() === realpathSync(fileURLToPath(import.meta.url)).toLowerCase();
  } catch {
    return false;
  }
};

if (process.argv[1] && isMain()) {
  const [mode, dir, other] = process.argv.slice(2);
  const r = mode === "reads" ? auditReads(dir, other) : mode === "runs" ? auditRuns(dir, other) : null;
  if (!r) throw new Error("usage: audit-transcripts.mjs reads <dir> <allowed-dir> | runs <dir> <copies-dir>");
  console.log(`${r.helpers} helpers, ${r.breaches.length} breaches`);
  for (const b of r.breaches) console.log(`  ${b}`);
  if (r.breaches.length) process.exitCode = 1;
}

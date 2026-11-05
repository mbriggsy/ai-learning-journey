#!/usr/bin/env node
// Walks one session's whole transcript tree and reads its model turns and tool calls (U1 of
// docs/plans/hybrid-plan-step-plan.md; the measures in KTD20 and the audit in KTD21 read
// through it). On disk, measured on CLI 2.1.309 and 2.1.318:
//   <projects>/<slug>/<session-id>.jsonl                                  the main loop
//   <projects>/<slug>/<session-id>/subagents/agent-*.jsonl (+ .meta.json)  Agent-tool subagents
//   <projects>/<slug>/<session-id>/subagents/workflows/<run>/agent-*.jsonl Workflow helpers
//   <projects>/<slug>/<session-id>/workflows/<run>.json                    one record per Workflow run
// Claude Code writes one row per content block, so one model turn spans several rows that
// share a message.id and carry the same usage (measured over one session's tree: 748
// repeated ids, none with differing usage). turns() keeps each id once, across the tree.
//
// Usage: node transcripts.mjs <session-id> [<cwd>]   prints a summary of the tree.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { isMain, usage } from "../lib/entry.mjs";
import { defaultProjectsDir, slugOf } from "./freeze.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The main transcript of a session, by its id: the working folder's project folder first,
// then every other one (a cd moves the working folder, never the transcript).
export function findSession(sessionId, { projectsDir = defaultProjectsDir(), cwd } = {}) {
  if (!UUID.test(sessionId || "")) throw new Error(`not a session id: ${sessionId}`);
  const dirs = existsSync(projectsDir) ? readdirSync(projectsDir) : [];
  const first = cwd ? dirs.filter((d) => d.toLowerCase() === slugOf(cwd).toLowerCase()) : [];
  for (const d of [...first, ...dirs.filter((d) => !first.includes(d))]) {
    const p = join(projectsDir, d, `${sessionId}.jsonl`);
    if (existsSync(p)) return p;
  }
  throw new Error(`no transcript for session ${sessionId} under ${projectsDir}`);
}

function readMeta(jsonlPath) {
  try {
    return JSON.parse(readFileSync(jsonlPath.replace(/\.jsonl$/, ".meta.json"), "utf8"));
  } catch {
    return null;
  }
}

const agentFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => /^agent-.*\.jsonl$/.test(f)).sort() : []);

// Every transcript file of one session, and every Workflow run it recorded or has helpers for.
export function walk(mainFile) {
  if (!existsSync(mainFile)) throw new Error(`no transcript: ${mainFile}`);
  const dir = mainFile.replace(/\.jsonl$/, "");
  const files = [{ path: mainFile, kind: "main", run: null, meta: null }];
  const subagents = join(dir, "subagents");
  for (const f of agentFiles(subagents)) files.push({ path: join(subagents, f), kind: "agent", run: null, meta: readMeta(join(subagents, f)) });
  const helpers = {};
  const wfRoot = join(subagents, "workflows");
  if (existsSync(wfRoot)) {
    for (const run of readdirSync(wfRoot).sort()) {
      const runDir = join(wfRoot, run);
      if (!statSync(runDir).isDirectory()) continue;
      const fs = agentFiles(runDir);
      helpers[run] = fs.length;
      for (const f of fs) files.push({ path: join(runDir, f), kind: "workflow", run, meta: readMeta(join(runDir, f)) });
    }
  }
  const recordDir = join(dir, "workflows");
  const recorded = existsSync(recordDir) ? readdirSync(recordDir).filter((f) => /\.json$/.test(f)).map((f) => f.replace(/\.json$/, "")) : [];
  const runs = [...new Set([...recorded, ...Object.keys(helpers)])].sort();
  const workflows = runs.map((run) => ({ run, recorded: recorded.includes(run), helpers: helpers[run] || 0 }));
  return { sessionId: basename(dir), dir, files, workflows };
}

// The parsed rows of one file. A line that does not parse is counted, so a truncated
// record cannot hide a turn or a call.
export function readRows(path) {
  const rows = [];
  let unparsed = 0;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      unparsed++;
    }
  }
  return { rows, unparsed };
}

// Reads every file of a walked tree once: rows and unparsed counts land on each file entry.
export function load(tree) {
  for (const f of tree.files) {
    const { rows, unparsed } = readRows(f.path);
    f.rows = rows;
    f.unparsed = unparsed;
  }
  return tree;
}

// Every model turn in the tree, each message.id once. A turn with no id (none measured so
// far) is kept as its own turn, keyed by its row.
export function turns(tree) {
  const seen = new Set();
  const out = [];
  let repeats = 0;
  let noId = 0;
  for (const f of tree.files) {
    if (!f.rows) throw new Error("turns() needs a loaded tree: call load(walk(file)) first");
    f.rows.forEach((o, i) => {
      const m = o.message;
      if (o.type !== "assistant" || !m || !m.usage) return;
      let key = m.id;
      if (!key) {
        noId++;
        key = `${f.path}#${i}`;
      }
      if (seen.has(key)) {
        repeats++;
        return;
      }
      seen.add(key);
      out.push({
        file: f.path, kind: f.kind, run: f.run, label: f.meta?.description || null,
        id: m.id || null, model: m.model || null, synthetic: m.model === "<synthetic>",
        requestedModel: o.requestedModel || null, effort: o.effort || null, perTurnEffort: o.perTurnEffort || null,
        version: o.version || null, timestamp: o.timestamp || null, cwd: o.cwd || null, usage: m.usage,
      });
    });
  }
  return { turns: out, repeats, noId };
}

// Every tool call in the tree with its result's text, by tool_use id.
export function toolCalls(tree) {
  const results = new Map();
  for (const f of tree.files) {
    for (const o of f.rows || []) {
      const c = o.message?.content;
      if (o.type !== "user" || !Array.isArray(c)) continue;
      for (const b of c) {
        if (b?.type !== "tool_result") continue;
        const text = typeof b.content === "string" ? b.content : Array.isArray(b.content) ? b.content.map((x) => x?.text || "").join("\n") : "";
        // A Workflow result's row carries { runId, taskId, transcriptDir }, an Agent result's { agentId }.
        const r = o.toolUseResult && typeof o.toolUseResult === "object" ? o.toolUseResult : {};
        results.set(b.tool_use_id, { text, isError: !!b.is_error, runId: r.runId || null, agentId: r.agentId || null, status: r.status || null });
      }
    }
  }
  const calls = [];
  const seen = new Set();
  for (const f of tree.files) {
    for (const o of f.rows || []) {
      const c = o.message?.content;
      if (o.type !== "assistant" || !Array.isArray(c)) continue;
      for (const b of c) {
        if (b?.type !== "tool_use" || seen.has(b.id)) continue;
        seen.add(b.id);
        calls.push({ file: f.path, kind: f.kind, run: f.run, id: b.id, name: b.name, input: b.input || {}, cwd: o.cwd || null, timestamp: o.timestamp || null, result: results.get(b.id) || null });
      }
    }
  }
  return calls;
}

// The MCP servers whose tools the tree's sessions were offered, main loop and helpers, read from
// the tool lists the harness writes into each transcript ("deferred_tools_delta" attachments,
// whose addedNames hold mcp__<server>__<tool>; measured on CLI 2.1.318). A server offered once
// counts, even if a later list drops it.
export function mcpServersOffered(tree) {
  const seen = new Set();
  for (const f of tree.files) {
    for (const o of f.rows || []) {
      if (o.type !== "attachment" || o.attachment?.type !== "deferred_tools_delta") continue;
      for (const n of o.attachment.addedNames || []) if (typeof n === "string" && n.startsWith("mcp__")) seen.add(n.split("__")[1]);
    }
  }
  return [...seen].sort();
}

export function readTree(mainFile) {
  const tree = load(walk(mainFile));
  return { ...tree, ...turns(tree) };
}

if (isMain(import.meta.url)) {
  const [sessionId, cwd] = process.argv.slice(2);
  if (!sessionId) usage("node transcripts.mjs <session-id> [<cwd>]");
  const t = readTree(findSession(sessionId, { cwd }));
  const count = (xs) => Object.entries(xs.reduce((a, x) => ((a[x] = (a[x] || 0) + 1), a), {})).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(`${t.files.length} transcripts (${count(t.files.map((f) => f.kind))}); ${t.turns.length} turns, ${t.repeats} repeated rows folded, ${t.noId} without an id`);
  console.log(`models: ${count(t.turns.map((x) => x.model))}; effort: ${count(t.turns.map((x) => `${x.effort}/${x.perTurnEffort}`))}`);
  for (const w of t.workflows) console.log(`workflow ${w.run}: ${w.recorded ? "recorded" : "NOT recorded"}, ${w.helpers} helper transcripts`);
  const unparsed = t.files.reduce((a, f) => a + f.unparsed, 0);
  if (unparsed) console.log(`${unparsed} lines did not parse`);
}

#!/usr/bin/env node
// KTD20's two cost measures, read the same way for every arm (U1 of
// docs/plans/hybrid-plan-step-plan.md), from every transcript of a run: the main loop, every
// Workflow helper and every Agent-tool subagent, across every segment, each model turn once.
//
//   Rise (gated): each segment's main-loop peak of input + cache creation + cache read (the
//     /window formula), minus the first-turn context of one null launch, summed over segments.
//   Spend (gated on a match): every turn of every transcript, each token kind weighted by its
//     published price ratio, 5-minute and 1-hour cache writes apart. The ratios live in
//     bench/bar.md (U8) and arrive here as integer weights, so every sum and every comparison
//     stays in integers (playbook insight 013).
//   Reported, never gated: the absolute peak, the sum of helper peaks, output tokens, the
//     cumulative and cache-read totals.
//
// A run with no transcript, a segment with no main-loop turn, a Workflow with no helper files,
// or a Workflow or Agent call whose transcripts are not where the walk looks (a CLI update can
// move them) fails rather than measuring as zero.
//
// Usage: node window.mjs '<weights json>' <null-launch main.jsonl> <segment main.jsonl>...

import { basename } from "node:path";
import { isMain, usage } from "../lib/entry.mjs";
import { readTree, toolCalls } from "./transcripts.mjs";

export const WEIGHT_KEYS = ["input", "cacheWrite5m", "cacheWrite1h", "cacheRead", "output"];

export const contextOf = (u) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);

// A turn's cache writes, split by lifetime. A write with no split cannot be priced, so it fails.
export function cacheWrites(u) {
  const total = u.cache_creation_input_tokens || 0;
  if (!total) return { w5m: 0, w1h: 0 };
  const c = u.cache_creation;
  if (!c || !Number.isInteger(c.ephemeral_5m_input_tokens) || !Number.isInteger(c.ephemeral_1h_input_tokens)) {
    throw new Error("a turn wrote cache with no 5-minute and 1-hour split, so Spend cannot price it");
  }
  if (c.ephemeral_5m_input_tokens + c.ephemeral_1h_input_tokens !== total) throw new Error(`a turn's cache-write split (${c.ephemeral_5m_input_tokens} + ${c.ephemeral_1h_input_tokens}) does not add up to ${total}`);
  return { w5m: c.ephemeral_5m_input_tokens, w1h: c.ephemeral_1h_input_tokens };
}

export function checkWeights(w) {
  for (const k of WEIGHT_KEYS) if (!Number.isInteger(w?.[k]) || w[k] < 0) throw new Error(`weight "${k}" must be a non-negative integer, got ${w?.[k]}`);
  const extra = Object.keys(w).filter((k) => !WEIGHT_KEYS.includes(k));
  if (extra.length) throw new Error(`unknown weights: ${extra.join(", ")}`);
  return w;
}

export function spendOf(turns, weights) {
  checkWeights(weights);
  let s = 0;
  for (const t of turns) {
    const u = t.usage;
    const { w5m, w1h } = cacheWrites(u);
    s += (u.input_tokens || 0) * weights.input + w5m * weights.cacheWrite5m + w1h * weights.cacheWrite1h + (u.cache_read_input_tokens || 0) * weights.cacheRead + (u.output_tokens || 0) * weights.output;
  }
  return s;
}

export function peakOf(turns) {
  let peak = -1;
  let id = null;
  for (const t of turns) {
    const c = contextOf(t.usage);
    if (c > peak) {
      peak = c;
      id = t.id;
    }
  }
  return { peak: Math.max(peak, 0), id };
}

// The null launch's first-turn context: the baseline every segment's Rise subtracts.
export function nullBaseline(nullMainFile) {
  const main = readTree(nullMainFile).turns.filter((t) => t.kind === "main" && !t.synthetic);
  if (!main.length) throw new Error(`${nullMainFile}: the null launch has no main-loop turn`);
  return contextOf(main[0].usage);
}

// Every Workflow or Agent call that launched (a result that is not an error) must have its
// transcripts in the walked trees: a Workflow's run id with at least one helper file, an
// Agent's agent-<id>.jsonl. Its ids come from the result row's record, else from its text.
export function checkLaunches(trees) {
  const runs = new Map();
  const files = new Set();
  for (const t of trees) {
    for (const w of t.workflows) runs.set(w.run, Math.max(runs.get(w.run) || 0, w.helpers));
    for (const f of t.files) files.add(basename(f.path));
  }
  const seen = new Set();
  for (const t of trees) {
    for (const c of toolCalls(t)) {
      if (seen.has(c.id) || !c.result || c.result.isError) continue;
      seen.add(c.id);
      if (c.name === "Workflow") {
        const run = c.result.runId || c.result.text.match(/Run ID: (wf_[A-Za-z0-9-]+)/)?.[1];
        if (!run) throw new Error(`Workflow call ${c.id} launched but names no run id; its helpers cannot be found`);
        if (!runs.get(run)) throw new Error(`Workflow ${run} (call ${c.id}) has no helper transcripts where the walk looks; a run is never measured as zero`);
      } else if (c.name === "Agent") {
        const id = c.result.agentId || c.result.text.match(/agentId: ([A-Za-z0-9]+)/)?.[1];
        if (!id) throw new Error(`Agent call ${c.id} names no agent id; its transcript cannot be found`);
        if (!files.has(`agent-${id}.jsonl`)) throw new Error(`Agent ${id} (call ${c.id}) has no transcript where the walk looks; it is never measured as zero`);
      }
    }
  }
}

export function measure(segmentMainFiles, { baseline, weights }) {
  if (!Array.isArray(segmentMainFiles) || !segmentMainFiles.length) throw new Error("measure needs at least one segment");
  if (!Number.isInteger(baseline) || baseline < 0) throw new Error(`baseline must be a non-negative integer, got ${baseline}`);
  checkWeights(weights);
  const seen = new Set();
  const segments = [];
  const all = [];
  const transcripts = [];
  const trees = [];
  for (const f of segmentMainFiles) {
    const tree = readTree(f);
    trees.push(tree);
    const empty = tree.workflows.filter((w) => w.helpers === 0);
    if (empty.length) throw new Error(`${f}: Workflow ${empty.map((w) => w.run).join(", ")} has no helper files; a run is never measured as zero`);
    const unparsed = tree.files.filter((x) => x.unparsed);
    if (unparsed.length) throw new Error(`${f}: ${unparsed.map((x) => `${x.path} (${x.unparsed} lines)`).join(", ")} did not parse`);
    const fresh = tree.turns.filter((t) => !t.id || !seen.has(t.id));
    for (const t of fresh) if (t.id) seen.add(t.id);
    const main = fresh.filter((t) => t.kind === "main");
    if (!main.length) throw new Error(`${f}: no main-loop turn`);
    const p = peakOf(main);
    segments.push({ session: tree.sessionId, peak: p.peak, peakId: p.id, rise: p.peak - baseline, turns: fresh.length, transcripts: tree.files.length });
    for (const x of tree.files) {
      const own = fresh.filter((t) => t.file === x.path);
      const xp = peakOf(own);
      transcripts.push({ path: x.path, kind: x.kind, rows: x.rows.length, turns: own.length, peak: xp.peak, peakId: xp.id, spend: spendOf(own, weights) });
    }
    all.push(...fresh);
  }
  checkLaunches(trees);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  return {
    rise: sum(segments.map((s) => s.rise)),
    spend: spendOf(all, weights),
    baseline,
    segments,
    transcripts,
    reported: {
      absolutePeak: Math.max(...segments.map((s) => s.peak)),
      helperPeakSum: sum(transcripts.filter((x) => x.kind !== "main").map((x) => x.peak)),
      output: sum(all.map((t) => t.usage.output_tokens || 0)),
      cumulative: sum(all.map((t) => contextOf(t.usage))),
      cacheRead: sum(all.map((t) => t.usage.cache_read_input_tokens || 0)),
    },
  };
}

if (isMain(import.meta.url)) {
  const [weightsJson, nullFile, ...segs] = process.argv.slice(2);
  if (!segs.length) usage("node window.mjs '<weights json>' <null-launch main.jsonl> <segment main.jsonl>...");
  const r = measure(segs, { baseline: nullBaseline(nullFile), weights: JSON.parse(weightsJson) });
  console.log(JSON.stringify({ rise: r.rise, spend: r.spend, baseline: r.baseline, segments: r.segments, reported: r.reported }, null, 1));
}

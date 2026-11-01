#!/usr/bin/env node
// Scores the re-score's brief runs against the benchmark's judged lessons and
// KTD9's blind judges, and applies the plan's Success Criteria
// (docs/plans/brief-recall-fix-plan.md). Pure: the same inputs give the same
// numbers, and any missing, null or doubled run or judge makes it refuse to score.
//
// Usage: node score.mjs <rescore-output.json> <out-results.json>

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BACK_NINE, folderOf } from "./build-copies.mjs";
import { ALL, missingOf } from "./make-rescore.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(here, "..", "results");

export { BACK_NINE };
export const SMALL = ALL.filter((id) => !BACK_NINE.includes(id));
// The prefix the benchmark names a brief's lessons by; an unknown brief throws.
export const prefixOf = (brief) => folderOf(brief).prefix;

// Each arm's output limits (KTD6): what it may read in full, and the next ones it may name.
export function limitsOf(arm, bigJob) {
  if (arm === "A1") return { read: 5, next: 5 };
  if (bigJob !== "big" && bigJob !== "small") throw new Error(`${arm}: a run must report big or small, got ${bigJob}`);
  return { read: bigJob === "big" ? 10 : 5, next: 10 };
}

// A lesson number as the picks give it ("027", "27"): a bare number, nothing else.
const norm = (prefix, n) => {
  const m = String(n).trim().match(/^(\d{1,3})$/);
  if (!m) throw new Error(`not a lesson number: ${n}`);
  return `${prefix}-${m[1].padStart(3, "0")}`;
};

// A run's names in its ranking order, landmines then also-relevant lines,
// each list counted only up to the arm's own limits, duplicates dropped.
export function namesOf(run) {
  const r = run.result;
  const lim = limitsOf(run.arm, r.bigJob);
  const p = prefixOf(run.brief);
  const out = [];
  for (const n of [...r.read.slice(0, lim.read), ...r.next.slice(0, lim.next)]) {
    const id = norm(p, n);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

// Display only: a share as a percent to one decimal. Every bar is tested on the
// exact shares (`atLeast` below), never on these rounded figures.
const pct = (a, b) => (b === 0 ? null : Math.round((1000 * a) / b) / 10);
// A share as [numerator, denominator]; recall is hits of the judged-relevant, precision hits of the named.
const share = (t, m) => (m === "recall" ? [t.hits, t.rel] : [t.hits, t.named]);
// Is a minus b at least `pts` percentage points? Exact, in integers: 100(ha/da - hb/db) >= pts.
const atLeast = ([ha, da], [hb, db], pts) => 100 * (ha * db - hb * da) >= pts * da * db;
// The exact gap in points, rounded to one decimal for the record (null when a share has no denominator).
const gap = ([ha, da], [hb, db]) => (da === 0 || db === 0 ? null : Math.round(1000 * (ha / da - hb / db)) / 10);
const lower = (x, y) => (x[0] * y[1] <= y[0] * x[1] ? x : y);
const higher = (x, y) => (x[0] * y[1] >= y[0] * x[1] ? x : y);

export function score({ runs, judges, missing: absent = [] }, bench) {
  const missing = [...new Set([...absent, ...missingOf(runs, judges)])];
  if (missing.length) throw new Error(`refusing to score: missing ${missing.join(", ")}`);

  const judgedOf = new Map(bench.briefs.map((b) => [b.id, b.judged.filter((j) => j.lesson.startsWith(`${prefixOf(b.id)}-`))]));
  // KTD9: a name outside a brief's judged set counts as relevant, for every
  // arm, when that brief's blind judge listed it; it then joins the judged set.
  const extra = new Map();
  for (const id of ALL) {
    const judgedIds = new Set(judgedOf.get(id).map((j) => j.lesson));
    const outside = new Set(runs.filter((r) => r.brief === id).flatMap(namesOf).filter((n) => !judgedIds.has(n)));
    const judge = judges.find((j) => j.brief === id);
    const held = new Map(judge.result.lessons.map((l) => [norm(prefixOf(id), l.lesson), l.strength]));
    extra.set(id, [...outside].filter((n) => held.has(n)).map((n) => ({ lesson: n, strength: held.get(n), verdict: "KTD9" })));
  }
  const relevantOf = (id) => [...judgedOf.get(id).filter((j) => j.verdict !== "NOT_RELEVANT"), ...extra.get(id)];

  const arms = [...new Set(runs.map((r) => r.arm))].sort();
  const perRun = {};
  for (const arm of arms) {
    for (const k of [...new Set(runs.filter((r) => r.arm === arm).map((r) => r.run))].sort()) {
      const mine = runs.filter((r) => r.arm === arm && r.run === k);
      const t = { hits: 0, rel: 0, named: 0, hitsBudget10: 0, strongHits: 0, strongRel: 0, trapHits: 0, trapRel: 0, savedToFile: 0, big: 0, small: 0, briefs: {} };
      for (const id of BACK_NINE) {
        const run = mine.find((r) => r.brief === id);
        const names = namesOf(run);
        const rel = relevantOf(id);
        const relIds = new Set(rel.map((j) => j.lesson));
        const hit = names.filter((n) => relIds.has(n));
        t.hits += hit.length;
        t.rel += rel.length;
        t.named += names.length;
        t.hitsBudget10 += names.slice(0, 10).filter((n) => relIds.has(n)).length;
        const strong = rel.filter((j) => j.strength === "strong");
        t.strongRel += strong.length;
        t.strongHits += strong.filter((j) => names.includes(j.lesson)).length;
        const trap = rel.filter((j) => j.hit === "HIT");
        t.trapRel += trap.length;
        t.trapHits += trap.filter((j) => names.includes(j.lesson)).length;
        t.savedToFile += (run.result.savedToFile || []).length;
        if (run.result.bigJob === "big") t.big += 1;
        if (run.result.bigJob === "small") t.small += 1;
        t.briefs[id] = { names, hits: hit, relevant: rel.length, bigJob: run.result.bigJob ?? null };
      }
      if (t.rel === 0) throw new Error(`${arm}#${k}: no judged-relevant lesson, so recall has no denominator`);
      t.recall = pct(t.hits, t.rel);
      t.precision = pct(t.hits, t.named);
      t.recallBudget10 = pct(t.hitsBudget10, t.rel);
      t.strongRecall = pct(t.strongHits, t.strongRel);
      t.trapRecall = pct(t.trapHits, t.trapRel);
      // Small-corpus runs: names per brief, for the guard (A3 runs none: it runs
      // only the Back Nine briefs, and missingOf has checked every planned run is here).
      t.small_briefs = {};
      for (const id of SMALL) {
        const run = mine.find((r) => r.brief === id);
        if (run) t.small_briefs[id] = namesOf(run);
      }
      perRun[`${arm}#${k}`] = t;
    }
  }

  // Every comparison sets the candidate's worse run against the other arm's better run.
  const runsOf = (arm) => Object.entries(perRun).filter(([k]) => k.startsWith(`${arm}#`)).map(([, v]) => v);
  const worse = (arm, m) => runsOf(arm).map((r) => share(r, m)).reduce(lower);
  const better = (arm, m) => runsOf(arm).map((r) => share(r, m)).reduce(higher);
  // The precision condition: no more than 10 points below the old arm's. A run
  // that named nothing has no precision to compare, so it cannot meet it.
  const precisionOk = (arm) =>
    [...runsOf(arm), ...runsOf("A1")].every((r) => r.named > 0) && atLeast(worse(arm, "precision"), better("A1", "precision"), -10);

  // The small-corpus guard: no judged lesson (KTD9's included) both old runs
  // named is missed by both titles-only runs.
  const guard = { holds: true, losses: [] };
  for (const id of SMALL) {
    const judged = new Set(relevantOf(id).map((j) => j.lesson));
    const a1 = runsOf("A1").map((r) => new Set(r.small_briefs[id]));
    const a2 = runsOf("A2").map((r) => new Set(r.small_briefs[id]));
    for (const l of judged) {
      if (a1.every((s) => s.has(l)) && a2.every((s) => !s.has(l))) {
        guard.holds = false;
        guard.losses.push(`${id}:${l}`);
      }
    }
  }

  const c = {
    A3_vs_A2: gap(worse("A3", "recall"), better("A2", "recall")),
    A3_vs_A1: gap(worse("A3", "recall"), better("A1", "recall")),
    A3_precision_vs_A1: gap(worse("A3", "precision"), better("A1", "precision")),
    A3_precisionOk: precisionOk("A3"),
    A2_vs_A1: gap(worse("A2", "recall"), better("A1", "recall")),
    A2_precision_vs_A1: gap(worse("A2", "precision"), better("A1", "precision")),
    A2_precisionOk: precisionOk("A2"),
    guard: guard.holds,
  };

  let verdict = "LAND NOTHING";
  const linesPass = atLeast(worse("A3", "recall"), better("A2", "recall"), 5) && atLeast(worse("A3", "recall"), better("A1", "recall"), 10);
  const recipePass = atLeast(worse("A2", "recall"), better("A1", "recall"), 10);
  if (linesPass && c.A3_precisionOk && c.A2_precisionOk && c.guard) {
    verdict = "LAND THE RECIPE, THE FILLS AND THE LINES";
  } else if (recipePass && c.A2_precisionOk && c.guard) {
    verdict = "LAND THE RECIPE AND THE FILLS, WITHOUT THE LINES";
  }
  const extraCount = Object.fromEntries([...extra].map(([k, v]) => [k, v.length]));
  return { verdict, comparisons: c, guard, perRun, ktd9Extra: extraCount };
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
  const [input, out] = process.argv.slice(2);
  if (!input || !out) throw new Error("usage: node score.mjs <rescore-output.json> <out-results.json>");
  const raw = JSON.parse(readFileSync(input, "utf8"));
  const data = raw.result ?? raw; // a Workflow task output file wraps the script's return value
  const bench = JSON.parse(readFileSync(join(RESULTS, "recall-benchmark-2026-10-31.json"), "utf8"));
  const s = score(data, bench);
  const doc = { measured: data.measured ?? null, arms: data.arms ?? null, ...s, runs: data.runs, judges: data.judges };
  writeFileSync(out, JSON.stringify(doc, null, 1) + "\n");
  console.log(s.verdict);
  console.log(JSON.stringify(s.comparisons));
  for (const [k, v] of Object.entries(s.perRun)) console.log(`${k}: recall ${v.recall} precision ${v.precision} (hits ${v.hits}/${v.rel}, named ${v.named}) budget10 ${v.recallBudget10} strong ${v.strongRecall} trap ${v.trapRecall} saved ${v.savedToFile} big/small ${v.big}/${v.small}`);
}

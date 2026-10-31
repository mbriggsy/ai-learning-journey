#!/usr/bin/env node
// Scores the re-score's brief runs against the benchmark's judged lessons and
// KTD9's blind judges, and applies the plan's Success Criteria
// (docs/plans/brief-recall-fix-plan.md). Pure: the same inputs give the same
// numbers, and any missing run or judge makes it refuse to score.
//
// Usage: node score.mjs <rescore-output.json> <out-results.json>

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(here, "..", "results");

export const BACK_NINE = ["B01", "B02", "B04", "B05", "B06", "B07", "B13", "B14", "B15", "B17", "B18"];
export const SMALL = ["B08", "B09", "B10", "B11", "B12", "B16"];
const PREFIX = { B08: "hooks", B09: "hooks", B10: "ff", B16: "ff", B11: "playbook", B12: "playbook" };
export const prefixOf = (brief) => PREFIX[brief] || "b9";

// Each arm's output limits (KTD6): what it may read in full, and the next ones it may name.
export function limitsOf(arm, bigJob) {
  if (arm === "A1") return { read: 5, next: 5 };
  if (bigJob !== "big" && bigJob !== "small") throw new Error(`${arm}: a run must report big or small, got ${bigJob}`);
  return { read: bigJob === "big" ? 10 : 5, next: 10 };
}

const norm = (prefix, n) => {
  const m = String(n).match(/(\d+)/);
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

const pct = (a, b) => (b === 0 ? null : Math.round((1000 * a) / b) / 10);

export function score({ runs, judges, missing: absent = [] }, bench) {
  const missing = [
    ...absent,
    ...runs.filter((r) => !r.result).map((r) => `run ${r.arm}/${r.brief}/${r.run}`),
    ...judges.filter((j) => !j.result).map((j) => `judge ${j.brief}`),
  ];
  if (missing.length) throw new Error(`refusing to score: missing ${missing.join(", ")}`);

  const judgedOf = new Map(bench.briefs.map((b) => [b.id, b.judged.filter((j) => j.lesson.startsWith(`${prefixOf(b.id)}-`))]));
  // KTD9: a name outside a brief's judged set counts as relevant, for every
  // arm, when that brief's blind judge listed it.
  const extra = new Map();
  for (const id of [...BACK_NINE, ...SMALL]) {
    const judgedIds = new Set(judgedOf.get(id).map((j) => j.lesson));
    const outside = new Set(runs.filter((r) => r.brief === id).flatMap(namesOf).filter((n) => !judgedIds.has(n)));
    const judge = judges.find((j) => j.brief === id);
    const held = new Map((judge?.result.lessons || []).map((l) => [norm(prefixOf(id), l.lesson), l.strength]));
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
        if (!run) continue;
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
      t.recall = pct(t.hits, t.rel);
      t.precision = pct(t.hits, t.named);
      t.recallBudget10 = pct(t.hitsBudget10, t.rel);
      t.strongRecall = pct(t.strongHits, t.strongRel);
      t.trapRecall = pct(t.trapHits, t.trapRel);
      // Small-corpus runs: names per brief, for the guard.
      t.small_briefs = {};
      for (const id of SMALL) {
        const run = mine.find((r) => r.brief === id);
        if (run) t.small_briefs[id] = namesOf(run);
      }
      perRun[`${arm}#${k}`] = t;
    }
  }

  const runsOf = (arm) => Object.entries(perRun).filter(([k]) => k.startsWith(`${arm}#`)).map(([, v]) => v);
  const worse = (arm, m) => Math.min(...runsOf(arm).map((r) => r[m]));
  const better = (arm, m) => Math.max(...runsOf(arm).map((r) => r[m]));
  const precisionOk = (arm) => worse(arm, "precision") >= better("A1", "precision") - 10;

  // The small-corpus guard: no judged lesson both old runs named is missed by both titles-only runs.
  const guard = { holds: true, losses: [] };
  for (const id of SMALL) {
    const judged = new Set(relevantOf(id).filter((j) => j.verdict !== "KTD9").map((j) => j.lesson));
    const a1 = runsOf("A1").map((r) => new Set(r.small_briefs[id] || []));
    const a2 = runsOf("A2").map((r) => new Set(r.small_briefs[id] || []));
    for (const l of judged) {
      if (a1.length && a1.every((s) => s.has(l)) && a2.every((s) => !s.has(l))) {
        guard.holds = false;
        guard.losses.push(`${id}:${l}`);
      }
    }
  }

  const has = (arm) => runsOf(arm).length > 0;
  const c = {};
  if (has("A3")) {
    c.A3_vs_A2 = Math.round(10 * (worse("A3", "recall") - better("A2", "recall"))) / 10;
    c.A3_vs_A1 = Math.round(10 * (worse("A3", "recall") - better("A1", "recall"))) / 10;
    c.A3_precisionOk = precisionOk("A3");
  }
  c.A2_vs_A1 = Math.round(10 * (worse("A2", "recall") - better("A1", "recall"))) / 10;
  c.A2_precisionOk = precisionOk("A2");
  c.guard = guard.holds;

  let verdict = "LAND NOTHING";
  if (has("A3") && c.A3_vs_A2 >= 5 && c.A3_vs_A1 >= 10 && c.A3_precisionOk && c.A2_precisionOk && c.guard) {
    verdict = "LAND THE RECIPE, THE FILLS AND THE LINES";
  } else if (c.A2_vs_A1 >= 10 && c.A2_precisionOk && c.guard) {
    verdict = "LAND THE RECIPE AND THE FILLS, WITHOUT THE LINES";
  }
  const extraCount = Object.fromEntries([...extra].map(([k, v]) => [k, v.length]));
  return { verdict, comparisons: c, guard, perRun, ktd9Extra: extraCount };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
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

#!/usr/bin/env node
// Prepares and merges the re-score (U6 of docs/plans/brief-recall-fix-plan.md).
//
//   node make-rescore.mjs arms <copies-dir> <old-commit> <new-commit>
//     Freezes each arm's recipe and script into <copies-dir>/arms/<arm>/ from
//     git (A1: brief/SKILL.md and corpus.mjs at <old-commit>; A2 and A3:
//     brief/SKILL.next.md and corpus.next.mjs at <new-commit>) and writes
//     <copies-dir>/arms/arms.json with each arm's hash: sha256 of the recipe's
//     bytes followed by the script's.
//   node make-rescore.mjs gen <copies-dir> <part> <out-script> [<arm> <brief>]
//     Writes a Workflow script for one part (A1, A2, A3, judges, or dry with an
//     arm and a brief) from rescore.workflow.js, its CONFIG filled from the
//     results files and arms.json, so no topic or path is typed by hand.
//   node make-rescore.mjs merge <copies-dir> <out.json> <task-output.json>...
//     Joins the parts' Workflow outputs into one scorer input, and refuses when
//     any expected run or judge is absent or doubled, a part is not one of
//     A1, A2, A3 and judges, or a part ran on recipe bytes other than arms.json's.
//
// Keep each part's task output outside <copies-dir>: the judges run while the
// earlier parts' outputs exist, and only their own as-of folder is theirs to read.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BACK_NINE } from "./build-copies.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..", "..", "..");
const RESULTS = join(here, "..", "results");
const SKILL_DIR = "projects/skills/distill-and-brief/brief";
export const ALL = ["B01", "B02", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11", "B12", "B13", "B14", "B15", "B16", "B17", "B18"];
export const ARM_BRIEFS = { A1: ALL, A2: ALL, A3: BACK_NINE };
export const RUNS = [1, 2];
const PARTS = ["A1", "A2", "A3", "judges"];
const fwd = (p) => p.replace(/\\/g, "/");
const show = (commit, path) => execFileSync("git", ["-C", REPO, "show", `${commit}:${path}`], { maxBuffer: 1 << 26 });

// Every run and judge the plan expects, each exactly once with a result
// (insight 019: an absent or null one is missing, never scored as empty).
export function missingOf(runs, judges) {
  const out = [];
  const key = (r) => `${r.arm}/${r.brief}/${r.run}`;
  const expected = new Set();
  for (const [arm, ids] of Object.entries(ARM_BRIEFS)) for (const run of RUNS) for (const id of ids) expected.add(`${arm}/${id}/${run}`);
  for (const k of expected) {
    const found = runs.filter((r) => key(r) === k);
    if (!found.length || !found[0].result) out.push(`run ${k}`);
    if (found.length > 1) out.push(`run ${k} appears ${found.length} times`);
  }
  for (const r of runs) if (!expected.has(key(r))) out.push(`run ${key(r)} is not one the plan runs`);
  for (const id of ALL) {
    const found = judges.filter((j) => j.brief === id);
    if (!found.length || !Array.isArray(found[0].result?.lessons)) out.push(`judge ${id}`);
    if (found.length > 1) out.push(`judge ${id} appears ${found.length} times`);
  }
  for (const j of judges) if (!ALL.includes(j.brief)) out.push(`judge ${j.brief} is not one the plan runs`);
  return out;
}

function arms(copies, oldCommit, newCommit) {
  const spec = {
    A1: { commit: oldCommit, recipe: "SKILL.md", corpus: "corpus.mjs" },
    A2: { commit: newCommit, recipe: "SKILL.next.md", corpus: "corpus.next.mjs" },
    A3: { commit: newCommit, recipe: "SKILL.next.md", corpus: "corpus.next.mjs" },
  };
  const manifest = join(copies, "arms", "arms.json");
  const prior = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : null;
  const out = {};
  const bytes = {};
  for (const [arm, s] of Object.entries(spec)) {
    const dir = join(copies, "arms", arm);
    const recipe = show(s.commit, `${SKILL_DIR}/${s.recipe}`);
    const corpus = show(s.commit, `${SKILL_DIR}/${s.corpus}`);
    const hash = createHash("sha256").update(recipe).update(corpus).digest("hex");
    // A second freeze into the same folder may restate the same bytes (a new
    // path to them), never swap them: parts already run would no longer match.
    if (prior?.[arm] && prior[arm].hash !== hash) throw new Error(`${arm}: ${manifest} already froze ${prior[arm].hash.slice(0, 8)}, this freeze is ${hash.slice(0, 8)}; freeze into a fresh copies folder`);
    bytes[arm] = { dir, recipe, corpus };
    out[arm] = { commit: s.commit, from: [`${SKILL_DIR}/${s.recipe}`, `${SKILL_DIR}/${s.corpus}`], recipe: fwd(join(dir, "SKILL.md")), corpus: fwd(join(dir, "corpus.mjs")), hash, briefs: ARM_BRIEFS[arm] };
  }
  for (const { dir, recipe, corpus } of Object.values(bytes)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), recipe);
    writeFileSync(join(dir, "corpus.mjs"), corpus);
  }
  writeFileSync(manifest, JSON.stringify(out, null, 1) + "\n");
  return out;
}

function gen(copies, part, outScript, dryArm, dryBrief) {
  const armsInfo = JSON.parse(readFileSync(join(copies, "arms", "arms.json"), "utf8"));
  const inputs = JSON.parse(readFileSync(join(RESULTS, "judge-inputs-2026-10-31.json"), "utf8"));
  if (!["A1", "A2", "A3", "judges", "dry"].includes(part)) throw new Error(`unknown part ${part}`);
  const config = {
    copies: fwd(copies),
    part,
    runs: RUNS,
    arms: armsInfo,
    briefs: inputs.briefs.map((b) => ({ id: b.id, ts: b.ts, topic: b.topic, commitsAfter: b.commitsAfter })),
    judgeRules: inputs.judgeRules,
    ...(part === "dry" ? { dry: { arm: dryArm, brief: dryBrief } } : {}),
  };
  const template = readFileSync(join(here, "rescore.workflow.js"), "utf8");
  if (!template.includes("const CONFIG = __CONFIG__")) throw new Error("template has no CONFIG slot");
  writeFileSync(outScript, template.replace("const CONFIG = __CONFIG__", () => `const CONFIG = ${JSON.stringify(config)}`));
}

export function merge(parts, armsInfo) {
  const runs = [];
  const judges = [];
  const problems = [];
  for (const p of parts) {
    const data = p.result ?? p;
    if (!PARTS.includes(data.part)) {
      problems.push(`part ${data.part} is not one of ${PARTS.join(", ")}`);
      continue;
    }
    // A run part carries the hash of the recipe bytes its CONFIG named (rescore.workflow.js).
    if (data.part !== "judges" && (!armsInfo[data.part] || data.hash !== armsInfo[data.part].hash)) {
      problems.push(`part ${data.part} ran on recipe hash ${String(data.hash).slice(0, 8)}, arms.json holds ${String(armsInfo[data.part]?.hash).slice(0, 8)}`);
    }
    for (const item of data.items || []) {
      if (!item) continue; // a helper that returned nothing: missingOf names its run or judge
      if (data.part === "judges") judges.push(item);
      else if (item.arm !== data.part) problems.push(`part ${data.part} holds a run of ${item.arm}`);
      else runs.push(item);
    }
  }
  return { arms: armsInfo, runs, judges, missing: [...problems, ...missingOf(runs, judges)] };
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
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "arms") {
    const a = arms(...rest);
    for (const [k, v] of Object.entries(a)) console.log(`${k} @${v.commit.slice(0, 8)} ${v.hash}`);
  } else if (cmd === "gen") {
    gen(...rest);
    console.log(`wrote ${rest[2]}`);
  } else if (cmd === "merge") {
    const [copies, out, ...files] = rest;
    const armsInfo = JSON.parse(readFileSync(join(copies, "arms", "arms.json"), "utf8"));
    const m = merge(files.map((f) => JSON.parse(readFileSync(f, "utf8"))), armsInfo);
    writeFileSync(out, JSON.stringify(m, null, 1) + "\n");
    console.log(m.missing.length ? `MISSING ${m.missing.length}: ${m.missing.join(", ")}` : `complete: ${m.runs.length} runs, ${m.judges.length} judges`);
    if (m.missing.length) process.exitCode = 1;
  } else {
    throw new Error("usage: make-rescore.mjs arms|gen|merge ...");
  }
}

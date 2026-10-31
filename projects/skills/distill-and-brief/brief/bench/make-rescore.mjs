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
//     any expected run or judge is absent.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BACK_NINE } from "./build-copies.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..", "..", "..");
const RESULTS = join(here, "..", "results");
const SKILL_DIR = "projects/skills/distill-and-brief/brief";
const ALL = ["B01", "B02", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11", "B12", "B13", "B14", "B15", "B16", "B17", "B18"];
export const ARM_BRIEFS = { A1: ALL, A2: ALL, A3: BACK_NINE };
const RUNS = [1, 2];
const fwd = (p) => p.replace(/\\/g, "/");
const show = (commit, path) => execFileSync("git", ["-C", REPO, "show", `${commit}:${path}`], { maxBuffer: 1 << 26 });

function arms(copies, oldCommit, newCommit) {
  const spec = {
    A1: { commit: oldCommit, recipe: "SKILL.md", corpus: "corpus.mjs" },
    A2: { commit: newCommit, recipe: "SKILL.next.md", corpus: "corpus.next.mjs" },
    A3: { commit: newCommit, recipe: "SKILL.next.md", corpus: "corpus.next.mjs" },
  };
  const out = {};
  for (const [arm, s] of Object.entries(spec)) {
    const dir = join(copies, "arms", arm);
    mkdirSync(dir, { recursive: true });
    const recipe = show(s.commit, `${SKILL_DIR}/${s.recipe}`);
    const corpus = show(s.commit, `${SKILL_DIR}/${s.corpus}`);
    writeFileSync(join(dir, "SKILL.md"), recipe);
    writeFileSync(join(dir, "corpus.mjs"), corpus);
    const hash = createHash("sha256").update(recipe).update(corpus).digest("hex");
    out[arm] = { commit: s.commit, from: [`${SKILL_DIR}/${s.recipe}`, `${SKILL_DIR}/${s.corpus}`], recipe: fwd(join(dir, "SKILL.md")), corpus: fwd(join(dir, "corpus.mjs")), hash, briefs: ARM_BRIEFS[arm] };
  }
  writeFileSync(join(copies, "arms", "arms.json"), JSON.stringify(out, null, 1) + "\n");
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
  for (const p of parts) {
    const data = p.result ?? p;
    for (const item of data.items || []) {
      if (!item) continue;
      if (data.part === "judges") judges.push(item);
      else runs.push(item);
    }
  }
  const missing = [];
  for (const [arm, ids] of Object.entries(ARM_BRIEFS)) {
    for (const run of RUNS) for (const id of ids) {
      const r = runs.find((x) => x.arm === arm && x.brief === id && x.run === run);
      if (!r || !r.result) missing.push(`run ${arm}/${id}/${run}`);
    }
  }
  for (const id of ALL) {
    const j = judges.find((x) => x.brief === id);
    if (!j || !j.result) missing.push(`judge ${id}`);
  }
  return { arms: armsInfo, runs, judges, missing };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
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

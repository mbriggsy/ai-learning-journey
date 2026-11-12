#!/usr/bin/env node
// A LAUNCH'S INPUTS FROM PLAIN FACTS (Step 2 of docs/plans/lean-plan-step-plan.md). SKILL.md
// launches the three Workflow scripts itself, and each takes an args object that holds more than a
// main loop should assemble by hand: the CE resolution, the plan's section index and last line, the
// project's CLAUDE.md files, its lesson folders, the contract brief's text. This builds each
// script's args from one facts file, and prints the prompt for the one helper that writes the
// contract brief.
//
// It checks only what it reads itself (a path's form, a file that must exist, an unknown fact). Every
// other fact is passed on as given, and the script's own input check, which names each problem
// before any helper starts, refuses what is wrong or missing. An update run (deepen and check a
// committed plan) is not wired: every launch says update false.
//
// A launch's args go to the Workflow tool baked into a copy of the stage's script, never typed: given
// a third argument, a stage command writes that copy there, and the main loop launches it by its path
// alone. On 2026-11-11 (the first real run, the Back Nine's workbench plan) each launch's args ran to
// about 18 KB, which the main loop retyped into the tool call and the completion notice printed back:
// four launches cost about 5% of its window. A Workflow script cannot read a file (measured that day:
// no Bun, fetch, require or import() in a script), so the args travel inside the script.
//
// Usage: node inputs.mjs <command> <json | path to a .json file> [<script copy to write>]
//   contract-brief  { project, request, plan }            -> the prompt, as text
//   research        the facts below                       -> research.workflow.js's args, as JSON;
//                                                            with a copy's path, the copy with them baked in
//   deepen          the facts below                       -> deepen.workflow.js's args, or its baked copy
//   check           the facts below                       -> check.workflow.js's args, or its baked copy
// One facts file serves a whole run: each command takes the facts it needs and leaves the rest.
//   project        the project's root (absolute)
//   request        what was asked for
//   brief          the path of the file holding /brief's output
//   contractBrief  the path of the file holding the contract brief's text
//   plan           the plan's named path (contract-brief: not written yet; deepen and check: the file)
//   dossiers       research: the folder each research helper writes its dossier into
//   depth, agentNative, external    research: the main loop's three calls, as the script takes them
//   focus          deepen, optional: the external researchers' focus, when research's external call ran
//   round          check: 1, 2 or 3
//   highRisk, lenses, noCode        check round 1, as the script takes them
//   roster, changes                 check rounds 2 and 3: round 1's roster (its summary's) and the
//                  last fold's changes, each { id, kind, classes, text } and an edit with its was, or
//                  the absolute path of the file `fold.mjs apply` wrote them to; the seats are
//                  flow.mjs's roundSeats over them
//   dry            optional: one helper per phase
//   registry, projectsDir           optional, for a fixture: the plugin registry and the Claude Code
//                  projects folder
// Exit 0 is an answer; 2 a refusal, on stderr, with nothing printed.

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, usage } from "./entry.mjs";
import { planIndex, roundSeats } from "./flow.mjs";
import { defaultProjectsDir, slugOf } from "./paths.mjs";
import { promptContractBrief } from "./prompts.mjs";
import { resolveCe } from "./resolve-ce.mjs";
import { scriptParts } from "./workflow-stub.mjs";

export const STAGES = ["research", "deepen", "check"];
// The skill's generated scripts, one per stage.
const WORKFLOWS = join(dirname(fileURLToPath(import.meta.url)), "..", "workflows");
export const FACTS = ["project", "request", "brief", "contractBrief", "plan", "dossiers", "depth", "agentNative", "external", "focus", "round", "highRisk", "lenses", "noCode", "roster", "changes", "dry", "registry", "projectsDir"];

const fail = (msg) => {
  throw new Error(`inputs: ${msg}`);
};
const isAbs = (v) => typeof v === "string" && /^(?:[A-Za-z]:[\\/]|\/)/.test(v);
const abs = (facts, key) => (isAbs(facts[key]) ? facts[key] : fail(`${key} is an absolute path, got ${JSON.stringify(facts[key])}`));
function fileAt(facts, key) {
  const p = abs(facts, key);
  if (!existsSync(p) || !statSync(p).isFile()) fail(`${key} names no file at ${p}`);
  return p;
}

function checked(facts) {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) fail("the facts are one JSON object");
  for (const k of Object.keys(facts)) if (!FACTS.includes(k)) fail(`no fact is named ${k} (the facts: ${FACTS.join(", ")})`);
  const project = abs(facts, "project");
  if (!existsSync(project) || !statSync(project).isDirectory()) fail(`project names no folder at ${project}`);
  return project;
}

// What the helper finds from the project's root alone: the repo's root (the nearest folder at or
// above the project that holds a .git; the project itself when none does), the CLAUDE.md files from
// that root down to the project, and where the project's lessons live.
function around(project, projectsDir = defaultProjectsDir()) {
  const chain = [project];
  let root = null;
  for (let dir = project; ; dir = dirname(dir)) {
    if (dir !== project) chain.unshift(dir);
    if (existsSync(join(dir, ".git"))) {
      root = dir;
      break;
    }
    if (dirname(dir) === dir) break;
  }
  const folders = root === null ? [project] : chain;
  return {
    claudeMd: folders.map((d) => join(d, "CLAUDE.md")).filter((p) => existsSync(p) && statSync(p).isFile()),
    learnings: { insights: join(project, "docs", "insights"), memory: join(projectsDir, slugOf(root ?? project), "memory") },
  };
}

// The prompt for the contract brief's one helper (prompts.mjs's promptContractBrief), for a plan not
// yet written.
export function contractBriefPrompt(facts) {
  const project = checked(facts);
  const { claudeMd, learnings } = around(project, facts.projectsDir);
  return promptContractBrief({ planPath: abs(facts, "plan"), project, claudeMd, insights: learnings.insights, request: facts.request, update: false }).prompt;
}

// One script's args. A fact left out is left out of the args, so the script names it.
export function buildInputs(stage, facts) {
  if (!STAGES.includes(stage)) fail(`no stage ${JSON.stringify(stage)} (one of: ${STAGES.join(", ")})`);
  const project = checked(facts);
  const brief = fileAt(facts, "brief");
  const contractFile = fileAt(facts, "contractBrief");
  const contractBrief = readFileSync(contractFile, "utf8").trim();
  if (!contractBrief) fail(`the contract brief at ${contractFile} is empty`);
  const { claudeMd, learnings } = around(project, facts.projectsDir);
  // The CE resolution, cut to what a script reads (each file's key, and its path and sha256 or why
  // it is missing) and what the receipt names (the version and commit): the main loop hands the
  // args to the Workflow tool itself, so every byte left out is one it cannot get wrong.
  const found = resolveCe(facts.registry === undefined ? {} : { registry: facts.registry });
  const ce = {
    version: found.version, commit: found.commit, absent: found.absent,
    files: found.files.map((f) => ("sha256" in f ? { key: f.key, path: f.path, sha256: f.sha256 } : { key: f.key, missing: f.missing })),
  };
  const common = { project, request: facts.request, brief, claudeMd, contractBrief, ce };
  const dry = facts.dry === undefined ? {} : { dry: facts.dry };
  if (stage === "research") {
    return { ...common, dossiers: abs(facts, "dossiers"), learnings, depth: facts.depth, agentNative: facts.agentNative, external: facts.external, ...dry };
  }
  const plan = fileAt(facts, "plan");
  const { index, last, deepened } = planIndex(plan);
  const onPlan = { plan, ...common, update: false, index, lastLine: last };
  if (stage === "deepen") {
    return { ...onPlan, deepened, learnings, ...(facts.focus === undefined ? {} : { focus: facts.focus }), ...dry };
  }
  if (facts.round === 2 || facts.round === 3) {
    const changes = changesOf(facts);
    return { ...onPlan, round: facts.round, seats: roundSeats({ roster: facts.roster, changes }).seats, changes, ...dry };
  }
  return { ...onPlan, round: facts.round, highRisk: facts.highRisk, lenses: facts.lenses, noCode: facts.noCode, ...dry };
}

// A later round's changes: the list itself, or the path of the file `fold.mjs apply` wrote it to.
function changesOf(facts) {
  if (typeof facts.changes !== "string") return facts.changes;
  const file = fileAt(facts, "changes");
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return fail(`changes names ${file}, which holds no JSON (${e.message})`);
  }
}

// A value as one line of JavaScript: its JSON, with every character past ASCII and the "i" of every
// "import" written as a \u escape. The copy then stays ASCII like the generated script it is made
// from, and holds no text that workflow-stub.mjs's import scan would read as an import (the runtime
// itself reads string data as data: a script whose strings held import('x') and Date.now() ran,
// measured 2026-11-11). Every "import" in JSON text sits inside a string, where the escape is valid.
export function bakedJson(value) {
  const json = JSON.stringify(value);
  if (json === undefined) fail("the args are no JSON value");
  return json.replace(/[^\x00-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).replace(/import/g, () => "\\u0069mport");
}

// A stage's script with one launch's args baked in: the generated script's meta, then the args as
// LAUNCH_ARGS, then its body, which reads LAUNCH_ARGS before the args global. Refuses a copy that is
// no Workflow script by workflow-stub.mjs's rules.
export function bakeScript(stage, args, workflows = WORKFLOWS) {
  if (!STAGES.includes(stage)) fail(`no stage ${JSON.stringify(stage)} (one of: ${STAGES.join(", ")})`);
  const { metaText, body } = scriptParts(readFileSync(join(workflows, `${stage}.workflow.js`), "utf8"));
  const copy = `export const meta = ${metaText}\n\n// This launch's args, baked in by lib/inputs.mjs: launch this copy by its path, with no args.\nconst LAUNCH_ARGS = ${bakedJson(args)}\n${body}`;
  scriptParts(copy);
  return copy;
}

function readFacts(arg) {
  return JSON.parse(arg.trim().startsWith("{") ? arg : readFileSync(arg, "utf8"));
}

if (isMain(import.meta.url)) {
  const [command, arg, out] = process.argv.slice(2);
  const line = `node inputs.mjs <contract-brief | ${STAGES.join(" | ")}> <json | path to a .json file> [<script copy to write, a stage only>]`;
  if (!["contract-brief", ...STAGES].includes(command) || arg === undefined || (command === "contract-brief" && out !== undefined)) usage(line);
  try {
    const facts = readFacts(arg);
    if (command === "contract-brief") console.log(contractBriefPrompt(facts));
    else if (out === undefined) console.log(JSON.stringify(buildInputs(command, facts), null, 1));
    else {
      const args = buildInputs(command, facts);
      writeFileSync(out, bakeScript(command, args));
      console.log(`inputs: wrote ${out}, the ${command} script with its args baked in (${bakedJson(args).length} characters); launch it by scriptPath, with no args`);
    }
  } catch (e) {
    console.error(`inputs: ${e.message.replace(/^(?:inputs|flow|prompts|workflow-stub): /, "")}`);
    process.exitCode = 2;
  }
}

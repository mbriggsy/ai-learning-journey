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
// Usage: node inputs.mjs <command> <json | path to a .json file>
//   contract-brief  { project, request, plan }            -> the prompt, as text
//   research        the facts below                       -> research.workflow.js's args, as JSON
//   deepen          the facts below                       -> deepen.workflow.js's args
//   check           the facts below                       -> check.workflow.js's args
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
//                  last fold's changes, each { id, kind, classes, text } and an edit with its was; the
//                  seats are flow.mjs's roundSeats over them
//   dry            optional: one helper per phase
//   registry, projectsDir           optional, for a fixture: the plugin registry and the Claude Code
//                  projects folder
// Exit 0 is an answer; 2 a refusal, on stderr, with nothing printed.

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { isMain, usage } from "./entry.mjs";
import { planIndex, roundSeats } from "./flow.mjs";
import { defaultProjectsDir, slugOf } from "./paths.mjs";
import { promptContractBrief } from "./prompts.mjs";
import { resolveCe } from "./resolve-ce.mjs";

export const STAGES = ["research", "deepen", "check"];
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
    return { ...onPlan, round: facts.round, seats: roundSeats({ roster: facts.roster, changes: facts.changes }).seats, changes: facts.changes, ...dry };
  }
  return { ...onPlan, round: facts.round, highRisk: facts.highRisk, lenses: facts.lenses, noCode: facts.noCode, ...dry };
}

function readFacts(arg) {
  return JSON.parse(arg.trim().startsWith("{") ? arg : readFileSync(arg, "utf8"));
}

if (isMain(import.meta.url)) {
  const [command, arg] = process.argv.slice(2);
  if (!["contract-brief", ...STAGES].includes(command) || arg === undefined) usage(`node inputs.mjs <contract-brief | ${STAGES.join(" | ")}> <json | path to a .json file>`);
  try {
    const facts = readFacts(arg);
    console.log(command === "contract-brief" ? contractBriefPrompt(facts) : JSON.stringify(buildInputs(command, facts), null, 1));
  } catch (e) {
    console.error(`inputs: ${e.message.replace(/^(?:inputs|flow|prompts): /, "")}`);
    process.exitCode = 2;
  }
}

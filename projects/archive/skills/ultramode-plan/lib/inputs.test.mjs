import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { FACTS, bakeScript, bakedJson, buildInputs, contractBriefPrompt } from "./inputs.mjs";
import { slugOf } from "./paths.mjs";
import { CE_FILES } from "./resolve-ce.mjs";
import { runWorkflow } from "./workflow-stub.mjs";
import { tmpRoot, writeAt } from "../bench/testkit.mjs";
import { SHA_NEW, ceEntry, ceInstall, registryAt } from "./fixtures/ce-fixture.mjs";

const lib = dirname(fileURLToPath(import.meta.url));
const script = (name) => readFileSync(join(lib, "..", "workflows", `${name}.workflow.js`), "utf8");

const CONTRACT = "INVARIANTS: every export is idempotent (CLAUDE.md).\nLANDMINES: the index is shared (CLAUDE.md).";
const PLAN = ["# The export plan", "", "## Goal", "", "Exports are idempotent.", "", "## Units", "", "### U1. Build", "", "- Build the exporter.", "", "## Risks", "", "- **Done when** every export is idempotent and the receipt names the run", ""].join("\n");

// A repo with a project in it, a fixture CE install and registry, and the files a run has made by
// the time it builds inputs: the brief, the contract brief and (for the deepen and the check) the plan.
function fixture(t, { git = true, rootClaude = true, projectClaude = true } = {}) {
  const root = tmpRoot(t);
  const repo = join(root, "repo");
  const project = join(repo, "projects", "app");
  mkdirSync(join(project, "docs", "insights"), { recursive: true });
  if (git) mkdirSync(join(repo, ".git"));
  if (rootClaude) writeAt(join(repo, "CLAUDE.md"), "# repo rules\n");
  if (projectClaude) writeAt(join(project, "CLAUDE.md"), "# app rules\n");
  const job = join(root, "job");
  writeAt(join(job, "brief.md"), "## Brief: the export feature\n");
  writeAt(join(job, "contract-brief.txt"), `\n${CONTRACT}\n\n`);
  const plan = join(project, "docs", "plans", "export-plan.md");
  writeAt(plan, PLAN);
  const registry = registryAt(root, [ceEntry(ceInstall(root, "3.38.0"), SHA_NEW, "3.38.0")]);
  const projectsDir = join(root, "claude-projects");
  const common = { project, request: "Plan the export feature.", brief: join(job, "brief.md"), contractBrief: join(job, "contract-brief.txt"), registry, projectsDir };
  return { root, repo, project, job, plan, projectsDir, common };
}

const dead = () => null;
const run = (name, args, respond = dead) => runWorkflow(script(name), { args, respond });
const cleanRun = (r) => {
  assert.equal(r.error, null);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.swallowed, []);
};

test("research: the inputs built from plain facts pass the research script's own input check, and its prompts carry them", async (t) => {
  const f = fixture(t);
  const args = buildInputs("research", { ...f.common, dossiers: join(f.job, "dossiers"), depth: "Standard", agentNative: false, external: null });
  assert.deepEqual(args.claudeMd, [join(f.repo, "CLAUDE.md"), join(f.project, "CLAUDE.md")]);
  assert.deepEqual(args.learnings, { insights: join(f.project, "docs", "insights"), memory: join(f.projectsDir, slugOf(f.repo), "memory") });
  assert.equal(args.contractBrief, CONTRACT);
  assert.equal(args.ce.commit, SHA_NEW);
  assert.deepEqual(Object.keys(args.ce), ["version", "commit", "absent", "files"]);
  assert.equal(args.ce.version, "3.38.0");
  assert.equal(args.ce.files.length, CE_FILES.length);
  assert.ok(args.ce.files.every((x) => Object.keys(x).join() === "key,path,sha256" && x.path.startsWith(f.root)));
  assert.ok(!("update" in args) && !("registry" in args) && !("projectsDir" in args));
  const r = await run("research", args);
  cleanRun(r);
  assert.deepEqual(r.calls.map((c) => c.opts.label), ["research:repo-research-analyst", "research:learnings-researcher", "research:spec-flow-analyzer"]);
  assert.equal(r.result.summary.asked, 3);
  assert.equal(r.result.summary.holes.length, 3);
  for (const c of r.calls) {
    assert.ok(c.prompt.includes("Plan the export feature."), "the request");
    assert.ok(c.prompt.includes(CONTRACT), "the contract brief, verbatim");
    assert.ok(c.prompt.includes(join(f.job, "brief.md")), "the brief's path");
  }
  assert.ok(r.calls[0].prompt.includes(join(f.job, "dossiers", "repo-research-analyst.md")));
});

test("deepen: the inputs carry the plan's own index, last line and deepened flag, and pass the deepen script's input check", async (t) => {
  const f = fixture(t);
  const args = buildInputs("deepen", { ...f.common, plan: f.plan });
  assert.equal(args.update, false);
  assert.deepEqual(args.index.map((h) => [h.line, h.level, h.heading]), [[1, 1, "The export plan"], [3, 2, "Goal"], [7, 2, "Units"], [9, 3, "U1. Build"], [13, 2, "Risks"]]);
  assert.deepEqual(args.lastLine, { line: 15, text: "- **Done when** every export is idempotent and the receipt names the run" });
  assert.equal(args.deepened, false);
  assert.ok(!("focus" in args) && !("lands" in args) && !("goalMoves" in args));
  const r = await run("deepen", args);
  cleanRun(r);
  // Every helper died: the premise seat is a hole and the scorer, dead twice, blocks. The args passed.
  assert.equal(r.result.summary.outcome, "blocked");
  assert.ok(r.calls.every((c) => c.prompt.includes(f.plan)));
  const focused = buildInputs("deepen", { ...f.common, plan: f.plan, focus: "how other exporters dedupe", dry: true });
  assert.equal(focused.focus, "how other exporters dedupe");
  assert.equal(focused.dry, true);
  cleanRun(await run("deepen", focused));
});

test("check round 1: the roster comes from the three round-1 facts", async (t) => {
  const f = fixture(t);
  const args = buildInputs("check", { ...f.common, plan: f.plan, round: 1, highRisk: false, lenses: ["security"], noCode: null });
  const r = await run("check", args);
  cleanRun(r);
  assert.deepEqual(r.result.summary.roster, ["coherence", "feasibility", "scope-guardian", "adversarial", "security", "premise", "reach", "blast-radius", "test-vacuity"]);
  assert.equal(r.result.summary.holes.length, 9);
});

test("check rounds 2 and 3: the seats are coherence and every seat a change touched, from round 1's roster", async (t) => {
  const f = fixture(t);
  const roster = ["coherence", "feasibility", "scope-guardian", "adversarial", "premise", "reach", "blast-radius", "test-vacuity"];
  const changes = [
    { id: "c1-reach-1", kind: "edit", classes: ["reach"], text: "U1 also touches the importer.", was: "U1 touches the exporter." },
    { id: "c1-feasibility-2", kind: "add", classes: ["feasibility", "reach"], text: "A dry-run flag." },
  ];
  for (const round of [2, 3]) {
    const args = buildInputs("check", { ...f.common, plan: f.plan, round, roster, changes });
    assert.deepEqual(args.seats, ["coherence", "feasibility", "reach"]);
    assert.deepEqual(args.changes, changes);
    assert.ok(!("roster" in args) && !("highRisk" in args));
    const r = await run("check", args);
    cleanRun(r);
    assert.deepEqual(r.result.summary.ran, ["coherence", "feasibility", "reach"]);
  }
});

test("a fact a script needs and the helper only passes on is refused by the script, by name", async (t) => {
  const f = fixture(t);
  const noDepth = await run("research", buildInputs("research", { ...f.common, dossiers: join(f.job, "dossiers"), agentNative: false, external: null }));
  assert.match(noDepth.error, /args\.depth is required/);
  assert.equal(noDepth.calls.length, 0);
  const noLenses = await run("check", buildInputs("check", { ...f.common, plan: f.plan, round: 1, highRisk: false, noCode: null }));
  assert.match(noLenses.error, /args\.lenses is required in round 1/);
  const noRound = await run("check", buildInputs("check", { ...f.common, plan: f.plan, highRisk: false, lenses: [], noCode: null }));
  assert.match(noRound.error, /args\.round is required/);
  assert.throws(() => buildInputs("check", { ...f.common, plan: f.plan, round: 2, changes: [] }), /a round needs the run's roster/);
});

test("check: one facts file grows through the rounds, and each round takes only its own facts", async (t) => {
  const f = fixture(t);
  const all = { ...f.common, plan: f.plan, depth: "Standard", highRisk: true, lenses: [], noCode: "the plan changes documents only", roster: ["coherence", "premise", "blast-radius"], changes: [{ id: "c1-premise-1", kind: "delete", classes: ["premise"], text: "The second goal." }] };
  const one = buildInputs("check", { ...all, round: 1 });
  assert.ok(!("seats" in one) && !("changes" in one) && !("roster" in one) && !("depth" in one));
  const r1 = await run("check", one);
  cleanRun(r1);
  assert.deepEqual(r1.result.summary.roster, ["coherence", "feasibility", "scope-guardian", "adv-sequencing", "adv-settled", "adv-hidden-work", "adv-verification", "premise", "blast-radius"]);
  const two = buildInputs("check", { ...all, round: 2 });
  assert.ok(!("highRisk" in two) && !("lenses" in two) && !("noCode" in two));
  const r2 = await run("check", two);
  cleanRun(r2);
  assert.deepEqual(r2.result.summary.ran, ["coherence", "premise"]);
});

test("the helper refuses what it reads itself: a path that is not absolute, a missing file, an empty contract brief, an unknown fact or stage", (t) => {
  const f = fixture(t);
  const research = { ...f.common, dossiers: join(f.job, "dossiers"), depth: "Standard", agentNative: false, external: null };
  assert.throws(() => buildInputs("research", { ...research, project: "projects/app" }), /inputs: project is an absolute path/);
  assert.throws(() => buildInputs("research", { ...research, project: join(f.repo, "projects", "gone") }), /inputs: project names no folder/);
  assert.throws(() => buildInputs("research", { ...research, brief: join(f.job, "no-brief.md") }), /inputs: brief names no file/);
  assert.throws(() => buildInputs("research", { ...research, brief: undefined }), /inputs: brief is an absolute path/);
  writeAt(join(f.job, "empty.txt"), " \n");
  assert.throws(() => buildInputs("research", { ...research, contractBrief: join(f.job, "empty.txt") }), /inputs: the contract brief at .* is empty/);
  assert.throws(() => buildInputs("research", { ...research, agentnative: true }), /inputs: no fact is named agentnative \(the facts: /);
  assert.throws(() => buildInputs("deepen", { ...f.common, plan: join(f.project, "docs", "plans", "none.md") }), /inputs: plan names no file/);
  assert.throws(() => buildInputs("land", research), /inputs: no stage "land" \(one of: research, deepen, check\)/);
  assert.throws(() => buildInputs("research", null), /inputs: the facts are one JSON object/);
  assert.ok(FACTS.includes("agentNative"));
});

test("a CE file missing from the install, and CE absent altogether, still build inputs the scripts take: the seat runs without its file", async (t) => {
  const f = fixture(t);
  const partial = registryAt(f.root, [ceEntry(ceInstall(join(f.root, "partial"), "3.38.0", { missing: ["coherence"] }), SHA_NEW, "3.38.0")]);
  const one = buildInputs("check", { ...f.common, registry: partial, plan: f.plan, round: 1, highRisk: false, lenses: [], noCode: null });
  assert.deepEqual(one.ce.files.find((x) => x.key === "coherence"), { key: "coherence", missing: "not in the install" });
  cleanRun(await run("check", one));
  const none = buildInputs("check", { ...f.common, registry: join(f.root, "no-registry.json"), plan: f.plan, round: 1, highRisk: false, lenses: [], noCode: null });
  assert.equal(none.ce.commit, null);
  assert.match(none.ce.absent, /there is no plugin registry/);
  assert.ok(none.ce.files.every((x) => x.missing === "CE absent"));
  cleanRun(await run("check", none));
});

test("the CLAUDE.md files run from the repo's root down to the project, only the ones that exist; with no repo above, the project's alone", (t) => {
  const none = fixture(t, { rootClaude: false, projectClaude: false });
  assert.deepEqual(buildInputs("deepen", { ...none.common, plan: none.plan }).claudeMd, []);
  const bare = fixture(t, { git: false });
  const args = buildInputs("deepen", { ...bare.common, plan: bare.plan });
  assert.deepEqual(args.claudeMd, [join(bare.project, "CLAUDE.md")]);
  assert.equal(args.learnings.memory, join(bare.projectsDir, slugOf(bare.project), "memory"));
});

test("contract-brief: the prompt for the one helper that writes it names the plan's path, the project, the request and the lessons folder", (t) => {
  const f = fixture(t);
  const named = join(f.project, "docs", "plans", "not-written-yet-plan.md");
  const prompt = contractBriefPrompt({ project: f.project, request: "Plan the export feature.", plan: named });
  for (const part of [named, f.project, "Plan the export feature.", join(f.project, "docs", "insights"), join(f.repo, "CLAUDE.md"), "The plan will be written at"]) assert.ok(prompt.includes(part), part);
  assert.throws(() => contractBriefPrompt({ project: f.project, request: "x", plan: "docs/plans/x.md" }), /inputs: plan is an absolute path/);
});

test("the command prints a stage's inputs as JSON from a facts file, the contract-brief prompt as text, and a refusal on stderr with exit 2", (t) => {
  const f = fixture(t);
  const facts = { ...f.common, plan: f.plan, dossiers: join(f.job, "dossiers"), depth: "Deep", agentNative: true, external: { intent: "landscape", reason: "how other exporters dedupe" } };
  const file = join(f.job, "facts.json");
  writeAt(file, JSON.stringify(facts));
  const cmd = (...argv) => spawnSync(process.execPath, [join(lib, "inputs.mjs"), ...argv], { encoding: "utf8" });
  const research = cmd("research", file);
  assert.equal(research.status, 0, research.stderr);
  const want = buildInputs("research", facts);
  const got = JSON.parse(research.stdout);
  assert.deepEqual({ ...got, ce: { ...got.ce, resolvedAt: null } }, { ...want, ce: { ...want.ce, resolvedAt: null } });
  // One facts file serves every stage: each stage takes the facts it needs and leaves the rest.
  const deepen = cmd("deepen", file);
  assert.equal(deepen.status, 0, deepen.stderr);
  assert.ok(!("depth" in JSON.parse(deepen.stdout)));
  const inline = cmd("deepen", JSON.stringify(facts));
  assert.equal(inline.status, 0, inline.stderr);
  const brief = cmd("contract-brief", file);
  assert.equal(brief.status, 0, brief.stderr);
  assert.equal(brief.stdout.trimEnd(), contractBriefPrompt(facts));
  const refused = cmd("deepen", JSON.stringify({ ...facts, plan: "plan.md" }));
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /^inputs: plan is an absolute path/);
  assert.equal(refused.stdout, "");
});

// The baked copy, launched as the main loop launches it: by its path, with no args.
const runBaked = (copy, respond = dead) => runWorkflow(copy, { args: undefined, respond });

test("bake: each stage's copy, launched with no args, passes its script's input check and sends every helper what the args would have", async (t) => {
  const f = fixture(t);
  const launches = [
    ["research", buildInputs("research", { ...f.common, dossiers: join(f.job, "dossiers"), depth: "Standard", agentNative: false, external: null })],
    ["deepen", buildInputs("deepen", { ...f.common, plan: f.plan })],
    ["check", buildInputs("check", { ...f.common, plan: f.plan, round: 1, highRisk: false, lenses: ["security"], noCode: null })],
    ["check", buildInputs("check", { ...f.common, plan: f.plan, round: 2, roster: ["coherence", "feasibility", "reach"], changes: [{ id: "c1-reach-1", kind: "edit", classes: ["reach"], text: "U1 also touches the importer.", was: "U1 touches the exporter." }] })],
  ];
  for (const [stage, args] of launches) {
    const copy = bakeScript(stage, args);
    assert.ok(copy.startsWith("export const meta = {"), stage);
    const baked = await runBaked(copy);
    cleanRun(baked);
    const passed = await run(stage, args);
    cleanRun(passed);
    assert.ok(baked.calls.length > 0, stage);
    assert.deepEqual(baked.calls.map((c) => [c.prompt, c.opts]), passed.calls.map((c) => [c.prompt, c.opts]), stage);
    assert.deepEqual(baked.result.summary, passed.result.summary, stage);
  }
  // A copy with nothing baked in, launched with no args, is refused before any helper starts.
  const bare = await runBaked(script("deepen"));
  assert.match(bare.error, /^deepen: no args/);
  assert.equal(bare.calls.length, 0);
});

test("bakedJson: ASCII only, no \"import\" left in the text, and the same value back when read as JavaScript", () => {
  const value = { request: `Plan the import (CSV) feature ${String.fromCodePoint(0x2014)} caf${String.fromCodePoint(0xe9)}, ${String.fromCodePoint(0x1f600)}`, note: "a \\import, a quote \" and\na newline; import('x') and Date.now()", n: 3, list: [true, null] };
  const text = bakedJson(value);
  assert.ok([...text].every((c) => c.codePointAt(0) < 128), text);
  assert.ok(!text.includes("import"), text);
  // Through JSON, since an object made in another realm has that realm's prototypes.
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext(`(${text})`))), value);
  assert.throws(() => bakedJson(undefined), /inputs: the args are no JSON value/);
});

test("bake: a request holding non-ASCII text and import( still makes a copy the stub takes, and its helpers get the request whole", async (t) => {
  const f = fixture(t);
  const request = `Plan the import(CSV) path ${String.fromCodePoint(0x2014)} caf${String.fromCodePoint(0xe9)}`;
  const copy = bakeScript("deepen", buildInputs("deepen", { ...f.common, request, plan: f.plan }));
  assert.ok([...copy].every((c) => c.codePointAt(0) < 128));
  const r = await runBaked(copy);
  cleanRun(r);
  assert.ok(r.calls.every((c) => c.prompt.includes(request)));
  assert.throws(() => bakeScript("land", {}), /inputs: no stage "land"/);
});

test("check rounds 2 and 3 take their changes from the file fold.mjs apply wrote, as from the list itself", async (t) => {
  const f = fixture(t);
  const roster = ["coherence", "feasibility", "reach"];
  const changes = [{ id: "c1-reach-1", kind: "add", classes: ["reach"], text: "A dry-run flag." }];
  const file = join(f.job, "changes-2.json");
  writeAt(file, JSON.stringify(changes));
  const byPath = buildInputs("check", { ...f.common, plan: f.plan, round: 2, roster, changes: file });
  assert.deepEqual(byPath, buildInputs("check", { ...f.common, plan: f.plan, round: 2, roster, changes }));
  assert.deepEqual(byPath.seats, ["coherence", "reach"]);
  assert.throws(() => buildInputs("check", { ...f.common, plan: f.plan, round: 2, roster, changes: "changes-2.json" }), /inputs: changes is an absolute path/);
  assert.throws(() => buildInputs("check", { ...f.common, plan: f.plan, round: 2, roster, changes: join(f.job, "none.json") }), /inputs: changes names no file/);
  writeAt(join(f.job, "bad.json"), "[{");
  assert.throws(() => buildInputs("check", { ...f.common, plan: f.plan, round: 2, roster, changes: join(f.job, "bad.json") }), /inputs: changes names .*bad\.json, which holds no JSON/);
});

test("the command writes a stage's baked copy when given its path, prints one line, and takes no copy for the contract brief", async (t) => {
  const f = fixture(t);
  const facts = { ...f.common, plan: f.plan, round: 1, highRisk: false, lenses: [], noCode: null };
  const file = join(f.job, "facts.json");
  writeAt(file, JSON.stringify(facts));
  const out = join(f.job, "check.workflow.js");
  const cmd = (...argv) => spawnSync(process.execPath, [join(lib, "inputs.mjs"), ...argv], { encoding: "utf8" });
  const wrote = cmd("check", file, out);
  assert.equal(wrote.status, 0, wrote.stderr);
  assert.match(wrote.stdout, /^inputs: wrote .*check\.workflow\.js, the check script with its args baked in \(\d+ characters\); launch it by scriptPath, with no args\n$/);
  const copy = readFileSync(out, "utf8");
  assert.equal(copy, bakeScript("check", buildInputs("check", facts)));
  cleanRun(await runBaked(copy));
  const usage = cmd("contract-brief", file, out);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^usage: /);
});

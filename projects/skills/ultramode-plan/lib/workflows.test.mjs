// U5's scenarios (docs/plans/hybrid-plan-step-plan.md), run against the generated Workflow scripts in
// workflow-stub.mjs, which behaves like the documented runtime. Every clean run is also read for the
// stub's problems (an uncapped schema, an unknown option, an answer its schema rejects) and for what
// parallel and pipeline swallowed (a script bug hidden as a dead helper).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "./workflow-stub.mjs";
import { SCHEMAS } from "./caps.mjs";
import { CE_FILES } from "./resolve-ce.mjs";

const lib = dirname(fileURLToPath(import.meta.url));
const skill = dirname(lib);
const script = (name) => readFileSync(join(skill, "workflows", `${name}.workflow.js`), "utf8");
const source = (name) => readFileSync(join(skill, "src", `${name}.src.js`), "utf8");
const SCRIPTS = readdirSync(join(skill, "src")).filter((f) => f.endsWith(".src.js")).map((f) => f.slice(0, -".src.js".length));

// A CE resolution as the run record holds it (resolve-ce.mjs's shape), every file present, or the
// named ones missing.
const ceWith = (missing = []) => ({
  plugin: "compound-engineering@every-marketplace",
  commit: "a".repeat(40),
  absent: null,
  files: CE_FILES.map((f) => (missing.includes(f.key) ? { ...f, path: `C:/ce/${f.file}`, missing: "not in the install" } : { ...f, path: `C:/ce/${f.file}`, sha256: "f".repeat(64) })),
});

// ---------------------------------------------------------------- every script

// Each agent( call in a script's own source, with the text of its arguments: comments dropped, and
// the call read to its matching parenthesis with strings and template literals skipped.
function agentCalls(text) {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/([^:'"`])\/\/[^'"`\n]*$/gm, "$1");
  const out = [];
  for (const m of code.matchAll(/\bagent\(/g)) {
    let depth = 0;
    let i = m.index + "agent".length;
    for (; i < code.length; i++) {
      const c = code[i];
      if (c === "'" || c === '"' || c === "`") {
        for (i++; i < code.length && code[i] !== c; i++) if (code[i] === "\\") i++;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")" && --depth === 0) break;
    }
    out.push(code.slice(m.index, i + 1));
  }
  return out;
}

test("every agent() call in every script's source names model 'opus' and effort 'xhigh' (R3, KTD13), and the inlined modules call none", () => {
  assert.ok(SCRIPTS.includes("research"), "no research source was found, so this check saw nothing");
  for (const name of SCRIPTS) {
    const calls = agentCalls(source(name));
    assert.ok(calls.length > 0, `${name}: no agent() call found in its source`);
    for (const c of calls) {
      assert.match(c, /\bmodel: 'opus'/, `${name}: an agent() call names no model 'opus': ${c.slice(0, 200)}`);
      assert.match(c, /\beffort: 'xhigh'/, `${name}: an agent() call names no effort 'xhigh': ${c.slice(0, 200)}`);
    }
    // The generated script holds no agent() call beyond its source's own: the inlined modules are pure.
    assert.equal(agentCalls(script(name)).length, calls.length, `${name}: the generated script calls agent() where its source does not`);
  }
});

// ---------------------------------------------------------------- research (KTD4)

const DOSSIERS = "C:/runs/job/research";
const RESEARCH_ARGS = Object.freeze({
  project: "C:/repo/projects/app",
  request: "Plan the export feature.",
  brief: "C:/runs/job/brief.md",
  claudeMd: ["C:/repo/CLAUDE.md", "C:/repo/projects/app/CLAUDE.md"],
  contractBrief: "INVARIANTS: every export is idempotent (CLAUDE.md).",
  ce: ceWith(),
  dossiers: DOSSIERS,
  learnings: { insights: "C:/repo/projects/app/docs/insights", memory: "C:/Users/me/.claude/projects/repo/memory" },
  depth: "Standard",
  agentNative: false,
  external: null,
});
const researchArgs = (extra = {}) => ({ ...RESEARCH_ARGS, ...extra });
const agentOf = (call) => call.opts.label.replace(/^research:/, "");
// A research helper that answers: its gist names its agent, and its dossier is the path it was given.
const gistFor = (call, extra = {}) => ({ gist: `${agentOf(call)} found what the plan needs`, dossier: `${DOSSIERS}/${agentOf(call)}.md`, changes_a_decision: false, ...extra });
const researchRun = (args, respond = (c) => gistFor(c)) => runWorkflow(script("research"), { args, respond });
const clean = (r) => {
  assert.equal(r.error, null, `the run failed: ${r.error}`);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.swallowed, []);
};

test("research: a Standard plan with no outside research runs repo research, learnings and spec-flow on Opus at xhigh, each writing its own dossier, and returns its summary first", async () => {
  const r = await researchRun(researchArgs());
  clean(r);
  assert.deepEqual(r.calls.map(agentOf), ["repo-research-analyst", "learnings-researcher", "spec-flow-analyzer"]);
  for (const c of r.calls) {
    assert.equal(c.opts.model, "opus");
    assert.equal(c.opts.effort, "xhigh");
    assert.equal(c.opts.phase, "Research");
    assert.deepEqual(c.opts.schema, SCHEMAS.gist);
    assert.ok(c.prompt.includes(`ONE dossier file at ${DOSSIERS}/${agentOf(c)}.md`), `${agentOf(c)} was not given its own dossier`);
    assert.ok(c.prompt.includes(`YOUR AGENT FILE: C:/ce/skills/ce-plan/references/agents/${agentOf(c)}.md`), `${agentOf(c)} was not given its CE agent file`);
    assert.ok(c.prompt.includes("INVARIANTS: every export is idempotent"), "the contract brief is missing");
  }
  assert.match(r.calls[0].prompt, /\(Scope: patterns\)/);
  assert.ok(r.calls[1].prompt.includes("C:/repo/projects/app/docs/insights") && r.calls[1].prompt.includes("C:/Users/me/.claude/projects/repo/memory"), "the learnings researcher was not given the lesson roots");
  assert.deepEqual(Object.keys(r.result), ["summary", "gists"]);
  assert.deepEqual(r.result.summary, { stage: "research", dry: false, external: null, asked: 3, answered: 3, holes: [], decisive: [], notes: [] });
  assert.deepEqual(r.result.gists.map((g) => [g.agent, g.dossier]), [["repo-research-analyst", `${DOSSIERS}/repo-research-analyst.md`], ["learnings-researcher", `${DOSSIERS}/learnings-researcher.md`], ["spec-flow-analyzer", `${DOSSIERS}/spec-flow-analyzer.md`]]);
});

test("research: a Lightweight plan skips spec-flow, the agent-native call adds the strategist, and a gist that changes a decision is named", async () => {
  const light = await researchRun(researchArgs({ depth: "Lightweight" }));
  clean(light);
  assert.deepEqual(light.calls.map(agentOf), ["repo-research-analyst", "learnings-researcher"]);
  const native = await researchRun(researchArgs({ depth: "Deep", agentNative: true }), (c) => gistFor(c, { changes_a_decision: agentOf(c) === "agent-native-planning-strategist" }));
  clean(native);
  assert.deepEqual(native.calls.map(agentOf), ["repo-research-analyst", "learnings-researcher", "agent-native-planning-strategist", "spec-flow-analyzer"]);
  assert.deepEqual(native.result.summary.decisive, ["agent-native-planning-strategist"]);
});

test("research: the external call picks its researchers by intent, each focused on the recorded reason; a mixed call runs the landscape scan first and hands its gist to the shortlist", async () => {
  const reason = "the request asks for best practices on idempotent exports";
  const impl = await researchRun(researchArgs({ external: { intent: "implementation", reason } }));
  clean(impl);
  assert.deepEqual(impl.calls.map(agentOf), ["repo-research-analyst", "learnings-researcher", "spec-flow-analyzer", "best-practices-researcher", "framework-docs-researcher"]);
  for (const c of impl.calls.slice(3)) assert.ok(c.prompt.includes(`outside sources first, on this focus: ${reason}.`), `${agentOf(c)} lost its focus`);
  for (const c of impl.calls.slice(0, 3)) assert.ok(!c.prompt.includes(reason), `${agentOf(c)} got an external focus`);
  assert.equal(impl.result.summary.external, "implementation");
  const land = await researchRun(researchArgs({ external: { intent: "landscape", reason } }));
  clean(land);
  assert.deepEqual(land.calls.map(agentOf), ["repo-research-analyst", "learnings-researcher", "spec-flow-analyzer", "web-researcher"]);
  const mixed = await researchRun(researchArgs({ external: { intent: "mixed", reason } }), (c) => gistFor(c, agentOf(c) === "web-researcher" ? { gist: "shortlist: libA and libB" } : {}));
  clean(mixed);
  assert.deepEqual(mixed.calls.map(agentOf), ["repo-research-analyst", "learnings-researcher", "spec-flow-analyzer", "web-researcher", "best-practices-researcher", "framework-docs-researcher"]);
  assert.deepEqual(mixed.calls.map((c) => c.opts.phase), ["Research", "Research", "Research", "Research", "Shortlist", "Shortlist"]);
  for (const c of mixed.calls.slice(4)) assert.ok(c.prompt.includes(`on this focus: ${reason}. The landscape scan's shortlist (web-researcher's gist): shortlist: libA and libB.`), `${agentOf(c)} did not get the shortlist`);
  assert.deepEqual(mixed.phases, ["Research", "Shortlist"]);
  assert.equal(mixed.result.summary.asked, 6);
});

test("research: a dead helper is a coverage hole, never a gist that found nothing, and so is an external researcher whose outside research could not run", async () => {
  const reason = "the request asks what other tools do";
  const r = await researchRun(researchArgs({ external: { intent: "landscape", reason } }), (c) => {
    if (agentOf(c) === "learnings-researcher") return null;
    if (agentOf(c) === "web-researcher") return gistFor(c, { gist: "Outside research could not run: no web tool answered" });
    return gistFor(c);
  });
  clean(r);
  assert.deepEqual(r.result.summary.holes, [
    { seat: "learnings-researcher", missed: "its research: the helper never answered, so the plan is written without its dossier" },
    { seat: "web-researcher", missed: "outside research: no web tool answered" },
  ]);
  assert.equal(r.result.summary.answered, 3);
  assert.deepEqual(r.result.gists.map((g) => g.agent), ["repo-research-analyst", "spec-flow-analyzer", "web-researcher"]);
  // A local seat's gist that opens with the same words is no outside hole: it was never sent outside.
  const local = await researchRun(researchArgs(), (c) => gistFor(c, agentOf(c) === "repo-research-analyst" ? { gist: "outside research could not run: n/a" } : {}));
  assert.deepEqual(local.result.summary.holes, []);
});

test("research: a mixed call whose landscape scan died runs the shortlist on the recorded reason alone and says so", async () => {
  const reason = "pick an export library";
  const r = await researchRun(researchArgs({ external: { intent: "mixed", reason } }), (c) => (agentOf(c) === "web-researcher" ? null : gistFor(c)));
  clean(r);
  for (const c of r.calls.filter((x) => x.opts.phase === "Shortlist")) {
    assert.ok(c.prompt.includes(`on this focus: ${reason}. `) && !c.prompt.includes("shortlist (web-researcher's gist)"), "a shortlist seat got a gist that never came");
  }
  assert.deepEqual(r.result.summary.holes.map((h) => h.seat), ["web-researcher"]);
  assert.deepEqual(r.result.summary.notes, ["the landscape scan never answered, so the shortlist seats ran on the recorded reason alone"]);
});

test("research: a dossier reported anywhere but its given path is noted; the same path in another slash or case is not", async () => {
  const r = await researchRun(researchArgs(), (c) => {
    if (agentOf(c) === "repo-research-analyst") return gistFor(c, { dossier: "C:/elsewhere/repo.md" });
    if (agentOf(c) === "learnings-researcher") return gistFor(c, { dossier: "c:\\runs\\job\\research\\learnings-researcher.md" });
    return gistFor(c);
  });
  clean(r);
  assert.deepEqual(r.result.summary.notes, [`repo-research-analyst reported its dossier at C:/elsewhere/repo.md, not at ${DOSSIERS}/repo-research-analyst.md, the path this run gave it`]);
  assert.equal(r.result.gists[0].dossier, `${DOSSIERS}/repo-research-analyst.md`);
  // A folder given in Windows form names each dossier in it.
  const win = await researchRun(researchArgs({ dossiers: "C:\\runs\\job\\research\\" }), (c) => gistFor(c, { dossier: `C:\\runs\\job\\research\\${agentOf(c)}.md` }));
  clean(win);
  assert.ok(win.calls[0].prompt.includes("ONE dossier file at C:\\runs\\job\\research\\repo-research-analyst.md"));
  assert.deepEqual(win.result.summary.notes, []);
});

test("research: a seat whose CE agent file is missing runs on its own method, and the prompt names no path for it", async () => {
  const r = await researchRun(researchArgs({ ce: ceWith(["learnings-researcher"]) }));
  clean(r);
  const learn = r.calls.find((c) => agentOf(c) === "learnings-researcher");
  assert.match(learn.prompt, /CE's agent file for learnings-researcher is missing in this run/);
  assert.ok(!learn.prompt.includes("agents/learnings-researcher.md"));
});

test("research: stringified args run like object args, identical args give identical calls in identical order, and dry runs one helper per phase", async () => {
  const args = researchArgs({ external: { intent: "mixed", reason: "pick a library" } });
  const a = await researchRun(args);
  const b = await researchRun(JSON.stringify(args));
  const c = await researchRun(args);
  clean(b);
  assert.deepEqual(b.calls, a.calls);
  assert.deepEqual(c.calls, a.calls);
  assert.deepEqual(b.result, a.result);
  const dry = await researchRun({ ...args, dry: true });
  clean(dry);
  assert.deepEqual(dry.calls.map((x) => [agentOf(x), x.opts.phase]), [["repo-research-analyst", "Research"], ["best-practices-researcher", "Shortlist"]]);
  assert.equal(dry.result.summary.dry, true);
  assert.equal(dry.result.summary.asked, 2);
});

test("research: missing or wrong args are refused, each named, before any helper starts; an update run is refused too", async () => {
  const refused = async (args, pattern) => {
    const r = await researchRun(args);
    assert.equal(r.calls.length, 0, "a helper started before the args check");
    assert.match(r.error, pattern);
  };
  const { brief, ce, ...rest } = RESEARCH_ARGS;
  await refused(rest, /^research: args\.brief is required; args\.ce is required$/);
  await refused(undefined, /^research: no args; it needs project, request, brief/);
  await refused("{not json", /^research: args arrived as text that is no JSON/);
  await refused(researchArgs({ external: { intent: "survey", reason: "x" } }), /args\.external: null, or the external-research call \{ intent, reason \}/);
  await refused(researchArgs({ external: { intent: "landscape", reason: "x", extra: 1 } }), /args\.external: null, or the external-research call/);
  await refused(researchArgs({ depth: "Medium" }), /args\.depth: the main loop's depth for the plan, one of Lightweight, Standard, Deep/);
  await refused(researchArgs({ learnings: { insights: "docs/insights", memory: "C:/m" } }), /args\.learnings: the lesson roots/);
  await refused(researchArgs({ claudeMd: ["CLAUDE.md"] }), /args\.claudeMd: the project's CLAUDE\.md paths/);
  await refused(researchArgs({ ce: { files: [] } }), /args\.ce: the CE resolution/);
  await refused(researchArgs({ update: true }), /args\.update is no field this script takes/);
});

// U5's scenarios (docs/plans/hybrid-plan-step-plan.md), run against the generated Workflow scripts in
// workflow-stub.mjs, which behaves like the documented runtime. Every clean run is also read for the
// stub's problems (an uncapped schema, an unknown option, an answer its schema rejects) and for what
// parallel and pipeline swallowed (a script bug hidden as a dead helper).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWorkflow } from "./workflow-stub.mjs";
import { SCHEMAS } from "./caps.mjs";
import { CE_FILES } from "./resolve-ce.mjs";
import { INLINABLE, topNames } from "./make-scripts.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

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

// The text a generated script inlined from lib/<name>.mjs, between the generator's marker lines.
function inlinedRegion(text, name) {
  const open = text.indexOf(`inlined from lib/${name}.mjs (`);
  if (open < 0) return null;
  const start = text.indexOf("\n", open) + 1;
  const close = text.indexOf(`// ---------------------------------------------------------------- end of lib/${name}.mjs`, start);
  assert.ok(close > start, `the inlined lib/${name}.mjs has no end marker`);
  return text.slice(start, close);
}

test("each module's own tests pass against every script's inlined copy of it, and a broken copy proves the redirect took", (t) => {
  const dir = tmpRoot(t);
  const register = pathToFileURL(join(lib, "fixtures", "redirect-register.mjs")).href;
  // A child of the test runner carries NODE_TEST_CONTEXT, which sends a nested run's report up the
  // parent's channel instead of printing it; the nested run here reports on its own.
  const runTests = (name, map) => {
    const env = { ...process.env, ULTRAMODE_REDIRECT: JSON.stringify(map) };
    delete env.NODE_TEST_CONTEXT;
    return spawnSync(process.execPath, ["--import", register, "--test", "--test-reporter=spec", join(lib, `${name}.test.mjs`)], { encoding: "utf8", env });
  };
  let ran = 0;
  for (const name of SCRIPTS) {
    const text = script(name);
    // Each inlined module written as an importable copy: its region, with every top-level name
    // exported again (the generator dropped each `export `).
    const copies = {};
    for (const m of INLINABLE) {
      const region = inlinedRegion(text, m);
      if (region === null) continue;
      const at = join(dir, `${name}-${m}.mjs`);
      writeFileSync(at, `${region}\nexport { ${topNames(region).join(", ")} };\n`);
      copies[pathToFileURL(join(lib, `${m}.mjs`)).href] = { m, url: pathToFileURL(at).href };
    }
    const map = Object.fromEntries(Object.entries(copies).map(([real, c]) => [real, c.url]));
    for (const [real, c] of Object.entries(copies)) {
      const r = runTests(c.m, map);
      assert.equal(r.status, 0, `${name}'s inlined ${c.m}: its tests fail\n${r.stdout.slice(-2000)}${r.stderr.slice(-1000)}`);
      // The spec reporter's summary line opens with an information sign (written as its code, since
      // lib/ stays ASCII).
      assert.match(r.stdout, new RegExp(`^${String.fromCharCode(0x2139)} pass [1-9]`, "m"), `${name}'s inlined ${c.m}: no test ran`);
      // The presence check: the same run against a copy that throws on load fails, naming it, so a
      // redirect that never took cannot pass as a clean run of the real module.
      // It keeps the copy's exports, so the import links and the throw runs.
      const probe = join(dir, `${name}-${c.m}-probe.mjs`);
      writeFileSync(probe, `throw new Error("REDIRECT-PROBE ${name} ${c.m}");\n${readFileSync(fileURLToPath(c.url), "utf8")}`);
      const p = runTests(c.m, { ...map, [real]: pathToFileURL(probe).href });
      assert.notEqual(p.status, 0, `${name}'s inlined ${c.m}: the broken copy passed, so the redirect never took`);
      assert.match(p.stdout + p.stderr, new RegExp(`REDIRECT-PROBE ${name} ${c.m}`));
      ran++;
    }
  }
  // research inlines caps, prompts and reads; the deepen those and vote-law and select.
  assert.ok(ran >= 8, `only ${ran} inlined copies were tested`);
});

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

// ---------------------------------------------------------------- the deepen (KTD5, KTD7, KTD8)

// The staged plan: a title, a goal, the decisions, two units under a heading with no text of its
// own, and the risks. It ends on an indented line at 80.
const D_INDEX = [
  { line: 1, level: 1, heading: "The export plan", own: true },
  { line: 3, level: 2, heading: "Goal Capsule", own: true },
  { line: 10, level: 2, heading: "Key Technical Decisions", own: true },
  { line: 20, level: 2, heading: "Implementation Units", own: false },
  { line: 22, level: 3, heading: "U1. Build", own: true },
  { line: 40, level: 3, heading: "U2. Test", own: true },
  { line: 60, level: 2, heading: "Risks", own: true },
];
const D_TEXT = "- **Done when** every export is idempotent and the receipt names the run";
const D_LAST = { line: 80, text: `  ${D_TEXT}` };
const DEEPEN_ARGS = Object.freeze({
  plan: "C:/runs/job/staged-plan.md",
  project: "C:/repo/projects/app",
  request: "Plan the export feature.",
  brief: "C:/runs/job/brief.md",
  update: false,
  claudeMd: ["C:/repo/CLAUDE.md"],
  contractBrief: "INVARIANTS: every export is idempotent (CLAUDE.md).",
  ce: ceWith(),
  index: D_INDEX,
  lastLine: D_LAST,
  deepened: false,
  learnings: { insights: "C:/repo/projects/app/docs/insights", memory: "C:/Users/me/.claude/projects/repo/memory" },
});
const deepenArgs = (extra = {}) => ({ ...DEEPEN_ARGS, ...extra });
// A whole read's inventory, and the scorer's answer: the decisions score 3 points (2 triggers and the
// critical bonus on a Standard plan), the units 2 (1 and the bonus), the goal and the risks under 2.
const WHOLE = { last_line_number: 80, last_line_text: D_TEXT.slice(0, 100), pages_read: 1 };
const SCORES = Object.freeze({
  sections: [
    { section: "Goal Capsule", line: 3, kind: "goal-problem", triggers: 0, strengthened: false },
    { section: "Key Technical Decisions", line: 10, kind: "key-decisions", triggers: 2, strengthened: false },
    { section: "Implementation Units", line: 20, kind: "units", triggers: 1, strengthened: false },
    { section: "Risks", line: 60, kind: "risks", triggers: 0, strengthened: false },
  ],
  depth: "Standard",
  risk_signals: [],
  notes: [
    { line: 10, section: "Key Technical Decisions", triggers_named: "a decision with no rejected alternative" },
    { line: 20, section: "Implementation Units", triggers_named: "a unit with no test path" },
  ],
});
const scorerAnswer = (extra = {}) => ({ ...SCORES, ...WHOLE, ...extra });
const finding = (title, severity, extra = {}) => ({ title, severity, section: "Goal Capsule", line: 3, confidence: 75, why_it_matters: `${title}: the plan says so at line 3`, suggested_fix: "rewrite the goal", ...extra });
const premiseAnswer = (findings = [], extra = {}) => ({ findings, overflow: [], residual_risks: ["a lesser premise gap"], ...WHOLE, ...extra });
const vote = (extra = {}) => ({ real: true, material: true, new: true, corrected_severity: "P1", fix_is_correct: true, reasoning: "holds at plan line 3", better_fix: "", ...extra });
const amendment = (section, severity = "P2", extra = {}) => ({ section, gap: `a gap in ${section}`, severity, change: `strengthen ${section}`, evidence: "src/app.js:1", old_values: [], ...extra });

// A responder for the deepen, routed by label. Each option may be a value or a function of the call;
// `scorer` may be a list, answered in order, one entry per scorer call.
function deepenResponder({ premise = premiseAnswer(), scorer = scorerAnswer(), premiseVote = () => vote(), research = (agent, line) => ({ amendments: [amendment(agent === "architecture-strategist" ? "Key Technical Decisions" : "Implementation Units")], overflow: [], ...(["best-practices-researcher", "framework-docs-researcher", "web-researcher"].includes(agent) ? { outside_ran: true } : {}) }), amendVote = () => vote({ corrected_severity: "P2" }) } = {}) {
  let scorerCalls = 0;
  const of = (v, c) => (typeof v === "function" ? v(c) : v);
  return (c) => {
    const label = c.opts.label;
    if (label.startsWith("deepen:premise-")) return of(premiseVote, c);
    if (label.startsWith("deepen:premise")) return of(premise, c);
    if (label.startsWith("deepen:scorer")) {
      const s = Array.isArray(scorer) ? scorer[scorerCalls] : of(scorer, c);
      scorerCalls++;
      return s === undefined ? null : s;
    }
    if (label.startsWith("deepen:verify ")) return of(amendVote, c);
    const m = label.match(/^deepen:([a-z-]+)@(\d+)$/);
    if (m) return research(m[1], Number(m[2]), c);
    throw new Error(`no answer for ${label}`);
  };
}
const deepenRun = (args, opts) => runWorkflow(script("deepen"), { args, respond: deepenResponder(opts) });
const labels = (r) => r.calls.map((c) => c.opts.label);

test("deepen: the premise seat and the scorer read the plan in parallel, then the selected sections' helpers, each on Opus at xhigh; the summary comes first", async () => {
  const r = await deepenRun(deepenArgs());
  clean(r);
  assert.deepEqual(labels(r).slice(0, 2), ["deepen:premise", "deepen:scorer"]);
  for (const c of r.calls) {
    assert.equal(c.opts.model, "opus", c.opts.label);
    assert.equal(c.opts.effort, "xhigh", c.opts.label);
  }
  // The decisions get the architecture strategist and best practices; the units repo research
  // (scope: patterns) and pattern recognition.
  const helpers = labels(r).filter((l) => /^deepen:[a-z-]+@\d+$/.test(l));
  assert.deepEqual(helpers, ["deepen:architecture-strategist@10", "deepen:best-practices-researcher@10", "deepen:repo-research-analyst@20", "deepen:pattern-recognition-specialist@20"]);
  const repo = r.calls.find((c) => c.opts.label === "deepen:repo-research-analyst@20");
  assert.match(repo.prompt, /\(Scope: patterns\)/);
  assert.match(repo.prompt, /a unit with no test path/);
  assert.deepEqual(Object.keys(r.result)[0], "summary");
  const s = r.result.summary;
  assert.equal(s.outcome, "deepen");
  assert.deepEqual(s.selected, [{ line: 10, heading: "Key Technical Decisions", points: 3 }, { line: 20, heading: "Implementation Units", points: 2 }]);
  assert.deepEqual(s.helpers, { asked: 4, answered: 4 });
  assert.deepEqual(s.amendments.confirmed, ["A1", "A2", "A3", "A4"]);
  assert.deepEqual(s.holes, []);
  assert.deepEqual(r.result.scorer, scorerAnswer());
  assert.equal(r.result.amendments[0].votes.length, 2, "a P2 amendment's raw votes are kept beside its verdict");
  assert.deepEqual(r.phases, ["Score", "Research"]);
});

test("deepen: a P1 amendment gets 3 verifiers and a P2 gets 2, each on its own refuter angle", async () => {
  const r = await deepenRun(deepenArgs(), { research: (agent) => ({ amendments: agent === "architecture-strategist" ? [amendment("Key Technical Decisions", "P1"), amendment("Key Technical Decisions", "P2")] : [], overflow: [], ...(agent === "best-practices-researcher" ? { outside_ran: true } : {}) }) });
  clean(r);
  const v = labels(r).filter((l) => l.startsWith("deepen:verify architecture-strategist@10"));
  assert.deepEqual(v, ["deepen:verify architecture-strategist@10 #1 angle 1", "deepen:verify architecture-strategist@10 #1 angle 2", "deepen:verify architecture-strategist@10 #1 angle 3", "deepen:verify architecture-strategist@10 #2 angle 1", "deepen:verify architecture-strategist@10 #2 angle 2"]);
  const angles = r.calls.filter((c) => c.opts.label.startsWith("deepen:verify architecture-strategist@10 #1")).map((c) => c.prompt.match(/YOUR REFUTER ANGLE: (\S+)/)[1]);
  assert.deepEqual(angles, ["REPRODUCE-IN-SOURCE:", "CONSEQUENCE:", "FIX-CORRECTNESS"]);
  // An amendment's verifier sees the section it amends and why it was picked.
  assert.match(r.calls.find((c) => c.opts.label.endsWith("#1 angle 1")).prompt, /THE SECTION IT AMENDS: "Key Technical Decisions", lines 10 to 19 of the plan\.\nWHY IT WAS PICKED: the scorer found these problems in it: a decision with no rejected alternative/);
});

test("deepen: a scorer that dies twice ends blocked, never passed, and starts no research", async () => {
  const r = await deepenRun(deepenArgs(), { scorer: [null, null] });
  clean(r);
  assert.deepEqual(labels(r).filter((l) => l.startsWith("deepen:scorer")), ["deepen:scorer", "deepen:scorer (after a crash)"]);
  assert.equal(r.result.summary.outcome, "blocked");
  assert.equal(r.result.summary.reason, "the scorer died twice");
  assert.ok(!labels(r).some((l) => /@\d+$/.test(l)));
  // One crash, then a whole read, goes on.
  const once = await deepenRun(deepenArgs(), { scorer: [null, scorerAnswer()] });
  assert.equal(once.result.summary.outcome, "deepen");
});

test("deepen: a scorer that stops short is re-run once naming what it missed; a second short read ends blocked", async () => {
  const short = scorerAnswer({ last_line_number: 45 });
  const r = await deepenRun(deepenArgs(), { scorer: [short, scorerAnswer()] });
  clean(r);
  const rerun = r.calls.find((c) => c.opts.label === "deepen:scorer (re-run)");
  assert.match(rerun.prompt, /STOPPED SHORT at line 45, so these sections were not read to their end:\n- line 20: Implementation Units\n- line 40: U2\. Test\n- line 60: Risks/);
  assert.ok(!rerun.prompt.includes(D_TEXT.slice(0, 30)), "the re-run prompt holds the last line's text");
  assert.equal(r.result.summary.outcome, "deepen");
  const twice = await deepenRun(deepenArgs(), { scorer: [short, scorerAnswer({ pages_read: 0 })] });
  clean(twice);
  assert.equal(twice.result.summary.outcome, "blocked");
  assert.match(twice.result.summary.reason, /^the scorer's read came back short twice: pages_read 0 is under 1/);
  assert.ok(!labels(twice).some((l) => /@\d+$/.test(l)));
});

test("deepen: a failed inventory (a 39-character quote, a number past the end) re-runs the scorer by the inventory kind, and its prompt never holds the last line", async () => {
  // A field left out is absent from the answer (the schema refuses an undefined value).
  const { pages_read: _, ...noPages } = scorerAnswer();
  for (const first of [scorerAnswer({ last_line_text: D_TEXT.slice(0, 39) }), scorerAnswer({ last_line_number: 81 }), noPages]) {
    const bad = first;
    const r = await deepenRun(deepenArgs(), { scorer: [first, scorerAnswer()] });
    clean(r);
    const rerun = r.calls.find((c) => c.opts.label === "deepen:scorer (re-run)");
    assert.ok(rerun, JSON.stringify(bad));
    assert.match(rerun.prompt, /FAILED THE RUN'S CHECK OF ITS READING INVENTORY/);
    assert.ok(!rerun.prompt.includes(D_TEXT.slice(0, 30)));
  }
  // 40 characters with the indentation dropped is a whole read: no re-run.
  const ok = await deepenRun(deepenArgs(), { scorer: [scorerAnswer({ last_line_text: D_TEXT.slice(0, 40) })] });
  assert.ok(!labels(ok).includes("deepen:scorer (re-run)"));
});

test("deepen: a selected row with no note re-runs the scorer with the notes kind, beside a stop when its read was short too; notes join rows by line", async () => {
  const noNote = scorerAnswer({ notes: [{ line: 10, section: "Key Technical Decisions", triggers_named: "a decision with no rejected alternative" }, { line: 22, section: "Implementation Units", triggers_named: "a note at the wrong line" }] });
  const r = await deepenRun(deepenArgs(), { scorer: [noNote, scorerAnswer()] });
  clean(r);
  assert.match(r.calls.find((c) => c.opts.label === "deepen:scorer (re-run)").prompt, /GAVE NO NOTE TO THESE SECTIONS, which the run selected to deepen:\n- line 20: Implementation Units/);
  const both = await deepenRun(deepenArgs(), { scorer: [{ ...noNote, last_line_number: 50 }, scorerAnswer()] });
  const p = both.calls.find((c) => c.opts.label === "deepen:scorer (re-run)").prompt;
  assert.match(p, /STOPPED SHORT at line 50/);
  assert.match(p, /GAVE NO NOTE TO THESE SECTIONS/);
  // A blank note is no note, and a second notes failure blocks.
  const blank = await deepenRun(deepenArgs(), { scorer: [scorerAnswer({ notes: [{ line: 10, section: "x", triggers_named: "y" }, { line: 20, section: "x", triggers_named: "  " }] }), noNote] });
  assert.equal(blank.result.summary.outcome, "blocked");
  assert.match(blank.result.summary.reason, /no note on "Implementation Units" \(line 20\)/);
});

test("deepen: a confirmed premise finding its real-voters put at P0 or P1 ends the deepen with its votes and the scores, and no research helper starts", async () => {
  const r = await deepenRun(deepenArgs(), { premise: premiseAnswer([finding("the problem never happened here", "P1")]) });
  clean(r);
  assert.deepEqual(labels(r), ["deepen:premise", "deepen:scorer", "deepen:premise-1 verifier 1", "deepen:premise-1 verifier 2", "deepen:premise-1 verifier 3"]);
  const s = r.result.summary;
  assert.equal(s.outcome, "premise");
  assert.deepEqual(s.premise.above, ["premise-1"]);
  assert.deepEqual(r.result.scorer, scorerAnswer());
  assert.equal(r.result.premise[0].votes.length, 3);
  assert.equal(r.result.premise[0].line, "above");
  assert.deepEqual(r.phases, ["Score", "Premise"]);
});

test("deepen: a confirmed premise finding put at P2, or split across the P1 line, goes on to research and comes back in the summary, never in a finder's prompt", async () => {
  const title = "the goal names no population instance";
  for (const [votes, line] of [[["P2", "P2", "P2"], "below"], [["P1", "P2", "P3"], "below"], [["P1", "P1", "P2"], "above"]]) {
    let k = 0;
    const r = await deepenRun(deepenArgs(), { premise: premiseAnswer([finding(title, "P1")]), premiseVote: () => vote({ corrected_severity: votes[k++ % 3] }) });
    clean(r);
    if (line === "above") {
      assert.equal(r.result.summary.outcome, "premise");
      continue;
    }
    assert.equal(r.result.summary.outcome, "deepen");
    assert.deepEqual(r.result.summary.premise.carried, [{ id: "premise-1", status: "confirmed", line }]);
    for (const c of r.calls.filter((x) => /@\d+$/.test(x.opts.label))) assert.ok(!c.prompt.includes(title), "a carried premise finding reached a research helper's prompt");
  }
  // A one-to-one split among two real-voters is "both", and goes on too.
  const votes2 = [vote({ corrected_severity: "P1" }), vote({ corrected_severity: "P2" }), null];
  let j = 0;
  const split = await deepenRun(deepenArgs(), { premise: premiseAnswer([finding(title, "P1")]), premiseVote: () => votes2[j++] });
  assert.equal(split.result.summary.outcome, "deepen");
  assert.deepEqual(split.result.summary.premise.carried, [{ id: "premise-1", status: "confirmed", line: "both" }]);
  // A hand-verify premise finding is carried for the main loop to trace.
  const hv = await deepenRun(deepenArgs(), { premise: premiseAnswer([finding(title, "P1")]), premiseVote: () => null });
  assert.deepEqual(hv.result.summary.premise.carried, [{ id: "premise-1", status: "hand-verify", line: null }]);
});

test("deepen: a park's relaunch with recorded scores starts at selection, with no premise seat and no scorer", async () => {
  const r = await deepenRun(deepenArgs({ skipPremise: true, parked: true, scores: scorerAnswer() }));
  clean(r);
  assert.ok(!labels(r).some((l) => l.startsWith("deepen:premise") || l.startsWith("deepen:scorer")));
  assert.equal(labels(r)[0], "deepen:architecture-strategist@10");
  assert.equal(r.result.summary.skipPremise, true);
  assert.equal(r.result.summary.parked, true);
  assert.equal(r.result.summary.premise.ran, false);
  // Without scores the scorer runs again, still with no premise seat.
  const fresh = await deepenRun(deepenArgs({ skipPremise: true }));
  assert.deepEqual(labels(fresh).slice(0, 1), ["deepen:scorer"]);
  // Scores without skipPremise are refused.
  const bad = await deepenRun(deepenArgs({ scores: scorerAnswer() }));
  assert.equal(bad.calls.length, 0);
  assert.match(bad.error, /args\.scores comes only with skipPremise/);
});

test("deepen: scores with one candidate dispatch helpers for that section only; none at 2 points is passed", async () => {
  const one = scorerAnswer({ sections: SCORES.sections.map((s) => (s.line === 20 ? { ...s, triggers: 0 } : s)), notes: [SCORES.notes[0]] });
  const r = await deepenRun(deepenArgs(), { scorer: one });
  clean(r);
  assert.deepEqual(labels(r).filter((l) => /@\d+$/.test(l)), ["deepen:architecture-strategist@10", "deepen:best-practices-researcher@10"]);
  const none = scorerAnswer({ sections: SCORES.sections.map((s) => ({ ...s, triggers: 0 })), notes: [] });
  const p = await deepenRun(deepenArgs(), { scorer: none });
  clean(p);
  assert.equal(p.result.summary.outcome, "passed");
  assert.ok(!labels(p).some((l) => /@\d+$/.test(l)));
});

test("deepen: helpers are dealt one per section per round, at most 3 a section and 8 in all; risk signals and notes add their specialists", async () => {
  // Five candidates of kinds that map to three agents each: 15 wanted, 8 dealt.
  const idx = [{ line: 1, level: 1, heading: "P", own: true }, ...[3, 10, 20, 30, 40, 50].map((line, i) => ({ line, level: 2, heading: `S${i}`, own: true }))];
  const kinds = ["key-decisions", "system-impact", "context-research", "risks", "design", "goal-problem"];
  const big = {
    sections: idx.slice(1).map((h, i) => ({ section: h.heading, line: h.line, kind: kinds[i], triggers: i === 5 ? 0 : 3, strengthened: false })),
    depth: "Deep",
    risk_signals: ["security", "data-migration"],
    notes: idx.slice(1, 6).map((h) => ({ line: h.line, section: h.heading, triggers_named: "a workflow prompt with no performance budget" })),
    last_line_number: 60, last_line_text: "the end of it", pages_read: 1,
  };
  const r = await deepenRun(deepenArgs({ index: idx, lastLine: { line: 60, text: "the end of it" } }), { scorer: big, research: () => ({ amendments: [], overflow: [], outside_ran: true }) });
  clean(r);
  // Selection order is rank order: the three critical kinds at 4 points (lines 3, 10, 30), then the
  // two at 3 (lines 20, 40). Round 1 deals each its first agent; round 2 reaches the cap of 8 at the
  // risks section, so the context and design sections keep one each.
  const dealt = labels(r).filter((l) => /@\d+$/.test(l));
  assert.equal(dealt.length, 8);
  assert.deepEqual(dealt, [
    "deepen:architecture-strategist@3", "deepen:best-practices-researcher@3",
    // system impact: architecture, then the agent-native strategist (the note names a workflow
    // prompt), then the security specialist, cut by the cap.
    "deepen:architecture-strategist@10", "deepen:agent-native-planning-strategist@10",
    // risks: no base agent; the security and data-migration signals add their specialists.
    "deepen:security-sentinel@30", "deepen:data-integrity-guardian@30",
    "deepen:learnings-researcher@20",
    "deepen:architecture-strategist@40",
  ]);
  // The goal section (0 triggers) is no candidate, so it gets none.
  assert.ok(!dealt.some((l) => l.endsWith("@50")));
  // The learnings researcher gets the lesson roots in the deepen too.
  assert.ok(r.calls.find((c) => c.opts.label === "deepen:learnings-researcher@20").prompt.includes("C:/repo/projects/app/docs/insights"));
});

test("deepen: a section alone under the cap keeps all three of its agents; a risk section no specialist fits gets the architecture strategist; a deepened plan's scorer is told so", async () => {
  const one = (kind, note) => scorerAnswer({
    sections: SCORES.sections.map((s) => (s.line === 10 ? { ...s, kind, triggers: 3 } : { ...s, triggers: 0 })),
    notes: [{ line: 10, section: "Key Technical Decisions", triggers_named: note }],
  });
  const ctxr = await deepenRun(deepenArgs(), { scorer: one("context-research", "no source for the claim"), research: () => ({ amendments: [], overflow: [], outside_ran: true }) });
  clean(ctxr);
  assert.deepEqual(labels(ctxr).filter((l) => /@\d+$/.test(l)), ["deepen:learnings-researcher@10", "deepen:framework-docs-researcher@10", "deepen:best-practices-researcher@10"]);
  const risks = await deepenRun(deepenArgs(), { scorer: one("risks", "a risk with no owner"), research: () => ({ amendments: [], overflow: [] }) });
  clean(risks);
  assert.deepEqual(labels(risks).filter((l) => /@\d+$/.test(l)), ["deepen:architecture-strategist@10"]);
  const deepened = await deepenRun(deepenArgs({ deepened: true }));
  assert.match(deepened.calls.find((c) => c.opts.label === "deepen:scorer").prompt, /this plan carries a deepened: date, so set strengthened true/);
  assert.match((await deepenRun(deepenArgs())).calls.find((c) => c.opts.label === "deepen:scorer").prompt, /this plan has never been deepened/);
});

test("deepen: an external helper whose outside_ran is left out or false is a coverage hole naming its agent and section; a dead helper is one too", async () => {
  const r = await deepenRun(deepenArgs(), { research: (agent) => (agent === "pattern-recognition-specialist" ? null : { amendments: [], overflow: [], ...(agent === "best-practices-researcher" ? { outside_ran: false } : {}) }) });
  clean(r);
  assert.deepEqual(r.result.summary.holes, [
    { seat: "best-practices-researcher", missed: 'outside research on "Key Technical Decisions" (line 10): it did not report a web search that ran with every cited page fetched' },
    { seat: "pattern-recognition-specialist", missed: 'its research on "Implementation Units" (line 20): the helper never answered' },
  ]);
  const left = await deepenRun(deepenArgs(), { research: () => ({ amendments: [], overflow: [] }) });
  assert.deepEqual(left.result.summary.holes.map((h) => h.seat), ["best-practices-researcher"]);
  // The focus reaches an external helper only when research's external call ran.
  const focused = await deepenRun(deepenArgs({ focus: "the request asks for best practices" }));
  assert.match(focused.calls.find((c) => c.opts.label === "deepen:best-practices-researcher@10").prompt, /on this focus: the request asks for best practices\./);
  assert.ok(!focused.calls.find((c) => c.opts.label === "deepen:architecture-strategist@10").prompt.includes("the request asks for best practices"));
  const unfocused = await deepenRun(deepenArgs());
  assert.match(unfocused.calls.find((c) => c.opts.label === "deepen:best-practices-researcher@10").prompt, /outside sources first, on the section's problems above\./);
});

test("deepen: a premise seat that reads short twice is a coverage hole naming the sections it never confirmed; a dead one is a hole too", async () => {
  let n = 0;
  const r = await deepenRun(deepenArgs(), { premise: () => premiseAnswer([], n++ === 0 ? { last_line_number: 30 } : { last_line_number: 70 }) });
  clean(r);
  assert.deepEqual(labels(r).filter((l) => l.startsWith("deepen:premise")), ["deepen:premise", "deepen:premise (re-run)"]);
  assert.deepEqual(r.result.summary.holes, [{ seat: "premise", missed: 'the premise in the sections it never confirmed reading, after its re-run read short again: "Risks" (line 60)' }]);
  const dead = await deepenRun(deepenArgs(), { premise: null });
  assert.deepEqual(dead.result.summary.holes, [{ seat: "premise", missed: "the plan's premise: the seat never answered" }]);
});

test("deepen: on an update every prompt gets the confirmed findings from goalMoves, and the premise seat's goal_judged is read fail-closed", async () => {
  const update = { update: true, brief: null, lands: "C:/repo/projects/app/docs/plans/export-plan.md", goalMoves: ["the export runs on a cron job that exists in src/cron.js"] };
  const judged = await deepenRun(deepenArgs(update), { premise: premiseAnswer([], { goal_judged: true }) });
  clean(judged);
  assert.equal(judged.result.summary.premise.goalJudged, true);
  for (const c of judged.calls) assert.ok(c.prompt.includes("- the export runs on a cron job that exists in src/cron.js"), `${c.opts.label} did not get goalMoves`);
  const left = await deepenRun(deepenArgs(update));
  assert.equal(left.result.summary.premise.goalJudged, false);
  const none = await deepenRun(deepenArgs({ ...update, goalMoves: [] }), { premise: premiseAnswer([], { goal_judged: false }) });
  assert.equal(none.result.summary.premise.goalJudged, false);
  assert.match(none.calls[0].prompt, /FINDINGS THIS RUN CONFIRMED, which the plan now answers: none\./);
  const fresh = await deepenRun(deepenArgs(), { premise: premiseAnswer([], { goal_judged: true }) });
  assert.equal(fresh.result.summary.premise.goalJudged, null);
  // An update without goalMoves or lands, and a new plan with goalMoves or no brief, are refused.
  for (const [args, pattern] of [
    [deepenArgs({ ...update, goalMoves: undefined }), /args\.goalMoves is required on an update run/],
    [deepenArgs({ update: true, brief: null, goalMoves: [] }), /args\.lands is required on an update run/],
    [deepenArgs({ goalMoves: ["x"] }), /args\.goalMoves is for an update run only/],
    [deepenArgs({ brief: null }), /args\.brief is null only on an update run/],
  ]) {
    const r = await deepenRun(args);
    assert.equal(r.calls.length, 0);
    assert.match(r.error, pattern);
  }
});

test("deepen: stringified args run like object args, identical args give identical calls, dry runs one helper per phase, and missing args start nothing", async () => {
  const a = await deepenRun(deepenArgs());
  const b = await deepenRun(JSON.stringify(deepenArgs()));
  const c = await deepenRun(deepenArgs());
  clean(b);
  assert.deepEqual(b.calls, a.calls);
  assert.deepEqual(c.calls, a.calls);
  assert.deepEqual(b.result, a.result);
  const dry = await deepenRun(deepenArgs({ dry: true }));
  clean(dry);
  assert.deepEqual(labels(dry), ["deepen:scorer", "deepen:architecture-strategist@10", "deepen:verify architecture-strategist@10 #1 angle 1"]);
  assert.equal(dry.result.summary.dry, true);
  const { index, lastLine, ...rest } = DEEPEN_ARGS;
  const missing = await deepenRun(rest);
  assert.equal(missing.calls.length, 0);
  assert.match(missing.error, /^deepen: args\.index is required; args\.lastLine is required$/);
  const past = await deepenRun(deepenArgs({ lastLine: { line: 50, text: "x" } }));
  assert.equal(past.calls.length, 0);
  assert.match(past.error, /heading at line 60, past the plan's last line \(50\)/);
});

// ---------------------------------------------------------------- the check (KTD6 to KTD9)

// The check's args: the deepen's, without deepened and learnings, plus round 1's flags. An extra key
// set to undefined is dropped, so a later round's args can leave round 1's flags out.
const checkArgs = (extra = {}) => {
  const { deepened, learnings, ...base } = DEEPEN_ARGS;
  const a = { ...base, round: 1, highRisk: false, lenses: [], noCode: null, ...extra };
  for (const [k, v] of Object.entries(extra)) if (v === undefined) delete a[k];
  return a;
};
const seatOf = (call) => call.opts.label.replace(/^check:/, "").replace(/ \(re-run\)$/, "");
// A responder for the check, routed by label: `seat(name, call)` answers a seat (a finder object, or
// null for a dead one), `verdict(id, angle, call)` a verifier.
function checkResponder({ seat = () => premiseAnswer(), verdict = () => vote() } = {}) {
  return (c) => {
    const m = c.opts.label.match(/^check:verify (\S+) angle (\d+)$/);
    if (m) return verdict(m[1], Number(m[2]), c);
    return seat(seatOf(c), c);
  };
}
const checkRun = (args, opts) => runWorkflow(script("check"), { args, respond: checkResponder(opts) });
const ROUND1 = ["coherence", "feasibility", "scope-guardian", "adversarial", "premise", "reach", "blast-radius", "test-vacuity"];
const rosterOf = (prompt) => prompt.match(/THE ROSTER AND OWNERSHIP TABLE[^\n]*\n((?:- .*\n?)+)/)[1].trim().split("\n").map((l) => l.match(/^- ([a-z-]+):/)[1]);
const LATER = { highRisk: undefined, lenses: undefined, noCode: undefined };

test("check: round 1 runs coherence, feasibility, scope-guardian, the adversary and our four, each on Opus at xhigh with the same roster; CE seats get their persona paths", async () => {
  const r = await checkRun(checkArgs());
  clean(r);
  assert.deepEqual(r.calls.map((c) => c.opts.label), ROUND1.map((s) => `check:${s}`));
  for (const c of r.calls) {
    assert.equal(c.opts.model, "opus");
    assert.equal(c.opts.effort, "xhigh");
    assert.deepEqual(c.opts.schema, SCHEMAS.finder);
    assert.deepEqual(rosterOf(c.prompt), ROUND1, `${c.opts.label} read another roster`);
  }
  const persona = (seat, file) => assert.ok(r.calls.find((c) => c.opts.label === `check:${seat}`).prompt.includes(`YOUR PERSONA FILE: C:/ce/skills/ce-doc-review/references/personas/${file}`), `${seat} lost its persona`);
  persona("coherence", "coherence-reviewer.md");
  persona("feasibility", "feasibility-reviewer.md");
  persona("scope-guardian", "scope-guardian-reviewer.md");
  persona("adversarial", "adversarial-document-reviewer.md");
  assert.match(r.calls.find((c) => c.opts.label === "check:reach").prompt, /This seat reads no CE file/);
  assert.deepEqual(Object.keys(r.result)[0], "summary");
  const s = r.result.summary;
  assert.equal(s.stage, "check-1");
  assert.deepEqual(s.roster, ROUND1);
  assert.deepEqual(s.adversary, { ran: true, absent: [] });
  assert.deepEqual(s.classes, { premise: { nothing: true }, reach: { nothing: true }, "blast-radius": { nothing: true }, "test-vacuity": { nothing: true } });
  assert.deepEqual(s.holes, []);
  assert.deepEqual(r.phases, ["Check"]);
});

test("check: a high-risk plan runs the panel in place of the adversary, the lens picks join, and a plan with no code skips reach and test vacuity with its reason", async () => {
  const r = await checkRun(checkArgs({ highRisk: true, lenses: ["security", "product"], noCode: "the plan changes prose only" }));
  clean(r);
  const want = ["coherence", "feasibility", "scope-guardian", "adv-sequencing", "adv-settled", "adv-hidden-work", "adv-verification", "product", "security", "premise", "blast-radius"];
  assert.deepEqual(r.calls.map(seatOf), want);
  for (const c of r.calls) assert.deepEqual(rosterOf(c.prompt), want);
  assert.deepEqual(r.result.summary.skipped, [{ seat: "reach", reason: "the plan changes prose only" }, { seat: "test-vacuity", reason: "the plan changes prose only" }]);
  assert.deepEqual(r.result.summary.classes.reach, { skipped: "the plan changes prose only" });
  assert.deepEqual(r.result.summary.classes["test-vacuity"], { skipped: "the plan changes prose only" });
  assert.match(r.calls.find((c) => seatOf(c) === "adv-settled").prompt, /YOUR ASSIGNED ANGLE, hunt only this seam/);
  for (const p of want.filter((x) => x.startsWith("adv-"))) assert.ok(r.calls.find((c) => seatOf(c) === p).prompt.includes("YOUR PERSONA FILE: C:/ce/skills/ce-doc-review/references/personas/adversarial-document-reviewer.md"), `${p} lost its persona`);
  // A missing persona file runs the seat on its own lens.
  const missing = await checkRun(checkArgs({ ce: ceWith(["security"]), lenses: ["security"] }));
  assert.match(missing.calls.find((c) => seatOf(c) === "security").prompt, /CE's persona file for this seat is missing in this run/);
});

test("check: a dead seat is a coverage hole, never no findings; a dead adversary leaves the adversary absent", async () => {
  const r = await checkRun(checkArgs(), { seat: (s) => (s === "blast-radius" || s === "adversarial" ? null : premiseAnswer()) });
  clean(r);
  assert.deepEqual(r.result.summary.holes, [
    { seat: "adversarial", missed: "its class in round 1: the seat never answered" },
    { seat: "blast-radius", missed: "its class in round 1: the seat never answered" },
  ]);
  assert.deepEqual(r.result.summary.classes["blast-radius"], { hole: true });
  assert.deepEqual(r.result.summary.adversary, { ran: false, absent: ["adversarial"] });
  // One dead panel seat leaves the adversary absent too.
  const panel = await checkRun(checkArgs({ highRisk: true }), { seat: (s) => (s === "adv-hidden-work" ? null : premiseAnswer()) });
  assert.deepEqual(panel.result.summary.adversary, { ran: false, absent: ["adv-hidden-work"] });
});

test("check: each finding gets verifiers by its severity, 3 for a P0, 2 for a P2, 1 for a P3; a 1-of-3 split on material is hand-verify", async () => {
  let m = 0;
  const r = await checkRun(checkArgs(), {
    seat: (s) => premiseAnswer(s === "feasibility" ? [finding("a unit cannot be built", "P0"), finding("a step is out of order", "P2"), finding("a typo", "P3")] : []),
    verdict: (id) => (id === "feasibility-1" ? vote({ material: m++ === 0, corrected_severity: "P0" }) : vote({ corrected_severity: "P2" })),
  });
  clean(r);
  const v = r.calls.filter((c) => c.opts.label.startsWith("check:verify")).map((c) => c.opts.label);
  assert.deepEqual(v, ["check:verify feasibility-1 angle 1", "check:verify feasibility-1 angle 2", "check:verify feasibility-1 angle 3", "check:verify feasibility-2 angle 1", "check:verify feasibility-2 angle 2", "check:verify feasibility-3 angle 1"]);
  assert.deepEqual(r.result.summary.handVerify, ["feasibility-1"]);
  assert.deepEqual(r.result.summary.confirmed, ["feasibility-2", "feasibility-3"]);
  assert.equal(r.result.findings[0].votes.length, 3);
  // The verifiers run in the Verify group, each assigned by its own call (pipeline-safe).
  for (const c of r.calls.filter((x) => x.opts.label.startsWith("check:verify"))) assert.equal(c.opts.phase, "Verify");
  for (const c of r.calls.filter((x) => !x.opts.label.startsWith("check:verify"))) assert.equal(c.opts.phase, "Check");
});

test("check: an open P0 or P1 is counted by the voted severity, failing closed on a split; the claimed count comes back beside it", async () => {
  const votesFor = { "coherence-1": ["P1", "P1", "P1"], "coherence-2": ["P2", "P2", "P2"], "coherence-3": ["P1", "P2", "P2"] };
  const r = await checkRun(checkArgs(), {
    seat: (s) => premiseAnswer(s === "coherence" ? [finding("a", "P1"), finding("b", "P1"), finding("c", "P1")] : []),
    verdict: (id, angle) => vote({ corrected_severity: votesFor[id][angle - 1] }),
  });
  clean(r);
  assert.equal(r.result.summary.p0p1, 1);
  assert.equal(r.result.summary.p0p1Claimed, 3);
  let k = 0;
  const split = await checkRun(checkArgs(), { seat: (s) => premiseAnswer(s === "coherence" ? [finding("a", "P1")] : []), verdict: () => [vote({ corrected_severity: "P1" }), vote({ corrected_severity: "P2" }), null][k++] });
  assert.equal(split.result.summary.p0p1, 1, "a one-to-one split on the P1 line is counted as open");
});

test("check: a seat that stops short is re-run once naming what it missed; a second short read keeps its findings and is a hole naming the sections", async () => {
  const short = await checkRun(checkArgs(), { seat: (s, c) => (s === "coherence" ? premiseAnswer([], { last_line_number: c.opts.label.endsWith("(re-run)") ? 80 : 50 }) : premiseAnswer()) });
  clean(short);
  // A stop at 50 sits inside U2 (40 to 59), under Implementation Units (20 to 59): both run past it.
  assert.match(short.calls.find((c) => c.opts.label === "check:coherence (re-run)").prompt, /STOPPED SHORT at line 50, so these sections were not read to their end:\n- line 20: Implementation Units\n- line 40: U2\. Test\n- line 60: Risks\n/);
  assert.deepEqual(short.result.summary.holes, []);
  const twice = await checkRun(checkArgs(), { seat: (s) => (s === "coherence" ? premiseAnswer([finding("a seam", "P2")], { last_line_number: 50 }) : premiseAnswer()) });
  clean(twice);
  assert.deepEqual(twice.result.summary.holes, [{ seat: "coherence", missed: 'the sections it never confirmed reading, after its re-run read short again: "Implementation Units" (line 20), "U2. Test" (line 40), "Risks" (line 60)' }]);
  assert.deepEqual(twice.result.summary.confirmed, ["coherence-1"], "a short reader's findings are still verified");
  // A 39-character quote re-runs by the inventory kind, and the prompt never holds the last line.
  const quote = await checkRun(checkArgs(), { seat: (s, c) => premiseAnswer([], s === "premise" && !c.opts.label.endsWith("(re-run)") ? { last_line_text: D_TEXT.slice(0, 39) } : {}) });
  const p = quote.calls.find((c) => c.opts.label === "check:premise (re-run)").prompt;
  assert.match(p, /FAILED THE RUN'S CHECK OF ITS READING INVENTORY/);
  assert.ok(!p.includes(D_TEXT.slice(0, 30)));
});

test("check: a later round runs exactly the named seats, names its round, and shows each change, an edit with its was; a change at the last line is masked", async () => {
  const changes = [
    { id: "C1", kind: "edit", classes: ["reach"], text: "every export is retried twice", was: "every export is retried once" },
    { id: "C2", kind: "add", classes: ["reach"], text: `${D_TEXT} and the run record` },
    { id: "C3", kind: "delete", classes: [], text: "the old fallback" },
  ];
  const r = await checkRun(checkArgs({ ...LATER, round: 2, seats: ["coherence", "reach"], changes }));
  clean(r);
  assert.deepEqual(r.calls.map(seatOf), ["coherence", "reach"]);
  for (const c of r.calls) {
    assert.match(c.prompt, /THIS IS CHECK ROUND 2\./);
    assert.match(c.prompt, /- edited, was: every export is retried once\n  now: every export is retried twice/);
    assert.match(c.prompt, /- removed: the old fallback/);
    assert.ok(c.prompt.includes("(line 80, the plan's last line: read it in the plan)"));
    assert.ok(!c.prompt.includes(D_TEXT.slice(0, 40)), "a round-2 prompt holds the last line's text");
    assert.deepEqual(rosterOf(c.prompt), ["coherence", "reach"]);
  }
  assert.equal(r.result.summary.adversary, null);
  assert.deepEqual(r.result.summary.classes, { reach: { nothing: true } });
  const three = await checkRun(checkArgs({ ...LATER, round: 3, seats: ["coherence", "premise"], changes: [changes[0]] }));
  clean(three);
  for (const c of three.calls) assert.match(c.prompt, /THIS IS CHECK ROUND 3\.[\s\S]*This round checks one fix alone/);
});

test("check: on an update the confirmed findings reach every seat and the premise seat's goal_judged is read fail-closed", async () => {
  const update = { update: true, brief: null, lands: "C:/repo/projects/app/docs/plans/export-plan.md", goalMoves: ["a population instance in src/export.js"] };
  const judged = await checkRun(checkArgs(update), { seat: (s) => premiseAnswer([], s === "premise" ? { goal_judged: true } : {}) });
  clean(judged);
  assert.equal(judged.result.summary.goalJudged, true);
  for (const c of judged.calls) assert.ok(c.prompt.includes("- a population instance in src/export.js"), c.opts.label);
  assert.equal((await checkRun(checkArgs(update))).result.summary.goalJudged, false);
  assert.equal((await checkRun(checkArgs(update), { seat: (s) => (s === "premise" ? null : premiseAnswer()) })).result.summary.goalJudged, false);
  assert.equal((await checkRun(checkArgs())).result.summary.goalJudged, null);
});

test("check: args out of their round, a roster without coherence or with both adversary forms, and a malformed change are refused before any helper starts", async () => {
  const change = { id: "C1", kind: "add", classes: [], text: "x" };
  for (const [args, pattern] of [
    [checkArgs({ highRisk: undefined }), /args\.highRisk is required in round 1/],
    [checkArgs({ seats: ["coherence"] }), /args\.seats is for rounds 2 and 3 only/],
    [checkArgs({ ...LATER, round: 2, changes: [change] }), /args\.seats is required in round 2/],
    [checkArgs({ ...LATER, round: 2, seats: ["coherence"], changes: [change], highRisk: true }), /args\.highRisk is for round 1 only/],
    [checkArgs({ ...LATER, round: 2, seats: ["reach"], changes: [change] }), /args\.seats has no coherence seat/],
    [checkArgs({ ...LATER, round: 2, seats: ["coherence", "adversarial", "adv-settled"], changes: [change] }), /runs the single adversary and the panel together/],
    [checkArgs({ ...LATER, round: 2, seats: ["coherence"], changes: [{ ...change, was: "y" }] }), /args\.changes: the fold's changes/],
    [checkArgs({ ...LATER, round: 2, seats: ["coherence"], changes: [{ ...change, kind: "edit" }] }), /args\.changes: the fold's changes/],
    [checkArgs({ lenses: ["ux"] }), /args\.lenses: the lens picks/],
    [checkArgs({ round: 4 }), /args\.round: the check round, 1, 2 or 3/],
    [checkArgs({ deepened: false }), /args\.deepened is no field this script takes/],
  ]) {
    const r = await checkRun(args);
    assert.equal(r.calls.length, 0, String(pattern));
    assert.match(r.error, pattern);
  }
});

test("check: stringified args run like object args, identical args give identical calls, and dry runs one helper per phase", async () => {
  const opts = { seat: (s) => premiseAnswer(s === "coherence" ? [finding("a seam", "P1")] : []) };
  const a = await checkRun(checkArgs(), opts);
  const b = await checkRun(JSON.stringify(checkArgs()), opts);
  const c = await checkRun(checkArgs(), opts);
  clean(b);
  assert.deepEqual(b.calls, a.calls);
  assert.deepEqual(c.calls, a.calls);
  assert.deepEqual(b.result, a.result);
  const dry = await checkRun(checkArgs({ dry: true }), opts);
  clean(dry);
  assert.deepEqual(dry.calls.map((x) => x.opts.label), ["check:coherence", "check:verify coherence-1 angle 1"]);
  assert.equal(dry.result.summary.dry, true);
});

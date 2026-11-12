import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INLINABLE, SOURCE_DIRS, checkAll, generate, generateAll, inlinable, topNames, writeAll } from "./make-scripts.mjs";
import { runWorkflow, scriptParts } from "./workflow-stub.mjs";
import { refuterCount } from "./vote-law.mjs";
import { capOf, SIZE_LAWS } from "./caps.mjs";
import { CRITICAL_KINDS } from "./select.mjs";
import { PROMPT_PAGE, promptLensPicks } from "./prompts.mjs";
import { readsMissed } from "./reads.mjs";
import { tmpRoot } from "../bench/testkit.mjs";

const lib = dirname(fileURLToPath(import.meta.url));
const skill = dirname(lib);
const META = "export const meta = {\n  name: 'gen-test',\n  description: 'a source for the generator tests',\n}\n";
const src = (slot, body = "return 1\n") => `${META}\n${slot}\n\n${body}`;
const real = () => Object.fromEntries(INLINABLE.map((n) => [n, readFileSync(join(lib, `${n}.mjs`), "utf8")]));

test("a slot's modules come in, in its order, between marker lines, each declaration's export dropped and every other byte kept, $& $' and $$ included", () => {
  const modules = {
    caps: "// caps head\nexport const A = \"$& and $' and $$\";\nexport function f() {\n  return A;\n}\n",
    "vote-law": "export const B = 2;\n",
  };
  const out = generate(src("// @inline caps vote-law"), "src/x.src.js", modules);
  assert.ok(out.startsWith(META));
  assert.ok(out.includes("// GENERATED from src/x.src.js by lib/make-scripts.mjs: never edit this file. Edit the source or the lib/ modules it inlines (caps, vote-law), then run: node lib/make-scripts.mjs write"));
  const caps = out.indexOf("inlined from lib/caps.mjs");
  const vote = out.indexOf("inlined from lib/vote-law.mjs");
  assert.ok(caps > 0 && vote > caps, "the modules are not in the slot's order");
  assert.ok(out.includes("// caps head\nconst A = \"$& and $' and $$\";\nfunction f() {\n  return A;\n}\n// ---------------------------------------------------------------- end of lib/caps.mjs"));
  assert.ok(out.includes("const B = 2;\n// ---------------------------------------------------------------- end of lib/vote-law.mjs"));
  assert.ok(out.endsWith("\n\nreturn 1\n"));
  assert.doesNotMatch(out, /@inline/);
  assert.equal([...out.matchAll(/^export\b/gm)].length, 1);
});

test("a module that imports, or holds an export the generator cannot drop, is refused, naming it", () => {
  assert.throws(() => inlinable("caps", "// head\nimport { readFileSync } from \"node:fs\";\nexport const A = 1;\n"), /lib\/caps\.mjs imports \(line 2: import \{ readFileSync \} from "node:fs";\)/);
  assert.throws(() => inlinable("caps", "const fs = require(\"node:fs\");\n"), /imports \(line 1/);
  assert.throws(() => inlinable("caps", "const m = await import(\"node:fs\");\n"), /imports \(line 1/);
  assert.throws(() => inlinable("caps", "const A = 1;\nexport { A };\n"), /cannot drop \(line 2: export \{ A \};\)/);
  assert.throws(() => inlinable("caps", "export default 3;\n"), /cannot drop \(line 1/);
  assert.equal(inlinable("caps", "export async function g() {}\nexport class K {}\nexport let n = 1"), "async function g() {}\nclass K {}\nlet n = 1\n");
});

test("a name declared twice across the modules and the source fails, naming both homes", () => {
  assert.throws(() => generate(src("// @inline caps vote-law"), "src/x.src.js", { caps: "export const SAME = 1;\n", "vote-law": "export function SAME() {}\n" }), /SAME is declared in both lib\/caps\.mjs and lib\/vote-law\.mjs/);
  assert.throws(() => generate(src("// @inline caps", "const SAME = 2\n"), "src/x.src.js", { caps: "export const SAME = 1;\n" }), /SAME is declared in both src\/x\.src\.js and lib\/caps\.mjs/);
  assert.throws(() => generate(src("// @inline caps"), "src/x.src.js", { caps: "export const meta = 1;\n" }), /meta is declared in both src\/x\.src\.js and lib\/caps\.mjs/);
  assert.deepEqual(topNames("export const a = 1\nfunction b() {}\n  const nested = 2\nclass C {}\nasync function d() {}\n"), ["a", "b", "C", "d"]);
});

test("a source needs one slot naming known modules once each; the output must be a Workflow script with no clock, no random number and no byte past ASCII", () => {
  const caps = { caps: "export const A = 1;\n" };
  assert.throws(() => generate(`${META}\nreturn 1\n`, "src/x.src.js", caps), /exactly one slot line .* it has 0/);
  assert.throws(() => generate(src("// @inline caps\n// @inline caps"), "src/x.src.js", caps), /it has 2/);
  assert.throws(() => generate(src("// @inline fold"), "src/x.src.js", caps), /inlines fold, which is no inlinable module/);
  assert.throws(() => generate(src("// @inline caps caps"), "src/x.src.js", caps), /names a module twice/);
  assert.throws(() => generate(src("// @inline caps", "return Date.now()\n"), "src/x.src.js", caps), /calls Date\.now\(/);
  assert.throws(() => generate(src("// @inline caps", "const r = Math.random()\n"), "src/x.src.js", caps), /calls Math\.random\(/);
  assert.throws(() => generate(src("// @inline caps", "const d = new Date()\n"), "src/x.src.js", caps), /calls new Date\(\)/);
  assert.throws(() => generate(src("// @inline caps", "const dash = '" + String.fromCharCode(0x2014) + "'\n"), "src/x.src.js", caps), /a byte past ASCII/);
  assert.throws(() => generate(`export const meta = { name: NAME, description: 'd' }\n// @inline caps\n`, "src/x.src.js", caps), /no Workflow script: .*it names NAME/);
  assert.throws(() => generate(src("// @inline caps", "export const x = 1\n"), "src/x.src.js", caps), /has one export, its meta/);
  assert.throws(() => generate(src("// @inline caps"), "src/x.src.js", {}), /no text for lib\/caps\.mjs/);
});

test("line endings come out as \\n whatever the inputs hold, so a CRLF checkout generates the same bytes", () => {
  const modules = { caps: "export const A = 1;\nexport const B = 2;\n" };
  const lfOut = generate(src("// @inline caps"), "src/x.src.js", modules);
  const crlf = (t) => t.replace(/\n/g, "\r\n");
  assert.equal(generate(crlf(src("// @inline caps")), "src/x.src.js", { caps: crlf(modules.caps) }), lfOut);
  assert.doesNotMatch(lfOut, /\r/);
});

test("the five real modules inline into one script, and inside the stub their exports answer as the modules do", async () => {
  const body = `const ctxLaws = SIZE_LAWS
return {
  refuters: [refuterCount('P0'), refuterCount('P2'), refuterCount('P3')],
  cap: capOf('why'),
  page: PROMPT_PAGE,
  critical: CRITICAL_KINDS,
  lensPicks: promptLensPicks({ plan: 'C:/runs/plan.md', personaSelection: null }).prompt,
  law: ctxLaws.finder,
  missed: readsMissed(INDEX, 9, 4),
  args: readsArgs('{"plan": "C:/runs/plan.md"}', { who: 'all', required: { plan: 'path' } }),
}
`;
  const index = [{ line: 1, level: 1, heading: "Plan", own: false }, { line: 2, level: 2, heading: "A", own: true }, { line: 5, level: 2, heading: "B", own: true }];
  const out = generate(src("// @inline vote-law select caps prompts reads", `const INDEX = ${JSON.stringify(index)}\n${body}`), "src/all.src.js", real());
  const r = await runWorkflow(out, { respond: () => null });
  assert.equal(r.error, null);
  assert.deepEqual(r.result, {
    refuters: [refuterCount("P0"), refuterCount("P2"), refuterCount("P3")],
    cap: capOf("why"),
    page: PROMPT_PAGE,
    critical: CRITICAL_KINDS,
    lensPicks: promptLensPicks({ plan: "C:/runs/plan.md", personaSelection: null }).prompt,
    law: SIZE_LAWS.finder,
    missed: readsMissed(index, 9, 4),
    args: { plan: "C:/runs/plan.md" },
  });
  assert.deepEqual(r.result.missed, [{ line: 5, heading: "B" }]);
  assert.deepEqual(INLINABLE, ["vote-law", "select", "caps", "prompts", "reads"]);
});

// A skill folder in a scratch place: the four modules, the given sources, and no generated script.
function skillCopy(t, sources) {
  const root = join(tmpRoot(t), "skill");
  mkdirSync(join(root, "lib"), { recursive: true });
  for (const n of INLINABLE) cpSync(join(lib, `${n}.mjs`), join(root, "lib", `${n}.mjs`));
  for (const [rel, text] of Object.entries(sources)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

test("freshness: a written copy checks clean; a hand edit, a source with no output, an output with no source and a lib/ edit without a regeneration each fail, naming the script", (t) => {
  const root = skillCopy(t, { "src/check.src.js": src("// @inline caps vote-law"), "bench/src/judge.src.js": src("// @inline vote-law") });
  assert.deepEqual(checkAll(root), ["workflows/check.workflow.js is missing: run node lib/make-scripts.mjs write", "bench/judge.workflow.js is missing: run node lib/make-scripts.mjs write"]);
  assert.deepEqual(writeAll(root), { written: ["workflows/check.workflow.js", "bench/judge.workflow.js"], orphans: [] });
  assert.deepEqual(checkAll(root), []);
  assert.deepEqual(SOURCE_DIRS.map((d) => d.out), ["workflows", "bench"]);
  // A hand edit to a committed script.
  const wf = join(root, "workflows", "check.workflow.js");
  const clean = readFileSync(wf, "utf8");
  writeFileSync(wf, clean.replace("return 1", "return 2"));
  assert.deepEqual(checkAll(root), ["workflows/check.workflow.js differs from a fresh generation of src/check.src.js (a hand edit, or a source or lib/ module changed without a regeneration): run node lib/make-scripts.mjs write"]);
  writeFileSync(wf, clean);
  // A lib/ edit with no regeneration.
  const caps = join(root, "lib", "caps.mjs");
  writeFileSync(caps, readFileSync(caps, "utf8").replace("export const PAYLOAD = 6000;", "export const PAYLOAD = 6001;"));
  assert.match(checkAll(root).join("\n"), /^workflows\/check\.workflow\.js differs from a fresh generation of src\/check\.src\.js/);
  assert.equal(checkAll(root).length, 1, "the judge, which does not inline caps, went stale too");
  writeAll(root);
  assert.deepEqual(checkAll(root), []);
  // A new source with no output, and an output with no source.
  writeFileSync(join(root, "src", "deepen.src.js"), src("// @inline select"));
  writeFileSync(join(root, "workflows", "old.workflow.js"), "export const meta = {}\n");
  assert.deepEqual(checkAll(root), ["workflows/deepen.workflow.js is missing: run node lib/make-scripts.mjs write", "workflows/old.workflow.js has no source in src or bench/src"]);
  assert.deepEqual(writeAll(root).orphans, ["workflows/old.workflow.js"]);
});

test("generating from a checkout at another path gives identical bytes", (t) => {
  const root = skillCopy(t, { "src/check.src.js": src("// @inline caps prompts") });
  const other = join(tmpRoot(t), "a", "much", "deeper", "place", "skill");
  cpSync(root, other, { recursive: true });
  assert.deepEqual(generateAll(other).map((m) => m.text), generateAll(root).map((m) => m.text));
  assert.ok(!generateAll(root)[0].text.includes(root.replace(/\\/g, "/")) && !generateAll(root)[0].text.includes(root), "the output names its checkout's path");
});

test("the command writes and checks, exiting 1 on a stale script and 2 on a source it cannot generate", (t) => {
  const root = skillCopy(t, { "src/check.src.js": src("// @inline caps") });
  const run = (...a) => spawnSync(process.execPath, [join(lib, "make-scripts.mjs"), ...a], { encoding: "utf8" });
  const stale = run("check", root);
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /workflows\/check\.workflow\.js is missing/);
  const write = run("write", root);
  assert.equal(write.status, 0, write.stderr);
  assert.match(write.stdout, /^wrote workflows\/check\.workflow\.js$/m);
  assert.equal(run("check", root).status, 0);
  writeFileSync(join(root, "src", "bad.src.js"), `${META}\nreturn 1\n`);
  const bad = run("check", root);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /src[\\/]bad\.src\.js needs exactly one slot line/);
  assert.equal(run("nonsense").status, 2);
});

test("the skill's own generated scripts are fresh, and each one opens as a Workflow script", () => {
  assert.deepEqual(checkAll(skill), []);
  for (const m of generateAll(skill)) {
    assert.ok(existsSync(join(skill, m.out)), m.out);
    assert.ok(scriptParts(readFileSync(join(skill, m.out), "utf8")).meta.name, m.out);
  }
});

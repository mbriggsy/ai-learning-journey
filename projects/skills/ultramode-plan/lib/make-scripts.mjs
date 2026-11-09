#!/usr/bin/env node
// THE SCRIPT GENERATOR (U5 of docs/plans/hybrid-plan-step-plan.md, KTD1). A Workflow script cannot
// read files, so the tested pure modules it runs are inlined into it here, and the generated
// scripts are committed:
//   src/<name>.src.js        -> workflows/<name>.workflow.js
//   bench/src/<name>.src.js  -> bench/<name>.workflow.js
// A source opens with its meta, then names the modules it inlines on one slot line of its own:
//   // @inline vote-law caps prompts
// The slot becomes a generated notice and each module's text, in the order the slot names them,
// between marker lines naming the module, with the `export ` keyword dropped from each top-level
// declaration (a Workflow script has one export, its meta). A module's text goes in through a
// replacement function, so "$&", "$'" and "$$" in it come through byte for byte (make-rescore.mjs's
// rule). Nothing in the output depends on where the checkout sits, and line endings come out as
// "\n" whatever the inputs hold, so two checkouts generate the same bytes.
//
// It refuses, naming what it found: a module that imports anything; a module export it cannot drop
// (export { }, export default); a top-level name declared twice across the modules and the source;
// a source with no slot or two, or a slot naming an unknown module or one twice; and a generated
// script that workflow-stub.mjs's scriptParts refuses (one export, no import, a pure-literal meta),
// that reads the clock or a random number, or that holds a byte past ASCII.
//
// Usage: node lib/make-scripts.mjs <write | check> [skill folder]
//   write   writes every generated script; exit 1 when a generated script has no source
//   check   writes nothing; exit 1 when a committed script is missing, differs from a fresh
//           generation, or has no source (the freshness test runs the same check)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, usage } from "./entry.mjs";
import { scriptParts } from "./workflow-stub.mjs";

// The modules a source may inline: pure, import-free, and reading no clock or random number
// (entry.test.mjs holds them to it).
export const INLINABLE = ["vote-law", "select", "caps", "prompts"];
// Where each source folder's generated scripts go, relative to the skill folder.
export const SOURCE_DIRS = [
  { src: "src", out: "workflows" },
  { src: join("bench", "src"), out: "bench" },
];
const SLOT = /^\/\/ @inline((?: [a-z][a-z-]*)+)[ \t]*$/gm;
const SUFFIX = ".src.js";
const OUT_SUFFIX = ".workflow.js";

const lf = (text) => text.replace(/\r\n/g, "\n");
const posix = (p) => p.split("\\").join("/");

// Every name declared at a text's top level (an unindented const, let, var, function or class),
// the rule entry.test.mjs applies to the inlined modules.
export function topNames(text) {
  return [...text.matchAll(/^(?:export\s+)?(?:const|let|var|function\*?|class|async\s+function\*?)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
}

// A module's text made inlinable: each top-level declaration's `export ` dropped. Refuses an import
// and an export it cannot drop.
export function inlinable(name, text) {
  const body = lf(text);
  const lines = body.split("\n");
  lines.forEach((l, i) => {
    if (/^\s*import\b/.test(l) || /\bimport\s*\(/.test(l) || /\brequire\s*\(/.test(l)) throw new Error(`make-scripts: lib/${name}.mjs imports (line ${i + 1}: ${l.trim()}): an inlined module imports nothing, since a Workflow script cannot`);
  });
  const dropped = body.replace(/^export (?=(?:const|let|var|function\*?|class|async\s+function\*?)\s)/gm, () => "");
  const left = dropped.split("\n").findIndex((l) => /^\s*export\b/.test(l));
  if (left >= 0) throw new Error(`make-scripts: lib/${name}.mjs has an export the generator cannot drop (line ${left + 1}: ${dropped.split("\n")[left].trim()}): export each declaration where it is declared`);
  return dropped.endsWith("\n") ? dropped : `${dropped}\n`;
}

const begin = (name) => `// ---------------------------------------------------------------- inlined from lib/${name}.mjs (edit the module, then run: node lib/make-scripts.mjs write)`;
const end = (name) => `// ---------------------------------------------------------------- end of lib/${name}.mjs`;

// The generated text of one source. `modules` maps a module name to its text (read from lib/ when
// left out); `srcRel` is the source's path in the skill folder, for the notice.
export function generate(srcText, srcRel, modules) {
  const source = lf(srcText);
  const slots = [...source.matchAll(SLOT)];
  if (slots.length !== 1) throw new Error(`make-scripts: ${srcRel} needs exactly one slot line ("// @inline <module> ..."); it has ${slots.length}`);
  const names = slots[0][1].trim().split(" ");
  for (const n of names) if (!INLINABLE.includes(n)) throw new Error(`make-scripts: ${srcRel} inlines ${n}, which is no inlinable module (one of: ${INLINABLE.join(", ")})`);
  if (new Set(names).size !== names.length) throw new Error(`make-scripts: ${srcRel} names a module twice in its slot`);
  // Every top-level name, with where it was declared, so a clash names both homes.
  const homes = new Map();
  const claim = (n, home) => {
    if (homes.has(n)) throw new Error(`make-scripts: ${n} is declared in both ${homes.get(n)} and ${home}`);
    homes.set(n, home);
  };
  // The source's own names, its meta among them.
  for (const n of topNames(source.replace(SLOT, ""))) claim(n, srcRel);
  const blocks = names.map((n) => {
    if (typeof modules?.[n] !== "string") throw new Error(`make-scripts: no text for lib/${n}.mjs`);
    const text = inlinable(n, modules[n]);
    for (const t of topNames(text)) claim(t, `lib/${n}.mjs`);
    return `${begin(n)}\n${text}${end(n)}`;
  });
  const notice = `// GENERATED from ${posix(srcRel)} by lib/make-scripts.mjs: never edit this file. Edit the source or the lib/ modules it inlines (${names.join(", ")}), then run: node lib/make-scripts.mjs write`;
  let out = source.replace(SLOT, () => [notice, ...blocks].join("\n\n"));
  if (!out.endsWith("\n")) out += "\n";
  check(out, srcRel);
  return out;
}

// What every generated script must be: what scriptParts accepts, free of the clock and of random
// numbers, and ASCII.
function check(out, srcRel) {
  try {
    scriptParts(out);
  } catch (e) {
    throw new Error(`make-scripts: the script generated from ${srcRel} is no Workflow script: ${e.message}`);
  }
  const clock = out.match(/\bDate\.now\s*\(|\bMath\.random\s*\(|\bnew Date\s*\(\s*\)/);
  if (clock) throw new Error(`make-scripts: the script generated from ${srcRel} calls ${clock[0]}, which the runtime refuses (it would break resume)`);
  const at = [...out].findIndex((c) => c.codePointAt(0) > 127);
  if (at >= 0) throw new Error(`make-scripts: the script generated from ${srcRel} holds a byte past ASCII (${JSON.stringify([...out][at])}), so a re-save in another encoding would change it`);
}

const readModules = (root) => Object.fromEntries(INLINABLE.map((n) => [n, readFileSync(join(root, "lib", `${n}.mjs`), "utf8")]));

// Every source under the skill folder and the script it generates, as
// { src, out, text } with skill-relative paths.
export function generateAll(root) {
  const modules = readModules(root);
  const out = [];
  for (const d of SOURCE_DIRS) {
    const dir = join(root, d.src);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(SUFFIX)).sort()) {
      const src = join(d.src, f);
      out.push({ src, out: join(d.out, f.slice(0, -SUFFIX.length) + OUT_SUFFIX), text: generate(readFileSync(join(root, src), "utf8"), src, modules) });
    }
  }
  return out;
}

// The generated scripts on disk that no source makes.
function orphans(root, made) {
  const have = new Set(made.map((m) => m.out));
  const out = [];
  for (const d of SOURCE_DIRS) {
    const dir = join(root, d.out);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(OUT_SUFFIX))) if (!have.has(join(d.out, f))) out.push(join(d.out, f));
  }
  return out.sort();
}

// The freshness check: every problem with the committed scripts, an empty list when they are fresh.
export function checkAll(root) {
  const made = generateAll(root);
  const problems = [];
  for (const m of made) {
    const at = join(root, m.out);
    if (!existsSync(at)) problems.push(`${posix(m.out)} is missing: run node lib/make-scripts.mjs write`);
    else if (readFileSync(at, "utf8") !== m.text) problems.push(`${posix(m.out)} differs from a fresh generation of ${posix(m.src)} (a hand edit, or a source or lib/ module changed without a regeneration): run node lib/make-scripts.mjs write`);
  }
  for (const o of orphans(root, made)) problems.push(`${posix(o)} has no source in ${SOURCE_DIRS.map((d) => posix(d.src)).join(" or ")}`);
  return problems;
}

export function writeAll(root) {
  const made = generateAll(root);
  for (const m of made) {
    mkdirSync(dirname(join(root, m.out)), { recursive: true });
    writeFileSync(join(root, m.out), m.text);
  }
  return { written: made.map((m) => posix(m.out)), orphans: orphans(root, made).map(posix) };
}

if (isMain(import.meta.url)) {
  const [cmd, rootArg] = process.argv.slice(2);
  if (cmd !== "write" && cmd !== "check") usage("node lib/make-scripts.mjs <write | check> [skill folder]");
  const root = rootArg ?? dirname(dirname(fileURLToPath(import.meta.url)));
  try {
    if (cmd === "write") {
      const r = writeAll(root);
      for (const w of r.written) console.log(`wrote ${w}`);
      for (const o of r.orphans) console.error(`${o} has no source`);
      process.exit(r.orphans.length ? 1 : 0);
    }
    const problems = checkAll(root);
    for (const p of problems) console.error(p);
    if (!problems.length) console.log("every generated script is fresh");
    process.exit(problems.length ? 1 : 0);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}

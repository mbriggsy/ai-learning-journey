import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lastTextLine, readMarkdown, sectionIndex } from "./markdown.mjs";

const REAL = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "plans", "hybrid-plan-step-plan.md"), "utf8");
const proseOf = (text) => readMarkdown(text).prose.map((p) => p.line);

test("a fence closes only on its own character, at least as long, with nothing after it", () => {
  assert.deepEqual(proseOf("a\n```\nb\n```\nc"), ["a", "c"]);
  // A tilde block showing a backtick line, and the reverse.
  assert.deepEqual(proseOf("a\n~~~\n```\n~~~\nb"), ["a", "b"]);
  assert.deepEqual(proseOf("a\n```\n~~~\n```\nb"), ["a", "b"]);
  // A four-backtick block holding a three-backtick one.
  assert.deepEqual(proseOf("a\n````md\n```js\nx\n```\n````\nb"), ["a", "b"]);
  // A closing line shorter than its opener, or with text after it, closes nothing.
  assert.deepEqual(proseOf("a\n````\n```\nb\n````\nc"), ["a", "c"]);
  assert.deepEqual(proseOf("a\n```\n``` x\nb\n```\nc"), ["a", "c"]);
  // An indented fence inside a list item counts, at any depth.
  assert.deepEqual(proseOf("- item\n      ```\n      # code\n      ```\n# Real"), ["- item", "# Real"]);
  // A backtick in a backtick fence's info string makes it no fence; a tilde fence may hold one.
  assert.deepEqual(proseOf("``` a`b\nc"), ["``` a`b", "c"]);
  assert.deepEqual(proseOf("~~~ a`b\nc\n~~~\nd"), ["d"]);
});

test("a fence still open at the end hides the rest and is reported by its line", () => {
  const md = readMarkdown("a\n\n```text\n# hidden\n");
  assert.equal(md.openFence, 3);
  assert.deepEqual(md.prose.map((p) => p.line), ["a", ""]);
  assert.equal(readMarkdown("a\n```\nb\n```\n").openFence, null);
});

test("YAML front matter is skipped; a first --- that opens no YAML block is prose", () => {
  const fm = readMarkdown("---\ntitle: x\nlist:\n  - one\n# a comment\n\n---\n# Plan");
  assert.equal(fm.frontMatterLines, 7);
  assert.deepEqual(fm.prose.map((p) => [p.n, p.line]), [[8, "# Plan"]]);
  assert.equal(readMarkdown("---\ntitle: x\n...\n# P").frontMatterLines, 3);
  // Never closed, or a line that is no YAML: no front matter.
  assert.equal(readMarkdown("---\ntitle: x\n# Plan").frontMatterLines, 0);
  assert.equal(readMarkdown("---\nA paragraph.\n---\n# P").frontMatterLines, 0);
  assert.equal(readMarkdown("# P\n---\ntitle: x\n---").frontMatterLines, 0, "only a first line opens front matter");
});

test("the section index lists ATX headings outside fences and front matter, numbered from the file's first line", () => {
  const text = "---\ntitle: x\n---\n# Plan #\n\n## Goal\n```sh\n# comment\n```\n    ### deep\n####### seven\n#hashtag\n### U1. One ###\n#\n";
  assert.deepEqual(sectionIndex(text), [
    { line: 4, level: 1, heading: "Plan" },
    { line: 6, level: 2, heading: "Goal" },
    { line: 13, level: 3, heading: "U1. One" },
    { line: 14, level: 1, heading: "" },
  ]);
  // CRLF reads the same.
  assert.deepEqual(sectionIndex(text.split("\n").join("\r\n")), sectionIndex(text));
});

test("the hybrid plan's own index: one title, its six parts, and none of its fenced lines", () => {
  const index = sectionIndex(REAL);
  assert.deepEqual(index[0], { line: 11, level: 1, heading: "Hybrid Plan Step - Plan" });
  assert.equal(index.filter((h) => h.level === 1).length, 1);
  assert.deepEqual(index.filter((h) => h.level === 2).map((h) => h.heading), ["Goal Capsule", "Product Contract", "Planning Contract", "Implementation Units", "Verification Contract", "Definition of Done"]);
  const lines = REAL.split(/\r?\n/);
  for (const h of index) assert.match(lines[h.line - 1], /^#{1,6} /, `line ${h.line}`);
  assert.equal(readMarkdown(REAL).openFence, null);
});

test("the last line with text, by its number, and null for a plan with none", () => {
  assert.deepEqual(lastTextLine("# P\nlast line  \n\n  \n"), { line: 2, text: "last line  " });
  assert.deepEqual(lastTextLine("# P\r\nend\r\n"), { line: 2, text: "end" });
  assert.equal(lastTextLine("\n \n"), null);
  const last = lastTextLine(REAL);
  assert.equal(REAL.split(/\r?\n/)[last.line - 1], last.text);
});

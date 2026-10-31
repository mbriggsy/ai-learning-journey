// Tests for brief's corpus script: the card, --list and --headers.
// Run: node --test "projects/skills/distill-and-brief/brief/**/*.test.mjs"
// (quoted, so Node expands the glob; a bare folder argument fails on Node 24).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, "corpus.next.mjs"); // U7 points this at corpus.mjs when the candidate lands
const BACK_NINE = join(here, "..", "..", "..", "the-back-nine", "docs", "insights");
const PAGE_BUDGET = 20000;

const run = (args, cwd = here) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

const scratch = mkdtempSync(join(tmpdir(), "corpus-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
let folders = 0;
function folder(files) {
  const dir = join(scratch, `f${++folders}`);
  mkdirSync(dir);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}
const lesson = (fields, body = "## Problem\n\nx\n") =>
  `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n${body}`;
const chars = (s) => [...s].length;
const listLines = (out) => out.split("\n").slice(1).filter(Boolean);

test("--list prints the applies_when situations where a lesson has them, and the title where it has none", () => {
  const dir = folder({
    "001-with-line.md": lesson({ title: "A timer fired late", tags: "[timer]", applies_when: "[adding a server-side timer, debouncing a server action]" }),
    "002-no-line.md": lesson({ title: "A pipe stalled the child", tags: "[node]" }),
    "003-quoted-title.md": lesson({ title: '"`contain: layout` traps fixed descendants"', tags: "[css]" }),
    "004-empty-line.md": lesson({ title: "An empty list falls back", tags: "[x]", applies_when: "[]" }),
  });
  const out = run(["--list", dir]);
  assert.match(out.split("\n")[0], /4 lessons, 1 with applies_when\. Page 1 of 1\./);
  assert.deepEqual(listLines(out), [
    "001 [adding a server-side timer, debouncing a server action]",
    "002 A pipe stalled the child",
    "003 `contain: layout` traps fixed descendants",
    "004 An empty list falls back",
  ]);
});

test("--list shows a lesson without frontmatter by its first heading, without repeating its number", () => {
  const dir = folder({
    "017-no-header.md": "# 017 — A build stamp was printed under a judgment label\n\nbody\n",
    "018-no-heading.md": "just text\n",
  });
  assert.deepEqual(listLines(run(["--list", dir])), [
    "017 A build stamp was printed under a judgment label",
    "018 no heading",
  ]);
});

test("a 300-character applies_when is cut to 200 characters with a marker", () => {
  const long = Array.from({ length: 10 }, (_, i) => `situation number ${i} with padding words`).join(", ");
  assert.ok(chars(long) > 300);
  const dir = folder({ "005-long.md": lesson({ title: "t", tags: "[x]", applies_when: `[${long}]` }) });
  const [line] = listLines(run(["--list", dir]));
  assert.equal(chars(line), 200);
  assert.ok(line.endsWith("…"));
  assert.ok(line.startsWith("005 [situation number 0"));
});

test("a listing past the page budget splits into pages that each name page N of M, and --page past the last says so", () => {
  const files = {};
  for (let i = 1; i <= 300; i++) {
    const n = String(i).padStart(3, "0");
    files[`${n}-l.md`] = lesson({ title: `Lesson ${n} ${"word ".repeat(30).trim()}`, tags: "[x]" });
  }
  const dir = folder(files);
  const first = run(["--list", dir]);
  const m = Number(first.match(/Page 1 of (\d+);/)[1]);
  assert.ok(m >= 2, `expected several pages, got ${m}`);
  const seen = [];
  for (let p = 1; p <= m; p++) {
    const out = run(["--list", dir, "--page", String(p)]);
    assert.ok(Buffer.byteLength(out, "utf8") <= PAGE_BUDGET, `page ${p} is ${Buffer.byteLength(out, "utf8")} bytes`);
    assert.match(out.split("\n")[0], new RegExp(`Page ${p} of ${m}; read every page \\(--page 1 to --page ${m}\\)`));
    seen.push(...listLines(out).map((l) => l.slice(0, 3)));
  }
  assert.equal(seen.length, 300);
  assert.equal(new Set(seen).size, 300);
  assert.match(run(["--list", dir, "--page", String(m + 1)]), new RegExp(`There is no page ${m + 1} of this listing: it has ${m} pages`));
});

test("a CRLF lesson and a lesson with a BOM list and print the same as an LF one", () => {
  const lf = lesson({ title: "Same title", date: "2026-10-31", tags: "[a, b]", applies_when: "[adding a thing, changing a thing]" });
  const dirs = [
    folder({ "001-x.md": lf }),
    folder({ "001-x.md": lf.replace(/\n/g, "\r\n") }),
    folder({ "001-x.md": "﻿" + lf }),
  ];
  const lists = dirs.map((d) => listLines(run(["--list", d])));
  const heads = dirs.map((d) => run(["--headers", d, "001"]).split("\n").slice(1).join("\n"));
  assert.deepEqual(lists[1], lists[0]);
  assert.deepEqual(lists[2], lists[0]);
  assert.equal(heads[1], heads[0]);
  assert.equal(heads[2], heads[0]);
  assert.ok(!heads[1].includes("\r"));
});

test("--headers prints the named lessons' six header fields, applies_when included, and names numbers it cannot find", () => {
  const dir = folder({
    "007-a.md": lesson({ title: "Seven", date: "2026-06-06", phase: "P1", modules: "[src/engine/taxOverlay.ts]", tags: "[tax]", status: "done", applies_when: "[changing the tax overlay, adding a tax rule's input]" }),
    "019-b.md": lesson({ title: "Nineteen", date: "2026-06-10", tags: "[verify]" }),
  });
  const out = run(["--headers", dir, "19,007,999"]);
  assert.match(out, /2 of the 3 lessons asked for\. Not found: 999\. Page 1 of 1\./);
  assert.ok(out.includes("019\ntitle: Nineteen\ndate: 2026-06-10\ntags: [verify]"));
  assert.ok(out.includes("007\ntitle: Seven\ndate: 2026-06-06\nphase: P1\nmodules: [src/engine/taxOverlay.ts]\ntags: [tax]\napplies_when: [changing the tax overlay, adding a tax rule's input]"));
  assert.ok(!out.includes("status:"), "only the six header fields print");
  assert.ok(!out.includes("## Problem"), "never a body");
});

test("--headers with no numbers, and --page with no number, say what they need", () => {
  const dir = folder({ "001-a.md": lesson({ title: "a", tags: "[x]" }) });
  assert.match(run(["--headers", dir]), /--headers needs the lessons' numbers/);
  assert.match(run(["--list", dir, "--page"]), /--page needs a page number, got nothing/);
});

test("an unknown folder keeps today's fallback line in every mode", () => {
  const missing = join(scratch, "no-such-folder");
  for (const args of [[missing], ["--list", missing], ["--headers", missing, "001"]]) {
    assert.match(run(args), /^No insights directory at .*no-such-folder.*check the path the card named\.\n$/);
  }
  const empty = folder({});
  assert.match(run(["--list", empty]), /^No insights in .* yet\./);
});

test("the Back Nine's real folder: --headers of every lesson pages under the budget, each lesson on exactly one page, no path", { skip: !existsSync(BACK_NINE) && "no Back Nine checkout" }, () => {
  const names = readdirSync(BACK_NINE).filter((n) => /^\d+[-_].*\.md$/.test(n));
  const ids = names.map((n) => n.match(/^(\d+)/)[1]);
  assert.ok(ids.length >= 148);
  const first = run(["--headers", BACK_NINE, ids.join(",")]);
  const m = Number(first.match(/Page 1 of (\d+)/)[1]);
  const seen = [];
  for (let p = 1; p <= m; p++) {
    const out = run(["--headers", BACK_NINE, ids.join(","), "--page", String(p)]);
    assert.ok(Buffer.byteLength(out, "utf8") <= PAGE_BUDGET, `page ${p} is ${Buffer.byteLength(out, "utf8")} bytes`);
    assert.ok(chars(out) < PAGE_BUDGET);
    // A modules: line may name a .md file the lesson touched; what must never print is a lesson's own file.
    const leaked = names.find((n) => out.includes(n) || out.includes(n.replace(/\.md$/, "")));
    assert.equal(leaked, undefined, `page ${p} prints a lesson's path`);
    seen.push(...out.split("\n").filter((l) => /^\d{3}$/.test(l)));
  }
  assert.deepEqual([...seen].sort(), [...ids].sort());
});

test("the Back Nine's real folder: the default card stays under its 3,800-byte cap", { skip: !existsSync(BACK_NINE) && "no Back Nine checkout" }, () => {
  const out = run([BACK_NINE]);
  assert.ok(Buffer.byteLength(out.trimEnd(), "utf8") <= 3800, `card is ${Buffer.byteLength(out, "utf8")} bytes`);
  assert.match(out, /^Corpus: .* has \d+ insights/);
});

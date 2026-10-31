// Tests for the re-score harness (U4 and U6 of docs/plans/brief-recall-fix-plan.md).
// Run: node --test "projects/skills/distill-and-brief/brief/**/*.test.mjs"

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyFill, blobSha } from "./fills.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..", "..", "..");
const CORPUS = join(here, "..", "corpus.next.mjs");
const FILLS = JSON.parse(readFileSync(join(here, "..", "results", "header-fills-2026-10-31.json"), "utf8"));

const scratch = mkdtempSync(join(tmpdir(), "bench-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

const headings = (text) => text.split(/\r?\n/).filter((l) => /^## (Problem|Root Cause|Fix|Key Insight)\b/.test(l));

test("there are 19 fills: tags for the Back Nine's 10 empty-tag lessons, headers for Feud's 9", () => {
  const b9 = FILLS.fills.filter((f) => f.lesson.startsWith("b9-")).map((f) => f.lesson.slice(3));
  const ff = FILLS.fills.filter((f) => f.lesson.startsWith("ff-")).map((f) => f.lesson.slice(3));
  assert.deepEqual(b9, ["008", "062", "063", "064", "065", "069", "072", "091", "097", "098"]);
  assert.deepEqual(ff, ["017", "025", "026", "027", "028", "031", "032", "033", "034"]);
});

test("applied to its own blob, every fill leaves a frontmatter corpus.mjs reads, with tags, and no ## heading changed", () => {
  const byFolder = new Map();
  for (const f of FILLS.fills) {
    const original = readFileSync(join(REPO, f.folder, f.file), "utf8");
    if (blobSha(original) !== f.blob) continue; // the lesson moved on since; the copy builder refuses it too
    const filled = applyFill(original, f);
    assert.deepEqual(headings(filled), headings(original), `${f.lesson} changed a heading`);
    const dir = join(scratch, f.lesson.slice(0, 2));
    if (!byFolder.has(dir)) mkdirSync(dir, { recursive: true });
    byFolder.set(dir, (byFolder.get(dir) || 0) + 1);
    writeFileSync(join(dir, f.file), filled);
  }
  assert.ok(byFolder.size > 0, "no fill matched the working tree");
  for (const dir of byFolder.keys()) {
    const r = spawnSync(process.execPath, [CORPUS, dir], { encoding: "utf8" });
    assert.match(r.stdout, /Empty tags, so search their title and filename: none\./);
    assert.match(r.stdout, /No frontmatter, so search their filename, H1 and body: none\./);
  }
});

test("Feud 025's bare date:, modules: and status: body lines move into its header and leave the body", () => {
  const f = FILLS.fills.find((x) => x.lesson === "ff-025");
  const original = readFileSync(join(REPO, f.folder, f.file), "utf8");
  if (blobSha(original) !== f.blob) return;
  const filled = applyFill(original, f);
  const [, fm, body] = filled.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  assert.match(fm, /^date: 2026-08-14$/m);
  assert.match(fm, /^modules: \[scripts\/sleeper_draft_console\.js, docs\/draft-day-runbook\.md\]$/m);
  assert.match(fm, /^status: RESOLVED 2026-08-15 — the cause was NEITHER candidate below\./m);
  assert.ok(!/^(date|modules|status):/m.test(body));
  assert.ok(body.startsWith("# 025 — The click reported success and drafted nobody\n\n> ## "));
});

test("a fill refuses any version of the lesson but the blob it was written from", () => {
  const f = FILLS.fills[0];
  assert.throws(() => applyFill("---\ntitle: x\ntags: []\n---\n", f), /the fill was written from/);
});

test("a fill keeps a CRLF lesson's line endings and a BOM", () => {
  const lf = "---\ntitle: t\ntags: []  # empty\n---\n\n## Problem\n";
  for (const text of [lf.replace(/\n/g, "\r\n"), "﻿" + lf]) {
    const out = applyFill(text, { lesson: "x", blob: blobSha(text), tags: "tags: [a, b]" });
    assert.equal(out, text.replace("tags: []  # empty", "tags: [a, b]"));
  }
  const headless = "# 001 — T\r\n\r\nbody\r\n";
  const out = applyFill(headless, { lesson: "y", blob: blobSha(headless), header: ["title: T", "tags: [a]"] });
  assert.equal(out, "---\r\ntitle: T\r\ntags: [a]\r\n---\r\n\r\n# 001 — T\r\n\r\nbody\r\n");
});

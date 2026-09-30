#!/usr/bin/env node
// /brief's corpus card: a size-capped map of docs/insights/ that the skill
// injects so the model searches with the words the corpus actually uses. It
// prints counts, frontmatter-field coverage, the entries a frontmatter grep
// cannot see (empty tags, no frontmatter), and the tag vocabulary by count.
// It NEVER prints an insight body. The old injection printed the first 40 body
// lines of every insight (~370 KB for 139), and Claude Code replaced that with
// a 2 KB preview holding insight 001 alone: every brief silently recalled nothing.
//
// Why a script and not an inline shell pipeline (both observed in the
// the-back-nine transcripts, Claude Code 2.1.283, 2026-09-28):
// 1. The skill body is argument-substituted before any command runs, and that
//    covers positional dollar-digit tokens as well as the full-arguments token.
//    /distill's inline awk field reference was rewritten with the user's words.
// 2. Since Claude Code ~2.1.274 EVERY `!` injection, even a single `node "<path>"`
//    like /window's, is handed back to the model to run ("[run this first, exactly
//    as written...]") instead of running at load; one short command keeps it exact.
//
// Usage: node corpus.mjs [insights-dir]   (default: ./docs/insights)

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// THE SIZE CONTRACT: the whole card stays under 4 KB at any corpus size. Tags
// are added most-used first until the next one would cross CAP, so growth
// trims the vocabulary tail and never the header.
const CAP = 3800;
const MIN_TAG_USES = 2; // a tag used once is not vocabulary; a grep still finds it

const MAX_IDS = 40; // an id list longer than this prints a count, keeping the header bounded
const idList = (ids) =>
  ids.length === 0 ? "none" : ids.slice(0, MAX_IDS).join(" ") + (ids.length > MAX_IDS ? ` (+${ids.length - MAX_IDS} more)` : "");

const isInsight = (name) => /^\d+[-_].*\.md$/i.test(name);
const idOf = (name) => name.match(/^(\d+)/)[1];

function frontmatter(text) {
  const lines = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return null;
  const fm = {};
  let key = null;
  for (const l of lines.slice(1, end)) {
    const field = l.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (field) {
      key = field[1];
      fm[key] = field[2];
      continue;
    }
    const item = l.match(/^\s*-\s+(.*)$/); // a YAML block-list continuation
    if (item && key) fm[key] = (fm[key] ? fm[key] + ", " : "") + item[1];
  }
  return fm;
}

// `[a, b]`, `[]  # comment`, or a folded block list, to an array of strings.
function listOf(value) {
  if (value == null) return [];
  let s = value.trim();
  const inline = s.match(/^\[(.*)\]/);
  s = inline ? inline[1] : s.replace(/\s+#.*$/, "");
  return s
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function card(dir, budget = CAP) {
  const names = readdirSync(dir).filter(isInsight);
  names.sort((a, b) => Number(idOf(a)) - Number(idOf(b)));
  if (names.length === 0) {
    return `No insights in ${dir}/ yet. Use /distill after a non-obvious fix to start the knowledge base.`;
  }

  const fields = new Map();
  const tagUses = new Map(); // lowercased tag -> { spelling, count }
  const emptyTags = [];
  const noFrontmatter = [];
  let newestDate = "";
  for (const name of names) {
    const fm = frontmatter(readFileSync(join(dir, name), "utf8"));
    if (!fm) {
      noFrontmatter.push(idOf(name));
      continue;
    }
    for (const k of Object.keys(fm)) fields.set(k, (fields.get(k) || 0) + 1);
    const tags = listOf(fm.tags);
    if (tags.length === 0) emptyTags.push(idOf(name));
    for (const t of new Set(tags)) {
      const k = t.toLowerCase();
      const seen = tagUses.get(k);
      if (seen) seen.count += 1;
      else tagUses.set(k, { spelling: t, count: 1 });
    }
    if (name === names[names.length - 1]) newestDate = (fm.date || "").trim();
  }

  const first = idOf(names[0]);
  const last = idOf(names[names.length - 1]);
  const coverage = [...fields.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, n]) => `${k} ${n}`)
    .join(" · ");
  const vocab = [...tagUses.values()].sort(
    (a, b) => b.count - a.count || a.spelling.localeCompare(b.spelling),
  );
  const repeated = vocab.filter((t) => t.count >= MIN_TAG_USES);

  const head = [
    `Corpus: ${dir}/ has ${names.length} insight${names.length === 1 ? "" : "s"} (${first} to ${last}; newest ${last}${newestDate ? ", " + newestDate : ""}).`,
    `Frontmatter fields (files carrying each): ${coverage || "none"}.`,
    `Empty tags, so search their title and filename: ${idList(emptyTags)}.`,
    `No frontmatter, so search their filename, H1 and body: ${idList(noFrontmatter)}.`,
    `Tags: ${vocab.length} distinct, ${repeated.length} used ${MIN_TAG_USES}+ times. Most used first (name count):`,
  ].join("\n");

  let body = "";
  let shown = 0;
  const tailFor = (n) => {
    const hidden = repeated.length - n;
    const once = vocab.length - repeated.length;
    return `\n(${hidden > 0 ? `${hidden} more used ${MIN_TAG_USES}+ times and ` : ""}${once} used once, not shown. Grep ^tags: for any term.)`;
  };
  for (const t of repeated) {
    const piece = `${shown ? ", " : ""}${t.spelling} ${t.count}`;
    const next = `${head}\n${body}${piece}${tailFor(shown + 1)}`;
    if (Buffer.byteLength(next, "utf8") > budget) break;
    body += piece;
    shown += 1;
  }
  return `${head}\n${body || "(none repeated)"}${tailFor(shown)}`;
}

// Corpora one level down (e.g. a session opened at the monorepo root, whose own
// docs/insights is not the project the topic belongs to).
function corporaBelow(cwd) {
  const found = [];
  for (const parent of ["projects", "."]) {
    const base = join(cwd, parent);
    if (!existsSync(base) || !statSync(base).isDirectory()) continue;
    for (const child of readdirSync(base)) {
      const d = join(parent, child, "docs", "insights");
      const abs = join(cwd, d);
      if (existsSync(abs) && statSync(abs).isDirectory()) {
        found.push(`${d.replace(/\\/g, "/")} (${readdirSync(abs).filter(isInsight).length})`);
      }
    }
  }
  return found;
}

const USE_OTHER = `Brief against the one the topic belongs to: node "$HOME/.claude/skills/brief/corpus.mjs" <that dir>, then search that path.`;

try {
  const cwd = process.cwd();
  const dir = (process.argv[2] || "docs/insights").replace(/[\\/]+$/, "");
  const below = process.argv[2] ? [] : corporaBelow(cwd);
  if (existsSync(join(cwd, dir)) || existsSync(dir)) {
    const other = below.length ? `\nOther corpora below this directory: ${below.join(", ")}. ${USE_OTHER}` : "";
    console.log(card(dir, CAP - Buffer.byteLength(other, "utf8")) + other);
  } else if (process.argv[2]) {
    // An explicit dir that does not exist is a mistyped path (usually copied from
    // USE_OTHER), not a missing knowledge base, so name the path and do not suggest /distill.
    console.log(`No insights directory at ${dir} (resolved from ${cwd}); check the path the card named.`);
  } else {
    console.log(below.length
      ? `No docs/insights/ in ${cwd}. Corpora one level down: ${below.join(", ")}. ${USE_OTHER}`
      : `No docs/insights/ in ${cwd}. Use /distill after a non-obvious fix to start the knowledge base.`);
  }
} catch (err) {
  console.log(`corpus card failed (${err && err.message}); search docs/insights/*.md with Grep directly.`);
}

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
//        node corpus.mjs --list [insights-dir] [--page N]
//        node corpus.mjs --headers [insights-dir] <NNN,NNN,...> [--page N]
//
// --list prints one line per lesson: its number, then its applies_when
// situations in brackets, or its title where it has none. --headers prints the
// named lessons' title, date, phase, modules, tags and applies_when lines.
// Neither prints a path or a body. Both page at PAGE_BUDGET and name "page N of
// M" on every page, because Claude Code shows only a 2 KB preview of a tool
// result past about 30,000 characters, and Grep stops at 250 lines unless told
// otherwise: a Grep of the Back Nine's 148 titles with paths was about 49 KB,
// and of their five header fields 149,565 characters, so a long Grep print
// silently lost most of the corpus.

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

// THE PAGE CONTRACT for --list and --headers: every page, its own header line
// included, stays at or under PAGE_BUDGET bytes of UTF-8. Bytes are never
// fewer than characters, so a page is also under 20,000 characters, which
// leaves a third of the ~30,000-character preview limit to spare.
const PAGE_BUDGET = 20000;
const LIST_LINE_MAX = 200; // a --list line, number included, in characters
const HEADER_LINE_MAX = 1000; // a --headers field line; the Back Nine's longest (a title) is 518
const HEADER_FIELDS = ["title", "date", "phase", "modules", "tags", "applies_when"];
const CUT = "…"; // marks a line cut to its maximum

const cut = (s, max) => ([...s].length <= max ? s : [...s].slice(0, max - 1).join("") + CUT);
const unquote = (s) => s.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

// The lessons of a folder in numeric order, each with what --list and
// --headers print. A lesson with no frontmatter shows its first "# " heading,
// or failing that its filename's slug, where a title would go.
function lessons(dir) {
  const names = readdirSync(dir).filter(isInsight);
  names.sort((a, b) => Number(idOf(a)) - Number(idOf(b)) || a.localeCompare(b));
  return names.map((name) => {
    const raw = readFileSync(join(dir, name), "utf8");
    const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const fm = frontmatter(text);
    const lines = text.split(/\r?\n/);
    let fallback = null;
    if (!fm || !(fm.title || "").trim()) {
      const h1 = lines.find((l) => /^#\s+\S/.test(l));
      // An H1 often repeats the number ("# 017 — A build stamp..."); the line already starts with it.
      fallback = h1
        ? h1.replace(/^#\s+/, "").replace(/^\d+\s*[—–:.-]\s*/, "").trim()
        : name.replace(/^\d+[-_]/, "").replace(/\.md$/i, "").replace(/[-_]+/g, " ");
    }
    return { id: idOf(name), fm, fallback };
  });
}

function listLine(lesson) {
  const when = lesson.fm && (lesson.fm.applies_when || "").trim();
  const situations = when ? listOf(when) : [];
  const text = situations.length
    ? `[${situations.join(", ")}]`
    : lesson.fallback ?? unquote(lesson.fm.title);
  return cut(`${lesson.id} ${text.replace(/\s+/g, " ")}`, LIST_LINE_MAX);
}

function headerBlock(lesson) {
  if (!lesson.fm) return `${lesson.id} (no frontmatter; first heading or filename) ${cut(lesson.fallback, HEADER_LINE_MAX)}`;
  const out = [lesson.id];
  for (const f of HEADER_FIELDS) {
    if (lesson.fm[f] !== undefined) out.push(cut(`${f}: ${lesson.fm[f]}`.trimEnd(), HEADER_LINE_MAX));
  }
  if (lesson.fallback) out.push(`(no title; first heading or filename) ${cut(lesson.fallback, HEADER_LINE_MAX)}`);
  return out.join("\n");
}

// Packs whole items into pages. `head(p, m)` is each page's first line; it is
// measured at its widest (the page count's own digits) so no page can cross
// the budget once the real count is known. The last byte is console.log's
// closing newline.
function paginate(items, head, sep) {
  const widest = head(99999, 99999);
  const room = PAGE_BUDGET - Buffer.byteLength(widest + "\n", "utf8") - 1;
  const pages = [];
  let page = [];
  let used = 0;
  for (const item of items) {
    const size = Buffer.byteLength(item, "utf8") + (page.length ? Buffer.byteLength(sep, "utf8") : 0);
    if (page.length && used + size > room) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(item);
    used += page.length === 1 ? Buffer.byteLength(item, "utf8") : size;
  }
  if (page.length) pages.push(page);
  return pages;
}

function printPage(pages, pageNo, head, sep, noun) {
  const m = pages.length;
  if (!Number.isInteger(pageNo) || pageNo < 1 || pageNo > m) {
    return `There is no page ${pageNo} of this ${noun}: it has ${m} page${m === 1 ? "" : "s"} (--page 1 to --page ${m}).`;
  }
  return `${head(pageNo, m)}\n${pages[pageNo - 1].join(sep)}`;
}

function listing(dir, pageNo) {
  const all = lessons(dir);
  if (all.length === 0) return `No insights in ${dir}/ yet. Use /distill after a non-obvious fix to start the knowledge base.`;
  const carrying = all.filter((l) => l.fm && listOf(l.fm.applies_when).length).length;
  const head = (p, m) =>
    `Listing of ${dir}/: ${all.length} lessons, ${carrying} with applies_when. Page ${p} of ${m}${m > 1 ? `; read every page (--page 1 to --page ${m})` : ""}. Each line: the number, then its applies_when situations in brackets, or its title where it has none (lines over ${LIST_LINE_MAX} characters end in ${CUT}).`;
  const pages = paginate(all.map(listLine), head, "\n");
  return printPage(pages, pageNo, head, "\n", "listing");
}

function headers(dir, ids, pageNo) {
  const all = lessons(dir);
  const wanted = [...new Set(ids.map(Number))];
  const picked = [];
  const missing = [];
  for (const n of wanted) {
    const hits = all.filter((l) => Number(l.id) === n);
    if (hits.length) picked.push(...hits);
    else missing.push(String(n).padStart(3, "0"));
  }
  const missingNote = missing.length ? ` Not found: ${missing.join(" ")}.` : "";
  const head = (p, m) =>
    `Headers from ${dir}/: ${picked.length} of the ${wanted.length} lessons asked for.${missingNote} Page ${p} of ${m}${m > 1 ? `; read every page (--page 1 to --page ${m})` : ""}.`;
  if (picked.length === 0) return head(1, 1);
  const pages = paginate(picked.map(headerBlock), head, "\n\n");
  return printPage(pages, pageNo, head, "\n\n", "header print");
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

// argv: an optional --list or --headers, an optional folder, for --headers a
// comma-separated number list, and an optional --page N, in any order.
function parseArgs(argv) {
  const opts = { mode: "card", dir: null, ids: null, page: 1, error: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") opts.mode = "list";
    else if (a === "--headers") opts.mode = "headers";
    else if (a === "--page") {
      const v = argv[++i];
      opts.page = /^\d+$/.test(v || "") ? Number(v) : NaN;
      if (Number.isNaN(opts.page)) opts.error = `--page needs a page number, got ${v === undefined ? "nothing" : `"${v}"`}.`;
    } else if (/^\d+(,\d+)*,?$/.test(a)) opts.ids = a.split(",").filter(Boolean);
    else if (opts.dir === null) opts.dir = a;
    else opts.error = `Unexpected argument "${a}".`;
  }
  if (opts.mode === "headers" && !opts.ids && !opts.error) opts.error = "--headers needs the lessons' numbers, comma-separated (for example 007,019,142).";
  return opts;
}

try {
  const cwd = process.cwd();
  const opts = parseArgs(process.argv.slice(2));
  const explicit = opts.dir !== null;
  const dir = (opts.dir ?? "docs/insights").replace(/[\\/]+$/, "");
  const below = explicit ? [] : corporaBelow(cwd);
  if (opts.error) {
    console.log(`corpus.mjs: ${opts.error}`);
  } else if (existsSync(join(cwd, dir)) || existsSync(dir)) {
    if (opts.mode === "list") console.log(listing(dir, opts.page));
    else if (opts.mode === "headers") console.log(headers(dir, opts.ids, opts.page));
    else {
      const other = below.length ? `\nOther corpora below this directory: ${below.join(", ")}. ${USE_OTHER}` : "";
      console.log(card(dir, CAP - Buffer.byteLength(other, "utf8")) + other);
    }
  } else if (explicit) {
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

// THE SCRIPTS' GATES (U5 of docs/plans/hybrid-plan-step-plan.md): KTD7's check of a whole-plan
// reader's inventory, the scorer's notes check, and the args check every Workflow script runs before
// its first agent() call. Each gate lives here, as plain functions, so it is tested at its edges
// (playbook insight 013: a gate only ever exercised far from its edge has never been tested), not
// only through the stub.
//
// Pure and import-free: U5's generator inlines this file into every Workflow script, so it reads no
// file, no clock and no random number, and every top-level name starts with `reads` or `READS_`
// (entry.test.mjs holds the inlined modules to unique names). The page size and the quote floor are
// inputs, never copies: a script passes prompts.mjs's PROMPT_PAGE and PROMPT_QUOTE_FLOOR, which the
// prompts told the reader (U4's R4-1 and R4-32).
//
// KTD7, as built in U4 (R4-1, R4-17): a reader is told the last line's number, never its text, and
// returns an inventory (caps.mjs's last_line_number, last_line_text, pages_read). It fails by kind:
//   stopped    it reported a last line under the plan's last line with text (N); it missed every
//              section whose span runs past the line it reported, the one holding that line included,
//              so a stop inside the last section still names one;
//   inventory  it reported no line under N, but its inventory fails the check: a number past N, a
//              field left out, a quote that is no prefix of the true last line (both ends trimmed) or
//              shorter than min(the line's trimmed length, the floor), or pages_read under
//              ceil(N / the page size). No section of its read is confirmed, so all of them are missed;
//   notes      the scorer's alone: a row selection picked whose line has no note, or only a blank one
//              (prompts.mjs's promptAmendment refuses empty triggers), joined by line, since two
//              sections can share a heading (U4's R4-6).
// stopped and inventory exclude each other (a number under N is a stop, whatever else is wrong);
// notes goes with either, or alone. A section here is an index heading other than the plan's title
// (a first heading every other one sits deeper than: select.mjs's and prompts.mjs's rule), and its
// span runs from its heading to the line before the next heading at its level or shallower, or to N.
// A span takes in the blank lines before the next heading, so a reader that stopped on a section's
// last line of text names that section too: one more section, never one fewer.

// The short read's kinds, in promptShortRead's words (prompts.mjs's PROMPT_SHORT_KINDS, tested).
export const READS_KINDS = ["stopped", "inventory", "notes"];

const readsInt = (v) => Number.isInteger(v);

// What is wrong with a section index (flow.mjs index's `index`), or null when nothing is: each entry
// { line, level, heading, own } (select.mjs reads the same entries), a heading line 1 or past, a level
// 1 to 6, heading text (an ATX heading may have none) and whether it has text of its own; no line
// twice. The order does not matter.
export function readsIndexProblem(index) {
  if (!Array.isArray(index) || index.length === 0) return "the section index is a non-empty list (flow.mjs index's index)";
  const seen = new Set();
  for (const h of index) {
    if (!h || typeof h !== "object" || !readsInt(h.line) || h.line < 1 || !readsInt(h.level) || h.level < 1 || h.level > 6 || typeof h.heading !== "string" || typeof h.own !== "boolean") {
      return `a section index entry is { line, level, heading, own }; got ${JSON.stringify(h)}`;
    }
    if (seen.has(h.line)) return `the section index lists line ${h.line} twice`;
    seen.add(h.line);
  }
  return null;
}

// What is wrong with the plan's last line with text (flow.mjs index's `last`), or null.
export function readsLastProblem(last) {
  if (!last || typeof last !== "object" || !readsInt(last.line) || last.line < 1 || typeof last.text !== "string" || !last.text.trim()) {
    return "the plan's last line is { line, text }, its last line holding text and that line's number (flow.mjs index's last)";
  }
  return null;
}

function readsThrow(problem) {
  if (problem) throw new Error(`reads: ${problem}`);
}

function readsWhole(v, what) {
  if (!readsInt(v) || v < 1) throw new Error(`reads: ${what} is a whole number, 1 or more; got ${JSON.stringify(v)}`);
  return v;
}

// The plan's sections, in document order, each { line, heading, to }: every index heading but the
// title, `to` the last line of its span (N for the last at its level).
export function readsSections(index, lastLine) {
  readsThrow(readsIndexProblem(index));
  readsWhole(lastLine, "the plan's last line");
  const heads = [...index].sort((a, b) => a.line - b.line);
  if (heads[heads.length - 1].line > lastLine) throw new Error(`reads: the section index has a heading at line ${heads[heads.length - 1].line}, past the plan's last line (${lastLine})`);
  const title = heads.length > 1 && heads.slice(1).every((h) => h.level > heads[0].level) ? heads[0] : null;
  const out = [];
  heads.forEach((h, i) => {
    if (h === title) return;
    let to = lastLine;
    for (let j = i + 1; j < heads.length; j++) {
      if (heads[j].level <= h.level) {
        to = heads[j].line - 1;
        break;
      }
    }
    out.push({ line: h.line, heading: h.heading.trim() || "(a heading with no text)", to });
  });
  return out;
}

// The sections a read that stopped at `stoppedAt` missed: every one whose span runs past it, as
// { line, heading } (promptShortRead's missed). 0 misses them all.
export function readsMissed(index, lastLine, stoppedAt) {
  if (!readsInt(stoppedAt) || stoppedAt < 0) throw new Error(`reads: stoppedAt is the last line a read reached, 0 or more; got ${JSON.stringify(stoppedAt)}`);
  return readsSections(index, lastLine).filter((s) => s.to > stoppedAt).map((s) => ({ line: s.line, heading: s.heading }));
}

// KTD7's check of one reader's inventory. `inventory` is the reader's answer (the finder's or the
// scorer's object; any other value counts as an inventory with every field left out); `last` the
// plan's last line with text; `index` the section index; `endsAt` the built prompt's endsAt, which
// must be the last line's number; `page` the page size and `floor` the quote floor the prompts told
// the reader. Answers { ok: true }, or { ok: false, reasons: [kind], stoppedAt (stopped only),
// missed, problems }: `missed` the sections it missed (for a stopped read the ones past the stop, for
// a failed inventory every section), `problems` what failed, in words that never hold the last line's
// text, which the check compares a quote against.
export function readsInventory(inventory, { last, index, endsAt, page, floor } = {}) {
  readsThrow(readsLastProblem(last));
  readsWhole(endsAt, "endsAt");
  if (endsAt !== last.line) throw new Error(`reads: the built prompt's endsAt (${endsAt}) is not the plan's last line (${last.line}), so the reader was told another line than the one it is checked against`);
  readsWhole(page, "the page size");
  readsWhole(floor, "the quote floor");
  const sections = readsSections(index, last.line);
  const inv = inventory && typeof inventory === "object" && !Array.isArray(inventory) ? inventory : {};
  const n = inv.last_line_number;
  if (readsInt(n) && n >= 0 && n < last.line) {
    return { ok: false, reasons: ["stopped"], stoppedAt: n, missed: readsMissed(index, last.line, n), problems: [`it read to line ${n}, under the plan's last line (${last.line})`] };
  }
  const problems = [];
  if (n === undefined) problems.push("no last_line_number");
  else if (!readsInt(n) || n < 0) problems.push(`last_line_number ${JSON.stringify(n)} is no line number`);
  else if (n > last.line) problems.push(`last_line_number ${n} is past the plan's last line (${last.line})`);
  const quote = inv.last_line_text;
  if (typeof quote !== "string") problems.push("no last_line_text");
  else {
    const want = last.text.trim();
    const got = quote.trim();
    const need = Math.min(want.length, floor);
    if (got.length < need) problems.push(`last_line_text holds ${got.length} characters trimmed, under the ${need} the check needs`);
    else if (!want.startsWith(got)) problems.push("last_line_text is no prefix of the plan's last line");
  }
  const pages = inv.pages_read;
  const fewest = Math.ceil(last.line / page);
  if (!readsInt(pages)) problems.push("no pages_read");
  else if (pages < fewest) problems.push(`pages_read ${pages} is under ${fewest}, the fewest pages of ${page} lines that reach line ${last.line}`);
  if (problems.length === 0) return { ok: true };
  return { ok: false, reasons: ["inventory"], missed: sections.map((s) => ({ line: s.line, heading: s.heading })), problems };
}

// The scorer's notes against the rows selection picked (select.mjs's sections, each with its line):
// { noted, noNote }, each a list in the rows' order. `noted` holds { line, heading, triggers } for each
// row with a note, the text of every non-blank note at its line joined; `noNote` holds { line, heading }
// for each row with none (promptShortRead's noNote). A note at a line no selected row starts at is
// ignored, and a note whose triggers_named is blank counts as none. The heading is the index's.
export function readsNotes({ selected, notes, index } = {}) {
  readsThrow(readsIndexProblem(index));
  if (!Array.isArray(selected)) throw new Error("reads: selected is the list of rows selection picked (select.mjs's sections)");
  if (notes !== undefined && notes !== null && !Array.isArray(notes)) throw new Error("reads: notes is the scorer's list of notes, or left out");
  const headingAt = new Map(index.map((h) => [h.line, h.heading.trim() || "(a heading with no text)"]));
  const noted = [];
  const noNote = [];
  const rows = new Set();
  for (const r of selected) {
    if (!r || !readsInt(r.line) || !headingAt.has(r.line)) throw new Error(`reads: a selected row starts at a heading of the index; got ${JSON.stringify(r)}`);
    if (rows.has(r.line)) throw new Error(`reads: line ${r.line} is selected twice`);
    rows.add(r.line);
    const texts = (notes ?? []).filter((x) => x && x.line === r.line && typeof x.triggers_named === "string" && x.triggers_named.trim()).map((x) => x.triggers_named.trim());
    if (texts.length) noted.push({ line: r.line, heading: headingAt.get(r.line), triggers: texts.join("; ") });
    else noNote.push({ line: r.line, heading: headingAt.get(r.line) });
  }
  return { noted, noNote };
}

// The options of a reader's one re-run (promptShortRead's), from its inventory check and, for the
// scorer, its notes check; null when neither failed. A stopped read names its stop and the sections it
// missed; a failed inventory names none (the run confirmed none, and the re-run reads from line 1);
// notes names the rows with no note.
export function readsRerun(read, notes = null) {
  if (!read || typeof read.ok !== "boolean") throw new Error("reads: read is readsInventory's answer");
  const reasons = read.ok ? [] : [...read.reasons];
  const out = {};
  if (reasons.includes("stopped")) {
    out.stoppedAt = read.stoppedAt;
    out.missed = read.missed;
  }
  if (notes && notes.noNote.length) {
    reasons.push("notes");
    out.noNote = notes.noNote;
  }
  return reasons.length ? { reasons, ...out } : null;
}

// ---------------------------------------------------------------- the CE files a script names

// An absolute path, in Windows (C:/ or C:\) or POSIX form (prompts.mjs's promptPath rule).
export const readsIsPath = (v) => typeof v === "string" && /^(?:[A-Za-z]:[\\/]|\/)/.test(v);

// What is wrong with a CE resolution (resolve-ce.mjs's, from the run record's ce/Cn.json), or null:
// a files list, each file with its key and exactly one of sha256 (with its absolute path) and
// missing. A script reads its agent and persona files from it, never from a fresh resolve (U3's
// hand-on), and resolve-ce.mjs's checkResolution has already held it to the resolver's full list.
export function readsCeProblem(ce) {
  if (!ce || typeof ce !== "object" || !Array.isArray(ce.files) || ce.files.length === 0) return "the CE resolution is resolve-ce.mjs's object, its files list included (the run record's ce/Cn.json)";
  const keys = new Set();
  for (const f of ce.files) {
    if (!f || typeof f.key !== "string" || !f.key) return `a CE file entry names its key; got ${JSON.stringify(f)}`;
    if (keys.has(f.key)) return `the CE resolution lists ${f.key} twice`;
    keys.add(f.key);
    const has = ["sha256", "missing"].filter((k) => k in f);
    if (has.length !== 1) return `the CE file ${f.key} needs exactly one of sha256 and missing`;
    if ("sha256" in f && !readsIsPath(f.path)) return `the CE file ${f.key} has a sha256 but no absolute path`;
  }
  return null;
}

// One CE file's absolute path by its key, or null when the resolution lists it missing: its seat
// then runs its inline role (KTD2). A key the resolution does not list throws (a script's own bug).
export function readsCeFile(ce, key) {
  readsThrow(readsCeProblem(ce));
  const f = ce.files.find((x) => x.key === key);
  if (!f) throw new Error(`reads: the CE resolution lists no file keyed ${JSON.stringify(key)}`);
  return "sha256" in f ? f.path : null;
}

// ---------------------------------------------------------------- the args check

// The kinds an args field may be: a word (a "?" after it also takes null), or a function that answers
// what is wrong with the value, null when nothing is.
const READS_ARG_KINDS = {
  text: (v) => (typeof v === "string" && v.trim() ? null : "non-empty text"),
  path: (v) => (readsIsPath(v) ? null : "an absolute path"),
  list: (v) => (Array.isArray(v) ? null : "a list"),
  object: (v) => (v && typeof v === "object" && !Array.isArray(v) ? null : "an object"),
  bool: (v) => (typeof v === "boolean" ? null : "true or false"),
  int: (v) => (readsInt(v) && v >= 0 ? null : "a whole number, 0 or more"),
  any: () => null,
};

function readsArgProblem(kind, v) {
  if (typeof kind === "function") return kind(v);
  if (typeof kind !== "string") throw new Error(`reads: an args kind is a word (${Object.keys(READS_ARG_KINDS).join(", ")}, each with an optional "?" for null) or a function; got ${JSON.stringify(kind)}`);
  const nullable = kind.endsWith("?");
  const word = nullable ? kind.slice(0, -1) : kind;
  const check = READS_ARG_KINDS[word];
  if (!check) throw new Error(`reads: ${JSON.stringify(kind)} is no args kind (one of: ${Object.keys(READS_ARG_KINDS).join(", ")}, each with an optional "?" for null)`);
  if (v === null) return nullable ? null : `${check(undefined) ?? "a value"}, not null`;
  const wrong = check(v);
  return wrong && nullable ? `${wrong} or null` : wrong;
}

// The args check every script runs first, before any agent() call. `args` arrives verbatim: an
// object, or a JSON string (the untyped-param case council.js tolerates at :263-267), which is parsed.
// `required` and `optional` map each field the script takes to its kind. A required field must be
// present (null only where its kind takes null); an optional one is checked when present; a field in
// neither is refused, since a misspelt optional field would otherwise be dropped in silence. Every
// problem is named in one error, headed by the script's name; the parsed object is returned.
export function readsArgs(args, { who, required = {}, optional = {} } = {}) {
  if (typeof who !== "string" || !who.trim()) throw new Error("reads: who is the script's name, which heads every refusal");
  // Every kind is checked before any value, so a misspelt kind fails even while its field is absent.
  for (const kind of [...Object.values(required), ...Object.values(optional)]) {
    if (typeof kind !== "function") readsArgProblem(kind, undefined);
  }
  let a = args;
  if (typeof a === "string") {
    try {
      a = JSON.parse(a);
    } catch (e) {
      throw new Error(`${who}: args arrived as text that is no JSON (${e.message}); pass the args object`);
    }
  }
  const takes = [...Object.keys(required), ...Object.keys(optional)];
  if (a === undefined || a === null) throw new Error(`${who}: no args; it needs ${Object.keys(required).join(", ") || "an args object"}`);
  if (typeof a !== "object" || Array.isArray(a)) throw new Error(`${who}: args is an object; got ${Array.isArray(a) ? "a list" : typeof a}`);
  const problems = [];
  // A kind word reads "args.x is <what it must be>"; a function's answer is its own sentence.
  const wrongOf = (k, kind) => {
    const wrong = readsArgProblem(kind, a[k]);
    if (wrong) problems.push(typeof kind === "function" ? `args.${k}: ${wrong}` : `args.${k} is ${wrong}`);
  };
  for (const [k, kind] of Object.entries(required)) {
    if (!Object.hasOwn(a, k) || a[k] === undefined) problems.push(`args.${k} is required`);
    else wrongOf(k, kind);
  }
  for (const [k, kind] of Object.entries(optional)) {
    if (Object.hasOwn(required, k)) throw new Error(`reads: ${k} is both required and optional`);
    if (Object.hasOwn(a, k) && a[k] !== undefined) wrongOf(k, kind);
  }
  for (const k of Object.keys(a)) if (!takes.includes(k)) problems.push(`args.${k} is no field this script takes (it takes: ${takes.join(", ")})`);
  if (problems.length) throw new Error(`${who}: ${problems.join("; ")}`);
  return a;
}

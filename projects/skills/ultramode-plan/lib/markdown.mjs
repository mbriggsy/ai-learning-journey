// THE PLAN AS MARKDOWN (KTD7 and KTD9 of docs/plans/hybrid-plan-step-plan.md): which lines are
// prose and which sit in a fenced code block or the YAML front matter, the plan's section index,
// its last line with text, and whether it carries CE's `deepened:` date. fold.mjs reads its ID
// lines through this, and flow.mjs's `index` command builds from it the section index, last line
// and deepened flag the main loop passes in `args`, so the
// headings select.mjs counts the scorer against and the lines the fold check reads come from one
// reader. A command module: never inlined into a Workflow script.
//
// Why a reader of its own: a fenced "# comment" taken as a heading moved the outline of 21 of the
// repo's 105 committed plans, and a fence that closed on any fence line hid every ID after a "~~~"
// block that showed one "```" line (U2's second review round).

// A fence opens on three or more backticks or tildes after any indentation (a fence nested in a
// list item can sit four or more spaces in, as eight of the repo's plans have), and a backtick
// fence's info string holds no backtick. It closes only on a line of the same character, at least
// as long, with nothing after it but spaces (CommonMark). One still open at the end runs to the end.
const MD_FENCE_OPEN = /^\s*(`{3,}|~{3,})(.*)$/;
const MD_FENCE_CLOSE = /^\s*(`{3,}|~{3,})\s*$/;
// YAML front matter: a first line of exactly "---", closed by a later "---" or "...", every line
// between them shaped like YAML (a key, an indented or listed value, a comment, a blank). A plan
// that opens on a thematic break is not front matter, so its lines stay prose.
const MD_YAML_LINE = /^(?:\s*#.*|\s*[\w.-]+\s*:.*|\s+\S.*|\s*-\s.*|\s*)$/;
// An ATX heading: up to three spaces, one to six #, then a space or the end of the line, and in a
// blockquote after its ">" markers (the Back Nine's 4-recommendation.md has one, the only heading
// a CommonMark reader found in the repo's 105 plans that this one missed). The optional closing
// run of # is not part of the heading's text.
const MD_HEADING = /^(?: {0,3}> ?)* {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;

// A UTF-8 byte-order mark on the first line would hide both the front matter's "---" and a first
// heading; the line numbers are unchanged by dropping it.
const withoutBom = (text) => {
  const s = String(text);
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
};

function frontMatterEnd(lines) {
  if (lines.length === 0 || !/^---\s*$/.test(lines[0])) return 0;
  for (let i = 1; i < lines.length; i++) {
    if (/^(?:---|\.\.\.)\s*$/.test(lines[i])) return i + 1;
    if (!MD_YAML_LINE.test(lines[i])) return 0;
  }
  return 0;
}

// The plan's lines, split on LF or CRLF, with the prose ones (outside the front matter and every
// fence) numbered from 1, and the line of a fence still open at the end, or null.
export function readMarkdown(text) {
  const lines = withoutBom(text).split(/\r?\n/);
  const start = frontMatterEnd(lines);
  const prose = [];
  let fence = null;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      const m = line.match(MD_FENCE_CLOSE);
      if (m && m[1][0] === fence.char && m[1].length >= fence.len) fence = null;
      continue;
    }
    const m = line.match(MD_FENCE_OPEN);
    if (m && !(m[1][0] === "`" && m[2].includes("`"))) {
      fence = { char: m[1][0], len: m[1].length, line: i + 1 };
      continue;
    }
    prose.push({ n: i + 1, line });
  }
  return { lines, prose, frontMatterLines: start, openFence: fence ? fence.line : null };
}

// KTD7's section index: every ATX heading outside the front matter and the fences, in document
// order, as { line, level, heading, own }. `own` says whether the heading has text of its own, a
// non-blank line (fenced or not) before the next heading, which select.mjs then requires some
// scored row to cover even when the heading has children. Setext headings (a line underlined
// with === or ---) are not read: CE's plan contract writes ATX headings only.
export function sectionIndex(text) {
  const md = readMarkdown(text);
  const out = [];
  for (const { n, line } of md.prose) {
    const m = line.match(MD_HEADING);
    if (!m) continue;
    const heading = (m[2] ?? "").replace(/(?:^|[ \t]+)#+$/, "").trim();
    out.push({ line: n, level: m[1].length, heading, own: false });
  }
  out.forEach((h, i) => {
    const end = i + 1 < out.length ? out[i + 1].line - 1 : md.lines.length;
    h.own = md.lines.slice(h.line, end).some((l) => l.trim() !== "");
  });
  return out;
}

// The plan's last line with text and that line's number (KTD7): what a whole-plan reader's
// inventory must quote. null for a plan with no text at all.
export function lastTextLine(text) {
  const lines = withoutBom(text).split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].trim()) return { line: i + 1, text: lines[i] };
  return null;
}

// Whether the plan's front matter carries CE's `deepened:` field (ce-plan's plan-sections.md: an
// ISO 8601 date marking the first time the confidence check substantively strengthened the plan),
// which select.mjs's tie rule and the scorer's `strengthened` column read (KTD5). True for a
// top-level key whose value opens with a date (YYYY-MM-DD, quoted or not, a time after it allowed)
// or is YAML's true (three of the repo's older plans write that); false with no front matter, no
// such key, the key indented under another, a value on the lines below it, or any other value: an
// empty one, false, null, or "pending" (one Burned plan writes that before its deepen). The last
// such key wins, as a YAML reader takes a repeated key.
const MD_DEEPENED = /^deepened[ \t]*:(.*)$/;
export function frontMatterDeepened(text) {
  const md = readMarkdown(text);
  let value = null;
  for (let i = 1; i < md.frontMatterLines - 1; i++) {
    const m = md.lines[i].match(MD_DEEPENED);
    if (m) value = m[1].replace(/\s+#.*$/, "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  }
  return value !== null && (/^\d{4}-\d{2}-\d{2}(?!\d)/.test(value) || /^true$/i.test(value));
}

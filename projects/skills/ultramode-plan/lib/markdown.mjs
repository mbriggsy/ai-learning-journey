// THE PLAN AS MARKDOWN (KTD7 and KTD9 of docs/plans/hybrid-plan-step-plan.md): which lines are
// prose and which sit in a fenced code block or the YAML front matter, the plan's section index,
// and its last line with text. fold.mjs reads its ID lines through this, and flow.mjs's `index`
// command builds from it the section index and last line the main loop passes in `args`, so the
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
// An ATX heading: up to three spaces, one to six #, then a space or the end of the line. The
// optional closing run of # is not part of the heading's text.
const MD_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;

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
  const lines = String(text).split(/\r?\n/);
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
// order, as { line, level, heading }. Setext headings (a line underlined with === or ---) are not
// read: CE's plan contract writes ATX headings only.
export function sectionIndex(text) {
  const out = [];
  for (const { n, line } of readMarkdown(text).prose) {
    const m = line.match(MD_HEADING);
    if (!m) continue;
    const heading = (m[2] ?? "").replace(/(?:^|[ \t]+)#+$/, "").trim();
    out.push({ line: n, level: m[1].length, heading });
  }
  return out;
}

// The plan's last line with text and that line's number (KTD7): what a whole-plan reader's
// inventory must quote. null for a plan with no text at all.
export function lastTextLine(text) {
  const lines = String(text).split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].trim()) return { line: i + 1, text: lines[i] };
  return null;
}

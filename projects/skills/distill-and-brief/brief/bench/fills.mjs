// The 19 header fills (U4 of docs/plans/brief-recall-fix-plan.md): applied to a
// lesson's text by the copy builder (every arm's as-of copies) and by the
// landing (U7). A fill is written from one git blob of one lesson, so applying
// it to any other version of that lesson is refused, never guessed.

import { createHash } from "node:crypto";

// git's blob id: sha1 over "blob <byte length>\0" and the bytes.
export function blobSha(bytes) {
  const buf = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : bytes;
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

const eolOf = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

// Applies one fill to the text of the lesson version it was written from.
// - `tags`: replaces the frontmatter's `tags:` line with fill.tags.
// - `header`: puts a frontmatter block holding fill.header's lines on top of
//   a lesson that has none, after removing fill.removeBlock when one is named
//   (Feud 025's bare date:, modules: and status: body lines move into it).
// Each inserted line takes the file's own line ending.
export function applyFill(text, fill) {
  const got = blobSha(text);
  if (got !== fill.blob) throw new Error(`${fill.lesson}: the text is blob ${got.slice(0, 12)}, the fill was written from ${fill.blob.slice(0, 12)}`);
  const eol = eolOf(text);
  const bom = text.charCodeAt(0) === 0xfeff ? "﻿" : "";
  let body = bom ? text.slice(1) : text;
  if (fill.tags) {
    const lines = body.split(eol);
    if (lines[0].trim() !== "---") throw new Error(`${fill.lesson}: a tags fill needs frontmatter`);
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    const at = lines.findIndex((l, i) => i > 0 && i < end && /^tags:/.test(l));
    if (end < 0 || at < 0) throw new Error(`${fill.lesson}: no tags: line in the frontmatter`);
    lines[at] = fill.tags;
    return bom + lines.join(eol);
  }
  if (fill.header) {
    if (body.split(/\r?\n/)[0].trim() === "---") throw new Error(`${fill.lesson}: a header fill needs a lesson without frontmatter`);
    if (fill.removeBlock) {
      const block = fill.removeBlock.split("\n").join(eol);
      const first = body.indexOf(block);
      if (first < 0 || body.indexOf(block, first + 1) >= 0) throw new Error(`${fill.lesson}: the block to move is not in the text exactly once`);
      body = body.slice(0, first) + body.slice(first + block.length);
    }
    return bom + ["---", ...fill.header, "---", ""].join(eol) + eol + body;
  }
  throw new Error(`${fill.lesson}: a fill names neither tags nor header`);
}

// Puts one applies_when line into a lesson's frontmatter, after the last line
// of its tags: entry (after its last "- item" when tags is a block list), or as
// the last frontmatter line when it has no tags:. A lesson that already
// carries applies_when is returned unchanged, so applying twice changes nothing.
// The line takes the file's own line ending.
export function insertAppliesWhen(text, line) {
  if (!/^applies_when: \[.*\]$/.test(line)) throw new Error(`not an applies_when line: ${line}`);
  const eol = eolOf(text);
  const bom = text.charCodeAt(0) === 0xfeff ? "﻿" : "";
  const lines = (bom ? text.slice(1) : text).split(eol);
  if (lines[0].trim() !== "---") throw new Error("no frontmatter to put applies_when in");
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) throw new Error("unclosed frontmatter");
  if (lines.slice(1, end).some((l) => /^applies_when:/.test(l))) return text;
  let at = end; // default: the last frontmatter line
  const tags = lines.findIndex((l, i) => i > 0 && i < end && /^tags:/.test(l));
  if (tags >= 0) {
    at = tags + 1;
    while (at < end && /^\s+-\s/.test(lines[at])) at++;
  }
  lines.splice(at, 0, line);
  return bom + lines.join(eol);
}

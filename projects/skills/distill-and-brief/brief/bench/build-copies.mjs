#!/usr/bin/env node
// Builds the frozen as-of copies the re-score runs on (KTD8 of
// docs/plans/brief-recall-fix-plan.md). For each of the benchmark's 17 briefs,
// the folder that brief searched, as git held it at the commit before the
// brief, under the lessons' original filenames, plus its README index where
// one existed:
//   <out>/<brief>/asof/docs/insights/   the lessons as they were (KTD9's judges read these)
//   <out>/<brief>/plain/docs/insights/  the same, with the 19 header fills (arms A1 and A2)
//   <out>/<brief>/lines/docs/insights/  plain, plus each lesson's applies_when line
//                                       (arm A3; the 11 Back Nine briefs, only with --lines)
// and <out>/manifest.json naming every copied file's blob and every judged
// lesson the copy leaves out because it lives in another folder.
//
// Usage: node build-copies.mjs <out-dir> [--lines <applies-when-lines.json>]

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyFill, insertAppliesWhen, blobSha } from "./fills.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..", "..", "..");
const RESULTS = join(here, "..", "results");

// The folder each brief searched, and the prefix the benchmark names its lessons by.
export const BACK_NINE = ["B01", "B02", "B04", "B05", "B06", "B07", "B13", "B14", "B15", "B17", "B18"];
const FOLDERS = {
  "projects/the-back-nine/docs/insights": { prefix: "b9", briefs: BACK_NINE },
  "projects/hooks/docs/insights": { prefix: "hooks", briefs: ["B08", "B09"] },
  "projects/family-feud/docs/insights": { prefix: "ff", briefs: ["B10", "B16"] },
  "playbook/docs/insights": { prefix: "playbook", briefs: ["B11", "B12"] },
};
export function folderOf(briefId) {
  for (const [folder, v] of Object.entries(FOLDERS)) if (v.briefs.includes(briefId)) return { folder, prefix: v.prefix };
  throw new Error(`no folder for ${briefId}`);
}

const git = (args, opts = {}) => execFileSync("git", ["-C", REPO, ...args], { maxBuffer: 1 << 28, ...opts });

// The lesson files (and README.md) in `folder` at `commit`: [{ name, blob }].
export function filesAt(commit, folder) {
  const out = git(["ls-tree", commit, `${folder}/`], { encoding: "utf8" });
  const files = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/);
    if (!m) continue;
    const name = m[2].slice(folder.length + 1);
    if (/^\d+[-_].*\.md$/i.test(name) || name === "README.md") files.push({ name, blob: m[1] });
  }
  return files;
}

function write(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

export function buildCopies(out, linesFile, only = null) {
  const inputs = JSON.parse(readFileSync(join(RESULTS, "judge-inputs-2026-10-31.json"), "utf8"));
  const fills = JSON.parse(readFileSync(join(RESULTS, "header-fills-2026-10-31.json"), "utf8")).fills;
  const bench = JSON.parse(readFileSync(join(RESULTS, "recall-benchmark-2026-10-31.json"), "utf8"));
  const lines = linesFile ? JSON.parse(readFileSync(linesFile, "utf8")).lines : null;
  const manifest = { built: "from git", repo: REPO, linesFile: linesFile || null, briefs: {} };

  for (const b of inputs.briefs) {
    if (only && !only.includes(b.id)) continue;
    const { folder, prefix } = folderOf(b.id);
    const files = filesAt(b.commit, folder);
    if (!files.some((f) => f.name !== "README.md")) throw new Error(`${b.id}: no lessons in ${folder} at ${b.commit}`);
    const entry = { folder, prefix, commit: b.commit, files: [], fills: [], lines: 0, leftOut: [] };
    const withLines = lines && prefix === "b9";
    for (const f of files) {
      const bytes = git(["cat-file", "blob", f.blob]);
      if (blobSha(bytes) !== f.blob) throw new Error(`${b.id}: ${f.name} read back as another blob`);
      write(join(out, b.id, "asof", "docs", "insights", f.name), bytes);
      let text = bytes.toString("utf8");
      const id = f.name.match(/^(\d+)/)?.[1];
      const fill = id && fills.find((x) => x.folder === folder && x.lesson === `${prefix}-${id}` && x.file === f.name);
      if (fill) {
        if (fill.blob !== f.blob) throw new Error(`${b.id}: ${f.name} is blob ${f.blob.slice(0, 12)}, its fill was written from ${fill.blob.slice(0, 12)}`);
        text = applyFill(text, fill);
        entry.fills.push(fill.lesson);
      }
      write(join(out, b.id, "plain", "docs", "insights", f.name), text);
      if (withLines) {
        if (f.name !== "README.md") {
          const line = lines[f.blob];
          if (!line) throw new Error(`${b.id}: no applies_when line for ${f.name} (blob ${f.blob.slice(0, 12)})`);
          text = insertAppliesWhen(text, line);
          entry.lines += 1;
        }
        write(join(out, b.id, "lines", "docs", "insights", f.name), text);
      }
      entry.files.push(f);
    }
    const judged = bench.briefs.find((x) => x.id === b.id).judged;
    entry.leftOut = judged.filter((j) => !j.lesson.startsWith(`${prefix}-`)).map((j) => j.lesson);
    manifest.briefs[b.id] = entry;
  }
  write(join(out, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
  return manifest;
}

// True when this file is the script node was asked to run, by its real path, so
// a run through the ~/.claude/skills/brief junction is not a silent no-op.
const isMain = () => {
  try {
    return realpathSync(process.argv[1]).toLowerCase() === realpathSync(fileURLToPath(import.meta.url)).toLowerCase();
  } catch {
    return false;
  }
};

if (process.argv[1] && isMain()) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: node build-copies.mjs <out-dir> [--lines <applies-when-lines.json>]");
  if (existsSync(join(out, "manifest.json"))) throw new Error(`${out} already holds copies; build into an empty folder`);
  const i = process.argv.indexOf("--lines");
  const m = buildCopies(out, i > 0 ? process.argv[i + 1] : null);
  for (const [id, e] of Object.entries(m.briefs)) {
    const n = e.files.filter((f) => f.name !== "README.md").length;
    console.log(`${id} ${e.prefix} @${e.commit.slice(0, 8)}: ${n} lessons${e.files.some((f) => f.name === "README.md") ? " + README" : ""}, fills ${e.fills.length}, lines ${e.lines}${e.leftOut.length ? `, left out: ${e.leftOut.join(" ")}` : ""}`);
  }
}

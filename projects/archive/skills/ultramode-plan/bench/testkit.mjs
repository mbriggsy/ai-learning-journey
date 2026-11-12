// Test helpers shared by bench/*.test.mjs. No test reads ~/.claude or starts claude.

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A fresh folder for one test. UPLAN_TEST_TMP points the tests at a session scratchpad.
export function tmpRoot(t, prefix = "uplan-") {
  const dir = mkdtempSync(join(process.env.UPLAN_TEST_TMP || tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5 }));
  return dir;
}

// The monorepo this skill lives in, found from this file.
export const repoRoot = () => execFileSync("git", ["-C", dirname(fileURLToPath(import.meta.url)), "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

export function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
}

export function writeAt(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

// One assistant row in the measured shape (CLI 2.1.318): message.id, message.usage with the
// cache-write split, and the row-level effort fields.
// perTurnEffort defaults to effort; pass null to leave the field missing.
export function turnRow({ id, input = 2, w5m = 0, w1h = 0, read = 0, output = 10, model = "claude-opus-5-5", effort = "xhigh", perTurnEffort = effort, tools = [], stop = null }) {
  return {
    type: "assistant",
    effort,
    ...(perTurnEffort === null ? {} : { perTurnEffort }),
    requestedModel: model,
    version: "2.1.318",
    timestamp: "2026-11-04T23:00:00.000Z",
    cwd: "C:\\copy",
    message: {
      id,
      model,
      role: "assistant",
      stop_reason: stop || (tools.length ? "tool_use" : null),
      content: tools.length ? tools.map((t) => ({ type: "tool_use", id: t.id, name: t.name, input: t.input || {} })) : [{ type: "text", text: "x" }],
      usage: {
        input_tokens: input,
        cache_creation_input_tokens: w5m + w1h,
        cache_read_input_tokens: read,
        output_tokens: output,
        cache_creation: { ephemeral_5m_input_tokens: w5m, ephemeral_1h_input_tokens: w1h },
      },
    },
  };
}

export const resultRow = (toolUseId, text, isError = false, toolUseResult = null) => ({ type: "user", ...(toolUseResult ? { toolUseResult } : {}), message: { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseId, content: text, is_error: isError }] } });

const jsonl = (rows) => rows.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n") + "\n";

// A session tree on disk under <projects>/<slug>/: main rows, Agent-tool subagents and
// Workflow runs ({ run: { recorded, helpers: [rows...] } }). Returns the main file's path.
export function makeSession(projects, slug, sessionId, { main = [], agents = [], workflows = {} } = {}) {
  const base = join(projects, slug);
  writeAt(join(base, `${sessionId}.jsonl`), jsonl(main));
  agents.forEach((rows, i) => {
    writeAt(join(base, sessionId, "subagents", `agent-a${i}.jsonl`), jsonl(rows));
    writeAt(join(base, sessionId, "subagents", `agent-a${i}.meta.json`), JSON.stringify({ agentType: "general-purpose", description: `agent ${i}` }));
  });
  for (const [run, w] of Object.entries(workflows)) {
    if (w.recorded !== false) writeAt(join(base, sessionId, "workflows", `${run}.json`), "{}");
    (w.helpers || []).forEach((rows, i) => {
      writeAt(join(base, sessionId, "subagents", "workflows", run, `agent-w${i}.jsonl`), jsonl(rows));
      writeAt(join(base, sessionId, "subagents", "workflows", run, `agent-w${i}.meta.json`), JSON.stringify({ agentType: "workflow-subagent", description: `helper ${i}` }));
    });
    if (!(w.helpers || []).length) mkdirSync(join(base, sessionId, "subagents", "workflows", run), { recursive: true });
  }
  return join(base, `${sessionId}.jsonl`);
}

// A two-commit repository: the start commit, then a later one that changes a/one.txt.
export function twoCommitRepo(dir) {
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "bench@example.invalid"]);
  git(dir, ["config", "user.name", "bench"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  writeAt(join(dir, "a", "one.txt"), "one\n");
  writeAt(join(dir, "b", "two.txt"), "two\n");
  writeAt(join(dir, "c.txt"), "c\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "start"]);
  const start = git(dir, ["rev-parse", "HEAD"]).trim();
  writeAt(join(dir, "a", "one.txt"), "one, later\n");
  git(dir, ["commit", "-q", "-am", "later"]);
  const later = git(dir, ["rev-parse", "HEAD"]).trim();
  return { start, later };
}

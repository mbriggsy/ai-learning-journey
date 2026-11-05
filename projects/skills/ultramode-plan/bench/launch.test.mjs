import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { CANARY_TOOL, CROSS_SESSION_TOOLS, buildLaunch, denyRules, rulePath } from "./launch.mjs";
import { slugOf } from "./freeze.mjs";

const root = resolve("/bench-fixture");
const home = join(root, "home");
const liveRepo = join(root, "live-repo");
const parentEnv = {
  CLAUDECODE: "1",
  CLAUDE_CODE_SESSION_ID: "11111111-1111-4111-8111-111111111111",
  CLAUDE_CODE_MESSAGING_SOCKET: "\\\\.\\pipe\\parent",
  CLAUDE_CODE_MESSAGING_TOKEN: "parent-token",
  CLAUDE_CODE_BRIDGE_SESSION_ID: "cse_parent",
  CLAUDE_CODE_SESSION_ATTENDED: "1",
  claude_lowercase_probe: "x",
  CLAUDE_CODE_SUBAGENT_MODEL: "sonnet",
  OPENAI_API_KEY: "kept-not-our-business-here",
  PATH: "/usr/bin",
};

const arm = (name, sid) => buildLaunch({
  cwd: join(root, "frozen", name),
  stateDir: join(root, "frozen", `state-${name}`),
  sessionId: sid,
  prompt: "/probe go",
  liveRepo,
  env: parentEnv,
  home,
});

test("the child's environment keeps no inherited CLAUDE variable except the one KTD16 sets, and sets MSYS_NO_PATHCONV", () => {
  const l = arm("c1", "22222222-2222-4222-8222-222222222222");
  const claude = Object.keys(l.env).filter((k) => /^claude/i.test(k));
  assert.deepEqual(claude, ["CLAUDE_CODE_SUBAGENT_MODEL"]);
  assert.equal(l.env.CLAUDE_CODE_SUBAGENT_MODEL, "opus", "set by KTD16, not the parent's sonnet");
  assert.equal(l.env.MSYS_NO_PATHCONV, "1");
  assert.equal(l.env.PATH, "/usr/bin");
  assert.deepEqual(l.stripped, Object.keys(parentEnv).filter((k) => /^claude/i.test(k)).sort());
});

test("model, effort, session id, permission mode, prompts, extra folder and deny set are on the command line", () => {
  const sid = "22222222-2222-4222-8222-222222222222";
  const l = arm("c1", sid);
  const opt = (name) => l.args[l.args.indexOf(name) + 1];
  assert.equal(l.args[0], "-p");
  assert.equal(l.args[1], "/probe go");
  assert.equal(opt("--model"), "opus[1m]");
  assert.equal(opt("--effort"), "xhigh");
  assert.equal(opt("--session-id"), sid);
  assert.equal(opt("--permission-mode"), "auto");
  assert.equal(opt("--permission-prompts"), "none");
  assert.equal(opt("--output-format"), "json");
  assert.equal(opt("--add-dir"), join(root, "frozen", "state-c1"));
  assert.deepEqual(JSON.parse(opt("--settings")), l.settings);
  assert.equal(l.cwd, join(root, "frozen", "c1"));
});

test("two arms get the identical model, mode and deny set, each with its own state folder", () => {
  const a = arm("c1", "22222222-2222-4222-8222-222222222222");
  const b = arm("c2", "33333333-3333-4333-8333-333333333333");
  const opt = (l, name) => l.args[l.args.indexOf(name) + 1];
  for (const name of ["--model", "--effort", "--permission-mode", "--permission-prompts", "--settings"]) assert.equal(opt(a, name), opt(b, name), name);
  assert.notEqual(opt(a, "--add-dir"), opt(b, "--add-dir"));
});

test("the deny set covers every root KTD16 names", () => {
  const rules = denyRules({ home, liveRepo });
  const r = (p) => rulePath(p);
  for (const want of [
    `Edit(${r(liveRepo)}/**)`,
    `Edit(${r(join(home, ".claude", "plugins"))}/**)`,
    `Edit(${r(join(home, ".claude", "skills"))}/**)`,
    `Edit(${r(join(home, ".claude", "settings.json"))})`,
    `Edit(${r(join(home, ".claude", "settings.local.json"))})`,
    `Edit(${r(join(home, ".claude", "CLAUDE.md"))})`,
    `Edit(${r(join(home, ".claude.json"))})`,
    `Read(${r(join(liveRepo, "projects", "the-back-nine"))}/**)`,
    ...CROSS_SESSION_TOOLS,
    CANARY_TOOL,
  ]) assert.ok(rules.includes(want), `missing ${want}`);
  // Both reads and writes are refused under the live repo's session folders.
  const sess = `${r(join(home, ".claude", "projects"))}/${slugOf(liveRepo)}*/**`;
  assert.deepEqual(rules.filter((x) => x.includes("/.claude/projects/")).sort(), [`Edit(${sess})`, `Read(${sess})`]);
});

test("a rule path is anchored at the filesystem root, in the POSIX form Claude Code matches", () => {
  if (process.platform === "win32") {
    assert.equal(rulePath("C:\\Users\\x\\repo\\"), "//c/Users/x/repo");
    assert.equal(rulePath("D:/data"), "//d/data");
  } else {
    assert.equal(rulePath("/home/x/repo/"), "//home/x/repo");
  }
});

test("a state folder inside the copy, a copy inside the live repo, a bad session id or a relative path refuses", () => {
  const base = { stateDir: join(root, "s"), sessionId: "22222222-2222-4222-8222-222222222222", prompt: "p", liveRepo, env: {}, home };
  assert.throws(() => buildLaunch({ ...base, cwd: join(root, "c"), stateDir: join(root, "c", "state") }), /beside the copy/);
  assert.throws(() => buildLaunch({ ...base, cwd: join(liveRepo, "copy") }), /inside the live repo/);
  assert.throws(() => buildLaunch({ ...base, cwd: join(root, "c"), sessionId: "nope" }), /UUID/);
  assert.throws(() => buildLaunch({ ...base, cwd: "relative/c" }), /absolute/);
});

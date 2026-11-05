import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { ACCOUNT_MCP_SERVERS, CANARY_TOOL, CROSS_SESSION_TOOLS, RESEARCH_MCP_SERVERS, buildLaunch, denyRules, rulePath, spellings } from "./launch.mjs";
import { slugOf } from "./freeze.mjs";
import { longOf, shortOf as realShortOf } from "./shortpath.mjs";
import { tmpRoot } from "./testkit.mjs";

const root = resolve("/bench-fixture");
const home = join(root, "home");
const liveRepo = join(root, "live-repo");

// A stand-in for shortpath.mjs's shortOf, in its contract: each component that has a short name
// is shortened, a path with none gives null. Folder names as on the laptop, where the live
// repo, ~/.claude, the Back Nine and settings.json each have one (CLAUDE.md is already 8.3).
const SHORT = { "live-repo": "LIVE-R~1", ".claude": "CLAUDE~1", "the-back-nine": "THE-BA~1", "settings.json": "SETTIN~1.JSO", ".claude.json": "CLAUDE~1.JSO", "CLAUDE.md": "CLAUDE.MD" };
const slug = slugOf(liveRepo);
// A session once started through the repo's short name has a folder named from that spelling.
const shortSlug = slugOf(join(root, "LIVE-R~1"));
// One folder carries the slug in other letter case (a session started from a cwd typed so): the
// filter ignores case, as the rules do.
const sessionShort = { [slug]: "C--BEN~1", [`${slug}-playbook`]: "C-65B6~1", [`${shortSlug}-projects`]: "C-AB12~1", [`${slug.toLowerCase()}-lower`]: "C--LOW~1", "C--elsewhere-repo": "C--ELS~1" };
const fixtureShortOf = (p) => {
  const s = resolve(p).split(sep).map((c) => SHORT[c] ?? sessionShort[c] ?? c).join(sep);
  return s.toLowerCase() === resolve(p).toLowerCase() ? null : s;
};
const fixtureListDir = (dir) => (resolve(dir) === join(home, ".claude", "projects") ? Object.keys(sessionShort) : []);
// No short names anywhere: what a test passes where a launch needs a lookup.
const noShort = () => null;
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
  shortOf: noShort,
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

test("every account MCP server is removed by its bare name, and no research server is touched", () => {
  const rules = denyRules({ home, liveRepo });
  const mcp = rules.filter((x) => x.startsWith("mcp__"));
  assert.deepEqual(mcp, ACCOUNT_MCP_SERVERS.map((s) => `mcp__${s}`));
  for (const s of ["claude_ai_Gmail", "claude_ai_Google_Drive", "claude_ai_Google_Calendar", "claude_ai_Google_Sheets", "claude_ai_Claude_Docs", "claude-in-chrome", "playwright", "claude-artifacts"]) assert.ok(mcp.includes(`mcp__${s}`), s);
  // A bare server name matches every tool of that one server (Claude Code's permissions docs), so
  // with no glob among them, no rule reaches a research server.
  assert.ok(!mcp.some((x) => x.includes("*")));
  for (const s of RESEARCH_MCP_SERVERS) assert.ok(!mcp.includes(`mcp__${s}`), s);
});

test("with short names, every path rule is written in each mix of long and short components, and each live session folder by its own short name", () => {
  const rules = denyRules({ home, liveRepo, shortOf: fixtureShortOf, listDir: fixtureListDir });
  const r = (...parts) => rulePath(join(...parts));
  const claudes = [join(home, ".claude"), join(home, "CLAUDE~1")];
  const repos = [liveRepo, join(root, "LIVE-R~1")];
  const want = [
    ...repos.map((p) => `Edit(${r(p)}/**)`),
    ...claudes.flatMap((c) => [`Edit(${r(c, "plugins")}/**)`, `Edit(${r(c, "skills")}/**)`]),
    ...claudes.flatMap((c) => ["settings.json", "SETTIN~1.JSO", "settings.local.json", "CLAUDE.md"].map((f) => `Edit(${r(c, f)})`)),
    `Edit(${r(home, ".claude.json")})`, `Edit(${r(home, "CLAUDE~1.JSO")})`,
    // One glob per spelling of the repo (a session started through its short name is named from
    // that spelling), under each spelling of ~/.claude.
    ...claudes.flatMap((c) => [slug, shortSlug].flatMap((s) => [`Read(${r(c, "projects")}/${s}*/**)`, `Edit(${r(c, "projects")}/${s}*/**)`])),
    // The four live session folders by their short names, the one named from the short spelling
    // and the one in other letter case included, under each spelling of ~/.claude; the other
    // repo's folder is not the live repo's, so its short name is never named.
    ...claudes.flatMap((c) => ["C--BEN~1", "C-65B6~1", "C-AB12~1", "C--LOW~1"].flatMap((s) => [`Read(${r(c, "projects", s)}/**)`, `Edit(${r(c, "projects", s)}/**)`])),
    ...repos.flatMap((p) => ["the-back-nine", "THE-BA~1"].map((b) => `Read(${r(p, "projects", b)}/**)`)),
  ];
  const paths = rules.filter((x) => x.includes("("));
  assert.deepEqual([...paths].sort(), [...want].sort());
  assert.equal(paths.length, 44);
  assert.equal(new Set(rules).size, rules.length, "no rule twice");
  assert.ok(!rules.some((x) => x.includes("C--ELS~1")));
  assert.ok(!rules.some((x) => x.includes("CLAUDE.MD")), "a short name that differs only in case is not a new spelling");
  for (const tool of [...CROSS_SESSION_TOOLS, CANARY_TOOL, ...ACCOUNT_MCP_SERVERS.map((s) => `mcp__${s}`)]) assert.ok(rules.includes(tool), tool);
});

test("without short names the deny set is the long-form one; a short path that does not pair component by component throws", () => {
  assert.deepEqual(denyRules({ home, liveRepo, shortOf: null, listDir: fixtureListDir }), denyRules({ home, liveRepo }));
  assert.deepEqual(denyRules({ home, liveRepo, shortOf: () => null, listDir: fixtureListDir }), denyRules({ home, liveRepo }), "a lookup that finds no short name anywhere adds nothing");
  assert.deepEqual(spellings(liveRepo, null), [liveRepo]);
  assert.deepEqual(spellings(join(liveRepo, "projects", "the-back-nine"), fixtureShortOf).length, 4);
  assert.throws(() => spellings(join(liveRepo, "projects"), () => join(root, "LIVE-R~1")), /does not pair/);
});

test("buildLaunch refuses a launch with no shortOf, or with null on Windows, and passes the one it is given into the deny set", () => {
  const base = { cwd: join(root, "frozen", "c1"), stateDir: join(root, "frozen", "state-c1"), sessionId: "22222222-2222-4222-8222-222222222222", prompt: "p", liveRepo, env: {}, home };
  assert.throws(() => buildLaunch(base), /needs shortOf/);
  assert.throws(() => buildLaunch({ ...base, shortOf: "C:/x" }), /needs shortOf/);
  assert.throws(() => buildLaunch({ ...base, shortOf: null, platform: "win32" }), /needs shortOf/);
  assert.ok(buildLaunch({ ...base, shortOf: null, platform: "linux" }).settings.permissions.deny.length, "null is allowed where there are no 8.3 names");
  const l = buildLaunch({ ...base, shortOf: fixtureShortOf });
  assert.ok(l.settings.permissions.deny.includes(`Edit(${rulePath(join(root, "LIVE-R~1"))}/**)`));
  assert.ok(l.settings.permissions.deny.includes(`Read(${rulePath(join(root, "LIVE-R~1", "projects", "THE-BA~1"))}/**)`));
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
  const base = { stateDir: join(root, "s"), sessionId: "22222222-2222-4222-8222-222222222222", prompt: "p", liveRepo, shortOf: noShort, env: {}, home };
  assert.throws(() => buildLaunch({ ...base, cwd: join(root, "c"), stateDir: join(root, "c", "state") }), /beside the copy/);
  assert.throws(() => buildLaunch({ ...base, cwd: join(liveRepo, "copy") }), /inside the live repo/);
  assert.throws(() => buildLaunch({ ...base, cwd: join(root, "c"), sessionId: "nope" }), /UUID/);
  assert.throws(() => buildLaunch({ ...base, cwd: "relative/c" }), /absolute/);
});

test("a copy or state folder spelled through the live repo's 8.3 name is still inside it, and the launch carries long forms", { skip: process.platform !== "win32" && "platform: Windows only (8.3 short names)" }, (t) => {
  const real = longOf(tmpRoot(t));
  const repo = join(real, "a-long-live-repo-name");
  mkdirSync(repo);
  const short = realShortOf(repo);
  assert.ok(short, "the volume makes 8.3 names here; without one this test proves nothing");
  const base = { sessionId: "22222222-2222-4222-8222-222222222222", prompt: "p", liveRepo: repo, shortOf: noShort, env: {}, home };
  assert.throws(() => buildLaunch({ ...base, cwd: join(short, "copy"), stateDir: join(real, "s") }), /inside the live repo/);
  assert.throws(() => buildLaunch({ ...base, cwd: short, stateDir: join(real, "s") }), /inside the live repo/, "the live repo itself");
  assert.throws(() => buildLaunch({ ...base, cwd: join(real, "c"), stateDir: join(short, "s") }), /inside the live repo/);
  const l = buildLaunch({ ...base, liveRepo: short, cwd: join(realShortOf(real) ?? real, "c"), stateDir: join(real, "s") });
  assert.equal(l.cwd, join(real, "c"), "the child starts in the long form");
  assert.ok(l.settings.permissions.deny.includes(`Edit(${rulePath(repo)}/**)`), "a repo given short still gets its long-form rule");
});

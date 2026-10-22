// statusline.py, run the way Claude Code runs it: a JSON session description on
// stdin, one line out. Every case gets its own temp home (HOME and USERPROFILE
// both point there, since Python's expanduser reads HOME on POSIX and
// USERPROFILE on Windows), so the real ~/.claude, its settings and its
// transcripts are never read or written.
//
// The token cases build synthetic transcripts whose lines hold only `type`,
// `timestamp` and `message: {id, usage}`, with ids like m-a1: the shape the CLI
// writes (one line per streamed content block, the same message id on each,
// output_tokens growing), and nothing a real transcript would leak.
//
// Four cases load statusline.py as a module (importlib; its main() runs only as
// a script) to read a value straight from it, so none depends on how fast a
// run is: the read budget, the token format, the lock's age rules at their
// edges, and the lock file acquire_lock really writes (the lock cases write
// their tokens by hand, so this one shows the real form is the one they use).
//
// Python is found as $PYTHON, then python3, then python, and must answer
// `--version` with 3.8 or later (the Windows Store stub answers with an error).
// None found: the suite skips, saying what it tried. CI installs nothing extra:
// the ubuntu runner has python3, and the workflow's version step fails by name
// when it is missing.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GIT_LOCATION_VARS } from '../probes/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, '..', 'statusline.py');

// Built from code points, so this file stays ASCII and no editor or tool can
// turn an escape into something else on the way.
const ELLIPSIS = String.fromCodePoint(0x2026);
const EM_DASH = String.fromCodePoint(0x2014);
// An em dash's UTF-8 bytes decoded as cp1252 and saved again as UTF-8: the
// 2026-10-16 damage. Its third char re-encodes to byte 0x9D, which cp1252
// leaves undefined, so a cp1252 read of the file raises.
const MOJIBAKE = String.fromCodePoint(0xe2, 0x20ac, 0x201d);
const FULL = String.fromCodePoint(0x2588);
const EMPTY = String.fromCodePoint(0x2591);

function findPython() {
  const tried = [];
  for (const cmd of [process.env.PYTHON, 'python3', 'python'].filter(Boolean)) {
    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 });
    const said = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
    const m = /^Python (\d+)\.(\d+)/.exec(said);
    if (r.status === 0 && m && (Number(m[1]) > 3 || (Number(m[1]) === 3 && Number(m[2]) >= 8))) return { cmd, version: said };
    tried.push(`${cmd}: ${r.error ? r.error.code : `exit ${r.status}${said ? `, "${said.slice(0, 60)}"` : ''}`}`);
  }
  return { cmd: null, tried };
}

const PY = findPython();
const SUITE = PY.cmd ? {} : { skip: `no Python 3.8+ found (${PY.tried.join('; ')})` };

// The variables a case may set, cleared from what the runner inherited, in any
// case (Windows reads environment names case-blind). PYTHONUTF8 is pinned to 0
// so a developer's UTF-8 mode can't hide a read that relies on the locale
// default (cp1252 on Windows): the settings case then fails the old way.
const OWNED = new Set([
  ...GIT_LOCATION_VARS, 'GIT_OPTIONAL_LOCKS', 'GIT_CEILING_DIRECTORIES', 'HOME', 'USERPROFILE',
  'PYTHONUTF8', 'PYTHONIOENCODING', 'PYTHONDONTWRITEBYTECODE',
  'CLAUDE_STATUSLINE_CACHE_DIR', 'CLAUDE_STATUSLINE_BUDGET_MS', 'CLAUDE_STATUSLINE_THROTTLE_SEC',
]);

function baseEnv(home) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!OWNED.has(k.toUpperCase())) env[k] = v;
  return {
    ...env,
    HOME: home,
    USERPROFILE: home,
    PYTHONUTF8: '0',
    PYTHONDONTWRITEBYTECODE: '1',
    // git stops looking for a repo at the temp folder, so the branch segment
    // is empty wherever the temp folder sits.
    GIT_CEILING_DIRECTORIES: path.dirname(home),
    GIT_OPTIONAL_LOCKS: '0',
    // Most cases recompute on every run; the throttle cases set their own.
    CLAUDE_STATUSLINE_THROTTLE_SEC: '0',
  };
}

function makeHome(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-statusline-'));
  fs.mkdirSync(path.join(home, '.claude', 'projects'), { recursive: true });
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
}

function session(home, extra = {}) {
  return {
    model: { display_name: 'Opus', id: 'claude-opus-5-5' },
    workspace: { current_dir: path.join(home, 'proj') },
    effort: { level: 'xhigh' },
    context_window: { total_input_tokens: 1000, total_output_tokens: 234 },
    ...extra,
  };
}

// {status, stderr, line (ANSI codes removed), segments, allTime, effort}
function run(home, { input, env = {} } = {}) {
  const stdin = input === undefined ? JSON.stringify(session(home)) : typeof input === 'string' ? input : JSON.stringify(input);
  const r = spawnSync(PY.cmd, [SCRIPT], {
    input: stdin, cwd: home, env: { ...baseEnv(home), ...env }, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000,
  });
  if (r.error) throw r.error;
  const line = (r.stdout ?? '').replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/)[0];
  const segments = line.split(' | ');
  const tokens = segments[3] ?? '';
  return {
    status: r.status, stderr: r.stderr, line, segments,
    allTime: tokens.slice(tokens.indexOf('/') + 1),
    effort: segments[segments.length - 1],
  };
}

const claude = (home, ...p) => path.join(home, '.claude', ...p);

// Loads statusline.py as a module and prints what it computed, from a request
// on stdin: BUDGET_SEC; fmt_tokens for each of `counts`; lock_is_stale for each
// [token, age] of `stale`; and, when `lock` is set, the bytes acquire_lock
// writes to the lock file, with the token it returned, the probe's pid,
// whether OWNER_TOKEN matches them, and whether release_lock then removed the
// file. main() runs only when the file is the script, so the import itself
// prints nothing; a second line, or a stdin main() swallowed, fails the read.
// -B and PYTHONDONTWRITEBYTECODE keep a __pycache__ out of projects/hooks.
const PROBE = [
  'import importlib.util, json, os, sys',
  "spec = importlib.util.spec_from_file_location('statusline_under_test', sys.argv[1])",
  'mod = importlib.util.module_from_spec(spec)',
  'spec.loader.exec_module(mod)',
  'ask = json.load(sys.stdin)',
  "out = {'budget': mod.BUDGET_SEC, 'fmt': [mod.fmt_tokens(n) for n in ask['counts']], 'stale': [mod.lock_is_stale(t, a) for t, a in ask['stale']]}",
  "if ask['lock']:",
  '    os.makedirs(mod.CACHE_DIR, exist_ok=True)',
  '    token = mod.acquire_lock()',
  "    with open(mod.TOKEN_LOCK, 'rb') as f:",
  "        written = f.read().decode('latin-1')",
  "    out['lock'] = {'token': token, 'written': written, 'pid': os.getpid(), 'ownerToken': mod.OWNER_TOKEN.fullmatch(written) is not None}",
  '    mod.release_lock(token)',
  "    out['lock']['left'] = os.path.exists(mod.TOKEN_LOCK)",
  'print(json.dumps(out))',
].join('\n');

function fromModule(home, { env = {}, counts = [], stale = [], lock = false } = {}) {
  const r = spawnSync(PY.cmd, ['-B', '-c', PROBE, SCRIPT], {
    input: JSON.stringify({ counts, stale, lock }), cwd: home, env: { ...baseEnv(home), ...env }, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000,
  });
  if (r.error) throw r.error;
  assert.equal(r.status, 0, r.stderr);
  const lines = (r.stdout ?? '').split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, `importing statusline.py printed more than the probe's line: ${r.stdout}`);
  return JSON.parse(lines[0]);
}

const record = (id, input, output, timestamp = '2026-09-15T12:00:00.000Z') =>
  `${JSON.stringify({ type: 'assistant', timestamp, message: id === null ? { usage: { input_tokens: input, output_tokens: output } } : { id, usage: { input_tokens: input, output_tokens: output } } })}\n`;
const promptLine = (timestamp = '2026-09-15T12:00:00.000Z') => `${JSON.stringify({ type: 'user', timestamp, message: { id: 'm-u1' } })}\n`;

function transcript(home, rel, lines) {
  const full = claude(home, 'projects', ...rel.split('/'));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join(''));
  return full;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const smallCache = (home) => readJson(claude(home, 'statusline-cache.json'));
const index = (home) => readJson(claude(home, 'statusline-index.json'));

// "M/D", plus "/YY" when the year is not this one (the script's local year).
function sinceLabel(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return y === new Date().getFullYear() ? `${m}/${d}` : `${m}/${d}/${String(y % 100).padStart(2, '0')}`;
}

// Both caches parse, and nothing else is left in ~/.claude: no temp file, no
// lock, no lock moved aside.
function assertTidy(home, { allow = [] } = {}) {
  const left = fs.readdirSync(claude(home)).filter((n) => !['projects', 'settings.json', 'statusline-cache.json', 'statusline-index.json', ...allow].includes(n));
  assert.deepEqual(left, [], `left behind in ~/.claude: ${left.join(', ')}`);
  for (const name of ['statusline-cache.json', 'statusline-index.json']) {
    const file = claude(home, name);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) assert.doesNotThrow(() => readJson(file), `${name} is not valid JSON`);
  }
}

describe('statusline.py', SUITE, () => {
  test(`runs under ${PY.cmd ? PY.version : 'no Python'}`, (t) => {
    t.diagnostic(`interpreter: ${PY.cmd} (${PY.version})`);
  });

  describe('effort', () => {
    test('stdin effort xhigh prints xhigh, over a settings file that says otherwise', (t) => {
      const home = makeHome(t);
      fs.writeFileSync(claude(home, 'settings.json'), `${JSON.stringify({ effortLevel: 'low', modelSettings: { 'claude-opus-5': { effortLevel: 'medium' } } }, null, 2)}\n`);
      const r = run(home);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.effort, 'xhigh');
    });

    test('with no stdin effort, a modelSettings prefix override beats the top-level effortLevel, from a file holding an em dash and a mojibake run', (t) => {
      const home = makeHome(t);
      const settings = {
        autoMode: { soft_deny: [`never push ${EM_DASH} ask first`, `a damaged ${MOJIBAKE} rule`] },
        effortLevel: 'medium',
        modelSettings: { 'claude-opus-5': { effortLevel: 'high' } },
      };
      fs.writeFileSync(claude(home, 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
      const noEffort = (id) => ({ ...session(home, { model: { display_name: 'M', id } }), effort: undefined });
      const opus = run(home, { input: noEffort('claude-opus-5-5') });
      assert.equal(opus.status, 0, opus.stderr);
      assert.equal(opus.effort, 'high', 'the prefix override applies');
      const other = run(home, { input: noEffort('claude-sonnet-9') });
      assert.equal(other.effort, 'medium', 'no prefix matches: the top-level value');
    });

    test('with no stdin effort and no settings file, effort reads ?', (t) => {
      const home = makeHome(t);
      const r = run(home, { input: { ...session(home), effort: undefined } });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.effort, '?');
    });
  });

  describe('all-time tokens', () => {
    test('a message id repeated within a file counts once, at its largest usage (not its last)', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [
        record('m-a1', 5, 10), record('m-a1', 5, 50), record('m-a1', 5, 30), promptLine(), record('m-b1', 1, 2),
      ]);
      const r = run(home);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.allTime, `58 since ${sinceLabel('2026-09-15')}`);
      assert.deepEqual({ ...smallCache(home), mtime: 0 }, { v: 2, total: 58, since: '2026-09-15', complete: true, mtime: 0 });
      assertTidy(home);
    });

    test('an id repeated in two files counts once, and subagent transcripts count too', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      transcript(home, 'p2/s2.jsonl', [record('m-a1', 5, 40), record('m-c1', 2, 3)]);
      transcript(home, 'p2/s2/subagents/agent-1.jsonl', [record('m-d1', 1, 1)]);
      const r = run(home);
      assert.equal(r.allTime, `52 since ${sinceLabel('2026-09-15')}`);
      assert.equal(Object.keys(index(home).files).length, 3);
      assertTidy(home);
    });

    test('appended lines update the total without double counting, and a half-written last line waits for its newline', (t) => {
      const home = makeHome(t);
      const file = transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      assert.equal(smallCacheAfter(home).total, 15);
      fs.appendFileSync(file, record('m-a1', 5, 20) + record('m-e1', 3, 4));
      assert.equal(smallCacheAfter(home).total, 32, 'm-a1 now counts 25, m-e1 adds 7');
      const next = record('m-f1', 100, 0);
      fs.appendFileSync(file, next.slice(0, 20));
      assert.equal(smallCacheAfter(home).total, 32, 'a line with no newline yet is not read');
      fs.appendFileSync(file, next.slice(20));
      assert.equal(smallCacheAfter(home).total, 132);
      const entry = Object.values(index(home).files)[0];
      assert.equal(entry.offset, fs.statSync(file).size);
      assert.equal(entry.size, fs.statSync(file).size);
      assertTidy(home);
    });

    test('a deleted transcript leaves the total and the index', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/keep.jsonl', [record('m-a1', 5, 10)]);
      const gone = transcript(home, 'p1/gone.jsonl', [record('m-b1', 50, 50)]);
      assert.equal(smallCacheAfter(home).total, 115);
      fs.rmSync(gone);
      assert.equal(smallCacheAfter(home).total, 15);
      assert.deepEqual(Object.keys(index(home).files).map((p) => path.basename(p)), ['keep.jsonl']);
      assertTidy(home);
    });

    test('a transcript rewritten smaller is read again from byte 0, and its old ids leave the total', (t) => {
      const home = makeHome(t);
      const file = transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10), record('m-b1', 100, 100)]);
      assert.equal(smallCacheAfter(home).total, 215);
      fs.writeFileSync(file, record('m-x1', 1, 1));
      assert.equal(smallCacheAfter(home).total, 2);
      assertTidy(home);
    });

    test('a usage line with no message id counts once, per line, and never merges with another file\'s', (t) => {
      const home = makeHome(t);
      const s1 = transcript(home, 'p1/s1.jsonl', [record(null, 2, 3), record(null, 4, 5)]);
      // Same byte offset (0) as s1's first line: the key is per file.
      transcript(home, 'p1/s2.jsonl', [record(null, 1, 1)]);
      assert.equal(smallCacheAfter(home).total, 16);
      fs.appendFileSync(s1, record(null, 10, 0));
      assert.equal(smallCacheAfter(home).total, 26, 'the earlier lines still count once');
      assertTidy(home);
    });

    test('"since" is the earliest counted timestamp across files and lines, with /YY for another year', (t) => {
      const home = makeHome(t);
      // The earliest counted line is neither a file's first line nor in the
      // first file read (paths are read in sorted order, p1 before p2).
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 1, 1, '2026-10-01T12:00:00.000Z'), record('m-b1', 1, 1, '2026-09-20T12:00:00.000Z')]);
      transcript(home, 'p2/s2.jsonl', [
        promptLine('2026-09-01T12:00:00.000Z'), record('m-c1', 1, 1, '2026-09-18T12:00:00.000Z'), record('m-d1', 1, 1, '2026-09-10T12:00:00.000Z'),
      ]);
      const r = run(home);
      assert.equal(r.allTime, `8 since ${sinceLabel('2026-09-10')}`, 'a line without usage does not count, so 9/1 is not the start');
      assert.equal(smallCache(home).since, '2026-09-10');

      const old = makeHome(t);
      transcript(old, 'p1/s1.jsonl', [record('m-a1', 1, 1, '2025-12-30T12:00:00.000Z')]);
      assert.equal(run(old).allTime, `2 since ${sinceLabel('2025-12-30')}`);
    });

    test('a read budget of 0 shows a partial total with an ellipsis and no date, and completes over later runs, throttle or not', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/a.jsonl', [record('m-1', 5, 5)]);
      transcript(home, 'p1/b.jsonl', [record('m-2', 10, 10)]);
      transcript(home, 'p1/c.jsonl', [record('m-3', 15, 15)]);
      // The default 30 s throttle: an incomplete cache is recomputed anyway.
      const env = { CLAUDE_STATUSLINE_BUDGET_MS: '0', CLAUDE_STATUSLINE_THROTTLE_SEC: '30' };
      const seen = [1, 2, 3].map(() => {
        const r = run(home, { env });
        assert.equal(r.status, 0, r.stderr);
        return [r.allTime, smallCache(home).complete];
      });
      assert.deepEqual(seen, [
        [`10${ELLIPSIS}`, false],
        [`30${ELLIPSIS}`, false],
        [`60 since ${sinceLabel('2026-09-15')}`, true],
      ], 'one file per run at budget 0, files in path order');
      assertTidy(home);
    });

    test('a budget cut inside a file resumes at the byte it reached, with no id counted twice', (t) => {
      const home = makeHome(t);
      // About 440 KB, more than one 256 KiB read step; every id twice.
      const lines = [];
      for (let i = 0; i < 2000; i++) lines.push(record(`m-big-${i}`, 1, 1), record(`m-big-${i}`, 1, 2));
      const file = transcript(home, 'p1/big.jsonl', lines);
      const size = fs.statSync(file).size;
      assert.ok(size > 256 * 1024, `fixture too small (${size} bytes) to need two read steps`);
      const env = { CLAUDE_STATUSLINE_BUDGET_MS: '0' };
      const first = run(home, { env });
      assert.match(first.allTime, new RegExp(`^\\d+k?${ELLIPSIS}$`));
      assert.equal(smallCache(home).complete, false);
      const cut = index(home).files[file];
      assert.ok(cut.offset > 0 && cut.offset < size, `the first run stopped at ${cut.offset} of ${size}`);
      assert.equal(cut.size, cut.offset, 'a cut entry records the offset as its size, so the next run resumes');
      let runs = 1;
      while (!smallCache(home).complete && runs < 10) { run(home, { env }); runs++; }
      assert.equal(smallCache(home).total, 6000);
      assert.equal(index(home).files[file].offset, size);
      assertTidy(home);
    });

    test('the old script\'s token-cache.json is never read or written', (t) => {
      // A session still running the replaced script keeps its own cache; this
      // one must neither trust its total nor touch its bytes.
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      const v1 = JSON.stringify({ files: {}, total: 999999, mtime: Date.now() / 1000 });
      fs.writeFileSync(claude(home, 'token-cache.json'), v1);
      const r = run(home, { env: { CLAUDE_STATUSLINE_THROTTLE_SEC: '30' } });
      assert.equal(r.allTime, `15 since ${sinceLabel('2026-09-15')}`);
      assert.equal(fs.readFileSync(claude(home, 'token-cache.json'), 'utf8'), v1);
      assert.equal(smallCache(home).v, 2);
      assert.equal(index(home).v, 2);
      assertTidy(home, { allow: ['token-cache.json'] });
    });

    test('a non-v2 small cache is recognized and replaced, even while it looks fresh', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      fs.writeFileSync(claude(home, 'statusline-cache.json'), JSON.stringify({ files: {}, total: 999999, mtime: Date.now() / 1000 }));
      const r = run(home, { env: { CLAUDE_STATUSLINE_THROTTLE_SEC: '30' } });
      assert.equal(r.allTime, `15 since ${sinceLabel('2026-09-15')}`);
      assert.equal(smallCache(home).v, 2);
      assert.equal(index(home).v, 2);
      assertTidy(home);
    });

    test('a fresh complete cache is shown without reading the transcripts again', (t) => {
      const home = makeHome(t);
      const file = transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      run(home);
      fs.appendFileSync(file, record('m-b1', 100, 0));
      const env = { CLAUDE_STATUSLINE_THROTTLE_SEC: '30' };
      assert.equal(run(home, { env }).allTime, `15 since ${sinceLabel('2026-09-15')}`, 'inside the throttle: the cached total');
      assert.equal(run(home).allTime, `115 since ${sinceLabel('2026-09-15')}`, 'throttle 0: recomputed');
      assertTidy(home);
    });

    test('the cache folder seam keeps both caches and the lock out of ~/.claude', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      const elsewhere = path.join(home, 'elsewhere');
      const r = run(home, { env: { CLAUDE_STATUSLINE_CACHE_DIR: elsewhere } });
      assert.equal(r.allTime, `15 since ${sinceLabel('2026-09-15')}`);
      assert.deepEqual(fs.readdirSync(claude(home)), ['projects']);
      assert.deepEqual(fs.readdirSync(elsewhere).sort(), ['statusline-cache.json', 'statusline-index.json']);
    });
  });

  describe('the recompute lock', () => {
    // A cache holding 15, then a line worth 7 more on disk.
    function cachedThenGrown(t) {
      const home = makeHome(t);
      const file = transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      run(home);
      fs.appendFileSync(file, record('m-e1', 3, 4));
      return home;
    }
    const lockFile = (home) => claude(home, 'statusline-index.lock');

    test('while a live process holds the lock, a run prints the cached total and leaves the lock alone', (t) => {
      const home = cachedThenGrown(t);
      const token = `${process.pid} deadbeef`;
      fs.writeFileSync(lockFile(home), token);
      const r = run(home);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.allTime, `15 since ${sinceLabel('2026-09-15')}`);
      assert.equal(fs.readFileSync(lockFile(home), 'utf8'), token);
      assert.equal(smallCache(home).total, 15);
      fs.rmSync(lockFile(home));
      assert.equal(run(home).allTime, `22 since ${sinceLabel('2026-09-15')}`);
      assertTidy(home);
    });

    test('with the lock held and nothing cached yet, the total reads as an ellipsis', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      fs.writeFileSync(lockFile(home), `${process.pid} deadbeef`);
      const r = run(home);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.allTime, ELLIPSIS);
      assertTidy(home, { allow: ['statusline-index.lock'] });
    });

    test('a lock older than 120 s is taken over', (t) => {
      const home = cachedThenGrown(t);
      fs.writeFileSync(lockFile(home), `${process.pid} cafe0001`);
      const old = new Date(Date.now() - 200_000);
      fs.utimesSync(lockFile(home), old, old);
      assert.equal(run(home).allTime, `22 since ${sinceLabel('2026-09-15')}`);
      assert.equal(fs.existsSync(lockFile(home)), false);
      assertTidy(home);
    });

    // A run killed between creating the lock and writing its token leaves the
    // file empty: no pid to test, so only age can free it.
    test('a lock with no owner token in it (empty, or not one) older than 10 s is taken over, not left for 120 s', (t) => {
      for (const content of ['', 'not a token']) {
        const home = cachedThenGrown(t);
        fs.writeFileSync(lockFile(home), content);
        const old = new Date(Date.now() - 30_000);
        fs.utimesSync(lockFile(home), old, old);
        assert.equal(run(home).allTime, `22 since ${sinceLabel('2026-09-15')}`, JSON.stringify(content));
        assert.equal(fs.existsSync(lockFile(home)), false, JSON.stringify(content));
        assertTidy(home);
      }
    });

    test('an empty lock younger than 10 s is left alone (its owner may be writing its token now), and the 10 s rule spares a live owner\'s token', (t) => {
      const home = cachedThenGrown(t);
      fs.writeFileSync(lockFile(home), '');
      assert.equal(run(home).allTime, `15 since ${sinceLabel('2026-09-15')}`);
      assert.equal(fs.readFileSync(lockFile(home), 'utf8'), '');
      const token = `${process.pid} cafe0002`;
      fs.writeFileSync(lockFile(home), token);
      const old = new Date(Date.now() - 30_000);
      fs.utimesSync(lockFile(home), old, old);
      assert.equal(run(home).allTime, `15 since ${sinceLabel('2026-09-15')}`, 'a 30 s old lock whose owner is alive');
      assert.equal(fs.readFileSync(lockFile(home), 'utf8'), token);
      fs.rmSync(lockFile(home));
      assertTidy(home);
    });

    // LOCK_TORN_SEC pinned from the lock file's mtime, a second either side
    // of 10 s, no sleeping. A run judges the lock's age once, soon after it
    // starts, so a lock set 9 s old is still under 10 s then unless the run
    // took a second to get there; each message says how long the run took. The
    // exact edge is pinned from the module below.
    test('a lock with no owner token is kept at 9 s old and taken over at 11 s: the torn-lock age is 10 s, read from the file\'s mtime', (t) => {
      for (const content of ['', 'not a token']) {
        for (const [age, taken] of [[9, false], [11, true]]) {
          const home = cachedThenGrown(t);
          fs.writeFileSync(lockFile(home), content);
          const set = Date.now();
          const mtime = new Date(set - age * 1000);
          fs.utimesSync(lockFile(home), mtime, mtime);
          const r = run(home);
          const label = `${JSON.stringify(content)} set ${age} s old (the run took ${Date.now() - set} ms)`;
          assert.equal(r.status, 0, r.stderr);
          if (taken) {
            assert.equal(r.allTime, `22 since ${sinceLabel('2026-09-15')}`, label);
            assert.equal(fs.existsSync(lockFile(home)), false, label);
          } else {
            assert.equal(r.allTime, `15 since ${sinceLabel('2026-09-15')}`, label);
            assert.equal(fs.readFileSync(lockFile(home), 'utf8'), content, label);
            fs.rmSync(lockFile(home));
          }
          assertTidy(home);
        }
      }
    });

    test('a fresh lock whose owner process has exited is taken over at once', (t) => {
      const home = cachedThenGrown(t);
      const gone = spawnSync(process.execPath, ['-e', ''], { windowsHide: true });
      assert.ok(gone.pid > 0);
      fs.writeFileSync(lockFile(home), `${gone.pid} 0badf00d`);
      assert.equal(run(home).allTime, `22 since ${sinceLabel('2026-09-15')}`);
      assert.equal(fs.existsSync(lockFile(home)), false);
      assertTidy(home);
    });

    test('a temp file or moved-aside lock a killed run left behind is swept by the next recompute', (t) => {
      const home = cachedThenGrown(t);
      const orphans = ['statusline-index.json.4242.0a1b2c3d.tmp', 'statusline-cache.json.4242.0a1b2c3d.tmp', 'statusline-index.lock.4242.0a1b2c3d.stale'];
      const old = new Date(Date.now() - 60_000);
      for (const name of orphans) {
        fs.writeFileSync(claude(home, name), 'partial');
        fs.utimesSync(claude(home, name), old, old);
      }
      fs.writeFileSync(claude(home, 'statusline-index.json.not-ours.tmp'), 'kept: not the pattern');
      assert.equal(run(home).allTime, `22 since ${sinceLabel('2026-09-15')}`);
      assertTidy(home, { allow: ['statusline-index.json.not-ours.tmp'] });
    });
  });

  describe('values read from the module, no timing', () => {
    test('the read budget is 1.5 s by default, and CLAUDE_STATUSLINE_BUDGET_MS milliseconds when set', (t) => {
      const home = makeHome(t);
      const budget = (value) => fromModule(home, { env: value === undefined ? {} : { CLAUDE_STATUSLINE_BUDGET_MS: value } }).budget;
      assert.equal(budget(undefined), 1.5);
      assert.equal(budget('250'), 0.25);
      assert.equal(budget('0'), 0);
      assert.equal(budget('soon'), 1.5, 'a value that is no number keeps the default');
      assert.deepEqual(fs.readdirSync(claude(home)), ['projects'], 'importing the module wrote nothing');
    });

    test('a count is rounded before its unit is chosen: 999,999 reads 1.0M, and no count reads 1000k or 1000.0M', (t) => {
      const home = makeHome(t);
      const edges = [
        [0, '0'], [999, '999'], [1_000, '1k'], [999_499, '999k'], [999_500, '1.0M'], [999_999, '1.0M'], [1_000_000, '1.0M'],
        [43_500_000, '43.5M'], [999_949_999, '999.9M'], [999_999_999, '1.0B'], [1_000_000_000, '1.0B'], [1_234_567_890, '1.2B'],
      ];
      // Every count around the k/M boundary, and every thousandth around M/B.
      const near = [];
      for (let n = 998_000; n <= 1_002_000; n++) near.push(n);
      for (let n = 999_000_000; n <= 1_001_000_000; n += 1_000) near.push(n);
      const { fmt } = fromModule(home, { counts: [...edges.map(([n]) => n), ...near] });
      assert.deepEqual(fmt.slice(0, edges.length), edges.map(([, s]) => s));
      // Each one shows under 1000 of its unit and within half a step of the count.
      const unit = { k: [1e3, 500], M: [1e6, 50_000], B: [1e9, 50_000_000] };
      const wrong = [];
      near.forEach((n, i) => {
        const s = fmt[edges.length + i];
        const m = /^(\d+(?:\.\d)?)([kMB])$/.exec(s);
        if (!m || Number(m[1]) >= 1000 || Math.abs(Number(m[1]) * unit[m[2]][0] - n) > unit[m[2]][1]) wrong.push(`${n} -> ${s}`);
      });
      assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} counts shown wrong`);
      // The line shows the same: 999,999 session tokens read 1.0M.
      const r = run(home, { input: session(home, { context_window: { total_input_tokens: 999_000, total_output_tokens: 999 } }) });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.segments[3].split('/')[0], '1.0M');
    });

    test('the lock\'s age rules at their edges: a lock with no owner token is stale once older than 10 s, one whose owner lives once older than 120 s', (t) => {
      const home = makeHome(t);
      // This test runner's pid: a live process other than the probe's own.
      const live = `${process.pid} deadbeef`;
      // [token, age in seconds, stale?]
      const want = [
        ['', 9.99, false], ['', 10, false], ['', 10.01, true],
        ['not a token', 9.99, false], ['not a token', 10.01, true],
        [live, 10.01, false], [live, 119.99, false], [live, 120, false], [live, 120.01, true],
      ];
      const { stale } = fromModule(home, { stale: want.map(([token, age]) => [token, age]) });
      assert.deepEqual(want.map(([token, age], i) => [token, age, stale[i]]), want);
    });

    test('the lock acquire_lock writes holds the token it returns, "<pid> <8 hex>", which OWNER_TOKEN reads as owned', (t) => {
      const home = makeHome(t);
      const { lock } = fromModule(home, { lock: true });
      assert.equal(lock.written, lock.token, 'the file holds the token acquire_lock returned');
      // The form the lock cases above write by hand.
      const m = /^([1-9][0-9]*) [0-9a-f]{8}$/.exec(lock.written);
      assert.ok(m, `acquire_lock wrote ${JSON.stringify(lock.written)}`);
      assert.equal(Number(m[1]), lock.pid, 'the pid is the process that took the lock');
      assert.equal(lock.ownerToken, true, 'OWNER_TOKEN must match it, or every live lock would read as torn and be taken over after 10 s');
      assert.equal(lock.left, false, 'release_lock removed it');
      assert.deepEqual(fs.readdirSync(claude(home)), ['projects'], 'nothing else was left');
    });
  });

  describe('it always prints', () => {
    test('a cache it cannot write shows ? for the total, keeps the rest of the line, and leaves no temp file', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10)]);
      fs.mkdirSync(claude(home, 'statusline-cache.json'));
      const r = run(home);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.allTime, '?');
      assert.equal(r.effort, 'xhigh');
      assertTidy(home);
    });

    test('stdin that is not JSON still prints a line and exits 0', (t) => {
      const home = makeHome(t);
      const r = run(home, { input: 'not json' });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.line, /^\[\?\] /);
    });

    test('the line keeps its layout', (t) => {
      const home = makeHome(t);
      transcript(home, 'p1/s1.jsonl', [record('m-a1', 5, 10), record('m-a1', 5, 50), record('m-b1', 1, 2)]);
      const r = run(home, {
        input: session(home, {
          context_window: { total_input_tokens: 1000, total_output_tokens: 234, current_usage: { input_tokens: 250_000 } },
          cost: { total_duration_ms: 65_000 },
          rate_limits: { five_hour: { used_percentage: 12.7 }, seven_day: { used_percentage: 34 } },
        }),
      });
      assert.equal(r.status, 0, r.stderr);
      const bar = FULL.repeat(2) + EMPTY.repeat(8);
      assert.equal(r.line, `[Opus] proj  | ${bar} 25% | 5h 12% wk 34% | 1k/58 since ${sinceLabel('2026-09-15')} | 1m5s | xhigh`);
      const none = run(home, { input: session(home, { rate_limits: undefined }) });
      assert.equal(none.segments[2], `5h ${EM_DASH} wk ${EM_DASH}`);
    });
  });
});

// Run once with the throttle off and return the small cache it wrote.
function smallCacheAfter(home) {
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  return smallCache(home);
}

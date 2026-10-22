#!/usr/bin/env node
// pre-push-leak.mjs: the monorepo's pre-push hook (D8, U3). It refuses a push
// that would publish a leak into the flow's public folders.
//
//   git runs it as: pre-push-leak.mjs <remote name> <url>
//   with one stdin line per ref: <local ref> <local sha> <remote ref> <remote sha>
//
// CI runs the leak test after a push, which is too late for a public repo:
// by then the leak is published. This runs the same rules (tests/leak.mjs:
// RULES, the binary and UTF-16 handling, the path checks, the scope) over
// what the push is about to send.
//
// What it scans: every commit the push publishes, not just the tip. A leak
// added in one commit and removed in a later one of the same push is still
// published, because the remote receives every commit. For each ref line:
// - a delete (local sha all zeros) publishes nothing;
// - otherwise the commits are `git rev-list <local sha> --not <remote sha>`;
//   for a new remote ref (remote sha all zeros), or a remote sha this repo
//   doesn't have (someone pushed since our last fetch; a force push), it is
//   `--not --remotes`: everything no remote-tracking ref already holds.
// It never runs `git fetch`.
//
// For each such commit, the paths under the scope it adds or modifies, with
// the blob each holds at that commit: `git diff-tree -r --root --raw`, one
// call fed every commit on stdin. A merge is read with -c, which lists only
// the paths whose merged blob differs from every parent. A path the merge
// took unchanged from a parent carries a blob some earlier commit introduced,
// and that commit is either in this push (scanned there) or already public.
// Without -c, diff-tree prints nothing at all for a merge (measured on git
// 2.53), so content written during the merge itself would pass unread.
// Deleted paths have no blob to scan. Each path's name and each blob's body
// go through leak.mjs, every blob read in one `git cat-file --batch` call.
//
// Never scanned: commit and tag messages. Commits in this repo carry a
// Claude-Session attribution trailer by rule, which the api-id rule would
// match. Nor is the URL ever printed: it can carry a credential.
//
// Stdin is read to its end in a loop (leak.mjs readFdSync), never with
// fs.readFileSync, which drops what it read when a read fails partway. Git
// ends every ref line with a newline, so input that stops partway through a
// line was cut short, and it fails closed like any unreadable line.
//
// Exit 0: nothing to publish under the scope, or all of it clean. Exit 1: a
// hit, listed as `<commit12> <path> <rule id>` with the line numbers (never
// the matched text); or an internal error, which fails closed too, because
// this guards a public repo. `git push --no-verify` skips the hook, and the
// error message says so: skipping it is a choice made knowingly.
//
// Installed by tools/install-git-hooks.mjs, never by hand. The hook it writes
// runs this file from a temp copy of HEAD's committed bytes of it and of
// everything it imports, so the rules a push is judged by are the committed
// ones, never a half-edited work tree's. Git runs a hook from the work tree's
// top (measured: cwd is the top, GIT_DIR is not set), so the repo is the
// current folder, whichever copy of this file runs; every git call still
// drops git's location variables (leak.mjs gitEnv) and takes no optional lock.

const ZERO = /^0+$/;
const OBJECT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

function reportError(message) {
  process.stderr.write(
    `pre-push leak gate: internal error: ${message}\n`
    + 'The push is refused: this gate guards a public repo, so an error fails closed.\n'
    + '`git push --no-verify` skips the gate. Use it only knowingly, after checking the pushed commits yourself.\n',
  );
}

// The ref lines git writes on stdin. Anything else is an error, never a skip:
// a line misread as empty would let its commits through unscanned. Git ends
// every line with a newline (measured on git 2.53: one ref line is 114 bytes,
// its LF included), so input that doesn't end with one was cut short.
function parseRefLines(text) {
  if (text !== '' && !text.endsWith('\n')) {
    throw new Error('stdin stops partway through a line: git ends every ref line with a newline, so the read was cut short');
  }
  const lines = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '') return;
    const f = line.split(' ');
    if (f.length !== 4 || !OBJECT_ID.test(f[1]) || !OBJECT_ID.test(f[3])) {
      throw new Error(`stdin line ${i + 1} is not "<local ref> <local sha> <remote ref> <remote sha>": ${JSON.stringify(line)}`);
    }
    lines.push({ localRef: f[0], localSha: f[1], remoteRef: f[2], remoteSha: f[3] });
  });
  return lines;
}

function hasCommit(git, repo, id) {
  try {
    git(repo, ['cat-file', '-e', `${id}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

// The commits a push publishes, oldest first, each once across all ref lines.
function publishedCommits(git, repo, refLines) {
  const commits = new Set();
  for (const l of refLines) {
    if (ZERO.test(l.localSha)) continue;
    const not = ZERO.test(l.remoteSha) || !hasCommit(git, repo, l.remoteSha) ? ['--not', '--remotes'] : ['--not', l.remoteSha];
    const out = git(repo, ['rev-list', '--reverse', l.localSha, ...not]);
    for (const id of out.split('\n')) if (id) commits.add(id);
  }
  return [...commits];
}

// [{commit, path, mode, id}] for every path under the scope that a commit
// adds or modifies. diff-tree --stdin prints each commit's id, then its
// entries, and skips a commit with no entry under the pathspec (measured on
// git 2.53, -z: each id and each field ends in a NUL). An entry is
// ":<old mode> <new mode> <old id> <new id> <status>" then its path; a
// merge's (-c) opens with one colon per parent and carries one mode and one
// id per parent before the merge's own. A deletion's new id is all zeros.
function changedEntries(git, repo, commits, scope) {
  if (commits.length === 0) return [];
  const out = git(repo, ['diff-tree', '--stdin', '-r', '-c', '--root', '--raw', '-z', '--no-renames', '--', ...scope], {
    input: `${commits.join('\n')}\n`,
  });
  const parts = out.split('\0');
  const entries = [];
  let commit = null;
  for (let i = 0; i < parts.length; i++) {
    const tok = parts[i];
    if (tok === '') continue;
    if (!tok.startsWith(':')) {
      if (!OBJECT_ID.test(tok)) throw new Error(`git diff-tree: unreadable output near "${tok.slice(0, 80)}"`);
      commit = tok;
      continue;
    }
    const parents = /^:+/.exec(tok)[0].length;
    const fields = tok.slice(parents).split(' ');
    // parents + 1 modes, parents + 1 ids, then the status.
    if (fields.length !== 2 * (parents + 1) + 1 || commit === null) {
      throw new Error(`git diff-tree: unreadable entry "${tok}"`);
    }
    const mode = fields[parents];
    const id = fields[2 * parents + 1];
    const status = fields[fields.length - 1];
    // A rename or copy pair carries two paths; --no-renames means none come,
    // but the new path is the second if one ever does.
    let file = parts[++i];
    if (parents === 1 && /^[RC]/.test(status)) file = parts[++i];
    if (file === undefined) throw new Error(`git diff-tree: entry "${tok}" has no path`);
    if (ZERO.test(id)) continue;
    entries.push({ commit, path: file, mode, id });
  }
  return entries;
}

// The hits for every entry: [{commit, path, rule, lines: [n]}], one per
// commit, path and rule, in the order found. Line 0 is the path's name.
function scanEntries(leak, repo, entries) {
  const blobs = leak.readBlobs(repo, entries.filter((e) => e.mode !== leak.GITLINK_MODE).map((e) => e.id));
  const found = new Map();
  const add = (e, h) => {
    const key = `${e.commit}\0${e.path}\0${h.rule}`;
    if (!found.has(key)) found.set(key, { commit: e.commit, path: e.path, rule: h.rule, lines: [] });
    const lines = found.get(key).lines;
    if (!lines.includes(h.line)) lines.push(h.line);
  };
  for (const e of entries) {
    for (const h of leak.nameHits(e.path)) add(e, h);
    // A submodule entry holds a commit id in another repo, with no blob here.
    if (e.mode === leak.GITLINK_MODE) continue;
    // A symlink's blob is its link text, which scanBlob reads as text like
    // any other; a crafted one holding a NUL fails as a binary. Every binary
    // (a blob holding a NUL that isn't UTF-16 text, as leak.mjs defines one)
    // fails, whatever its kind (an image, a font, an archive, a PDF), unless
    // leak.mjs REVIEWED_BINARIES (empty) holds its path and its bytes' hash.
    // Encoded content with no NUL (base64, say) is out of scope; leak.mjs's
    // header says why.
    for (const h of leak.scanBlob(e.path, blobs.get(e.id)).hits) add(e, h);
  }
  return [...found.values()];
}

// A path is printed bare unless it holds a control character, which could
// forge a line of this report; then it is JSON-quoted.
const shown = (p) => (/[\u0000-\u001f\u007f]/.test(p) ? JSON.stringify(p) : p);

// Where a hit sits, for the person fixing it. Line 0 is the path's name for a
// rule hit, and the whole body for 'binary' (no rule matches a name, and
// scanBlob reports an unreadable body at line 0).
function where({ rule, lines }) {
  if (rule === 'binary') return 'not text, and no rule can read a binary';
  const body = lines.filter((n) => n > 0);
  const parts = [];
  if (lines.includes(0)) parts.push('in its name');
  if (body.length) parts.push(`${body.length === 1 ? 'line' : 'lines'} ${body.join(', ')}`);
  return parts.join('; ');
}

async function main() {
  // Imported inside the try, so even a missing or broken leak.mjs fails
  // closed with the message below rather than a bare stack trace.
  const leak = await import('../tests/leak.mjs');
  const repo = process.cwd();
  const refLines = parseRefLines(leak.readFdSync(0).toString('utf8'));
  const commits = publishedCommits(leak.git, repo, refLines);
  if (commits.length === 0) {
    process.stderr.write('pre-push leak gate: clean (no commit the remote lacks)\n');
    return 0;
  }
  const entries = changedEntries(leak.git, repo, commits, leak.SCOPE);
  if (entries.length === 0) {
    process.stderr.write(`pre-push leak gate: clean (${commits.length} commit${commits.length === 1 ? '' : 's'}, none touching the scanned folders)\n`);
    return 0;
  }
  const hits = scanEntries(leak, repo, entries);
  if (hits.length === 0) {
    process.stderr.write(`pre-push leak gate: clean (${commits.length} commit${commits.length === 1 ? '' : 's'}, ${entries.length} file version${entries.length === 1 ? '' : 's'} scanned)\n`);
    return 0;
  }
  process.stderr.write(
    'pre-push leak gate: the push is refused. These commits would publish what the leak rules\n'
    + 'forbid in the public folders (projects/hooks/tests/leak.mjs: a real id, a user-profile path,\n'
    + 'a transcript field, an API id, or a binary no rule can read):\n',
  );
  for (const h of hits) process.stderr.write(`  ${h.commit.slice(0, 12)} ${shown(h.path)} ${h.rule} (${where(h)})\n`);
  process.stderr.write(
    'Every commit in a push is published, so a later commit that removes the text does not help:\n'
    + 'rewrite the listed commits, then push again.\n',
  );
  return 1;
}

// This file is a hook, never a library, so main runs unconditionally: an
// `import.meta.main` guard would read undefined on a node before 24.2 (the
// hook runs whatever node is on PATH) and pass every push unscanned. The exit
// code starts at 1, so any way out that skips the assignment below still
// refuses the push. process.exit() is never called: it can drop stderr still
// queued for a pipe, and git shows the hook's stderr to the person.
process.exitCode = 1;
try {
  process.exitCode = await main();
} catch (e) {
  reportError(e?.message ?? String(e));
}

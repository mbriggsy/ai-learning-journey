#!/usr/bin/env python3
# statusline.py: the Claude Code status line (settings.json `statusLine.command`).
#
# Claude Code runs this after each assistant message (debounced 300 ms) with a
# JSON description of the session on stdin and shows the first line printed:
#
#   [Model] dir  branch | context bar pct% | 5h x% wk y% | session/all-time tokens | time | effort
#
# It lived at ~/.claude/statusline.py until U3 moved it here, so it is tested in
# CI and deployed with the hooks (deploy.mjs copies it into a versioned folder).
# U3 changed five things; everything else prints as it did:
#
# 1. Every file is read as UTF-8. The settings read used the locale default,
#    cp1252 on this Windows Python, which raised on the 2026-10-16 mojibake
#    (cp1252 leaves byte 0x9D undefined) and showed "?" for the effort.
# 2. Effort is the CLI's live stdin `effort.level`; the settings fallback applies
#    a `modelSettings` prefix override before the top-level `effortLevel`.
# 3. The all-time token total counts each API message once. The CLI writes one
#    transcript line per streamed content block, every line carrying the same
#    `message.id` and a growing `output_tokens`, and a resumed or forked session
#    copies earlier lines into a new file. Summing every line counted 64.7M
#    where the truth (each id once, at its largest usage) was 43.5M, measured
#    2026-10-21. Cache tokens stay excluded, as /stats excludes them.
# 4. The total says what it covers: "43.5M since 9/15" (the local date of the
#    earliest counted line, plus "/YY" when that is not this year), or
#    "12.3M..." (an ellipsis, no date) while the first build is still running.
# 5. A count that rounds up to the next unit shows in that unit: 999,999 tokens
#    read "1.0M" where "1000k" printed before, and 999,999,999 read "1.0B",
#    not "1000.0M".
#
# The total is incremental. Transcripts only grow, so a small index remembers,
# per file, how far it was read and the largest usage seen for each message id.
# Two caches, each replaced whole (temp file in the same folder, then
# os.replace), never written in place:
#   statusline-cache.json  {"v": 2, "total", "since", "complete", "mtime"}, read on
#                     every refresh;
#   statusline-index.json  {"v": 2, "files": {path: {"size", "offset", "ids", "first"}}},
#                     read only when the total is recomputed.
# These names are new on purpose. The script this replaces (~/.claude/
# statusline.py) kept {"files", "total", "mtime"} in token-cache.json; a session
# still running it after the switch would read a shared file as having no
# per-file entries and re-parse every transcript on every refresh. Separate
# names mean neither version ever reads the other's cache.
# A recompute runs when the small cache is older than 30 s, and on every refresh
# while `complete` is false. One process at a time recomputes, holding
# statusline-index.lock; any other prints the last cached total. A lock is
# taken over when its owner process is gone, when it is older than 120 s, or
# when it holds no owner token (a run killed between creating it and writing
# to it) and is older than 10 s. Reading new bytes stops 1.5 s after launch, so
# a first build of gigabytes of transcripts spreads over several refreshes
# instead of freezing the status line. Any exception in the token part shows
# "?" for the total; the status line itself always prints.
#
# Seams, for tests and measurements only (the live command sets none of them):
#   HOME / USERPROFILE              the home folder (os.path.expanduser reads
#                                   HOME on POSIX, USERPROFILE on Windows), so a
#                                   test's ~/.claude is a temp folder.
#   CLAUDE_STATUSLINE_CACHE_DIR     where the two caches and the lock live
#                                   (default ~/.claude), so a measurement can
#                                   read the real transcripts without writing
#                                   the real caches.
#   CLAUDE_STATUSLINE_BUDGET_MS     the read budget (default 1500; 0 reads one
#                                   chunk per run).
#   CLAUDE_STATUSLINE_THROTTLE_SEC  the recompute interval (default 30; 0
#                                   recomputes on every run).
#
# Python 3.8+ syntax, standard library only.

import io
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

STARTED = time.monotonic()


def env_number(name, default):
    """A non-negative finite number from the environment, else the default."""
    raw = os.environ.get(name, '').strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    if value != value or value < 0 or value == float('inf'):
        return default
    return value


CLAUDE_DIR = os.path.join(os.path.expanduser('~'), '.claude')
PROJECTS_DIR = os.path.join(CLAUDE_DIR, 'projects')
SETTINGS_FILE = os.path.join(CLAUDE_DIR, 'settings.json')
CACHE_DIR = os.environ.get('CLAUDE_STATUSLINE_CACHE_DIR') or CLAUDE_DIR
TOKEN_CACHE = os.path.join(CACHE_DIR, 'statusline-cache.json')
TOKEN_INDEX = os.path.join(CACHE_DIR, 'statusline-index.json')
TOKEN_LOCK = os.path.join(CACHE_DIR, 'statusline-index.lock')

CACHE_VERSION = 2
THROTTLE_SEC = env_number('CLAUDE_STATUSLINE_THROTTLE_SEC', 30.0)
BUDGET_SEC = env_number('CLAUDE_STATUSLINE_BUDGET_MS', 1500.0) / 1000.0
LOCK_STALE_SEC = 120.0
# A lock holding no owner token: empty, or not the '<pid> <8 hex>' that
# acquire_lock writes. acquire_lock creates the file, then writes the token, so
# a run killed between the two (the CLI cancels a status line still running
# when the next update comes) leaves it empty, with no pid to test. Such a lock
# is stale once older than this, not after the full LOCK_STALE_SEC. The grace
# covers a holder that has created the file and not yet written to it.
LOCK_TORN_SEC = 10.0
OWNER_TOKEN = re.compile(r'([1-9][0-9]*) [0-9a-f]{8}')
# Bytes read per step. The budget is checked between steps, so one step is the
# most a run overshoots it by. Small steps read faster: on this Windows machine
# Python read the 4 GB of transcripts (OS-cached) at 3.7 GB/s in 256 KiB reads,
# 1.5 GB/s in 1 MiB reads and 0.36 GB/s in 8 MiB reads (2026-10-21), because
# each read allocates a fresh bytes object of that size.
CHUNK = 256 * 1024
# The index key for a usage line that carries no message id: the line's byte
# offset in its file, behind a NUL no API id contains. Offsets never move in an
# append-only file, so the line counts once however often its region is read,
# and the total adds these per file instead of merging them across files.
NO_ID = '\x00line:'
# Only lines holding this text can carry message.usage; every other line is
# skipped without being parsed.
USAGE_KEY = b'"usage"'
ISO_PREFIX = re.compile(r'^\d{4}-\d{2}-\d{2}T')
# What a killed writer can leave behind: a temp file from write_atomic, or a
# lock moved aside by break_stale_lock. Only the lock holder writes either, so
# the holder sweeps any older than ORPHAN_SEC.
ORPHAN_NAME = re.compile(
    r'^(?:statusline-cache\.json|statusline-index\.json)\.\d+\.[0-9a-f]{8}\.tmp$'
    r'|^statusline-index\.lock\.\d+\.[0-9a-f]{8}\.stale$')
ORPHAN_SEC = 10.0

RESULT_UNKNOWN = '\u2026'  # nothing cached yet and another process is building it


# --- small helpers ---------------------------------------------------------

def as_count(value):
    """A token count from a usage field: a non-negative int, else 0."""
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value if value > 0 else 0
    if isinstance(value, float) and value == value and value > 0 and value != float('inf'):
        return int(value)
    return 0


def rand8():
    return os.urandom(4).hex()


def write_atomic(path, text):
    """Replace `path` whole: a temp file in the same folder, fsync, os.replace.

    The temp file is removed on every failure path. Windows refuses the
    replace while another process has the target open (a status line in
    another session reading the small cache), so a refusal is retried briefly.
    """
    tmp = '%s.%d.%s.tmp' % (path, os.getpid(), rand8())
    try:
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        for attempt in range(10):
            try:
                os.replace(tmp, path)
                return
            except PermissionError:
                if attempt == 9:
                    raise
                time.sleep(0.01 * (attempt + 1))
    except BaseException:
        try:
            os.remove(tmp)
        except OSError:
            pass
        raise


def read_json(path):
    """The parsed file, or None when it is missing, unreadable or not JSON."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


# --- the lock --------------------------------------------------------------

def pid_alive(pid):
    """False only when the process is certainly gone; unknown reads as alive.

    The CLI cancels an in-flight status line when the next update arrives
    (code.claude.com/docs/en/statusline, "How status lines work"). A killed
    recompute never reaches its `finally`, so its lock would otherwise block
    every recompute for LOCK_STALE_SEC. A reused pid reads as alive and falls
    back to that age rule.
    """
    try:
        if os.name == 'nt':
            import ctypes
            from ctypes import wintypes
            kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
            kernel32.OpenProcess.restype = wintypes.HANDLE
            kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
            kernel32.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
            kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
            PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            ERROR_INVALID_PARAMETER = 87  # OpenProcess's answer for a pid with no process
            STILL_ACTIVE = 259
            handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
            if not handle:
                return ctypes.get_last_error() != ERROR_INVALID_PARAMETER
            try:
                code = wintypes.DWORD()
                if not kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
                    return True
                return code.value == STILL_ACTIVE
            finally:
                kernel32.CloseHandle(handle)
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except Exception:
        return True


def lock_is_stale(token, age):
    """Whether a lock holding `token`, last written `age` seconds ago, may be
    taken over: it is older than LOCK_STALE_SEC; or it holds no owner token
    and is older than LOCK_TORN_SEC; or its owner process is gone (our own pid
    in it means a dead run whose pid this process now reuses)."""
    if age > LOCK_STALE_SEC:
        return True
    m = OWNER_TOKEN.fullmatch(token)
    if m is None:
        return age > LOCK_TORN_SEC
    pid = int(m.group(1))
    return pid == os.getpid() or not pid_alive(pid)


def read_text(path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()


def break_stale_lock():
    """Move a stale lock out of the way; True when the caller should retry.

    Stale is lock_is_stale's rule: too old, empty or unreadable as a token
    for too long, or owned by a process that is gone. The lock is renamed
    aside and re-read before it is deleted (the pattern probes/run.mjs
    withLock uses): if what moved is not what was judged stale, a fresh lock
    was taken in between, and it is linked back while its slot is still free.
    """
    try:
        seen = read_text(TOKEN_LOCK)
        age = time.time() - os.stat(TOKEN_LOCK).st_mtime
    except FileNotFoundError:
        return True
    except OSError:
        return False
    if not lock_is_stale(seen, age):
        return False
    aside = '%s.%d.%s.stale' % (TOKEN_LOCK, os.getpid(), rand8())
    try:
        os.rename(TOKEN_LOCK, aside)
    except OSError:
        return False
    try:
        moved = read_text(aside)
    except OSError:
        moved = None
    if moved != seen:
        try:
            os.link(aside, TOKEN_LOCK)
        except OSError:
            pass
    try:
        os.remove(aside)
    except OSError:
        pass
    return True


def acquire_lock():
    """The owner token when this process now holds the lock, else None."""
    token = '%d %s' % (os.getpid(), rand8())
    for attempt in range(2):
        try:
            fd = os.open(TOKEN_LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        except FileExistsError:
            if attempt == 0 and break_stale_lock():
                continue
            return None
        except PermissionError:
            # Windows: the lock is being deleted by its owner right now.
            return None
        try:
            os.write(fd, token.encode('ascii'))
        except BaseException:
            os.close(fd)
            try:
                os.remove(TOKEN_LOCK)
            except OSError:
                pass
            raise
        os.close(fd)
        return token
    return None


def release_lock(token):
    """Remove the lock only while it still holds this process's token."""
    try:
        if read_text(TOKEN_LOCK) != token:
            return
    except OSError:
        return
    for attempt in range(5):
        try:
            os.remove(TOKEN_LOCK)
            return
        except FileNotFoundError:
            return
        except OSError:
            # Windows: another process is reading it to judge staleness. If it
            # stays, our pid is dead after exit and the next run takes it over.
            time.sleep(0.01)


def sweep_orphans():
    now = time.time()
    try:
        names = os.listdir(CACHE_DIR)
    except OSError:
        return
    for name in names:
        if not ORPHAN_NAME.match(name):
            continue
        path = os.path.join(CACHE_DIR, name)
        try:
            if now - os.stat(path).st_mtime > ORPHAN_SEC:
                os.remove(path)
        except OSError:
            pass


# --- the caches ------------------------------------------------------------

def read_small_cache():
    """A valid v2 small cache, or None (missing, damaged, or the v1 form)."""
    c = read_json(TOKEN_CACHE)
    if not isinstance(c, dict) or c.get('v') != CACHE_VERSION:
        return None
    total, since, complete, mtime = c.get('total'), c.get('since'), c.get('complete'), c.get('mtime')
    if isinstance(total, bool) or not isinstance(total, int) or total < 0:
        return None
    if not isinstance(complete, bool):
        return None
    if isinstance(mtime, bool) or not isinstance(mtime, (int, float)):
        return None
    if since is not None and not (isinstance(since, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', since)):
        return None
    return c


def valid_entry(e):
    if not isinstance(e, dict):
        return False
    size, offset, ids, first = e.get('size'), e.get('offset'), e.get('ids'), e.get('first')
    if isinstance(size, bool) or not isinstance(size, int) or size < 0:
        return False
    if isinstance(offset, bool) or not isinstance(offset, int) or not 0 <= offset <= size:
        return False
    if first is not None and not isinstance(first, str):
        return False
    if not isinstance(ids, dict):
        return False
    for v in ids.values():
        if type(v) is not int:
            return False
    return True


def load_index():
    """The v2 index's files, keeping only well-formed entries (a dropped entry
    is re-read from byte 0), or None when there is no usable index."""
    idx = read_json(TOKEN_INDEX)
    if not isinstance(idx, dict) or idx.get('v') != CACHE_VERSION or not isinstance(idx.get('files'), dict):
        return None
    return {p: e for p, e in idx['files'].items() if isinstance(p, str) and valid_entry(e)}


# --- reading transcripts ---------------------------------------------------

def list_transcripts(root):
    """{path: size} for every *.jsonl under root, subagent folders included.

    Sizes come from os.stat, not the directory listing: NTFS may update a
    listing's size lazily for a file another process holds open, and a size
    that lags would hide appended lines. Linked folders are not followed.
    """
    found = {}
    if not os.path.isdir(root):
        return found
    stack = [root]
    while stack:
        folder = stack.pop()
        try:
            it = os.scandir(folder)
        except FileNotFoundError:
            continue
        with it:
            for e in it:
                try:
                    if e.is_symlink() or (hasattr(e, 'is_junction') and e.is_junction()):
                        continue
                    if e.is_dir(follow_symlinks=False):
                        stack.append(e.path)
                    elif e.name.endswith('.jsonl') and e.is_file(follow_symlinks=False):
                        found[e.path] = os.stat(e.path).st_size
                except FileNotFoundError:
                    continue
    return found


def read_usage_lines(buf, end, base, entry):
    """Fold every usage line in buf[:end] (whole lines) into the entry.

    `base` is the file offset of buf[0]. The scan jumps from one '"usage"' to
    the next and parses only the line around it, so the bulk of a transcript
    (tool results, file contents) is never parsed.
    """
    ids = entry['ids']
    first = entry['first']
    pos = 0
    while True:
        hit = buf.find(USAGE_KEY, pos, end)
        if hit < 0:
            break
        start = buf.rfind(b'\n', 0, hit) + 1
        stop = buf.find(b'\n', hit, end)
        if stop < 0:
            stop = end
        pos = stop + 1
        try:
            rec = json.loads(buf[start:stop].decode('utf-8', 'replace'))
        except ValueError:
            continue
        if not isinstance(rec, dict):
            continue
        msg = rec.get('message')
        if not isinstance(msg, dict):
            continue
        usage = msg.get('usage')
        if not isinstance(usage, dict):
            continue
        tokens = as_count(usage.get('input_tokens')) + as_count(usage.get('output_tokens'))
        mid = msg.get('id')
        key = mid if isinstance(mid, str) and mid else NO_ID + str(base + start)
        if tokens > ids.get(key, -1):
            ids[key] = tokens
        ts = rec.get('timestamp')
        if isinstance(ts, str) and ISO_PREFIX.match(ts) and (first is None or ts < first):
            first = ts
    entry['first'] = first


def read_new_bytes(path, entry, deadline):
    """Read the file from entry['offset'] to its last newline, folding usage
    lines into the entry. True when the file was read to its end; False when
    the budget ran out first (entry['size'] is then set to the offset reached,
    so the next refresh sees the file as larger and resumes there).

    A step always completes its line, however long, so every run moves forward
    even with a budget of 0. The pieces of a line longer than a chunk are kept
    in a list and joined once, when its newline arrives.
    """
    with open(path, 'rb') as f:
        f.seek(entry['offset'])
        base = entry['offset']  # file offset of the first pending byte
        pending = []            # chunks read past the last newline seen
        held = 0                # their total length
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                entry['size'] = base + held
                return True
            nl = chunk.rfind(b'\n')
            if nl < 0:
                pending.append(chunk)
                held += len(chunk)
                continue
            if pending:
                pending.append(chunk)
                buf = b''.join(pending)
                end = held + nl + 1
            else:
                buf = chunk
                end = nl + 1
            read_usage_lines(buf, end, base, entry)
            base += end
            entry['offset'] = base
            rest = buf[end:]
            pending = [rest] if rest else []
            held = len(rest)
            if time.monotonic() >= deadline:
                if f.tell() >= os.fstat(f.fileno()).st_size:
                    entry['size'] = base + held
                    return True
                entry['size'] = base
                return False


def local_date(iso):
    """The local calendar date of an ISO timestamp (the CLI writes UTC, 'Z')."""
    text = iso[:-1] + '+00:00' if iso.endswith('Z') else iso
    try:
        moment = datetime.fromisoformat(text)
    except ValueError:
        # Python before 3.11 parses only 3- or 6-digit fractions; the UTC date
        # part is the next best answer.
        try:
            return datetime.strptime(iso[:10], '%Y-%m-%d').date()
        except ValueError:
            return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone().date()


def recompute(cache):
    """Bring the index up to date (within the budget) and save both caches."""
    deadline = STARTED + BUDGET_SEC
    sweep_orphans()
    # The small cache vouches for the index: a missing or v1 small cache means
    # the index is not this version's, so the build starts from empty.
    old = load_index() if cache is not None else None
    changed = old is None
    old = old or {}
    sizes = list_transcripts(PROJECTS_DIR)
    if set(sizes) != set(old):
        changed = True  # a transcript appeared or was deleted
    files = {}
    todo = []
    for path in sorted(sizes):
        size = sizes[path]
        entry = old.get(path)
        if entry is not None and entry['size'] == size:
            files[path] = entry
            continue
        if entry is None or size < entry['size']:
            # New, or shrunk: a rewritten file is read again from byte 0, and
            # the ids it held before leave the total.
            entry = {'size': 0, 'offset': 0, 'ids': {}, 'first': None}
        files[path] = entry
        todo.append(path)

    complete = True
    worked = False
    for path in todo:
        if worked and time.monotonic() >= deadline:
            complete = False
            break
        worked = True
        changed = True
        try:
            done = read_new_bytes(path, files[path], deadline)
        except FileNotFoundError:
            del files[path]
            continue
        if not done:
            complete = False
            break

    best = {}
    per_line = 0
    first = None
    for entry in files.values():
        get = best.get
        for key, tokens in entry['ids'].items():
            if key.startswith(NO_ID):
                per_line += tokens
            elif tokens > get(key, -1):
                best[key] = tokens
        f = entry['first']
        if f is not None and (first is None or f < first):
            first = f
    total = sum(best.values()) + per_line
    since = None
    if complete and first is not None:
        day = local_date(first)
        since = day.isoformat() if day else None

    if changed:
        write_atomic(TOKEN_INDEX, json.dumps({'v': CACHE_VERSION, 'files': files}, separators=(',', ':')))
    result = {'v': CACHE_VERSION, 'total': total, 'since': since, 'complete': complete, 'mtime': time.time()}
    write_atomic(TOKEN_CACHE, json.dumps(result))
    return result


def all_time_tokens():
    """The small cache's fields after any recompute this refresh owes, or
    None when nothing is cached yet and another process holds the lock."""
    def fresh(c):
        return c is not None and c['complete'] and 0 <= time.time() - c['mtime'] < THROTTLE_SEC

    cache = read_small_cache()
    if fresh(cache):
        return cache
    os.makedirs(CACHE_DIR, exist_ok=True)
    token = acquire_lock()
    if token is None:
        return cache
    try:
        # Another process may have finished a recompute while this one waited.
        cache = read_small_cache()
        if fresh(cache):
            return cache
        return recompute(cache)
    finally:
        release_lock(token)


def all_time_label():
    try:
        r = all_time_tokens()
        if r is None:
            return RESULT_UNKNOWN
        text = fmt_tokens(r['total'])
        if not r['complete']:
            return text + '\u2026'
        if r['since']:
            day = datetime.strptime(r['since'], '%Y-%m-%d').date()
            text += ' since %d/%d' % (day.month, day.day)
            if day.year != datetime.now().year:
                text += '/%02d' % (day.year % 100)
        return text
    except Exception:
        return '?'


# --- the line --------------------------------------------------------------

def fmt_tokens(n):
    """A token count in a few characters: 999, 12k, 43.5M, 1.2B.

    The count is rounded in a unit before that unit is chosen: one that rounds
    to 1000 of a unit shows in the next, so 999,999 reads 1.0M, never 1000k,
    and 999,999,999 reads 1.0B, never 1000.0M. The test is on the printed
    digits, so it holds whatever way the float rounds. B is the largest unit.
    """
    if n >= 1_000:
        for scale, places, unit in ((1_000, 0, 'k'), (1_000_000, 1, 'M')):
            text = f'{n / scale:.{places}f}'
            if float(text) < 1_000:
                return text + unit
        return f'{n / 1_000_000_000:.1f}B'
    return str(n)


def git_branch():
    # GIT_OPTIONAL_LOCKS=0 so the status line never takes a lock a session's
    # own git command is waiting on. Output decoded as UTF-8, not the locale.
    try:
        result = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True, encoding='utf-8', errors='replace', timeout=2,
            env=dict(os.environ, GIT_OPTIONAL_LOCKS='0'),
        )
        if result.returncode == 0 and result.stdout.strip():
            return f' \U0001f33f {result.stdout.strip()}'
    except Exception:
        pass
    return ''


def effort_level(data, model_id):
    # The CLI's live value (stdin `effort.level`, v2.1.305+). The settings.json
    # fallback applies the per-model override before the top-level default:
    # the raw top-level key showed "medium" while Opus ran at xhigh. utf-8-sig
    # reads plain UTF-8 the same and also survives a BOM; errors='replace'
    # keeps one bad byte in a string value from hiding the effort.
    effort = (data.get('effort') or {}).get('level') or '?'
    if effort == '?':
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8-sig', errors='replace') as f:
                s = json.load(f)
            effort = s.get('effortLevel', 'default')
            for key, ms in (s.get('modelSettings') or {}).items():
                if model_id.startswith(key) and isinstance(ms, dict) and ms.get('effortLevel'):
                    effort = ms['effortLevel']
        except Exception:
            pass
    return effort


def build_line(data):
    model = (data.get('model') or {}).get('display_name', '?')
    directory = os.path.basename((data.get('workspace') or {}).get('current_dir', '') or data.get('cwd', ''))
    ctx = data.get('context_window', {}) or {}

    # Compute context % ourselves: the CLI's used_percentage divides by its model
    # table's window size, which lags new models (Opus 5 launch day: divided by
    # 200k instead of 1M). current_usage sums = live context, same math as /window.
    cu = ctx.get('current_usage') or {}
    used_tokens = sum(cu.get(k) or 0 for k in
                      ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'))
    model_id = (data.get('model') or {}).get('id', '') or ''
    window = ctx.get('context_window_size') or 0
    if 'haiku' not in model_id:
        window = max(window, 1_000_000)  # every current non-Haiku model runs 1M
    if used_tokens and window:
        pct = int(used_tokens * 100 // window)
    else:
        pct = int(ctx.get('used_percentage', 0) or 0)  # fallback: CLI's number
    duration_ms = (data.get('cost') or {}).get('total_duration_ms', 0) or 0

    # Session tokens: input + output (matches /stats, which excludes cache tokens)
    session_tok = (ctx.get('total_input_tokens') or 0) + (ctx.get('total_output_tokens') or 0)
    tok_fmt = fmt_tokens(session_tok)

    # All-time tokens across every session (incremental, throttled, deduplicated)
    all_time_fmt = all_time_label()

    # Rate limit windows (Pro/Max only, present after first API response)
    rl = data.get('rate_limits') or {}
    five = rl.get('five_hour') or {}
    week = rl.get('seven_day') or {}
    five_pct = five.get('used_percentage')
    week_pct = week.get('used_percentage')
    five_fmt = f'{int(five_pct)}%' if five_pct is not None else '\u2014'
    week_fmt = f'{int(week_pct)}%' if week_pct is not None else '\u2014'

    CYAN, GREEN, YELLOW, RED, RESET = '\033[36m', '\033[32m', '\033[33m', '\033[31m', '\033[0m'
    MAGENTA = '\033[35m'

    # Color-coded progress bar
    bar_color = RED if pct >= 90 else YELLOW if pct >= 70 else GREEN
    filled = pct * 10 // 100
    bar = '\u2588' * filled + '\u2591' * (10 - filled)

    mins = duration_ms // 60000
    secs = (duration_ms % 60000) // 1000

    branch = git_branch()
    effort = effort_level(data, model_id)

    return (f'{CYAN}[{model}]{RESET} {directory} {branch} | {bar_color}{bar}{RESET} {pct}% | '
            f'{YELLOW}5h {five_fmt}{RESET} {YELLOW}wk {week_fmt}{RESET} | '
            f'{GREEN}{tok_fmt}{RESET}/{GREEN}{all_time_fmt}{RESET} | {mins}m{secs}s | {MAGENTA}{effort}{RESET}')


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')
    try:
        data = json.load(sys.stdin)
    except ValueError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    try:
        line = build_line(data)
    except Exception as e:
        # A field of an unexpected type: still print, and say what broke.
        line = f'[status line error: {type(e).__name__}]'
    try:
        print(line)
        sys.stdout.flush()
    except OSError:
        pass  # the CLI cancelled this run and closed the pipe


if __name__ == '__main__':
    main()

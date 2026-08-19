#!/usr/bin/env python3
"""Compare two RUNS of the board -- what actually moved between one synthesis and the next.

    python scripts/board_diff.py                    # the two most recent commits that changed it
    python scripts/board_diff.py --list             # the run ledger: every commit, every synthesis
    python scripts/board_diff.py --from <ref>       # explicit; --to defaults to the working tree
    python scripts/board_diff.py --from <ref> --to <ref>

THE ARCHIVE IS GIT, AND THERE IS NO SNAPSHOT FILE HERE ON PURPOSE. A date-stamped copy of the
board (`draft_rankings_data_2026-08-05.json`) lived in this repo until 2026-08-08 and was deleted
for cause: it had already DRIFTED from the board it claimed to preserve -- its `dst` and
`strategy` disagreed -- while having zero readers anywhere in the tree. A second copy of the truth
that nobody reads is not an archive, it is a future contradiction with a date on it. The runbook's
rule ("Git is the archive; do not regenerate it") plus one-refresh-one-commit already means every
re-rank is exactly one commit holding every surface. Storage was never the missing half. A READER
was. This is the reader.

WHAT IT COMPARES, AND WHY IT IS ALL FIVE. `validate_board.JUDGMENT_KEYS` is `r / pr / tier /
badges / note`, and `meta.rankings.judgment` is a digest over exactly those. This tool covers all
five, plus the derived `vorp`, plus who entered and who left. That coverage is not thoroughness for
its own sake: a tool reporting "nothing moved" while the two stamped judgment digests disagreed
would be one of two liars in the room with no way to tell which. So it cross-checks its own verdict
against those digests and says so out loud when they contradict each other.

MATCHING IS BY `sleeperId`, NEVER BY NAME. The id is the frozen join key (U14, 2026-08-07) and it
is what `judgment_sha` itself keys on, so reordering rows cannot move the answer. Match on name
instead and one re-spelling -- "Marquise Brown" -> "Hollywood Brown" -- reads as a DROP plus an ADD:
two loud events reporting one silent no-op, on a board where a drop is supposed to mean a man left.
So the id joins first, and only what is LEFT OVER falls back to the normalized name -- the id was
frozen onto these rows on 2026-08-07, so a comparison spanning that day has rows carrying an id on
one side and none on the other, and a matcher that only compared like with like would report the
whole board as 174 drops plus 174 adds. Every name-joined row is NAMED in the output: that fallback
is the one place this tool can be fooled and you should know when it is standing there.

REFUSALS ARE LOUD. Every read is proved before anything is printed -- no git, no such ref, no board
at that ref, unparseable JSON, an empty `players` list. An empty table is indistinguishable from a
clean board (insight 008), and this is the tool whose whole output is "here is what did not change".
"""
import argparse
import datetime
import json
import os
import subprocess
import sys

# Windows encoding guard -- the project rule (docs/insights/003). Player names and commit subjects
# both carry non-cp1252 characters (the log is full of em-dashes), and a UnicodeEncodeError would
# kill the report mid-table.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:                       # a non-reconfigurable piped stream must degrade, not crash
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BOARD = os.path.join(ROOT, "draft-kit", "players_data.json")
#: The board's path RELATIVE TO THE PROJECT, joined onto whatever git says the project's own
#: prefix is. Hardcoding `projects/family-feud/...` is this project's most repeated breakage
#: (both known scheduled-task failures were a pinned path), and the folder has already been
#: renamed once -- "family feud" -> "family-feud" on 2026-08-07.
BOARD_UNDER_PROJECT = "draft-kit/players_data.json"

#: The sentinel for "the file as it sits on disk right now". An uncommitted refresh IS a run --
#: `rerank.py --write` leaves one there for as long as it takes to rebuild the surfaces.
WORKTREE = ":worktree"
_WORKTREE_WORDS = {"worktree", "wt", ":worktree", "working-tree", "workingtree", "dirty"}

sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))
import normalize as NORM                                                          # noqa: E402


# ------------------------------------------------------------------ the pure core (no git here)

def _players(doc, side):
    if not isinstance(doc, dict):
        raise ValueError(f"the {side} board is a {type(doc).__name__}, expected an object")
    players = doc.get("players")
    if not isinstance(players, list):
        raise ValueError(f"the {side} board's 'players' is {type(players).__name__}, "
                         f"expected a list")
    if not players:
        # A zero here would print every row of the other side as a DROP -- a complete, confident,
        # catastrophic report about a file that simply failed to load.
        raise ValueError(f"the {side} board's 'players' is empty, so every row on the other side "
                         f"would be reported as a drop. Refusing to diff against nothing.")
    for i, p in enumerate(players):
        if not isinstance(p, dict):
            raise ValueError(f"the {side} board's 'players'[{i}] is {type(p).__name__}, "
                             f"expected an object")
    return players


def _sid(p):
    """The frozen join key, or None. Blank counts as absent -- an empty string is not an id."""
    sid = p.get("sleeperId")
    return str(sid).strip() if sid is not None and str(sid).strip() else None


def _split(players, side):
    """{sleeperId: row} and the rows that have none."""
    by_id, no_id = {}, []
    for p in players:
        key = _sid(p)
        if key is None:
            no_id.append(p)
            continue
        if key in by_id:
            raise ValueError(
                f"the {side} board carries two rows under the same sleeperId {key!r} "
                f"({by_id[key].get('name')!r} and {p.get('name')!r}) -- one of them would vanish "
                f"from this diff without a word. Fix the board first.")
        by_id[key] = p
    return by_id, no_id


def _pair_up(old_players, new_players):
    """Two passes: the frozen id first, then the normalized name over what is LEFT.

    The second pass is not decoration. `sleeperId` was frozen onto these rows on 2026-08-07 (U14),
    so a run from either side of that day has rows carrying an id on one side and none on the
    other -- and a matcher that only ever compares like with like would report the entire board as
    174 drops plus 174 adds. The fallback is deliberately timid: it joins only leftovers, and only
    when the normalized name is unique among the leftovers on BOTH sides, because two men who
    share a name (Mike Williams, twice) must not be welded together by a guess.
    """
    old_by_id, old_no_id = _split(old_players, "old")
    new_by_id, new_no_id = _split(new_players, "new")

    pairs, old_left, new_left = [], dict(old_by_id), {}
    for sid, np in new_by_id.items():
        op = old_left.pop(sid, None)
        if op is None:
            new_left[sid] = np
        else:
            pairs.append((("id", sid), op, np))

    old_rest = list(old_left.values()) + old_no_id
    new_rest = list(new_left.values()) + new_no_id

    def _names(rows):
        ix = {}
        for i, p in enumerate(rows):
            ix.setdefault(NORM.norm(p.get("name")), []).append(i)
        return ix

    old_names, new_names = _names(old_rest), _names(new_rest)
    joined_old, joined_new, guessed_old, guessed_new = set(), set(), [], []
    for name, new_hits in new_names.items():
        old_hits = old_names.get(name)
        if not old_hits or len(old_hits) != 1 or len(new_hits) != 1:
            continue                    # ambiguous, or nothing to join -- refuse to guess
        op, np = old_rest[old_hits[0]], new_rest[new_hits[0]]
        pairs.append((("name", name), op, np))
        joined_old.add(old_hits[0])
        joined_new.add(new_hits[0])
        guessed_old.append(op.get("name"))
        guessed_new.append(np.get("name"))

    drops = [p for i, p in enumerate(old_rest) if i not in joined_old]
    adds = [p for i, p in enumerate(new_rest) if i not in joined_new]
    guessed = {"old": guessed_old, "new": guessed_new}
    no_id = {"old": [p.get("name") for p in old_no_id],
             "new": [p.get("name") for p in new_no_id]}
    return pairs, adds, drops, guessed, no_id


def _num(v):
    """None unless v is a real number. `bool` is an int subclass and True would sail through."""
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def _entry(p):
    sid = _sid(p)
    return {"key": sid or NORM.norm(p.get("name")), "keyed_by": "id" if sid else "name",
            "name": p.get("name"), "pos": p.get("pos"), "team": p.get("team"),
            "r": p.get("r"), "pr": p.get("pr"), "tier": p.get("tier")}


def _pair(key, op, np):
    o_r, n_r = _num(op.get("r")), _num(np.get("r"))
    o_v, n_v = _num(op.get("vorp")), _num(np.get("vorp"))
    return {
        "key": key[1], "keyed_by": key[0],
        "name": np.get("name"), "old_name": op.get("name"),
        "pos": np.get("pos"), "team": np.get("team"),
        "old_r": op.get("r"), "new_r": np.get("r"),
        # POSITIVE MEANS CLIMBED, matching rerank.py's own move column (`p["r"] - new_r`). Two
        # tools printing the same number with opposite signs is how you draft the wrong man.
        "delta": (o_r - n_r) if (o_r is not None and n_r is not None) else None,
        "old_pr": op.get("pr"), "new_pr": np.get("pr"),
        "old_tier": op.get("tier"), "new_tier": np.get("tier"),
        "old_vorp": op.get("vorp"), "new_vorp": np.get("vorp"),
        "vorp_delta": round(n_v - o_v, 2) if (o_v is not None and n_v is not None) else None,
        "old_badges": op.get("badges"), "new_badges": np.get("badges"),
        "old_note": op.get("note"), "new_note": np.get("note"),
    }


def board_meta(doc):
    """The provenance stamps, defensively -- a historical board may predate any of these fields."""
    meta = doc.get("meta") if isinstance(doc, dict) else None
    meta = meta if isinstance(meta, dict) else {}
    rankings = meta.get("rankings") if isinstance(meta.get("rankings"), dict) else {}
    build = meta.get("build") if isinstance(meta.get("build"), dict) else {}
    players = doc.get("players") if isinstance(doc, dict) else None
    return {"synthesized": rankings.get("synthesized"), "judgment": rankings.get("judgment"),
            "updated": meta.get("updated"), "built_at": build.get("built_at"),
            "dirty": build.get("dirty"),
            "rows": len(players) if isinstance(players, list) else None}


def diff_boards(old_doc, new_doc):
    """Two parsed players_data.json documents -> what moved. Pure: no git, no disk, no clock."""
    pairs, added, dropped, guessed, no_id = _pair_up(_players(old_doc, "old"),
                                                     _players(new_doc, "new"))

    moves, pr_changes, tier_changes, vorp_deltas = [], [], [], []
    note_changes, badge_changes, renames = [], [], []
    for key, op, np in pairs:
        row = _pair(key, op, np)
        if row["old_r"] != row["new_r"]:
            moves.append(row)
        elif row["old_pr"] != row["new_pr"]:
            # Only when `r` held still. A row that moved overall almost always moved at its
            # position too, and reporting one event twice reads as two.
            pr_changes.append(row)
        if row["old_tier"] != row["new_tier"]:
            tier_changes.append(row)
        if row["old_vorp"] != row["new_vorp"]:
            vorp_deltas.append(row)
        if row["old_note"] != row["new_note"]:
            note_changes.append(row)
        if row["old_badges"] != row["new_badges"]:
            badge_changes.append(row)
        if row["old_name"] != row["name"]:
            renames.append(row)

    def _rank_of(e):
        r = _num(e["r"])
        return (0, r) if r is not None else (1, 0)

    adds = sorted((_entry(p) for p in added), key=_rank_of)
    drops = sorted((_entry(p) for p in dropped), key=_rank_of)

    def _by_move(m):
        # A row whose `r` is not a number is an anomaly, not a small move -- it sorts to the top.
        return (0, 0, 0) if m["delta"] is None else (1, -abs(m["delta"]), _num(m["new_r"]) or 0)

    moves.sort(key=_by_move)
    old_meta, new_meta = board_meta(old_doc), board_meta(new_doc)
    return {
        "moves": moves,
        "pr_changes": sorted(pr_changes, key=lambda m: _num(m["new_r"]) or 0),
        "adds": adds, "drops": drops,
        "tier_changes": sorted(tier_changes, key=lambda m: _num(m["new_r"]) or 0),
        "vorp_deltas": sorted(vorp_deltas, key=lambda m: -abs(m["vorp_delta"] or 0)),
        "note_changes": sorted(note_changes, key=lambda m: _num(m["new_r"]) or 0),
        "badge_changes": sorted(badge_changes, key=lambda m: _num(m["new_r"]) or 0),
        "renames": renames,
        # Two different risks, kept apart: `matched_by_name` is a JOIN this tool guessed at,
        # `no_stable_id` is a ROW that made it guess.
        "matched_by_name": guessed,
        "no_stable_id": no_id,
        # `dst` and `strategy` carry no stable id and no judgment key, so this tool does not
        # pretend to diff them -- but it will not let them change in silence either. The deleted
        # snapshot drifted in exactly these two blocks.
        "other_changed": {"dst": old_doc.get("dst") != new_doc.get("dst"),
                          "strategy": old_doc.get("strategy") != new_doc.get("strategy")},
        "meta": {"old": old_meta, "new": new_meta,
                 "same_synthesis": (old_meta["synthesized"] is not None
                                    and old_meta["synthesized"] == new_meta["synthesized"]),
                 "same_judgment": (old_meta["judgment"] is not None
                                   and old_meta["judgment"] == new_meta["judgment"])},
    }


JUDGMENT_BUCKETS = ("moves", "pr_changes", "adds", "drops", "tier_changes",
                    "note_changes", "badge_changes")


def verdict(d):
    """One line. The two zero-cases are named exactly, because 'no output' is not a finding."""
    judgment_moved = any(d[b] for b in JUDGMENT_BUCKETS)
    other = [k for k, v in d["other_changed"].items() if v]
    if not judgment_moved and not d["vorp_deltas"] and not other:
        return "nothing moved -- byte-identical ordering, tiers, badges and notes."
    if not (d["moves"] or d["pr_changes"] or d["adds"] or d["drops"] or d["tier_changes"]):
        bits = []
        if d["note_changes"]:
            bits.append(f"{len(d['note_changes'])} note(s) changed")
        if d["badge_changes"]:
            bits.append(f"{len(d['badge_changes'])} badge set(s) changed")
        if d["vorp_deltas"]:
            bits.append(f"{len(d['vorp_deltas'])} vorp value(s) changed")
        for k in other:
            bits.append(f"the {k} block changed")
        return "copy-edit only: " + ", ".join(bits) + ", 0 ranks moved."
    bits = [f"{len(d['moves'])} rank(s) moved"]
    if d["adds"]:
        bits.append(f"{len(d['adds'])} in")
    if d["drops"]:
        bits.append(f"{len(d['drops'])} out")
    if d["tier_changes"]:
        bits.append(f"{len(d['tier_changes'])} tier change(s)")
    if d["note_changes"]:
        bits.append(f"{len(d['note_changes'])} note(s)")
    return ", ".join(bits) + "."


# ---------------------------------------------------------------------------- git plumbing, thin

def _git_raw(args, cwd):
    try:
        p = subprocess.run(["git"] + list(args), cwd=cwd,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except FileNotFoundError:
        raise SystemExit("git is not on PATH, and git IS the board's archive -- there is no run "
                         "history to read without it.")
    return p.returncode, p.stdout, p.stderr.decode("utf-8", "replace").strip()


def repo_root():
    rc, out, err = _git_raw(["rev-parse", "--show-toplevel"], ROOT)
    if rc != 0:
        raise SystemExit(f"{ROOT} is not inside a git repository, so the board has no run history "
                         f"to compare ({err}).")
    return out.decode("utf-8").strip()


def board_in_repo():
    """The board's path as git spells it, derived rather than pinned."""
    rc, out, err = _git_raw(["rev-parse", "--show-prefix"], ROOT)
    if rc != 0:
        raise SystemExit(f"could not ask git where this project sits in the repository ({err}).")
    return out.decode("utf-8").strip() + BOARD_UNDER_PROJECT


def is_worktree(ref):
    return ref is not None and str(ref).strip().casefold() in _WORKTREE_WORDS


def resolve(ref, root):
    rc, out, err = _git_raw(["rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"], root)
    if rc != 0 or not out.strip():
        raise SystemExit(f"no such commit in this repository: {ref!r}. Run "
                         f"`python scripts/board_diff.py --list` to see the runs it does have.")
    return out.decode("utf-8").strip()


def blob_at(ref, root, rel):
    """The board's raw bytes at a ref, or a loud refusal. Never an empty string."""
    rc, out, err = _git_raw(["show", f"{ref}:{rel}"], root)
    if rc != 0:
        raise SystemExit(f"{rel} does not exist at {ref} -- there is no board to read there "
                         f"({err}). The path was renamed on 2026-08-07 (\"family feud\" -> "
                         f"\"family-feud\"), so older commits hold it somewhere else.")
    return out


def load(ref, root=None, rel=None):
    """A parsed board document at any ref, or WORKTREE for the file as it sits on disk."""
    if is_worktree(ref):
        if not os.path.exists(BOARD):
            raise SystemExit(f"the board is not on disk at {BOARD} -- nothing to read.")
        with open(BOARD, encoding="utf-8") as f:
            raw = f.read()
        where = "the working tree"
    else:
        root = root or repo_root()
        rel = rel or board_in_repo()
        raw = blob_at(ref, root, rel).decode("utf-8")
        where = ref
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise SystemExit(f"the board at {where} is not valid JSON ({e}) -- refusing to report an "
                         f"empty diff over a failed read.")


def list_runs(root=None, rel=None):
    """Every commit that changed the board, newest first: [{sha, short, when, subject}]."""
    root = root or repo_root()
    rel = rel or board_in_repo()
    rc, out, err = _git_raw(["log", "--format=%H%x1f%cI%x1f%s", "--", rel], root)
    if rc != 0:
        raise SystemExit(f"git could not read the history of {rel} ({err}).")
    runs = []
    for line in out.decode("utf-8", "replace").splitlines():
        if not line.strip():
            continue
        sha, when, subject = (line.split("\x1f") + ["", ""])[:3]
        runs.append({"sha": sha, "short": sha[:7], "when": when, "subject": subject})
    if not runs:
        raise SystemExit(f"no commit in this repository has ever touched {rel}. Either the board "
                         f"is not committed yet, or this is not the repository that holds it.")
    return runs


def hidden_before_rename(root=None, rel=None):
    """How many older commits `--follow` can see that `git show <ref>:<rel>` cannot read.

    Deliberately NOT used to build the ledger: --follow lists commits from before the 2026-08-07
    kebab rename, where this path does not exist, and every one of them would fail to load.
    Counting them is honest; listing them would be a ledger of unreadable rows.
    """
    root = root or repo_root()
    rel = rel or board_in_repo()
    rc, out, _ = _git_raw(["log", "--follow", "--format=%H", "--", rel], root)
    if rc != 0:
        return 0
    followed = len([x for x in out.decode("utf-8", "replace").splitlines() if x.strip()])
    return max(0, followed - len(list_runs(root, rel)))


def worktree_differs(root, rel):
    """Byte comparison against HEAD. Deliberately not `git status`/`git diff`: both refresh and
    rewrite .git/index, and a draft-day session may be running the engine out of this same repo."""
    if not os.path.exists(BOARD):
        raise SystemExit(f"the board is not on disk at {BOARD} -- nothing to compare.")
    with open(BOARD, "rb") as f:
        local = f.read()
    return local != blob_at("HEAD", root, rel)


# ------------------------------------------------------------------------------------ the report

def describe(ref, root, rel):
    """One side of the comparison, with everything the header needs to name it."""
    if is_worktree(ref):
        try:
            when = datetime.datetime.fromtimestamp(
                os.path.getmtime(BOARD)).strftime("%Y-%m-%d %H:%M")
        except OSError:
            when = "(on disk)"
        side = {"ref": WORKTREE, "short": "worktree", "when": when,
                "subject": "uncommitted -- the file as it sits on disk", "doc": load(WORKTREE)}
    else:
        sha = resolve(ref, root)
        rc, out, _ = _git_raw(["show", "-s", "--format=%cI%x1f%s", sha], root)
        when, subject = (out.decode("utf-8", "replace").strip().split("\x1f") + [""])[:2]
        side = {"ref": sha, "short": sha[:7], "when": when[:16].replace("T", " "),
                "subject": subject, "doc": load(sha, root, rel)}
    side.update(board_meta(side["doc"]))
    return side


def _side_line(label, s):
    return (f"  {label:>4}  {s['short']:<9} {s['when']:<16}  "
            f"synthesized {str(s['synthesized'] or '?'):<10}  "
            f"judgment {str(s['judgment'] or '?'):<16}  {s['rows']} rows")


def recomputed_judgment(doc):
    """The judgment digest hashed off THESE rows, or None if the checker cannot be reached.

    Imported from `validate_board` rather than reimplemented: a second copy of the digest rule is
    exactly the drift class this project keeps killing, and a copy that disagreed with the checker
    would accuse the board of the tool's own bug. Lazy and guarded -- a run comparison must still
    print if that import ever breaks.
    """
    try:
        import validate_board as VB
        return VB.judgment_sha(doc.get("players") or [])
    except Exception:
        return None


def _who(row):
    return f"{row.get('pos') or '?':<3} {row.get('name') or '?'} ({row.get('team') or '?'})"


def _fmt(v):
    return "?" if v is None else str(v)


def print_diff(old, new, d, out=print):
    out(f"BOARD DIFF -- {BOARD_UNDER_PROJECT}")
    out("")
    out(_side_line("FROM", old))
    out(f"        {old['subject'][:88]}")
    out(_side_line("TO", new))
    out(f"        {new['subject'][:88]}")
    out("")

    m = d["meta"]
    if m["same_synthesis"]:
        # Mirrors consensus.py's circular-section rule: say WHAT KIND of zero this is, rather
        # than printing one and letting it be read as a verdict on the ordering.
        out(f"  BOTH SIDES CARRY THE SAME SYNTHESIS DATE ({m['old']['synthesized']}) -- one "
            f"scrape, one")
        out("  ordering. Whatever is below is a copy-edit or a rebuild, NOT a re-rank: the board's")
        out("  ordering is exactly as old on the right as it was on the left.")
    elif m["old"]["synthesized"] and m["new"]["synthesized"]:
        out(f"  The synthesis moved {m['old']['synthesized']} -> {m['new']['synthesized']} "
            f"-- a real re-rank off a newer scrape.")
    else:
        out("  One side carries no meta.rankings.synthesized, so this tool cannot say whether the")
        out("  ordering is older, newer, or the same. Treat the moves below as unattributed.")
    out("")

    if d["moves"]:
        out(f"RANK MOVES ({len(d['moves'])})   + = climbed")
        out(f"    {'was':>4} {'now':>4} {'move':>6}   {'tier':<8} {'vorp':>8}   player")
        for row in d["moves"]:
            tier = (f"{_fmt(row['old_tier'])}->{_fmt(row['new_tier'])}"
                    if row["old_tier"] != row["new_tier"] else _fmt(row["new_tier"]))
            vorp = f"{row['vorp_delta']:+.1f}" if row["vorp_delta"] else "."
            move = f"{row['delta']:+d}" if isinstance(row["delta"], int) else "?"
            out(f"    {_fmt(row['old_r']):>4} {_fmt(row['new_r']):>4} {move:>6}   "
                f"{tier:<8} {vorp:>8}   {_who(row)}")
        out("")

    if d["pr_changes"]:
        out(f"POSITION RANK ONLY ({len(d['pr_changes'])}) -- overall rank held, pr moved")
        for row in d["pr_changes"]:
            out(f"    #{_fmt(row['new_r']):<4} pr {_fmt(row['old_pr'])}->{_fmt(row['new_pr'])}"
                f"   {_who(row)}")
        out("")

    if d["adds"]:
        out(f"ADDED ({len(d['adds'])})")
        for row in d["adds"]:
            out(f"    enters at #{_fmt(row['r']):<4} tier {_fmt(row['tier']):<3}  {_who(row)}")
        out("")
    if d["drops"]:
        out(f"DROPPED ({len(d['drops'])})")
        for row in d["drops"]:
            out(f"    was at    #{_fmt(row['r']):<4} tier {_fmt(row['tier']):<3}  {_who(row)}")
        out("")

    tier_only = [r for r in d["tier_changes"] if r["old_r"] == r["new_r"]]
    if tier_only:
        out(f"TIER CHANGED, RANK DID NOT ({len(tier_only)})")
        for row in tier_only:
            out(f"    #{_fmt(row['new_r']):<4} tier {_fmt(row['old_tier'])}->"
                f"{_fmt(row['new_tier'])}   {_who(row)}")
        out("")

    vorp_only = [r for r in d["vorp_deltas"] if r["old_r"] == r["new_r"]]
    if vorp_only:
        out(f"VORP MOVED WITHOUT THE RANK ({len(vorp_only)}) -- the curve or the baselines changed")
        for row in vorp_only[:12]:
            delta = f"{row['vorp_delta']:+.1f}" if row["vorp_delta"] is not None else "?"
            out(f"    #{_fmt(row['new_r']):<4} {_fmt(row['old_vorp']):>7} -> "
                f"{_fmt(row['new_vorp']):<7} {delta:>7}   {_who(row)}")
        if len(vorp_only) > 12:
            out(f"    ... and {len(vorp_only) - 12} more")
        out("")

    if d["renames"]:
        out(f"SAME PLAYER, NEW SPELLING ({len(d['renames'])}) -- matched on the frozen id, not "
            f"the name")
        for row in d["renames"]:
            out(f"    {row['old_name']} -> {row['name']}  (id {row['key']})")
        out("")

    if d["badge_changes"]:
        out(f"BADGES ({len(d['badge_changes'])})")
        for row in d["badge_changes"]:
            out(f"    {_who(row)}: {row['old_badges']} -> {row['new_badges']}")
        out("")

    if d["note_changes"]:
        # The prose stays out of this report by decision -- the notes are Briggsy's voice, and
        # rerank.py already refuses to rewrite them by machine. Names are not prose.
        out(f"NOTES  {len(d['note_changes'])} changed (prose not printed -- the notes are "
            f"Briggsy's voice)")
        names = ", ".join(str(r["name"]) for r in d["note_changes"])
        out(f"    {names[:600]}")
        out("")

    other = [k for k, v in d["other_changed"].items() if v]
    if other:
        noun = "block" if len(other) == 1 else "blocks"
        out(f"ALSO CHANGED, NOT DIFFED HERE: the {' and '.join(other)} {noun}.")
        out(f"    No stable id and no judgment key live in there, so this tool reports THAT the")
        out(f"    {noun} moved and nothing more. (The snapshot deleted on 2026-08-08 drifted here.)")
        out("")

    joined = d["matched_by_name"]["new"] or d["matched_by_name"]["old"]
    if joined:
        out(f"!! {len(joined)} row(s) were joined on the NAME, not on the frozen sleeperId: "
            f"{', '.join(str(g) for g in joined[:12])}")
        out("   Either the id is missing on a side or it changed between runs. A re-spelling on")
        out("   one of those reads here as a drop plus an add. Every other row is joined on the id.")
        out("")
    missing = d["no_stable_id"]["old"] + d["no_stable_id"]["new"]
    if missing:
        out(f"!! {len(missing)} row(s) carry no sleeperId at all: "
            f"{', '.join(str(g) for g in missing[:12])}")
        out("   The id was frozen onto this board on 2026-08-07 (U14). A row without one cannot be")
        out("   followed across a rename.")
        out("")

    out(f"VERDICT: {verdict(d)}")
    moved = [b for b in JUDGMENT_BUCKETS if d[b]]

    if not m["same_synthesis"] and m["old"]["synthesized"] and m["new"]["synthesized"] \
            and not moved:
        out("")
        out("!! THE SYNTHESIS DATE MOVED AND NOTHING A HUMAN DECIDES DID. Either the newer scrape")
        out("   reproduced the old ordering exactly, or a fresh date was stamped over a stale one")
        out("   -- the runbook's named trap, since meta.rankings.synthesized is the ONLY field")
        out("   that answers \"how old is my ordering\". A date that moved for free earns one look.")

    stale = [(label, s, actual) for label, s, actual in
             (("FROM", old, recomputed_judgment(old["doc"])),
              ("TO", new, recomputed_judgment(new["doc"])))
             if actual and s["judgment"] and s["judgment"] != actual]
    if stale:
        # Recomputed with validate_board's own judgment_sha, so this is the checker's verdict
        # rather than a second opinion. It turns "one of these two is lying" into a name.
        out("")
        out("!! A STAMPED JUDGMENT DIGEST DOES NOT MATCH ITS OWN ROWS:")
        for label, s, actual in stale:
            out(f"   {label} {s['short']}: meta.rankings.judgment says {s['judgment']}, the rows "
                f"hash to {actual}.")
        out("   Only build_board.py writes that field, and only rerank.py moves r/pr/tier -- so a")
        out("   board committed BETWEEN those two steps carries the previous board's digest over a")
        out("   new ordering. That is the exact state one-refresh-one-commit exists to prevent.")
    elif m["same_judgment"] and moved:
        out("")
        out("!! CONTRADICTION: both sides stamp the SAME meta.rankings.judgment digest, but the")
        out(f"   rows above differ in {' / '.join(moved)}. That digest covers r/pr/tier/badges/"
            f"note,")
        out("   so one of the two is wrong. Do not trust the verdict until you know which.")
    elif (not m["same_judgment"]) and m["old"]["judgment"] and m["new"]["judgment"] and not moved:
        out("")
        out("!! CONTRADICTION: the two stamped judgment digests DIFFER, but this tool found no")
        out("   change in r/pr/tier/badges/note. The stamp and the rows disagree -- the board was")
        out("   likely stamped without a rebuild. Run `python scripts/build_board.py --verify-only`.")


def print_ledger(root, rel, out=print):
    runs = list_runs(root, rel)
    out(f"RUN LEDGER -- every commit that changed {BOARD_UNDER_PROJECT} (newest first)")
    out("")
    out(f"  {'commit':<9} {'when':<16}  {'synthesized':<11}  {'judgment':<16}  subject")
    if worktree_differs(root, rel):
        wt = board_meta(load(WORKTREE))
        out(f"  {'worktree':<9} {'(uncommitted)':<16}  {str(wt['synthesized'] or '?'):<11}  "
            f"{str(wt['judgment'] or '?'):<16}  DIFFERS FROM HEAD -- the freshest run is not "
            f"committed")
    for r in runs:
        meta = board_meta(load(r["sha"], root, rel))
        out(f"  {r['short']:<9} {r['when'][:16].replace('T', ' '):<16}  "
            f"{str(meta['synthesized'] or '?'):<11}  {str(meta['judgment'] or '?'):<16}  "
            f"{r['subject'][:58]}")
    out("")
    out(f"  {len(runs)} commit(s). A repeated judgment digest means that run changed no")
    out("  r/pr/tier/badges/note -- a rebuild or a surface fix, not a re-rank.")
    hidden = hidden_before_rename(root, rel)
    if hidden:
        out(f"  {hidden} older commit(s) hold the board under its pre-rename path (2026-08-07,")
        out(f"  \"family feud\" -> \"family-feud\"). `git show <ref>:{BOARD_UNDER_PROJECT}` cannot")
        out("  read them, so they are counted here rather than listed as rows that would all fail.")


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Compare two runs of the board. The archive is git; this is the reader.")
    ap.add_argument("--list", action="store_true",
                    help="the run ledger: every commit that changed the board, with its synthesis")
    ap.add_argument("--from", dest="from_ref", metavar="REF",
                    help="the older side (any git ref, or 'worktree')")
    ap.add_argument("--to", dest="to_ref", metavar="REF",
                    help="the newer side (default: the working tree if it differs from HEAD)")
    a = ap.parse_args(argv)

    root, rel = repo_root(), board_in_repo()

    if a.list:
        print_ledger(root, rel)
        return 0

    dirty = worktree_differs(root, rel)
    if a.from_ref or a.to_ref:
        to_ref = a.to_ref or (WORKTREE if dirty else "HEAD")
        from_ref = a.from_ref
        if from_ref is None:
            # --to alone: compare it against the run before it, not against nothing.
            runs = list_runs(root, rel)
            if is_worktree(to_ref):
                from_ref = runs[0]["sha"]
            else:
                target = resolve(to_ref, root)
                from_ref = next((runs[i + 1]["sha"] for i, r in enumerate(runs)
                                 if r["sha"] == target and i + 1 < len(runs)), None)
                if from_ref is None:
                    raise SystemExit(
                        f"{to_ref} is the oldest run of {rel} readable at this path, so there is "
                        f"no earlier one to compare it against. Pass --from explicitly.")
    else:
        runs = list_runs(root, rel)
        if len(runs) < 2:
            raise SystemExit(f"only 1 commit has ever changed {rel}, so there is no previous run "
                             f"to compare it against.")
        from_ref, to_ref = runs[1]["sha"], runs[0]["sha"]

    old = describe(from_ref, root, rel)
    new = describe(to_ref, root, rel)
    if old["ref"] == new["ref"]:
        raise SystemExit(f"both sides resolve to {old['short']} -- nothing can differ between a "
                         f"run and itself.")
    try:
        d = diff_boards(old["doc"], new["doc"])
    except ValueError as e:
        raise SystemExit(f"refusing to diff: {e}")

    # ALWAYS, whichever pair was asked for: an uncommitted refresh is the freshest run there is,
    # and a report about two older commits must not read as a report about the board on disk.
    if not (is_worktree(from_ref) or is_worktree(to_ref)):
        if dirty:
            # Reported as a real result, not a pointer: this command sits in the runbook's refresh
            # block BEFORE the commit, so at the moment it runs the freshest board is the one on
            # disk. A banner that only said "something differs" would be the least useful line in
            # the report at the exact moment it matters most.
            try:
                fresh = verdict(diff_boards(load("HEAD", root, rel), load(WORKTREE)))
            except ValueError as e:
                fresh = f"could not be compared -- {e}"
            print("!! THE WORKING TREE COPY DIFFERS FROM HEAD -- the freshest run is not "
                  "committed, and")
            print("   it is NOT either side of the comparison below.")
            print(f"   HEAD -> worktree: {fresh}")
            print("   The full table:  python scripts/board_diff.py --from HEAD")
        else:
            print("working tree: identical to HEAD. The newest run is committed.")
        print("")

    print_diff(old, new, d)
    return 0


if __name__ == "__main__":
    sys.exit(main())

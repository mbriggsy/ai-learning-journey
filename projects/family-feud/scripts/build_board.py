#!/usr/bin/env python3
"""U6 -- the generator. One command, every surface.

`players_data.json` is the source of truth. This reads it, enriches it, renders the HTML and the
PDF from it, runs the board schema gate against the STAGED set, and only on a green gate replaces
the live surfaces. On any failure it emits nothing and restores what was there.

    python scripts/build_board.py                 # refresh every surface
    python scripts/build_board.py --verify-only   # check the on-disk surfaces, write nothing
    python scripts/build_board.py --allow-dirty   # build over uncommitted draft-kit/ changes

WRITE-ALL-OR-WRITE-NONE. Windows gives an atomic per-file `os.replace` but no atomic multi-file
move, so the sequence is: stage everything into a temp dir -> gate the staged set -> copy the live
surfaces into `.last_good/` -> replace each -> on any exception, restore from `.last_good/`.
The acceptance test injects a raise into the PDF renderer and asserts zero on-disk bytes changed.

THE PLAN FORECAST THE WRONG CRASH. It predicted a badge glyph Helvetica cannot encode would kill
the PDF renderer mid-emit. reportlab 5.0.0 does not raise -- it silently substitutes ZapfDingbats
and writes a valid PDF carrying a different symbol, which is worse because it is quiet. So the
glyph guard here is a PRE-EMIT assertion (see `assert_pdf_safe`) rather than a try/except, and it
tests cp1252/WinAnsi -- the encoding reportlab's Type-1 base fonts actually use -- not Latin-1.
A Latin-1 assertion would reject the engine's own dagger glyph and all 34 em-dashes in the prose.
Worked through in docs/insights/011.

BYTE-STABILITY. `players_data.json` is `json.dumps(indent=1, ensure_ascii=False)`, CRLF, UTF-8,
with NO trailing newline. Regenerating an unchanged board must produce identical bytes, so the
serializer is pinned here and covered by a test rather than left to json's defaults.
"""

import argparse
import datetime as _dt
import gzip
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "draft-kit")
SCRIPTS = os.path.join(ROOT, "scripts")
sys.path.insert(0, KIT)
sys.path.insert(0, SCRIPTS)

import validate_board as G                                                        # noqa: E402
import render_html as RH                                                          # noqa: E402
import render_pdf as RP                                                           # noqa: E402

BOARD = os.path.join(KIT, "players_data.json")
HTML = os.path.join(KIT, "family-feud-draft-board.html")
PDF = os.path.join(KIT, "family-feud-cheat-sheet.pdf")
LEDGER = os.path.join(KIT, "sleeper_ids.json")
CURVE = os.path.join(KIT, "vorp_curve.json")
DUMP = os.path.join(KIT, "cache", "sleeper_players.json.gz")
MANIFEST = os.path.join(KIT, "build_manifest.json")
LAST_GOOD = os.path.join(KIT, ".last_good")
CARGO = os.path.join(ROOT, "newsletter", "data", "inbox", "sleeper_draft.json")
LEAGUE_CARGO = os.path.join(ROOT, "newsletter", "data", "inbox", "sleeper_league.json")

#: The three surfaces the generator owns. `players_data.json` is both source and output -- it is
#: read, enriched, and written back, which is why an unchanged rebuild has to be byte-stable.
SURFACES = ("players_data.json", "family-feud-draft-board.html", "family-feud-cheat-sheet.pdf")

#: Row key order. 150 rows shipped in this order and the 24 K/DEF rows shipped with `r` in 8th
#: position -- an artefact of the Aug 5 K/DEF patch. The generator normalises to one order; the
#: first build therefore changes bytes legitimately and every build after it is stable.
ROW_KEYS = ("r", "name", "pos", "team", "pr", "tier", "badges", "note",
            "vorp", "vbdRank", "vbdDelta", "sleeperId", "vorpMethod")

META_KEYS = ("league", "leagueId", "format", "updated", "owner", "badges",
             "kdef_patched", "vbd", "shape", "build")

#: Badge code -> the WinAnsi glyph the PDF and the engine print. NOT invented here: this is the
#: table already hardcoded at draft_engine.py:508 and already rendered in the shipped PDF, lifted
#: to the source so the engine, the PDF and the HTML stop each holding their own copy.
#: All eight encode under cp1252; `†` is the one that would fail a Latin-1 test.
BADGE_GLYPHS = {"T": "»", "B": "+", "X": "!", "I": "†",
                "R": "°", "U": "^", "D": "v", "S": "§"}

SKILL = ("QB", "RB", "WR", "TE")

#: Provenance per row, gate-enforced. KTD-6 divides VORP by region: the curve owns replacement
#: baselines and K/DEF, projections own skill-player values. Projection VORP (v2) is deferred
#: (plan line 430), so skill values are CARRIED from the board rather than recomputed -- the
#: shipped 2021-2024 curve is not the source KTD-6 assigns to that region, and recomputing from
#: it would move 143 of 174 rows and hand VBD #1 from Gibbs to Chase. `--diff` reports what a
#: recompute would do so that stays a visible decision instead of a silent one.
#: Retained only so a board written before the 2026-08-08 recompute is still
#: recognisable; the generator never writes it now.
VORP_CARRIED = "carried:board"
VORP_KDEF = "carried:kdef-tier-flat"


def curve_method(curve_path=CURVE):
    """`curve:<first>-<last>`, naming the seasons the value actually descends from."""
    with open(curve_path, encoding="utf-8") as f:
        yrs = ((json.load(f).get("meta") or {}).get("seasons") or [])
    return f"curve:{min(yrs)}-{max(yrs)}" if yrs else "curve"


def recompute_vorp(players, curve, baselines, method):
    """Derive `vorp` for every skill row from the curve, then re-rank the whole board.

    WHY THIS REPLACED CARRYING THE BOARD'S NUMBERS. The Aug 5 values were produced by the
    Cowork-era pipeline, which no longer exists -- they could not be verified, audited, or
    regenerated, and they were the ONLY figures on the board that the generator did not
    generate. Worse, they could not survive a refresh: the gate requires
    {vorp, vbdRank, vbdDelta} all-present-or-all-absent board-wide, so adding one player to the
    board left a row with no vorp and no way to compute one. The plan's load-bearing requirement
    is repeated interactive refresh, so carrying was a dead end.

    K AND DEF KEEP THEIR FLAT PER-TIER CONSTANTS. build_curves.py builds QB/RB/WR/TE only, so
    KTD-6's "K and DEF keep the historical curve" is not satisfiable from the shipped curve.
    Inventing values would be worse than labelling the gap, so those rows stay carried and say so.

    Within a position nothing reorders -- the curve is a rank->points lookup with `pr` as its
    input, so vorp is monotone in pr by construction (verified: 0 order violations across all 150
    skill rows). What moves is the CROSS-positional comparison, which is the only thing VORP is
    for.
    """
    out = []
    for p in players:
        q = dict(p)
        pos, pr = q.get("pos"), q.get("pr")
        table = curve.get(pos) or {}
        base = baselines.get(pos)
        if table and base is not None and str(pr) in table and str(base) in table:
            # round() is mandatory: 145 of 320 curve subtractions produce float noise
            # (373.1 - 118.7 = 254.40000000000003), and a float vbdDelta kills the engine.
            q["vorp"] = round(table[str(pr)] - table[str(base)], 1)
            q["vorpMethod"] = method
        else:
            q["vorpMethod"] = VORP_KDEF
        out.append(q)

    # Re-rank the whole board on the new values. Ties break on board rank so the ordering is
    # deterministic -- vbdRank must be contiguous 1..N with no duplicates or the gate refuses.
    for rank, q in enumerate(sorted(out, key=lambda x: (-x["vorp"], x["r"])), start=1):
        q["vbdRank"] = rank
        q["vbdDelta"] = q["r"] - rank
    return out


class Refuse(Exception):
    """Raised for every condition that must stop the build BEFORE anything is written."""


class Incomplete(Exception):
    """Raised when the surfaces landed but a follow-on step failed.

    Distinct from `Refuse` because the operator's next move is opposite. `Refuse` means nothing
    changed and the board on disk is the one you had. This means the surfaces ARE new and
    something downstream of them -- a doc block, the old-value sweep -- still disagrees. Printing
    "REFUSED TO EMIT" for this would tell a person at 7am that their board was untouched when it
    had in fact just been replaced.
    """


# ---------------------------------------------------------------- byte-exact serialization


def board_bytes(d):
    """Serialize the board exactly as it ships: indent=1, literal UTF-8, CRLF, no final newline.

    Pinned rather than inferred. `json.dumps` escapes any newline inside a string value as \\n,
    so the blanket CRLF translation cannot corrupt prose.
    """
    return json.dumps(d, indent=1, ensure_ascii=False).replace("\n", "\r\n").encode("utf-8")


def read_board(path=BOARD):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _ordered(d, order):
    """Re-key a dict into `order`, keeping any unexpected key after the known ones."""
    out = {k: d[k] for k in order if k in d}
    out.update({k: v for k, v in d.items() if k not in out})
    return out


# ---------------------------------------------------------------- pre-emit assertions


def assert_pdf_safe(strings):
    """Every string bound for the PDF must survive cp1252, or the page lies quietly.

    reportlab does not raise on an unencodable character -- it silently falls back to
    ZapfDingbats and prints a different symbol (docs/insights/011). There is no exception to
    catch, so this runs BEFORE anything is rendered. cp1252/WinAnsi is the correct codec:
    Latin-1 would reject `†` (the engine's own I badge) and every em-dash in the prose.
    """
    bad = []
    for label, s in strings:
        for ch in str(s):
            try:
                ch.encode("cp1252")
            except UnicodeEncodeError:
                bad.append(f"{label}: U+{ord(ch):04X} {ch!r} is not cp1252-encodable, so "
                           f"reportlab would silently substitute a different glyph")
                break
    return bad


def assert_no_dated_snapshot(kit=KIT):
    """KTD-2: the dated twin is deleted and the filename class may never reappear."""
    stray = sorted(n for n in os.listdir(kit)
                   if re.fullmatch(r"draft_rankings_data_\d{4}-\d{2}-\d{2}\.json", n))
    return [f"{n} is back at draft-kit/ root -- KTD-2 deleted the dated snapshot permanently; "
            f"git is the archive (git checkout <sha> -- draft-kit/)" for n in stray]


def git_dirty(paths=("draft-kit",)):
    """Uncommitted work in draft-kit/, or a hard refusal if git cannot answer.

    Returning [] when git FAILS would report a clean tree on no evidence and silently disable the
    only guard standing between a rebuild and unrecoverable hand edits -- the shape insight 007
    names: a health signal that reports success for something it never checked.
    """
    try:
        out = subprocess.run(["git", "status", "--porcelain", "--"] + list(paths),
                             cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
                             timeout=30)
    except (OSError, subprocess.SubprocessError) as e:
        raise Refuse(f"could not run git to check for uncommitted work ({e}). The dirty guard is "
                     f"what stops a rebuild destroying hand edits, so this refuses rather than "
                     f"assuming the tree is clean. Pass --allow-dirty if you accept the risk.")
    if out.returncode != 0:
        raise Refuse(f"git status exited {out.returncode}: {(out.stderr or '').strip()[:200]}. "
                     f"Refusing rather than assuming draft-kit/ is clean.")
    return [ln for ln in (out.stdout or "").splitlines() if ln.strip()]


# ---------------------------------------------------------------- the draft object (KTD-7)


def read_shape(cargo=CARGO, league_cargo=LEAGUE_CARGO):
    """League shape comes from the draft and league objects, never from a typed constant or prose.

    The mule already hauls both hourly, so there is no new fetch. Stamped with the draft_id it
    descends from, so `meta.shape` can be re-checked against its origin later.

    It REFUSES rather than guesses on a non-snake or reversal draft: every pick-slot computation
    in this repo assumes plain snake, and computing a wrong pick order silently is the failure
    mode this whole rebuild exists to prevent.
    """
    if not os.path.exists(cargo):
        raise Refuse(f"no draft object at {cargo} -- the mule's cargo is how league shape is "
                     f"known (KTD-7). Run the mule before building.")
    with open(cargo, encoding="utf-8-sig") as f:
        d = json.load(f)
    s = d.get("settings") or {}
    missing = [k for k in ("teams", "rounds") if not s.get(k)]
    if missing:
        raise Refuse(f"the draft object is missing {missing} -- refusing to guess league shape")
    if d.get("type") != "snake":
        raise Refuse(f"draft type is {d.get('type')!r}, not 'snake' -- every pick-slot "
                     f"computation in this repo assumes snake")
    if s.get("reversal_round"):
        raise Refuse(f"reversal_round is {s['reversal_round']} -- third-round reversal silently "
                     f"invalidates every pick-slot computation")

    ls = {}
    if os.path.exists(league_cargo):
        with open(league_cargo, encoding="utf-8-sig") as f:
            ls = (json.load(f).get("settings") or {})

    shape = {
        "draft_id": str(d.get("draft_id") or ""),
        "season": str(d.get("season") or ""),
        "status": d.get("status"),
        "start_time": d.get("start_time"),
        "teams": int(s["teams"]),
        "rounds": int(s["rounds"]),
        "type": d.get("type"),
        "reversal_round": int(s.get("reversal_round") or 0),
        "starters": {"QB": int(s.get("slots_qb") or 0), "RB": int(s.get("slots_rb") or 0),
                     "WR": int(s.get("slots_wr") or 0), "TE": int(s.get("slots_te") or 0),
                     "K": int(s.get("slots_k") or 0), "DEF": int(s.get("slots_def") or 0)},
        "flex": int(s.get("slots_flex") or 0),
        "bench": int(s.get("slots_bn") or 0),
        "ir": int(ls.get("reserve_slots") or 0),
        "playoff_teams": int(ls.get("playoff_teams") or 0),
    }
    if ls.get("num_teams") and int(ls["num_teams"]) != shape["teams"]:
        raise Refuse(f"the draft object says {shape['teams']} teams but the league object says "
                     f"{ls['num_teams']} -- two sources disagree about league shape")
    return shape


# ---------------------------------------------------------------- enrichment


def team_names(dump_path=DUMP):
    """team code -> official full name, derived from the pinned dump.

    The plan called for hand-typing this table because "that mapping exists nowhere in the repo".
    U14 committed the dump two days later and it carries all 32 (docs/insights/012). Hand-typing
    it would have created exactly the hand-maintained duplicate KTD-1 exists to kill.
    """
    with gzip.open(dump_path, "rt", encoding="utf-8") as f:
        players = json.load(f)["players"]
    return {k: f"{v['first_name']} {v['last_name']}"
            for k, v in players.items() if v.get("position") == "DEF"}


def derive_dst(players):
    """`dst` is a projection of the DEF rows, never carried forward.

    No lookup table is involved: a DEF row already holds the full team name in `name`.
    """
    defs = sorted((p for p in players if p.get("pos") == "DEF"), key=lambda p: p["pr"])
    return [{"rank": p["pr"], "team": p["name"]} for p in defs if p["pr"] <= 8]


def check_def_identity(players, names):
    """A DEF row's own name is an attribute a wrong row would also have, so it is not
    self-verifying. Cross-check it against the dump's official name for its team code -- the
    lesson from docs/insights/010, applied to the one join that has no other witness."""
    bad = []
    for p in players:
        if p.get("pos") != "DEF":
            continue
        official = names.get(p.get("team"))
        if official is None:
            bad.append(f"DEF row {p.get('name')!r} has team {p.get('team')!r}, which is not one "
                       f"of the 32 team codes in the pinned dump")
        elif official != p.get("name"):
            bad.append(f"DEF row named {p.get('name')!r} carries team {p.get('team')!r}, whose "
                       f"official name is {official!r} -- the row names a different franchise")
    return bad


def enrich(d, shape, ledger, dump_meta, names, generator_sha, dirty=False, now=None):
    """Produce the emitted source from the read source. Pure apart from the clock."""
    players = [dict(p) for p in d["players"]]

    # The ledger entry is a provenance RECORD -- {sleeperId, evidence, resolved_on,
    # dump_fetched_at} -- not a bare id. Stamping the record onto the row would double the file
    # and copy the resolver's evidence into the source, which KTD-1 forbids: the ledger already
    # owns it. Take the id the same way the engine does, `str(e["sleeperId"])`.
    ids = {}
    for name, entry in ((ledger or {}).get("ids") or {}).items():
        pid = entry.get("sleeperId") if isinstance(entry, dict) else entry
        if pid:
            ids[name] = str(pid)

    unresolved = [p["name"] for p in players if not ids.get(p["name"])]
    if unresolved:
        raise Refuse(f"{len(unresolved)} board row(s) have no frozen Sleeper id, e.g. "
                     f"{unresolved[:5]} -- run scripts/resolve_sleeper_ids.py before building")

    for p in players:
        p["sleeperId"] = ids[p["name"]]

    if os.path.exists(CURVE):
        with open(CURVE, encoding="utf-8") as f:
            curve = json.load(f).get("curve") or {}
        baselines = ((d["meta"].get("vbd") or {}).get("baselineWaiver") or {})
        players = recompute_vorp(players, curve, baselines, curve_method())
    else:
        raise Refuse(f"no VORP curve at {CURVE} -- run scripts/build_curves.py. The board's "
                     f"values must be derivable, not carried from a pipeline that no longer "
                     f"exists.")

    meta = dict(d["meta"])
    badges = {}
    for code, spec in meta["badges"].items():
        if code not in BADGE_GLYPHS:
            raise Refuse(f"badge {code!r} has no PDF glyph -- add one to BADGE_GLYPHS, because "
                         f"its emoji icon cannot be printed by Helvetica")
        badges[code] = _ordered(dict(spec, glyph=BADGE_GLYPHS[code]),
                                ("label", "icon", "glyph", "desc"))
    meta["badges"] = badges
    meta["shape"] = shape

    # meta.updated must not claim to predate an input the board was built from -- the gate
    # compares it against the dump's UTC fetch date AND three local mtimes, and the same fetch
    # event can render as two different dates. Take the max so the stamp is true under both.
    today = (now or _dt.date.today())
    floors = [today]
    fetched = str(dump_meta.get("dump_fetched_at") or "")[:10]
    if fetched:
        floors.append(_dt.date.fromisoformat(fetched))
    for path in (LEDGER, DUMP, CURVE):
        if os.path.exists(path):
            floors.append(_dt.date.fromtimestamp(os.path.getmtime(path)))
    meta["updated"] = max(floors).isoformat()

    meta["build"] = {
        "generator_sha": generator_sha,
        "source_sha256": hashlib.sha256(board_bytes(
            {"meta": d["meta"], "players": d["players"],
             "dst": d["dst"], "strategy": d["strategy"]})).hexdigest(),
        "curve_sha256": sha256(CURVE) if os.path.exists(CURVE) else None,
        "sleeper_dump_fetched_at": dump_meta.get("dump_fetched_at"),
        "built_at": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
        "dirty": bool(dirty),
    }

    out = {
        "meta": _ordered(meta, META_KEYS),
        "players": [_ordered(p, ROW_KEYS) for p in players],
        "dst": derive_dst(players),
        "strategy": d["strategy"],
    }

    problems = check_def_identity(players, names)
    if problems:
        raise Refuse("; ".join(problems))
    return out


# ---------------------------------------------------------------- staging and emit


def stage(source, staging):
    """Render every surface into `staging`. Nothing here touches draft-kit/."""
    os.makedirs(staging, exist_ok=True)
    board_path = os.path.join(staging, "players_data.json")
    with open(board_path, "wb") as f:
        f.write(board_bytes(source))

    bad = assert_pdf_safe(RP.pdf_strings(source))
    if bad:
        raise Refuse("text bound for the PDF is not cp1252-encodable, so reportlab would "
                     "silently print a different glyph:\n  - " + "\n  - ".join(bad))

    RH.render(source, os.path.join(staging, "family-feud-draft-board.html"))
    RP.render(source, os.path.join(staging, "family-feud-cheat-sheet.pdf"))
    return staging


def gate_staged(staging, full=True):
    """Run the board schema gate against the STAGED surfaces, never the live ones.

    `validate()` already takes path overrides; `check_engine_replay` already takes a `kit`.
    Forwarding the kit is what makes --full replay the board about to ship rather than the one
    on disk -- without it the execution gate would bless the wrong file.
    """
    kit = os.path.join(staging, "kit")
    os.makedirs(kit, exist_ok=True)
    for name in ("normalize.py", "norm_spec.json", "sleeper_ids.json"):
        src = os.path.join(KIT, name)
        if os.path.exists(src):
            shutil.copy(src, kit)
    shutil.copy(os.path.join(staging, "players_data.json"), kit)

    return G.validate(board_path=os.path.join(staging, "players_data.json"),
                      ledger_path=LEDGER, dump_path=DUMP,
                      html=os.path.join(staging, "family-feud-draft-board.html"),
                      pdf=os.path.join(staging, "family-feud-cheat-sheet.pdf"),
                      full=full, kit=kit)


def emit(staging, kit=KIT, last_good=LAST_GOOD):
    """Replace every surface, or none of them.

    Step 0 is an unconditional copy of the live surfaces into `.last_good/`, because Windows has
    no atomic multi-file move: if the third `os.replace` fails, the first two already landed and
    only a restore puts the set back.
    """
    if os.path.isdir(last_good):
        shutil.rmtree(last_good)
    os.makedirs(last_good)
    saved, absent = [], []
    for name in SURFACES:
        live = os.path.join(kit, name)
        if os.path.exists(live):
            shutil.copy2(live, os.path.join(last_good, name))
            saved.append(name)
        else:
            # A surface that did not exist cannot be restored by copying something back -- the
            # rollback has to DELETE it. Without this the "or none of them" half is false on a
            # first build or after a surface is removed: the replace lands, a later one fails,
            # and the new file survives a "successful" restore.
            absent.append(name)

    done = []
    try:
        for name in SURFACES:
            os.replace(os.path.join(staging, name), os.path.join(kit, name))
            done.append(name)
    except BaseException:
        # BaseException, not Exception: KeyboardInterrupt and SystemExit do not inherit from
        # Exception, and Ctrl-C between two replaces is exactly the moment the surfaces are torn.
        # Restoring is the one thing that must still happen on the way out.
        for name in saved:
            shutil.copy2(os.path.join(last_good, name), os.path.join(kit, name))
        for name in absent:
            live = os.path.join(kit, name)
            if os.path.exists(live):
                os.remove(live)
        raise
    return done


def write_manifest(kit=KIT, path=MANIFEST):
    surfaces = {n: sha256(os.path.join(kit, n)) for n in SURFACES}
    # `written_at` is wall-clock, so restamping it on an unchanged rebuild would churn the file
    # that exists to prove the surfaces did NOT change. Carry it forward when the shas match.
    written_at = _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            old = json.load(f)
        if (old.get("surfaces") or {}) == surfaces and old.get("written_at"):
            written_at = old["written_at"]
    payload = {"surfaces": surfaces, "written_at": written_at}
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    return payload


def check_manifest(kit=KIT, path=MANIFEST):
    """The only detector for "a surface was hand-edited" -- and the only one that covers the PDF,
    which has no comment channel to carry a warning."""
    if not os.path.exists(path):
        return ["no build_manifest.json -- the surfaces have never been generated, so nothing "
                "can prove they were not hand-edited"]
    with open(path, encoding="utf-8") as f:
        want = (json.load(f).get("surfaces") or {})
    problems = []
    for name in SURFACES:
        live = os.path.join(kit, name)
        if not os.path.exists(live):
            problems.append(f"{name} is missing")
        elif name not in want:
            problems.append(f"{name} is not in the manifest")
        elif sha256(live) != want[name]:
            problems.append(f"{name} no longer matches its manifest sha256 -- it was edited by "
                            f"hand, or generated by something other than build_board.py")
    return problems


# ---------------------------------------------------------------- the refresh diff report


def diff_report(before, after, curve_path=CURVE):
    """One page Briggsy can actually review, instead of a 53 KB diff."""
    lines = []
    b = {p["name"]: p for p in before["players"]}
    a = {p["name"]: p for p in after["players"]}
    added, removed = sorted(set(a) - set(b)), sorted(set(b) - set(a))
    moved = [(n, b[n]["r"], a[n]["r"]) for n in sorted(set(a) & set(b))
             if b[n]["r"] != a[n]["r"]]

    lines.append(f"rows: {len(b)} -> {len(a)}")
    if added:
        lines.append(f"  added   ({len(added)}): {added[:12]}")
    if removed:
        lines.append(f"  removed ({len(removed)}): {removed[:12]}")
    lines.append(f"  rank changed: {len(moved)}" + (f" e.g. {moved[:6]}" if moved else ""))

    pos_b, pos_a = {}, {}
    for p in before["players"]:
        pos_b[p["pos"]] = pos_b.get(p["pos"], 0) + 1
    for p in after["players"]:
        pos_a[p["pos"]] = pos_a.get(p["pos"], 0) + 1
    lines.append("  per position: " + ", ".join(
        f"{k} {pos_b.get(k, 0)}->{pos_a.get(k, 0)}" for k in sorted(set(pos_b) | set(pos_a))))

    # ids that WOULD have changed must be zero -- a moved join key is a silent correctness bug.
    rekeyed = [n for n in sorted(set(a) & set(b))
               if b[n].get("sleeperId") and b[n].get("sleeperId") != a[n].get("sleeperId")]
    lines.append(f"  sleeperId changed: {len(rekeyed)}" + (f"  !! {rekeyed[:6]}" if rekeyed else
                                                           "  (must be 0)"))

    dv = [(n, round(a[n]["vorp"] - b[n]["vorp"], 1)) for n in sorted(set(a) & set(b))
          if a[n].get("vorp") is not None and b[n].get("vorp") is not None]
    changed = [x for x in dv if x[1]]
    lines.append(f"  vorp changed: {len(changed)}, max |delta| "
                 f"{max((abs(x[1]) for x in changed), default=0.0)}")

    lines.append("")
    methods = {}
    for p in after["players"]:
        m = p.get("vorpMethod", "?")
        methods[m] = methods.get(m, 0) + 1
    lines.append("  VORP provenance (KTD-6), per row:")
    for m, n in sorted(methods.items()):
        lines.append(f"    {n:3} rows  {m}")
    lines.append("  K and DEF keep flat per-tier constants -- build_curves.py builds QB/RB/WR/TE")
    lines.append("  only, so the curve cannot supply them. Labelled, not invented.")
    return "\n".join(lines)


# ---------------------------------------------------------------- CLI


# ---------------------------------------------------------------- generated documentation


METHODOLOGY = os.path.join(ROOT, "docs", "ranking-methodology.md")


def _headline_rows(source):
    """The highest-VORP row in each of RB, WR, QB -- the three the worked example explains.

    Chosen by position rather than named, so the table follows the board instead of pinning
    whoever happened to lead it in August.
    """
    out = []
    for pos in ("RB", "WR", "QB"):
        rows = [p for p in source["players"] if p["pos"] == pos and p.get("vorp") is not None]
        if rows:
            out.append(max(rows, key=lambda p: p["vorp"]))
    return out


def methodology_blocks(source, curve_path=CURVE):
    """The GENERATED block bodies, keyed by block name."""
    vbd = (source["meta"].get("vbd") or {})
    base, last = vbd.get("baselineWaiver") or {}, vbd.get("lastStarter") or {}

    rows = ["| Pos | Last starter league-wide | Waiver replacement (VORP baseline) |",
            "|-----|--------------------------|-------------------------------------|"]
    for pos in ("QB", "RB", "WR", "TE"):
        rows.append(f"| {pos}  | {pos}{last.get(pos, '?')} | **{pos}{base.get(pos, '?')}** |")

    ex = ["| Player | VORP | Read as |", "|--------|------|---------|"]
    reads = {"RB": "points/season better than the free RB", "WR": "points better than the free WR",
             "QB": "points better than the free QB"}
    for p in _headline_rows(source):
        ex.append(f"| {p['name']} | **{p['vorp']}** | {round(p['vorp'])} "
                  f"{reads.get(p['pos'], 'points over replacement')} "
                  f"({p['pos']}{base.get(p['pos'], '?')} is the bar) |")

    seasons, excludes, built_from = "unknown", "nothing", "nflverse weekly player stats"
    if os.path.exists(curve_path):
        with open(curve_path, encoding="utf-8") as f:
            cm = (json.load(f).get("meta") or {})
        yrs = cm.get("seasons") or []
        if yrs:
            seasons = f"{min(yrs)}–{max(yrs)}"
        excludes = ", ".join(f"`{e}`" for e in (cm.get("excludes") or [])) or "nothing"
    prov = (f"**Curve provenance:** seasons {seasons}, built from {built_from}, "
            f"excluding {excludes}.")

    updated = str(source["meta"].get("updated", ""))
    when = _dt.date.fromisoformat(updated) if updated else None
    snapshot = (f"*Rankings snapshot: {when:%B} {when.day}, {when.year}.*" if when
                else "*Rankings snapshot: unknown.*")

    return {"baselines": "\n".join(rows),
            "worked-example": "\n".join(ex),
            "curve-provenance": prov,
            "snapshot-date": snapshot}


def write_methodology(source, path=METHODOLOGY, curve_path=CURVE):
    """Rewrite every BEGIN/END GENERATED block. Refuses if a block it owns has gone missing --
    a silently vanished block is a number that quietly reverted to hand-maintained."""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    for name, body in methodology_blocks(source, curve_path).items():
        pattern = re.compile(rf"(<!-- BEGIN GENERATED {re.escape(name)}[^>]*-->\n).*?"
                             rf"(\n<!-- END GENERATED {re.escape(name)} -->)", re.S)
        if not pattern.search(text):
            raise Refuse(f"{os.path.basename(path)} has no GENERATED block named {name!r}; the "
                         f"figures it carried would silently go back to being hand-typed")
        text = pattern.sub(lambda m: m.group(1) + body + m.group(2), text, count=1)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    return path


# ---------------------------------------------------------------- the old-value sweep


SWEEP_SKIP = {".git", "__pycache__", "temp", "node_modules", ".last_good", "cache", "archive"}

#: Directories that legitimately quote PAST values and must never be "corrected".
#: `docs/insights/` are worked historical cases -- insight 005 records Gibbs at 268.4 as the
#: measurement it was, and rewriting it would destroy the evidence. `docs/plans/` is a decision
#: artifact, frozen by the same logic. `newsletter/data/` is hauled cargo and runtime state.
#: A sweep that flags these reports a dozen false positives on every build, and a check that
#: cries wolf gets switched off -- which is worse than not having it.
SWEEP_EXEMPT = (os.path.join("docs", "insights"), os.path.join("docs", "plans"),
                os.path.join("newsletter", "data"))


def board_quantities(d):
    """Every board-derived figure that appears as a literal in prose somewhere in this repo."""
    vbd = ((d.get("meta") or {}).get("vbd") or {})
    q = {}
    for group in ("baselineWaiver", "lastStarter"):
        for pos, val in (vbd.get(group) or {}).items():
            q[f"meta.vbd.{group}.{pos}"] = f"{pos}{val}"
    for p in _headline_rows(d):
        q[f"vorp[{p['name']}]"] = str(p["vorp"])

    # meta.updated is deliberately NOT swept. A date is not a distinctive token -- every doc in
    # this repo carries dates for unrelated reasons, so sweeping it produced eight hits and not
    # one of them was a stale board figure. The board's visible dates are covered properly
    # instead: the HTML header is checked by the gate against meta.updated, and the methodology
    # doc's snapshot line is a GENERATED block.
    return q


def old_value_sweep(before, after, root=ROOT):
    """Grep the repo for the PREVIOUS value of every quantity that changed.

    Only possible because the generator holds both sides. This is the mechanical form of the
    stats-single-source rule: a refresh that updates the board and leaves an old number in a doc
    has not finished, and nobody notices until the number is read under time pressure.

    The generated surfaces are skipped -- they are rewritten from the source by definition, and
    the previous value legitimately appears in git history rather than on disk.
    """
    old, new = board_quantities(before), board_quantities(after)
    stale = {k: v for k, v in old.items() if k in new and new[k] != v and v}
    if not stale:
        return []

    problems = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SWEEP_SKIP]
        rel_dir = os.path.relpath(dirpath, root)
        if any(rel_dir == e or rel_dir.startswith(e + os.sep) for e in SWEEP_EXEMPT):
            continue
        for fn in filenames:
            # Prose surfaces only. Code holds these numbers as data read from the board, never as
            # literals, and a .json under draft-kit/ is either a generated surface or a cache.
            if not fn.endswith((".md", ".html")) or fn in SURFACES:
                continue
            path = os.path.join(dirpath, fn)
            try:
                with open(path, encoding="utf-8") as f:
                    text = f.read()
            except (UnicodeDecodeError, OSError):
                continue
            for key, was in sorted(stale.items()):
                if re.search(rf"(?<![\w.]){re.escape(was)}(?![\w.])", text):
                    problems.append(f"{os.path.relpath(path, root)} still says {was!r} for {key}, "
                                    f"which is now {new[key]!r}")
    return problems


def _without_build(d):
    meta = {k: v for k, v in (d.get("meta") or {}).items() if k != "build"}
    return {"meta": meta, "players": d.get("players"),
            "dst": d.get("dst"), "strategy": d.get("strategy")}


def _content_equal(a, b):
    """True when two boards differ only in their build provenance."""
    return "build" in (a.get("meta") or {}) and _without_build(a) == _without_build(b)


def verify_only(kit=KIT, full=True):
    problems = check_manifest(kit=kit)
    problems += assert_no_dated_snapshot(kit=kit)
    problems += G.validate(full=full)
    return problems


def build(allow_dirty=False, full=True, now=None):
    dirty = git_dirty()
    if dirty and not allow_dirty:
        raise Refuse("draft-kit/ has uncommitted changes, so a rebuild would destroy work that "
                     "is not in git:\n  " + "\n  ".join(dirty[:10]) +
                     "\n\nCommit them, or pass --allow-dirty (which stamps meta.build.dirty).")

    stray = assert_no_dated_snapshot()
    if stray:
        raise Refuse("; ".join(stray))

    before = read_board()
    with open(LEDGER, encoding="utf-8") as f:
        ledger = json.load(f)
    shape = read_shape()
    names = team_names()
    source = enrich(before, shape, ledger, ledger.get("meta") or {}, names,
                    generator_sha=sha256(os.path.abspath(__file__)), dirty=bool(dirty), now=now)

    # BYTE-STABILITY. meta.build carries a wall-clock `built_at`, so restamping it on every run
    # would make an unchanged rebuild produce a diff -- exactly the spurious churn the plan's
    # byte-stable criterion forbids. Compare everything EXCEPT meta.build; if nothing moved,
    # carry the previous provenance forward and the bytes are identical.
    if _content_equal(before, source):
        source["meta"]["build"] = before["meta"]["build"]

    with tempfile.TemporaryDirectory() as t:
        staging = stage(source, os.path.join(t, "staged"))
        problems = gate_staged(staging, full=full)
        if problems:
            raise Refuse(f"the gate REFUSED the staged board ({len(problems)} problem(s)); "
                         f"nothing was written:\n  - " + "\n  - ".join(problems))
        emit(staging)

    write_manifest()

    # The docs carry board figures as prose. Regenerate the blocks that own them, THEN sweep the
    # repo for the previous value of anything that moved -- a refresh that updates the board and
    # leaves a stale number in a doc has not finished, and nobody finds out until someone reads
    # that number on draft morning.
    try:
        write_methodology(source)
    except Refuse as e:
        raise Incomplete(str(e))
    stale = old_value_sweep(before, source)
    if stale:
        raise Incomplete("these files still carry a PREVIOUS value:\n  - " + "\n  - ".join(stale)
                         + "\n\nUpdate them; the board and the docs now disagree.")
    return before, source


def main(argv=None):
    ap = argparse.ArgumentParser(description="Generate every board surface from one source.")
    ap.add_argument("--verify-only", action="store_true",
                    help="gate the on-disk surfaces and their manifest; write nothing")
    ap.add_argument("--allow-dirty", action="store_true",
                    help="build over uncommitted draft-kit/ changes (stamps meta.build.dirty)")
    ap.add_argument("--fast", action="store_true",
                    help="skip the engine replay (static + cross-surface only)")
    a = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if a.verify_only:
        problems = verify_only(full=not a.fast)
        if problems:
            print(f"!! the on-disk surfaces FAIL {len(problems)} check(s)\n")
            for p in problems:
                print(f"  - {p}")
            return 1
        print("surfaces OK: every check passed and every sha256 matches the manifest")
        return 0

    try:
        before, after = build(allow_dirty=a.allow_dirty, full=not a.fast)
    except Refuse as e:
        print(f"!! REFUSED TO EMIT -- nothing was written; the board on disk is unchanged.\n\n{e}")
        return 1
    except Incomplete as e:
        print(f"!! THE SURFACES WERE WRITTEN, BUT THE REFRESH IS NOT COMPLETE.\n"
              f"   {', '.join(SURFACES)} are new and valid. What follows is downstream of them.\n\n{e}")
        return 1
    print("wrote " + ", ".join(SURFACES) + "\n")
    print(diff_report(before, after))
    return 0


if __name__ == "__main__":
    sys.exit(main())

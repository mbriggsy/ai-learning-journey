#!/usr/bin/env python3
"""Family Feud live draft engine.
Input:  picks.json  — Sleeper /draft/<id>/picks array (cumulative)
        players_data.json — our board
        slot_names.json — optional seat -> human (hand-authored, gitignored)
        ../newsletter/data/inbox/ — mule cargo, read as an ORACLE only, never required
Usage:  python3 draft_engine.py <my_slot> [teams] [rounds] [draft_id]
Output: compact war-room advisory: board state, rosters/needs, runs,
        tier cliffs, picks-until-mine, naive queue (Claude overlays judgment).

The four hand-supplied inputs are cross-checked against the draft itself before any advice is
computed -- see the input gate below. A wrong seat used to produce a complete, confident advisory
for somebody else's team and exit 0.
"""
import json, os, sys
from collections import defaultdict, Counter

# The name normalizer lives in ONE place -- draft-kit/normalize.py -- because six things want it
# (this engine twice, the live board's JS, the schema gate, the Wire matcher, the id resolver).
# It used to live here twice: norm() and tokens() repeated three of four cleaning steps verbatim.
# This is an import, never a literal-name file read: Python puts THIS script's directory on
# sys.path regardless of cwd, so the engine still runs from wherever the operator is standing.
from normalize import norm, tokens  # noqa: E402

# --- Windows encoding guard. Do not remove; this file is draft-day critical. ---
# Python on Windows defaults BOTH file reads and stdout to the locale codepage (cp1252 on
# Briggsy's laptop, Python 3.14). Two consequences, each fatal and neither visible under
# Cowork's Linux sandbox where this engine was written:
#   1. players_data.json is UTF-8 and carries emoji badge icons, so a bare open() dies with
#      UnicodeDecodeError on byte 0x8f before a single rank is read.
#   2. this script prints the U+26A0 cliff warning, which cp1252 cannot ENCODE, so even a
#      clean load would die on the first tier-cliff line.
# Every open() below therefore passes encoding="utf-8" explicitly, and stdout is forced to
# UTF-8 here. Python 3.15 makes UTF-8 the default (PEP 686) and will render this redundant,
# not wrong.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # non-reconfigurable stream (piped/redirected oddly) — glyphs degrade, no crash
    pass

# my_slot is REQUIRED and has no safe default. It decides which picks are ours, how far away our
# turn is, and therefore every line of advice below. It used to default to 3, which meant running
# the engine with no arguments produced a complete, confident, WRONG advisory -- indistinguishable
# from a correct one. The real draft's draft_order is null until near go time, so "I forgot to pass
# the slot" is a live draft-day scenario, not a hypothetical. Fail loudly instead.
if len(sys.argv) < 2:
    sys.exit("usage: draft_engine.py <my_slot> [teams=8] [rounds=16] [draft_id]\n"
             "  my_slot is REQUIRED -- read it from the draft's draft_order for user_id\n"
             "  1390750540631150592. Guessing it produces a confident wrong advisory.\n"
             "  draft_id is optional but recommended: pass it and picks.json is checked against\n"
             "  it, so a spent mock's picks cannot advise a live draft.")
MY_SLOT = int(sys.argv[1])
TEAMS   = int(sys.argv[2]) if len(sys.argv) > 2 else 8
ROUNDS  = int(sys.argv[3]) if len(sys.argv) > 3 else 16
EXPECT  = sys.argv[4].strip().rstrip("/") if len(sys.argv) > 4 else None
if not 1 <= MY_SLOT <= TEAMS:
    sys.exit(f"my_slot {MY_SLOT} is outside 1..{TEAMS} -- check draft_order before advising.")

# --- roster shape: a typed constant by default, the draft object's own when it is supplied ---
#
# These two lines are the ROSTER half of KTD-8. `teams` and `rounds` at least get cross-checked
# against the cargo below; the starter counts never were, so a league that added a flex or dropped
# the kicker would leave the ROSTERS/NEEDS block and "their open needs" confidently wrong with no
# error anywhere -- and "their open needs" is the read on what opponents will take.
#
# The defaults stay, so a bare `python draft_engine.py <slot>` behaves exactly as it always has.
# `scripts/run_engine.py` reads the live shape from the mule's cargo and passes it in through
# these environment variables. Env rather than argv because argv here is positional and a JSON
# roster dict has no sane position in it -- and because a shape that arrives out-of-band cannot
# be typed wrong by hand at 8am, which is the entire point.
#
# A malformed value NEVER crashes and NEVER silently wins. It falls back to the defaults and says
# so in the [unverified] block, because "I could not read the shape you sent me" must not print
# like "I am using the shape you sent me" -- that conflation is the disease the input gate treats.
STARTERS = {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "K": 1, "DEF": 1}
FLEX = 2
_shape_checked, _shape_notes = [], []

_raw = os.environ.get("FF_STARTERS")
if _raw:
    try:
        _parsed = json.loads(_raw)
        if not isinstance(_parsed, dict) or not _parsed:
            raise ValueError("not a non-empty JSON object")
        _clean = {}
        for _k, _v in _parsed.items():
            # bool is a subclass of int in Python and JSON `true` parses to one, so a roster of
            # {"QB": true} would otherwise sail through as QB=1.
            if isinstance(_v, bool) or not isinstance(_v, int) or _v < 0:
                raise ValueError(f"slot {_k!r} = {_v!r} is not a non-negative integer")
            _clean[str(_k)] = _v
        if sum(_clean.values()) <= 0:
            raise ValueError("every starter slot is zero, which is not a roster")
        STARTERS = _clean
        _shape_checked.append("starter slots from the draft object")
    except (ValueError, TypeError) as _e:
        _shape_notes.append(f"FF_STARTERS was set but is unusable ({_e}) -- falling back to this "
                            f"file's built-in roster shape, which may not match the live draft")

_raw = os.environ.get("FF_FLEX")
if _raw not in (None, ""):
    try:
        _f = int(_raw)
        if _f < 0:
            raise ValueError("negative")
        FLEX = _f
        _shape_checked.append(f"{FLEX} FLEX from the draft object")
    except (ValueError, TypeError):
        _shape_notes.append(f"FF_FLEX was set to {_raw!r}, which is not a count -- falling back "
                            f"to {FLEX} FLEX, which may not match the live draft")

_DOC = json.load(open("players_data.json", encoding="utf-8"))
BOARD = _DOC["players"]

# Badge glyphs come from the board, not from a table in here. There used to be three renderings
# of the same eight badges -- this file, the HTML, and the PDF -- so a new badge meant editing
# three places and any one of them silently rendering nothing. U6 stamps meta.badges[code].glyph
# into the source and every surface reads it. A code with no glyph prints nothing, exactly as the
# old .get(b, "") did, so an unknown badge still cannot crash the advisory on a 120-second clock.
BADGE_GLYPH = {code: (spec or {}).get("glyph", "")
               for code, spec in ((_DOC.get("meta") or {}).get("badges") or {}).items()}
PICKS = json.load(open("picks.json", encoding="utf-8"))
try:  # optional: {"2": "DIego", "3": "Hunter", ...} from draft metadata.slot_name_<N>
    SLOT_NAMES = {int(k): str(v) for k, v in json.load(open("slot_names.json", encoding="utf-8")).items()}
except Exception:
    SLOT_NAMES = {}
def sname(s):
    return f"slot {s} ({SLOT_NAMES[s]})" if s in SLOT_NAMES else f"slot {s}"

# --- the frozen join key (U14) ---
# The rendered NAME is the one field that drifts; the Sleeper id does not. sleeper_ids.json
# freezes one id per board row -- and for a while nothing read it, so this engine kept joining
# live picks to the board on the name anyway. Board #1 Jahmyr Gibbs, taken at pick 1, rendered
# by Sleeper as "J. Gibbs" and traded since the board was authored, was reported "not on our
# board", given the explicit all-clear, and left sitting at #1 on BEST AVAILABLE. The pick
# carried player_id 9221 -- his frozen id, in our own ledger, thrown away.
# Optional, like the cargo, and for the same reason: a missing ledger degrades to the name join
# and SAYS SO. A silent degrade is the exact failure it exists to prevent.
try:
    ROW_ID = {nm: str(e["sleeperId"])
              for nm, e in (json.load(open("sleeper_ids.json", encoding="utf-8")).get("ids")
                            or {}).items()
              if isinstance(e, dict) and e.get("sleeperId")}
except Exception:
    ROW_ID = {}

# --- contamination gate: the SECOND half of the guard in scripts/merge_picks.py ---
# That script refuses to merge foreign picks -- and then leaves the file on disk. Its exit code is
# consumed by nothing; it only ever reaches a human eye, on a 120-second clock, past a wall of "!".
# So the check belongs here too, where the advisory is actually produced. This project already
# duplicates the gaps/dupes gate in both writer and reader; draft_id was the odd one out.
PICK_DRAFTS = sorted({str(p.get("draft_id")) for p in PICKS if isinstance(p, dict)})
if len(PICK_DRAFTS) > 1:
    sys.exit("!" * 62 + "\n"
             f"!! picks.json HOLDS MORE THAN ONE DRAFT: {', '.join(PICK_DRAFTS)}\n"
             "!! No legitimate picks file does. Board state and availability are ALL WRONG.\n"
             "!! Move it aside, re-run scripts/merge_picks.py, rerun. DO NOT ADVISE OFF THIS.\n"
             + "!" * 62)
if EXPECT and PICK_DRAFTS and PICK_DRAFTS != [EXPECT]:
    sys.exit("!" * 62 + "\n"
             f"!! picks.json IS FROM A DIFFERENT DRAFT\n"
             f"!!   you asked for : {EXPECT}\n"
             f"!!   the file holds: {', '.join(PICK_DRAFTS)}\n"
             "!! This is a spent mock advising a live draft. It would have read as correct.\n"
             "!! Move picks.json aside and re-run scripts/merge_picks.py.\n"
             + "!" * 62)

# --- input gate: the hand-supplied inputs, checked against oracles already on disk ---
#
# my_slot, teams and rounds are typed at a keyboard on draft morning; slot_names.json is
# hand-authored. All four share ONE failure shape: a wrong value sits INSIDE the legal range, so
# the only prior check (1 <= my_slot <= teams) passes it, and the engine prints a complete,
# confident advisory for somebody else's seat and exits 0. Nothing to notice.
#
# The seat is the worst of the four. draft_order is null until near go time, so it gets read live
# under a 120-second clock -- and roster_id 3 sits one line from it in docs/league.md, which makes
# "3" the most attractive wrong value in the project and 7/8 likely to be wrong.
#
# The corroborating evidence already existed and was being thrown away:
#   * the mule's cargo carries settings.teams, settings.rounds and (near go time) draft_order
#   * every pick the operator makes carries picked_by == his user_id beside its draft_slot
#
# TWO RULES, both load-bearing:
#   1. AN ORACLE FOR ANOTHER DRAFT IS NOT EVIDENCE ABOUT THIS ONE. The mule pins draft_id into
#      its URL, so a re-created draft leaves stale cargo that still parses. Trusting it would
#      refuse a CORRECT seat -- a false red, which insight 009 records as the more dangerous
#      direction, because it teaches the operator to skip the gate.
#   2. A MISSING ORACLE NEVER EXITS. On draft morning a dead mule must not also cost the
#      advisory. But "I could not check" must never print like "I checked and it is fine" --
#      that is the whole disease this gate exists to treat.
BRIGGSY_USER_ID = "1390750540631150592"   # docs/league.md; a test pins this to the watcher's copy
CARGO_DIR = os.path.join(os.pardir, "newsletter", "data", "inbox")

def _cargo(fname):
    try:
        with open(os.path.join(CARGO_DIR, fname), encoding="utf-8") as f:
            return json.load(f)
    except Exception:                     # absent, unreadable, or malformed -- all "no oracle"
        return None

DRAFT, USERS = _cargo("sleeper_draft.json"), _cargo("sleeper_users.json")
# The roster shape resolved above reports through the same two channels as everything else, so
# there is ONE place the operator reads "what was checked" and "what could not be".
fatal, checked, unsure = [], list(_shape_checked), list(_shape_notes)

_this  = EXPECT or (PICK_DRAFTS[0] if PICK_DRAFTS else None)
_cid   = str(DRAFT.get("draft_id")) if isinstance(DRAFT, dict) else None
if DRAFT is None:
    unsure.append(f"no draft cargo at {os.path.join(CARGO_DIR, 'sleeper_draft.json')} "
                  f"-- teams, rounds and the seat cannot be checked against the draft")
elif _this and _cid != _this:
    unsure.append(f"cargo on disk is draft {_cid}, this advisory is draft {_this} -- cargo "
                  f"IGNORED as an oracle (a re-created draft, or the mule is pinned to a dead id)")
    DRAFT = None

# -- the draft's shape --
_settings = (DRAFT or {}).get("settings") or {}
for _label, _got, _want in (("teams", TEAMS, _settings.get("teams")),
                            ("rounds", ROUNDS, _settings.get("rounds"))):
    if isinstance(_want, int):
        if _got != _want:
            fatal.append(f"{_label}={_got} but draft {_cid} says settings.{_label}={_want}")
        else:
            checked.append(f"{_label}={_got}")

# picks.json alone can DISPROVE the draft's shape with no cargo at all -- and it is the only
# oracle left when the cargo belongs to another draft, which is exactly when a live run found the
# gap below. Both directions are needed, and they are NOT symmetric:
_seen_slots = [p.get("draft_slot") for p in PICKS
               if isinstance(p, dict) and isinstance(p.get("draft_slot"), int)]
_pick_nos = sorted({p.get("pick_no") for p in PICKS
                    if isinstance(p, dict) and isinstance(p.get("pick_no"), int)})
_contiguous = bool(_pick_nos) and _pick_nos == list(range(1, len(_pick_nos) + 1))

# ...too SMALL: a seat above the team count cannot exist. True on any number of picks.
if _seen_slots and max(_seen_slots) > TEAMS:
    fatal.append(f"teams={TEAMS} but picks.json contains draft_slot {max(_seen_slots)} -- "
                 f"a seat that cannot exist in a {TEAMS}-team draft")
# ...too LARGE: once a FULL ROUND has gone by every seat has picked, so the highest seat seen is
# the team count. Gated on contiguous-from-1 and a completed round because before that the
# highest seat is merely how far the draft has got -- concluding from it would refuse a CORRECT
# run, and a false red teaches the operator to skip the gate (insight 009).
elif _seen_slots and _contiguous and len(_pick_nos) >= TEAMS and max(_seen_slots) != TEAMS:
    fatal.append(f"teams={TEAMS} but {len(_pick_nos)} contiguous picks never leave draft_slot "
                 f"{max(_seen_slots)} -- a {TEAMS}-team draft would have used seat {TEAMS} by now")

# The board cannot hold more picks than it has seats. Disproves a round count that is too small.
if _pick_nos and max(_pick_nos) > TEAMS * ROUNDS:
    fatal.append(f"picks.json holds pick #{max(_pick_nos)} but teams={TEAMS} x rounds={ROUNDS} "
                 f"is only {TEAMS * ROUNDS} picks -- the draft cannot be that shape")

# -- the seat --
_order, _seat_checked = (DRAFT or {}).get("draft_order"), False
# The oracle gets the same scepticism as the input it judges. draft_order is a bijection
# user_id -> seat; two ids on one seat is corrupt, and a corrupt oracle must not arbitrate the
# seat or name the rosters. Not hypothetical -- one was generated by accident while writing the
# live proof of this gate, and the engine consumed it without a word. (A PARTIAL draft_order is
# legitimate and stays usable: the league had 6 of 8 seats filled on 2026-08-07.)
if isinstance(_order, dict) and _order:
    _dupe_seats = sorted({s for s in _order.values() if list(_order.values()).count(s) > 1})
    if _dupe_seats:
        unsure.append(f"draft_order seats more than one user on slot(s) {_dupe_seats} -- it is "
                      f"corrupt, so it is not used to check the seat or to name the rosters")
        _order = None
if isinstance(_order, dict) and _order:
    _true = _order.get(BRIGGSY_USER_ID)
    if _true is None:
        fatal.append(f"draft_order is populated but holds no entry for user_id "
                     f"{BRIGGSY_USER_ID} -- either that id is wrong or we are not in this draft")
    elif int(_true) != MY_SLOT:
        fatal.append(f'my_slot={MY_SLOT} but draft_order["{BRIGGSY_USER_ID}"] = {_true}')
    else:
        checked.append(f"my_slot={MY_SLOT} against draft_order")
        _seat_checked = True

# picked_by is the oracle that exists FIRST: draft_order stays null until near go time, but the
# moment the operator has made one pick, that pick names his seat in the engine's own input.
_mine = sorted({p.get("draft_slot") for p in PICKS
                if isinstance(p, dict) and str(p.get("picked_by") or "") == BRIGGSY_USER_ID
                and isinstance(p.get("draft_slot"), int)})
if _mine and _mine != [MY_SLOT]:
    fatal.append(f"my_slot={MY_SLOT} but our own picked_by appears on draft_slot "
                 f"{_mine[0] if len(_mine) == 1 else _mine} in picks.json")
elif _mine:
    checked.append(f"my_slot={MY_SLOT} against our own picks")
    _seat_checked = True

# -- the names file: derive the truth where we can, and never print a name known to be wrong --
_true_names = {}
if isinstance(_order, dict) and isinstance(USERS, list):
    _disp = {str(u.get("user_id")): u.get("display_name") for u in USERS
             if isinstance(u, dict) and u.get("display_name")}
    _true_names = {s: _disp[str(uid)] for uid, s in _order.items()
                   if str(uid) in _disp and isinstance(s, int)}
if _true_names:
    _wrong = sorted(s for s, nm in SLOT_NAMES.items() if s in _true_names and _true_names[s] != nm)
    if _wrong:
        unsure.append(f"slot_names.json disagrees with the draft on seat(s) {_wrong} -- using the "
                      f"draft's own names. That file is gitignored, so a spent mock's copy is "
                      f"invisible to git status and labels live seats with the wrong humans")
    SLOT_NAMES = dict(_true_names)        # sname() reads this at call time
elif SLOT_NAMES:
    unsure.append("slot_names.json is hand-authored and could not be checked against the draft")

# -- the frozen join key: present, complete, or neither --
_covered = sum(1 for p in BOARD if ROW_ID.get(p["name"]))
FULL_LEDGER = bool(ROW_ID) and _covered == len(BOARD)
if not ROW_ID:
    # NB: this text deliberately avoids the literal section headings the advisory prints. Tests
    # (and eyes) split the output on those, so a warning that echoes one truncates everything
    # after it. Found the hard way -- an earlier wording here silently ate the escalation block.
    unsure.append("no sleeper_ids.json in cwd -- picks join to the board on the rendered NAME, "
                  "the one field that drifts. A drafted player whose name re-renders would stay "
                  "on the available list. Run scripts/resolve_sleeper_ids.py")
elif not FULL_LEDGER:
    unsure.append(f"sleeper_ids.json covers {_covered} of {len(BOARD)} board rows -- the rest "
                  f"fall back to the name join. Run scripts/resolve_sleeper_ids.py --verify")
else:
    checked.append(f"all {_covered} board rows carry a frozen sleeperId")

if fatal:
    print("!" * 62)
    print("!! THE ENGINE'S INPUTS DISAGREE WITH THE DRAFT ITSELF")
    for _m in fatal:
        print(f"!!   {_m}")
    print("!! A wrong seat or draft size yields a COMPLETE, CONFIDENT, WRONG advisory --")
    print("!! plausible rosters, plausible clock, every line of it for another team.")
    print("!! Fix the arguments and rerun. DO NOT ADVISE OFF THIS.")
    print("!" * 62)
    sys.exit(1)

if not _seat_checked:
    print("*" * 62)
    # "No USABLE" -- one may be on disk but absent, corrupt, or for another draft. A banner that
    # states something false about the evidence is the same defect as the one this gate treats.
    print(f"** my_slot={MY_SLOT} IS UNVERIFIED. No usable draft_order on disk, and no pick in")
    print(f"** picks.json carries our picked_by yet, so nothing here can confirm the seat.")
    print(f"** If it is wrong, every line below is a confident wrong answer for another team.")
    print(f'** Confirm draft_order["{BRIGGSY_USER_ID}"] before acting on this.')
    print("*" * 62)
for _m in unsure:
    print(f"[unverified] {_m}")
if checked:
    print("[checked] " + " · ".join(checked))

board_by_name = {}
board_by_id   = {}                    # frozen sleeperId -> board row; the join that cannot drift
board_by_slot = defaultdict(list)     # (team, pos) -> board rows; the unmatched-pick index
for p in BOARD:
    board_by_name[norm(p["name"])] = p
    board_by_slot[(p.get("team"), p.get("pos"))].append(p)
    if ROW_ID.get(p["name"]):
        board_by_id[ROW_ID[p["name"]]] = p

def slot_of(pick_no):
    r = (pick_no - 1) // TEAMS + 1
    i = (pick_no - 1) % TEAMS
    return r, (i + 1) if r % 2 == 1 else (TEAMS - i)

def my_picks():
    out = []
    for r in range(1, ROUNDS + 1):
        out.append((r - 1) * TEAMS + (MY_SLOT if r % 2 == 1 else TEAMS + 1 - MY_SLOT))
    return out

# ---- ingest picks ----
taken_keys = set()
taken_ids  = set()                   # frozen ids claimed; survives any rendering of the name
drifted    = []                      # (pick_no, sleeper rendering, board rendering)
rosters = defaultdict(list)          # slot -> [(pos, name, pick_no)]
seq = []                             # chronological (pick_no, slot, pos, name, board_r)
unmatched = []                       # (pick_no, name, pos, team, player_id)
for pk in sorted(PICKS, key=lambda x: x["pick_no"]):
    md = pk.get("metadata") or {}
    name = f"{md.get('first_name','')} {md.get('last_name','')}".strip()
    pos = md.get("position", "?")
    r, slot = slot_of(pk["pick_no"])
    slot = pk.get("draft_slot", slot)
    key = norm(name)
    pid = str(pk.get("player_id") or "")
    taken_keys.add(key)
    # THE FROZEN ID FIRST. It is exact and it does not drift; the name is the fallback, and the
    # fallback is the only thing that was here before.
    b = board_by_id.get(pid) if pid else None
    if b is not None:
        taken_ids.add(pid)
        if norm(b["name"]) != key:
            drifted.append((pk["pick_no"], name, b["name"]))
    else:
        b = board_by_name.get(key)
    if b is None:
        # A pick that does not resolve to a board row is usually harmless -- most drafted players
        # simply are not on our 174. But it is ALSO the second, unguarded route to the failure the
        # integrity gate exists to prevent: taken_keys is keyed on the SLEEPER spelling while
        # availability filters on the BOARD spelling, so when those diverge for the same man he
        # stays on BEST AVAILABLE after being drafted. pick_nos stay contiguous, so the gate below
        # sees nothing wrong. Surfacing every miss is the only way that becomes visible.
        unmatched.append((pk["pick_no"], name, pos, md.get("team"), pid))
    rosters[slot].append((pos, name, pk["pick_no"]))
    seq.append((pk["pick_no"], slot, pos, name, b["r"] if b else None))

# --- integrity gate: a dropped/duplicated pick silently corrupts everything below ---
seen  = [p[0] for p in seq]
n     = max(seen, default=0)                   # highest pick_no, NOT len(seq)
dupes = sorted({x for x in seen if seen.count(x) > 1})
gaps  = [i for i in range(1, n + 1) if i not in set(seen)]
if gaps or dupes:
    print("!" * 62)
    if gaps:  print(f"!! picks.json IS MISSING pick(s): {gaps}")
    if dupes: print(f"!! picks.json HAS DUPLICATE pick(s): {dupes}")
    print("!! Board state, availability and picks-until-you are ALL WRONG.")
    print("!! Re-fetch /picks, merge on pick_no, rerun. DO NOT ADVISE OFF THIS.")
    print("!" * 62)
    sys.exit(1)
next_pick_no = n + 1
mine = my_picks()
my_next = next((p for p in mine if p > n), None)
picks_until_me = (my_next - next_pick_no) if my_next else None
on_clock_slot = slot_of(next_pick_no)[1] if next_pick_no <= TEAMS*ROUNDS else None

# Claimed by EITHER key. The id catches the man whose rendering drifted; the name still catches
# a pick that carried no player_id, and a board row with no frozen id yet.
avail = [p for p in BOARD
         if norm(p["name"]) not in taken_keys and ROW_ID.get(p["name"]) not in taken_ids]

# What the advisory will actually PRINT. Computed once, here, for two reasons: the unmatched-pick
# warning is printed first but needs to know whether a suspect appears further down (telling the
# operator to "look below" for a line that was never printed burns clock and disarms the next
# warning), and computing it twice would let the two copies drift.
BEST_N, CLIFF_N = 12, 5
best_avail = sorted(avail, key=lambda x: x["r"])[:BEST_N]
cliffs = []                                   # (pos, tier, total_left, [rows shown])
for _pos in ["RB", "WR", "TE", "QB", "K", "DEF"]:
    _tiers = defaultdict(list)
    for p in avail:
        if p["pos"] == _pos:
            _tiers[p["tier"]].append(p)
    for _t in sorted(_tiers)[:2]:
        _rows = sorted(_tiers[_t], key=lambda x: x["pr"])
        cliffs.append((_pos, _t, len(_rows), _rows[:CLIFF_N]))
shown_ranks = {p["r"] for p in best_avail} | {p["r"] for _, _, _, rows in cliffs for p in rows}

# ---- team needs ----
def needs(slot):
    cnt = Counter(pos for pos, _, _ in rosters[slot])
    need = []
    for pos, req in STARTERS.items():
        if cnt[pos] < req: need.append(f"{pos}x{req-cnt[pos]}")
    # .get() rather than [] because a draft-supplied roster need not carry every key this file
    # once hardcoded -- a league that drops the kicker sends no "K", and a KeyError on draft
    # morning is the worst possible way to learn that.
    flex_bodies = sum(max(0, cnt[p] - STARTERS.get(p, 0)) for p in ("RB", "WR", "TE"))
    if flex_bodies < FLEX: need.append(f"FLEXx{FLEX-flex_bodies}")
    return cnt, need

# ---- output ----
# Unmatched picks, reported BEFORE anything else. Most are simply not on our 174 and are noise.
# One is escalated when an UNCLAIMED board row shares the pick's (team, position).
#
# Why (team, pos) and not name similarity -- this was measured on the real board, not assumed:
#   most similar pair of DIFFERENT board players  0.800  Javonte Williams vs Jameson Williams
#   least similar pair of SAME-man renderings     0.370  Hollywood Brown  vs Marquise Brown
# The floors are inverted, so NO similarity threshold separates them. A rendered name is the one
# field that drifts -- nicknames (CeeDee/Cedarian, Puka/Kealoha), suffixes, compound surnames, and
# every spelling of a team defense. Sleeper supplies team and position on every pick and neither
# drifts that way. Measured against the 120-pick lab feed: 0 false candidates on 4 unmatched picks.
#
# "Already claimed" is the second half: if the man is the same, his BOARD spelling never entered
# taken_keys (that set holds SLEEPER spellings), so his row is still unclaimed. A different man
# drafted correctly under his own name IS claimed and drops out.
#
# tokens() itself now lives in normalize.py beside norm(), sharing one cleaning prefix.
# Picks the frozen id caught that the name would have missed. Reported, never silent: each line
# is a place the board's rendering has drifted from Sleeper's, and the id is all that stood
# between it and an already-drafted man sitting on BEST AVAILABLE.
if drifted:
    print(f"--- {len(drifted)} pick(s) matched by frozen id, not by name ---")
    for pn, sleeper_nm, board_nm in drifted:
        print(f"     #{pn} Sleeper says {sleeper_nm!r}, our board says {board_nm!r} — joined on "
              f"the frozen id; the renderings have drifted")
    print()

if unmatched:
    scored = []
    for pn, nm, ps, tm, pid in unmatched:
        want = tokens(nm)
        cand = [b for b in board_by_slot.get((tm, ps), [])
                if norm(b.get("name", "")) not in taken_keys
                and ROW_ID.get(b.get("name", "")) not in taken_ids
                and tokens(b.get("name", "")) & want]
        # With a COMPLETE ledger, a pick carrying an id we do not hold is not on our 174 at all.
        # That inverts this warning's premise -- see below.
        scored.append((pn, nm, ps, tm, cand,
                       bool(pid) and FULL_LEDGER and pid not in board_by_id, pid))
    hot = [s for s in scored if s[4]]
    cold = [s for s in scored if not s[4]]

    print(f"--- {len(unmatched)} pick(s) did not match the board ---")
    # Escalations first. The block is cumulative and grows all draft; a late warning buried at
    # line 13 of 14, directly above the board state, is a warning nobody reads.
    for pn, nm, ps, tm, cand, off_board, pid in hot:
        who = ", ".join(f"#{b.get('r')} {b.get('name')}" for b in cand[:3])
        more = f" (+{len(cand) - 3} more)" if len(cand) > 3 else ""
        print(f"  >> #{pn} {nm} ({ps}/{tm}) did not match, but {who}{more} is on {tm} at {ps}")
        if off_board:
            # THE PREMISE INVERTS ONCE THE ID JOIN EXISTS. This warning was written for a board
            # player whose NAME drifted, so a same-slot suspect sharing a token was probably the
            # same man. The id now catches that case before we ever get here -- so a pick that
            # reaches this line carries an id we do not hold, which means he is not on our board
            # at all, and the suspect is a same-position TEAMMATE. Keeping the old wording would
            # assert an identity the id just disproved, and invite clearing a live row.
            print(f"     and is UNCLAIMED — but this is a DIFFERENT man: player_id {pid} is none")
            print(f"     of our {len(board_by_id)} frozen ids, so he is not on our board at all.")
            print( "     A same-position suspect sharing a surname is a teammate; leave that row.")
        elif any(b.get("r") in shown_ranks for b in cand):
            # Say where to look, or say there is nothing to look at. "listed as available below"
            # was false for any suspect outside BEST AVAILABLE and the printed cliffs -- the
            # operator scans, finds nothing, and learns to distrust the next one.
            print("     and is UNCLAIMED. If that is the same man he is STILL being recommended below.")
        else:
            print("     and is UNCLAIMED. If that is the same man the board still has him available")
            print("     (deep rank -- not shown in the lists below, so do not go hunting for him).")
    for pn, nm, ps, tm, cand, off_board, pid in cold:
        print(f"     #{pn} {nm} ({ps}/{tm}) — not on our board")
    if not hot:
        print("     no unclaimed board row shares a team and position with any of them.")
    print()

if PICK_DRAFTS:
    # State which draft this advisory is built from. Nothing else in the output identifies it, so
    # a wrong picks.json was previously indistinguishable from a right one.
    print(f"[advising off draft_id {PICK_DRAFTS[0]}"
          + ("" if EXPECT else "  — pass it as arg 4 to have this checked") + "]")
print(f"=== BOARD STATE: {n} picks in · next is pick {next_pick_no}", end="")
if on_clock_slot: print(f" ({sname(on_clock_slot)}{' = YOU' if on_clock_slot==MY_SLOT else ''})", end="")
print(" ===")
if seq:
    last = seq[-min(6,len(seq)):]
    print("Last picks: " + " | ".join(f"{p}. {nm} {ps} (s{sl})" for p, sl, ps, nm, _ in last))
if picks_until_me is not None:
    print(f"YOUR next pick: #{my_next} — {picks_until_me} picks away")

if n:
    runwin = [ps for _, _, ps, _, _ in seq[-8:]]
    rc = Counter(runwin)
    hot = [f"{p}:{c}" for p, c in rc.most_common() if c >= 3]
    if hot: print(f"RUN WATCH (last {len(runwin)}): " + ", ".join(hot))

print("\n--- ROSTERS / NEEDS ---")
for slot in range(1, TEAMS + 1):
    cnt, need = needs(slot)
    tag = " <== YOU" if slot == MY_SLOT else ""
    comp = " ".join(f"{p}{cnt[p]}" for p in ["QB","RB","WR","TE","K","DEF"] if cnt[p])
    print(f"{sname(slot)}: [{comp or 'empty'}] needs: {', '.join(need) or 'starters full'}{tag}")

# teams picking between now and my next pick
if my_next and picks_until_me and picks_until_me > 0:
    between = [slot_of(p)[1] for p in range(next_pick_no, my_next)]
    posneed = Counter()
    for s in between:
        _, nd = needs(s)
        for item in nd:
            posneed[item.split("x")[0]] += 1
    print(f"\nBetween now and you: " + ", ".join(sname(s) for s in between))
    print("Their open needs: " + ", ".join(f"{p}({c})" for p, c in posneed.most_common()))

print("\n--- TIER CLIFFS (available) ---")
for pos, t, left, rows in cliffs:                 # precomputed above; shown_ranks derives from it
    flag = "  ⚠ CLIFF" if left <= 3 else ""
    print(f"{pos} T{t}: {left} left — {', '.join(x['name'] for x in rows)}{flag}")

print("\n--- BEST AVAILABLE (my board) ---")
for p in best_avail:
    bdg = "".join(BADGE_GLYPH.get(b, "") for b in p["badges"])
    vb = ""
    if "vorp" in p:
        d = p.get("vbdDelta", 0)
        chip = f" VBD{d:+d}" if abs(d) >= 8 else ""
        vb = f" · vorp {p['vorp']:.0f}{chip}"
    print(f"{p['r']:>3} {p['name']} {p['pos']}{p['pr']} {p['team']} {bdg}{vb}")

# VBD steals: available where VBD rank beats board rank by 8+ (skill positions)
if any("vorp" in p for p in avail):
    steals = sorted([p for p in avail if p.get("vbdDelta",0) >= 8 and p["pos"] not in ("K","DEF")],
                    key=lambda x: x["vbdRank"])[:6]
    if steals:
        print("\n--- VBD LEANS (value over board rank) ---")
        for p in steals:
            print(f"vbd {p['vbdRank']:>3} (board {p['r']:>3}) {p['name']} {p['pos']}{p['pr']} · vorp {p['vorp']:.0f}")

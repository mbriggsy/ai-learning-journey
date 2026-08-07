#!/usr/bin/env python3
"""Family Feud live draft engine.
Input:  picks.json  — Sleeper /draft/<id>/picks array (cumulative)
        players_data.json — our board
Usage:  python3 draft_engine.py <my_slot> [teams] [rounds]
Output: compact war-room advisory: board state, rosters/needs, runs,
        tier cliffs, picks-until-mine, naive queue (Claude overlays judgment).
"""
import json, re, sys, unicodedata
from collections import defaultdict, Counter

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
STARTERS = {"QB":1, "RB":2, "WR":2, "TE":1, "K":1, "DEF":1}  # + 2 FLEX

BOARD = json.load(open("players_data.json", encoding="utf-8"))["players"]
PICKS = json.load(open("picks.json", encoding="utf-8"))
try:  # optional: {"2": "DIego", "3": "Hunter", ...} from draft metadata.slot_name_<N>
    SLOT_NAMES = {int(k): str(v) for k, v in json.load(open("slot_names.json", encoding="utf-8")).items()}
except Exception:
    SLOT_NAMES = {}
def sname(s):
    return f"slot {s} ({SLOT_NAMES[s]})" if s in SLOT_NAMES else f"slot {s}"

ALIASES = {"kenny":"kenneth","cam":"cameron","mike":"michael","matt":"matthew",
           "josh":"joshua","chris":"christopher","jon":"jonathan","jonathon":"jonathan",
           "zach":"zachary","alex":"alexander","nick":"nicholas","jeff":"jeffrey",
           "dan":"daniel","dave":"david","rob":"robert","will":"william","tony":"anthony"}
def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b\.?", "", s.lower())
    parts = re.sub(r"[^a-z ]", "", s).split()
    if parts: parts[0] = ALIASES.get(parts[0], parts[0])
    return "".join(parts)

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

board_by_name = {}
board_by_slot = defaultdict(list)     # (team, pos) -> board rows; the unmatched-pick index
for p in BOARD:
    board_by_name[norm(p["name"])] = p
    board_by_slot[(p.get("team"), p.get("pos"))].append(p)

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
rosters = defaultdict(list)          # slot -> [(pos, name, pick_no)]
seq = []                             # chronological (pick_no, slot, pos, name, board_r)
unmatched = []                       # (pick_no, name, pos, [board suspects sharing a surname])
for pk in sorted(PICKS, key=lambda x: x["pick_no"]):
    md = pk.get("metadata") or {}
    name = f"{md.get('first_name','')} {md.get('last_name','')}".strip()
    pos = md.get("position", "?")
    r, slot = slot_of(pk["pick_no"])
    slot = pk.get("draft_slot", slot)
    key = norm(name)
    taken_keys.add(key)
    b = board_by_name.get(key)
    if b is None:
        # A pick that does not resolve to a board row is usually harmless -- most drafted players
        # simply are not on our 174. But it is ALSO the second, unguarded route to the failure the
        # integrity gate exists to prevent: taken_keys is keyed on the SLEEPER spelling while
        # availability filters on the BOARD spelling, so when those diverge for the same man he
        # stays on BEST AVAILABLE after being drafted. pick_nos stay contiguous, so the gate below
        # sees nothing wrong. Surfacing every miss is the only way that becomes visible.
        unmatched.append((pk["pick_no"], name, pos, md.get("team")))
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

avail = [p for p in BOARD if norm(p["name"]) not in taken_keys]

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
    flex_bodies = max(0, cnt["RB"]-STARTERS["RB"]) + max(0, cnt["WR"]-STARTERS["WR"]) + max(0, cnt["TE"]-STARTERS["TE"])
    if flex_bodies < 2: need.append(f"FLEXx{2-flex_bodies}")
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
def tokens(s):
    """Cleaned name tokens -- {first, last}. Nicknames replace the FIRST name and leave the
    surname (Hollywood/Marquise Brown); re-renderings change the SURNAME and leave the first
    (Jaxon Smith-Njigba / Jaxon Njigba). Requiring either one to survive keeps both, while
    excluding two different men who merely share a team and position."""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b\.?", "", s.lower())
    t = re.sub(r"[^a-z ]", "", s).split()
    return {t[0], t[-1]} if t else set()

if unmatched:
    scored = []
    for pn, nm, ps, tm in unmatched:
        want = tokens(nm)
        cand = [b for b in board_by_slot.get((tm, ps), [])
                if norm(b.get("name", "")) not in taken_keys
                and tokens(b.get("name", "")) & want]
        scored.append((pn, nm, ps, tm, cand))
    hot = [s for s in scored if s[4]]
    cold = [s for s in scored if not s[4]]

    print(f"--- {len(unmatched)} pick(s) did not match the board ---")
    # Escalations first. The block is cumulative and grows all draft; a late warning buried at
    # line 13 of 14, directly above the board state, is a warning nobody reads.
    for pn, nm, ps, tm, cand in hot:
        who = ", ".join(f"#{b.get('r')} {b.get('name')}" for b in cand[:3])
        more = f" (+{len(cand) - 3} more)" if len(cand) > 3 else ""
        print(f"  >> #{pn} {nm} ({ps}/{tm}) did not match, but {who}{more} is on {tm} at {ps}")
        # Say where to look, or say there is nothing to look at. "listed as available below" was
        # false for any suspect outside BEST AVAILABLE and the printed cliffs -- the operator
        # scans, finds nothing, and learns to distrust the next one.
        if any(b.get("r") in shown_ranks for b in cand):
            print("     and is UNCLAIMED. If that is the same man he is STILL being recommended below.")
        else:
            print("     and is UNCLAIMED. If that is the same man the board still has him available")
            print("     (deep rank -- not shown in the lists below, so do not go hunting for him).")
    for pn, nm, ps, tm, cand in cold:
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
    bdg = "".join({"T":"»","B":"+","X":"!","I":"†","R":"°","U":"^","D":"v","S":"§"}.get(b,"") for b in p["badges"])
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

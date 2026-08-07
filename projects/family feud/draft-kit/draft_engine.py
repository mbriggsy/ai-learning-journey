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

MY_SLOT = int(sys.argv[1]) if len(sys.argv) > 1 else 3
TEAMS   = int(sys.argv[2]) if len(sys.argv) > 2 else 8
ROUNDS  = int(sys.argv[3]) if len(sys.argv) > 3 else 16
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

board_by_name = {}
for p in BOARD:
    board_by_name[norm(p["name"])] = p

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
for pk in sorted(PICKS, key=lambda x: x["pick_no"]):
    md = pk.get("metadata") or {}
    name = f"{md.get('first_name','')} {md.get('last_name','')}".strip()
    pos = md.get("position", "?")
    r, slot = slot_of(pk["pick_no"])
    slot = pk.get("draft_slot", slot)
    key = norm(name)
    taken_keys.add(key)
    b = board_by_name.get(key)
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
for pos in ["RB","WR","TE","QB","K","DEF"]:
    tiers = defaultdict(list)
    for p in avail:
        if p["pos"] == pos: tiers[p["tier"]].append(p)
    for t in sorted(tiers)[:2]:
        names = [x["name"] for x in sorted(tiers[t], key=lambda x: x["pr"])]
        flag = "  ⚠ CLIFF" if len(names) <= 3 else ""
        print(f"{pos} T{t}: {len(names)} left — {', '.join(names[:5])}{flag}")

print("\n--- BEST AVAILABLE (my board) ---")
for p in sorted(avail, key=lambda x: x["r"])[:12]:
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

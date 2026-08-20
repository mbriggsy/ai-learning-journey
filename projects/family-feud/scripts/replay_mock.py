"""Replay a recorded mock draft with our seat's strategy swapped -- the lineup-delta gate.

The 2026-08-19 executor mock (`1395858325018537984`, seat 5) drafted queue-top for eleven straight
picks and finished with nine receivers: 1090.1 raw VORP, only 768.9 of it startable, 321.2 stranded
on a bench that can never start. Briggsy's ask -- "recommend picks I wouldn't override" -- ships
only if the lineup-delta queue provably fixes that. This is the deterministic half of the proof:
the other seven seats replay their RECORDED picks, our seat re-drafts under a strategy, and the
two arms are scored on the same board.

Insight 024's laws apply verbatim:
  * print what each arm DRAFTED, not only what it scored -- three of four broken simulators were
    caught by a human reading the roster, none by the score;
  * the naive arm must REPRODUCE the real mock's early picks (we fired queue-top live, so the
    replay's queue-top must land the same players -- if it does not, the replay is broken and
    nothing it says about the challenger counts);
  * this is ONE room, not a season backtest. The claim it supports is STRUCTURAL (no stranded
    bench VORP, all mandated slots filled), never "this wins leagues". Twelve held-out seasons
    could not resolve that question; one mock certainly cannot.

Caveat, stated rather than hidden: the CPU seats' picks are FIXED history. Live opponents would
have reacted to our different picks, so the counterfactual is first-order only. It is still the
harshest deterministic test available, and it is regression-pinned in tests/test_replay_mock.py.
"""
import argparse
import json
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "draft-kit"))

import lineup_value as LV  # noqa: E402

KIT = os.path.join(ROOT, "draft-kit")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "mock_1395858325018537984_picks.json")
FLEX_OK = ("RB", "WR", "TE")


def load_board():
    with open(os.path.join(KIT, "players_data.json"), encoding="utf-8") as f:
        board = json.load(f)
    with open(os.path.join(KIT, "vorp_curve.json"), encoding="utf-8") as f:
        curve = json.load(f)
    return board, curve


def replay(picks, board_doc, curve_doc, my_slot, strategy, starters, flex_slots):
    """Walk the recorded draft; our seat picks by `strategy`, everyone else picks history.

    strategy: 'naive' (lowest board rank -- what the queue shipped before 2026-08-19) or
              'delta'  (marginal lineup value with the must_fill endgame guard).
    Returns (my_rows, log): the board rows we drafted, in order, and (pick_no, name) pairs.
    """
    pts_by_id, fill = LV.live_values(board_doc, curve_doc)
    rows = board_doc["players"]
    by_id = {str(r["sleeperId"]): r for r in rows if r.get("sleeperId") is not None}
    taken = set()
    my_rows, my_pts, my_counts, log = [], defaultdict(list), Counter(), []
    rounds = max(p["pick_no"] for p in picks) // max(p["draft_slot"] for p in picks)

    def available():
        return sorted((r for r in rows if str(r.get("sleeperId")) not in taken),
                      key=lambda r: r["r"])

    for pk in sorted(picks, key=lambda p: p["pick_no"]):
        if pk["draft_slot"] != my_slot:
            taken.add(str(pk.get("player_id")))
            continue
        pool = available()
        cands = pool[:LV.CANDIDATE_WINDOW]
        my_remaining = rounds - len(my_rows)
        need, flex_need, must_total = LV.must_fill(my_counts, starters, FLEX_OK, flex_slots)
        if strategy == "delta" and need.get("QB", 0) == 0:
            # Mirrors draft_engine.py's no-second-QB queue rule (Briggsy 2026-08-20, campaign 1
            # decision D-B) -- the delta arm IS the shipping policy, so the mirror is mandatory
            # (two implementations drifting is the market/consensus failure). The naive arm stays
            # UNFILTERED on purpose: it reproduces recorded history. ⚠ The committed fixture never
            # tempts a second QB into winning, so this line's real pin is the engine-level test in
            # tests/test_chamber.py, not the 030 numbers.
            cands = [r for r in cands if r["pos"] != "QB"]
        if strategy == "delta":
            # K/DEF are DEFERRED until the endgame forces them, on the board's own numbers:
            # their vorp is flat WITHIN a tier (every T1 K is 16.0), so their delta
            # cannot decay -- while every bench candidate's upside does. Taking a DEF at pick 69
            # buys nothing the same DEF at 117 does not, and costs the best bench body available.
            # Across tiers it does decay a little: on this fixture the deferral cost 13.0 VORP
            # of DEF tier (T1 gone by #117) and bought nothing the bots wanted -- MEASURED, and
            # accepted, because a DEF at pick #69 is an instant human override, which is the
            # exact failure this feature exists to end.
            if must_total >= my_remaining > 0:
                allowed = {pos for pos, k in need.items() if k > 0}
                if flex_need > 0:
                    allowed |= set(FLEX_OK)
                # rebuild from the FULL pool: the window may hold none of a mandated position
                cands = [r for pos in sorted(allowed)
                         for r in [x for x in pool if x["pos"] == pos][:3]]
        if strategy == "delta":
            choice = min(cands, key=lambda r: (-LV.marginal_pts(
                pts_by_id[str(r["sleeperId"])], r["pos"], my_pts, fill,
                starters, FLEX_OK, flex_slots), r["r"]))
        elif strategy == "naive":
            choice = cands[0]
        else:
            raise SystemExit(f"unknown strategy {strategy!r}")
        taken.add(str(choice["sleeperId"]))
        my_rows.append(choice)
        my_pts[choice["pos"]].append(pts_by_id[str(choice["sleeperId"])])
        my_counts[choice["pos"]] += 1
        log.append((pk["pick_no"], choice["name"]))
    return my_rows, log


def score(my_rows, starters, flex_slots):
    """(starting-lineup VORP, bench VORP): an empty slot scores ZERO here -- this is Sunday."""
    vorp = defaultdict(list)
    for r in my_rows:
        vorp[r["pos"]].append(float(r.get("vorp", 0.0)))
    lineup = LV.best_lineup(vorp, None, starters, FLEX_OK, flex_slots)
    total = sum(v for vs in vorp.values() for v in vs)
    return lineup, total - lineup


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--picks", default=FIXTURE, help="recorded picks.json (default: the fixture)")
    ap.add_argument("--slot", type=int, default=5)
    a = ap.parse_args()
    with open(a.picks, encoding="utf-8") as f:
        picks = json.load(f)
    board, curve = load_board()
    starters, flex_slots = dict(LV.LIVE_STARTERS), LV.FLEX_SLOTS

    print(f"REPLAY -- {os.path.basename(a.picks)}, seat {a.slot}, other seats play their "
          f"recorded picks\n")
    results = {}
    for arm in ("naive", "delta"):
        rows, log = replay(picks, board, curve, a.slot, arm, starters, flex_slots)
        lineup, bench = score(rows, starters, flex_slots)
        results[arm] = (lineup, bench, rows, log)
        posline = ", ".join(f"{p}{c}" for p, c in
                            sorted(Counter(r["pos"] for r in rows).items()))
        print(f"[{arm:>5}] lineup VORP {lineup:7.1f} | stranded on bench {bench:6.1f} | {posline}")
        for pick_no, name in log:
            print(f"        #{pick_no:<4} {name}")
        print()
    dl, dn = results["delta"][0], results["naive"][0]
    print(f"VERDICT: lineup-delta {'BEATS' if dl > dn else 'DOES NOT BEAT'} the naive queue by "
          f"{dl - dn:+.1f} startable VORP on this room.")
    print("One room, fixed opponents -- a STRUCTURAL reading (bench waste, slots filled), never a "
          "win-rate claim.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

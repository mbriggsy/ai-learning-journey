"""Marginal lineup value -- the one implementation, shared by the backtest and the live engine.

Extracted 2026-08-19 from scripts/backtest_board.py, where insight 024 paid for it four times:
greedy VORP-max drafted six straight running backs (defect 3), and marginal value over an EMPTY
lineup degenerates to raw points and takes a quarterback first overall (defect 4). The functions
here are the surviving, competent formulation: value a player by what he adds to the best legal
starting lineup, with unfilled slots pre-filled at REPLACEMENT -- the player you could still get
at that slot later -- never at zero. tests/test_backtest_board.py pins all four defects by name
against exactly this logic; tests/test_lineup_value.py covers the live configuration (K/DEF slots,
the endgame guard, the board join).

Everything is parameterized on the slot structure because the two callers disagree on purpose:
the backtest scores QB/RB/RB/WR/WR/TE/FLEX/FLEX (K/DEF are flat constants that only add noise to
a season score), while the live queue must fill K and DEF because Sleeper mandates the slots and
an empty one scores zero every week.
"""
import json
import os


def best_lineup(roster_pts, fill, starters, flex_ok, flex_slots):
    """Points of the best legal starting lineup. {pos: [points]} -> float.

    Required slots are position-specific and FLEX is a superset of `flex_ok`, so filling the
    required slots with the best at each position and then FLEX from whatever remains is optimal
    -- you must start two backs whatever else you hold.

    `fill` is the points an UNFILLED starter slot is worth.
      * None            -> zero. An empty slot really does score nothing on Sunday. (Scoring.)
      * {pos: pts}      -> replacement level, and this is what makes the draft logic VBD.

    WHY `fill` EXISTS (insight 024, defect 4). Marginal value over an EMPTY lineup is just raw
    points, so at pick 1.1 every slot is empty and the model degenerates to "who scores most" --
    which is always a quarterback. Measured: that arm took a QB first overall. The correct
    counterfactual is not an empty slot but THE PLAYER YOU COULD GET AT THAT SLOT LATER, which is
    replacement level. With the lineup notionally pre-filled at replacement, the first back is
    worth ~272 over his baseline and the first quarterback ~127 over his -- and saturation still
    falls out for free, because a seventh back improves nothing.
    """
    pool = {p: sorted(v, reverse=True) for p, v in roster_pts.items()}
    total, leftover = 0.0, []
    for pos, n in starters.items():
        take = pool.get(pos, [])[:n]
        if len(take) < n:
            pad = 0.0 if fill is None else fill.get(pos, 0.0)
            take = take + [pad] * (n - len(take))
        total += sum(take)
        if pos in flex_ok:
            leftover += pool.get(pos, [])[n:]
    flex = sorted(leftover, reverse=True)[:flex_slots]
    if len(flex) < flex_slots:
        pad = 0.0 if fill is None else max(fill.get(p, 0.0) for p in flex_ok)
        flex = flex + [pad] * (flex_slots - len(flex))
    return total + sum(flex)


def marginal_pts(pts, pos, roster_pts, fill, starters, flex_ok, flex_slots):
    """What adding one player worth `pts` at `pos` ADDS to the best startable lineup.

    This is the whole feature: the third back is worth only what he adds as a FLEX, the seventh
    is worth nothing, and a player who cannot crack the lineup at all contributes 0.0 -- his
    remaining value is insurance, which the queue expresses by falling back to board order,
    never by a weighting constant nobody measured.
    """
    before = best_lineup(roster_pts, fill, starters, flex_ok, flex_slots)
    after = dict(roster_pts)
    after[pos] = list(after.get(pos, [])) + [pts]
    return best_lineup(after, fill, starters, flex_ok, flex_slots) - before


def must_fill(counts, starters, flex_ok, flex_slots):
    """Slots this roster still HAS to draft: ({pos: n}, flex_need, total).

    (Insight 024, defect 2.) best_lineup scores an empty starter slot as zero at scoring time, so
    a strategy that undervalues a position would simply never draft it and eat the zero. No real
    manager does that: he fills the slot late and collects replacement-level production. The live
    engine uses this as the ENDGAME guard: when total == picks remaining, every pick must fill a
    mandated slot and the advisory must say so -- the 2026-08-19 mock reached that state with the
    naive queue offering a second quarterback, silently.
    """
    need = {pos: max(0, n - counts.get(pos, 0)) for pos, n in starters.items()}
    spare = sum(max(0, counts.get(p, 0) - starters.get(p, 0)) for p in flex_ok)
    flex_need = max(0, flex_slots - spare)
    return need, flex_need, sum(need.values()) + flex_need


# --- the LIVE configuration: the league's real slots, points from the board + curve -------------

#: QB·RB·RB·WR·WR·TE·2×FLEX·K·DEF, read off the live league object (docs/league.md). The engine
#: re-derives its FF_STARTERS from the draft object at runtime; keep these as the shared default
#: and let callers pass the runtime value through.
LIVE_STARTERS = {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "K": 1, "DEF": 1}
FLEX_OK = ("RB", "WR", "TE")
FLEX_SLOTS = 2

#: Only this many of the best available (by board rank) get a delta computed. Nobody's 41st-best
#: available is the marginal pick; same constant and reasoning as backtest_board.CANDIDATE_WINDOW.
CANDIDATE_WINDOW = 40


def live_values(board_doc, curve_doc):
    """(pts_by_sleeper_id, fill) in POINTS space, from the shipped board + curve.

    Skill positions: pts = vorp + baseline points, where the baseline RANK comes from the board's
    own meta.vbd.baselineWaiver (read, never re-typed -- realized_value.baselines says the same)
    and the baseline POINTS come from the curve at that rank. Points space matters because FLEX
    compares across positions: a flex slot's replacement is the best replacement among RB/WR/TE,
    and vorp values over three different baselines are not comparable there.

    K/DEF: the board carries flat constants (no curve), so fill is 0 and pts is the vorp itself.
    They never enter FLEX, so no cross-position comparison ever sees them.
    """
    curve = curve_doc["curve"]
    vbd = (board_doc.get("meta") or {}).get("vbd") or {}
    base_rank = vbd.get("baselineWaiver") or {}
    missing = [p for p in ("QB", "RB", "WR", "TE") if p not in base_rank]
    if missing:
        raise SystemExit(f"meta.vbd.baselineWaiver is missing {missing}; refusing to invent one")
    fill = {}
    for pos in ("QB", "RB", "WR", "TE"):
        pts = (curve.get(pos) or {}).get(str(base_rank[pos]))
        if pts is None:
            raise SystemExit(f"the curve has no {pos} rank {base_rank[pos]}; refusing to guess")
        fill[pos] = float(pts)
    fill["K"] = 0.0
    fill["DEF"] = 0.0
    pts_by_id = {}
    for row in board_doc["players"]:
        sid = row.get("sleeperId")
        if sid is None:
            continue
        pts_by_id[str(sid)] = float(row.get("vorp", 0.0)) + fill.get(row["pos"], 0.0)
    return pts_by_id, fill


def load_live_values(kit_dir):
    """live_values() from the files on disk. utf-8 explicitly -- Windows defaults to cp1252."""
    with open(os.path.join(kit_dir, "players_data.json"), encoding="utf-8") as f:
        board = json.load(f)
    with open(os.path.join(kit_dir, "vorp_curve.json"), encoding="utf-8") as f:
        curve = json.load(f)
    return live_values(board, curve)

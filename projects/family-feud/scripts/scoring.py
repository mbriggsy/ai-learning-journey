#!/usr/bin/env python3
"""U5 — the league's scoring rules, as code instead of prose.

ONE pure function, no I/O, no clock. `docs/league.md` is the specification; this file is its
executable form, and `tests/test_scoring.py` proves the two agree by reproducing nflverse's own
PPR totals exactly (2469 of 2469 player-seasons, 2021-2024).

WHY A SEPARATE STANDARD-PPR RULESET EXISTS. Our league is not standard PPR (interceptions are
-1 here, -2 there) so nothing in our own numbers can be checked against an outside reference.
STANDARD_PPR encodes nflverse's published formula, which gives the scoring engine an ORACLE: if
the machinery reproduces a known-correct total exactly, the only thing left to get wrong is the
rule table. That separation is the whole reason this is testable at all.

THE LONG-TD BONUSES ARE REAL AND ARE NOT IN THE CURVE. league.md specifies +1 at 40+ yards and
+2 at 50+ on pass, rush AND receiving touchdowns, and says they STACK (a 55-yard receiving TD is
6+1+2 = 9, not 8). nflverse's weekly player stats carry no touchdown-distance breakdown, so the
bonus cannot be computed from that source -- Sleeper's own feed keys them `pass_td_40p`,
`rec_td_40p` and so on, where the word "bonus" appears nowhere. `score()` therefore accepts the
bonus counts and defaults them to zero, and any curve built from nflverse MUST record that it
excludes them. Silently omitting a rule that exists is how a number becomes a lie.
"""

# Every value here is quoted from docs/league.md. Change that file first, then this one.
FAMILY_FEUD = {
    "pass_yd": 0.04, "pass_td": 4.0, "interception": -1.0, "two_pt": 2.0,
    "rush_yd": 0.1, "rush_td": 6.0,
    "rec": 1.0, "rec_yd": 0.1, "rec_td": 6.0,
    "fumble_lost": -2.0,
    "st_td": 6.0,
    # Long-TD bonuses. They stack: a 50+ yard TD scores BOTH.
    "td_40p_bonus": 1.0, "td_50p_bonus": 2.0,
}

# nflverse's published fantasy_points_ppr formula. Not our league -- deliberately. This is the
# oracle, and its only job is to be reproducible from an outside source.
STANDARD_PPR = dict(FAMILY_FEUD, interception=-2.0, td_40p_bonus=0.0, td_50p_bonus=0.0)


def _n(v):
    """Blank cells, None and the odd 'NA' all mean zero. A CSV read that raises on an empty
    cell fails on week 1 of a player who did not play, which is most of them."""
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def score(stat, rules=FAMILY_FEUD):
    """Fantasy points for one player-week (or any pre-aggregated stat mapping).

    `stat` is anything supporting .get() -- a csv.DictReader row or a plain dict. Unknown keys
    are ignored; absent keys score zero.
    """
    fumbles = (_n(stat.get("sack_fumbles_lost")) + _n(stat.get("rushing_fumbles_lost"))
               + _n(stat.get("receiving_fumbles_lost")))
    two_pt = (_n(stat.get("passing_2pt_conversions")) + _n(stat.get("rushing_2pt_conversions"))
              + _n(stat.get("receiving_2pt_conversions")))
    td_40p = (_n(stat.get("pass_td_40p")) + _n(stat.get("rush_td_40p"))
              + _n(stat.get("rec_td_40p")))
    td_50p = (_n(stat.get("pass_td_50p")) + _n(stat.get("rush_td_50p"))
              + _n(stat.get("rec_td_50p")))
    return (
        _n(stat.get("passing_yards")) * rules["pass_yd"]
        + _n(stat.get("passing_tds")) * rules["pass_td"]
        + _n(stat.get("interceptions")) * rules["interception"]
        + _n(stat.get("rushing_yards")) * rules["rush_yd"]
        + _n(stat.get("rushing_tds")) * rules["rush_td"]
        + _n(stat.get("receiving_yards")) * rules["rec_yd"]
        + _n(stat.get("receiving_tds")) * rules["rec_td"]
        + _n(stat.get("receptions")) * rules["rec"]
        # Return touchdowns. nflverse folds these into fantasy_points, and Sleeper scores them to
        # the returner too -- omitting them cost 64 player-seasons exactly 12.0 points each while
        # every other number matched, which is what made it findable.
        + _n(stat.get("special_teams_tds")) * rules["st_td"]
        + two_pt * rules["two_pt"]
        + fumbles * rules["fumble_lost"]
        + td_40p * rules["td_40p_bonus"]
        + td_50p * rules["td_50p_bonus"]
    )


def kicker_points(made_by_distance, missed=0, xp_made=0, xp_missed=0):
    """FG 0-39: 3 · 40-49: 4 · 50-59: 5 · 60+: 6 · miss: -1 · XP: 1 · XP miss: -1.

    Distance-weighted with a real miss penalty, which is the scoring reason the board carries an
    elite-K tier at all. `made_by_distance` maps a band label to a count.
    """
    band = {"0-39": 3.0, "40-49": 4.0, "50-59": 5.0, "60+": 6.0}
    unknown = set(made_by_distance) - set(band)
    if unknown:
        raise ValueError(f"unknown field-goal band(s): {sorted(unknown)}; expected {sorted(band)}")
    return (sum(band[k] * _n(v) for k, v in made_by_distance.items())
            - _n(missed) + _n(xp_made) - _n(xp_missed))


# Points allowed -> points, as bands. The -4 floor is why streaming a defense into a bad matchup
# is genuinely expensive rather than merely low-upside.
DST_POINTS_ALLOWED = ((0, 0, 10.0), (1, 6, 7.0), (7, 13, 4.0), (14, 20, 1.0),
                      (21, 27, 0.0), (28, 34, -1.0), (35, None, -4.0))


def dst_points(points_allowed, tds=0, sacks=0, interceptions=0, fumble_recoveries=0,
               forced_fumbles=0, blocked_kicks=0, safeties=0):
    """TD 6 · sack 1 · INT 2 · fumble recovery 2 · forced fumble 1 · blocked kick 2 · safety 2."""
    pa = _n(points_allowed)
    band = next(v for lo, hi, v in DST_POINTS_ALLOWED if lo <= pa and (hi is None or pa <= hi))
    return (band + _n(tds) * 6.0 + _n(sacks) * 1.0 + _n(interceptions) * 2.0
            + _n(fumble_recoveries) * 2.0 + _n(forced_fumbles) * 1.0
            + _n(blocked_kicks) * 2.0 + _n(safeties) * 2.0)

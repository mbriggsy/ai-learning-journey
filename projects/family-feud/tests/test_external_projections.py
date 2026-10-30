#!/usr/bin/env python3
"""Tests for scripts/external_projections.py -- the CBS + ESPN second opinions.

    python -m unittest tests.test_external_projections -v        (from the project root)

No network. The CBS fixture is built from the markup measured live on 2026-10-14 (a header `<th>`
carries its long label in `.Tablebase-tooltipInner`; the Player `<th>` has none; a body row's first
cell holds the `/nfl/players/<cbs id>/` link, or `/nfl/teams/<CODE>/` on the DST page). The negative
controls are the point: a parser that silently returns nothing, or a stat map that scores every
player wrong, must REFUSE rather than print a healthy-looking table.
"""
import http.client
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
import external_projections as x  # noqa: E402

TE_LABELS = ["Games Played", "Targets", "Receptions", "Receiving Yards", "Yards Per Game",
             "Average Yards Per Reception", "Receiving Touchdowns", "Fumbles Lost", "Fantasy Points",
             "Fantasy Points Per Game"]


def th(label):
    return (f'<th class="TableBase-headTh has-tooltip "><a href="#">x<span></span></a>'
            f'<div class="Tablebase-tooltip"><div class="Tablebase-tooltipInner"> {label} </div></div></th>')


def page(labels, rows, dst=False):
    head = ('<thead><tr><th class="TableBase-headGroupTh" colspan="3"> Receiving </th></tr><tr>'
            '<th class="TableBase-headTh "><a href="#">Player</a></th>' + "".join(th(l) for l in labels) + "</tr></thead>")
    body = []
    for key, vals in rows:
        link = f'/nfl/teams/{key}/x/' if dst else f'/nfl/players/{key}/someone/fantasy/'
        cells = "".join(f'<td class="TableBase-bodyTd TableBase-bodyTd--number "> {v} </td>' for v in vals)
        body.append(f'<tr class="TableBase-bodyTr"><td class="TableBase-bodyTd "><a href="{link}">N</a></td>{cells}</tr>')
    return f"<table>{head}<tbody>{''.join(body)}</tbody></table>"


def te_row(i):
    # 5 rec, 50 yds, 0.5 TD, 0 FL -> CBS PPR 5 + 5 + 3 = 13.0
    return (str(1000 + i), [1, 7, 5.0, 50.0, 50.0, 10.0, 0.5, 0.0, 13.0, 13.0])


class ParseCbs(unittest.TestCase):
    def test_reads_rows_by_long_label(self):
        rows = x.parse_cbs(page(TE_LABELS, [te_row(i) for i in range(25)]), "TE")
        self.assertEqual(len(rows), 25)
        self.assertEqual(rows[0]["key"], "1000")
        self.assertEqual(rows[0]["cols"]["Receptions"], 5.0)
        self.assertEqual(rows[0]["cols"]["Fantasy Points"], 13.0)

    def test_stat_line_reproduces_the_source_total(self):
        row = x.parse_cbs(page(TE_LABELS, [te_row(i) for i in range(25)]), "TE")[0]
        st, approx = x.cbs_stats(row["cols"], "TE")
        self.assertFalse(approx)
        self.assertAlmostEqual(x.g.score(st, x.SOURCE_PPR), 13.0)

    def test_missing_column_refuses(self):
        labels = [l for l in TE_LABELS if l != "Receiving Yards"]
        with self.assertRaises(x.Refuse):
            x.parse_cbs(page(labels, [(str(i), [0] * len(labels)) for i in range(25)]), "TE")

    def test_too_few_rows_refuses(self):
        # The FantasyPros failure shape: a page that renders, with 10 rows and a sign-up wall.
        with self.assertRaises(x.Refuse):
            x.parse_cbs(page(TE_LABELS, [te_row(i) for i in range(10)]), "TE")

    def test_row_with_wrong_cell_count_is_skipped_not_misread(self):
        rows = [te_row(i) for i in range(25)] + [("9999", [1, 2, 3])]
        keys = [r["key"] for r in x.parse_cbs(page(TE_LABELS, rows), "TE")]
        self.assertNotIn("9999", keys)

    def test_dst_rows_key_on_team_code(self):
        labels = ["Interceptions", "Safeties", "Sacks", "Tackles", "Defensive Fumbles Recovered",
                  "Forced Fumbles", "Defensive Touchdowns", "Points Allowed", "Fantasy Points"]
        rows = x.parse_cbs(page(labels, [("T" + chr(65 + i) + "M", [1, 0, 3, 50, 1, 1, 0.2, 18.0, 9.0]) for i in range(25)],
                                dst=True), "DST")
        self.assertEqual(rows[0]["key"], "TAM")


class Scoring(unittest.TestCase):
    def test_kicker_misses_are_derived(self):
        cols = {"Field Goals Made": 2.0, "Field Goal Attempts": 2.5, "Field Goals 40-49 Yards": 1.0,
                "Field Goals 30-39 Yards": 1.0, "Extra Points Made": 3.0, "Extra Points Attempted": 3.2}
        st, approx = x.cbs_stats(cols, "K")
        self.assertFalse(approx)
        self.assertAlmostEqual(st["fgmiss"], 0.5)
        self.assertAlmostEqual(st["xpmiss"], 0.2)
        league = {"fgm_30_39": 3, "fgm_40_49": 4, "xpm": 1, "fgmiss": -1, "xpmiss": -1}
        self.assertAlmostEqual(x.g.score(st, league), 3 + 4 + 3 - 0.5 - 0.2)

    def test_dst_points_allowed_bucket_is_marked_approximate(self):
        st, approx = x.cbs_stats({"Sacks": 3.0, "Points Allowed": 18.3}, "DST")
        self.assertTrue(approx)
        self.assertEqual(st.get("pts_allow_14_20"), 1)

    def test_pa_bucket_edges(self):
        for pa, key in ((0, "pts_allow_0"), (6, "pts_allow_1_6"), (7, "pts_allow_7_13"),
                        (20, "pts_allow_14_20"), (21, None), (27, None), (28, "pts_allow_28_34"),
                        (35, "pts_allow_35p"), (52, "pts_allow_35p")):
            self.assertEqual(x.pa_bucket_key(pa), key, pa)


class ProveTheMap(unittest.TestCase):
    def test_accepts_a_map_that_reproduces_the_source(self):
        self.assertLess(x._prove([0.05] * 60, "TEST"), x.MAP_TOLERANCE)

    def test_refuses_a_map_that_does_not(self):
        # A renumbered ESPN stat / a reshuffled CBS column: every line misses by points, not hundredths.
        with self.assertRaises(x.Refuse):
            x._prove([2.4] * 60, "TEST")

    def test_refuses_too_little_evidence(self):
        with self.assertRaises(x.Refuse):
            x._prove([0.0] * 10, "TEST")


class DroppedConnection(unittest.TestCase):
    """urllib leaves a connection dropped mid-response unwrapped (docs/insights/038)."""

    def test_every_dropped_connection_is_a_refusal_not_a_traceback(self):
        for err in (http.client.RemoteDisconnected("Remote end closed connection without response"),
                    http.client.IncompleteRead(b""), ConnectionResetError("reset")):
            with mock.patch.object(x.urllib.request, "urlopen", side_effect=err):
                with self.assertRaises(x.Refuse, msg=repr(err)):
                    x._get("https://example.invalid")


if __name__ == "__main__":
    unittest.main()

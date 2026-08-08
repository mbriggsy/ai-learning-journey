#!/usr/bin/env python3
"""Tests for draft_engine.py's unmatched-pick reporting.

    python3 -m unittest discover -s tests -v        (from the project root)

The engine is a script that does its work at import time, so these drive it as a subprocess in a
throwaway cwd holding its two literal-named inputs. Nothing here can touch the real draft-kit.

WHY THE MATCHING RULE IS (team, pos) AND NOT NAME SIMILARITY -- measured, not assumed:
  false-positive floor  0.800  Javonte Williams vs Jameson Williams   (different men)
  true-positive floor   0.370  Hollywood Brown  vs Marquise Brown     (same man)
The floors are inverted, so no similarity threshold can separate them. Sleeper supplies team and
position on every pick and neither drifts the way a rendered name does, so candidates come from
the (team, pos) bucket instead. Measured on the 120-pick lab feed: 0 false candidates.
"""
import json, os, subprocess, sys, tempfile, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, "draft-kit", "draft_engine.py")
REAL_BOARD = os.path.join(ROOT, "draft-kit", "players_data.json")


def row(r, name, pos, team, pr, tier=1, badges=None, vorp=10.0, vbd_rank=None, note="n"):
    return {"r": r, "name": name, "pos": pos, "team": team, "pr": pr, "tier": tier,
            "badges": badges if badges is not None else [], "note": note,
            "vorp": vorp, "vbdRank": vbd_rank if vbd_rank is not None else r,
            "vbdDelta": r - (vbd_rank if vbd_rank is not None else r)}


def board(players):
    return {"meta": {"updated": "2026-08-05", "badges": {}}, "players": players,
            "dst": [], "strategy": {}}


def pick(no, first, last, pos, team, slot=None):
    return {"pick_no": no, "draft_id": "1", "draft_slot": slot or ((no - 1) % 8 + 1),
            "round": (no - 1) // 8 + 1, "player_id": str(no), "picked_by": "u",
            "roster_id": 1, "is_keeper": None,
            "metadata": {"first_name": first, "last_name": last, "position": pos, "team": team}}


BRIGGSY = "1390750540631150592"      # docs/league.md; TestLeagueIdentity pins this to the engine


def cargo(teams=8, rounds=16, draft_order=None, draft_id="1"):
    """A mule-cargo draft object, shaped like newsletter/data/inbox/sleeper_draft.json."""
    return {"draft_id": draft_id, "league_id": "L", "type": "snake", "status": "drafting",
            "settings": {"teams": teams, "rounds": rounds}, "draft_order": draft_order,
            "slot_to_roster_id": {str(i): i for i in range(1, teams + 1)}, "metadata": {}}


def user(uid, display):
    return {"user_id": uid, "display_name": display, "metadata": {}}


def ledger_of(*pairs):
    """{"ids": {board name: {"sleeperId": ...}}} -- the shape resolve_sleeper_ids.py writes."""
    return {"ids": {nm: {"sleeperId": str(pid), "resolved_on": "2026-08-07",
                         "evidence": {"matched": "exact_norm"}} for nm, pid in pairs},
            "unresolved": []}


class EngineCase(unittest.TestCase):
    def run_engine(self, board_obj, picks, slot=3, teams=8, rounds=16, draft_id=None,
                   draft_cargo=None, users=None, slot_names=None, ledger=None):
        """Drive the engine in a throwaway tree that MIRRORS the real layout.

        cwd is <tmp>/draft-kit, so the engine's cargo lookup (../newsletter/data/inbox) resolves
        inside the tmpdir and never at the real one. Planting no cargo is the honest default: it
        is the state on any machine where the mule has not run, and it must not fail the suite.
        """
        with tempfile.TemporaryDirectory() as d:
            kit = os.path.join(d, "draft-kit")
            os.makedirs(kit)
            with open(os.path.join(kit, "players_data.json"), "w", encoding="utf-8") as f:
                json.dump(board_obj, f, ensure_ascii=False)
            with open(os.path.join(kit, "picks.json"), "w", encoding="utf-8") as f:
                json.dump(picks, f, ensure_ascii=False)
            if slot_names is not None:
                with open(os.path.join(kit, "slot_names.json"), "w", encoding="utf-8") as f:
                    json.dump(slot_names, f, ensure_ascii=False)
            if ledger is not None:
                with open(os.path.join(kit, "sleeper_ids.json"), "w", encoding="utf-8") as f:
                    json.dump(ledger, f, ensure_ascii=False)
            if draft_cargo is not None or users is not None:
                inbox = os.path.join(d, "newsletter", "data", "inbox")
                os.makedirs(inbox)
                for fname, payload in (("sleeper_draft.json", draft_cargo),
                                       ("sleeper_users.json", users)):
                    if payload is not None:
                        with open(os.path.join(inbox, fname), "w", encoding="utf-8") as f:
                            json.dump(payload, f, ensure_ascii=False)
            env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
            argv = [sys.executable, ENGINE, str(slot), str(teams), str(rounds)]
            if draft_id is not None:
                argv.append(str(draft_id))
            p = subprocess.run(argv, cwd=kit, capture_output=True, text=True, encoding="utf-8",
                               env=env)
            return p.returncode, (p.stdout or "") + (p.stderr or "")

    def real_board(self):
        with open(REAL_BOARD, encoding="utf-8") as f:
            return json.load(f)

    def warning_block(self, out):
        """Everything the engine prints BEFORE the advisory proper. Assertions about the report
        must scope to this -- a board name appears in BEST AVAILABLE whether or not it was
        flagged, so asserting on the whole output passes for the wrong reason."""
        return out.split("BOARD STATE")[0]


class TestWarningNeverKillsTheAdvisory(EngineCase):
    """P1 REGRESSION I INTRODUCED: the unmatched-pick reporter indexed b['pos'] directly, so a
    board row missing 'pos' took down the WHOLE advisory -- where the previous engine printed a
    complete correct one. An advisory that produces nothing because its warning code crashed is
    the worst possible outcome. The board is hand-authored and gets fully re-authored before the
    draft, so this is a loaded gun, not a theoretical one."""

    def _malformed(self, drop):
        rows = [row(1, "Alpha One", "RB", "KC", 1), row(2, "Beta Two", "WR", "SF", 1),
                row(3, "Gamma Three", "TE", "LAR", 1)]
        del rows[1][drop]
        return board(rows)

    def test_drafted_malformed_row_does_not_crash_the_report(self):
        """The actual regression: when the malformed row has already been DRAFTED it never reaches
        the tier-cliff loop, so the previous engine printed a complete advisory -- and only the new
        report code touched it and died. Reported by review; fixed by reading board rows with
        .get() throughout."""
        b = self._malformed("pos")
        code, out = self.run_engine(b, [pick(1, "Beta", "Two", "WR", "SF"),
                                        pick(2, "Nobody", "Atall", "RB", "NYJ")])
        self.assertIn("BOARD STATE", out, f"advisory must survive a drafted malformed row:\n{out}")
        self.assertEqual(code, 0)

    def test_undrafted_malformed_row_fails_loudly_not_silently(self):
        """PRE-EXISTING, verified identical at HEAD and before: an UNDRAFTED row missing 'pos'
        reaches the TIER CLIFFS loop, which indexes p["pos"] directly, and the engine dies. That
        is the project's preferred direction (fail loud, never advise off a broken board) but it
        is a traceback rather than a designed message. Rejecting malformed boards belongs to the
        schema gate, not here -- this test pins the current behaviour so a change is deliberate."""
        code, out = self.run_engine(self._malformed("pos"), [pick(1, "Nobody", "Atall", "RB", "NYJ")])
        self.assertEqual(code, 1, "a malformed board must not produce a confident advisory")
        self.assertNotIn("BEST AVAILABLE", out)

    def test_pick_with_no_metadata_still_advises(self):
        b = board([row(1, "Alpha One", "RB", "KC", 1)])
        pk = pick(1, "x", "y", "RB", "KC")
        del pk["metadata"]
        code, out = self.run_engine(b, [pk])
        self.assertIn("BOARD STATE", out, f"a metadata-less pick must not crash the advisory:\n{out}")


class TestEscalation(EngineCase):
    """Escalate exactly when an UNCLAIMED board row shares the pick's (team, pos)."""

    def test_name_divergence_on_same_team_and_pos_escalates(self):
        """Joe/Joseph -- not in ALIASES, so norm() cannot reconcile it, and the surname survives.
        This is the shape a board rebuild produces."""
        b = board([row(1, "Joseph Burrow", "QB", "CIN", 1), row(2, "Other Guy", "WR", "SF", 1)])
        code, out = self.run_engine(b, [pick(1, "Joe", "Burrow", "QB", "CIN")])
        block = self.warning_block(out)
        self.assertIn("Joseph Burrow", block)
        self.assertIn("STILL", block.upper(), f"must say he is still on the board:\n{block}")

    def test_divergence_on_BOTH_name_axes_is_not_escalated(self):
        """Deliberate boundary: when the first name AND the surname both differ, the only thing
        left is (team, pos) -- which two genuinely different players share routinely (Michael
        Wilson and Marvin Harrison Jr. are both ARI/WR). Escalating there is a wolf-cry. The pick
        is still REPORTED, just not escalated."""
        b = board([row(1, "Marvin Harrison", "WR", "ARI", 1)])
        _, out = self.run_engine(b, [pick(1, "Michael", "Wilson", "WR", "ARI")])
        block = self.warning_block(out)
        self.assertNotIn("STILL", block.upper())
        self.assertIn("Michael Wilson", block, "it must still be reported as unmatched")

    def test_nickname_pairs_that_defeat_name_similarity_are_caught(self):
        """The pairs a 3-char prefix rule silently missed. None share enough string to be caught
        by similarity; all share team and position."""
        for legal, nick_first, nick_last in [
            ("Marquise Brown", "Hollywood", "Brown"),
            ("Cedarian Lamb", "CeeDee", "Lamb"),
            ("Tyshun Samuel", "Deebo", "Samuel"),
            ("Kealoha Nacua", "Puka", "Nacua"),
            ("Rayne Prescott", "Dak", "Prescott"),
        ]:
            with self.subTest(legal=legal):
                b = board([row(1, legal, "WR", "ARI", 1)])
                _, out = self.run_engine(b, [pick(1, nick_first, nick_last, "WR", "ARI")])
                block = self.warning_block(out)
                self.assertIn(legal, block, f"{nick_first} {nick_last} must surface {legal}:\n{block}")

    def test_team_defense_divergence_is_caught(self):
        """All 14 DEF rows were unprotected. Team-defense naming is the most variable field in
        fantasy; the team abbreviation is not."""
        b = board([row(1, "Los Angeles Rams", "DEF", "LAR", 1)])
        _, out = self.run_engine(b, [pick(1, "LA", "Rams", "DEF", "LAR")])
        self.assertIn("Los Angeles Rams", self.warning_block(out))

    def test_already_claimed_row_is_not_a_suspect(self):
        """If the board row was matched by its own pick, it cannot be the missing man."""
        b = board([row(1, "Garrett Wilson", "WR", "NYJ", 1)])
        picks = [pick(1, "Garrett", "Wilson", "WR", "NYJ"), pick(2, "Michael", "Wilson", "WR", "NYJ")]
        _, out = self.run_engine(b, picks)
        block = self.warning_block(out)
        self.assertNotIn("STILL", block.upper(), f"claimed row must not be flagged:\n{block}")

    def test_positive_control_drafted_player_still_on_best_available(self):
        """The end-to-end proof: a divergence leaves a drafted man at the top of BEST AVAILABLE,
        and the engine must say so."""
        b = self.real_board()
        chase = next(p for p in b["players"] if "Chase" in p["name"])
        _, out = self.run_engine(b, [pick(1, "Ja'M", "Chase", chase["pos"], chase["team"])])
        self.assertIn(chase["name"], out.split("BEST AVAILABLE")[1], "he is still being recommended")
        self.assertIn("STILL", out.split("BEST AVAILABLE")[0].upper(), "and the engine must warn")


class TestNoWolfCry(EngineCase):
    """A false alarm on a 120-second clock trains the operator to ignore the real one."""

    def test_real_lab_feed_produces_no_escalation(self):
        b = self.real_board()
        picks = [pick(1, "Michael", "Wilson", "WR", "ARI"), pick(2, "Wan'Dale", "Robinson", "WR", "TEN"),
                 pick(3, "Harrison", "Mevis", "K", "LAR"), pick(4, "Andy", "Borregales", "K", "NE")]
        _, out = self.run_engine(b, picks)
        head = out.split("BOARD STATE")[0]
        self.assertNotIn("STILL", head.upper(), f"the 4 genuine off-board picks must not escalate:\n{head}")

    def test_different_team_same_surname_does_not_escalate(self):
        b = board([row(1, "Jameson Williams", "WR", "DET", 1)])
        _, out = self.run_engine(b, [pick(1, "Javonte", "Williams", "RB", "DAL")])
        self.assertNotIn("STILL", self.warning_block(out).upper())

    def test_no_bare_all_clear_wording(self):
        """'(0 suspicious)' read as an explicit all-clear over the exact case the block exists
        to surface. The report must not reassure."""
        b = board([row(1, "Alpha One", "RB", "KC", 1)])
        _, out = self.run_engine(b, [pick(1, "Nobody", "Atall", "WR", "NYJ")])
        self.assertNotIn("0 suspicious", out)


class TestReportLegibility(EngineCase):
    def test_escalations_are_hoisted_above_noise(self):
        b = board([row(1, "Joseph Burrow", "QB", "CIN", 1)])
        picks = [pick(1, "Noise", "One", "WR", "NYJ"), pick(2, "Noise", "Two", "TE", "NYG"),
                 pick(3, "Joe", "Burrow", "QB", "CIN")]
        _, out = self.run_engine(b, picks)
        block = self.warning_block(out)
        self.assertLess(block.index("Joseph Burrow"), block.index("Noise Two"),
                        "the escalation must not be buried in pick order below the noise")

    def test_escalation_glyph_differs_from_the_cliff_glyph(self):
        """U+26A0 means 'take this man now' on the TIER CLIFFS line. Reusing it for 'the advisory
        below may be wrong' collides the two most important signals in the output."""
        b = board([row(1, "Joseph Burrow", "QB", "CIN", 1)])
        _, out = self.run_engine(b, [pick(1, "Joe", "Burrow", "QB", "CIN")])
        self.assertNotIn("⚠", self.warning_block(out), "escalation must not reuse the CLIFF glyph")


class TestDraftIdAwareness(EngineCase):
    """REVIEW FINDING: the contamination guard lives only in the WRITER. merge_picks.py refuses
    and exits 2 -- then leaves the poisoned file on disk, and the engine reads it with no draft_id
    awareness at all and produces a confident exit-0 advisory. Exit 2 is consumed by nothing; it
    only ever reaches a human eye, under a 120-second clock, past a wall of '!'.

    This project already duplicates the gaps/dupes gate in BOTH writer and reader. The draft_id
    gate was the odd one out."""

    def board3(self):
        return board([row(i, f"P{i} L{i}", "RB", "KC", i) for i in range(1, 6)])

    def test_draft_id_is_stated_so_a_wrong_one_is_visible(self):
        picks = [pick(1, "A", "B", "RB", "KC")]
        picks[0]["draft_id"] = "1390923383440424960"
        _, out = self.run_engine(self.board3(), picks)
        self.assertIn("1390923383440424960", out, "the advisory must say which draft it is advising off")

    def test_mixed_draft_ids_are_refused(self):
        """Unambiguous corruption -- no legitimate picks.json holds two drafts."""
        a, b = pick(1, "A", "B", "RB", "KC"), pick(2, "C", "D", "RB", "KC")
        a["draft_id"], b["draft_id"] = "111", "222"
        code, out = self.run_engine(self.board3(), [a, b])
        self.assertEqual(code, 1)
        self.assertIn("111", out)
        self.assertIn("222", out)

    def test_expected_draft_id_mismatch_is_refused(self):
        picks = [pick(1, "A", "B", "RB", "KC")]
        picks[0]["draft_id"] = "1390923383440424960"
        code, out = self.run_engine(self.board3(), picks, draft_id="1390509994847240192")
        self.assertEqual(code, 1, f"a stale mock's picks must not advise a live draft:\n{out}")
        self.assertIn("1390509994847240192", out)

    def test_expected_draft_id_match_runs_clean(self):
        picks = [pick(1, "A", "B", "RB", "KC")]
        picks[0]["draft_id"] = "1390509994847240192"
        code, _ = self.run_engine(self.board3(), picks, draft_id="1390509994847240192")
        self.assertEqual(code, 0)

    def test_empty_picks_with_expected_id_still_runs(self):
        code, _ = self.run_engine(self.real_board(), [], draft_id="1390509994847240192")
        self.assertEqual(code, 0, "nothing drafted yet is the normal pre-draft state")


class TestEscalationTellsYouWhereToLook(EngineCase):
    """REVIEW FINDING: the alarm said 'he is STILL listed as available below', but 'below' is
    BEST AVAILABLE (top 12) plus the first 5 names of the two shallowest tiers per position. A
    suspect outside that window was named and then printed nowhere -- so the operator burns clock
    hunting, finds nothing, and concludes the warning is broken. That disarms the next one."""

    def test_says_shown_when_the_suspect_appears_below(self):
        b = self.real_board()
        chase = next(p for p in b["players"] if "Chase" in p["name"])
        _, out = self.run_engine(b, [pick(1, "JaMarr", "Chase-Higgins", chase["pos"], chase["team"])])
        block = self.warning_block(out)
        self.assertIn(chase["name"], out.split("BEST AVAILABLE")[1], "precondition: he is shown")
        self.assertIn("below", block.lower())
        self.assertNotIn("not shown", block.lower())

    def test_says_not_shown_when_the_suspect_is_too_deep(self):
        """Share the SURNAME so the token rule surfaces the row, but diverge the first name so
        norm() cannot reconcile it -- then assert the row genuinely is not printed anywhere below."""
        b = self.real_board()
        deep = max((p for p in b["players"] if p["pos"] == "K"), key=lambda p: p["r"])
        surname = deep["name"].split()[-1]
        _, out = self.run_engine(b, [pick(1, "Zzquentin", surname, "K", deep["team"])])
        block, below = self.warning_block(out), out.split("BOARD STATE", 1)[1]
        self.assertIn(deep["name"], block, "precondition: the deep row must be surfaced as a suspect")
        self.assertNotIn(deep["name"], below, "precondition: and must NOT appear anywhere below")
        self.assertIn("not shown", block.lower(),
                      f"must not send the operator hunting for a line that is not printed:\n{block}")


class TestNoRegression(EngineCase):
    """The integrity gate is deliberately defensive and predates this work."""

    def test_gate_still_fires_on_interior_gap(self):
        b = board([row(i, f"P{i} L{i}", "RB", "KC", i) for i in range(1, 6)])
        code, out = self.run_engine(b, [pick(1, "A", "B", "RB", "KC"), pick(3, "C", "D", "RB", "KC")])
        self.assertEqual(code, 1)
        self.assertIn("MISSING pick(s): [2]", out)

    def test_gate_still_fires_on_duplicate(self):
        b = board([row(i, f"P{i} L{i}", "RB", "KC", i) for i in range(1, 6)])
        code, out = self.run_engine(b, [pick(1, "A", "B", "RB", "KC"), pick(1, "A", "B", "RB", "KC")])
        self.assertEqual(code, 1)
        self.assertIn("DUPLICATE", out)

    def test_empty_picks_still_advises(self):
        code, out = self.run_engine(self.real_board(), [])
        self.assertEqual(code, 0)
        self.assertIn("BEST AVAILABLE", out)

    def test_real_board_16_rounds_runs_clean(self):
        code, out = self.run_engine(self.real_board(), [pick(1, "Ja'Marr", "Chase", "WR", "CIN")], rounds=16)
        self.assertEqual(code, 0)
        self.assertIn("YOUR next pick", out)


class TestTeamCodeAgreement(EngineCase):
    """P0 REGRESSION, found while building U14 and fixed in the board.

    Escalation buckets candidates by (team, pos), where the KEY comes from the board and the
    LOOKUP comes from the pick. The board said "JAC" for all eight Jacksonville rows; Sleeper's
    player dump AND its live picks both say "JAX". So every Jaguar whose rendered name drifted
    landed in the (JAX, pos) bucket, found nothing, and was demoted to "not on our board" -- while
    still sitting on BEST AVAILABLE. That is precisely the outcome U2 shipped to prevent, silently
    disabled for one team, inside the safety net itself.

    Reproduced against the real 120-pick lab feed by re-rendering one Jaguar's first name, which
    is exactly how Sleeper drifts a name in practice.
    """

    FEED = os.path.join(ROOT, "tests", "fixtures", "lab_feed_120.json")

    def drifted_feed(self, first, last, new_first):
        with open(self.FEED, encoding="utf-8") as f:
            picks = json.load(f)
        hits = 0
        for p in picks:
            md = p.get("metadata") or {}
            if md.get("first_name") == first and md.get("last_name") == last:
                md["first_name"] = new_first
                hits += 1
        self.assertEqual(hits, 1, f"fixture drift target {first} {last} not found exactly once")
        return picks

    def test_a_jaguar_whose_name_drifts_still_escalates(self):
        picks = self.drifted_feed("Bhayshul", "Tuten", "Bhayshul T.")
        code, out = self.run_engine(self.real_board(), picks,
                                    draft_id="1390923383440424960")
        self.assertEqual(code, 0)
        block = self.warning_block(out)
        self.assertIn("Bhayshul T. Tuten", block)
        self.assertIn("is UNCLAIMED", block,
                      "a Jaguar drifted and the escalation stayed silent -- board/Sleeper team "
                      "codes have diverged again (see JAC/JAX)")

    def test_the_same_drift_on_a_non_jaguar_escalates_too(self):
        """Control. Without this, a check that escalates everything would pass the test above."""
        picks = self.drifted_feed("Bijan", "Robinson", "Bijan A.")
        code, out = self.run_engine(self.real_board(), picks,
                                    draft_id="1390923383440424960")
        self.assertEqual(code, 0)
        self.assertIn("is UNCLAIMED", self.warning_block(out))

    def test_an_undrifted_feed_escalates_nobody(self):
        """Second control: the real feed's 4 unmatched picks are genuinely off our board, so
        nothing should be escalated. A check that always fires would pass both tests above."""
        with open(self.FEED, encoding="utf-8") as f:
            picks = json.load(f)
        code, out = self.run_engine(self.real_board(), picks,
                                    draft_id="1390923383440424960")
        self.assertEqual(code, 0)
        block = self.warning_block(out)
        self.assertIn("4 pick(s) did not match", block)
        self.assertNotIn("is UNCLAIMED", block)

    def test_no_board_row_uses_a_team_code_absent_from_the_lab_feed_picks(self):
        """The invariant behind all of the above, stated over data rather than behaviour:
        board team codes and Sleeper pick team codes are drawn from one vocabulary."""
        with open(self.FEED, encoding="utf-8") as f:
            picks = json.load(f)
        pick_teams = {(p.get("metadata") or {}).get("team") for p in picks}
        pick_teams.discard(None)
        board_teams = {r["team"] for r in self.real_board()["players"]}
        # every team the feed names must be spelled the same way on the board
        self.assertEqual(sorted(pick_teams - board_teams), [],
                         "Sleeper uses a team code the board does not")


class TestFrozenIdJoin(EngineCase):
    """U14 froze a Sleeper id for all 174 board rows and NOTHING READ IT. The engine matched live
    picks to the board on the rendered NAME -- the one field that drifts.

    The failure that forced this, reproduced against the real board before a line was written:
    board #1 Jahmyr Gibbs is taken at pick 1; Sleeper renders him "J. Gibbs" and he has changed
    teams since the board was authored. Name join misses. The (team,pos) escalation misses too,
    because the board says DET and the pick says NE. So the engine printed `not on our board`,
    added the explicit all-clear `no unclaimed board row shares a team and position`, and left him
    sitting at #1 on BEST AVAILABLE -- naming an already-drafted man as THE CALL. That is the
    landmine CLAUDE.md says was closed; this was a second, unguarded road to it.

    The pick carried player_id 9221, which is Gibbs's frozen id in our own ledger.

    Measured over the 120-pick lab feed: 116 picks join by BOTH id and name with ZERO
    disagreements, 4 by neither (genuinely off our 174). The id join is not a different answer
    today -- it is the same answer that survives a name drifting tomorrow.
    """

    GIBBS, BIJAN = "9221", "9509"

    def kit(self):
        return board([row(1, "Jahmyr Gibbs", "RB", "DET", 1),
                      row(2, "Bijan Robinson", "RB", "ATL", 2),
                      row(3, "Ja'Marr Chase", "WR", "CIN", 1)])

    def led(self):
        return ledger_of(("Jahmyr Gibbs", self.GIBBS), ("Bijan Robinson", self.BIJAN),
                         ("Ja'Marr Chase", "7564"))

    def drifted_gibbs(self):
        """Taken at pick 1, re-rendered by Sleeper, and traded since the board was authored."""
        p = pick(1, "J.", "Gibbs", "RB", "NE")
        p["player_id"] = self.GIBBS
        return p

    def best_available(self, out):
        return out.split("BEST AVAILABLE")[1]

    def test_a_drafted_player_whose_name_AND_team_drift_is_still_removed(self):
        code, out = self.run_engine(self.kit(), [self.drifted_gibbs()], ledger=self.led())
        self.assertEqual(code, 0, out)
        self.assertNotIn("Jahmyr Gibbs", self.best_available(out),
                         "an already-drafted man is being recommended as THE CALL")

    def test_the_same_input_without_a_ledger_cannot_catch_it_and_says_so(self):
        """The contrast that justifies the ledger. Name join has no way to see through a drift
        this size, so the engine must not imply it did -- absence of the ledger is reported."""
        code, out = self.run_engine(self.kit(), [self.drifted_gibbs()])
        self.assertEqual(code, 0, out)
        self.assertIn("sleeper_ids.json", out)
        self.assertIn("UNVERIFIED", out.upper())

    def test_the_id_join_reports_the_name_it_rescued(self):
        """Silence here would hide that the board's rendering has drifted from Sleeper's."""
        code, out = self.run_engine(self.kit(), [self.drifted_gibbs()], ledger=self.led())
        self.assertEqual(code, 0, out)
        head = self.warning_block(out)
        self.assertIn("J. Gibbs", head)
        self.assertIn("Jahmyr Gibbs", head)

    def test_a_pick_matched_by_id_is_not_reported_as_unmatched(self):
        code, out = self.run_engine(self.kit(), [self.drifted_gibbs()], ledger=self.led())
        self.assertNotIn("not on our board", out)
        self.assertNotIn("no unclaimed board row shares", out,
                         "the all-clear fired over a player who WAS on our board")

    def test_a_clean_feed_still_joins_and_leaves_the_rest_available(self):
        """Positive control. A join that claims everything passes every test above."""
        p = pick(1, "Bijan", "Robinson", "RB", "ATL")
        p["player_id"] = self.BIJAN
        code, out = self.run_engine(self.kit(), [p], ledger=self.led())
        self.assertEqual(code, 0, out)
        avail = self.best_available(out)
        self.assertNotIn("Bijan Robinson", avail)
        self.assertIn("Jahmyr Gibbs", avail)
        self.assertIn("Ja'Marr Chase", avail)

    def test_a_defense_joins_on_its_team_code(self):
        """Sleeper's player_id for a DEF is the team code, and U14 asserts the board agrees."""
        b = board([row(1, "Minnesota Vikings", "DEF", "MIN", 1), row(2, "A B", "RB", "KC", 1)])
        p = pick(1, "Minnesota", "Vikings", "DEF", "MIN")
        p["player_id"] = "MIN"
        code, out = self.run_engine(b, [p], ledger=ledger_of(("Minnesota Vikings", "MIN"),
                                                             ("A B", "99")))
        self.assertEqual(code, 0, out)
        self.assertNotIn("Minnesota Vikings", self.best_available(out))

    def test_a_board_row_with_no_frozen_id_is_reported(self):
        """A partial ledger is the dangerous middle: present enough to look wired, incomplete
        enough that some rows are back on a name join with nothing saying which."""
        led = ledger_of(("Jahmyr Gibbs", self.GIBBS))       # Bijan and Chase missing
        code, out = self.run_engine(self.kit(), [], ledger=led)
        self.assertEqual(code, 0, out)
        self.assertIn("1 of 3", out)
        self.assertIn("name join", out, "the operator must be told what the rest fall back to")

    def test_an_off_board_pick_is_called_a_different_man_not_the_same_one(self):
        """The escalation's premise INVERTS once the id join exists.

        It was written for a board player whose name drifted -- so a (team,pos) suspect sharing a
        token was probably the same man. With the ledger wired, that case is now caught by id. So
        a pick that reaches the escalation carries an id we do NOT have, which means he is not on
        our 174 at all -- and a same-position suspect sharing a surname is therefore a TEAMMATE.
        Keeping the old wording would assert an identity the id just disproved.
        """
        b = board([row(1, "Marvin Harrison", "WR", "ARI", 1)])
        p = pick(1, "Harrison", "Wallace", "WR", "ARI")
        p["player_id"] = "13670"                            # not in our ledger
        code, out = self.run_engine(b, [p], ledger=ledger_of(("Marvin Harrison", "11628")))
        self.assertEqual(code, 0, out)
        head = self.warning_block(out)
        self.assertIn("Marvin Harrison", head, "the suspect must be named so it can be judged")
        self.assertIn("different man", head.lower())
        self.assertNotIn("is the same man", head.lower())


class TestTheAdvisoryBodyIsPinned(EngineCase):
    """Everything BELOW the warning block had almost no assertions.

    The suite ran the full advisory only to check the exit code and two header strings, so the
    snake math, the roster/needs arithmetic, the between-now-and-you list and the BEST AVAILABLE
    ordering were all unpinned -- seven separate mutations to them left the whole suite green.
    That is insight 006's shape at the level of a test FILE rather than a single assertion: the
    advisory looked covered because the suite was green, and the numbers it prints are the ones
    that decide reach-now-or-wait.

    Every expected value below is computed by hand from the snake rule, not copied from output.
    8-team snake, slot 3: my picks are 3, 14, 19, 30, 35 ...
      round 1 (odd)  -> seat 3       -> pick  3
      round 2 (even) -> seat 8+1-3=6 -> pick  8 + 6 = 14
      round 3 (odd)  -> seat 3       -> pick 16 + 3 = 19
    """

    def kit(self):
        # r and pr deliberately DISAGREE, so ordering by board rank and by positional rank give
        # different answers. The old probe was #3 overall AND WR1, which survived both.
        return board([row(1, "Alpha One", "RB", "KC", 1),
                      row(2, "Bravo Two", "WR", "SF", 3),
                      row(3, "Charlie Three", "WR", "SF", 1),
                      row(4, "Delta Four", "RB", "KC", 2),
                      row(5, "Echo Five", "WR", "SF", 2),
                      row(6, "Foxtrot Six", "TE", "GB", 1),
                      row(7, "Golf Seven", "QB", "BUF", 1),
                      row(8, "Hotel Eight", "K", "NE", 1),
                      row(9, "India Nine", "DEF", "MIN", 1)])

    def filler(self, n, start=1):
        """n picks of players who are NOT on the board, so availability is untouched."""
        return [pick(i, f"Off{i}", f"Board{i}", "RB", "DAL", slot=None)
                for i in range(start, start + n)]

    # ---- snake math ----

    def test_the_clock_and_my_next_pick_with_no_picks_in(self):
        code, out = self.run_engine(self.kit(), [], slot=3)
        self.assertEqual(code, 0, out)
        self.assertIn("next is pick 1 (slot 1)", out)
        self.assertIn("YOUR next pick: #3 — 2 picks away", out)

    def test_the_clock_wraps_correctly_into_round_two(self):
        """Pick 11 is round 2 of an 8-team snake, which counts DOWN: seat 8-(11-1)%8 = 6."""
        code, out = self.run_engine(self.kit(), self.filler(10), slot=3)
        self.assertEqual(code, 0, out)
        self.assertIn("next is pick 11 (slot 6)", out)
        self.assertIn("YOUR next pick: #14 — 3 picks away", out)

    def test_the_turn_at_the_end_of_round_one(self):
        code, out = self.run_engine(self.kit(), self.filler(8), slot=3)
        self.assertIn("next is pick 9 (slot 8)", out)
        self.assertIn("YOUR next pick: #14 — 5 picks away", out)

    def test_my_own_seat_is_marked_on_the_clock(self):
        code, out = self.run_engine(self.kit(), self.filler(2), slot=3)
        self.assertIn("next is pick 3 (slot 3 = YOU)", out)

    def test_the_third_round_pick_is_reached(self):
        code, out = self.run_engine(self.kit(), self.filler(15), slot=3)
        self.assertIn("YOUR next pick: #19 — 3 picks away", out)

    # ---- who picks between now and me ----

    def test_between_now_and_you_lists_every_seat_in_order(self):
        code, out = self.run_engine(self.kit(), [], slot=3)
        self.assertIn("Between now and you: slot 1, slot 2", out)

    def test_between_now_and_you_follows_the_snake_back_down(self):
        """From pick 9 to my pick 14, round 2 counts down: seats 8, 7, 6, 5."""
        code, out = self.run_engine(self.kit(), self.filler(8), slot=3)
        self.assertIn("Between now and you: slot 8, slot 7, slot 6, slot 5", out)

    # ---- roster needs / STARTERS ----

    def test_an_empty_roster_needs_every_starter_and_two_flex(self):
        code, out = self.run_engine(self.kit(), [], slot=3)
        self.assertIn("slot 1: [empty] needs: QBx1, RBx2, WRx2, TEx1, Kx1, DEFx1, FLEXx2", out)

    def test_two_running_backs_close_the_rb_requirement_but_not_flex(self):
        picks_ = [pick(1, "Alpha", "One", "RB", "KC", slot=1),
                  pick(2, "Delta", "Four", "RB", "KC", slot=1)]
        code, out = self.run_engine(self.kit(), picks_, slot=3)
        self.assertIn("slot 1: [RB2] needs: QBx1, WRx2, TEx1, Kx1, DEFx1, FLEXx2", out)

    def test_a_third_running_back_becomes_a_flex_body(self):
        picks_ = [pick(i, "Off", f"Board{i}", "RB", "DAL", slot=1) for i in (1, 2, 3)]
        code, out = self.run_engine(self.kit(), picks_, slot=3)
        self.assertIn("slot 1: [RB3] needs: QBx1, WRx2, TEx1, Kx1, DEFx1, FLEXx1", out)

    def test_my_seat_carries_the_you_marker_and_nobody_else_does(self):
        code, out = self.run_engine(self.kit(), [], slot=5)
        rosters = out.split("ROSTERS / NEEDS")[1].split("TIER CLIFFS")[0]
        self.assertEqual(rosters.count("<== YOU"), 1)
        self.assertIn("slot 5: [empty]", rosters)
        self.assertRegex(rosters, r"slot 5:[^\n]*<== YOU")

    # ---- BEST AVAILABLE ordering ----

    def test_best_available_is_ordered_by_board_rank_not_positional_rank(self):
        code, out = self.run_engine(self.kit(), [], slot=3)
        listed = [ln.split()[1] for ln in out.split("BEST AVAILABLE (my board)")[1].splitlines()
                  if ln.strip() and ln.strip()[0].isdigit()]
        self.assertEqual(listed[:5], ["Alpha", "Bravo", "Charlie", "Delta", "Echo"],
                         "BEST AVAILABLE must follow board rank r; this board's pr disagrees")

    def test_a_drafted_player_leaves_the_ordering_intact(self):
        p = pick(1, "Bravo", "Two", "WR", "SF", slot=1)
        code, out = self.run_engine(self.kit(), [p], slot=3)
        listed = [ln.split()[1] for ln in out.split("BEST AVAILABLE (my board)")[1].splitlines()
                  if ln.strip() and ln.strip()[0].isdigit()]
        self.assertEqual(listed[:4], ["Alpha", "Charlie", "Delta", "Echo"])


class TestLeagueIdentity(unittest.TestCase):
    def test_the_engine_and_the_watcher_agree_on_briggsys_user_id(self):
        """The id is the oracle for 'is this my seat'. Two copies exist, so pin them together --
        a drifted copy would silently disable the seat check rather than fail it."""
        for path in (os.path.join(ROOT, "draft-kit", "draft_engine.py"),
                     os.path.join(ROOT, "scripts", "watch_draft_state.py")):
            with open(path, encoding="utf-8") as f:
                self.assertIn(f'"{BRIGGSY}"', f.read(),
                              f"{os.path.basename(path)} no longer carries the user_id in "
                              f"docs/league.md -- the seat check is looking for the wrong man")


class TestInputValidation(EngineCase):
    """my_slot, teams, rounds and slot_names.json are hand-supplied, and a WRONG value for any of
    them sits inside the legal range. The only pre-existing check was `1 <= my_slot <= teams`,
    which every wrong seat satisfies -- so the engine produced a complete, confident advisory for
    somebody else's seat and exited 0.

    The corroborating evidence was already on disk and thrown away: the mule's cargo carries
    settings.teams / settings.rounds / draft_order, and every pick the operator made carries
    picked_by next to its draft_slot.

    Two rules the assertions below encode:
      * a MISSING oracle never exits -- a dead mule must not also cost the advisory on draft
        morning -- but it must never print like a passed check either.
      * an oracle for a DIFFERENT draft is not evidence about this one.
    """

    def small(self):
        return board([row(i, f"P{i} L{i}", "RB", "KC", i) for i in range(1, 6)])

    def briggsy_pick(self, no, slot):
        p = pick(no, "Ja'Marr", "Chase", "WR", "CIN", slot=slot)
        p["picked_by"] = BRIGGSY
        return p

    # ---- the seat ----

    def test_a_wrong_seat_is_refused_when_draft_order_names_the_right_one(self):
        code, out = self.run_engine(self.small(), [], slot=3, draft_id="1",
                                    draft_cargo=cargo(draft_order={BRIGGSY: 5}))
        self.assertEqual(code, 1, "the engine advised off a seat the draft says is not ours")
        self.assertIn("my_slot", out)
        self.assertIn("5", out)
        self.assertNotIn("BEST AVAILABLE", out, "a refused run must produce no advisory")

    def test_the_right_seat_passes_and_says_it_checked(self):
        """Positive control. A gate that refuses everything passes every test above."""
        code, out = self.run_engine(self.small(), [], slot=5, draft_id="1",
                                    draft_cargo=cargo(draft_order={BRIGGSY: 5}))
        self.assertEqual(code, 0, out)
        self.assertIn("BEST AVAILABLE", out)
        self.assertIn("checked", out.lower())

    def test_a_wrong_seat_is_refused_from_picked_by_alone(self):
        """draft_order is null until near go time, so picked_by is the oracle that exists first."""
        picks = [pick(1, "A", "B", "RB", "KC", slot=1), pick(2, "C", "D", "RB", "KC", slot=2),
                 self.briggsy_pick(3, 3)]
        code, out = self.run_engine(self.small(), picks, slot=5, draft_id="1")
        self.assertEqual(code, 1, "our own pick named seat 3 and the engine advised seat 5")
        self.assertIn("picked_by", out)

    def test_the_seat_is_loudly_unverified_when_no_oracle_exists(self):
        """The state on every machine before the mule runs. Must not exit -- must not go quiet."""
        code, out = self.run_engine(self.small(), [], slot=3)
        self.assertEqual(code, 0, out)
        self.assertIn("BEST AVAILABLE", out, "a missing oracle must not cost the advisory")
        self.assertIn("UNVERIFIED", out.upper())

    # ---- the draft's shape ----

    def test_a_wrong_team_count_is_refused_against_the_draft_settings(self):
        code, out = self.run_engine(self.small(), [], slot=3, teams=10, draft_id="1",
                                    draft_cargo=cargo(teams=8))
        self.assertEqual(code, 1)
        self.assertIn("teams", out.lower())

    def test_a_wrong_round_count_is_refused_against_the_draft_settings(self):
        code, out = self.run_engine(self.small(), [], slot=3, rounds=14, draft_id="1",
                                    draft_cargo=cargo(rounds=16))
        self.assertEqual(code, 1)
        self.assertIn("rounds", out.lower())

    def test_a_team_count_below_a_seen_draft_slot_is_refused_with_no_cargo_at_all(self):
        """picks.json alone disproves it: a draft_slot of 8 cannot occur in a 6-team draft."""
        picks = [pick(i, f"P{i}", f"L{i}", "RB", "KC", slot=i) for i in range(1, 9)]
        code, out = self.run_engine(self.small(), picks, slot=3, teams=6)
        self.assertEqual(code, 1)
        self.assertIn("draft_slot", out)

    def test_a_team_count_above_what_the_seats_ever_reach_is_refused(self):
        """The asymmetry that a live run exposed: `max(draft_slot) > teams` only disproves a team
        count that is too SMALL. Too LARGE stayed silent -- and with the real cargo belonging to a
        different draft, nothing else was left to catch it. Once a full round has gone by, every
        seat has picked, so the highest seat seen IS the team count."""
        slots = [1, 2, 3, 4, 5, 6, 7, 8, 8, 7, 6, 5]        # an 8-team snake, 12 picks in
        picks = [pick(i + 1, f"P{i}", f"L{i}", "RB", "KC", slot=s) for i, s in enumerate(slots)]
        code, out = self.run_engine(self.small(), picks, slot=3, teams=10)
        self.assertEqual(code, 1, "a 10-team draft was accepted on a feed that never leaves seat 8")
        self.assertIn("draft_slot 8", out)

    def test_a_partial_first_round_does_not_false_red_the_team_count(self):
        """The other half of that rule, and the more important half. Before a full round has been
        played the highest seat seen is simply how far the draft has got -- concluding a team
        count from it would refuse a CORRECT run, which is the failure insight 009 is about."""
        picks = [pick(i, f"P{i}", f"L{i}", "RB", "KC", slot=i) for i in range(1, 4)]
        code, out = self.run_engine(self.small(), picks, slot=3, teams=8)
        self.assertEqual(code, 0, f"3 picks into an 8-team draft was refused:\n{out}")

    def test_a_pick_beyond_teams_times_rounds_is_refused(self):
        """picks.json can disprove the ROUND count too: pick #20 cannot exist in 8 x 2."""
        picks = [pick(i, f"P{i}", f"L{i}", "RB", "KC", slot=((i - 1) % 8) + 1)
                 for i in range(1, 21)]
        code, out = self.run_engine(self.small(), picks, slot=3, teams=8, rounds=2)
        self.assertEqual(code, 1)
        self.assertIn("16", out, "the operator must be shown the capacity he exceeded")

    def test_a_draft_order_with_two_people_on_one_seat_is_not_trusted(self):
        """The oracle gets the same scepticism as the input it judges. A draft_order that seats
        two user_ids on one slot is corrupt, and a corrupt oracle must not quietly arbitrate the
        seat or name the rosters. It does not exit -- a broken oracle never costs the advisory --
        but it must not read as a passed check either.

        Not hypothetical: writing the live proof for this gate, I generated exactly this shape by
        accident and the engine consumed it without a word.
        """
        code, out = self.run_engine(self.small(), [], slot=3, draft_id="1",
                                    draft_cargo=cargo(draft_order={BRIGGSY: 3, "999": 3}))
        self.assertEqual(code, 0, "a corrupt oracle must not cost the advisory")
        self.assertIn("more than one user", out)
        self.assertIn("UNVERIFIED", out.upper(), "the seat must fall back to unverified")

    # ---- the oracle must be about THIS draft ----

    def test_cargo_from_a_different_draft_is_not_used_as_an_oracle(self):
        """The mule pins draft_id in its URL, so a re-created draft leaves stale cargo that still
        parses. Trusting it would refuse a CORRECT seat -- a false red, which insight 009 records
        as more dangerous than a false green."""
        code, out = self.run_engine(self.small(), [], slot=3, draft_id="1",
                                    draft_cargo=cargo(draft_id="999", draft_order={BRIGGSY: 5}))
        self.assertEqual(code, 0, "stale cargo for another draft refused a correct seat")
        self.assertIn("999", out, "the operator must be told his cargo is for another draft")
        self.assertIn("UNVERIFIED", out.upper())

    # ---- the names file ----

    def test_a_stale_slot_names_file_never_prints_the_wrong_human(self):
        """Measured on a real stale file: it printed `slot 3 (Hunter) <== YOU` -- the rival's name
        on Briggsy's own seat, in the project whose mission is beating him. It is gitignored, so
        `git status` cannot show it is stale."""
        code, out = self.run_engine(
            self.small(), [], slot=3, draft_id="1",
            draft_cargo=cargo(draft_order={BRIGGSY: 3, "959308419154886656": 4}),
            users=[user(BRIGGSY, "PoppaBriggsy"), user("959308419154886656", "briggsy007")],
            slot_names={"3": "Hunter", "4": "Ryan"})
        self.assertEqual(code, 0, out)
        rosters = out.split("ROSTERS / NEEDS")[1]
        self.assertNotIn("Hunter", rosters, "the stale file's name was printed on a seat")
        self.assertIn("PoppaBriggsy", rosters, "the derived truth was not used")
        self.assertIn("slot_names.json", out, "the operator was not told his file disagreed")

    def test_slot_names_are_marked_unverified_when_they_cannot_be_checked(self):
        """Scoped to the slot_names line specifically. Asserting only on "UNVERIFIED" passed off
        the SEAT banner, which prints here for an unrelated reason -- an assertion that cannot
        tell which of two messages fired is not testing either of them."""
        code, out = self.run_engine(self.small(), [], slot=3, slot_names={"3": "Hunter"})
        self.assertEqual(code, 0, out)
        self.assertIn("slot_names.json is hand-authored and could not be checked", out)
        # and the unchecked name is not silently dropped -- it is the only naming we have
        self.assertIn("Hunter", out.split("ROSTERS / NEEDS")[1])


if __name__ == "__main__":
    unittest.main(verbosity=2)

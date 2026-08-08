#!/usr/bin/env python3
"""U11 -- The Nightly Feud's build half.

The load-bearing tests here are in `TestWireMatching`. Surname matching was tried first and
measured against one night's real feeds it produced **10 false positives out of 11 items**:
"Hall of Fame" matched Breece Hall five times, "Kirk Cousins" matched Christian Kirk, "Herschel
Walker" matched Kenneth Walker III, "Malachi Lawrence" matched Trevor Lawrence. Every one of those
headlines is pinned below as a test. A wire that reports a healthy player as injured is worse than
a wire that reports nothing, and this is the file that keeps it honest.

Second in importance: `test_the_style_block_is_byte_identical_to_the_frozen_design`. The design is
the asset. It is EXTRACTED from newsletter-template.html at build time rather than copied into the
Jinja template, so there is no second copy to drift -- and this proves the extraction survived.
"""
import datetime as _dt
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import build_newsletter as N  # noqa: E402

RSS = """<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
{items}
</channel></rss>"""


def feed(*titles):
    items = "".join(f"<item><title>{t}</title><link>http://x/{i}</link></item>"
                    for i, t in enumerate(titles))
    return RSS.format(items=items)


def player(r, name, pos="RB", team="DET", tier=1, sleeper_id=None):
    return {"r": r, "name": name, "pos": pos, "team": team, "tier": tier, "pr": r,
            "sleeperId": sleeper_id or str(1000 + r)}


BOARD = [player(1, "Jahmyr Gibbs"), player(2, "Breece Hall", team="NYJ"),
         player(3, "Christian Kirk", pos="WR", team="SF"),
         player(4, "Kenneth Walker III", team="SEA"),
         player(5, "Trevor Lawrence", pos="QB", team="JAX"),
         player(6, "Puka Nacua", pos="WR", team="LAR"),
         player(7, "Michael Pittman Jr.", pos="WR", team="IND"),
         player(8, "Detroit Lions", pos="DEF", team="DET")]


class TestWireMatching(unittest.TestCase):
    def setUp(self):
        self.idx = N.board_index(BOARD)

    def hits(self, title):
        return [p["name"] for p in N.match_players(title, self.idx)]

    # ---- the measured false positives. Each of these ONCE produced a wire item. ----

    def test_hall_of_fame_is_not_breece_hall(self):
        for title in ("Hall of Famer Larry Fitzgerald explains why he will never retire",
                      "Hall of Fame locks: Active NFL players bound for enshrinement",
                      "2026 Hall of Fame Game: Carson Beck heads top 10 players to watch"):
            self.assertEqual(self.hits(title), [], title)

    def test_kirk_cousins_is_not_christian_kirk(self):
        self.assertEqual(
            self.hits("Kirk Cousins, Maxx Crosby held out of practice after altercation"), [])

    def test_herschel_walker_is_not_kenneth_walker(self):
        self.assertEqual(self.hits("Adam Vinatieri once chased down Herschel Walker"), [])

    def test_malachi_lawrence_is_not_trevor_lawrence(self):
        self.assertEqual(
            self.hits("Amongst an exciting rookie class, don't forget about Malachi Lawrence"), [])

    def test_a_defense_never_matches_ordinary_football_prose(self):
        """A DEF's name is a city and a mascot, both ordinary words: the naive version matched a
        Jahmyr Gibbs story to `Detroit Lions` because the article said "Lions"."""
        self.assertNotIn("Detroit Lions", self.hits("Lions expect big things from their backs"))
        self.assertNotIn("Detroit Lions", self.hits("Detroit Lions sign a kicker"))

    # ---- the positive controls. Without these, "match nothing" would pass every test above. ----

    def test_a_full_name_in_a_headline_matches(self):
        self.assertEqual(self.hits("Rams' Puka Nacua next in line to get paid"), ["Puka Nacua"])
        self.assertEqual(self.hits("Jahmyr Gibbs becomes highest-paid running back"),
                         ["Jahmyr Gibbs"])

    def test_a_suffixed_board_name_matches_the_headline_without_the_suffix(self):
        """Headlines write "Michael Pittman", the board says "Michael Pittman Jr." The shared
        normalizer folds the suffix, so both resolve."""
        self.assertEqual(self.hits("Michael Pittman ruled out for Sunday"),
                         ["Michael Pittman Jr."])

    def test_two_players_in_one_headline_both_match(self):
        got = self.hits("Jahmyr Gibbs and Puka Nacua headline the extension class")
        self.assertEqual(sorted(got), ["Jahmyr Gibbs", "Puka Nacua"])

    def test_a_surname_alone_is_deliberately_missed(self):
        """The stated trade-off, pinned so it is a decision and not a surprise: a miss costs one
        item; a false positive tells you a player you are about to draft is hurt when he is not."""
        self.assertEqual(self.hits("Nacua ruled out with a knee injury"), [])


class TestClassification(unittest.TestCase):
    def test_about_is_not_out(self):
        """`out ` sits inside `about `, which tagged "Josh Allen still feels guilty about Sean
        McDermott's firing" as an injury. Whole words only."""
        self.assertEqual(
            N.classify("Josh Allen still feels guilty about Sean McDermott's firing"), "watch")

    def test_a_real_injury_is_bad(self):
        self.assertEqual(N.classify("Zay Flowers day-to-day with a quad contusion"), "bad")
        self.assertEqual(N.classify("Luther Burden: Exits practice with apparent injury"), "bad")

    def test_good_news_is_good(self):
        self.assertEqual(N.classify("Colts signing Jonathan Taylor to an extension"), "good")

    def test_everything_else_is_watch(self):
        self.assertEqual(N.classify("Dak Prescott has been the offensive star in camp"), "watch")


class InboxCase(unittest.TestCase):
    """Every test here writes its own inbox. The real one is gitignored and rewritten hourly, so a
    suite that reads it passes only on the machine the mule runs on."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.addCleanup(setattr, N, "INBOX", N.INBOX)
        N.INBOX = self.tmp

    def write(self, name, text):
        with open(os.path.join(self.tmp, name), "w", encoding="utf-8") as f:
            f.write(text)

    def write_json(self, name, obj):
        self.write(name, json.dumps(obj))


class TestWireGrouping(InboxCase):
    def test_five_outlets_on_one_story_become_one_item(self):
        """One night's feeds carried five Jahmyr Gibbs headlines and four about one quad. A brief
        that prints all of them is a brief nobody finishes."""
        self.write("rss_pft.xml", feed("Jahmyr Gibbs signs an extension",
                                       "Jahmyr Gibbs is now the highest-paid back"))
        self.write("rss_cbs_nfl.xml", feed("Jahmyr Gibbs gets paid, per report"))
        items = N.wire(BOARD)
        self.assertEqual(len(items), 1, items)
        self.assertEqual(items[0]["also"], 2)
        self.assertEqual(sorted(items[0]["outlets"]), ["cbs", "pft"])

    def test_the_worst_news_leads_the_group(self):
        self.write("rss_pft.xml", feed("Jahmyr Gibbs speaks to the media",
                                       "Jahmyr Gibbs exits practice with an injury"))
        self.assertEqual(N.wire(BOARD)[0]["kind"], "bad")

    def test_the_headline_that_leads_with_the_player_represents_the_group(self):
        """Length alone picked a roundup -- "NFL news, live updates: Titans make Peter Skoronski
        NFL's highest-paid guard; Jahmyr Gibbs..." -- over the story actually about him."""
        self.write("rss_pft.xml", feed(
            "Jahmyr Gibbs becomes the highest-paid running back in history",
            "NFL news roundup: several teams make moves at guard and tackle before Jahmyr Gibbs"))
        self.assertTrue(N.wire(BOARD)[0]["title"].startswith("Jahmyr Gibbs"))

    def test_bad_news_sorts_above_good(self):
        self.write("rss_pft.xml", feed("Jahmyr Gibbs signs an extension",
                                       "Puka Nacua exits practice with an injury"))
        kinds = [i["kind"] for i in N.wire(BOARD)]
        self.assertEqual(kinds, ["bad", "good"])

    def test_a_missing_feed_is_simply_absent(self):
        """A feed that failed validation is not in the inbox. The edition still publishes."""
        self.assertEqual(N.wire(BOARD), [])

    def test_a_corrupt_feed_does_not_take_the_edition_down(self):
        self.write("rss_pft.xml", "<rss><channel><item><title>truncated")
        self.write("rss_cbs_nfl.xml", feed("Puka Nacua gets paid"))
        self.assertEqual(len(N.wire(BOARD)), 1)

    def test_entity_encoded_titles_are_decoded_once(self):
        self.write("rss_pft.xml", feed("Puka Nacua tops the NFL&amp;#39;s earners"))
        self.assertIn("'", N.wire(BOARD)[0]["title"])


class TestTiles(InboxCase):
    BOARD_DOC = {"meta": {"updated": "2026-08-08"}, "players": BOARD}

    def draft(self, **over):
        d = {"draft_id": "1", "status": "pre_draft", "start_time": None, "draft_order": None,
             "settings": {"teams": 8, "rounds": 16}}
        d.update(over)
        return d

    def test_a_null_start_time_renders_a_dash_and_an_asterisk(self):
        """~Aug 29 is a handshake between eight people and it can move EARLIER. Printing a
        countdown to it would be the paper asserting a date the draft object does not carry."""
        tiles, note = N.tile_values(self.draft(), [{"display_name": "a"}], self.BOARD_DOC,
                                    _dt.datetime(2026, 8, 8))
        self.assertEqual(tiles[1]["num"], "—")
        self.assertIn("*", tiles[1]["lbl"])
        self.assertIn("null", note)

    def test_a_real_start_time_renders_a_real_countdown_with_no_asterisk(self):
        """And it switches on its own the night Sleeper populates it -- no code edit."""
        when = int(_dt.datetime(2026, 8, 29).timestamp() * 1000)
        tiles, note = N.tile_values(self.draft(start_time=when), [], self.BOARD_DOC,
                                    _dt.datetime(2026, 8, 8))
        self.assertEqual(tiles[1]["num"], "21")
        self.assertNotIn("*", tiles[1]["lbl"])
        self.assertIsNone(note)

    def test_a_null_draft_order_renders_a_dash_never_a_guess(self):
        tiles, _ = N.tile_values(self.draft(), [], self.BOARD_DOC, _dt.datetime(2026, 8, 8))
        self.assertEqual(tiles[2]["num"], "—")

    def test_the_slot_comes_from_draft_order_and_nothing_else(self):
        """NEVER slot_to_roster_id -- it is an identity map and there are three unrelated threes
        in this league."""
        d = self.draft(draft_order={N.BRIGGSY_USER_ID: 6}, slot_to_roster_id={1: 1, 6: 6})
        tiles, _ = N.tile_values(d, [], self.BOARD_DOC, _dt.datetime(2026, 8, 8))
        self.assertEqual(tiles[2]["num"], "6")

    def test_the_board_date_is_shortened_to_fit_its_tile(self):
        """The tile is a 26px number in a quarter-width box; the ISO date wraps onto two lines and
        breaks the row. Measured in a browser, not guessed."""
        tiles, _ = N.tile_values(self.draft(), [], self.BOARD_DOC, _dt.datetime(2026, 8, 8))
        self.assertEqual(tiles[3]["num"], "Aug 8")

    def test_seats_come_from_the_users_list(self):
        users = [{"display_name": f"m{i}"} for i in range(6)]
        tiles, _ = N.tile_values(self.draft(), users, self.BOARD_DOC, _dt.datetime(2026, 8, 8))
        self.assertEqual(tiles[0]["num"], "6/8")


class TestMarketWatch(InboxCase):
    def test_trending_ids_join_the_board_on_the_frozen_sleeper_id(self):
        """No network. U6 stamped sleeperId onto every row, which retired the plan's 48
        per-player lookups -- a nightly job that touches the network fails on a bad night."""
        self.write_json("sleeper_trending_add.json",
                        [{"player_id": "1001", "count": 900}, {"player_id": "999999", "count": 5}])
        self.write_json("sleeper_trending_drop.json", [])
        m = N.market_watch(BOARD)
        self.assertEqual([r["name"] for r in m["adds"]["rows"]], ["Jahmyr Gibbs"])
        self.assertEqual(m["adds"]["total"], 2)

    def test_a_night_with_no_material_moves_still_reports_the_totals(self):
        """Zero material rows must render the one-line dismissal, not an empty section -- so the
        template needs the totals even when nothing matched."""
        self.write_json("sleeper_trending_add.json", [{"player_id": "999999", "count": 5}])
        self.write_json("sleeper_trending_drop.json", [{"player_id": "888888", "count": 5}])
        m = N.market_watch(BOARD)
        self.assertEqual(m["adds"]["rows"], [])
        self.assertEqual((m["adds"]["total"], m["drops"]["total"]), (1, 1))

    def test_missing_trending_cargo_degrades_to_nothing_rather_than_raising(self):
        m = N.market_watch(BOARD)
        self.assertEqual(m["adds"]["rows"], [])
        self.assertEqual(m["adds"]["total"], 0)


class TestTheDesignIsCarriedNotCopied(unittest.TestCase):
    def test_the_style_block_is_byte_identical_to_the_frozen_design(self):
        """THE DESIGN IS THE ASSET. It is extracted from newsletter-template.html at build time,
        never copied into the Jinja template, so there is no second copy to drift."""
        css, script = N.frozen_parts()
        ctx = N.build_context()
        self.assertEqual(N.style_hash(ctx["style"]), N.style_hash(css))
        self.assertEqual(ctx["theme_script"], script)

    def test_the_rendered_edition_still_carries_that_exact_css(self):
        """The call site: extracting it proves nothing if the template drops it on the floor."""
        css, _ = N.frozen_parts()
        html = N.render(N.build_context())
        found = N.STYLE_RE.search(html)
        self.assertIsNotNone(found, "the rendered edition has no <style> block at all")
        self.assertEqual(N.style_hash(found.group(1)), N.style_hash(css))

    def test_the_frozen_template_is_never_written_to(self):
        """It is the reference. The builder reads it and writes elsewhere."""
        with open(N.FROZEN, encoding="utf-8") as f:
            self.assertIn("preview-banner", f.read(),
                          "the frozen design was modified; it must stay as-shipped")

    def test_the_preview_banner_element_is_gone_from_the_edition(self):
        """The BANNER is deleted; its now-unused CSS rule stays, because the alternative is
        editing the carried stylesheet and losing byte-identity with the design."""
        html = N.render(N.build_context())
        self.assertNotIn('class="preview-banner"', html)
        self.assertNotIn("PREVIEW EDITION", html)

    def test_the_dead_archive_path_is_fixed(self):
        html = N.render(N.build_context())
        self.assertNotIn("newsletter_archive", html)
        self.assertIn("newsletter/archive/", html)

    def test_the_edition_carries_no_exclamation_marks(self):
        """The voice: the joke is the flatness. Feed headlines are somebody else's punctuation,
        so only the copy this project writes is checked."""
        html = N.render(dict(N.build_context(), wire=[]))
        body = html.split("</style>", 1)[1]
        self.assertNotIn("!", body.replace("&#33;", ""))


class TestEditionNumber(unittest.TestCase):
    """The number is derived from disk with no state file -- and it is IDEMPOTENT for a day.

    `count of files + 1` was the first version. It is self-healing against a lost state file and
    wrong about the case that actually happens: a second build on the same day, which U12's
    installer performs deliberately when it force-runs the job to verify the registration.
    """

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def issue(self, name):
        with open(os.path.join(self.tmp, name), "w", encoding="utf-8") as f:
            f.write("x")

    def test_an_empty_archive_starts_at_one(self):
        self.assertEqual(N.edition_number("2026-08-08", self.tmp), 1)

    def test_it_is_one_past_the_number_of_days_already_published(self):
        for d in ("06", "07", "08"):
            self.issue(f"2026-08-{d}-edition-{int(d) - 5}.html")
        self.assertEqual(N.edition_number("2026-08-09", self.tmp), 4)

    def test_non_html_files_do_not_count(self):
        self.issue(".gitkeep")
        self.assertEqual(N.edition_number("2026-08-08", self.tmp), 1)

    def test_rebuilding_the_same_day_republishes_rather_than_advancing(self):
        """THE regression this function exists for. Two builds on 2026-08-08 must both be #1,
        so the second overwrites the first file instead of writing a same-dated #2."""
        self.issue("2026-08-08-edition-1.html")
        self.assertEqual(N.edition_number("2026-08-08", self.tmp), 1)
        self.assertEqual(N.edition_number("2026-08-08", self.tmp), 1)

    def test_a_rebuild_does_not_advance_later_editions_either(self):
        """The old bug was not just a duplicate file -- it was a permanent +1 to every edition
        after it, because the count included the phantom."""
        self.issue("2026-08-06-edition-1.html")
        self.issue("2026-08-07-edition-2.html")
        self.assertEqual(N.edition_number("2026-08-07", self.tmp), 2)   # republish
        self.assertEqual(N.edition_number("2026-08-08", self.tmp), 3)   # tomorrow is unmoved

    def test_a_pre_existing_same_day_duplicate_collapses_onto_the_lowest_and_says_so(self):
        """Cleaning up somebody else's mess silently is how a project loses a file it wanted.
        Republish the first one, leave the strays, and NAME them."""
        self.issue("2026-08-08-edition-1.html")
        self.issue("2026-08-08-edition-2.html")
        said = []
        self.assertEqual(N.edition_number("2026-08-08", self.tmp, warn=said.append), 1)
        self.assertEqual(len(said), 1)
        self.assertIn("2 back issues", said[0])
        self.assertIn("#1, #2", said[0])

    def test_a_clean_day_warns_about_nothing(self):
        """A warning that fires on the happy path is a warning nobody reads."""
        self.issue("2026-08-07-edition-1.html")
        said = []
        N.edition_number("2026-08-08", self.tmp, warn=said.append)
        self.assertEqual(said, [])

    def test_an_undated_stray_counts_once_and_does_not_crash(self):
        self.issue("notes.html")
        self.assertEqual(N.edition_number("2026-08-08", self.tmp), 2)


class TestEditionNumberIsWiredToTheBuild(InboxCase):
    """Insight 013: every guard tested as a FUNCTION and never at its CALL SITE. The idempotent
    number is worthless if `build_context` still asks for it without today's date."""

    def test_build_context_reuses_todays_number_instead_of_advancing(self):
        archive = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, archive, True)
        now = _dt.datetime(2026, 8, 8, 19, 0)
        with open(os.path.join(archive, "2026-08-06-edition-1.html"), "w", encoding="utf-8") as f:
            f.write("x")
        first = N.build_context(now=now, archive=archive)["edition_no"]
        self.assertEqual(first, 2)
        # Publish it, the way main() does, then rebuild the same evening.
        with open(os.path.join(archive, f"2026-08-08-edition-{first}.html"), "w",
                  encoding="utf-8") as f:
            f.write("x")
        self.assertEqual(N.build_context(now=now, archive=archive)["edition_no"], 2)


class TestItPublishesWhateverArrived(InboxCase):
    def test_a_bom_is_read_rather_than_crashing_the_build(self):
        """mule_status.json is the one file in this project written with a BOM."""
        with open(os.path.join(self.tmp, "mule_status.json"), "w", encoding="utf-8-sig") as f:
            json.dump({"run_at": "2026-08-08 16:29:02", "sources": {"a": "ok"}}, f)
        self.assertEqual(N.mule_status().get("run_at"), "2026-08-08 16:29:02")

    def test_a_missing_status_file_is_an_empty_dict_not_a_crash(self):
        self.assertEqual(N.mule_status(), {})

    def test_an_edition_builds_with_an_utterly_empty_inbox(self):
        """The whole design: it publishes with whatever arrived, and says what did not."""
        ctx = N.build_context()
        html = N.render(ctx)
        self.assertIn("THE NIGHTLY", html)
        self.assertTrue(ctx["gaps"], "an empty inbox produced no reported gaps")

    def test_every_gap_is_named_in_the_edition(self):
        """A newsletter that quietly drops a section teaches you to trust a page that is lying."""
        ctx = N.build_context()
        html = N.render(ctx)
        for gap in ctx["gaps"]:
            self.assertIn(gap.split("(")[0].strip()[:24], html)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""U11 -- The Nightly Feud, the half that has never run.

    python scripts/build_newsletter.py              # build today's edition
    python scripts/build_newsletter.py --dry-run    # render and report, write nothing

The mule has hauled cargo hourly for days into a consumer that did not exist. This is the
consumer. It reads `newsletter/data/inbox/`, the board, and the frozen design, and writes
`newsletter/family-feud-newsletter.html` plus a dated back issue in `newsletter/archive/`, and
copies that back issue, same file name, into Google Drive for desktop's folder (`DRIVE_DIR`).
Exit 0 = the edition was written and Drive for desktop took the copy (the upload to Google is
Drive's own job, done in the background, and is not checked here); exit 3 = the edition was
written but a Drive copy was not. Every run also copies any earlier back issue Drive is missing,
so one bad night is repaired by the next good run.

THE HARD RULE, AND EVERYTHING ELSE FOLLOWS FROM IT: **deterministic code owns every fact and
every number; prose owns only the connective tissue.** No figure in the output is written by a
language model, and no figure is typed into the template. If a number cannot be derived from
cargo, the edition says so in words rather than estimating -- `Days to Draft` renders as an
asterisked dash today because `start_time` is null, and it will start rendering a real
countdown the night that changes, with no code edit.

THE DESIGN IS THE ASSET AND IT IS NOT COPIED. `newsletter-template.html` stays frozen in git as
the reference. The `<style>` block and the theme-toggle `<script>` are EXTRACTED from it at build
time and injected, so the edition cannot drift from the design and there is no second copy of the
CSS to maintain. A test asserts the rendered style block hashes identically to the frozen one.

IN SEASON (from the night `sleeper_draft.json` reads `status: "complete"`) the paper is built
around our roster instead: this week's matchup with start/sit calls, the roster's injuries, waiver
pickups, standings. main() then reaches the network ONCE, through `haul()`: scripts/season_cargo.py
run as a child process with a clock on it, writing one snapshot the pure functions in
scripts/season_edition.py read. A failed pull never costs the paper -- it prints from the kept
snapshot and says how old it is. Decisions: docs/plans/2026-11-09-001-feat-in-season-edition-plan.md.

WHY THE DRAFT EDITION MAKES NO NETWORK CALLS. The plan had Market Watch resolving trending player ids through
Sleeper's per-player endpoint, 48 calls a night, because at the time nothing on the board carried
a Sleeper id. U6 changed that: every row now has `sleeperId`, so trending ids join straight to the
board. Non-board trending players need no name, because they are noise by the section's own rule
-- "material moves get named; noise gets ignored." A nightly job that touches the network is a
nightly job that fails on a bad night, so it does not.
"""
import argparse
import datetime as _dt
import email.utils as _eut
import glob
import hashlib
import html as _html
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KIT = os.path.join(ROOT, "draft-kit")
NEWS = os.path.join(ROOT, "newsletter")
INBOX = os.path.join(NEWS, "data", "inbox")
CARGO_ARCHIVE = os.path.join(NEWS, "data", "archive")
ARCHIVE = os.path.join(NEWS, "archive")
FROZEN = os.path.join(NEWS, "newsletter-template.html")
TEMPLATE_DIR = os.path.join(NEWS, "templates")
LIVE = os.path.join(NEWS, "family-feud-newsletter.html")
BOARD = os.path.join(KIT, "players_data.json")
ALERTS = os.path.join(NEWS, "data", "state", "DRAFT_ALERTS.md")

#: Where each dated back issue is ALSO copied, same file name -- Briggsy's Google Drive, so the
#: paper can be read off this laptop. The one absolute path in the build, and it has to be: Google
#: Drive for desktop mounts the account here, outside the project. `copy_to_drive` creates only the
#: last folder and refuses if `G:\My Drive` itself is absent, so a different disk that happens to
#: be lettered G: is never written to.
DRIVE_DIR = r"G:\My Drive\Nightly Feud"

#: The first night the Drive copy existed. `catch_up_drive` repairs misses from this date on and
#: leaves the 87 earlier back issues alone -- putting those in Drive is Briggsy's call, not a
#: side effect of a repair.
DRIVE_SINCE = "2026-11-09"

#: The in-season paper's one snapshot (rosters, matchups, three-site projections, kickoffs) and the
#: script that pulls it. See `haul` and scripts/season_cargo.py.
SEASON_CARGO = os.path.join(INBOX, "season_cargo.json")
SEASON_HAULER = os.path.join(HERE, "season_cargo.py")
#: Seconds the pull may take before the build gives up on it and prints from the kept snapshot.
#: Measured 2026-11-09: 46 s. The scheduled task is killed at 10 minutes and a killed task writes no
#: edition, so the pull is never allowed to be the thing that runs out the clock.
HAUL_TIMEOUT = 300

sys.path.insert(0, HERE)
sys.path.insert(0, KIT)

from normalize import norm  # noqa: E402

#: Read the slot from draft_order keyed by this id and NOTHING else -- `slot_to_roster_id` is an
#: identity map and hands back a plausible wrong seat. Same id the engine and watcher use.
BRIGGSY_USER_ID = "1390750540631150592"

#: Generational suffixes. A headline says "Harrison", never "Jr.".
NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


# ------------------------------------------------------------------ reading what the mule left


def load(name, encoding="utf-8"):
    """(data, problem). Never raises: a newsletter that crashes on one bad feed is a newsletter
    that does not publish, and the whole design is that it publishes with whatever arrived."""
    path = os.path.join(INBOX, name)
    if not os.path.exists(path):
        return None, f"{name} is not in the inbox"
    try:
        with open(path, encoding=encoding) as f:
            return json.load(f), None
    except (json.JSONDecodeError, ValueError) as e:
        return None, f"{name} is not valid JSON ({e})"
    except OSError as e:
        return None, f"{name} could not be read ({e})"


def mule_status():
    # utf-8-sig: PowerShell 5.1 wrote this one with a BOM. It is the single file in this project
    # where the blanket utf-8 rule is wrong.
    return load("mule_status.json", encoding="utf-8-sig")[0] or {}


def feed_items(name):
    """(title, link, when) per <item>, or [] -- a feed that failed validation simply is not there.

    `when` is a LOCAL-TIME display string ("Aug 23, 9:41 PM") or "" -- parsed from RSS `pubDate`
    (RFC 2822) or Atom `published`/`updated` (ISO 8601), converted from the feed's own zone.
    Display-formatted HERE because every consumer is a rendered surface, and "" on a parse
    failure keeps the headline: a timestamp is garnish, and dropping news over garnish would
    invert the section's whole rule (Briggsy's ask, 2026-08-24: stamp the headlines)."""
    path = os.path.join(INBOX, name)
    if not os.path.exists(path):
        return []
    try:
        from defusedxml.ElementTree import parse as _parse
        root = _parse(path).getroot()
    except Exception:
        return []
    out = []
    for node in list(root.iter("item")) + list(
            root.iter("{http://www.w3.org/2005/Atom}entry")):
        # Feeds ship entity-encoded titles (`NFL&#39;s`). Decode once, here, so nothing downstream
        # has to think about it -- and so Jinja re-escapes exactly once on the way out rather than
        # printing the raw entity at the reader.
        title = _html.unescape(node.findtext("title") or "").strip()
        link = (node.findtext("link") or "").strip()
        when = _item_when(node)
        if title:
            out.append((title, link, when))
    return out


def _item_when(node):
    """The item's publish moment as a local display string, or ''."""
    raw = (node.findtext("pubDate")
           or node.findtext("{http://www.w3.org/2005/Atom}published")
           or node.findtext("{http://www.w3.org/2005/Atom}updated") or "").strip()
    if not raw:
        return ""
    dt = None
    try:
        dt = _eut.parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        try:
            dt = _dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return ""
    if dt.tzinfo is not None:
        dt = dt.astimezone()          # the reader's clock, not the feed's
    return f"{dt:%b} {dt.day}, {dt.strftime('%I:%M %p').lstrip('0')}"


# ------------------------------------------------------------------ matching the wire to the board


def name_keys(name):
    """(first token, surname token) with generational suffixes stripped."""
    toks = [t for t in str(name or "").split() if t]
    if not toks:
        return None, None
    body = list(toks)
    while len(body) > 1 and body[-1].lower().strip(".,") in NAME_SUFFIXES:
        body.pop()
    return body[0], body[-1]


#: Longest board name in words. `norm` folds a suffix away, so four covers every row.
MAX_NAME_WORDS = 4


def board_index(players):
    """normalized FULL name -> [rows]. DEF is EXCLUDED, deliberately.

    A defense's name is a city and a mascot, and both are ordinary words in football prose: the
    naive version matched a Jahmyr Gibbs story to `Detroit Lions` because the article said
    "Lions". A DEF has no injury news worth a Wire item anyway.
    """
    idx = {}
    for p in players:
        if p.get("pos") == "DEF":
            continue
        key = norm(p.get("name") or "")
        if key:
            idx.setdefault(key, []).append(p)
    return idx


def match_players(title, idx, max_words=MAX_NAME_WORDS):
    """Board rows this headline is about. THE FULL NAME, CONTIGUOUS, OR NOTHING.

    SURNAME MATCHING WAS TRIED FIRST AND IT WAS A DISASTER. Measured against one night's real
    feeds it produced **10 false positives out of 11 items**: "Hall of Fame" matched Breece Hall
    five separate times, "Kirk Cousins" matched Christian Kirk, "Herschel Walker" matched Kenneth
    Walker III, and "Malachi Lawrence" matched Trevor Lawrence. Football surnames are ordinary
    English words, and a wire that reports a healthy player as injured is worse than a wire that
    reports nothing.

    So: normalise each WORD of the headline separately, then look for a contiguous run of them
    whose concatenation equals a board name. Word boundaries survive -- `norm` alone strips
    whitespace, so `norm(title)` is one long string in which "hall of famer" happily contains a
    "hall". Splitting first is what makes `hall`+`of` = `hallof`, which matches nobody.

    The normaliser is the SHARED one (KTD-3), so this agrees with the engine and the gate about
    what a name is: diminutives, punctuation and generational suffixes are already folded.

    THE TRADE-OFF, STATED: a headline that writes only "Nacua ruled out" is missed. That is
    deliberate. A miss costs one item in a nightly paper; a false positive tells you a player you
    are about to draft is hurt when he is not.
    """
    words = [w for w in (norm(w) for w in str(title or "").split()) if w]
    hits, seen = [], set()
    for i in range(len(words)):
        joined = ""
        for k in range(min(max_words, len(words) - i)):
            joined += words[i + k]
            for row in idx.get(joined, []):
                if row["r"] not in seen:
                    seen.add(row["r"])
                    hits.append(row)
    return hits


# ------------------------------------------------------------------ the sections


def tile_values(draft, users, board, now):
    """The four masthead tiles. Two have cargo; two do not, and say so rather than estimating."""
    settings = (draft or {}).get("settings") or {}
    teams = int(settings.get("teams") or 0)
    filled = len(users) if isinstance(users, list) else 0

    seats = f"{filled}/{teams}" if teams else "—"

    start = (draft or {}).get("start_time")
    if start:
        when = _dt.datetime.fromtimestamp(int(start) / 1000)
        days = (when.date() - now.date()).days
        draft_tile, draft_note = (str(days) if days >= 0 else "0"), None
    else:
        # NOT an estimate. ~Aug 29 is a handshake between eight people and it can move EARLIER;
        # printing a countdown to it would be the paper asserting a date the draft does not carry.
        draft_tile, draft_note = "—", "start_time is still null — no date exists to count toward"

    order = (draft or {}).get("draft_order")
    slot = order.get(BRIGGSY_USER_ID) if isinstance(order, dict) else None
    slot_tile = str(slot) if slot else "—"

    # The tile is a 26px number in a quarter-width box; ISO dates wrap and break the row --
    # measured in the browser, not guessed. The design's own example reads "Aug 5", so match it.
    # 🚨 THE SOURCE IS `meta.rankings.synthesized`, NEVER `meta.updated`. The tile read `updated`
    # until 2026-08-24 and told Briggsy "Aug 9" across two re-ranks (08-14, 08-21) -- `updated`
    # is INPUT freshness and the runbook already names this exact confusion ("meta.updated is
    # input freshness, not rank staleness"). A board-version tile that does not move on a re-rank
    # is the refresh ceremony bug on a surface he reads at breakfast.
    raw = ((board.get("meta") or {}).get("rankings") or {}).get("synthesized") \
        or (board.get("meta") or {}).get("updated")
    try:
        stamp = _dt.date.fromisoformat(str(raw))
        board_tile = f"{stamp:%b} {stamp.day}"
    except (TypeError, ValueError):
        board_tile = str(raw)

    return ([{"num": seats, "lbl": "Seats Filled"},
             {"num": draft_tile, "lbl": "Days to Draft" + ("*" if draft_note else "")},
             {"num": slot_tile, "lbl": "Your Slot"},
             {"num": board_tile, "lbl": "Board Version"}],
            draft_note)


def league_desk(draft, users, board):
    managers = sorted((u.get("display_name") or "?") for u in users) if isinstance(users, list) \
        else []
    settings = (draft or {}).get("settings") or {}
    teams = int(settings.get("teams") or 0)
    open_seats = max(0, teams - len(managers))
    status = (draft or {}).get("status") or "unknown"
    return {
        "managers": managers,
        "teams": teams,
        "open_seats": open_seats,
        "status": status,
        "scheduled": bool((draft or {}).get("start_time")),
        "order_posted": isinstance((draft or {}).get("draft_order"), dict)
        and bool((draft or {}).get("draft_order")),
    }


#: How many alert entries the desk carries. The file is append-only and read late, so the most
#: recent few are what matter; older ones stay on disk and in git.
ALERT_LIMIT = 3

_ALERT_HEAD = re.compile(r"^##\s+(?P<title>.+?)\s+[—-]\s+(?P<when>\d{4}-\d{2}-\d{2}[^\n]*)$")


def draft_alerts(path=ALERTS, limit=ALERT_LIMIT):
    """The watcher's alerts, newest first, so the STARTING GUN reaches a surface Briggsy reads.

    WHY THIS EXISTS. `scripts/watch_draft_state.py` is the only thing that notices the draft date
    appearing or MOVING, and until 2026-08-14 it wrote exclusively to a gitignored markdown file
    that nothing surfaced -- push and email are broken account-wide, so the delivery chain ended at
    a file nobody opens. The date itself had a second channel (the Days to Draft tile flips on its
    own), but "the date MOVED EARLIER", "your slot moved" and "the draft was replaced" had none,
    and moving earlier is the scenario the watcher exists for.

    Reading a local file keeps the no-network property: this is the watcher's output, already on
    disk, not a fetch. Missing file is empty, never an exception -- a clean clone has no alerts and
    a newsletter that dies on that is worse than one with a quiet desk.
    """
    try:
        with open(path, encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return []

    out, cur = [], None
    for line in text.splitlines():
        m = _ALERT_HEAD.match(line.strip())
        if m:
            cur = {"title": m.group("title").strip(), "when": m.group("when").strip(), "body": []}
            out.append(cur)
        elif cur is not None:
            s = line.strip()
            # `---` rules and the italic cargo-age footer are furniture, not content.
            if s and not s.startswith("---") and not s.startswith("_"):
                cur["body"].append(s)
    for a in out:
        a["body"] = " ".join(a["body"])[:400]

    # AN APPEND-ONLY ALARM NEVER SOUNDS THE ALL-CLEAR, so a healed "CARGO IS STALE" read as a
    # live emergency for days (Briggsy asked "is this still accurate?" on 2026-08-24 about an
    # alert that had healed within two minutes of firing on 08-21). His call, same day: a
    # recovered alarm does not belong in the paper at all -- this desk is for real changes, and
    # "the mule hiccuped and healed itself" is not one. A STILL-stale cargo keeps its alert.
    # (First fix tagged them RECOVERED instead of dropping them; he overruled it within the hour.)
    # 150 min is the watcher's own staleness threshold, not a new rule. The file keeps every
    # entry either way -- this filters the PAPER, never the history.
    def _still_news(a):
        if "CARGO IS STALE" not in a["title"].upper():
            return True
        age = _cargo_age_minutes()
        return age is None or age > 150
    out = [a for a in out if _still_news(a)]
    return list(reversed(out))[:limit]


def _cargo_age_minutes(path=None):
    """Minutes since the mule last wrote sleeper_draft.json, or None. mtime, same as the watcher:
    per-file, because one failed source leaves yesterday's file under a fresh run_at."""
    try:
        mt = os.path.getmtime(path or os.path.join(INBOX, "sleeper_draft.json"))
        return max(0.0, (_dt.datetime.now().timestamp() - mt) / 60)
    except OSError:
        return None


#: Feeds in the order the wire reads them. Rotowire is the most fantasy-dense of the five.
WIRE_FEEDS = ("rss_rotowire.xml", "rss_pft.xml", "rss_espn_nfl.xml",
              "rss_cbs_nfl.xml", "rss_yahoo_nfl.xml")

#: How a headline gets FLAGGED once it is known to name a board player. Matched on WHOLE WORDS:
#: the substring version tagged "Josh Allen still feels guilty about Sean McDermott's firing" as
#: an injury, because `out ` sits inside `about `. A wire that cries injury is a wire nobody reads.
BAD_WORDS = frozenset((
    "injury", "injured", "hurt", "out", "questionable", "doubtful", "ir", "surgery", "strain",
    "sprain", "contusion", "concussion", "suspended", "suspension", "miss", "misses", "missing",
    "setback", "carted", "limps", "exits", "bruise"))
GOOD_WORDS = frozenset((
    "returns", "return", "cleared", "activated", "signs", "signing", "extension", "starter",
    "breakout", "impresses", "promoted", "healthy"))

_WORD_RE = re.compile(r"[a-z0-9']+")


def classify(title):
    """bad / good / watch, on whole words only."""
    words = set(_WORD_RE.findall(str(title or "").lower()))
    if words & BAD_WORDS:
        return "bad"
    if words & GOOD_WORDS:
        return "good"
    return "watch"


#: Worst first, so a cluster of headlines about one player is represented by its most serious.
_SEVERITY = {"bad": 2, "good": 1, "watch": 0}


def _lead_rank(item):
    """Which headline should REPRESENT a group. Higher wins.

    Severity first. Then how early the player is named: a headline that opens with him is about
    him, while one that reaches him in clause four is a roundup that happens to mention him.
    Length alone picked "NFL news, live updates: Titans make Peter Skoronski..." over "Jahmyr
    Gibbs becomes highest-paid running back in history" -- the longer headline, and the wrong one.
    """
    title = item["title"].lower()
    firsts = [title.find(p["name"].split()[-1].lower()) for p in item["players"]]
    pos = min([f for f in firsts if f >= 0] or [len(title)])
    return (_SEVERITY[item["kind"]], -pos, len(item["title"]))


def _board_person(p):
    return {"name": p["name"], "pos": p["pos"], "team": p["team"], "r": p["r"], "tier": p["tier"]}


def wire(players, describe=_board_person):
    """Headlines that name a board player, GROUPED BY WHO THEY ARE ABOUT.

    `players` is whoever the desk listens for: the draft board before the draft, and in season our
    roster plus the free agents who would start for us (season_edition.wire_people). Each needs a
    unique `r`, a `name`, a `pos`; `describe` says what an item carries about each one it names.

    One night's real feeds produced 31 matching headlines -- five of them about Jahmyr Gibbs's
    contract and four about Zay Flowers's quad, because five outlets carry the same story. A
    nightly brief that prints all 31 is a brief nobody finishes.

    So the unit of this section is the PLAYER (or the set of players a headline names together),
    not the headline: the most consequential item leads the group and the rest become a count of
    how many outlets carried it, which is itself a signal. Nothing is dropped for space --
    duplicates are collapsed, which is a different thing.
    """
    idx = board_index(players)
    groups, seen_titles = {}, set()
    for feed in WIRE_FEEDS:
        source = feed.replace("rss_", "").replace(".xml", "").replace("_nfl", "")
        for title, link, when in feed_items(feed):
            key = title.strip().lower()
            if key in seen_titles:
                continue
            hits = match_players(title, idx)
            if not hits:
                continue
            seen_titles.add(key)
            item = {"title": title, "link": link, "when": when,
                    "kind": classify(title), "source": source,
                    "players": [describe(p) for p in hits]}
            who = tuple(sorted(p["r"] for p in hits))
            g = groups.setdefault(who, {"lead": item, "sources": set(), "count": 0})
            g["sources"].add(source)
            g["count"] += 1
            if _lead_rank(item) > _lead_rank(g["lead"]):
                g["lead"] = item

    out = []
    for g in groups.values():
        item = dict(g["lead"])
        item["outlets"] = sorted(g["sources"])
        item["also"] = g["count"] - 1
        out.append(item)
    # Worst news first, then the best-covered story: the order a reader actually wants.
    out.sort(key=lambda i: (-_SEVERITY[i["kind"]], -len(i["outlets"]), i["players"][0]["r"]))
    return out


def market_watch(players):
    """Trending adds/drops, kept only where they touch our board.

    Joined on the frozen `sleeperId` U6 stamped onto every row, so this costs zero network calls.
    A trending player who is not on our 174 needs no name: the section's own rule is that material
    moves get named and noise gets ignored, and "not on our board" is the definition of noise here.
    """
    by_id = {str(p["sleeperId"]): p for p in players if p.get("sleeperId")}
    out = {}
    for label, fname in (("adds", "sleeper_trending_add.json"),
                         ("drops", "sleeper_trending_drop.json")):
        rows, _ = load(fname)
        hits, total = [], 0
        for entry in (rows or []):
            if not isinstance(entry, dict):
                continue
            total += 1
            p = by_id.get(str(entry.get("player_id")))
            if p:
                hits.append({"name": p["name"], "pos": p["pos"], "team": p["team"],
                             "r": p["r"], "tier": p["tier"],
                             "count": entry.get("count")})
        out[label] = {"rows": hits, "total": total}
    return out


BACK_ISSUE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-edition-(\d+)\.html$")
DATE_PREFIX_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def edition_number(date_slug, archive=ARCHIVE, warn=print):
    """The edition number, and it is IDEMPOTENT for a given day.

    The first version was `count of *.html + 1`. That is self-healing against a lost state
    file -- and wrong about the case that actually happens: building twice in one day. The
    second build saw one file, called itself #2, and wrote a SECOND back issue carrying the
    same date -- a paper claiming to be the next edition on the day the previous one
    published, and a permanent +1 to every edition after it.

    U12 turns that from an edge case into the normal one. `install-newsletter.ps1` force-runs
    the job to prove the registration works (presence is not health -- insight 007), so
    installing on a day the paper already built would mint the phantom itself.

    So: if today already has a back issue, REPUBLISH it -- same number, same filename,
    overwritten in place. Otherwise it is one past the number of DISTINCT DAYS published, not
    one past the file count, so a stray duplicate can never inflate every future edition.

    `date_slug` is first and has no default deliberately: a default would let a caller silently
    fall back to the counting bug, which is the failure this exists to remove.
    """
    published = {}
    for path in sorted(glob.glob(os.path.join(archive, "*.html"))):
        name = os.path.basename(path)
        m = BACK_ISSUE_RE.match(name)
        if m:
            published.setdefault(m.group(1), []).append(int(m.group(2)))
            continue
        # An issue this function did not name still occupies its day, and an undated stray
        # still occupies a slot -- key it by filename so it counts once and only once.
        d = DATE_PREFIX_RE.match(name)
        published.setdefault(d.group(1) if d else name, [])

    todays = sorted(published.get(date_slug) or [])
    if todays:
        if len(todays) > 1:
            warn(f"  [warn] {date_slug} already carries {len(todays)} back issues "
                 f"(#{', #'.join(str(n) for n in todays)}) -- republishing #{todays[0]} and "
                 f"leaving the others untouched. Delete the strays by hand if they are junk.")
        return todays[0]
    return len(published) + 1


# ------------------------------------------------------------------ the design


STYLE_RE = re.compile(r"<style>\n?(.*?)\n?</style>", re.S)
SCRIPT_RE = re.compile(r"<script>\n?(.*?)\n?</script>", re.S)


def frozen_parts(path=FROZEN):
    """The CSS and the theme toggle, lifted from the frozen design rather than copied into a
    template. The design is the asset; a second copy of it is a second thing to drift."""
    with open(path, encoding="utf-8") as f:
        html = f.read()
    style = STYLE_RE.search(html)
    script = SCRIPT_RE.search(html)
    if not style:
        raise RuntimeError(f"{path} has no <style> block -- the design cannot be carried forward")
    if not script:
        raise RuntimeError(f"{path} has no <script> block -- the theme toggle would be lost")
    return style.group(1), script.group(1)


def style_hash(css):
    return hashlib.sha256(css.encode("utf-8")).hexdigest()


# ------------------------------------------------------------------ build


def build_context(now=None, board_path=BOARD, archive=ARCHIVE):
    now = now or _dt.datetime.now()
    with open(board_path, encoding="utf-8") as f:
        board = json.load(f)
    players = board["players"]

    draft, draft_problem = load("sleeper_draft.json")
    users, users_problem = load("sleeper_users.json")
    tiles, draft_note = tile_values(draft, users, board, now)

    status = mule_status()
    failed = sorted(k for k, v in (status.get("sources") or {}).items()
                    if isinstance(v, str) and not v.lower().startswith("ok"))

    css, script = frozen_parts()
    market = market_watch(players)
    items = wire(players)
    date_slug = f"{now:%Y-%m-%d}"

    return {
        "edition_no": edition_number(date_slug, archive),
        "date_long": f"{now:%A, %B} {now.day}, {now.year}",
        "date_short": f"{now:%b} {now.day}, {now.year}",
        "date_slug": date_slug,
        "press_time": f"{now:%I:%M %p}".lstrip("0"),
        "tiles": tiles,
        "draft_note": draft_note,
        "league": league_desk(draft, users, board),
        "alerts": draft_alerts(),
        "wire": items,
        "market": market,
        "board_rows": len(players),
        "style": css,
        "theme_script": script,
        # Every reason today's paper might be thinner than usual, printed in the colophon. A
        # newsletter that quietly drops a section teaches you to trust a page that is lying.
        "gaps": [p for p in (draft_problem, users_problem) if p]
                + [f"the mule reported {k} as failed" for k in failed],
        "cargo_stamp": status.get("run_at"),
    }


# ------------------------------------------------------------------ the in-season edition


def season_mode():
    """True once the draft is over: the paper is then built around our roster, not the draft.

    The switch is a fact in cargo -- `sleeper_draft.json` reads `status: "complete"` -- not a flag
    somebody has to remember to flip. If that file cannot be read today the paper stays in the
    mode it can prove: in-season when a season snapshot is on disk, the draft edition otherwise.
    """
    draft, _problem = load("sleeper_draft.json")
    if isinstance(draft, dict) and draft.get("status"):
        return draft["status"] == "complete"
    return os.path.exists(SEASON_CARGO)


def haul():
    """Refresh the season snapshot. Returns None when it worked, else why it did not, in words.

    A CHILD PROCESS WITH A CLOCK ON IT, deliberately. The pull is a 16 MB download and a dozen web
    pages; a socket that stalls mid-body is not bounded by any per-call timeout, and this job is
    killed at ten minutes with nothing written. Whatever happens in there, the build goes on and
    prints from the snapshot already on disk, saying how old it is.

    main() reaches the network ONLY through this function, so tests replace it and never pull.
    """
    try:
        done = subprocess.run([sys.executable, SEASON_HAULER], capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=HAUL_TIMEOUT)
    except subprocess.TimeoutExpired:
        return f"the pull was stopped after {HAUL_TIMEOUT} seconds"
    except OSError as e:
        return f"the pull could not be started ({e})"
    lines = [ln.strip() for ln in (done.stdout or "").splitlines() if ln.strip()]
    last = lines[-1] if lines else ""
    if done.returncode == 0 and last.startswith("ok"):
        return None
    err = [ln.strip() for ln in (done.stderr or "").splitlines() if ln.strip()]
    return (last or (err[-1] if err else "") or f"the pull exited {done.returncode} and said nothing")[:300]


def load_season_cargo(path=None):
    """(snapshot, problem). Never raises, for the reason `load` never does."""
    path = path or SEASON_CARGO
    if not os.path.exists(path):
        return None, "today's rosters, matchups and projections have never been pulled"
    try:
        with open(path, encoding="utf-8") as f:
            snap = json.load(f)
    except (ValueError, OSError) as e:
        return None, f"the saved rosters and projections could not be read ({e})"
    if not isinstance(snap, dict) or not isinstance(snap.get("rosters"), list):
        return None, "the saved rosters and projections hold no rosters"
    return snap, None


def _mule_age_minutes(run_at, now):
    try:
        return (now - _dt.datetime.strptime(str(run_at), "%Y-%m-%d %H:%M:%S")).total_seconds() / 60
    except (TypeError, ValueError):
        return None


def build_season_context(now=None, archive=None, haul_problem=None, cargo_path=None):
    """The in-season edition's context. Same envelope as `build_context` (edition number, dates,
    the carried design, the colophon's gaps); the sections come from season_edition.build."""
    import season_edition
    now = now or _dt.datetime.now()
    archive = archive or ARCHIVE
    snap, problem = load_season_cargo(cargo_path)
    status = mule_status()
    failed = sorted(k for k, v in (status.get("sources") or {}).items()
                    if isinstance(v, str) and not v.lower().startswith("ok"))
    css, script = frozen_parts()
    date_slug = f"{now:%Y-%m-%d}"
    gaps = []
    if haul_problem:
        gaps.append(f"today's pull of rosters and projections failed ({haul_problem})")
    empty = {"rosters": [], "users": [], "weeks": {}}
    if problem:
        gaps.append(problem)
        season = season_edition.build(empty, now)
    else:
        add, p_add = load("sleeper_trending_add.json")
        drop, p_drop = load("sleeper_trending_drop.json")
        gaps += [p for p in (p_add, p_drop) if p]
        try:
            season = season_edition.build(
                snap, now, add if isinstance(add, list) else [], drop if isinstance(drop, list) else [],
                wire_fn=lambda people: wire(people, describe=season_edition.describe_person))
        except Exception as e:  # noqa: BLE001 -- THE EDITION IS ALWAYS WRITTEN. A file that is valid
            # JSON in the wrong shape (a null week, a kickoff that is not a time) raises somewhere
            # in there; that costs the roster sections, never the paper or its Drive copy.
            gaps.append(f"the saved rosters and projections could not be used ({type(e).__name__}: {e})")
            season = season_edition.build(empty, now)
    gaps += season.pop("gaps")
    gaps += [f"the mule reported {k} as failed" for k in failed]
    # The watcher's stale-cargo alarm used to reach the paper through its alerts. The alerts are a
    # draft-era desk and are gone from this edition; the one thing they still did is said here.
    age = _mule_age_minutes(status.get("run_at"), now)
    if age is not None and age > 150:
        gaps.append(f"the mule last ran {age:.0f} minutes ago, so the wire and the market are stale")
    return {
        "template": "season.html.j2",
        "edition_no": edition_number(date_slug, archive),
        "date_long": f"{now:%A, %B} {now.day}, {now.year}",
        "date_short": f"{now:%b} {now.day}, {now.year}",
        "date_slug": date_slug,
        "press_time": f"{now:%I:%M %p}".lstrip("0"),
        "season": season,
        "style": css,
        "theme_script": script,
        "gaps": gaps,
        "cargo_stamp": status.get("run_at"),
    }


def render(context, template_dir=TEMPLATE_DIR):
    from jinja2 import Environment, FileSystemLoader
    # autoescape=True, NOT select_autoescape(["html"]): that helper matches a template name ENDING
    # in .html, ours end in .html.j2, so until 2026-11-09 nothing was escaped and every feed
    # headline went into the page raw. The carried CSS and theme script are the two values that
    # must NOT be escaped; the templates mark exactly those two |safe.
    env = Environment(loader=FileSystemLoader(template_dir), autoescape=True,
                      trim_blocks=True, lstrip_blocks=True)
    # Jinja's own "capitalize" filter lowercases the rest of the sentence ("Cbs and espn did not arrive").
    env.filters["cap"] = lambda s: str(s)[:1].upper() + str(s)[1:]
    return env.get_template(context.get("template") or "edition.html.j2").render(**context)


def archive_cargo(slug, inbox=INBOX, dest_root=CARGO_ARCHIVE):
    """Keep the cargo an edition was built from, so a wrong claim can be traced to its source."""
    dest = os.path.join(dest_root, slug)
    os.makedirs(dest, exist_ok=True)
    copied = 0
    for fn in sorted(os.listdir(inbox)) if os.path.isdir(inbox) else []:
        if fn.startswith("."):
            continue
        try:
            shutil.copy2(os.path.join(inbox, fn), os.path.join(dest, fn))
            copied += 1
        except OSError:
            continue
    return dest, copied


def copy_to_drive(back_issue, drive_dir=None):
    """Copy the dated back issue into Google Drive under the same file name.

    Returns the path written. Raises OSError when it cannot: Drive is not mounted (not installed,
    signed out, or still starting up) or the copy itself fails. A same-day rebuild replaces the
    day's copy, exactly as the local archive does.

    The bytes go to a `.partial` sibling first and are swapped in only once they are all there:
    writing straight onto the final name would empty the day's good copy before the first byte
    landed, and a copy that died halfway would be uploaded as that night's paper with nothing
    ever coming back to fix it.

    `drive_dir` is read from DRIVE_DIR at CALL time, never as a default argument: a default binds
    at import and would keep pointing at the real G: drive under a test that patched the constant.
    """
    drive_dir = drive_dir or DRIVE_DIR
    parent = os.path.dirname(drive_dir)
    if not os.path.isdir(parent):
        raise FileNotFoundError(f"Google Drive is not mounted: {parent} does not exist")
    os.makedirs(drive_dir, exist_ok=True)
    dest = os.path.join(drive_dir, os.path.basename(back_issue))
    partial = dest + ".partial"
    try:
        shutil.copyfile(back_issue, partial)
        if os.path.getsize(partial) != os.path.getsize(back_issue):   # a short write, nothing more
            raise OSError(f"the Drive copy of {os.path.basename(back_issue)} came up short")
        os.replace(partial, dest)
    except BaseException:
        try:
            os.remove(partial)
        except OSError:
            pass
        raise
    return dest


def catch_up_drive(skip=None, archive=None, drive_dir=None, since=None):
    """Copy every back issue from `since` on that Drive is missing. Returns the paths written.

    A night whose copy failed (Drive still starting after a logon, signed out, laptop offline)
    leaves nothing behind but an exit code the next run overwrites. So every run repairs: the
    next one that finds Drive mounted fills the hole. `skip` is today's file name, which main()
    has just copied itself. Raises OSError like `copy_to_drive`.
    """
    archive = archive or ARCHIVE
    drive_dir = drive_dir or DRIVE_DIR
    since = since or DRIVE_SINCE
    written = []
    for path in sorted(glob.glob(os.path.join(archive, "*-edition-*.html"))):
        name = os.path.basename(path)
        if name == skip or name[:10] < since:
            continue
        if not os.path.exists(os.path.join(drive_dir, name)):
            written.append(copy_to_drive(path, drive_dir))
    return written


def main(argv=None):
    p = argparse.ArgumentParser(prog="build_newsletter.py",
                                description="Build today's Nightly Feud from the mule's cargo.")
    p.add_argument("--dry-run", action="store_true", help="render and report, write nothing")
    p.add_argument("--out", default=LIVE)
    p.add_argument("--no-haul", action="store_true",
                   help="in season: build from the snapshot already on disk, without pulling a new one")
    a = p.parse_args(argv)

    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if season_mode():
        # --dry-run writes nothing, and a fresh snapshot is a write: it reads the kept one.
        haul_problem = None if (a.dry_run or a.no_haul) else haul()
        ctx = build_season_context(haul_problem=haul_problem)
    else:
        ctx = build_context()
    html = render(ctx)

    print(f"Edition #{ctx['edition_no']} — {ctx['date_long']}")
    print(f"  cargo stamped {ctx['cargo_stamp']}")
    if "season" in ctx:
        s = ctx["season"]
        lu = s.get("lineup") or {}
        print(f"  in-season edition: rosters and projections as of {s.get('as_of') or 'never'}")
        if lu:
            print(f"  lineup week {lu.get('week')} vs {lu.get('opp')}: {len(lu.get('calls') or [])} call(s)"
                  + (f", WITHHELD ({lu['withheld']})" if lu.get("withheld") else ""))
        print(f"  wire: {len(s['wire'])} item(s) naming one of {s['wire_names']} people")
    else:
        print(f"  wire: {len(ctx['wire'])} item(s) naming a board player")
        print(f"  market: {len(ctx['market']['adds']['rows'])} of "
              f"{ctx['market']['adds']['total']} trending adds are on the board, "
              f"{len(ctx['market']['drops']['rows'])} of {ctx['market']['drops']['total']} drops")
    for g in ctx["gaps"]:
        print(f"  [gap] {g}")
    if a.dry_run:
        print("[dry run] nothing written.")
        return 0

    os.makedirs(ARCHIVE, exist_ok=True)
    back_issue = os.path.join(ARCHIVE, f"{ctx['date_slug']}-edition-{ctx['edition_no']}.html")
    for path in (a.out, back_issue):
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
    dest, copied = archive_cargo(ctx["date_slug"])
    print(f"  wrote {os.path.relpath(a.out, ROOT)} and {os.path.relpath(back_issue, ROOT)}")
    print(f"  archived {copied} cargo file(s) to {os.path.relpath(dest, ROOT)}")

    # Last, and after everything local is safely on disk: a Drive that is down must never cost the
    # edition. A miss exits 3, which the scheduled task shows as its Last Result -- but only until
    # the next run overwrites it, and nobody is watching that. The repair is what counts: every
    # run copies whatever earlier night Drive is still missing.
    try:
        print(f"  copied to {copy_to_drive(back_issue)}")
        for healed in catch_up_drive(skip=os.path.basename(back_issue)):
            print(f"  caught up a missed night: {healed}")
    except OSError as e:
        print(f"  [DRIVE COPY FAILED] {e}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())

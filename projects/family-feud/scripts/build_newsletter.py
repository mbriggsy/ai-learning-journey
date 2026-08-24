#!/usr/bin/env python3
"""U11 -- The Nightly Feud, the half that has never run.

    python scripts/build_newsletter.py              # build tonight's edition
    python scripts/build_newsletter.py --dry-run    # render and report, write nothing

The mule has hauled cargo hourly for days into a consumer that did not exist. This is the
consumer. It reads `newsletter/data/inbox/`, the board, and the frozen design, and writes
`newsletter/family-feud-newsletter.html` plus a dated back issue in `newsletter/archive/`.

THE HARD RULE, AND EVERYTHING ELSE FOLLOWS FROM IT: **deterministic code owns every fact and
every number; prose owns only the connective tissue.** No figure in the output is written by a
language model, and no figure is typed into the template. If a number cannot be derived from
cargo, the edition says so in words rather than estimating -- `Days to Draft` renders as an
asterisked dash tonight because `start_time` is null, and it will start rendering a real
countdown the night that changes, with no code edit.

THE DESIGN IS THE ASSET AND IT IS NOT COPIED. `newsletter-template.html` stays frozen in git as
the reference. The `<style>` block and the theme-toggle `<script>` are EXTRACTED from it at build
time and injected, so the edition cannot drift from the design and there is no second copy of the
CSS to maintain. A test asserts the rendered style block hashes identically to the frozen one.

WHY THIS MAKES NO NETWORK CALLS. The plan had Market Watch resolving trending player ids through
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

    # AN APPEND-ONLY ALARM NEVER SOUNDS THE ALL-CLEAR, so a healed "CARGO IS STALE" reads as a
    # live emergency for days (Briggsy asked "is this still accurate?" on 2026-08-24 about an
    # alert that had healed within two minutes of firing on 08-21). The alert is HISTORY and
    # stays; what press time can add is the present: if the cargo is fresh NOW, say so on the
    # alert itself. 150 min is the watcher's own staleness threshold, not a new rule.
    for a in out:
        if "CARGO IS STALE" in a["title"].upper():
            age = _cargo_age_minutes()
            if age is not None and age <= 150:
                a["recovered"] = f"since recovered — cargo was {age:.0f} min old at press time"
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


def wire(players):
    """Headlines that name a board player, GROUPED BY WHO THEY ARE ABOUT.

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
                    "players": [{"name": p["name"], "pos": p["pos"], "team": p["team"],
                                 "r": p["r"], "tier": p["tier"]} for p in hits]}
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
        # Every reason tonight's paper might be thinner than usual, printed in the colophon. A
        # newsletter that quietly drops a section teaches you to trust a page that is lying.
        "gaps": [p for p in (draft_problem, users_problem) if p]
                + [f"the mule reported {k} as failed" for k in failed],
        "cargo_stamp": status.get("run_at"),
    }


def render(context, template_dir=TEMPLATE_DIR):
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    env = Environment(loader=FileSystemLoader(template_dir),
                      autoescape=select_autoescape(["html"]),
                      trim_blocks=True, lstrip_blocks=True)
    return env.get_template("edition.html.j2").render(**context)


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


def main(argv=None):
    p = argparse.ArgumentParser(prog="build_newsletter.py",
                                description="Build tonight's Nightly Feud from the mule's cargo.")
    p.add_argument("--dry-run", action="store_true", help="render and report, write nothing")
    p.add_argument("--out", default=LIVE)
    a = p.parse_args(argv)

    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    ctx = build_context()
    html = render(ctx)

    print(f"Edition #{ctx['edition_no']} — {ctx['date_long']}")
    print(f"  cargo stamped {ctx['cargo_stamp']}")
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
    return 0


if __name__ == "__main__":
    sys.exit(main())

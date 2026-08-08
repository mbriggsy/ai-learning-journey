#!/usr/bin/env python3
"""Is this payload actually the thing we asked for? (U10)

    python scripts/validate_cargo.py <path> <json|rss> [--content-type T] [--status N]

The mule's only test used to be `size > 50 bytes`. An 793 KB HTML error page passes that
comfortably, which is why `rss_nbc_edge` has been recorded **ok** in `mule_status.json` for days
while being a `SectionPage` with zero `<item>` elements in it. Presence is not health -- this is
the fourth appearance of that shape in this project (docs/insights/007).

WHY THIS IS PYTHON AND THE MULE IS POWERSHELL. The validation is the part with edge cases, so it
is the part that needs tests, and this repo's test harness is `unittest`. PowerShell keeps the job
it is good at -- scheduled fetching -- and shells out for the judgment. The contract is deliberately
tiny: exit 0 or 1, one line on stdout.

FOUR CHECKS, IN THE ORDER THEY GET CHEAPER TO BE WRONG ABOUT:

  1. **HTTP status** -- a 404 body is still bytes.
  2. **Content-type** -- the cheapest guard, and the one the original plan omitted. The live NBC
     payload announces `text/html` before you parse a single byte of it.
  3. **It parses** -- with `defusedxml`, because these arrive off the public internet and the
     stdlib parser will happily follow an entity into your filesystem.
  4. **It has content** -- a feed with zero items is not a feed. RSS uses `<item>`; Atom uses
     `<entry>`; both count.

THE OUTPUT STRING IS A COMPATIBILITY SURFACE, NOT FREE TEXT. `watch_draft_state.staleness_reasons`
decides a source failed with `not outcome.lower().startswith("ok")`. Anything that passes MUST
begin with `ok`, or the watcher starts reporting healthy cargo as broken and teaches Briggsy to
ignore it -- the false red that insight 009 records as the more dangerous direction.
"""
import argparse
import json
import sys

try:
    from defusedxml.ElementTree import fromstring as _xml
    XML_PARSER = "defusedxml"
except ImportError:                     # never silently fall back to the unsafe parser
    _xml = None
    XML_PARSER = None

ATOM_ENTRY = "{http://www.w3.org/2005/Atom}entry"


def _decode(data):
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return None


def looks_like_html(content_type):
    """A feed announcing itself as HTML is the live NBC failure, spotted before any parsing."""
    return "html" in (content_type or "").lower()


def validate_bytes(data, kind, content_type=None, status=None):
    """-> (ok, summary). `summary` is what lands in mule_status.json and must start with 'ok'."""
    if status is not None and int(status) != 200:
        return False, f"FAIL: HTTP {status}"
    if not data:
        return False, "FAIL: empty response"

    if kind == "json":
        text = _decode(data)
        if text is None:
            return False, "FAIL: response is not decodable text"
        try:
            doc = json.loads(text)
        except ValueError as e:
            return False, f"FAIL: not valid JSON ({str(e)[:60]})"
        # `null` parses cleanly and means "no such draft/league". It is the shape a wrong or
        # retired id returns, and it would otherwise be recorded as a healthy fetch.
        if doc is None:
            return False, "FAIL: JSON parsed but is null -- the id is probably wrong or retired"
        if not isinstance(doc, (dict, list)):
            return False, f"FAIL: JSON is a bare {type(doc).__name__}, not an object or array"
        n = len(doc)
        return True, f"ok ({len(data)} bytes, {n} {'keys' if isinstance(doc, dict) else 'entries'})"

    if kind == "rss":
        if looks_like_html(content_type):
            return False, f"FAIL: content-type {content_type} is a web page, not a feed"
        if _xml is None:
            return False, "FAIL: defusedxml is not installed, so this cannot be safely parsed"
        try:
            root = _xml(data)
        except Exception as e:
            return False, f"FAIL: does not parse as XML ({type(e).__name__})"
        items = len(list(root.iter("item"))) or len(list(root.iter(ATOM_ENTRY)))
        if items == 0:
            return False, "FAIL: parses as XML but carries zero <item>/<entry> elements"
        return True, f"ok ({len(data)} bytes, {items} items)"

    return False, f"FAIL: unknown kind {kind!r}"


def validate_file(path, kind, content_type=None, status=None):
    try:
        with open(path, "rb") as f:
            data = f.read()
    except OSError as e:
        return False, f"FAIL: could not read the downloaded file ({e})"
    return validate_bytes(data, kind, content_type, status)


def main(argv=None):
    p = argparse.ArgumentParser(prog="validate_cargo.py")
    p.add_argument("path")
    p.add_argument("kind", choices=("json", "rss"))
    p.add_argument("--content-type", dest="content_type", default=None)
    p.add_argument("--status", default=None)
    a = p.parse_args(argv)
    ok, summary = validate_file(a.path, a.kind, a.content_type, a.status)
    print(summary)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

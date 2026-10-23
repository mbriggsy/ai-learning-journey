"""The frozen network for tests/test_trade_eval.py: tonight's Kaeperni-offer payloads, served through
the same functions the live tool calls (g.fetch, g.pull, g.pull_kickoffs, x.load, g.now).

Patching at the network edge -- not handing evaluate() a pre-built object -- is deliberate: the
loader's wiring is part of what the published-number test pins (insight 013: every guard tested and
not one proven connected). The fixture was cut 2026-10-22 from payloads pulled 21:26-21:36 ET; those
projections can never be fetched again, which is why it is a file and not a re-pull.
"""
import contextlib
import copy
import datetime
import gzip
import json
import os
import re
import sys
from unittest import mock

TESTS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TESTS)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import gameday_check as g  # noqa: E402
import external_projections as x  # noqa: E402

FIXTURE = os.path.join(TESTS, "fixtures", "trade_eval_kaeperni_20261022.json.gz")
#: The moment the offer was priced: Thu 2026-10-22 21:30 ET, TNF NE @ CHI in the 2nd half.
PRICED_AT = datetime.datetime(2026, 10, 22, 21, 30)

_CACHE = {}


def fixture():
    """A deep copy, so a test that edits its payload cannot leak into the next one."""
    if "fx" not in _CACHE:
        with gzip.open(FIXTURE, "rt", encoding="utf-8") as fh:
            _CACHE["fx"] = json.load(fh)
    return copy.deepcopy(_CACHE["fx"])


class Net:
    """Serves one fixture dict. Knobs: xload_fails / next_fails (str -> Refuse), kick_fails (str)."""

    def __init__(self, fx=None, now=PRICED_AT, xload_fails=None, next_fails=None, kick_fails=None):
        self.fx = fx if fx is not None else fixture()
        self.now, self.xload_fails, self.next_fails, self.kick_fails = now, xload_fails, next_fails, kick_fails
        self.paths = []

    def fetch(self, path, timeout=None):
        self.paths.append(path)
        fx = self.fx
        lid = fx["league"]["league_id"]
        m = re.match(r"^/projections/nfl/\d+/(\d+)\?", path)
        if m:
            return fx["projections"].get(m.group(1), [])
        m = re.match(rf"^/v1/league/{lid}/matchups/(\d+)$", path)
        if m:
            return fx["matchups"].get(m.group(1), [])
        table = {"/v1/state/nfl": fx["state"], f"/v1/league/{lid}": fx["league"],
                 f"/v1/league/{lid}/rosters": fx["rosters"], f"/v1/league/{lid}/users": fx["users"],
                 "/v1/players/nfl": fx["players"]}
        if path in table:
            return table[path]
        raise AssertionError(f"the tool fetched a path the fixture does not serve: {path}")

    def xload(self, week=None):
        fx = self.fx
        w = week or fx["state"]["week"]
        if self.xload_fails and week is None:
            raise g.Refuse(self.xload_fails)
        if self.next_fails and week is not None and week != fx["state"]["week"]:
            raise g.Refuse(self.next_fails)
        rows = fx["xload_rows"].get(str(w))
        if rows is None:
            raise g.Refuse(f"no fixture rows for week {w}")
        return ({"week": w}, rows, (fx["state"], fx["league"], fx["rosters"], fx["users"], [], fx["players"]))

    def kickoffs(self, season, week, season_type):
        if self.kick_fails:
            raise g.Refuse(self.kick_fails)
        return {t: datetime.datetime.fromisoformat(v) for t, v in self.fx["kickoffs"][str(week)].items()}

    @contextlib.contextmanager
    def patched(self):
        import trade_eval as te
        with mock.patch.object(g, "fetch", self.fetch), mock.patch.object(g, "pull_kickoffs", self.kickoffs), \
                mock.patch.object(x, "load", self.xload), mock.patch.object(g, "now", lambda: self.now), \
                mock.patch.object(te, "PAUSE", 0):
            yield te


def run(argv, net=None):
    """main(argv) on the frozen network -> (exit code, stdout)."""
    import io
    net = net or Net()
    buf = io.StringIO()
    with net.patched() as te, contextlib.redirect_stdout(buf):
        code = te.main(argv)
    return code, buf.getvalue()

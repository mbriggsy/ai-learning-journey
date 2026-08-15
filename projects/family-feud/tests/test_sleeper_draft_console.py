#!/usr/bin/env python3
"""The draft-room console script, guarded at the source.

WHAT THESE TESTS ARE AND ARE NOT. They cannot prove a click lands in Sleeper's room -- only a live
mock can do that. What they DO prove is the half that was broken on 2026-08-09 and could not have
been caught in a room either, because it reported success: `ffQueue`'s success oracle.

THE DEFECT, so a future edit cannot quietly restore it. The verdict was inline:

    queued: before !== after || label !== null

with before/after being "does the page say 'No players in your queue'". Once the queue holds
anybody, before === after === false, so the verdict collapsed to `label !== null` -- "is the string
'QUEUE (n)' rendered anywhere on the page" -- which is true whenever the panel is open. Every add
after the first therefore returned queued:true whether or not the click did anything, and with the
panel closed a SUCCESSFUL add returned queued:false. TODO.md had promoted this control to "the
safety net" and rebuilt the draft-day plan around it.

Following tests/test_normalize.py, the JS runs in real node rather than being pattern-matched, and
following insight 013 the CALL SITE is tested too: TestFfQueueCallSite drives the real `ffQueue`
against a stub DOM, so ripping `queueVerdict` back out turns those red rather than leaving the
predicate green and unwired.
"""
import json
import os
import re
import subprocess
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONSOLE = os.path.join(ROOT, "scripts", "sleeper_draft_console.js")


def read_console():
    with open(CONSOLE, encoding="utf-8") as f:
        return f.read()


def code_only(src):
    """The source with comments removed.

    The textual guards below MUST read executable code, not prose. The first version of this file
    searched the raw source for the old buggy verdict and went red on the comment that documents
    it -- a detector that punishes writing down the defect trains you to stop writing it down.
    Verified safe on this file: neither `/*` nor `*/` occurs inside any string or regex literal
    here (the regexes are /QUEUE \\((\\d+)\\)/, /[A-Za-z]/, /\\s+/ and the apostrophe class), and
    test_the_stripper_actually_strips is the positive control on that claim.
    """
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return "\n".join(l for l in src.splitlines() if not l.strip().startswith("//"))


def run_node(js_body):
    """Run the REAL console script plus `js_body` as one node script, and return its stdout.

    The script is an IIFE that assigns onto `window`, so a global alias is all the shim it needs;
    everything touching `document` is inside a function and is never reached at load time.
    """
    prelude = "globalThis.window = globalThis;\n"
    with tempfile.TemporaryDirectory() as d:
        run_js = os.path.join(d, "run.js")
        with open(run_js, "w", encoding="utf-8") as f:
            f.write(prelude)
            f.write(read_console())
            f.write("\n;\n")
            f.write(js_body)
        try:
            p = subprocess.run(["node", run_js], capture_output=True, text=True,
                               encoding="utf-8", timeout=60)
        except FileNotFoundError:
            raise AssertionError(
                "node is not on PATH. The draft-room control is JS and this suite is the only "
                "thing standing between us and a queue oracle that lies. Install node -- do not skip."
            )
    if p.returncode != 0:
        raise AssertionError(f"the console script failed to run:\n{p.stderr[:4000]}")
    return p.stdout.strip()


def verdict(before, after):
    """queueVerdict(before, after) as evaluated by node. before/after are (count, empty)."""
    b = {"count": before[0], "empty": before[1]}
    a = {"count": after[0], "empty": after[1]}
    out = run_node(
        f"console.log(JSON.stringify(window.ffQueueVerdict({json.dumps(b)}, {json.dumps(a)})));"
    )
    return json.loads(out)


# --- the stub room ---------------------------------------------------------------------------
# One player row, addressed exactly the way the real script addresses a real row: a name cell
# between 60 and 220px carrying two words, a >=600px row above it, a <60px leftmost cell holding an
# svg and no text, and a queue icon found by its src. `clickAddsToQueue` decides whether clicking
# the queue icon actually moves the page's QUEUE (n) text -- which is the whole thing under test.
STUB_ROOM = r"""
function buildRoom({ bodyText, clickAddsToQueue, hasDraftControl = true, hasQueueIcon = true,
                     renderDelayMs = 0, wrapperHasButton = true, draftDisabled = false,
                     draftSetsPicking = true }) {
  const state = { body: bodyText, clicks: 0 };

  const mk = (o) => {
    const e = {
      _text: o.text || '',
      _rect: { width: o.width || 0, height: o.height || 0 },
      _svgs: o.svgs || 0,
      children: o.children || [],
      parentElement: null,
      getBoundingClientRect() { return this._rect; },
      querySelectorAll(sel) { return sel === 'svg' ? new Array(this._svgs).fill({}) : []; },
      querySelector() { return null; },
    };
    e.childNodes = e._text ? [{ nodeType: 3, textContent: e._text }] : [];
    return e;
  };

  // renderDelayMs models the thing that makes polling necessary: the room re-renders on its own
  // clock, so the page has NOT changed by the time the click() call returns. With this at 0 a
  // single read is indistinguishable from a poll, which is how mutant M6 first survived.
  const applyAdd = () => {
    const m = state.body.match(/QUEUE \((\d+)\)/);
    state.body = m
      ? state.body.replace(/QUEUE \(\d+\)/, `QUEUE (${Number(m[1]) + 1})`)
      : state.body.replace('No players in your queue', 'QUEUE (1) Justin Jefferson');
  };
  const queueIcon = {
    src: 'https://sleepercdn.com/images/v2/icons/queue.png',
    click() {
      state.clicks += 1;
      if (!clickAddsToQueue) return;
      if (renderDelayMs > 0) setTimeout(applyAdd, renderDelayMs);
      else applyAdd();
    },
  };

  // 🚨 THE WRAPPER/BUTTON SPLIT IS THE WHOLE POINT OF THIS STUB.
  // Until 2026-08-15, draftCell WAS the button, so this suite was structurally incapable of
  // catching the real defect: draftButton() returned div.draft-button-wrapper, the click never
  // reached a handler, and 28 tests stayed green through a control that drafted nobody.
  // row.children[0] is now a handler-LESS wrapper whose clicks are counted SEPARATELY, so any
  // regression that goes back to clicking it shows up as wrapperClicks > 0 instead of passing.
  const draftBtn = mk({ width: 24, height: 24, svgs: 1 });
  draftBtn.classList = {
    _c: ['draft-button'].concat(draftDisabled ? ['disable'] : []),
    contains(c) { return this._c.includes(c); },
    add(c) { if (!this._c.includes(c)) this._c.push(c); },
  };
  draftBtn._picking = false;
  draftBtn.querySelector = (sel) => (sel === '.spinner' && draftBtn._picking ? {} : null);
  draftBtn.click = () => {
    state.draftClicks = (state.draftClicks || 0) + 1;
    // Models _onClickDraft: stopPropagation(), THEN setState({drafting}) -> .picking + spinner.
    // A DISABLED button reaches neither -- which is exactly the silent failure handlerRan exists
    // to make audible, since the correctly-aimed click no longer opens a player card to warn us.
    if (!draftDisabled && draftSetsPicking) {
      draftBtn.classList.add('picking');
      draftBtn._picking = true;
    }
  };

  const draftCell = mk({ width: 34, height: 40, svgs: 1 });   // the WRAPPER -- carries no handler
  draftCell.click = () => { state.wrapperClicks = (state.wrapperClicks || 0) + 1; };
  draftCell.querySelector = (sel) =>
    (wrapperHasButton && sel === '.draft-button' ? draftBtn : null);
  const nameCell  = mk({ text: 'Justin Jefferson', width: 150, height: 20 });
  const row = mk({ width: 700, height: 26, children: hasDraftControl ? [draftCell] : [] });
  row.querySelector = (sel) => (hasQueueIcon && sel.includes('queue.png') ? queueIcon : null);
  nameCell.parentElement = row;

  const grid = mk({ width: 900, height: 500 });
  grid.querySelectorAll = () => [row, draftCell, nameCell];

  globalThis.Event = function (type) { this.type = type; };
  window.HTMLInputElement = function () {};
  Object.defineProperty(window.HTMLInputElement.prototype, 'value', {
    set(v) { this._v = v; }, get() { return this._v; }, configurable: true,
  });
  const input = Object.create(window.HTMLInputElement.prototype);
  input.dispatchEvent = () => true;

  globalThis.document = {
    get body() { return { innerText: state.body }; },
    querySelector(sel) {
      if (sel.includes('Find player')) return input;
      if (sel.includes('role="grid"')) return grid;
      return null;
    },
  };
  return state;
}
"""


class TestTheOracleRefusesWhatItCannotSee(unittest.TestCase):
    """queueVerdict is the named predicate. Every case here is a way the old inline verdict lied."""

    def test_the_historical_bug_a_click_that_does_nothing_is_not_a_success(self):
        """THE regression test. Old logic: before===after===false, label!==null -> TRUE.

        This is the case that made every add after the first report success unconditionally."""
        self.assertEqual(verdict((3, False), (3, False))["verified"], False)

    def test_it_says_why_rather_than_just_no(self):
        self.assertIn("did not move", verdict((3, False), (3, False))["reason"])

    def test_an_increment_of_one_is_the_only_thing_that_verifies(self):
        self.assertEqual(verdict((3, False), (4, False))["verified"], True)

    def test_the_first_player_going_into_an_empty_queue_verifies(self):
        self.assertEqual(verdict((None, True), (1, False))["verified"], True)

    def test_a_queue_that_still_reads_empty_is_a_failed_add(self):
        v = verdict((None, True), (None, True))
        self.assertEqual(v["verified"], False)
        self.assertIn("empty", v["reason"])

    def test_an_unreadable_count_refuses_rather_than_assuming(self):
        """The old verdict returned TRUE here whenever the panel happened to be rendered. A
        detector that cannot read its instrument must say so, never pass."""
        v = verdict((None, False), (None, False))
        self.assertEqual(v["verified"], False)
        self.assertIn("unreadable", v["reason"])

    def test_a_jump_of_more_than_one_refuses_to_take_credit(self):
        v = verdict((3, False), (5, False))
        self.assertEqual(v["verified"], False)
        self.assertIn("not by one", v["reason"])

    def test_a_shrinking_queue_is_never_a_success(self):
        self.assertEqual(verdict((3, False), (2, False))["verified"], False)

    def test_read_queue_parses_the_panel_label(self):
        out = run_node(
            "console.log(JSON.stringify(window.ffReadQueue('foo QUEUE (7) bar')));"
            "console.log(JSON.stringify(window.ffReadQueue('No players in your queue')));"
        ).splitlines()
        self.assertEqual(json.loads(out[0]), {"count": 7, "empty": False})
        self.assertEqual(json.loads(out[1]), {"count": None, "empty": True})


class TestFfQueueCallSite(unittest.TestCase):
    """Insight 013: a predicate nothing calls is decoration. These drive the REAL ffQueue."""

    def _run(self, body_text, click_works, budget=250, **kw):
        opts = dict(bodyText=body_text, clickAddsToQueue=click_works, **kw)
        out = run_node(STUB_ROOM + f"""
        buildRoom({json.dumps(opts)});
        window.ffQueue('Justin Jefferson', {budget}).then(r => console.log(r));
        """)
        return json.loads(out)

    def test_a_dead_click_on_a_nonempty_queue_reports_failure(self):
        """The exact scenario the old oracle called success."""
        r = self._run("QUEUE (3) some other page text", click_works=False)
        self.assertEqual(r["queued"], False)
        self.assertIn("did not move", r["reason"])

    def test_a_live_click_on_a_nonempty_queue_reports_success(self):
        r = self._run("QUEUE (3) some other page text", click_works=True)
        self.assertEqual(r["queued"], True)
        self.assertEqual(r["queueCount"], 4)

    def test_the_first_add_to_an_empty_queue_reports_success(self):
        r = self._run("No players in your queue", click_works=True)
        self.assertEqual(r["queued"], True)

    def test_a_dead_click_on_an_empty_queue_reports_failure(self):
        r = self._run("No players in your queue", click_works=False)
        self.assertEqual(r["queued"], False)

    def test_it_names_the_player_it_acted_on(self):
        self.assertEqual(self._run("QUEUE (1)", click_works=True)["player"], "Justin Jefferson")

    def test_a_missing_queue_icon_refuses(self):
        r = self._run("QUEUE (3)", click_works=True, hasQueueIcon=False)
        self.assertEqual(r["queued"], False)
        self.assertIn("no queue icon", r["reason"])

    def test_it_waits_out_a_slow_re_render_instead_of_reading_once(self):
        """The reason the fixed 1200ms sleep had to go. The room re-renders on its own clock, so
        the page has not changed when click() returns; a single read calls a good add a failure --
        the same false negative locate()'s comment records from the flat 700ms wait.

        This test exists because mutant M6 (return after the first read) SURVIVED the first pass:
        every case above applied the click's effect synchronously, so none of them could tell a
        poll from a single read. Insight 019 -- the mutants only probe the axis you suspect."""
        r = self._run("QUEUE (3) some other page text", click_works=True,
                      renderDelayMs=300, budget=3000)
        self.assertEqual(r["queued"], True)
        self.assertGreaterEqual(r["waitedMs"], 250)

    def test_a_slow_re_render_that_never_arrives_still_reports_failure(self):
        """The other half: waiting must not become believing. Budget expires before the render."""
        r = self._run("QUEUE (3) some other page text", click_works=True,
                      renderDelayMs=5000, budget=300)
        self.assertEqual(r["queued"], False)

    def test_a_player_with_no_draft_control_can_still_be_queued(self):
        """The decoupling. locate() used to refuse the whole row when the leftmost cell missed the
        draft-button shape test, which took the QUEUE down with it -- the safety net was gated on
        the very control it exists to work around."""
        r = self._run("QUEUE (3)", click_works=True, hasDraftControl=False)
        self.assertEqual(r["queued"], True)


class TestFfDraftKeepsItsRefusal(unittest.TestCase):
    """Moving the draft-control check out of locate() must not weaken ffDraft."""

    def _draft(self, **kw):
        opts = dict(bodyText="QUEUE (0)", clickAddsToQueue=False, **kw)
        out = run_node(STUB_ROOM + f"""
        buildRoom({json.dumps(opts)});
        window.ffDraft('Justin Jefferson').then(r => console.log(r));
        """)
        return json.loads(out)

    def test_no_draft_control_still_refuses_with_the_same_wording(self):
        r = self._draft(hasDraftControl=False)
        self.assertEqual(r["clicked"], False)
        self.assertIn("already drafted?", r["reason"])

    def test_it_still_reports_a_click_never_a_pick(self):
        r = self._draft(hasDraftControl=True)
        self.assertEqual(r["clicked"], True)
        self.assertEqual(r["confirmed"], False)

    def test_ff_find_never_hands_back_a_live_handle(self):
        out = run_node(STUB_ROOM + """
        buildRoom({ bodyText: 'QUEUE (0)', clickAddsToQueue: false });
        window.ffFind('Justin Jefferson').then(r => console.log(r));
        """)
        r = json.loads(out)
        self.assertNotIn("btn", r)
        self.assertNotIn("row", r)
        self.assertEqual(r["hasDraftControl"], True)

    def test_ff_find_reports_a_missing_draft_control_rather_than_failing(self):
        out = run_node(STUB_ROOM + """
        buildRoom({ bodyText: 'QUEUE (0)', clickAddsToQueue: false, hasDraftControl: false });
        window.ffFind('Justin Jefferson').then(r => console.log(r));
        """)
        r = json.loads(out)
        self.assertEqual(r["ok"], True)
        self.assertEqual(r["hasDraftControl"], False)


class TestItClicksTheButtonAndNotTheBoxAroundIt(unittest.TestCase):
    """The 2026-08-14 defect, pinned. See draftButton() in the console.

    ffDraft returned {clicked:true} and drafted nobody because draftButton() handed back
    div.draft-button-wrapper -- a layout div owning no handler -- so the click bubbled UP into the
    row and opened the player card. The old stub made row.children[0] the button itself, which is
    why every test here stayed green through it. These four are the ones that would have gone red.
    """

    def _draft(self, **kw):
        opts = dict(bodyText="QUEUE (0)", clickAddsToQueue=False, **kw)
        out = run_node(STUB_ROOM + f"""
        const st = buildRoom({json.dumps(opts)});
        window.ffDraft('Justin Jefferson').then(r => console.log(JSON.stringify({{
          res: JSON.parse(r),
          draftClicks: st.draftClicks || 0,
          wrapperClicks: st.wrapperClicks || 0,
        }})));
        """)
        return json.loads(out)

    def test_the_click_lands_on_the_button_never_on_the_wrapper(self):
        r = self._draft()
        self.assertEqual(r["res"]["clicked"], True)
        self.assertEqual(r["draftClicks"], 1, "the .draft-button child must be the node clicked")
        self.assertEqual(r["wrapperClicks"], 0,
                         "clicking div.draft-button-wrapper is THE bug -- it drafts nobody")

    def test_a_wrapper_with_no_button_inside_refuses_and_clicks_nothing(self):
        # The DOM rotated, or the player is gone. Either way a refusal is the only honest answer;
        # falling back to `|| first` would silently restore the broken click.
        r = self._draft(wrapperHasButton=False)
        self.assertEqual(r["res"]["clicked"], False)
        self.assertIn("already drafted?", r["res"]["reason"])
        self.assertEqual(r["wrapperClicks"], 0, "a refusal must not click the wrapper as a fallback")
        self.assertEqual(r["draftClicks"], 0)

    def test_a_disabled_button_is_refused_before_the_click_not_after(self):
        # Sleeper styles .disable with colour only -- no pointer-events, no overlay -- so the
        # button accepts the click and silently does nothing. Refuse rather than fire into a void.
        r = self._draft(draftDisabled=True)
        self.assertEqual(r["res"]["clicked"], False)
        self.assertIn("clock is not live", r["res"]["reason"])
        self.assertEqual(r["draftClicks"], 0, "it must not click a button it has already refused")

    def test_a_click_whose_handler_never_ran_reports_handlerRan_false(self):
        # THE REGRESSION THE FIX ITSELF CREATES. Aimed correctly, a click that does nothing is
        # SILENT -- no player card to warn us any more. handlerRan is the replacement alarm.
        r = self._draft(draftSetsPicking=False)
        self.assertEqual(r["res"]["clicked"], True)
        self.assertEqual(r["res"]["handlerRan"], False,
                         "a click with no .picking/spinner fingerprint must not read as success")

    def test_a_healthy_click_reports_handlerRan_true(self):
        r = self._draft()
        self.assertEqual(r["res"]["handlerRan"], True)
        self.assertEqual(r["res"]["confirmed"], False,
                         "handlerRan is an in-page signal and must never become confirmation")


class TestTheWrapperMistakeCannotComeBackTextually(unittest.TestCase):
    """Belt and braces: the two one-token edits that would reinstate the defect."""

    def test_draft_button_does_not_return_row_children_zero_directly(self):
        src = code_only(read_console())
        m = re.search(r"function draftButton\(row\)\s*\{(.*?)\n  \}", src, re.S)
        self.assertIsNotNone(m, "draftButton() not found -- did it get renamed?")
        body = m.group(1)
        self.assertIn(".draft-button", body,
                      "draftButton must descend to the child that owns the handler")
        self.assertNotIn("|| first", body,
                         "`|| first` silently restores the wrapper click that drafted nobody")
        self.assertNotIn("auction-button", body,
                         "auction-button appears 0 times in Sleeper's bundle -- it can never match")

    def test_handler_props_accepts_the_react_16_key(self):
        # Sleeper runs React 16 (__reactEventHandlers$). Probing only React 17+'s __reactProps$
        # returns [] on every node and reads exactly like "no handler here" -- a false negative
        # that would send the next session hunting a phantom. Measured live 2026-08-15.
        src = code_only(read_console())
        self.assertIn("__reactEventHandlers$", src)


QUEUE_PANEL = r"""
// A stub of the queue PANEL as the live room renders it, measured in mock 1391539007871012864
// on 2026-08-09: each entry carries an element whose own text is exactly "REMOVE", and two levels
// up is the row "Jahmyr Gibbs | RB | DET | ADP | 1.6 | PTS | 331.4 | REMOVE".
function buildPanel(names, { extraWrapper = false, countOverride = null, deadRemove = false } = {}) {
  const state = { removed: [] };
  const mk = (text, kids) => {
    const e = {
      _text: text || '',
      children: kids || [],
      parentElement: null,
      childNodes: text ? [{ nodeType: 3, textContent: text }] : [],
      get innerText() {
        const own = this._text;
        const kid = (this.children || []).map(c => c.innerText).filter(Boolean).join('\n');
        return [own, kid].filter(Boolean).join('\n');
      },
    };
    (kids || []).forEach(k => { k.parentElement = e; });
    return e;
  };

  // Built lazily, so a REMOVE click really does take the row OUT of the fake DOM. The first
  // version kept a static element array: the count dropped, the rows stayed, and ffQueueList
  // correctly reported a disagreement the real room would never produce.
  const build = () => {
    const els = [];
    names.forEach(n => {
      const rem = mk('REMOVE');
      // deadRemove models the click that lands and does nothing -- the only state that reaches
      // the verdict. It is an option rather than an outside monkeypatch because the elements are
      // rebuilt on every querySelectorAll, so a patched handle is stale by the time it is used.
      rem.click = deadRemove ? () => {} : () => {
        state.removed.push(n);
        const i = names.indexOf(n);
        if (i >= 0) names.splice(i, 1);
      };
      const stats = mk('ADP', [mk('1.6'), mk('PTS'), mk('331.4'), rem]);
      // extraWrapper puts a layer BETWEEN the stats block and the name row, which is the change
      // that actually costs a hop. The first version wrapped the name row from the OUTSIDE, which
      // added no distance between REMOVE and the name and so stressed nothing -- a fixed-hop
      // implementation passed it.
      const inner = extraWrapper ? mk('', [stats]) : stats;
      const row = mk(n, [mk('RB'), mk('DET'), inner]);
      els.push(rem, stats, inner, row);
    });
    return els;
  };

  globalThis.document = {
    get body() {
      const n = countOverride !== null ? countOverride : names.length;
      return { innerText: n === 0 ? 'No players in your queue' : `QUEUE (${n})\nNEXT PICK` };
    },
    querySelectorAll: () => build(),
  };
  return state;
}
"""


class TestReadingAndUnstackingTheQueue(unittest.TestCase):
    """ffQueueList/ffUnqueue exist because auto-pick drains the queue IN ORDER, so the draft-day
    job is 'keep it ranked' -- and you cannot rank a list you can only append to."""

    def _run(self, names, body, **kw):
        opts = json.dumps(kw) if kw else "{}"
        out = run_node(QUEUE_PANEL + f"""
        const st = buildPanel({json.dumps(names)}, {opts});
        (async () => {{ {body} }})();
        """)
        return [json.loads(l) for l in out.splitlines() if l.strip()]

    def test_it_reads_the_queue_in_order(self):
        r = self._run(["Jahmyr Gibbs", "Bijan Robinson", "Ja'Marr Chase"],
                      "console.log(window.ffQueueList());")[0]
        self.assertEqual([e["name"] for e in r["entries"]],
                         ["Jahmyr Gibbs", "Bijan Robinson", "Ja'Marr Chase"])
        self.assertEqual([e["slot"] for e in r["entries"]], [1, 2, 3])
        self.assertEqual(r["count"], 3)
        self.assertTrue(r["agrees"])

    def test_an_empty_queue_reads_as_empty_not_as_an_error(self):
        r = self._run([], "console.log(window.ffQueueList());")[0]
        self.assertEqual(r["entries"], [])
        self.assertIsNone(r["count"])

    def test_it_finds_the_row_by_shape_not_by_a_fixed_hop_count(self):
        """One extra wrapper div between REMOVE and the name is exactly the kind of change a
        Sleeper release ships without telling anyone."""
        r = self._run(["Jahmyr Gibbs", "Bijan Robinson"],
                      "console.log(window.ffQueueList());", extraWrapper=True)[0]
        self.assertEqual([e["name"] for e in r["entries"]], ["Jahmyr Gibbs", "Bijan Robinson"])

    def test_it_SAYS_SO_when_the_tab_count_and_the_panel_disagree(self):
        """A caller re-ranking off a short list would silently drop players. Better to flag it."""
        r = self._run(["Jahmyr Gibbs", "Bijan Robinson"],
                      "console.log(window.ffQueueList());", countOverride=5)[0]
        self.assertFalse(r["agrees"])

    def test_unqueue_removes_and_verifies_by_the_count_going_down(self):
        r = self._run(["Jahmyr Gibbs", "Bijan Robinson", "Ja'Marr Chase"],
                      "console.log(await window.ffUnqueue('Bijan Robinson', 500));"
                      "console.log(window.ffQueueList());")
        self.assertEqual(r[0]["removed"], True)
        self.assertEqual(r[0]["reason"], "queue 3 -> 2")
        self.assertEqual([e["name"] for e in r[1]["entries"]], ["Jahmyr Gibbs", "Ja'Marr Chase"])

    def test_removing_the_last_entry_reads_as_empty(self):
        r = self._run(["Ja'Marr Chase"],
                      "console.log(await window.ffUnqueue(\"Ja'Marr Chase\", 500));")[0]
        self.assertEqual(r["removed"], True)
        self.assertEqual(r["reason"], "queue 1 -> empty")

    def test_unqueueing_someone_absent_refuses_and_shows_the_queue(self):
        r = self._run(["Jahmyr Gibbs"],
                      "console.log(await window.ffUnqueue('Puka Nacua', 500));")[0]
        self.assertEqual(r["removed"], False)
        self.assertEqual(r["reason"], "not in the queue")
        self.assertEqual(r["queue"], ["Jahmyr Gibbs"])

    def test_it_folds_apostrophes_the_same_way_the_player_list_does(self):
        r = self._run(["Ja’Marr Chase"],
                      "console.log(await window.ffUnqueue(\"Ja'Marr Chase\", 500));")[0]
        self.assertEqual(r["removed"], True)

    def test_duplicate_names_refuse_rather_than_removing_one_at_random(self):
        r = self._run(["Josh Allen", "Josh Allen"],
                      "console.log(await window.ffUnqueue('Josh Allen', 500));")[0]
        self.assertEqual(r["removed"], False)
        self.assertIn("refusing", r["reason"])

    def test_a_dead_remove_click_is_not_reported_as_a_removal(self):
        r = self._run(["Jahmyr Gibbs", "Bijan Robinson"],
                      "console.log(await window.ffUnqueue('Bijan Robinson', 300));",
                      deadRemove=True)[0]
        self.assertEqual(r["removed"], False)
        self.assertIn("did not move", r["reason"])


class TestTheUnqueueOracle(unittest.TestCase):
    def _v(self, before, after):
        b = {"count": before[0], "empty": before[1]}
        a = {"count": after[0], "empty": after[1]}
        return json.loads(run_node(
            f"console.log(JSON.stringify(window.ffUnqueueVerdict({json.dumps(b)}, {json.dumps(a)})));"))

    def test_exactly_minus_one_verifies(self):
        self.assertTrue(self._v((3, False), (2, False))["verified"])

    def test_no_movement_is_a_failure(self):
        self.assertFalse(self._v((3, False), (3, False))["verified"])

    def test_a_drop_of_two_refuses_to_take_credit(self):
        self.assertFalse(self._v((3, False), (1, False))["verified"])

    def test_an_increase_is_never_a_removal(self):
        self.assertFalse(self._v((3, False), (4, False))["verified"])

    def test_an_unreadable_count_refuses(self):
        self.assertFalse(self._v((None, False), (None, False))["verified"])


START_ROOM = r"""
function buildStartRoom({ href, hasButton = true, label = 'START DRAFT', clickThrows = false,
                          priorConfirm = 'native', extraButton = false }) {
  const state = { clicks: 0, confirmDuringClick: null };
  const mk = (text) => ({
    _text: text,
    childNodes: [{ nodeType: 3, textContent: text }],
    click() {
      state.clicks += 1;
      // Snapshot what window.confirm answers AT CLICK TIME -- that is the property under test.
      state.confirmDuringClick = window.confirm('Are you sure you want to start the draft?');
      if (clickThrows) throw new Error('the room blew up mid-click');
    },
  });
  const els = hasButton ? [mk(label)] : [];
  if (extraButton) els.push(mk(label));
  els.push(mk('Some other control'));
  globalThis.location = { href };
  globalThis.document = { querySelectorAll: () => els };
  if (priorConfirm === 'native') { try { delete window.confirm; } catch (e) {} }
  else { window.confirm = priorConfirm; }
  return state;
}
"""


class TestStartDraftAnswersTheDialogAndPutsItBack(unittest.TestCase):
    """The runbook said a human must click START; TODO said it was solved. Neither was executable,
    so the disagreement could not be settled by running anything. These settle it."""

    MOCK = "https://sleeper.com/draft/nfl/1390923383440424960"
    REAL = "https://sleeper.com/draft/nfl/1390509994847240192"

    def _run(self, opts, call="{ iAmInAMock: true }", tail=""):
        out = run_node(START_ROOM + f"""
        const st = buildStartRoom({json.dumps(opts)});
        window.ffStartDraft({call}).then(r => {{
          console.log(r);
          console.log(JSON.stringify({{ clicks: st.clicks,
                                        confirmDuringClick: st.confirmDuringClick,
                                        confirmIsOwnPropAfter:
                                          Object.prototype.hasOwnProperty.call(window, 'confirm'),
                                        {tail} }}));
        }});
        """).splitlines()
        return json.loads(out[0]), json.loads(out[1])

    def test_the_confirm_is_answered_true_while_the_click_happens(self):
        r, st = self._run({"href": self.MOCK})
        self.assertEqual(r["clicked"], True)
        self.assertEqual(r["confirmsAnswered"], 1)
        self.assertEqual(st["confirmDuringClick"], True)

    def test_the_override_is_GONE_afterwards(self):
        """The safety property. An auto-accept hook left armed silently accepts the next
        destructive dialog, and nothing reports it."""
        _, st = self._run({"href": self.MOCK})
        self.assertFalse(st["confirmIsOwnPropAfter"])

    def test_it_is_restored_even_when_the_click_throws(self):
        out = run_node(START_ROOM + f"""
        buildStartRoom({json.dumps({"href": MOCK_URL, "clickThrows": True})});
        window.ffStartDraft({{ iAmInAMock: true }})
          .catch(() => {{}})
          .then(() => console.log(JSON.stringify(
            {{ armed: Object.prototype.hasOwnProperty.call(window, 'confirm') }})));
        """)
        self.assertFalse(json.loads(out)["armed"], "a thrown click left the override installed")

    def test_a_caller_who_already_had_a_confirm_gets_THEIRS_back(self):
        """Restoring 'the native one' is not the same as restoring what was there."""
        out = run_node(START_ROOM + f"""
        window.__sentinel = 0;
        buildStartRoom({json.dumps({"href": MOCK_URL})});
        window.confirm = () => {{ window.__sentinel = 42; return false; }};
        window.ffStartDraft({{ iAmInAMock: true }}).then(() => {{
          window.confirm('probe');
          console.log(JSON.stringify({{ sentinel: window.__sentinel }}));
        }});
        """)
        self.assertEqual(json.loads(out)["sentinel"], 42)

    def test_it_refuses_on_the_real_draft(self):
        r, st = self._run({"href": self.REAL})
        self.assertEqual(r["started"], False)
        self.assertIn("REAL draft", r["reason"])
        self.assertEqual(st["clicks"], 0)

    def test_it_refuses_without_the_explicit_flag(self):
        """Guard 2 (the draft id) goes stale if the draft is ever re-created. Guard 1 does not."""
        for call in ("{}", "undefined", "{ iAmInAMock: 'yes' }"):
            with self.subTest(call=call):
                r, st = self._run({"href": self.MOCK}, call=call)
                self.assertEqual(r["started"], False)
                self.assertEqual(st["clicks"], 0)

    def test_two_start_controls_refuse_rather_than_pick_one(self):
        r, st = self._run({"href": self.MOCK, "extraButton": True})
        self.assertIn("refusing", r["reason"])
        self.assertEqual(st["clicks"], 0)

    def test_no_start_control_is_a_clean_refusal(self):
        r, _ = self._run({"href": self.MOCK, "hasButton": False})
        self.assertIn("no \"START DRAFT\" control", r["reason"])

    def test_it_reports_a_click_not_a_started_draft(self):
        """Same rule as ffDraft: the browser cannot be the oracle for its own action."""
        r, _ = self._run({"href": self.MOCK})
        self.assertEqual(r["started"], False)
        self.assertIn("status left pre_draft", r["note"])


MOCK_URL = "https://sleeper.com/draft/nfl/1390923383440424960"


class TestTheDefectCannotComeBackTextually(unittest.TestCase):
    """test_board_live.py's shape: assert the named defect is absent from the emitted source."""

    def test_the_stripper_actually_strips(self):
        """Positive control (insight 008): a stripper that silently returned everything would make
        every assertion below vacuously... fail, and one that returned nothing would make them all
        pass. Prove it removes prose and keeps code before trusting either."""
        code = code_only(read_console())
        self.assertNotIn("the browser as oracle for its own action", code)   # prose is gone
        self.assertIn("function queueVerdict(before, after)", code)          # code survived

    def test_the_old_inline_verdict_is_gone_from_the_code(self):
        self.assertNotIn("before !== after", code_only(read_console()))
        # ...and is still WRITTEN DOWN in the comments, which is the only reason it stays fixed.
        self.assertIn("before !== after", read_console())

    def test_ff_queue_does_not_sleep_a_fixed_interval(self):
        """The file's own locate() comment condemns this, and ffQueue did it anyway."""
        self.assertNotIn("setTimeout(z, 1200)", code_only(read_console()))

    def test_ff_queue_delegates_to_the_named_oracle(self):
        """Insight 013 as a textual backstop to the call-site tests: if someone inlines a verdict
        into ffQueue again, the delegation disappears."""
        code = code_only(read_console())
        body = code[code.index("window.ffQueue ="):code.index("window.ffQueueVerdict")]
        self.assertIn("pollQueueVerdict(before, budgetMs)", body)

    def test_the_queue_icon_is_still_matched_by_src_not_geometry(self):
        self.assertIn('img[src*="queue.png"]', code_only(read_console()))

    def test_the_star_is_never_treated_as_the_queue(self):
        src = read_console()
        self.assertNotIn('querySelector(\'img[src*="icon_watch_player', src)
        self.assertNotIn('querySelector("img[src*=\\"icon_watch_player', src)


if __name__ == "__main__":
    unittest.main()

/* Sleeper draft-room control, for driving a pick from the console instead of by pixel.
 *
 * WHY THIS EXISTS. Screenshot pixels are not CSS pixels in this draft room and the mapping
 * drifts between captures -- measured 2026-08-09: viewport 1536x791 CSS, successive screenshots
 * 1568x750 and 1522x784, and a player row that sat at CSS y=544 appeared at y=562. An 18px error
 * is enough to miss a 26px-tall row. That cost a real pick during a live mock (Trey McBride, 2.6).
 * Everything below addresses the DOM directly, so no coordinate is ever derived from an image.
 *
 * THE LIST IS VIRTUALISED. The scroll container is ~98,000px tall and only ~53 name cells are in
 * the DOM at once, so most players cannot be found by querying for them. The search box is not a
 * convenience, it is the only way to reach anyone deep in the list -- which is why ffDraft()
 * drives the search rather than scanning.
 *
 * NEVER TYPE INTO THE SEARCH BOX WITH KEYSTROKES BETWEEN JS CALLS. Executing JS moves focus, so an
 * interleaved "press ctrl+u, type, then run JS" sequence silently lands the keystrokes nowhere --
 * observed, the box read empty afterwards. Set the value through React's own setter instead.
 *
 * Usage:
 *   ffFind('Justin Jefferson')    -> what WOULD be drafted; touches nothing. Always run this first.
 *   ffDraft('Justin Jefferson')   -> actually drafts him. Reports a CLICK, never a PICK.
 *   ffQueue('Justin Jefferson')   -> adds him to the queue, verified by the count incrementing.
 *   ffQueueList()                 -> the queue IN ORDER; document order == visual order.
 *   ffUnqueue('Justin Jefferson') -> removes him, verified by the count going DOWN by one.
 *   ffStartDraft({iAmInAMock:true}) -> answers the START DRAFT native confirm. Two guards; see below.
 *
 * ⚠️ THIS HEADER SAID "ffQueueList/ffUnqueue NOT BUILT YET" FOR A WHOLE SESSION AFTER THEY SHIPPED,
 * and the stale claim sat six lines above the working code. It is the same defect as the START
 * DRAFT entry that TODO.md and the runbook disagreed about: a file's own prose outranking its own
 * contents in a reader's head. If you add a control here, add it to this list in the same edit.
 *
 * PROVEN IN A LIVE ROOM 2026-08-09 (mock 1392338436949561355, created and started from this file):
 * ffStartDraft returned confirmsAnswered:1 with window.confirm restored to the same native
 * function object; three ffQueue adds verified empty->1->2->3; ffQueueList agreed with the tab
 * count; and with the queue loaded, auto-pick took OUR queue-top (Ja'Marr Chase) at pick #5 on our
 * seat, then fell back to Sleeper's board once the queue drained. The API was the oracle for all
 * of it -- see the warning on ffDraft.
 */
(function () {
  const NAME_MIN_W = 60, NAME_MAX_W = 220, ROW_MIN_W = 600;

  function ownText(el) {
    return [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  }

  function setSearch(text) {
    const input = document.querySelector('input[placeholder*="Find player"]');
    if (!input) throw new Error('search box not found -- is this a draft room?');
    // React tracks the last value it set and swallows a plain `input.value = x`. Going through the
    // prototype's native setter is what makes React see the change.
    const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    native.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  }

  function nameCells() {
    const grid = document.querySelector('[role="grid"]');
    if (!grid) throw new Error('player grid not found');
    return [...grid.querySelectorAll('*')].filter(el => {
      const t = ownText(el), r = el.getBoundingClientRect();
      return t && r.width > NAME_MIN_W && r.width < NAME_MAX_W && r.height > 15 && r.height < 40
             && /[A-Za-z]/.test(t) && t.split(' ').length >= 2;
    });
  }

  function rowOf(cell) {
    let row = cell;
    while (row && row.getBoundingClientRect().width < ROW_MIN_W) row = row.parentElement;
    if (!row) throw new Error('could not walk up to a row from the name cell');
    return row;
  }

  // The draft control is the row's leftmost cell: ~34px wide, holds an svg, carries no text.
  // Identified structurally rather than by position on screen.
  function draftButton(row) {
    const first = row.children[0];
    if (!first) return null;
    const r = first.getBoundingClientRect();
    const ok = r.width < 60 && first.querySelectorAll('svg').length > 0 && !ownText(first);
    return ok ? first : null;
  }

  // Sleeper renders Ja'Marr with a different apostrophe than our board stores. Fold them, or an
  // exact match refuses a player who is sitting right there.
  function norm(s) {
    return s.trim().toLowerCase().replace(/[‘’ʼ`']/g, "'").replace(/\s+/g, ' ');
  }

  // POLL, never sleep a fixed interval. A flat 700ms wait returned "no exact match" while the
  // virtual list was still re-rendering -- measured, and it reads identically to "that player is
  // already gone", which is the worst way to be wrong on a clock. Polling found him in 219ms.
  async function locate(playerName, budgetMs = 4000) {
    setSearch(playerName);
    const want = norm(playerName);
    const t0 = Date.now();
    let seen = [];

    while (Date.now() - t0 < budgetMs) {
      const cells = nameCells();
      seen = cells.map(ownText);
      // EXACT match only. A substring match already picked the wrong man once: 'Chase' matches
      // both Ja'Marr Chase and Chase Brown. Drafting the wrong player cannot be undone, so
      // ambiguity is a refusal, never a best guess.
      const exact = cells.filter(c => norm(ownText(c)) === want);

      if (exact.length > 1) {
        return { ok: false, reason: `${exact.length} exact-name collisions -- refusing` };
      }
      if (exact.length === 1) {
        const row = rowOf(exact[0]);
        // The draft control is OPTIONAL here, deliberately. It used to be a refusal, which meant
        // locate() failed with "already drafted?" whenever the leftmost cell missed the shape test
        // -- and since ffQueue goes through locate() too, that refusal took the QUEUE down with it.
        // Queueing needs the row, not the draft button. Only ffDraft needs the button, and it is
        // the one that refuses now.
        // NOTE: the control is present whether or not it is our turn -- pre-draft it renders flat
        // and inert. Its presence therefore proves nothing about whether a click will pick. Only
        // /picks can say that. See the warning on ffDraft.
        const btn = draftButton(row);
        return { ok: true, player: ownText(exact[0]), waitedMs: Date.now() - t0, row, btn };
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return { ok: false, reason: `no exact match within ${budgetMs}ms`, sawInstead: seen.slice(0, 8) };
  }

  window.ffFind = async function (playerName) {
    const r = await locate(playerName);
    const { btn, row, ...rest } = r;                  // never hand the caller a live handle to click
    if (!r.ok) return JSON.stringify(rest);
    // `hasDraftControl` carries the signal the old refusal used to carry, without blocking a queue.
    // FALSE means the leftmost cell failed the shape test -- most often "he is already drafted".
    return JSON.stringify({ ...rest, hasDraftControl: !!btn });
  };

  /* ffDraft REPORTS A CLICK, NOT A PICK -- and the distinction is the whole point.
   *
   * An earlier version returned `drafted: true` straight after `btn.click()`. Measured 2026-08-09
   * on a live mock: it returned `{drafted: true, player: "Ja'Marr Chase"}` while the API showed
   * pick #3 in our own slot was Puka Nacua and Chase had gone to slot 4. The clock had expired
   * mid-debug, Sleeper auto-picked for us, and the click landed on a button in a row the virtual
   * list had not yet re-rendered. It reported success because it had successfully clicked
   * something. That is insight 007 -- presence is not health -- and on draft day it is the worst
   * possible lie, because it is calm and specific and wrong.
   *
   * THE BROWSER CANNOT BE THE ORACLE FOR ITS OWN ACTION. Confirm every pick against the API:
   *     python scripts/merge_picks.py <draft_id>      (busts the CDN cache; see insight 020)
   * and check that the player actually landed on OUR draft_slot. Until that comes back, the pick
   * is unconfirmed -- treat it exactly like a `picks.json` the engine refused.
   */
  /* 🚨 2026-08-14 — ffDraft's CLICK DID NOT DRAFT, AND ffDraft SAID `clicked: true`.
   *
   * First live exercise in this environment (Windows + Claude-in-Chrome) since the Cowork
   * migration. Mock 1394049093545758720, our seat 4, API confirming 3 picks in and #4 next.
   * ffFind located Ja'Marr Chase in 10ms with hasDraftControl:true. ffDraft returned
   * {clicked:true}. /picks, cache-busted, immediately after: STILL 3 PICKS. Nothing on slot 4.
   * What the click actually opened was the PLAYER-CARD MODAL.
   *
   * The element was right: DIV.draft-button-wrapper, 34x40, one svg, no own text -- exactly what
   * draftButton() tests for. The selector is fine; the ACTUATION is what is in doubt.
   *
   * THE CAUSE IS NOT SETTLED. Do not "fix" this function until it is. Two live candidates:
   *   (a) synthetic .click() does not actuate this build. Supporting: the modal's own `Cancel`
   *       was clicked the same way and the modal STAYED OPEN, while a real Escape keypress closed
   *       it. The runbook already records the AUTO-PICK toggle as immune to synthetic events. If
   *       this is the cause, ffQueue and ffUnqueue are affected too -- they also end in .click().
   *   (b) the button was inert because our CLOCK had not started yet. "Next pick is ours" and "our
   *       clock is live" are different instants, and locate()'s own note says the control renders
   *       either way. A click on an inert button plausibly falls through to the row, which is
   *       precisely what opens the player card.
   *
   * Settle it on a NO-LIMIT clock, with the room visibly on our pick for several seconds first,
   * trying a synthetic click and then a real ref-click. Full write-up: docs/insights/025.
   *
   * ⚠️ AND NOTE WHAT SAVED US: the confirm-against-/picks discipline below. It is not ceremony.
   * Chase DID end up on our slot at #4 via auto-pick, stamped with our own picked_by -- which
   * looks exactly like proof the click worked. Only the pick COUNT read immediately after the
   * click separates the two, so take that reading before the clock can expire.
   */
  window.ffDraft = async function (playerName) {
    const r = await locate(playerName);
    if (!r.ok) return JSON.stringify({ clicked: false, ...r, btn: undefined, row: undefined });
    // The refusal that used to live in locate() lives here, where it belongs: only drafting needs
    // the draft control. Same wording, so the operator sees no change.
    if (!r.btn) {
      return JSON.stringify({ clicked: false, player: r.player,
                              reason: 'no draft control on that row -- already drafted?' });
    }
    r.btn.click();
    return JSON.stringify({
      clicked: true,
      player: r.player,
      confirmed: false,
      note: 'CLICK ONLY -- confirm against /picks that this player is on our draft_slot',
    });
  };

  /* THE QUEUE -- THE MECHANISM IS PROVEN, THE ORACLE WAS NOT. 2026-08-09.
   *
   * Read that heading carefully, because the distinction cost us once already. What was proven in
   * a live room is that AUTO-PICK DRAINS YOUR QUEUE FIRST (the Cameron Dicker measurement below).
   * What was NOT proven -- and was in fact broken -- is this file's ability to tell you whether a
   * given player actually made it into the queue. See the oracle note above ffQueue.
   *
   * Three separate controls live in a player row and conflating them is easy:
   *   row.children[0]                      the green + . ⚠️ SEE THE WARNING BELOW -- this line
   *                                        used to read "DRAFTS immediately when on the clock"
   *                                        and that was FALSIFIED live on 2026-08-14.
   *   img[src*="icon_watch_player.png"]    the star. Watchlist, not queue.
   *   img[src*="queue.png"]                THE QUEUE BUTTON. A plain .click() works.
   *
   * Match on the image src, never on geometry: the star's box is 42x44 and the queue icon's is
   * 24x24, both inside row.children[2], so a size- or offset-based selector is the pixel problem
   * in a new hat.
   *
   * WHY THIS MATTERS MORE THAN ffDraft. Measured on a live no-time-limit mock: with ONLY Cameron
   * Dicker (K, ADP 172.2) in the queue, auto-pick spent PICK 1.3 on the kicker while Bijan
   * Robinson sat there and went 1.4. Once the queue emptied it reverted to Sleeper's own board
   * (Saquon 2.6, Rashee Rice 3.3). So:
   *
   *     AUTO-PICK DRAINS YOUR QUEUE FIRST, IN ORDER, AND ONLY THEN FALLS BACK TO SLEEPER'S RANKS.
   *
   * That inverts the clock. Miss a pick and Sleeper puts you on auto-pick for the REST of the
   * draft -- with a loaded queue that takes OUR next-best player, without one it takes theirs.
   * Keeping the queue stocked has no deadline, so the job stops being "click within 120 seconds"
   * (which was measurably lost once) and becomes "keep the queue correct". Sleeper even labels
   * the top queue entry "NEXT PICK".
   *
   * An earlier pass concluded this control "will not fire". That was wrong, and it was wrong
   * because the DETECTOR was broken, not the click -- a region-scoped DOM scan reported an empty
   * queue while Briggsy could see the player sitting in it. document.body.innerText is the
   * reliable read. When a human says they saw it work, believe the human and re-check the
   * instrument first.
   */
  /* THE ORACLE, AS A NAMED FUNCTION -- because buried in a click it was wrong and nobody could see it.
   *
   * The verdict used to be, inline:  queued: before !== after || label !== null
   * where before/after were "does the page say 'No players in your queue'". The moment the queue
   * holds anybody, before === after === false, so the whole verdict collapsed to `label !== null`
   * -- i.e. "is the string 'QUEUE (n)' rendered anywhere on the page". That is true whenever the
   * panel is open, so EVERY ADD AFTER THE FIRST reported queued:true unconditionally, click or no
   * click. And with the panel closed it reported queued:false on a SUCCESSFUL add. It was the exact
   * sin ffDraft spends fifteen lines warning about -- the browser as oracle for its own action --
   * reintroduced in the control we call the safety net.
   *
   * The only sound read is that the COUNT INCREMENTED BY ONE. Anything else refuses. A predicate
   * this load-bearing gets a name and a test, the way render_pdf.draws_vbd_chip() does; the cases
   * below run through node in tests/test_sleeper_draft_console.py.
   */
  function readQueue(bodyText) {
    const m = bodyText.match(/QUEUE \((\d+)\)/);
    return { count: m ? Number(m[1]) : null, empty: bodyText.includes('No players in your queue') };
  }

  function queueVerdict(before, after) {
    // An empty queue renders no "QUEUE (n)" string at all, so 0 -> 1 is the one transition where a
    // null count is still informative.
    if (before.empty && !after.empty && (after.count === null || after.count === 1)) {
      return { verified: true, reason: 'queue went empty -> 1' };
    }
    if (before.empty && after.empty) {
      return { verified: false, reason: 'queue still reads empty -- the click added nothing' };
    }
    if (before.count === null || after.count === null) {
      return { verified: false, reason: 'queue count unreadable -- cannot verify (is the queue panel open?)' };
    }
    if (after.count === before.count + 1) {
      return { verified: true, reason: `queue ${before.count} -> ${after.count}` };
    }
    if (after.count === before.count) {
      return { verified: false, reason: `queue count did not move (still ${before.count})` };
    }
    // Moved by something other than +1. Could be a race, could be a drain. Either way this call
    // cannot claim credit, and guessing is how the last oracle lied.
    return { verified: false,
             reason: `queue moved ${before.count} -> ${after.count}, not by one -- refusing to credit this click` };
  }

  // POLL for the increment. The old code slept a flat 1200ms and read once, which is the very
  // anti-pattern the comment on locate() condemns -- a slow re-render reads as a failed add.
  async function pollQueueVerdict(before, budgetMs = 4000) {
    const t0 = Date.now();
    let last = { verified: false, reason: 'no read taken' };
    while (Date.now() - t0 < budgetMs) {
      last = queueVerdict(before, readQueue(document.body.innerText));
      if (last.verified) return { ...last, waitedMs: Date.now() - t0 };
      await new Promise(z => setTimeout(z, 100));
    }
    return { ...last, waitedMs: Date.now() - t0, timedOut: true };
  }

  window.ffQueue = async function (playerName, budgetMs = 4000) {
    const r = await locate(playerName);
    if (!r.ok) return JSON.stringify({ queued: false, ...r, btn: undefined, row: undefined });
    const img = r.row.querySelector('img[src*="queue.png"]');
    if (!img) return JSON.stringify({ queued: false, player: r.player, reason: 'no queue icon in that row' });
    const before = readQueue(document.body.innerText);
    img.click();
    const v = await pollQueueVerdict(before, budgetMs);
    return JSON.stringify({
      queued: v.verified,
      player: r.player,
      reason: v.reason,
      queueCount: readQueue(document.body.innerText).count,
      waitedMs: v.waitedMs,
    });
  };

  /* READING AND UNSTACKING THE QUEUE -- measured in a live room 2026-08-09, not guessed.
   *
   * WHY IT MATTERS. Auto-pick drains the queue IN ORDER, so the draft-day job is "keep the queue
   * ranked", and until now this file could only ADD. You cannot rank a list you cannot read or
   * reorder, so the whole strategy rested on a control set that did not exist.
   *
   * WHAT THE ROOM ACTUALLY RENDERS (mock 1391539007871012864, pre-draft, 3 players queued):
   *   - each entry carries an element whose OWN TEXT is exactly "REMOVE"
   *   - two levels up from it is the entry row:
   *       "Jahmyr Gibbs | RB | DET | ADP | 1.6 | PTS | 331.4 | REMOVE"
   *   - document order == visual order, and Sleeper labels the first entry "NEXT PICK"
   *   - a queued player's row in the MAIN LIST loses its queue.png icon entirely, which is why
   *     ffQueue refuses a double-add at the icon guard rather than at the verdict
   *
   * The row is found by walking up from REMOVE until the first text line stops being a stat label,
   * NOT by a fixed hop count -- two levels is what this build renders and one wrapper div would
   * break it.
   */
  const STAT_LINE = /^(ADP|PTS|REMOVE|NEXT PICK)$/i;

  function queueEntries() {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      if (ownText(el).toUpperCase() !== 'REMOVE') continue;
      let row = el.parentElement, hops = 0;
      while (row && hops < 6) {
        const first = (row.innerText || '').split('\n')[0].trim();
        if (first && !STAT_LINE.test(first) && /[A-Za-z]/.test(first)) break;
        row = row.parentElement; hops++;
      }
      if (!row) continue;
      const lines = (row.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
      out.push({ name: lines[0], pos: lines[1] || null, team: lines[2] || null, remove: el });
    }
    return out;
  }

  window.ffQueueList = function () {
    const q = queueEntries();
    return JSON.stringify({
      count: readQueue(document.body.innerText).count,
      entries: q.map((e, i) => ({ slot: i + 1, name: e.name, pos: e.pos, team: e.team })),
      // The count comes from the tab label and the entries from the panel. If they disagree the
      // panel is mid-render or collapsed, and a caller ranking off a short list would silently
      // drop players -- so say so rather than returning the shorter one.
      agrees: readQueue(document.body.innerText).count === q.length || q.length === 0,
    });
  };

  // Removal is the mirror of the add: verified by the count going DOWN by exactly one.
  function unqueueVerdict(before, after) {
    if (before.count === 1 && after.empty) return { verified: true, reason: 'queue 1 -> empty' };
    if (before.count === null || after.count === null) {
      return { verified: false, reason: 'queue count unreadable -- cannot verify' };
    }
    if (after.count === before.count - 1) {
      return { verified: true, reason: `queue ${before.count} -> ${after.count}` };
    }
    if (after.count === before.count) {
      return { verified: false, reason: `queue count did not move (still ${before.count})` };
    }
    return { verified: false,
             reason: `queue moved ${before.count} -> ${after.count}, not by one -- refusing to credit this click` };
  }

  window.ffUnqueue = async function (playerName, budgetMs = 4000) {
    const want = norm(playerName);
    const hits = queueEntries().filter(e => norm(e.name) === want);
    if (hits.length > 1) {
      return JSON.stringify({ removed: false, reason: `${hits.length} queue entries named that -- refusing` });
    }
    if (!hits.length) {
      return JSON.stringify({ removed: false, reason: 'not in the queue',
                              queue: queueEntries().map(e => e.name) });
    }
    const before = readQueue(document.body.innerText);
    hits[0].remove.click();
    const t0 = Date.now();
    let last = { verified: false, reason: 'no read taken' };
    while (Date.now() - t0 < budgetMs) {
      last = unqueueVerdict(before, readQueue(document.body.innerText));
      if (last.verified) break;
      await new Promise(z => setTimeout(z, 100));
    }
    return JSON.stringify({ removed: last.verified, player: hits[0].name, reason: last.reason,
                            queueCount: readQueue(document.body.innerText).count,
                            waitedMs: Date.now() - t0 });
  };

  window.ffUnqueueVerdict = unqueueVerdict;

  /* ffStartDraft -- START DRAFT raises the room's one native dialog, and this is how we answer it.
   *
   * WHY THIS EXISTS AS CODE. The technique was worked out live on 2026-08-09 and then written down
   * in two places that disagreed: TODO.md said "SOLVED, mocks now run unattended", while
   * docs/draft-day-runbook.md still said "have Briggsy click START himself" -- an older line that
   * was never revisited. Neither was executable, so the disagreement could not be settled by
   * running anything. It can now.
   *
   * A native dialog FREEZES the extension: every command times out until a human dismisses it, and
   * it looks exactly like the bridge dying. So the confirm is neutralised BEFORE the click rather
   * than answered after it.
   *
   * THE RESTORE IS THE WHOLE SAFETY PROPERTY. An auto-accept-everything hook left armed on a page
   * will silently accept the next destructive dialog that comes along, and nothing will report it.
   * The restore therefore lives in a `finally` and puts back whatever was there before -- which is
   * not necessarily the native function, because a previous call may have left its own.
   *
   * TWO GUARDS, because "never run this on the real league" is not something to leave to memory:
   *   1. the caller must pass { iAmInAMock: true }, so it cannot be reached by a stray autocomplete
   *   2. it refuses outright on the real draft id
   * ⚠️ Guard 2 goes stale if the league's draft is ever re-created (watch_draft_state.py exists
   * because that happens). Guard 1 does not, which is why both are here rather than either alone.
   */
  const REAL_DRAFT_ID = '1390509994847240192';   // docs/league.md; re-check if the draft is recreated

  function startButton() {
    const wanted = 'start draft';
    const hits = [...document.querySelectorAll('button, div, span, a')].filter(
      el => ownText(el).toLowerCase() === wanted);
    if (hits.length > 1) return { err: `${hits.length} "START DRAFT" controls -- refusing` };
    if (!hits.length) return { err: 'no "START DRAFT" control on this page' };
    return { el: hits[0] };
  }

  window.ffStartDraft = async function (opts) {
    if (!opts || opts.iAmInAMock !== true) {
      return JSON.stringify({ started: false,
                              reason: 'refusing: call ffStartDraft({ iAmInAMock: true })' });
    }
    const url = String(location.href);
    if (url.includes(REAL_DRAFT_ID)) {
      return JSON.stringify({ started: false,
                              reason: `refusing: this is the REAL draft (${REAL_DRAFT_ID})` });
    }
    const found = startButton();
    if (found.err) return JSON.stringify({ started: false, reason: found.err });

    const had = Object.prototype.hasOwnProperty.call(window, 'confirm');
    const prior = window.confirm;
    let asked = 0;
    try {
      window.confirm = () => { asked += 1; return true; };
      found.el.click();
    } finally {
      // Put back exactly what was there, including "there was no own property".
      if (had) window.confirm = prior; else { try { delete window.confirm; } catch (e) { window.confirm = prior; } }
    }
    // Like ffDraft, this reports a CLICK. Whether the draft actually started is a question for
    // the API -- `status` flips pre_draft -> drafting on the draft object.
    return JSON.stringify({ clicked: true, confirmsAnswered: asked, started: false,
                            note: 'CLICK ONLY -- confirm via /draft/<id> that status left pre_draft' });
  };

  // Exported so the oracle can be tested without a browser, and so it can be exercised by hand in
  // the console while a mock is open.
  window.ffQueueVerdict = queueVerdict;
  window.ffReadQueue = readQueue;

  return 'ffFind(), ffDraft() and ffQueue() installed';
})();

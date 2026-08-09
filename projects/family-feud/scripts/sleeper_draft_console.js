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
 *   ffDraft('Justin Jefferson')   -> actually drafts him.
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
        const btn = draftButton(row);
        // NOTE: the control is present whether or not it is our turn -- pre-draft it renders flat
        // and inert. Its presence therefore proves nothing about whether a click will pick. Only
        // /picks can say that. See the warning on ffDraft.
        if (!btn) return { ok: false, reason: 'no draft control on that row -- already drafted?' };
        return { ok: true, player: ownText(exact[0]), waitedMs: Date.now() - t0, btn };
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return { ok: false, reason: `no exact match within ${budgetMs}ms`, sawInstead: seen.slice(0, 8) };
  }

  window.ffFind = async function (playerName) {
    const r = await locate(playerName);
    const { btn, ...rest } = r;                       // never hand the caller a live handle to click
    return JSON.stringify(rest);
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
  window.ffDraft = async function (playerName) {
    const r = await locate(playerName);
    if (!r.ok) return JSON.stringify({ clicked: false, ...r, btn: undefined });
    r.btn.click();
    return JSON.stringify({
      clicked: true,
      player: r.player,
      confirmed: false,
      note: 'CLICK ONLY -- confirm against /picks that this player is on our draft_slot',
    });
  };

  return 'ffFind() and ffDraft() installed';
})();

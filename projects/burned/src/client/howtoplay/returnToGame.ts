// Smart "back to the game" click handler. Used by both the top-of-page
// Back link and the bottom-of-page PlayCTA button.
//
// The brief is typically opened in a NEW TAB via target="_blank" from a
// game surface (Lobby, JoinScreen, GameTable). The cleanest UX is to
// close the brief tab — the user returns to their game/lobby tab with
// host session + player session intact. Navigating somewhere via href is
// wrong for two reasons:
//   1. In dev `/` 404s (Vite has no root index; Cloudflare Pages serves
//      the _redirects only in prod).
//   2. Even in prod the `_redirects` rule sends `/` to `/board.html` —
//      a phone reader who came from `/player.html?room=X` would land
//      on the host board view and lose their room context.
//
// For users who arrived at the brief directly (typed URL, bookmark) the
// tab DOES have history.length === 1 too. window.close() may be blocked
// by the browser in that case (only script-opened windows close cleanly
// in some browsers). If it stays open the back/CTA reads as inert — not
// great, but better than navigating to a 404 or to the wrong surface.
// The preventDefault keeps the href="/" from firing as a fallback, so
// middle-click / right-click "open in new tab" still works (they bypass
// onClick entirely and follow the href).
import type { MouseEvent } from 'react'

export function returnToGame(e: MouseEvent<HTMLAnchorElement>): void {
  e.preventDefault()
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.close()
}

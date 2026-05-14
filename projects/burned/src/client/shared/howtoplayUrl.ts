// Single source of truth for the HOW-TO-PLAY page URL. In dev Vite serves
// the file at /howtoplay.html; in prod Cloudflare Pages strips the .html.
// Surfaced from Lobby, JoinScreen (pre-join + joined-waiting), and the
// in-game GameTable case banner.
export const HOWTOPLAY_URL: string =
  import.meta.env.DEV ? '/howtoplay.html' : '/howtoplay'

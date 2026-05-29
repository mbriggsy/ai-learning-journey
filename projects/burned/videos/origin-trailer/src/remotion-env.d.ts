// Webpack asset-module imports. Remotion's bundler emits these as files and
// hands back a URL string usable in src props (Audio/Img). Lets trailer-OWN
// assets (VO master, generated stills) live in the trailer package instead of
// polluting the game's pinned publicDir (which ships with the Cloudflare build).
declare module '*.wav' {
  const src: string
  export default src
}

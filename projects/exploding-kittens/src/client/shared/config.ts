// In dev, derive server host from the page's hostname so phones on the LAN connect correctly.
// VITE_PARTYKIT_HOST overrides for production (e.g., "my-app.workers.dev").
export const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? `${window.location.hostname}:8787`

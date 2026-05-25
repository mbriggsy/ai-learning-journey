import type { MultiProjectReport } from '@/types'

// The fetch promise is created EAGERLY at module load (not lazily in render). React 19's
// use() warns "suspended by an uncached promise" if the promise is created during a render;
// creating it here — once, when this module is first imported, before any component renders —
// satisfies use()'s contract AND starts the fetch at app boot (earlier = faster first paint).
// LANDMINE: never call fetch() inside a component body — a new promise per render makes use()
// suspend forever. Always read through getStatsPromise(); recover via resetStatsPromise().
let statsPromise: Promise<MultiProjectReport> = load()

function load(): Promise<MultiProjectReport> {
  return fetch('/data/stats.json').then(async (res) => {
    if (!res.ok) throw new Error(`stats.json fetch failed: ${res.status} ${res.statusText}`)
    const data = (await res.json()) as MultiProjectReport
    // Shape assertion: a well-formed-but-wrong-shape payload (e.g. the dev SPA fallback serving
    // index.html as 200) would otherwise sail past use() and crash a consumer with NaN/undefined.
    // Route it to the error boundary instead.
    if (!data || typeof data.combined !== 'object' || !Array.isArray(data.projects)) {
      throw new Error('stats.json has an unexpected shape')
    }
    return data
  })
}

export function getStatsPromise(): Promise<MultiProjectReport> {
  return statsPromise
}

// The error boundary's "Try again" calls this to force a fresh fetch, then re-renders children
// → StatsProvider re-suspends on the new promise. Recreating eagerly here (not setting undefined)
// keeps use() from ever receiving a promise born during render — so the retry path is warning-free
// too, and a transient failure (deploy blip / offline / 404 mid-deploy) is recoverable without a
// hard reload.
export function resetStatsPromise(): void {
  statsPromise = load()
}

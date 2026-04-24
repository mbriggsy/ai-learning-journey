import { PROTOCOL_VERSION } from '@shared/protocol'
import { isPlaytestMode, type PlaytestEnv } from './playtest'

/**
 * Check whether the incoming request is a `GET /health` ping and, if so,
 * return the readiness JSON. Otherwise return `null` so the caller can
 * continue with partyserver routing.
 *
 * Lives outside `room.ts` because the Workers entry may only export the
 * `GameRoom` class (any additional named export crashes Wrangler at boot),
 * and because this way the route is importable into Vitest-Node tests
 * without dragging the `cloudflare:` module scheme through the loader.
 *
 * The response carries no secrets — `playtest: boolean` informs ops /
 * harness tooling whether the Worker was booted with `PLAYTEST_MODE=1`
 * and is intentionally visible in all builds. A production deployment
 * that accidentally shipped `PLAYTEST_MODE=1` would surface here, which
 * is the desired failure-loud behavior.
 */
export function handleHealthRequest(request: Request, env: PlaytestEnv): Response | null {
  if (request.method !== 'GET') return null
  const url = new URL(request.url)
  if (url.pathname !== '/health') return null
  return new Response(
    JSON.stringify({ ok: true, playtest: isPlaytestMode(env), version: PROTOCOL_VERSION }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

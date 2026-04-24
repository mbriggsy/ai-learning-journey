import { describe, expect, it } from 'vitest'
import { PROTOCOL_VERSION } from '@shared/protocol'
import { handleHealthRequest } from './health'
import type { PlaytestEnv } from './playtest'

function env(overrides: Partial<PlaytestEnv> = {}): PlaytestEnv {
  return { PLAYTEST_MODE: undefined, PLAYTEST_TOKEN: undefined, PLAYTEST_GOD_ORIGINS: undefined, ...overrides }
}

interface HealthBody { ok: boolean; playtest: boolean; version: number }
async function parseBody(res: Response): Promise<HealthBody> {
  return (await res.json()) as HealthBody
}

function req(method: string, path: string): Request {
  return new Request(`http://example.test${path}`, { method })
}

describe('handleHealthRequest', () => {
  it('GET /health returns 200 + JSON with playtest:false when PLAYTEST_MODE unset', async () => {
    const res = handleHealthRequest(req('GET', '/health'), env())
    expect(res).not.toBeNull()
    expect(res!.status).toBe(200)
    expect(res!.headers.get('content-type')).toBe('application/json')
    expect(await parseBody(res!)).toEqual({ ok: true, playtest: false, version: PROTOCOL_VERSION })
  })

  it('GET /health with PLAYTEST_MODE="1" reports playtest:true', async () => {
    const res = handleHealthRequest(req('GET', '/health'), env({ PLAYTEST_MODE: '1' }))
    expect((await parseBody(res!)).playtest).toBe(true)
  })

  it('GET /health with non-"1" PLAYTEST_MODE values reports playtest:false', async () => {
    for (const val of ['0', 'true', 'yes', '']) {
      const res = handleHealthRequest(req('GET', '/health'), env({ PLAYTEST_MODE: val }))
      expect((await parseBody(res!)).playtest).toBe(false)
    }
  })

  it('POST /health returns null (method-gated, falls through)', () => {
    expect(handleHealthRequest(req('POST', '/health'), env())).toBeNull()
  })

  it('PUT / DELETE / PATCH /health all fall through', () => {
    for (const method of ['PUT', 'DELETE', 'PATCH']) {
      expect(handleHealthRequest(req(method, '/health'), env())).toBeNull()
    }
  })

  it('GET /healthcheck falls through (exact pathname, not prefix)', () => {
    expect(handleHealthRequest(req('GET', '/healthcheck'), env())).toBeNull()
  })

  it('GET /health/foo falls through', () => {
    expect(handleHealthRequest(req('GET', '/health/foo'), env())).toBeNull()
  })

  it('GET / falls through', () => {
    expect(handleHealthRequest(req('GET', '/'), env())).toBeNull()
  })

  it('response body is valid JSON with the exact contract shape', async () => {
    const res = handleHealthRequest(req('GET', '/health'), env())
    const body = await parseBody(res!)
    expect(Object.keys(body as unknown as Record<string, unknown>).sort()).toEqual(['ok', 'playtest', 'version'])
    expect(typeof body.ok).toBe('boolean')
    expect(typeof body.playtest).toBe('boolean')
    expect(typeof body.version).toBe('number')
  })
})

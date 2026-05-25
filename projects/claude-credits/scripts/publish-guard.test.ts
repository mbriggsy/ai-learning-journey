import { describe, it, expect } from 'vitest'
import { assertPublishSafe } from './publish-guard.js'
import { stableStringify } from './stable-stringify.js'

describe('assertPublishSafe — HARD path/PII patterns (scanned everywhere)', () => {
  it('passes clean stats-like data', () => {
    expect(() =>
      assertPublishSafe({
        combined: { totalTokensProcessed: 1234, tokenWindowStartISO: '2026-05-01T00:00:00Z' },
        projects: [{ projectName: 'burned', editorial: { liveUrl: 'https://burned.vercel.app' } }],
      }),
    ).not.toThrow()
  })
  it('catches a Windows path', () => expect(() => assertPublishSafe({ a: 'C:\\Users\\brigg\\x' })).toThrow(/win-abs/))
  it('catches a forward-slash Windows path', () =>
    expect(() => assertPublishSafe({ a: 'C:/Users/x' })).toThrow(/win-abs-forwardslash/))
  it('catches a POSIX home path', () => expect(() => assertPublishSafe({ a: '/Users/brigg/x' })).toThrow(/posix-home/))
  it('catches a Linux home path (CI runner)', () =>
    expect(() => assertPublishSafe({ a: '/home/runner/x' })).toThrow(/linux-home/))
  it('catches a drive-letter slug', () => expect(() => assertPublishSafe(['C--Users-foo'])).toThrow(/drive-letter/))
  it('catches a UUID', () =>
    expect(() => assertPublishSafe({ id: '550e8400-e29b-41d4-a716-446655440000' })).toThrow(/uuid/))
  it('catches a path even INSIDE editorial (HARD applies everywhere)', () =>
    expect(() => assertPublishSafe({ projects: [{ editorial: { description: 'see C:\\Users\\brigg' } }] })).toThrow(
      /win-abs/,
    ))
  it('reports the path of the offending leaf', () =>
    expect(() => assertPublishSafe({ projects: [{ p: 'C:/x' }] })).toThrow(/\$\.projects\[0\]\.p/))
  it('ignores forbidden patterns in KEYS, only checks VALUES', () =>
    expect(() => assertPublishSafe({ 'C:\\fake-key': 'clean value' })).not.toThrow())
})

describe('assertPublishSafe — SECRET key-shape patterns (scanned everywhere, no carve-out)', () => {
  it('catches an Anthropic key', () =>
    expect(() => assertPublishSafe({ k: 'sk-ant-api03-abcdefghij1234567890abcdefghij' })).toThrow(/anthropic-key/))
  it('catches an OpenAI key', () =>
    expect(() => assertPublishSafe({ k: 'sk-proj-abcdefghijklmnop1234567890' })).toThrow(/openai-key/))
  it('catches a Google/Gemini key', () =>
    expect(() => assertPublishSafe({ k: 'AIzaSyBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' })).toThrow(/google-api-key/))
  it('catches a GitHub token', () =>
    expect(() => assertPublishSafe({ k: 'ghp_abcdefghij1234567890ABCD' })).toThrow(/github-token/))
  it('catches an AWS access key', () => expect(() => assertPublishSafe({ k: 'AKIAIOSFODNN7EXAMPLE' })).toThrow(/aws-access-key/))
  it('catches a Slack token', () => expect(() => assertPublishSafe({ k: 'xoxb-1234567890-abcdefABCDEF' })).toThrow(/slack-token/))
  it('catches a PEM private-key block', () =>
    expect(() => assertPublishSafe({ k: '-----BEGIN RSA PRIVATE KEY-----' })).toThrow(/pem-private-key/))
})

describe('assertPublishSafe — author-controlled editorial copy passes (no word-list)', () => {
  // The english-word list was dropped (ATC) — so the author's own name, words like
  // "secret"/"password", and an SSH repoUrl pass cleanly: none match a key-shape.
  it('allows the author name in editorial copy', () =>
    expect(() => assertPublishSafe({ projects: [{ editorial: { description: 'Built by Briggsy.' } }] })).not.toThrow())
  it('allows "secret"/"password" words in an editorial blurb', () =>
    expect(() =>
      assertPublishSafe({ projects: [{ editorial: { oneLiner: 'the secret sauce, no shared passwords' } }] }),
    ).not.toThrow())
  it('allows an SSH-style repoUrl (@) in editorial', () =>
    expect(() =>
      assertPublishSafe({ projects: [{ editorial: { repoUrl: 'git@github.com:mbriggsy/x.git' } }] }),
    ).not.toThrow())
  it('allows a plain email-shaped string (email pattern dropped)', () =>
    expect(() => assertPublishSafe({ projects: [{ editorial: { contact: 'hi@example.com' } }] })).not.toThrow())
})

describe('stableStringify', () => {
  it('is key-order-independent (deterministic)', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }))
  })
  it('preserves array order (ordered data must not be sorted)', () => {
    expect(JSON.parse(stableStringify({ xs: [3, 1, 2] })).xs).toEqual([3, 1, 2])
  })
})

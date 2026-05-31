import { describe, expect, it } from 'vitest'

import { parseXBasicHeader } from '../../src/auth'

describe('xBasic authorization parsing', () => {
  it('parses Reposilite-style xBasic credentials', () => {
    expect(parseXBasicHeader(`xBasic ${btoa('publisher:secret')}`)).toEqual({
      name: 'publisher',
      secret: 'secret',
    })
  })

  it('accepts scheme casing and secrets containing colons', () => {
    expect(parseXBasicHeader(`XBASIC ${btoa('publisher:sec:ret')}`)).toEqual({
      name: 'publisher',
      secret: 'sec:ret',
    })
  })

  it('rejects malformed authorization headers', () => {
    expect(parseXBasicHeader('Bearer token')).toBeNull()
    expect(parseXBasicHeader('xBasic')).toBeNull()
    expect(parseXBasicHeader('xBasic not-base64')).toBeNull()
    expect(parseXBasicHeader(`xBasic ${btoa('missing-colon')}`)).toBeNull()
  })

  it('rejects empty or whitespace-only headers', () => {
    expect(parseXBasicHeader('')).toBeNull()
    expect(parseXBasicHeader('   ')).toBeNull()
  })

  it('handles header with leading and trailing whitespace', () => {
    expect(parseXBasicHeader(`  xBasic ${btoa('user:pass')}  `)).toEqual({
      name: 'user',
      secret: 'pass',
    })
  })

  it('returns null for undefined header (header missing)', () => {
    expect(parseXBasicHeader(undefined as unknown as string)).toBeNull()
  })

  it('rejects xBasic header with extra tokens after encoded credentials', () => {
    expect(parseXBasicHeader(`xBasic ${btoa('user:pass')} extra data`)).toEqual({
      name: 'user',
      secret: 'pass',
    })
  })

  it('rejects base64 with empty credential string', () => {
    expect(parseXBasicHeader(`xBasic ${btoa('')}`)).toBeNull()
  })

  it('handles names with special characters', () => {
    expect(parseXBasicHeader(`xBasic ${btoa('user@example.com:pass')}`)).toEqual({
      name: 'user@example.com',
      secret: 'pass',
    })
  })
})

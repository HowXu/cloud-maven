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
})

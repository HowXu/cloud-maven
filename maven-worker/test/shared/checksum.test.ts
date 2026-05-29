import { describe, expect, it } from 'vitest'

import { md5Hex, sha1Hex } from '../../src/shared'

const bytes = (value: string): ArrayBuffer => {
  const encoded = new TextEncoder().encode(value)
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
}

describe('checksum helpers', () => {
  it('generates SHA-1 hex digests through Web Crypto', async () => {
    await expect(sha1Hex(bytes('abc'))).resolves.toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })

  it('generates MD5 hex digests without relying on unsupported Worker Web Crypto algorithms', () => {
    expect(md5Hex(bytes('abc'))).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(md5Hex(bytes(''))).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
})

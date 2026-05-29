const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')

export async function sha1Hex(source: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', source.slice(0))
  return toHex(new Uint8Array(digest))
}

const rotateLeft = (value: number, shift: number): number =>
  (value << shift) | (value >>> (32 - shift))

const md5ShiftAmounts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

const md5Constants = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0
)

const wordToLittleEndianHex = (word: number): string => {
  const bytes = new Uint8Array(4)
  bytes[0] = word & 0xff
  bytes[1] = (word >>> 8) & 0xff
  bytes[2] = (word >>> 16) & 0xff
  bytes[3] = (word >>> 24) & 0xff
  return toHex(bytes)
}

export function md5Hex(source: ArrayBuffer): string {
  const input = new Uint8Array(source)
  const paddedLength = (((input.length + 8) >>> 6) + 1) << 6
  const padded = new Uint8Array(paddedLength)
  padded.set(input)
  padded[input.length] = 0x80

  const bitLengthLow = (input.length << 3) >>> 0
  const bitLengthHigh = Math.floor(input.length / 0x20000000) >>> 0
  const lengthOffset = paddedLength - 8

  padded[lengthOffset] = bitLengthLow & 0xff
  padded[lengthOffset + 1] = (bitLengthLow >>> 8) & 0xff
  padded[lengthOffset + 2] = (bitLengthLow >>> 16) & 0xff
  padded[lengthOffset + 3] = (bitLengthLow >>> 24) & 0xff
  padded[lengthOffset + 4] = bitLengthHigh & 0xff
  padded[lengthOffset + 5] = (bitLengthHigh >>> 8) & 0xff
  padded[lengthOffset + 6] = (bitLengthHigh >>> 16) & 0xff
  padded[lengthOffset + 7] = (bitLengthHigh >>> 24) & 0xff

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Array<number>(16)
    for (let index = 0; index < 16; index++) {
      const wordOffset = offset + index * 4
      words[index] = (
        padded[wordOffset]
        | (padded[wordOffset + 1] << 8)
        | (padded[wordOffset + 2] << 16)
        | (padded[wordOffset + 3] << 24)
      ) >>> 0
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index++) {
      let f: number
      let g: number

      if (index < 16) {
        f = (b & c) | (~b & d)
        g = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        g = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        g = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * index) % 16
      }

      const nextD = d
      d = c
      c = b
      b = (b + rotateLeft((a + f + md5Constants[index] + words[g]) >>> 0, md5ShiftAmounts[index])) >>> 0
      a = nextD
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return [
    wordToLittleEndianHex(a0),
    wordToLittleEndianHex(b0),
    wordToLittleEndianHex(c0),
    wordToLittleEndianHex(d0),
  ].join('')
}

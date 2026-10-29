// Rendert de idle-wereld naar een PNG, om pixelart te bekijken zonder browser.
// Gebruik: node scripts/idle-preview.ts <out.png> [seconden] [breedte] [hoogte] [schaal]
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { World, type FieldToken } from '../src/idle/world.ts'

const [file = 'idle-preview.png', seconds = '4', w = '270', h = '125', scale = '3'] = process.argv.slice(2)
const W = Number(w)
const H = Number(h)
const S = Number(scale)

const token = (tokenId: string, n: number, extra: Partial<FieldToken> = {}): FieldToken => ({
  uid: `${tokenId}-${n}`,
  tokenId,
  tapped: false,
  sick: false,
  counters: 0,
  ...extra,
})

const field: FieldToken[] = [
  token('bird-landfall', 1),
  token('bird-landfall', 2, { counters: 2 }),
  token('bird-flying', 1),
  token('bird-flying', 2),
  token('knight', 1, { sick: true }),
  token('knight', 2, { tapped: true }),
  token('hero', 1),
  token('eldrazi-scion', 1),
  token('eldrazi-scion', 2, { sick: true, counters: 1 }),
  token('phyrexian-germ', 1, { counters: 3 }),
  token('copy', 1),
  token('treasure', 1),
  token('treasure', 2, { tapped: true }),
  token('clue', 1),
  token('lander', 1),
]

const world = new World(W, H)
world.sync(field)
for (let i = 0; i < Number(seconds) * 30; i++) world.tick(1 / 30)
const out = new Uint32Array(W * H)
world.render(out)
const src = new Uint8Array(out.buffer)

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const OW = W * S
const OH = H * S
const raw = Buffer.alloc((OW * 4 + 1) * OH)
for (let y = 0; y < OH; y++) {
  const row = y * (OW * 4 + 1)
  for (let x = 0; x < OW; x++) {
    const si = (Math.floor(y / S) * W + Math.floor(x / S)) * 4
    raw.set(src.subarray(si, si + 4), row + 1 + x * 4)
  }
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(OW, 0)
ihdr.writeUInt32BE(OH, 4)
ihdr.set([8, 6, 0, 0, 0], 8)
writeFileSync(
  file,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]),
)
console.log(`${file}: ${W}x${H} @${S}x, t=${seconds}s, ${world.entities.size} entities`)

// NES (2C02) palette, common emulator approximation. Array index = NES colour number.
export const NES_RGB: readonly number[] = [
  0x7c7c7c, 0x0000fc, 0x0000bc, 0x4428bc, 0x940084, 0xa80020, 0xa81000, 0x881400,
  0x503000, 0x007800, 0x006800, 0x005800, 0x004058, 0x000000, 0x000000, 0x000000,
  0xbcbcbc, 0x0078f8, 0x0058f8, 0x6844fc, 0xd800cc, 0xe40058, 0xf83800, 0xe45c10,
  0xac7c00, 0x00b800, 0x00a800, 0x00a844, 0x008888, 0x000000, 0x000000, 0x000000,
  0xf8f8f8, 0x3cbcfc, 0x6888fc, 0x9878f8, 0xf878f8, 0xf85898, 0xf87858, 0xfca044,
  0xf8b800, 0xb8f818, 0x58d854, 0x58f898, 0x00e8d8, 0x787878, 0x000000, 0x000000,
  0xfcfcfc, 0xa4e4fc, 0xb8b8f8, 0xd8b8f8, 0xf8b8f8, 0xf8a4c0, 0xf0d0b0, 0xfce0a8,
  0xf8d878, 0xd8f878, 0xb8f8b8, 0xb8f8d8, 0x00fcfc, 0xf8d8f8, 0x000000, 0x000000,
]

export const BLACK = 0x0f
export const WHITE_COLOR = 0x30
// Placeholder for the sky; resolved to the current time-of-day colour when the frame is output.
export const SKY = 64
export const TRANSPARENT = 255

// One step darker within the same hue, the classic NES fade.
export function darken(i: number): number {
  if (i >= 64) return i
  return i >= 0x10 ? i - 0x10 : BLACK
}

// Lookup tables used while blitting: remap[colour] = colour to draw.
export type Remap = Uint8Array

function makeRemap(fn: (i: number) => number): Remap {
  const table = new Uint8Array(256)
  for (let i = 0; i < 256; i++) table[i] = i >= 64 ? i : fn(i)
  return table
}

export const IDENTITY = makeRemap((i) => i)
export const DARKEN = makeRemap(darken)
export const DARKEN2 = makeRemap((i) => darken(darken(i)))
export const SILHOUETTE = makeRemap(() => WHITE_COLOR)

// Night scenery, hand-picked: a plain darken step turns tan paths orange and keeps hills bright.
const NIGHT_MAP: Record<number, number> = {
  0x39: 0x1a, // pale grass specks
  0x2a: 0x0a, // hills, light grass
  0x1a: 0x0b, // grass
  0x0a: 0x0f, // dark green
  0x37: 0x08, // path
  0x27: 0x07,
  0x17: 0x0f,
  0x07: 0x08, // tree trunk
  0x11: 0x02, // water
  0x21: 0x01,
  0x31: 0x11,
  0x28: 0x18, // flowers
  0x30: 0x10,
}
export const NIGHT = makeRemap((i) => NIGHT_MAP[i] ?? darken(i))

// Packed RGBA per palette index, laid out for a little-endian Uint32Array view on ImageData.
export function rgbaTable(sky: number): Uint32Array {
  const table = new Uint32Array(256).fill(0xff000000)
  for (let i = 0; i < 64; i++) {
    const rgb = NES_RGB[i]
    table[i] = (0xff000000 | ((rgb & 0xff) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 0xff)) >>> 0
  }
  table[SKY] = table[sky]
  return table
}

import { atBottom, type SpriteSheet } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Chest: open with gold when untapped, shut when tapped.
const FRONT = [
  '.12222223222221',
  '.12222213122221',
  '.12222223222221',
  '.12222222222221',
  '.11111111111111',
]
const OPEN = atBottom(16, [
  '..111111111111',
  '.12222222222221',
  '.12111111111121',
  '.11333333333311',
  '.13333333333331',
  '.11111111111111',
  ...FRONT,
])
const SHUT = atBottom(16, ['..111111111111', '.12222222222221', '.12222222222221', '.11111111111111', ...FRONT])

export const look: TokenLook = {
  behavior: 'treasure',
  speed: 0,
  fps: 1,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x18, 0x28],
    frames: { idle: [OPEN], tapped: [SHUT] },
  },
}

// Gold mound for when many Treasures are out: '1' rim, '2' gold, '3' glints.
function mound(width: number, height: number): string[] {
  const rows: string[] = []
  for (let k = height - 1; k >= 0; k--) {
    const half = Math.round((width / 2) * Math.sqrt(1 - (k / height) ** 2))
    let row = ''
    for (let c = 0; c < 24; c++) {
      const d = Math.abs(c + 0.5 - 12)
      if (d > half) row += '.'
      else if (d > half - 1 || k === height - 1) row += '1'
      else row += (c * 3 + k * 5) % 11 === 0 ? '3' : '2'
    }
    rows.push(row)
  }
  return atBottom(24, rows)
}

export const pile: SpriteSheet = {
  w: 24,
  h: 24,
  palette: [0x18, 0x28, 0x38],
  frames: { small: [mound(14, 6)], medium: [mound(18, 9)], large: [mound(23, 13)] },
}

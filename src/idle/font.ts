import { BLACK } from './palette.ts'
import type { Screen } from './pixels.ts'

// Tiny 3x5 pixel font for badges in the world.
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['111', '1.1', '1.1', '1.1', '111'],
  '1': ['.1.', '11.', '.1.', '.1.', '111'],
  '2': ['111', '..1', '111', '1..', '111'],
  '3': ['111', '..1', '.11', '..1', '111'],
  '4': ['1.1', '1.1', '111', '..1', '..1'],
  '5': ['111', '1..', '111', '..1', '111'],
  '6': ['111', '1..', '111', '1.1', '111'],
  '7': ['111', '..1', '.1.', '.1.', '.1.'],
  '8': ['111', '1.1', '111', '1.1', '111'],
  '9': ['111', '1.1', '111', '..1', '111'],
  '+': ['...', '.1.', '111', '.1.', '...'],
  Z: ['111', '..1', '.1.', '1..', '111'],
  z: ['...', '111', '.1.', '1..', '111'],
  '?': ['111', '..1', '.11', '...', '.1.'],
  '!': ['.1.', '.1.', '.1.', '...', '.1.'],
}

export function textWidth(text: string): number {
  return text.length * 4 - 1
}

export function drawText(screen: Screen, text: string, x: number, y: number, colour: number, shadow = BLACK) {
  for (const [dx, c] of [[1, shadow], [0, colour]] as const) {
    ;[...text].forEach((ch, i) => {
      GLYPHS[ch]?.forEach((row, ry) => {
        for (let rx = 0; rx < 3; rx++) if (row[rx] === '1') screen.set(x + i * 4 + rx + dx, y + ry + dx, c)
      })
    })
  }
}

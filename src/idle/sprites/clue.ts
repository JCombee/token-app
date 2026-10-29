import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Magnifying glass lying in the grass.
const GLASS = atBottom(16, [
  '....1111',
  '...122221',
  '..12333321',
  '..12333321',
  '..12333321',
  '...122221',
  '....1111121',
  '.........121',
  '..........121',
  '...........11',
])

export const look: TokenLook = {
  behavior: 'clue',
  speed: 0,
  fps: 1,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x10, 0x31],
    frames: { idle: [GLASS], tapped: [GLASS] },
  },
}

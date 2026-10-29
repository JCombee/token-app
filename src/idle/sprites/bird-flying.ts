import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// White sea bird, facing right; wings up / wings down.
const WINGS_UP = atBottom(16, [
  '..11',
  '..121',
  '...121',
  '...1221.....11',
  '....12211..1221',
  '....122221112123',
  '.....12222222221',
  '......122222221',
  '.......1111111',
  '',
  '',
  '',
  '',
  '',
])
const WINGS_DOWN = atBottom(16, [
  '............11',
  '...........1221',
  '.....11111112123',
  '....12222222221',
  '...1222222221',
  '..12211111111',
  '..1221',
  '..11',
  '',
  '',
  '',
])
const PERCHED = atBottom(16, [
  '..........11',
  '.........1221',
  '.....111112223',
  '....1222222221',
  '.....12222221',
  '......111111',
  '.......3..3',
])

export const look: TokenLook = {
  behavior: 'flyer',
  speed: 30,
  fps: 6,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x30, 0x27],
    frames: {
      idle: [WINGS_UP, WINGS_DOWN],
      move: [WINGS_UP, WINGS_DOWN],
      sleep: [PERCHED],
    },
  },
}

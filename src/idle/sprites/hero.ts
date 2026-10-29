import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Adventurer with a blue cap and tunic, facing right.
const UPPER = [
  '......111',
  '.....13331',
  '....1333331',
  '....1222221',
  '....1222121',
  '.....12221',
  '....1333331',
  '...133333331',
  '..12133333121',
  '..12133333121',
  '...113333311',
  '....1111111',
]
const LEGS_A = ['.....1...1', '.....1...1', '....11...11', '']
const LEGS_B = ['.....1..1', '....1....1', '...11....11', '']
const EYES_CLOSED = UPPER.map((row, i) => (i === 4 ? '....1222221' : row))
const SITTING = atBottom(16, [...EYES_CLOSED.slice(0, 11), '...1111111111', '..11.......11'])

export const look: TokenLook = {
  behavior: 'adventurer',
  speed: 16,
  fps: 6,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x36, 0x11],
    frames: {
      idle: [[...UPPER, ...LEGS_A]],
      move: [[...UPPER, ...LEGS_A], [...UPPER, ...LEGS_B]],
      sleep: [SITTING],
    },
  },
}

import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Stocky green ground bird, facing right.
const BODY = [
  '........1111',
  '.......122221',
  '.......1212213',
  '.......12222133',
  '...111.1222221',
  '..12221122221',
  '.1222222222221',
  '.1222222222221',
  '..12222222221',
  '...111111111',
]
const STEP_A = ['....3....3', '....3....3', '...33...33', '']
const STEP_B = ['.....3..3', '....3....3', '...33.....33', '']
const EYES_CLOSED = BODY.map((row, i) => (i === 2 ? '.......1222213' : row))

export const look: TokenLook = {
  behavior: 'runner',
  speed: 18,
  fps: 6,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x2a, 0x28],
    frames: {
      idle: [atBottom(16, [...BODY, ...STEP_A])],
      move: [atBottom(16, [...BODY, ...STEP_A]), atBottom(16, [...BODY, ...STEP_B])],
      sleep: [atBottom(16, [...EYES_CLOSED, '...3....3'])],
    },
  },
}

import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Small colourless head with wriggling tentacles.
const HEAD = [
  '......1111',
  '.....122221',
  '....12233221',
  '....12322321',
  '....12222221',
  '.....122221',
]
const TENTACLES_A = ['....1.1..1.1', '...1..1..1..1', '...1.1....1.1', '']
const TENTACLES_B = ['.....1.11.1', '....1..1..1.1', '....1..1...1', '']

export const look: TokenLook = {
  behavior: 'skitter',
  speed: 45,
  fps: 8,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x10, 0x00],
    frames: {
      idle: [atBottom(16, [...HEAD, ...TENTACLES_A]), atBottom(16, [...HEAD, ...TENTACLES_B])],
      move: [atBottom(16, [...HEAD, ...TENTACLES_A]), atBottom(16, [...HEAD, ...TENTACLES_B])],
      sleep: [atBottom(16, [...HEAD, '....11111111', ''])],
    },
  },
}

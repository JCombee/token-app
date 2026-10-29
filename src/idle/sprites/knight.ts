import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Armoured knight with a red shield and a raised sword, facing right.
const UPPER = [
  '......1111',
  '.....122221',
  '.....121111',
  '.....122221...1',
  '......1111...121',
  '...11.12221..121',
  '..1331222221.121',
  '..13312222221111',
  '..13312333211',
  '..1331233321',
  '..133122221',
  '...11.1221',
]
const LEGS_A = ['......1221', '......1..1', '......1..1', '.....11..11']
const LEGS_B = ['......1221', '.....1...1', '....1.....1', '...11.....11']
const SITTING = atBottom(16, [...UPPER.slice(0, 11), '...11.1222211111', '......1111111111'])

export const look: TokenLook = {
  behavior: 'patrol',
  speed: 14,
  fps: 5,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x10, 0x16],
    frames: {
      idle: [[...UPPER, ...LEGS_A]],
      move: [[...UPPER, ...LEGS_A], [...UPPER, ...LEGS_B]],
      sleep: [SITTING],
    },
  },
}

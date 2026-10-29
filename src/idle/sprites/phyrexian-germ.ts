import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Tiny oily slug with one red eye: it's a 0/0.
const STRETCHED = atBottom(16, ['.....111', '....12321', '...1222221', '....11111'])
const SQUISHED = atBottom(16, ['......11', '...113211', '..12222221', '...1111111'])
const ASLEEP = atBottom(16, ['.....111', '....12221', '...1222221', '....11111'])

export const look: TokenLook = {
  behavior: 'crawler',
  speed: 4,
  fps: 2,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x2d, 0x15],
    frames: {
      idle: [STRETCHED],
      move: [STRETCHED, SQUISHED],
      sleep: [ASLEEP],
    },
  },
}

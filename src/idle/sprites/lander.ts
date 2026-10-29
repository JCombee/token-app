import { atBottom, type SpriteSheet } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Landing pod with blinking lights; the world draws it on the pad below.
const TOP = ['......1111', '.....122221', '....12111121', '....12111121', '...1222222221']
const BOTTOM = ['...1222222221', '...1111111111', '...1.1....1.1', '..1..1....1..1', '..11........11']
const pod = (lights: string) => ['', '', ...TOP, lights, ...BOTTOM, '', '', '']

export const look: TokenLook = {
  behavior: 'lander',
  speed: 0,
  fps: 2,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x0f, 0x10, 0x16],
    frames: {
      idle: [pod('...1322222231'), pod('...1222332221')],
      tapped: [pod('...1222222221')],
    },
  },
}

export const pad: SpriteSheet = {
  w: 24,
  h: 24,
  palette: [0x0f, 0x00, 0x28],
  frames: {
    idle: [
      atBottom(24, [
        '..11111111111111111111',
        '.1232323232323232323231',
        '.1222222222222222222221',
        '..111111111111111111111',
      ]),
    ],
  },
}

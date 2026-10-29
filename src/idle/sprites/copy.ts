import { atBottom } from '../pixels.ts'
import type { TokenLook } from './types.ts'

// Shapeless shimmering blob; the world swaps in another token's look now and then.
const TALL = atBottom(16, [
  '......1111',
  '....11222211',
  '...1222232221',
  '...1223322221',
  '..122222222221',
  '..122222222221',
  '..122222222221',
  '...1222222221',
  '....11111111',
  '',
])
const WIDE = atBottom(16, [
  '......1111',
  '...112222211',
  '..12223322221',
  '..12232222221',
  '.1222222222221',
  '.1222222222221',
  '..12222222221',
  '...111111111',
  '',
])
const FLAT = atBottom(16, ['.....111111', '...1122222211', '..12222322221', '.12222222222221', '..111111111111', ''])

export const look: TokenLook = {
  behavior: 'mimic',
  speed: 10,
  fps: 3,
  sheet: {
    w: 16,
    h: 16,
    palette: [0x03, 0x23, 0x30],
    frames: {
      idle: [TALL, WIDE],
      move: [TALL, WIDE],
      sleep: [FLAT],
    },
  },
}

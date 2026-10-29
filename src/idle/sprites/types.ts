import type { SpriteSheet } from '../pixels.ts'

// How a token moves in the world. Creatures need anims idle/move/sleep, artifacts idle/tapped.
export type Behavior =
  | 'runner'
  | 'flyer'
  | 'patrol'
  | 'adventurer'
  | 'skitter'
  | 'crawler'
  | 'mimic'
  | 'treasure'
  | 'clue'
  | 'lander'

export type TokenLook = {
  sheet: SpriteSheet
  behavior: Behavior
  // Pixels per second.
  speed: number
  // Animation frames per second.
  fps: number
}

export const STATIC_BEHAVIORS: ReadonlySet<Behavior> = new Set(['treasure', 'clue', 'lander'])

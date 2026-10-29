import { look as birdFlying } from './bird-flying.ts'
import { look as birdLandfall } from './bird-landfall.ts'
import { look as clue } from './clue.ts'
import { look as copy } from './copy.ts'
import { look as eldraziScion } from './eldrazi-scion.ts'
import { look as hero } from './hero.ts'
import { look as knight } from './knight.ts'
import { look as lander } from './lander.ts'
import { look as phyrexianGerm } from './phyrexian-germ.ts'
import { look as treasure } from './treasure.ts'
import type { TokenLook } from './types.ts'

// Keyed by token id from src/tokens.ts.
export const LOOKS: Record<string, TokenLook> = {
  'bird-landfall': birdLandfall,
  'bird-flying': birdFlying,
  clue,
  copy,
  'eldrazi-scion': eldraziScion,
  hero,
  knight,
  lander,
  'phyrexian-germ': phyrexianGerm,
  treasure,
}

export { pad as landerPad } from './lander.ts'
export { pile } from './treasure.ts'
export { STATIC_BEHAVIORS, type Behavior, type TokenLook } from './types.ts'

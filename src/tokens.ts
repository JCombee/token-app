export type TokenDef = {
  id: string
  name: string
  type: string
  pt?: { power: number; toughness: number }
  text: string
  imageUrl: string
}

// imageUrl wordt ingevuld door `npm run images` (scripts/resolve-token-images.mjs).
// Zolang een URL leeg is of niet laadt, toont CardFace een tekstversie van de kaart.
export const TOKENS: TokenDef[] = [
  {
    id: 'bird-landfall',
    name: 'Bird',
    type: 'Token Creature — Bird',
    pt: { power: 2, toughness: 2 },
    text: 'Whenever a land you control enters, this token gets +1/+0 until end of turn.',
    imageUrl: 'https://cards.scryfall.io/normal/front/1/f/1fbc471d-5948-47fc-b7cc-81cc13a4cd15.jpg?1783906133',
  },
  {
    id: 'bird-flying',
    name: 'Bird',
    type: 'Token Creature — Bird',
    pt: { power: 1, toughness: 1 },
    text: 'Flying',
    imageUrl: 'https://cards.scryfall.io/normal/front/4/5/456832f6-60b5-46d7-b37e-4fb44e60e792.jpg?1783902809',
  },
  {
    id: 'clue',
    name: 'Clue',
    type: 'Token Artifact — Clue',
    text: '{2}, Sacrifice this artifact: Draw a card.',
    imageUrl: 'https://cards.scryfall.io/normal/front/1/5/15866ed4-1ca3-427f-99ba-ee26ede9ae18.jpg?1783905791',
  },
  {
    id: 'copy',
    name: 'Copy',
    type: 'Token',
    text: 'This token represents a copy of something else.',
    imageUrl: 'https://cards.scryfall.io/normal/front/b/2/b2a03ba1-2182-4074-99f5-f3952c1d37ec.jpg?1783902815',
  },
  {
    id: 'eldrazi-scion',
    name: 'Eldrazi Scion',
    type: 'Token Creature — Eldrazi Scion',
    pt: { power: 1, toughness: 1 },
    text: 'Sacrifice this creature: Add {C}.',
    imageUrl: 'https://cards.scryfall.io/normal/front/c/6/c6ee5e2c-d98b-434e-9175-d20f7f713b88.jpg?1783911127',
  },
  {
    id: 'hero',
    name: 'Hero',
    type: 'Token Creature — Hero',
    pt: { power: 1, toughness: 1 },
    text: '',
    imageUrl: 'https://cards.scryfall.io/normal/front/d/0/d0657ce1-bf75-4007-ac1b-0623eb263357.jpg?1783906138',
  },
  {
    id: 'knight',
    name: 'Knight',
    type: 'Token Creature — Knight',
    pt: { power: 2, toughness: 2 },
    text: '',
    imageUrl: 'https://cards.scryfall.io/normal/front/a/7/a7758a0b-9e85-4b4a-bf1c-ffcc6761dbad.jpg?1783906135',
  },
  {
    id: 'lander',
    name: 'Lander',
    type: 'Token Artifact — Lander',
    text: '{2}, {T}, Sacrifice this token: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.',
    imageUrl: 'https://cards.scryfall.io/normal/front/b/2/b25a7de0-0d5d-4b7a-a1bf-7483fa51392a.jpg?1783905787',
  },
  {
    id: 'phyrexian-germ',
    name: 'Phyrexian Germ',
    type: 'Token Creature — Phyrexian Germ',
    pt: { power: 0, toughness: 0 },
    text: '',
    imageUrl: 'https://cards.scryfall.io/normal/front/5/3/53c05e53-84c7-4796-ae02-d778faa5afa6.jpg?1790977617',
  },
  {
    id: 'treasure',
    name: 'Treasure',
    type: 'Token Artifact — Treasure',
    text: '{T}, Sacrifice this artifact: Add one mana of any color.',
    imageUrl: 'https://cards.scryfall.io/normal/front/0/3/03992f88-7a15-4234-9bed-b7617d7ff09c.jpg?1789735245',
  },
]

export const TOKENS_BY_ID = new Map(TOKENS.map((t) => [t.id, t]))

// +1/+1 counters only make sense on creatures; a Copy can be a copy of a creature.
export function canHaveCounters(token: TokenDef): boolean {
  return token.pt !== undefined || token.id === 'copy'
}

export function ptLabel(token: TokenDef, counters: number): string | null {
  if (token.pt) return `${token.pt.power + counters}/${token.pt.toughness + counters}`
  if (counters > 0) return `+${counters}/+${counters}`
  return null
}

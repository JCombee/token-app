import { SKY } from './palette.ts'

// 8x8 background tiles: '0'-'3' index into the tile's 4-colour palette.
export type Tile = Uint8Array

function tile(palette: readonly [number, number, number, number], rows: readonly string[]): Tile {
  const px = new Uint8Array(64)
  rows.forEach((row, y) => {
    for (let x = 0; x < 8; x++) px[y * 8 + x] = palette[Number(row[x])]
  })
  return px
}

const HILL = [SKY, 0x2a, 0x1a, 0x39] as const
const GRASS = [0x1a, 0x2a, 0x0a, 0x39] as const
const PATH = [0x37, 0x27, 0x17, 0x1a] as const
const WATER = [0x11, 0x21, 0x31, 0x1a] as const

export const HILL_FILL = tile(HILL, ['11111111', '11311111', '11111111', '11111131', '11111111', '13111111', '11111111', '11111311'])
export const HILL_FLAT = tile(HILL, ['00000000', '00000000', '22222222', '11111111', '11131111', '11111111', '11111131', '11111111'])
export const HILL_UP = tile(HILL, ['00000002', '00000021', '00000211', '00002111', '00021131', '00211111', '02111111', '21113111'])
export const HILL_DOWN = tile(HILL, ['20000000', '12000000', '11200000', '11120000', '13112000', '11111200', '11111120', '11131112'])
export const HILL_PEAK = tile(HILL, ['00000000', '00000000', '00222200', '02111120', '21111112', '11131111', '11111111', '11111111'])

export const GRASS_PLAIN = tile(GRASS, ['00000000', '00100000', '00000020', '00000000', '00000100', '02000000', '00000000', '00000000'])
export const GRASS_TUFT = tile(GRASS, ['00000000', '00000000', '00010100', '00121000', '00000000', '00000001', '00000010', '00000000'])
export const GRASS_FLOWER = tile([0x1a, 0x28, 0x0a, 0x30], ['00000000', '00030000', '00313000', '00030000', '00020000', '00000000', '00000300', '00000000'])
export const PATH_TILE = tile(PATH, ['33030333', '00000000', '01000000', '00000210', '00000000', '00200001', '00000000', '30330303'])

const WATER_A = ['00000000', '00111000', '00000000', '00000000', '00000011', '01100000', '00000000', '00000000']
const WATER_B = ['00000000', '00011100', '00000000', '00000000', '00000110', '00110000', '00000000', '00000000']
const shore = (rows: string[]) => ['33333333', '32333233', '22222222', ...rows.slice(3)]

// Two frames each; the world alternates them for a rippling pond.
export const WATER_TILES = [tile(WATER, WATER_A), tile(WATER, WATER_B)]
export const WATER_SHORE_TILES = [tile(WATER, shore(WATER_A)), tile(WATER, shore(WATER_B))]

import { IDENTITY, SKY, type Remap } from './palette.ts'
import { Screen, compile } from './pixels.ts'
import { between, clamp, mulberry32 } from './rng.ts'
import { tree } from './sprites/ambient.ts'
import {
  GRASS_FLOWER,
  GRASS_PLAIN,
  GRASS_TUFT,
  HILL_DOWN,
  HILL_FILL,
  HILL_FLAT,
  HILL_PEAK,
  HILL_UP,
  PATH_TILE,
  WATER_TILES,
  type Tile,
} from './tiles.ts'

export type Zone = { x0: number; x1: number; y0: number; y1: number }

export type Layout = {
  W: number
  H: number
  horizonY: number
  // Tile per cell, null for open sky.
  cells: (Tile | null)[]
  cols: number
  water: { c: number; r: number; shore: boolean }[]
  pondCenter: { x: number; y: number }
  trees: { x: number; y: number }[]
  ground: Zone
  sky: Zone
  inPond: (x: number, y: number, margin?: number) => boolean
}

// Fixed layout per screen size, so the world looks the same every time it opens.
export function computeLayout(W: number, H: number): Layout {
  const cols = Math.ceil(W / 8)
  const rows = Math.ceil(H / 8)
  const horizonRow = clamp(Math.round(rows * 0.36), 4, Math.max(4, rows - 6))
  const horizonY = horizonRow * 8
  const cells: (Tile | null)[] = new Array(cols * rows).fill(null)
  const rng = mulberry32(0x7011)

  // Hills: per-column height in tiles, at most one step between neighbours.
  const maxHill = Math.min(3, horizonRow - 2)
  const hill: number[] = []
  for (let c = 0; c < cols; c++) {
    let h = Math.round(1.3 + 1.2 * Math.sin(c * 0.33 + 0.8) + 0.6 * Math.sin(c * 0.71 + 2))
    if (c > 0) h = clamp(h, hill[c - 1] - 1, hill[c - 1] + 1)
    hill.push(clamp(h, 0, maxHill))
  }
  for (let c = 0; c < cols; c++) {
    const h = hill[c]
    if (h === 0) continue
    const leftLower = (hill[c - 1] ?? h) < h
    const rightLower = (hill[c + 1] ?? h) < h
    const top = leftLower && rightLower ? HILL_PEAK : leftLower ? HILL_UP : rightLower ? HILL_DOWN : HILL_FLAT
    cells[(horizonRow - h) * cols + c] = top
    for (let r = horizonRow - h + 1; r < horizonRow; r++) cells[r * cols + c] = HILL_FILL
  }

  // Grass with a sprinkle of tufts and flowers.
  for (let r = horizonRow; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const roll = rng()
      cells[r * cols + c] = roll < 0.1 ? GRASS_TUFT : roll < 0.16 ? GRASS_FLOWER : GRASS_PLAIN
    }
  }

  // Pond in the lower right.
  const pcx = cols * 0.72
  const pcy = horizonRow + (rows - horizonRow) * 0.6
  const prx = Math.max(2.2, cols * 0.1)
  const pry = Math.max(1.6, (rows - horizonRow) * 0.2)
  const isWater = new Uint8Array(cols * rows)
  for (let r = horizonRow + 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (((c + 0.5 - pcx) / prx) ** 2 + ((r + 0.5 - pcy) / pry) ** 2 <= 1) isWater[r * cols + c] = 1
    }
  }

  // Winding path from left to right, going around the pond.
  let prev = -1
  for (let c = 0; c < cols; c++) {
    const pr = clamp(horizonRow + 2 + Math.round(1.4 * Math.sin(c * 0.28) + 0.8 * Math.sin(c * 0.13 + 1)), horizonRow + 1, rows - 2)
    const from = prev < 0 ? pr : Math.min(prev, pr)
    const to = prev < 0 ? pr : Math.max(prev, pr)
    for (let r = from; r <= to; r++) if (!isWater[r * cols + c]) cells[r * cols + c] = PATH_TILE
    prev = pr
  }

  const water: Layout['water'] = []
  for (let i = 0; i < isWater.length; i++) {
    if (!isWater[i]) continue
    const c = i % cols
    const r = Math.floor(i / cols)
    cells[i] = WATER_TILES[0]
    water.push({ c, r, shore: !isWater[i - cols] })
  }

  const treeCount = Math.max(3, Math.round(cols / 7))
  const trees = Array.from({ length: treeCount }, (_, i) => ({
    x: Math.round(clamp((i + 0.5) * (W / treeCount) + between(rng, -10, 10), 8, W - 8)),
    y: horizonY + 4 + Math.round(rng() * 4),
  }))

  const inPond = (x: number, y: number, margin = 0) => {
    for (const [dx, dy] of [[0, 0], [-margin, 0], [margin, 0], [0, -margin], [0, margin]]) {
      const c = Math.floor((x + dx) / 8)
      const r = Math.floor((y + dy) / 8)
      if (c >= 0 && c < cols && r >= 0 && r < rows && isWater[r * cols + c]) return true
    }
    return false
  }

  return {
    W,
    H,
    horizonY,
    cells,
    cols,
    water,
    pondCenter: { x: pcx * 8, y: pcy * 8 },
    trees,
    ground: { x0: 8, x1: W - 8, y0: Math.min(H - 4, horizonY + 14), y1: H - 2 },
    sky: { x0: 10, x1: W - 10, y0: 18, y1: Math.max(20, horizonY + 4) },
    inPond,
  }
}

export function drawTile(screen: Screen, tile: Tile, x: number, y: number, remap: Remap = IDENTITY) {
  for (let r = 0; r < 8; r++) {
    const sy = y + r
    if (sy >= screen.h) return
    for (let c = 0; c < 8; c++) {
      const sx = x + c
      if (sx < screen.w) screen.px[sy * screen.w + sx] = remap[tile[r * 8 + c]]
    }
  }
}

// Static background (tiles + trees) in palette indices; the world caches one per brightness.
export function renderBackground(layout: Layout, remap: Remap): Uint8Array {
  const screen = new Screen(layout.W, layout.H)
  screen.px.fill(SKY)
  layout.cells.forEach((tile, i) => {
    if (tile) drawTile(screen, tile, (i % layout.cols) * 8, Math.floor(i / layout.cols) * 8, remap)
  })
  const img = compile(tree).anims.idle[0]
  for (const t of layout.trees) screen.blit(img, t.x - 8, t.y - img.h, { remap })
  return screen.px
}

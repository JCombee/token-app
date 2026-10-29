import { TRANSPARENT, type Remap } from './palette.ts'

// A sprite sheet: rows of '.', '1', '2', '3'. The digits pick from the 3-colour palette, '.' is transparent.
export type SpriteSheet = {
  w: number
  h: number
  palette: readonly [number, number, number]
  frames: Record<string, readonly (readonly string[])[]>
}

export type Image = {
  w: number
  h: number
  px: Uint8Array
  // First row with a visible pixel; used to place badges above the sprite.
  top: number
}

export type CompiledSheet = { w: number; h: number; anims: Record<string, Image[]> }

// Pads with empty rows at the top so the art sits on the sprite's bottom edge (its feet).
export function atBottom(h: number, rows: readonly string[]): string[] {
  if (rows.length > h) throw new Error(`Sprite has ${rows.length} rows, max ${h}`)
  return [...Array<string>(h - rows.length).fill(''), ...rows]
}

export function compileFrame(rows: readonly string[], w: number, h: number, palette: readonly number[]): Image {
  const px = new Uint8Array(w * h).fill(TRANSPARENT)
  let top = h
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length && x < w; x++) {
      const k = '123'.indexOf(row[x])
      if (k < 0) continue
      px[y * w + x] = palette[k]
      top = Math.min(top, y)
    }
  })
  return { w, h, px, top }
}

const compiled = new WeakMap<SpriteSheet, CompiledSheet>()

export function compile(sheet: SpriteSheet): CompiledSheet {
  let result = compiled.get(sheet)
  if (!result) {
    const anims: Record<string, Image[]> = {}
    for (const [name, frames] of Object.entries(sheet.frames)) {
      anims[name] = frames.map((rows) => compileFrame(rows, sheet.w, sheet.h, sheet.palette))
    }
    result = { w: sheet.w, h: sheet.h, anims }
    compiled.set(sheet, result)
  }
  return result
}

export type BlitOptions = {
  flip?: boolean
  remap?: Remap
  // 0..4: ordered-dither coverage, used for fading in and out without transparency.
  fade?: number
  // Only paint over pixels of this colour (clouds and stars stay behind the hills).
  onlyOver?: number
}

const BAYER = [0, 2, 3, 1]

// Palette-indexed framebuffer; converted to RGBA once per frame.
export class Screen {
  readonly w: number
  readonly h: number
  readonly px: Uint8Array

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.px = new Uint8Array(w * h)
  }

  set(x: number, y: number, colour: number, onlyOver?: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = y * this.w + x
    if (onlyOver !== undefined && this.px[i] !== onlyOver) return
    this.px[i] = colour
  }

  blit(img: Image, x: number, y: number, o: BlitOptions = {}) {
    const fade = o.fade ?? 4
    if (fade <= 0) return
    const { w, h, px } = img
    for (let r = 0; r < h; r++) {
      const sy = y + r
      if (sy < 0 || sy >= this.h) continue
      for (let c = 0; c < w; c++) {
        const sx = x + c
        if (sx < 0 || sx >= this.w) continue
        const v = px[r * w + (o.flip ? w - 1 - c : c)]
        if (v === TRANSPARENT) continue
        if (fade < 4 && BAYER[(sx & 1) | ((sy & 1) << 1)] >= fade) continue
        const i = sy * this.w + sx
        if (o.onlyOver !== undefined && this.px[i] !== o.onlyOver) continue
        this.px[i] = o.remap ? o.remap[v] : v
      }
    }
  }
}

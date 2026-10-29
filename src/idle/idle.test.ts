import { describe, expect, it } from 'vitest'
import { TOKENS } from '../tokens'
import { SKY } from './palette.ts'
import type { SpriteSheet } from './pixels.ts'
import * as ambient from './sprites/ambient.ts'
import { LOOKS, STATIC_BEHAVIORS, landerPad, pile } from './sprites/index.ts'
import { World, type FieldToken } from './world.ts'

const W = 270
const H = 125

function token(tokenId: string, n: number, extra: Partial<FieldToken> = {}): FieldToken {
  return Object.freeze({ uid: `${tokenId}-${n}`, tokenId, tapped: false, sick: false, counters: 0, ...extra })
}

function run(world: World, seconds: number) {
  for (let i = 0; i < seconds * 30; i++) world.tick(1 / 30)
}

const SHEETS: [string, SpriteSheet][] = [
  ...Object.entries(LOOKS).map(([id, look]) => [id, look.sheet] as [string, SpriteSheet]),
  ['lander-pad', landerPad],
  ['pile', pile],
  ...Object.entries(ambient),
]

describe('sprites', () => {
  it('has a look for every token', () => {
    for (const t of TOKENS) expect(LOOKS[t.id], t.id).toBeDefined()
  })

  it.each(SHEETS)('%s fits its size and uses at most 3 NES colours', (_, sheet) => {
    expect(sheet.palette).toHaveLength(3)
    for (const c of sheet.palette) expect(c).toBeLessThan(64)
    for (const frames of Object.values(sheet.frames)) {
      expect(frames.length).toBeGreaterThanOrEqual(1)
      expect(frames.length).toBeLessThanOrEqual(4)
      for (const rows of frames) {
        expect(rows.length).toBeLessThanOrEqual(sheet.h)
        for (const row of rows) {
          expect(row.length).toBeLessThanOrEqual(sheet.w)
          expect(row).toMatch(/^[.123]*$/)
        }
      }
    }
  })

  it('gives creatures idle/move/sleep and artifacts idle/tapped', () => {
    for (const [id, look] of Object.entries(LOOKS)) {
      const needed = STATIC_BEHAVIORS.has(look.behavior) ? ['idle', 'tapped'] : ['idle', 'move', 'sleep']
      for (const anim of needed) expect(look.sheet.frames[anim], `${id}.${anim}`).toBeDefined()
    }
  })
})

describe('World', () => {
  it('places static tokens deterministically per instance id', () => {
    const field = [token('treasure', 1), token('clue', 1), token('lander', 1)]
    const a = new World(W, H)
    const b = new World(W, H)
    a.sync(field)
    b.sync([...field].reverse())
    run(a, 5)
    for (const t of field) {
      expect(a.entities.get(t.uid)).toMatchObject({ x: b.entities.get(t.uid)!.x, y: b.entities.get(t.uid)!.y })
    }
    a.sync([token('treasure', 2)])
    expect(a.entities.get('treasure-2')!.x).not.toBe(a.entities.get('treasure-1')!.x)
  })

  it('keeps 50+ creatures on screen', () => {
    const ids = Object.keys(LOOKS)
    const field = Array.from({ length: 60 }, (_, i) => token(ids[i % ids.length], i))
    const world = new World(W, H)
    world.sync(field)
    run(world, 60)
    for (const e of world.entities.values()) {
      expect(e.x).toBeGreaterThanOrEqual(0)
      expect(e.x).toBeLessThanOrEqual(W)
      expect(e.y).toBeGreaterThanOrEqual(0)
      expect(e.y).toBeLessThanOrEqual(H)
    }
  })

  it('does not move tapped creatures', () => {
    const world = new World(W, H)
    world.sync([token('knight', 1, { tapped: true }), token('bird-landfall', 1, { tapped: true })])
    run(world, 0.1)
    const before = [...world.entities.values()].map((e) => [e.x, e.y])
    run(world, 10)
    expect([...world.entities.values()].map((e) => [e.x, e.y])).toEqual(before)
  })

  it('lands a tapped flyer in the grass', () => {
    const world = new World(W, H)
    world.sync([token('bird-flying', 1, { tapped: true })])
    run(world, 1)
    const bird = world.entities.get('bird-flying-1')!
    expect(bird.y).toBeGreaterThanOrEqual(world.layout.ground.y0)
  })

  it('fades in new tokens and fades out removed ones', () => {
    const world = new World(W, H)
    world.sync([token('hero', 1)])
    expect(world.entities.get('hero-1')!.fade).toBe(1)
    world.sync([token('hero', 1), token('hero', 2)])
    expect(world.entities.get('hero-2')!.fade).toBe(0)
    run(world, 1)
    expect(world.entities.get('hero-2')!.fade).toBe(1)
    world.sync([token('hero', 2)])
    run(world, 0.2)
    expect(world.entities.get('hero-1')!.fade).toBeGreaterThan(0)
    run(world, 1)
    expect(world.entities.has('hero-1')).toBe(false)
  })

  it('renders an empty field with only NES colours, day and night', () => {
    const world = new World(W, H)
    world.sync([])
    const out = new Uint32Array(W * H)
    for (const t of [0, 150]) {
      world.time = t
      world.render(out)
      for (const c of world.screen.px) expect(c < 64 || c === SKY).toBe(true)
    }
  })

  it('never mutates the field it reads', () => {
    const field = Object.freeze([token('copy', 1), token('treasure', 1), token('bird-flying', 1, { tapped: true })])
    const world = new World(W, H)
    world.sync(field)
    expect(() => run(world, 30)).not.toThrow()
  })
})

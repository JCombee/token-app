import type { Instance } from '../battlefield'
import { drawText, textWidth } from './font.ts'
import { DARKEN, DARKEN2, IDENTITY, NIGHT, SILHOUETTE, SKY, rgbaTable, type Remap } from './palette.ts'
import { Screen, compile, type Image } from './pixels.ts'
import { between, clamp, hashString, mulberry32, type Rng } from './rng.ts'
import { computeLayout, drawTile, renderBackground, type Layout, type Zone } from './scenery.ts'
import { butterfly, cloudBig, cloudSmall, sparkle, star, tuft } from './sprites/ambient.ts'
import { LOOKS, STATIC_BEHAVIORS, landerPad, pile, type TokenLook } from './sprites/index.ts'
import { WATER_SHORE_TILES, WATER_TILES } from './tiles.ts'

export type FieldToken = Pick<Instance, 'uid' | 'tokenId' | 'tapped' | 'sick' | 'counters'>

// Day/night cycle in seconds of world time.
export const DAY_CYCLE_S = 200
type Phase = 'day' | 'dusk' | 'night' | 'dawn'

export function phaseAt(t: number): Phase {
  const c = t % DAY_CYCLE_S
  return c < 100 ? 'day' : c < 112 ? 'dusk' : c < 188 ? 'night' : 'dawn'
}

const SKY_COLOUR: Record<Phase, number> = { day: 0x21, dusk: 0x13, night: 0x02, dawn: 0x26 }

// From this many Treasures on, they merge into one growing gold mound.
const PILE_AT = 5
const SHIMMER_S = 0.6
const MIMIC_S = SHIMMER_S * 2 + 5
const SPACING = 9

type Entity = {
  uid: string
  tokenId: string
  look: TokenLook
  rng: Rng
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  state: 'idle' | 'wander' | 'pause'
  timer: number
  speedMul: number
  facing: 1 | -1
  animT: number
  fade: number
  leaving: boolean
  tapped: boolean
  sick: boolean
  counters: number
  homeX: number
  homeY: number
  // Flyers
  grounded: boolean
  landing: boolean
  diving: boolean
  // Hero: direction to face while inspecting a Clue/Treasure, 0 when not inspecting.
  inspectFacing: -1 | 0 | 1
  // Recurring effect (sparkle, "?", hover, mimic): countdown, then age while it plays.
  effectT: number
  effectAge: number
  fx: number
  fy: number
  mimic: { tokenId: string; t: number } | null
}

type Drifter = { x: number; y: number; tx: number; ty: number; phase: number }
type Cloud = { x: number; y: number; speed: number; img: Image }
type Leaf = { x: number; y: number; restY: number; t: number; rest: number }
type Glint = { x: number; y: number; t: number }
type Overlay = { e: Entity; x: number; top: number }

export type WorldOptions = { reduced?: boolean }

// The idle world: reads the battlefield through sync(), never changes it.
export class World {
  readonly layout: Layout
  readonly screen: Screen
  readonly entities = new Map<string, Entity>()
  time = 0

  private readonly reduced: boolean
  private field: readonly FieldToken[] | null = null
  private readonly backgrounds: Record<Phase, Uint8Array>
  private readonly palettes: Record<Phase, Uint32Array>
  private readonly rng: Rng = mulberry32(0x5eed)
  private readonly clouds: Cloud[] = []
  private readonly tufts: { x: number; y: number; phase: number }[] = []
  private readonly stars: { x: number; y: number; phase: number }[] = []
  private readonly butterflies: Drifter[] = []
  private readonly fireflies: Drifter[] = []
  private leaves: Leaf[] = []
  private glints: Glint[] = []
  private leafTimer = 3
  private readonly pileSpot: { x: number; y: number }
  private readonly pileFx = { t: 2, age: -1, fx: 0, fy: 0 }

  constructor(W: number, H: number, options: WorldOptions = {}) {
    this.reduced = options.reduced ?? false
    this.layout = computeLayout(W, H)
    this.screen = new Screen(W, H)
    const dusk = renderBackground(this.layout, DARKEN)
    this.backgrounds = {
      day: renderBackground(this.layout, IDENTITY),
      dusk,
      night: renderBackground(this.layout, NIGHT),
      dawn: dusk,
    }
    this.palettes = {
      day: rgbaTable(SKY_COLOUR.day),
      dusk: rgbaTable(SKY_COLOUR.dusk),
      night: rgbaTable(SKY_COLOUR.night),
      dawn: rgbaTable(SKY_COLOUR.dawn),
    }
    this.pileSpot = this.spot(this.layout.ground, mulberry32(hashString('treasure-pile')))
    this.initAmbient()
  }

  // Cheap to call every frame: only does work when the field array changes.
  sync(field: readonly FieldToken[]) {
    if (field === this.field) return
    const first = this.field === null
    this.field = field
    const seen = new Set<string>()
    for (const token of field) {
      seen.add(token.uid)
      let e = this.entities.get(token.uid)
      if (!e) {
        const spawned = this.spawn(token)
        if (!spawned) continue
        e = spawned
        // Tokens already on the field when the world opens are there at once; later ones fade in.
        e.fade = first ? 1 : 0
        this.entities.set(token.uid, e)
      }
      e.leaving = false
      e.tapped = token.tapped
      e.sick = token.sick
      e.counters = token.counters
    }
    for (const e of this.entities.values()) if (!seen.has(e.uid)) e.leaving = true
  }

  tick(dt: number) {
    this.time += dt
    for (const e of this.entities.values()) {
      e.fade = e.leaving ? Math.max(0, e.fade - dt * 2) : Math.min(1, e.fade + dt * 2)
      if (e.leaving) {
        if (e.fade === 0) this.entities.delete(e.uid)
        continue
      }
      e.animT += dt
      this.think(e, dt)
    }
    this.separate()
    this.tickAmbient(dt)
  }

  // ---- Entities ----

  private spawn(token: FieldToken): Entity | null {
    const look = LOOKS[token.tokenId]
    if (!look) return null
    // Seeded per instance id: a Treasure always lands on the same spot.
    const rng = mulberry32(hashString(token.uid))
    const inSky = look.behavior === 'flyer' && !token.tapped
    const { x, y } = this.spot(inSky ? this.layout.sky : this.layout.ground, rng)
    return {
      uid: token.uid,
      tokenId: token.tokenId,
      look,
      rng,
      x,
      y,
      vx: 0,
      vy: 0,
      tx: x,
      ty: y,
      state: 'pause',
      timer: rng() * 2,
      speedMul: 1,
      facing: rng() < 0.5 ? -1 : 1,
      animT: rng() * 10,
      fade: 0,
      leaving: false,
      tapped: token.tapped,
      sick: token.sick,
      counters: token.counters,
      homeX: x,
      homeY: y,
      grounded: look.behavior === 'flyer' && token.tapped,
      landing: false,
      diving: false,
      inspectFacing: 0,
      effectT: between(rng, 1, 5),
      effectAge: -1,
      fx: 0,
      fy: 0,
      mimic: null,
    }
  }

  private spot(zone: Zone, rng: Rng): { x: number; y: number } {
    let x = zone.x0
    let y = zone.y1
    for (let i = 0; i < 20; i++) {
      x = between(rng, zone.x0, zone.x1)
      y = between(rng, zone.y0, zone.y1)
      if (zone !== this.layout.ground || !this.layout.inPond(x, y, 6)) break
    }
    return { x, y }
  }

  private near(e: Entity, radius: number) {
    const g = this.layout.ground
    for (let i = 0; i < 10; i++) {
      const x = clamp(e.x + between(e.rng, -radius, radius), g.x0, g.x1)
      const y = clamp(e.y + between(e.rng, -radius, radius) * 0.6, g.y0, g.y1)
      if (!this.layout.inPond(x, y, 6)) {
        e.tx = x
        e.ty = y
        return
      }
    }
    e.tx = e.x
    e.ty = e.y
  }

  private think(e: Entity, dt: number) {
    switch (e.look.behavior) {
      case 'treasure':
        return this.effect(e, dt, 2, 5, 0.5)
      case 'clue':
        return this.effect(e, dt, 3, 6, 1.4)
      case 'lander':
        return this.effect(e, dt, 6, 12, 2)
      case 'flyer':
        return this.fly(e, dt)
      default:
        return this.walk(e, dt)
    }
  }

  // Sparkle, "?" and hover: wait a random gap, then play for `duration`. Off while tapped.
  private effect(e: Entity, dt: number, minGap: number, maxGap: number, duration: number) {
    if (e.tapped || this.reduced) {
      e.effectAge = -1
      return
    }
    if (e.effectAge >= 0) {
      e.effectAge += dt
      if (e.effectAge > duration) {
        e.effectAge = -1
        e.effectT = between(e.rng, minGap, maxGap)
      }
      return
    }
    e.effectT -= dt
    if (e.effectT <= 0) {
      e.effectAge = 0
      e.fx = e.rng()
      e.fy = e.rng()
    }
  }

  // idle → wander → pause, with a target per behaviour.
  private walk(e: Entity, dt: number) {
    if (e.look.behavior === 'mimic') this.updateMimic(e, dt)
    if (e.tapped || this.reduced) {
      e.state = 'pause'
      e.timer = Math.max(e.timer, 0.5)
      return
    }
    switch (e.state) {
      case 'idle':
        e.timer -= dt
        if (e.timer <= 0) {
          this.chooseTarget(e)
          e.state = 'wander'
          e.timer = 8 // give up if something keeps pushing us away
        }
        break
      case 'wander':
        e.timer -= dt
        if (this.moveToward(e, e.look.speed * e.speedMul, dt) || e.timer <= 0) {
          e.state = 'pause'
          e.timer = this.pauseFor(e)
          if (e.inspectFacing) e.facing = e.inspectFacing
        }
        break
      case 'pause':
        e.timer -= dt
        // Knight looks around while standing still.
        if (e.look.behavior === 'patrol') e.facing = Math.floor(e.timer * 1.4) % 2 ? 1 : -1
        if (e.timer <= 0) {
          e.state = 'idle'
          e.timer = e.rng() * 0.6
          e.inspectFacing = 0
        }
        break
    }
  }

  private chooseTarget(e: Entity) {
    const g = this.layout.ground
    e.speedMul = 1
    e.inspectFacing = 0
    switch (e.look.behavior) {
      case 'runner':
        this.near(e, 60)
        if (e.rng() < 0.25) e.speedMul = 2.5 // sprint
        break
      case 'patrol': {
        const left = clamp(e.homeX - 40, g.x0, g.x1)
        const right = clamp(e.homeX + 40, g.x0, g.x1)
        e.tx = Math.abs(e.x - left) < Math.abs(e.x - right) ? right : left
        e.ty = e.homeY
        break
      }
      case 'adventurer': {
        const sights = this.sights()
        if (sights.length && e.rng() < 0.4) {
          const s = sights[Math.floor(e.rng() * sights.length)]
          const side = e.rng() < 0.5 ? -1 : 1
          e.tx = clamp(s.x + side * 12, g.x0, g.x1)
          e.ty = clamp(s.y, g.y0, g.y1)
          e.inspectFacing = side < 0 ? 1 : -1
        } else {
          this.near(e, 70)
        }
        break
      }
      case 'skitter':
        this.near(e, 16)
        break
      case 'crawler':
        this.near(e, 20)
        break
      default:
        this.near(e, 40)
    }
  }

  private pauseFor(e: Entity): number {
    switch (e.look.behavior) {
      case 'runner':
        return between(e.rng, 0.5, 2)
      case 'patrol':
        return between(e.rng, 1.5, 3)
      case 'adventurer':
        return e.inspectFacing ? between(e.rng, 2, 4) : between(e.rng, 0.8, 2.5)
      case 'skitter':
        return between(e.rng, 0.2, 0.8)
      default:
        return between(e.rng, 1, 3)
    }
  }

  // Things the Hero likes to look at.
  private sights(): { x: number; y: number }[] {
    const pileActive = this.pileActive()
    const out: { x: number; y: number }[] = pileActive ? [this.pileSpot] : []
    for (const o of this.entities.values()) {
      if (o.leaving) continue
      if (o.look.behavior === 'clue' || (o.look.behavior === 'treasure' && !pileActive)) out.push(o)
    }
    return out
  }

  private moveToward(e: Entity, speed: number, dt: number): boolean {
    const dx = e.tx - e.x
    const dy = e.ty - e.y
    const d = Math.hypot(dx, dy)
    const step = speed * dt
    if (Math.abs(dx) > 0.5) e.facing = dx < 0 ? -1 : 1
    if (d <= step) {
      e.x = e.tx
      e.y = e.ty
      return true
    }
    e.x += (dx / d) * step
    e.y += (dy / d) * step
    return false
  }

  private fly(e: Entity, dt: number) {
    if (e.tapped) {
      if (e.grounded) return // asleep in the grass
      if (!e.landing) {
        e.landing = true
        this.near(e, 30)
        e.ty = between(e.rng, this.layout.ground.y0, this.layout.ground.y1)
      }
      if (this.moveToward(e, 30, dt)) {
        e.grounded = true
        e.landing = false
        e.vx = e.vy = 0
      }
      return
    }
    if (e.grounded || e.landing) {
      e.grounded = e.landing = false
      this.skyTarget(e)
    }
    if (this.reduced) return

    const dx = e.tx - e.x
    const dy = e.ty - e.y
    const d = Math.hypot(dx, dy) || 1
    const speed = e.look.speed * e.speedMul
    // Steering instead of snapping gives smooth curves.
    const k = Math.min(1, dt * 2)
    e.vx += ((dx / d) * speed - e.vx) * k
    e.vy += ((dy / d) * speed - e.vy) * k
    e.x = clamp(e.x + e.vx * dt, 8, this.layout.W - 8)
    e.y = clamp(e.y + e.vy * dt, 16, this.layout.H - 2)
    if (Math.abs(e.vx) > 2) e.facing = e.vx < 0 ? -1 : 1
    if (d < 6) this.skyTarget(e)
  }

  private skyTarget(e: Entity) {
    const sky = this.layout.sky
    if (!e.diving && e.rng() < 0.15) {
      e.diving = true
      e.speedMul = 1.8
      e.tx = clamp(e.x + between(e.rng, -40, 40), sky.x0, sky.x1)
      e.ty = this.layout.ground.y0 + 4
    } else {
      e.diving = false
      e.speedMul = 1
      const { x, y } = this.spot(sky, e.rng)
      e.tx = x
      e.ty = y
    }
  }

  private updateMimic(e: Entity, dt: number) {
    if (this.reduced || e.tapped) {
      e.mimic = null
      return
    }
    if (e.mimic) {
      e.mimic.t += dt
      if (e.mimic.t >= MIMIC_S) {
        e.mimic = null
        e.effectT = between(e.rng, 8, 15)
      }
      return
    }
    e.effectT -= dt
    if (e.effectT > 0) return
    const others = [...this.entities.values()].filter((o) => !o.leaving && o.look.behavior !== 'mimic')
    if (!others.length) {
      e.effectT = 3
      return
    }
    e.mimic = { tokenId: others[Math.floor(e.rng() * others.length)].tokenId, t: 0 }
  }

  private onGround(e: Entity): boolean {
    return !e.leaving && (e.look.behavior !== 'flyer' || e.grounded)
  }

  private movable(e: Entity): boolean {
    return !e.tapped && !STATIC_BEHAVIORS.has(e.look.behavior) && !this.reduced
  }

  // Rough avoidance: push overlapping ground entities apart, keep them on the grass and out of the pond.
  private separate() {
    const list = [...this.entities.values()].filter((e) => this.onGround(e))
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        let dx = b.x - a.x
        const dy = (b.y - a.y) * 1.5
        let d = Math.hypot(dx, dy)
        if (d >= SPACING) continue
        if (d === 0) {
          dx = 0.1
          d = 0.1
        }
        const push = ((SPACING - d) / SPACING) * 0.5
        const nx = (dx / d) * push
        const ny = (dy / d) * push
        const ma = this.movable(a)
        const mb = this.movable(b)
        const share = ma && mb ? 0.5 : 1
        if (ma) {
          a.x -= nx * share
          a.y -= ny * share
        }
        if (mb) {
          b.x += nx * share
          b.y += ny * share
        }
      }
    }
    const g = this.layout.ground
    const p = this.layout.pondCenter
    for (const e of list) {
      if (!this.movable(e)) continue
      if (this.layout.inPond(e.x, e.y, 3)) {
        const dx = e.x - p.x
        const dy = e.y - p.y
        const d = Math.hypot(dx, dy) || 1
        e.x += dx / d
        e.y += dy / d
      }
      e.x = clamp(e.x, g.x0, g.x1)
      e.y = clamp(e.y, g.y0, g.y1)
    }
  }

  private treasures(): Entity[] {
    return [...this.entities.values()].filter((e) => !e.leaving && e.look.behavior === 'treasure')
  }

  private pileActive(): boolean {
    return this.treasures().length >= PILE_AT
  }

  // ---- Ambient ----

  private initAmbient() {
    const { W, H, horizonY, ground, sky } = this.layout
    const r = this.rng
    const small = compile(cloudSmall).anims.idle[0]
    const big = compile(cloudBig).anims.idle[0]
    const cloudTop = Math.max(2, horizonY - 30)
    for (let i = 0; i < 4; i++) this.clouds.push({ x: between(r, 0, W), y: Math.round(between(r, 2, cloudTop)), speed: 1.5, img: small })
    for (let i = 0; i < 3; i++) this.clouds.push({ x: between(r, 0, W), y: Math.round(between(r, 2, cloudTop)), speed: 4, img: big })

    const tuftCount = Math.round((W * (H - horizonY)) / 350)
    for (let i = 0; i < tuftCount; i++) {
      const x = Math.round(between(r, 2, W - 6))
      const y = Math.round(between(r, horizonY + 2, H - 3))
      if (!this.layout.inPond(x, y, 4)) this.tufts.push({ x, y, phase: r() * 2 })
    }
    for (let i = 0; i < 30; i++) {
      this.stars.push({ x: Math.round(between(r, 0, W)), y: Math.round(between(r, 0, horizonY - 4)), phase: r() * 6 })
    }
    for (let i = 0; i < 3; i++) {
      const { x, y } = this.spot(ground, r)
      this.butterflies.push({ x, y, tx: x, ty: y, phase: r() * 6 })
    }
    for (let i = 0; i < 14; i++) {
      const x = between(r, 0, W)
      const y = between(r, sky.y1 - 10, H - 4)
      this.fireflies.push({ x, y, tx: x, ty: y, phase: r() * 6 })
    }
  }

  private tickAmbient(dt: number) {
    if (this.reduced) return
    const { W, H, ground } = this.layout
    const r = this.rng
    for (const c of this.clouds) {
      c.x += c.speed * dt
      if (c.x > W) c.x = -c.img.w
    }
    for (const b of this.butterflies) {
      const dx = b.tx - b.x
      const dy = b.ty - b.y
      const d = Math.hypot(dx, dy)
      if (d < 2) {
        b.tx = clamp(b.x + between(r, -40, 40), ground.x0, ground.x1)
        b.ty = clamp(b.y + between(r, -20, 20), ground.y0 - 10, ground.y1 - 6)
      } else {
        b.x += (dx / d) * 12 * dt
        b.y += (dy / d) * 12 * dt
      }
    }
    for (const f of this.fireflies) {
      f.x = (f.x + Math.sin(this.time * 0.7 + f.phase) * 4 * dt + W) % W
      f.y = clamp(f.y + Math.cos(this.time * 0.5 + f.phase * 2) * 3 * dt, 20, H - 2)
    }

    this.leafTimer -= dt
    if (this.leafTimer <= 0 && this.layout.trees.length) {
      this.leafTimer = between(r, 5, 11)
      const t = this.layout.trees[Math.floor(r() * this.layout.trees.length)]
      this.leaves.push({ x: t.x + between(r, -5, 5), y: t.y - 16, restY: t.y + between(r, 2, 10), t: 0, rest: 2 })
    }
    for (const l of this.leaves) {
      l.t += dt
      if (l.y < l.restY) {
        l.y += 6 * dt
        l.x += Math.sin(l.t * 3) * 6 * dt
      } else {
        l.rest -= dt
      }
    }
    this.leaves = this.leaves.filter((l) => l.rest > 0)

    for (const g of this.glints) g.t += dt
    this.glints = this.glints.filter((g) => g.t < 0.4)
    const water = this.layout.water
    if (water.length && this.glints.length < 3 && r() < dt * 4) {
      const cell = water[Math.floor(r() * water.length)]
      this.glints.push({ x: cell.c * 8 + Math.floor(r() * 8), y: cell.r * 8 + 3 + Math.floor(r() * 5), t: 0 })
    }

    const p = this.pileFx
    if (p.age >= 0) {
      p.age += dt
      if (p.age > 0.5) {
        p.age = -1
        p.t = between(r, 1, 3)
      }
    } else if ((p.t -= dt) <= 0) {
      p.age = 0
      p.fx = r()
      p.fy = r()
    }
  }

  // ---- Rendering ----

  render(out: Uint32Array) {
    const phase = phaseAt(this.time)
    const s = this.screen
    const bg = this.backgrounds[phase]
    const scene = phase === 'night' ? NIGHT : phase === 'day' ? IDENTITY : DARKEN
    const t = this.time
    // Reduced motion: ambient animation frozen, creatures animate at a quarter speed.
    const ambient = this.reduced ? 0 : 1
    s.px.set(bg)

    if (phase === 'night') {
      for (const st of this.stars) {
        const twinkle = Math.sin(t * 2 * ambient + st.phase * 5) > -0.5
        s.set(st.x, st.y, twinkle ? 0x30 : 0x10, SKY)
      }
    }
    const cloudMap = phase === 'night' ? DARKEN2 : scene
    for (const c of this.clouds) s.blit(c.img, Math.round(c.x), c.y, { remap: cloudMap, onlyOver: SKY })

    const wf = Math.floor((t * ambient) / 0.6)
    for (const cell of this.layout.water) {
      const frames = cell.shore ? WATER_SHORE_TILES : WATER_TILES
      drawTile(s, frames[(wf + cell.c + cell.r) & 1], cell.c * 8, cell.r * 8, scene)
    }
    for (const g of this.glints) s.set(g.x, g.y, 0x30)

    const tuftFrames = compile(tuft).anims.idle
    for (const tf of this.tufts) {
      s.blit(tuftFrames[Math.floor(t * 1.5 * ambient + tf.phase) & 1], tf.x, tf.y, { remap: scene })
    }

    // Depth sort: lower on screen is drawn later, so in front.
    const pileActive = this.pileActive()
    const drawables: { y: number; draw: () => void }[] = []
    const overlays: Overlay[] = []
    for (const e of this.entities.values()) {
      if (pileActive && e.look.behavior === 'treasure') continue
      drawables.push({ y: e.y, draw: () => overlays.push(this.drawEntity(e)) })
    }
    if (pileActive) drawables.push({ y: this.pileSpot.y, draw: () => this.drawPile() })
    drawables.sort((a, b) => a.y - b.y)
    for (const d of drawables) d.draw()
    for (const o of overlays) this.drawOverlay(o)

    if (phase === 'day' || phase === 'dawn') {
      const frames = compile(butterfly).anims.idle
      for (const b of this.butterflies) {
        const flap = Math.floor(t * 7 * ambient + b.phase) & 1
        s.blit(frames[flap], Math.round(b.x), Math.round(b.y + Math.sin(t * 5 * ambient + b.phase) * 1.5))
      }
    }
    for (const l of this.leaves) {
      const x = Math.round(l.x)
      const y = Math.round(l.y)
      s.set(x, y, 0x27)
      s.set(Math.floor(l.t * 3) & 1 ? x + 1 : x, Math.floor(l.t * 3) & 1 ? y : y + 1, 0x17)
    }
    if (phase !== 'day') {
      for (const f of this.fireflies) {
        if (Math.sin(t * 2 * ambient + f.phase * 7) < 0.2) continue
        const x = Math.round(f.x)
        const y = Math.round(f.y)
        s.set(x, y, 0x38)
        if (phase === 'night') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.set(x + dx, y + dy, 0x28)
      }
    }

    const pal = this.palettes[phase]
    const px = s.px
    for (let i = 0; i < px.length; i++) out[i] = pal[px[i]]
  }

  private drawEntity(e: Entity): Overlay {
    const s = this.screen
    let look = e.look
    let remap: Remap = STATIC_BEHAVIORS.has(look.behavior) && e.tapped ? DARKEN : IDENTITY
    if (e.mimic) {
      const m = e.mimic.t
      const tick = Math.floor(m * 15)
      if (m < SHIMMER_S || m > MIMIC_S - SHIMMER_S) {
        // Shimmer: flicker between both shapes with white flashes.
        if (tick & 1) look = LOOKS[e.mimic.tokenId]
        if (tick % 3 === 0) remap = SILHOUETTE
      } else {
        look = LOOKS[e.mimic.tokenId]
      }
    }
    const sheet = compile(look.sheet)
    const anim = this.animFor(e, look)
    const frames = sheet.anims[anim] ?? sheet.anims.idle
    const speed = (this.reduced ? 0.25 : 1) * (e.state === 'wander' ? e.speedMul : 1)
    const img = frames[Math.floor(e.animT * look.fps * speed) % frames.length]
    const fade = Math.round(e.fade * 4)
    const x = Math.round(e.x)
    const y = Math.round(e.y)
    const flip = e.facing < 0

    if (look.behavior === 'lander' && !e.mimic) {
      const padImg = compile(landerPad).anims.idle[0]
      s.blit(padImg, x - 12, y - 24, { remap, fade })
      const hover = e.effectAge >= 0 ? Math.round(3 * Math.sin((Math.PI * e.effectAge) / 2)) : 0
      const podY = y - 17 - hover
      s.blit(img, x - 8, podY, { remap, fade })
      return { e, x, top: podY + img.top }
    }
    const left = x - (img.w >> 1)
    s.blit(img, left, y - img.h, { flip, remap, fade })
    return { e, x, top: y - img.h + img.top }
  }

  private animFor(e: Entity, look: TokenLook): string {
    if (STATIC_BEHAVIORS.has(look.behavior)) return e.tapped ? 'tapped' : 'idle'
    if (e.look.behavior === 'flyer') return e.tapped && e.grounded ? 'sleep' : 'move'
    if (e.tapped) return 'sleep'
    return e.state === 'wander' ? 'move' : 'idle'
  }

  private drawPile() {
    const s = this.screen
    const treasures = this.treasures()
    const n = treasures.length
    const size = n < 8 ? 'small' : n < 12 ? 'medium' : 'large'
    const img = compile(pile).anims[size][0]
    const allTapped = treasures.every((e) => e.tapped)
    const x = Math.round(this.pileSpot.x)
    const y = Math.round(this.pileSpot.y)
    s.blit(img, x - 12, y - img.h, { remap: allTapped ? DARKEN : IDENTITY })
    if (!allTapped && this.pileFx.age >= 0) {
      const sp = compile(sparkle).anims.idle[this.pileFx.age < 0.25 ? 0 : 1]
      const top = y - img.h + img.top
      s.blit(sp, x - 10 + Math.round(this.pileFx.fx * 16), top + Math.round(this.pileFx.fy * (img.h - img.top - 4)))
    }
  }

  private drawOverlay({ e, x, top }: Overlay) {
    if (e.fade < 0.75) return
    const s = this.screen
    const t = this.time
    const creature = !STATIC_BEHAVIORS.has(e.look.behavior)
    const asleep = creature && e.tapped && (e.look.behavior !== 'flyer' || e.grounded)

    if (asleep) {
      const k = Math.floor(t * 1.5) % 3
      drawText(s, 'z', x + 3, top - 5, 0x30)
      if (k >= 1) drawText(s, 'Z', x + 7, top - 10, 0x30)
      if (k >= 2) drawText(s, 'Z', x + 11, top - 15, 0x30)
    }

    const labelY = top - 7
    if (e.sick) {
      const frames = compile(star).anims.idle
      const img = frames[Math.floor(t * 6 * (this.reduced ? 0.25 : 1)) % frames.length]
      s.blit(img, e.counters > 0 ? x - 8 : x - 2, labelY)
    }
    if (e.counters > 0) {
      const text = `+${e.counters}`
      drawText(s, text, e.sick ? x + 1 : x - (textWidth(text) >> 1), labelY, 0x30)
    }
    if (e.look.behavior === 'adventurer' && e.inspectFacing && e.state === 'pause' && !e.sick && !e.counters) {
      drawText(s, '!', x - 1, labelY, 0x28)
    }
    if (e.look.behavior === 'clue' && e.effectAge >= 0) {
      drawText(s, '?', x - 1, top - 6 - Math.round(e.effectAge * 4), 0x28)
    }
    if (e.look.behavior === 'treasure' && e.effectAge >= 0) {
      const img = compile(sparkle).anims.idle[e.effectAge < 0.25 ? 0 : 1]
      s.blit(img, x - 7 + Math.round(e.fx * 10), top + Math.round(e.fy * 6))
    }
  }
}

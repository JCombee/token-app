import { useEffect, useRef } from 'react'
import type { Instance } from '../battlefield'
import { useDialog } from '../components/useDialog'
import { World } from './world.ts'

const TICK_MS = 1000 / 30
// With reduced motion, redraw only a few times per second.
const REDUCED_FRAME_MS = 250
// Internal resolution: the long side is about this many pixels, then scaled up by a whole number.
const TARGET_LONG_SIDE = 256

type Props = { open: boolean; field: readonly Instance[]; onClose: () => void }

// A modal dialog sits on top of everything (also an open token menu) and makes the page inert,
// so the tap that closes the world never reaches a card underneath.
export function IdleWorld({ open, field, onClose }: Props) {
  const ref = useDialog(open)

  return (
    <dialog
      ref={ref}
      className="idle-world"
      aria-label="Idle-wereld, tik om terug te gaan"
      onClose={onClose}
      onClick={() => ref.current?.close()}
      onKeyDown={() => ref.current?.close()}
    >
      {open && <WorldCanvas field={field} />}
    </dialog>
  )
}

function WorldCanvas({ field }: { field: readonly Instance[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef(field)

  useEffect(() => {
    fieldRef.current = field
  }, [field])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let world: World
    let image: ImageData
    let out: Uint32Array

    const setup = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const scale = Math.max(1, Math.round(Math.max(vw, vh) / TARGET_LONG_SIDE))
      const W = Math.ceil(vw / scale)
      const H = Math.ceil(vh / scale)
      canvas.width = W
      canvas.height = H
      canvas.style.width = `${W * scale}px`
      canvas.style.height = `${H * scale}px`
      world = new World(W, H, { reduced })
      world.sync(fieldRef.current)
      image = ctx.createImageData(W, H)
      out = new Uint32Array(image.data.buffer)
    }

    let raf = 0
    let last = 0
    let acc = 0
    let lastDraw = -Infinity
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      acc += Math.min(now - (last || now), 250)
      last = now
      world.sync(fieldRef.current)
      while (acc >= TICK_MS) {
        world.tick(TICK_MS / 1000)
        acc -= TICK_MS
      }
      if (reduced && now - lastDraw < REDUCED_FRAME_MS) return
      lastDraw = now
      world.render(out)
      ctx.putImageData(image, 0, 0)
    }

    const start = () => {
      if (raf || document.hidden) return
      last = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    // Pause while the tab or app is in the background, to save battery.
    const onVisibility = () => (document.hidden ? stop() : start())

    setup()
    start()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', setup)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', setup)
    }
  }, [])

  return <canvas ref={canvasRef} className="idle-world__canvas" />
}

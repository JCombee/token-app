import { useCallback, useEffect, useState } from 'react'

export const IDLE_TIMEOUT_MS = 6_000

const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
const AUTO_KEY = 'mtg-token-manager/auto-idle'

function loadAuto(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) !== 'off'
  } catch {
    return true
  }
}

// True after `timeoutMs` without interaction (unless auto is off), or when started by hand.
// `?idle=1` in the URL starts idle, for testing.
export function useIdle(timeoutMs = IDLE_TIMEOUT_MS) {
  const [idle, setIdle] = useState(() => new URLSearchParams(window.location.search).get('idle') === '1')
  const [auto, setAutoState] = useState(loadAuto)

  useEffect(() => {
    if (idle || !auto) return
    let timer = window.setTimeout(() => setIdle(true), timeoutMs)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), timeoutMs)
    }
    for (const type of ACTIVITY) window.addEventListener(type, reset, { capture: true, passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const type of ACTIVITY) window.removeEventListener(type, reset, { capture: true })
    }
  }, [idle, auto, timeoutMs])

  const setAuto = useCallback((on: boolean) => {
    setAutoState(on)
    try {
      localStorage.setItem(AUTO_KEY, on ? 'on' : 'off')
    } catch {
      // Not persisted (private mode); the setting still applies for this session.
    }
  }, [])

  const wake = useCallback(() => setIdle(false), [])
  const sleep = useCallback(() => setIdle(true), [])
  return { idle, wake, sleep, auto, setAuto }
}

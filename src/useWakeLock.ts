import { useEffect } from 'react'

// Keeps the screen on while the app is visible, so the phone doesn't lock and the idle world keeps running.
// Needs HTTPS (fine on Vercel; not on the LAN dev server over http). Silently does nothing where unsupported.
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let requesting = false

    const acquire = async () => {
      if (sentinel || requesting || document.visibilityState !== 'visible') return
      requesting = true
      try {
        sentinel = await navigator.wakeLock.request('screen')
        // The system releases it when the page is hidden or on low battery.
        sentinel.addEventListener('release', () => {
          sentinel = null
        })
      } catch {
        // Refused (power save, or no user gesture yet); retried on the next tap or when visible again.
      } finally {
        requesting = false
      }
    }

    acquire()
    document.addEventListener('visibilitychange', acquire)
    window.addEventListener('pointerdown', acquire, { passive: true })
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      window.removeEventListener('pointerdown', acquire)
      sentinel?.release()
    }
  }, [])
}

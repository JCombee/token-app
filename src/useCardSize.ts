import { useState } from 'react'

// Minimum card width on the battlefield, in px. 72 fits ~8 cards across an iPhone 12 mini in landscape.
export const CARD_SIZES = [56, 72, 92, 116, 144] as const
const DEFAULT_INDEX = 1
const STORAGE_KEY = 'mtg-token-manager/card-size'

function load(): number {
  try {
    const i = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isInteger(i) && i >= 0 && i < CARD_SIZES.length && localStorage.getItem(STORAGE_KEY) !== null
      ? i
      : DEFAULT_INDEX
  } catch {
    return DEFAULT_INDEX
  }
}

export function useCardSize() {
  const [index, setIndex] = useState(load)

  const change = (delta: 1 | -1) => {
    const next = Math.min(CARD_SIZES.length - 1, Math.max(0, index + delta))
    setIndex(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Not persisted (private mode).
    }
  }

  return {
    size: CARD_SIZES[index],
    canShrink: index > 0,
    canGrow: index < CARD_SIZES.length - 1,
    shrink: () => change(-1),
    grow: () => change(1),
  }
}

import { TOKENS_BY_ID, canHaveCounters } from './tokens'

export type Instance = {
  uid: string
  tokenId: string
  tapped: boolean
  sick: boolean
  counters: number
}

export type Action =
  | { type: 'add'; tokenId: string; uid: string }
  | { type: 'toggleTap'; uid: string }
  | { type: 'counter'; uid: string; delta: 1 | -1 }
  | { type: 'remove'; uid: string }
  | { type: 'untapAll' }
  | { type: 'reset' }

export function battlefieldReducer(state: Instance[], action: Action): Instance[] {
  switch (action.type) {
    case 'add': {
      const token = TOKENS_BY_ID.get(action.tokenId)
      if (!token) return state
      // Only creatures suffer from summoning sickness.
      const sick = canHaveCounters(token)
      return [...state, { uid: action.uid, tokenId: token.id, tapped: false, sick, counters: 0 }]
    }
    case 'toggleTap':
      return state.map((i) => (i.uid === action.uid ? { ...i, tapped: !i.tapped } : i))
    case 'counter':
      return state.map((i) =>
        i.uid === action.uid ? { ...i, counters: Math.max(0, i.counters + action.delta) } : i,
      )
    case 'remove':
      return state.filter((i) => i.uid !== action.uid)
    case 'untapAll':
      return state.map((i) => (i.tapped || i.sick ? { ...i, tapped: false, sick: false } : i))
    case 'reset':
      return []
  }
}

// crypto.randomUUID needs a secure context, which a phone on the LAN dev server isn't.
export function newUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const STORAGE_KEY = 'mtg-token-manager/battlefield/v1'

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

function isInstance(value: unknown): value is Instance {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.uid === 'string' &&
    typeof v.tokenId === 'string' &&
    TOKENS_BY_ID.has(v.tokenId) &&
    typeof v.tapped === 'boolean' &&
    typeof v.sick === 'boolean' &&
    typeof v.counters === 'number' &&
    Number.isInteger(v.counters) &&
    v.counters >= 0
  )
}

export function loadBattlefield(storage: KeyValueStorage = localStorage): Instance[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isInstance) : []
  } catch {
    return []
  }
}

export function saveBattlefield(state: Instance[], storage: KeyValueStorage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked (private mode): the game still works, it just won't persist.
  }
}

import { describe, expect, it } from 'vitest'
import { battlefieldReducer, loadBattlefield, saveBattlefield, type Instance } from './battlefield'
import { TOKENS_BY_ID, ptLabel } from './tokens'

function play(state: Instance[], tokenId: string, uid: string) {
  return battlefieldReducer(state, { type: 'add', tokenId, uid })
}

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('battlefieldReducer', () => {
  it('adds a separate instance per play', () => {
    const state = play(play([], 'knight', 'a'), 'knight', 'b')
    expect(state.map((i) => i.uid)).toEqual(['a', 'b'])
  })

  it('gives new creatures summoning sickness but not artifacts', () => {
    const state = play(play([], 'knight', 'a'), 'treasure', 'b')
    expect(state.map((i) => i.sick)).toEqual([true, false])
  })

  it('ignores unknown tokens', () => {
    expect(play([], 'nope', 'a')).toEqual([])
  })

  it('toggles tap on one instance only', () => {
    let state = play(play([], 'knight', 'a'), 'knight', 'b')
    state = battlefieldReducer(state, { type: 'toggleTap', uid: 'a' })
    expect(state.map((i) => i.tapped)).toEqual([true, false])
    state = battlefieldReducer(state, { type: 'toggleTap', uid: 'a' })
    expect(state[0].tapped).toBe(false)
  })

  it('never lets counters drop below zero', () => {
    let state = play([], 'knight', 'a')
    state = battlefieldReducer(state, { type: 'counter', uid: 'a', delta: 1 })
    state = battlefieldReducer(state, { type: 'counter', uid: 'a', delta: -1 })
    state = battlefieldReducer(state, { type: 'counter', uid: 'a', delta: -1 })
    expect(state[0].counters).toBe(0)
  })

  it('untap all clears tapped and summoning sickness', () => {
    let state = play(play([], 'knight', 'a'), 'treasure', 'b')
    state = battlefieldReducer(state, { type: 'toggleTap', uid: 'b' })
    state = battlefieldReducer(state, { type: 'untapAll' })
    expect(state.every((i) => !i.tapped && !i.sick)).toBe(true)
  })

  it('removes and resets', () => {
    let state = play(play([], 'knight', 'a'), 'hero', 'b')
    state = battlefieldReducer(state, { type: 'remove', uid: 'a' })
    expect(state.map((i) => i.uid)).toEqual(['b'])
    expect(battlefieldReducer(state, { type: 'reset' })).toEqual([])
  })
})

describe('persistence', () => {
  it('round-trips the battlefield', () => {
    const storage = memoryStorage()
    const state = battlefieldReducer(play([], 'knight', 'a'), { type: 'counter', uid: 'a', delta: 1 })
    saveBattlefield(state, storage)
    expect(loadBattlefield(storage)).toEqual(state)
  })

  it('returns an empty field for missing or corrupt data', () => {
    const storage = memoryStorage()
    expect(loadBattlefield(storage)).toEqual([])
    storage.setItem('mtg-token-manager/battlefield/v1', '{not json')
    expect(loadBattlefield(storage)).toEqual([])
  })

  it('drops entries for tokens that no longer exist', () => {
    const storage = memoryStorage()
    saveBattlefield(
      [
        { uid: 'a', tokenId: 'knight', tapped: false, sick: false, counters: 0 },
        { uid: 'b', tokenId: 'gone', tapped: false, sick: false, counters: 0 },
      ],
      storage,
    )
    expect(loadBattlefield(storage).map((i) => i.uid)).toEqual(['a'])
  })
})

describe('ptLabel', () => {
  it('adds counters to power and toughness', () => {
    expect(ptLabel(TOKENS_BY_ID.get('knight')!, 2)).toBe('4/4')
  })

  it('shows bare counters on a token without P/T', () => {
    expect(ptLabel(TOKENS_BY_ID.get('copy')!, 0)).toBeNull()
    expect(ptLabel(TOKENS_BY_ID.get('copy')!, 1)).toBe('+1/+1')
  })
})

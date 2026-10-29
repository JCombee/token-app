import { useEffect, useMemo, useReducer, useState } from 'react'
import { battlefieldReducer, loadBattlefield, newUid, saveBattlefield } from './battlefield'
import type { TokenDef } from './tokens'
import { Battlefield } from './components/Battlefield'
import { CardModal } from './components/CardModal'
import { TokenMenu } from './components/TokenMenu'
import { IdleWorld } from './idle/IdleWorld'
import { useIdle } from './idle/useIdle'
import { useCardSize } from './useCardSize'
import { useWakeLock } from './useWakeLock'

export default function App() {
  const [field, dispatch] = useReducer(battlefieldReducer, undefined, () => loadBattlefield())
  const [menuOpen, setMenuOpen] = useState(false)
  const [preview, setPreview] = useState<TokenDef | null>(null)
  const { idle, wake, sleep, auto, setAuto } = useIdle()
  const cardSize = useCardSize()
  useWakeLock()

  useEffect(() => saveBattlefield(field), [field])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of field) map.set(i.tokenId, (map.get(i.tokenId) ?? 0) + 1)
    return map
  }, [field])

  const canUntap = field.some((i) => i.tapped || i.sick)

  function newGame() {
    if (window.confirm('Nieuw spel? Alle tokens worden van het veld gehaald.')) dispatch({ type: 'reset' })
  }

  return (
    <>
      <main style={{ '--card-size': `${cardSize.size}px` } as React.CSSProperties}>
        <Battlefield field={field} dispatch={dispatch} />
      </main>

      {/* Right-hand rail: in landscape this sits under the right thumb. */}
      <nav className="rail">
        <button className="btn btn--primary" onClick={() => setMenuOpen(true)}>
          + Token
        </button>
        <button className="btn btn--small" onClick={newGame} disabled={field.length === 0}>
          Nieuw spel
        </button>
        <div className="rail__zoom" role="group" aria-label="Kaartgrootte">
          <button className="btn btn--small" onClick={cardSize.shrink} disabled={!cardSize.canShrink} aria-label="Kaarten kleiner">
            −
          </button>
          <button className="btn btn--small" onClick={cardSize.grow} disabled={!cardSize.canGrow} aria-label="Kaarten groter">
            +
          </button>
        </div>
        <span className="rail__count muted">{field.length} op veld</span>
        <button className="btn btn--primary btn--untap" onClick={() => dispatch({ type: 'untapAll' })} disabled={!canUntap}>
          Untap all
        </button>
      </nav>

      <TokenMenu
        open={menuOpen}
        counts={counts}
        onClose={() => setMenuOpen(false)}
        onPlay={(tokenId) => dispatch({ type: 'add', tokenId, uid: newUid() })}
        onPreview={setPreview}
        autoIdle={auto}
        onAutoIdleChange={setAuto}
        onStartIdle={() => {
          setMenuOpen(false)
          sleep()
        }}
      />
      <CardModal token={preview} onClose={() => setPreview(null)} />
      {/* Last, so it opens on top of any other dialog. */}
      <IdleWorld open={idle} field={field} onClose={wake} />
    </>
  )
}

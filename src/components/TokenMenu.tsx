import { TOKENS, type TokenDef } from '../tokens'
import { CardFace } from './CardFace'
import { useDialog } from './useDialog'

type Props = {
  open: boolean
  counts: Map<string, number>
  onClose: () => void
  onPlay: (tokenId: string) => void
  onPreview: (token: TokenDef) => void
  autoIdle: boolean
  onAutoIdleChange: (on: boolean) => void
  onStartIdle: () => void
}

export function TokenMenu({ open, counts, onClose, onPlay, onPreview, autoIdle, onAutoIdleChange, onStartIdle }: Props) {
  const ref = useDialog(open)

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="sheet__content">
        <header className="sheet__header">
          <h2>Token toevoegen</h2>
          <div className="sheet__actions">
            <button className="btn btn--small" onClick={onStartIdle}>
              Screensaver
            </button>
            <button className="btn btn--small" aria-pressed={autoIdle} onClick={() => onAutoIdleChange(!autoIdle)}>
              Auto-screensaver: {autoIdle ? 'aan' : 'uit'}
            </button>
            <button className="btn" onClick={() => ref.current?.close()}>
              Klaar
            </button>
          </div>
        </header>
        <ul className="menu-list">
          {TOKENS.map((token) => {
            const count = counts.get(token.id) ?? 0
            const label = token.pt ? `${token.name} ${token.pt.power}/${token.pt.toughness}` : token.name
            return (
              <li key={token.id} className="menu-row">
                <span className="menu-row__thumb">
                  <CardFace token={token} />
                </span>
                <span className="menu-row__info">
                  <strong>{label}</strong>
                  <small>{token.text || token.type}</small>
                </span>
                {count > 0 && (
                  <span className="menu-row__count" aria-label={`${count} op het speelveld`}>
                    ×{count}
                  </span>
                )}
                <button className="btn btn--icon" onClick={() => onPreview(token)} aria-label={`Bekijk ${label}`}>
                  ?
                </button>
                <button
                  className="btn btn--icon btn--primary"
                  onClick={() => onPlay(token.id)}
                  aria-label={`Speel ${label} uit`}
                >
                  +
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </dialog>
  )
}

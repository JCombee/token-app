import type { TokenDef } from '../tokens'
import { CardFace } from './CardFace'
import { useDialog } from './useDialog'

export function CardModal({ token, onClose }: { token: TokenDef | null; onClose: () => void }) {
  const ref = useDialog(token !== null)

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      // The dialog itself only receives clicks on the backdrop; content sits in the inner div.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      {token && (
        <div className="modal__content">
          <div className="modal__card">
            <CardFace token={token} />
          </div>
          <div className="modal__text">
            <strong>{token.name}</strong>
            <p className="muted">{token.type}</p>
            {token.text && <p>{token.text}</p>}
            {token.pt && (
              <p>
                {token.pt.power}/{token.pt.toughness}
              </p>
            )}
            <button className="btn" onClick={() => ref.current?.close()}>
              Sluiten
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}

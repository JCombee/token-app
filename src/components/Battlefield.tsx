import type { Action, Instance } from '../battlefield'
import { TOKENS_BY_ID, canHaveCounters, ptLabel } from '../tokens'
import { CardFace } from './CardFace'

export function Battlefield({ field, dispatch }: { field: Instance[]; dispatch: (a: Action) => void }) {
  if (field.length === 0) {
    return <p className="empty">Nog geen tokens. Tik op + Token.</p>
  }

  return (
    <ul className="field-grid">
      {field.map((instance) => {
        const token = TOKENS_BY_ID.get(instance.tokenId)!
        const pt = ptLabel(token, instance.counters)
        const classes = ['field-card', instance.tapped && 'is-tapped', instance.sick && 'is-sick']
        return (
          <li key={instance.uid} className={classes.filter(Boolean).join(' ')}>
            <button
              className="field-card__tap"
              onClick={() => dispatch({ type: 'toggleTap', uid: instance.uid })}
              aria-pressed={instance.tapped}
              aria-label={`${token.name}${instance.tapped ? ', getapt' : ''}${instance.sick ? ', summoning sick' : ''}`}
            >
              <span className="field-card__frame">
                <CardFace token={token} />
              </span>
              {instance.sick && <span className="badge badge--sick">Sick</span>}
              {pt && <span className={`badge badge--pt${instance.counters ? ' is-boosted' : ''}`}>{pt}</span>}
            </button>
            <div className="field-card__controls">
              {canHaveCounters(token) && (
                <>
                  <button
                    className="btn btn--mini"
                    onClick={() => dispatch({ type: 'counter', uid: instance.uid, delta: -1 })}
                    disabled={instance.counters === 0}
                    aria-label="+1/+1 counter eraf"
                  >
                    −
                  </button>
                  <button
                    className="btn btn--mini"
                    onClick={() => dispatch({ type: 'counter', uid: instance.uid, delta: 1 })}
                    aria-label="+1/+1 counter erbij"
                  >
                    +
                  </button>
                </>
              )}
              <button
                className="btn btn--mini btn--danger"
                onClick={() => dispatch({ type: 'remove', uid: instance.uid })}
                aria-label={`${token.name} van het veld halen`}
              >
                ✕
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

import { useState } from 'react'
import type { TokenDef } from '../tokens'

// Scryfall image, or a text rendition when there's no URL or the image fails (offline).
export function CardFace({ token }: { token: TokenDef }) {
  const [failed, setFailed] = useState(false)

  if (!token.imageUrl || failed) {
    return (
      <div className="card-face card-face--text" role="img" aria-label={token.name}>
        <strong>{token.name}</strong>
        <small>{token.type}</small>
        {token.text && <p>{token.text}</p>}
        {token.pt && (
          <span className="card-face__pt">
            {token.pt.power}/{token.pt.toughness}
          </span>
        )}
      </div>
    )
  }

  return (
    <img
      className="card-face"
      src={token.imageUrl}
      alt={token.name}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

#!/usr/bin/env node
// Vult de imageUrl-velden in src/.../tokens.ts met Scryfall-URLs (cards.scryfall.io/normal/...).
// Gebruik:  node scripts/resolve-token-images.mjs path/naar/tokens.ts
// Vereist Node 18+ (ingebouwde fetch).

import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Gebruik: node resolve-token-images.mjs <pad/naar/tokens.ts>')
  process.exit(1)
}

// Hints afgelezen van de screenshot. sets = token-setcodes om eerst in te zoeken,
// number = collectornummer op de kaart, artist = (deel van) artiestnaam.
// Alles is een voorkeur, geen harde eis: zonder match valt het script terug op de nieuwste print.
const WANTED = [
  { id: 'bird-landfall',  name: 'Bird',           match: /land you control enters/i, sets: ['tfin'], number: '16', artist: 'frasheski' },
  { id: 'bird-flying',    name: 'Bird',           match: /^flying$/i, sets: ['tmsc', 'tspm', 'tspe'], number: '21' },
  { id: 'clue',           name: 'Clue',           sets: ['tfrc', 'tfra', 'ttdc', 'teoc'], number: '13' },
  { id: 'copy',           name: 'Copy',           sets: ['tmsc', 'tspm'], number: '1' },
  { id: 'eldrazi-scion',  name: 'Eldrazi Scion',  sets: ['tm3c', 'tmsc'], number: '3' },
  { id: 'hero',           name: 'Hero',           sets: ['tfin'], number: '2' },
  { id: 'knight',         name: 'Knight',         match: /^$/, sets: ['tfin'], number: '10' },
  { id: 'lander',         name: 'Lander',         sets: ['teoe'], number: '4', artist: 'lunter' },
  { id: 'phyrexian-germ', name: 'Phyrexian Germ', sets: ['tfrc', 'tfra', 'ttdc'], number: '4' },
  { id: 'treasure',       name: 'Treasure',       sets: ['tfra', 'tfrc'], number: '18' },
]

const HEADERS = { 'User-Agent': 'mtg-token-manager/1.0', Accept: 'application/json' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(q) {
  const url = `https://api.scryfall.com/cards/search?unique=prints&order=released&dir=desc&q=${encodeURIComponent(q)}`
  await sleep(120) // Scryfall vraagt max ~10 requests/sec
  const res = await fetch(url, { headers: HEADERS })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`${res.status} voor ${q}`)
  return (await res.json()).data ?? []
}

// Tokens zijn vaak dubbelzijdig: pak de face met de juiste naam.
function face(card, name) {
  if (card.image_uris) return { ...card, img: card.image_uris.normal }
  const f = card.card_faces?.find((x) => x.name === name) ?? card.card_faces?.[0]
  return f?.image_uris ? { ...card, ...f, img: f.image_uris.normal } : null
}

function score(c, w) {
  let s = 0
  if (w.artist && c.artist?.toLowerCase().includes(w.artist)) s += 4
  if (w.number && String(c.collector_number) === w.number) s += 2
  if (w.sets?.includes(c.set)) s += 1
  return s
}

async function resolve(w) {
  const base = `t:token !"${w.name}"`
  const setQ = w.sets?.length ? ` (${w.sets.map((s) => `set:${s}`).join(' or ')})` : ''
  let cards = await search(base + setQ)
  if (!cards.length) cards = await search(base) // fallback: alle prints
  let faces = cards.map((c) => face(c, w.name)).filter(Boolean).filter((c) => c.name === w.name)
  if (w.match) faces = faces.filter((c) => w.match.test((c.oracle_text ?? '').trim()))
  if (!faces.length) return null
  faces.sort((a, b) => score(b, w) - score(a, w))
  return faces
}

let src = readFileSync(file, 'utf8')
for (const w of WANTED) {
  try {
    const faces = await resolve(w)
    if (!faces) {
      console.warn(`✗ ${w.id}: niets gevonden`)
      continue
    }
    const best = faces[0]
    const re = new RegExp(`(id: '${w.id}',[\\s\\S]*?imageUrl: )'[^']*'`)
    src = src.replace(re, `$1'${best.img}'`)
    console.log(`✓ ${w.id.padEnd(15)} ${best.set.toUpperCase()} #${best.collector_number} — ${best.artist}`)
    for (const alt of faces.slice(1, 4)) {
      console.log(`    alt: ${alt.set.toUpperCase()} #${alt.collector_number} — ${alt.artist}  ${alt.img}`)
    }
  } catch (e) {
    console.warn(`✗ ${w.id}: ${e.message}`)
  }
}
writeFileSync(file, src)
console.log(`\nKlaar: ${file} bijgewerkt.`)

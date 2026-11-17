// Token scheme (PROMPTS.md section 2). Plain TypeScript: no React, no Firebase.
// The TokenMap holds real names. Keep it in memory only (a React ref).
// Never store it, log it, or put it in an error message.

export const TOKEN_TYPES = [
  'PATIENT',
  'PHONE',
  'EMAIL',
  'DATE',
  'RELATIVE',
  'PERSON',
  'EMPLOYER',
  'ADDRESS',
  'ORG',
  'ID',
] as const
export type TokenType = (typeof TOKEN_TYPES)[number]

/** Regex source for one valid token, as written in PROMPTS.md section 2. */
export const TOKEN_SOURCE = String.raw`\[(PATIENT|PHONE|EMAIL|DATE|RELATIVE|PERSON|EMPLOYER|ADDRESS|ORG|ID)(_[1-9]\d?)?\]`
export const tokenRegex = () => new RegExp(TOKEN_SOURCE, 'g')

const ALWAYS_NUMBERED: ReadonlySet<TokenType> = new Set(['RELATIVE', 'PERSON', 'DATE'])
/** PATIENT, RELATIVE and PERSON share one key space: the same person gets one token. */
const PERSON_TYPES: ReadonlySet<TokenType> = new Set(['PATIENT', 'RELATIVE', 'PERSON'])
export const isPersonType = (t: TokenType) => PERSON_TYPES.has(t)

/** Titles that are dropped when two names are compared. */
export const HONORIFICS = ['mr', 'mrs', 'ms', 'miss', 'dr', 'shri', 'sri', 'smt', 'master', 'prof', 'kumari']

/** NFKC, lower case, no honorifics, no punctuation, no trailing 's, single spaces. */
export function normaliseValue(value: string): string {
  let v = value.normalize('NFKC').toLowerCase()
  v = v.replace(/['’]s(?![\p{L}\p{N}])/gu, '')
  v = v.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const words = v.split(' ').filter(Boolean)
  while (words.length > 1 && HONORIFICS.includes(words[0])) words.shift()
  return words.join(' ')
}

export interface TokenEntry {
  token: string
  type: TokenType
  /** Normalised key: same key, same token. */
  key: string
  /** The text put back by restore. For names this is the longest form seen. */
  value: string
  /** Every written form that was hidden under this token. The send guard checks all of them. */
  variants: string[]
}

export class TokenMap {
  private list: TokenEntry[] = []
  private counts = new Map<TokenType, number>()

  get size(): number {
    return this.list.length
  }

  entries(): readonly TokenEntry[] {
    return this.list
  }

  get(token: string): TokenEntry | undefined {
    return this.list.find((e) => e.token === token)
  }

  /** Find the token for this value, or make a new one. `key` overrides the normalised value (used for dates). */
  assign(type: TokenType, value: string, key?: string): TokenEntry {
    const k = key ?? (normaliseValue(value) || value.trim().toLowerCase())
    const person = PERSON_TYPES.has(type)
    for (const e of this.list) {
      const sameSpace = person ? PERSON_TYPES.has(e.type) : e.type === type
      if (!sameSpace) continue
      if (e.key === k) {
        addVariant(e, value)
        return e
      }
      if (person && key === undefined) {
        // Given-name rule: "Ramesh" and "Ramesh Patil" are one person. Keep the longer form.
        if (e.key.startsWith(k + ' ')) {
          addVariant(e, value)
          return e
        }
        if (k.startsWith(e.key + ' ') && !e.key.includes(' ')) {
          addVariant(e, value)
          e.key = k
          e.value = value
          return e
        }
      }
    }
    const n = (this.counts.get(type) ?? 0) + 1
    if (n > 99) throw new Error('Too many hidden items of one type.')
    this.counts.set(type, n)
    const token = ALWAYS_NUMBERED.has(type) || n > 1 ? `[${type}_${n}]` : `[${type}]`
    const entry: TokenEntry = { token, type, key: k, value, variants: [value] }
    this.list.push(entry)
    return entry
  }

  // Safety net: if someone logs or serialises the map by mistake, no name comes out.
  toJSON(): string {
    return '[token map hidden]'
  }
  toString(): string {
    return '[token map hidden]'
  }
}

function addVariant(e: TokenEntry, value: string) {
  if (!e.variants.includes(value)) e.variants.push(value)
}

// ---------- finding and replacing ----------

export interface Found {
  start: number
  end: number
  type: TokenType
  /** The text exactly as written in the note. */
  value: string
  /** Optional key (dates use the ISO date so two spellings share a token). */
  key?: string
}

const WORD_CHAR = String.raw`[\p{L}\p{N}]`
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Where valid tokens already sit in the text. Nothing inside them is ever matched again. */
export function tokenSpans(text: string): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = []
  for (const m of text.matchAll(tokenRegex())) out.push({ start: m.index, end: m.index + m[0].length })
  return out
}

export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end

/**
 * Whole-word, any-case search for a value. Spaces inside the value match any
 * run of spaces, line breaks, hyphens or dots, so "Arvind-Testwala" and a name
 * split over two lines are still found.
 */
export function findValue(text: string, value: string): Array<{ start: number; end: number; value: string }> {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const pattern = words.map(escapeRegex).join(String.raw`(?:[\s ]+|\s*[-.‐-―]\s*)`)
  const re = new RegExp(`(?<!${WORD_CHAR})${pattern}(?!${WORD_CHAR})`, 'giu')
  const out: Array<{ start: number; end: number; value: string }> = []
  for (const m of text.matchAll(re)) out.push({ start: m.index, end: m.index + m[0].length, value: m[0] })
  return out
}

/** Add `candidate` to `list` unless it overlaps something already there. */
export function claim(list: Found[], candidate: Found, blocked: Array<{ start: number; end: number }> = []): boolean {
  if (candidate.end <= candidate.start) return false
  if (list.some((f) => overlaps(f, candidate)) || blocked.some((b) => overlaps(b, candidate))) return false
  list.push(candidate)
  return true
}

/** Replace every found span with its token. Tokens are numbered in order of first appearance. */
export function applyFound(text: string, found: Found[], map: TokenMap): string {
  const sorted = [...found].sort((a, b) => a.start - b.start)
  let out = ''
  let pos = 0
  for (const f of sorted) {
    if (f.start < pos) continue
    const entry = map.assign(f.type, f.value, f.key)
    out += text.slice(pos, f.start) + entry.token
    pos = f.end
  }
  return out + text.slice(pos)
}

export interface HideItem {
  text: string
  type: TokenType
}

/**
 * Hide a list of values (from Gemini Nano in T4, or picked by hand in T5).
 * Longest values first, whole word, any case, every occurrence. A possessive
 * is kept: "Ramesh's" becomes "[RELATIVE_1]'s".
 * Items that cannot be found are returned in `notFound` so the screen can list them (SECURITY.md A5).
 */
export function hideValues(text: string, items: HideItem[], map: TokenMap): { text: string; notFound: HideItem[] } {
  const blocked = tokenSpans(text)
  const found: Found[] = []
  const notFound: HideItem[] = []
  const byLength = [...items].sort((a, b) => b.text.length - a.text.length)
  for (const item of byLength) {
    const hits = findValue(text, item.text)
    let placed = 0
    for (const h of hits) {
      if (claim(found, { ...h, type: item.type }, blocked)) placed++
    }
    if (placed === 0) notFound.push(item)
  }
  return { text: applyFound(text, found, map), notFound }
}

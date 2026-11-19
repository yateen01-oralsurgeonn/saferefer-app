// T5 screen logic (PROMPTS.md sections 1, 2 and 6.4). Plain TypeScript: no React, no Firebase, no network.
// The screen calls these; the Nano call itself stays in nanoRedactor.ts.
import { redactByCode } from './codeRedactor'
import { LABEL_WORDS } from './nanoRedactor'
import { hideValues, tokenRegex, TokenMap, type HideItem } from './tokens'

const fold = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Stage one, instant: the code redactor, then the words the dentist hid by hand (they become PERSON).
 * Returns a fresh map. Memory only: the screen keeps it in a React ref.
 */
export function redactFirst(note: string, manualHides: string[]): { map: TokenMap; text: string; notFound: HideItem[] } {
  const map = new TokenMap()
  const code = redactByCode(note, map)
  const items: HideItem[] = manualHides.map((text) => ({ text, type: 'PERSON' }))
  const hidden = hideValues(code.text, items, map)
  return { map, text: hidden.text, notFound: hidden.notFound }
}

/**
 * Show text again where the dentist clicked a token ("this is not an identifier").
 * `unhidden` holds the written forms (texts), so it survives a re-run that makes new tokens.
 * A token with more than one written form is put back as its longest form (the same rule as restore).
 */
export function unhideTokens(text: string, map: TokenMap, unhidden: readonly string[]): string {
  if (unhidden.length === 0) return text
  const set = new Set(unhidden.map(fold))
  let out = text
  for (const e of map.entries()) {
    if (!e.variants.some((v) => set.has(fold(v)))) continue
    out = out.split(e.token).join(e.variants.length === 1 ? e.variants[0] : e.value)
  }
  return out
}

// ---------- possible misses (PROMPTS.md 6.4) ----------

export interface Segment {
  kind: 'text' | 'token' | 'amber'
  text: string
}

const MONTHS_DAYS = [
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

export interface SegmentOptions {
  /** Normalised clinical words and drug names (buildTermSet) plus shorthand. */
  safe: ReadonlySet<string>
  /** Texts the dentist un-hid by hand. They are never underlined. */
  allowed: readonly string[]
}

const CAP_WORD = /(?<![\p{L}\p{M}\p{N}])\p{Lu}[\p{L}\p{M}'’]+(?![\p{L}\p{M}\p{N}])/gu

/**
 * Split the preview into plain text, tokens and "possible missed name" words.
 * Amber: a capitalised word that is not at a sentence start, not a clinical word, not a label word,
 * not a month or weekday, not un-hidden by the dentist, and not hidden. It is a hint, not a guarantee.
 */
export function segmentPreview(text: string, options: SegmentOptions): Segment[] {
  const allowed = options.allowed.map(fold)
  const out: Segment[] = []
  const push = (kind: Segment['kind'], t: string) => {
    if (!t) return
    const last = out[out.length - 1]
    if (last && last.kind === kind && kind !== 'token') last.text += t
    else out.push({ kind, text: t })
  }
  const plain = (chunk: string, offset: number) => {
    let pos = 0
    for (const m of chunk.matchAll(CAP_WORD)) {
      const start = m.index
      push('text', chunk.slice(pos, start))
      pos = start + m[0].length
      // Sentence start: nothing before it, or the last mark before it (ignoring spaces and quotes) ends a sentence.
      const before = text.slice(0, offset + start).replace(/[ \t"'(“‘]+$/u, '')
      const sentenceStart = before === '' || /[.!?\n]$/.test(before)
      const word = fold(m[0]).replace(/['’]s$/, '')
      const safe =
        sentenceStart ||
        options.safe.has(word) ||
        LABEL_WORDS.has(word) ||
        MONTHS_DAYS.includes(word) ||
        allowed.some((a) => a === word || a.split(' ').includes(word))
      push(safe ? 'text' : 'amber', m[0])
    }
    push('text', chunk.slice(pos))
  }
  let pos = 0
  for (const m of text.matchAll(tokenRegex())) {
    plain(text.slice(pos, m.index), pos)
    push('token', m[0])
    pos = m.index + m[0].length
  }
  plain(text.slice(pos), pos)
  return out
}

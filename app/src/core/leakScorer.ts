// T8 leak scorer (SPECS.md section 1). Logic only: no page, no model, no network.
// It reads the anonymous text and the note's known identifier list, and says what leaked.
// A bad score is a result to show, never to hide.
import { HONORIFICS, tokenRegex } from './tokens'

export interface Identifier {
  type: string
  value: string
}
export interface TestNote {
  id: string
  text: string
  identifiers: Identifier[]
}
export type LeakKind = 'exact' | 'case' | 'split' | 'partial' | 'clean'

export interface LeakResult {
  noteId: string
  type: string
  value: string
  kind: LeakKind
  /** The leftover text with 30 characters on each side. Empty when clean. Screen only. */
  context: string
}

/** Words that are too ordinary to count as a leaked piece of an address or organisation (SPECS.md). */
const STOP_WORDS = new Set(['road', 'street', 'lane', 'flat', 'towers', 'school', 'public', 'clinic', 'hospital'])

const lower = (s: string) => s.normalize('NFKC').toLowerCase()
const squash = (s: string) => lower(s).replace(/[^\p{L}\p{N}]/gu, '')
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function context(segment: string, index: number, length: number): string {
  return segment.slice(Math.max(0, index - 30), index + length + 30)
}

/** Whole-word, any-case search for a piece. Returns its position or -1. */
function findWord(segment: string, piece: string): number {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc(lower(piece)).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`, 'u')
  const m = re.exec(lower(segment))
  return m ? m.index : -1
}

const DIGIT_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
}
/** Digits of a text. Digit words count too, so a phone written in words can be scored. */
function digitsOf(s: string): string {
  return lower(s)
    .replace(/[\p{L}]+/gu, (w) => DIGIT_WORDS[w] ?? ' ')
    .replace(/\D/g, '')
}

/** The pieces of an identifier that count as a partial leak if left behind. */
export function partialPieces(id: Identifier): { words: string[]; digitTail?: string; substrings: string[] } {
  const value = id.value
  switch (id.type) {
    case 'name':
    case 'relative': {
      const words = lower(value)
        .split(/[^\p{L}]+/u)
        .filter((w) => w.length >= 3 && !HONORIFICS.includes(w))
      return { words, substrings: [] }
    }
    case 'phone': {
      const d = digitsOf(value)
      return { words: [], digitTail: d.length >= 5 ? d.slice(-5) : undefined, substrings: [] }
    }
    case 'email':
      return { words: [value.split('@')[0]], substrings: [] }
    case 'date':
    case 'dob': {
      // Day and month without the year: "03/11", "2 Nov", "3 March", "first of January".
      const noYear = value
        .replace(/[\s,/.-]+(?:\d{4}|(?:nineteen|twenty)\s+[\p{L}\s-]+|two\s+thousand[\p{L}\s-]*)$/iu, '')
        .trim()
      return { words: noYear && noYear !== value ? [noYear] : [], substrings: [] }
    }
    case 'record_id': {
      const runs = value.match(/\d{4,}/g) ?? []
      return { words: [], substrings: runs }
    }
    case 'address':
    case 'organization': {
      const pieces = value.includes(',') ? value.split(',').map((p) => p.trim()).filter(Boolean) : []
      const words = lower(value)
        .split(/[^\p{L}]+/u)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
      const digitRuns = value.match(/\d{5,}/g) ?? []
      return { words: [...pieces, ...words], substrings: digitRuns }
    }
    default:
      return { words: [], substrings: [] }
  }
}

/** Score one identifier against the anonymous text. The first rule that matches wins. */
export function scoreIdentifier(anonText: string, id: Identifier, noteId = ''): LeakResult {
  // Cut at every token, so text on two sides of a token is never joined.
  const segments = anonText.replace(tokenRegex(), '\u0001').split('\u0001')
  const result = (kind: LeakKind, ctx = ''): LeakResult => ({ noteId, type: id.type, value: id.value, kind, context: ctx })
  const value = id.value

  for (const seg of segments) {
    const i = seg.indexOf(value)
    if (i >= 0) return result('exact', context(seg, i, value.length))
  }
  for (const seg of segments) {
    const i = lower(seg).indexOf(lower(value))
    if (i >= 0) return result('case', context(seg, i, value.length))
  }
  const sq = squash(value)
  if (sq) {
    for (const seg of segments) if (squash(seg).includes(sq)) return result('split', seg.trim().slice(0, 90))
  }
  const pieces = partialPieces(id)
  for (const seg of segments) {
    for (const w of pieces.words) {
      const i = findWord(seg, w)
      if (i >= 0) return result('partial', context(seg, i, w.length))
    }
    for (const s of pieces.substrings) {
      const i = seg.indexOf(s)
      if (i >= 0) return result('partial', context(seg, i, s.length))
    }
    if (pieces.digitTail && digitsOf(seg).includes(pieces.digitTail)) return result('partial', seg.trim().slice(0, 90))
  }
  return result('clean')
}

export function scoreNote(anonText: string, note: TestNote): LeakResult[] {
  return note.identifiers.map((id) => scoreIdentifier(anonText, id, note.id))
}

/**
 * Every identifier value must be in its own note's text. A value that is not in
 * the note can never leak, so it would make the score look better than it is.
 * Returns the error message to show, or null when the data is fine.
 */
export function checkTestData(notes: TestNote[]): string | null {
  for (const n of notes) {
    for (const id of n.identifiers) if (!n.text.includes(id.value)) return `Test data error in note ${n.id}`
  }
  return null
}

export interface LeakSummary {
  /** X: identifiers whose result is not clean. A partial leak counts as a full leak. */
  leaked: number
  /** Y: identifiers in the file, counted at run time. */
  total: number
  /** "Identifiers leaked: X of Y" */
  headline: string
  /** X / Y as a percentage with one decimal, for example "12.9%". */
  percent: string
  byKind: Record<Exclude<LeakKind, 'clean'>, number>
  byType: Record<string, { leaked: number; total: number }>
  /** One row per leaked identifier. Always shown in full. */
  misses: LeakResult[]
}

export function summarise(results: LeakResult[]): LeakSummary {
  const misses = results.filter((r) => r.kind !== 'clean')
  const byKind = { exact: 0, case: 0, split: 0, partial: 0 }
  const byType: LeakSummary['byType'] = {}
  for (const r of results) {
    byType[r.type] ??= { leaked: 0, total: 0 }
    byType[r.type].total++
    if (r.kind !== 'clean') {
      byType[r.type].leaked++
      byKind[r.kind]++
    }
  }
  const total = results.length
  const percent = total === 0 ? '0.0%' : `${((misses.length / total) * 100).toFixed(1)}%`
  return { leaked: misses.length, total, headline: `Identifiers leaked: ${misses.length} of ${total}`, percent, byKind, byType, misses }
}

/**
 * Run the whole test. `redact` is passed in: the page gives code + Nano, a unit test gives code only.
 * If `redact` throws for a note (Nano failed), `fallback` is used for that note and the note stays in Y.
 * A failed note is never skipped and never counted as clean.
 */
export async function runLeakTest(
  notes: TestNote[],
  redact: (text: string) => Promise<string> | string,
  fallback: (text: string) => string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ error: string } | { error: null; summary: LeakSummary; failedNotes: string[] }> {
  const error = checkTestData(notes)
  if (error) return { error }
  const results: LeakResult[] = []
  const failedNotes: string[] = []
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    let anon: string
    try {
      anon = await redact(n.text)
    } catch {
      failedNotes.push(n.id)
      anon = fallback(n.text)
    }
    results.push(...scoreNote(anon, n))
    onProgress?.(i + 1, notes.length)
  }
  return { error: null, summary: summarise(results), failedNotes }
}

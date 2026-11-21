// T16 "My terms": the places, labs/organisations and ID formats a user chooses to remember on their own device.
// Plain TypeScript: no React, Firebase, fetch or storage (HANDOVER rule). The store is app/src/myTermsStore.ts.
// D1: NEVER a person's name. D2: there is no "never hide" list. D4: an ID format is a shape (prefix), never a number.
import { findDates, findEmails, findPhones, isFdi } from './patterns'
import { NO_RULES, type RedactRules } from './redactRules'
import { escapeRegex, HONORIFICS, NAME_ENDING, type Found, type HideItem } from './tokens'

export type SavedTerm = { kind: 'place' | 'org'; text: string } | { kind: 'idFormat'; prefix: string }

export type TermProblem =
  | 'too-short'
  | 'too-long'
  | 'bad-characters'
  | 'long-number'
  | 'phone'
  | 'email'
  | 'date'
  | 'amount'
  | 'tooth-number'
  | 'clinical-term'
  | 'looks-like-name'
  | 'not-an-id-format'
  | 'full'

export interface Problem {
  problem: TermProblem
  /** Plain words for the dentist. */
  message: string
}

export const MAX_TERMS = 200
export const MAX_TERM_LENGTH = 60

export const TERM_MESSAGES: Readonly<Record<TermProblem, string>> = {
  'too-short': 'That is too short to remember.',
  'too-long': 'That is too long to remember (60 characters at most).',
  'bad-characters': "Only letters, digits, spaces and . , ' - / can be remembered.",
  'long-number': 'A long number is not remembered (it could be a phone or an ID).',
  phone: 'A phone number is not remembered.',
  email: 'An email address is not remembered.',
  date: 'A date is not remembered.',
  amount: 'An amount is not remembered.',
  'tooth-number': 'A tooth number is not remembered.',
  'clinical-term': 'That is a clinical or drug word, so it is not remembered.',
  'looks-like-name': 'It looks like a person’s name. Names are never remembered.',
  'not-an-id-format': 'That does not look like an ID such as OP-731.',
  full: 'The list is full (200). Delete one first.',
}

const problem = (p: TermProblem): Problem => ({ problem: p, message: TERM_MESSAGES[p] })
export const isProblem = (x: SavedTerm | Problem): x is Problem => 'problem' in x

export const foldTerm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
const termKey = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** The key two terms share when they are the same thing (case, spacing). */
export function termId(t: SavedTerm): string {
  return t.kind === 'idFormat' ? `id:${foldTerm(t.prefix)}` : `${t.kind}:${foldTerm(t.text)}`
}

const ALLOWED_CHARS = /^[\p{L}\p{M}\p{N} .,'’/-]+$/u
const AMOUNT = /(?:rs\.?|inr|₹)\s*\d|\d\s*(?:lakhs?|crores?|rupees|rs\b)/i
const TITLE_OR_RELATION = new RegExp(
  String.raw`^(?:${[...HONORIFICS, 'fr', 'rev', 'husband', 'wife', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'uncle', 'aunt', 'aai', 'baba', 'bhau', 'tai'].join('|')})\.?\s`,
  'i',
)
const NAME_END_WORD = new RegExp(String.raw`[\p{L}]{3,}${NAME_ENDING}$`, 'iu')

function checkText(raw: string, terms: ReadonlySet<string>): TermProblem | null {
  const text = raw.trim()
  const squashed = text.replace(/[ .,'’/-]/g, '')
  if (/^\d{2}$/.test(squashed) && isFdi(squashed)) return 'tooth-number'
  if (/^(?:tooth|teeth)\s+\d{2}$/i.test(text)) return 'tooth-number'
  if (text.length <= 2) return 'too-short'
  if (text.length > MAX_TERM_LENGTH) return 'too-long'
  if (findEmails(text).length) return 'email'
  if (!ALLOWED_CHARS.test(text)) return 'bad-characters'
  if (findDates(text).length) return 'date'
  if (findPhones(text).length) return 'phone'
  if (/\d{5,}/.test(squashed)) return 'long-number'
  if (AMOUNT.test(text)) return 'amount'
  if (terms.has(termKey(text))) return 'clinical-term'
  const words = text.split(/\s+/)
  if (TITLE_OR_RELATION.test(text) || words.some((w) => NAME_END_WORD.test(w))) return 'looks-like-name'
  return null
}

/** Check a place or organisation the user wants to remember. `termSet` is buildTermSet(lists). */
export function validateTerm(
  input: { kind: 'place' | 'org'; text: string },
  termSet: ReadonlySet<string>,
  existing: readonly SavedTerm[] = [],
): SavedTerm | Problem {
  const id = `${input.kind}:${foldTerm(input.text)}`
  if (existing.length >= MAX_TERMS && !existing.some((t) => termId(t) === id)) return problem('full')
  const bad = checkText(input.text, termSet)
  if (bad) return problem(bad)
  return { kind: input.kind, text: input.text.trim().replace(/\s+/g, ' ') }
}

const ID_SHAPE = /^([a-z]{1,5})[-/ ]?\d{1,6}$/i

/** Clinical short forms (same list as places.ts NOT_AN_ID) plus words that precede numbers in everyday notes. */
const BASE_NOT_PREFIX = [
  'bp', 'asa', 'covid', 'hiv', 'inr', 'pt', 'rbs', 'fbs', 'hb', 'iopa', 'opg', 'cbct', 'rct', 'fdi', 'gic', 'mta', 'pfm', 'rpd', 'fpd',
  'cd', 'la', 'tmj', 'spo', 'hr', 'rr', 'pr', 'rvg', 'ttp', 'bop', 'srp', 'cal', 'pd', 'rs', 'age', 'day', 'wk', 'mg', 'ml',
]

/**
 * "op-731", "OP 4471", "ort/48" -> { idFormat, prefix }. Anything else, or a prefix that is a clinical short form
 * or a pack notIdPrefixes entry ("rct", "gstr"), gives null. The number is never kept (D4).
 */
export function deriveIdFormat(text: string, termSet: ReadonlySet<string> = new Set(), notIdPrefixes: readonly string[] = []): SavedTerm | null {
  const m = ID_SHAPE.exec(text.trim())
  if (!m) return null
  const prefix = m[1].toLowerCase()
  const blocked = new Set([...notIdPrefixes.map((p) => p.toLowerCase()), ...BASE_NOT_PREFIX])
  if (prefix.length < 2 || blocked.has(prefix) || termSet.has(termKey(prefix))) return null
  return { kind: 'idFormat', prefix }
}

/** For the [ID format] button: derive first, then the list-size check. */
export function validateIdFormat(
  text: string,
  termSet: ReadonlySet<string>,
  notIdPrefixes: readonly string[] = [],
  existing: readonly SavedTerm[] = [],
): SavedTerm | Problem {
  const t = deriveIdFormat(text, termSet, notIdPrefixes)
  if (!t) return problem('not-an-id-format')
  if (existing.length >= MAX_TERMS && !existing.some((e) => termId(e) === termId(t))) return problem('full')
  return t
}

/** Fold duplicates (NFKC, lower case, spacing); keeps the first of each. */
export function dedupeTerms(terms: readonly SavedTerm[]): SavedTerm[] {
  const seen = new Set<string>()
  const out: SavedTerm[] = []
  for (const t of terms) {
    const id = termId(t)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(t)
  }
  return out
}

/** Re-check terms read back from storage. Anything that does not pass is ignored, never trusted. */
export function sanitiseTerms(raw: unknown, termSet: ReadonlySet<string>): SavedTerm[] {
  if (!Array.isArray(raw)) return []
  const out: SavedTerm[] = []
  for (const r of raw.slice(0, MAX_TERMS)) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    if ((o.kind === 'place' || o.kind === 'org') && typeof o.text === 'string') {
      const v = validateTerm({ kind: o.kind, text: o.text }, termSet)
      if (!isProblem(v)) out.push(v)
    } else if (o.kind === 'idFormat' && typeof o.prefix === 'string') {
      const v = deriveIdFormat(`${o.prefix}1`, termSet)
      if (v) out.push(v)
    }
  }
  return dedupeTerms(out)
}

/** Places and organisations become hide items (ADDRESS / ORG). ID formats are rules, see termsToRules. */
export function termsToHideItems(terms: readonly SavedTerm[]): HideItem[] {
  const out: HideItem[] = []
  for (const t of terms) {
    if (t.kind === 'place') out.push({ text: t.text, type: 'ADDRESS' })
    else if (t.kind === 'org') out.push({ text: t.text, type: 'ORG' })
  }
  return out
}

/** `base` plus one extra ID finder per saved ID format. Rules only add (redactRules.ts contract). */
export function termsToRules(terms: readonly SavedTerm[], base: RedactRules = NO_RULES): RedactRules {
  const prefixes = [...new Set(terms.flatMap((t) => (t.kind === 'idFormat' ? [t.prefix.toLowerCase()] : [])))]
  if (prefixes.length === 0) return base
  // Not after "post"/"pre" ("post-op 3", "pre op 2") and not before a time unit ("op 2 weeks"): clinical wording, not an ID.
  const re = new RegExp(
    String.raw`(?<![\p{L}\p{N}])(?<!(?:post|pre)[- ]?)(?:${prefixes.map(escapeRegex).join('|')})[-/ ]?\d{1,6}(?!\p{N})(?![ \t]*(?:d|days?|wks?|weeks?|mths?|months?|hrs?|hours?|yrs?|years?|times?|x)(?![\p{L}]))`,
    'giu',
  )
  const finder = (text: string, taken: Array<{ start: number; end: number }>): Found[] => {
    const out: Found[] = []
    for (const m of text.matchAll(re)) {
      const f: Found = { start: m.index, end: m.index + m[0].length, type: 'ID', value: m[0] }
      if (!taken.some((t) => t.start < f.end && f.start < t.end)) out.push(f)
    }
    return out
  }
  return { ...base, extraIds: [...(base.extraIds ?? []), finder] }
}

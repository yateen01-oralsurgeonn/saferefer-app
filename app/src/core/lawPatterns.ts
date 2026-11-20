// P3 advocate patterns (PACKS.md). Plain code: no model, no network.
// They find what a case note carries that names a matter: case numbers, FIR numbers, CNR, cheque numbers,
// bar enrolment numbers, police stations, and confidential settlement sums. Aadhaar and PAN come from the
// shared finders (caPatterns.ts and the base places.ts).
// WHAT STAYS: Act names, section numbers, court names, hearing stage, and claim or cheque amounts.
// Only a sum written next to "settlement", "settled" or "compromise" is hidden (PACKS.md section 3).
import { findAadhaarIds, findAmounts } from './caPatterns'
import type { Found } from './tokens'

type Span = { start: number; end: number }
const hit = (list: Span[], s: Span) => list.some((t) => t.start < s.end && s.start < t.end)

// "Crime No. 88/2026", "CC 412/2026", "Civil Suit 55 of 2026", "RCS 77/2024", "sessions case no 19 of 2026"
const CASE_LABEL =
  String.raw`(?:fir|crime|cr\.?|case|appeal|petition|suit|application|complaint|revision|reference|execution|arbitration|bail|misc(?:ellaneous)?|c\.?\s?c\.?|s\.?\s?c\.?\s?c\.?|w\.?\s?p\.?|r\.?\s?c\.?\s?s\.?|r\.?\s?c\.?\s?a\.?|o\.?\s?s\.?|m\.?\s?a\.?\s?c\.?\s?p\.?|c\.?\s?r\.?\s?a\.?|b\.?\s?a\.?|crl\.?)`
const CASE_NO_RE = new RegExp(
  String.raw`(?<![\p{L}])${CASE_LABEL}\s*(?:no\.?|number|#)?\s*[:#-]?\s*(\d{1,6}\s*(?:\/|of)\s*\d{2,4})(?![\d/])`,
  'giu',
)
// "cheque no. 004512"
const CHEQUE_RE = /(?<![\p{L}])(?:cheque|check)\s*(?:no\.?|number|#)?\s*[:#-]?\s*(\d{5,9})(?!\d)/giu
// CNR: 4 letters (state and district), 12 digits
const CNR_RE = /(?<![A-Za-z0-9])[A-Za-z]{4}\d{12}(?![A-Za-z0-9])/g
// Bar enrolment: "MH/1234/2015", "D/567/2019", also lower case "mah/1754/2018" (harness fix 20 Nov 2026, TUNE-set misses)
const ENROL_RE = /(?<![A-Za-z0-9/])[A-Z]{1,3}\/\d{3,5}\/\d{4}(?![\d/])/gi
// "Fakepur police station", "P.S. Samplepur", "police station: Example Nagar"
const POLICE_AFTER_RE =
  /(?<![\p{L}])(?:[Pp]\.?\s?[Ss]\.|[Pp]olice\s+[Ss]tation|[Pp]olice\s+[Cc]howki)\s*[:,-]?\s+(\p{Lu}[\p{L}'-]*(?:\s+\p{Lu}[\p{L}'-]*){0,2})/gu
const POLICE_BEFORE_RE = /(?<![\p{L}])(\p{Lu}[\p{L}'-]*(?:\s+\p{Lu}[\p{L}'-]*){0,1})\s+[Pp]olice\s+[Ss]tation/gu

const SUM =
  String.raw`(?:(?:₹|\bRs\.?|\bINR)\s*\d[\d,]*(?:\.\d+)?(?:\s*(?:lakhs?|lacs?|crores?|cr\b))?|\d[\d,]*(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?))`
const WORD = String.raw`(?:settlement|settled|settle|compromise|compromised)`
// the sum within 50 characters of the word, inside one sentence (a dot followed by a space ends it)
const GAP = String.raw`(?:(?!\.\s)[^\n]){0,50}?`
const SETTLE_AFTER_RE = new RegExp(String.raw`(?<![\p{L}])${WORD}${GAP}(${SUM})`, 'giu')
const SETTLE_BEFORE_RE = new RegExp(String.raw`(${SUM})${GAP}(?<![\p{L}])${WORD}`, 'giu')

/** Spans of confidential settlement sums. */
export function findSettlementSums(text: string): Span[] {
  const out: Span[] = []
  const add = (start: number, value: string) => {
    const s = { start, end: start + value.length }
    if (!hit(out, s)) out.push(s)
  }
  for (const m of text.matchAll(SETTLE_AFTER_RE)) add(m.index + m[0].length - m[1].length, m[1])
  for (const m of text.matchAll(SETTLE_BEFORE_RE)) add(m.index, m[1])
  return out
}

export function findLawIds(text: string, taken: Span[] = []): Found[] {
  const out: Found[] = []
  const add = (start: number, value: string, type: Found['type'] = 'ID') => {
    const f: Found = { start, end: start + value.length, type, value }
    if (!hit(taken, f) && !hit(out, f)) out.push(f)
  }
  for (const s of findSettlementSums(text)) add(s.start, text.slice(s.start, s.end))
  for (const m of text.matchAll(CASE_NO_RE)) add(m.index + m[0].length - m[1].length, m[1])
  for (const m of text.matchAll(CHEQUE_RE)) add(m.index + m[0].length - m[1].length, m[1])
  for (const m of text.matchAll(CNR_RE)) add(m.index, m[0])
  for (const m of text.matchAll(ENROL_RE)) add(m.index, m[0])
  for (const m of text.matchAll(POLICE_AFTER_RE)) add(m.index + m[0].length - m[1].length, m[1], 'ORG')
  for (const m of text.matchAll(POLICE_BEFORE_RE)) add(m.index, m[1], 'ORG')
  for (const f of findAadhaarIds(text, [...taken, ...out])) add(f.start, f.value)
  return out
}

/** Amounts that stay (claims, cheques), minus the settlement sums, which are hidden. */
export function findLawProtect(text: string): Span[] {
  const settle = findSettlementSums(text)
  return findAmounts(text).filter((a) => !hit(settle, a))
}

/** Statute and case-type short forms that look like an ID ("IPC-302") but are not: they stay. */
export const LAW_NOT_AN_ID: readonly string[] = [
  'IPC', 'CRPC', 'CPC', 'NDPS', 'POCSO', 'BNS', 'BNSS', 'BSA', 'UAPA', 'PMLA', 'RERA', 'SARFAESI', 'NCLT', 'NCLAT', 'MACT',
  'SEC', 'ART', 'ORD', 'RULE', 'CNR',
]

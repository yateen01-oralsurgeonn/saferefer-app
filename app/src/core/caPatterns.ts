// P2 chartered-accountant patterns (PACKS.md). Plain code: no model, no network.
// They find IDs a CA's client note carries: GSTIN, TAN, Aadhaar, bank account, IFSC, UDIN, CIN.
// (PAN is already found by the base finder in places.ts.)
// Hiding a value that was typed wrongly is the safe side, so shapes are matched, not only valid check digits.
// AMOUNTS ARE NOT HIDDEN (PACKS.md decision 1). `findAmounts` returns the spans that must be left alone, so
// that a phone or ID rule can never swallow "Rs 12500000" or "45 lakh".
import type { Found } from './tokens'

type Span = { start: number; end: number }
const hit = (list: Span[], s: Span) => list.some((t) => t.start < s.end && s.start < t.end)

// ---------- Verhoeff (the Aadhaar check digit) ----------
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
/** True when a digit string passes the Verhoeff check (used for Aadhaar). */
export function verhoeffOk(digits: string): boolean {
  let c = 0
  const rev = digits.split('').reverse()
  for (let i = 0; i < rev.length; i++) c = D[c][P[i % 8][Number(rev[i])]]
  return c === 0
}

// ---------- IDs ----------
const STATE = String.raw`(?:0[1-9]|[12]\d|3[0-8]|9[79])`
const PAN_BODY = String.raw`[A-Z]{5}\d{4}[A-Z]`
// 15 characters: state code, PAN, entity number, "Z", check character.
const GSTIN_RE = new RegExp(String.raw`(?<![A-Za-z0-9])${STATE}${PAN_BODY}[1-9A-Z]Z[0-9A-Z](?![A-Za-z0-9])`, 'gi')
const TAN_RE = /(?<![A-Za-z0-9])[A-Z]{4}\d{5}[A-Z](?![A-Za-z0-9])/g
const IFSC_RE = /(?<![A-Za-z0-9])[A-Z]{4}0[A-Z0-9]{6}(?![A-Za-z0-9])/g
const CIN_RE = /(?<![A-Za-z0-9])[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}(?![A-Za-z0-9])/g
const UDIN_RE = /(?<![\p{L}])UDIN\s*[:#-]?\s*([A-Z0-9]{18})(?![A-Za-z0-9])/giu
const AADHAAR_RE = /(?<![\d])[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?![\d])/g
// "A/c No. 123456789012", "account number: 1234 5678 9012 34", "acct 00112233445"
const ACCOUNT_RE =
  /(?<![\p{L}])(?:a\/c|acct?\.?|account)(?:\s*(?:no\.?|number|num|#))?\s*[:#-]?\s*(\d[\d ]{7,22}\d)(?![\d])/giu

export function findCaIds(text: string, taken: Span[] = []): Found[] {
  const out: Found[] = []
  const add = (start: number, value: string) => {
    const f: Found = { start, end: start + value.length, type: 'ID', value }
    if (!hit(taken, f) && !hit(out, f)) out.push(f)
  }
  for (const m of text.matchAll(GSTIN_RE)) add(m.index, m[0])
  for (const m of text.matchAll(CIN_RE)) add(m.index, m[0])
  for (const m of text.matchAll(UDIN_RE)) add(m.index + m[0].length - m[1].length, m[1])
  for (const m of text.matchAll(ACCOUNT_RE)) {
    const digits = m[1].replace(/ /g, '')
    if (digits.length >= 9 && digits.length <= 18) add(m.index + m[0].length - m[1].length, m[1])
  }
  for (const m of text.matchAll(IFSC_RE)) add(m.index, m[0])
  for (const m of text.matchAll(TAN_RE)) add(m.index, m[0])
  for (const f of findAadhaarIds(text, [...taken, ...out])) add(f.start, f.value)
  return out
}

/** Aadhaar: 12 digits in any spacing, with a valid Verhoeff check digit (so a plain amount is left alone). */
export function findAadhaarIds(text: string, taken: Span[] = []): Found[] {
  const out: Found[] = []
  for (const m of text.matchAll(AADHAAR_RE)) {
    const f: Found = { start: m.index, end: m.index + m[0].length, type: 'ID', value: m[0] }
    if (verhoeffOk(m[0].replace(/\D/g, '')) && !hit(taken, f)) out.push(f)
  }
  return out
}

// ---------- amounts: never hidden ----------
const AMOUNT_RES = [
  // Rs 12,50,000 / ₹ 45 lakh / INR 1.2 crore
  /(?:₹|\bRs\.?|\bINR)\s*\d[\d,]*(?:\.\d+)?(?:\s*(?:lakhs?|lacs?|crores?|cr\b|k\b|million|mn\b))?/giu,
  // 45 lakh / 2.5 crore
  /(?<![\p{L}\d])\d[\d,]*(?:\.\d+)?\s*(?:lakhs?|lacs?|crores?)(?![\p{L}])/giu,
  // 12,50,000/-
  /(?<![\p{L}\d])\d[\d,]*(?:\.\d+)?\s*\/-/gu,
]

/** Spans that hold a money amount. The redactor must not hide, split or claim them. */
export function findAmounts(text: string): Span[] {
  const out: Span[] = []
  for (const re of AMOUNT_RES) {
    for (const m of text.matchAll(re)) {
      // A bare 10-digit number that starts 6-9 has a mobile number's shape: never protected, so it is still hidden.
      const bare = m[0].replace(/\D/g, '')
      if (!/[,.]/.test(m[0]) && /^[6-9]\d{9}$/.test(bare)) continue
      out.push({ start: m.index, end: m.index + m[0].length })
    }
  }
  return out
}

/** Form and return names that look like IDs ("GSTR-3B", "ITR-4") but are not: they stay in the note. */
export const CA_NOT_AN_ID: readonly string[] = [
  'ITR', 'GSTR', 'TDS', 'TCS', 'FORM', 'ITC', 'AS', 'ASMT', 'DRC', 'REG', 'CMP', 'PMT', 'ITNS', 'ITD', 'CA', 'FY', 'AY',
]

// Phone, email and date finders. Shared by the code redactor and the send guard,
// so the guard can never be weaker than the redactor. Plain code, no model.
import type { Found } from './tokens'

type Span = { start: number; end: number }

const FDI = new Set<string>()
for (const q of [1, 2, 3, 4]) for (let t = 1; t <= 8; t++) FDI.add(`${q}${t}`)
for (const q of [5, 6, 7, 8]) for (let t = 1; t <= 5; t++) FDI.add(`${q}${t}`)
export const isFdi = (s: string) => FDI.has(s)

// ---------- email ----------

const EMAIL_RE = /[\p{L}\p{N}._%+-]+\s?@\s?[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu
// "name at example dot com", "name (at) example (dot) co (dot) in"
const EMAIL_WORDS_RE =
  /[\p{L}\p{N}._%+-]+\s*(?:\(at\)|\[at\]|\sat\s)\s*[\p{L}\p{N}-]+(?:\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*[\p{L}\p{N}-]+)*\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*(?:com|in|org|net|co|edu|gov|info)\b(?:\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*in\b)?/giu

// Anything else with an @ glued to a word: "asha@example", "@asha_handle"
const AT_WORD_RE = /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]*@[\p{L}\p{N}_][\p{L}\p{N}._-]*/gu

export function findEmails(text: string): Found[] {
  const out: Found[] = []
  for (const re of [EMAIL_RE, EMAIL_WORDS_RE, AT_WORD_RE]) {
    for (const m of text.matchAll(re)) {
      const f: Found = { start: m.index, end: m.index + m[0].length, type: 'EMAIL', value: m[0] }
      if (!out.some((o) => o.start < f.end && f.start < o.end)) out.push(f)
    }
  }
  return out
}

// ---------- dates ----------

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'

const ONES = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth']
const ORDINALS: Record<string, number> = {}
;[
  ...ONES, 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth',
  'seventeenth', 'eighteenth', 'nineteenth', 'twentieth',
].forEach((w, i) => (ORDINALS[w] = i + 1))
ONES.forEach((w, i) => (ORDINALS[`twenty${w}`] = 21 + i))
ORDINALS['thirtieth'] = 30
ORDINALS['thirtyfirst'] = 31
const ORDINAL = `(?:twenty[\\s-]?(?:${ONES.join('|')})|thirty[\\s-]?first|thirtieth|twentieth|${[
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'tenth',
].join('|')}|${ONES.join('|')})`

const NUM_WORDS: Record<string, number> = {
  zero: 0, oh: 0, o: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
}
const SMALL = '(?:one|two|three|four|five|six|seven|eight|nine)'
const TENS = '(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)'
const TEENS = '(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)'
const UNDER_100 = `(?:${TENS}(?:[\\s-]${SMALL})?|${TEENS}|(?:oh|o)[\\s-]${SMALL}|${SMALL})`
// "nineteen sixty", "twenty twenty-six", "two thousand and four", "nineteen hundred and sixty"
const YEAR_WORDS = `(?:(?:nineteen|twenty)(?:\\s+hundred)?(?:\\s+and)?\\s+${UNDER_100}|two\\s+thousand(?:(?:\\s+and)?\\s+${UNDER_100})?|(?:nineteen|twenty)\\s+hundred)`

function under100(words: string[]): number {
  return words.reduce((sum, w) => sum + (NUM_WORDS[w] ?? 0), 0)
}
function parseYearWords(s: string): number | null {
  const w = s.toLowerCase().split(/[\s-]+/).filter((x) => x !== 'and')
  if (w[0] === 'two' && w[1] === 'thousand') return 2000 + under100(w.slice(2))
  const century = w[0] === 'nineteen' ? 1900 : w[0] === 'twenty' ? 2000 : null
  if (century === null) return null
  return century + under100(w.slice(w[1] === 'hundred' ? 2 : 1))
}

const pad = (n: number) => String(n).padStart(2, '0')
const validDay = (d: number, m: number) => m >= 1 && m <= 12 && d >= 1 && d <= 31
function fullYear(y: string): number {
  const n = Number(y)
  if (y.length === 4) return n
  return n <= 49 ? 2000 + n : 1900 + n
}
function iso(y: number | null, m: number, d: number | null): string {
  return `${y ?? '-'}-${pad(m)}${d === null ? '' : '-' + pad(d)}`
}

/** Every calendar date in the text: numeric, with month names, and written in words. */
export function findDates(text: string): Found[] {
  const out: Found[] = []
  const add = (start: number, value: string, key: string) => {
    const f: Found = { start, end: start + value.length, type: 'DATE', value, key }
    if (!out.some((o) => o.start < f.end && f.start < o.end)) out.push(f)
  }

  // 2026-11-03
  for (const m of text.matchAll(/(?<![\d/.-])(\d{4})([-/.])(\d{1,2})\2(\d{1,2})(?![\d/-])/g)) {
    const [y, mo, d] = [Number(m[1]), Number(m[3]), Number(m[4])]
    if (validDay(d, mo)) add(m.index, m[0], iso(y, mo, d))
  }
  // 03/11/2026, 3-11-26, 03.11.2026, 03 / 11 / 2026
  for (const m of text.matchAll(/(?<![\d/.-])(\d{1,2})\s?([-/.])\s?(\d{1,2})\s?\2\s?(\d{4}|\d{2})(?![\d/-])/g)) {
    let [d, mo] = [Number(m[1]), Number(m[3])]
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]
    if (validDay(d, mo)) add(m.index, m[0], iso(fullYear(m[4]), mo, d))
  }
  // 3 March 1988, 2nd Nov 2026, 15 Oct, 3rd of March, 12-Nov-2026
  const dayFirst = new RegExp(
    `(?<![\\p{L}\\p{N}/.-])(\\d{1,2})(?:\\s?(?:st|nd|rd|th))?(?:\\s+of)?[\\s./-]{0,2}(${MONTH})(?![\\p{L}])\\.?(?:,?[\\s/-]{0,2}'?(\\d{4})(?!\\d)|[\\s-]'(\\d{2})(?!\\d))?`,
    'giu',
  )
  for (const m of text.matchAll(dayFirst)) {
    const d = Number(m[1])
    const mo = MONTHS[m[2].toLowerCase()]
    const year = m[3] ?? m[4]
    // "11 may need a crown": the word "may" only counts as a month with a capital M or a year.
    if (m[2].toLowerCase() === 'may' && m[2] !== 'May' && m[2] !== 'MAY' && !year) continue
    if (validDay(d, mo)) add(m.index, m[0], iso(year ? fullYear(year) : null, mo, d))
  }
  // March 3, 1988 / Nov 3rd / November 3 (a day that could be a tooth number needs a year or "rd")
  const monthFirst = new RegExp(
    `(?<![\\p{L}\\p{N}])(${MONTH})\\.?\\s+(?:the\\s+)?(\\d{1,2})(st|nd|rd|th)?(?![\\d/])(?:,?\\s+(\\d{4})(?!\\d))?`,
    'giu',
  )
  for (const m of text.matchAll(monthFirst)) {
    const d = Number(m[2])
    const mo = MONTHS[m[1].toLowerCase()]
    if (!validDay(d, mo)) continue
    if (m[1].toLowerCase() === 'may' && m[1] !== 'May' && m[1] !== 'MAY') continue
    // Harness fix (20 Nov 2026, from TUNE-set misses only): a month written in full ("December 16", "october 14") is a
    // date even when the day looks like a tooth number. Only a short form ("Oct 14", "Dec 16") still needs a year,
    // "rd"/"th", or a date word in front.
    const fullMonth = m[1].length >= 4 && m[1].toLowerCase() !== 'sept'
    const cue = DATE_CUE_BEFORE.test(text.slice(Math.max(0, m.index - 24), m.index))
    if (!m[4] && !m[3] && isFdi(m[2]) && !fullMonth && !cue) continue
    add(m.index, m[0], iso(m[4] ? Number(m[4]) : null, mo, d))
  }
  // "ninth of November", "twenty-first of October", "first of January nineteen sixty"
  const wordDate = new RegExp(
    `(?<![\\p{L}\\p{N}])(${ORDINAL})(?:\\s+day)?(\\s+of)?\\s+(${MONTH})(?![\\p{L}])(?:,?\\s+(\\d{4}(?!\\d)|${YEAR_WORDS}))?`,
    'giu',
  )
  for (const m of text.matchAll(wordDate)) {
    const d = ORDINALS[m[1].toLowerCase().replace(/[\s-]/g, '')]
    const mo = MONTHS[m[3].toLowerCase()]
    if (m[3].toLowerCase() === 'may' && m[3] !== 'May' && !m[2] && !m[4]) continue
    const y = m[4] ? (/^\d/.test(m[4]) ? Number(m[4]) : parseYearWords(m[4])) : null
    if (d && mo) add(m.index, m[0], iso(y, mo, d))
  }
  // "November the ninth", "October twenty-first, 2026"
  const wordDate2 = new RegExp(
    `(?<![\\p{L}\\p{N}])(${MONTH})\\s+(?:the\\s+)?(${ORDINAL})(?![\\p{L}])(?:,?\\s+(\\d{4}(?!\\d)|${YEAR_WORDS}))?`,
    'giu',
  )
  for (const m of text.matchAll(wordDate2)) {
    const d = ORDINALS[m[2].toLowerCase().replace(/[\s-]/g, '')]
    const mo = MONTHS[m[1].toLowerCase()]
    if (m[1].toLowerCase() === 'may' && m[1] !== 'May') continue
    const y = m[3] ? (/^\d/.test(m[3]) ? Number(m[3]) : parseYearWords(m[3])) : null
    if (d && mo) add(m.index, m[0], iso(y, mo, d))
  }
  // "June 2026", "Nov 2026" (month and year, no day)
  const monthYear = new RegExp(`(?<![\\p{L}\\p{N}])(${MONTH})\\.?,?\\s+(\\d{4})(?!\\d)`, 'giu')
  for (const m of text.matchAll(monthYear)) {
    add(m.index, m[0], iso(Number(m[2]), MONTHS[m[1].toLowerCase()], null))
  }
  // Festivals used as dates: "Diwali eve", "just after Holi"
  for (const m of text.matchAll(FESTIVAL_RE)) add(m.index, m[0], `festival ${m[0].toLowerCase().replace(/\s+/g, ' ')}`)

  // T12c (20 Nov 2026, after the fresh-note runs): a visit date written as day and month with no year ("3/11", "5-1"), and a
  // weekday used as a date ("Monday", "last Tuesday"). Added AFTER every full form, so a full date is never cut in two.
  for (const m of text.matchAll(/(?<![\d/.:-])(\d{1,2})\s?([/-])\s?(\d{1,2})(?![\d/:])(?![.-]\d)/g)) {
    const [d, mo] = [Number(m[1]), Number(m[3])]
    if (!validDay(d, mo)) continue
    const cue = DATE_CUE_BEFORE.test(text.slice(Math.max(0, m.index - 24), m.index))
    // A fraction ("1/2 tablet", "3/4 crown", "2/3") and two tooth numbers ("11/12") look like dates: leave them,
    // unless a word like "on", "seen" or "hearing" comes right before.
    const fraction = d < mo && FRACTION_DENOMINATORS.has(mo)
    const teethPair = isFdi(String(d)) && isFdi(String(mo)) && m[1].length === 2 && m[3].length === 2
    if ((fraction || teethPair) && !cue) continue
    add(m.index, m[0], iso(null, mo, d))
  }
  for (const m of text.matchAll(WEEKDAY_RE)) {
    // "last Tuesday", "next Friday", "on Monday", "hearing Monday": a date. "free on any Friday" or "Monday clinic": not.
    const lead = /^(?:last|next|this|coming|previous)\s/i.test(m[0])
    if (!lead && !DATE_CUE_BEFORE.test(text.slice(Math.max(0, m.index - 24), m.index))) continue
    add(m.index, m[0], `weekday ${m[0].toLowerCase().replace(/^.*\s/, '')}`)
  }
  return out
}

/** "on", "dated", "seen", "hearing" and similar, right before a day/month: it is a date, not a fraction. */
const DATE_CUE_BEFORE =
  /(?:\b(?:on|dated?|seen|came|visit(?:ed)?|appointment|hearing|next|due|till|until|by|from|since|before|after|review|reviewed|date)|[:(])\s*$/iu
/** Denominators a fraction can have. "3/11" is not a fraction; "1/2", "3/4" and "2/3" are. */
const FRACTION_DENOMINATORS: ReadonlySet<number> = new Set([2, 3, 4, 5, 6, 8, 10, 12])
/** Monday to Sunday, with "last", "next", "this", "coming" or "previous" in front when it is there. */
const WEEKDAY_RE =
  /(?<![\p{L}\p{N}])(?:(?:last|next|this|coming|previous)\s+)?(?:mon|tues|wednes|thurs|fri|satur|sun)day(?![\p{L}])/giu

const FESTIVAL_RE =
  /(?<![\p{L}\p{N}])(?:Diwali|Deepavali|Dussehra|Dasara|Holi|Eid|Ramzan|Ramadan|Christmas|Navratri|Ganesh\s+Chaturthi|Ganpati|Pongal|Onam|Raksha\s?[Bb]andhan|Rakhi|Gudi\s+Padwa|Makar\s+Sankranti|Sankranti|Baisakhi|Janmashtami|Mahashivratri|Bhai\s+Dooj|Bhaubeej|Easter|New\s+Year(?:'s)?|Independence\s+Day|Republic\s+Day|Gandhi\s+Jayanti)(?![\p{L}])(?:\s+(?:eve|day|week|weekend|holidays?|night|morning)(?![\p{L}]))?/gu

// ---------- phones ----------

// A run of digits with spaces, hyphens, dots or brackets between them.
// A dot only joins digits when no space follows it, so "tooth 36. 00000 55501" keeps its 36.
const SEP = '(?:[ \\t\\u00A0]{0,2}[-()\\u2010-\\u2015]{1,2}[ \\t\\u00A0]{0,2}|\\.|[ \\t\\u00A0]{1,2})'
// Only a digit on either side stops a match, so "Mob0000055501" and "ph:0000055501x" are caught too.
const PHONE_RE = new RegExp(`(?<!\\d)(?:\\+|00)?\\(?\\d(?:${SEP}?\\d){7,}(?!\\d)`, 'gu')
const DIGIT_WORD = '(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|double|triple)'
// Digit words, alone or mixed with digits: "nine eight double two ...", "00000 five five five zero one"
const PHONE_WORDS_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:plus\\s+)?(?:${DIGIT_WORD}|\\d+)(?:[\\s,.-]+(?:${DIGIT_WORD}|\\d+))+(?![\\p{L}\\p{N}])`,
  'giu',
)

/**
 * Phone numbers: 8 or more digits in any grouping ("+91 98xxx xxxxx", "(00000) 55512",
 * "0 0 0 0 0 5 5 5 2 4"), or digits spelled as words.
 * Not a phone: a list of two-digit tooth numbers ("16 17 26 27"), or two years.
 * This will also catch other long digit runs (for example a row of probing depths).
 * That is the safe side: the dentist can un-hide it in the preview.
 */
export function findPhones(text: string, taken: Span[] = []): Found[] {
  // Blank out what is already claimed (dates, emails) so a phone next to a date is still found.
  let masked = text
  for (const t of taken) masked = masked.slice(0, t.start) + '\u0001'.repeat(t.end - t.start) + masked.slice(t.end)
  const out: Found[] = []
  for (const m of masked.matchAll(PHONE_RE)) {
    const value = m[0]
    const groups = value.match(/\d+/g) ?? []
    const digits = groups.join('').length
    if (digits < 8) continue
    if (groups.length > 1 && groups.every((g) => isFdi(g))) continue
    if (groups.length > 1 && groups.every((g) => /^(19|20)\d\d$/.test(g))) continue
    out.push({ start: m.index, end: m.index + value.length, type: 'PHONE', value })
  }
  for (const m of masked.matchAll(PHONE_WORDS_RE)) {
    const span = { start: m.index, end: m.index + m[0].length }
    if (out.some((t) => t.start < span.end && span.start < t.end)) continue
    const words = (m[0].match(new RegExp(DIGIT_WORD, 'giu')) ?? []).length
    const groups = m[0].match(/\d+/g) ?? []
    const count = words + groups.join('').length
    // Words only: 7 or more. Words mixed with digits: 8 or more in total.
    if (words === 0 || count < (groups.length === 0 ? 7 : 8)) continue
    // "all three 16 17 26 27": a few number words next to tooth numbers is not a phone.
    if (groups.length > 0 && words < 4 && groups.every((g) => isFdi(g))) continue
    out.push({ ...span, type: 'PHONE', value: m[0] })
  }
  return out
}

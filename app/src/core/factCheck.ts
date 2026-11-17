// T7 fact check, step B (PROMPTS.md section 4). Code only, no model.
// Compares the restored letter with the dentist's original note, word by word.
// It never deletes or rewrites letter text. It only returns warnings.
// Known limit: it is word matching. It cannot catch a changed meaning that reuses the note's own words.
import { findDates, isFdi } from './patterns'
import type { Warning } from './restore'

export interface FactLists {
  /** data/drugs.json: each inner list is one drug with its other names. */
  drugs: string[][]
  /** data/clinical-terms.json "treatments": each inner list is one treatment with its other names. */
  treatments: string[][]
  /** data/clinical-terms.json "findings". */
  findings: string[]
  /** data/shorthand.json: shorthand to full words. */
  shorthand: Record<string, string>
}

export interface FactOptions {
  /** Heading lines of the letter template (T11). A line that is exactly one of these is not checked. */
  skipLines?: string[]
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Whole word or phrase, any case, plural allowed, spaces and hyphens interchangeable. */
function phraseRegex(phrase: string): RegExp {
  const body = phrase.trim().split(/[\s-]+/).map(esc).join('[\\s-]+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?:e?s)?(?![\\p{L}\\p{N}])`, 'giu')
}
const has = (text: string, phrase: string) => phraseRegex(phrase).test(text)

const TOOTH_WORDS = ['premolar', 'molar', 'incisor', 'canine', 'wisdom']
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const RELATIVE_DAYS = [
  'yesterday', 'today', 'tomorrow', 'tonight', 'last night', 'last week', 'last month', 'last year',
  'next week', 'next month', 'next year', 'this morning', 'this afternoon', 'this evening', 'this week',
  'day before yesterday', 'day after tomorrow',
]
const MONTH_NAMES: Array<[RegExp, number]> = [
  [/jan(?:uary)?/, 1], [/feb(?:ruary)?/, 2], [/mar(?:ch)?/, 3], [/apr(?:il)?/, 4], [/may/, 5], [/june?/, 6],
  [/july?/, 7], [/aug(?:ust)?/, 8], [/sep(?:t(?:ember)?)?/, 9], [/oct(?:ober)?/, 10], [/nov(?:ember)?/, 11], [/dec(?:ember)?/, 12],
]
const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

function months(text: string): Array<{ month: number; index: number; text: string }> {
  const out: Array<{ month: number; index: number; text: string }> = []
  for (const [re, month] of MONTH_NAMES) {
    const full = new RegExp(`(?<![\\p{L}\\p{N}])${re.source}(?![\\p{L}])`, 'giu')
    for (const m of text.matchAll(full)) {
      // "may" is a month only as "May" next to a number: "3 May", "May 2026".
      if (month === 5) {
        const around = text.slice(Math.max(0, m.index - 6), m.index + 9)
        if (m[0] !== 'May' || !/\d/.test(around)) continue
      }
      // "mar", "sep", "dec" and other short forms need a capital letter, to skip ordinary words.
      if (m[0].length <= 4 && m[0] === m[0].toLowerCase()) continue
      out.push({ month, index: m.index, text: m[0] })
    }
  }
  return out
}

const numerals = (text: string) => [...text.matchAll(/\d+(?:\.\d+)?/g)]
const canon = (n: string) => String(Number(n))

/** Step B: every fact in the letter must be in the note. Returns warnings sorted by position. */
export function checkFacts(letter: string, note: string, lists: FactLists, options: FactOptions = {}): Warning[] {
  const warnings: Warning[] = []
  const warn = (level: Warning['level'], kind: string, text: string, index: number, message: string) => {
    if (!warnings.some((w) => w.kind === kind && w.index === index)) warnings.push({ level, kind, text, index, message })
  }

  // Blank out template heading lines and any bracketed text (already reported by restore), keeping positions.
  const skip = new Set((options.skipLines ?? []).map((l) => l.trim().toLowerCase()))
  let body = letter
    .split('\n')
    .map((line) => (skip.has(line.trim().toLowerCase()) ? ' '.repeat(line.length) : line))
    .join('\n')
  body = body.replace(/\[[^[\]\n]{1,40}\]/g, (m) => ' '.repeat(m.length))

  // The note, plus its shorthand written out ("RCT" also counts as "root canal treatment").
  let noteWide = note
  for (const [short, long] of Object.entries(lists.shorthand)) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc(short)}(?![\\p{L}\\p{N}])`, 'iu')
    if (re.test(note)) noteWide += ` ${long}`
  }

  // Numbers and tooth numbers (red)
  const noteNumbers = new Set(numerals(note).map((m) => canon(m[0])))
  for (const m of numerals(body)) {
    if (noteNumbers.has(canon(m[0]))) continue
    if (isFdi(m[0])) warn('red', 'tooth', m[0], m.index, `Tooth ${m[0]} is not in your note`)
    else warn('red', 'number', m[0], m.index, `The number ${m[0]} is not in your note`)
  }

  // Tooth words (red)
  for (const word of TOOTH_WORDS) {
    for (const m of body.matchAll(phraseRegex(word))) {
      if (!has(note, word)) warn('red', 'tooth-word', m[0], m.index, `"${m[0]}" is not in your note`)
    }
  }

  // Dates, month names, weekdays, relative days (red)
  const noteDates = new Set(findDates(note).map((d) => d.key))
  for (const d of findDates(body)) {
    if (!noteDates.has(d.key)) warn('red', 'date', d.value, d.start, `The date "${d.value}" is not in your note`)
  }
  const noteMonths = new Set(months(note).map((m) => m.month))
  for (const m of months(body)) {
    if (!noteMonths.has(m.month)) warn('red', 'date', m.text, m.index, `The month "${m.text}" is not in your note`)
  }
  for (const word of [...WEEKDAYS, ...RELATIVE_DAYS]) {
    for (const m of body.matchAll(phraseRegex(word))) {
      if (!has(note, word)) warn('red', 'date', m[0], m.index, `"${m[0]}" is not in your note`)
    }
  }

  // Drugs and treatments (red): other names of the same thing count as the same thing.
  const groupCheck = (groups: string[][], haystack: string, kind: string) => {
    for (const group of groups) {
      if (group.some((name) => has(haystack, name))) continue
      for (const name of group) {
        for (const m of body.matchAll(phraseRegex(name))) warn('red', kind, m[0], m.index, `"${m[0]}" is not in your note`)
      }
    }
  }
  groupCheck(lists.drugs, note, 'drug')
  groupCheck(lists.treatments, noteWide, 'treatment')

  // Findings and number words (amber)
  for (const word of lists.findings) {
    if (has(noteWide, word)) continue
    for (const m of body.matchAll(phraseRegex(word))) warn('amber', 'finding', m[0], m.index, `"${m[0]}" is not in your note`)
  }
  NUMBER_WORDS.forEach((word, i) => {
    if (has(note, word) || noteNumbers.has(String(i + 1))) return
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, 'giu')
    for (const m of body.matchAll(re)) warn('amber', 'number-word', m[0], m.index, `"${m[0]}" is not in your note`)
  })

  // A longer phrase and a word inside it ("sinus tract", "sinus") give one warning, not two.
  const sorted = warnings.sort((a, b) => a.index - b.index || b.text.length - a.text.length)
  return sorted.filter(
    (w, i) => !sorted.some((o, j) => j < i && o.kind === w.kind && o.index <= w.index && o.index + o.text.length >= w.index + w.text.length),
  )
}

/** Copy stays off while this is true (until the dentist edits, or ticks "I have checked each warning"). */
export const hasRed = (warnings: Warning[]) => warnings.some((w) => w.level === 'red')

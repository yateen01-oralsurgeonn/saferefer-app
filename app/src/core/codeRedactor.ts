// T3 code redactor (PROMPTS.md section 2). Plain rules, no model, works offline.
// PRIVACY: this file must never import a model, Firebase, or anything that can
// reach the network. It only turns text into text.
import { applyFound, claim, EVERYDAY_WORD_NAMES, findValue, tokenSpans, TokenMap, type Found, type TokenType } from './tokens'
import { findDates, findEmails, findPhones } from './patterns'
import { findIds, findPlaces } from './places'

export interface RedactResult {
  /** The note with tokens in place of what the code found. */
  text: string
  /** Token to real value. Memory only. */
  map: TokenMap
}

// One name word: "Arvind", "D'Souza", "Anne-Marie", "RAMESH", or an initial "A."
const NAME_WORD = String.raw`(?:\p{Lu}\.|\p{Lu}[\p{L}\p{M}'\u2019]*(?:-\p{Lu}[\p{L}\p{M}'\u2019]*)*)`
const LOWER_WORD = String.raw`\p{L}[\p{L}\p{M}'\u2019-]*`
// A title, then a dot or a space: "Mr ", "Mr.", "Smt. ", "Sau. "
const TITLE_WORD = String.raw`(?:Mr|Mrs|Ms|Miss|Mx|Master|Baby|Shri|Sri|Shrimati|Smt|Sister|Dr|Prof|Kumari|Late|Fr|Rev|MR|MRS|MS|DR|mr|mrs|ms|dr|smt|shri)`
const TITLE = String.raw`(?:(${TITLE_WORD})(?:\.\s*|\s+)|(Sau|Ku|Kum|Chi)\.\s*)`
const RELATION = String.raw`(?:husband|wife|spouse|father|mother|son|daughter|brother|sister|uncle|aunt|aunty|cousin|nephew|niece|grandfather|grandmother|grandson|granddaughter|grandma|grandpa|father-in-law|mother-in-law|son-in-law|daughter-in-law|brother-in-law|sister-in-law|mom|mum|mummy|dad|daddy|papa|friend|neighbour|neighbor|guardian|parent|fianc[e\u00E9]e?|partner|colleague|boss|driver|caretaker|carer|attendant|maid|pati|patni|beta|beti|bhai|behen|bahin|aai|baba|vadil|mulga|mulgi|navra|bayko|mama|mami|kaka|kaku|chacha|chachi|dada|didi|tai|mavshi|atya|sasu|sasra|nana|nani|dadi|ajoba|aaji)`
const CUE = String.raw`(?:name\s+is|surname\s+is|named|called|known\s+as|ask\s+for|answers\s+to|has\s+(?:him|her|them)\s+as|have\s+(?:him|her|them)\s+as|reads|seeing|s\/o|d\/o|w\/o|c\/o)`

/** Capitalised words that are field labels or clinical words, never part of a name. */
const NOT_A_NAME = new Set(
  [
    'phone', 'mobile', 'mob', 'tel', 'contact', 'email', 'age', 'aged', 'dob', 'date', 'address', 'seen', 'ref',
    'referred', 'referring', 'tooth', 'teeth', 'sex', 'gender', 'male', 'female', 'id', 'no', 'patient', 'pt',
    'name', 'the', 'he', 'she', 'they', 'his', 'her', 'has', 'had', 'is', 'was', 'with', 'for', 'and', 'on', 'at',
    'cone', 'file', 'apex', 'key', 'cast', 'iopa', 'opg', 'cbct', 'rct', 'please', 'kindly', 'thank', 'thanks',
    'regards', 'dear', 'sir', 'madam', 'doctor', 'clinic', 'hospital', 'i', 'we', 'you', 'who', 'c/o', 'came',
    'complains', 'reports', 'presented', 'attended', 'pain', 'deep', 'caries', 'upper', 'lower', 'left', 'right',
    'molar', 'premolar', 'incisor', 'canine', 'class', 'grade', 'inr', 'in', 'of', 'to', 'by', 'from', 'a', 'an',
    'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'master', 'baby', 'shri', 'smt', 'sister', 'my', 'our', 'your',
    'this', 'that', 'it', 'there', 'no.', 'not', 'yes', 'old', 'new', 'nil', 'none', 'm', 'f',
    'diabetic', 'hypertensive', 'anxious', 'pregnant', 'allergic', 'known', 'healthy', 'fit', 'asthmatic',
    'smoker', 'very', 'wants', 'needs', 'requests', 'child', 'adult', 'elderly', 'monday', 'tuesday',
    'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'today', 'yesterday', 'tomorrow',
  ],
)
const notName = (w: string) => NOT_A_NAME.has(w.toLowerCase().replace(/\.$/, ''))

interface NameHit {
  start: number
  end: number
  value: string
  type: TokenType
}

/** Read up to `max` name words starting at `pos`. Returns the end position, or `pos` if there is no name. */
function readName(text: string, pos: number, max: number, allowLower: boolean): number {
  const word = new RegExp(`${allowLower ? LOWER_WORD : NAME_WORD}`, 'yu')
  let end = pos
  let cursor = pos
  let last = ''
  for (let n = 0; n < max; n++) {
    word.lastIndex = cursor
    const m = word.exec(text)
    if (!m) break
    const w = m[0]
    if (!/^\p{Lu}\.$/u.test(w) && notName(w)) break
    const after = cursor + w.length
    if (text[after] === ':') break // "Phone:" is a label, not a name
    end = after
    last = w
    // one or two spaces before the next word; none is needed after an initial ("R.K. Patil")
    const gap = /^[ \t\u00A0]{1,2}/.exec(text.slice(after, after + 2))?.[0].length ?? 0
    if (gap > 0) cursor = after + gap
    else if (/^\p{Lu}\.$/u.test(w)) cursor = after
    else break
  }
  // initials alone are not a name
  const got = text.slice(pos, end)
  if (/^(?:\p{Lu}\.\s*)+$/u.test(got)) return pos
  // keep "A. K. Sharma", but drop an initial left dangling at the end ("Asha T." keeps "Asha")
  if (/^\p{Lu}\.$/u.test(last)) return pos + got.replace(/[ \t\u00A0]+\p{Lu}\.$/u, '').length
  return end
}

function findNames(text: string): NameHit[] {
  const hits: NameHit[] = []
  const taken = (s: number, e: number) => hits.some((h) => h.start < e && s < h.end)
  let patientSet = false
  const push = (start: number, end: number, type: TokenType) => {
    if (end <= start || taken(start, end)) return false
    hits.push({ start, end, value: text.slice(start, end), type })
    return true
  }

  // 1. Header: "Patient: Arvind Testwala", "Patient name: ...", "Name - ...", "Re: Mr ...", "Pt. ...", "Patient Arvind ..."
  const header = new RegExp(
    String.raw`(?<![\p{L}])(?:(patient(?:'s)?\s+name|pt\.?\s+name|name\s+of\s+(?:the\s+)?patient|name|patient|pt\.?|re)\s*[:=\u2013-]\s*|(patient|pt\.)\s+(?=(?:${TITLE})?\p{Lu}))(?:${TITLE})?`,
    'giu',
  )
  for (const m of text.matchAll(header)) {
    const start = m.index + m[0].length
    const label = (m[1] ?? '').toLowerCase()
    let end = readName(text, start, 4, false)
    // With an explicit "name:" label, a name typed without capitals is accepted too.
    if (end === start && label.includes('name')) end = readName(text, start, 4, true)
    if (push(start, end, patientSet ? 'PERSON' : 'PATIENT')) patientSet = true
  }

  // 2. Title then name: "Mr Dinesh Mockwani", "Mr.Ramesh", "Dr Neha Testgupta", "Baby Zoya Testkhan", "Sau. Lata"
  const titled = new RegExp(String.raw`(?<![\p{L}])${TITLE}(?=\p{Lu})`, 'gu')
  const relationBefore = new RegExp(String.raw`(?<![\p{L}])${RELATION}(?:'s)?[\s,]+(?:is\s+)?$`, 'iu')
  for (const m of text.matchAll(titled)) {
    const start = m.index + m[0].length
    const end = readName(text, start, 3, false)
    if (end === start || taken(start, end)) continue
    const title = (m[1] ?? m[2]).toLowerCase()
    let type: TokenType = 'PERSON'
    if (title !== 'dr' && title !== 'prof' && title !== 'fr' && title !== 'rev') {
      if (relationBefore.test(text.slice(Math.max(0, m.index - 30), m.index))) type = 'RELATIVE'
      else if (!patientSet) {
        type = 'PATIENT'
        patientSet = true
      }
    }
    push(start, end, type)
  }

  // 3. A name then an age, at the very start of the note: "Asha Testpatil, 36, ...", "Asha Testpatil 36/F"
  if (!patientSet) {
    const m = new RegExp(String.raw`^\s*(${NAME_WORD}(?:[ \t]{1,2}${NAME_WORD}){1,2})(?=,?\s*\(?\d{1,3}\s*(?:,|\)|\/\s*[MFmf](?![\p{L}])|y(?:rs?|ears?|\/o|o)?(?![\p{L}])))`, 'u').exec(text)
    if (m && !m[1].split(/\s+/).some(notName)) {
      const start = m.index + m[0].length - m[1].length
      if (push(start, start + m[1].length, 'PATIENT')) patientSet = true
    }
  }

  // 4. Relation word then a capitalised name: "husband Ramesh", "wife, Joy", "son Mohit", "aai Sunanda"
  const relative = new RegExp(String.raw`(?<![\p{L}])${RELATION}(?:'s)?(?:,|\s+is|\s+named|\s+called)?\s+(?:${TITLE})?(?=\p{Lu})`, 'giu')
  for (const m of text.matchAll(relative)) {
    const start = m.index + m[0].length
    push(start, readName(text, start, 3, false), 'RELATIVE')
  }

  // 5. Other cues: "surname is Baker", "ask for Vaishu", "has him as Suny Dumygill", "s/o Ganpat"
  const cue = new RegExp(String.raw`(?<![\p{L}])${CUE}\s+(?:${TITLE})?(?=\p{Lu})`, 'giu')
  for (const m of text.matchAll(cue)) {
    const start = m.index + m[0].length
    push(start, readName(text, start, 3, false), 'PERSON')
  }
  return hits
}

const startsUpper = (s: string) => /^\p{Lu}/u.test(s)
const letters = (s: string) => s.replace(/[^\p{L}\p{M}]/gu, '')

/** Edit distance where a swap of two neighbours counts as one change. Stops early above `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}
/** How many letters may differ before two name words stop counting as the same name. */
const allowedTypos = (len: number) => (len >= 12 ? 3 : len >= 8 ? 2 : len >= 5 ? 1 : 0)

/**
 * Hide what plain code can find:
 * - the patient's header name, titled names ("Mr ...", "Dr ..."), names after a relation or cue word;
 * - the same names again in any case, with odd spacing, with a small spelling change, or one word alone;
 * - phones, emails, dates (numbers, month names, words, festivals);
 * - ID numbers, and addresses and organisations that follow a clear pattern.
 * Age and tooth numbers stay. Everything else is left for Gemini Nano (T4) and the dentist.
 * Safe to run again on text that already has tokens.
 */
export function redactByCode(note: string, map: TokenMap = new TokenMap()): RedactResult {
  const blocked = tokenSpans(note)
  const found: Found[] = []
  const free = (s: number, e: number) => ![...found, ...blocked].some((f) => f.start < e && s < f.end)

  for (const f of findEmails(note)) claim(found, f, blocked)
  for (const f of findDates(note)) claim(found, f, blocked)
  for (const f of findPhones(note, [...found, ...blocked])) claim(found, f, blocked)
  for (const f of findIds(note, [...found, ...blocked])) claim(found, f, blocked)

  const names = findNames(note).filter((n) => free(n.start, n.end))
  // Longest names first, so "Ramesh Patil" is taken before "Ramesh".
  const byLength = [...names].sort((a, b) => b.value.length - a.value.length)
  const done = new Set<string>()
  for (const n of byLength) {
    const id = `${n.type}|${n.value.toLowerCase()}`
    if (done.has(id)) continue
    done.add(id)
    for (const h of findValue(note, n.value, { nameEndings: true })) claim(found, { ...h, type: n.type }, blocked)
  }

  // Single words of each name, when written with a capital letter (or when the name itself had none):
  // the given name shares the person's token; any other word gets its own PERSON token.
  const nameWords: Array<{ word: string; type: TokenType }> = []
  for (const n of byLength) {
    const words = n.value.split(/[\s\u00A0]+/).filter((w) => !/^(?:\p{Lu}\.)+$/u.test(w))
    const typedLower = !startsUpper(letters(n.value))
    words.forEach((w, i) => {
      if (letters(w).length < (i === 0 ? 2 : 3)) return
      nameWords.push({ word: w, type: words.length > 1 && i > 0 ? 'PERSON' : n.type })
      if (words.length < 2) return
      for (const h of findValue(note, w, { nameEndings: true })) {
        // Any case, except everyday-word names ("Hope", "Rose"): those need a capital letter.
        if (EVERYDAY_WORD_NAMES.has(w.toLowerCase()) && !typedLower && !startsUpper(h.value)) continue
        let { start, end } = h
        const type: TokenType = i === 0 ? n.type : 'PERSON'
        if (i === 0) {
          // "Priyanka Fakechaterji": a given name followed by another capitalised word is a full name again.
          const next = new RegExp(String.raw`^[ \t]{1,2}(${NAME_WORD})(?![\p{L}])`, 'u').exec(note.slice(end))
          if (next && !notName(next[1]) && free(end, end + next[0].length)) {
            claim(found, { start, end: end + next[0].length, type: 'PERSON', value: note.slice(start, end + next[0].length) }, blocked)
            continue
          }
        } else {
          // "Sunitha Testdeshpande": a capitalised word just before a known surname, not at a sentence start.
          const prev = new RegExp(String.raw`(?<=[\p{L},;:]\s)(${NAME_WORD})[ \t]{1,2}$`, 'u').exec(note.slice(0, start))
          if (prev && !notName(prev[1]) && free(prev.index, start)) start = prev.index
        }
        claim(found, { start, end, type, value: note.slice(start, end) }, blocked)
      }
    })
  }

  // Small spelling changes of a known name word: "Sunitha" for "Sunita", "Dumygill" for "Dummygill".
  const capWord = new RegExp(String.raw`(?<![\p{L}\p{M}\p{N}])\p{Lu}[\p{L}\p{M}'\u2019]{3,}(?![\p{L}\p{M}\p{N}])`, 'gu')
  for (const m of note.matchAll(capWord)) {
    if (!free(m.index, m.index + m[0].length) || notName(m[0])) continue
    const w = m[0].toLowerCase()
    for (const known of nameWords) {
      const k = known.word.toLowerCase()
      const max = allowedTypos(Math.min(k.length, w.length))
      if (max === 0 || k[0] !== w[0] || k === w) continue
      if (editDistance(k, w, max) <= max) {
        claim(found, { start: m.index, end: m.index + m[0].length, type: 'PERSON', value: m[0] }, blocked)
        break
      }
    }
  }

  // Organisations and addresses last, so they never cut into a name, phone or date.
  for (const f of findPlaces(note, [...found, ...blocked])) claim(found, f, blocked)

  return { text: applyFound(note, found, map), map }
}

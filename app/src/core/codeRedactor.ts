// T3 code redactor (PROMPTS.md section 2). Plain rules, no model, works offline.
// PRIVACY: this file must never import a model, Firebase, or anything that can
// reach the network. It only turns text into text.
import { applyFound, claim, findValue, tokenSpans, TokenMap, type Found, type TokenType } from './tokens'
import { findDates, findEmails, findPhones } from './patterns'

export interface RedactResult {
  /** The note with tokens in place of what the code found. */
  text: string
  /** Token to real value. Memory only. */
  map: TokenMap
}

// One name word: "Arvind", "D'Souza", "Anne-Marie", "RAMESH", or an initial "A."
const NAME_WORD = String.raw`(?:\p{Lu}[\p{L}\p{M}'’]*(?:-\p{Lu}[\p{L}\p{M}'’]*)*|\p{Lu}\.)`
const LOWER_WORD = String.raw`\p{L}[\p{L}\p{M}'’-]*`
const TITLE = String.raw`(?:Mr|Mrs|Ms|Miss|Master|Baby|Shri|Sri|Smt|Sister|Dr|Prof|Kumari|MR|MRS|MS|DR|mr|mrs|ms|dr)`
const RELATION = String.raw`(?:husband|wife|spouse|father|mother|son|daughter|brother|sister|uncle|aunt|aunty|cousin|nephew|niece|grandfather|grandmother|grandson|granddaughter|father-in-law|mother-in-law|son-in-law|daughter-in-law|friend|neighbour|neighbor|guardian|parent|fianc[eé]e?|partner|colleague|boss|driver|caretaker|carer)`
const CUE = String.raw`(?:name\s+is|surname\s+is|named|called|known\s+as|ask\s+for|answers\s+to|has\s+(?:him|her|them)\s+as|have\s+(?:him|her|them)\s+as|seeing|s\/o|d\/o|w\/o|c\/o)`

/** Capitalised words that are field labels or clinical words, never part of a name. */
const NOT_A_NAME = new Set(
  [
    'phone', 'mobile', 'mob', 'tel', 'contact', 'email', 'age', 'aged', 'dob', 'date', 'address', 'seen', 'ref',
    'referred', 'referring', 'tooth', 'teeth', 'sex', 'gender', 'male', 'female', 'id', 'no', 'patient', 'pt',
    'name', 'the', 'he', 'she', 'they', 'his', 'her', 'has', 'had', 'is', 'was', 'with', 'for', 'and', 'on', 'at',
    'cone', 'file', 'apex', 'key', 'cast', 'iopa', 'opg', 'cbct', 'rct', 'please', 'kindly', 'thank', 'thanks',
    'regards', 'dear', 'sir', 'madam', 'doctor', 'clinic', 'hospital', 'i', 'we', 'you', 'who', 'c/o',
  ],
)

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
  for (let n = 0; n < max; n++) {
    word.lastIndex = cursor
    const m = word.exec(text)
    if (!m) break
    const w = m[0]
    if (NOT_A_NAME.has(w.toLowerCase().replace(/\.$/, ''))) break
    const after = cursor + w.length
    if (text[after] === ':') break // "Phone:" is a label, not a name
    end = after
    // one space (or a line break inside a header name is not followed) before the next word
    if (text[after] === ' ' || text[after] === ' ') cursor = after + 1
    else break
  }
  // a lone initial is not a name
  const got = text.slice(pos, end)
  if (/^\p{Lu}\.$/u.test(got)) return pos
  return end
}

function findNames(text: string): NameHit[] {
  const hits: NameHit[] = []
  const taken = (s: number, e: number) => hits.some((h) => h.start < e && s < h.end)
  let patientSet = false

  // 1. Header: "Patient: Arvind Testwala", "Patient name: ...", "Name: ...", "Re: Mr ..."
  const header = new RegExp(
    String.raw`(?<![\p{L}])(patient(?:'s)?\s+name|pt\.?\s+name|name\s+of\s+(?:the\s+)?patient|name|patient|pt|re)\s*:\s*(?:${TITLE}\.?\s+)?`,
    'giu',
  )
  for (const m of text.matchAll(header)) {
    const start = m.index + m[0].length
    const label = m[1].toLowerCase()
    let end = readName(text, start, 4, false)
    // With an explicit "name:" label, a name typed without capitals is accepted too.
    if (end === start && label.includes('name')) end = readName(text, start, 4, true)
    if (end > start && !taken(start, end)) {
      hits.push({ start, end, value: text.slice(start, end), type: patientSet ? 'PERSON' : 'PATIENT' })
      patientSet = true
    }
  }

  // 2. Title then name: "Mr Dinesh Mockwani", "Dr Neha Testgupta", "Baby Zoya Testkhan"
  const titled = new RegExp(String.raw`(?<![\p{L}])(${TITLE})\.?\s+(?=\p{Lu})`, 'gu')
  const relationBefore = new RegExp(String.raw`(?<![\p{L}])${RELATION}(?:'s)?[\s,]+(?:is\s+)?$`, 'iu')
  for (const m of text.matchAll(titled)) {
    const start = m.index + m[0].length
    const end = readName(text, start, 3, false)
    if (end === start || taken(start, end)) continue
    const title = m[1].toLowerCase()
    let type: TokenType = 'PERSON'
    if (title !== 'dr' && title !== 'prof') {
      if (relationBefore.test(text.slice(Math.max(0, m.index - 30), m.index))) type = 'RELATIVE'
      else if (!patientSet) {
        type = 'PATIENT'
        patientSet = true
      }
    }
    hits.push({ start, end, value: text.slice(start, end), type })
  }

  // 3. Relation word then a capitalised name: "husband Ramesh", "wife, Joy", "son Mohit"
  const relative = new RegExp(String.raw`(?<![\p{L}])${RELATION}(?:'s)?(?:,|\s+is|\s+named|\s+called)?\s+(?=\p{Lu})`, 'giu')
  for (const m of text.matchAll(relative)) {
    const start = m.index + m[0].length
    const end = readName(text, start, 3, false)
    if (end > start && !taken(start, end)) hits.push({ start, end, value: text.slice(start, end), type: 'RELATIVE' })
  }

  // 4. Other cues: "surname is Baker", "ask for Vaishu", "has him as Suny Dumygill"
  const cue = new RegExp(String.raw`(?<![\p{L}])${CUE}\s+(?=\p{Lu})`, 'giu')
  for (const m of text.matchAll(cue)) {
    const start = m.index + m[0].length
    const end = readName(text, start, 3, false)
    if (end > start && !taken(start, end)) hits.push({ start, end, value: text.slice(start, end), type: 'PERSON' })
  }
  return hits
}

const startsUpper = (s: string) => /^\p{Lu}/u.test(s)

/**
 * Hide what plain code can find: the patient's header name, titled names
 * ("Mr ...", "Dr ..."), names after a relation word, phones, emails and dates.
 * Age and tooth numbers stay. Everything else is left for Gemini Nano (T4) and the dentist.
 * Safe to run again on text that already has tokens.
 */
export function redactByCode(note: string, map: TokenMap = new TokenMap()): RedactResult {
  const blocked = tokenSpans(note)
  const found: Found[] = []

  for (const f of findEmails(note)) claim(found, f, blocked)
  for (const f of findDates(note)) claim(found, f, blocked)
  for (const f of findPhones(note, [...found, ...blocked])) claim(found, f, blocked)

  const names = findNames(note).filter((n) => !blocked.some((b) => b.start < n.end && n.start < b.end))
  // Longest names first, so "Ramesh Patil" is taken before "Ramesh".
  const byLength = [...names].sort((a, b) => b.value.length - a.value.length)
  const done = new Set<string>()
  for (const n of byLength) {
    const id = `${n.type}|${n.value.toLowerCase()}`
    if (done.has(id)) continue
    done.add(id)
    for (const h of findValue(note, n.value)) claim(found, { ...h, type: n.type }, blocked)
  }
  // Then single words of each name, when written with a capital letter:
  // the given name shares the person's token; any other word gets its own PERSON token.
  for (const n of byLength) {
    const words = n.value.split(/[\s ]+/).filter((w) => !/^\p{Lu}\.$/u.test(w))
    if (words.length < 2) continue
    words.forEach((w, i) => {
      if (w.replace(/[^\p{L}]/gu, '').length < (i === 0 ? 2 : 3)) return
      for (const h of findValue(note, w)) {
        if (!startsUpper(h.value)) continue
        claim(found, { ...h, type: i === 0 ? n.type : 'PERSON' }, blocked)
      }
    })
  }

  return { text: applyFound(note, found, map), map }
}

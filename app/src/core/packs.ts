// P1 profession packs (PACKS.md). Plain TypeScript: no React, no Firebase, no network, no file reads.
//
// A pack only changes WORDS: who wrote the note, who reads the letter, the section list, extra safe words.
// It has no field that can turn off a lock. The LanguageModel lock, ONLY_ON_DEVICE redaction, the send guard,
// the token rules, the fact rules and the "note is data" rule are fixed in code and are the same for every pack.
// validatePack() rejects any pack with an unknown field, so a pack from Remote Config (T11) cannot add one.

export type PackId = 'dental'

/** The parts of the letter instruction a profession may change. Every other rule is fixed (letter.ts). */
export interface LetterText {
  /** First line: who writes to whom. */
  intro: string
  /** Rule 2: the kinds of fact the model must never add. */
  neverAdd: string
  /** Rule 3: whose words are kept. */
  wordsRule: string
  /** Rule 4: how domain numbers are kept. */
  numbersRule: string
  /** Rule 8: how the main person is named. */
  personRule: string
  /** Rule 9: no advice, no opinion. */
  noAdviceRule: string
  /** Rule 11: "a dental clinical note". */
  noteKind: string
  /** The section list, in order. */
  template: readonly string[]
}

export interface Pack {
  id: PackId
  /** Dropdown text: "Dentist". */
  label: string
  /** Left panel label. */
  noteLabel: string
  placeholder: string
  /** For the Nano prompt: "a dentist's clinical note". */
  nanoNoteKind: string
  letter: LetterText
  /** Which item list runs after Approve. Teeth for dental; none until P2 adds citations. */
  items: 'teeth' | 'none'
}

export const DENTAL_LETTER: LetterText = {
  intro:
    'You draft a referral letter from a general dentist to an endodontist. The reader is the endodontist, never the patient. The dentist will review, edit and sign the letter.',
  neverAdd: 'tooth number, date, drug, dose, finding, test result, diagnosis, medical history, radiograph, urgency or treatment',
  wordsRule:
    "keep the dentist's own words for findings and for any diagnosis they recorded. Fix grammar. Expand shorthand only when the meaning is certain; otherwise keep it as written.",
  numbersRule: 'Tooth numbers: keep them exactly as written. Never convert between numbering systems or into words.',
  personRule: 'Refer to the patient as [PATIENT] or "the patient". No "he" or "she" unless the NOTE states the sex.',
  noAdviceRule: 'No advice to the patient, no prognosis, no opinion.',
  noteKind: 'a dental clinical note',
  template: [
    'Dear Colleague,',
    'Re: [PATIENT], with age only if recorded',
    'Reason for referral',
    'Presenting complaint and history',
    'Clinical findings',
    'Investigations',
    'Treatment so far',
    'Medical history and medication',
    'Request',
    'Thank you for seeing this patient.',
  ],
}

export const DENTAL_PACK: Pack = {
  id: 'dental',
  label: 'Dentist',
  noteLabel: 'Your note (stays in this browser)',
  placeholder: 'Type or paste a synthetic clinical note',
  nanoNoteKind: "a dentist's clinical note",
  letter: DENTAL_LETTER,
  items: 'teeth',
}

export const PACKS: Readonly<Record<PackId, Pack>> = { dental: DENTAL_PACK }
export const DEFAULT_PACK = DENTAL_PACK

export function getPack(id: string | null | undefined): Pack {
  return (id && Object.prototype.hasOwnProperty.call(PACKS, id) ? PACKS[id as PackId] : undefined) ?? DEFAULT_PACK
}

// ---------- validation (for packs that do not come from this file) ----------

const PACK_KEYS = ['id', 'label', 'noteLabel', 'placeholder', 'nanoNoteKind', 'letter', 'items']
const LETTER_KEYS = ['intro', 'neverAdd', 'wordsRule', 'numbersRule', 'personRule', 'noAdviceRule', 'noteKind', 'template']
const MAX_TEXT = 400
/** Only these bracket words may appear in pack text: they are real tokens the model must copy. */
const ALLOWED_BRACKETS = /\[(?:PATIENT)\]/g

function cleanText(v: unknown, what: string): string {
  if (typeof v !== 'string' || !v.trim() || v.length > MAX_TEXT) throw new Error(`Pack: bad ${what}`)
  if (/[[\]{}<>`]/.test(v.replace(ALLOWED_BRACKETS, ''))) throw new Error(`Pack: bad characters in ${what}`)
  // Pack text goes into a prompt. It must not try to change the fixed rules.
  if (/\b(?:ignore|disregard|override|forget)\b/i.test(v)) throw new Error(`Pack: bad words in ${what}`)
  return v.trim()
}

/** Check a pack from outside this file. Unknown fields, bad text or a lock-looking field: throws. */
export function validatePack(raw: unknown): Pack {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Pack: not an object')
  const p = raw as Record<string, unknown>
  for (const k of Object.keys(p)) if (!PACK_KEYS.includes(k)) throw new Error('Pack: unknown field')
  if (typeof p.id !== 'string' || !Object.prototype.hasOwnProperty.call(PACKS, p.id)) throw new Error('Pack: unknown id')
  if (p.items !== 'teeth' && p.items !== 'none') throw new Error('Pack: bad items')
  const l = p.letter as Record<string, unknown>
  if (typeof l !== 'object' || l === null || Array.isArray(l)) throw new Error('Pack: bad letter')
  for (const k of Object.keys(l)) if (!LETTER_KEYS.includes(k)) throw new Error('Pack: unknown letter field')
  const template = l.template
  if (!Array.isArray(template) || template.length < 2 || template.length > 14) throw new Error('Pack: bad template')
  return {
    id: p.id as PackId,
    label: cleanText(p.label, 'label'),
    noteLabel: cleanText(p.noteLabel, 'noteLabel'),
    placeholder: cleanText(p.placeholder, 'placeholder'),
    nanoNoteKind: cleanText(p.nanoNoteKind, 'nanoNoteKind'),
    items: p.items,
    letter: {
      intro: cleanText(l.intro, 'intro'),
      neverAdd: cleanText(l.neverAdd, 'neverAdd'),
      wordsRule: cleanText(l.wordsRule, 'wordsRule'),
      numbersRule: cleanText(l.numbersRule, 'numbersRule'),
      personRule: cleanText(l.personRule, 'personRule'),
      noAdviceRule: cleanText(l.noAdviceRule, 'noAdviceRule'),
      noteKind: cleanText(l.noteKind, 'noteKind'),
      template: template.map((t, i) => cleanText(t, `template line ${i + 1}`)),
    },
  }
}

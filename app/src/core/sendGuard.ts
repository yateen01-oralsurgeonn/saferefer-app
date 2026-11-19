// Send guard (PROMPTS.md section 2, SECURITY.md A2 and A6).
// Run it before EVERY cloud call, Firestore write and retry.
// Plain code: no model, no network. It only answers "may this text leave the browser?"
import { messageFor } from './messages'
import { findEmails, findPhones } from './patterns'
import { EVERYDAY_WORD_NAMES, HONORIFICS, isPersonType, NAME_ENDING, tokenRegex, type TokenMap } from './tokens'

/** The only message the screen shows when the guard blocks. Never add note text to it. */
export const BLOCKED_MESSAGE = messageFor('blocked')
export const NOT_APPROVED_MESSAGE = messageFor('not-approved')

export type GuardReason = 'map-value' | 'name-word' | 'phone' | 'email' | 'not-approved'

export type GuardResult =
  | { ok: true }
  | {
      ok: false
      message: string
      reason: GuardReason
      /** The text that tripped the guard. Show it on screen only. Never log it or put it in an Error. */
      hit: string
    }

export interface GuardOptions {
  /**
   * Text the dentist un-hid by hand in the preview ("this is not an identifier").
   * Only fill this from an explicit un-hide click. Matching is exact, ignoring case and extra spaces.
   */
  allowed?: string[]
  /**
   * Known clinical words and drug names (data/clinical-terms.json, data/drugs.json).
   * A short hidden name found INSIDE one of these longer words does not block:
   * "Lata" inside "palatal", "Amit" inside "amitriptyline". The name by itself always blocks.
   */
  safeWords?: string[]
  /**
   * Spans that hold a money amount (a pack's `protect` function, P2). Only the generic phone and email scan skips them,
   * so "Rs 12500000" is not mistaken for a phone. Hidden values and hidden phone digits are still searched everywhere.
   */
  protect?: (text: string) => Array<{ start: number; end: number }>
}

const ZERO_WIDTH = /[\u00AD\u200B-\u200F\u2060\uFEFF]/g
const fold = (s: string) => s.normalize('NFKC').replace(ZERO_WIDTH, '').toLowerCase().replace(/\s+/g, ' ').trim()
const squash = (s: string) => fold(s).replace(/[^\p{L}\p{N}]/gu, '')
const digitsOf = (s: string) => s.normalize('NFKC').replace(/\D/g, '')
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const wholeWord = (word: string, flags: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(word)}(?![\\p{L}\\p{N}])`, flags)

const block = (reason: GuardReason, hit: string): GuardResult => ({ ok: false, message: BLOCKED_MESSAGE, reason, hit })

/**
 * Returns ok only if the outgoing text holds:
 * - no value from the token map: 4 or more characters anywhere in any case
 *   (so "Rameshs", "RameshPatil" and "RAMESH" are caught), 2 or 3 characters as a whole word;
 * - no map value with its spaces or punctuation changed ("Ramesh-Patil", "R a m e s h");
 * - no single word of a hidden person's name written with a capital letter;
 * - no digits of a hidden phone number, in any grouping;
 * - nothing that looks like a phone number or an email address.
 */
export function checkSend(text: string, map: TokenMap, options: GuardOptions = {}): GuardResult {
  const allowed = new Set((options.allowed ?? []).map(fold))
  const safe = new Set((options.safeWords ?? []).map(fold))
  // Valid tokens are cut out first, so the word inside "[PATIENT]" is never matched.
  const plain = text.normalize('NFKC').replace(ZERO_WIDTH, '').replace(tokenRegex(), '\u0001')
  const folded = fold(plain)
  const squashed = plain.split('\u0001').map(squash)
  const digits = plain.split('\u0001').map(digitsOf)
  const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{M}\p{N}]/u.test(c)

  for (const entry of map.entries()) {
    const forms = new Set([entry.value, ...entry.variants])
    for (const form of forms) {
      const v = fold(form)
      if (!v || allowed.has(v)) continue
      if (v.length >= 4) {
        // Anywhere, any case. Each place it is found is looked at with the whole word around it.
        for (let at = folded.indexOf(v); at >= 0; at = folded.indexOf(v, at + 1)) {
          let ws = at
          let we = at + v.length
          while (isWordChar(folded[ws - 1])) ws--
          while (isWordChar(folded[we])) we++
          const around = folded.slice(ws, we)
          // Inside a longer word that is a known clinical word, or that the dentist cleared by hand: not a leak.
          if (around !== v && (safe.has(around) || allowed.has(around))) continue
          return block('map-value', around)
        }
      } else if (v.length >= 2) {
        if (wholeWord(v, 'iu').test(folded)) return block('map-value', form)
      }
      const sq = squash(form)
      if (sq.length >= 6 && squashed.some((s) => s.includes(sq))) return block('map-value', form)
      if (entry.type === 'PHONE') {
        // Compare the last 10 digits, so a hidden "+91 ..." number is caught with or without the 91.
        const d = digitsOf(form).slice(-10)
        if (d.length >= 7 && digits.some((s) => s.includes(d))) return block('phone', form)
      }
      if (isPersonType(entry.type)) {
        for (const word of v.split(/[^\p{L}\p{N}]+/u)) {
          if (word.length < 3 || HONORIFICS.includes(word) || allowed.has(word)) continue
          // A single word of a hidden name: "Mrs Patil" when "Asha Patil" is hidden. Also with a glued
          // title or ending: "MrsLata", "Latas", "Amitbhai". Any case, except everyday-word names
          // ("Hope", "Rose"), which need a capital so that "we hope to save 33" is not blocked.
          const glued = new RegExp(
            `(?<![\\p{L}\\p{M}\\p{N}])(?:mrs|mr|ms|dr|smt|shri)?(${escapeRegex(word)})(?:s|${NAME_ENDING})?(?![\\p{L}\\p{M}\\p{N}])`,
            'giu',
          )
          for (const m of plain.matchAll(glued)) {
            const written = m[0].slice(m[0].toLowerCase().indexOf(word))
            if (EVERYDAY_WORD_NAMES.has(word) && !/^\p{Lu}/u.test(m[0]) && !/^\p{Lu}/u.test(written)) continue
            if (fold(m[0]) !== word && (allowed.has(fold(m[0])) || safe.has(fold(m[0])))) continue
            return block('name-word', m[0])
          }
          // A long name word INSIDE a longer word ("clinicMockpatilx", "Mockpatilkar", "Mockpatil2"): the redactor keeps to
          // word edges, so it can leave these behind. Same rule as a whole hidden value of 4+ letters, for words of 6+ letters
          // (short ones sit inside too many ordinary words). A known clinical word or one the dentist cleared still passes.
          if (word.length >= 6 && !EVERYDAY_WORD_NAMES.has(word)) {
            for (let at = folded.indexOf(word); at >= 0; at = folded.indexOf(word, at + 1)) {
              let ws = at
              let we = at + word.length
              while (isWordChar(folded[ws - 1])) ws--
              while (isWordChar(folded[we])) we++
              const around = folded.slice(ws, we)
              if (around === word || safe.has(around) || allowed.has(around)) continue
              return block('name-word', around)
            }
          }
        }
      }
    }
  }

  let scan = plain
  for (const s of options.protect?.(plain) ?? []) scan = scan.slice(0, s.start) + ' '.repeat(s.end - s.start) + scan.slice(s.end)
  for (const f of findEmails(scan)) if (!allowed.has(fold(f.value))) return block('email', f.value)
  for (const f of findPhones(scan)) if (!allowed.has(fold(f.value))) return block('phone', f.value)
  return { ok: true }
}

/**
 * The one door to the cloud. Give it the frozen, approved anonymous text
 * (or null if nothing is approved) and the function that makes the call.
 * `send` receives exactly the approved string and nothing else.
 * Use this for the letter call, the tooth-line call, the Firestore queue write and every retry.
 */
export async function guardedSend<T>(
  approvedText: string | null,
  map: TokenMap,
  send: (approvedText: string) => Promise<T>,
  options: GuardOptions = {},
): Promise<{ ok: true; value: T } | Extract<GuardResult, { ok: false }>> {
  if (approvedText === null || approvedText.trim() === '') {
    return { ok: false, message: NOT_APPROVED_MESSAGE, reason: 'not-approved', hit: '' }
  }
  const verdict = checkSend(approvedText, map, options)
  if (!verdict.ok) return verdict
  return { ok: true, value: await send(approvedText) }
}
